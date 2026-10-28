// Optional local browser integration. Dependencies live outside the checkout.
// npm install --prefix /tmp/building-issues-browser playwright @sparticuz/chromium
// BROWSER_TEST_TOOL_DIR=/tmp/building-issues-browser BROWSER_TEST_SERVERLESS_CHROMIUM=1 node scripts/browser-smoke.mjs
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
assert.match(readFileSync('.env.local','utf8'),/NEXT_PUBLIC_SUPABASE_URL=http:\/\/(127\.0\.0\.1|localhost):54321(?:\r?\n|$)/);
const tools=createRequire(join(process.env.BROWSER_TEST_TOOL_DIR||'/tmp/building-issues-browser','package.json'));
const {chromium}=tools('playwright');
const serverless=process.env.BROWSER_TEST_SERVERLESS_CHROMIUM==='1'?(await import(pathToFileURL(tools.resolve('@sparticuz/chromium')).href)).default:null;
const browser=await chromium.launch(serverless?{executablePath:await serverless.executablePath(),args:serverless.args,headless:true}:{headless:true});
const origin='http://localhost:3000';
const prefix='browser-'+randomUUID();
const emails=[`${prefix}-one@example.invalid`,`${prefix}-two@example.invalid`];
const sharedTitle=`Missing communal waste point ${prefix}`;
const privateText='PRIVATE personal report: no shared area for rubbish disposal.';
let checks=0;
function check(ok,label){assert.ok(ok,label);checks++;console.log('PASS:',label);}
function sql(statement){return execFileSync('docker',['exec','-i','supabase_db_building-issues','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:statement,encoding:'utf8',stdio:['pipe','pipe','pipe']});}
async function login(page,email){
 await page.goto(origin+'/login');await page.getByLabel('Email address').fill(email);await page.getByRole('button',{name:'Send sign-in link'}).click();
 await page.getByText('Check your email for a sign-in link.',{exact:false}).waitFor();
 let message;
 for(let i=0;i<20&&!message;i++){
  const listing=await(await fetch('http://127.0.0.1:54324/api/v1/messages')).json();
  const item=listing.messages?.find((m)=>m.To?.some((to)=>to.Address===email));
  if(item)message=await(await fetch(`http://127.0.0.1:54324/api/v1/message/${item.ID}`)).json();else await new Promise((r)=>setTimeout(r,300));
 }
 assert.ok(message);
 const href=[...message.HTML.matchAll(/href="([^"]+)"/g)].map((m)=>m[1].replaceAll('&amp;','&')).find((u)=>u.includes('/auth/confirm?'));
 assert.ok(href);assert.equal(new URL(href).origin,origin);await page.goto(href);await page.waitForURL('**/app/issues',{timeout:15000}).catch(async(error)=>{console.error('Login landing:',new URL(page.url()).pathname,(await page.locator('body').innerText()).slice(0,350));throw error;});
}
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const page=await context.newPage();page.setDefaultTimeout(20000);
const secondContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const second=await secondContext.newPage();second.setDefaultTimeout(20000);
let attachmentId;
try{
 await login(page,emails[0]);
 sql(`insert into public.resident_memberships(user_id,building_id,unit_id) select p.id,u.building_id,u.id from public.profiles p cross join public.units u where p.email='${emails[0]}' and u.building_id='10000000-0000-4000-8000-000000000001' and u.unit_number='3C';`);
 if(process.env.BROWSER_UI_ONLY==='1') {
  await page.goto(origin+'/app/issues/new');
  check(await page.locator('#location_id').count()===0&&await page.locator('#problem').count()===0,'dependent questions are initially hidden');
  check(!(await page.locator('body').innerText()).includes('Your home:'),'redundant home caption removed');
  await page.goto(origin+'/app/statistics');
  await page.getByRole('heading',{name:'Issue statistics'}).waitFor();
  check(await page.locator('table').count()===0 && await page.locator('.bar-chart').count()===3,'statistics are three labeled charts');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile statistics have no horizontal overflow');
  await page.getByLabel('Year',{exact:true}).fill('2999');await page.getByLabel('Month',{exact:true}).selectOption('01');await page.getByLabel('Day',{exact:true}).selectOption('01');
  await page.getByRole('button',{name:'Apply filters'}).click();
  await page.getByText('No issues match these filters.',{exact:false}).waitFor();
  check(await page.locator('.bar-chart').count()===0,'date filter scopes all charts');
  await page.getByRole('link',{name:'Reset filters'}).click();
  await page.locator('.bar-chart').first().waitFor();
  await page.setViewportSize({width:1280,height:900});
  const baselines=await page.locator('.stats-grid dd').evaluateAll((items)=>items.map((item)=>item.getBoundingClientRect().bottom));
  check(Math.max(...baselines)-Math.min(...baselines)<1,'summary values align');
  await page.screenshot({path:'/tmp/building-issues-desktop-statistics.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'/tmp/building-issues-mobile-statistics.png',fullPage:true});
  await page.goto(origin+'/app/issues');
  check(await page.locator('.issues-table').isVisible(),'overview includes a location column');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile issue cards have no horizontal overflow');
 } else {
 await page.goto(origin+'/app/issues/new');
 check(await page.getByLabel('Where is the issue?').inputValue()==='','building choice is mandatory and never guessed from home');
 check(await page.locator('#location_id').count()===0&&await page.locator('#problem').count()===0&&await page.locator('#current_status').count()===0,'only the building question appears initially');
 const buildingOptions=await page.locator('#scope').innerText();
 check(['Tower 1','Tower 2','Bloco 1','Bloco 2'].every((name)=>buildingOptions.includes(name)),'all four buildings are available');
 await page.getByLabel('Where is the issue?').selectOption('shared');
 const place=sql("select id from public.issue_locations where complex_id='10000000-0000-4000-8000-000000000001' and building_id is null and code='waste';").trim();
 check(await page.locator('#problem').count()===0,'problem remains hidden until a place is chosen');
 await page.getByLabel('Which place or facility?').selectOption(place);
 await page.getByLabel('What is the problem?').selectOption('other');
 check(await page.getByLabel('Describe the problem',{exact:true}).isVisible(),'Other reveals a required problem description');
 check(await page.locator('#current_status').count()===0,'Other needs a description before showing status');
 await page.getByLabel('What is the problem?').selectOption('missing_waste');
 await page.getByLabel('What is the current status?').selectOption('no_response');
 await page.getByLabel('Where is the issue?').selectOption('10000000-0000-4000-8000-000000000003');
 check(await page.locator('#location_id').inputValue()===''&&await page.locator('#problem').count()===0&&await page.locator('#current_status').count()===0,'changing building clears dependent answers and hides later questions');
 await page.getByLabel('Where is the issue?').selectOption('shared');
 await page.getByLabel('Which place or facility?').selectOption(place);
 await page.getByLabel('What is the problem?').selectOption('missing_waste');
 await page.getByLabel('What is the current status?').selectOption('no_response');
 await page.getByText('Additional details (optional)',{exact:true}).click();
 await page.getByLabel('Floor, object number or landmark').fill('Near the main entrance');
 await page.getByLabel('Additional details',{exact:true}).fill(privateText);
 await page.getByRole('button',{name:'Continue',exact:true}).click();
 await page.getByLabel('Public issue title').fill(sharedTitle);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5r0AAAAASUVORK5CYII=','base64');
 await page.locator('#media').setInputFiles({name:'evidence.png',mimeType:'image/png',buffer:png});
 check(await page.getByRole('img',{name:'evidence.png'}).isVisible(),'selected photo has a mobile preview');
 await page.getByRole('button',{name:'Remove',exact:true}).click();
 check(await page.getByRole('img',{name:'evidence.png'}).count()===0,'selected file can be removed before upload');
 const webm=Buffer.from(await page.evaluate(async()=>{
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const context=canvas.getContext('2d');context.fillStyle='green';context.fillRect(0,0,64,64);
  const stream=canvas.captureStream(5);const recorder=new MediaRecorder(stream,{mimeType:'video/webm'});const chunks=[];
  return await new Promise((resolve)=>{recorder.ondataavailable=(event)=>chunks.push(event.data);recorder.onstop=async()=>{stream.getTracks().forEach((track)=>track.stop());resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())));};recorder.start();setTimeout(()=>recorder.stop(),500);});
 }));
 await page.locator('#media').setInputFiles([{name:'evidence.png',mimeType:'image/png',buffer:png},{name:'gate.webm',mimeType:'video/webm',buffer:webm}]);
 check(await page.locator('video').count()===1,'selected real WebM video has a preview control');
 check(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'form has no horizontal overflow at 390px');
 await page.screenshot({path:'/tmp/building-issues-mobile-form.png',fullPage:true});
 await page.getByRole('button',{name:'Send report',exact:true}).click();
 await page.waitForURL('**/app/reports/**');
 check(await page.getByRole('link',{name:'evidence.png',exact:true}).isVisible(),'actual photo upload is attached to the submitted report');
 check(await page.getByRole('link',{name:'gate.webm',exact:true}).isVisible(),'actual video upload is attached to the submitted report');
 check(await page.getByText(privateText,{exact:true}).isVisible(),'author sees their private report');
 await page.getByRole('link',{name:'View shared issue and history'}).click();
 await page.waitForURL('**/app/issues/*');
 check(await page.getByRole('heading',{name:'Your report',exact:true}).isVisible(),'shared issue explains the private Your report block');
 check(!(await page.locator('body').innerText()).includes(privateText),'shared history excludes private narrative');
 check(await page.getByRole('heading',{name:'Resident reports (1)'}).isVisible(),'shared history lists report dates');
 await page.getByLabel('What is the current status?').selectOption('resolved');
 await page.getByRole('button',{name:'Save status update'}).click();
 await page.locator('.status').filter({hasText:'Resolved / Fixed'}).waitFor();
 check(await page.getByText('Your update was saved.',{exact:true}).isVisible(),'resident can save a status update');
 await page.getByLabel('What is the current status?').selectOption('no_response');
 await page.getByRole('button',{name:'Save status update'}).click();
 await page.locator('.status').filter({hasText:'No response'}).waitFor();
 check(await page.getByRole('heading',{name:'Status history'}).isVisible(),'status changes retain a dated history');

 attachmentId=sql(`select a.id from public.report_attachments a join public.profiles p on p.id=a.user_id where p.email='${emails[0]}' and a.filename='evidence.png';`).trim();
 const download=await context.request.get(origin+'/api/attachments/'+attachmentId,{maxRedirects:0});
 check(download.status()===303&&download.headers()['cache-control'].includes('no-store'),'authorized file link is short-lived and not cached');
 const bytes=await context.request.get(download.headers().location);
 check(bytes.status()===200&&(await bytes.body()).equals(png),'authorized download returns the original file bytes');
 const stranger=await secondContext.request.get(origin+'/api/attachments/'+attachmentId,{maxRedirects:0});
 check(stranger.status()===401,'logged-out requests cannot download private files');
 await login(second,emails[1]);
 sql(`insert into public.resident_memberships(user_id,building_id) select id,'10000000-0000-4000-8000-000000000002' from public.profiles where email='${emails[1]}';`);
 await second.goto(origin+'/app/issues');
 check(await second.getByRole('heading',{name:sharedTitle,exact:true}).isVisible(),'Tower 1 resident sees the shared complex issue');
 check(!(await second.locator('body').innerText()).includes(privateText),'neighbor sees no private report text');
 const denied=await secondContext.request.get(origin+'/api/attachments/'+attachmentId,{maxRedirects:0});
 check(denied.status()===404,'neighbor cannot access the private attachment by ID');
 await second.goto(origin+'/app/issues/new');
 await second.getByLabel('Where is the issue?').selectOption('shared');
 await second.getByLabel('Which place or facility?').selectOption(place);
 await second.getByLabel('What is the problem?').selectOption('missing_waste');
 await second.getByLabel('What is the current status?').selectOption('not_sure');
 await second.getByText('Additional details (optional)',{exact:true}).click();
 await second.getByLabel('Floor, object number or landmark').fill('Near the main entrance');
 await second.getByLabel('Additional details',{exact:true}).fill('There is no shared place to dispose of household rubbish. We need a common collection point.');
 await second.getByRole('button',{name:'Continue',exact:true}).click();
 await second.getByLabel('Public issue title').fill(sharedTitle.replace('Missing communal waste point','No place for communal rubbish bins'));
 await second.locator('#media').setInputFiles({name:'neighbor-evidence.png',mimeType:'image/png',buffer:png});
 await second.getByRole('button',{name:'Send report',exact:true}).click();
 await second.getByText('Similar issues were found.',{exact:false}).waitFor();
 check(await second.locator('input[name="grouping_choice"]').count()>=2,'real semantic paraphrase offers an existing issue plus a separate-problem choice');
 console.log('Selecting the proposed group in the mobile form…');
 await second.locator('input[name="grouping_choice"]').first().check();
 console.log('Confirming the proposed group…');
 await second.getByRole('button',{name:'Confirm and send'}).click();await second.waitForURL('**/app/reports/**',{timeout:20000}).catch(async(error)=>{await second.screenshot({path:'/tmp/building-issues-grouping-error.png',fullPage:true});console.error('Submission page diagnostic:',(await second.locator('body').innerText()).slice(0,2000));throw error;});
 check(await second.getByRole('link',{name:'neighbor-evidence.png',exact:true}).isVisible(),'staged attachment survives the semantic confirmation step');
 check(sql(`select count(r.id) from public.incidents i join public.reports r on r.incident_id=i.id where i.title='${sharedTitle}';`).trim()==='2','confirmation groups two residents’ reports into one incident');
 await second.goto(origin+'/app/statistics');check(await second.getByRole('heading',{name:'Issue statistics'}).isVisible(),'statistics page renders for either tower');
 check(await second.locator('table').count()===0 && await second.locator('.bar-chart').count()===3,'statistics use labeled charts instead of tables');
 check(await second.locator('.bar-label').first().innerText().then((text)=>/\d/.test(text)),'chart counts are visible without hovering');
 check(await second.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'statistics fit a mobile screen');
 await second.locator('select[name=category]').selectOption('noise');
 await second.getByRole('button',{name:'Apply filters'}).click();
 await second.getByText('No issues match these filters.',{exact:false}).waitFor();
 check(await second.locator('.bar-chart').count()===0,'filters update charts and show an explicit empty state');
 await second.getByRole('link',{name:'Reset filters'}).click();
 await second.locator('.bar-chart').first().waitFor();
 await second.setViewportSize({width:1280,height:900});
 const bottoms=await second.locator('.stats-grid dd').evaluateAll((items)=>items.map((item)=>item.getBoundingClientRect().bottom));
 check(Math.max(...bottoms)-Math.min(...bottoms)<1,'summary values align on the same baseline');
 await second.screenshot({path:'/tmp/building-issues-desktop-statistics.png',fullPage:true});
 await second.setViewportSize({width:390,height:844});
 await second.screenshot({path:'/tmp/building-issues-mobile-statistics.png',fullPage:true});
 }
 console.log(`${checks} real mobile browser checks passed.`);
}catch(error){
 console.error('Browser page:',new URL(page.url()).host,new URL(page.url()).pathname);
 await page.screenshot({path:'/tmp/building-issues-browser-error.png',fullPage:true});
 console.error((await page.locator('body').innerText()).slice(0,1800));
 throw error;
}finally{
 await browser.close();
 const paths=sql(`select a.path from public.report_attachments a join public.profiles p on p.id=a.user_id where p.email in ('${emails[0]}','${emails[1]}');`).trim().split('\n').filter(Boolean);
 if(paths.length){
  // Local test cleanup only. Never exposed to a browser or stored in source.
  const status=JSON.parse(execFileSync(process.execPath,['node_modules/supabase/dist/supabase.js','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],env:{...process.env,SUPABASE_HOME:process.env.SUPABASE_HOME||'/tmp/building-issues-supabase'}}));
  const key=status.SERVICE_ROLE_KEY||status.SECRET_KEY;
  assert.ok(key,'Local administrative cleanup binding');
  const result=await fetch('http://127.0.0.1:54321/storage/v1/object/report-media',{method:'DELETE',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json'},body:JSON.stringify({prefixes:paths})});
  assert.ok(result.ok,'Remove local test storage files');
 }
 sql(`delete from public.reports where resident_id in (select id from public.profiles where email in ('${emails[0]}','${emails[1]}')); delete from public.incidents where created_by in (select id from public.profiles where email in ('${emails[0]}','${emails[1]}')); delete from auth.users where email in ('${emails[0]}','${emails[1]}');`);
}
