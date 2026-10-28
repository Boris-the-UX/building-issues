import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from './actions';
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');
  return <><header><Link href="/app">Building Issues</Link><nav aria-label="Main navigation"><Link href="/app/issues">Issues</Link><Link href="/app/statistics">Statistics</Link></nav>
    <form action={logout}><button type="submit">Sign out</button></form></header>
    <main>{children}</main></>;
}
