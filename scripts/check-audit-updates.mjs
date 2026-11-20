import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {guides} from '../docs/guides.js';
import {tutorials} from '../docs/tutorials.js';
import {buildPetEntries} from '../docs/pets.js';
import {itemIcons} from '../docs/item-icons.js';
import {title} from './release-tools.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const reference=await read('docs/reference.json'), evidence=await read('docs/assets/game-data/release-2026-11-19.json'),data=evidence.definitions;
const all=[...reference,...buildPetEntries(reference),...guides,...tutorials],byId=new Map(all.map(p=>[p.id,p]));
const old=JSON.parse(execFileSync('git',['-C',root,'show','3ecd9bbb33237f7659698d32976145b0e81e5368:docs/reference.json'],{encoding:'utf8',maxBuffer:32*1024*1024}));
for(const p of [...old,...buildPetEntries(old)])assert(byId.has(p.id),'Preserve route '+p.id);
assert.equal(byId.size,all.length,'Unique page IDs');
const page=(category,id)=>reference.find(p=>p.category===category&&p.gameId===id);
const facts=p=>new Map(p.facts||[]),table=(p,t)=>p.tables?.find(x=>x.title===t);
const number=s=>Number(String(s).replaceAll(',','').match(/[-+]?\d+(?:\.\d+)?/)?.[0]);
const labels={autoEat:'Auto-eat HP threshold',attackCooldown:'Attack cooldown',eatRecovery:'Healing per serving',abilitySlots:'Extra ability slots',evilMagic:'Evil Magic',goodMagic:'Good Magic'};
for(const [id,item]of Object.entries(data.items)) {
  if(['laserDagger','trainingSword','loot'].includes(id))continue;
  const p=page(data.pets[id]?'pets':'items',id);assert(p,'Current item '+id);
  assert(p.portrait?.src||p.artwork||itemIcons[p.id]||p.sprites?.length,'Artwork '+id);
  for(const [stat,value]of Object.entries(item.bonuses||{}))if(typeof value==='number'){
    assert.equal(number(facts(p).get(labels[stat]||data.skills[stat]?.name||title(stat))),stat==='attackCooldown'?value*2:value,id+' '+stat);
  }
  for(const [skill,level]of Object.entries(item.requirements||{}))assert(facts(p).get('Equip requirements').includes(data.skills[skill].name+' '+level),'Requirement '+id);
  if(item.value!==undefined)assert.equal(number(facts(p).get('Vendor sell value')),item.value,'Value '+id);
}
const odds=d=>d.rarity===0?'Guaranteed':'1 in '+new Intl.NumberFormat('en').format(2**d.rarity);
const itemName=id=>page('items',id)?.title||page('pets',id)?.title||title(id);
for(const [id,foe]of Object.entries(data.foes)){
  const shared=id.endsWith('-safe')&&data.foes[id.replace(/-safe$/,'')];
  const p=page('foes',id)||page('foes',id.replace(/-safe$/,''));assert(p,'Foe '+id);
  if(!shared){
    for(const [key,value]of Object.entries(foe.stats))assert.equal(number(facts(p).get(key==='hp'?'HP':data.skills[key]?.name||title(key))),value,id+' '+key);
    assert.equal(facts(p).get('Base interval at standard tick rate'),foe.speed*2+' seconds');
  }
  for(const [pool,heading]of [['drops',shared?'Safe encounter drops':'Loot'],['championDrops','Champion drops']])for(const [item,d]of Object.entries(foe[pool]||{})){
    const row=table(p,heading)?.rows.find(row=>row[0]===itemName(item));assert(row,id+' '+heading+' '+item);
    assert.equal(row[1],String(d.quantity??1));assert.equal(row[2],odds(d),id+' '+item+' odds');
  }
}
for(const [id,pet]of Object.entries(data.pets)){
  const p=page('pets',id);assert(p,'Pet '+id);assert(p.sprites?.[0]?.crop.every(Number.isFinite),'Full sprite '+id);
  const tasks=Object.values(data.activities).filter(a=>!a.softDeleted&&a.inventoryChanges?.[id]>0);
  assert.equal(table(p,'Drop odds by eligible task')?.rows.length||0,tasks.length,'Pet tasks '+id);
  if(pet.requiredItemToObtain){const a=Object.values(data.activities).find(a=>a.inventoryChanges?.[pet.requiredItemToObtain]>0);assert.equal(facts(p).get('Cost'),-a.inventoryChanges.audienceFavor+' Audience Favor');}
}
for(const category of ['skills','abilities','locations'])for(const id of Object.keys(data[category]))assert(page(category,id),'Coverage '+category+' '+id);
assert.equal(Object.keys(data.pets).length,36);
assert.equal(facts(page('foes','king-onyx-dragon')).get('HP'),'2,790');
assert.equal(page('items','ironArmor').availabilityStatus,'absent-current-build');
assert.equal(byId.get('jesters-pouch').availabilityStatus,'absent-current-build');
assert.equal(page('items','softClay').availabilityStatus,'disabled-recipe');
assert.equal(data.activities['fishing/trade-pelt-for-ticket'].inventoryChanges.rodentPelt,-1);
assert.equal(data.activities['crafting/craft-vial'].level,19);
assert.equal(data.activities['crafting/craft-dragonstone-amulet'].duration,10801);
assert.equal(data.activities['goodMagic/enchant-dragonstone-amulet'].exp,293652);
assert(!table(page('foes','blue-dragon'),'Loot').rows.some(r=>r[0]==='Dungeon Key'));
assert(table(page('locations','the-sump'),'Dungeon coin exchanges').rows.some(r=>r[1]==='1 × Rubber Boots'&&r[2]==='16 × Rusty Coin'));
assert(byId.get('release-changes').sections.some(([,t])=>t.includes('Queued for login')));
assert(!JSON.stringify(guides).includes('The Journey Begins gives 3 Favor'));
let citations=0;
for(const p of all) {
  for(const id of p.related||[])assert(byId.has(id),'Related link '+p.id+' → '+id);
  for(const t of p.tables||[])for(const [,id]of t.links||[])assert(byId.has(id),'Table link '+p.id+' → '+id);
  for(const [,href]of p.sources||[]){
    assert(!/^https:\/\/microscape\.cc\/play\/assets\/index-.*\.js$/.test(href),'Durable citation '+p.id);
    if(href==='./assets/game-data/release-2026-11-19.json')citations++;
    if(href.startsWith('./'))await fs.access(path.join(root,'docs',href));
  }
}
assert(citations>700,'Release citations');assert.equal(evidence.mechanics.standardTickMilliseconds,2000);
if(process.argv[2]){
  const m=JSON.parse(await fs.readFile(path.join(process.argv[2],'manifest.json'),'utf8')),urls=new Set(m.files.map(f=>f.url));
  const serialized=JSON.stringify([all,itemIcons,await read('docs/player-reference.json')]);
  for(const match of serialized.matchAll(/https:\/\/microscape\.cc\/play\/assets\/[^"\s]+/g))assert(urls.has(match[0]),'Retired asset '+match[0]);
  const client=m.files.find(f=>f.file.endsWith(evidence.clientBuild));
  assert.equal(createHash('sha256').update(await fs.readFile(path.join(process.argv[2],client.file))).digest('hex'),evidence.clientSha256);
  assert.equal(m.failed.length,0);assert(!m.buildChangedDuringCapture);
}
console.log(`Verified ${all.length} routes, every current item bonus/requirement, foe HP/timing/drop odds, all 36 pet sprites/tasks/costs, beta routes, artwork, recipes and citations.`);
