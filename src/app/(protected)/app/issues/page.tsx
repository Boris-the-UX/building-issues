import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';

const statusLabels: Record<Database['public']['Enums']['incident_status'], string> = {
  reported: 'Reported', acknowledged: 'Acknowledged', in_progress: 'In progress',
  waiting_for_contractor: 'Waiting for contractor', scheduled: 'Scheduled', resolved: 'Resolved',
};
export default async function Issues({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const { submitted } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const [{ data: incidents, error }, { data: profile }] = await Promise.all([
    supabase.from('incidents').select('id, title, location, status, created_at, created_by').order('created_at', { ascending: false }).order('id').limit(50),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
  ]);
  const confirmed = incidents?.some((incident) => incident.id === submitted && incident.created_by === user.id);
  return <section className="card">
    <div className="section-heading"><h1>Building issues</h1>{profile?.role === 'resident' && <Link className="button-link" href="/app/issues/new">Report an issue</Link>}</div>
    {confirmed && <p className="success" role="status">Your report was submitted and a new incident was created.</p>}
    {error ? <p className="error" role="alert">Unable to load issues. Please try again later.</p>
      : !incidents?.length ? <p>No issues to show for your building yet.</p>
        : <><p className="muted">Latest {incidents.length} issues. Only shared incident information is shown here.</p>
          <ul className="issue-list">{incidents.map((incident) => <li key={incident.id}>
            <h2>{incident.title}</h2><span className="status">{statusLabels[incident.status]}</span>
            {incident.location && <p>{incident.location}</p>}
          </li>)}</ul></>}
  </section>;
}
