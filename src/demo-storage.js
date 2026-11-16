// Used only by the standalone HTML. Files and metadata share one IndexedDB transaction.
let demoDB;
function openDemoDB() {
  return demoDB ??= new Promise((resolve,reject)=>{
    const pending = indexedDB.open('echoes-atlas-v3',1);
    pending.onupgradeneeded = ()=>pending.result.createObjectStore('contributions',{keyPath:'story.id'});
    pending.onsuccess = ()=>resolve(pending.result);
    pending.onerror = ()=>reject(pending.error);
    pending.onblocked = ()=>reject(new Error('Database is busy'));
  });
}

function demoTransaction(db,mode,operate) {
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('contributions',mode);
    let result;
    tx.oncomplete = ()=>resolve(result);
    tx.onabort = ()=>reject(tx.error);
    tx.onerror = ()=>reject(tx.error);
    operate(tx.objectStore('contributions'),value=>{result=value;});
  });
}

async function demoRequest(path,options={}) {
  const db = await openDemoDB();
  if (path.startsWith('/api/documents/')) {
    const id = path.split('/').pop();
    const found = await demoTransaction(db,'readonly',(store,finish)=>{
      const pending=store.get(id);
      pending.onsuccess=()=>finish(pending.result);
    });
    return found ? new Response(found.file) : new Response(null,{status:404});
  }
  if (options.method!=='POST') {
    const records = await demoTransaction(db,'readonly',(store,finish)=>{
      const pending=store.getAll();
      pending.onsuccess=()=>finish(pending.result);
    });
    const legacy = storage.get('echoes-demo-stories',[]);
    const oldStories = Array.isArray(legacy) ? legacy.filter(s=>s&&validId(s.id)&&worlds.some(w=>w.id===s.destination)).map(story=>({...story,mine:true})) : [];
    return Response.json({stories:[...records.sort((a,b)=>b.created-a.created).map(record=>record.story),...oldStories],next:null});
  }

  const form = options.body;
  const metadata = fromMultipart(form);
  if (metadata.error) return Response.json(metadata,{status:400});
  const file = form.get('document');
  const checked = await inspectDocument(file);
  if (checked.error) return Response.json(checked,{status:400});
  const cover = form.get('cover');
  const coverInfo = await inspectCover(cover);
  if (coverInfo.error) return Response.json(coverInfo,{status:400});
  const coverData = coverInfo.value ? await new Promise((resolve,reject)=>{
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(new Blob([cover],{type:coverInfo.value}));
  }) : null;
  const value = metadata.value;
  const result = await demoTransaction(db,'readwrite',(store,finish)=>{
    const pending=store.getAll();
    pending.onsuccess=()=>{
      const records=pending.result;
      const root=value.seriesId&&records.find(record=>record.story.id===value.seriesId&&record.story.seriesId===value.seriesId);
      if (value.seriesId&&!root) { finish({error:'invalid_series'}); return; }
      const id=crypto.randomUUID?.()||[...crypto.getRandomValues(new Uint8Array(16))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
      const seriesId=value.seriesId||(value.seriesName?id:null);
      const seriesName=root?.story.seriesName||value.seriesName||null;
      const lastPart=records.reduce((max,record)=>record.story.seriesId===seriesId?Math.max(max,record.story.part):max,0);
      const story={...value,id,seriesId,seriesName,part:seriesId?lastPart+1:null,document:checked.value,coverData,community:true,mine:true,sources:value.sources.map(url=>({url}))};
      store.add({story,file,created:Date.now()});
      finish({story});
    };
  });
  return Response.json(result,{status:result.error?400:201});
}
