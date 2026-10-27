import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from './actions';
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  // Buildings are filtered by RLS for residents, assigned management, and admins.
  const { data: buildings, error } = await supabase.from('buildings').select('id, name').order('name');
  return <><header><Link href="/app">Building Issues</Link><nav aria-label="Main navigation"><Link href="/app/issues">Issues</Link><Link href="/app/statistics">Statistics</Link></nav>
    <form action={logout}><button type="submit">Sign out</button></form></header>
    <main><section aria-label="Your buildings">
      {error ? <p role="alert" className="error">Unable to load your buildings. Please try again later.</p>
        : buildings?.length ? <p>{buildings.map((b) => b.name).join(' · ')}</p>
        : <p className="muted">No building assigned yet. Contact your building administrator.</p>}
    </section>{children}</main></>;
}
