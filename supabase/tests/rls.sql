-- Run as postgres on a LOCAL database after migrations. All fixtures roll back.
-- Plain PostgreSQL assertions: no additional test framework required.
\set ON_ERROR_STOP on
begin;
create function pg_temp.assert_true(ok boolean, label text) returns void language plpgsql as $$
begin if ok is distinct from true then raise exception 'FAIL: %', label; end if; raise notice 'PASS: %', label; end $$;
create function pg_temp.denied(statement text, label text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when insufficient_privilege then raise notice 'PASS: %', label; return;
  end;
  raise exception 'FAIL: % (operation was allowed)', label;
end $$;
create function pg_temp.constraint_rejects(statement text, label text) returns void language plpgsql as $$
begin
  begin execute statement;
  exception when integrity_constraint_violation then raise notice 'PASS: %', label; return;
  end;
  raise exception 'FAIL: % (invalid data was accepted)', label;
end $$;

insert into auth.users(id,email,raw_user_meta_data) values
('a0000000-0000-4000-8000-000000000001','resident-one@example.invalid','{"role":"admin"}'),
('a0000000-0000-4000-8000-000000000002','resident-two@example.invalid','{}'),
('a0000000-0000-4000-8000-000000000003','other-building@example.invalid','{}'),
('a0000000-0000-4000-8000-000000000004','manager@example.invalid','{}'),
('a0000000-0000-4000-8000-000000000005','admin@example.invalid','{}'),
('a0000000-0000-4000-8000-000000000006','unassigned@example.invalid','{}');
update public.profiles set role = 'management' where id = 'a0000000-0000-4000-8000-000000000004';
update public.profiles set role = 'admin' where id = 'a0000000-0000-4000-8000-000000000005';
select pg_temp.assert_true((select role = 'resident' from public.profiles where id = 'a0000000-0000-4000-8000-000000000001'), 'metadata cannot assign admin');
update auth.users set email='changed@example.invalid' where id='a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select email='changed@example.invalid' from public.profiles where id='a0000000-0000-4000-8000-000000000001'), 'Auth email synchronizes profile');
insert into public.buildings(id,name,address) values
('b0000000-0000-4000-8000-000000000001','Test A','Fictional A'),
('b0000000-0000-4000-8000-000000000002','Test B','Fictional B');
insert into public.units(id,building_id,unit_number) values
('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Test 1'),
('c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','Test 2'),
('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','Test 3');
insert into public.resident_memberships(user_id,building_id,unit_id) values
('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001'),
('a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002'),
('a0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000003');
insert into public.management_buildings(user_id,building_id) values
('a0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001');
insert into public.incidents(id,building_id,title) values
('d0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','Shared A'),
('d0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','Shared B');
insert into public.reports(incident_id,resident_id,text) values
('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Private one'),
('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','Private two'),
('d0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003','Private other building');
insert into public.management_updates(incident_id,status,message) values
('d0000000-0000-4000-8000-000000000001','acknowledged','Shared management update'),
('d0000000-0000-4000-8000-000000000002','reported','Other building update');
select pg_temp.constraint_rejects($q$insert into public.resident_memberships(user_id,building_id,unit_id,is_active) values ('a0000000-0000-4000-8000-000000000006','b0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003',false)$q$, 'unit must belong to membership building');
select pg_temp.constraint_rejects($q$insert into public.resident_memberships(user_id,building_id) values ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002')$q$, 'only one active resident membership');
select pg_temp.constraint_rejects($q$insert into public.management_buildings(user_id,building_id) values ('a0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001')$q$, 'duplicate management assignment rejected');
select pg_temp.constraint_rejects($q$update public.buildings set timezone='Not/AZone' where id='b0000000-0000-4000-8000-000000000001'$q$, 'timezone validated');

set local role anon;
select pg_temp.denied('select * from public.incidents', 'anonymous cannot read incidents');
select pg_temp.denied('select * from public.profiles', 'anonymous cannot read profiles');
reset role;
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 1 from public.profiles), 'resident sees only own profile');
select pg_temp.assert_true((select count(*) = 1 from public.buildings), 'resident sees only own building');
select pg_temp.assert_true((select count(*) = 1 from public.units), 'resident cannot enumerate neighbor units');
select pg_temp.assert_true((select count(*) = 1 from public.resident_memberships), 'resident cannot enumerate neighbor memberships');
select pg_temp.assert_true((select count(*) = 1 from public.incidents), 'resident sees only own building incidents');
select pg_temp.assert_true((select count(*) = 1 from public.reports), 'resident sees only own report');
select pg_temp.assert_true((select count(*) = 1 from public.management_updates), 'resident sees shared updates only in own building');
select pg_temp.denied($q$update public.profiles set role='admin'$q$, 'resident cannot elevate role');
select pg_temp.denied($q$insert into public.management_buildings(user_id,building_id) values ('a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002')$q$, 'resident cannot self-assign management');
select pg_temp.denied($q$insert into public.buildings(name,address) values ('Unauthorized','Nowhere')$q$, 'resident cannot configure buildings');
select pg_temp.denied($q$insert into public.management_updates(incident_id,status,message) values ('d0000000-0000-4000-8000-000000000001','resolved','fake')$q$, 'resident cannot publish management update');
select pg_temp.denied($q$insert into public.reports(incident_id,resident_id,text) values ('d0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','cross building')$q$, 'cross-building report rejected');
select pg_temp.denied($q$insert into public.reports(incident_id,resident_id,text) values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000002','impersonation')$q$, 'report author cannot be spoofed');
insert into public.reports(incident_id,resident_id,text) values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Valid report');
insert into public.follows(incident_id,user_id) values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((select count(*) = 1 from public.follows), 'resident can follow incident');
select pg_temp.constraint_rejects($q$insert into public.follows(incident_id,user_id) values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001')$q$, 'duplicate follow rejected');
select pg_temp.denied($q$insert into public.follows(incident_id,user_id) values ('d0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001')$q$, 'cross-building follow rejected');
insert into public.update_requests(incident_id,user_id) values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001');
insert into public.legacy_tickets(incident_id,resident_id,resident_topic) values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','I recall reporting this');
select pg_temp.denied($q$update public.legacy_tickets set management_status='Officially resolved', source_quality='verified_ticket'$q$, 'recollection cannot be made official');
select pg_temp.denied($q$insert into public.legacy_tickets(incident_id,resident_id,management_status) values ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','Official')$q$, 'resident cannot insert official status');
select pg_temp.denied($q$update public.reports set resident_id='a0000000-0000-4000-8000-000000000002'$q$, 'report ownership immutable');
select pg_temp.denied($q$update public.management_updates set message='altered history'$q$, 'management history immutable');
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000002';
select pg_temp.assert_true((select count(*) = 0 from public.follows), 'neighbors cannot enumerate follows');
select pg_temp.assert_true((select count(*) = 0 from public.update_requests), 'neighbors cannot enumerate update requests');
select pg_temp.assert_true((select count(*) = 0 from public.legacy_tickets), 'neighbors cannot read legacy tickets');
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000004';
select pg_temp.assert_true((select count(*) = 1 from public.buildings), 'manager sees only assigned building');
select pg_temp.assert_true((select count(*) = 3 from public.reports), 'manager sees operational reports only in assigned building');
select pg_temp.assert_true((select count(*) = 1 from public.legacy_tickets), 'manager sees assigned legacy references');
select pg_temp.assert_true((select count(*) = 2 from public.units), 'manager sees assigned units');
select pg_temp.assert_true((select count(*) = 1 from public.profiles), 'manager does not get global profile access');
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000006';
select pg_temp.assert_true((select count(*) = 0 from public.incidents), 'unassigned user sees no incidents');
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000005';
select pg_temp.assert_true((select count(*) >= 2 from public.buildings), 'admin sees all buildings');
select pg_temp.assert_true((select count(*) >= 6 from public.profiles), 'admin sees all profiles');
insert into public.management_buildings(user_id,building_id) values ('a0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000002');
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000004';
select pg_temp.assert_true((select count(*) = 2 from public.buildings), 'manager supports multiple assigned buildings');
reset role;
update public.resident_memberships set is_active=false where user_id='a0000000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub = 'a0000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 0 from public.incidents), 'revoked membership removes shared access');
select pg_temp.assert_true((select count(*) = 0 from public.reports), 'revoked membership removes private incident access');
select pg_temp.assert_true((select count(*) = 0 from public.units), 'revoked membership hides unit');
reset role;
rollback;
