import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel } from '@/lib/complex/options';
import { residentStatusLabel } from '@/lib/reports/questions';
export default async function Issues({searchParams}:{searchParams:Promise<{complex?:string}>}) {
 const {complex}=await searchParams;const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const [{data:complexes,error:complexError},{data:profile},{data:membership}]=await Promise.all([
  supabase.from('complexes').select('id,name').order('name'),supabase.from('profiles').select('role').eq('id',user.id).single(),
  supabase.from('resident_memberships').select('id').eq('user_id',user.id).eq('is_active',true).maybeSingle(),
 ]);
 const selected=complexes?.find((c)=>c.id===complex)??complexes?.[0];
 const {data:incidents,error}=selected?await supabase.rpc('list_complex_incidents',{p_complex:selected.id}):{data:[],error:null};
 const {data:statuses,error:statusError}=selected?await supabase.rpc('get_resident_statuses',{p_complex:selected.id}):{data:null,error:null};
 const {data:ownReports}=await supabase.from('reports').select('incident_id').eq('resident_id',user.id);
 const ownIds=new Set(ownReports?.map((r)=>r.incident_id));
 const residentStatuses=statuses&&typeof statuses==='object'&&!Array.isArray(statuses)?statuses:{};
 return <section className="card"><div className="section-heading"><h1>Issues</h1>{profile?.role==='resident'&&membership&&<Link className="button-link" href="/app/issues/new">Report an issue</Link>}</div>
  {!membership&&profile?.role==='resident'&&<p className="notice">Your account is not assigned to a building yet. Ask your administrator to assign your building and unit before reporting.</p>}
  {complexes && complexes.length>1&&<nav aria-label="Complex selection">{complexes.map((c)=><Link key={c.id} href={`/app/issues?complex=${c.id}`} aria-current={selected?.id===c.id?'page':undefined}>{c.name}</Link>)}</nav>}
  <p className="field-help">Shared problems across your complex. Open an issue for report dates and updates. Statuses are reported by residents.</p>
  {error||complexError||statusError?<p role="alert" className="error">Unable to load issues. Please try again later.</p>:!incidents?.length?<p>No issues to show for your complex yet.</p>:<>
   <div className="issues-table-wrap"><table className="issues-table"><thead><tr><th scope="col">Issue</th><th scope="col">Building / grounds</th><th scope="col">Status</th><th scope="col">Reports</th></tr></thead>
   <tbody>{incidents.map((incident)=><tr key={incident.id}>
    <td data-label="Issue"><h2><Link href={`/app/issues/${incident.id}`}>{incident.title}</Link></h2><span className="field-help">{categoryLabel(incident.category??'other')}</span>{ownIds.has(incident.id)&&<span className="my-report field-help">You reported this</span>}</td>
    <td data-label="Building / grounds"><strong>{incident.building_name??'Shared grounds'}</strong><span className="issue-place">{incident.location_name.startsWith('Other')&&incident.location_detail&&incident.location_detail!=='Unspecified'?incident.location_detail:incident.location_name}{!incident.location_name.startsWith('Other')&&incident.location_detail&&!['Floor','Unspecified'].includes(incident.location_detail)?` · ${incident.location_detail}`:''}</span></td>
    <td data-label="Status"><span className="status">{residentStatusLabel(String(residentStatuses[incident.id]??'not_sure'))}</span></td>
    <td data-label="Reports">{incident.report_count===0?<span className="muted">No resident reports</span>:<Link href={`/app/issues/${incident.id}#reports`}>{incident.report_count} {incident.report_count===1?'report':'reports'}</Link>}</td>
   </tr>)}</tbody></table></div></>}
 </section>;
}
