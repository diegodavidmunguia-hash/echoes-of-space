import {validateStory} from './validation.js';
import {assets} from './assets.js';

const thirtyMinutes=30*60*1000;
const maxBodyBytes=64000;
const requestHeaders={
  'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin'
};
const storyColumns='id, destination, type, category, language, title, hardware, body, sources';
const api=(object,status=200)=>Response.json(object,{status,headers:{...requestHeaders,'Cache-Control':'no-store'}});
const error=(status,code)=>api({error:code},status);
function storyRecord(row) {
  return {
    id:row.id,destination:row.destination,type:row.type,category:row.category,language:row.language,
    title:row.title,hardware:row.hardware,body:row.body,
    sources:JSON.parse(row.sources).map(url=>({url})),community:true
  };
}
async function readLimited(request) {
  if(!request.body) return null;
  const reader=request.body.getReader(), decoder=new TextDecoder();
  let size=0, body='';
  while(true) {
    const {done,value}=await reader.read();
    if(done) break;
    size+=value.byteLength;
    if(size>maxBodyBytes){await reader.cancel();return null;}
    body+=decoder.decode(value,{stream:true});
  }
  try{return JSON.parse(body+decoder.decode());}catch{return null;}
}
async function stories(request,env,origin) {
  if(!env.DB) return error(503,'store_unavailable');
  if(request.method==='GET'){
    const result=await env.DB.prepare('SELECT '+storyColumns+' FROM stories ORDER BY created_at DESC, id DESC LIMIT 100').all();
    return api({stories:result.results.map(storyRecord)});
  }
  if(request.method!=='POST') return error(405,'error');
  if(request.headers.get('origin')!==origin) return error(403,'error');
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return error(415,'invalid_fields');
  const author=request.headers.get('oai-authenticated-user-id');
  if(!author) return error(401,'login_required');
  const checked=validateStory(await readLimited(request));
  if(checked.error) return error(400,checked.error);
  const value=checked.value;
  const row={...value,id:crypto.randomUUID(),sources:JSON.stringify(value.sources)};
  const now=Date.now();
  const created=await env.DB.prepare(
    'INSERT INTO stories ('+storyColumns+', author, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT count(*) FROM stories WHERE author = ? AND created_at > ?) < 5'
  ).bind(row.id,row.destination,row.type,row.category,row.language,row.title,row.hardware,row.body,row.sources,author,now,author,now-thirtyMinutes).run();
  if(!created.meta.changes) return error(429,'rate_limit');
  return api({story:storyRecord(row)},201);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(url.pathname==='/api/stories'){
      try{return await stories(request,env,url.origin);}
      catch(errorDetail){console.error('Story storage request failed',errorDetail.message);return error(503,'store_unavailable');}
    }
    const asset=assets[url.pathname==='/'?'index.html':url.pathname.slice(1)];
    if(!asset||!Object.hasOwn(assets,url.pathname==='/'?'index.html':url.pathname.slice(1)))
      return new Response('Not found',{status:404,headers:requestHeaders});
    if(request.method!=='GET'&&request.method!=='HEAD')
      return new Response('Method not allowed',{status:405,headers:{...requestHeaders,Allow:'GET, HEAD'}});
    return new Response(request.method==='HEAD'?null:asset.content,{headers:{...requestHeaders,'Content-Type':asset.mime,'Cache-Control':'no-cache'}});
  }
};
