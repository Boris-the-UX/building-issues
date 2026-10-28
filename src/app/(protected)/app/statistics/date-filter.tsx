'use client';
import { useState } from 'react';
export function DateFilter({value}:{value:string}) {
 const [year,setYear]=useState(value.slice(0,4));const [month,setMonth]=useState(value.slice(5,7));const [day,setDay]=useState(value.slice(8,10));
 const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
 const max=year&&month?new Date(Number(year),Number(month),0).getDate():31;
 const valid=year&&month&&day&&Number(day)<=max;
 return <fieldset className="date-parts"><legend>Issues opened since</legend><input type="hidden" name="since" value={valid?`${year}-${month}-${day}`:''}/>
  <div><select aria-label="Day" value={day} required={!!(year||month)} onChange={(e)=>setDay(e.target.value)}><option value="">Day</option>{Array.from({length:max},(_,i)=>String(i+1).padStart(2,'0')).map((d)=><option key={d}>{d}</option>)}</select>
  <select aria-label="Month" value={month} required={!!(year||day)} onChange={(e)=>{setMonth(e.target.value);setDay('');}}><option value="">Month</option>{months.map((m,i)=><option key={m} value={String(i+1).padStart(2,'0')}>{m}</option>)}</select>
  <input aria-label="Year" placeholder="YYYY" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={year} required={!!(month||day)} onChange={(e)=>setYear(e.target.value.replace(/[^0-9]/g,''))}/></div>
 </fieldset>;
}
