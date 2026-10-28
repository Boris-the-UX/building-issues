export const residentStatuses = {
 resolved: 'Resolved / Fixed', in_progress: 'In progress', no_response: 'No response',
 promised: 'Promised, but not fixed', not_sure: 'Not sure', other: 'Other',
} as const;
export type ResidentStatus = keyof typeof residentStatuses;
type Problem = {value:string; label:string; category:string; kind:string};
const p=(value:string,label:string,category:string,kind='fault'):Problem=>({value,label,category,kind});
const common=[p('pests','Pests / cockroaches','pest_control'),p('cleaning','Cleaning / waste','cleaning'),p('lighting','Lighting / electricity','electrical'),p('water','Water leak / drainage','plumbing'),p('damage','Damage / maintenance','maintenance'),p('noise','Noise / disturbance','noise'),p('climate','Ventilation / temperature','climate'),p('missing_facility','Missing facility / service','maintenance','missing_service'),p('gas','Gas smell / supply problem','gas')];
const other=p('other','Other','other');
export function problemsFor(code:string):Problem[] {
 if(code==='elevators')return [p('lift_stopped','Not working','elevator'),p('lift_stuck','Stops or gets stuck','elevator'),p('lift_door','Door problem','elevator'),...common,other];
 if(code.includes('gate'))return [p('gate_open','Not opening','access'),p('gate_close','Not closing','access'),p('gate_access','Access unavailable','access'),p('gate_change','Request a change to access','access','change_request'),other];
 if(code==='playground')return [p('equipment','Broken equipment','maintenance'),p('surface','Damaged surface','maintenance'),p('cleaning','Cleaning / waste','cleaning'),other];
 if(code==='pool')return [p('pool_unavailable','Pool unavailable','pool','missing_service'),p('pool_water','Water quality / cleaning','pool'),p('pool_equipment','Equipment problem','pool'),other];
 if(code==='waste')return [p('missing_waste','Missing collection point','cleaning','missing_service'),p('waste_full','Bins full / waste not collected','cleaning'),...common.filter((v)=>v.value==='pests'),other];
 return [...common,other];
}
export function residentStatusLabel(value:string){return residentStatuses[value as ResidentStatus]??'Not sure';}
