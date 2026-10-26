'use client';
import { useActionState } from 'react';
import { sendMagicLink } from './actions';
export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, { message: '', error: false });
  return <form action={action}>
    <label htmlFor="email">Email address</label>
    <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" />
    <button disabled={pending} type="submit">{pending ? 'Sending…' : 'Send sign-in link'}</button>
    {state.message && <p role="status" className={state.error ? 'error' : ''}>{state.message}</p>}
  </form>;
}
