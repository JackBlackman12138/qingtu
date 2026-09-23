const fs=require('node:fs');const path=require('node:path');
const root=__dirname;
const files=['config','state','gacha','game-engine','map-view','art','components','main'];
const source=files.map(name=>fs.readFileSync(path.join(root,'src',name+'.js'),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/^export /gm,'')).join('\n');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="./styles.css">',`<style>${fs.readFileSync(path.join(root,'styles.css'),'utf8')}</style>`).replace('<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml">','');
html=html.replace('<script type="module" src="./src/main.js"></script>',()=>`<script>(()=>{\n${source}\n})();</script>`);
fs.writeFileSync(path.join(root,'梦境博览会-即开即玩.html'),html);
console.log('Standalone built: 梦境博览会-即开即玩.html');
