import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { categoryLabel,requestKindLabel,statusLabels } from '@/lib/complex/options';
import type { Json } from '@/lib/supabase/database.types';
function count(value:Json|undefined):number{return typeof value==='number'?value:0;}
function rows(value:Json|undefined):{label:string;incidents:number;reports?:number}[]{
 if(!Array.isArray(value))return [];
 return value.flatMap((row)=>row&&typeof row==='object'&&!Array.isArray(row)&&typeof row.label==='string'?[{label:row.label,incidents:count(row.incidents),reports:typeof row.reports==='number'?row.reports:undefined}]:[]);
}
export default async function Statistics({searchParams}:{searchParams:Promise<{complex?:string}>}) {
 const {complex}=await searchParams;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect('/login');
 const {data:complexes,error:complexError}=await supabase.from('complexes').select('id,name').order('name');
 const selected=complexes?.find((c)=>c.id===complex)??complexes?.[0];
 const {data,error}=selected?await supabase.rpc('get_complex_statistics',{p_complex:selected.id}):{data:null,error:null};
 const stats=data&&typeof data==='object'&&!Array.isArray(data)?data:{};
 const groups=[{title:'By problem category',data:rows(stats.by_category),label:categoryLabel},{title:'By request type',data:rows(stats.by_request_kind),label:requestKindLabel},{title:'By status',data:rows(stats.by_status),label:(v:string)=>statusLabels[v as keyof typeof statusLabels]??v},{title:'By place / facility',data:rows(stats.by_location),label:(v:string)=>v}];
 return <section className="card"><Link href="/app/issues">Back to issues</Link><h1>Complex statistics</h1>
  {complexError||error?<p role="alert" className="error">Unable to load statistics.</p>:!selected?<p>No complex assigned yet.</p>:<><p>{selected.name} · shared issues and facilities</p>
   {!!complexes?.length&&<nav aria-label="Complex selection">{complexes.map((c)=><Link key={c.id} href={`/app/statistics?complex=${c.id}`}>{c.name}</Link>)}</nav>}
   <dl className="stats-grid">{[['Shared incidents','incidents'],['Open incidents','open_incidents'],['Individual reports','reports'],['Reporting households (known units)','reporting_households']].map(([label,key])=><div key={key}><dt>{label}</dt><dd>{count(stats[key])}</dd></div>)}</dl>
   <p className="muted">Statistics count confirmed incident groups, not raw text similarity guesses. {count(stats.semantic_groups)} incidents have a semantic reference; legacy seed incidents are not automatically regrouped. Household counts exclude reports without a known unit ({count(stats.unknown_household_reports)}); following an issue does not imply that a household is affected.</p>
   {groups.map((group)=><section key={group.title}><h2>{group.title}</h2>{group.data.length?<div className="table-scroll"><table><thead><tr><th scope="col">{group.title.replace('By ','')}</th><th scope="col">Incidents</th>{group.title==='By problem category'&&<th scope="col">Reports</th>}</tr></thead><tbody>{group.data.map((row)=><tr key={row.label}><th scope="row">{group.label(row.label)}</th><td>{row.incidents}</td>{group.title==='By problem category'&&<td>{row.reports??0}</td>}</tr>)}</tbody></table></div>:<p>No data yet.</p>}</section>)}
  </>}
 </section>;
}
