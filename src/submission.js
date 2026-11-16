import { validateStory } from './validation.js';

export const maxDocument = 8 * 1024 * 1024;
export const maxCover = 5 * 1024 * 1024;
export const coverTypes = ['image/jpeg','image/png','image/webp'];
export const documentTypes = { pdf: 'application/pdf', txt: 'text/plain', md: 'text/markdown' };
export const validId = id => typeof id === 'string' && /^[a-z0-9-]{1,100}$/i.test(id);

export function submissionMetadata(input) {
  const result = validateStory({ ...input, body: 'Document attachment' });
  if (result.error) return result;
  const { body, ...value } = result.value;
  const byline = input.byline?.trim();
  if (!byline || byline.length > 60) return { error: 'invalid_fields' };
  const synopsis = input.synopsis?.trim() || '';
  if (synopsis.length > 240) return { error: 'invalid_synopsis' };
  const tags = [...new Map((input.tags || '').split(',').map(tag => tag.trim().replace(/^#+/, '').trim()).filter(Boolean).map(tag => [tag.toLocaleLowerCase(), tag])).values()];
  if (tags.length > 6 || tags.some(tag => tag.length > 24)) return { error: 'invalid_tags' };
  const seriesName = input.format === 'new' ? input.seriesName?.trim() : '';
  const seriesId = input.format === 'continue' ? input.seriesId : '';
  if (!['single', 'new', 'continue'].includes(input.format) || (input.format === 'new' && (!seriesName || seriesName.length > 80)) || (input.format === 'continue' && !validId(seriesId))) return { error: 'invalid_series' };
  return { value: { ...value, byline, synopsis, tags, seriesName, seriesId } };
}

export async function inspectDocument(file) {
  if (!(file instanceof Blob) || !file.name || !file.size || file.size > maxDocument) return { error: 'invalid_file' };
  const extension = file.name.split('.').pop().toLowerCase();
  if (!Object.hasOwn(documentTypes, extension)) return { error: 'invalid_file' };
  const name = file.name.replace(/[\u0000-\u001f\u007f]/g, '').slice(-120);
  const mime = documentTypes[extension];
  if (extension === 'pdf') {
    const signature = await file.slice(0, 5).text();
    if (signature !== '%PDF-') return { error: 'invalid_file' };
  } else {
    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      if (!content.trim() || /\u0000/.test(content)) return { error: 'invalid_file' };
    } catch { return { error: 'invalid_file' }; }
  }
  return { value: { name, extension, mime, size: file.size } };
}

export function fromMultipart(form) {
  const input = {};
  for (const key of ['title', 'byline', 'synopsis', 'destination', 'type', 'hardware', 'language', 'category', 'tags', 'format', 'seriesName', 'seriesId', 'sources']) {
    const value = form.get(key);
    input[key] = typeof value === 'string' ? value : '';
  }
  input.sources = input.sources.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  return submissionMetadata(input);
}

export async function inspectCover(file) {
  if (file === null || file === undefined || file === '' || (file instanceof Blob && !file.name && file.size === 0)) return { value:null };
  if (!(file instanceof Blob) || file.size < 12 || file.size > maxCover) return { error:'invalid_cover' };
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const has = (offset, signature) => signature.every((value,index) => bytes[offset+index] === value);
  if (has(0,[0xff,0xd8,0xff])) return { value:'image/jpeg' };
  if (has(0,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])) return { value:'image/png' };
  if (has(0,[0x52,0x49,0x46,0x46]) && has(8,[0x57,0x45,0x42,0x50])) return { value:'image/webp' };
  return { error:'invalid_cover' };
}
