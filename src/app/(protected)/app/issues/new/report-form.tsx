'use client';

import { useActionState } from 'react';
import { categories, initialReportState } from '@/lib/reports/input';
import { submitReport } from './actions';

export function ReportForm() {
  const [state, action, pending] = useActionState(submitReport, initialReportState);
  return <form action={action} className="report-form" aria-busy={pending}>
    {state.message && <p role="alert" className="error">{state.message}</p>}
    <fieldset disabled={pending}>
      <legend className="sr-only">New building issue</legend>
      <label htmlFor="title">Shared issue title</label>
      <p id="title-help" className="field-help">Visible to your building. Describe the shared problem without names or apartment numbers.</p>
      <input id="title" name="title" required maxLength={240} defaultValue={state.values.title}
        aria-invalid={!!state.errors.title} aria-describedby="title-help title-error" placeholder="For example, Elevator #2 is not working" />
      <p id="title-error" className="error field-error">{state.errors.title}</p>

      <label htmlFor="category">Category</label>
      <select id="category" name="category" defaultValue={state.values.category} aria-invalid={!!state.errors.category} aria-describedby="category-error">
        {categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
      </select>
      <p id="category-error" className="error field-error">{state.errors.category}</p>

      <label htmlFor="location">Shared location <span className="muted">(optional)</span></label>
      <p id="location-help" className="field-help">Visible to your building. Use a common area, such as the lobby or basement corridor.</p>
      <input id="location" name="location" maxLength={240} defaultValue={state.values.location}
        aria-invalid={!!state.errors.location} aria-describedby="location-help location-error" placeholder="For example, ground-floor lobby" />
      <p id="location-error" className="error field-error">{state.errors.location}</p>

      <label htmlFor="text">Your report details</label>
      <p id="text-help" className="field-help">Visible only to you, assigned management, and administrators. Tell us what happened and when. Avoid unnecessary personal information.</p>
      <textarea id="text" name="text" required maxLength={10000} rows={6} defaultValue={state.values.text}
        aria-invalid={!!state.errors.text} aria-describedby="text-help text-error" />
      <p id="text-error" className="error field-error">{state.errors.text}</p>
      <p className="muted">Submitting creates a new incident with status “Reported” and attaches your report.</p>
      <button type="submit">{pending ? 'Submitting…' : 'Submit report'}</button>
    </fieldset>
  </form>;
}
