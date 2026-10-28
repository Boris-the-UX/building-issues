begin;
create function public.get_filtered_complex_statistics(p_complex uuid, p_filters jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.can_read_complex(p_complex) then raise exception 'Complex unavailable' using errcode='42501'; end if;
 with visible as (select i.* from public.incidents i where i.complex_id=p_complex and private.can_read_incident(i.id)
 and (coalesce(p_filters->>'category','')='' or i.category=p_filters->>'category')
 and (coalesce(p_filters->>'status','')='' or i.status::text=p_filters->>'status')
 and (coalesce(p_filters->>'place','')='' or (p_filters->>'place'='shared' and i.building_id is null) or i.building_id::text=p_filters->>'place')
 and (coalesce(p_filters->>'since','')='' or i.created_at >= (p_filters->>'since')::date)),
 reports as (select r.* from public.reports r join visible i on i.id=r.incident_id)
 select jsonb_build_object(
 'incidents',(select count(*) from visible),'open_incidents',(select count(*) from visible where status<>'resolved'),
 'reports',(select count(*) from reports),'reporting_households',(select count(distinct unit_id) from reports),
 'unknown_household_reports',(select count(*) from reports where unit_id is null),
 'by_status',(select coalesce(jsonb_agg(jsonb_build_object('label',s.status,'incidents',s.n)),'[]') from (select status,count(*) n from visible group by status order by status)s),
 'by_category',(select coalesce(jsonb_agg(jsonb_build_object('label',c.category,'incidents',c.n,'reports',c.reports)),'[]') from (select i.category,count(distinct i.id) n,count(r.id) reports from visible i left join reports r on r.incident_id=i.id group by i.category order by count(distinct i.id) desc,i.category)c),
 'by_request_kind',(select coalesce(jsonb_agg(jsonb_build_object('label',k.request_kind,'incidents',k.n)),'[]') from (select request_kind,count(*) n from visible group by request_kind order by request_kind)k),
 'by_location',(select coalesce(jsonb_agg(jsonb_build_object('label',concat_ws(' · ',b.name,l.name),'incidents',x.n)),'[]') from (select location_id,count(*) n from visible group by location_id)x join public.issue_locations l on l.id=x.location_id left join public.buildings b on b.id=l.building_id),
 'semantic_groups',(select count(*) from visible i where exists(select 1 from private.incident_embeddings v where v.incident_id=i.id))
 ) into result;
 return result;
end $$;
revoke all on function public.get_filtered_complex_statistics(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.get_filtered_complex_statistics(uuid,jsonb) to authenticated;
commit;
