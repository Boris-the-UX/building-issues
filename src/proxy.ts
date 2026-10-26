import type { Database } from '@/lib/supabase/database.types';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from '@/lib/supabase/config';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseConfig();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Verify the identity with Auth; never authorize from getSession() alone.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && (request.nextUrl.pathname === '/app' || request.nextUrl.pathname.startsWith('/app/'))) {
    const redirect = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  return response;
}

export const config = { matcher: ['/app/:path*'] };
