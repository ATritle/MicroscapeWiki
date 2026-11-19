import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {title} from './release-tools.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshot=process.argv[2];
const read=async f=>JSON.parse(await fs.readFile(f,'utf8'));
const data=await read(path.join(snapshot,'game-data.json'));
const comparison=await read(path.join(snapshot,'comparison.json'));
const ref=await read(path.join(root,'docs/reference.json'));
const page=(category,id)=>ref.find(p=>p.category===category&&p.gameId===id);
const get=id=>ref.find(p=>p.id===id);
const item=id=>page('items',id)||page('pets',id);
const name=id=>item(id)?.title||data.entities[id]?.name||data.foes[id]?.name||title(id);
const fact=(p,k,v)=>{p.facts=(p.facts||[]).filter(([key])=>key!==k);p.facts.push([k,v]);};
const section=(p,k,v)=>{p.sections=(p.sections||[]).filter(([key])=>key!==k);p.sections.push([k,v]);};
const table=(p,k,columns,rows)=>{p.tables=(p.tables||[]).filter(t=>t.title!==k);p.tables.push({title:k,columns,rows});};
const source=['Archived release game data · November 19, 2026','./assets/game-data/release-2026-11-19.json'];
const cite=p=>{p.sources=[source,...(p.sources||[]).filter(([,url])=>url!==source[1])];};
const favor=get('item-audience-favor');
favor.sections=favor.sections.map(([h,t])=>[h,t.replace('The Journey Begins awards 3 Favor at level 10 in any skill','Equip your first weapon or tool to earn 3 Favor from your first-weapon achievement. The Journey Begins instead awards a Bazaar Invite at level 10 in any skill')]);
favor.facts=favor.facts.filter(([k])=>k!=='Beta carryover');
section(favor,'Pet-map prices at release',"Mork’s new skilling-pet maps cost 10 Audience Favor; his original skilling-pet maps cost 20. Beatrix and Scales maps remain 10. Otis’s maps cost 15 and require Adventurer’s Guild membership to obtain the pet. Check the individual pet page for eligible tasks and current odds.");
const steel=get('steel-pickaxe');steel.summary='Archived equipment entry. Steel Pickaxe is absent from both the saved beta and checked November 19 release definitions.';
fact(steel,'Availability','Absent from checked release client; archived community stats only');
steel.sections=[['Release status','No Steel Pickaxe definition, recipe, drop or shop source is present in the checked release client. The community stats below are historical.'],['Current pickaxes','Use the Pickaxe, Training Pickaxe or Ironbreaker Pickaxe pages for current equipment and acquisition details.']];
cite(steel);
const crystal=get('time-crystal');
section(crystal,'Beta carryover','The release item definition retains the carries-to-release tag. This is a client flag, not a verification of any individual account’s transferred balance.');
const vendor=get('vendor');
table(vendor,'Shop purchase markups',['Shop','General markup','Item-specific exceptions'],Object.values(data.shops).map(s=>[s.name,(s.globalBuyMultiplier??1)+'×',Object.entries(s.specificItemBuyMultipliers||{}).map(([id,n])=>name(id)+': '+n+'×').join(' · ')||'None listed']));
cite(vendor);
// Remove superseded beta-only shop tables and contradictory obsolete prose.
for(const p of ref.filter(p=>p.category==='items'&&data.items[p.gameId]))p.tables=p.tables.filter(t=>t.title!=='Sold by');
for(const p of ref.filter(p=>p.category==='locations')) {
  const current=data.locations[p.gameId];if(!current)continue;
  p.summary=Object.keys(current.entities).some(id=>data.foes[id])?'Explore '+p.title+'; current enemies, services, training spots and travel details are listed below.':p.summary;
}
for(const id of ['rustyCoin','bloodiedCoin','scorchedCoin']) {
  const p=item(id),acts=Object.values(data.activities).filter(a=>a.inventoryChanges?.[id]<0&&!a.softDeleted);
  section(p,'Spend dungeon coins','Use the matching chest in the boss’s lair. These are fixed coin-for-item exchanges, not random Jester’s Pouches. The beta Jester’s Pouch exchange and opening activities are absent from the release client.');
  table(p,'Release chest rewards',['Chest','Reward','Coin cost'],acts.map(a=>[name(a.entity),Object.keys(a.inventoryChanges).filter(k=>a.inventoryChanges[k]>0).map(name).join(' · '),String(-a.inventoryChanges[id])]));
}
for(const id of ['dragonstoneAmulet','amuletOfProgress']) {
  const p=item(id);if(p)section(p,'Long release action','The current direct production action is single-execution and has 10,801 action ticks: 21,610 seconds including four preparation ticks (about 6 hours). Its XP is awarded for that long action. Any deprecated legacy method listed separately should not be assumed to be a normal current recipe.');
}
const pouch=get('jesters-pouch');
pouch.availabilityStatus='absent-current-build';pouch.summary='Archived beta reward pouch. Its coin exchanges and opening activity are absent from the November 19 release client.';
pouch.tables=pouch.tables.map(t=>({...t,title:'Archived beta · '+t.title.replace(/^(Archived beta · )+/, '')}));
pouch.sections=[['Release replacement','Spend Rusty, Bloodied or Scorched Coins at the matching chest inside the boss’s lair for fixed equipment rewards. The tables below preserve the former beta pouch activities.']];cite(pouch);
// Older aliases remain useful entry points, but must share the current tables.
for(const [alias,canonical]of [['feathers','feather'],['drakestone-isle','drakestone-isle-mine']]) {
  const a=get(alias),c=get(canonical);for(const key of ['facts','tables','sections','mapImage','sprites','statsDate','sources'])if(c[key])a[key]=structuredClone(c[key]);
  a.gameId=c.gameId;a.summary='See '+c.title+' for the current release record. The same current information is shown below.';a.related=[canonical,...(a.related||[]).filter(id=>id!==canonical)];
}
// Full factual deltas are retained for review; variable-name changes are not mechanics.
const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?('$expression'in value?{unresolvedExpression:true}:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,clean(v)]))):value;
await fs.writeFile(path.join(root,'audits/2026-11-19-release/build-comparison.json'),JSON.stringify(clean(comparison),null,2)+'\n');
const changes={
  id:'release-changes',title:'November 19 release changes',category:'guides',
  summary:'What changed between the archived beta and the November 19 public release build: starter island, pets, gear, crafting, bosses and dungeon rewards.',
  sections:[
    ['Compared builds','This comparison uses the saved November 18 beta and the November 19 public release files, captured at 20:54 UTC and checked again after launch. It covers game definitions and original artwork. Server-only rules, account migrations and live service behavior cannot all be established from client files.'],
    ['Start at Tutabay Atoll','The new starter island contains Island Rodents, fishing, mining, cooking and smithing spots, a bank and three NPCs. Jaciens sells the Training Pickaxe (7 coins) and Training Fishing Rod (4 coins). Lucille trades one Copper Ore for one Tin Ore. Thomas trades one Rodent Pelt or one Bronze Dagger for a Ticket to Progryn. Sail to Fencewell Bridge using the ticket; the return boat goes back to Tutabay Atoll.'],
    ['Three different queues','Queued for login is the admission screen shown before connecting. The client keeps a queue ticket and polls again after the interval supplied by the server. Resource queues happen in the world when a training or combat spot is full; the developer says these are intentional. The Adventurer’s Guild activity queue is the separate feature for arranging your own future tasks.'],
    ['Pets and map costs','Eleven new skilling companions join the existing collection, and Blue Lobster becomes the companion Blob. There are 36 current pet definitions. Mork’s original eleven skilling pets now have half their beta base chance and their maps cost 20 Favor instead of 10. His new skilling pets’ maps cost 10; Beatrix and Scales maps remain 10. Otis maps remain 15 with membership. Each pet page lists eligible tasks, locations, base odds and level-70/85 bonuses. Dwarven Cannon is archived because its definition was removed.'],
    ['Bazaar and achievements','Reach level 10 in any skill to earn the Bazaar Invite from The Journey Begins. The client requires the invite to access trading. Equipping your first weapon or tool now rewards 3 Audience Favor. Awakening Power still gives 6. The developer’s launch notes say targeted trading is restricted while prices and quantities remain freely chosen; use the live offer dialog for matching, fees and timing. Nine Jubilee party achievements were removed and twelve pet achievements were added.'],
    ['Dungeon coin chests','Rusty, Bloodied and Scorched Chests are now inside the corresponding boss lairs. Their rewards are fixed exchanges at Piety 1. The former Jester’s Pouch coin exchanges and pouch-opening activity are gone. Boss pages and item pages include the new exchanges alongside revised drop odds.'],
    ['Crafting and chest changes','Vial production moves from Crafting 33 / 87 XP to Crafting 19 / 60 XP. The direct Dragonstone Amulet craft and enchant actions become single-execution actions lasting about six hours including preparation, with much larger XP awards. Sir Bratley’s right shield half costs 7,300,000 coins instead of 23,000,000. The Mar–Del–Del chest now yields 3 Adamantite Ore instead of 35 and Shell of Ka becomes 1 in 16 instead of 1 in 4. The Mar–Ner chest yields 1 Progrite Bar instead of 7. Rodrigo no longer stocks Steel Bars.'],
    ['Skills, abilities and graphics','The sixteen skills, eighty-nine abilities and eight spells remain. Six abilities point to updated tool IDs; their effect definitions did not change. New pet sprites, starter-island art and item icons are included. The World Map, Fencewell Bridge, The Sump, Havendell Lair, King Onyx Dragon’s lair, Ice Warrior and quest icon have updated artwork. Existing tutorial screenshots remain community examples; current location pages use release maps.'],
    ['Removed beta content','Archived pages keep their original URLs and locally preserved artwork. A missing release definition establishes absence from this captured client, not a promise that an item can never return. Candy Cane, Elper’s Hat, Lava Rod, Santa Hat and Uncut Dragonstone still lack a confirmed public acquisition source and remain explicitly marked.'],
    ['Launch commitment','The official launch announcement commits to no further character-progress wipes, with rollbacks still possible for serious bugs. This page records the checked launch build; future hotfixes may change it.']
  ],
  tables:[],related:['getting-started','tutabay-atoll','pets','dungeons','bazaar','activity-queue','release-notes'],
  sources:[source,['Official November 19 launch notes','https://microscape.cc/patch-notes/'],['Archived beta game data · November 18, 2026','./assets/game-data/beta-2026-11-18.json']]
};
const add=(title,columns,rows)=>changes.tables.push({title,columns,rows});
add('New release companions',['Pet','Skill','Map price'],comparison.tables.pets.added.map(id=>{const p=page('pets',id),f=new Map(p.facts);return[p.title,f.get('Skill'),f.get('Cost')||'No map required'];}));
add('Equipment balance changes',['Item','Beta','Release'],[
 ['dragonShield','Defense +18','Defense +21'],['progriteSqShield','Defense +12','Defense +14'],['skullShield','Defense +6','Defense +11'],['sanglewoodStaff','Evil Magic +18','Evil Magic +26'],['ringOfGluttony','Attack, Strength, Ranged, Evil Magic −15 each','−5 each']
].map(([id,...rest])=>[name(id),...rest]));
add('Other item changes',['Item','Change'],[['Food Scraps','Now marked undroppable'],['Fox Hat','Special-bonus wording now identifies oddly large turkeys']]);
add('Tool ID replacements',['Release tool','Previous client ID'],Object.entries({loggingAxe:'bronzeAxe',pickaxe:'bronzePickaxe',shovel:'steelShovel',shovelHead:'steelShovelHead',hammer:'bronzeHammer',hellforgedHammer:'mithrilHammer',ironbreakerPickaxe:'ironPickaxe',ladle:'bronzeLadle'}).map(([id,before])=>[name(id),before]));
add('Ability source updates',['Ability','Current source'],comparison.tables.abilities.changed.map(({id})=>[data.abilities[id].name,name(data.abilities[id].onItem)]));
const bossChanges=[];
for(const {id,changes:list}of comparison.tables.foes.changed)for(const c of list){if(c.field==='stats.hp')bossChanges.push([title(data.foes[id].name),'HP',String(c.before),String(c.after)]);else if(c.field.endsWith('.rarity'))bossChanges.push([title(data.foes[id].name),name(c.field.split('.')[1])+(c.field.startsWith('championDrops')?' (Champion)':''),'1 in '+2**c.before,'1 in '+2**c.after]);}
add('Boss HP and drop changes',['Boss','Stat or drop','Beta','Release'],bossChanges);
add('Other foe loot changes',['Foe','Release change'],[['Blue Dragon','Dungeon Key removed from its drop table'],['Fire Dwarf','Pickaxe and Ironbreaker Pickaxe replace the old tool IDs; same odds'],['Greater Demon','Hellforged Hammer replaces mithrilHammer; same odds'],['Monk','Hammer replaces bronzeHammer; same odds'],['Mouse','Ladle replaces bronzeLadle; same odds'],['Island Rodent','New: 3 HP, guaranteed Bones, Rodent Pelt 1 in 2, 12-second base attack interval']]);
add('Dungeon chest rewards',['Chest','Reward','Cost'],Object.entries(data.activities).filter(([,a])=>/^(rusty|bloodied|scorched)-chest$/.test(a.entity)&&!a.softDeleted).map(([,a])=>[name(a.entity),Object.entries(a.inventoryChanges).filter(([,n])=>n>0).map(([id])=>name(id)).join(' · '),Object.entries(a.inventoryChanges).filter(([,n])=>n<0).map(([id,n])=>-n+' × '+name(id)).join(' · ')]));
add('Removed beta item definitions',['Archived item'],ref.filter(p=>p.category==='items'&&p.availabilityStatus==='absent-current-build').map(p=>[p.title]));
const links=new Map(ref.map(p=>[p.title,p.id]));for(const t of changes.tables)t.links=[...links].filter(([n])=>t.rows.some(r=>r.includes(n)));
await fs.writeFile(path.join(root,'docs/release-guide.js'),'// Generated from the archived launch comparison; see scripts/enrich-release.mjs.\nexport const releaseGuide = '+JSON.stringify(changes,null,2)+';\n');
await fs.writeFile(path.join(root,'docs/reference.json'),JSON.stringify(ref,null,2)+'\n');
console.log('Enriched release guidance and generated the factual change guide.');
