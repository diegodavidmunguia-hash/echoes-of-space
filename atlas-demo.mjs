import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const at = name=>new URL(name,import.meta.url);
const read = name=>readFile(at(`src/${name}`),'utf8');
const modules = ['data.js','validation.js','submission.js','sky.js','globe.js','atlas-copy.js','demo-storage.js','progress.js','planet-scenes.js','pages.js','atlas.js'];
const strings = await Promise.all(modules.map(read));
const maps = {};
for (const id of ['earth','mercury','venus','mars','jupiter','saturn','uranus','neptune','moon']) {
  maps[id] = 'data:image/jpeg;base64,'+await readFile(at(`src/textures/${id}.jpg`),'base64');
}
const script = `const demoTextures = ${JSON.stringify(maps)};\n` + strings.map(source=>source.replace(/^import [^\n]*\n/gm,'').replace(/^export /gm,'')).join('\n');
const check = spawnSync(process.execPath,['--input-type=module','--check'],{input:script,encoding:'utf8'});
if (check.status!==0) throw new Error(check.stderr || 'Demo script validation failed');
const icon = 'data:image/svg+xml,'+encodeURIComponent(await read('mark.svg'));
const css = await read('atlas.css');
const html = (await read('atlas.html'))
  .replace(/^\s*<link rel="(?:preload|modulepreload)"[^>]*>\r?\n/gm,'')
  .replace('/mark.svg',icon)
  .replace('<link rel="stylesheet" href="/atlas.css">',()=>`<style>${css}</style>`)
  .replace('<script type="module" src="/atlas.js"></script>','')
  .replace('</body>',()=>`<script type="module">${script.replace(/<\/script/gi,'<\\/script')}</script></body>`);
await mkdir(at('deliverables/'),{recursive:true});
await writeFile(at('deliverables/Echoes_of_Space.html'),html);
