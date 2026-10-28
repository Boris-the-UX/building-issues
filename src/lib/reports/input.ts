import { residentStatuses } from '../reports/questions';
import { categories, requestKinds } from '../complex/options';
export { categories } from '../complex/options';

export type ReportValues = {
 problem: string; current_status: string; status_detail: string; title: string; text: string; location: string; category: string; category_detail: string;
 location_id: string; request_kind: string; submission_id: string; target_incident_id: string;
};
export type ReportField = keyof ReportValues;
export type SimilarIncident = { id: string; title: string; status: string; report_count: number };
export type ReportState = { values: ReportValues; errors: Partial<Record<ReportField,string>>; message: string; suggestions?: SimilarIncident[]; reviewRequired?: boolean };
export const initialReportState: ReportState = {
 values: { problem: '', current_status: 'not_sure', status_detail: '', title: '', text: '', location: '', category: 'other', category_detail: '', location_id: '', request_kind: 'fault', submission_id: '', target_incident_id: '' },
 errors: {}, message: '',
};
export function validateReport(formData: FormData): ReportState {
 const values = { ...initialReportState.values };
 const errors: ReportState['errors'] = {};
 for (const field of Object.keys(values) as ReportField[]) {
  const entries=formData.getAll(field);
  if (entries.length>1 || (entries.length===1 && typeof entries[0]!=='string')) { errors[field]='Enter a valid value.'; continue; }
  values[field]=typeof entries[0]==='string'?entries[0].trim():values[field];
 }
 const length=(value:string)=>[...value].length;
 if (!values.title || length(values.title)>240) errors.title='Enter a shared title of 1–240 characters.';
 if (!values.text || length(values.text)>10000) errors.text='Enter report details of 1–10,000 characters.';
 if (length(values.location)>240) errors.location='Use at most 240 characters for the location.';
 if (length(values.category_detail)>160 || (values.category==='other' && !values.category_detail)) errors.category_detail='Describe the other problem type in 1–160 characters.';
 if (!categories.some((c)=>c.value===values.category)) errors.category='Choose a category from the list.';
 if (!requestKinds.some((k)=>k.value===values.request_kind)) errors.request_kind='Choose a request type.';
 if (!(Object.hasOwn(residentStatuses,values.current_status))) errors.current_status='Choose a current status.';
 if(values.current_status==='other' && !values.status_detail) errors.status_detail='Describe the status.';
 if(length(values.status_detail)>160) errors.status_detail='Use at most 160 characters.';
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 for (const field of ['submission_id','location_id'] as const) if(!uuid.test(values[field])) errors[field]='Choose a valid location or reopen the form.';
 if (values.target_incident_id && !uuid.test(values.target_incident_id)) errors.target_incident_id='Choose a valid incident.';
 for(const field of Object.keys(values) as ReportField[]) values[field]=[...values[field]].slice(0,field==='text'?10000:field==='title'||field==='location'?240:160).join('');
 return { values,errors,message:Object.keys(errors).length?'Check the highlighted fields.':'' };
}
