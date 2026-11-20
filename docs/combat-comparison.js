// Public client checked 2026-11-20: index-BsSHHy-E.js (SX, AX, jX).
// Encounter stats also match assets/game-data/release-2026-11-19.json.
// Damage rolls and encounter timing run on the server. Rates below are a model.
// One-damage Attack hits awarding 4 XP were observed in game on 2026-11-20.
// Other combat styles use this same baseline pending independent observation.
export const COMBAT_XP_RATES = {
  attack:{xpPerDamage:4, status:"observed"},
  strength:{xpPerDamage:4, status:"unverified"},
  defense:{xpPerDamage:4, status:"unverified"},
  ranged:{xpPerDamage:4, status:"unverified"},
  evilMagic:{xpPerDamage:4, status:"unverified"}
};
export const BASE_COMBAT_XP_PER_DAMAGE = COMBAT_XP_RATES.attack.xpPerDamage;
export const trainingFoes = [
  {id:"mouse", name:"Mouse", hp:2, attack:1, strength:-4, defense:1},
  {id:"chicken", name:"Chicken", hp:3, attack:1, strength:5, defense:1}
];

export function meleeHitChance(attack, attackBonus, targetDefense) {
  return combatHitChance(attack, attackBonus, targetDefense, "melee");
}
export function combatHitChance(level, bonus, targetDefense, style = "melee") {
  const {base, floor} = {melee:{base:60,floor:10}, ranged:{base:65,floor:10}, magic:{base:85,floor:60}}[style];
  const raw = base + level - targetDefense;
  const adjusted = raw >= floor ? raw : Math.max(10, floor + .25 * (raw - floor));
  return Math.min(95, Math.max(10, adjusted + bonus)) / 100;
}
export function meleeMaxHit(strength, strengthBonus = 0) {
  return Math.max(0, 1 + Math.floor((strength + strengthBonus) / 6));
}
export function equipmentBonuses(equipment, items) {
  const bonuses = {};
  for (const id of Object.values(equipment)) for (const [stat, amount] of Object.entries(items[id]?.bonuses || {})) {
    if (Number.isFinite(amount)) bonuses[stat] = (bonuses[stat] || 0) + amount;
  }
  return bonuses;
}
// Expected swings to remove HP, including misses, zero rolls and overkill.
// Solve the self-loop at each remaining-HP state instead of sampling fights.
export function expectedSwings(hp, maxHit, hitChance, includeZero = false) {
  if (hp <= 0) return 0;
  if (maxHit <= 0 || hitChance <= 0) return Infinity;
  const expected = [0], range = maxHit + (includeZero ? 1 : 0);
  for (let remaining = 1; remaining <= hp; remaining++) {
    let sum = 0;
    for (let damage = 1; damage < Math.min(remaining, maxHit + 1); damage++) sum += expected[remaining - damage];
    expected[remaining] = (range / hitChance + sum) / maxHit;
  }
  return expected[hp];
}
export function compareTraining(levels, bonuses, {prepSeconds = 6, includeZero = false, xpPerDamage = BASE_COMBAT_XP_PER_DAMAGE} = {}) {
  return compareCombat(levels, bonuses, trainingFoes, {prepSeconds, includeZero, xpPerDamage});
}
export function compareCombat(levels, bonuses, foes, {prepSeconds = 6, includeZero = false, xpPerDamage, skill = "attack", spellMaxHit = null, attackSeconds:interval = null} = {}) {
  const baseline = COMBAT_XP_RATES[skill];
  if (!baseline) throw Error("Choose a supported combat skill.");
  if (xpPerDamage === undefined) xpPerDamage = baseline.xpPerDamage;
  const xpRateStatus = xpPerDamage === baseline.xpPerDamage ? baseline.status : "custom";
  if (!Number.isFinite(prepSeconds) || prepSeconds < 0 || prepSeconds > 3600) throw Error("Use a delay from 0 to 3,600 seconds.");
  if (!Number.isFinite(xpPerDamage) || xpPerDamage <= 0 || xpPerDamage > 1e6) throw Error("The combat XP baseline must be a positive finite value.");
  if (interval !== null && (!Number.isFinite(interval) || interval <= 0 || interval > 3600)) throw Error("Use an attack interval greater than zero and no more than 3,600 seconds.");
  const attackSeconds = interval ?? Math.max(1, bonuses.attackCooldown ?? 4) * 2;
  const style = skill === "ranged" ? "ranged" : skill === "evilMagic" ? "magic" : "melee";
  const offensiveSkill = style === "melee" ? "attack" : skill;
  if (style === "magic" && (!Number.isFinite(spellMaxHit) || spellMaxHit <= 0)) throw Error("Choose a spell to model Evil Magic damage.");
  const maxHit = style === "magic" ? spellMaxHit : meleeMaxHit(levels[style === "ranged" ? "ranged" : "strength"] || 1, bonuses[style === "ranged" ? "ranged" : "strength"] || 0);
  return foes.map(foe => {
    const hitChance = combatHitChance(levels[offensiveSkill] || 1, bonuses[offensiveSkill] || 0, foe.defense, style);
    const dodgeChance = 1 - meleeHitChance(foe.attack, 0, (levels.defense || 1) + (bonuses.defense || 0));
    const swings = expectedSwings(foe.hp, maxHit, hitChance, includeZero);
    const cycleSeconds = prepSeconds + swings * attackSeconds;
    const damagePerHour = Number.isFinite(cycleSeconds) ? 3600 * foe.hp / cycleSeconds : 0;
    return {...foe, hitChance, dodgeChance, maxHit, enemyMaxHit:meleeMaxHit(foe.strength),
      attackSeconds, swings, cycleSeconds, damagePerHour, xpPerHour:damagePerHour * xpPerDamage, xpPerDamage, xpRateStatus, xpSkill:skill};
  });
}

