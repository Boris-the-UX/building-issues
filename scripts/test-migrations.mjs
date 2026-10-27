// Disposable LOCAL PostgreSQL harness. Never resets the running development database.
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=['exec','-i','supabase_db_building-issues','psql','-U','postgres','-v','ON_ERROR_STOP=1','-q','-At'];
function run(database,input){return execFileSync('docker',[...root,'-d',database],{input,encoding:'utf8',stdio:['pipe','pipe','pipe']});}
const stub=`create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;
create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb);alter table storage.objects enable row level security;
grant usage on schema storage to authenticated,anon;grant select,insert,update,delete on storage.objects to authenticated,anon;create schema extensions;`;
const migrations=readdirSync('supabase/migrations').filter((name)=>name.endsWith('.sql')).sort();
async function disposable(label,callback){
 const database='building_issues_check_'+randomUUID().replaceAll('-','').slice(0,10);
 run('postgres','create database '+database+';');
 try{run(database,stub);await callback(database);console.log('PASS:',label);}finally{run('postgres','drop database '+database+';');}
}
await disposable('all migrations and repeated seed from a clean database',async(database)=>{
 for(const name of migrations)run(database,readFileSync('supabase/migrations/'+name,'utf8'));
 run(database,readFileSync('supabase/seed.sql','utf8'));run(database,readFileSync('supabase/seed.sql','utf8'));
 for(const name of readdirSync('supabase/tests').filter((name)=>name.endsWith('.sql')).sort()){
  run(database,readFileSync('supabase/tests/'+name,'utf8'));console.log('PASS: clean database suite',name);
 }
});
await disposable('existing Tower 2 / 3C account and private history preserved',async(database)=>{
 for(const name of migrations.slice(0,2))run(database,readFileSync('supabase/migrations/'+name,'utf8'));
 run(database,`insert into public.buildings(id,name,address,timezone) values('10000000-0000-4000-8000-000000000001','L Tower','Fictional','Europe/Lisbon');
 insert into public.units(id,building_id,unit_number) values('90000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','3C');
 insert into auth.users(id,email) values('90000000-0000-4000-8000-000000000002','migration-fixture@example.invalid');
 insert into public.resident_memberships(user_id,building_id,unit_id) values('90000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000001');
 set request.jwt.claim.sub='90000000-0000-4000-8000-000000000002';
 select public.submit_resident_report('Preserved issue','Retained private report fixture','Lobby','maintenance');
 insert into public.legacy_tickets(incident_id,resident_id,resident_topic) select incident_id,resident_id,'Retained recollection' from public.reports;`);
 for(const name of migrations.slice(2))run(database,readFileSync('supabase/migrations/'+name,'utf8'));
 const result=run(database,`select json_build_object(
 'membership',(select count(*) from public.resident_memberships m join public.units u on u.id=m.unit_id join public.buildings b on b.id=m.building_id where m.user_id='90000000-0000-4000-8000-000000000002' and m.is_active and u.unit_number='3C' and u.id='90000000-0000-4000-8000-000000000001' and b.name='Tower 2'),
 'report',(select count(*) from public.reports where text='Retained private report fixture'),
 'ticket',(select count(*) from public.legacy_tickets where resident_topic='Retained recollection'),
 'towers',(select count(*) from public.buildings where complex_id='10000000-0000-4000-8000-000000000001'),
 'unit_copies',(select count(*) from public.units where building_id='10000000-0000-4000-8000-000000000001' and unit_number='3C'));`);
 assert.deepEqual(JSON.parse(result.trim()),{membership:1,report:1,ticket:1,towers:2,unit_copies:1});
});
