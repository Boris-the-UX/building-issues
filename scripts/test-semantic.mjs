import assert from 'node:assert/strict';
import {embedReport} from '../src/lib/semantic/model.ts';
import {env} from '@huggingface/transformers';
// Inference must work from the prepared cache without any network calls.
env.fetch=globalThis.fetch=async()=>{throw new Error('Unexpected network request during private inference');};
function cosine(a,b){return a.reduce((sum,value,index)=>sum+value*b[index],0);}
const examples=[
 ['Elevator #2 is not working','The lift is stuck and does not respond to calls.'],
 ['Second lift out of service','Elevator number two is broken and will not move.'],
 ['Лифт номер два не работает','Лифт стоит и не реагирует на вызов.'],
 ['Waste collection point missing','There is no shared area to dispose of rubbish.'],
 ['No place for communal trash bins','We need a designated rubbish collection area for the complex.'],
];
const vectors=[];
for(const [title,text] of examples)vectors.push(await embedReport(title,text));
for(const vector of vectors){assert.equal(vector.length,384);assert.ok(Math.abs(cosine(vector,vector)-1)<0.001);}
const lift=cosine(vectors[0],vectors[1]);
const multilingual=cosine(vectors[0],vectors[2]);
const unrelated=cosine(vectors[0],vectors[3]);
const waste=cosine(vectors[3],vectors[4]);
console.log('Actual local model cosine scores:',{lift,multilingual,unrelated,waste});
assert.ok(lift>=0.89,'Lift paraphrases are semantically similar');
assert.ok(multilingual>=0.89,'Russian and English descriptions match by meaning');
assert.ok(waste>=0.89,'Missing waste facility paraphrases match');
assert.ok(lift>unrelated+0.05 && unrelated<0.89,'Unrelated facilities stay below the conservative suggestion threshold');
console.log('Semantic model checks passed. SQL independently checks place, category, request type, object numbers and user confirmation.');
