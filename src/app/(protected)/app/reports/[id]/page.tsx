import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel,requestKindLabel,statusLabels } from '@/lib/complex/options';
export default async function Report({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:report,error}=await supabase.from('reports').select('id,text,created_at,incident_id,incidents(title,status,category,request_kind)').eq('id',id).maybeSingle();
 if(error)throw new Error('Unable to load report');
 if(!report)notFound();
 const {data:attachments,error:attachmentError}=await supabase.from('report_attachments').select('id,filename,mime_type,byte_size').eq('report_id',id).order('created_at');
 if(attachmentError)throw new Error('Unable to load attachments');
 return <section className="card"><Link href="/app/issues">Back to issues</Link><h1>Your report</h1>
  <p role="status" className="success">Your report was submitted. It is linked to the shared incident below.</p>
  <h2>{report.incidents?.title}</h2>
  <p>{report.incidents&&statusLabels[report.incidents.status]} · {categoryLabel(report.incidents?.category??'other')} · {requestKindLabel(report.incidents?.request_kind??'fault')}</p>
  <h2>Private report details</h2><p className="private-text">{report.text}</p>
  <p className="muted">Only the author, assigned management and administrators can access this report and its files.</p>
  <h2>Attachments</h2>{attachments?.length?<ul>{attachments.map((file)=><li key={file.id}><a href={`/api/attachments/${file.id}`}>{file.filename}</a> · {(file.byte_size/1024/1024).toFixed(1)} MB</li>)}</ul>:<p>No files attached.</p>}
 </section>;
}
