// V1.2 §§9,12. All unconfirmed values are review configuration, not production economy.
export const CONFIG = { days:13, initialEnergy:150, cap:150, regenMs:360000, ticketCost:1, duplicateThreshold:20, multipliers:[1,5,10], orderEnergy:80, exchange:{diamonds:30,energy:100,limit:5}, energyConversion:null, version:'review-v1.2-demo-1' };
export const ENERGY_OFFERS=[{id:'small',energy:40,diamonds:12},{id:'large',energy:100,diamonds:30}];
CONFIG.version='review-v1.3-demo-2';
export const ZONES = [
 {name:'中央广场',en:'THE DREAM EXPO',short:'广场',horse:'',colors:['#b7d8c8','#eef4d4','#6cad97'],budget:50,side:0,ops:8,chest:30,icon:'carousel'},
 {name:'甜点花园',en:'SUGAR & WONDER',short:'甜点',horse:'糖霜木马',colors:['#bfdfb6','#f1edc4','#84b896'],budget:700,side:100,ops:54,chest:100,icon:'cake',memo:['小围裙','茶杯'],material:['烤炉零件','烤炉把手'],repair:'烤炉',memory:'旧食谱',ending:'原来，我已经实现过一个小时候的愿望。'},
 {name:'发条玩具屋',en:'A LITTLE CLOCKWORK',short:'玩具',horse:'发条木马',colors:['#c2d9c7','#f4e0b7','#82afa1'],budget:1100,side:200,ops:55,chest:150,icon:'train',memo:['积木车票','锡兵'],material:['轨道','发条'],repair:'轨道',memory:'火车设计图',ending:'零件不一样，也能继续往前走。'},
 {name:'云端小剧场',en:'ABOVE THE CLOUDS',short:'剧场',horse:'云朵木马',colors:['#cdc9e7','#edf1ed','#aaa3ca'],budget:1550,side:350,ops:65,chest:220,icon:'theater',memo:['纸皇冠','木偶票'],material:['灯泡','幕布配件'],repair:'舞台',memory:'旧节目单',ending:'那时候，几只玩偶就是我的全部观众。'},
 {name:'纸船远航湾',en:'WHERE DREAMS SAIL',short:'远航',horse:'海浪木马',colors:['#a5d9d8','#e7ead0','#6bafb1'],budget:1950,side:500,ops:67,chest:280,icon:'boat',memo:['贝壳','旧指南针'],material:['水闸零件','水闸摇柄'],repair:'水闸',memory:'纸船与路线图',ending:'下次，就从一条没走过的小路开始吧。'},
 {name:'星光观景台',en:'A SKY FULL OF US',short:'星光',horse:'星光木马',colors:['#979fcb','#d8d2ec','#777eae'],budget:2450,side:650,ops:72,chest:420,icon:'scope',memo:['兔子徽章','星星贴纸'],material:['镜片','把手'],repair:'望远镜',memory:'旧星图',ending:'原来，小时候陪我看星星的就是你。'},
];
export const QUALITY=['绿','蓝','紫','红','金'];
ZONES.forEach((z,i)=>{z.repairIcon=['carousel','oven','tracks','theater','gate','scope'][i];});
const toyNames=['茶杯兔','草莓熊','蘑菇屋','布丁猫','叶子鸟','发条鸭','积木城堡','小火车','锡兵队长','音乐盒','云朵羊','纸皇冠','月亮摇椅','星星木偶','飞行鲸','瓶中船','灯塔','珊瑚鹿','海螺琴','水手兔','星光兔','梦境木马','星球仪','月亮船','蒙奇玩偶'];
export const TOYS=toyNames.map((name,i)=>({id:i,name,q:Math.floor(i/5),icon:['bunny','bear','mushroom','cat','bird','duck','castle','train','soldier','music','sheep','crown','moon','bunny','whale','bottle','lighthouse','deer','harp','sailor','bunny','horse','planet','boat','monkey'][i]}));
export const TASKS=[{id:'horses',title:'木马归来',sub:'让五位老朋友重新相聚',total:5,reward:{energy:70,coins:300,mainEnergy:50}}, {id:'repairs',title:'修复展品',sub:'修复后，再收下纪念标记',total:5,reward:{energy:60,coins:200,speed:1}}, {id:'mementos',title:'童年纪念',sub:'沿着岔路，找回十件小小回忆',total:10,reward:{energy:70,diamonds:20,speed:1}}];
export const STORY_REWARD={coins:1000,diamonds:50,mainEnergy:100,generator:1};
export const COLLECTION_REWARD={energy:100,diamonds:30,generator:1};
export const CATEGORY_REWARD={energy:20,coins:100};
const allocate=(sum,n)=>{const weights=Array.from({length:n},(_,i)=>[0.7,1,0.85,1.3,1.15][i%5]); const w=weights.reduce((a,b)=>a+b,0); const a=weights.map(x=>Math.floor(sum*x/w)); for(let i=0,rem=sum-a.reduce((s,v)=>s+v,0);i<rem;i++)a[i%n]++;return a;};
function createMap(z,zi){
 const nodes=[];let prev=null;let serial=0;let row=0;
 const add=(type,extra={})=>{const node={id:`${zi}-${serial++}`,map:zi,type,prev,x:225+Math.sin(row*.76)*105,y:220+row*94,...extra};nodes.push(node);if(!['chest','portal'].includes(type)){prev=node.id;row++;}return node;};
 const storyCount=zi===0?1:3;
 const budgets=zi===0?[50]:[Math.round(z.budget*.25),Math.round(z.budget*.35),z.budget-Math.round(z.budget*.25)-Math.round(z.budget*.35)];
 const counts=zi===0?[8]:[Math.round(z.ops*.25),Math.round(z.ops*.35),z.ops-Math.round(z.ops*.25)-Math.round(z.ops*.35)];
 for(let s=0;s<storyCount;s++){
  const costs=allocate(budgets[s],counts[s]);
  for(let i=0;i<costs.length;i++){
   let segments=[costs[i]];if(i%6===4&&i+1<costs.length)segments.push(costs[++i]);
   add('obstacle',{segments,name:['梦境藤蔓','糖晶石堆','旧木箱'][i%3],icon:['bush','rock','crate'][i%3],drop:serial%3===0?2:0});
   if(zi>0&&s===1&&(i===1||i===7))add('material',{name:z.material[i===1?0:1],icon:'gear',material:i===1?0:1});
   if(zi===1&&s===2&&i===2)add('ingredient',{name:'甜点食材',icon:'cake'});
  }
  const p=zi===0?1:2+(zi-1)*3+s;
  const event=add('story',{p,step:s,name:zi===0?'空着的旋转木马':s===0?z.memory:s===1?`修复${z.repair}`:`找回${z.horse}`,icon:zi===0?'carousel':s===0?'book':s===1?z.repairIcon:'horse'});
  const ec=zi===0?15:allocate(z.chest,3)[s];
  nodes.push({id:`chest-${p}-energy`,map:zi,type:'chest',p,name:'活动体力宝箱',kind:'energy',amount:ec,x:event.x-67,y:event.y+73,icon:'chest'});
  nodes.push({id:`chest-${p}-coins`,map:zi,type:'chest',p,name:'金币宝箱',kind:'coins',amount:10+zi*5,x:event.x+67,y:event.y+73,icon:'chest'});row++;
 }
 if(zi===0){nodes.push({id:'chest-17-energy',map:0,type:'chest',p:17,name:'活动体力宝箱',kind:'energy',amount:15,x:135,y:1770,icon:'chest'},{id:'chest-17-coins',map:0,type:'chest',p:17,name:'金币宝箱',kind:'coins',amount:40,x:315,y:1770,icon:'chest'});row+=2;}
 const branches=[];
 if(zi>0)for(let b=0;b<2;b++){
  let branchPrev=nodes.find(n=>n.type==='story'&&n.step===b).id;
  const branch=[];const costs=allocate(Math.floor(z.side/2)+(b?z.side%2:0),Math.max(2,Math.round(z.side/2/30)));
  costs.forEach((cost,i)=>{const n={id:`${zi}-side-${b}-${i}`,map:zi,type:'obstacle',prev:branchPrev,segments:[cost],name:'岔路障碍',icon:'bush',drop:1,branch:b,x:170+(i%2)*100,y:170+i*100};branch.push(n);branchPrev=n.id;});
  branch.push({id:`memo-${zi}-${b}`,map:zi,type:'memento',prev:branchPrev,name:z.memo[b],icon:b?'gift':'bunny',branch:b,x:225,y:170+costs.length*100});branches.push(branch);
 }
 return {nodes,branches,height:Math.max(1450,row*94+430)};
}
export const MAPS=ZONES.map(createMap);
export const allNodes=()=>MAPS.flatMap(m=>[...m.nodes,...m.branches.flat()]);
export const NODE_BY_ID=Object.fromEntries(allNodes().map(n=>[n.id,n]));
// Logical path order remains stable for existing saves. Display coordinates run upward.
export function mapHeight(map,branch=null){return branch===null?(map===0?1930:MAPS[map].height):Math.max(900,MAPS[map].branches[branch].at(-1).y+270);}
export function sceneY(node,map=node.map,branch=node.branch??null){if(node.p===17)return 790;return mapHeight(map,branch)-node.y;}
// Review sequence: 25 first discoveries distributed over 120 items, last first at 120.
export const FIRST_POSITIONS=[1,3,6,9,12,16,20,24,28,32,37,42,47,52,57,63,69,75,81,87,94,101,108,114,120];
export const SEQUENCE=Array.from({length:120},(_,i)=>{const pos=i+1; const first=FIRST_POSITIONS.indexOf(pos);if(first>=0)return {type:'toy',id:first};if(pos%4===0)return {type:'energy',amount:40};if(pos%7===0)return {type:'coins',amount:30};if(pos%13===0)return {type:'speed',amount:1};return {type:'toy',id:(pos*7)%Math.max(1,FIRST_POSITIONS.filter(p=>p<pos).length)};});
const energyEntries=SEQUENCE.filter(r=>r.type==='energy');
energyEntries.forEach((r,i)=>{r.amount=Math.floor(800/energyEntries.length)+(i<800%energyEntries.length?1:0);});
export const TAIL=[{type:'energy',amount:20},{type:'coins',amount:30},{type:'toy',id:2},{type:'mainEnergy',amount:10},{type:'toy',id:8},{type:'speed',amount:1},{type:'toy',id:12},{type:'energy',amount:20}];
