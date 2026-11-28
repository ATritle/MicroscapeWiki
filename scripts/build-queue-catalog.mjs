import fs from 'node:fs/promises';
import {activityProductIcons} from './activity-product-icons.mjs';
const file=process.argv[2];
if(!file)throw Error('Pass the extracted public game-data JSON.');
const game=JSON.parse(await fs.readFile(file,'utf8'));
const catalog=JSON.parse(await fs.readFile(new URL('../docs/activity-catalog.json',import.meta.url),'utf8'));
const existing=new Map(catalog.activities.map(a=>[a.id,a]));
const capitalize=name=>name.charAt(0).toUpperCase()+name.slice(1);
const locationsFor=entity=>Object.entries(game.locations).filter(([,l])=>l.entities?.[entity]).map(([id,l])=>({name:l.name,wikiId:id}));
const activities=[],expectedBySkill={};
// The training comparison catalog omits zero-XP actions. Build the planner from
// every active skill definition, including utility actions and travel.
for(const skill of catalog.skills){
  const definition=game.skills[skill.id],sources=Array.isArray(definition?.activities)?definition.activities:definition?.isCombatSkill?game.skills.ranged.activities:[];
  const active=sources.filter(a=>!a.softDeleted&&!a.deprecated);
  expectedBySkill[skill.id]=active.length;
  for(const source of active){
    const id=skill.id+'/'+source.id,prior=existing.get(id);
    if(source.mob){
      if(!prior||!catalog.foes[source.mob])throw Error('Rebuild the activity catalog for combat: '+id);
      activities.push({...prior,inputs:[],outputs:[],locations:catalog.foes[source.mob].locations,icon:skill.icon,wikiId:catalog.foes[source.mob].wikiId});continue;
    }
    const changes=Object.entries(source.inventoryChanges||{}).filter(([,n])=>Number.isFinite(n));
    const inputs=changes.filter(([,n])=>n<0).map(([id,n])=>({id,amount:-n}));
    const outputs=changes.filter(([id,n])=>n>=1&&!game.pets[id]).map(([id,amount])=>({id,amount}));
    const randomOutputs=changes.filter(([id,n])=>n>0&&n<1&&!game.pets[id]).map(([id,chance])=>({id,chance}));
    const productId=activityProductIcons[source.id];
    const iconId=productId||source.icon||(source.useInputAsIcon?inputs[0]?.id:[...outputs].sort((a,b)=>b.amount-a.amount)[0]?.id);
    activities.push({...prior,id,skill:skill.id,name:prior?.name||capitalize(source.name||source.id),
      level:source.level||1,duration:source.duration,exp:Number.isFinite(source.exp)?source.exp:0,
      sortLevel:source.level||0,otherActivity:prior?.otherActivity??!!(source.notInGuidebook||source.isOthered),
      inputs,outputs,...(randomOutputs.length?{randomOutputs}:{}),icon:(productId?catalog.items[productId]?.icon:prior?.icon)||catalog.items[iconId]?.icon||skill.icon,
      wikiId:(productId?catalog.items[productId]?.wikiId:prior?.wikiId)||catalog.items[iconId]?.wikiId,entity:game.entities[source.entity]?.name||game.npcs[source.entity]?.name||source.entity,
      locations:locationsFor(source.entity),otherExp:Object.fromEntries(Object.entries(source.otherExp||{}).filter(([,n])=>Number.isFinite(n)&&n>0)),
      ...(source.requiresAbility?{requiresAbility:game.abilities[source.requiresAbility]?.name||source.requiresAbility}:{}),
      requiresMembership:source.requiresMembership===true,singleExecution:source.singleExecution===true,
      requiredItems:typeof source.requiredItem==='string'?[source.requiredItem]:[],
      ...(source.disclaimer?.length?{disclaimer:source.disclaimer}:{}),
      ...(source.travelsTo?{travelsTo:{name:game.locations[source.travelsTo]?.name||source.travelsTo,wikiId:source.travelsTo}}:{}),
      ...(/cast-(low|high)-level-alchemy$/.test(id)?{alchemy:id.includes('high')?'high':'low'}:{})});
  }
}
const items=Object.fromEntries(Object.entries(catalog.items).map(([id,item])=>[id,{...item,...(Number.isFinite(game.items[id]?.value)&&game.items[id].value>0?{value:game.items[id].value}:{})}]));
const coverage={expectedBySkill,total:Object.values(expectedBySkill).reduce((n,v)=>n+v,0)};
if(new Set(activities.map(a=>a.id)).size!==coverage.total||activities.length!==coverage.total)throw Error('Planner coverage mismatch or duplicate activities');
await fs.writeFile(new URL('../docs/queue-catalog.json',import.meta.url),JSON.stringify({...catalog,coverage,activities,items},null,2)+'\n');
console.log(JSON.stringify({activities:activities.length,expectedBySkill,randomRewards:'Excluded from guaranteed outputs',travel:'Explicit single-action steps'}));
