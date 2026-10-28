'use client';
import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { type LocationOption } from '@/lib/complex/options';
import { problemsFor, residentStatuses } from '@/lib/reports/questions';
import { initialReportState } from '@/lib/reports/input';
import { mediaError, mediaMime } from '@/lib/media/rules';
import { createClient } from '@/lib/supabase/client';
import { prepareAttachment, removePendingAttachment, submitReport } from './actions';

type SelectedMedia={key:string;file:File;url:string;uploaded?:{id:string;path:string}};
export function ReportForm({locations,submissionId}:{locations:LocationOption[];submissionId:string}) {
 const [batchId]=useState(submissionId);
 const [state,action,pending]=useActionState(submitReport,{...initialReportState,values:{...initialReportState.values,submission_id:batchId}});
 const [building,setBuilding]=useState('');
 const [location,setLocation]=useState('');
 const [problem,setProblem]=useState('');
 const [status,setStatus]=useState('');
 const [description,setDescription]=useState('');
 const [review,setReview]=useState(false);
 const [title,setTitle]=useState('');
 const [detail,setDetail]=useState('');
 const [other,setOther]=useState('');
 const reviewRef=useRef<HTMLDivElement>(null);
 const place=locations.find((l)=>l.id===location);
 const selectedProblem=problemsFor(place?.code??'').find((p)=>p.value===problem);
 function prepareReview() {
  setTitle(`${selectedProblem?.value==='other'?other:selectedProblem?.label} · ${place?.buildings?.name??'Shared facilities & grounds'} · ${place?.name}${detail?` · ${detail}`:''}`.slice(0,240));
  setReview(true);setTimeout(()=>reviewRef.current?.focus(),0);
 }
 const [media,setMedia]=useState<SelectedMedia[]>([]);
 const [uploading,setUploading]=useState(false);
 const [uploadError,setUploadError]=useState('');
 const [uploadStatus,setUploadStatus]=useState('');
 const uploaded=useRef(new Map<string,{id:string;path:string}>());
 const mediaRef=useRef(media);
 useEffect(()=>{mediaRef.current=media;},[media]);
 useEffect(()=>()=>mediaRef.current.forEach((item)=>URL.revokeObjectURL(item.url)),[]);
 const available=locations.filter((l)=>(l.building_id??'shared')===building);
 const towers=[...new Map(locations.filter((l)=>l.building_id).map((l)=>[l.building_id!,l.buildings?.name??'Building'])).entries()];
 const busy=pending||uploading;
 async function remove(item:SelectedMedia) {
  const reserved=uploaded.current.get(item.key);
  if(reserved) {
   setUploading(true);
   const result=await removePendingAttachment(reserved.id,reserved.path);
   setUploading(false);
   if(result.error){setUploadError(result.error);return;}
  }
  uploaded.current.delete(item.key);URL.revokeObjectURL(item.url);setMedia((current)=>current.filter((m)=>m.key!==item.key));
 }
 return <form action={action} className="report-form" aria-busy={busy} onSubmit={(event)=>{
  if(!review){event.preventDefault();prepareReview();return;}
  if(!media.length)return;
  event.preventDefault();
  const data=new FormData(event.currentTarget);data.delete('media');
  const selected=mediaRef.current;
  setUploading(true);setUploadError('');
  void (async()=>{
   try {
    const supabase=createClient();
    for(let index=0;index<selected.length;index++) {
     const item=selected[index];
     if(uploaded.current.has(item.key))continue;
     setUploadStatus(`Uploading file ${index+1} of ${selected.length}…`);
     const reservation=await prepareAttachment(batchId,String(data.get('location_id')),item.file.name,mediaMime(item.file),item.file.size);
     if('error' in reservation)throw new Error(reservation.error);
     const {error}=await supabase.storage.from('report-media').upload(reservation.path,item.file,{contentType:mediaMime(item.file),upsert:false});
     if(error){await removePendingAttachment(reservation.id,reservation.path);throw new Error('File upload failed. Check your connection and try again.');}
     uploaded.current.set(item.key,reservation);
    }
    startTransition(()=>action(data));
   } catch(error) {setUploadError(error instanceof Error?error.message:'File upload failed.');}
   finally{setUploading(false);setUploadStatus('');}
  })();
 }}>
  <input type="hidden" name="submission_id" value={batchId}/>
  {state.message&&<p role="alert" className={state.reviewRequired?'notice':'error'}>{state.message}</p>}
  {uploadError&&<p role="alert" className="error">{uploadError}</p>}
  <fieldset disabled={busy}>
   <legend className="sr-only">New complex issue</legend>
   <label htmlFor="scope">Where is the issue?</label>
   <select id="scope" value={building} required disabled={review} onChange={(event)=>{setBuilding(event.target.value);setLocation('');setProblem('');}}>
    <option value="">Choose a building or shared grounds</option>
    {towers.map(([id,name])=><option key={id} value={id}>{name}</option>)}
    <option value="shared">Shared facilities &amp; grounds</option>
   </select>
   <label htmlFor="location_id">Which place or facility?</label>
   <select id="location_id" value={location} required disabled={review} onChange={(event)=>{setLocation(event.target.value);setProblem('');}}>
    <option value="">Choose a place or facility</option>{available.map((l)=><option key={l.id} value={l.id}>{l.name}</option>)}
   </select>
   <input type="hidden" name="location_id" value={location}/>
   <label htmlFor="problem">What is the problem?</label>
   <select id="problem" value={problem} required disabled={review||!location} onChange={(event)=>setProblem(event.target.value)}>
    <option value="">Choose a problem</option>{problemsFor(place?.code??'').map((p)=><option key={p.value} value={p.value}>{p.label}</option>)}
   </select>
   <input type="hidden" name="problem" value={problem}/>
   {problem==='other'&&<><label htmlFor="category_detail">Describe the problem</label><input id="category_detail" name="category_detail" required maxLength={160} value={other} onChange={(event)=>{setOther(event.target.value);setReview(false);}}/></>}
   {selectedProblem?.category==='gas'&&<p className="notice">If you smell gas, move to safety and contact emergency services. Do not wait for this app.</p>}
   <label htmlFor="current_status">What is the current status?</label>
   <p className="field-help">Choose based on what you know. This is your report, not confirmation from management.</p>
   <select id="current_status" name="current_status" required value={status} onChange={(event)=>setStatus(event.target.value)}><option value="">Choose a status</option>{Object.entries(residentStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
   {status==='other'&&<><label htmlFor="status_detail">Describe the status</label><input id="status_detail" name="status_detail" required maxLength={160}/></>}
   <details><summary>Additional details (optional)</summary>
    <label htmlFor="location">Floor, object number or landmark</label><input id="location" name="location" maxLength={240} value={detail} onChange={(event)=>{setDetail(event.target.value);setReview(false);}}/>
    <p className="field-help">This location detail is shared. Avoid names and apartment numbers.</p>
    <label htmlFor="text">Additional details</label><textarea id="text" name="text" rows={3} maxLength={10000} value={description} onChange={(event)=>setDescription(event.target.value)}/>
    <p className="field-help">Private to you and authorized staff. You can use your phone keyboard’s microphone to dictate.</p>
   </details>
   {review&&<div ref={reviewRef} tabIndex={-1} className="draft-review"><h2>Check before sending</h2>
    <label htmlFor="title">Public issue title</label><input id="title" name="title" required maxLength={240} value={title} onChange={(event)=>setTitle(event.target.value)}/>
    <p className="field-help">Visible to neighbors. Do not include personal information.</p>
    <button type="button" onClick={()=>setReview(false)}>Edit answers</button>
   </div>}
   {Object.entries(state.errors).map(([key,message])=><p key={key} className="error" role="alert">{message}</p>)}
   <label htmlFor="media">Photos and video <span className="muted">(optional)</span></label>
   <details id="media-help"><summary>File requirements</summary><p>Private attachments. Up to five files: photos up to 10 MB each and one video up to 50 MB. HEIC previews may be unavailable.</p></details>
   <label htmlFor="media" className="upload-button">Add photos or video</label>
   <span className="field-help" role="status">{media.length?`${media.length} file${media.length===1?'':'s'} selected`:'No files selected'}</span>
   <input id="media" className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,video/mp4,video/quicktime,video/webm" multiple aria-describedby="media-help" onChange={(event)=>{
    const added=Array.from(event.target.files??[]); const error=mediaError([...media.map((m)=>m.file),...added]);
    if(error){setUploadError(error);event.target.value='';return;}
    setUploadError('');setMedia((current)=>[...current,...added.map((file)=>({key:crypto.randomUUID(),file,url:URL.createObjectURL(file)}))]);event.target.value='';
   }}/>
   <ul className="media-list">{media.map((item)=><li key={item.key}>
    {mediaMime(item.file).startsWith('video/')?<video src={item.url} controls preload="metadata" aria-label={item.file.name}/>:<span className="media-preview" style={{backgroundImage:`url("${item.url}")`}} role="img" aria-label={item.file.name}/>}
    <span>{item.file.name} · {(item.file.size/1024/1024).toFixed(1)} MB</span><button type="button" onClick={()=>void remove(item)}>Remove</button>
   </li>)}</ul>
   {review&&state.reviewRequired&&<fieldset className="matches"><legend>Does your report concern an existing issue?</legend>
    <p>Suggestions are based on meaning, the same place, request type and category. Different objects or closed incidents are not combined automatically.</p>
    {state.suggestions?.map((candidate)=><label key={candidate.id} className="radio-option"><input type="radio" name="grouping_choice" value={candidate.id} required/>{candidate.title} · {candidate.report_count} reports</label>)}
    <label className="radio-option"><input type="radio" name="grouping_choice" value="new" required/>This is a separate problem — create a new incident</label>
   </fieldset>}
   {review&&<p className="muted">We check for similar incidents before saving. You confirm any grouping; private reports stay separate.</p>}
   <p role="status">{uploadStatus|| (pending?'Comparing similar issues and submitting…':'')}</p>
   <button type="submit">{busy?'Please wait…':!review?'Continue':state.reviewRequired?'Confirm and send':'Send report'}</button>
  </fieldset>
 </form>;
}
