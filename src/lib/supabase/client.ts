'use client';
import type { Database } from '@/lib/supabase/database.types';
import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

export function createClient() {
  const { url, key } = getSupabaseConfig();
  return createBrowserClient<Database>(url, key);
}
