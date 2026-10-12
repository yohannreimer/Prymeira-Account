import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
export function versionSiteAssets(root) {
  function files(dir) { return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]); }
  const all=files(root);
  const assets=all.filter(file=>/\.(css|js|woff2?|ttf|webp|png|jpg|jpeg|svg|ico)$/.test(file)&&!['analytics.js','site-config.js'].includes(relative(root,file)));
  const versions=new Map(assets.map(file=>[relative(root,file),createHash('sha256').update(readFileSync(file)).digest('hex').slice(0,12)]));
  for(const file of all.filter(file=>file.endsWith('.html'))) {
    let html=readFileSync(file,'utf8');
    for(const [name,hash] of versions) {
      const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      html=html.replace(new RegExp('(?<=["\\s(])'+escaped+'(?:\\?v=[a-f0-9]+)?(?=["\\s)])','g'),name+'?v='+hash);
    }
    writeFileSync(file,html);
  }
}
if(import.meta.url===pathToFileURL(process.argv[1]).href) versionSiteAssets(process.argv[2]||'apps/hub-web/site');
