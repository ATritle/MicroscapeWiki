import {compareCombat,equipmentBonuses,COMBAT_XP_RATES} from './combat-comparison.js?v=vendors-20261120';
export const MAX_STEPS=20;
export const MAX_ACTIONS=1_000_000_000;
const goals=new Set(['actions','level','items-gte','items-lte','indefinite']);
const slots=new Set(['head','body','weapon','shield','hands','feet','cape','tool','amulet','ring','food','ammo','pet','potion1','potion2','potion3','hair','skin']);
const thresholds=[0,0];let points=0;
for(let n=1;n<99;n++){points+=Math.floor(n+300*2**(n/7));thresholds[n+1]=Math.floor(points/4)*10;}
export const queueXpThreshold=n=>thresholds[n];
export function queueLevel(xp){let n=1;while(n<99&&thresholds[n+1]<=xp)n++;return n;}
const amount=(n,max=1e12)=>Number.isFinite(n)&&n>=0&&n<=max;
export function activityXpText(a,catalog){
  if(a.mob)return 'Combat XP estimate';
  const skill=id=>catalog.skills.find(s=>s.id===id)?.name||id;
  const parts=[...(a.exp>0?[a.exp.toLocaleString('en')+' '+skill(a.skill)+' XP']:[]),...Object.entries(a.otherExp||{}).filter(([,n])=>n>0).map(([id,n])=>n.toLocaleString('en')+' '+skill(id)+' XP')];
  return parts.length?parts.join(' + '):'0 XP';
}
export function activityPlanningNotes(a,catalog){
  const notes=[],item=id=>catalog.items[id]?.name||id;
  if(a.singleExecution&&!a.travelsTo)notes.push('Single action: the game stops after completion. Restart manually for another action, only if the game permits it. One-time unlocks, ownership limits and other prerequisites are not verified.');
  if(!a.mob&&!(a.exp>0))notes.push(Object.values(a.otherExp||{}).some(n=>n>0)?'No '+(catalog.skills.find(s=>s.id===a.skill)?.name||a.skill)+' XP. '+activityXpText(a,catalog)+' per action is included in total XP.':'0 XP: this utility, exchange or travel activity does not train a skill.');
  if(a.randomOutputs?.length)notes.push('Random rewards are excluded from guaranteed materials and item-count targets: '+a.randomOutputs.map(i=>item(i.id)+' ('+(i.chance*100).toLocaleString('en',{maximumFractionDigits:4})+'%)').join(', ')+'. Use an action-count target to budget attempts.');
  if(a.travelsTo)notes.push('Travel to '+a.travelsTo.name+'. Plan one boat trip per step and select the return trip separately. Only this activity’s base time is included; travel between other activities is not tracked.');
  if(a.requiredItems?.length)notes.push('Required item: '+a.requiredItems.map(item).join(', ')+'. Availability is not verified.');
  return [...notes,...(a.disclaimer||[])];
}
export const alchemyItems=catalog=>Object.entries(catalog.items).filter(([,item])=>Number.isFinite(item.value)&&item.value>0).sort((a,b)=>a[1].name.localeCompare(b[1].name));
export function queueActivity(catalog,step){
  const a=catalog.activities.find(a=>a.id===step.activityId);if(!a?.alchemy)return a;
  const item=catalog.items[step.alchemyItemId];
  if(!item||!Number.isFinite(item.value)||item.value<=0)throw Error('Choose a valid item to convert with '+a.name+'.');
  const high=a.alchemy==='high',coins=item.value+Math.max(Math.floor(item.value*(high?.5:.1)),high?2:1);
  const inputs=(a.inputs||[]).map(i=>({...i}));const existing=inputs.find(i=>i.id===step.alchemyItemId);
  if(existing)existing.amount+=1;else inputs.push({id:step.alchemyItemId,amount:1});
  return {...a,inputs,outputs:[{id:'coins',amount:coins}]};
}
export function cleanPlan(input,catalog){
  if(!input||typeof input!=='object'||input.version!==1||!Array.isArray(input.steps)||input.steps.length>MAX_STEPS)throw Error('This plan is invalid or has more than 20 steps.');
  const activities=new Map(catalog.activities.map(a=>[a.id,a]));
  const steps=input.steps.map((s,i)=>{
    const base=activities.get(s?.activityId);if(!base||!goals.has(s.goal))throw Error('Step '+(i+1)+' has an unavailable activity or target.');
    const a=base.alchemy?queueActivity(catalog,s):base;
    if(s.goal==='level'&&!a.mob&&!(a.exp>0))throw Error('This activity does not award '+a.skill+' XP. Choose an action or item target.');
    const value=s.goal==='indefinite'?0:Number(s.value);
    if(!Number.isInteger(value)||value<(s.goal==='items-lte'||s.goal==='indefinite'?0:1)||value>(s.goal==='level'?99:MAX_ACTIONS))throw Error('Step '+(i+1)+' has an invalid target.');
    if(a.travelsTo&&(s.goal!=='actions'||value!==1))throw Error('Travel steps must be one action. Plan the return trip separately.');
    const itemId=typeof s.itemId==='string'?s.itemId:'';
    if(s.goal.startsWith('items-')&&(!catalog.items[itemId]||a.mob||![...(a.inputs||[]),...(a.outputs||[])].some(x=>x.id===itemId)))throw Error('Choose an item consumed or produced by step '+(i+1)+'.');
    const spellId=catalog.spells.some(x=>x.id===s.spellId)?s.spellId:catalog.spells[0]?.id;
    const location=a.locations?.some(l=>l.wikiId===s.location)?s.location:a.locations?.[0]?.wikiId||'';
    return {activityId:a.id,goal:s.goal,value,itemId,spellId,location,...(a.alchemy?{alchemyItemId:s.alchemyItemId}:{})};
  });
  const xp=Object.fromEntries(catalog.skills.map(s=>[s.id,amount(input.xp?.[s.id])?input.xp[s.id]:0]));
  const inventory=Object.fromEntries(Object.entries(input.inventory||{}).filter(([id,n])=>Object.hasOwn(catalog.items,id)&&Number.isInteger(n)&&amount(n,MAX_ACTIONS)&&n>0));
  const equipment=Object.fromEntries(Object.entries(input.equipment||{}).filter(([slot,id])=>slots.has(slot)&&typeof id==='string'&&Object.hasOwn(catalog.items,id)&&
    (catalog.items[id].slot===slot||slot.startsWith('potion')&&catalog.items[id].slot==='potion1')));
  return {version:1,name:String(input.name||'My activity plan').slice(0,80),steps,xp,inventory,equipment};
}
export const newPlan=catalog=>cleanPlan({version:1,name:'My activity plan',steps:[]},catalog);
export function encodePlan(plan){
  const bytes=new TextEncoder().encode(JSON.stringify(plan));
  if(bytes.length>24000)throw Error('This plan link is too long. Reduce the starting inventory entries before sharing.');
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decodePlan(text,catalog){
  if(typeof text!=='string'||text.length>32000||!/^[A-Za-z0-9_-]+$/.test(text))throw Error('This shared plan link is invalid or too long.');
  try{return cleanPlan(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)))),catalog);}
  catch(error){throw Error('Could not open this shared plan: '+error.message);}
}
export function estimateQueue(input,catalog){
  const plan=cleanPlan(input,catalog),xp={...plan.xp},stock={...plan.inventory},starting={},consumed={},produced={},supplyEstimates={},rows=[],warnings=[];
  const bonuses=equipmentBonuses(plan.equipment,catalog.items);
  const levels=()=>Object.fromEntries(catalog.skills.map(s=>[s.id,queueLevel(xp[s.id])]));
  const add=(obj,id,n)=>{obj[id]=(obj[id]||0)+n;};
  let seconds=0,totalXp=0,blocked=false,partial=false;
  for(const [index,step]of plan.steps.entries()){
    const a=queueActivity(catalog,step),before=levels(),notes=[],row={index,step,activity:a,actions:0,xp:0,seconds:0,notes,startLevel:before[a.skill],endLevel:before[a.skill]};rows.push(row);
    if(blocked){row.unavailable='Follows a step with no finite estimate. Move it earlier or change that step’s target.';partial=true;continue;}
    if(step.goal==='indefinite'){row.unavailable='No end condition. Later steps cannot be reached until you stop this step manually.';blocked=true;partial=true;continue;}
    if(!a.mob&&before[a.skill]<a.level)notes.push('Requires '+catalog.skills.find(s=>s.id===a.skill).name+' '+a.level+'; projected level is '+before[a.skill]+'. Estimate is hypothetical.');
    if(a.requiresMembership)notes.push('This activity requires membership.');
    if(a.requiresAbility)notes.push('Requires ability: '+a.requiresAbility+'. Ability unlocks are not checked.');
    notes.push(...activityPlanningNotes(a,catalog));
    if(a.alchemy)notes.push('One selected item is consumed per cast, plus runes. Coin output is gross proceeds, not profit; rune and item prices are not deducted.');
    let perXp=a.exp,combat=null;
    if(a.mob){
      const foe=catalog.foes[a.mob],weapon=catalog.items[plan.equipment.weapon],spell=catalog.spells.find(s=>s.id===step.spellId);
      if(foe.special){row.unavailable='Boss and special encounters do not have a reliable solo XP/time estimate.';partial=true;blocked=true;continue;}
      if(foe.safeSpot&&!['ranged','evilMagic'].includes(a.skill)){row.unavailable='This safe spot requires Ranged or Evil Magic.';partial=true;blocked=true;continue;}
      if(a.skill==='ranged'&&(!weapon?.tags?.includes('bow')||!plan.equipment.ammo)){row.unavailable='Load a profile with a bow and arrows to estimate Ranged combat.';partial=true;blocked=true;continue;}
      if(['attack','strength','defense'].includes(a.skill)&&weapon?.tags?.includes('bow')){row.unavailable='A bow cannot train a melee combat style.';partial=true;blocked=true;continue;}
      if(a.skill==='evilMagic'&&before.evilMagic<spell.level)notes.push(spell.name+' requires Evil Magic '+spell.level+'; this is a hypothetical estimate.');
      if(COMBAT_XP_RATES[a.skill].status!=='observed')notes.push('The '+catalog.skills.find(s=>s.id===a.skill).name+' XP-per-damage rate is unverified; uses the comparison tool’s 4 XP/damage baseline.');
      notes.push('Combat estimate excludes food, deaths, travel, drop RNG, active abilities and potions.');
      for(const [slot,id]of Object.entries(plan.equipment))for(const [skill,n]of Object.entries(catalog.items[id]?.requirements||{}))if((before[skill]||1)<n)notes.push(catalog.items[id].name+' needs '+skill+' '+n+'; gear estimate is hypothetical.');
      perXp=foe.hp*COMBAT_XP_RATES[a.skill].xpPerDamage;
      combat={foe,spell};
    }
    let count=step.value;
    if(step.goal==='level')count=Math.max(0,Math.ceil((thresholds[step.value]-xp[a.skill])/perXp));
    if(step.goal.startsWith('items-')){
      const net=(a.outputs||[]).filter(i=>i.id===step.itemId).reduce((n,i)=>n+i.amount,0)-(a.inputs||[]).filter(i=>i.id===step.itemId).reduce((n,i)=>n+i.amount,0);
      const have=stock[step.itemId]||0,met=step.goal==='items-gte'?have>=step.value:have<=step.value;
      if(met)count=0;
      else if(step.goal==='items-gte'&&net>0)count=Math.ceil((step.value-have)/net);
      else if(step.goal==='items-lte'&&net<0)count=Math.ceil((have-step.value)/-net);
      else{row.unavailable='This activity cannot reach the selected item target from the projected inventory.';partial=true;blocked=true;continue;}
    }
    if(!Number.isFinite(count)||count<0||count>MAX_ACTIONS){row.unavailable='This target needs more than 1,000,000,000 actions or cannot be estimated.';partial=true;blocked=true;continue;}
    if(count===0)notes.push('Target is already met; skip this step.');
    let duration=0,swings=0;
    if(combat&&count){
      let left=count;const xpBefore=xp[a.skill];
      while(left>0){
        const lv=queueLevel(xp[a.skill]),toLevel=lv===99?Infinity:Math.max(1,Math.ceil((thresholds[lv+1]-xp[a.skill])/perXp)),chunk=Math.min(left,toLevel);
        const rate=compareCombat(levels(),bonuses,[combat.foe],{skill:a.skill,spellMaxHit:a.skill==='evilMagic'?combat.spell.maxHit:null})[0];
        if(!Number.isFinite(rate.cycleSeconds)){row.unavailable='This loadout cannot deal enough damage for an estimate.';partial=true;blocked=true;break;}
        duration+=rate.cycleSeconds*chunk;swings+=rate.swings*chunk;xp[a.skill]+=chunk*perXp;left-=chunk;
      }
      if(row.unavailable){xp[a.skill]=xpBefore;continue;}
      if(a.skill==='ranged')add(supplyEstimates,plan.equipment.ammo,Math.ceil(swings));
      if(a.skill==='evilMagic')for(const [id,n]of Object.entries(combat.spell.runes))add(supplyEstimates,id,Math.ceil(swings)*n);
    }else if(!combat){
      duration=count*(a.duration*catalog.mechanics.tickSeconds+catalog.mechanics.skillingPreparationTicks*catalog.mechanics.tickSeconds);
      xp[a.skill]+=count*perXp;
    }
    for(const [id,value]of Object.entries(a.otherExp||{}))if(Object.hasOwn(xp,id))xp[id]+=count*value;
    for(const item of a.inputs||[]){const need=item.amount*count,short=Math.max(0,need-(stock[item.id]||0));if(short){add(starting,item.id,short);add(stock,item.id,short);}stock[item.id]=(stock[item.id]||0)-need;add(consumed,item.id,need);}
    for(const item of a.outputs||[]){add(stock,item.id,item.amount*count);add(produced,item.id,item.amount*count);}
    row.actions=count;row.xp=count*(perXp+Object.values(a.otherExp||{}).reduce((n,v)=>n+v,0));row.seconds=duration;row.endLevel=queueLevel(xp[a.skill]);
    seconds+=duration;totalXp+=row.xp;
  }
  if(Object.keys(supplyEstimates).length)warnings.push('Combat supplies are estimated shots/casts before conservation. They are separate from recipe requirements; arrow breakage and food use are not modeled.');
  if(partial)warnings.push('Totals are partial. A step without a finite estimate prevents reliable estimates for subsequent steps.');
  return {rows,seconds,totalXp,starting,consumed,produced,stock,xp,supplyEstimates,warnings,partial};
}
