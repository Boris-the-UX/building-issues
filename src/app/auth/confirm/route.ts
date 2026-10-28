import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type');
  // This endpoint accepts only email sign-in tokens, with a fixed local destination.
  if (tokenHash && type === 'email') {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
    if (!error) return new NextResponse(null, { status: 303, headers: { Location: '/app/issues' } });
  }
  return new NextResponse(null, { status: 303, headers: { Location: '/login?error=invalid_link' } });
}
