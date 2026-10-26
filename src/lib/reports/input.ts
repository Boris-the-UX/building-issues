export const categories = [
  { value: 'elevator', label: 'Elevator' },
  { value: 'plumbing', label: 'Plumbing and hot water' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'pest_control', label: 'Pest control' },
  { value: 'maintenance', label: 'General maintenance' },
  { value: 'other', label: 'Other' },
] as const;

export type ReportValues = { title: string; text: string; location: string; category: string };
export type ReportField = keyof ReportValues;
export type ReportState = {
  values: ReportValues;
  errors: Partial<Record<ReportField, string>>;
  message: string;
};
export const initialReportState: ReportState = {
  values: { title: '', text: '', location: '', category: 'other' },
  errors: {},
  message: '',
};

// Explicit allowlist; no caller-supplied author, building, source, or status.
export function validateReport(formData: FormData): ReportState {
  const values = { ...initialReportState.values };
  const errors: ReportState['errors'] = {};
  for (const field of Object.keys(values) as ReportField[]) {
    const entries = formData.getAll(field);
    if (entries.length !== 1 || typeof entries[0] !== 'string') {
      errors[field] = 'Enter a valid value.';
      continue;
    }
    values[field] = entries[0].trim();
  }
  // PostgreSQL char_length counts Unicode code points, not UTF-16 code units.
  const length = (value: string) => [...value].length;
  if (!values.title || length(values.title) > 240) errors.title = 'Enter a shared title of 1–240 characters.';
  if (!values.text || length(values.text) > 10000) errors.text = 'Enter report details of 1–10,000 characters.';
  if (length(values.location) > 240) errors.location = 'Use at most 240 characters for the location.';
  if (!categories.some((category) => category.value === values.category)) errors.category = 'Choose a category from the list.';
  // Never echo arbitrarily large malformed payloads back into the page.
  values.title = [...values.title].slice(0, 240).join('');
  values.text = [...values.text].slice(0, 10000).join('');
  values.location = [...values.location].slice(0, 240).join('');
  if (errors.category) values.category = 'other';
  return { values, errors, message: Object.keys(errors).length ? 'Check the highlighted fields.' : '' };
}
