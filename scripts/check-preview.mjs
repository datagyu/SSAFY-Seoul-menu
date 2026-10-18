// Run with the local preview server already running.
import fs from 'node:fs';
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/app.css','utf8');
const assets=[...html.matchAll(/(?:src|href)="(\.\/[^"?]+)(?:\?[^\"]*)?"/g)].map(x=>x[1]);
assets.push(...JSON.parse(fs.readFileSync('manifest.webmanifest')).icons.map(x=>x.src));
for(const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)){
  if(!match[1].startsWith('data:'))assets.push(new URL(match[1],'http://local/assets/app.css').pathname.slice(1));
}
assets.push(...JSON.parse(fs.readFileSync('data/index.json')).dates.map(d=>'data/'+d+'.json'));
let count=0;
for(const mount of ['/','/SSAFY-Seoul-menu/']){
  for(const asset of ['',...new Set(assets)]){
    const url=new URL(asset,'http://127.0.0.1:4173'+mount);
    const response=await fetch(url);
    if(!response.ok)throw Error(response.status+' '+url);
    if(asset.endsWith('.json')||asset.endsWith('.webmanifest'))await response.json();
    count++;
  }
}
console.log(`PASS: ${count} root/subpath resource and data HTTP checks`);
