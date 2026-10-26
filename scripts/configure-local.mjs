import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync } from 'node:fs';

if (existsSync('.env.local')) {
  console.error('.env.local already exists; preserved it. Edit it yourself if a different project is needed.');
  process.exit(1);
}
try {
  const status = JSON.parse(execFileSync(process.execPath, ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  const url = status.API_URL;
  const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
  if (!url || !key || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
    throw new Error('Expected local Supabase status with a public key.');
  }
  writeFileSync('.env.local', `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created ignored .env.local for the local Supabase stack. No keys printed.');
} catch {
  console.error('Could not configure the local environment. Start the local Supabase stack first; see README.md.');
  process.exit(1);
}
