'use server';
import { createClient } from '@/lib/supabase/server';

export type LoginState = { message: string; error: boolean };
export async function sendMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { message: 'Enter a valid email address.', error: true };
  }
  try {
    const supabase = await createClient();
    // The Supabase email template uses SiteURL + /auth/confirm and TokenHash.
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return { message: 'Unable to send a sign-in link. Please try again later.', error: true };
    return { message: 'Check your email for a sign-in link. If eligible, a message will arrive shortly.', error: false };
  } catch {
    return { message: 'Sign-in is temporarily unavailable. Please try again later.', error: true };
  }
}
