import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categories, categoryLabel } from '@/lib/complex/options';
import { DateFilter } from './date-filter';
import { residentStatuses, residentStatusLabel } from '@/lib/reports/questions';
import type { Json } from '@/lib/supabase/database.types';
function count(value:Json|undefined):number{return typeof value==='number'?value:0;}
function rows(value:Json|undefined):{label:string;incidents:number}[]{
 if(!Array.isArray(value))return [];
 return value.flatMap((row)=>row&&typeof row==='object'&&!Array.isArray(row)&&typeof row.label==='string'?[{label:row.label,incidents:count(row.incidents)}]:[]);
}
export default async function Statistics({searchParams}:{searchParams:Promise<{complex?:string;place?:string;category?:string;status?:string;since?:string}>}) {
 const params=await searchParams; const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:complexes,error:complexError}=await supabase.from('complexes').select('id,name').order('name');
 const selected=complexes?.find((c)=>c.id===params.complex)??complexes?.[0];
 const {data:buildings}=selected?await supabase.from('buildings').select('id,name').eq('complex_id',selected.id).order('name'):{data:[]};
 const filters={place:params.place??'',category:params.category??'',status:params.status??'',since:/^\d{4}-\d{2}-\d{2}$/.test(params.since??'')?params.since!:''};
 const {data,error}=selected?await supabase.rpc('get_filtered_complex_statistics',{p_complex:selected.id,p_filters:filters}):{data:null,error:null};
 const stats=data&&typeof data==='object'&&!Array.isArray(data)?data:{};
 const total=count(stats.incidents);
 const groups=[{title:'Issues by category',data:rows(stats.by_category),label:categoryLabel},{title:'Issues by status',data:rows(stats.by_status),label:residentStatusLabel},{title:'Issues by building / grounds',data:rows(stats.by_location),label:(v:string)=>v}];
 return <section className="card"><h1>Issue statistics</h1>
  {!selected?<p>No complex assigned yet.</p>:<>
   <form className="filters" method="get">
    {complexes&&complexes.length>1?<label>Complex<select name="complex" defaultValue={selected.id}>{complexes.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:<input type="hidden" name="complex" value={selected.id}/>}
    <div><label htmlFor="filter-place">Building / grounds</label><select id="filter-place" name="place" defaultValue={filters.place}><option value="">All buildings and grounds</option>{buildings?.map((b)=><option key={b.id} value={b.id}>{b.name}</option>)}<option value="shared">Shared grounds</option></select></div>
    <div><label htmlFor="filter-category">Category</label><select id="filter-category" name="category" defaultValue={filters.category}><option value="">All categories</option>{categories.map((c)=><option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
    <div><label htmlFor="filter-status">Status</label><select id="filter-status" name="status" defaultValue={filters.status}><option value="">All statuses</option>{Object.entries(residentStatuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    <DateFilter value={filters.since}/>
    <button type="submit">Apply filters</button>{Object.values(filters).some(Boolean)&&<Link href={`/app/statistics?complex=${selected.id}`}>Reset filters</Link>}
   </form>
   {complexError||error?<p role="alert" className="error">Unable to load statistics. Please try again.</p>:<>
   <dl className="stats-grid">{[['Total issues',total],['Not reported fixed',count(stats.open_incidents)],['Resident reports',count(stats.reports)]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
   <p className="field-help">An issue is one problem. Several residents can submit reports about the same issue. Charts count issues; report totals include all reports linked to the selected issues.</p>
   {!total?<p role="status">No issues match these filters. Try another location or reset the filters.</p>:<div className="charts">{groups.map((group)=><section className="chart" key={group.title}><h2>{group.title}</h2><ul className="bar-chart" aria-label={group.title}>{group.data.map((row)=><li key={row.label}><div className="bar-label"><span>{group.label(row.label)}</span><strong>{row.incidents}</strong></div><div className="bar-track" aria-hidden="true"><div className="bar-fill" style={{width:`${row.incidents/Math.max(...group.data.map((r)=>r.incidents),1)*100}%`}}/></div></li>)}</ul></section>)}</div>}
   </>}
  </>}
 </section>;
}
