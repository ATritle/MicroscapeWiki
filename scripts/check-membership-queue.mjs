import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {cleanMembershipQueue,exampleMembershipQueue,decodeMembershipQueue,queuePlayerEquipment,queueAvailableItems,missingQueueEquipment,queueGearChoices} from '../docs/membership-queue.js';
import {encodePlan,cleanPlan} from '../docs/queue-model.js';
const catalog=JSON.parse(await fs.readFile(new URL('../docs/queue-catalog.json',import.meta.url),'utf8'));
const example=exampleMembershipQueue(catalog),snapshot=structuredClone(example);
assert.equal(example.steps.length,3);
assert.deepEqual(example.steps.map(s=>s.type),['activity','loadout','activity']);
assert.equal(example.steps[0].activityId,'fishing/catch-shrimp');
assert.equal(example.steps[0].itemId,'rawShrimp');
assert.equal(example.steps[0].goal,'items-gte');
assert.equal(example.steps[0].value,100);
assert.equal(example.steps[1].name,'Melee');
assert.equal(example.steps[1].equipment.weapon,'bronzeScimitar');
assert.equal(example.steps[1].equipment.shield,'bronzeSqShield');
assert.equal(example.steps[2].activityId,'attack/fight-cow');
assert.equal(example.steps[2].value,20);
assert.deepEqual(decodeMembershipQueue(encodePlan(example),catalog),example);
assert.deepEqual(example,snapshot,'Validation and sharing must leave the original queue unchanged');
const mixed={version:1,name:'A 💚 shared queue',steps:[
  {type:'loadout',name:'Fishing',equipment:{}},
  {type:'activity',activityId:'attack/fight-cow',goal:'items-gte',itemId:'rawShrimp',value:10},
  {type:'activity',activityId:'fishing/catch-shrimp',goal:'items-lte',itemId:'rawShrimp',value:0},
  {type:'activity',activityId:'fishing/catch-shrimp',goal:'level',value:99},
  {type:'activity',activityId:'fishing/catch-shrimp',goal:'indefinite',value:100}
]};
const validated=cleanMembershipQueue(mixed,catalog);
assert.equal(validated.steps[4].value,0);
assert.deepEqual(decodeMembershipQueue(encodePlan(validated),catalog),validated);
for(const slot of [-1,0,5,1.5,'2'])assert.throws(()=>cleanMembershipQueue({...example,steps:[{type:'loadout',slot}]},catalog),/saved loadout reference/);
const legacy=cleanMembershipQueue({...example,steps:[{type:'loadout',slot:2,name:'Earlier gear'}]},catalog);
assert.deepEqual(legacy.steps[0],{type:'loadout',name:'Earlier gear',legacySlot:2});
assert.deepEqual(decodeMembershipQueue(encodePlan(legacy),catalog),legacy,'Earlier links must remain readable without inventing their gear');
assert.deepEqual(cleanMembershipQueue({...example,steps:[{type:'loadout',name:'Empty',equipment:{}}]},catalog).steps[0].equipment,{});
for(const equipment of [null,[],{weapon:'missing'},{shield:'bronzeScimitar'},{unknown:'bronzeScimitar'},{potion2:'bronzeScimitar'}])assert.throws(()=>cleanMembershipQueue({...example,steps:[{type:'loadout',equipment}]},catalog));
const twoHanded=Object.keys(catalog.items).find(id=>catalog.items[id].slot==='weapon'&&catalog.items[id].tags.includes('2h'));
assert(twoHanded);
assert.throws(()=>cleanMembershipQueue({...example,steps:[{type:'loadout',equipment:{weapon:twoHanded,shield:'bronzeSqShield'}}]},catalog),/two-handed/);
assert.deepEqual(cleanMembershipQueue({...example,steps:[{type:'loadout',equipment:{weapon:twoHanded}}]},catalog).steps[0].equipment,{weapon:twoHanded});
for(const bad of [null,{}, {type:'anything'}, {...example.steps[0],activityId:'missing'}, {...example.steps[0],goal:'invalid'}, {...example.steps[0],value:-1}, {...example.steps[0],itemId:'__proto__'}, {...example.steps[0],goal:'level',value:100}])assert.throws(()=>cleanMembershipQueue({...example,steps:[bad]},catalog));
assert.throws(()=>cleanMembershipQueue({...example,steps:Array(21).fill(example.steps[1])},catalog),/20 steps/);
assert.equal(cleanMembershipQueue({...example,steps:Array(20).fill(example.steps[1])},catalog).steps.length,20);
for(const bad of ['', 'bad!', 'a'.repeat(32001), encodePlan({version:1,steps:[{type:'loadout',slot:99}]})])assert.throws(()=>decodeMembershipQueue(bad,catalog));
assert.throws(()=>cleanMembershipQueue(cleanPlan({version:1,steps:[{activityId:'fishing/catch-shrimp',goal:'actions',value:10}]},catalog),catalog),/step type/,'The two tools must not silently reinterpret each other’s shares');
const stripped=cleanMembershipQueue({...example,username:'private',equipment:{},steps:[{type:'loadout',equipment:{weapon:'bronzeScimitar'},name:'Gear',token:'private'}]},catalog);
assert(!JSON.stringify(stripped).includes('private'));
const source=await fs.readFile(new URL('../docs/membership-queue.js',import.meta.url),'utf8');
const profile={name:'User12345',equipment:{weapon:'bronzeScimitar',shield:'bronzeSqShield',potion2:'attackPotion',head:'missingItem',skin:'skin1',hair:'pompBlack',body:'bronzeScimitar'},inventory:{steelScimitar:1}};
const profileBefore=structuredClone(profile),equipped=queuePlayerEquipment(profile,catalog);
assert.deepEqual(equipped,{weapon:'bronzeScimitar',shield:'bronzeSqShield',potion2:'attackPotion'});
assert.deepEqual(profile,profileBefore);
assert.throws(()=>queuePlayerEquipment({equipment:[]},catalog),/not available/);
assert.throws(()=>queuePlayerEquipment({},catalog),/not available/);
let available=queueAvailableItems(equipped,new Set(),catalog);
assert.deepEqual([...available].sort(),['attackPotion','bronzeScimitar','bronzeSqShield']);
assert(!available.has('steelScimitar'),'Do not infer inventory ownership or trust unrelated profile fields');
assert.deepEqual(queueGearChoices('weapon',available,catalog).map(([id])=>id),['bronzeScimitar']);
assert.deepEqual(queueGearChoices('potion3',available,catalog).map(([id])=>id),['attackPotion']);
assert.deepEqual(queueGearChoices('weapon',new Set(),catalog),[],'No lookup or confirmation means no item choices');
available=queueAvailableItems(equipped,new Set(['steelScimitar','notReal','rawShrimp','skin1']),catalog);
assert(available.has('steelScimitar'));
assert(!available.has('rawShrimp')&&!available.has('skin1')&&!available.has('notReal'));
assert.deepEqual(queueGearChoices('weapon',available,catalog).map(([id])=>id),['bronzeScimitar','steelScimitar']);
assert.deepEqual(missingQueueEquipment({weapon:'steelScimitar',shield:'bronzeSqShield'},available),[]);
assert.deepEqual(missingQueueEquipment({weapon:'steelScimitar',shield:'bronzeSqShield'},queueAvailableItems(equipped,[],catalog)),['steelScimitar']);
assert(!queueAvailableItems({},[],catalog).has(example.steps[1].equipment.weapon),'Saved/example queue gear never proves ownership');
assert(!/input:game|new WebSocket|socket\.emit|\/server\/ws|dispatchEvent/.test(source),'The wiki must not send actions to the game');
console.log('Activity Queue: public gear validation, equipped/confirmed item filtering, unavailable gear, custom loadouts, compatibility, legacy migration, sharing and manual-only boundary passed.');
