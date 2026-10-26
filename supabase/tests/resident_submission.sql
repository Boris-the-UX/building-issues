-- Local-only transactional regression suite; no fixtures survive this run.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_submission(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;
create function pg_temp.reject_submission(statement text, expected_code text, label text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when others then
    if sqlstate = expected_code then raise notice 'PASS: %', label; return; end if;
    raise;
  end;
  raise exception 'FAIL: % (operation was allowed)', label;
end $$;
insert into auth.users(id,email) values
('e0000000-0000-4000-8000-000000000001','submission-one@example.invalid'),
('e0000000-0000-4000-8000-000000000002','submission-neighbor@example.invalid'),
('e0000000-0000-4000-8000-000000000003','submission-outsider@example.invalid'),
('e0000000-0000-4000-8000-000000000004','submission-manager@example.invalid'),
('e0000000-0000-4000-8000-000000000005','submission-unassigned@example.invalid');
insert into public.buildings(id,name,address) values
('e1000000-0000-4000-8000-000000000001','Submission test A','Fictional A'),
('e1000000-0000-4000-8000-000000000002','Submission test B','Fictional B');
insert into public.resident_memberships(user_id,building_id) values
('e0000000-0000-4000-8000-000000000001','e1000000-0000-4000-8000-000000000001'),
('e0000000-0000-4000-8000-000000000002','e1000000-0000-4000-8000-000000000001'),
('e0000000-0000-4000-8000-000000000003','e1000000-0000-4000-8000-000000000002');
update public.profiles set role='management' where id='e0000000-0000-4000-8000-000000000004';
insert into public.management_buildings(user_id,building_id) values
('e0000000-0000-4000-8000-000000000004','e1000000-0000-4000-8000-000000000001');

set local role anon;
select pg_temp.reject_submission($q$select public.submit_resident_report('Title','Details')$q$,'42501','anonymous RPC execution denied');
reset role;
set local role authenticated;
select pg_temp.reject_submission($q$select public.submit_resident_report('Title','Details')$q$,'42501','missing identity rejected');
set local request.jwt.claim.sub='e0000000-0000-4000-8000-000000000001';
select public.submit_resident_report('  Submission test elevator  ', '  PRIVATE details  ', ' Lobby ', 'elevator') as incident_id \gset
select pg_temp.assert_submission((select count(*)=1 from public.incidents where id=:'incident_id' and building_id='e1000000-0000-4000-8000-000000000001' and created_by=auth.uid() and status='reported' and title='Submission test elevator' and description='' and location='Lobby' and category='elevator' and first_reported_at=last_report_at and resolved_at is null), 'incident identity, building, initial state and shared fields derived safely');
select pg_temp.assert_submission((select count(*)=1 from public.reports where incident_id=:'incident_id' and resident_id=auth.uid() and source='app' and text='PRIVATE details'), 'one private report linked to new incident');
select pg_temp.reject_submission($q$insert into public.incidents(building_id,title) values ('e1000000-0000-4000-8000-000000000002','Bypass')$q$,'42501','direct cross-building incident insert still denied');
select pg_temp.reject_submission($q$select public.submit_resident_report('','Details')$q$,'22023','empty title rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report(E' \t\n','Details')$q$,'22023','whitespace title rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report(U&'\00a0\2000','Details')$q$,'22023','Unicode whitespace title rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report(null,'Details')$q$,'22023','null title rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report(repeat('x',241),'Details')$q$,'22023','oversized title rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report('Title',E' \n')$q$,'22023','blank report rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report('Title',null)$q$,'22023','null report rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report('Title',repeat('x',10001))$q$,'22023','oversized report rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report('Title','Details',repeat('x',241))$q$,'22023','oversized location rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report('Title','Details',null,'fake')$q$,'22023','invalid category rejected');
select pg_temp.reject_submission($q$select public.submit_resident_report('Title','Details',null,null)$q$,'22023','null category rejected');
select pg_temp.assert_submission((select count(*)=1 from public.incidents where building_id='e1000000-0000-4000-8000-000000000001'), 'invalid inputs create no partial incidents');
set local request.jwt.claim.sub='e0000000-0000-4000-8000-000000000002';
select pg_temp.assert_submission((select count(*)=1 from public.incidents where id=:'incident_id' and description=''), 'neighbor sees shared incident without private description');
select pg_temp.assert_submission((select count(*)=0 from public.reports where incident_id=:'incident_id'), 'neighbor cannot read submitted private report');
set local request.jwt.claim.sub='e0000000-0000-4000-8000-000000000003';
select pg_temp.assert_submission((select count(*)=0 from public.incidents where id=:'incident_id'), 'other building cannot read submitted incident');
set local request.jwt.claim.sub='e0000000-0000-4000-8000-000000000004';
select pg_temp.assert_submission((select count(*)=1 from public.reports where incident_id=:'incident_id'), 'assigned management can read submitted report');
select pg_temp.reject_submission($q$select public.submit_resident_report('Manager submission','Details')$q$,'42501','management cannot impersonate a resident');
set local request.jwt.claim.sub='e0000000-0000-4000-8000-000000000005';
select pg_temp.reject_submission($q$select public.submit_resident_report('Unassigned submission','Details')$q$,'42501','unassigned resident rejected');
reset role;

-- A failure after BOTH inserts must undo the incident and the report.
create function pg_temp.fail_test_report() returns trigger language plpgsql as $$
begin
  if new.text='FORCED ROLLBACK' then raise exception 'Test failure' using errcode='23514'; end if;
  return new;
end $$;
create trigger fail_test_report after insert on public.reports for each row execute function pg_temp.fail_test_report();
set local role authenticated;
set local request.jwt.claim.sub='e0000000-0000-4000-8000-000000000001';
select pg_temp.reject_submission($q$select public.submit_resident_report('Submission test rollback','FORCED ROLLBACK')$q$,'23514','report insert failure propagates');
select pg_temp.assert_submission((select count(*)=0 from public.incidents where title='Submission test rollback'), 'failed report leaves no orphan incident');
select pg_temp.assert_submission((select count(*)=0 from public.reports where text='FORCED ROLLBACK'), 'failed report leaves no partial report');
reset role;
update public.resident_memberships set is_active=false where user_id='e0000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub='e0000000-0000-4000-8000-000000000001';
select pg_temp.reject_submission($q$select public.submit_resident_report('Revoked submission','Details')$q$,'42501','revoked resident rejected');
select pg_temp.assert_submission((select count(*)=0 from public.incidents where id=:'incident_id'), 'revoked resident loses incident access');
reset role;
rollback;
