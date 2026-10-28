import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel, statusLabels } from '@/lib/complex/options';
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
 return <section className="card"><div className="section-heading"><h1>Issues</h1>{profile?.role==='resident'&&membership&&<Link className="button-link" href="/app/issues/new">Report an issue</Link>}</div>
  {!membership&&profile?.role==='resident'&&<p className="notice">Your account is not assigned to a building yet. Ask your administrator to assign your tower and unit before reporting.</p>}
  {complexes && complexes.length>1&&<nav aria-label="Complex selection">{complexes.map((c)=><Link key={c.id} href={`/app/issues?complex=${c.id}`} aria-current={selected?.id===c.id?'page':undefined}>{c.name}</Link>)}</nav>}
  {selected&&<p><Link href={`/app/statistics?complex=${selected.id}`}>View statistics</Link></p>}
  {error||complexError?<p role="alert" className="error">Unable to load issues. Please try again later.</p>:!incidents?.length?<p>No issues to show for your complex yet.</p>:<>
   <div className="issues-table-wrap"><table className="issues-table"><thead><tr><th scope="col">Issue</th><th scope="col">Location</th><th scope="col">Status</th><th scope="col">Reports</th></tr></thead>
   <tbody>{incidents.map((incident)=><tr key={incident.id}>
    <td data-label="Issue"><h2>{incident.title}</h2><span className="field-help">{categoryLabel(incident.category??'other')}</span>{ownByIncident.has(incident.id)&&<Link className="my-report" href={`/app/reports/${ownByIncident.get(incident.id)}`}>My report</Link>}</td>
    <td data-label="Location"><strong>{incident.building_name??'Shared grounds'}</strong><span className="issue-place">{incident.location_name}{incident.location_detail?` · ${incident.location_detail}`:''}</span></td>
    <td data-label="Status"><span className="status">{statusLabels[incident.status]}</span></td>
    <td data-label="Reports">{incident.report_count===0?<span className="muted">No resident reports</span>:<span>{incident.report_count} {incident.report_count===1?'report':'reports'}</span>}</td>
   </tr>)}</tbody></table></div></>}
 </section>;
}
