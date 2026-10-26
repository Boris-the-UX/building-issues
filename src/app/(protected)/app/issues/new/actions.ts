'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateReport, type ReportState } from '@/lib/reports/input';

export async function submitReport(_previous: ReportState, formData: FormData): Promise<ReportState> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const state = validateReport(formData);
  if (Object.keys(state.errors).length) return state;

  let incidentId: string;
  try {
    const { data, error } = await supabase.rpc('submit_resident_report', {
      p_title: state.values.title,
      p_text: state.values.text,
      p_location: state.values.location || undefined,
      p_category: state.values.category,
    });
    if (error || !data) {
      return { ...state, message: error?.code === '42501'
        ? 'An active resident membership is required. Contact your building administrator.'
        : error?.code === '22023'
          ? 'Check your report fields and try again.'
          : 'We could not confirm submission. Check the issues list before trying again.' };
    }
    incidentId = data;
  } catch {
    // A lost response may follow a committed transaction. Do not silently retry.
    return { ...state, message: 'We could not confirm submission. Check the issues list before trying again.' };
  }
  revalidatePath('/app/issues');
  redirect(`/app/issues?submitted=${encodeURIComponent(incidentId)}`);
}
