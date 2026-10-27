import 'server-only';
import { fileTypeFromBuffer } from 'file-type';
import type { createClient } from '@/lib/supabase/server';
export async function verifyPendingAttachments(supabase: Awaited<ReturnType<typeof createClient>>, batch: string) {
 const {data: attachments,error}=await supabase.from('report_attachments').select('path,byte_size,mime_type').eq('batch_id',batch);
 if(error) throw new Error('Unable to check files');
 for(const attachment of attachments??[]) {
  const {data:file,error:downloadError}=await supabase.storage.from('report-media').download(attachment.path);
  if(downloadError || !file || file.size!==attachment.byte_size) throw new Error('Incomplete file');
  const detected=await fileTypeFromBuffer(new Uint8Array(await file.slice(0,8192).arrayBuffer()));
  const heif=['image/heic','image/heif'];
  if(!detected || (detected.mime!==attachment.mime_type && !(heif.includes(detected.mime)&&heif.includes(attachment.mime_type)))) throw new Error('File contents do not match its type');
 }
}
