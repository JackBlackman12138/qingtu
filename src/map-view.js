import {MAPS,NODE_BY_ID,sceneY} from './config.js';
import {done} from './game-engine.js';
export const ZOOM={min:.7,max:1.6,step:.15};
export const clampZoom=z=>Math.max(ZOOM.min,Math.min(ZOOM.max,Number.isFinite(z)?z:1));
export const activePath=s=>s.branch===null?MAPS[s.map].nodes:MAPS[s.map].branches[s.branch];
export function nextDestination(s){return activePath(s).find(n=>(s.branch===null?n.type==='story':n.type==='memento')&&!done(s,n.id));}
export function routeNodes(s){const target=nextDestination(s);if(!target)return [];return activePath(s).filter(n=>n.type!=='chest'&&!done(s,n.id)&&n.y<=target.y);}
export function visibleNodes(s){const target=nextDestination(s);return activePath(s).filter(n=>n.type==='chest'?s.story.includes(n.p)||n.p===target?.p:!target||n.y<=target.y);}
export function guideGeometry(s){const path=routeNodes(s);return {target:nextDestination(s),obstacles:path.filter(n=>n.type==='obstacle'),points:path.map(n=>({id:n.id,x:n.x,y:sceneY(n)}))};}
export function collectionChanges(before,after){const changes=[];for(const task of ['horses','repairs','mementos'])for(const id of after[task])if(!before[task].includes(id))changes.push({task,id,count:after[task].length});return changes;}
