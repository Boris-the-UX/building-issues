import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ReportForm } from './report-form';

export default async function NewIssue() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('resident_memberships').select('building_id, buildings(name)').eq('user_id', user.id).eq('is_active', true).maybeSingle(),
  ]);
  return <section className="card">
    <Link href="/app/issues">Back to issues</Link>
    <h1>Report a building issue</h1>
    {profileError || membershipError
      ? <p role="alert" className="error">Unable to check your building access. Please try again later.</p>
      : profile?.role !== 'resident' || !membership
        ? <p>An active resident membership is required to submit a report. Contact your building administrator.</p>
        : <><p>Report for <strong>{membership.buildings?.name ?? 'your building'}</strong></p><ReportForm /></>}
  </section>;
}
