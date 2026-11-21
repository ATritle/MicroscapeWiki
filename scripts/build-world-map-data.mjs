import fs from "node:fs/promises";
import crypto from "node:crypto";

const [snapshot,client] = process.argv.slice(2);
if(!snapshot||!client)throw Error("Usage: node scripts/build-world-map-data.mjs GAME_DATA_JSON CLIENT_JS");
const game=JSON.parse(await fs.readFile(snapshot,"utf8"));
const reference=JSON.parse(await fs.readFile(new URL("../docs/reference.json",import.meta.url),"utf8"));
const itemName=id=>game.items[id]?.name||game.pets[id]?.name||id;
const pages=reference.filter(e=>e.category==="locations");
const pageFor=id=>pages.find(e=>e.gameId===id);
// Interior chambers share their documented dungeon's world-map entrance.
const entranceFor={"rock-sewers-deep":"rock-sewers","the-sump":"rock-sewers",
  "dread-mount-onyx-lair":"dread-mount-onyx-antechamber","havendell-lair":"havendell-dungeon",
  "havendell-sanctum":"havendell-dungeon","the-emberpit":"lava-maze-mine"};
const activities=Object.entries(game.activities).filter(([,a])=>!a.notInMap);
const zones=[];
for(const [id,zone] of Object.entries(game.locations)) {
  const page=pageFor(id),entrance=entranceFor[id];
  const position=zone.mapPos||game.locations[entrance]?.mapPos;
  if(!page||!position||position.every(n=>n===0))continue;
  const terms=new Map();
  const add=(kind,text,detail="",context="")=>{if(text)terms.set(kind+":"+text+":"+detail+":"+context,context?[kind,text,detail,context]:[kind,text,detail]);};
  add("Location",page.title);add("Location",zone.name);add("Region",page.group);
  for(const [entityId,entity] of Object.entries(zone.entities||{})) {
    const entityName=game.entities[entityId]?.name||entityId;
    if(!entityId.startsWith("travel"))add("Spot",entityName);
    if(entity.npc)add("NPC",game.npcs[entity.npc]?.name);
    for(const shop of Object.values(game.shops).filter(s=>s.entityType===entityId)) {
      add("Shop",shop.name);
      for(const item of shop.items||[])add("Buy",itemName(item),shop.name);
    }
    const foe=game.foes[entityId];
    if(foe) {
      add("Enemy",foe.name);
      for(const item of Object.keys(foe.drops||{}))add("Drop",itemName(item),foe.name);
    }
    for(const [key,activity] of activities.filter(([,a])=>a.entity===entityId||a.mob===entityId)) {
      const skill=game.skills[key.split("/")[0]]?.name||key.split("/")[0];
      const cooking=key.startsWith("cooking/")&&["fire","cooking-table"].includes(entityId);
      const context=cooking?"cooking":"";
      add("Activity",activity.name,skill+" · "+entityName,context);
      add("Skill",skill,entityName,context);
      for(const [item,amount] of Object.entries(activity.inventoryChanges||{}))if(typeof amount==="number"&&amount>0) {
        add("Obtain",itemName(item),activity.name+" · "+skill,cooking&&game.pets[item]?"cooking-pet":context);
        const pet=Object.values(game.pets).find(p=>p.requiredItemToObtain===item);
        if(pet)add("Pet map",pet.name,activity.name);
      }
    }
  }
  const entrancePage=entrance&&pageFor(entrance);
  zones.push({id:page.id,gameId:id,name:page.title,position,pin:entrance||id,
    ...(entrancePage?{entrance:entrancePage.title}:{}),
    petMaps:Boolean(zone.entities?.mork||zone.entities?.otis),terms:[...terms.values()]});
}
const data={source:{url:"https://microscape.cc/play/assets/index-BsSHHy-E.js",checked:"2026-11-21",
  sha256:crypto.createHash("sha256").update(await fs.readFile(client)).digest("hex"),
  artwork:"https://microscape.cc/play/assets/microscape-world-map-8vzsaSaK.png"},
  image:{src:"./assets/maps/microscape-world-map.png",width:2000,height:1800},zones};
await fs.writeFile(new URL("../docs/world-map-data.js",import.meta.url),"// Generated from public game definitions. See scripts/build-world-map-data.mjs.\nexport const worldMapData = "+JSON.stringify(data)+";\n");
console.log(JSON.stringify({zones:zones.length,pins:new Set(zones.map(z=>z.pin)).size,terms:zones.reduce((n,z)=>n+z.terms.length,0)}));
