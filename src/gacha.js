import {GACHA_ROOMS,GACHA_TAIL,TOYS} from './config.js';
// A saved seed + room + cursor reconstructs the exact remaining, non-replacing pool.
export function randomStep(seed){return (Math.imul(seed,1664525)+1013904223)>>>0;}
export function roomOrder(seed,room){
 const pool=room<GACHA_ROOMS.length?GACHA_ROOMS[room]:GACHA_TAIL;
 if(!pool?.length)return [];
 const order=Array.from({length:pool.length},(_,i)=>i);let r=randomStep((seed^Math.imul(room+1,2654435761))>>>0);
 for(let i=order.length-1;i>0;i--){r=randomStep(r);const j=r%(i+1);[order[i],order[j]]=[order[j],order[i]];}
 return order.map(index=>({...pool[index],slot:index,room}));
}
export function readBatch(gacha,count){
 const next={...gacha},results=[];
 for(let i=0;i<count;i++){
  let order=roomOrder(next.seed,next.room);
  if(!order.length)return null;
  if(next.cursor>=order.length){next.room++;next.cursor=0;order=roomOrder(next.seed,next.room);}
  const result=order[next.cursor];
  if(!result||result.type==='toy'&&!TOYS[result.id]||result.type!=='toy'&&(!['energy','coins','mainEnergy','speed','generator'].includes(result.type)||!Number.isSafeInteger(result.amount)||result.amount<0))return null;
  results.push(result);next.cursor++;
 }
 return {next,results};
}
