import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {parseHTML} from "linkedom";
import {worldMapData as data} from "../docs/world-map-data.js";
import {searchWorldMap,zoomMapView,centeredMapView,renderWorldMap} from "../docs/world-map.js";

const reference=JSON.parse(await fs.readFile(new URL("../docs/reference.json",import.meta.url),"utf8"));
const locations=new Map(reference.filter(e=>e.category==="locations").map(e=>[e.id,e]));
assert.equal(data.zones.length,51);
assert.equal(new Set(data.zones.map(z=>z.pin)).size,45);
for(const zone of data.zones) {
  assert(locations.has(zone.id),zone.id+" must open an existing location page");
  assert(zone.position[0]>0&&zone.position[0]<data.image.width);
  assert(zone.position[1]>0&&zone.position[1]<data.image.height);
  assert(zone.terms.length>0);
}
for(const query of ["Pet","pets","Mork","Otis","pet map","mOrK"])assert.deepEqual(searchWorldMap(query).map(m=>m.zone.id),["fellroot-swamp-hut"]);
assert.deepEqual(searchWorldMap("Copper Ore").map(m=>m.zone.id),["al-sahra-mine","fellroot-swamp","orock-east-mine","tutabay-atoll"]);
assert.deepEqual(searchWorldMap("Bank").map(m=>m.zone.id),["bank-vault","falcrest-bank","orock-west","tutabay-atoll"],"Riverbank map trades must not be mistaken for banks");
assert.equal(searchWorldMap("Fellroot Swamp").length,1,"Exact location names should select that location");
assert(searchWorldMap("Fishing").length>5);
for(const query of ["Chicken","chicken","Chickens"])assert.deepEqual(searchWorldMap(query).map(m=>m.zone.id),["fencewell-bridge"],"Enemy names should find combat, not cooking or other enemies dropping the meat");
assert.deepEqual(searchWorldMap("Shrimp").map(m=>m.zone.id),["fellroot-swamp","fencewell-bridge","tutabay-atoll"]);
assert.deepEqual(searchWorldMap("Lobster").map(m=>m.zone.id),["solace-shoals"]);
assert.deepEqual(searchWorldMap("Raw Chicken").map(m=>m.zone.id),["fencewell-bridge","fencewell-fields"],"Explicit raw-item searches still find every drop source");
const cookingRecipes=data.zones.flatMap(z=>z.terms).filter(([kind,,,context])=>kind==="Activity"&&context==="cooking");
for(const query of new Set(cookingRecipes.map(([,name])=>name))) {
  assert(!searchWorldMap(query).some(m=>m.reasons.some(r=>r.includes(" · Cooking · "))),query+" must not highlight generic cooking spots");
}
const cooking=searchWorldMap("Cooking");
assert.equal(cooking.length,8);
assert(cooking.every(m=>m.reasons.every(reason=>/^Skill: Cooking · (Fire|Cooking Table)$/.test(reason))));
assert(searchWorldMap("Biscuit").some(m=>m.zone.id==="manor-kitchen"),"Pet searches must retain their cooking drop sources");
assert(searchWorldMap("Redberries").some(m=>m.zone.id==="fencewell-fields"),"Gathering cooking ingredients remains searchable");
assert.deepEqual(searchWorldMap("Cooking Potion").map(m=>m.zone.id),["havendell"]);
assert(searchWorldMap("Pyreshell Shield").some(m=>m.zone.id==="havendell-dungeon"));
for(const [query,id,pin] of [["Gurgle","the-sump","rock-sewers"],["Morvane","havendell-lair","havendell-dungeon"],["King Onyx Dragon","dread-mount-onyx-lair","dread-mount-onyx-antechamber"],["Cinderforge","the-emberpit","lava-maze-mine"]]) {
  const result=searchWorldMap(query);assert.equal(result.length,1);assert.equal(result[0].zone.id,id);assert.equal(result[0].zone.pin,pin);assert(result[0].zone.entrance);
}
assert.equal(searchWorldMap("zzzzzzmissing").length,0);
assert.equal(searchWorldMap("  ").length,0);
const before={scale:.5,x:-120,y:-300},anchor={x:320,y:240};
const zoomed=zoomMapView(before,2,anchor,.1,3);
assert.equal((anchor.x-before.x)/before.scale,(anchor.x-zoomed.x)/zoomed.scale,"Wheel zoom must keep the map point beneath the cursor fixed");
assert.equal((anchor.y-before.y)/before.scale,(anchor.y-zoomed.y)/zoomed.scale);
assert.equal(zoomMapView(before,100,anchor,.1,3).scale,3);
assert.equal(zoomMapView(before,.0001,anchor,.1,3).scale,.1);
const centered=centeredMapView(before,[1480,1502],{width:900,height:560});
assert.equal(centered.x+1480*centered.scale,450);assert.equal(centered.y+1502*centered.scale,280);

globalThis.__WIKI_PRERENDER__=true;
const {document}=parseHTML("<html><body></body></html>");
const element=(tag,attrs={},...children)=>{const n=document.createElement(tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);n.append(...children);return n;};
const map=renderWorldMap({element,entryUrl:id=>"/locations/"+id+"/",initialQuery:"Copper Ore"});
assert.equal(map.node.querySelectorAll(".world-map-pin").length,45);
assert.equal(map.node.querySelectorAll(".world-map-pin.is-match").length,4);
assert.equal(map.node.querySelectorAll(".world-map-results a").length,4);
assert.equal(map.node.querySelector(".world-map-art").getAttribute("src"),data.image.src);
map.dispose();
console.log("Passed: 51 locations and 45 entrance pins, item/activity/NPC/shop/drop searches, food sources versus Cooking, exact enemy searches, Pet and Mork behavior, bank word boundaries, dungeon interiors, valid page links, cursor-anchored zoom and single-result centering.");
