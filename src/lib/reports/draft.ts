import type { LocationOption } from '../complex/options.ts';

// Conservative suggestions only. Unknown or ambiguous places must be selected by the resident.
export function suggestDraft(text: string, locations: LocationOption[]) {
 const rules: [string, RegExp][] = [
  ['parking_gate', /parking.*gate|gate.*parking|ворот.*паркин|паркин.*ворот/i],
  ['rear_gate', /rear gate|back gate|задн.{0,8}ворот/i],
  ['main_gate', /main gate|главн.{0,8}ворот|въезд.{0,15}ворот/i],
  ['pedestrian_gate', /pedestrian gate|калитк/i],
  ['playground', /playground|swing|детск.{0,8}площад|качел/i],
  ['pool', /swimming pool|\bpool\b|бассейн/i],
  ['waste', /waste collection|bin area|мусорн.{0,8}(точк|площад|контейнер)/i],
  ['parking', /parking|паркинг|парковк/i],
  ['corridor', /corridor|hallway|коридор/i],
  ['entrance', /lobby|entrance|подъезд|вестибюл|холл/i],
  ['stairs', /stairs|лестниц/i],
  ['elevators', /elevator|lift|лифт/i],
  ['outside', /outside|grounds|двор|территори/i],
 ];
 const code=rules.find(([,pattern])=>pattern.test(text))?.[0];
 const towerMatches=[...text.matchAll(/(?:tower|башн[аеы]?|корпус)\s*([12])|([12])\s*(?:башн[аеы]?|tower)|(?:перв\S*|first)\s*(?:башн\S*|tower)|(?:втор\S*|second)\s*(?:башн\S*|tower)/gi)];
 const towerNumbers=new Set(towerMatches.map((m)=>m[1]??m[2]??(/перв|first/i.test(m[0])?'1':'2')));
 const tower=towerNumbers.size===1?[...towerNumbers][0]:undefined;
 const candidates=locations.filter((l)=>l.code===code && (!l.building_id || (tower && new RegExp(`\\b${tower}\\b`).test(l.buildings?.name??''))));
 const place=candidates.length===1?candidates[0]:undefined;
 const categories: [string,RegExp][]=[
  ['pest_control',/cockroach|pest|rat\b|mice|таракан|крыс|мыш|насеком/i],
  ['gas',/\bgas\b|газ/i], ['elevator',/elevator|lift|лифт/i],
  ['plumbing',/water|leak|drain|вод[аыу]|протеч|канализац/i],
  ['electrical',/electric|light|электр|освещ|ламп/i],
  ['access',/gate|door|ворот|двер|калит/i], ['cleaning',/waste|rubbish|trash|clean|мусор|уборк|гряз/i],
  ['pool',/pool|бассейн/i], ['noise',/noise|шум/i],
 ];
 const category=categories.find(([,pattern])=>pattern.test(text))?.[0]??'other';
 const requestKind=/please open|просим открыть|открыть.{0,15}ворот|предлага|suggest|improv/i.test(text)?'change_request':/missing|unavailable|нет.{0,15}(мусор|контейнер)|отсутств/i.test(text)?'missing_service':'fault';
 const floor=text.match(/(?:floor|этаж)\s*#?\s*(\d{1,2})|\b(\d{1,2})\s*(?:st|nd|rd|th|-м|-й|м|й)?\s*(?:floor|этаже?)/i);
 const ordinalFloor=text.match(/(перв|втор|треть|четв[её]рт|пят|шест|седьм|восьм|девят|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\S*\s+(?:этаже?|floor)/i);
 const ordinalNumber=ordinalFloor?['перв|first','втор|second','треть|third','четв[её]рт|fourth','пят|fifth','шест|sixth','седьм|seventh','восьм|eighth','девят|ninth'].findIndex((pattern)=>new RegExp(pattern,'i').test(ordinalFloor[1]))+1:0;
 const object=text.match(/(?:elevator|lift|лифт)\s*(?:number|номер|№|#)?\s*(\d{1,2})/i);
 const detail=[floor?`Floor ${floor[1]??floor[2]}`:ordinalNumber?`Floor ${ordinalNumber}`:'',object?`Elevator #${object[1]}`:''].filter(Boolean).join(' · ');
 return {place,category,requestKind,detail};
}
