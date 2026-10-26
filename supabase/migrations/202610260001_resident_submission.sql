begin;

-- A single RPC is a single PostgreSQL transaction: never leave an orphan incident.
-- The restricted definer is needed because residents cannot INSERT incidents directly.
create function public.submit_resident_report(
  p_title text,
  p_text text,
  p_location text default null,
  p_category text default 'other'
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  trim_chars constant text := E' \t\n\r\f\v' || U&'\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff';
  caller uuid := auth.uid();
  target_building uuid;
  new_incident uuid;
  title_value text := btrim(p_title, trim_chars);
  text_value text := btrim(p_text, trim_chars);
  location_value text := nullif(btrim(p_location, trim_chars), '');
begin
  if caller is null then
    raise exception 'Sign in to submit a report' using errcode = '42501';
  end if;

  -- Hold role and membership stable until both writes commit. A concurrent
  -- revocation either completes before this check or waits for this transaction.
  select m.building_id into target_building
  from public.resident_memberships m
  join public.profiles p on p.id = m.user_id
  where m.user_id = caller and m.is_active and p.role = 'resident'
  for share of m, p;
  if target_building is null then
    raise exception 'An active resident membership is required' using errcode = '42501';
  end if;

  if title_value is null or char_length(title_value) not between 1 and 240
    or text_value is null or char_length(text_value) not between 1 and 10000
    or char_length(location_value) > 240
    or p_category is null or p_category not in ('elevator','plumbing','electrical','pest_control','maintenance','other') then
    raise exception 'Invalid report fields' using errcode = '22023';
  end if;

  -- Do not copy private report text into the building-visible description.
  insert into public.incidents(building_id, title, location, category, created_by)
  values (target_building, title_value, location_value, p_category, caller)
  returning id into new_incident;

  insert into public.reports(incident_id, resident_id, text, location, source)
  values (new_incident, caller, text_value, location_value, 'app');

  return new_incident;
end;
$$;
revoke all on function public.submit_resident_report(text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_resident_report(text,text,text,text) to authenticated;
comment on function public.submit_resident_report(text,text,text,text) is
  'Resident-only atomic creation. Identity/building derived from active membership. Does not match or merge reports.';

commit;
