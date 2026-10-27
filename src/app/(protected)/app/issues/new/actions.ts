'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateReport, type ReportState } from '@/lib/reports/input';
import { embedReport } from '@/lib/semantic/model';
import { verifyPendingAttachments } from '@/lib/media/verify';
import { mediaError } from '@/lib/media/rules';

export async function prepareAttachment(batch: string, location: string, filename: string, mime: string, bytes: number): Promise<{id:string;path:string}|{error:string}> {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return {error:'Sign in again before uploading.'};
 const error=mediaError([{name:filename,type:mime,size:bytes}]);
 if(error || !Number.isSafeInteger(bytes)) return {error:error??'Invalid file size.'};
 const safeName=filename.replace(/[/\\\x00-\x1f\x7f]/g,'_').slice(0,160);
 const {data,error:reservationError}=await supabase.rpc('reserve_report_attachment',{p_batch:batch,p_location:location,p_filename:safeName,p_mime:mime,p_bytes:bytes});
 if(reservationError || !data || typeof data!=='object' || Array.isArray(data) || typeof data.id!=='string' || typeof data.path!=='string') return {error:'Unable to reserve this file. Check membership and the five-file / one-video limit.'};
 return {id:data.id,path:data.path};
}
export async function removePendingAttachment(id: string, path: string): Promise<{error?:string}> {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user) return {error:'Sign in again.'};
 const {data:attachment}=await supabase.from('report_attachments').select('path,report_id').eq('id',id).maybeSingle();
 if(!attachment || attachment.report_id || attachment.path!==path) return {error:'File unavailable.'};
 const {error}=await supabase.storage.from('report-media').remove([path]);
 if(error) return {error:'Could not remove this pending file.'};
 const {error:cancelError}=await supabase.rpc('cancel_report_attachment',{p_id:id});
 return cancelError?{error:'Could not cancel this file.'}:{};
}
export async function submitReport(_previous: ReportState, formData: FormData): Promise<ReportState> {
 const supabase=await createClient();
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError || !user) redirect('/login');
 const choices=formData.getAll('grouping_choice');
 const choice=typeof choices[0]==='string'?choices[0]:'';
 formData.set('target_incident_id',choice && choice!=='new'?choice:'');
 const state=validateReport(formData);
 if(choices.length>1) return {...state,message:'Choose one grouping option.'};
 if(Object.keys(state.errors).length) return state;
 const {data:location,error:locationError}=await supabase.from('issue_locations').select('id,code,complex_id').eq('id',state.values.location_id).maybeSingle();
 if(locationError || !location) return {...state,message:'An active resident membership is required for this complex.'};
 const {data:membership}=await supabase.from('resident_memberships').select('id').eq('user_id',user.id).eq('is_active',true).maybeSingle();
 const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle();
 if(!membership || profile?.role!=='resident') return {...state,message:'An active resident membership is required.'};
 if(['other','other_inside'].includes(location.code) && !state.values.location) return {...state,errors:{location:'Describe the other location.'},message:'Check the highlighted fields.'};
 const {data:batch}=await supabase.from('report_upload_batches').select('report_id').eq('id',state.values.submission_id).maybeSingle();
 if(batch?.report_id) redirect(`/app/reports/${batch.report_id}`);
 let embedding: number[];
 try { embedding=await embedReport(state.values.title,state.values.text); }
 catch { return {...state,message:'Semantic comparison is temporarily unavailable. Your report has not been sent. Please try again later.'}; }
 const {data:suggestions,error:matchingError}=await supabase.rpc('find_similar_incidents',{
  p_location:location.id,p_category:state.values.category,p_request_kind:state.values.request_kind,
  p_location_detail:state.values.location,p_title:state.values.title,p_embedding:JSON.stringify(embedding),p_category_detail:state.values.category_detail,
 });
 if(matchingError) return {...state,message:'Could not check similar issues. Your report has not been sent.'};
 if(suggestions?.length && !choice) return {...state,suggestions,reviewRequired:true,message:'Similar issues were found. Choose whether your report concerns one of them or a separate problem.'};
 if(choice && choice!=='new' && !suggestions?.some((candidate)=>candidate.id===choice)) return {...state,suggestions:suggestions??[],reviewRequired:true,message:'That issue is no longer a suitable match. Review the options again.'};
 try { await verifyPendingAttachments(supabase,state.values.submission_id); }
 catch { return {...state,message:'A file is incomplete or its contents do not match the selected file type. Remove it and upload again.'}; }
 const {data,error}=await supabase.rpc('submit_complex_report',{p_data:{
  ...state.values, location_detail:state.values.location, embedding:JSON.stringify(embedding),
 }});
 if(error || !data || typeof data!=='object' || Array.isArray(data) || typeof data.report_id!=='string') return {...state,message:error?.code==='42501'?'An active resident membership is required.':'Could not confirm submission. Check your reports before trying again.'};
 revalidatePath('/app/issues'); revalidatePath('/app/statistics');
 redirect(`/app/reports/${data.report_id}`);
}
