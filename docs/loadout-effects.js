import {equipmentBonuses,combatHitChance,meleeMaxHit,COMBAT_XP_RATES} from "./combat-comparison.js?v=vendors-20261120";

export function abilityPower(ability,level=1){
  if(!Number.isFinite(level)||level<1||level>ability.permanentUnlockLevel)throw Error("Enter an ability level from 1 to "+ability.permanentUnlockLevel+" for "+ability.name+".");
  return ability.type==="scaling"?Math.round(1+(level-1)/(ability.permanentUnlockLevel-1)*(ability.maxPower-1)):100;
}
export function potionBoost(potion,baseLevel){return potion.type==="super"?Math.floor(baseLevel*.15)+3:5;}
const prayerStats={clarityOfThought:{attack:10},burstOfStrength:{strength:10},thickSkin:{defense:10}};
export const temporaryBuffs={berserk:{strength:12,attack:-4},crusader:{strength:100},empoweredMind:{}};
const direct=new Set([...Object.keys(prayerStats),...Object.keys(temporaryBuffs),"atAnyCost","enlightened","cursedStrength","focus","steadyAim","gracedAim","sniper","darkTwist","forbiddenMagic","rapidFire","sacredStrike","bloodscent","quickHex","spellEcho","pyreshellWard","softLanding","shellPockets","gildedPockets","rapidHeal","paralyzeMonster","dreadAura","rubberBody","parry","stoneskin","shieldWall"]);
const supplyOnly=new Set(["chaosConduit","conserveAir","conserveFire","penance","protectorOfProgryn","sacredMarch","sanguineHarvest","serpentsReturn","soulHarvest","telegrabLoot","toughArrows","deathsBargain"]);
export function effectSupport(ability){
  if(temporaryBuffs[ability.id])return "Set measured buff uptime to include its temporary bonus.";
  if(direct.has(ability.id))return "Included when enabled and applicable to this fight.";
  if(["gathering","processing","evilMagic"].includes(ability.category)||["bleedingEdge","swiftSands","patronage"].includes(ability.id))return "No direct combat XP modifier in this model.";
  if(supplyOnly.has(ability.id))return "Rune, supply or ally effect; supplies and group combat are not simulated.";
  return "Combat-state effect not simulated; shown as an omitted effect.";
}
const add=(target,source)=>{for(const [key,value] of Object.entries(source))target[key]=(target[key]||0)+value;};
export function resolveLoadoutEffects({equipment,levels,items,reference,settings={},skill,spell}){
  const gear=equipmentBonuses(equipment,items),potions={},prayers={},powers={},notes=[],omitted=[],applied=[],buffs=[];
  const byId=new Map((reference?.abilities||[]).map(a=>[a.id,a]));
  if(settings.potionsActive!==false){
    const selected=[...new Set([equipment.potion1,equipment.potion2,equipment.potion3].filter(Boolean))];
    const grouped=new Map();for(const id of selected){const def=reference?.potions?.[id];if(!def)continue;if(!grouped.has(def.skill))grouped.set(def.skill,[]);grouped.get(def.skill).push(id);potions[def.skill]=Math.max(potions[def.skill]||0,potionBoost(def,levels[def.skill]||1));}
    for(const [key,ids] of grouped){
      const override=settings.potionOverrides?.[key];if(override!==undefined&&override!==null){if(!Number.isFinite(override)||override<0||override>1000)throw Error("Use a potion boost from 0 to 1,000.");potions[key]=override;}
      if(ids.length>1)notes.push("Same-skill potions use the strongest boost, not a sum; override it with the in-game buff total if needed.");
      if(ids.some(id=>reference.potions[id].type==="super")&&override==null)notes.push("Super potion: floor(15% of trained base level) + 3. Rounding and same-skill stacking are assumptions; enter the in-game boost to override them.");
      applied.push(ids.map(id=>items[id]?.name||id).join(" / ")+": +"+potions[key]+" "+key);
    }
  }
  const selections=new Map();for(const input of settings.abilities||[]){if(input.enabled===false)continue;const old=selections.get(input.id);if(!old||(input.level||1)>(old.level||1))selections.set(input.id,input);}
  for(const [id,input] of selections){
    const a=byId.get(id);if(!a)throw Error("An ability in this plan is unavailable.");
    if(!input.learned&&!Object.values(equipment).includes(a.onItem)){omitted.push(a.name+": source item is not equipped");continue;}
    if(Object.entries(a.requirements).some(([key,n])=>(levels[key]||1)<n)){omitted.push(a.name+": trained skill requirements are not met");continue;}
    const level=input.learned?a.permanentUnlockLevel:(input.level??1),power=abilityPower(a,level)/100;
    powers[id]=power;
    if(direct.has(id)&&!prayerStats[id]&&!temporaryBuffs[id])applied.push(a.name+(a.type==="scaling"?": "+Math.round(power*100)+"% power / chance":""));
    if(prayerStats[id]){add(prayers,prayerStats[id]);applied.push(a.name+": +10 "+Object.keys(prayerStats[id])[0]);}
    if(temporaryBuffs[id]){
      const relevant=id==="empoweredMind"?skill==="evilMagic"&&["windStrike","fireStrike"].includes(spell?.id):["attack","strength","defense"].includes(skill);
      if(relevant){const uptime=input.uptime??0;if(!Number.isFinite(uptime)||uptime<0||uptime>100)throw Error("Use a buff uptime from 0 to 100%.");
        if(uptime>0){buffs.push({id,uptime:uptime/100,stats:temporaryBuffs[id]});applied.push(a.name+": "+uptime+"% assumed combat uptime");}
        else omitted.push(a.name+": temporary proc needs a measured uptime; currently excluded");
      }
    }else if(!direct.has(id)&&!supplyOnly.has(id)&&!['gathering','processing','evilMagic'].includes(a.category)&&!["bleedingEdge","swiftSands","patronage"].includes(id))omitted.push(a.name+": "+effectSupport(a));
  }
  const base={...gear};add(base,potions);add(base,prayers);
  let scenarios=[{weight:1,bonuses:{...base},empowered:false}];
  for(const buff of buffs)scenarios=scenarios.flatMap(s=>{
    const on={weight:s.weight*buff.uptime,bonuses:{...s.bonuses},empowered:s.empowered||buff.id==="empoweredMind"};add(on.bonuses,buff.stats);
    return [{...s,weight:s.weight*(1-buff.uptime)},on].filter(state=>state.weight>0);
  });
  const bonuses={};for(const state of scenarios)for(const [key,value] of Object.entries(state.bonuses))bonuses[key]=(bonuses[key]||0)+value*state.weight;
  const special={};if(powers.pyreshellWard)special.dragonBreathReduction=powers.pyreshellWard*100;if(powers.softLanding)special.fallDamageReduction=75;
  if(powers.shellPockets||powers.gildedPockets)special.extraLootSpaces=(powers.shellPockets?2:0)+(powers.gildedPockets?3:0);
  if(powers.rapidHeal)special.regenerationMultiplier=3;
  if(Object.keys(prayers).length||powers.rapidHeal)special.spiritRuneSaving=Math.min(100,((levels.piety||1)+(bonuses.piety||0))/99*50);
  if(Object.keys(potions).length)notes.push("Potion projection assumes the selected boosts remain active; expiration and supplies are not simulated.");
  if(Object.keys(prayers).length||powers.rapidHeal||powers.paralyzeMonster)notes.push("Prayer effects assume the required spirit/sacred runes and learned ability slots are available.");
  if(buffs.length)notes.push("Temporary buffs use your entered time shares, not an automatically predicted proc uptime. Multiple buff uptimes are treated independently.");
  return {gear,potions,prayers,bonuses,powers,scenarios,special,notes:[...new Set(notes)],omitted,applied};
}

function outcomes({maxHit,chance,skill,powers,full,includeZero,cursed,focus,xpStack}){
  const result=[];const ranged=skill==="ranged",magic=skill==="evilMagic";
  const push=(damage,p,maxRoll=false)=>{if(p>0)result.push({damage,p,maxRoll});};
  if(ranged&&powers.gracedAim){push(2,(1-chance)*powers.gracedAim,false);push(0,(1-chance)*(1-powers.gracedAim));}else push(0,1-chance);
  const first=includeZero?0:1,range=maxHit-first+1;
  if(maxHit<1){return [{damage:0,p:1,maxRoll:false}];}
  for(let roll=first;roll<=maxHit;roll++){
    let branches=[{damage:roll,p:chance/range,maxRoll:roll===maxHit}];
    if(ranged&&full&&powers.sniper)branches=branches.flatMap(b=>[{...b,p:b.p*(1-powers.sniper)},{damage:maxHit,p:b.p*powers.sniper,maxRoll:true}]);
    if(magic&&powers.darkTwist)branches=branches.flatMap(b=>b.damage===1?[{...b,p:b.p*(1-powers.darkTwist)},{damage:maxHit,p:b.p*powers.darkTwist,maxRoll:true}]:[b]);
    if(ranged&&powers.steadyAim)branches=branches.flatMap(b=>[{...b,p:b.p*(1-powers.steadyAim)},{...b,damage:b.damage+1,p:b.p*powers.steadyAim}]);
    if(magic&&powers.forbiddenMagic)branches=branches.flatMap(b=>[{...b,p:b.p*(1-powers.forbiddenMagic)},{...b,damage:Math.floor(b.damage*1.5),p:b.p*powers.forbiddenMagic}]);
    for(const branch of branches){if(cursed)branch.damage*=2;if(focus)branch.damage=Math.floor(branch.damage*1.2);push(branch.damage,branch.p,branch.maxRoll);}
  }
  const any=ranged?(powers.atAnyCost||0)*.1:0;
  return result.map(o=>({...o,xpMultiplier:xpStack==="multiply"?(1+(o.maxRoll?(powers.enlightened||0):0))*(1+any):1+(o.maxRoll?(powers.enlightened||0):0)+any}));
}
// Exact finite-HP recurrence under the displayed uniform-roll / proc assumptions.
// Each transition carries its XP reward, so max-hit XP and overkill stay coupled.
export function effectCombatRow({levels,bonuses,foe,skill,spell,powers,settings={},empowered=false,prepSeconds=6,includeZero=false,items,equipment}){
  if(!Number.isFinite(prepSeconds)||prepSeconds<0||prepSeconds>3600)throw Error("Use a delay from 0 to 3,600 seconds.");
  if(settings.maxHp!=null&&(!Number.isFinite(settings.maxHp)||settings.maxHp<1||settings.maxHp>1000000))throw Error("Enter valid maximum HP.");
  const melee=["attack","strength","defense"].includes(skill),ranged=skill==="ranged",magic=skill==="evilMagic";
  const weapon=items[equipment.weapon],twoHanded=weapon?.tags?.includes("2h"),cursed=melee&&twoHanded&&Boolean(powers.cursedStrength),focus=magic&&Boolean(powers.focus);
  const quick=settings.quickSeconds??2;if(!Number.isFinite(quick)||quick<=0||quick>3600)throw Error("Use a bonus attack delay greater than 0 and at most 3,600 seconds.");
  let interval=Math.max(1,bonuses.attackCooldown??4)*2*(cursed?2:1),unknownTiming=false;
  if(focus){if(settings.focusSeconds==null)unknownTiming=true;else {if(!Number.isFinite(settings.focusSeconds)||settings.focusSeconds<=0||settings.focusSeconds>3600)throw Error("Enter the in-game Focus attack interval in seconds.");interval=settings.focusSeconds;}}
  const maxBreaks=Math.min(2,settings.spellMaxBreaks??2),breaks=magic?Math.min(maxBreaks,settings.spellBreaks??0):0;
  const primaryMax=magic?(spell.maxHit+breaks+(empowered?2:0)):meleeMaxHit(levels[ranged?"ranged":"strength"]||1,bonuses[ranged?"ranged":"strength"]||0);
  const hitChance=combatHitChance(levels[melee?"attack":skill]||1,bonuses[melee?"attack":skill]||0,foe.defense,melee?"melee":ranged?"ranged":"magic");
  const H=foe.hp,times=new Float64Array(H+1),xp=new Float64Array(H+1),attacks=new Float64Array(H+1);
  const xpPerDamage=COMBAT_XP_RATES[skill].xpPerDamage;
  const normal=outcomes({maxHit:primaryMax,chance:hitChance,skill,powers,full:false,includeZero,cursed,focus,xpStack:settings.xpStack});
  const full=outcomes({maxHit:primaryMax,chance:hitChance,skill,powers,full:true,includeZero,cursed,focus,xpStack:settings.xpStack});
  const build=hp=>hp===H?full:normal;
  for(let hp=1;hp<=H;hp++){
    const sacred=melee&&weapon?.tags?.includes("progrite")&&foe.id.includes("demon")?(powers.sacredStrike||0):0;
    const scent=melee&&hp<H*.25?(powers.bloodscent||0):0;
    const counts=[{n:1,p:(1-sacred)*(1-scent)},{n:2,p:sacred*(1-scent)},{n:3,p:(1-sacred)*scent},{n:4,p:sacred*scent}].filter(c=>c.p>0);
    let same=0,time=0,reward=0,swings=0,futureT=0,futureX=0,futureA=0;
    for(const count of counts){
      let states=new Map([[hp,1]]);
      for(let step=0;step<count.n;step++){
        const next=new Map();for(const [remaining,prob] of states){if(remaining===0){next.set(0,(next.get(0)||0)+prob);continue;}
          time+=count.p*prob*(step===0?interval:quick);swings+=count.p*prob;
          for(const o of build(remaining)){
            const p=prob*o.p,left=Math.max(0,remaining-o.damage);next.set(left,(next.get(left)||0)+p);
            reward+=count.p*p*Math.min(remaining,o.damage)*xpPerDamage*(o.xpMultiplier??1);
            // Rapid Fire explicitly chains; Spell Echo changes the next cast's delay.
            if(left>0&&count.n===1){const rapid=ranged?(powers.rapidFire||0):0,echo=magic&&o.damage>=primaryMax&&o.damage>0?(powers.spellEcho||0):0;
              const q=1-(1-rapid)*(1-echo);time-=count.p*p*q*(interval-quick);}
          }
        }states=next;
      }
      for(const [remaining,p] of states){const prob=p*count.p;if(remaining===hp)same+=prob;else {futureT+=prob*times[remaining];futureX+=prob*xp[remaining];futureA+=prob*attacks[remaining];}}
    }
    const denominator=1-same;
    times[hp]=denominator>1e-12?(time+futureT)/denominator:Infinity;
    xp[hp]=denominator>1e-12?(reward+futureX)/denominator:0;
    attacks[hp]=denominator>1e-12?(swings+futureA)/denominator:Infinity;
  }
  const firstQuick=magic?(powers.quickHex||0):0;
  const fightSeconds=Math.max(0,times[H]-firstQuick*(interval-quick)),cycle=prepSeconds+fightSeconds;
  const dodgeChance=1-combatHitChance(foe.attack,0,(levels.defense||1)+(bonuses.defense||0));
  let avoidance=1-(powers.rubberBody||0);if(powers.paralyzeMonster)avoidance*=.4;if(powers.dreadAura)avoidance*=1-powers.dreadAura;
  if(powers.parry&&(weapon?.tags?.includes("staff")||twoHanded&&melee))avoidance*=1-powers.parry;
  const enemyMaxHit=meleeMaxHit(foe.strength),from=includeZero?0:1;let damage=0;
  for(let n=from;n<=enemyMaxHit;n++){
    const skin=powers.stoneskin||0;let d=0;
    for(const branch of [{damage:n,p:1-skin},{damage:Math.max(0,n-1),p:skin}]){
      const cap=Math.floor((settings.maxHp||0)*.3),wall=powers.shieldWall&&equipment.shield&&settings.maxHp>0?powers.shieldWall:0;
      d+=branch.p*((1-wall)*branch.damage+wall*Math.min(branch.damage,cap));
    }
    damage+=d/Math.max(1,enemyMaxHit-from+1);
  }
  const incoming=foe.safeSpot?0:damage*(1-dodgeChance)*avoidance*3600/(Math.max(1,foe.speed||3)*2);
  return {...foe,hitChance,dodgeChance,maxHit:Math.max(...full.map(o=>o.damage)),minMaxHit:primaryMax,
    attackSeconds:unknownTiming?NaN:fightSeconds/attacks[H],baseAttackSeconds:interval,swings:attacks[H],cycleSeconds:unknownTiming?NaN:cycle,
    damagePerHour:unknownTiming?NaN:H*3600/cycle,xpPerHour:unknownTiming?NaN:xp[H]*3600/cycle,
    incomingDamagePerHour:powers.shieldWall&&equipment.shield&&!settings.maxHp?NaN:incoming,
    xpPerDamage,xpRateStatus:COMBAT_XP_RATES[skill].status,unknownTiming};
}
export function compareWithEffects({equipment,levels,catalog,foe,skill,spell,reference,settings={},prepSeconds=6,includeZero=false}){
  const effects=resolveLoadoutEffects({equipment,levels,items:catalog.items,reference,settings,skill,spell});
  const spellDefinition=reference?.abilities?.find(a=>a.id===spell?.id);
  if(!Number.isInteger(settings.spellBreaks??0)||(settings.spellBreaks??0)<0||(settings.spellBreaks??0)>Math.min(2,spellDefinition?.investmentTier??2))throw Error("Choose a supported spell limit-break count.");
  const rows=effects.scenarios.map(state=>({weight:state.weight,row:effectCombatRow({equipment,levels,bonuses:state.bonuses,foe,skill,spell,powers:effects.powers,settings:{...settings,spellMaxBreaks:Math.min(2,spellDefinition?.investmentTier??2)},empowered:state.empowered,prepSeconds,includeZero,items:catalog.items})}));
  const row={...rows[0].row};
  for(const key of ["hitChance","dodgeChance","attackSeconds","damagePerHour","xpPerHour","incomingDamagePerHour"])row[key]=rows.reduce((n,s)=>n+s.weight*s.row[key],0);
  row.cycleSeconds=3600/rows.reduce((n,s)=>n+s.weight*3600/s.row.cycleSeconds,0);
  row.maxHit=Math.max(...rows.map(s=>s.row.maxHit));
  if(rows.some(s=>s.row.unknownTiming))effects.omitted.push("Focus: damage is included, but its cast delay is unspecified. Enter the in-game Focus interval to calculate XP/hour.");
  if(effects.powers.shieldWall&&equipment.shield&&!settings.maxHp)effects.omitted.push("Shield Wall: enter maximum HP to calculate incoming melee damage.");
  if(effects.powers.cursedStrength&&skill==="ranged")effects.omitted.push("Cursed Strength: Ranged interaction is unverified and is excluded.");
  if(["rapidFire","sacredStrike","bloodscent","quickHex","spellEcho"].some(id=>effects.powers[id]))effects.notes.push("Bonus/quick attacks use the entered delay (default 2s). Exact server timing is unverified; change this assumption if measured.");
  if(effects.powers.enlightened&&effects.powers.atAnyCost)effects.notes.push("XP bonus stacking is "+(settings.xpStack==="multiply"?"multiplicative":"additive")+" for this plan; the server stacking order is unverified.");
  return {effects,row};
}
