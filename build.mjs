import { mkdir, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const at = name => new URL(name,import.meta.url);
const target = 'dist/server/';
const types = { html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',svg:'image/svg+xml',jpg:'image/jpeg',mjs:'text/javascript; charset=utf-8',woff2:'font/woff2' };
const assets = {};
const modules = ['atlas.js','atlas-copy.js','data.js','globe.js','sky.js','submission.js','validation.js','progress.js','planet-scenes.js','pages.js'];
const textures = await readdir(at('src/textures/'));
for (const file of ['atlas.html','atlas.css','mark.svg','vendor/pdf.min.mjs','vendor/pdf.worker.min.mjs','fonts/jost-300.woff2','fonts/jost-400.woff2','fonts/jost-500.woff2','fonts/newsreader-400.woff2','fonts/newsreader-400-italic.woff2',...modules,...textures.filter(name=>name.endsWith('.jpg')).map(name=>`textures/${name}`)]) {
  const extension = file.split('.').pop();
  const binary = extension === 'jpg' || extension === 'woff2';
  const content = await readFile(at(`src/${file}`),binary?'base64':'utf8');
  // The tag changes only when the file changes, so browsers can reuse their copy with a tiny 304 answer.
  const etag = createHash('sha256').update(content).digest('hex').slice(0,20);
  assets[file] = {mime:types[extension],content,binary,etag};
}
await mkdir(at(target),{recursive:true});
await mkdir(at('dist/.openai/'),{recursive:true});
await Promise.all([
  writeFile(at(`${target}assets.js`),`export const assets = ${JSON.stringify(assets)};\n`),
  copyFile(at('src/atlas-worker.js'),at(`${target}index.js`)),
  ...['submission.js','validation.js','data.js','progress-api.js','pages.js'].map(file=>copyFile(at(`src/${file}`),at(`${target}${file}`))),
  copyFile(at('.openai/hosting.json'),at('dist/.openai/hosting.json'))
]);
