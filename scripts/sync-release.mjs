import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFileSync} from "node:child_process";
import {loadArtwork,norm,title,slug,baseName} from "./release-tools.mjs";
import {itemIcons,itemIconGroups} from "../docs/item-icons.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const snapshot=path.resolve(process.argv[2]||"");
if(!process.argv[2])throw Error("Pass the captured release snapshot.");
const read=async file=>JSON.parse(await fs.readFile(file,"utf8"));
const data=await read(path.join(snapshot,"game-data.json"));
const art=await loadArtwork(snapshot,data);
if(art.manifest.buildChangedDuringCapture || art.manifest.failed.length)throw Error("Review capture stability and failed assets first.");
const beta=path.resolve(snapshot,"../2026-11-18T21-13-11-926Z-pre-1.0-beta");
const old=await read(path.resolve(snapshot,"../../normalized-beta/game-data.json"));
const oldManifest=await read(path.join(beta,"manifest.json"));
// Always migrate from the frozen pre-release wiki, so a rehearsal can be repeated.
const reference=JSON.parse(execFileSync("git",["-C",root,"show","fd7cad9:docs/reference.json"],{encoding:"utf8",maxBuffer:32*1024*1024}));
const original=structuredClone(reference);
const byId=new Map(reference.map(page=>[page.id,page]));
const date="2026-11-19",evidenceUrl="./assets/game-data/release-2026-11-19.json";
const gameUrl="https://microscape.cc/play/";
const number=new Intl.NumberFormat("en",{maximumFractionDigits:5});
const wikiIds={items:new Map(),abilities:new Map(),foes:new Map(),locations:new Map(),skills:new Map(),pets:new Map()};
function find(category,id,record){
  return reference.find(page=>page.category===category && (page.gameId===id || norm(page.id)===norm(id)))
    ||reference.find(page=>page.category===category && [page.title,page.title.replace(/\brobes\b/gi,"robe"),...(page.aliases||[]),
      ...(page.facts||[]).filter(([key])=>key==="In-game name").map(([,value])=>value)].some(value=>norm(value)===norm(record.name)))
    ||(category==="locations"?reference.find(page=>page.category===category&&page.mapImage&&norm(baseName(page.mapImage.src))===norm(id)):null);
}
function make(category,id,name){let page=byId.get(id);if(page&&page.category!==category)id=category.slice(0,-1)+"-"+id;
  page=byId.get(id);if(!page){page={id,title:name,category,group:title(category),facts:[],tables:[],sections:[],related:[],sources:[]};reference.push(page);byId.set(id,page);}return page;}
function fact(page,rows){const facts=new Map(page.facts||[]);for(const row of rows)facts.set(...row);page.facts=[...facts];}
function section(page,heading,text){page.sections||=[];const index=page.sections.findIndex(([name])=>name===heading);if(index<0)page.sections.push([heading,text]);else page.sections[index][1]=text;}
function table(page,name,columns,rows,extra={}){page.tables||=[];page.tables=page.tables.filter(t=>t.title!==name);if(rows.length)page.tables.push({title:name,columns,rows,...extra});}
function checked(page,id){page.gameId=id;page.statsDate=date;page.sources||=[];if(!page.sources.some(([,url])=>url===evidenceUrl))page.sources.unshift(["Archived release game data · November 19, 2026",evidenceUrl]);if(!page.sources.some(([,url])=>url===gameUrl))page.sources.push(["Official Microscape game",gameUrl]);}
const itemPage=id=>wikiIds.items.get(id)||wikiIds.pets.get(id);
const itemName=id=>itemPage(id)?.title||title(data.items[id]?.name||data.appearance[id]?.name||id);
const skillName=id=>data.skills[id]?.name||title(id);
const skillReq=requirements=>Object.entries(requirements||{}).filter(([,n])=>typeof n==="number").map(([id,n])=>skillName(id)+" "+n).join(" · ")||"None";
const entityName=id=>data.entities[id]?.name||data.npcs[id]?.name||Object.values(data.shops).find(shop=>shop.id===id)?.name||title(id);
const active=a=>!a.softDeleted;
const activities=Object.entries(data.activities);
const locationsOf=entity=>Object.entries(data.locations).filter(([,location])=>location.entities?.[entity]);
const locationName=id=>wikiIds.locations.get(id)?.title||data.locations[id]?.name||title(id);
const qty=(id,n)=>number.format(n)+" × "+itemName(id);
const inputs=a=>Object.entries(a.inventoryChanges||{}).filter(([,n])=>typeof n==="number"&&n<0).map(([id,n])=>qty(id,-n)).join(" · ")||"None";
const odds=p=>p>=1?"Guaranteed":p>0?"≈ 1 in "+number.format(Math.round(1/p)):"Not specified";
const dropOdds=drop=>drop.rarity===0?"Guaranteed":Number.isFinite(drop.rarity)?"1 in "+number.format(2**drop.rarity):"Not specified";
const outputs=a=>Object.entries(a.inventoryChanges||{}).filter(([,n])=>typeof n==="number"&&n>0).map(([id,n])=>n>=1?qty(id,n):itemName(id)+" ("+odds(n)+")").join(" · ")||"See activity description";
const time=a=>Number.isFinite(a.duration)?number.format((a.duration+4)*2)+"s":"Varies";
const status=a=>a.softDeleted?"Disabled; historical":a.deprecated?"Deprecated; still listed":"Active";
const replacements={loggingAxe:"bronze-axe",pickaxe:"bronze-pickaxe",shovel:"steel-shovel",shovelHead:"steel-shovel-head",hammer:"bronze-hammer",hellforgedHammer:"mithril-hammer",ironbreakerPickaxe:"iron-pickaxe",ladle:"bronze-ladle",petBlueLobster:"blue-lobster"};
const ignore=new Set(["laserDagger","trainingSword","loot"]);

for(const [id,record]of Object.entries({...data.items,...data.appearance})){
  if(ignore.has(id)||data.pets[id]&&id!=="petBlueLobster")continue;
  let page=replacements[id]?byId.get(replacements[id]):find("items",id,record);
  if(!page)page=make("items",slug(record.name||id),title(record.name||id));
  if(replacements[id]){page.aliases=[...new Set([...(page.aliases||[]),page.title])];page.title=title(record.name);}
  wikiIds.items.set(id,page);checked(page,id);
}
for(const [id,record]of Object.entries(data.locations)){const page=find("locations",id,record)||make("locations",id,record.name);wikiIds.locations.set(id,page);checked(page,id);}
for(const [id,record]of Object.entries(data.foes).filter(([id])=>!id.endsWith("-safe"))){const page=find("foes",id,record)||make("foes",id,title(record.name));wikiIds.foes.set(id,page);checked(page,id);}
for(const [id,record]of Object.entries(data.foes).filter(([id])=>id.endsWith("-safe"))){const page=wikiIds.foes.get(id.replace(/-safe$/,""))||find("foes",id,record);wikiIds.foes.set(id,page);if(!data.foes[id.replace(/-safe$/,"")])checked(page,id);}
for(const [id,record]of Object.entries(data.abilities)){const page=find("abilities",id,record)||make("abilities",slug(record.name),record.name);wikiIds.abilities.set(id,page);checked(page,id);}
for(const [id,record]of Object.entries(data.skills)){const page=find("skills",id,record)||make("skills",slug(record.name),record.name);wikiIds.skills.set(id,page);checked(page,id);}

// Freeze original beta art needed by removed entries; move surviving art to release URLs.
const oldFiles=new Map(oldManifest.files.map(file=>[file.url,file]));
const groups=new Map();for(const file of art.manifest.files){const key=baseName(file.file);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(file);}
const migrated=new Map();
async function migrate(url){
  if(typeof url!=="string"||!url.startsWith("https://microscape.cc/play/assets/")||art.files.has(url))return url;
  if(migrated.has(url))return migrated.get(url);
  const prior=oldFiles.get(url);if(!prior)return url;
  const choices=groups.get(baseName(prior.file))||[];let next;
  if(choices.length===1)next=choices[0].url;
  else if(choices.length){const b=await fs.readFile(path.join(beta,prior.file));if(prior.file.endsWith(".png"))for(const choice of choices){const dims=await art.size(choice.url);if(dims[0]===b.readUInt32BE(16)&&dims[1]===b.readUInt32BE(20)){next=choice.url;break;}}}
  if(!next){const dest=path.join(root,"docs/assets/beta-artwork",path.basename(prior.file));await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(path.join(beta,prior.file),dest);next="./assets/beta-artwork/"+path.basename(prior.file);}
  migrated.set(url,next);return next;
}
async function migrateTree(value){if(Array.isArray(value)){for(let i=0;i<value.length;i++)value[i]=await migrateTree(value[i]);}else if(value&&typeof value==="object"){for(const key of Object.keys(value))value[key]=await migrateTree(value[key]);}else if(typeof value==="string")return migrate(value);return value;}
await migrateTree(reference);
const icons={};for(const [id,url]of Object.entries(itemIcons)){const full=url.startsWith("http")?url:url.startsWith(".")?url:"https://microscape.cc/play/assets/"+url;icons[id]=await migrate(full);}

const archived=[];
for(const [id,record]of Object.entries(old.items))if(!data.items[id]&&!Object.keys(replacements).some(next=>replacements[next]===find("items",id,record)?.id)){
  const page=find("items",id,record);if(!page)continue;
  page.availabilityStatus="absent-current-build";page.summary="Archived beta item. No "+title(record.name)+" definition is present in the checked November 19 release client.";
  page.sections=(page.sections||[]).filter(([heading])=>!["How to obtain","Availability","Current build status","Current alternative","Using existing stock"].includes(heading));
  section(page,"Release status","This page preserves the beta record and its artwork. The item is absent from the captured release definitions; its former sources and stats are historical, not current acquisition instructions.");
  page.tables=(page.tables||[]).map(t=>({...t,title:t.title.startsWith("Archived")?t.title:"Archived beta · "+t.title}));
  fact(page,[["Availability","Absent from checked release client; archived beta record"]]);checked(page,id);archived.push(id);
}
const bonusLabels={autoEat:"Auto-eat HP threshold",attackCooldown:"Attack cooldown",eatRecovery:"Healing per serving",abilitySlots:"Extra ability slots",evilMagic:"Evil Magic",goodMagic:"Good Magic"};
const bonusNames=new Set([...Object.keys(bonusLabels).map(key=>bonusLabels[key]),...Object.keys(data.skills).map(skillName),"Attack","Strength","Defense"]);
for(const [id,page]of wikiIds.items){const record=data.items[id]||data.appearance[id];
  page.group=title(record.category||"Appearance");delete page.availabilityStatus;
  page.facts=(page.facts||[]).filter(([key])=>!bonusNames.has(key)&&!["Slot","Equip requirements","Vendor sell value","In-game name","Grants","Availability","Special bonuses"].includes(key));
  const grants=Object.values(data.abilities).filter(a=>a.onItem===id).map(a=>a.name);
  fact(page,[["In-game name",title(record.name)],["Slot",title(record.slot||"Not equipped")],["Equip requirements",skillReq(record.requirements)],
    ["Vendor sell value",Number.isFinite(record.value)?record.value+" coins":"No value listed"],
    ...Object.entries(record.bonuses||{}).filter(([,n])=>typeof n==="number").map(([key,n])=>[bonusLabels[key]||skillName(key),key==="attackCooldown"?n*2+" s":key==="eatRecovery"?n+" HP":(n>0?"+":"")+n+(key==="autoEat"?" percentage points":"")]),
    ...(grants.length?[["Grants",grants.join(" · ")]]:[]),...(record.specialBonuses?[["Special bonuses",record.specialBonuses.join(" · ")]]:[]),
    ...(record.maxOwnable?[["Maximum held",String(record.maxOwnable)]]:[])]);
  const icon=art.icons[record.iconMapping||id]||art.icons[id];if(icon){icons[page.id]=icon;page.portrait={src:icon,source:gameUrl};page.artwork=icon;}
  if(art.equipment[id])page.sprites=[await art.sprite(art.equipment[id],128)];
  const produced=activities.filter(([,a])=>typeof a.inventoryChanges?.[id]==="number"&&a.inventoryChanges[id]>0);
  table(page,"Activities and recipes",["Activity","Requirements","Station","Materials per action","Output or odds","XP","Base time","Status"],produced.filter(([,a])=>active(a)).map(([key,a])=>[title(a.name),skillName(key.split("/")[0])+" "+a.level,entityName(a.entity),inputs(a),a.inventoryChanges[id]>=1?String(a.inventoryChanges[id]):odds(a.inventoryChanges[id]),number.format(a.exp||0),time(a),status(a)]));
  table(page,"Historical recipe · disabled",["Recipe","Former requirement","Station","Materials","Output","Base XP","Action duration","Status"],produced.filter(([,a])=>!active(a)).map(([key,a])=>[title(a.name),skillName(key.split("/")[0])+" "+a.level,entityName(a.entity),inputs(a),String(a.inventoryChanges[id]),number.format(a.exp||0),(a.duration*2)+"s",status(a)]));
  page.tables=page.tables.filter(t=>!["Acquisition recipes","Recipes using existing stock"].includes(t.title));
  const drops=[];for(const foe of Object.values(data.foes))for(const [pool,key]of [["Standard","drops"],["Champion","championDrops"]])if(foe[key]?.[id]){const d=foe[key][id];drops.push([title(foe.name)+(foe.safeSpot?" (Safe)":""),String(d.quantity??1),dropOdds(d),pool,record.requiredItemToObtain?itemName(record.requiredItemToObtain):"—"]);}
  table(page,"Combat drops",["Encounter","Quantity","Drop odds","Drop pool","Required item"],drops);
  const used=activities.filter(([,a])=>active(a)&&typeof a.inventoryChanges?.[id]==="number"&&a.inventoryChanges[id]<0);
  table(page,"Used in activities",["Activity","Requirements","Amount used"],used.map(([key,a])=>[title(a.name),skillName(key.split("/")[0])+" "+a.level,String(-a.inventoryChanges[id])]),{collapsed:true});
  const shops=Object.values(data.shops).filter(shop=>shop.items?.some(stock=>stock===id||stock===record.category||stock==="arrows"&&id.endsWith("Arrows")));
  table(page,"Shops",["Shop","Location","Purchase price"],shops.map(shop=>[shop.name,locationsOf(shop.id).map(([id])=>locationName(id)).join(" · ")||locationsOf(shop.entityType).map(([id])=>locationName(id)).join(" · "),Number.isFinite(record.value)?Math.floor(record.value*(shop.specificItemBuyMultipliers?.[id]??shop.globalBuyMultiplier??1))+" coins":"Not specified"]));
  if(!page.summary)page.summary=page.title+" · "+title(record.category||"appearance")+".";
  if(produced.some(([,a])=>active(a))||drops.length||shops.length){page.availabilityStatus="documented-source";page.sections=(page.sections||[]).filter(([heading])=>!["Availability","Current build status"].includes(heading));}
  else if(produced.length){page.availabilityStatus="disabled-recipe";section(page,"Availability","The release client keeps this item definition, but its listed production recipe is disabled. The historical recipe is preserved below and is not a current crafting instruction.");}
  else if(["candy-cane","elpers-hat","iron-axe","lava-rod","santa-hat","uncut-dragonstone"].includes(page.id)){page.availabilityStatus="unconfirmed-current-source";section(page,"Availability","The item is defined in the release client, but no current recipe, enemy drop or shop source was found. Availability still requires in-game or developer confirmation.");}
}

for(const [id,page]of wikiIds.foes){if(id.endsWith("-safe")&&data.foes[id.replace(/-safe$/,"")])continue;const record=data.foes[id],variants=Object.values(data.foes).filter(foe=>foe.id===id||foe.id===id+"-safe");
  const stats=record.stats;page.group=record.dungeonBoss?"Dungeon bosses":record.enemyType==="humanoid"?"Humanoids":"Creatures";
  page.summary=page.summary||title(record.name)+" · "+(record.dungeonBoss?"Dungeon boss":"Encounter");
  page.facts=[["Combat level",String(Math.max(1,Math.floor(((stats.attack+stats.strength)/2+stats.defense)/2)))],
    ...["hp","attack","strength","defense","evilMagic","ranged"].map(key=>[key==="hp"?"HP":skillName(key),number.format(stats[key]||1)]),
    ["Type",record.dungeonBoss?"Dungeon boss":title(record.enemyType)],
    ...(record.minimumCombatLevel?[["Minimum player combat level",String(record.minimumCombatLevel)]]:[]),
    ...(record.requiredItem?[["Required item",itemName(record.requiredItem)]]:[]),
    ...(record.flurry?[["Flurry hits",String(record.flurry)]]:[]),
    ["Base attack delay",record.speed+" ticks"],["Base interval at standard tick rate",record.speed*2+" seconds"]];
  const encounters=[];for(const variant of variants)for(const [loc,zone]of locationsOf(variant.id)){const v=zone.entities[variant.id];encounters.push([locationName(loc),variant.safeSpot?"Safe":"Standard",String(v.locations?.length||1),String(Math.max(0,...(v.locations||[]).map(position=>position.slots?.length||0)))]);}
  table(page,"Where to find it",["Area","Encounter","Spawns","Fighting spots per spawn"],encounters);
  for(const [heading,key]of [["Loot","drops"],["Champion drops","championDrops"]])table(page,heading,["Item","Quantity","Drop odds","Required item"],Object.entries(record[key]||{}).map(([id,drop])=>[itemName(id),String(drop.quantity??1),dropOdds(drop),data.items[id]?.requiredItemToObtain?itemName(data.items[id].requiredItemToObtain):"—"]));
  const safe=variants.find(foe=>foe.safeSpot);table(page,"Safe encounter drops",["Item","Quantity","Drop odds"],Object.entries(safe?.drops||{}).map(([id,drop])=>[itemName(id),String(drop.quantity??1),dropOdds(drop)]));
  section(page,"Attack timing","The release definition uses "+record.speed+" ticks, or "+record.speed*2+" seconds at the standard tick rate. Boss phases, multi-hit attacks, interruptions and abilities can change the observed attack pattern.");
  const fallback=art.asset(id.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())).sort((a,b)=>b.bytes-a.bytes)[0]?.url;
  if(art.foes[id]||fallback){page.artwork=art.icons[id]||page.artwork||art.foes[id]||fallback;const normal=await art.sprite(art.foes[id]||fallback);page.sprites=[{...normal,label:"Default form",...(record.defaultFlipped?{flipped:true}:{})},...(page.sprites||[]).filter(sprite=>sprite.label&&sprite.label!=="Default form")];}
}

for(const [id,page]of wikiIds.abilities){const record=data.abilities[id],source=itemPage(record.onItem),sourceItem=data.items[record.onItem];
  fact(page,[["Granted by",source?.title||itemName(record.onItem)],["Gear requirements",skillReq(sourceItem?.requirements)],["Ability skill requirements",skillReq(record.requiredSkills)]]);
  table(page,"How to get the ability",["Source","Gear requirements"],[[source?.title||itemName(record.onItem),skillReq(sourceItem?.requirements)]]);
  for(const [oldTitle,newTitle]of [["Combat drops","Source item combat drops"],["Activities and recipes","Source item recipes"],["Shops","Source item shops"]]){
    const sourceTable=source?.tables?.find(table=>table.title===oldTitle);table(page,newTitle,sourceTable?.columns||[],sourceTable?.rows||[]);}
  page.related=[...new Set([...(page.related||[]),source?.id].filter(Boolean))];
  if(!page.summary)page.summary="Granted by "+itemName(record.onItem)+"; check the requirements and effect values below.";
}

for(const [id,page]of wikiIds.skills){const record=data.skills[id];
  const own=activities.filter(([key,a])=>key.startsWith(id+"/")&&active(a));
  const levels=new Map([[1,{activities:[],equipment:[],abilities:[]}]]);
  function level(n){n=Math.max(1,n||1);if(!levels.has(n))levels.set(n,{activities:[],equipment:[],abilities:[]});return levels.get(n);}
  for(const [,a]of own.filter(([,a])=>!a.mob&&!a.notInGuidebook))level(a.level).activities.push(title(a.name));
  for(const [item,record]of Object.entries(data.items))if(record.slot&&record.requirements?.[id])level(record.requirements[id]).equipment.push(itemName(item));
  for(const ability of Object.values(data.abilities))if(ability.requiredSkills?.[id])level(ability.requiredSkills[id]).abilities.push(ability.name);
  table(page,"Level unlocks",["Level","Activities","Equipment","Abilities"],[...levels].sort(([a],[b])=>a-b).map(([n,values])=>[String(n),...Object.values(values).map(list=>[...new Set(list)].join(" · ")||"—")]),{listColumns:[1,2,3],description:"Base levels unlock activities and equipment. Abilities can also require particular gear or consumables."});
  const training=[];if(record.isCombatSkill){for(const [foeId,foe]of Object.entries(data.foes)){if(foe.safeSpot&&["attack","strength","defense"].includes(id))continue;for(const [loc]of locationsOf(foeId))training.push([locationName(loc),wikiIds.foes.get(foeId)?.title||title(foe.name),"Combat XP",foe.minimumCombatLevel?"Minimum combat level "+foe.minimumCombatLevel:"No encounter combat-level restriction listed"]);}
    table(page,"Training locations",["Area","Encounter","XP","Requirements"],training);
  }else{
    const grouped=new Map();for(const [,a]of own)for(const [loc]of locationsOf(a.entity)){const key=loc+"/"+a.entity;if(!grouped.has(key))grouped.set(key,{loc,entity:a.entity,actions:[]});grouped.get(key).actions.push(a);}
    for(const group of grouped.values()){const xp=group.actions.filter(a=>a.exp>0);training.push([locationName(group.loc),entityName(group.entity),xp.length?String(Math.min(...xp.map(a=>a.level))):"No skill XP",group.actions.slice(0,8).map(a=>title(a.name)).join(" · ")+(group.actions.length>8?" · More activities listed below":"")]);}
    table(page,"Training locations",["Area","Station","First XP level","Example activities"],training);
    table(page,"Activities and supplies",["Activity","Level","Base XP","Base time","Station","Supplies or requirements","Produces","Status"],own.map(([,a])=>[title(a.name),String(a.level),number.format(a.exp||0),time(a),entityName(a.entity),inputs(a)+(a.requiresMembership?" · Membership required":""),outputs(a),status(a)]),{description:"Times include four preparation ticks at two seconds per tick. Exchanges with zero XP are not XP training. Pet chances are base per-action probabilities; a matching map and any membership requirement still apply."});
  }
}

for(const [id,page]of wikiIds.locations){const record=data.locations[id];
  if(art.maps[id]){const dims=await art.size(art.maps[id]);page.mapImage={src:art.maps[id],width:dims[0],height:dims[1]};}
  fact(page,[["Continent",title(record.continent||"Mainland")]]);
  if(!page.sections?.some(([heading])=>/get there|travel|access/i.test(heading)))section(page,"How to get there","Select "+record.name+" on the World Map and use its available travel option. Dungeon chambers may require using a connecting Descend tile.");
  const enemies=[],services=[],spots=[];
  for(const [entity,placement]of Object.entries(record.entities||{})){
    const foe=data.foes[entity];if(foe){const stats=foe.stats;enemies.push([wikiIds.foes.get(entity)?.title||title(foe.name),String(Math.max(1,Math.floor(((stats.attack+stats.strength)/2+stats.defense)/2))),String(placement.locations?.length||1),String((placement.locations||[]).reduce((sum,loc)=>sum+(loc.slots?.length||0),0)),foe.requiredItem?itemName(foe.requiredItem):foe.safeSpot?"Safe encounter":"—"]);continue;}
    const shop=Object.values(data.shops).find(shop=>shop.id===entity||shop.entityType===entity);
    const own=activities.filter(([,a])=>active(a)&&a.entity===entity);
    if(shop)services.push([shop.name,"Shop",shop.items.map(stock=>data.items[stock]?itemName(stock):title(stock)).join(" · ")]);
    if(entity==="bank")services.push(["Bank","Storage","Deposit items from the loot bag"]);
    if(/^(rusty|bloodied|scorched)-chest$/.test(entity))services.push([entityName(entity),"Dungeon coin exchange",own.map(([,a])=>title(a.name)).join(" · ")]);
    if(placement.npc&&!shop)services.push([entityName(placement.npc),"NPC",own.map(([,a])=>title(a.name)).join(" · ")||"Talk to this character in-game"]);
    const skills=[...new Set(own.map(([key])=>key.split("/")[0]))];
    for(const skill of skills){const list=own.filter(([key])=>key.startsWith(skill+"/"));spots.push([entityName(entity),skillName(skill),String(placement.locations?.length||1),list.slice(0,8).map(([,a])=>title(a.name)+" ("+a.level+")").join(" · ")+(list.length>8?" · More on the skill page":"")]);}
  }
  table(page,"Enemies",["Enemy","Combat level","Spawns","Fighting spots","To fight"],enemies.length?enemies:[["None listed in release definitions","—","—","—","—"]]);
  table(page,"Shops and services",["Name","Type","Stock or service"],services.length?services:[["None listed in release definitions","—","—"]]);
  table(page,"Skilling spots",["Spot","Skill","Locations on map","Activities (required level)"],spots.length?spots:[["None listed in release definitions","—","—","—"]]);
  const exchanges=activities.filter(([,a])=>active(a)&&record.entities[a.entity]&&Object.keys(a.inventoryChanges||{}).some(key=>/^(rusty|bloodied|scorched)Coin$/.test(key)));
  table(page,"Dungeon coin exchanges",["Chest","Reward","Cost","Requirements"],exchanges.map(([key,a])=>[entityName(a.entity),Object.entries(a.inventoryChanges).filter(([,n])=>n>0).map(([id,n])=>qty(id,n)).join(" · "),inputs(a),skillName(key.split("/")[0])+" "+a.level]));
  const npcs=[];
  for(const placement of Object.values(record.entities)){const npc=data.npcs[placement.npc];if(!npc)continue;
    const order={skin:0,feet:1,hands:1,body:2,cape:3,hair:3,head:4,shield:5,weapon:6};
    const equipment=Object.entries(npc.equipment).filter(([slot,item])=>slot in order&&typeof item==="string"&&!(slot==="hair"&&typeof npc.equipment.head==="string")).sort(([a],[b])=>order[a]-order[b]);
    const layers=equipment.map(([,item])=>art.equipment[item]).filter(Boolean);if(!layers.length)continue;
    const frames=await Promise.all(layers.map(url=>art.sprite(url,128)));const left=Math.min(...frames.map(frame=>frame.crop[0])),top=Math.min(...frames.map(frame=>frame.crop[1]));
    npcs.push({label:npc.name,layers,size:[128,128],crop:[left,top,Math.max(...frames.map(frame=>frame.crop[0]+frame.crop[2]))-left,Math.max(...frames.map(frame=>frame.crop[1]+frame.crop[3]))-top]});
  }
  if(npcs.length)page.npcSprites=npcs;
}

const petPages=[];
for(const [id,record]of Object.entries(data.pets)){
  const page=make("pets",id==="petBlueLobster"?"pet-blue-lobster":"pet-"+slug(record.name),record.name);
  page.title=record.name;page.releasePet=true;page.group=record.requiredItemToObtain?"Mapped companions":"Rare catches";wikiIds.pets.set(id,page);checked(page,id);
  const tasks=activities.filter(([,a])=>active(a)&&typeof a.inventoryChanges?.[id]==="number"&&a.inventoryChanges[id]>0);
  const encounters=Object.values(data.foes).filter(foe=>foe.drops?.[id]||foe.championDrops?.[id]);
  const map=record.requiredItemToObtain,exchange=map&&activities.find(([,a])=>active(a)&&a.inventoryChanges?.[map]>0)?.[1];
  const skills=[...new Set(tasks.map(([key])=>skillName(key.split("/")[0])))];if(encounters.length)skills.push("Combat");
  const cost=exchange?.inventoryChanges?.audienceFavor;
  page.facts=[["Skill",skills.join(" · ")||"Combat"],["Slot","Pet"],["Equip requirements",skillReq(record.requirements)],
    ["Pet Map",map?itemName(map):"None required"],["Membership to obtain",record.requiresMembershipToObtain?"Required":"Not required"],
    ...(exchange?[["Vendor",entityName(exchange.entity)],["Cost",-cost+" Audience Favor"]]:[])];
  page.summary=skills.join(" · ")+" companion"+(map?" · "+itemName(map):" · No map required");
  page.sections=[["How to get "+record.name,map?"Buy "+itemName(map)+" from "+entityName(exchange?.entity)+" at Fellroot Swamp Hut for "+(-cost)+" Audience Favor. Carry the map while completing one of the eligible tasks or encounters below. The map is consumed when the pet is found. "+(record.requiresMembershipToObtain?"Adventurer’s Guild membership is required to obtain this pet.":""):"Catch lobster at a Crab Cage Spot. Fishing level 40 is required. Blob is the release companion version of Blue Lobster; no pet map is required."]];
  if(map)section(page,"Level bonuses","The matching skill's base pet chance doubles at level 70 and triples at level 85. The table shows approximate per-action odds at each tier. These bonuses do not change the separately listed boss-drop odds.");
  page.tables=[];
  if(tasks.length)table(page,"Drop odds by eligible task",["Task","Skill / level","Where to train","Base odds per action",...(map?["Level 70–84","Level 85+"]:[])],tasks.map(([key,a])=>[title(a.name),skillName(key.split("/")[0])+" "+a.level,locationsOf(a.entity).map(([id])=>locationName(id)).join(" · ")||entityName(a.entity),odds(a.inventoryChanges[id]),...(map?[odds(Math.min(1,a.inventoryChanges[id]*2)),odds(Math.min(1,a.inventoryChanges[id]*3))]:[])]));
  if(encounters.length)table(page,"Combat drop odds",["Encounter","Where to find it","Odds per eligible kill","Required item"],encounters.map(foe=>[wikiIds.foes.get(foe.id)?.title||title(foe.name),locationsOf(foe.id).map(([id])=>locationName(id)).join(" · "),dropOdds(foe.drops?.[id]||foe.championDrops[id]),map?itemName(map):"None"]));
  const candidates=art.asset(id.replace(/^pet/,""));if(!candidates.length)throw Error("Missing companion sprite for "+id);
  page.sprites=[await art.sprite(candidates[0].url)];const icon=art.icons[record.iconMapping||id];if(icon)page.portrait={src:icon,source:gameUrl};
  page.related=["pets",...(map?[itemPage(map).id,"fellroot-swamp-hut"]:[]),...skills.map(name=>find("skills",name,{name})?.id),...encounters.map(foe=>wikiIds.foes.get(foe.id)?.id)].filter(Boolean);
  petPages.push(page);
}
const cannon=byId.get("dwarven-cannon");
if(cannon){const archivedPet={...structuredClone(cannon),id:"pet-dwarven-cannon",category:"pets",group:"Archived beta companions",releasePet:true};reference.push(archivedPet);byId.set(archivedPet.id,archivedPet);}
const petOverview=byId.get("pets");
petOverview.summary="Release companions, map vendors and task-specific drop odds from the November 19 public client.";
petOverview.sections=[["Maps and membership","Visit Mork and Otis at Fellroot Swamp Hut. Check each map's price: Mork's new skilling companions cost 10 Audience Favor, his original skilling companions cost 20, and Otis's maps cost 15 with membership required. Beatrix and Scales maps still cost 10. A map enables a rare pet drop; it does not directly grant the pet."],
  ["Skilling chances","The release definitions give a base per-action probability for each eligible task. The matching skill doubles these chances at level 70 and triples them at level 85. Pet pages list task-by-task odds and training locations."],
  ["Combat pets and rare catches","Beatrix and Scales use the displayed boss-drop tables and their maps. Blob is the Blue Lobster companion, caught while fishing for lobster at base odds of 1 in 2,000,000 without a map."],
  ["Beta archives","Dwarven Cannon is not defined in this release client. Its item and pet pages preserve the beta record with an archive label."]];
petOverview.tables=[];
table(petOverview,"Release companions",["Pet","Skill","Map","Vendor","Audience Favor","Membership"],petPages.map(page=>{const facts=new Map(page.facts);return[page.title,facts.get("Skill"),facts.get("Pet Map"),facts.get("Vendor")||"Rare catch",facts.get("Cost")||"None",facts.get("Membership to obtain")];}));
petOverview.companionSprites=Object.fromEntries(petPages.map(page=>[page.title,page.sprites[0]]));checked(petOverview,"pets");

// Explicit release additions and changes which are not ordinary recipe/drop rows.
const atoll=wikiIds.locations.get("tutabay-atoll");atoll.summary="The release starter island: learn early skilling and combat, then obtain a ticket to sail to Progryn.";
section(atoll,"How to get there","New characters begin at Tutabay Atoll. From Fencewell Bridge, use the boat's Sail to Tutabay Atoll activity to return to the island.");
section(atoll,"Leaving for Progryn","Thomas exchanges one Rodent Pelt or one Bronze Dagger for a Ticket to Progryn. Hand the ticket to the island boat to sail to Fencewell Bridge. The client also defines a one-time abandoned-hut search that yields a ticket; that activity is hidden from the normal map/activity lists.");
table(atoll,"Travel connections",["Destination","How to travel","Requirement"],[["Fencewell Bridge","Sail to Progryn at the island boat","1 × Ticket to Progryn"]]);
section(atoll,"Starting supplies","Jaciens' Supplies sells a Training Pickaxe for 7 coins and a Training Fishing Rod for 4 coins. Lucille exchanges one Copper Ore for one Tin Ore. Island Rodents drop Bones and have a 1 in 2 chance of dropping a Rodent Pelt.");
atoll.related=["island-rodent",itemPage("rodentPelt").id,itemPage("ticketToProgryn").id,itemPage("trainingPickaxe").id,itemPage("trainingFishingRod").id,"fencewell-bridge"];
section(wikiIds.locations.get("fencewell-bridge"),"Boat to Tutabay Atoll","The boat at Fencewell Bridge offers Sail to Tutabay Atoll. Sailing back from the island consumes one Ticket to Progryn.");
for(const [id,page]of wikiIds.items){const rewards=Object.values(data.achievements).filter(achievement=>achievement.rewards?.items?.some(item=>item.itemId===id));
  table(page,"Achievement rewards",["Achievement","Requirement","Quantity"],rewards.map(achievement=>[achievement.name,achievement.description||"See the in-game achievement",String(achievement.rewards.items.find(item=>item.itemId===id).quantity)]));
}
const blobItem=itemPage("petBlueLobster");blobItem.aliases=[...new Set([...(blobItem.aliases||[]),"Blue Lobster"])];blobItem.summary="Blob is the release's Blue Lobster companion. Catch it while fishing for lobster; the base chance is 1 in 2,000,000 per action.";blobItem.sprites=wikiIds.pets.get("petBlueLobster").sprites;
blobItem.sections=[["Release pet conversion","The old Raw Blue Lobster item has been replaced in the release definitions by petBlueLobster, named Blob. It now occupies the Pet slot and has an original companion sprite."],["Where to find it","Fish for lobster at Crab Cage Spots in Solace Shoals with Fishing 40. No pet map is required."]];
const water=itemPage("waterBucket");if(water){water.artwork=art.icons.waterBucket;section(water,"Artwork","This release includes an original filled Water Bucket icon, shown above.");}
for(const [key,name]of [["smelting","Current smelting recipes"],["kiln","Current crafting activities"],["glassblowing-pipe","Current crafting activities"]]){
  const page=byId.get(key);const entities=key==="smelting"?["furnace"]:[key];const list=activities.filter(([,a])=>active(a)&&entities.includes(a.entity)&&(key!=="smelting"||/^smelt-/.test(a.id)));
  table(page,name,["Activity","Skill / level","Materials","Output","Base XP","Base time"],list.map(([id,a])=>[title(a.name),skillName(id.split("/")[0])+" "+a.level,inputs(a),outputs(a),String(a.exp||0),time(a)]));checked(page,key);
}

// Keep established routes, but use current tool names in live prose and tables.
const renamed=Object.entries(replacements).filter(([id])=>id!=="petBlueLobster").map(([id,pageId])=>[original.find(page=>page.id===pageId)?.title,wikiIds.items.get(id)?.title]).filter(([before,after])=>before&&after&&before!==after);
function updateText(value){if(typeof value!=="string")return value;for(const [before,after]of renamed)value=value.replaceAll(before,after);
  return value.replaceAll("November 18 beta client","November 19 release client").replaceAll("November 18 beta build","November 19 release build").replaceAll("checked beta client","checked release client").replaceAll("checked beta build","checked release build").replaceAll("The beta definition","The release definition");}
function updateTree(value){if(typeof value==="string")return updateText(value);if(Array.isArray(value))return value.map(updateTree);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,value])=>[key,updateTree(value)]));return value;}
for(const page of reference){if(page.availabilityStatus==="absent-current-build")continue;for(const field of ["summary","sections","facts","tables"])if(page[field])page[field]=updateTree(page[field]);}
const linkIndex=new Map();for(const page of reference)for(const name of [page.title,...(page.aliases||[])])linkIndex.set(norm(name),page.id);
for(const page of reference){for(const t of page.tables||[]){const links=new Map(t.links||[]);for(const row of t.rows)for(const cell of row)for(const part of String(cell).split(/ · |, /)){const id=linkIndex.get(norm(part));if(id&&id!==page.id)links.set(part,id);}if(links.size)t.links=[...links];}page.related=[...new Set(page.related||[])].filter(id=>byId.has(id)&&id!==page.id);}

// Preserve facts and numeric definitions as durable citations; do not redistribute executable code or long game prose.
function factual(value){if(Array.isArray(value))return value.map(factual);if(!value||typeof value!=="object")return value;if("$expression"in value)return{unresolvedExpression:true};return Object.fromEntries(Object.entries(value).filter(([key])=>!["description","lore","flavorText","disclaimer","customActionText","customPrepText","actionText","prepText"].includes(key)).map(([key,value])=>[key,factual(value)]));}
const evidence={capturedAt:art.manifest.capturedAt,officialGame:gameUrl,clientBuild:path.basename(art.client.file),clientSha256:art.client.sha256,
  scope:"Factual public release definitions; unresolved executable expressions marked. No authenticated state or server source.",
  mechanics:{standardTickMilliseconds:2000,standardSkillingPreparationTicks:4,petChanceLevel70:2,petChanceLevel85:3,playerCombatLevel:"floor((max((Attack + Strength) / 2, Evil Magic, Ranged) + Defense) / 2)"},definitions:factual(data)};
await fs.writeFile(path.join(root,"docs/assets/game-data/release-2026-11-19.json"),JSON.stringify(evidence,null,2)+"\n");
await fs.writeFile(path.join(root,"docs/reference.json"),JSON.stringify(reference,null,2)+"\n");
await fs.writeFile(path.join(root,"docs/item-icons.js"),"// Original icons verified in the November 19 release capture.\nexport const itemIcons = "+JSON.stringify(icons,null,2)+";\n\nexport const itemIconGroups = "+JSON.stringify(itemIconGroups,null,2)+";\n");
await fs.mkdir(path.join(root,"audits/2026-11-19-release"),{recursive:true});
const changed=reference.filter(page=>JSON.stringify(page)!==JSON.stringify(original.find(prior=>prior.id===page.id))).map(page=>({id:page.id,category:page.category,gameId:page.gameId,newPage:!original.some(prior=>prior.id===page.id),status:page.availabilityStatus||"current"}));
const ledger={capturedAt:art.manifest.capturedAt,client:art.client.url,clientSha256:art.client.sha256,gameTables:art.manifest.tables,wikiEntries:reference.length,changed,archivedGameItems:archived,artworkRemapped:Object.fromEntries(migrated)};
await fs.writeFile(path.join(root,"audits/2026-11-19-release/update-ledger.json"),JSON.stringify(ledger,null,2)+"\n");
console.log(JSON.stringify({referenceEntries:reference.length,updated:changed.length,newPages:changed.filter(page=>page.newPage).length,releasePets:petPages.length,archivedItems:archived,artworkRemapped:migrated.size},null,2));
