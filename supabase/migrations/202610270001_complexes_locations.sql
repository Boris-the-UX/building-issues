begin;
create table public.complexes (
  id uuid primary key default gen_random_uuid(),
  name text not null check(btrim(name)<>''),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now()
);
alter table public.buildings add column complex_id uuid references public.complexes(id) on delete restrict;
-- Preserve isolation for unrelated existing buildings. Only the known pilot is grouped.
insert into public.complexes(id,name,timezone) select id,name,timezone from public.buildings;
update public.buildings set complex_id=id;
alter table public.buildings alter column complex_id set not null;
create index buildings_complex on public.buildings(complex_id);
update public.buildings set name='Tower 2' where id='10000000-0000-4000-8000-000000000001' and name='L Tower';
insert into public.buildings(id,complex_id,name,address,management_company,timezone)
select '10000000-0000-4000-8000-000000000002',c.id,'Tower 1','1 Example Avenue (fictional)','Example Property Management',c.timezone
from public.complexes c where c.id='10000000-0000-4000-8000-000000000001'
on conflict(id) do nothing;
insert into public.units(building_id,unit_number)
select b.id,'3C' from public.buildings b where b.id='10000000-0000-4000-8000-000000000001'
on conflict(building_id,unit_number) do nothing;

create table public.issue_locations (
  id uuid primary key default gen_random_uuid(),
  complex_id uuid not null references public.complexes(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct(complex_id,building_id,code),
  unique(complex_id,id)
);
create index locations_building on public.issue_locations(building_id);
insert into public.issue_locations(complex_id,building_id,code,name)
select b.complex_id,b.id,v.code,v.name from public.buildings b cross join (values
('entrance','Lobby / entrance'),('corridor','Corridors'),('stairs','Stairs'),('elevators','Elevators / lift lobby'),
('technical','Technical rooms'),('parking','Underground parking'),('parking_gate','Parking entrance gate'),('other_inside','Other inside the building')
) v(code,name);
insert into public.issue_locations(complex_id,code,name)
select c.id,v.code,v.name from public.complexes c cross join (values
('outside','Outside / common grounds'),('playground','Playground'),('pool','Swimming pool'),('waste','Waste collection area'),
('main_gate','Main vehicle gate'),('rear_gate','Rear gate'),('pedestrian_gate','Pedestrian gate'),('other','Other shared location')
) v(code,name);

alter table public.incidents alter column building_id drop not null;
alter table public.incidents add column complex_id uuid references public.complexes(id) on delete cascade;
alter table public.incidents add column location_id uuid;
alter table public.incidents add column request_kind text not null default 'fault' check(request_kind in ('fault','missing_service','change_request'));
alter table public.incidents add column category_detail text check(char_length(category_detail)<=160);
update public.incidents i set complex_id=b.complex_id,location_id=l.id from public.buildings b join public.issue_locations l on l.building_id=b.id and l.code='other_inside' where b.id=i.building_id;
alter table public.incidents alter column complex_id set not null;
alter table public.incidents alter column location_id set not null;
alter table public.incidents add foreign key(complex_id,location_id) references public.issue_locations(complex_id,id) on delete restrict;
create index incidents_complex on public.incidents(complex_id,status);
create index incidents_location on public.incidents(location_id,category,request_kind);

-- Existing administrative/legacy inserts derive a location instead of bypassing scope consistency.
create function private.check_incident_scope() returns trigger language plpgsql security definer set search_path='' as $$
declare loc public.issue_locations;
begin
  if new.complex_id is null then select b.complex_id into new.complex_id from public.buildings b where b.id=new.building_id; end if;
  if new.location_id is null then select l.id into new.location_id from public.issue_locations l where l.building_id=new.building_id and l.code='other_inside'; end if;
  select * into loc from public.issue_locations where id=new.location_id;
  if loc.id is null or loc.complex_id is distinct from new.complex_id or loc.building_id is distinct from new.building_id then
    raise exception 'Location and building must belong to the incident complex' using errcode='23514';
  end if;
  return new;
end $$;
create trigger check_incident_scope before insert or update on public.incidents for each row execute function private.check_incident_scope();
create function private.check_location_scope() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.building_id is not null and not exists(select 1 from public.buildings b where b.id=new.building_id and b.complex_id=new.complex_id) then
    raise exception 'Building must belong to location complex' using errcode='23514';
  end if;
  return new;
end $$;
create trigger check_location_scope before insert or update on public.issue_locations for each row execute function private.check_location_scope();
-- Moving buildings/locations with operational history would invalidate scopes; use a deliberate migration instead.
create function private.prevent_scope_move() returns trigger language plpgsql set search_path='' as $$
begin
  if new.complex_id is distinct from old.complex_id or (to_jsonb(new)->>'building_id') is distinct from (to_jsonb(old)->>'building_id') then raise exception 'Complex assignment is immutable' using errcode='23514'; end if;
  return new;
end $$;
create trigger prevent_building_move before update on public.buildings for each row execute function private.prevent_scope_move();
create trigger prevent_location_move before update on public.issue_locations for each row execute function private.prevent_scope_move();

create function private.resident_of_complex(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.resident_memberships m join public.profiles p on p.id=m.user_id join public.buildings b on b.id=m.building_id where m.user_id=auth.uid() and m.is_active and p.role='resident' and b.complex_id=target);
$$;
create function private.manages_complex(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.management_buildings m join public.profiles p on p.id=m.user_id join public.buildings b on b.id=m.building_id where m.user_id=auth.uid() and p.role='management' and b.complex_id=target);
$$;
create function private.can_read_complex(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or private.resident_of_complex(target) or private.manages_complex(target);
$$;
create or replace function private.can_read_building(target_building uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.is_admin() or private.manages(target_building) or exists(select 1 from public.buildings b where b.id=target_building and private.resident_of_complex(b.complex_id));
$$;
create or replace function private.resident_in_incident(target_incident uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.incidents i where i.id=target_incident and private.resident_of_complex(i.complex_id));
$$;
create or replace function private.manages_incident(target_incident uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.incidents i where i.id=target_incident and (private.manages(i.building_id) or (i.building_id is null and private.manages_complex(i.complex_id))));
$$;
create or replace function private.can_read_incident(target_incident uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.incidents i where i.id=target_incident and (private.is_admin() or private.resident_of_complex(i.complex_id) or private.manages_incident(i.id)));
$$;
drop policy incidents_read on public.incidents;
create policy incidents_read on public.incidents for select to authenticated using(private.can_read_incident(id));
alter table public.complexes enable row level security;
alter table public.issue_locations enable row level security;
revoke all on public.complexes,public.issue_locations from public,anon,authenticated;
grant select,insert,update,delete on public.complexes,public.issue_locations to authenticated;
create policy complexes_read on public.complexes for select to authenticated using(private.can_read_complex(id));
create policy complexes_admin on public.complexes for all to authenticated using(private.is_admin()) with check(private.is_admin());
create policy locations_read on public.issue_locations for select to authenticated using(private.is_admin() or private.resident_of_complex(complex_id) or private.manages(building_id) or (building_id is null and private.manages_complex(complex_id)));
create policy locations_admin on public.issue_locations for all to authenticated using(private.is_admin()) with check(private.is_admin());
revoke all on function private.resident_of_complex(uuid),private.manages_complex(uuid),private.can_read_complex(uuid),private.check_incident_scope(),private.check_location_scope(),private.prevent_scope_move() from public,anon,authenticated;
grant execute on function private.resident_of_complex(uuid),private.manages_complex(uuid),private.can_read_complex(uuid) to authenticated;
-- New buildings receive their own isolated complex unless an admin explicitly assigns one.
create function private.initialize_building_scope() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.complex_id is null then
  insert into public.complexes(id,name,timezone) values(new.id,new.name,new.timezone);
  new.complex_id:=new.id;
 end if;
 return new;
end $$;
create trigger initialize_building_scope before insert on public.buildings for each row execute function private.initialize_building_scope();
create function private.initialize_building_locations() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.issue_locations(complex_id,building_id,code,name)
 select new.complex_id,new.id,v.code,v.name from (values
 ('entrance','Lobby / entrance'),('corridor','Corridors'),('stairs','Stairs'),('elevators','Elevators / lift lobby'),('technical','Technical rooms'),('parking','Underground parking'),('parking_gate','Parking entrance gate'),('other_inside','Other inside the building')
 )v(code,name) on conflict do nothing;
 insert into public.issue_locations(complex_id,code,name)
 select new.complex_id,v.code,v.name from (values
 ('outside','Outside / common grounds'),('playground','Playground'),('pool','Swimming pool'),('waste','Waste collection area'),('main_gate','Main vehicle gate'),('rear_gate','Rear gate'),('pedestrian_gate','Pedestrian gate'),('other','Other shared location')
 )v(code,name) on conflict do nothing;
 return new;
end $$;
create trigger initialize_building_locations after insert on public.buildings for each row execute function private.initialize_building_locations();
create trigger complex_timezone before insert or update of timezone on public.complexes for each row execute function private.validate_timezone();
revoke all on function private.initialize_building_scope(),private.initialize_building_locations() from public,anon,authenticated;
commit;
