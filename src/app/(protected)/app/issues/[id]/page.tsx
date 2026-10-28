import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { residentStatuses, residentStatusLabel } from '@/lib/reports/questions';
const date=(value:string)=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'UTC'}).format(new Date(value))+' UTC';
export default async function Issue({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{updated?:string}>}) {
 const {id}=await params;if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:issue,error}=await supabase.from('incidents').select('id,title,created_at,complex_id').eq('id',id).maybeSingle();
 if(error)throw new Error('Unable to load issue');if(!issue)notFound();
 const {data:activity,error:activityError}=await supabase.rpc('get_issue_activity',{p_incident:id});
 if(activityError)throw new Error('Unable to load history');
 const data=activity&&typeof activity==='object'&&!Array.isArray(activity)?activity:{};
 const reports=Array.isArray(data.reports)?data.reports:[];const observations=Array.isArray(data.observations)?data.observations:[];
 const {data:own}=await supabase.from('reports').select('id,created_at').eq('incident_id',id).eq('resident_id',user.id).order('created_at',{ascending:false});
 const {data:membership}=await supabase.from('resident_memberships').select('id').eq('user_id',user.id).eq('is_active',true).maybeSingle();
 async function updateStatus(form:FormData){
  'use server';
  const client=await createClient();const {data:{user:caller}}=await client.auth.getUser();if(!caller)redirect('/login');
  const status=String(form.get('status')??'');const detail=String(form.get('detail')??'').trim();
  if(!(Object.hasOwn(residentStatuses,status))||detail.length>160||(status==='other'&&!detail))redirect(`/app/issues/${id}?updated=invalid`);
  const {error}=await client.rpc('add_resident_status',{p_incident:id,p_status:status,p_detail:detail});
  if(error)redirect(`/app/issues/${id}?updated=failed`);
  revalidatePath('/app/issues');revalidatePath('/app/statistics');revalidatePath(`/app/issues/${id}`);redirect(`/app/issues/${id}?updated=yes`);
 }
 const {updated}=await searchParams;
 return <section className="card"><Link href="/app/issues">Back to issues</Link><h1>{issue.title}</h1>
  <span className="status">{residentStatusLabel(String(data.status))}</span><p className="field-help">Latest known status reported by residents, not verified by management. “Not sure” does not replace a known status.</p>
  <p>Opened {date(issue.created_at)}</p>
  {own?.length?<section className="draft-review"><h2>Your report</h2><p>Your description and attachments. Visible only to you and authorized staff.</p>{own.map((r)=><p key={r.id}><Link href={`/app/reports/${r.id}`}>View your report</Link> · {date(r.created_at)}</p>)}</section>:<Link href="/app/issues/new">Report this problem too</Link>}
  {membership&&<section><h2>Share a status update</h2><p className="field-help">Choose based on what you know.</p>{updated&&<p role="status">{updated==='yes'?'Your update was saved.':'Update not saved. Check the status and Other description, or try again.'}</p>}<form action={updateStatus}><label htmlFor="status">What is the current status?</label><select id="status" name="status" required defaultValue=""><option value="" disabled>Choose a status</option>{Object.entries(residentStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><label htmlFor="detail">If Other, describe the status</label><input id="detail" name="detail" maxLength={160}/><button>Save status update</button></form></section>}
  <h2>Status history</h2>{observations.length?<ul>{observations.map((o,index)=>o&&typeof o==='object'&&!Array.isArray(o)?<li key={index}>{residentStatusLabel(String(o.status))} · {date(String(o.at))} · Reported by a resident</li>:null)}</ul>:<p>No resident status updates yet.</p>}
  <h2 id="reports">Resident reports ({reports.length})</h2><p className="field-help">Submission dates only. Other residents’ descriptions and files remain private.</p>{reports.length?<ul>{reports.map((r,index)=>r&&typeof r==='object'&&!Array.isArray(r)?<li key={index}>{date(String(r.at))}</li>:null)}</ul>:<p>No resident reports yet.</p>}
 </section>;
}
