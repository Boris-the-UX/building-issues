// Development-only integration check. Uses local Auth + mail capture, not mocks.
// Run after a fresh local build and npm start. Creates/deletes one fictional user.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const env = readFileSync('.env.local', 'utf8');
assert.match(env, /NEXT_PUBLIC_SUPABASE_URL=http:\/\/(127\.0\.0\.1|localhost):54321(?:\r?\n|$)/, 'Requires local Supabase environment');
const origin = 'http://localhost:3000';
const inbox = 'http://127.0.0.1:54324';
const email = `smoke-${randomUUID()}@example.invalid`;
const cookies = new Map();
let checks = 0;
function check(ok, message) { assert.ok(ok, message); checks++; console.log(`PASS: ${message}`); }
async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), {
    ...options, redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: { Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; '), Origin: origin, ...options.headers },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(';');
    const split = pair.indexOf('=');
    const key = pair.slice(0, split), value = pair.slice(split + 1);
    if (value) cookies.set(key, value); else cookies.delete(key);
  }
  return response;
}
function decode(s) { return s.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'); }
function actionForm(html, formIndex = 0) {
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)][formIndex]?.[1];
  assert.ok(form, 'Server action form is present');
  const data = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w$:-]+)="([^"]*)"/g)].map((m) => [m[1], decode(m[2])]));
    if (attrs.type === 'hidden' && attrs.name) data.append(attrs.name, attrs.value ?? '');
  }
  assert.ok([...data.keys()].some((k) => k.startsWith('$ACTION_')), 'Action reference exists');
  return data;
}
function sql(statement) {
  return execFileSync('docker', ['exec', '-i', 'supabase_db_building-issues', 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input: statement, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}

try {
  // Confirm the real local mail capture is available before requesting any sign-in.
  assert.equal((await fetch(`${inbox}/api/v1/messages`)).status, 200);
  for (const path of ['/app', '/app/issues', '/app/issues/new']) {
    const r = await request(path);
    check(r.status === 307 && new URL(r.headers.get('location'), origin).pathname === '/login', `${path} redirects logged-out users`);
  }
  let response = await request('/login');
  check(response.status === 200, 'login renders');
  let html = await response.text();
  let data = actionForm(html); data.set('email', 'not-an-email');
  response = await request('/login', { method: 'POST', body: data });
  check((await response.text()).includes('Enter a valid email address.'), 'server validates email');
  html = await (await request('/login')).text();
  data = actionForm(html); data.set('email', email);
  response = await request('/login', { method: 'POST', body: data });
  check((await response.text()).includes('Check your email'), 'login action requests real local Auth email');
  let message;
  for (let i = 0; i < 15 && !message; i++) {
    const listing = await (await fetch(`${inbox}/api/v1/messages`)).json();
    const match = listing.messages?.find((m) => m.To?.some((to) => to.Address === email));
    if (match) message = await (await fetch(`${inbox}/api/v1/message/${match.ID}`)).json();
    else await new Promise((resolve) => setTimeout(resolve, 500));
  }
  check(!!message, 'passwordless email captured locally');
  const link = [...message.HTML.matchAll(/href="([^"]+)"/g)].map((m) => decode(m[1])).find((url) => url.includes('/auth/confirm?'));
  assert.ok(link, 'Email uses token-hash server callback');
  const url = new URL(link);
  assert.equal(url.origin, origin);
  response = await request(url.pathname + url.search);
  check(response.status === 307 && new URL(response.headers.get('location'), origin).pathname === '/app', 'callback verifies real OTP and redirects to app');
  check(cookies.size > 0, 'callback sets session cookies');
  html = await (await request('/app')).text();
  check(html.includes('Welcome to Building Issues') && html.includes('No building assigned yet'), 'authenticated unassigned user reaches app');
  check((await (await request('/app/issues/new')).text()).includes('An active resident membership is required'), 'unassigned user cannot open submission form');
  const authCookie = [...cookies.keys()].find((name) => /-auth-token(?:\.\d+)?$/.test(name))?.replace(/\.\d+$/, '');
  assert.ok(authCookie, 'Auth cookie exists');
  const readSession = () => {
    const value = cookies.get(authCookie) ?? [...cookies].filter(([name]) => name.startsWith(authCookie + '.')).sort(([a], [b]) => Number(a.split('.').at(-1)) - Number(b.split('.').at(-1))).map(([, value]) => value).join('');
    return JSON.parse(Buffer.from(value.slice('base64-'.length), 'base64url').toString('utf8'));
  };
  const expiredSession = readSession(); expiredSession.expires_at = 1;
  const encoded = 'base64-' + Buffer.from(JSON.stringify(expiredSession)).toString('base64url');
  for (const name of [...cookies.keys()]) if (name === authCookie || name.startsWith(authCookie + '.')) cookies.delete(name);
  if (encoded.length <= 3180) cookies.set(authCookie, encoded);
  else for (let i = 0; i < encoded.length; i += 3180) cookies.set(authCookie + '.' + (i / 3180), encoded.slice(i, i + 3180));
  response = await request('/app');
  check(response.status === 200 && readSession().expires_at > Math.floor(Date.now() / 1000), 'expired session is refreshed through local Auth and response cookies');
  sql(`insert into public.resident_memberships(user_id,building_id,unit_id)
       select p.id,u.building_id,u.id from public.profiles p cross join public.units u
       where p.email='${email}' and u.building_id='10000000-0000-4000-8000-000000000001' and u.unit_number='101';`);
  response = await request('/app/issues'); html = await response.text();
  check(response.status === 200 && html.includes('L Tower') && html.includes('Report an issue'), 'assigned user sees building in protected issues shell');
  check(!html.includes('your-publishable-key') && !html.includes('service_role'), 'shell includes no administrative key');
  const sharedTitle = `Smoke shared issue ${randomUUID()}`;
  const privateDetails = `PRIVATE report ${randomUUID()}`;
  html = await (await request('/app/issues/new')).text();
  check(html.includes('Report for') && html.includes('Shared issue title'), 'assigned resident can open submission form');
  const reportData = (title = sharedTitle, details = privateDetails) => {
    const body = actionForm(html, 1);
    body.set('title', title); body.set('text', details); body.set('location', 'Shared lobby'); body.set('category', 'elevator');
    return body;
  };
  response = await request('/app/issues/new', { method: 'POST', body: reportData('   ', '   ') });
  check((await response.text()).includes('Check the highlighted fields.'), 'submission validates blank fields on the server');
  data = reportData();
  data.set('building_id', 'ffffffff-ffff-4fff-8fff-ffffffffffff');
  data.set('resident_id', 'ffffffff-ffff-4fff-8fff-ffffffffffff');
  data.set('status', 'resolved'); data.set('source', 'admin');
  response = await request('/app/issues/new', { method: 'POST', body: data });
  const destination = new URL(response.headers.get('location'), origin);
  check(response.status === 303 && destination.pathname === '/app/issues' && !!destination.searchParams.get('submitted'), 'successful submission redirects to confirmation');
  const stored = JSON.parse(sql(`select json_build_object('incidents',count(*),'safe',bool_and(i.building_id='10000000-0000-4000-8000-000000000001' and i.status='reported' and i.description='' and i.created_by=p.id),'reports',(select count(*) from public.reports r join public.incidents x on x.id=r.incident_id where x.title='${sharedTitle}' and r.resident_id=p.id and r.source='app')) from public.incidents i join public.profiles p on p.id=i.created_by where i.title='${sharedTitle}' and p.email='${email}' group by p.id;`).trim());
  check(stored.incidents === 1 && stored.reports === 1 && stored.safe, 'one incident and one report created; spoofed identity, building, status and source ignored');
  const confirmation = await (await request(destination.pathname + destination.search)).text();
  check(confirmation.includes('Your report was submitted') && confirmation.includes(sharedTitle) && !confirmation.includes(privateDetails), 'confirmation shows shared incident and keeps private report text out of list');
  sql(`update public.resident_memberships set is_active=false where user_id=(select id from public.profiles where email='${email}');`);
  response = await request('/app/issues/new', { method: 'POST', body: reportData('Revoked smoke report') });
  check((await response.text()).includes('An active resident membership is required'), 'stale form cannot submit after membership is revoked');
  check(sql(`select count(*) from public.incidents where title='Revoked smoke report';`).trim() === '0', 'revoked submission creates no orphan incident');
  sql(`update public.resident_memberships set is_active=true where user_id=(select id from public.profiles where email='${email}'); update public.profiles set role='management' where email='${email}';`);
  response = await request('/app/issues/new', { method: 'POST', body: reportData('Manager smoke report') });
  check((await response.text()).includes('An active resident membership is required'), 'stale form cannot submit after role is changed to management');
  sql(`update public.profiles set role='resident' where email='${email}';`);
  // Replay must fail in a separate cookie jar, without destroying the good session.
  const session = new Map(cookies); cookies.clear();
  response = await request(url.pathname + url.search);
  check(new URL(response.headers.get('location'), origin).pathname === '/login', 'used magic link cannot be replayed');
  cookies.clear(); for (const [k, v] of session) cookies.set(k, v);
  data = actionForm(await (await request('/app')).text());
  response = await request('/app', { method: 'POST', body: data });
  check([303, 307].includes(response.status) && new URL(response.headers.get('location'), origin).pathname === '/login', 'logout redirects to login');
  response = await request('/app');
  check(response.status === 307 && new URL(response.headers.get('location'), origin).pathname === '/login', 'logged-out cookie session cannot access app');
  response = await request('/auth/confirm?type=email&token_hash=invalid&next=https://example.invalid');
  check(new URL(response.headers.get('location'), origin).pathname === '/login', 'invalid token and external redirect target rejected');
  console.log(`${checks} HTTP/Auth checks passed.`);
} finally {
  // email is generated here, never user input. FK cascades remove its membership.
  sql(`delete from public.incidents where created_by=(select id from public.profiles where email='${email}'); delete from auth.users where email='${email}';`);
}
