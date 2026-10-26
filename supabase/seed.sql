-- Synthetic data only. Supabase CLI runs this on local `supabase db reset`.
-- Never create Auth users or seed passwords here.
begin;
insert into public.buildings(id, name, address, management_company, timezone)
values ('10000000-0000-4000-8000-000000000001', 'L Tower', '1 Example Avenue (fictional)', 'Example Property Management', 'Europe/Lisbon')
on conflict(id) do nothing;
insert into public.units(building_id, unit_number)
select '10000000-0000-4000-8000-000000000001'::uuid, n from unnest(array['101','102','201','202']) n
on conflict(building_id, unit_number) do nothing;
insert into public.incidents(id, building_id, title, description, category, location, status)
values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Elevator #2 is not working','Elevator stops at the ground floor and does not respond to calls.','elevator','Elevator #2','in_progress'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','Low hot-water pressure','Reduced hot-water pressure reported during the morning.','plumbing','Shared hot-water system','acknowledged'),
('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','Cockroaches in common areas','Pest activity observed in the shared basement corridor.','pest_control','Basement corridor','waiting_for_contractor')
on conflict(id) do nothing;
commit;
