begin;
-- Add the two lower buildings without moving existing units or memberships.
insert into public.buildings(id,complex_id,name,address,management_company,timezone)
select v.id::uuid,c.id,v.name,b.address,b.management_company,b.timezone
from public.complexes c join public.buildings b on b.id=c.id cross join (values
('10000000-0000-4000-8000-000000000003','Bloco 1'),
('10000000-0000-4000-8000-000000000004','Bloco 2'))v(id,name)
where c.id='10000000-0000-4000-8000-000000000001' on conflict(id) do nothing;
-- Facilities of the lower buildings are not yet confirmed. Do not invent elevators/parking.
delete from public.issue_locations l where l.building_id in ('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004')
and l.code in ('elevators','parking','parking_gate','technical') and not exists(select 1 from public.incidents i where i.location_id=l.id);

create table public.resident_status_observations (
 id uuid primary key default gen_random_uuid(),
 incident_id uuid not null references public.incidents(id) on delete cascade,
 report_id uuid references public.reports(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 status text not null check(status in ('resolved','in_progress','no_response','promised','not_sure','other')),
 detail text check(char_length(detail)<=160),
 created_at timestamptz not null default clock_timestamp(),
 check(status<>'other' or nullif(btrim(detail),'') is not null),
 unique(report_id)
);
create index observations_incident on public.resident_status_observations(incident_id,created_at desc,id);
alter table public.resident_status_observations enable row level security;
revoke all on public.resident_status_observations from public,anon,authenticated;
grant select on public.resident_status_observations to authenticated;
create policy own_observations on public.resident_status_observations for select to authenticated using(user_id=auth.uid() and private.can_read_incident(incident_id));
-- Resident assertions never overwrite management's incident status.
create function private.resident_status(p_id uuid) returns text language sql stable security definer set search_path='' as $$
 select coalesce((select o.status from public.resident_status_observations o where o.incident_id=p_id and o.status<>'not_sure' order by o.created_at desc,o.id desc limit 1),'not_sure');
$$;
revoke all on function private.resident_status(uuid) from public,anon,authenticated;
alter function public.submit_complex_report(jsonb) set schema private;
revoke all on function private.submit_complex_report(jsonb) from public,anon,authenticated;
create or replace function private.submit_complex_report(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 caller uuid:=auth.uid(); loc public.issue_locations; membership public.resident_memberships; batch public.report_upload_batches;
 submission uuid:=(p_data->>'submission_id')::uuid; target uuid:=nullif(p_data->>'target_incident_id','')::uuid;
 title_value text:=btrim(p_data->>'title'); text_value text:=btrim(p_data->>'text'); category_value text:=p_data->>'category';
 category_detail text:=nullif(btrim(p_data->>'category_detail'),''); kind text:=p_data->>'request_kind'; detail text:=nullif(btrim(p_data->>'location_detail'),'');
 new_report uuid; incident_id uuid; query_vector extensions.vector(384); target_incident public.incidents;
begin
 select * into loc from public.issue_locations where id=(p_data->>'location_id')::uuid for share;
 membership:=private.lock_resident_membership(loc.complex_id);
 if submission is null or title_value is null or char_length(title_value) not between 1 and 240 or text_value is null or char_length(text_value) not between 1 and 10000
 or char_length(detail)>240 or kind is null or kind not in ('fault','missing_service','change_request')
 or category_value is null or category_value not in ('elevator','plumbing','electrical','gas','access','climate','cleaning','pest_control','maintenance','outdoor','pool','noise','other')
 or char_length(category_detail)>160 or (category_value='other' and category_detail is null)
 or (loc.code in ('other','other_inside') and detail is null) then raise exception 'Invalid report fields' using errcode='22023'; end if;
 insert into public.report_upload_batches(id,user_id,complex_id) values(submission,caller,loc.complex_id) on conflict(id) do nothing;
 select * into batch from public.report_upload_batches where id=submission for update;
 if batch.user_id<>caller or batch.complex_id<>loc.complex_id then raise exception 'Submission unavailable' using errcode='42501'; end if;
 if batch.report_id is not null then
  select r.incident_id into incident_id from public.reports r where r.id=batch.report_id and r.resident_id=caller;
  return jsonb_build_object('incident_id',incident_id,'report_id',batch.report_id,'replayed',true);
 end if;
 if batch.expires_at<=now() then raise exception 'Submission expired; open a new form' using errcode='22023'; end if;
 -- Finalize only uploaded objects with authoritative Storage metadata matching their reservations.
 if exists(select 1 from public.report_attachments a left join storage.objects o on o.bucket_id='report-media' and o.name=a.path
  where a.batch_id=submission and (o.id is null or coalesce(o.metadata->>'mimetype','')<>a.mime_type or coalesce(o.metadata->>'size','0')::bigint<>a.byte_size))
 then raise exception 'Attachments are not ready' using errcode='22023'; end if;
 if p_data->>'embedding' is not null then
  query_vector:=(p_data->>'embedding')::extensions.vector(384);
  if extensions.vector_norm(query_vector)<0.99 or extensions.vector_norm(query_vector)>1.01 then raise exception 'Invalid semantic vector' using errcode='22023'; end if;
 end if;
 if target is not null then
  select * into target_incident from public.incidents where id=target for update;
  if target_incident.id is null or target_incident.complex_id<>loc.complex_id or target_incident.location_id<>loc.id or target_incident.category<>category_value
  or target_incident.request_kind<>kind or target_incident.status='resolved' or private.resident_status(target)='resolved' or not private.can_read_incident(target)
  or lower(btrim(coalesce(target_incident.location,'')))<>lower(btrim(coalesce(detail,'')))
  or private.object_numbers(target_incident.title)<>private.object_numbers(title_value)
  or (category_value='other' and lower(coalesce(target_incident.category_detail,''))<>lower(coalesce(category_detail,'')))
  or query_vector is null or not exists(select 1 from private.incident_embeddings v where v.incident_id=target and v.model='multilingual-e5-small' and (1-(v.embedding operator(extensions.<=>) query_vector))>=0.89)
  then raise exception 'This incident cannot be linked to the report' using errcode='22023'; end if;
  incident_id:=target;
  update public.incidents set last_report_at=now() where id=target;
 else
  insert into public.incidents(complex_id,building_id,location_id,title,category,category_detail,request_kind,location,created_by)
  values(loc.complex_id,loc.building_id,loc.id,title_value,category_value,category_detail,kind,detail,caller) returning id into incident_id;
  if query_vector is not null then insert into private.incident_embeddings(incident_id,model,embedding) values(incident_id,'multilingual-e5-small',query_vector); end if;
 end if;
 insert into public.reports(incident_id,resident_id,text,location,source,unit_id,submission_id)
 values(incident_id,caller,text_value,detail,'app',membership.unit_id,submission) returning id into new_report;
 update public.report_attachments set report_id=new_report where batch_id=submission;
 update public.report_upload_batches set report_id=new_report where id=submission;
 return jsonb_build_object('incident_id',incident_id,'report_id',new_report,'linked',target is not null,'replayed',false);
end $$;

create function public.submit_complex_report(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; data jsonb:=p_data; s text:=coalesce(p_data->>'current_status','not_sure');
begin
 if s not in ('resolved','in_progress','no_response','promised','not_sure','other') or char_length(p_data->>'status_detail')>160 or (s='other' and nullif(btrim(p_data->>'status_detail'),'') is null) then raise exception 'Invalid resident status' using errcode='22023'; end if;
 if nullif(btrim(p_data->>'location_detail'),'') is null and exists(select 1 from public.issue_locations where id=(p_data->>'location_id')::uuid and code in ('other','other_inside')) then data:=data||jsonb_build_object('location_detail','Unspecified'); end if;
 result:=private.submit_complex_report(data);
 if not coalesce((result->>'replayed')::boolean,false) then
 insert into public.resident_status_observations(incident_id,report_id,user_id,status,detail) values((result->>'incident_id')::uuid,(result->>'report_id')::uuid,auth.uid(),s,nullif(btrim(p_data->>'status_detail'),''));
 end if;
 return result;
end $$;
revoke all on function public.submit_complex_report(jsonb) from public,anon,authenticated;
grant execute on function public.submit_complex_report(jsonb) to authenticated;
create function public.add_resident_status(p_incident uuid,p_status text,p_detail text default '') returns void language plpgsql security definer set search_path='' as $$
declare complex uuid;
begin
 select i.complex_id into complex from public.incidents i where i.id=p_incident;
 perform private.lock_resident_membership(complex);
 perform 1 from public.incidents where id=p_incident for update;
 if not private.can_read_incident(p_incident) then raise exception 'Issue unavailable' using errcode='42501'; end if;
 insert into public.resident_status_observations(incident_id,user_id,status,detail) values(p_incident,auth.uid(),p_status,nullif(btrim(p_detail),''));
end $$;
revoke all on function public.add_resident_status(uuid,text,text) from public,anon,authenticated;
grant execute on function public.add_resident_status(uuid,text,text) to authenticated;
create function public.get_issue_activity(p_incident uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.can_read_incident(p_incident) then raise exception 'Issue unavailable' using errcode='42501'; end if;
 return jsonb_build_object('status',private.resident_status(p_incident),'reports',
 (select coalesce(jsonb_agg(jsonb_build_object('at',r.created_at) order by r.created_at desc),'[]') from public.reports r where r.incident_id=p_incident),
 'observations',(select coalesce(jsonb_agg(jsonb_build_object('status',o.status,'at',o.created_at) order by o.created_at desc,o.id desc),'[]') from public.resident_status_observations o where o.incident_id=p_incident));
end $$;
revoke all on function public.get_issue_activity(uuid) from public,anon,authenticated;
grant execute on function public.get_issue_activity(uuid) to authenticated;
create or replace function public.get_filtered_complex_statistics(p_complex uuid, p_filters jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if not private.can_read_complex(p_complex) then raise exception 'Complex unavailable' using errcode='42501'; end if;
 with visible as (select i.*,private.resident_status(i.id) as resident_status from public.incidents i where i.complex_id=p_complex and private.can_read_incident(i.id)
 and (coalesce(p_filters->>'category','')='' or i.category=p_filters->>'category')
 and (coalesce(p_filters->>'status','')='' or private.resident_status(i.id)=p_filters->>'status')
 and (coalesce(p_filters->>'place','')='' or (p_filters->>'place'='shared' and i.building_id is null) or i.building_id::text=p_filters->>'place')
 and (coalesce(p_filters->>'since','')='' or i.created_at >= (p_filters->>'since')::date)),
 reports as (select r.* from public.reports r join visible i on i.id=r.incident_id)
 select jsonb_build_object(
 'incidents',(select count(*) from visible),'open_incidents',(select count(*) from visible where resident_status<>'resolved'),
 'reports',(select count(*) from reports),'reporting_households',(select count(distinct unit_id) from reports),
 'unknown_household_reports',(select count(*) from reports where unit_id is null),
 'by_status',(select coalesce(jsonb_agg(jsonb_build_object('label',s.status,'incidents',s.n)),'[]') from (select resident_status as status,count(*) n from visible group by resident_status order by resident_status)s),
 'by_category',(select coalesce(jsonb_agg(jsonb_build_object('label',c.category,'incidents',c.n,'reports',c.reports)),'[]') from (select i.category,count(distinct i.id) n,count(r.id) reports from visible i left join reports r on r.incident_id=i.id group by i.category order by count(distinct i.id) desc,i.category)c),
 'by_request_kind',(select coalesce(jsonb_agg(jsonb_build_object('label',k.request_kind,'incidents',k.n)),'[]') from (select request_kind,count(*) n from visible group by request_kind order by request_kind)k),
 'by_location',(select coalesce(jsonb_agg(jsonb_build_object('label',concat_ws(' · ',b.name,l.name),'incidents',x.n)),'[]') from (select location_id,count(*) n from visible group by location_id)x join public.issue_locations l on l.id=x.location_id left join public.buildings b on b.id=l.building_id),
 'semantic_groups',(select count(*) from visible i where exists(select 1 from private.incident_embeddings v where v.incident_id=i.id))
 ) into result;
 return result;
end $$;
create function public.get_resident_statuses(p_complex uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not private.can_read_complex(p_complex) then raise exception 'Complex unavailable' using errcode='42501'; end if;
 return (select coalesce(jsonb_object_agg(i.id,private.resident_status(i.id)),'{}') from public.incidents i where i.complex_id=p_complex and private.can_read_incident(i.id));
end $$;
revoke all on function public.get_resident_statuses(uuid) from public,anon,authenticated;
grant execute on function public.get_resident_statuses(uuid) to authenticated;
create or replace function public.find_similar_incidents(p_location uuid,p_category text,p_request_kind text,p_location_detail text,p_title text,p_embedding text,p_category_detail text default null)
returns table(id uuid,title text,status public.incident_status,report_count bigint)
language plpgsql stable security definer set search_path='' as $$
declare loc public.issue_locations; query_vector extensions.vector(384);
begin
 select * into loc from public.issue_locations where issue_locations.id=p_location;
 if not private.can_read_complex(loc.complex_id) then raise exception 'Location unavailable' using errcode='42501'; end if;
 query_vector:=p_embedding::extensions.vector(384);
 if extensions.vector_norm(query_vector)<0.99 or extensions.vector_norm(query_vector)>1.01 then raise exception 'Invalid semantic vector' using errcode='22023'; end if;
 return query select i.id,i.title,i.status,
 (select count(*) from public.reports r where r.incident_id=i.id)
 from public.incidents i join private.incident_embeddings v on v.incident_id=i.id
 where i.location_id=p_location and i.category=p_category and i.request_kind=p_request_kind and i.status<>'resolved' and private.resident_status(i.id)<>'resolved'
 and private.can_read_incident(i.id) and v.model='multilingual-e5-small'
 and lower(btrim(coalesce(i.location,'')))=lower(btrim(coalesce(p_location_detail,'')))
 and (p_category<>'other' or lower(btrim(coalesce(i.category_detail,'')))=lower(btrim(coalesce(p_category_detail,''))))
 and private.object_numbers(i.title)=private.object_numbers(p_title)
 and (1-(v.embedding operator(extensions.<=>) query_vector))>=0.89
 order by v.embedding operator(extensions.<=>) query_vector,i.created_at desc limit 5;
end $$;

commit;
