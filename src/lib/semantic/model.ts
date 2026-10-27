import 'server-only';
import { tmpdir } from 'node:os';
import { createReadStream,createWriteStream } from 'node:fs';
import { mkdir,rename,rm } from 'node:fs/promises';
import { createHash,randomUUID } from 'node:crypto';
import { Readable,Transform } from 'node:stream';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { join,dirname } from 'node:path';
import { AutoModel,AutoTokenizer,FeatureExtractionPipeline,env } from '@huggingface/transformers';

export const modelId='Xenova/multilingual-e5-small';
export const modelRevision='761b726dd34fb83930e26aab4e9ac3899aa1fa78';
export const modelCacheDirectory=process.env.MODEL_CACHE_DIR||join(tmpdir(),'building-issues-models');
const directory=join(modelCacheDirectory,modelId,modelRevision);
// Hashes of the pinned revision, including its published ONNX LFS SHA-256.
const artifacts={
 'config.json':'cb99455288675345e1a4f411438d5d0adbba5fbd3a67ea4fb03c015433b996c1',
 'tokenizer_config.json':'a1d6bc8734a6f635dc158508bef000f8e2e5a759c7d92f984b2c86e5ff53425b',
 'tokenizer.json':'0b44a9d7b51c3c62626640cda0e2c2f70fdacdc25bbbd68038369d14ebdf4c39',
 'onnx/model_quantized.onnx':'f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193',
};
env.cacheDir=modelCacheDirectory;
// Loading components by their verified local directory also avoids library
// metadata discovery that otherwise ignores local_files_only/revision options.
env.allowRemoteModels=false;
async function digest(path:string):Promise<string|null>{
 try{const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);return hash.digest('hex');}
 catch(error){if(error&&typeof error==='object'&&'code'in error&&error.code==='ENOENT')return null;throw error;}
}
async function ensureFiles(allowDownload:boolean){
 for(const [file,expected] of Object.entries(artifacts)){
  const target=join(directory,file);
  if(await digest(target)===expected)continue;
  if(!allowDownload)throw new Error('Semantic model cache is missing or invalid; run npm run model:prepare');
  await mkdir(dirname(target),{recursive:true,mode:0o700});
  const temporary=target+'.'+randomUUID()+'.download';
  try{
   const response=await fetch(`https://huggingface.co/${modelId}/resolve/${modelRevision}/${file}`,{signal:AbortSignal.timeout(180000)});
   if(!response.ok||!response.body)throw new Error('Unable to download pinned semantic model');
   const hash=createHash('sha256');let bytes=0;
   const verify=new Transform({transform(chunk,_encoding,callback){bytes+=chunk.length;if(bytes>150*1024*1024)return callback(new Error('Model artifact exceeds expected bounds'));hash.update(chunk);callback(null,chunk);}});
   await streamPipeline(Readable.fromWeb(response.body as import('node:stream/web').ReadableStream),verify,createWriteStream(temporary,{flags:'wx',mode:0o600}));
   if(hash.digest('hex')!==expected)throw new Error('Semantic model artifact checksum mismatch');
   await rename(temporary,target);
  }finally{await rm(temporary,{force:true}).catch(()=>undefined);}
 }
}
export async function prepareModel(){await ensureFiles(true);}
let extractor:Promise<FeatureExtractionPipeline>|undefined;
export async function embedReport(title:string,details:string):Promise<number[]>{
 extractor??=(async()=>{
  await ensureFiles(process.env.SEMANTIC_ALLOW_MODEL_DOWNLOAD==='1');
  const options={local_files_only:true,dtype:'q8' as const,device:'cpu' as const,session_options:{intraOpNumThreads:2,interOpNumThreads:1}};
  const [tokenizer,model]=await Promise.all([AutoTokenizer.from_pretrained(directory,options),AutoModel.from_pretrained(directory,options)]);
  return new FeatureExtractionPipeline({task:'feature-extraction',tokenizer,model});
 })().catch((error:unknown)=>{extractor=undefined;throw error;});
 const model=await extractor;
 const output=await model(`query: ${title.slice(0,500)}. ${details.slice(0,3000)}`,{pooling:'mean',normalize:true});
 const vector=Array.from(output.data,Number);
 if(vector.length!==384||vector.some((n)=>!Number.isFinite(n)))throw new Error('Invalid semantic model output');
 return vector;
}
