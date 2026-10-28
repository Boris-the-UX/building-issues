\set ON_ERROR_STOP on
begin;
create function pg_temp.check_complex(ok boolean,label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %',label;end if;raise notice 'PASS: %',label;end $$;
create function pg_temp.deny_complex(statement text,code text,label text) returns void language plpgsql as $$
begin begin execute statement;exception when others then if sqlstate=code then raise notice 'PASS: %',label;return;end if;raise;end;raise exception 'FAIL: %',label;end $$;
insert into auth.users(id,email) values
('f0000000-0000-4000-8000-000000000001','complex-one@example.invalid'),
('f0000000-0000-4000-8000-000000000002','complex-two@example.invalid'),
('f0000000-0000-4000-8000-000000000003','complex-neighbor@example.invalid'),
('f0000000-0000-4000-8000-000000000004','complex-outsider@example.invalid'),
('f0000000-0000-4000-8000-000000000005','complex-manager@example.invalid');
insert into public.complexes(id,name) values('f1000000-0000-4000-8000-000000000001','Test complex');
insert into public.buildings(id,complex_id,name,address) values
('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Tower 1','Fictional'),
('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000001','Tower 2','Fictional');
insert into public.buildings(id,name,address) values('f2000000-0000-4000-8000-000000000003','Unrelated','Fictional');
insert into public.units(id,building_id,unit_number) values
('f3000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','3C'),
('f3000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','3C'),
('f3000000-0000-4000-8000-000000000003','f2000000-0000-4000-8000-000000000002','3D');
insert into public.resident_memberships(user_id,building_id,unit_id) values
('f0000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001'),
('f0000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000002'),
('f0000000-0000-4000-8000-000000000003','f2000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000003'),
('f0000000-0000-4000-8000-000000000004','f2000000-0000-4000-8000-000000000003',null);
update public.profiles set role='management' where id='f0000000-0000-4000-8000-000000000005';
insert into public.management_buildings(user_id,building_id) values('f0000000-0000-4000-8000-000000000005','f2000000-0000-4000-8000-000000000001');
select id as tower1_loc from public.issue_locations where building_id='f2000000-0000-4000-8000-000000000001' and code='elevators' \gset
select id as tower2_loc from public.issue_locations where building_id='f2000000-0000-4000-8000-000000000002' and code='elevators' \gset
select id as shared_loc from public.issue_locations where complex_id='f1000000-0000-4000-8000-000000000001' and building_id is null and code='rear_gate' \gset
select id as outsider_loc from public.issue_locations where building_id='f2000000-0000-4000-8000-000000000003' and code='elevators' \gset
select ('[1,'||array_to_string(array_fill(0,array[383]),',')||']') as embedding \gset
select jsonb_build_object('submission_id','f4000000-0000-4000-8000-000000000001','current_status','no_response','title','Elevator #2 not working','text','PRIVATE first resident report','category','elevator','request_kind','fault','location_id',:'tower2_loc','location_detail','Elevator #2','embedding',:'embedding') as payload \gset
select pg_temp.deny_complex(format('update public.issue_locations set building_id=%L where id=%L','f2000000-0000-4000-8000-000000000001',:'tower2_loc'),'23514','existing facility cannot be moved to another tower');
set local role anon;
select pg_temp.deny_complex($q$select public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')$q$,'42501','anonymous statistics denied');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000002';
select public.submit_complex_report(:'payload'::jsonb) as first_report \gset
select (:'first_report'::jsonb->>'incident_id') as incident_id \gset
select (:'first_report'::jsonb->>'report_id') as report_id \gset
select pg_temp.check_complex((select count(*)=1 from public.reports where id=:'report_id' and unit_id='f3000000-0000-4000-8000-000000000002'),'report snapshots known unit without exposing it');
select pg_temp.check_complex((public.submit_complex_report(:'payload'::jsonb)->>'report_id')=:'report_id','same submission key is idempotent');
select pg_temp.check_complex((select count(*)=1 from public.reports where incident_id=:'incident_id'),'retry adds no duplicate report');
select pg_temp.check_complex((select count(*)=1 from public.resident_status_observations where incident_id=:'incident_id'),'submission stores status atomically once');
select pg_temp.deny_complex(format('select public.submit_complex_report(%L::jsonb)',(:'payload'::jsonb||jsonb_build_object('submission_id','f4000000-0000-4000-8000-000000000098','current_status','invalid'))::text),'22023','invalid initial status rejects the whole submission');
select pg_temp.deny_complex($q$select * from private.incident_embeddings$q$,'42501','private vectors cannot be enumerated');
select pg_temp.check_complex((select count(*)=1 from public.find_similar_incidents(:'tower2_loc','elevator','fault','Elevator #2','Lift #2 broken',:'embedding')),'same object and vector yields a meaning-based suggestion');
select pg_temp.check_complex((select count(*)=1 from public.find_similar_incidents(:'tower2_loc','elevator','fault','Elevator #2','Second lift out of service',:'embedding')),'written ordinal object numbers match numeric identifiers');
select pg_temp.check_complex((select count(*)=1 from public.find_similar_incidents(:'tower2_loc','elevator','fault','Elevator #2','Tower 2 elevator number two is broken',:'embedding')),'structured tower number is not mistaken for an additional elevator number');
select pg_temp.check_complex((select count(*)=0 from public.find_similar_incidents(:'tower1_loc','elevator','fault','Elevator #2','Lift #2 broken',:'embedding')),'different tower is never suggested');
select pg_temp.check_complex((select count(*)=0 from public.find_similar_incidents(:'tower2_loc','elevator','fault','Elevator #2','Lift #1 broken',:'embedding')),'different elevator number is never suggested');
select pg_temp.check_complex((select count(*)=0 from public.find_similar_incidents(:'tower2_loc','elevator','change_request','Elevator #2','Lift #2 broken',:'embedding')),'different request type is never suggested');
select pg_temp.check_complex((select count(*)=0 from public.find_similar_incidents(:'tower2_loc','plumbing','fault','Elevator #2','Lift #2 broken',:'embedding')),'different category is never suggested');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000003';
select public.submit_complex_report(:'payload'::jsonb||jsonb_build_object('submission_id','f4000000-0000-4000-8000-000000000002','title','Lift #2 broken','text','PRIVATE neighbor report','target_incident_id',:'incident_id')) as second_report \gset
select pg_temp.check_complex((:'second_report'::jsonb->>'incident_id')=:'incident_id','confirmed semantic match joins the existing incident');
select pg_temp.check_complex((select count(*)=1 from public.reports where incident_id=:'incident_id'),'neighbor still reads only their own individual report');
select pg_temp.check_complex((public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')->>'reports')::int=2,'statistics count both private reports without returning their text');
select pg_temp.check_complex((public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')->>'incidents')::int=1,'two reports synthesize into one confirmed incident');
select pg_temp.check_complex((public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')->>'reporting_households')::int=2,'reporting households are counted distinctly');
select pg_temp.check_complex(position('PRIVATE' in public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')::text)=0,'statistics expose no private report text');
select pg_temp.check_complex((select count(*)=1 from public.units),'neighbor cannot enumerate another unit even across complex');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000001';
select pg_temp.check_complex((select count(*)=1 from public.incidents where id=:'incident_id'),'other tower residents see complex-wide shared incidents');
select pg_temp.check_complex((select count(*)=0 from public.reports where incident_id=:'incident_id'),'other tower residents cannot see individual private reports');
select public.submit_complex_report(:'payload'::jsonb||jsonb_build_object('submission_id','f4000000-0000-4000-8000-000000000003','title','Open rear gate','text','Private request','location_id',:'shared_loc','location_detail','','category','access','request_kind','change_request')) as shared_report \gset
select pg_temp.check_complex((select building_id is null from public.incidents where id=(:'shared_report'::jsonb->>'incident_id')::uuid),'shared facility is not assigned to an arbitrary tower');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000005';
select pg_temp.check_complex((public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')->>'incidents')::int=1,'manager sees only assigned tower and common facilities');
select pg_temp.check_complex((select count(*)=0 from public.reports where incident_id=:'incident_id'),'manager without Tower 2 assignment cannot see Tower 2 private reports');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000004';
select pg_temp.deny_complex($q$select public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')$q$,'42501','unrelated complex cannot read statistics');
select pg_temp.check_complex((select count(*)=0 from public.incidents where id=:'incident_id'),'unrelated complex cannot read incidents');
select pg_temp.deny_complex(format('select public.submit_complex_report(%L::jsonb)',:'payload'),'42501','cross-complex submission denied');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000002';
select public.reserve_report_attachment('f5000000-0000-4000-8000-000000000001',:'tower2_loc','photo.png','image/png',68) as reserved \gset
select pg_temp.check_complex((select count(*)=1 from public.report_attachments where batch_id='f5000000-0000-4000-8000-000000000001'),'owner can reserve a private attachment');
select pg_temp.deny_complex(format('select public.reserve_report_attachment(%L,%L,%L,%L,1)','f5000000-0000-4000-8000-000000000001',:'tower2_loc','page.html','text/html'),'22023','active-content file types rejected');
select pg_temp.deny_complex(format('select public.reserve_report_attachment(%L,%L,%L,%L,10485761)','f5000000-0000-4000-8000-000000000001',:'tower2_loc','large.png','image/png'),'22023','oversized photo rejected');
select pg_temp.deny_complex(format('select public.reserve_report_attachment(%L,%L,%L,%L,1)','f5000000-0000-4000-8000-000000000001',:'tower2_loc','../file.png','image/png'),'22023','path-like filenames rejected');
select pg_temp.deny_complex(format('select public.submit_complex_report(%L::jsonb)',(:'payload'::jsonb||jsonb_build_object('submission_id','f5000000-0000-4000-8000-000000000001'))::text),'22023','incomplete attachment prevents report creation');
select pg_temp.check_complex((select count(*)=0 from public.reports where submission_id='f5000000-0000-4000-8000-000000000001'),'failed file finalization leaves no report');
reset role;
insert into storage.objects(bucket_id,name,metadata) values('report-media',(:'reserved'::jsonb->>'path'),'{"size":68,"mimetype":"image/png"}');
set local role authenticated;
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000003';
select pg_temp.check_complex((select count(*)=0 from public.report_attachments where batch_id='f5000000-0000-4000-8000-000000000001'),'neighbor cannot enumerate pending media');
select pg_temp.check_complex((select count(*)=0 from storage.objects where name=(:'reserved'::jsonb->>'path')),'neighbor cannot read raw private storage object');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000002';
select pg_temp.check_complex((select count(*)=1 from storage.objects where name=(:'reserved'::jsonb->>'path')),'owner can read their pending storage object');
select public.submit_complex_report(:'payload'::jsonb||jsonb_build_object('submission_id','f5000000-0000-4000-8000-000000000001','target_incident_id',:'incident_id')) as with_file \gset
select pg_temp.check_complex((select count(*)=1 from public.report_attachments where report_id=(:'with_file'::jsonb->>'report_id')::uuid),'uploaded file is linked atomically to the report');
select pg_temp.check_complex(not private.can_upload_attachment(:'reserved'::jsonb->>'path'),'submitted file cannot be overwritten or deleted by the resident');
select pg_temp.check_complex((public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')->>'reporting_households')::int=3,'multiple reports by one household do not inflate household totals');
select pg_temp.deny_complex(format('select public.reserve_report_attachment(%L,%L,%L,%L,68)','f5000000-0000-4000-8000-000000000001',:'tower2_loc','later.png','image/png'),'42501','submitted batch cannot accept more files');
select pg_temp.deny_complex(format('select public.reserve_report_attachment(%L,%L,%L,%L,68)','f5000000-0000-4000-8000-000000000002',:'outsider_loc','outside.png','image/png'),'42501','cross-complex attachment reservation denied');
select public.reserve_report_attachment('f5000000-0000-4000-8000-000000000002',:'tower2_loc','video.mp4','video/mp4',100);
select pg_temp.deny_complex(format('select public.reserve_report_attachment(%L,%L,%L,%L,100)','f5000000-0000-4000-8000-000000000002',:'tower2_loc','second.mp4','video/mp4'),'22023','second video in one batch is rejected');
select public.reserve_report_attachment('f5000000-0000-4000-8000-000000000002',:'tower2_loc','photo'||g::text||'.png','image/png',68) from generate_series(1,4)g;
select pg_temp.deny_complex(format('select public.reserve_report_attachment(%L,%L,%L,%L,68)','f5000000-0000-4000-8000-000000000002',:'tower2_loc','sixth.png','image/png'),'22023','sixth attachment is rejected');
reset role;
update public.incidents set status='resolved',resolved_at=now() where id=:'incident_id';
set local role authenticated;
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000002';
select pg_temp.check_complex((select count(*)=0 from public.find_similar_incidents(:'tower2_loc','elevator','fault','Elevator #2','Lift #2 broken',:'embedding')),'resolved incident is not suggested for a new episode');
select pg_temp.deny_complex(format('select public.submit_complex_report(%L::jsonb)',(:'payload'::jsonb||jsonb_build_object('submission_id','f4000000-0000-4000-8000-000000000099','target_incident_id',:'incident_id'))::text),'22023','resolved incident cannot receive a semantic attachment');
reset role;
update public.incidents set status='reported',resolved_at=null where id=:'incident_id';
reset role;
update public.resident_memberships set is_active=false where user_id='f0000000-0000-4000-8000-000000000002';
set local role authenticated;
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000002';
select pg_temp.check_complex((select count(*)=0 from storage.objects where name=(:'reserved'::jsonb->>'path')),'revocation removes access to previously uploaded files');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000001';
select pg_temp.check_complex((public.get_filtered_complex_statistics('f1000000-0000-4000-8000-000000000001','{}')->>'incidents')=(public.get_complex_statistics('f1000000-0000-4000-8000-000000000001')->>'incidents'),'unfiltered charts preserve aggregate counts');
select pg_temp.check_complex((public.get_filtered_complex_statistics('f1000000-0000-4000-8000-000000000001','{"category":"noise"}')->>'incidents')::int=0,'category filter excludes unrelated issues');
select pg_temp.check_complex((public.get_filtered_complex_statistics('f1000000-0000-4000-8000-000000000001','{"since":"2999-01-01"}')->>'reports')::int=0,'date filter also scopes report totals');
select pg_temp.check_complex((public.get_filtered_complex_statistics('f1000000-0000-4000-8000-000000000001','{"place":"f2000000-0000-4000-8000-000000000003"}')->>'incidents')::int=0,'location filter cannot expose unrelated building issues');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000004';
select pg_temp.deny_complex($q$select public.get_filtered_complex_statistics('f1000000-0000-4000-8000-000000000001','{}')$q$,'42501','outsider cannot access filtered statistics');
reset role;
set local role authenticated;
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000001';
select public.add_resident_status(:'incident_id','resolved','');
select pg_temp.check_complex(public.get_issue_activity(:'incident_id')->>'status'='resolved','resident resolution is visible as a resident assertion');
select public.add_resident_status(:'incident_id','not_sure','');
select pg_temp.check_complex(public.get_issue_activity(:'incident_id')->>'status'='resolved','not sure does not erase a known resolution');
select pg_temp.check_complex((select count(*)=0 from public.find_similar_incidents(:'tower2_loc','elevator','fault','Elevator #2','Lift #2 broken',:'embedding')),'resident-resolved episode is not suggested');
select public.add_resident_status(:'incident_id','promised','');
select pg_temp.check_complex(public.get_issue_activity(:'incident_id')->>'status'='promised','later known observation updates resident status');
select pg_temp.check_complex(not (public.get_issue_activity(:'incident_id')::text like '%PRIVATE%') and not (public.get_issue_activity(:'incident_id')::text like '%user_id%'),'public history exposes dates and status only');
select pg_temp.deny_complex(format('select public.add_resident_status(%L,%L,%L)',:'incident_id','other',''),'23514','Other requires a description in the database');
select pg_temp.deny_complex(format('select public.add_resident_status(%L,%L,%L)',:'incident_id','made_up',''),'23514','unrecognized status rejected in database');
select pg_temp.deny_complex(format('insert into public.resident_status_observations(incident_id,user_id,status) values(%L,%L,%L)',:'incident_id','f0000000-0000-4000-8000-000000000003','resolved'),'42501','direct forged observation insert denied');
set local request.jwt.claim.sub='f0000000-0000-4000-8000-000000000004';
select pg_temp.deny_complex(format('select public.get_issue_activity(%L)',:'incident_id'),'42501','outsider cannot read report dates');
select pg_temp.deny_complex(format('select public.add_resident_status(%L,%L,%L)',:'incident_id','resolved',''),'42501','outsider cannot change resident status');
reset role;
rollback;
