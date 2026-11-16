import { words, worlds, types, categories } from './data.js';
import { paintStars } from './sky.js';
import { globe } from './globe.js';
import { atlasCopy } from './atlas-copy.js';
import { officialUrl } from './validation.js';
import { fromMultipart, inspectCover, inspectDocument, validId } from './submission.js';
import { createExplorerProgress } from './progress.js';
import { marsRovers, missions, planetScenes, plotOrbits } from './planet-scenes.js';
import { atlasPage, sharedStory } from './pages.js';

const $ = selector => document.querySelector(selector);
const reader = $('#reader');
const uploader = $('#uploader');
const form = $('#uploadForm');
const demoMode = typeof demoRequest === 'function';
const request = demoMode ? demoRequest : (...args) => fetch(...args);
const untextured = new Set(['deep']);
const textureURL = id => untextured.has(id) ? '' : demoMode ? demoTextures[id] : `/textures/${id}.jpg`;
const showLaunchGlobe = globe($('#launchPlanet'), textureURL);
const coverInput = $('#coverFile');
const reportDialog = $('#reportDialog');
const reportForm = $('#reportForm');
const moderationDialog = $('#moderationDialog');
const deleteDialog = $('#deleteDialog');
const deleteForm = $('#deleteForm');
let deletingStory;
const deletedInSession = new Set();
let moderator = false;
let reportingStory;
let moderationTab = 'pending';
let nextReportPage;
let moderationRequest = 0;
const coverPreview = $('#coverPreview');
let previewCoverURL;
let coverPreviewReady;
const storage = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }
};
const passport = createExplorerProgress({ request, storage, demoMode, validId, changed: () => {
  paintPassport();
  paintArchive();
  refreshReadButton();
} });
const state = {
  lang: (storage.get('echoes-atlas-language', null) ?? (/^es\b/i.test(navigator.language || '') ? 'es' : 'en')) === 'es' ? 'es' : 'en',
  selected: 2,
  mapSelection: null,
  missionRoute: false,
  entries: [],
  shelf: 'all',
  archiveLimit: 5,
  search: '',
  destination: '',
  type: '',
  category: '',
  rover: '',
  author: '',
  publishedId: null,
  active: null,
  readerReturnHash: '',
  readerTab: 'story',
  motion: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  loadError: false,
  voyagerPhase: ''
};
// Reader interaction (echoes, library, follows) for the signed-in account; comments load per story.
const social = { loaded: false, signedIn: false, handle: null, echoed: new Set(), saved: new Set(), following: new Set(),
  authors: new Map(), comments: { story: null, next: null } };

const t = key => atlasCopy[state.lang][key] ?? words[state.lang][key] ?? key;
const local = value => typeof value === 'string' ? value : value?.[state.lang] ?? '';
const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const normalize = value => String(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
const worldName = id => worlds.find(w => w.id === id)?.[state.lang] ?? id;
const collection = () => state.entries.filter(story => !story.hidden);
const find = id => state.entries.find(story => story.id === id);
const author = story => story.byline || (!story.community ? t('team') : '');
const chapter = story => `${t('seriesPart')} ${story.part}`;
const summary = story => [story.hardware, t(story.type), story.seriesId ? chapter(story) : ''].filter(Boolean).join(' · ');
const action = (id, label, style = 'outline') => `<button type="button" class="${style}" data-story="${escape(id)}">${escape(label)}</button>`;
const voyagerStops = [
  ["earth","1977-08-20","Despegó desde Cabo Cañaveral a bordo de un cohete Titan IIIE-Centaur.","Launched from Cape Canaveral aboard a Titan IIIE-Centaur."],
  ["jupiter","1979-07-09","Sobrevoló Júpiter y aprovechó su gravedad para dirigirse a Saturno.","Flew past Jupiter and used its gravity to head toward Saturn."],
  ["saturn","1981-08-26","Estudió los anillos y continuó hacia Urano.","Studied the rings and continued toward Uranus."],
  ["uranus","1986-01-24","Realizó el primer sobrevuelo de Urano y examinó sus anillos y lunas.","Made the first Uranus flyby and examined its rings and moons."],
  ["neptune","1989-08-25","Sobrevoló Neptuno y Tritón, su último encuentro planetario.","Flew past Neptune and Triton on its final planetary encounter."],
  ["heliopause","2018-11-05","Cruzó el límite de la burbuja de viento solar y entró en el espacio interestelar.","Crossed the boundary of the solar wind bubble and entered interstellar space."],
  ["deep","","Continúa su viaje por el espacio interestelar. Consulta su posición actual en la NASA.","Still traveling in interstellar space. Check its current position at NASA."]
].map(([destination,date,es,en],index) => ({ destination,date,description:{es,en},part:index+1 }));
const voyagerCurrent = 'https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/#current-position-of-voyager-2';
const voyagerDates = 'https://nssdc.gsfc.nasa.gov/planetary/voyager-periapse.html';
function routePosition(destination) {
  const position = id => plotPosition(worlds.findIndex(world => world.id === id));
  if (destination !== 'heliopause') return position(destination);
  if (state.missionRoute) {
    const angle = 314 * Math.PI / 180;
    return [50 + 48 * Math.cos(angle), 51 + 48 * orbitHeight * Math.sin(angle)];
  }
  const [x,y] = position('neptune');
  const [toX,toY] = position('deep');
  return [(x+toX)/2,(y+toY)/2+8];
}
const stopDate = stop => stop.date
  ? new Intl.DateTimeFormat(state.lang,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(stop.date))
  : t('voyagerToday');
const routeName = id => id === 'heliopause' ? t('heliopause') : worldName(id);
const stopAt = destination => voyagerStops.find(story => story.destination === destination);
const stopLink = destination => `#planet=${destination}`;
const stopLabel = stop => `Voyager 2 · ${routeName(stop.destination)}`;
const pageTitles = { home:'', stories:'storiesNav', expeditions:'expeditions', map:'mapShort', passport:'passportShort' };
const pageLink = (url,fallback) => demoMode ? fallback : url;
const languageLabel = language => language === 'es' ? t('languageES') : t('languageEN');
const matchesRover = (story, name) => story.destination === 'mars' && story.type === 'rover' &&
  normalize(story.hardware).split(/[^a-z]+/i).includes(normalize(name));

function worldDisc(world) {
  const texture = world.id === 'deep' ? '' : `--world-art:url('${textureURL(world.id)}');`;
  return `<i class="world-disc disc-${world.id}" aria-hidden="true" style="${texture}--world-color:${world.color}"></i>`;
}

function paintCover(world) {
  $('#launchStories').href = pageLink(`/relatos#planet=${world.id}`,`#planet=${world.id}`);
  $('#launchClass').textContent = `${t('hero1')} ${t('hero2')}`;
  $('#siteTitle').textContent = world[state.lang];
  $('#launchIntro').textContent = world.id === 'earth' ? t('coverIntro') : planetScenes[world.id][state.lang][1];
  $('#slides').dataset.world = world.id;
  $('#slides').style.setProperty('--planet-accent', world.color);
  document.documentElement.style.setProperty('--world-tint', world.color);
  showLaunchGlobe(world.id);
  for (const [button, offset] of [[$('#coverPrevious'), -1], [$('#coverNext'), 1]]) {
    const neighbor = worlds[(state.selected + offset + worlds.length) % worlds.length];
    button.innerHTML = `${worldDisc(neighbor)}<span>${escape(neighbor[state.lang])}</span>`;
    button.setAttribute('aria-label', `${t(offset < 0 ? 'prev' : 'next')} · ${neighbor[state.lang]}`);
  }
  paintJourneyCopy(world);
  paintHud(world);
  $('#launchPagination').innerHTML = worlds.map((item,index) =>
    `<button type="button" data-cover-world="${index}" aria-label="${escape(item[state.lang])}" title="${escape(item[state.lang])}" aria-pressed="${index === state.selected}"><span class="dot-label">${escape(item[state.lang])}</span></button>`
  ).join('');
}

// Data around the planet, like an instrument readout: moons, NASA hardware, its status and community stories.
function paintHud(world) {
  const hud = $('#coverHud');
  if (world.id === 'deep') { hud.innerHTML = ''; return; }
  const fleet = [...missions.filter(item => item.destination === world.id), ...(world.id === 'mars' ? marsRovers : [])];
  const moons = moonSystems[world.id];
  const moonText = world.id === 'moon' ? t('hudMoonOfEarth') : !moons?.length ? t('hudNone')
    : moons.map(([es, en]) => state.lang === 'es' ? es : en).join(', ');
  const status = ['active','silent','final'].map(key => [key, fleet.filter(item => item.status === key).length]).filter(([,n]) => n)
    .map(([key, n]) => `${n} ${t(`hud_${key}${n === 1 ? '' : 's'}`)}`).join(' · ');
  const stories = collection().filter(story => story.destination === world.id).length;
  const item = (place, label, value, detail = '') => `<div class="hud-item ${place}"><dt>${t(label)}</dt><dd>${escape(value)}${detail ? `<span class="hud-detail">${escape(detail)}</span>` : ''}</dd></div>`;
  hud.innerHTML = [
    item('hud-a', world.id === 'moon' ? 'hudOrbit' : 'hudMoons', moonText),
    item('hud-b', 'hudHardware', fleet.length ? String(fleet.length) : t('hudNone'), fleet.slice(0, 3).map(entry => entry.name).join(', ') + (fleet.length > 3 ? '…' : '')),
    item('hud-c', 'hudStatus', status || '—'),
    item('hud-d', 'hudStories', String(stories))
  ].join('');
}

function journeyCaption(id) {
  const mission = missions.find(item => item.destination === id);
  if (mission) return `${mission.name} · ${local(mission.context)}`;
  if (id === 'mars') return t('roversPath');
  const stop = stopAt(id);
  return stop ? `Voyager 2 · ${stopDate(stop)} · ${local(stop.description)}` : '';
}

function paintJourneyCopy(world) {
  const scene = planetScenes[world.id]?.[state.lang] || ['', ''];
  $('#detailEyebrow').textContent = scene[0];
  $('#detailTitle').textContent = world[state.lang];
  $('#detailBody').textContent = scene[1];
  const fleet = [...missions.filter(item => item.destination === world.id), ...(world.id === 'mars' ? marsRovers : [])];
  $('#detailFleet').innerHTML = fleet.length ? `<p class="fleet-label">${t('fleetHere')}</p><ul>${fleet.map(item =>
    `<li class="status-${item.status}"><i aria-hidden="true"></i><span>${escape(item.name)}</span><small>${escape(t(`status_${item.status}`))} · ${escape(item.years || '')}</small></li>`).join('')}</ul>` : '';
  $('#detailStories').href = pageLink(`/relatos#planet=${world.id}`,`#planet=${world.id}`);
  $('#detailPlay').href = pageLink(world.id === 'earth' || stopAt(world.id) ? '/mapa#voyager' : '/mapa', world.id === 'earth' || stopAt(world.id) ? '#voyager' : '#solar-map');
  $('#captionText').textContent = journeyCaption(world.id);
  const count = collection().filter(story => story.destination === world.id).length;
  $('#captionCount').textContent = count ? `${count} ${t(count === 1 ? 'captionStory' : 'captionStories')}` : t('captionEmpty');
}

const journey = { a: 0, b: 0, frame: 0, base: null };
const lerp = (from, to, amount) => from + (to - from) * amount;
const ease = value => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
const clamp01 = value => Math.min(1, Math.max(0, value));

function measureHeader() {
  const header = document.querySelector('.header');
  if (header) document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`);
}
measureHeader();
addEventListener('resize', measureHeader);

function measureJourney() {
  const globeNode = $('.launch-globe');
  const stage = $('#slides');
  if (!globeNode || !stage.offsetWidth) return;
  const previous = globeNode.style.transform;
  globeNode.style.transform = 'none';
  const box = globeNode.getBoundingClientRect();
  const frame = stage.getBoundingClientRect();
  globeNode.style.transform = previous;
  const W = frame.width, H = frame.height, narrow = W < 700;
  journey.base = {
    x: box.left - frame.left + box.width / 2, y: box.top - frame.top + box.height / 2, d: box.width,
    split: narrow ? { x: W * .5, y: H * .3, d: Math.min(W * .74, H * .42) } : { x: W * .7, y: H * .5, d: Math.min(W * .42, H * .66) },
    zoom: narrow ? { x: W * .58, y: H * .66, d: H * 1.25 } : { x: W * .6, y: H * .74, d: Math.max(W, H) * 1.08 }
  };
}

function paintJourney() {
  journey.frame = 0;
  const wrap = $('#journey');
  const stage = $('#slides');
  if (!wrap || document.documentElement.dataset.atlasPage !== 'home') return;
  if (!state.motion) { stage.style.setProperty('--a', 0); stage.style.setProperty('--b', 0); return; }
  if (!journey.base) measureJourney();
  const base = journey.base;
  if (!base) return;
  const travel = wrap.offsetHeight - stage.offsetHeight;
  const progress = travel > 0 ? clamp01(-wrap.getBoundingClientRect().top / travel) : 0;
  const a = ease(clamp01(progress / .38));
  const b = ease(clamp01((progress - .55) / .38));
  stage.style.setProperty('--a', a.toFixed(4));
  stage.style.setProperty('--b', b.toFixed(4));
  stage.classList.toggle('is-traveling', a > .25);
  stage.classList.toggle('is-zoomed', b > .5);
  const x = lerp(lerp(base.x, base.split.x, a), base.zoom.x, b);
  const y = lerp(lerp(base.y, base.split.y, a), base.zoom.y, b);
  const d = lerp(lerp(base.d, base.split.d, a), base.zoom.d, b);
  $('.launch-globe').style.transform = `translate(${(x - base.x).toFixed(1)}px, ${(y - base.y).toFixed(1)}px) scale(${(d / base.d).toFixed(4)})`;
  showLaunchGlobe.spin?.(progress * .12);
}
const requestJourney = () => { if (!journey.frame) journey.frame = requestAnimationFrame(paintJourney); };
addEventListener('scroll', requestJourney, { passive: true });
addEventListener('resize', () => { journey.base = null; requestJourney(); });

const orbitHeight = .86;
// While Voyager 2 is selected, the outer planets are bent into the arc that made the Grand Tour possible.
const grandTourBearings = { venus:20, earth:160, jupiter:200, saturn:236, uranus:268, neptune:302, deep:[50,326] };

// The map is alive: planets drift along their orbits and the main moons circle their planets.
// Orbital periods (years) are compressed with a square root so the outer planets still move.
const orbitYears = { mercury:.24, venus:.62, earth:1, mars:1.88, jupiter:11.86, saturn:29.46, uranus:84, neptune:164.8 };
const orbitSeconds = id => 80 * Math.sqrt(orbitYears[id]);
// [Spanish name, English name, dot size (px), period (days)]; a negative period orbits backwards.
const moonSystems = {
  mercury: [], venus: [],
  earth: [['Luna','Moon',0,27.3]],
  mars: [['Fobos','Phobos',2.4,.32],['Deimos','Deimos',2,1.26]],
  jupiter: [['Ío','Io',3,1.77],['Europa','Europa',2.6,3.55],['Ganímedes','Ganymede',3.6,7.15],['Calisto','Callisto',3.2,16.7]],
  saturn: [['Encélado','Enceladus',2.2,1.37],['Rea','Rhea',2.6,4.52],['Titán','Titan',3.8,15.9]],
  uranus: [['Titania','Titania',2.6,8.7],['Oberón','Oberon',2.6,13.5]],
  neptune: [['Tritón','Triton',3,-5.88]]
};
const moonSeconds = days => Math.sign(days) * (3 + 2.2 * Math.sqrt(Math.abs(days)));
const orbitMotion = { clock: 0, speed: 1, target: 1, last: 0, frame: 0, visible: false, bodies: [] };

function plotPosition(index) {
  const id = worlds[index]?.id;
  if (id === 'moon') return plotPosition(worlds.findIndex(world => world.id === 'earth'));
  const tour = state.missionRoute ? grandTourBearings[id] : undefined;
  const orbit = Array.isArray(tour) ? tour : tour !== undefined ? [plotOrbits[id][0], tour] : plotOrbits[id];
  if (!orbit) return [10, 22];
  const drift = state.missionRoute || !orbitYears[id] ? 0 : 360 * orbitMotion.clock / orbitSeconds(id);
  const [radius, bearing] = [orbit[0], orbit[1] - drift];
  const angle = bearing * Math.PI / 180;
  return [50 + radius * Math.cos(angle), 51 + radius * orbitHeight * Math.sin(angle)];
}

function drawVoyagerRoute() {
  const canvas = $('#voyagerRoute');
  if (!canvas) return;
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  const scale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const route = canvas.getContext('2d');
  route.scale(scale,scale);
  route.beginPath();
  const points = voyagerStops.map(stop => {
    const [x,y] = routePosition(stop.destination);
    return [x*width/100,y*height/100];
  });
  route.moveTo(...points[0]);
  for (let index = 0; index < points.length - 1; index++) {
    const [p0,p1,p2,p3] = [points[index-1] || points[index], points[index], points[index+1], points[index+2] || points[index+1]];
    route.bezierCurveTo(p1[0]+(p2[0]-p0[0])/6, p1[1]+(p2[1]-p0[1])/6, p2[0]-(p3[0]-p1[0])/6, p2[1]-(p3[1]-p1[1])/6, p2[0], p2[1]);
  }
  route.setLineDash([5,6]);
  route.lineWidth = 1.7;
  route.strokeStyle = '#ffd58a';
  route.shadowBlur = 8;
  route.shadowColor = '#e8a44b';
  route.stroke();
}

function moonMarkup(id) {
  return (moonSystems[id] || []).filter(([,,size]) => size)
    .map(([,,size]) => `<b class="sat-ring"></b><i class="sat" style="--s:${size}px"></i>`).join('');
}

function collectOrbitBodies() {
  const plot = $('#solarPlot');
  orbitMotion.bodies = [...plot.querySelectorAll('.map-node[data-map-world]')].map(node => {
    const world = worlds[Number(node.dataset.mapWorld)];
    const disc = node.querySelector('.world-disc');
    const r = (disc?.offsetWidth || 20) / 2;
    const tilted = world.id === 'uranus';
    const moons = [...node.querySelectorAll('.sat')].map((element, index) => {
      const [, , , days] = moonSystems[world.id].filter(([,,size]) => size)[index];
      const radius = r + 6 + index * 4.6;
      const [sx, sy] = tilted ? [.36, 1] : [1, .46];
      const ring = element.previousElementSibling;
      ring.style.cssText = `width:${2 * radius * sx}px;height:${2 * radius * sy}px`;
      return { element, radius, sx, sy, seconds: moonSeconds(days), phase: index * 2.1 + world.size };
    });
    return { node, world, moons, r, earthMoon: world.id === 'moon' };
  });
  placeOrbitBodies();
}

function placeOrbitBodies() {
  const earth = worlds.findIndex(world => world.id === 'earth');
  const earthRadius = orbitMotion.bodies.find(body => body.world.id === 'earth')?.r || 15;
  for (const body of orbitMotion.bodies) {
    const index = worlds.indexOf(body.world);
    const [x, y] = plotPosition(body.world.id === 'moon' ? earth : index);
    body.node.style.setProperty('--x', `${x}%`);
    body.node.style.setProperty('--y', `${y}%`);
    if (body.earthMoon) {
      const angle = 2 * Math.PI * orbitMotion.clock / moonSeconds(27.3) - 2.3;
      const reach = earthRadius + body.r + 9;
      body.node.style.transform = `translate(${Math.cos(angle) * reach}px, ${Math.sin(angle) * reach * .46}px)`;
      body.node.style.zIndex = Math.sin(angle) < 0 ? 0 : 3;
    }
    for (const moon of body.moons) {
      const angle = 2 * Math.PI * orbitMotion.clock / moon.seconds + moon.phase;
      const front = Math.sin(angle) > 0;
      moon.element.style.transform = `translate(${Math.cos(angle) * moon.radius * moon.sx}px, ${Math.sin(angle) * moon.radius * moon.sy}px)`;
      moon.element.style.zIndex = front ? 2 : 0;
      moon.element.style.opacity = front ? 1 : .55;
    }
  }
}

function orbitFrame(time) {
  orbitMotion.frame = 0;
  if (!orbitMotion.visible || document.hidden) { orbitMotion.last = 0; return; }
  const step = orbitMotion.last ? Math.min((time - orbitMotion.last) / 1000, .1) : 0;
  orbitMotion.last = time;
  orbitMotion.speed += (orbitMotion.target - orbitMotion.speed) * Math.min(1, step * 4);
  orbitMotion.clock += step * orbitMotion.speed;
  placeOrbitBodies();
  orbitMotion.frame = requestAnimationFrame(orbitFrame);
}

function runOrbits() {
  if (state.motion && orbitMotion.visible && !orbitMotion.frame) orbitMotion.frame = requestAnimationFrame(orbitFrame);
}

{
  const plot = $('#solarPlot');
  const hold = value => () => { orbitMotion.target = value; };
  // Slow to a stop under the pointer or keyboard focus so moving targets stay easy to pick.
  plot.addEventListener('pointerenter', hold(0));
  plot.addEventListener('pointerleave', hold(1));
  plot.addEventListener('focusin', hold(0));
  plot.addEventListener('focusout', hold(1));
  new IntersectionObserver(([entry]) => { orbitMotion.visible = entry.isIntersecting; runOrbits(); }).observe(plot);
  document.addEventListener('visibilitychange', runOrbits);
  addEventListener('resize', () => { if (orbitMotion.bodies.length) collectOrbitBodies(); });
}

function paintSolarMap() {
  const selected = state.mapSelection;
  const orbits = Object.entries(plotOrbits).map(([id,[radius]]) =>
    `<span class="solar-orbit${worlds[selected]?.id === id ? ' active' : ''}" style="width:${2*radius}%;height:${2*radius*orbitHeight}%" aria-hidden="true"></span>`
  ).join('');
  const nodes = worlds.map((item,index) => {
    const [x,y] = plotPosition(index);
    const stop = state.missionRoute && stopAt(item.id);
    return `<button type="button" class="map-node${stop ? ' route-stop' : ''}${item.id === 'moon' ? ' moon-node' : ''}" data-map-world="${index}" style="--x:${x}%;--y:${y}%;--node-size:${(item.id === 'moon' ? 30 : item.size) * .52}px" aria-pressed="${index === selected}" aria-label="${escape(stop ? stopLabel(stop) : item[state.lang])}">${worldDisc(item)}${moonMarkup(item.id)}<span class="map-name">${escape(item[state.lang])}</span>${stop ? `<span class="stop-number" aria-hidden="true">${stop.part}</span>` : ''}</button>`;
  }).join('');
  const [boundaryX,boundaryY] = routePosition('heliopause');
  const boundary = state.missionRoute ? `<button type="button" class="map-node route-stop voyager-boundary" data-voyager="heliopause" style="--x:${boundaryX}%;--y:${boundaryY}%" aria-pressed="${state.voyagerPhase === 'heliopause'}" aria-label="${t('heliopause')}"><span class="voyager-dot" aria-hidden="true">6</span></button>` : '';
  $('#solarPlot').innerHTML = `${orbits}${state.missionRoute ? '<canvas id="voyagerRoute" aria-hidden="true"></canvas>' : ''}<div class="map-sun"><i aria-hidden="true"></i><span>${t('sun')}</span></div>${nodes}${boundary}`;
  $('#mapRoster').innerHTML = worlds.map((item,index) =>
    `<button type="button" class="plain" data-map-world="${index}" aria-pressed="${index === selected}">${escape(item[state.lang])}</button>`
  ).join('');
  const world = worlds[selected];
  $('#mapStoryLink').href = world ? pageLink(`/relatos#planet=${world.id}`,`#planet=${world.id}`) : pageLink('/relatos','#archive');
  const stop = state.missionRoute ? stopAt(state.voyagerPhase || world?.id) : null;
  $('#mapInstructions').textContent = t(state.missionRoute ? 'mapVoyager' : 'mapToStories');
  const preview = $('#mapPreview');
  preview.hidden = !world && !stop;
  if (stop) {
    preview.innerHTML = `<div class="voyager-detail"><p class="eyebrow">Voyager 2 · ${escape(stopDate(stop))}</p>
      <h3>${escape(routeName(stop.destination))}</h3><p>${escape(local(stop.description))}</p>
      <div class="voyager-actions"><a class="outline" href="${stopLink(stop.destination === 'heliopause' ? 'deep' : stop.destination)}">${t('storiesAtStop')}</a>
      ${stop.destination === 'deep' ? `<a class="primary" href="${voyagerCurrent}" target="_blank" rel="noopener noreferrer">${t('voyagerLive')} ↗</a>` : ''}</div></div>`;
  } else if (world) {
    preview.innerHTML = `<div class="map-preview-title">${worldDisc(world)}
      <div><h3>${escape(world[state.lang])}</h3>${moonSystems[world.id] ? `<p class="map-moons">${moonSystems[world.id].length
        ? `${t(world.id === 'earth' ? 'oneMoon' : 'mainMoons')}: ${moonSystems[world.id].map(([es,en]) => escape(state.lang === 'es' ? es : en)).join(' · ')}` : t('noMoons')}</p>` : ''}</div>
      </div><a href="${`#slide=${world.id}`}" class="outline">${t('openDestination')}</a>`;
  }
  $('#mapMission').innerHTML = state.missionRoute
    ? `<p class="grand-tour-note">${t('grandTour')}</p><strong>${t('voyagerTimeline')}</strong><ol class="voyager-timeline">${voyagerStops.map(item => `<li><button type="button" class="plain" data-voyager="${item.destination}" aria-pressed="${item === stop}"><span>${escape(routeName(item.destination))}</span><time>${escape(stopDate(item))}</time></button></li>`).join('')}</ol><a class="plain" href="${voyagerDates}" target="_blank" rel="noopener noreferrer">${t('voyagerSources')} ↗</a>`
    : `<a href="#voyager" class="plain">${t('followVoyager')} ↗</a>`;
  requestAnimationFrame(drawVoyagerRoute);
  collectOrbitBodies();
  runOrbits();
}

function paintAtlas() {
  paintCover(worlds[state.selected]);
  paintSolarMap();
}

function chooseWorld(index) {
  const previous = state.selected;
  state.selected = (index + worlds.length) % worlds.length;
  paintCover(worlds[state.selected]);
  if (previous !== state.selected && state.motion) {
    const direction = index === previous - 1 ? -1 : index === previous + 1 ? 1 : Math.sign(index - previous);
    for (const [element, distance] of [[$('.launch-globe canvas'), 36], [$('.launch-inner'), 13], [$('.launch-detail'), 13]]) {
      element.getAnimations().forEach(animation => animation.cancel());
      element.animate([{opacity:.2,filter:'blur(12px)',translate:`${direction * distance}px 0`},{opacity:1,filter:'blur(0)',translate:'0 0'}],
        {duration:700,easing:'cubic-bezier(.21,.65,.25,1)'});
    }
  }
}

function addressFor(hash) {
  if (demoMode) return /^#(?:home|archive|discovery|solar-map|passport|expeditions|rovers|voyager|explore)$|^#(?:planet|rover|story|slide|voyager|autor)=/.test(hash) ? hash : null;
  if (hash === '#home') return '/';
  if (hash === '#archive') return '/relatos';
  if (hash === '#discovery' || hash === '#solar-map') return '/mapa';
  if (hash === '#passport') return '/pasaporte';
  if (hash === '#expeditions') return '/expediciones';
  if (hash === '#rovers') return '/expediciones#rovers';
  if (hash === '#voyager' || hash.startsWith('#voyager=')) return `/mapa${hash}`;
  if (/^#(?:planet|rover|story|autor)=/.test(hash) || hash === '#explore') return `/relatos${hash}`;
  if (hash.startsWith('#slide=')) return `/${hash}`;
  return null;
}

function paintPage() {
  const page = demoMode ? document.documentElement.dataset.atlasPage : atlasPage(location.pathname) || 'home';
  document.documentElement.dataset.atlasPage = page;
  document.title = pageTitles[page] ? `${t(pageTitles[page])} · Echoes of Space` : 'Echoes of Space';
  document.querySelectorAll('[data-page-link]').forEach(link => {
    if (link.dataset.pageLink === page) link.setAttribute('aria-current','page');
    else link.removeAttribute('aria-current');
  });
  paintHeaderAccount();
  journey.base = null;
  requestJourney();
}

function routeAtlas() {
  const { hash } = location;
  if (demoMode) {
    if (/^#(?:archive$|(?:planet|rover|story|autor)=|explore$)/.test(hash)) document.documentElement.dataset.atlasPage = 'stories';
    else if (/^#(?:solar-map$|voyager(?:=|$)|discovery$)/.test(hash)) document.documentElement.dataset.atlasPage = 'map';
    else if (hash === '#passport') document.documentElement.dataset.atlasPage = 'passport';
    else if (hash === '#expeditions' || hash === '#rovers') document.documentElement.dataset.atlasPage = 'expeditions';
    else if (/^#(?:home$|slide=)/.test(hash)) document.documentElement.dataset.atlasPage = 'home';
  } else {
    const address = addressFor(hash);
    if (address && address !== location.pathname+location.search+hash) history.replaceState(null,'',address);
  }
  paintPage();
  const roverSlug = hash.match(/^#rover=([a-z]+)$/)?.[1];
  const rover = roverSlug && marsRovers.find(item => item.name.toLowerCase() === roverSlug);
  if (rover) {
    browse({ destination:'mars', rover:rover.name, preserveHash:true });
    return '#archiveTitle';
  }
  const authorHandle = hash.match(/^#autor=([a-f0-9]{12})$/)?.[1];
  if (authorHandle) {
    browse({ author:authorHandle, preserveHash:true });
    return '#archiveTitle';
  }
  const match = hash.match(/^#(planet|slide|voyager)=([a-z]+)$/);
  if (hash === '#voyager' || hash === '#solar-map' || (!hash && document.documentElement.dataset.atlasPage === 'map')) {
    const missionMap = hash === '#voyager';
    const entering = missionMap && !state.missionRoute;
    state.missionRoute = missionMap;
    if (entering) selectMapDestination(voyagerStops[0].destination);
    paintSolarMap();
    $('#solar-map').scrollIntoView();
    return '#mapTitle';
  }
  if (match?.[1] === 'voyager') {
    if (!stopAt(match[2])) return;
    history.replaceState(null,'',addressFor(stopLink(match[2] === 'heliopause' ? 'deep' : match[2])));
    return routeAtlas();
  }
  const index = match ? worlds.findIndex(world => world.id === match[2]) : -1;
  if (index >= 0 && match[1] === 'slide') {
    chooseWorld(index);
    $('#slides').scrollIntoView();
    return '#siteTitle';
  }
  if (hash === '#explore' || index >= 0) {
    browse({ destination: worlds[index >= 0 ? index : state.selected].id, preserveHash:true });
    return '#archiveTitle';
  }
  if (hash === '#rovers') $('#rovers').scrollIntoView();
}

let accountName = null;
function paintHeaderAccount() {
  const header = $('#headerAccount');
  const menu = $('#accountMenu');
  const signedIn = Boolean(passport.scope);
  header.hidden = demoMode || signedIn;
  menu.hidden = demoMode || !signedIn;
  if (menu.hidden) menu.open = false;
  $('#openModeration').hidden = !signedIn || !moderator;
  if (signedIn && !demoMode && accountName === null) {
    accountName = '';
    request('/api/me',{ cache:'no-store' }).then(response => response.ok ? response.json() : null)
      .then(me => { accountName = me?.name || ''; $('#accountName').textContent = accountName ? ` · ${accountName}` : ''; if (me?.moderator && !$('#adminPanel')) $('#accountSettings').insertAdjacentHTML('afterend', `<a href="/moderacion" id="adminPanel" data-t="adminPanel">${t('adminPanel')}</a>`); })
      .catch(() => { accountName = null; });
  }
  if (signedIn) loadSocial();
  if (!signedIn) { accountName = null; $('#accountName').textContent = ''; Object.assign(social, { loaded:false, signedIn:false, handle:null, echoed:new Set(), saved:new Set(), following:new Set() }); }
  const returnPath = location.pathname + location.search + location.hash;
  header.href = `/signin?return_to=${encodeURIComponent(returnPath)}`;
  $('#passportSignOut').hidden = demoMode || !signedIn;
}

const accountMenu = $('#accountMenu');
document.addEventListener('click', event => {
  if (!accountMenu.open) return;
  if (!accountMenu.contains(event.target) || event.target.closest('.account-links a')) accountMenu.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && accountMenu.open) {
    accountMenu.open = false;
    accountMenu.querySelector('summary').focus();
  }
});

function paintPassport() {
  const visited = new Set(collection().filter(story => passport.explored.has(story.id) || passport.read.has(story.id)).map(story => story.destination));
  const readCount = collection().filter(story => passport.read.has(story.id)).length;
  $('#passportCount').textContent = `${visited.size} / ${worlds.length} ${t('exploreCount')} · ${readCount} ${t('readCount')}`;
  const status = passport.status;
  $('#stamps').setAttribute('aria-label', t('stampList'));
  $('#passportStatus').textContent = t(`passport_${status}`);
  $('#passportSignIn').hidden = demoMode || status !== 'guest';
  paintHeaderAccount();
  paintUploadAccess();
  $('#passportImport').hidden = !passport.canImport() || status !== 'synced';
  $('#passportRetry').hidden = status !== 'error';
  $('#stamps').innerHTML = worlds.map((world,index) => {
    const done = visited.has(world.id);
    return `<button class="stamp ${done ? 'visited' : ''}" data-jump="${index}" type="button">${worldDisc(world)}<span class="stamp-name">${escape(world[state.lang])}</span><span class="stamp-state">${t(done ? 'stampVisited' : 'stampPending')}</span></button>`;
  }).join('');
  const tour = ['jupiter','saturn','uranus','neptune'];
  const badges = [
    ['badgeFirstRead', readCount >= 1, '📖'],
    ['badgeThreeWorlds', visited.size >= 3, '🧭'],
    ['badgeGrandTour', tour.every(id => visited.has(id)), '🛰️'],
    ['badgeAllWorlds', visited.size >= worlds.length, '🌌'],
    ['badgeAuthor', state.entries.some(story => story.mine), '✍️']
  ];
  $('#passportBadges').innerHTML = `<h3 aria-level="2">${t('badgesTitle')} <span>${badges.filter(([,earned]) => earned).length} / ${badges.length}</span></h3><ul>${badges.map(([key,earned,icon]) =>
    `<li class="badge${earned ? ' earned' : ''}"><span class="badge-icon" aria-hidden="true">${icon}</span><span><strong>${t(key)}</strong><small>${t(`${key}Hint`)}</small></span><span class="sr">${t(earned ? 'badgeEarned' : 'badgeLocked')}</span></li>`).join('')}</ul>`;
  $('#passportMission').innerHTML = `${visited.size ? '' : `<span>${t('passportVoyagerHint')}</span> `}<a class="outline" href="${pageLink('/mapa#voyager','#voyager')}">${t('followVoyager')}</a>`;
  paintHome();
}

function paintHome() {
  const stories = collection().filter(story => !story.hidden);
  const authors = new Set(stories.map(story => normalize(story.byline || '')).filter(Boolean));
  const worldsWithStories = new Set(stories.map(story => story.destination));
  $('#homeStats').innerHTML = [[stories.length,'homeStatStories'],[worldsWithStories.size,'homeStatWorlds'],[authors.size,'homeStatAuthors']]
    .map(([value,key]) => `<span><strong>${value}</strong> ${t(key)}</span>`).join('<i aria-hidden="true"></i>');
  const seen = new Set();
  const recent = stories.filter(story => {
    const key = story.seriesId || story.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0,8);
  $('#homeRecent').innerHTML = recent.length
    ? recent.map(story => `<article class="shelf-book"><button class="book-button" type="button" data-story="${escape(story.id)}">${storyCover(story)}<span class="shelf-title">${escape(local(story.seriesName) || local(story.title))}</span></button>
      <p class="shelf-meta">${escape(author(story))} · ${escape(worldName(story.destination))}</p></article>`).join('')
    : `<p class="home-empty"><span>${t('homeEmptyTitle')}.</span> ${t('homeEmptyBody')} <button class="text-link" type="button" data-upload>${t('upload')} &#8594;</button></p>`;
  if (worlds[state.selected]) paintJourneyCopy(worlds[state.selected]);
}

// One search rule for the archive and the header search: "#word" looks only at tags,
// anything else looks at title, author, hardware, synopsis, series and story ID.
function parseSearch(raw) {
  const text = String(raw || '').trim();
  return text.startsWith('#') ? { tag: normalize(text.slice(1)) } : { text: normalize(text) };
}

function storyMatches(story, query) {
  if (query.tag !== undefined) return (story.tags || []).some(tag => normalize(tag).startsWith(query.tag));
  return !query.text || normalize([local(story.title), story.hardware, author(story), story.id, local(story.synopsis), local(story.seriesName), ...(story.tags || [])].join(' ')).includes(query.text);
}

function filteredStories() {
  const query = parseSearch(state.search);
  const entries = state.shelf === 'created' ? state.entries.filter(story => story.mine) : collection();
  return entries.filter(story => {
    if (state.shelf === 'readShelf' && !passport.read.has(story.id)) return false;
    if (state.shelf === 'libraryShelf' && !social.saved.has(story.id)) return false;
    if (state.shelf === 'followingShelf' && !social.following.has(story.authorHandle)) return false;
    if (state.author && story.authorHandle !== state.author) return false;
    if (state.rover && !matchesRover(story, state.rover)) return false;
    if (state.destination && story.destination !== state.destination) return false;
    if (state.type && story.type !== state.type) return false;
    if (state.category && story.category !== state.category) return false;
    return storyMatches(story, query);
  });
}

function paintRovers() {
  const rows = [];
  for (const world of worlds) {
    const fleet = [
      ...missions.filter(item => item.destination === world.id).map((item) => ({ ...item, kind:'mission', index: missions.indexOf(item) })),
      ...(world.id === 'mars' ? marsRovers.map(item => ({ ...item, destination:'mars', type:'rover', kind:'rover' })) : [])
    ];
    for (const item of fleet) rows.push([world, item]);
  }
  let firstRover = true;
  $('#missionList').innerHTML = rows.map(([world, item]) => {
    const rover = item.kind === 'rover';
    const count = collection().filter(story => rover ? matchesRover(story, item.name)
      : story.destination === item.destination && normalize(story.hardware).includes(normalize(item.name))).length;
    const anchor = rover && firstRover ? ' id="rovers"' : '';
    if (rover) firstRover = false;
    const storiesControl = rover
      && count ? `<button type="button" class="text-link" data-rover="${escape(item.name)}">${t('missionStories')} (${count})</button>`
      : `<a class="text-link" href="${pageLink(`/relatos#planet=${item.destination}`,`#planet=${item.destination}`)}">${t('missionStories')}${count ? ` (${count})` : ''}</a>`;
    const upload = rover ? `data-upload-rover="${escape(item.name)}"` : `data-upload-mission="${item.index}"`;
    return `<article class="manifest-row"${anchor} style="--world-color:${world.color}">
      <div class="row-world">${worldDisc(world)}<span>${escape(world[state.lang])}</span></div>
      <div class="row-name"><h4 aria-level="3" id="${rover ? `rover-${escape(item.name.toLowerCase())}` : `mission-${item.index}`}">${escape(item.name)}</h4><span class="row-meta">${escape(t(item.type))} · ${escape(item.years || '')}</span></div>
      <div class="row-body"><p class="row-question">${escape(local(item.question))}</p><p class="row-context">${escape(local(item.context))}</p>${item.status ? `<p class="row-status status-${item.status}"><i aria-hidden="true"></i><strong>${t(`status_${item.status}`)}</strong> · ${escape(local(item.where))}</p>` : ''}</div>
      <div class="row-actions"><a class="text-link" href="${item.source}" target="_blank" rel="noopener noreferrer">NASA ↗</a>${storiesControl}
        <button type="button" class="pill-link" data-upload ${upload}>${t('roverContribute')}</button></div>
    </article>`;
  }).join('');
  $('#fleetCount') && ($('#fleetCount').textContent = rows.length);
}

function paintPublicationReceipt() {
  const receipt = $('#publicationReceipt');
  const story = state.publishedId && find(state.publishedId);
  receipt.hidden = !story;
  if (!story) return;
  receipt.innerHTML = `<div><p role="status">${t('publicationReady')}</p><strong>${escape(local(story.title))}</strong></div>
    <div class="feature-actions">${action(story.id,t('openPublished'))}
      <button type="button" class="primary" id="sharePublished">${t('shareStory')}</button><span id="publicationCopy" role="status"></span></div>`;
}

function storyCover(story) {
  const world = worlds.find(item => item.id === story.destination);
  const coverURL = demoMode ? story.coverData : story.hasCover ? `/api/covers/${encodeURIComponent(story.id)}` : '';
  const artwork = story.id === 'apollo-15' && world
    ? worldDisc({ ...world, id:'moon', color:'#c6c5bb' }) : world ? worldDisc(world) : '';
  return `<span class="book-cover" style="--book-color:${world?.color ?? '#7897ba'}" aria-hidden="true">
    ${artwork}${coverURL ? `<img src="${escape(coverURL)}" alt="" loading="lazy" width="240" height="360">` : ''}
  </span>`;
}

function paintArchive() {
  if (worlds[state.selected]) paintHud(worlds[state.selected]);
  const entries = filteredStories();
  const seen = new Set();
  const count = { all:collection().length, created:state.entries.filter(story => story.mine).length,
    readShelf: collection().filter(story => passport.read.has(story.id)).length };
  if (social.signedIn) {
    count.libraryShelf = collection().filter(story => social.saved.has(story.id)).length;
    count.followingShelf = collection().filter(story => social.following.has(story.authorHandle)).length;
  } else if (['libraryShelf','followingShelf'].includes(state.shelf)) state.shelf = 'all';
  $('#shelves').innerHTML = Object.keys(count).map(key => `<button type="button" data-shelf="${key}" aria-pressed="${state.shelf === key}">${t(key)} <span>${count[key]}</span></button>`).join('');
  const cards = entries.map(story => {
    const key = story.seriesId || story.id;
    if (seen.has(key)) return '';
    seen.add(key);
    const parts = story.seriesId ? entries.filter(item => item.seriesId === key).sort((a,b) => a.part-b.part) : [story];
    const first = parts[0];
    const label = local(first.seriesName) || local(first.title);
    const list = story.seriesId ? `<ul class="chapter-list" aria-label="${t('chronology')}">${parts.map(item => `<li>${action(item.id, `${chapter(item)} · ${local(item.title)}`, 'plain')}${passport.read.has(item.id) ? '<span aria-hidden="true">✓</span>' : ''}</li>`).join('')}</ul>` : '';
    return `<article class="entry book-card">
      <h3 aria-level="2"><button class="book-button" type="button" data-story="${escape(first.id)}">
        ${storyCover(first)}<span>${escape(label)}</span>
      </button></h3>
      <p class="book-byline">${authorLink(first)}</p>
      <p class="book-meta">${escape(worldName(first.destination))} · ${escape(languageLabel(first.language || state.lang))}</p>
      ${!story.seriesId && passport.read.has(first.id) ? `<p class="book-origin">${t('markedRead')}</p>` : readingProgress(first.id) ? `<p class="book-origin">${t('progressRead')} ${Math.round(readingProgress(first.id) * 100)}%</p>` : ''}
      ${first.echoes || first.comments ? `<p class="book-stats">${[first.echoes ? countLabel(first.echoes,'echoOne','echoMany') : '', first.comments ? countLabel(first.comments,'commentOne','commentMany') : ''].filter(Boolean).join(' · ')}</p>` : ''}
      <p class="book-category">${escape(t(first.category))}${first.hidden ? ` · ${t(first.cleanupPending ? 'deletedStory' : 'hiddenReport')}` : ''}</p>
      ${list}
    </article>`;
  }).filter(Boolean);
  $('#catalog').innerHTML = cards.slice(0,state.archiveLimit).join('');
  $('#moreStories').hidden = cards.length <= state.archiveLimit;
  $('#destinationContext').innerHTML = state.author ? authorHeader(entries)
    : state.destination
    ? `<span role="status">${t('showingWorld')} <strong>${escape(worldName(state.destination))}</strong> <span class="result-count">${entries.length}</span></span>
      <div class="selection-actions"><button class="plain" type="button" id="shareSelection">${t('shareSelection')}</button>
      <button class="plain" type="button" id="clearDestination">${t('clearDestination')}</button><span id="selectionCopyStatus" role="status"></span></div>`
    : `<span role="status">${t('allWorldStories')} <span class="result-count">${entries.length}</span></span>`;
  const filtered = state.search || state.destination || state.type || state.category || state.rover || state.author;
  const activeFilters = [state.destination, state.type, state.category].filter(Boolean).length;
  $('#filterSummary').textContent = t('filters') + (activeFilters ? ` (${activeFilters})` : '');
  const empty = filtered ? 'noResults' : { created:'noCreated', readShelf:'noRead', libraryShelf:'noLibrary', followingShelf:'noFollowing' }[state.shelf] || 'noCommunity';
  $('#roverFilter').hidden = !state.rover;
  if (state.rover) $('#roverFilter').innerHTML = `<strong>${escape(state.rover)}</strong><button class="plain" type="button" id="clearRover">${t('clearRover')}</button>`;
  $('#catalogStatus').textContent = state.loadError ? t('store_unavailable') : entries.length ? '' : t(empty);
}

function fillSelect(select, choices, placeholder) {
  const previous = select.value;
  const blank = new Option(placeholder,'');
  select.replaceChildren(blank,...choices.map(([id,label]) => new Option(label,id)));
  if ([...select.options].some(option => option.value === previous)) select.value = previous;
}

function paintForm() {
  const destinations = worlds.map(world => [world.id, world[state.lang]]);
  fillSelect(form.elements.destination,destinations,t('choose'));
  fillSelect(form.elements.type,types.map(type => [type,t(type)]),t('choose'));
  fillSelect(form.elements.language,[['en','English'],['es','Español']],t('choose'));
  const roots = state.entries.filter(story => story.mine && story.seriesId === story.id);
  fillSelect(form.elements.seriesId,roots.map(story => [story.id,story.seriesName]),t(roots.length ? 'choose' : 'noSeries'));
  form.elements.format.querySelector('[value="continue"]').disabled = !roots.length;
  syncForm();
}

const fileSize = bytes => bytes < 1048576 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

function paintUploadHints() {
  const file = form.querySelector('input[name="document"]').files?.[0];
  $('#fileDrop').classList.toggle('has-file', Boolean(file));
  $('#fileName').textContent = file ? `${file.name} · ${fileSize(file.size)}` : '';
  $('#synopsisCount').textContent = `${form.elements.synopsis.value.length} / 240`;
}

function syncForm() {
  paintUploadHints();
  const format = form.elements.format.value;
  for (const [name, visible] of [['seriesName', format === 'new'], ['seriesId', format === 'continue'], ['sources', form.elements.category.value === 'nasa']]) {
    const input = form.elements[name];
    const parent = name === 'sources' ? $('#sourceBlock') : input.closest('label');
    parent.hidden = !visible;
    input.required = visible;
    input.disabled = !visible;
  }
}

function paintLanguage() {
  document.documentElement.lang = state.lang;
  coverPreview.alt = t('coverPreviewAlt');
  // The visible "EN / ES" stays part of the button's name; the hidden part says what it does.
  $('#language').innerHTML = `EN / ES<span class="sr"> · ${state.lang === 'en' ? 'Cambiar a español' : 'Switch to English'}</span>`;
  document.querySelectorAll('[data-t]').forEach(node => { node.textContent = t(node.dataset.t); });
  document.querySelectorAll('[data-label]').forEach(node => node.setAttribute('aria-label', t(node.dataset.label)));
  document.querySelectorAll('[data-placeholder]').forEach(node => { node.placeholder = t(node.dataset.placeholder); });
  document.querySelectorAll('[data-close]').forEach(node => node.setAttribute('aria-label',t('close')));
  $('#query').placeholder = t('search');
  $('#destinationFilter').setAttribute('aria-label',t('dest'));
  $('#typeFilter').setAttribute('aria-label',t('equipment'));
  $('#categoryFilter').setAttribute('aria-label',t('category'));
  fillSelect($('#destinationFilter'),worlds.map(w => [w.id,w[state.lang]]),t('allDest'));
  fillSelect($('#typeFilter'),types.map(type => [type,t(type)]),t('allType'));
  fillSelect($('#categoryFilter'),categories.map(category => [category,t(category)]),t('allCategory'));
  paintAtlas();
  paintPassport();
  paintArchive();
  paintForm();
  paintRovers();
  paintPublicationReceipt();
  paintPage();
}



function storyPath(id) { return pageLink(`/relato/${encodeURIComponent(id)}`,`#story=${encodeURIComponent(id)}`); }

function openStory(id, updateHash = true, tab = 'story') {
  const story = find(id);
  if (!story) return;
  if (!reader.open) state.readerReturnHash = location.hash.startsWith('#story=')
    ? pageLink('/relatos','#archive') : (demoMode ? location.hash || '#home' : location.pathname+location.search+location.hash);
  state.active = id;
  state.readerTab = tab;
  passport.record(id, 'open');
  if (updateHash && location.hash !== `#story=${id}`) history.replaceState(null,'',`#story=${encodeURIComponent(id)}`);
  paintPassport();
  paintReader(story);
  if (!reader.open) reader.showModal();
  reader.scrollTop = 0;
}

function paintReader(story) {
  releaseDemoFile();
  const parts = story.seriesId ? collection().filter(item => item.seriesId === story.seriesId).sort((a,b) => a.part-b.part) : [];
  const current = parts.findIndex(item => item.id === story.id);
  const wasRead = passport.read.has(story.id);
  const links = (story.sources || []).filter(link => officialUrl(link.url));
  const lang = story.language || state.lang;
  const file = story.document;
  const sourceList = links.length ? `<h3>${t('officialLinks')}</h3><ul class="source-list">${links.map(link => `<li><a target="_blank" rel="noopener noreferrer" href="${escape(link.url)}">${escape(link.label || new URL(link.url).hostname)} ↗</a></li>`).join('')}</ul>` : '';
  const science = story.science ? `<h3>${t('history')}</h3><p>${escape(local(story.science))}</p><h3>${t('state')}</h3><p>${escape(local(story.status))}</p>` : '';
  $('#readerContent').innerHTML = `<div class="dialog-inner reader-inner">
    <button type="button" class="close" data-close="reader" aria-label="${t('close')}">×</button>
    <p class="eyebrow">${escape(worldName(story.destination))} / ${t(story.category)}</p>
    <h2 id="readTitle" lang="${lang}">${escape(local(story.title))}</h2>
    <p class="reader-byline">${[author(story) ? `${t('by')} ${authorLink(story)}` : '',escape(summary(story)),languageLabel(lang),t(story.community ? 'communityShelf' : 'exampleLabel')].filter(Boolean).join(' · ')}</p>
    ${story.synopsis || story.blurb ? `<p class="reader-synopsis" lang="${escape(lang)}">${escape(local(story.synopsis || story.blurb))}</p>` : ''}
    ${storyActions(story)}
    <div class="reader-tools">
      <p class="story-id">${t('hash')} <code>${escape(story.id)}</code></p>
      <button type="button" class="plain" id="copyStoryLink">${t('shareStory')}</button>
      ${!demoMode && !story.mine && !story.hidden ? `<button type="button" class="plain" id="reportStory">${t('reportWork')}</button><a class="plain" href="/reportar?relato=${encodeURIComponent(story.id)}">${t('reportAuthor')}</a>` : ''}
      ${!demoMode && (story.mine || story.canDelete || moderator) ? `<button type="button" class="plain danger" data-delete-story="${escape(story.id)}">${t(story.cleanupPending ? 'retryDelete' : 'deleteStory')}</button>` : ''}
      <span id="copyStoryStatus" role="status"></span>
    </div>
    ${(story.tags || []).length ? `<div class="tag-list">${story.tags.map(tag => `<button type="button" class="plain" data-tag="${escape(tag)}">#${escape(tag)}</button>`).join('')}</div>` : ''}
    ${parts.length ? `<nav class="series-nav" aria-label="${t('chronology')}"><strong>${escape(local(story.seriesName))}</strong><ol>${parts.map(item => `<li>${item.id === story.id ? `<span aria-current="step">${escape(chapter(item))}</span>` : action(item.id,chapter(item),'plain')}</li>`).join('')}</ol></nav>` : ''}
    ${sourceList || science ? `<div class="reader-switch"><button class="plain" data-reader="story" aria-pressed="${state.readerTab === 'story'}">${t('storyTab')}</button><button class="plain" data-reader="mission" aria-pressed="${state.readerTab === 'mission'}">${t('missionTab')}</button></div>` : ''}
    ${state.readerTab === 'mission' ? `<section class="mission-record"><p class="muted">${t('referenceNote')}</p>${science}${sourceList}</section>` : `<section lang="${lang}">${file ? `<div class="document"><strong>${escape(file.name)}</strong><span>${file.extension.toUpperCase()} · ${Math.max(1,Math.ceil(file.size/1024)).toLocaleString()} KB</span><div id="documentActions" class="document-actions">${!demoMode && !story.cleanupPending ? `${file.extension === 'pdf' ? `<a class="text-link" href="/api/read/${encodeURIComponent(story.id)}" target="_blank" rel="noopener noreferrer">${t('openPDF')} ↗</a>` : ''}<a class="text-link" href="/api/documents/${encodeURIComponent(story.id)}">${t('download')}</a>` : ''}</div></div><div id="storyText" class="story-text story-prose" hidden></div><div id="pdfPages" class="pdf-pages" hidden></div><p id="documentStatus" class="muted reader-status" role="status">${t('loading')}</p>` : `<div class="story-text">${escape(local(story.body))}</div>`}</section>`}
    ${readerFooter(parts,current,wasRead)}
    ${commentsSection(story)}
  </div>`;
  if (!demoMode && story.community && !story.hidden) loadComments(story.id);
  if (file && state.readerTab === 'story') {
    const status = $('#documentStatus');
    if (story.cleanupPending) status.textContent = t('deleteCleanup');
    else if (file.extension !== 'pdf' || demoMode) loadDocument(story,status);
    else renderPdf(story,status);
  }
}

function readerFooter(parts, current, wasRead) {
  const previous = current > 0 ? parts[current-1] : null;
  const next = current >= 0 ? parts[current+1] : null;
  const mark = `<button type="button" class="outline" id="markRead" aria-pressed="${wasRead}">${wasRead ? `✓ ${t('markedRead')}` : t('markRead')}</button>`;
  return `<div class="read-footer">${previous ? action(previous.id,`← ${t('previousPart')}`) : ''}${mark}
      ${next ? action(next.id,`${t('nextPart')} →`,'primary') : ''}</div>`;
}

// ---- Interaction: echoes, library, following authors, comments and reading progress ----
const countLabel = (n, one, many) => `${n.toLocaleString(state.lang)} ${t(n === 1 ? one : many)}`;

function authorLink(story) {
  const name = escape(author(story));
  if (demoMode || !story.authorHandle || !name) return name;
  return `<a class="author-link" href="${pageLink(`/relatos#autor=${story.authorHandle}`, `#autor=${story.authorHandle}`)}">${name}</a>`;
}

async function loadSocial() {
  if (demoMode || !passport.scope || social.loaded) return;
  social.loaded = true;
  try {
    const response = await request('/api/social/me', { cache:'no-store', credentials:'same-origin' });
    const me = response.ok ? await response.json() : null;
    if (!me?.signedIn) { social.loaded = false; return; }
    Object.assign(social, { signedIn:true, handle:me.handle, echoed:new Set(me.echoed), saved:new Set(me.saved), following:new Set(me.following) });
    paintArchive();
    if (reader.open && state.active) paintStoryActions(find(state.active));
  } catch { social.loaded = false; }
}

// Reading progress stays on this device: the part of the story already passed, from 0 to 1.
const progressKey = 'echoes-reading-progress';
function readingProgress(id) {
  const value = storage.get(progressKey, {})[id];
  return typeof value === 'number' && value > .04 && value < .96 ? value : 0;
}
let progressTimer = 0;
function storySection() { return $('#storyText:not([hidden])') || $('#pdfPages:not([hidden])') || $('#readerContent .story-text'); }
function measureProgress() {
  const section = storySection();
  if (!section) return null;
  const box = section.getBoundingClientRect();
  const view = reader.getBoundingClientRect();
  if (box.height < view.height * .8) return null;
  return Math.max(0, Math.min(1, (view.top + view.height * .5 - box.top) / box.height));
}
reader.addEventListener('scroll', () => {
  if (!state.active || state.readerTab !== 'story' || progressTimer) return;
  progressTimer = setTimeout(() => {
    progressTimer = 0;
    const fraction = measureProgress();
    if (fraction === null || !state.active) return;
    const saved = storage.get(progressKey, {});
    saved[state.active] = Math.round(fraction * 1000) / 1000;
    const keys = Object.keys(saved);
    if (keys.length > 300) delete saved[keys[0]];
    storage.set(progressKey, saved);
  }, 700);
}, { passive:true });
function continueReading(fraction) {
  const section = storySection();
  if (!section) return;
  const box = section.getBoundingClientRect();
  const view = reader.getBoundingClientRect();
  reader.scrollTo({ top: reader.scrollTop + box.top - view.top - view.height * .5 + fraction * box.height, behavior: state.motion ? 'smooth' : 'auto' });
}

function storyActions(story) {
  if (demoMode || !story.community || story.hidden) return '';
  return `<div class="story-actions" id="storyActions">${storyActionsInner(story)}</div>`;
}
function storyActionsInner(story) {
  const echoed = social.echoed.has(story.id);
  const saved = social.saved.has(story.id);
  const progress = readingProgress(story.id);
  return `<button type="button" class="action-pill echo-button" data-echo="${escape(story.id)}" aria-pressed="${echoed}"${story.mine ? ` disabled title="${t('ownEcho')}"` : ` title="${t('echoHint')}"`}>
      <span class="echo-mark" aria-hidden="true"></span><span>${t(echoed ? 'echoed' : 'echoAction')}</span><span class="echo-count" aria-label="${countLabel(story.echoes || 0,'echoOne','echoMany')}">${(story.echoes || 0).toLocaleString(state.lang)}</span></button>
    <button type="button" class="action-pill" data-save="${escape(story.id)}" aria-pressed="${saved}"><span class="save-mark" aria-hidden="true"></span>${t(saved ? 'savedLibrary' : 'saveLibrary')}</button>
    <button type="button" class="action-link" data-jump-comments>${t('comments')} · ${(story.comments || 0).toLocaleString(state.lang)}</button>
    ${progress ? `<button type="button" class="action-link" data-continue="${progress}">${t('continueReading')} · ${Math.round(progress * 100)}%</button>` : ''}
    <p class="social-status" id="socialStatus" role="status"></p>`;
}
function paintStoryActions(story) {
  const box = $('#storyActions');
  if (box && story) box.innerHTML = storyActionsInner(story);
}
function needSignIn(key) {
  const status = $('#socialStatus') || $('#authorStatus');
  if (!status) return;
  status.innerHTML = `${t(key)} <a href="/signin?return_to=${encodeURIComponent(location.pathname + location.hash)}">${t('signIn')}</a>`;
}
function socialError(code) {
  const status = $('#socialStatus') || $('#authorStatus');
  if (status) status.textContent = t(code === 'login_required' ? 'socialLogin' : code) || t('uploadError');
}

async function socialPost(path, body) {
  const response = await request(`/api/social/${path}`, { method:'POST', credentials:'same-origin',
    headers: body ? { 'Content-Type':'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'uploadError');
  return payload;
}

async function toggleEcho(id) {
  const story = find(id);
  if (!story) return;
  if (!social.signedIn) { needSignIn('echoLogin'); return; }
  const was = social.echoed.has(id);
  was ? social.echoed.delete(id) : social.echoed.add(id);
  story.echoes = Math.max(0, (story.echoes || 0) + (was ? -1 : 1));
  paintStoryActions(story);
  $('#storyActions [data-echo]')?.focus();
  try {
    const result = await socialPost(`echo/${encodeURIComponent(id)}`);
    result.echoed ? social.echoed.add(id) : social.echoed.delete(id);
    story.echoes = result.echoes;
  } catch (failure) {
    was ? social.echoed.add(id) : social.echoed.delete(id);
    story.echoes = Math.max(0, (story.echoes || 0) + (was ? 1 : -1));
    paintStoryActions(story);
    socialError(failure.message);
    return;
  }
  paintStoryActions(story);
  $('#storyActions [data-echo]')?.focus();
  paintArchive();
}

async function toggleSaved(id) {
  const story = find(id);
  if (!story) return;
  if (!social.signedIn) { needSignIn('libraryLogin'); return; }
  try {
    const result = await socialPost(`library/${encodeURIComponent(id)}`);
    result.saved ? social.saved.add(id) : social.saved.delete(id);
  } catch (failure) { socialError(failure.message); return; }
  paintStoryActions(story);
  $('#storyActions [data-save]')?.focus();
  paintArchive();
}

async function loadAuthor(handle) {
  if (demoMode || !/^[a-f0-9]{12}$/.test(handle)) return;
  try {
    const response = await request(`/api/social/author/${handle}`, { cache:'no-store', credentials:'same-origin' });
    if (response.ok) social.authors.set(handle, await response.json());
  } catch {}
  if (state.author === handle) paintArchive();
}

function authorHeader(entries) {
  const data = social.authors.get(state.author);
  const name = data?.name || entries.find(story => story.byline)?.byline || t('authorEyebrow');
  const following = social.following.has(state.author) || data?.following;
  const stats = data ? [countLabel(data.stories,'storyOne','storyMany'), countLabel(data.echoes,'echoOne','echoMany'), countLabel(data.followers,'followerOne','followerMany')].join(' · ') : '';
  return `<div class="author-header">
    <p class="eyebrow">${t('authorEyebrow')}</p>
    <h3>${escape(name)}</h3>
    ${stats ? `<p class="author-stats">${stats}</p>` : ''}
    <div class="selection-actions">
      ${!demoMode && !data?.mine && state.author !== social.handle ? `<button type="button" class="action-pill" data-follow="${state.author}" aria-pressed="${Boolean(following)}">${t(following ? 'followingAuthor' : 'follow')}</button>` : ''}
      <button class="plain" type="button" id="clearAuthor">${t('clearAuthor')}</button>
      <span id="authorStatus" class="social-status" role="status"></span>
    </div>
  </div>`;
}

async function toggleFollow(handle) {
  if (!social.signedIn) { needSignIn('followLogin'); return; }
  try {
    const result = await socialPost(`author/${handle}`);
    result.following ? social.following.add(handle) : social.following.delete(handle);
    social.authors.set(handle, result);
  } catch (failure) { socialError(failure.message); return; }
  paintArchive();
  $(`[data-follow="${handle}"]`)?.focus();
}

function commentsSection(story) {
  if (demoMode || !story.community || story.hidden) return '';
  const name = storage.get('echoes-comment-name', '') || '';
  return `<section class="comments" id="comments" aria-labelledby="commentsTitle">
    <h3 id="commentsTitle">${t('comments')} <span class="comment-total" id="commentTotal">${(story.comments || 0).toLocaleString(state.lang)}</span></h3>
    ${passport.scope ? `<form id="commentForm" class="comment-form" data-story="${escape(story.id)}" novalidate>
      <label><span>${t('commentName')}</span><input name="name" maxlength="40" required autocomplete="nickname" value="${escape(name)}"></label>
      <label><span>${t('commentBody')}</span><textarea name="body" rows="3" maxlength="1000" required></textarea></label>
      <div class="comment-form-foot"><p class="field-help">${t('commentNote')}</p><button class="primary" type="submit">${t('commentPublish')}</button></div>
      <p class="social-status" id="commentStatus" role="status"></p>
    </form>` : `<p class="comment-login">${t('commentLogin')} <a href="/signin?return_to=${encodeURIComponent(storyPath(story.id))}">${t('signIn')}</a></p>`}
    <ol class="comment-list" id="commentList"></ol>
    <p class="muted" id="commentEmpty" hidden>${t('commentEmpty')}</p>
    <button type="button" class="plain" id="moreComments" hidden>${t('commentMore')}</button>
  </section>`;
}

function commentItem(comment) {
  const date = new Date(comment.createdAt);
  const actions = [comment.canDelete ? `<button type="button" class="plain" data-comment-delete="${escape(comment.id)}">${t('commentDelete')}</button>` : '',
    !comment.mine && social.signedIn ? `<button type="button" class="plain" data-comment-report="${escape(comment.id)}">${t('commentReport')}</button>` : ''].join('');
  return `<li class="comment" data-comment="${escape(comment.id)}">
    <p class="comment-head"><strong>${escape(comment.name)}</strong><time datetime="${date.toISOString()}">${escape(date.toLocaleDateString(state.lang, { day:'numeric', month:'short', year:'numeric' }))}</time></p>
    <p class="comment-body">${escape(comment.body)}</p>
    ${actions ? `<div class="comment-actions">${actions}</div>` : ''}
  </li>`;
}

async function loadComments(id, more = false) {
  if (!more) social.comments = { story:id, next:null };
  const query = more && social.comments.next ? `?before=${social.comments.next}` : '';
  try {
    const response = await request(`/api/social/comments/${encodeURIComponent(id)}${query}`, { cache:'no-store', credentials:'same-origin' });
    if (!response.ok || state.active !== id) return;
    const data = await response.json();
    const list = $('#commentList');
    if (!list) return;
    list.insertAdjacentHTML('beforeend', data.comments.map(commentItem).join(''));
    social.comments.next = data.next;
    $('#moreComments').hidden = !data.next;
    $('#commentEmpty').hidden = list.children.length > 0;
    const story = find(id);
    if (story && story.comments !== data.total) { story.comments = data.total; $('#commentTotal').textContent = data.total.toLocaleString(state.lang); paintStoryActions(story); }
  } catch {}
}

const commentReasons = ['spam','harassment','hate','sexual','spoiler','other'];
document.addEventListener('click', async event => {
  const control = event.target.closest('button');
  if (!control || !reader.contains(control) && !$('#archive')?.contains(control)) return;
  const { echo, save, follow, commentDelete, commentReport, commentReason, continue: progress } = control.dataset;
  if (echo) toggleEcho(echo);
  if (save) toggleSaved(save);
  if (follow) toggleFollow(follow);
  if (progress) continueReading(Number(progress));
  if ('jumpComments' in control.dataset) { $('#comments')?.scrollIntoView({ behavior: state.motion ? 'smooth' : 'auto' }); ($('#commentForm textarea') || $('#comments h3'))?.focus({ preventScroll:true }); }
  if (control.id === 'moreComments' && state.active) loadComments(state.active, true);
  if (control.id === 'clearAuthor') { browse(); $('#query').focus({ preventScroll:true }); }
  if (commentDelete) {
    try { await socialPost(`comments/${commentDelete}/delete`); } catch (failure) { $('#commentStatus') && ($('#commentStatus').textContent = t(failure.message)); return; }
    control.closest('.comment')?.remove();
    const story = find(state.active);
    if (story) { story.comments = Math.max(0, (story.comments || 0) - 1); $('#commentTotal').textContent = story.comments.toLocaleString(state.lang); paintStoryActions(story); }
    $('#commentEmpty').hidden = $('#commentList').children.length > 0;
  }
  if (commentReport) {
    const box = control.closest('.comment-actions');
    box.innerHTML = `<label class="report-inline"><span class="sr">${t('reportReason')}</span><select>${commentReasons.map(reason => `<option value="${reason}">${t(`commentReason_${reason}`)}</option>`).join('')}</select></label>
      <button type="button" class="plain" data-comment-reason="${escape(commentReport)}">${t('reportSend')}</button>`;
    box.querySelector('select').focus();
  }
  if (commentReason) {
    const box = control.closest('.comment-actions');
    try {
      await socialPost(`comments/${commentReason}/report`, { reason: box.querySelector('select').value });
      box.innerHTML = `<span class="social-status" role="status">${t('commentReported')}</span>`;
    } catch (failure) { box.insertAdjacentHTML('beforeend', `<span class="social-status" role="status">${escape(t(failure.message))}</span>`); }
  }
});

document.addEventListener('submit', async event => {
  if (event.target.id !== 'commentForm') return;
  event.preventDefault();
  const commentForm = event.target;
  const id = commentForm.dataset.story;
  const status = $('#commentStatus');
  const name = commentForm.elements.name.value.trim();
  const body = commentForm.elements.body.value.trim();
  if (!name || !body) { status.textContent = t('comment_fields'); return; }
  const button = commentForm.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const { comment } = await socialPost(`comments/${encodeURIComponent(id)}`, { name, body });
    storage.set('echoes-comment-name', name);
    commentForm.elements.body.value = '';
    status.textContent = t('commentPublished');
    $('#commentList').insertAdjacentHTML('afterbegin', commentItem(comment));
    $('#commentEmpty').hidden = true;
    const story = find(id);
    if (story) { story.comments = (story.comments || 0) + 1; $('#commentTotal').textContent = story.comments.toLocaleString(state.lang); paintStoryActions(story); }
  } catch (failure) { status.textContent = t(failure.message === 'login_required' ? 'socialLogin' : failure.message); }
  finally { button.disabled = false; }
});

function releaseDemoFile() {
  const link = $('#documentActions [data-demo-file]');
  if (link) URL.revokeObjectURL(link.href);
}

function renderProse(text, extension) {
  const inline = value => escape(value)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g,'$1<em>$2</em>')
    .replace(/(^|\W)_(?!\s)(.+?)_(?=\W|$)/g,'$1<em>$2</em>');
  const markdown = extension === 'md';
  return text.replace(/\r\n?/g,'\n').split(/\n{2,}/).map(block => block.trim()).filter(Boolean).map(block => {
    if (markdown) {
      const heading = block.match(/^(#{1,3})\s+(.+)$/);
      if (heading) return `<h${heading[1].length + 2}>${inline(heading[2])}</h${heading[1].length + 2}>`;
      if (/^(-{3,}|\*{3,})$/.test(block)) return '<hr>';
      if (block.startsWith('>')) return `<blockquote>${inline(block.replace(/^>\s?/gm,'')).replace(/\n/g,'<br>')}</blockquote>`;
      return `<p>${inline(block).replace(/\n/g,'<br>')}</p>`;
    }
    return `<p>${escape(block).replace(/\n/g,'<br>')}</p>`;
  }).join('');
}

let pdfjsLoader;
async function renderPdf(story, status) {
  const host = $('#pdfPages');
  try {
    pdfjsLoader ??= import('/vendor/pdf.min.mjs').then(lib => {
      lib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.mjs';
      return lib;
    });
    const pdfjs = await pdfjsLoader;
    const pdf = await pdfjs.getDocument({ url:`/api/read/${encodeURIComponent(story.id)}`, isEvalSupported:false, disableAutoFetch:true }).promise;
    if (!host.isConnected || state.active !== story.id) return;
    host.hidden = false;
    status.textContent = `${pdf.numPages} ${t(pdf.numPages === 1 ? 'pdfPage' : 'pdfPages')}`;
    const pages = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const base = page.getViewport({ scale:1 });
      const frame = document.createElement('div');
      frame.className = 'pdf-page';
      frame.style.aspectRatio = `${base.width} / ${base.height}`;
      frame.dataset.page = number;
      frame.setAttribute('aria-label', `${t('pdfPageLabel')} ${number}`);
      host.append(frame);
      pages.push([frame, page]);
    }
    const draw = async (frame, page) => {
      if (frame.dataset.drawn) return;
      frame.dataset.drawn = '1';
      const width = frame.clientWidth || host.clientWidth;
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / page.getViewport({ scale:1 }).width) * ratio });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      frame.append(canvas);
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    };
    const watcher = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        const found = pages.find(([frame]) => frame === entry.target);
        if (found) { watcher.unobserve(entry.target); void draw(...found); }
      }
    }, { root: reader, rootMargin: '600px 0px' });
    pages.forEach(([frame]) => watcher.observe(frame));
  } catch {
    if (status.isConnected) status.textContent = t('pdfError');
  }
}

async function loadDocument(story, status) {
  try {
    const path = demoMode ? '/api/documents/' : '/api/read/';
    const response = await request(path+encodeURIComponent(story.id));
    if (!response.ok) throw new Error('Reading copy unavailable');
    const textFile = story.document.extension !== 'pdf';
    const localFile = demoMode ? await response.blob() : null;
    const content = textFile ? (demoMode ? await localFile.text() : (await response.json()).text) : '';
    if (!status.isConnected || !reader.open || state.active !== story.id) return;
    if (textFile) {
      const pane = $('#storyText');
      pane.innerHTML = renderProse(content, story.document.extension);
      pane.hidden = false;
    }
    if (localFile) {
      const link = document.createElement('a');
      link.className = 'outline';
      link.href = URL.createObjectURL(new Blob([localFile],{type:story.document.mime}));
      link.download = story.document.name;
      link.textContent = t('download');
      link.dataset.demoFile = '';
      $('#documentActions').append(link);
    }
    status.hidden = true;
  } catch { if (status.isConnected) status.textContent = t('fileError'); }
}

function openDelete(id, title) {
  deletingStory = id;
  $('#deleteStoryTitle').textContent = title;
  $('#deleteStatus').textContent = '';
  deleteDialog.showModal();
}
$('#cancelDelete').addEventListener('click', () => deleteDialog.close());
deleteDialog.addEventListener('cancel', event => {
  if (deleteForm.querySelector('[type="submit"]').disabled) event.preventDefault();
});
deleteForm.addEventListener('submit',async event => {
  event.preventDefault();
  const button = deleteForm.querySelector('[type="submit"]');
  if (button.disabled) return;
  const id = deletingStory;
  const status = $('#deleteStatus');
  button.disabled = true;
  $('#cancelDelete').disabled = true;
  status.textContent = t('loading');
  try {
    const path = '/api/stories/'+encodeURIComponent(id)+'/delete';
    const response = await request(path,{method:'POST'});
    if (!response.ok) {
      const {error} = await response.json();
      status.textContent = t(error === 'deleteCleanup' ? error : 'deleteError');
      return;
    }
    deletedInSession.add(id);
    state.entries = state.entries.filter(story => story.id !== id);
    if (state.publishedId === id) {
      state.publishedId = null;
      paintPublicationReceipt();
    }
    deleteDialog.close();
    if (reader.open && state.active === id) reader.close();
    await refreshCatalog();
    if (moderationDialog.open) {
      await loadReports();
      $('#moderationStatus').textContent = t('deleteDone');
    } else {
      paintAtlas();
      paintPassport();
      paintArchive();
      paintForm();
      paintRovers();
      $('#catalogStatus').textContent = t('deleteDone');
    }
  } catch { status.textContent = t('deleteError'); }
  finally {
    button.disabled = false;
    $('#cancelDelete').disabled = false;
  }
});

function openReport(story) {
  if (!story) return;
  reportingStory = story.id;
  reportForm.reset();
  $('#reportStoryTitle').textContent = local(story.title);
  $('#reportStatus').textContent = '';
  reportForm.hidden = !passport.scope;
  $('#reportLogin').hidden = Boolean(passport.scope);
  $('#reportSignIn').href = '/signin?return_to=' + encodeURIComponent('/relatos#story='+story.id);
  reportDialog.showModal();
}

reportForm.addEventListener('submit', async event => {
  event.preventDefault();
  const button = reportForm.querySelector('[type="submit"]');
  if (button.disabled) return;
  button.disabled = true;
  const status = $('#reportStatus');
  status.textContent = t('loading');
  try {
    const data = Object.fromEntries(new FormData(reportForm));
    const response = await request('/api/reports/'+encodeURIComponent(reportingStory),{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)
    });
    const result = await response.json();
    status.textContent = t(response.ok ? 'reportSaved' : result.error || 'reportError');
    if (response.ok || response.status === 409) reportForm.hidden = true;
    if (response.status === 401) {
      reportForm.hidden = true;
      $('#reportLogin').hidden = false;
    }
  } catch { status.textContent = t('reportError'); }
  finally { button.disabled = false; }
});

async function loadReports(offset = 0) {
  const ticket = ++moderationRequest;
  const status = $('#moderationStatus');
  const list = $('#reportList');
  const more = $('#moreReports');
  more.hidden = true;
  if (!offset) list.replaceChildren();
  status.textContent = t('loading');
  document.querySelectorAll('[data-report-tab]').forEach(button =>
    button.setAttribute('aria-pressed',String(button.dataset.reportTab === moderationTab)));
  try {
    const response = await request('/api/moderation?status='+moderationTab+'&offset='+offset);
    if (!response.ok) throw new Error('Reports unavailable');
    const { reports,next } = await response.json();
    if (ticket !== moderationRequest) return;
    const items = reports.map(item => {
      const id = escape(item.id);
      const label = item.hidden ? 'restoreReported' : 'hideReported';
      const type = item.hidden ? 'restore' : 'hide';
      const story = item.hidden || item.deleted_at ? escape(item.title) :
        `<a href="/relatos#story=${encodeURIComponent(item.story_id)}">${escape(item.title)}</a>`;
      const date = new Intl.DateTimeFormat(state.lang,{dateStyle:'medium',timeStyle:'short'}).format(item.created_at);
      return `<article class="report-item"><h3>${story}</h3>
        <p class="muted">${escape(item.byline || '')} · ${escape(date)}${item.deleted_at ? ' · '+t('deletedStory') : item.hidden ? ' · '+t('hiddenReport') : ''}</p>
        <p><strong>${escape(t(item.reason))}</strong></p>
        ${item.details ? `<p class="report-details">${escape(item.details)}</p>` : ''}
        <div class="moderation-tabs">${!item.deleted_at && item.has_file ? `<a class="plain" href="/api/documents/${encodeURIComponent(item.story_id)}">${t('download')}</a>` : ''}
          ${item.reviewed_at ? '' : `<button class="outline" type="button" data-report-action="review" data-report-id="${id}">${t('reviewReport')}</button>`}
          ${!item.deleted_at ? `<button class="outline" type="button" data-report-action="${type}" data-report-id="${id}">${t(label)}</button>` : ''}
          ${!item.deleted_at || item.has_file ? `<button class="plain danger" type="button" data-delete-story="${escape(item.story_id)}">${t(item.deleted_at ? 'retryDelete' : 'deleteStory')}</button>` : ''}</div></article>`;
    });
    list.insertAdjacentHTML('beforeend',items.join(''));
    status.textContent = !offset && !items.length ? t('noReports') : '';
    nextReportPage = next;
    more.hidden = next === null;
  } catch { if (ticket === moderationRequest) status.textContent = t('reportError'); }
}

$('#openModeration').addEventListener('click', () => {
  accountMenu.open = false;
  moderationTab = 'pending';
  moderationDialog.showModal();
  void loadReports();
});
$('#moreReports').addEventListener('click', () => {
  if (Number.isSafeInteger(nextReportPage)) void loadReports(nextReportPage);
});
moderationDialog.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.reportTab) {
    moderationTab = button.dataset.reportTab;
    void loadReports();
  }
  if (!button.dataset.reportAction || button.disabled) return;
  button.disabled = true;
  try {
    const response = await request('/api/moderation',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:button.dataset.reportId,action:button.dataset.reportAction})
    });
    if (!response.ok) throw new Error('Moderation failed');
    await Promise.all([loadReports(),refreshCatalog()]);
  } catch { $('#moderationStatus').textContent = t('reportError'); }
  finally { button.disabled = false; }
});

async function refreshModerator() {
  if (demoMode || !passport.scope) return;
  try {
    const response = await request('/api/moderator',{cache:'no-store'});
    moderator = response.ok && (await response.json()).moderator === true;
  } catch { moderator = false; }
  paintHeaderAccount();
}

function showUploadStatus(code) {
  const status = $('#uploadStatus');
  status.textContent = t(code);
  if (code === 'login_required') {
    const link = document.createElement('a');
    link.href = '/signin?return_to=%2Frelatos%23submit';
    link.target = '_top';
    link.textContent = t('signIn');
    status.append(' ',link);
  }
}

function browse({ destination = '', search = '', rover = '', author = '', preserveHash = false } = {}) {
  const type = rover ? 'rover' : '';
  Object.assign(state,{ shelf:'all', search, category:'', type, rover, author });
  if (author) loadAuthor(author);
  $('#query').value = search;
  $('#typeFilter').value = type;
  $('#categoryFilter').value = '';
  $('#filterOptions').open = Boolean(destination);
  selectMapDestination(destination,{ resetRover:false });
  if (!preserveHash) {
    const archive = pageLink('/relatos','#archive');
    if (archive !== location.pathname+location.hash) history.pushState(null,'',archive);
    if (demoMode) document.documentElement.dataset.atlasPage = 'stories';
    paintPage();
  }
  $('#archive').scrollIntoView({ behavior:'auto' });
}

function selectMapDestination(destination, { resetRover = true, phase = '' } = {}) {
  state.voyagerPhase = phase;
  state.destination = destination;
  state.mapSelection = destination ? worlds.findIndex(world => world.id === destination) : null;
  state.archiveLimit = 5;
  if (resetRover && state.rover) {
    state.rover = '';
    state.type = '';
    $('#typeFilter').value = '';
  }
  $('#destinationFilter').value = destination;
  paintSolarMap();
  paintArchive();
}

function openUploader(rover, mission) {
  if (!form.elements.language.value) form.elements.language.value = state.lang;
  if (mission) {
    form.elements.destination.value = mission.destination;
    form.elements.type.value = mission.type;
    form.elements.hardware.value = mission.name;
  }
  if (rover) {
    form.elements.destination.value = 'mars';
    form.elements.type.value = 'rover';
    form.elements.hardware.value = rover;
  }
  paintUploadAccess();
  if (!uploader.open) uploader.showModal();
}

function paintUploadAccess() {
  const needsSignIn = !demoMode && passport.status === 'guest';
  $('#uploadLogin').hidden = !needsSignIn;
  $('#uploadFields').hidden = needsSignIn;
}

function resetCoverPreview() {
  if (previewCoverURL) URL.revokeObjectURL(previewCoverURL);
  previewCoverURL = undefined;
  coverPreviewReady = undefined;
  coverPreview.removeAttribute('src');
  coverPreview.hidden = true;
  $('#clearCover').hidden = true;
  $('#coverStatus').textContent = '';
}

coverInput.addEventListener('change', () => {
  resetCoverPreview();
  coverInput.setCustomValidity('');
  const file = coverInput.files[0];
  if (!file) return;
  $('#clearCover').hidden = false;
  coverPreviewReady = previewSelectedCover(file);
});

async function previewSelectedCover(file) {
  const info = await inspectCover(file);
  if (coverInput.files[0] !== file) return false;
  if (info.error) {
    $('#coverStatus').textContent = t(info.error);
    coverInput.setCustomValidity(t(info.error));
    return false;
  }
  coverInput.setCustomValidity('');
  previewCoverURL = URL.createObjectURL(file);
  coverPreview.src = previewCoverURL;
  try {
    await coverPreview.decode();
    if (coverInput.files[0] !== file) return false;
    coverPreview.hidden = false;
    return true;
  } catch {
    if (coverInput.files[0] !== file) return false;
    $('#coverStatus').textContent = t('invalid_cover');
    coverInput.setCustomValidity(t('invalid_cover'));
    return false;
  }
}

$('#clearCover').addEventListener('click', () => {
  coverInput.value = '';
  coverInput.setCustomValidity('');
  resetCoverPreview();
  coverInput.focus();
});
$('#catalog').addEventListener('error', event => {
  if (event.target.matches('.book-cover img')) event.target.hidden = true;
}, true);

document.addEventListener('click', event => {
  const control = event.target.closest('button');
  if (!control) return;
  const { story, coverWorld, mapWorld, cycle, jump, shelf, tag, close, browse: destination, reader: tab } = control.dataset;
  if (story) openStory(story);
  if (cycle !== undefined) chooseWorld(state.selected + Number(cycle));
  if (coverWorld !== undefined) {
    chooseWorld(Number(coverWorld));
    $('#launchPagination [aria-pressed="true"]')?.focus({ preventScroll:true });
  }
  if (mapWorld !== undefined) {
    const scope = control.closest('#mapRoster') ? '#mapRoster' : '#solarPlot';
    selectMapDestination(worlds[Number(mapWorld)].id);
    $(`${scope} [data-map-world="${mapWorld}"]`)?.focus({ preventScroll:true });
  }
  if (control.id === 'reportStory') openReport(find(state.active));
  if (control.dataset.deleteStory) {
    const id = control.dataset.deleteStory;
    const story = find(id);
    openDelete(id, story ? local(story.title) : control.closest('.report-item')?.querySelector('h3')?.textContent || '');
  }
  if (control.dataset.voyager) {
    const step = control.dataset.voyager;
    const scope = control.closest('#mapMission') ? '#mapMission' : '#solarPlot';
    selectMapDestination(step === 'heliopause' ? '' : step,{ phase:step });
    $(`${scope} [data-voyager="${step}"]`)?.focus({ preventScroll:true });
  }
  if (jump !== undefined) navigateAtlas(`#planet=${worlds[Number(jump)].id}`);
  if (control.id === 'copyStoryLink') void copyLink(storyPath(state.active),$('#copyStoryStatus'));
  if (control.id === 'sharePublished') void copyLink(storyPath(state.publishedId),$('#publicationCopy'));
  if (control.id === 'shareSelection') {
    const hash = state.rover ? `#rover=${state.rover.toLowerCase()}` : `#planet=${state.destination}`;
    void copyLink(addressFor(hash),$('#selectionCopyStatus'),'selectionLink');
  }
  if (shelf) {
    state.shelf = shelf;
    state.archiveLimit = 5;
    paintArchive();
    $(`[data-shelf="${shelf}"]`)?.focus();
  }
  if (control.id === 'clearDestination') {
    selectMapDestination('');
    if (/^#(?:explore$|(?:planet|rover)=)/.test(location.hash)) history.replaceState(null,'',pageLink('/relatos','#archive'));
    $('#destinationContext').focus({ preventScroll:true });
  }
  if (control.id === 'moreStories') {
    const firstNew = state.archiveLimit;
    state.archiveLimit += 5;
    paintArchive();
    $('#catalog').children[firstNew]?.querySelector('button')?.focus();
  }
  if (destination) browse({ destination });
  if (control.dataset.rover) {
    navigateAtlas(`#rover=${control.dataset.rover.toLowerCase()}`);
  }
  if (control.id === 'clearRover') {
    browse();
    $('#query').focus({ preventScroll:true });
  }
  if (tag !== undefined) { reader.close(); browse({ search:`#${tag}` }); }
  if (tab && state.active) { state.readerTab = tab; paintReader(find(state.active)); $(`[data-reader="${tab}"]`)?.focus(); }
  if (close) document.getElementById(close).close();
  if (control.id === 'markRead' && state.active) {
    passport.record(state.active, passport.read.has(state.active) ? 'unread' : 'read');
    refreshReadButton();
  }
  if ('upload' in control.dataset) {
    openUploader(control.dataset.uploadRover, missions[Number(control.dataset.uploadMission)]);
  }
});

async function copyLink(path, status, label = 'storyLink') {
  if (!status) return;
  const url = new URL(path, location.href).href;
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = t('copiedStory');
  } catch {
    const input = document.createElement('input');
    input.type = 'url';
    input.readOnly = true;
    input.value = url;
    input.setAttribute('aria-label', t(label));
    status.replaceChildren(input);
    input.select();
  }
}

function refreshReadButton() {
  const button = $('#markRead');
  if (!button || !state.active) return;
  const marked = passport.read.has(state.active);
  button.setAttribute('aria-pressed', String(marked));
  button.textContent = marked ? `✓ ${t('markedRead')}` : t('markRead');
  button.title = marked ? t('undoRead') : '';
}

$('#language').addEventListener('click', () => {
  state.lang = state.lang === 'en' ? 'es' : 'en';
  storage.set('echoes-atlas-language',state.lang);
  paintLanguage();
});
{
  const scene = $('#slides');
  let swipe;
  scene.addEventListener('pointerdown', event => {
    if (!event.target.closest('button,a')) swipe = { id:event.pointerId,x:event.clientX,y:event.clientY };
  });
  scene.addEventListener('pointerup', event => {
    if (swipe?.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)*1.35) chooseWorld(state.selected + (dx > 0 ? -1 : 1));
    swipe = null;
  });
  scene.addEventListener('pointercancel', () => { swipe = null; });
}
$('#slides').addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  chooseWorld(state.selected + (event.key === 'ArrowLeft' ? -1 : 1));
  if (event.target.dataset.coverWorld !== undefined) {
    $('#launchPagination [aria-pressed="true"]')?.focus({ preventScroll:true });
  }
});
$('#discover').addEventListener('click', () => {
  const next = collection().find(story => !passport.read.has(story.id));
  if (next) openStory(next.id);
  else $('#passportCount').textContent = t('noUnread');
});

for (const [id,key] of [['#query','search'],['#destinationFilter','destination'],['#typeFilter','type'],['#categoryFilter','category']]) {
  $(id).addEventListener(id === '#query' ? 'input' : 'change', event => {
    if (key === 'destination') {
      selectMapDestination(event.target.value);
      return;
    }
    state[key] = event.target.value;
    state.archiveLimit = 5;
    if (key === 'type') state.rover = '';
    paintArchive();
  });
}
// A PDF can carry the writer's real name in its properties (Author, Creator…) even when the story
// is published under a pen name. Before upload those values are overwritten with spaces in place,
// so every byte offset in the file stays valid. Properties inside compressed object streams are not reachable.
async function scrubPdf(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const text = new TextDecoder('latin1').decode(bytes);
  let changed = false;
  const blank = (start, end) => { if (end > start) { bytes.fill(0x20, start, end); changed = true; } };
  for (const key of ['/Author', '/Creator', '/Producer', '/Subject', '/Keywords']) {
    for (let at = text.indexOf(key); at !== -1; at = text.indexOf(key, at + key.length)) {
      let index = at + key.length;
      if (/[A-Za-z0-9]/.test(text[index] || '')) continue;
      while (' \r\n\t\f\0'.includes(text[index]) && index < text.length) index++;
      if (text[index] === '(') {
        let depth = 0, end = index;
        for (; end < text.length && end - index < 4096; end++) {
          if (text[end] === '\\') { end++; continue; }
          if (text[end] === '(') depth++;
          else if (text[end] === ')' && --depth === 0) break;
        }
        if (text[end] === ')') blank(index + 1, end);
      } else if (text[index] === '<' && text[index + 1] !== '<') {
        const end = text.indexOf('>', index);
        if (end !== -1 && end - index < 8192) blank(index + 1, end);
      }
    }
  }
  for (let at = text.indexOf('<x:xmpmeta'); at !== -1; at = text.indexOf('<x:xmpmeta', at + 1)) {
    const end = text.indexOf('</x:xmpmeta>', at);
    if (end === -1) break;
    blank(at, end + '</x:xmpmeta>'.length);
  }
  return changed ? new File([bytes], file.name, { type: file.type || 'application/pdf' }) : file;
}

// Header search: reads the stories already loaded in the page, so typing never calls the server.
const searchDialog = $('#searchDialog');
function tallySearch(values) {
  const found = new Map();
  for (const value of values) {
    if (!value) continue;
    const key = normalize(value);
    const entry = found.get(key) || { label: value, count: 0 };
    entry.count += 1;
    found.set(key, entry);
  }
  return [...found.values()];
}

function paintSiteSearch() {
  const raw = $('#siteSearch').value.trim();
  const stories = collection();
  const results = $('#siteResults');
  if (!raw) {
    results.innerHTML = stories.length ? '' : `<p class="search-empty">${t('searchEmptyArchive')}</p>`;
    return;
  }
  const query = parseSearch(raw);
  const found = stories.filter(story => storyMatches(story, query));
  const authors = query.tag !== undefined ? [] : tallySearch(stories.map(author)).filter(item => normalize(item.label).includes(query.text)).slice(0, 4);
  const tags = tallySearch(stories.flatMap(story => story.tags || [])).filter(item => normalize(item.label).startsWith(query.tag ?? query.text)).slice(0, 6);
  const count = n => `${n} ${t(n === 1 ? 'searchOneStory' : 'searchManyStories')}`;
  const item = (attributes, title, meta) => `<li><button type="button" ${attributes}><span class="result-title">${title}</span><span class="result-meta">${meta}</span></button></li>`;
  const group = (title, items) => items.length ? `<section><h3>${t(title)}</h3><ul>${items.join('')}</ul></section>` : '';
  const html = [
    group('searchStories', found.slice(0, 6).map(story => item(`data-story="${escape(story.id)}"`, escape(local(story.title)), escape([author(story), worldName(story.destination)].filter(Boolean).join(' · '))))),
    group('searchAuthors', authors.map(entry => item(`data-search-query="${escape(entry.label)}"`, escape(entry.label), count(entry.count)))),
    group('searchTags', tags.map(entry => item(`data-search-query="#${escape(entry.label)}"`, `#${escape(entry.label)}`, count(entry.count))))
  ].join('');
  results.innerHTML = html
    ? html + (found.length ? `<button type="button" class="search-all" data-search-query="${escape(raw)}">${t('searchAll')} (${found.length}) →</button>` : '')
    : `<p class="search-empty">${t('searchNone')}</p>`;
}

$('#openSearch').addEventListener('click', () => {
  paintSiteSearch();
  searchDialog.showModal();
  $('#siteSearch').select();
});
$('#siteSearch').addEventListener('input', paintSiteSearch);
// "/" opens the search from anywhere, unless the visitor is typing or another window is open.
document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
  if (event.target.closest?.('input, textarea, select, [contenteditable="true"]') || document.querySelector('dialog[open]')) return;
  event.preventDefault();
  $('#openSearch').click();
});
$('#siteSearchForm').addEventListener('submit', event => {
  event.preventDefault();
  const value = $('#siteSearch').value.trim();
  searchDialog.close();
  browse({ search: value });
});
searchDialog.addEventListener('click', event => {
  if (event.target === searchDialog) { searchDialog.close(); return; }
  const control = event.target.closest('button');
  if (!control || control.dataset.close) return;
  // A story result closes the search first; the page-wide handler then opens the reader.
  if (control.dataset.story) searchDialog.close();
  if (control.dataset.searchQuery !== undefined) {
    searchDialog.close();
    browse({ search: control.dataset.searchQuery });
  }
});

form.addEventListener('change',syncForm);
form.addEventListener('input', event => { if (event.target.name === 'synopsis') paintUploadHints(); });
{
  const drop = $('#fileDrop');
  for (const name of ['dragenter','dragover']) drop.addEventListener(name, () => drop.classList.add('dragging'));
  for (const name of ['dragleave','drop']) drop.addEventListener(name, () => drop.classList.remove('dragging'));
}
form.addEventListener('submit',async event => {
  event.preventDefault();
  const button = $('#publish');
  if (button.disabled) return;
  const data = new FormData(form);
  const metadata = fromMultipart(data);
  if (metadata.error) { showUploadStatus(metadata.error); return; }
  button.disabled = true;
  showUploadStatus('uploading');
  try {
    const documentInfo = await inspectDocument(data.get('document'));
    if (documentInfo.error) { showUploadStatus(documentInfo.error); return; }
    if (documentInfo.value.extension === 'pdf') data.set('document', await scrubPdf(data.get('document')));
    const coverInfo = await inspectCover(data.get('cover'));
    if (coverInfo.error) { showUploadStatus(coverInfo.error); return; }
    if (coverInfo.value && !(await coverPreviewReady)) { showUploadStatus('invalid_cover'); return; }
    const response = await request('/api/stories',{ method:'POST',body:data,credentials:'same-origin' });
    const payload = await response.json();
    if (!response.ok) { showUploadStatus(payload.error || 'uploadError'); return; }
    state.entries = [payload.story,...state.entries.filter(story => story.id !== payload.story.id)];
    state.publishedId = payload.story.id;
    form.reset();
    syncForm();
    resetCoverPreview();
    uploader.close();
    browse();
    state.shelf = 'created';
    paintArchive();
    paintForm();
    paintAtlas();
    paintRovers();
    paintPublicationReceipt();
    $('#publicationReceipt button')?.focus({ preventScroll:true });
  } catch { showUploadStatus('uploadError'); }
  finally { button.disabled = false; }
});

// ---- Ambient sound ----
// Composed live in the browser with Web Audio: slow chords, distant chimes and a soft reverb.
// Nothing is recorded or downloaded, so there are no rights to clear. It starts with the visitor's
// first click or key (browsers block sound before that), stays quiet, and drops further while reading.
const ambient = { on: storage.get('echoes-ambient', true) !== false, context: null, master: null, timers: [], playing: false };
const AMBIENT_LEVEL = .2;
const midi = note => 440 * 2 ** ((note - 69) / 12);
const ambientChords = [[50,57,62,64,69],[46,53,58,62,65],[43,50,55,59,62],[45,52,57,61,64]];
const ambientChimes = [74,76,78,81,83,86,88];

function ambientImpulse(context, seconds, decay) {
  const length = context.sampleRate * seconds;
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < length; index++) data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** decay;
  }
  return buffer;
}

function ambientTarget() { return ambient.on && !document.hidden ? AMBIENT_LEVEL * (reader.open ? .55 : 1) : 0; }
function ambientFade(seconds = 2.5) {
  if (!ambient.context) return;
  const gain = ambient.master.gain;
  const now = ambient.context.currentTime;
  gain.cancelScheduledValues(now);
  gain.setValueAtTime(gain.value, now);
  gain.linearRampToValueAtTime(ambientTarget(), now + seconds);
}

function ambientChord(index) {
  const context = ambient.context;
  const now = context.currentTime;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(520, now);
  filter.frequency.linearRampToValueAtTime(900, now + 9);
  filter.frequency.linearRampToValueAtTime(560, now + 20);
  filter.connect(ambient.bus);
  for (const note of ambientChords[index % ambientChords.length]) {
    for (const [type, detune] of [['sine', -4], ['triangle', 5]]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = midi(note);
      oscillator.detune.value = detune;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(type === 'sine' ? .05 : .022, now + 6);
      gain.gain.setValueAtTime(type === 'sine' ? .05 : .022, now + 14);
      gain.gain.linearRampToValueAtTime(0, now + 22);
      oscillator.connect(gain).connect(filter);
      oscillator.start(now);
      oscillator.stop(now + 22.5);
    }
  }
}

function ambientChime() {
  const context = ambient.context;
  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const pan = context.createStereoPanner ? context.createStereoPanner() : null;
  oscillator.type = 'sine';
  oscillator.frequency.value = midi(ambientChimes[Math.floor(Math.random() * ambientChimes.length)]);
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(.022, now + .04);
  gain.gain.exponentialRampToValueAtTime(.0001, now + 5);
  if (pan) { pan.pan.value = Math.random() * 1.4 - .7; oscillator.connect(gain).connect(pan).connect(ambient.bus); }
  else oscillator.connect(gain).connect(ambient.bus);
  oscillator.start(now);
  oscillator.stop(now + 5.2);
}

function ambientLoop() {
  let chord = 0;
  const chords = () => { if (ambient.playing) ambientChord(chord++); ambient.timers[0] = setTimeout(chords, 15000); };
  const chimes = () => { if (ambient.playing && Math.random() < .8) ambientChime(); ambient.timers[1] = setTimeout(chimes, 2800 + Math.random() * 5200); };
  chords();
  ambient.timers[1] = setTimeout(chimes, 4000);
}

function startAmbient() {
  if (!ambient.on) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!ambient.context) {
    const context = new AudioContextClass();
    const master = context.createGain();
    const bus = context.createGain();
    const reverb = context.createConvolver();
    const wet = context.createGain();
    const tone = context.createBiquadFilter();
    master.gain.value = 0;
    reverb.buffer = ambientImpulse(context, 5, 2.4);
    wet.gain.value = .6;
    tone.type = 'lowpass';
    tone.frequency.value = 2400;
    bus.connect(master);
    bus.connect(reverb).connect(wet).connect(master);
    master.connect(tone).connect(context.destination);
    Object.assign(ambient, { context, master, bus });
    ambient.playing = true;
    ambientLoop();
  }
  ambient.playing = true;
  ambient.context.resume();
  ambientFade(4);
  paintAmbient();
}

function stopAmbient() {
  ambient.playing = false;
  ambientFade(1.2);
  paintAmbient();
}

function paintAmbient() {
  const button = $('#ambientToggle');
  button.setAttribute('aria-pressed', String(ambient.on));
  button.classList.toggle('playing', ambient.on && ambient.playing);
  button.title = t('ambientSound');
}

$('#ambientToggle').addEventListener('click', () => {
  ambient.on = !ambient.on;
  storage.set('echoes-ambient', ambient.on);
  ambient.on ? startAmbient() : stopAmbient();
});
for (const name of ['pointerdown', 'keydown']) {
  document.addEventListener(name, event => {
    if (event.target.closest?.('#ambientToggle') || ambient.playing || !ambient.on) return;
    startAmbient();
  }, { capture: true });
}
document.addEventListener('visibilitychange', () => {
  if (!ambient.context) return;
  if (document.hidden) { ambientFade(.6); setTimeout(() => { if (document.hidden) ambient.context.suspend(); }, 700); }
  else if (ambient.on) { ambient.context.resume(); ambientFade(2); }
});
new MutationObserver(() => ambientFade(1.5)).observe(reader, { attributes: true, attributeFilter: ['open'] });
// On phones the header has no room: the button floats in the lower-left corner instead.
{
  const button = $('#ambientToggle');
  const home = button.parentElement;
  const anchor = button.nextElementSibling;
  const small = matchMedia('(max-width: 495px)');
  const place = () => small.matches ? document.body.append(button) : home.insertBefore(button, anchor);
  place();
  small.addEventListener('change', place);
}
paintAmbient();

reader.addEventListener('close', () => {
  releaseDemoFile();
  state.active = null;
  if (location.hash.startsWith('#story=')) {
    history.replaceState(null,'',state.readerReturnHash);
    routeAtlas();
  }
});
uploader.addEventListener('close', () => {
  $('#uploadStatus').textContent = '';
  if (location.hash === '#submit') history.replaceState(null,'',pageLink('/relatos','#archive'));
});
function followStoryLink(showMissing = false) {
  const id = location.hash.match(/^#story=([a-z0-9-]+)$/i)?.[1];
  if (validId(id) && find(id)) openStory(id,false);
  else if (validId(id) && showMissing) {
    $('#catalogStatus').textContent = t('linkedStoryMissing');
    $('#archive').scrollIntoView();
  }
}
function restoreLocation() {
  if (reader.open && !location.hash.startsWith('#story=')) reader.close();
  routeAtlas();
  followStoryLink();
}
window.addEventListener('hashchange', restoreLocation);
window.addEventListener('popstate', restoreLocation);
document.addEventListener('click', event => {
  const target = event.target.closest('a')?.getAttribute('href');
  if (!target?.startsWith('#') || !addressFor(target)) return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  if (reader.open) reader.close();
  navigateAtlas(target);
});

function navigateAtlas(target) {
  const address = addressFor(target) || target;
  const current = demoMode ? location.hash : location.pathname+location.search+location.hash;
  if (address !== current) history.pushState(null, '', address);
  const focus = routeAtlas();
  if (focus) $(focus).focus({ preventScroll:true });
}
const launchStars = $('#launchStars');
const skySize = new ResizeObserver(() => {
  paintStars(launchStars);
  drawVoyagerRoute();
});
skySize.observe($('#slides'));
skySize.observe($('#solarPlot'));
$('#demoBanner').hidden = !demoMode;
if (demoMode) {
  const demoLinks = {'/':'#home','/relatos':'#archive','/mapa':'#solar-map','/expediciones':'#expeditions','/pasaporte':'#passport','/mapa#voyager':'#voyager'};
  document.querySelectorAll('a[href]').forEach(link => {
    const hash = demoLinks[link.getAttribute('href')];
    if (hash) link.href = hash;
  });
}
if (!demoMode && sharedStory(location.pathname)) history.replaceState(null, '', `/relatos#story=${encodeURIComponent(sharedStory(location.pathname))}`);
paintLanguage();
routeAtlas();
requestJourney();
if (location.hash === '#submit') openUploader();
$('#passportImport').addEventListener('click', passport.importGuest);
$('#passportRetry').addEventListener('click', passport.refresh);
window.addEventListener('online', passport.refresh);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void passport.refresh();
});
void passport.refresh().then(refreshModerator);
let catalogRefresh;
function refreshCatalog() {
  if (catalogRefresh) return catalogRefresh;
  const previous = new Set(state.entries.map(story => story.id));
  catalogRefresh = (async () => {
    try {
      const loaded = new Map();
      let offset = 0;
      do {
        const response = await request('/api/stories?offset=' + offset,{ cache:'no-store' });
        if (!response.ok) throw new Error('Catalogue unavailable');
        const payload = await response.json();
        for (const story of payload.stories) loaded.set(story.id,story);
        offset = payload.next;
      } while (Number.isSafeInteger(offset));
      for (const story of state.entries) {
        if (!previous.has(story.id) && !loaded.has(story.id)) loaded.set(story.id,story);
      }
      const entries = [...loaded.values()].filter(story => !deletedInSession.has(story.id));
      if (JSON.stringify(entries) !== JSON.stringify(state.entries)) {
        state.entries = entries;
        paintAtlas();
        paintPassport();
        if (!uploader.open) paintForm();
        paintRovers();
      } else if (!state.loadError) return;
      state.loadError = false;
    } catch { state.loadError = true; }
    paintArchive();
  })().finally(() => { catalogRefresh = null; });
  return catalogRefresh;
}

await refreshCatalog();
followStoryLink(!state.loadError);
if (!demoMode) {
  const refreshVisibleArchive = () => {
    if (!document.hidden && atlasPage(location.pathname) === 'stories') void refreshCatalog();
  };
  window.addEventListener('online', refreshVisibleArchive);
  document.addEventListener('visibilitychange', refreshVisibleArchive);
  setInterval(refreshVisibleArchive, 20000);
}
