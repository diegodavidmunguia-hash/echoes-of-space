import {worlds,types,categories} from './data.js';
const languageKeys=['en','es'];
export function officialUrl(value) {
  if(typeof value!=='string'||value.length>500) return null;
  try {
    const url=new URL(value);
    const host=url.hostname;
    if(url.protocol!=='https:'||url.port||url.username||url.password) return null;
    return host==='nasa.gov'||host.endsWith('.nasa.gov')?url.href:null;
  } catch {return null;}
}
export function validateStory(data) {
  if(!data||typeof data!=='object'||Array.isArray(data)) return {error:'invalid_fields'};
  const {destination,type,category,language}=data;
  if(!worlds.some(w=>w.id===destination)||!types.includes(type)||!categories.includes(category)||!languageKeys.includes(language))
    return {error:'invalid_fields'};
  const value={destination,type,category,language};
  for(const [field,max] of [['title',100],['hardware',80],['body',12000]]) {
    const input=typeof data[field]==='string'?data[field].trim():'';
    if(!input||input.length>max) return {error:'invalid_fields'};
    value[field]=input;
  }
  if(!Array.isArray(data.sources)) return {error:'invalid_sources'};
  if(data.sources.length>5) return {error:'too_many'};
  if(category==='nasa'){
    const urls=data.sources.map(officialUrl);
    if(!urls.length||urls.some(url=>!url)) return {error:'invalid_sources'};
    value.sources=[...new Set(urls)];
  } else {
    if(data.sources.length) return {error:'invalid_sources'};
    value.sources=[];
  }
  return {value};
}
