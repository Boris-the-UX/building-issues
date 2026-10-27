begin;
create extension if not exists vector with schema extensions;
alter table public.reports add column unit_id uuid references public.units(id) on delete set null;
alter table public.reports add column submission_id uuid;
create unique index reports_submission on public.reports(resident_id,submission_id) where submission_id is not null;
create index reports_unit on public.reports(unit_id);
create table private.incident_embeddings (
 incident_id uuid primary key references public.incidents(id) on delete cascade,
 model text not null,
 embedding extensions.vector(384) not null
);
alter table private.incident_embeddings enable row level security;
revoke all on private.incident_embeddings from public,anon,authenticated;
create table public.report_upload_batches (
 id uuid primary key,
 user_id uuid not null references public.profiles(id) on delete cascade,
 complex_id uuid not null references public.complexes(id) on delete cascade,
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '24 hours',
 report_id uuid references public.reports(id) on delete cascade
);
create index upload_batches_user on public.report_upload_batches(user_id);
create index upload_batches_report on public.report_upload_batches(report_id);
create table public.report_attachments (
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.report_upload_batches(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 report_id uuid references public.reports(id) on delete cascade,
 path text not null unique,
 filename text not null,
 mime_type text not null,
 byte_size bigint not null check(byte_size>0 and byte_size<=52428800),
 created_at timestamptz not null default now()
);
create index attachments_batch on public.report_attachments(batch_id);
create index attachments_user on public.report_attachments(user_id);
create index attachments_report on public.report_attachments(report_id);

create function private.lock_resident_membership(target_complex uuid) returns public.resident_memberships
language plpgsql security definer set search_path='' as $$
declare membership public.resident_memberships;
begin
 select m.* into membership from public.resident_memberships m
 join public.profiles p on p.id=m.user_id join public.buildings b on b.id=m.building_id
 where m.user_id=auth.uid() and m.is_active and p.role='resident' and b.complex_id=target_complex for share of m,p;
 if membership.id is null then raise exception 'An active resident membership is required' using errcode='42501'; end if;
 return membership;
end $$;
create function private.can_read_report(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.reports r where r.id=target and (private.is_admin() or private.manages_incident(r.incident_id) or (r.resident_id=auth.uid() and private.resident_in_incident(r.incident_id))));
$$;
create function private.can_read_attachment(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.report_attachments a join public.report_upload_batches b on b.id=a.batch_id
 where a.path=object_path and ((a.report_id is not null and private.can_read_report(a.report_id))
 or (a.report_id is null and a.user_id=auth.uid() and b.report_id is null and b.expires_at>now() and private.resident_of_complex(b.complex_id))));
$$;
create function private.can_upload_attachment(object_path text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.report_attachments a join public.report_upload_batches b on b.id=a.batch_id
 where a.path=object_path and a.user_id=auth.uid() and a.report_id is null and b.report_id is null and b.expires_at>now() and private.resident_of_complex(b.complex_id));
$$;
alter table public.report_upload_batches enable row level security;
alter table public.report_attachments enable row level security;
revoke all on public.report_upload_batches,public.report_attachments from public,anon,authenticated;
grant select on public.report_upload_batches,public.report_attachments to authenticated;
create policy batches_own on public.report_upload_batches for select to authenticated using(user_id=auth.uid() and private.resident_of_complex(complex_id));
create policy attachments_private on public.report_attachments for select to authenticated using(private.can_read_attachment(path));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('report-media','report-media',false,52428800,array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/avif','video/mp4','video/quicktime','video/webm'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy report_media_read on storage.objects for select to authenticated using(bucket_id='report-media' and private.can_read_attachment(name));
create policy report_media_insert on storage.objects for insert to authenticated with check(bucket_id='report-media' and private.can_upload_attachment(name));
create policy report_media_remove_pending on storage.objects for delete to authenticated using(bucket_id='report-media' and private.can_upload_attachment(name));

create function public.reserve_report_attachment(p_batch uuid,p_location uuid,p_filename text,p_mime text,p_bytes bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 loc public.issue_locations; batch public.report_upload_batches; attachment_id uuid:=gen_random_uuid(); object_path text; extension text;
begin
 select * into loc from public.issue_locations where id=p_location;
 perform private.lock_resident_membership(loc.complex_id);
 if p_batch is null or p_filename is null or char_length(p_filename) not between 1 and 160 or p_filename~E'[/\\\\[:cntrl:]]' or p_bytes is null or p_bytes<1 then raise exception 'Invalid attachment' using errcode='22023'; end if;
 extension:=case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'image/heic' then 'heic' when 'image/heif' then 'heif' when 'image/avif' then 'avif' when 'video/mp4' then 'mp4' when 'video/quicktime' then 'mov' when 'video/webm' then 'webm' else null end;
 if extension is null or p_bytes>(case when p_mime like 'video/%' then 52428800 else 10485760 end) then raise exception 'Unsupported attachment type or size' using errcode='22023'; end if;
 insert into public.report_upload_batches(id,user_id,complex_id) values(p_batch,auth.uid(),loc.complex_id) on conflict(id) do nothing;
 select * into batch from public.report_upload_batches where id=p_batch for update;
 if batch.user_id<>auth.uid() or batch.complex_id<>loc.complex_id or batch.report_id is not null or batch.expires_at<=now() then raise exception 'Upload batch unavailable' using errcode='42501'; end if;
 if (select count(*) from public.report_attachments where batch_id=p_batch)>=5 or (p_mime like 'video/%' and exists(select 1 from public.report_attachments where batch_id=p_batch and mime_type like 'video/%')) then raise exception 'Maximum five files and one video' using errcode='22023'; end if;
 object_path:=auth.uid()::text||'/'||p_batch::text||'/'||attachment_id::text||'.'||extension;
 insert into public.report_attachments(id,batch_id,user_id,path,filename,mime_type,byte_size) values(attachment_id,p_batch,auth.uid(),object_path,p_filename,p_mime,p_bytes);
 return jsonb_build_object('id',attachment_id,'path',object_path);
end $$;
create function public.cancel_report_attachment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.report_attachments; batch public.report_upload_batches;
begin
 select * into a from public.report_attachments where id=p_id;
 if a.user_id is distinct from auth.uid() then raise exception 'Attachment unavailable' using errcode='42501'; end if;
 select * into batch from public.report_upload_batches where id=a.batch_id for update;
 if batch.report_id is not null or a.report_id is not null then raise exception 'Submitted attachments are immutable' using errcode='42501'; end if;
 if exists(select 1 from storage.objects where bucket_id='report-media' and name=a.path) then raise exception 'Remove pending object first' using errcode='22023'; end if;
 delete from public.report_attachments where id=p_id;
end $$;

create function private.object_numbers(value text) returns text[] language plpgsql immutable set search_path='' as $$
declare normalized text:=lower(coalesce(value,'')); result text[];
begin
 -- The tower is already a structured scope; it must not become a second object ID.
 normalized:=regexp_replace(normalized,'\m(tower|башня|башне|башни)\s*#?\s*[0-9]+\M','','g');
 normalized:=regexp_replace(normalized,'\m(first|первый|первого|первом|primeiro|primeira)\M','1','g');
 normalized:=regexp_replace(normalized,'\m(second|второй|второго|втором|segundo|segunda)\M','2','g');
 normalized:=regexp_replace(normalized,'\m(third|третий|третьего|третьем|terceiro|terceira)\M','3','g');
 normalized:=regexp_replace(normalized,'\m(number|номер|número|numero)\s+(one|один|um)\M','1','g');
 normalized:=regexp_replace(normalized,'\m(number|номер|número|numero)\s+(two|два|dois)\M','2','g');
 normalized:=regexp_replace(normalized,'\m(number|номер|número|numero)\s+(three|три|três|tres)\M','3','g');
 select coalesce(array_agg(distinct coalesce(nullif(ltrim(x[1],'0'),''),'0') order by coalesce(nullif(ltrim(x[1],'0'),''),'0')),array[]::text[]) into result from regexp_matches(normalized,'[0-9]+','g')x;
 return result;
end $$;

create function public.find_similar_incidents(p_location uuid,p_category text,p_request_kind text,p_location_detail text,p_title text,p_embedding text,p_category_detail text default null)
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
 where i.location_id=p_location and i.category=p_category and i.request_kind=p_request_kind and i.status<>'resolved'
 and private.can_read_incident(i.id) and v.model='multilingual-e5-small'
 and lower(btrim(coalesce(i.location,'')))=lower(btrim(coalesce(p_location_detail,'')))
 and (p_category<>'other' or lower(btrim(coalesce(i.category_detail,'')))=lower(btrim(coalesce(p_category_detail,''))))
 and private.object_numbers(i.title)=private.object_numbers(p_title)
 and (1-(v.embedding operator(extensions.<=>) query_vector))>=0.89
 order by v.embedding operator(extensions.<=>) query_vector,i.created_at desc limit 5;
end $$;

create function public.submit_complex_report(p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
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
  or target_incident.request_kind<>kind or target_incident.status='resolved' or not private.can_read_incident(target)
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

-- Compatibility with previously downloaded clients. New clients use structured locations.
create or replace function public.submit_resident_report(p_title text,p_text text,p_location text default null,p_category text default 'other') returns uuid
language plpgsql security definer set search_path='' as $$
declare loc uuid; result jsonb; chars text:=E' \t\n\r\f\v'||U&'\00a0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200a\2028\2029\202f\205f\3000\feff';
begin
 select l.id into loc from public.resident_memberships m join public.issue_locations l on l.building_id=m.building_id and l.code='other_inside' where m.user_id=auth.uid() and m.is_active;
 result:=public.submit_complex_report(jsonb_build_object('submission_id',gen_random_uuid(),'title',btrim(p_title,chars),'text',btrim(p_text,chars),'location_id',loc,'location_detail',coalesce(nullif(btrim(p_location,chars),''),'Unspecified (legacy form)'),'category',p_category,'category_detail',case when p_category='other' then 'Unspecified (legacy form)' else null end,'request_kind','fault'));
 return (result->>'incident_id')::uuid;
end $$;

revoke all on function private.lock_resident_membership(uuid),private.can_read_report(uuid),private.can_read_attachment(text),private.can_upload_attachment(text),private.object_numbers(text) from public,anon,authenticated;
grant execute on function private.can_read_attachment(text),private.can_upload_attachment(text) to authenticated;
revoke all on function public.reserve_report_attachment(uuid,uuid,text,text,bigint),public.cancel_report_attachment(uuid),public.find_similar_incidents(uuid,text,text,text,text,text,text),public.submit_complex_report(jsonb) from public,anon,authenticated;
grant execute on function public.reserve_report_attachment(uuid,uuid,text,text,bigint),public.cancel_report_attachment(uuid),public.find_similar_incidents(uuid,text,text,text,text,text,text),public.submit_complex_report(jsonb) to authenticated;
commit;
