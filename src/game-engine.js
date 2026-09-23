import {readBatch,randomStep} from './gacha.js';
import {CONFIG,COMMERCIAL,LOOP,ENERGY_OFFERS,MAPS,NODE_BY_ID,ZONES,TOYS,SEQUENCE,TAIL,TASKS,STORY_REWARD,COLLECTION_REWARD,CATEGORY_REWARD,MANUAL_ITEMS,STORY_ITEMS,ITEM_BY_ID,MANUAL_REWARD} from './config.js';
export const nowOf=(s,now=Date.now())=>now+s.clockOffset;
export const activityDay=s=>Math.floor((nowOf(s)+(CONFIG.timezoneOffset-CONFIG.resetHour)*3600000)/86400000);
export const eligible=s=>s.profile.level>=7&&s.profile.orders>=6&&s.feature!=='hard'&&(s.feature!=='soft'||s.started);
export const activeOffers=s=>!expired(s)&&nowOf(s)>=s.created+(CONFIG.days-COMMERCIAL.lastDays)*86400000?COMMERCIAL.offers.filter(o=>o.enabled):[];
export const collectionBadge=s=>['collection',...TOYS.filter(t=>t.id%5===0).map(t=>`quality-${t.q}`)].filter(id=>rewardFor(s,id).ready&&!s.claims.includes(id)).length;
export const expired=(s,now=Date.now())=>nowOf(s,now)>=s.created+CONFIG.days*86400000;
export function tick(s,now=Date.now()){const t=Math.min(nowOf(s,now),s.created+CONFIG.days*86400000);if(!s.online||s.ended)return;if(s.energy>=CONFIG.cap){s.lastRegen=t;return;} const n=Math.floor(Math.max(0,t-s.lastRegen)/CONFIG.regenMs);if(n){s.energy=Math.min(CONFIG.cap,s.energy+n);s.lastRegen+=n*CONFIG.regenMs;if(s.energy===CONFIG.cap)s.lastRegen=t;}}
export const done=(s,id)=>!!s.completed[id];
export const unlocked=(s,map)=>map===0||(s.story.includes(1)&&(map===1||s.installed.includes(map-1)));
export const accessible=(s,n)=>n.branch===LOOP.branch&&n.map===5?!s.ended&&s.story.length===17&&(!n.prev||done(s,n.prev)):n.type==='chest'?s.story.includes(n.p):(!n.prev||done(s,n.prev));
export function collectionTarget(s,id){let n=NODE_BY_ID[id];if(!n)return null;while(n.prev&&!done(s,n.prev)){n=NODE_BY_ID[n.prev];if(!n)return null;}return n;}
export function currentNode(s){const list=s.branch===null?MAPS[s.map].nodes:MAPS[s.map].branches[s.branch];return list?.find(n=>n.type!=='chest'&&!done(s,n.id)&&accessible(s,n));}
const fail=message=>({ok:false,message});
function log(s,type,detail={}){s.events.push({at:nowOf(s),type,...detail});if(s.events.length>500)s.events.shift();}
function reward(s,r){for(const [k,v] of Object.entries(r)){s[k]=(s[k]||0)+v;if(['wild','mergeGem','starPack','generator'].includes(k))s.inbox.push({type:k,amount:v});}}
export const ownsItem=(s,id)=>!!s.manual?.includes(id);
export const taskCount=(s,id)=>TASKS.find(t=>t.id===id)?.items.filter(i=>ownsItem(s,i.id)).length||0;
export const completedCollections=s=>TASKS.filter(t=>taskCount(s,t.id)===t.total).length;
function collect(s,id){if(MANUAL_ITEMS.some(i=>i.id===id)&&!s.manual.includes(id)){s.manual.push(id);log(s,'manual_collect',{id});}}
function netManualReward(s,r){return Object.fromEntries(Object.entries(r).map(([k,v])=>[k,Math.max(0,v-(s.legacyCredit?.[k]||0))]).filter(([,v])=>v>0));}
export function rewardFor(s,id){if(typeof id!=='string')return null;if(id==='manual-all')return {ready:completedCollections(s)===6,reward:netManualReward(s,MANUAL_REWARD),base:MANUAL_REWARD};if(id==='story')return {ready:s.story.length===17,reward:STORY_REWARD};if(id==='collection')return {ready:s.toys.length===25,reward:COLLECTION_REWARD};if(id.startsWith('quality-')){const q=Number(id.slice(8));if(!Number.isInteger(q)||q<0||q>4)return null;return {ready:TOYS.filter(t=>t.q===q).every(t=>s.toys.includes(t.id)),reward:CATEGORY_REWARD};}const t=TASKS.find(t=>t.id===id);return t?{ready:taskCount(s,id)>=t.total,reward:id==='horses'?t.reward:netManualReward(s,t.reward),base:t.reward}:null;}
function completeStory(s,n){if(s.story.includes(n.p))return;s.story.push(n.p);s.story.sort((a,b)=>a-b);s.completed[n.id]=true;s.tickets+=n.p===1?3:5;log(s,'story_complete',{p:n.p});}
function awardHorse(s,n){if(!s.horses.includes(n.map))s.horses.push(n.map);collect(s,`horse-${n.map}`);completeStory(s,n);log(s,'horse_obtain',{map:n.map});return {ok:true,horse:true,message:`${ZONES[n.map].horse}已收入手册 · 可自行回广场安装`};}
function setDialog(s,type,map,p,lines){s.dialog={type,map,p,index:0,lines};}
export function advanceDialog(s,skip=false){
 if(!s.dialog)return fail('没有进行中的剧情');if(!s.online)return fail('网络暂不可用，连接后继续');
 const d=s.dialog;if(!skip&&d.index<d.lines.length-1){d.index++;return {ok:true};}
 s.dialog=null;const n=MAPS[d.map].nodes.find(n=>n.p===d.p&&n.type==='story');
 if(d.type==='complete')completeStory(s,n);
 if(d.type==='scene'){
  s.prepared[n.id]=true;if(!n.collectAfter)for(const id of n.sceneItems||[])collect(s,id);
  if(n.step===1&&!s.repairs.includes(n.map))s.repairs.push(n.map);
  if(n.collectAfter)return {ok:true,collectReady:true,message:'轨道已经修好，点击收集这段回忆'};
  if(n.step<2)completeStory(s,n);
  else return {ok:true,dialogFinished:true,horseReady:true,message:`${ZONES[n.map].horse}出现了 · 点击领取`};
 }
 if(d.type==='install'){
  if(!s.installed.includes(d.map))s.installed.push(d.map);log(s,'horse_install',{map:d.map});
  if(d.map===5)setDialog(s,'final',0,17,[['莉亚','是你邀请我回来的。'],['蒙奇','你小时候说过，长大了也要再来。'],['莉亚','我现在还有很多事情要忙。'],['蒙奇','那就偶尔，给喜欢的事情留一点时间。'],['莉亚','好。这次，我记住了。']]);
 }
 if(d.type==='final'){if(!s.story.includes(17)){s.story.push(17);s.tickets+=5;log(s,'story_complete',{p:17});}return {ok:true,finale:true};}
 return {ok:true,dialogFinished:true,installed:d.type==='install'};
}
// Memory scenes start on arrival; repair and final scenes follow their configured manual actions.
export function resumeScene(s){
 if(s.dialog||s.pendingBatch||s.ended||!s.inside||!s.online||s.branch!==null)return;
 const n=currentNode(s);if(!n||n.type!=='story'||n.map===0)return;
 if(s.prepared[n.id]){
  if(n.step<2&&!n.collectAfter){for(const id of n.sceneItems||[])collect(s,id);completeStory(s,n);}return;
 }
 if(n.step>0&&!s.submitted[n.id])return;
 const z=ZONES[n.map];
 const required=STORY_ITEMS.filter(i=>i.map===n.map&&i.step===n.step&&['pickup','material','ingredient'].includes(i.kind));
 if(required.some(i=>!s.completed[i.nodeId]))return;
 const lines=n.step===0?[['莉亚',`是小时候的${z.memory}！原来我一直记得这里。`],['蒙奇',`沿着这条路，让${z.repair}重新运转吧。`]]:n.step===1?[['莉亚','东西都找齐了，路也清开了。'],['蒙奇',`看，${z.repair}重新亮起来了！`]]:[[n.map===2?'蒙奇':'莉亚',z.ending],['蒙奇',`是${z.horse}！把它收好，我们随时可以回广场。`]];
 setDialog(s,'scene',n.map,n.p,lines);
}
function startInstall(s){const h=s.horses.find(h=>!s.installed.includes(h));if(s.map===0&&h)setDialog(s,'install',h,null,[['蒙奇',`${ZONES[h].horse}终于回家了。看，它的位置一直在这里。`],['莉亚',h===5?'现在，大家都到齐了。':'我们再去接下一位老朋友吧。']]);}
function actCore(s,action,data={}){
 tick(s);if(action==='network'){s.online=data.online;return {ok:true};}
 if(!s.online)return fail('网络暂不可用，进度已保留，请连接后重试');
 if(action==='enter'){if(expired(s)){return settle(s);}if(!eligible(s))return fail('活动未开放：需要等级7、完成第6波订单且活动开关有效');s.inside=true;startInstall(s);return {ok:true};}
 if(action==='leave'){if(s.dialog||s.pendingBatch)return fail('请先完成当前剧情或查看抽取结果');s.inside=false;return expired(s)?settle(s):{ok:true};}
 if(action==='claimSettlement'){if(!s.settlement||s.settlement.claimed)return fail('补发奖励已经领取');reward(s,s.settlement.mailed);s.settlement.claimed=true;log(s,'settlement_claim');return {ok:true,reward:s.settlement.mailed};}
 if(s.ended)return fail('本期活动已结束');
 if(!s.inside)return fail('请先进入梦境博览会');
 if(s.dialog&&action!=='dialog')return fail('请先继续当前剧情');
 if(s.pendingBatch&&action!=='ackBatch')return fail('请先查看本次扭蛋结果');
 if(action==='start'){if(!eligible(s))return fail('活动未开放：需要等级7并完成第6波订单');s.started=true;return {ok:true};}
 if(action==='dialog')return advanceDialog(s,data.skip);
 if(action==='map'){if(!unlocked(s,data.map))return fail(`请先安装${ZONES[data.map-1]?.horse||'上一匹木马'}`);s.map=data.map;s.branch=null;startInstall(s);log(s,'map_enter',{map:s.map});return {ok:true};}
 if(action==='branch'){if(data.branch===null){s.branch=null;return {ok:true};}const b=MAPS[s.map].branches[data.branch];if(!b||(data.branch===LOOP.branch?s.map!==5||s.story.length!==17:!done(s,b[0].prev)))return fail('完成对应剧情后开放这条岔路');s.branch=data.branch;return {ok:true};}
 if(action==='node'){
  const n=NODE_BY_ID[data.id];if(!n||n.map!==s.map||n.branch!==undefined&&n.branch!==s.branch)return fail('请前往目标所在位置');
  if(done(s,n.id))return fail('已经完成，可以继续探索');if(!accessible(s,n))return fail('前方还有障碍，先清开道路');
  if(n.type==='obstacle'){
   const stage=s.stages[n.id]||0,cost=n.segments[stage];
   if(s.energy<cost)return {...fail('体力不足'),needEnergy:true,cost};
   const wasFull=s.energy>=CONFIG.cap;s.energy-=cost;if(wasFull)s.lastRegen=nowOf(s);s.spent+=cost;s.stages[n.id]=stage+1;
   s.dropSeed=randomStep(s.dropSeed);const drop=CONFIG.ticketDrops[s.dropSeed%CONFIG.ticketDrops.length];s.tickets+=drop;
   if(stage+1===n.segments.length)s.completed[n.id]=true;
   if(s.tutorial===0)s.tutorial=1;
   log(s,'clear',{id:n.id,stage:stage+1,cost,drop,round:s.loopRound});return {ok:true,cost,drop,cleared:done(s,n.id)};
  }
  if(n.type==='chest'){s.completed[n.id]=true;reward(s,{[n.kind]:n.amount});log(s,'chest',{id:n.id});return {ok:true,reward:{[n.kind]:n.amount}};}
  if(['material','ingredient','pickup'].includes(n.type)){
   s.completed[n.id]=true;collect(s,n.item);if(n.type==='material')s.materials[`${s.map}-${n.material}`]=true;if(n.type==='ingredient')s.ingredients=true;
   return {ok:true,message:MANUAL_ITEMS.some(i=>i.id===n.item)?`${n.name}已放入任务手册`:`${n.name}已收好，到达修复点后提交`};
  }
  if(n.type==='supply'){s.completed[n.id]=true;reward(s,n.reward);if(n.repeat){s.loopRound++;for(const node of MAPS[5].branches[LOOP.branch]){delete s.completed[node.id];delete s.stages[node.id];}log(s,'loop_complete',{round:s.loopRound});}return {ok:true,reward:n.reward,loop:!!n.repeat};}
  if(n.type==='story'){
   if(s.map===0){setDialog(s,'complete',0,1,[['莉亚','邀请券上的旋转木马，怎么是空的？'],['蒙奇','五匹木马还在门后的展区里。帮那些地方重新运转，它们就能回来。'],['莉亚','那就先去甜点花园看看。']]);return {ok:true};}
   if(n.collectAfter&&s.prepared[n.id]){for(const id of n.sceneItems)collect(s,id);completeStory(s,n);return {ok:true,message:'修复轨道已收入手册'};}
   if(n.step===2&&s.prepared[n.id])return awardHorse(s,n);
   if(n.step===1)return fail('请点击修复按钮提交材料');
   if(n.step===2)s.submitted[n.id]=true;
   resumeScene(s);return s.dialog?{ok:true}:fail('沿主路清障并拾取所需道具即可继续');
  }
 }
 if(action==='submit'){
  const n=NODE_BY_ID[data.id];if(!n||n.type!=='story'||n.step!==1||n.map!==s.map||!accessible(s,n)||s.submitted[n.id])return fail('当前不可提交');
  const required=STORY_ITEMS.filter(i=>i.map===n.map&&i.step===1&&i.kind==='material');
  if(required.some(i=>!s.completed[i.nodeId]))return fail('材料不足，请先沿主路收集');
  s.submitted[n.id]=true;for(const item of required)s.materials[`${n.map}-${item.slot}`]=false;log(s,'submit_materials',{id:n.id});return {ok:true};
 }
 if(action==='claim'){const r=rewardFor(s,data.id);if(!r||!r.ready)return fail('集齐目标后即可领取');if(s.claims.includes(data.id))return fail('奖励已经领取');reward(s,r.reward);if(data.id==='manual-all'||data.id.startsWith('region-'))for(const [k,v]of Object.entries(r.base))s.legacyCredit[k]=Math.max(0,(s.legacyCredit[k]||0)-v);s.claims.push(data.id);log(s,'claim',{id:data.id});return {ok:true,reward:r.reward};}
 if(action==='draw'){
  if(!Number.isSafeInteger(CONFIG.ticketCost)||CONFIG.ticketCost<1)return fail('扭蛋券配置不可用');
  const count=data.count;
  if(data.free||!CONFIG.multipliers.includes(count))return fail('无效倍率');
  if(s.tickets<count*CONFIG.ticketCost)return fail('抽奖券不足，请继续探险获取');
  const batch=readBatch(s.gacha,count);if(!batch)return fail('奖励房间配置不可用，本次未扣券');
  s.tickets-=count*CONFIG.ticketCost;s.paidDraws+=count;s.gacha=batch.next;
  const results=[];for(const r of batch.results){
   if(r.type==='toy'){
    const duplicate=s.toys.includes(r.id),toy=TOYS[r.id],energy=duplicate?CONFIG.duplicateEnergy[toy.q]:0;
    if(duplicate)reward(s,{energy});else{s.toys.push(r.id);s.newToys.push(r.id);}
    results.push({...r,duplicate,energy});
   }else{reward(s,{[r.type]:r.amount});results.push({...r});}
  }
  s.sequence+=count;s.pendingBatch={results,count};log(s,'gacha',{count,room:s.gacha.room,position:s.sequence});return {ok:true,results};
 }
 if(action==='viewCollection'){s.newToys=[];return {ok:true};}
 if(action==='tutorial'){s.tutorial=Math.max(s.tutorial,Math.min(4,data.step));return {ok:true};}
 if(action==='ackBatch'){s.pendingBatch=null;return {ok:true};}
 if(action==='viewToy'){s.newToys=s.newToys.filter(id=>id!==data.id);return {ok:true};}
 if(action==='exchange'){if(expired(s))return fail('活动已到期，停止外部补给');const day=activityDay(s),used=s.exchanges[day]||0;const c=ENERGY_OFFERS.find(o=>o.id===(data.offer||'large'));if(!c)return fail('兑换档位不可用');if(used>=CONFIG.exchange.limit)return fail('今日体验兑换次数已用完');if(s.diamonds<c.diamonds)return fail('钻石不足');s.diamonds-=c.diamonds;s.energy+=c.energy;s.exchanges[day]=used+1;log(s,'exchange');return {ok:true,reward:{energy:c.energy}};}
 return fail('未识别的操作');
}
export function act(s,action,data={}){const r=actCore(s,action,data);if(r.ok)resumeScene(s);return r;}
// Upstream contract: explicit event ID and externally supplied award, no inferred R formula.
export function receiveOrder(s,id,amount){if(!s.online||s.ended||expired(s)||!eligible(s))return fail('当前不可接收订单补给');if(s.orders.includes(id))return fail('这笔订单已经发放过');if(!Number.isSafeInteger(amount)||amount<0||amount>100000)return fail('订单奖励配置无效');s.orders.push(id);s.energy+=amount;log(s,'order',{id,amount});return {ok:true,reward:{energy:amount}};}
export function settle(s){
 if(s.ended)return {ok:true};if(!s.online)return fail('连接后才能确认活动结算');
 const mailed={},ids=[...TASKS.map(t=>t.id),'manual-all','story','collection',...Array.from({length:5},(_,q)=>`quality-${q}`)];
 for(const id of ids){const r=rewardFor(s,id);if(r.ready&&!s.claims.includes(id)){
  if(id==='manual-all'||id.startsWith('region-'))for(const [k,v]of Object.entries(r.base))s.legacyCredit[k]=Math.max(0,(s.legacyCredit[k]||0)-v);
  for(const [k,v]of Object.entries(r.reward))if(k!=='energy')mailed[k]=(mailed[k]||0)+v;
 }}
 // §9.9: no map-chest recovery or energy conversion. Main rewards wait for one explicit claim.
 s.settlement={mailed,claimed:Object.keys(mailed).length===0,story:s.story.length,horses:s.horses.length,toys:s.toys.length,clearedEnergy:s.energy};
 s.ended=true;s.energy=0;s.tickets=0;s.free=0;s.duplicate=0;s.manual=[];s.legacyCredit={};s.materials={};s.ingredients=false;s.horses=[];s.installed=[];s.toys=[];s.newToys=[];s.repairs=[];s.mementos=[];s.story=[];s.stages={};s.completed={};s.prepared={};s.submitted={};s.sequence=0;s.gacha=null;s.dialog=null;s.pendingBatch=null;s.inside=false;log(s,'settlement');return {ok:true};
}
