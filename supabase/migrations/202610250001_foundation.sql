begin;

create type public.app_role as enum ('resident', 'management', 'admin');
create type public.incident_status as enum ('reported', 'acknowledged', 'in_progress', 'waiting_for_contractor', 'scheduled', 'resolved');
create type public.report_source as enum ('app', 'legacy', 'admin');
create type public.ticket_source_quality as enum ('verified_ticket', 'partial_ticket', 'resident_recollection');
create type public.alert_type as enum ('no_update', 'deadline_approaching', 'deadline_overdue', 'stuck_status');
create type public.alert_severity as enum ('info', 'warning', 'critical');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text check (char_length(display_name) <= 120),
  role public.app_role not null default 'resident',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.buildings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text not null,
  management_company text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_number text not null check (btrim(unit_number) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id, unit_number),
  unique (building_id, id)
);
create table public.resident_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  unit_id uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (building_id, unit_id) references public.units(building_id, id) on delete restrict
);
-- MVP: one active building per resident. Historical memberships remain available.
create unique index resident_one_active_membership on public.resident_memberships(user_id) where is_active;
create index resident_memberships_building on public.resident_memberships(building_id);
create index resident_memberships_unit on public.resident_memberships(unit_id);
create table public.management_buildings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, building_id)
);
create index management_buildings_building on public.management_buildings(building_id);
create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  title text not null check (btrim(title) <> '' and char_length(title) <= 240),
  description text not null default '',
  category text,
  location text,
  status public.incident_status not null default 'reported',
  created_at timestamptz not null default now(),
  first_reported_at timestamptz not null default now(),
  last_report_at timestamptz not null default now(),
  last_management_update_at timestamptz,
  expected_resolution_at timestamptz,
  resolved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (last_report_at >= first_reported_at),
  check ((status = 'resolved') = (resolved_at is not null))
);
create index incidents_building_status on public.incidents(building_id, status);
create index incidents_created_by on public.incidents(created_by);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete restrict,
  text text not null check (btrim(text) <> '' and char_length(text) <= 10000),
  location text,
  source public.report_source not null default 'app',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_incident on public.reports(incident_id);
create index reports_resident on public.reports(resident_id);
create table public.legacy_tickets (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  resident_id uuid not null references public.profiles(id) on delete restrict,
  ticket_number text,
  submitted_at timestamptz,
  date_is_approximate boolean not null default false,
  management_status text,
  resident_topic text,
  ticket_title text,
  source_quality public.ticket_source_quality not null default 'resident_recollection',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not date_is_approximate or submitted_at is not null)
);
create index legacy_tickets_incident on public.legacy_tickets(incident_id);
create index legacy_tickets_resident on public.legacy_tickets(resident_id);
create table public.management_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  status public.incident_status not null,
  message text not null check (btrim(message) <> '' and char_length(message) <= 10000),
  expected_resolution_at timestamptz,
  created_at timestamptz not null default now()
);
create index management_updates_incident on public.management_updates(incident_id, created_at);
create index management_updates_author on public.management_updates(created_by);
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, incident_id)
);
create index follows_incident on public.follows(incident_id);
create table public.update_requests (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index update_requests_incident on public.update_requests(incident_id);
create index update_requests_user on public.update_requests(user_id);
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  alert_type public.alert_type not null,
  severity public.alert_severity not null default 'warning',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index alerts_incident on public.alerts(incident_id);

-- Not exposed as a PostgREST schema. Definer functions have fixed search paths,
-- derive identity from auth.uid(), and never accept a caller-supplied user/role.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;
create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;
create function private.is_resident_of(target_building uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.resident_memberships m join public.profiles p on p.id = m.user_id
    where m.user_id = (select auth.uid()) and p.role = 'resident' and m.building_id = target_building and m.is_active);
$$;
create function private.manages(target_building uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.management_buildings m join public.profiles p on p.id = m.user_id
    where m.user_id = (select auth.uid()) and p.role = 'management' and m.building_id = target_building);
$$;
create function private.can_read_building(target_building uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_admin() or private.is_resident_of(target_building) or private.manages(target_building);
$$;
create function private.can_read_incident(target_incident uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.incidents where id = target_incident and private.can_read_building(building_id));
$$;
create function private.resident_in_incident(target_incident uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.incidents where id = target_incident and private.is_resident_of(building_id));
$$;
create function private.manages_incident(target_incident uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.incidents where id = target_incident and private.manages(building_id));
$$;
create function private.can_read_unit(target_unit uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.resident_memberships where user_id = (select auth.uid()) and unit_id = target_unit and is_active);
$$;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create function private.validate_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid IANA timezone' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger building_timezone before insert or update of timezone on public.buildings
for each row execute function private.validate_timezone();

create function private.handle_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Never import role, membership, or assignments from user metadata.
  insert into public.profiles(id, email, display_name)
  values (new.id, new.email, left(new.raw_user_meta_data ->> 'display_name', 120))
  on conflict(id) do update set email = excluded.email;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_auth_user();
create trigger on_auth_email_changed after update of email on auth.users for each row execute function private.handle_auth_user();
-- Also support projects with pre-existing Auth users.
insert into public.profiles(id, email, display_name)
select id, email, left(raw_user_meta_data ->> 'display_name', 120) from auth.users on conflict(id) do nothing;

do $$
declare t text;
begin
  foreach t in array array['profiles','buildings','units','incidents','reports','legacy_tickets'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', t);
  end loop;
  foreach t in array array['profiles','buildings','units','resident_memberships','management_buildings','incidents','reports','legacy_tickets','management_updates','follows','update_requests','alerts'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
  end loop;
end $$;

-- Explicit grants prevent changing ownership, role, and timestamps via the API.
grant select on public.profiles, public.buildings, public.units, public.resident_memberships, public.management_buildings, public.incidents, public.reports, public.legacy_tickets, public.management_updates, public.follows, public.update_requests, public.alerts to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant insert, update, delete on public.buildings, public.units, public.resident_memberships, public.management_buildings, public.incidents, public.alerts to authenticated;
grant insert (incident_id, resident_id, text, location, source) on public.reports to authenticated;
grant delete on public.reports to authenticated;
grant update (text, location) on public.reports to authenticated;
grant insert (incident_id, resident_id, ticket_number, submitted_at, date_is_approximate, management_status, resident_topic, ticket_title, source_quality) on public.legacy_tickets to authenticated;
grant delete on public.legacy_tickets to authenticated;
grant update (ticket_number, submitted_at, date_is_approximate, management_status, resident_topic, ticket_title, source_quality) on public.legacy_tickets to authenticated;
grant insert (incident_id, created_by, status, message, expected_resolution_at) on public.management_updates to authenticated;
grant insert (incident_id, user_id) on public.follows, public.update_requests to authenticated;
grant delete on public.follows, public.update_requests to authenticated;

create policy profiles_read on public.profiles for select to authenticated using (id = (select auth.uid()) or private.is_admin());
create policy profiles_edit_name on public.profiles for update to authenticated using (id = (select auth.uid()) or private.is_admin()) with check (id = (select auth.uid()) or private.is_admin());
create policy buildings_read on public.buildings for select to authenticated using (private.can_read_building(id));
create policy buildings_admin on public.buildings for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy units_read on public.units for select to authenticated using (private.is_admin() or private.manages(building_id) or (private.is_resident_of(building_id) and private.can_read_unit(id)));
create policy units_admin on public.units for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy memberships_read on public.resident_memberships for select to authenticated using (user_id = (select auth.uid()) or private.is_admin() or private.manages(building_id));
create policy memberships_admin on public.resident_memberships for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy assignments_read on public.management_buildings for select to authenticated using (user_id = (select auth.uid()) or private.is_admin());
create policy assignments_admin on public.management_buildings for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy incidents_read on public.incidents for select to authenticated using (private.can_read_building(building_id));
create policy incidents_admin on public.incidents for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy reports_read on public.reports for select to authenticated using (private.is_admin() or private.manages_incident(incident_id) or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy reports_insert on public.reports for insert to authenticated with check (private.is_admin() or (resident_id = (select auth.uid()) and source = 'app' and private.resident_in_incident(incident_id)));
create policy reports_update on public.reports for update to authenticated using (private.is_admin() or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id))) with check (private.is_admin() or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy reports_delete on public.reports for delete to authenticated using (private.is_admin() or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id)));

create policy tickets_read on public.legacy_tickets for select to authenticated using (private.is_admin() or private.manages_incident(incident_id) or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
-- A recollection cannot be promoted to an official management statement by its author.
create policy tickets_insert on public.legacy_tickets for insert to authenticated with check (private.is_admin() or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id) and source_quality = 'resident_recollection' and management_status is null));
create policy tickets_update on public.legacy_tickets for update to authenticated using (private.is_admin() or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id) and source_quality = 'resident_recollection' and management_status is null)) with check (private.is_admin() or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id) and source_quality = 'resident_recollection' and management_status is null));
create policy tickets_delete on public.legacy_tickets for delete to authenticated using (private.is_admin() or (resident_id = (select auth.uid()) and private.resident_in_incident(incident_id) and source_quality = 'resident_recollection' and management_status is null));

create policy updates_read on public.management_updates for select to authenticated using (private.can_read_incident(incident_id));
-- No management mutation workflow yet. Updates are append-only, including for app admins.
create policy updates_insert_admin on public.management_updates for insert to authenticated with check (private.is_admin() and created_by = (select auth.uid()));
create policy follows_read on public.follows for select to authenticated using (private.is_admin() or (user_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy follows_insert on public.follows for insert to authenticated with check (private.is_admin() or (user_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy follows_delete on public.follows for delete to authenticated using (private.is_admin() or (user_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy requests_read on public.update_requests for select to authenticated using (private.is_admin() or (user_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy requests_insert on public.update_requests for insert to authenticated with check (private.is_admin() or (user_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy requests_delete on public.update_requests for delete to authenticated using (private.is_admin() or (user_id = (select auth.uid()) and private.resident_in_incident(incident_id)));
create policy alerts_read on public.alerts for select to authenticated using (private.is_admin() or private.manages_incident(incident_id));
create policy alerts_admin on public.alerts for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Functions default to PUBLIC execution in PostgreSQL: explicitly restrict them.
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_admin(), private.is_resident_of(uuid), private.manages(uuid), private.can_read_building(uuid), private.can_read_incident(uuid), private.resident_in_incident(uuid), private.manages_incident(uuid), private.can_read_unit(uuid) to authenticated;
commit;
