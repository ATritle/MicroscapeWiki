import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {abilityPower,potionBoost,resolveLoadoutEffects,effectCombatRow,compareWithEffects} from "../docs/loadout-effects.js";
import {modelLoadout} from "../docs/loadout-comparison.js";
import {compareCombat} from "../docs/combat-comparison.js";
const catalog=JSON.parse(await fs.readFile(new URL("../docs/activity-catalog.json",import.meta.url),"utf8"));
const reference=JSON.parse(await fs.readFile(new URL("../docs/loadout-reference.json",import.meta.url),"utf8"));
const levels=Object.fromEntries(catalog.skills.map(s=>[s.id,50]));
const near=(a,b)=>assert(Math.abs(a-b)<1e-7*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const ability=id=>reference.abilities.find(a=>a.id===id);
assert.equal(Object.keys(reference.potions).length,32);
assert.equal(abilityPower(ability("atAnyCost"),1),1);assert.equal(abilityPower(ability("atAnyCost"),20),100);
assert.equal(abilityPower(ability("steadyAim"),5.5),38);assert.throws(()=>abilityPower(ability("steadyAim"),0));
assert.throws(()=>abilityPower(ability("steadyAim"),NaN));
assert.equal(potionBoost(reference.potions.attackPotion,50),5);
assert.equal(potionBoost(reference.potions.superAttackPotion,50),10);
assert.equal(potionBoost(reference.potions.superAttackPotion,99),17);
const active=(id,more={})=>({id,enabled:true,learned:true,level:ability(id).permanentUnlockLevel,...more});
function effects(equipment,settings={},skill="attack",spell){return resolveLoadoutEffects({equipment,levels,items:catalog.items,reference,settings,skill,spell});}
assert.equal(effects({potion1:"attackPotion",potion2:"superAttackPotion",potion3:"attackPotion"}).potions.attack,10,"Same-skill potions must not silently stack");
assert.equal(effects({potion1:"superAttackPotion"},{potionOverrides:{attack:12}}).potions.attack,12);
assert.deepEqual(effects({potion1:"attackPotion"},{potionsActive:false}).potions,{});
const prayer=effects({weapon:"bronzeScimitar"},{abilities:[active("clarityOfThought"),active("burstOfStrength"),active("thickSkin")]});
assert.equal(prayer.bonuses.attack,12);assert.equal(prayer.bonuses.strength,12);assert.equal(prayer.bonuses.defense,10);
const duplicate=effects({amulet:"amuletOfPower"},{abilities:[active("enlightened"),active("enlightened")]});
assert.equal(duplicate.powers.enlightened,1);
assert(effects({}, {abilities:[{id:"enlightened",level:1}]}).omitted.some(s=>s.includes("not equipped")));
const input={equipment:{weapon:"bronzeScimitar"},levels,catalog,foe:{...catalog.foes.chicken,defense:30},effectsReference:reference};
const plain=modelLoadout(input),pot=modelLoadout({...input,equipment:{weapon:"bronzeScimitar",potion1:"attackPotion",potion2:"strengthPotion"}});
assert(pot.row.hitChance>plain.row.hitChance);assert(pot.row.maxHit>plain.row.maxHit);assert(pot.row.xpPerHour>plain.row.xpPerHour);
const armor=modelLoadout({...input,equipment:{weapon:"bronzeScimitar",potion1:"defensePotion"}});
near(armor.row.xpPerHour,plain.row.xpPerHour);assert(armor.row.incomingDamagePerHour<plain.row.incomingDamagePerHour);
const forbiddenUnlock=modelLoadout({...input,levels:{attack:1},equipment:{weapon:"steelScimitar",potion1:"superAttackPotion"},effectSettings:{abilities:[active("clarityOfThought")]}});
assert(forbiddenUnlock.reason);assert.equal(forbiddenUnlock.row,null,"Buffs must not unlock gear above the trained level");

// With all effects absent, the extended finite-HP model must agree with the
// independent existing expected-swings recurrence for every supported style.
for(const skill of ["attack","strength","defense","ranged","evilMagic"])for(const foe of [catalog.foes.mouse,catalog.foes.chicken,catalog.foes["giant-rat"],catalog.foes["moss-giant"]])for(const includeZero of [false,true]){
  const bonuses={attack:3,strength:4,defense:5,ranged:6,evilMagic:7,attackCooldown:3};
  const row=effectCombatRow({levels,bonuses,foe,skill,spell:catalog.spells[0],powers:{},settings:{},prepSeconds:6,includeZero,items:catalog.items,equipment:{}});
  const old=compareCombat(levels,bonuses,[foe],{skill,spellMaxHit:catalog.spells[0].maxHit,prepSeconds:6,includeZero})[0];
  near(row.swings,old.swings);near(row.cycleSeconds,old.cycleSeconds);near(row.xpPerHour,old.xpPerHour);
}
const testLevels={...levels,strength:6},foe={id:"dummy",name:"Dummy",hp:2,attack:1,strength:6,defense:1,speed:3};
const direct=(powers={},changes={})=>effectCombatRow({levels:testLevels,bonuses:{attackCooldown:3},foe,skill:"attack",powers,settings:{},items:catalog.items,equipment:{},...changes});
const normal=direct(),enlightened=direct({enlightened:1});
near(normal.xpPerHour*normal.cycleSeconds/3600,8);
near(enlightened.xpPerHour*enlightened.cycleSeconds/3600,13,"Damage-weighted max-hit XP must account for clipped overkill");
near(enlightened.cycleSeconds,normal.cycleSeconds);
const ranged=direct({}, {skill:"ranged"}),anyCost=direct({atAnyCost:1},{skill:"ranged"});
near(anyCost.xpPerHour/ranged.xpPerHour,1.1);
const steady=direct({steadyAim:.75},{skill:"ranged"});assert(steady.damagePerHour>ranged.damagePerHour);
const sniper=direct({sniper:.5},{skill:"ranged"});assert(sniper.cycleSeconds<=ranged.cycleSeconds);
const rapid=direct({rapidFire:.2},{skill:"ranged",foe:{...foe,hp:50}});
const rapidSlow=direct({rapidFire:.2},{skill:"ranged",foe:{...foe,hp:50},settings:{quickSeconds:6}});
const rangedLong=direct({}, {skill:"ranged",foe:{...foe,hp:50}});
assert(rapid.cycleSeconds<rangedLong.cycleSeconds);near(rapidSlow.cycleSeconds,rangedLong.cycleSeconds);
const magic=direct({}, {skill:"evilMagic",spell:catalog.spells[0]});
const twist=direct({darkTwist:1},{skill:"evilMagic",spell:catalog.spells[0]});assert(twist.cycleSeconds<magic.cycleSeconds);
const focusUnknown=direct({focus:1},{skill:"evilMagic",spell:catalog.spells[1]});assert(Number.isNaN(focusUnknown.xpPerHour));
const focused=direct({focus:1},{skill:"evilMagic",spell:catalog.spells[1],settings:{focusSeconds:8}});assert(Number.isFinite(focused.xpPerHour));
const cursed=direct({cursedStrength:1},{equipment:{weapon:"black2hSword"},foe:{...foe,hp:50}});assert.equal(cursed.maxHit,4);assert.equal(cursed.baseAttackSeconds,12);
const guarded=direct({paralyzeMonster:1,stoneskin:.7});assert(guarded.incomingDamagePerHour<normal.incomingDamagePerHour);near(guarded.xpPerHour,normal.xpPerHour);
const wall=direct({shieldWall:.7},{equipment:{shield:"steelSqShield"}});assert(Number.isNaN(wall.incomingDamagePerHour));
assert(Number.isFinite(direct({shieldWall:.7},{equipment:{shield:"steelSqShield"},settings:{maxHp:10}}).incomingDamagePerHour));
const buff=effects({}, {abilities:[active("berserk",{uptime:25})]});near(buff.bonuses.strength,3);near(buff.bonuses.attack,-1);assert.equal(buff.scenarios.length,2);
const copied=structuredClone(input);compareWithEffects({...input,skill:"attack",reference,settings:{abilities:[active("burstOfStrength")]}});assert.deepEqual(input,copied,"Effect evaluation must not change the profile or equipment");
assert.throws(()=>direct({}, {prepSeconds:NaN}));assert.throws(()=>direct({}, {settings:{quickSeconds:0}}));
console.log("Passed: 32 potions, power scaling, stat/prayer stacking, override assumptions, gear level gates, 40 baseline-model equivalence cases, exact max-hit XP reward example, ranged procs, quick timing, spell effects, cursed damage/delay, defensive mitigation, buff scenarios and immutable inputs.");
