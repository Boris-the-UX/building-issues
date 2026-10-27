import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel, requestKindLabel,statusLabels } from '@/lib/complex/options';
export default async function Issues({searchParams}:{searchParams:Promise<{complex?:string}>}) {
 const {complex}=await searchParams;const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const [{data:complexes,error:complexError},{data:profile},{data:membership}]=await Promise.all([
  supabase.from('complexes').select('id,name').order('name'),supabase.from('profiles').select('role').eq('id',user.id).single(),
  supabase.from('resident_memberships').select('id').eq('user_id',user.id).eq('is_active',true).maybeSingle(),
 ]);
 const selected=complexes?.find((c)=>c.id===complex)??complexes?.[0];
 const {data:incidents,error}=selected?await supabase.rpc('list_complex_incidents',{p_complex:selected.id}):{data:[],error:null};
 const {data:ownReports}=await supabase.from('reports').select('id,incident_id').eq('resident_id',user.id).order('created_at',{ascending:false}).limit(100);
 const ownByIncident=new Map(ownReports?.map((r)=>[r.incident_id,r.id]));
 return <section className="card"><div className="section-heading"><h1>Complex issues</h1>{profile?.role==='resident'&&membership&&<Link className="button-link" href="/app/issues/new">Report an issue</Link>}</div>
  {!membership&&profile?.role==='resident'&&<p className="notice">Your account is not assigned to a building yet. Ask your administrator to assign your tower and unit before reporting.</p>}
  {!!complexes?.length&&<nav aria-label="Complex selection">{complexes.map((c)=><Link key={c.id} href={`/app/issues?complex=${c.id}`} aria-current={selected?.id===c.id?'page':undefined}>{c.name}</Link>)}</nav>}
  {selected&&<p><Link href={`/app/statistics?complex=${selected.id}`}>View aggregate statistics</Link></p>}
  {error||complexError?<p role="alert" className="error">Unable to load issues. Please try again later.</p>:!incidents?.length?<p>No issues to show for your complex yet.</p>:<>
   <p className="muted">Latest {incidents.length} shared incidents. Similar reports are grouped only after confirmation. Private text and files are not shown.</p>
   <ul className="issue-list">{incidents.map((incident)=><li key={incident.id}><h2>{incident.title}</h2><span className="status">{statusLabels[incident.status]}</span>
    <p>{incident.building_name??'Shared complex area'} · {incident.location_name}{incident.location_detail?` · ${incident.location_detail}`:''}</p>
    <p>{categoryLabel(incident.category??'other')}{incident.category_detail?` — ${incident.category_detail}`:''} · {requestKindLabel(incident.request_kind)}</p>
    <p>{incident.report_count} reports · {incident.reporting_households} reporting households with a known unit{incident.unknown_household_reports?` · ${incident.unknown_household_reports} reports without a unit`:''}</p>
    {ownByIncident.has(incident.id)&&<Link href={`/app/reports/${ownByIncident.get(incident.id)}`}>View my private report</Link>}
   </li>)}</ul></>}
 </section>;
}
