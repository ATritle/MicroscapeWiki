import fs from 'node:fs/promises';
const file=process.argv[2];
if(!file)throw Error('Pass the extracted public game-data JSON.');
const game=JSON.parse(await fs.readFile(file,'utf8'));
const catalog=JSON.parse(await fs.readFile(new URL('../docs/activity-catalog.json',import.meta.url),'utf8'));
const activities=catalog.activities.filter(a=>!a.singleExecution&&!/alchemy/.test(a.id)).map(a=>{
  if(a.mob)return {...a,inputs:[],outputs:[],locations:catalog.foes[a.mob].locations,icon:catalog.skills.find(s=>s.id===a.skill).icon,wikiId:catalog.foes[a.mob].wikiId};
  const source=game.activities[a.id];if(!source)throw Error('Missing activity '+a.id);
  return {...a,outputs:Object.entries(source.inventoryChanges||{}).filter(([id,n])=>Number.isFinite(n)&&n>=1&&!game.pets[id])
    .map(([id,amount])=>({id,amount})),requiredItems:typeof source.requiredItem==='string'?[source.requiredItem]:[]};
});
await fs.writeFile(new URL('../docs/queue-catalog.json',import.meta.url),JSON.stringify({...catalog,activities},null,2)+'\n');
console.log('Queue catalog: '+activities.length+' activities; guaranteed products only.');
