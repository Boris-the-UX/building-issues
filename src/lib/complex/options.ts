export const categories = [
  { value: 'elevator', label: 'Elevators' },
  { value: 'plumbing', label: 'Water and drainage' },
  { value: 'electrical', label: 'Electricity and lighting' },
  { value: 'gas', label: 'Gas' },
  { value: 'access', label: 'Doors, gates and access' },
  { value: 'climate', label: 'Ventilation and temperature' },
  { value: 'cleaning', label: 'Cleaning and waste' },
  { value: 'pest_control', label: 'Pests' },
  { value: 'maintenance', label: 'Building and surfaces' },
  { value: 'outdoor', label: 'Outdoor areas and landscaping' },
  { value: 'pool', label: 'Pool and shared facilities' },
  { value: 'noise', label: 'Noise and disturbance' },
  { value: 'other', label: 'Other' },
] as const;
export const requestKinds = [
  { value: 'fault', label: 'Report a problem' },
  { value: 'missing_service', label: 'Missing or unavailable facility / service' },
  { value: 'change_request', label: 'Suggest an improvement' },
] as const;
export const statusLabels = {
  reported: 'Reported', acknowledged: 'Acknowledged', in_progress: 'In progress',
  waiting_for_contractor: 'Waiting for contractor', scheduled: 'Scheduled', resolved: 'Resolved',
};
export function categoryLabel(value: string) { return categories.find((c) => c.value === value)?.label ?? value; }
export function requestKindLabel(value: string) { return requestKinds.find((c) => c.value === value)?.label ?? value; }
export type LocationOption = { id: string; name: string; code: string; complex_id: string; building_id: string | null; buildings: { name: string } | null };
