import { assets } from './assets.js';
import { coverTypes, fromMultipart, inspectCover, inspectDocument, maxCover, maxDocument, validId } from './submission.js';
import { explorerProgress } from './progress-api.js';
import { atlasPage } from './pages.js';

const security = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};
const fields = 'id,destination,type,category,language,title,hardware,body,sources,author,created_at,byline,tags,series_id,series_name,part,attachment,synopsis,cover';
// Listing extras: the author's public handle (never the account ID), echoes and visible comments.
const decoded = new Map();
const listing = `${fields},(SELECT handle FROM author_handles WHERE account_id = stories.author) AS author_handle,
  (SELECT COUNT(*) FROM story_echoes WHERE story_id = stories.id) AS echoes,
  (SELECT COUNT(*) FROM story_comments WHERE story_id = stories.id AND hidden_at IS NULL) AS comment_count`;
const json = (data,status=200) => Response.json(data,{status,headers:{...security,'Cache-Control':'private, no-store'}});
const error = (code,status=400) => json({error:code},status);

function isModerator(request, env) {
  const email = request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  return Boolean(request.headers.get('oai-authenticated-user-id') && email &&
    email === env.ATLAS_MODERATOR_EMAIL?.toLowerCase());
}

// The uploaded file keeps no trace of its original name (it can carry a real name behind a pen name).
function publicFileName(title, extension) {
  const base = String(title || '').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase()
    .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,60) || 'relato';
  return `${base}.${extension}`;
}

// Covers are public. Photos can carry where and with what device they were taken (EXIF, XMP, text chunks),
// so only the image data is kept. A JPEG keeps its orientation so phone photos are not shown sideways.
function stripImageMetadata(bytes, type) {
  try {
    if (type === 'image/jpeg') return stripJpeg(bytes);
    if (type === 'image/png') return stripPng(bytes);
    if (type === 'image/webp') return stripWebp(bytes);
  } catch {}
  return bytes;
}

function jpegOrientation(segment) {
  // segment: the APP1 payload after its length bytes, starting with "Exif\0\0".
  try {
    if (String.fromCharCode(...segment.slice(0,4)) !== 'Exif') return 1;
    const tiff = segment.subarray(6);
    const little = tiff[0] === 0x49;
    const view = new DataView(tiff.buffer, tiff.byteOffset, tiff.byteLength);
    const ifd = view.getUint32(4, little);
    const entries = view.getUint16(ifd, little);
    for (let index = 0; index < entries; index++) {
      const entry = ifd + 2 + index * 12;
      if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
    }
  } catch {}
  return 1;
}

function joinParts(parts) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

function stripJpeg(bytes) {
  const parts = [bytes.subarray(0, 2)];
  let orientation = 1;
  let position = 2;
  while (position + 4 <= bytes.length) {
    if (bytes[position] !== 0xff) return bytes;
    const marker = bytes[position + 1];
    if (marker === 0xff) { position += 1; continue; }
    if (marker === 0xda) { parts.push(bytes.subarray(position)); break; }
    const length = (bytes[position + 2] << 8) | bytes[position + 3];
    const segment = bytes.subarray(position, position + 2 + length);
    const payload = segment.subarray(4);
    const icc = marker === 0xe2 && String.fromCharCode(...payload.slice(0, 11)) === 'ICC_PROFILE';
    if (marker === 0xe1) orientation = Math.max(orientation, jpegOrientation(payload));
    const drop = (marker >= 0xe1 && marker <= 0xef && marker !== 0xee && !icc) || marker === 0xfe;
    if (!drop) parts.push(segment);
    position += 2 + length;
  }
  if (orientation > 1 && orientation <= 8) {
    // Minimal EXIF block that only says how to rotate the picture.
    parts.splice(1, 0, new Uint8Array([0xff,0xe1,0,34, 0x45,0x78,0x69,0x66,0,0, 0x4d,0x4d,0,0x2a,0,0,0,8, 0,1, 0x01,0x12,0,3,0,0,0,1,0,orientation,0,0, 0,0,0,0]));
  }
  return joinParts(parts);
}

function stripPng(bytes) {
  const drop = new Set(['tEXt','zTXt','iTXt','eXIf','tIME']);
  const parts = [bytes.subarray(0, 8)];
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let position = 8;
  while (position + 12 <= bytes.length) {
    const length = view.getUint32(position);
    const type = String.fromCharCode(...bytes.subarray(position + 4, position + 8));
    const end = position + 12 + length;
    if (end > bytes.length) return bytes;
    if (!drop.has(type)) parts.push(bytes.subarray(position, end));
    position = end;
    if (type === 'IEND') break;
  }
  return joinParts(parts);
}

function stripWebp(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = [bytes.slice(0, 12)];
  let position = 12;
  while (position + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.subarray(position, position + 4));
    const size = view.getUint32(position + 4, true);
    const end = Math.min(position + 8 + size + (size % 2), bytes.length);
    if (type !== 'EXIF' && type !== 'XMP ') {
      const chunk = bytes.slice(position, end);
      if (type === 'VP8X') chunk[8] &= ~0x0c;
      parts.push(chunk);
    }
    position = end;
  }
  const out = joinParts(parts);
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  return out;
}

function storyFrom(row, viewer, moderator = false) {
  return {
    id:row.id, destination:row.destination, type:row.type, category:row.category, language:row.language,
    title:row.title, hardware:row.hardware, body:row.body, byline:row.byline, synopsis:row.synopsis,
    tags:JSON.parse(row.tags), seriesId:row.series_id, seriesName:row.series_name, part:row.part,
    document:row.attachment ? { ...JSON.parse(row.attachment), name: publicFileName(row.title, JSON.parse(row.attachment).extension) } : null, hasCover:coverTypes.includes(row.cover),
    sources:JSON.parse(row.sources).map(url=>({url})), hidden:Boolean(row.hidden || row.deleted_at), cleanupPending:Boolean(row.deleted_at && row.attachment),
    community:true, mine:!!viewer && viewer===row.author, canDelete:moderator || Boolean(viewer && viewer===row.author),
    authorHandle:row.author_handle || null, echoes:row.echoes || 0, comments:row.comment_count || 0
  };
}

async function limitedForm(request) {
  const max = maxDocument+maxCover+64*1024;
  if (!request.body || Number(request.headers.get('content-length')) > max) return null;
  const reader = request.body.getReader();
  const pieces = [];
  let size = 0;
  while (true) {
    const {value,done} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); return null; }
    pieces.push(value);
  }
  const response = new Response(new Blob(pieces),{headers:{'Content-Type':request.headers.get('content-type')}});
  return response.formData().catch(()=>null);
}

async function publish(request,env,owner,url) {
  if (request.headers.get('origin') !== url.origin) return error('uploadError',403);
  if (!owner) return error('login_required',401);
  if (!env.BUCKET) return error('store_unavailable',503);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('multipart/form-data;')) return error('invalid_file',415);
  const form = await limitedForm(request);
  if (!form) return error('invalid_file',413);
  const metadata = fromMultipart(form);
  if (metadata.error) return error(metadata.error);
  const file = form.get('document');
  const checked = await inspectDocument(file);
  if (checked.error) return error(checked.error);
  const cover = form.get('cover');
  const coverInfo = await inspectCover(cover);
  if (coverInfo.error) return error(coverInfo.error);

  const value = metadata.value;
  const id = crypto.randomUUID();
  const time = Date.now();
  const root = value.seriesId ? await env.DB.prepare('SELECT series_name FROM stories WHERE id = ? AND series_id = id AND author = ? AND deleted_at IS NULL').bind(value.seriesId,owner).first() : null;
  if (value.seriesId && !root) return error('invalid_series');
  const seriesId = value.seriesId || (value.seriesName ? id : null);
  const seriesName = root?.series_name || value.seriesName || null;

  const keys = [`stories/${id}`];
  if (coverInfo.value) keys.push(`covers/${id}`);
  let row;
  try {
    await env.BUCKET.put(keys[0],await file.arrayBuffer());
    if (coverInfo.value) await env.BUCKET.put(keys[1],stripImageMetadata(new Uint8Array(await cover.arrayBuffer()),coverInfo.value));
    checked.value.name = publicFileName(value.title, checked.value.extension);
    row = await env.DB.prepare(`INSERT INTO stories (${fields})
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,
        CASE WHEN ? IS NULL THEN NULL ELSE COALESCE((SELECT MAX(part) FROM stories WHERE series_id = ?),0)+1 END,
        ?,?,? WHERE (SELECT COUNT(*) FROM stories WHERE author = ? AND created_at > ?) < 5
      RETURNING ${fields}`)
      .bind(id,value.destination,value.type,value.category,value.language,value.title,value.hardware,'',JSON.stringify(value.sources),owner,time,value.byline,JSON.stringify(value.tags),seriesId,seriesName,seriesId,seriesId,JSON.stringify(checked.value),value.synopsis || null,coverInfo.value,owner,time-30*60*1000).first();
  } catch (failure) {
    row = await env.DB.prepare(`SELECT ${fields} FROM stories WHERE id = ?`).bind(id).first();
    if (!row) { await env.BUCKET.delete(keys); throw failure; }
  }
  if (!row) {
    await env.BUCKET.delete(keys);
    return error('rate_limit',429);
  }
  // Authors are linked by a random public handle, never by their account ID.
  let handle = null;
  try {
    handle = await env.DB.prepare(`INSERT INTO author_handles (account_id, handle) VALUES (?, lower(hex(randomblob(6))))
      ON CONFLICT(account_id) DO UPDATE SET handle = handle RETURNING handle`).bind(owner).first();
  } catch {}
  return json({story:storyFrom({...row,author_handle:handle?.handle},owner)},201);
}

async function archive(request,env,url) {
  if (!env.DB) return error('store_unavailable',503);
  const viewer = request.headers.get('oai-authenticated-user-id');
  if (request.method==='POST') return publish(request,env,viewer,url);
  if (request.method!=='GET') return error('uploadError',405);
  const offset = Number(url.searchParams.get('offset') || 0);
  if (!Number.isSafeInteger(offset) || offset < 0) return error('invalid_fields');
  const {results} = await env.DB.prepare(`SELECT ${listing},hidden,deleted_at FROM stories WHERE (hidden = 0 AND deleted_at IS NULL)
    OR (author = ? AND (deleted_at IS NULL OR attachment IS NOT NULL)) ORDER BY created_at DESC,id DESC LIMIT 101 OFFSET ?`).bind(viewer,offset).all();
  return json({stories:results.slice(0,100).map(row=>storyFrom(row,viewer,isModerator(request,env))),next:results.length>100?offset+100:null});
}

async function readStory(request, env, id, download) {
  if (request.method !== 'GET') return error('fileError',405);
  if (!validId(id) || !env.DB || !env.BUCKET) return error('fileError',404);
  const record = await env.DB.prepare('SELECT attachment, author, hidden, deleted_at, title FROM stories WHERE id = ?').bind(id).first();
  if (!record?.attachment || record.deleted_at) return error('fileError',404);
  const viewer = request.headers.get('oai-authenticated-user-id');
  if (record.hidden && viewer !== record.author && !isModerator(request,env)) return error('fileError',404);
  const meta = JSON.parse(record.attachment);
  const file = await env.BUCKET.get(`stories/${id}`);
  if (!file) return error('fileError',404);
  if (!download && meta.extension !== 'pdf') {
    return json({text:(await new Response(file.body).text()).replace(/\r\n?/g,'\n')});
  }
  const type = download ? 'application/octet-stream' : 'application/pdf';
  const disposition = download ? 'attachment' : 'inline';
  const filename = encodeURIComponent(publicFileName(record.title, meta.extension)).replace(/['()*]/g, char => '%' + char.charCodeAt(0).toString(16).toUpperCase());
  return new Response(file.body,{headers:{...security,'Content-Type':type,'Cache-Control':'private, no-store',
    'Content-Disposition':disposition + "; filename*=UTF-8''" + filename}});
}

async function deleteStory(request,env,url,id) {
  if (request.method !== 'POST') return error('deleteError',405);
  const viewer = request.headers.get('oai-authenticated-user-id');
  if (!viewer) return error('login_required',401);
  if (request.headers.get('origin') !== url.origin) return error('deleteError',403);
  if (!validId(id)) return error('deleteError',404);
  if (!env.DB || !env.BUCKET) return error('store_unavailable',503);
  const story = await env.DB.prepare('SELECT author,attachment,deleted_at FROM stories WHERE id = ?').bind(id).first();
  if (!story) return error('deleteError',404);
  if (viewer !== story.author && !isModerator(request,env)) return error('deleteError',403);
  if (story.deleted_at && !story.attachment) return json({deleted:true});
  if (!story.deleted_at) {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('UPDATE stories SET hidden = 1, deleted_at = ? WHERE id = ? AND deleted_at IS NULL').bind(now,id),
      env.DB.prepare('UPDATE story_reports SET reviewed_at = ? WHERE story_id = ? AND reviewed_at IS NULL').bind(now,id)
    ]);
  }
  try {
    await env.BUCKET.delete([`stories/${id}`,`covers/${id}`,`reading/${id}`]);
    await env.DB.prepare("UPDATE stories SET attachment = NULL, cover = NULL, body = '', synopsis = NULL WHERE id = ?").bind(id).run();
  } catch {
    return error('deleteCleanup',503);
  }
  return json({deleted:true});
}

const reportReasons = new Set(['copyright','abuse','privacy','spam','other']);

async function smallJson(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const decoder = new TextDecoder();
  let raw = '';
  let bytes = 0;
  for (;;) {
    const {value,done} = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 4096) { await reader.cancel(); return null; }
    raw += decoder.decode(value,{stream:true});
  }
  try { return JSON.parse(raw + decoder.decode()); } catch { return null; }
}

async function report(request,env,url,id) {
  const viewer = request.headers.get('oai-authenticated-user-id');
  if (!viewer) return error('login_required',401);
  if (!env.DB) return error('store_unavailable',503);
  if (request.method !== 'POST') return error('reportError',405);
  if (request.headers.get('origin') !== url.origin) return error('reportError',403);
  const data = await smallJson(request);
  if (!validId(id) || !reportReasons.has(data?.reason) || typeof data.details !== 'string' || data.details.length > 500) return error('invalid_fields');
  const story = await env.DB.prepare('SELECT author FROM stories WHERE id = ? AND hidden = 0 AND deleted_at IS NULL').bind(id).first();
  if (!story) return error('reportError',404);
  if (story.author === viewer) return error('reportError',403);
  const now = Date.now();
  const inserted = await env.DB.prepare(`INSERT INTO story_reports (id, story_id, reporter, reason, details, created_at)
    SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM story_reports WHERE reporter = ? AND created_at > ?) < 10
    AND EXISTS (SELECT 1 FROM stories WHERE id = ? AND hidden = 0 AND deleted_at IS NULL)
    ON CONFLICT(story_id, reporter) DO NOTHING RETURNING id`)
    .bind(crypto.randomUUID(),id,viewer,data.reason,data.details.trim(),now,viewer,now-3600000,id).first();
  if (inserted) return json({saved:true},201);
  const exists = await env.DB.prepare('SELECT id FROM story_reports WHERE story_id = ? AND reporter = ?').bind(id,viewer).first();
  return exists ? error('alreadyReported',409) : error('reportLimit',429);
}

async function moderate(request,env,url) {
  if (!isModerator(request,env)) return error('reportError',403);
  if (!env.DB) return error('store_unavailable',503);
  if (request.method === 'GET') {
    const reviewed = url.searchParams.get('status') === 'reviewed';
    const offset = Number(url.searchParams.get('offset') || 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return error('invalid_fields');
    const {results} = await env.DB.prepare(`SELECT r.id,r.story_id,r.reason,r.details,r.created_at,r.reviewed_at,s.title,s.byline,s.hidden,s.deleted_at,s.attachment IS NOT NULL AS has_file
      FROM story_reports r JOIN stories s ON s.id = r.story_id WHERE r.reviewed_at IS ${reviewed ? 'NOT ' : ''}NULL
      ORDER BY r.created_at DESC,r.id DESC LIMIT 31 OFFSET ?`).bind(offset).all();
    return json({reports:results.slice(0,30),next:results.length > 30 ? offset+30 : null});
  }
  if (request.method !== 'POST' || request.headers.get('origin') !== url.origin) return error('reportError',403);
  const data = await smallJson(request);
  if (!validId(data?.id) || !['review','hide','restore'].includes(data.action)) return error('invalid_fields');
  const target = await env.DB.prepare('SELECT r.story_id,s.deleted_at FROM story_reports r JOIN stories s ON s.id = r.story_id WHERE r.id = ?').bind(data.id).first();
  if (!target) return error('reportError',404);
  if (target.deleted_at && data.action !== 'review') return error('deletedStory',409);
  const review = env.DB.prepare('UPDATE story_reports SET reviewed_at = ? WHERE id = ? AND reviewed_at IS NULL').bind(Date.now(),data.id);
  if (data.action === 'review') await review.run();
  else await env.DB.batch([
    env.DB.prepare('UPDATE stories SET hidden = ? WHERE id = ? AND deleted_at IS NULL').bind(data.action === 'hide' ? 1 : 0,target.story_id),
    review
  ]);
  return json({saved:true});
}

async function readCover(request,env,id) {
  if (request.method !== 'GET') return error('fileError',405);
  if (!validId(id) || !env.DB || !env.BUCKET) return error('fileError',404);
  const row = await env.DB.prepare('SELECT cover FROM stories WHERE id = ? AND hidden = 0 AND deleted_at IS NULL').bind(id).first();
  if (!coverTypes.includes(row?.cover)) return error('fileError',404);
  const file = await env.BUCKET.get(`covers/${id}`);
  if (!file) return error('fileError',404);
  return new Response(file.body,{headers:{...security,'Content-Type':row.cover,'Cache-Control':'private, no-store'}});
}

export default {
  async fetch(request,env) {
    const url = new URL(request.url);
    try {
      if (url.pathname==='/api/stories') return await archive(request,env,url);
      const deletion = url.pathname.match(/^\/api\/stories\/([a-z0-9-]+)\/delete$/i);
      if (deletion) return await deleteStory(request,env,url,deletion[1]);
      if (url.pathname==='/api/progress') return await explorerProgress(request,env,url,json,error);
      if (url.pathname === '/api/moderator') return json({moderator:isModerator(request,env)});
      if (url.pathname === '/api/moderation') return await moderate(request,env,url);
      if (url.pathname.startsWith('/api/reports/')) return await report(request,env,url,url.pathname.split('/').pop());
      if (url.pathname.startsWith('/api/documents/')) return await readStory(request,env,url.pathname.split('/').pop(),true);
      if (url.pathname.startsWith('/api/read/')) return await readStory(request,env,url.pathname.split('/').pop(),false);
      if (url.pathname.startsWith('/api/covers/')) return await readCover(request,env,url.pathname.split('/').pop());
      const page = atlasPage(url.pathname);
      const key = page ? 'atlas.html' : url.pathname.slice(1);
      if (!Object.hasOwn(assets,key)) return new Response('Not found',{status:404,headers:security});
      if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{...security,Allow:'GET, HEAD'}});
      const asset = assets[key];
      if (page) {
        const html = asset.content.replace('data-atlas-page="home"',`data-atlas-page="${page}"`);
        return new Response(request.method==='HEAD'?null:html,{headers:{...security,'Content-Type':asset.mime,'Cache-Control':'no-cache'}});
      }
      // Fonts and textures stay a week in the browser; scripts and styles are checked each visit,
      // and an unchanged file answers with an empty 304 instead of being sent again.
      const etag = `"${asset.etag}"`;
      const caching = {...security,'Content-Type':asset.mime,'Cache-Control':asset.binary?'public, max-age=604800':'no-cache',ETag:etag};
      if (request.headers.get('if-none-match') === etag) return new Response(null,{status:304,headers:caching});
      let content = asset.content;
      if (asset.binary) {
        content = decoded.get(key);
        if (!content) decoded.set(key, content = Uint8Array.from(atob(asset.content),char=>char.charCodeAt(0)));
      }
      return new Response(request.method==='HEAD'?null:content,{headers:caching});
    } catch (detail) {
      console.error('Atlas request failed',detail.message);
      return error('store_unavailable',503);
    }
  }
};
