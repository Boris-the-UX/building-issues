import Link from 'next/link';
export default function AppHome() {
  return <section className="card"><h1>Welcome to Building Issues</h1><p>One issue, one incident, one status, one communication thread.</p><Link href="/app/issues">View issues</Link></section>;
}
