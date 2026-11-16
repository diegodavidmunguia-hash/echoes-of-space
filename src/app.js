import {words,worlds,types,categories,starter} from './data.js';
import {paintPlanet,paintStars} from './sky.js';
import {validateStory,officialUrl} from './validation.js';

const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const worldFor=id=>worlds.find(world=>world.id===id);
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const titleCase=s=>s.slice(0,1).toUpperCase()+s.slice(1);
const read=$('#reader'), write=$('#writer'), form=$('#storyForm');
let lang='en';
try {lang=localStorage.getItem('echoes-language')==='es'?'es':'en'} catch {}
let destination='deep', selectedStory='pioneer-10', filter='all', reading=null, community=[], loadIssue=false, saving=false, formMessage='';
const tr=key=>words[lang][key]??key;
const local=value=>typeof value==='string'?value:value?.[lang]??'';
const stories=()=>[...starter,...community];
const inDestination=()=>stories().filter(story=>story.destination===destination);
const current=()=>inDestination().find(story=>story.id===selectedStory)??inDestination()[0];
const worldLabel=world=>world[lang];
const number=id=>String(worlds.findIndex(w=>w.id===id)+1).padStart(2,'0');
const markerFor=story=>story?.marker??({satellite:'orbit',rover:'surface',telescope:'orbit',spacecraft:'flyby'}[story?.type]);
const closeButton=(id)=>'<button class="close" data-close="'+id+'" aria-label="'+tr('close')+'">×</button>';

function markerHTML(marker) {
  return marker?'<span class="equipment-layer '+marker+'-equipment" aria-hidden="true"><i class="equipment-dot"></i></span>':'';
}
function visual(world,marker,card=false) {
  const inner=world.id==='deep'
    ? '<i class="comet"></i><i class="deep-center"></i>'
    : '<canvas data-planet="'+world.id+'"></canvas>'+(world.id==='saturn'?'<i class="ring"></i>':'');
  return '<span class="'+(card?'mission-world':'planet')+' '+world.id+'" aria-hidden="true">'+inner+markerHTML(marker)+'</span>';
}
function paintAround(container) {
  container.querySelectorAll('[data-planet]').forEach(canvas=>paintPlanet(canvas,canvas.dataset.planet));
}
function renderSky() {
  $('#destinations').innerHTML=worlds.map(w=>{
    const picked=w.id===destination;
    const localStories=stories().filter(s=>s.destination===w.id);
    const first=picked?current():localStories[0];
    const globe=visual(w,markerFor(first));
    const moon=w.id==='earth'&&first?.id==='apollo-15'
      ? '<span class="moon-marker" aria-hidden="true"><canvas data-planet="moon"></canvas><i></i></span>':'';
    return '<button type="button" class="world '+(picked?'selected':'')+'" aria-pressed="'+picked+'" data-dest="'+w.id+'" style="--x:'+w.x+'%;--y:'+w.y+'%;--size:'+w.size+'px;--glow:'+w.color+'5c">'+(moon?globe.replace(markerHTML('surface'),''):globe)+moon+'<span class="world-label">'+worldLabel(w)+'</span></button>';
  }).join('');
  paintAround($('#destinations'));
  $('#destBar').innerHTML=worlds.map(w=>'<button type="button" aria-pressed="'+(w.id===destination)+'" data-dest="'+w.id+'"><span class="index" aria-hidden="true">'+number(w.id)+'</span>'+worldLabel(w)+'</button>').join('');
}
function baseRenderMission() {
  const w=worldFor(destination), story=current(), list=inDestination();
  const sub=story?tr(story.category)+' <span>·</span> '+tr(story.type):tr('draft');
  const title=story?local(story.title):worldLabel(w);
  const desc=story?(local(story.blurb)||local(story.body).slice(0,115)+(local(story.body).length>115?'…':'')):tr('noStory');
  const act=story?'data-read="'+story.id+'"':'data-write';
  const idx=list.findIndex(s=>s.id===story?.id);
  const more=list.length>1?'<div class="story-switch"><span>'+tr('storyAt')+' · '+(idx+1)+'/'+list.length+'</span><button type="button" class="step" data-cycle-story="-1" aria-label="'+tr('prevStory')+'">‹</button><button type="button" class="step" data-cycle-story="1" aria-label="'+tr('nextStory')+'">›</button></div>':'';
  const display=w.id==='earth'&&story?.id==='apollo-15'?{...w,id:'moon'}:w;
  $('#mission').innerHTML='<div class="mission-top" style="--tint:'+w.color+'3c;--glow:'+w.color+'72"><div class="mission-orbits"></div><span class="mission-index">'+tr('zone')+' / '+number(destination)+'</span><span class="mission-stamp"><i class="dot"></i>'+worldLabel(w)+'</span>'+visual(display,markerFor(story),true)+'</div>'
    +'<div class="mission-body"><div class="mission-meta">'+sub+'</div><h2>'+escapeHTML(title)+'</h2>'
    +(story?'<p class="hardware">'+escapeHTML(story.hardware)+'</p>':'')+'<p class="mission-description">'+escapeHTML(desc)+'</p><button type="button" class="primary mission-button" '+act+'><span>'+tr(story?'read':'startStory')+'</span><span aria-hidden="true">↗</span></button>'
    +more+'<div class="mission-switch"><button type="button" class="step" data-cycle="-1" aria-label="'+tr('prev')+'">←</button><span>'+number(destination)+' / 0'+worlds.length+'</span><button type="button" class="step" data-cycle="1" aria-label="'+tr('next')+'">→</button></div></div>';
  paintAround($('#mission'));
}
function baseRenderArchive() {
  $('#filters').setAttribute('aria-label',tr('filterLabel'));
  $('#filters').innerHTML=['all',...categories].map(key=>'<button type="button" data-filter="'+key+'" aria-pressed="'+(filter===key)+'">'+tr(key)+'</button>').join('');
  const entries=stories().filter(story=>filter==='all'||story.category===filter);
  $('#storyList').innerHTML=entries.map(story=>{
    const w=worldFor(story.destination);
    return '<button type="button" class="story-card" data-read="'+story.id+'"><span class="story-icon" aria-hidden="true" style="--world-color:'+w.color+'"></span><span><span class="story-title">'+escapeHTML(local(story.title))+'</span><span class="story-meta">'+worldLabel(w)+' · '+tr(story.category)+'</span></span><span class="arrow" aria-hidden="true">↗</span></button>';
  }).join('');
  $('#archiveStatus').textContent=loadIssue?tr('loadIssue'):entries.length?'':tr('empty');
}
function baseRenderReader(story) {
  const w=worldFor(story.destination);
  const section=(title,p)=>'<section class="reader-section"><h3>'+tr(title)+'</h3><p>'+escapeHTML(p)+'</p></section>';
  const links=story.sources.filter(s=>officialUrl(s.url));
  const storyLang=story.language||lang;
  const linkList=links.length?'<section class="reader-section"><h3>'+tr('sourceTitle')+'</h3><ul>'+links.map(s=>'<li><a href="'+escapeHTML(s.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHTML(s.label||s.url)+' ↗</a></li>').join('')+'</ul></section>':'';
  $('#readContent').innerHTML=closeButton('reader')+'<div class="mission-meta read-meta">'+worldLabel(w)+' · '+tr(story.category)+' · '+tr(story.type)+'</div><h2 id="readTitle" lang="'+storyLang+'">'+escapeHTML(local(story.title))+'</h2><p class="hardware" lang="'+storyLang+'">'+escapeHTML(story.hardware)+'</p>'
    +(story.community?'<p class="original-language">'+tr('community')+' · '+tr(storyLang==='en'?'english':'spanish')+'</p>':'')
    +'<p class="story-text" lang="'+storyLang+'">'+escapeHTML(local(story.body))+'</p>'
    +(story.science?section('history',local(story.science)):'')+(story.status?section('state',local(story.status)):'')+(story.category==='fiction'?section('fictionTitle',tr('fictionNote')):'')+linkList;
}
function setOptions(selector,entries) {
  const select=$(selector), old=select.value;
  select.replaceChildren(new Option(tr('choose'),'',true,false),...entries.map(([key,label])=>new Option(label,key)));
  select.options[0].disabled=true;
  select.value=entries.some(([key])=>key===old)?old:'';
}
function renderForm() {
  setOptions('#formDest',worlds.map(w=>[w.id,worldLabel(w)]));
  setOptions('#formType',types.map(key=>[key,tr(key)]));
  setOptions('#formCategory',categories.map(key=>[key,tr(key)]));
  setOptions('#formLanguage',[['en',tr('english')],['es',tr('spanish')]]);
  const close=$('#writer .close');
  close.setAttribute('aria-label',tr('close'));
  syncSources();
  showStatus(formMessage);
}
function addSource(value='',focus=false) {
  const row=document.createElement('div');
  row.className='source-row';
  row.innerHTML='<input name="source" type="url" maxlength="500" placeholder="https://science.nasa.gov/…" autocomplete="off"><button type="button" data-remove-source aria-label="'+tr('remove')+'">×</button>';
  row.querySelector('input').value=value;
  $('#sourceRows').append(row);
  syncSources();
  if(focus) row.querySelector('input').focus();
}
function syncSources() {
  const isNasa=$('#formCategory').value==='nasa';
  const rows=$$('.source-row');
  if(isNasa&&!rows.length){addSource();return;}
  $('#sourceBlock').hidden=!isNasa;
  $('#fictionHelp').hidden=$('#formCategory').value!=='fiction';
  $('#addSource').disabled=rows.length>=5;
  rows.forEach((row,index)=>{
    const input=row.querySelector('input'),remove=row.querySelector('button');
    input.disabled=!isNasa;
    input.required=isNasa&&index===0;
    input.setAttribute('aria-label',tr('sourceInput')+' '+(index+1));
    remove.setAttribute('aria-label',tr('remove'));
    remove.hidden=rows.length===1;
  });
}
function showStatus(code) {
  formMessage=code;
  const status=$('#formStatus');
  status.textContent=code?tr(code):'';
  status.classList.toggle('ok',['publishing','published'].includes(code));
  if(code==='login_required') {
    const link=document.createElement('a');
    link.href='/signin?return_to=%2F';
    link.target='_top';
    link.textContent=' '+tr('signIn');
    status.append(link);
  }
}
function baseUpdateLanguage() {
  document.documentElement.lang=lang;
  $$('[data-t]').forEach(e=>{e.textContent=tr(e.dataset.t)});
  $('#chart').setAttribute('aria-label',tr('mapLabel'));
  $('#destBar').setAttribute('aria-label',tr('destNav'));
  $('.top nav').setAttribute('aria-label',tr('navLabel'));
  if(matchMedia('(pointer:coarse)').matches) $('[data-t="mapHint"]').textContent=tr('touchHint');
  const language=$('#language');
  language.innerHTML='<span'+(lang==='en'?' class="current"':'')+'>EN</span><span class="slash">/</span><span'+(lang==='es'?' class="current"':'')+'>ES</span>';
  language.setAttribute('aria-label',lang==='en'?'Cambiar a español':'Switch to English');
  renderSky();renderMission();renderArchive();renderForm();
  if(reading) renderReader(reading);
}
function selectDestination(id,focus) {
  if(!worldFor(id)) return;
  if(destination!==id) selectedStory=null;
  destination=id;
  renderSky();renderMission();
  if(focus) requestAnimationFrame(()=>$(focus)?.focus({preventScroll:true}));
}
function baseOpenReader(story) {
  if(!story) return;
  reading=story;
  renderReader(story);
  read.showModal();
}
function baseOpenWriter(fromMap) {
  if(fromMap&&!form.elements.destination.value) form.elements.destination.value=destination;
  write.showModal();
}
read.addEventListener('close',()=>{reading=null});
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button) return;
  const {dest,cycle,cycleStory,read:storyId,filter:category,close}=button.dataset;
  if(dest){
    const zone=button.closest('#destBar')?'#destBar':'#destinations';
    selectDestination(dest,zone+' [data-dest="'+dest+'"]');
  }
  if(cycle){
    const n=worlds.length;
    const next=worlds[(worlds.findIndex(w=>w.id===destination)+Number(cycle)+n)%n].id;
    selectDestination(next,'[data-cycle="'+cycle+'"]');
  }
  if(cycleStory){
    const list=inDestination(),idx=list.findIndex(s=>s.id===current()?.id);
    selectedStory=list[(idx+Number(cycleStory)+list.length)%list.length].id;
    renderSky();renderMission();
    $('[data-cycle-story="'+cycleStory+'"]').focus({preventScroll:true});
  }
  if(storyId) openReader(stories().find(s=>s.id===storyId));
  if('write' in button.dataset) openWriter(button.closest('#mission'));
  if(category){
    filter=category;
    renderArchive();
    $('[data-filter="'+filter+'"]').focus({preventScroll:true});
  }
  if(close) document.getElementById(close).close();
  if('removeSource' in button.dataset) {button.closest('.source-row').remove();syncSources();}
});
$('#language').addEventListener('click',()=>{
  lang=lang==='en'?'es':'en';
  try{localStorage.setItem('echoes-language',lang)}catch{}
  updateLanguage();
});
$('#formCategory').addEventListener('change',syncSources);
$('#addSource').addEventListener('click',()=>addSource('',true));

form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(saving)return;
  const fields=new FormData(form);
  const data=Object.fromEntries(fields);
  data.sources=fields.getAll('source').map(link=>link.trim()).filter(Boolean);
  delete data.source;
  const validated=validateStory(data);
  if(validated.error){showStatus(validated.error);return;}
  saving=true;
  $('#sendStory').disabled=true;
  showStatus('publishing');
  try{
    const response=await fetch('/api/stories',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(validated.value)});
    const payload=await response.json();
    if(!response.ok){showStatus(payload.error||'error');return;}
    community=[payload.story,...community.filter(s=>s.id!==payload.story.id)];
    filter='all';
    archiveDestination='all'; archiveType='all'; query=''; $('#storySearch').value='';
    safeStore('echoes-draft-v2',null); $('#draftState').textContent=tr('draftCleared');
    loadIssue=false;
    form.reset();
    $('#sourceRows').replaceChildren();
    syncSources();
    showStatus('published');
    selectDestination(payload.story.destination);
    selectedStory=payload.story.id; renderSky();renderMission();
    setStep(0); updateDraftMeta();
    renderArchive();
  }catch{showStatus('error')}
  finally{saving=false;$('#sendStory').disabled=false}
});

const chart=$('#chart'),field=$('#chartField');
chart.addEventListener('pointermove',event=>{
  if(document.body.classList.contains('motion-paused')||event.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  const box=chart.getBoundingClientRect();
  field.style.setProperty('--mx',((event.clientX-box.left)/box.width-.5)*29+'px');
  field.style.setProperty('--my',((event.clientY-box.top)/box.height-.5)*19+'px');
});
chart.addEventListener('pointerleave',()=>{
  field.style.removeProperty('--mx');
  field.style.removeProperty('--my');
});
// Experience layer: all personal progress and drafts stay on this device.
Object.assign(words.en, {
 localDemo:'Interactive demo · contributions are saved only in this browser', passport:'YOUR EXPLORER PASSPORT', opened:'stories opened', visited:'destinations visited', nextUnread:'Discover an unread story', allVisited:'Revisit a favorite', searchLabel:'Search the archive', searchPlaceholder:'Try Pioneer, Mars, ice…', allDestinations:'Every destination', allTypes:'Every hardware type', savedOnly:'Saved stories', results:'stories found', noResults:'No signals found.', noResultsHelp:'Try a different search or clear your filters.', clearFilters:'Clear filters', bookmark:'Save for later', bookmarked:'Saved for later', minuteRead:'min read', taleTab:'The story', scienceTab:'Behind the mission', linkedNote:'Inspired by a real mission. The narrative may include imagined events. NASA links are references, not an endorsement or a fact-check of this story.', communityNote:'These links were provided by the author. The story has not been independently reviewed.', noScience:'This community story includes references below. Open the original sources to compare the story with the mission record.', originalNote:'An imaginary mission. No NASA sources are claimed.', schematic:'Illustrative map · sizes, distances and paths are not to scale', historic:'Markers illustrate mission paths, not live positions.', orbitLegend:'Orbital path', surfaceLegend:'Surface exploration', flybyLegend:'Spacecraft route', pauseMotion:'Pause motion', resumeMotion:'Resume motion', invitationEyebrow:'THE NEXT SIGNAL COULD BE YOURS', invitationTitle:'Give a silent machine a voice.', invitationText:'Follow a real mission or invent your own. Every story has a place in this sky.', independent:'Independent student project · Not a NASA website', stepPlace:'01 · Place your story', stepWrite:'02 · Write & cite', stepReview:'03 · Review your story', back:'Back', continue:'Continue', preview:'Review story', draftSaved:'Draft saved on this device.', draftRestored:'Your unfinished draft has been restored.', draftCleared:'Your submitted draft has been cleared.', draftFailed:'Draft could not be saved on this device. Download a copy to keep your writing.', exportDraft:'Download draft', characters:'characters', wordCount:'words', promptNasa:'Imagine the moment this machine made a discovery. What did its instruments actually find? Let your sources anchor the science and your imagination tell the story.', promptFiction:'Give your machine a wish, an obstacle and a discovery. What would it tell someone looking up from Earth?', promptChoose:'Choose a category to see a writing prompt.', sourceReminder:'Check that each source supports the mission or discovery you describe. A valid NASA address alone does not verify your story.', previewNotice:'This is how your contribution will appear. Your original language is preserved.', readingSize:'Larger reading text', normalSize:'Standard reading text', nextStoryAction:'Read another story', related:'CONTINUE THE JOURNEY', statusLabel:'MISSION RECORD', progressLocal:'Progress is stored on this device.', nasa:'NASA-inspired', fiction:'Original fiction', reflect:'Imagine your next chapter', reflection:'If this machine could send one more message home, what would it say?', writeInspired:'Write your own story', markedOpened:'Opened', sourceTitle:'Explore the original NASA sources'
});
Object.assign(words.es, {
 localDemo:'Demo interactiva · los aportes se guardan solo en este navegador', passport:'TU PASAPORTE DE EXPLORACIÓN', opened:'relatos abiertos', visited:'destinos visitados', nextUnread:'Descubrir un relato nuevo', allVisited:'Volver a un favorito', searchLabel:'Buscar en el archivo', searchPlaceholder:'Prueba Pioneer, Marte, hielo…', allDestinations:'Todos los destinos', allTypes:'Todos los equipos', savedOnly:'Relatos guardados', results:'relatos encontrados', noResults:'No encontramos señales.', noResultsHelp:'Prueba otra búsqueda o limpia los filtros.', clearFilters:'Limpiar filtros', bookmark:'Guardar para después', bookmarked:'Guardado para después', minuteRead:'min de lectura', taleTab:'El relato', scienceTab:'Detrás de la misión', linkedNote:'Inspirado en una misión real. La narración puede incluir sucesos imaginarios. Los enlaces de la NASA son referencias, no un respaldo ni una verificación del relato.', communityNote:'El autor aportó estos enlaces. El relato no ha sido revisado de forma independiente.', noScience:'Este aporte incluye las referencias de abajo. Abre las fuentes originales para contrastar el relato con los datos de la misión.', originalNote:'Una misión imaginaria. No se atribuyen fuentes de la NASA.', schematic:'Mapa ilustrativo · tamaños, distancias y recorridos no están a escala', historic:'Los marcadores ilustran recorridos de misiones, no posiciones en vivo.', orbitLegend:'Recorrido orbital', surfaceLegend:'Exploración de superficie', flybyLegend:'Trayecto de una nave', pauseMotion:'Pausar movimiento', resumeMotion:'Reanudar movimiento', invitationEyebrow:'LA PRÓXIMA SEÑAL PODRÍA SER TUYA', invitationTitle:'Dale voz a una máquina silenciosa.', invitationText:'Sigue una misión real o inventa la tuya. Cada relato tiene un lugar en este cielo.', independent:'Proyecto estudiantil independiente · No es un sitio de la NASA', stepPlace:'01 · Ubica tu relato', stepWrite:'02 · Escribe y cita', stepReview:'03 · Revisa tu relato', back:'Volver', continue:'Continuar', preview:'Revisar relato', draftSaved:'Borrador guardado en este dispositivo.', draftRestored:'Recuperamos tu borrador pendiente.', draftCleared:'Se limpió el borrador que ya enviaste.', draftFailed:'No se pudo guardar el borrador en este dispositivo. Descarga una copia para conservarlo.', exportDraft:'Descargar borrador', characters:'caracteres', wordCount:'palabras', promptNasa:'Imagina el momento en que esta máquina descubrió algo. ¿Qué encontraron sus instrumentos? Usa las fuentes para fundamentar la ciencia y tu imaginación para contar la historia.', promptFiction:'Dale a tu máquina un deseo, un obstáculo y un descubrimiento. ¿Qué le contaría a alguien que mira el cielo desde la Tierra?', promptChoose:'Elige una categoría para ver una idea de escritura.', sourceReminder:'Comprueba que cada fuente respalde la misión o el descubrimiento que describes. Una dirección válida de la NASA no verifica por sí sola el relato.', previewNotice:'Así se verá tu aporte. Se conserva el idioma original de tu relato.', readingSize:'Ampliar texto', normalSize:'Tamaño normal', nextStoryAction:'Leer otro relato', related:'CONTINÚA EL VIAJE', statusLabel:'REGISTRO DE LA MISIÓN', progressLocal:'El progreso se guarda en este dispositivo.', nasa:'Con fuentes de la NASA', fiction:'Ficción original', reflect:'Imagina el siguiente capítulo', reflection:'Si esta máquina pudiera enviar un último mensaje a casa, ¿qué diría?', writeInspired:'Escribe tu propio relato', markedOpened:'Abierto', sourceTitle:'Explora las fuentes originales de la NASA'
});
const savedJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const safeStore=(key,value)=>{try{value===null?localStorage.removeItem(key):localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
const asSet=key=>{const v=savedJSON(key,[]);return new Set(Array.isArray(v)?v.filter(x=>typeof x==='string'):[])};
let bookmarks=asSet('echoes-bookmarks-v2'), opened=asSet('echoes-opened-v2');
let query='',archiveDestination='all',archiveType='all',savedOnly=false,readerTab='tale',largeText=false,editorStep=0;
const fold=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const readMinutes=s=>Math.max(1,Math.ceil(local(s.body).trim().split(/\s+/).length/180));
const missionEra={messenger:['2004 — 2015','Mercury · surface impact','Mercurio · impacto en superficie'],magellan:['1989 — 1994','Venus · atmospheric entry','Venus · entrada atmosférica'],'apollo-15':['1971','Moon · rover left behind','Luna · rover en superficie'],hubble:['Launched 1990','Earth orbit · telescope','Órbita terrestre · telescopio'],opportunity:['2003 — 2018','Mars · silent rover','Marte · rover sin comunicación'],galileo:['1989 — 2003','Jupiter · atmospheric entry','Júpiter · entrada atmosférica'],cassini:['1997 — 2017','Saturn · atmospheric entry','Saturno · entrada atmosférica'],'voyager-uranus':['1986 · flyby','Later continued into interstellar space','Después continuó al espacio interestelar'],'voyager-neptune':['1989 · flyby','Later continued into interstellar space','Después continuó al espacio interestelar'],'pioneer-10':['1972 — 2003 · signals','Outbound · no radio contact','Viaje de salida · sin contacto por radio']};
function eraLabel(s){const m=missionEra[s.id];if(!m)return '';return lang==='es'?m[0].replace('Launched','Lanzado en').replace('flyby','sobrevuelo').replace('signals','señales'):m[0]}
function renderMission(){
 baseRenderMission();const s=current();
 if(s&&missionEra[s.id]){const m=missionEra[s.id];$('#mission .mission-body').insertAdjacentHTML('afterbegin','<div class="mission-era"><span>'+eraLabel(s)+'</span><span>'+m[lang==='en'?1:2]+'</span></div>')}
}
function renderArchive(){
 $('#filters').setAttribute('aria-label',tr('filterLabel'));
 $('#filters').innerHTML=['all',...categories].map(k=>'<button type="button" data-filter="'+k+'" aria-pressed="'+(filter===k)+'">'+tr(k)+'</button>').join('');
 const entries=stories().filter(s=>(filter==='all'||s.category===filter)&&(archiveDestination==='all'||s.destination===archiveDestination)&&(archiveType==='all'||s.type===archiveType)&&(!savedOnly||bookmarks.has(s.id))&&(!query||fold([local(s.title),s.hardware,local(s.body),worldLabel(worldFor(s.destination))].join(' ')).includes(fold(query))));
 $('#storyList').innerHTML=entries.length?entries.map(s=>{const w=worldFor(s.destination);return '<button type="button" class="story-card rich-card" data-read="'+escapeHTML(s.id)+'" style="--world-color:'+w.color+'"><span class="card-art" aria-hidden="true">'+visual(w,markerFor(s),true)+'<span class="card-coordinate">'+number(w.id)+' / '+worldLabel(w)+'</span><span class="card-read">'+(opened.has(s.id)?'✓':'↗')+'</span></span><span class="card-copy"><span class="category-badge '+s.category+'">'+tr(s.category)+'</span><span class="story-title">'+escapeHTML(local(s.title))+'</span><span class="card-blurb">'+escapeHTML(local(s.blurb)||local(s.body).slice(0,100)+'…')+'</span><span class="card-bottom"><span>'+escapeHTML(s.hardware)+'</span><span>'+readMinutes(s)+' '+tr('minuteRead')+'</span></span></span></button>'}).join(''):'<div class="empty-state"><span aria-hidden="true">✦</span><h3>'+tr('noResults')+'</h3><p>'+tr('noResultsHelp')+'</p><button class="secondary" data-clear-filters>'+tr('clearFilters')+'</button></div>';
 paintAround($('#storyList'));$('#resultCount').textContent=entries.length+' '+tr('results');
 $('#archiveStatus').textContent=loadIssue?tr('loadIssue'):'';
 $('#savedOnly').setAttribute('aria-pressed',String(savedOnly));renderPassport();
}
function renderPassport(){
 const known=stories().filter(s=>opened.has(s.id)),visits=new Set(known.map(s=>s.destination));
 $('#journeyProgress').textContent=known.length+' / '+stories().length+' '+tr('opened')+' · '+visits.size+' / 9 '+tr('visited');
 $('#passportStamps').innerHTML=worlds.map(w=>'<button type="button" data-dest="'+w.id+'" class="passport-stamp '+(visits.has(w.id)?'visited':'')+'" title="'+worldLabel(w)+'" aria-label="'+worldLabel(w)+(visits.has(w.id)?' ✓':'')+'"><span style="--world-color:'+w.color+'"></span></button>').join('');
 $('#nextUnread').textContent=tr(known.length===stories().length?'allVisited':'nextUnread');
}
function renderReader(s){
 const w=worldFor(s.destination),storyLang=s.language||lang,links=(s.sources||[]).filter(x=>officialUrl(x.url));
 const m=missionEra[s.id];
 const science='<div class="science-layout">'+(m?'<div class="record"><span class="eyebrow">'+tr('statusLabel')+'</span><strong>'+escapeHTML(s.hardware)+'</strong><span>'+eraLabel(s)+'</span><p>'+m[lang==='en'?1:2]+'</p></div>':'')+'<section class="reader-section"><h3>'+tr('history')+'</h3><p>'+escapeHTML(s.science?local(s.science):tr(s.category==='fiction'?'originalNote':'noScience'))+'</p></section>'+(s.status?'<section class="reader-section"><h3>'+tr('state')+'</h3><p>'+escapeHTML(local(s.status))+'</p></section>':'')+(s.id==='pioneer-10'?'<section class="reader-section"><h3>'+(lang==='en'?'Where imagination begins':'Donde empieza la imaginación')+'</h3><p>'+(lang==='en'?'Aldebaran has not welcomed or recharged Pioneer 10. The encounter is fictional. NASA estimates a journey of roughly two million years toward the star.':'Aldebarán no ha recibido ni recargado a Pioneer 10. Ese encuentro es ficticio. La NASA estima un viaje de aproximadamente dos millones de años hacia la estrella.')+'</p></section>':'')+(links.length?'<section class="reader-section sources-section"><h3>'+tr('sourceTitle')+'</h3>'+links.map((x,i)=>'<a href="'+escapeHTML(x.url)+'" target="_blank" rel="noopener noreferrer"><span class="source-number">0'+(i+1)+'</span><span>'+escapeHTML(x.label||new URL(x.url).hostname)+'<small>'+escapeHTML(new URL(x.url).pathname)+'</small></span><span>↗</span></a>').join('')+'</section>':'')+'</div>';
 $('#readContent').innerHTML=closeButton('reader')+'<div class="reader-hero" style="--world-color:'+w.color+'">'+visual(w,markerFor(s),true)+'<span class="eyebrow">'+worldLabel(w)+' / '+tr(s.type)+'</span></div><div class="reader-inner"><div class="mission-meta read-meta">'+tr(s.category)+' · '+readMinutes(s)+' '+tr('minuteRead')+'</div><h2 id="readTitle" lang="'+storyLang+'">'+escapeHTML(local(s.title))+'</h2><p class="hardware">'+escapeHTML(s.hardware)+'</p><div class="reader-actions"><button class="secondary" data-bookmark="'+escapeHTML(s.id)+'" aria-pressed="'+bookmarks.has(s.id)+'">'+(bookmarks.has(s.id)?'✓ ':'+ ')+tr(bookmarks.has(s.id)?'bookmarked':'bookmark')+'</button><button class="text-button" data-text-size>'+tr(largeText?'normalSize':'readingSize')+'</button></div>'+(s.community?'<p class="original-language">'+tr('community')+' · '+tr(storyLang==='en'?'english':'spanish')+'</p>':'')+'<div class="reader-tabs" role="tablist"><button role="tab" id="taleTab" aria-controls="talePanel" aria-selected="'+(readerTab==='tale')+'" tabindex="'+(readerTab==='tale'?0:-1)+'" data-reader-tab="tale">'+tr('taleTab')+'</button><button role="tab" id="scienceTab" aria-controls="sciencePanel" aria-selected="'+(readerTab==='science')+'" tabindex="'+(readerTab==='science'?0:-1)+'" data-reader-tab="science">'+tr('scienceTab')+'</button></div><div class="story-disclosure">'+tr(s.category==='fiction'?'originalNote':'linkedNote')+(s.community&&s.category==='nasa'?' '+tr('communityNote'):'')+'</div><section id="talePanel" role="tabpanel" aria-labelledby="taleTab" '+(readerTab!=='tale'?'hidden':'')+'><div class="story-text '+(largeText?'large':'')+'" lang="'+storyLang+'">'+escapeHTML(local(s.body))+'</div><div class="reflection"><span class="eyebrow">'+tr('reflect')+'</span><p>'+tr('reflection')+'</p><button type="button" class="text-button" data-inspired>'+tr('writeInspired')+' ↗</button></div></section><section id="sciencePanel" role="tabpanel" aria-labelledby="scienceTab" '+(readerTab!=='science'?'hidden':'')+'>'+science+'</section><div class="reader-next"><span class="eyebrow">'+tr('related')+'</span><button class="secondary" data-next-reading>'+tr('nextStoryAction')+' →</button></div></div>';
 paintAround($('#readContent'));
}
function openReader(s){if(!s)return;reading=s;readerTab='tale';opened.add(s.id);safeStore('echoes-opened-v2',[...opened]);renderReader(s);if(!read.open)read.showModal();read.scrollTop=0;renderPassport();renderArchive()}
function openWriter(fromMap){baseOpenWriter(fromMap);setStep(editorStep);updateDraftMeta()}
function updateLanguage(){
 baseUpdateLanguage();
 $('#storySearch').placeholder=tr('searchPlaceholder');
 const options=(id,list,value)=>{$(id).replaceChildren(...list.map(([v,t])=>new Option(t,v)));$(id).value=value};
 options('#archiveDestination',[['all',tr('allDestinations')],...worlds.map(w=>[w.id,worldLabel(w)])],archiveDestination);
 options('#archiveType',[['all',tr('allTypes')],...types.map(t=>[t,tr(t)])],archiveType);
 $('#motionToggle').textContent=tr(document.body.classList.contains('motion-paused')?'resumeMotion':'pauseMotion');
 renderPassport();updateDraftMeta();setStep(editorStep);
}
function formData(){const fields=new FormData(form),data=Object.fromEntries(fields);data.sources=fields.getAll('source').map(s=>s.trim()).filter(Boolean);delete data.source;return data}
function saveDraft(){const ok=safeStore('echoes-draft-v2',formData());$('#draftState').textContent=tr(ok?'draftSaved':'draftFailed');updateDraftMeta()}
function restoreDraft(){const d=savedJSON('echoes-draft-v2',null);if(!d||typeof d!=='object')return;for(const k of ['title','hardware','destination','type','category','language','body'])if(typeof d[k]==='string')form.elements[k].value=d[k];$('#sourceRows').replaceChildren();if(Array.isArray(d.sources))d.sources.slice(0,5).filter(s=>typeof s==='string').forEach(s=>addSource(s));syncSources();updateDraftMeta();$('#draftState').textContent=tr('draftRestored')}
function updateDraftMeta(){const body=form.elements.body.value;$('#wordCount').textContent=(body.trim()?body.trim().split(/\s+/).length:0)+' '+tr('wordCount');$('#charCount').textContent=body.length+' / 12,000 '+tr('characters');$('#writingPrompt').textContent=tr(form.elements.category.value==='nasa'?'promptNasa':form.elements.category.value==='fiction'?'promptFiction':'promptChoose')}
function validateStep(){
 const panel=$('[data-panel="'+editorStep+'"]');for(const el of panel.querySelectorAll('input,select,textarea'))if(!el.disabled&&!el.checkValidity()){el.reportValidity();return false}
 if(editorStep===0&&['title','hardware'].some(k=>!form.elements[k].value.trim())){showStatus('invalid_fields');return false}
 if(editorStep===1){const v=validateStory(formData());if(v.error){showStatus(v.error);return false}}
 showStatus('');return true;
}
function setStep(n){editorStep=n;$$('[data-panel]').forEach(el=>el.hidden=Number(el.dataset.panel)!==n);$$('[data-step]').forEach((el,i)=>{el.textContent=tr(['stepPlace','stepWrite','stepReview'][i]);el.setAttribute('aria-current',i===n?'step':'false')});$('#previousStep').hidden=n===0;$('#nextStep').hidden=n===2;$('#sendStory').hidden=n!==2;$('#nextStep').textContent=tr(n===1?'preview':'continue');if(n===2)renderPreview()}
function goStep(n){if(n>editorStep){while(editorStep<n){if(!validateStep())return;setStep(editorStep+1)}}else setStep(n);write.scrollTop=0;$('[data-panel="'+editorStep+'"] input, [data-panel="'+editorStep+'"] textarea')?.focus()}
function renderPreview(){const d=formData();$('#storyPreview').innerHTML='<p class="muted">'+tr('previewNotice')+'</p><span class="category-badge '+escapeHTML(d.category)+'">'+tr(d.category)+'</span><h3 lang="'+d.language+'">'+escapeHTML(d.title)+'</h3><p class="hardware">'+escapeHTML(d.hardware)+' · '+worldLabel(worldFor(d.destination))+' · '+tr(d.type)+'</p><div class="story-text" lang="'+d.language+'">'+escapeHTML(d.body)+'</div>'+(d.category==='nasa'?'<p class="muted">'+tr('sourceReminder')+'</p><ul>'+d.sources.map(s=>'<li><a href="'+escapeHTML(s)+'" target="_blank" rel="noopener noreferrer">'+escapeHTML(s)+'</a></li>').join('')+'</ul>':'')}
function clearFilters(){query='';archiveDestination='all';archiveType='all';filter='all';savedOnly=false;$('#storySearch').value='';updateLanguage()}
function setupEnhanced(){
 $('#chart').insertAdjacentHTML('afterend','<div class="map-tools"><p data-t="schematic"></p><div class="map-legend"><span><i class="legend-orbit"></i><span data-t="orbitLegend"></span></span><span><i class="legend-surface"></i><span data-t="surfaceLegend"></span></span><span><i class="legend-flyby"></i><span data-t="flybyLegend"></span></span><button class="text-button" id="motionToggle" aria-pressed="false"></button></div><p data-t="historic"></p></div>');
 if(savedJSON('echoes-motion-paused',false)===true){document.body.classList.add('motion-paused');$('#motionToggle').setAttribute('aria-pressed','true')}
 $('#storySearch').addEventListener('input',e=>{query=e.target.value;renderArchive()});$('#archiveDestination').addEventListener('change',e=>{archiveDestination=e.target.value;renderArchive()});$('#archiveType').addEventListener('change',e=>{archiveType=e.target.value;renderArchive()});$('#savedOnly').addEventListener('click',()=>{savedOnly=!savedOnly;renderArchive()});
 $('#nextUnread').addEventListener('click',()=>openReader(stories().find(s=>!opened.has(s.id))||starter[0]));
 $('#motionToggle').addEventListener('click',()=>{const paused=document.body.classList.toggle('motion-paused');safeStore('echoes-motion-paused',paused);$('#motionToggle').textContent=tr(paused?'resumeMotion':'pauseMotion');$('#motionToggle').setAttribute('aria-pressed',String(paused));field.style.removeProperty('--mx');field.style.removeProperty('--my')});
 $('#nextStep').addEventListener('click',()=>goStep(editorStep+1));$('#previousStep').addEventListener('click',()=>goStep(editorStep-1));
 form.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'&&e.target.tagName!=='BUTTON'&&editorStep<2){e.preventDefault();goStep(editorStep+1)}});
 form.addEventListener('submit',e=>{if(editorStep!==2){e.preventDefault();e.stopImmediatePropagation();goStep(2)}},true);
 form.addEventListener('input',saveDraft);form.addEventListener('change',saveDraft);
 $('#exportDraft').addEventListener('click',()=>{const d=formData();const blob=new Blob([d.title+'\n'+d.hardware+'\n'+[d.destination,d.type,d.category,d.language].join(' · ')+'\n\n'+d.body+'\n\n'+d.sources.join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Echoes_story_draft.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});
 document.addEventListener('keydown',e=>{if(e.target.matches('[data-reader-tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();readerTab=e.key==='Home'?'tale':e.key==='End'?'science':readerTab==='tale'?'science':'tale';renderReader(reading);$('[data-reader-tab="'+readerTab+'"]').focus()}});
 document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if('clearFilters' in b.dataset)clearFilters();
 if(b.dataset.bookmark){const id=b.dataset.bookmark;bookmarks.has(id)?bookmarks.delete(id):bookmarks.add(id);safeStore('echoes-bookmarks-v2',[...bookmarks]);renderReader(reading);renderArchive();$('[data-bookmark]').focus()}
 if(b.dataset.readerTab){readerTab=b.dataset.readerTab;renderReader(reading);$('[data-reader-tab="'+readerTab+'"]').focus()}
 if('textSize' in b.dataset){largeText=!largeText;renderReader(reading);$('[data-text-size]').focus()}
 if('nextReading' in b.dataset){const list=stories();openReader(list[(list.findIndex(s=>s.id===reading.id)+1)%list.length])}
 if('inspired' in b.dataset){const d=reading.destination;read.close();if(!form.elements.destination.value)form.elements.destination.value=d;openWriter(false)}
 if('step' in b.dataset)goStep(Number(b.dataset.step));
 if('removeSource' in b.dataset)saveDraft();
 });
 [read,write].forEach(dialog=>dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}}));
}

const starCanvas=$('#stars');
new ResizeObserver(()=>paintStars(starCanvas)).observe(starCanvas);
setupEnhanced();
updateLanguage();
restoreDraft();
try {
  const response=await fetch('/api/stories');
  if(!response.ok)throw new Error();
  const payload=await response.json();
  const live=new Map(payload.stories.map(story=>[story.id,story]));
  community.forEach(story=>live.set(story.id,story));
  community=[...live.values()];
  renderSky();renderMission();renderArchive();
} catch {loadIssue=true;renderArchive();}
