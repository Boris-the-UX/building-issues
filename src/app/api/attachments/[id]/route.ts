import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'};
 if(!/^[0-9a-f-]{36}$/i.test(id))return NextResponse.json({error:'File not found'},{status:404,headers});
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:'Sign in required'},{status:401,headers});
 // Both table RLS and Storage RLS must authorize this user; no service-role client.
 const {data:file,error}=await supabase.from('report_attachments').select('path,filename,report_id').eq('id',id).maybeSingle();
 if(error)return NextResponse.json({error:'File unavailable'},{status:503,headers});
 if(!file?.report_id)return NextResponse.json({error:'File not found'},{status:404,headers});
 const {data:signed,error:signError}=await supabase.storage.from('report-media').createSignedUrl(file.path,60,{download:file.filename});
 if(signError||!signed)return NextResponse.json({error:'File unavailable'},{status:503,headers});
 return new NextResponse(null,{status:303,headers:{...headers,Location:signed.signedUrl}});
}
