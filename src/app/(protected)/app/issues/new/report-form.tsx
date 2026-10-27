'use client';
import { startTransition, useActionState, useEffect, useRef, useState } from 'react';
import { categories, requestKinds, type LocationOption } from '@/lib/complex/options';
import { suggestDraft } from '@/lib/reports/draft';
import { initialReportState } from '@/lib/reports/input';
import { mediaError, mediaMime } from '@/lib/media/rules';
import { createClient } from '@/lib/supabase/client';
import { prepareAttachment, removePendingAttachment, submitReport } from './actions';

type SelectedMedia={key:string;file:File;url:string;uploaded?:{id:string;path:string}};
export function ReportForm({locations,initialBuilding,submissionId}:{locations:LocationOption[];initialBuilding:string;submissionId:string}) {
 const [batchId]=useState(submissionId);
 const [state,action,pending]=useActionState(submitReport,{...initialReportState,values:{...initialReportState.values,submission_id:batchId}});
 const [building,setBuilding]=useState(initialBuilding);
 const [location,setLocation]=useState(locations.find((l)=>l.building_id===initialBuilding)?.id??'');
 const [category,setCategory]=useState('other');
 const [description,setDescription]=useState('');
 const [review,setReview]=useState(false);
 const [title,setTitle]=useState('');
 const [detail,setDetail]=useState('');
 const [kind,setKind]=useState('fault');
 const [other,setOther]=useState('');
 const [editing,setEditing]=useState(false);
 const descriptionRef=useRef<HTMLTextAreaElement>(null);
 const reviewRef=useRef<HTMLDivElement>(null);
 function prepareReview() {
  if(!description.trim()){descriptionRef.current?.focus();return;}
  const draft=suggestDraft(description,locations);
  setLocation(draft.place?.id??'');
  setBuilding(draft.place?(draft.place.building_id??'shared'):initialBuilding);
  setCategory(draft.category);setKind(draft.requestKind);setDetail(draft.detail);
  setTitle(`${categories.find((c)=>c.value===draft.category)?.label??'Issue'}${draft.place?` · ${draft.place.name}`:''}${draft.detail?` · ${draft.detail}`:''}`);
  setOther('');setEditing(false);setReview(true);
  setTimeout(()=>reviewRef.current?.focus(),0);
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
 return <form action={action} className="report-form" onInvalidCapture={()=>setEditing(true)} aria-busy={busy} onSubmit={(event)=>{
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
   <label htmlFor="text">What happened and where?</label>
   <p id="text-help" className="field-help">Write naturally or use the microphone on your phone’s keyboard. For example: “Cockroaches in the Tower 2 corridor on floor 3 this morning.”</p>
   <textarea ref={descriptionRef} id="text" name="text" required rows={4} maxLength={10000} value={description} onChange={(event)=>{setDescription(event.target.value);setReview(false);}} aria-describedby="text-help text-error" aria-invalid={!!state.errors.text}/>
   <p className="field-help">Your description and attachments are private. Only the title and location you approve below are shared with neighbors.</p>
   <p id="text-error" className="error field-error">{state.errors.text}</p>
   {review&&<div ref={reviewRef} tabIndex={-1} className="draft-review">
   <h2>Check before sending</h2>
   <p>We suggested details from your description. Correct anything that is wrong. Nothing has been sent yet.</p>
   <label htmlFor="title">Public issue title</label>
   <p id="title-help" className="field-help">Give neighbors a short title they can recognize. No names, apartment numbers or personal information.</p>
   <input id="title" name="title" required maxLength={240} value={title} onChange={(event)=>setTitle(event.target.value)} placeholder="For example, Cockroaches in the floor 3 corridor" aria-describedby="title-help"/>
   <p className="error field-error">{state.errors.title}</p>
   <p><strong>Place:</strong> {locations.find((l)=>l.id===location)?.buildings?.name??(location?'Shared grounds':'Please choose below')} · {locations.find((l)=>l.id===location)?.name} {detail&&` · ${detail}`}</p>
   <p><strong>Category:</strong> {categories.find((c)=>c.value===category)?.label} · {requestKinds.find((k)=>k.value===kind)?.label}</p>
   <details open={editing||!location||category==='other'||category==='gas'||!!Object.keys(state.errors).length} onToggle={(event)=>setEditing(event.currentTarget.open)}>
   <summary>Edit place and details</summary>
   <label htmlFor="scope">Where is the issue?</label>
   <select id="scope" value={building} onChange={(event)=>{
    const value=event.target.value;setBuilding(value);setLocation('');
   }}>
    {towers.map(([id,name])=><option key={id} value={id}>{name} — building and parking</option>)}
    <option value="shared">Shared complex areas</option>
   </select>
   <label htmlFor="location_id">Place / facility</label>
   <select id="location_id" name="location_id" value={location} required aria-invalid={!!state.errors.location_id} onChange={(event)=>setLocation(event.target.value)}>
    <option value="">Choose a place</option>
    {available.map((l)=><option key={l.id} value={l.id}>{l.name}</option>)}
   </select>
   {state.errors.location_id&&<p className="error">{state.errors.location_id}</p>}
   <label htmlFor="location">Specific object, floor or landmark <span className="muted">(optional, except for “Other”)</span></label>
   <p id="location-help" className="field-help">Shared with residents. For elevators, include the elevator number. Avoid apartment numbers and personal information.</p>
   <input id="location" name="location" maxLength={240} value={detail} onChange={(event)=>setDetail(event.target.value)} aria-describedby="location-help location-error" aria-invalid={!!state.errors.location}/>
   <p id="location-error" className="error field-error">{state.errors.location}</p>
   <label htmlFor="request_kind">Type of request</label>
   <select id="request_kind" name="request_kind" value={kind} onChange={(event)=>setKind(event.target.value)}>{requestKinds.map((k)=><option key={k.value} value={k.value}>{k.label}</option>)}</select>
   <label htmlFor="category">Problem category</label>
   <select id="category" name="category" value={category} onChange={(event)=>setCategory(event.target.value)}>{categories.map((c)=><option key={c.value} value={c.value}>{c.label}</option>)}</select>
   {category==='other'?<><label htmlFor="category_detail">Describe the other problem type (shared)</label><input id="category_detail" name="category_detail" maxLength={160} required value={other} onChange={(event)=>setOther(event.target.value)}/><p className="error field-error">{state.errors.category_detail}</p></>:<input type="hidden" name="category_detail" value=""/>}
   {category==='gas'&&<p className="notice" role="note">If you smell gas or there is immediate danger, move to safety and contact emergency services or your gas emergency line. Do not wait for a response in this app.</p>}
   </details>
   </div>}
   <label htmlFor="media">Photos and video <span className="muted">(optional)</span></label>
   <p id="media-help" className="field-help">Private attachments. Up to five files: photos up to 10 MB each and one video up to 50 MB. HEIC is accepted; browser previews may be unavailable.</p>
   <input id="media" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif,video/mp4,video/quicktime,video/webm" multiple aria-describedby="media-help" onChange={(event)=>{
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
