import { LoginForm } from './login-form';
export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="card login"><h1>Building Issues</h1><p>Sign in to your building’s shared issues.</p>
    {error && <p role="alert" className="error">Your sign-in link could not be verified. Request a new link.</p>}
    <LoginForm /><p className="muted">We’ll email you a secure link. No password needed.</p>
  </main>;
}
