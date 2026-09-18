import {CONFIG,MAPS,MANUAL_ITEMS} from './config.js';
export const SAVE_KEY='dream-expo-v15-final';
export const LEGACY_SAVE_KEY='dream-expo-v12-final';
export function initialState(now=Date.now()) {return {schema:2,manual:[],legacyCredit:{},created:now,lastRegen:now,clockOffset:0,map:0,branch:null,started:false,inside:true,ended:false,online:true,energy:CONFIG.initialEnergy,tickets:0,free:0,duplicate:0,coins:0,diamonds:100,mainEnergy:0,speed:0,generator:0,spent:0,stages:{},completed:{},story:[],horses:[],installed:[],repairs:[],mementos:[],materials:{},ingredients:false,prepared:{},dialog:null,pendingBatch:null,toys:[],newToys:[],sequence:0,paidDraws:0,claims:[],orders:[],exchanges:{},events:[],settings:{reduced:false,sound:false},review:{orderEnergy:CONFIG.orderEnergy,energyConversion:null},settlement:null};}
export function migrateState(input){
 const s=structuredClone(input);if(s.schema===2)return s;
 if(s.schema!==1)throw new Error('Unsupported save');
 s.schema=2;s.manual=[];s.legacyCredit={};s.prepared??={};
 for(const item of MANUAL_ITEMS){
  const n=MAPS[item.map].nodes.find(n=>n.id===item.nodeId);
  const p=2+(item.map-1)*3+item.step;
  const prepared=!!s.prepared[n.id];
  const obtained=item.kind==='horse'?s.horses.includes(item.map):s.story.includes(p)||item.kind==='scene'&&prepared||!!s.completed[n.id];
  const repair=MAPS[item.map].nodes.find(n=>n.step===1&&n.type==='story');
  const usedMaterial=item.kind==='material'&&(s.story.includes(repair.p)||s.prepared[repair.id]);
  const usedIngredient=item.kind==='ingredient'&&s.prepared[MAPS[item.map].nodes.find(n=>n.step===2).id];
  if(obtained||usedMaterial||usedIngredient){s.manual.push(item.id);if(item.kind!=='scene'&&item.kind!=='horse')s.completed[n.id]=true;}
 }
 for(const id of ['repairs','mementos'])if(s.claims.includes(id)){
  const r=id==='repairs'?{energy:60,coins:200,speed:1}:{energy:70,diamonds:20,speed:1};
  for(const [k,v]of Object.entries(r))s.legacyCredit[k]=(s.legacyCredit[k]||0)+v;
 }
 // The repaired scene is already committed in old saves, but its dialogue may be unfinished.
 if(s.dialog?.type==='prepare')s.dialog.type='scene';
 if(s.dialog?.type==='horse')s.dialog.type='scene';
 return s;
}
export function loadState(storage=globalThis.localStorage){try{const raw=storage.getItem(SAVE_KEY)||storage.getItem(LEGACY_SAVE_KEY);const s=JSON.parse(raw);if([1,2].includes(s?.schema)&&Array.isArray(s.story)&&Array.isArray(s.toys))return migrateState(s);}catch{}return initialState();}
export function saveState(s,storage=globalThis.localStorage){storage.setItem(SAVE_KEY,JSON.stringify(s));}
