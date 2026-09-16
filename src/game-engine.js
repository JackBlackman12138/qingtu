import {CONFIG,MAPS,NODE_BY_ID,ZONES,TOYS,SEQUENCE,TAIL,TASKS,STORY_REWARD,COLLECTION_REWARD,CATEGORY_REWARD} from './config.js';
export const nowOf=(s,now=Date.now())=>now+s.clockOffset;
export const expired=(s,now=Date.now())=>nowOf(s,now)>=s.created+CONFIG.days*86400000;
export function tick(s,now=Date.now()){const t=Math.min(nowOf(s,now),s.created+CONFIG.days*86400000);if(!s.online||s.ended)return;if(s.energy>=CONFIG.cap){s.lastRegen=t;return;} const n=Math.floor(Math.max(0,t-s.lastRegen)/CONFIG.regenMs);if(n){s.energy=Math.min(CONFIG.cap,s.energy+n);s.lastRegen+=n*CONFIG.regenMs;if(s.energy===CONFIG.cap)s.lastRegen=t;}}
export const done=(s,id)=>!!s.completed[id];
export const unlocked=(s,map)=>map===0||(s.story.includes(1)&&(map===1||s.installed.includes(map-1)));
export const accessible=(s,n)=>n.type==='chest'?s.story.includes(n.p):(!n.prev||done(s,n.prev));
export function currentNode(s){const list=s.branch===null?MAPS[s.map].nodes:MAPS[s.map].branches[s.branch];return list?.find(n=>n.type!=='chest'&&!done(s,n.id)&&accessible(s,n));}
const fail=message=>({ok:false,message});
function log(s,type,detail={}){s.events.push({at:nowOf(s),type,...detail});if(s.events.length>500)s.events.shift();}
function reward(s,r){for(const [k,v] of Object.entries(r))s[k]+=v;}
export const taskCount=(s,id)=>s[id].length;
export function rewardFor(s,id){if(id==='story')return {ready:s.story.length===17,reward:STORY_REWARD};if(id==='collection')return {ready:s.toys.length===25,reward:COLLECTION_REWARD};if(id.startsWith('quality-')){const q=Number(id.slice(8));return {ready:TOYS.filter(t=>t.q===q).every(t=>s.toys.includes(t.id)),reward:CATEGORY_REWARD};}const t=TASKS.find(t=>t.id===id);return t?{ready:taskCount(s,id)>=t.total,reward:t.reward}:null;}
function completeStory(s,n){if(s.story.includes(n.p))return;s.story.push(n.p);s.story.sort((a,b)=>a-b);s.completed[n.id]=true;s.tickets+=n.p===1?3:5;log(s,'story_complete',{p:n.p});}
function setDialog(s,type,map,p,lines){s.dialog={type,map,p,index:0,lines};}
export function advanceDialog(s,skip=false){if(!s.dialog)return fail('没有进行中的剧情');if(!s.online)return fail('网络暂不可用，连接后继续');const d=s.dialog;if(!skip&&d.index<d.lines.length-1){d.index++;return {ok:true};}s.dialog=null;const n=MAPS[d.map].nodes.find(n=>n.p===d.p&&n.type==='story');if(d.type==='complete')completeStory(s,n);if(d.type==='prepare')s.prepared[n.id]=true;if(d.type==='install'){if(!s.installed.includes(d.map))s.installed.push(d.map);log(s,'horse_install',{map:d.map});if(d.map===5)setDialog(s,'final',0,17,[['莉亚','是你邀请我回来的。'],['蒙奇','你小时候说过，长大了也要再来。'],['莉亚','我现在还有很多事情要忙。'],['蒙奇','那就偶尔，给喜欢的事情留一点时间。'],['莉亚','好。这次，我记住了。']]);}if(d.type==='final'){if(!s.story.includes(17)){s.story.push(17);s.tickets+=5;log(s,'story_complete',{p:17});}return {ok:true,finale:true};}return {ok:true,dialogFinished:true};}
function startInstall(s){const h=s.horses.find(h=>!s.installed.includes(h));if(s.map===0&&h)setDialog(s,'install',h,null,[['蒙奇',`${ZONES[h].horse}终于回家了。看，它的位置一直在这里。`],['莉亚',h===5?'现在，大家都到齐了。':'我们再去接下一位老朋友吧。']]);}
export function act(s,action,data={}){
 tick(s);if(action==='network'){s.online=data.online;return {ok:true};}
 if(!s.online)return fail('网络暂不可用，进度已保留，请连接后重试');
 if(action==='enter'){if(expired(s)){return settle(s);}s.inside=true;startInstall(s);return {ok:true};}
 if(action==='leave'){if(s.dialog||s.pendingBatch)return fail('请先完成当前剧情或查看抽取结果');s.inside=false;return expired(s)?settle(s):{ok:true};}
 if(s.ended)return fail('本期活动已结束');
 if(!s.inside)return fail('请先进入梦境博览会');
 if(s.dialog&&action!=='dialog')return fail('请先继续当前剧情');
 if(s.pendingBatch&&action!=='ackBatch')return fail('请先查看本次扭蛋结果');
 if(action==='start'){s.started=true;return {ok:true};}
 if(action==='dialog')return advanceDialog(s,data.skip);
 if(action==='map'){if(!unlocked(s,data.map))return fail(`请先安装${ZONES[data.map-1]?.horse||'上一匹木马'}`);s.map=data.map;s.branch=null;startInstall(s);log(s,'map_enter',{map:s.map});return {ok:true};}
 if(action==='branch'){if(data.branch===null){s.branch=null;return {ok:true};}const b=MAPS[s.map].branches[data.branch];if(!b||!done(s,b[0].prev))return fail('完成对应剧情后开放这条岔路');s.branch=data.branch;return {ok:true};}
 if(action==='node'){
  const n=NODE_BY_ID[data.id];if(!n||n.map!==s.map||n.branch!==undefined&&n.branch!==s.branch)return fail('请前往目标所在位置');
  if(done(s,n.id))return fail('已经完成，可以继续探索');if(!accessible(s,n))return fail('前方还有障碍，先清开道路');
  if(n.type==='obstacle'){const stage=s.stages[n.id]||0,cost=n.segments[stage];if(s.energy<cost)return {...fail(`需要${cost}活动体力，当前${s.energy}`),needEnergy:true,cost};const wasFull=s.energy>=CONFIG.cap;s.energy-=cost;if(wasFull)s.lastRegen=nowOf(s);s.spent+=cost;s.stages[n.id]=stage+1;let drop=0;if(stage+1===n.segments.length){s.completed[n.id]=true;drop=n.drop;s.tickets+=drop;}log(s,'clear',{id:n.id,stage:stage+1,cost,drop});return {ok:true,cost,drop,cleared:done(s,n.id)};}
  if(n.type==='chest'){s.completed[n.id]=true;reward(s,{[n.kind]:n.amount});log(s,'chest',{id:n.id});return {ok:true,reward:{[n.kind]:n.amount}};}
  if(n.type==='material'){s.completed[n.id]=true;s.materials[`${s.map}-${n.material}`]=true;return {ok:true,message:`收好${n.name}，修复时就能用上`};}
  if(n.type==='ingredient'){s.completed[n.id]=true;s.ingredients=true;return {ok:true,message:'甜点食材已备好'};}
  if(n.type==='memento'){s.completed[n.id]=true;s.mementos.push(n.id);return {ok:true,message:`${n.name}已放入任务手册`};}
  if(n.type==='story'){
   const z=ZONES[s.map];if(s.map===0){setDialog(s,'complete',0,1,[['莉亚','邀请券上的旋转木马，怎么是空的？'],['蒙奇','五匹木马还在门后的展区里。帮那些地方重新运转，它们就能回来。'],['莉亚','那就先去甜点花园看看。']]);return {ok:true};}
   if(n.step===0){setDialog(s,'complete',s.map,n.p,[['莉亚',`是小时候的${z.memory}！原来我一直记得这里。`],['蒙奇',`沿着这条路，把${z.repair}修好，也许就能找到木马。`]]);return {ok:true};}
   if(n.step===1){if(!s.prepared[n.id]){if(![0,1].every(i=>s.materials[`${s.map}-${i}`]))return fail('还缺少修复材料，请沿主路拾取');[0,1].forEach(i=>delete s.materials[`${s.map}-${i}`]);setDialog(s,'prepare',s.map,n.p,[['莉亚',`${z.material.join('和')}都找齐了。让${z.repair}重新运转吧！`],['蒙奇','听，它恢复了！别忘了收下这枚纪念标记。']]);return {ok:true};}s.repairs.push(s.map);completeStory(s,n);return {ok:true,message:`${z.repair}纪念标记已放入手册`};}
   if(!s.prepared[n.id]){if(s.map===1&&!s.ingredients)return fail('先沿主路找齐甜点食材');if(s.map===1)s.ingredients=false;setDialog(s,'prepare',s.map,n.p,[[s.map===2?'蒙奇':'莉亚',z.ending],['蒙奇',`是${z.horse}！把它收好，我们随时可以回广场。`]]);return {ok:true};}
   s.horses.push(s.map);completeStory(s,n);log(s,'horse_obtain',{map:s.map});return {ok:true,horse:true,message:`${z.horse}已收入手册 · 可自行回广场安装`};
  }
 }
 if(action==='claim'){const r=rewardFor(s,data.id);if(!r||!r.ready)return fail('集齐目标后即可领取');if(s.claims.includes(data.id))return fail('奖励已经领取');reward(s,r.reward);s.claims.push(data.id);log(s,'claim',{id:data.id});return {ok:true,reward:r.reward};}
 if(action==='draw'){
  const count=data.free?1:data.count;if(!CONFIG.multipliers.includes(count))return fail('无效倍率');if(data.free?s.free<1:s.tickets<count*CONFIG.ticketCost)return fail(data.free?'重复玩具积累满20点可获得免费次数':`本次需要${count*CONFIG.ticketCost}张券，当前${s.tickets}张，请切换倍率或继续探索`);
  const seq=Array.from({length:count},(_,i)=>{const pos=s.sequence+i;return pos<SEQUENCE.length?SEQUENCE[pos]:TAIL[(pos-SEQUENCE.length)%TAIL.length];});if(seq.some(r=>!r))return fail('序列配置不可用，本次未扣券');
  if(data.free)s.free--;else {s.tickets-=count*CONFIG.ticketCost;s.paidDraws+=count;}
  const results=[];for(const r of seq){if(r.type==='toy'){const duplicate=s.toys.includes(r.id),toy=TOYS[r.id];if(duplicate){s.duplicate+=toy.q+1;s.free+=Math.floor(s.duplicate/CONFIG.duplicateThreshold);s.duplicate%=CONFIG.duplicateThreshold;}else{s.toys.push(r.id);s.newToys.push(r.id);}results.push({...r,duplicate,points:duplicate?toy.q+1:0});}else{reward(s,{[r.type]:r.amount});results.push({...r});}}
  s.sequence+=count;s.pendingBatch={results,count,free:!!data.free};log(s,'gacha',{count,position:s.sequence,free:!!data.free});return {ok:true,results};
 }
 if(action==='ackBatch'){s.pendingBatch=null;return {ok:true};}
 if(action==='viewToy'){s.newToys=s.newToys.filter(id=>id!==data.id);return {ok:true};}
 if(action==='exchange'){if(expired(s))return fail('活动已到期，停止外部补给');const day=Math.floor((nowOf(s)-s.created)/86400000),used=s.exchanges[day]||0;const c=CONFIG.exchange;if(used>=c.limit)return fail('今日体验兑换次数已用完');if(s.diamonds<c.diamonds)return fail('钻石不足');s.diamonds-=c.diamonds;s.energy+=c.energy;s.exchanges[day]=used+1;log(s,'exchange');return {ok:true,reward:{energy:c.energy}};}
 return fail('未识别的操作');
}
// Upstream contract: explicit event ID and externally supplied award, no inferred R formula.
export function receiveOrder(s,id,amount){if(!s.online||s.ended||expired(s))return fail('当前不可接收订单补给');if(s.orders.includes(id))return fail('这笔订单已经发放过');if(!Number.isSafeInteger(amount)||amount<0||amount>100000)return fail('订单奖励配置无效');s.orders.push(id);s.energy+=amount;log(s,'order',{id,amount});return {ok:true,reward:{energy:amount}};}
export function settle(s){if(s.ended)return {ok:true};if(!s.online)return fail('连接后才能确认活动结算');let coins=0,energy=s.energy;const mailed={};for(const m of MAPS)for(const n of m.nodes.filter(n=>n.type==='chest'))if(accessible(s,n)&&!done(s,n.id)){if(n.kind==='coins')coins+=n.amount;else energy+=n.amount;}
 for(const id of [...TASKS.map(t=>t.id),'story']){const r=rewardFor(s,id);if(r.ready&&!s.claims.includes(id))for(const [k,v]of Object.entries(r.reward)){if(k==='energy')energy+=v;else mailed[k]=(mailed[k]||0)+v;}}
 const rate=s.review.energyConversion;const converted=typeof rate==='number'?Math.floor(energy*rate):0;coins+=converted;reward(s,{...mailed,coins:coins+(mailed.coins||0)});s.settlement={coins,mailed,pendingEnergy:rate===null?energy:0,converted,story:s.story.length,horses:s.horses.length,toys:s.toys.length};s.ended=true;s.energy=0;s.tickets=0;s.free=0;s.duplicate=0;s.materials={};s.ingredients=false;s.horses=[];s.installed=[];s.toys=[];s.newToys=[];s.repairs=[];s.mementos=[];s.story=[];s.stages={};s.completed={};s.prepared={};s.sequence=0;s.dialog=null;s.pendingBatch=null;s.inside=false;log(s,'settlement');return {ok:true};}
