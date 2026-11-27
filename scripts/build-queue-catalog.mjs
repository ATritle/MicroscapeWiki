import fs from 'node:fs/promises';
const file=process.argv[2];
if(!file)throw Error('Pass the extracted public game-data JSON.');
const game=JSON.parse(await fs.readFile(file,'utf8'));
const catalog=JSON.parse(await fs.readFile(new URL('../docs/activity-catalog.json',import.meta.url),'utf8'));
// Include Good Magic's one-cast enchantment and its ritual (which awards Evil
// Magic XP). Alchemy requires an explicit target item in each saved step.
const candidates=[...catalog.activities];
for(const source of game.skills.goodMagic.activities){
  const id='goodMagic/'+source.id;
  if(candidates.some(a=>a.id===id)||source.softDeleted||source.deprecated||!Number.isFinite(source.duration)||!(source.exp>0||Object.values(source.otherExp||{}).some(n=>n>0)))continue;
  const inputs=Object.entries(source.inventoryChanges||{}).filter(([,n])=>n<0).map(([id,n])=>({id,amount:-n}));
  candidates.push({id,skill:'goodMagic',name:source.name,level:source.level||1,duration:source.duration,exp:source.exp||0,sortLevel:source.level||0,
    otherActivity:!!(source.notInGuidebook||source.isOthered),inputs,icon:catalog.items[source.icon]?.icon||catalog.skills.find(s=>s.id==='goodMagic').icon,
    entity:game.entities[source.entity]?.name,locations:Object.entries(game.locations).filter(([,l])=>l.entities?.[source.entity]).map(([id,l])=>({name:l.name,wikiId:id})),
    otherExp:source.otherExp||{},requiresAbility:game.abilities[source.requiresAbility]?.name||source.requiresAbility,requiresMembership:source.requiresMembership===true,singleExecution:source.singleExecution===true});
}
const activities=candidates.filter(a=>!a.singleExecution||a.skill==='goodMagic').map(a=>{
  if(a.mob)return {...a,inputs:[],outputs:[],locations:catalog.foes[a.mob].locations,icon:catalog.skills.find(s=>s.id===a.skill).icon,wikiId:catalog.foes[a.mob].wikiId};
  const source=game.activities[a.id];if(!source)throw Error('Missing activity '+a.id);
  return {...a,...(/cast-(low|high)-level-alchemy$/.test(a.id)?{alchemy:a.id.includes('high')?'high':'low'}:{}),outputs:Object.entries(source.inventoryChanges||{}).filter(([id,n])=>Number.isFinite(n)&&n>=1&&!game.pets[id])
    .map(([id,amount])=>({id,amount})),requiredItems:typeof source.requiredItem==='string'?[source.requiredItem]:[]};
});
const items=Object.fromEntries(Object.entries(catalog.items).map(([id,item])=>[id,{...item,...(Number.isFinite(game.items[id]?.value)&&game.items[id].value>0?{value:game.items[id].value}:{})}]));
await fs.writeFile(new URL('../docs/queue-catalog.json',import.meta.url),JSON.stringify({...catalog,activities,items},null,2)+'\n');
console.log('Queue catalog: '+activities.length+' activities; guaranteed products only.');
