import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {spriteMotionData as data} from "../docs/sprite-motion-data.js";
globalThis.window={matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){}};
globalThis.document={hidden:false,addEventListener(){}};
const {spriteMotion,petPose,previewMotion,sampleMotion,attachHoverPreview,stopSpritePreviews,weaponMotionType}=await import("../docs/sprite-animation.js");
const reference=JSON.parse(await fs.readFile(new URL("../docs/reference.json",import.meta.url),"utf8"));
const pets=reference.filter(e=>e.category==="pets"&&e.availabilityStatus!=="absent-current-build"&&e.sprites?.length);
assert.equal(pets.length,36);
for(const pet of pets) {
  const sprite=pet.sprites[0],profile=spriteMotion(sprite);
  assert.equal(profile.kind,"pet",pet.id);
  const frames=[...profile.standardAnimation,...profile.specialAnimation];
  assert(Math.max(...frames)<sprite.size[0]/sprite.size[1],pet.id+" must never show an adjacent or out-of-range frame");
  assert.equal(profile.frameSize*4,sprite.size[1]);
  for(let t=0;t<12000;t+=73)assert(frames.includes(petPose(profile,t).frame));
}
const beatrix=spriteMotion(pets.find(e=>e.id==="pet-beatrix").sprites[0]);
assert.equal(petPose(beatrix,0).frame,0);
assert.equal(petPose(beatrix,350).frame,1);
assert.equal(petPose(beatrix,550).frame,2);
const foes=reference.filter(e=>e.category==="foes"&&e.sprites?.length);
assert.equal(foes.length,44);
for(const foe of foes)for(const sprite of foe.sprites) {
  const profile=spriteMotion(sprite,foe.gameId||foe.id);
  assert(profile,foe.id+" needs its actual motion profile");
  const motion=previewMotion(profile);
  assert(motion.duration>0&&motion.body[0].at===0&&motion.body.at(-1).at===1);
  assert.deepEqual(sampleMotion(motion.body,0),{x:0,y:0,angle:0,squash:0});
  assert.deepEqual(sampleMotion(motion.body,1),{x:0,y:0,angle:0,squash:0});
}
assert.equal(previewMotion({kind:"creature",scale:2}).body[2].x,4.8);
const chop=previewMotion({kind:"humanoid",skill:"attack"});
assert(previewMotion({kind:"humanoid",weaponType:"melee"},-1),"The first animation-frame timestamp can precede the start time");
assert.equal(chop.duration,750);
assert.equal(sampleMotion(chop.body,.62).x,2.5);
assert.equal(weaponMotionType("shortbow"),"ranged");
assert.equal(weaponMotionType("staff"),"magic");
assert.equal(weaponMotionType("bronzeScimitar"),"melee");
assert(previewMotion({kind:"humanoid",weaponType:"ranged"}).hidesHeldHand);
for(const id of ["corrupted-druid","druid-warrior"]) {
  const page=reference.find(e=>e.id===id);
  assert.equal(page.artwork,"https://microscape.cc/play/assets/havendellDruid-D8AmmHDl.png");
  assert.equal(page.sprites.length,2);
}
const events={},attributes=new Map();let started=0,stopped=0,reduced=true,keyboard=false;
window.matchMedia=()=>({get matches(){return reduced;}});
const target={isConnected:true,addEventListener:(name,fn)=>events[name]=fn,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),matches:()=>keyboard,contains:()=>false};
const dispose=attachHoverPreview(target,()=>{started++;return()=>stopped++;});
events.pointerenter();assert.equal(started,0,"Respect reduced motion");
reduced=false;events.pointerenter();assert.equal(started,1);
events.pointerenter();assert.equal(started,1,"Never duplicate a running preview");
events.pointerleave();assert.equal(stopped,1);assert(!attributes.has("data-preview-active"));
events.focusin();assert.equal(started,1,"Mouse focus alone must not keep a hover preview running");
keyboard=true;events.focusin();assert.equal(started,2,"Support keyboard previews");
stopSpritePreviews();assert.equal(stopped,2,"Stop on page navigation or visibility changes");
dispose();
console.log("Passed: 36 pet strips and frame bounds, 44 foes including alternate forms, game timing and equipment motion, repaired druid icons, reduced motion, keyboard access and preview cleanup.");
