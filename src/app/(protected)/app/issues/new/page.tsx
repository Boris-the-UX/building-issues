import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReportForm } from './report-form';

export const maxDuration=300;
export default async function NewIssue() {
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)redirect('/login');
 const [{data:profile,error:profileError},{data:membership,error:membershipError}]=await Promise.all([
  supabase.from('profiles').select('role').eq('id',user.id).single(),
  supabase.from('resident_memberships').select('building_id, buildings(name,complex_id,complexes(name))').eq('user_id',user.id).eq('is_active',true).maybeSingle(),
 ]);
 const complexId=membership?.buildings?.complex_id;
 const {data:locations,error:locationError}=complexId?await supabase.from('issue_locations').select('id,name,code,complex_id,building_id,buildings(name)').eq('complex_id',complexId).order('name'):{data:[],error:null};
 return <section className="card"><Link href="/app/issues">Back to issues</Link><h1>Report an issue</h1>
  {profileError||membershipError||locationError?<p role="alert" className="error">Unable to check your complex access. Please try again later.</p>
   :profile?.role!=='resident'||!membership||!locations?.length?<p>An active resident membership is required to submit a report. Contact your building administrator.</p>
   :<ReportForm locations={locations} initialBuilding={membership.building_id} submissionId={randomUUID()}/>}
 </section>;
}
