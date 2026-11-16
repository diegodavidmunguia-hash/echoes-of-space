export const atlasPages = new Map([
  ['/', 'home'], ['/relatos', 'stories'], ['/expediciones', 'expeditions'],
  ['/mapa', 'map'], ['/pasaporte', 'passport']
]);

// /relato/<id> is the shareable address of one story: it opens the archive with that story.
export const sharedStory = path => path.match(/^\/relato\/([a-z0-9-]{8,64})\/?$/i)?.[1] || null;

export function atlasPage(path) {
  if (sharedStory(path)) return 'stories';
  return atlasPages.get(path.replace(/\/$/, '') || '/');
}
