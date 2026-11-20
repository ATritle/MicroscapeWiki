import assert from "node:assert/strict";
import {meleeHitChance, meleeMaxHit, equipmentBonuses, expectedSwings, compareTraining} from "../docs/combat-comparison.js";

const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
const bonuses = equipmentBonuses({weapon:"sword", body:"armor", ring:"cursed", hair:"unknown"}, {
  sword:{bonuses:{attack:2,strength:2,attackCooldown:3}}, armor:{bonuses:{defense:6}}, cursed:{bonuses:{defense:-1}}
});
assert.deepEqual(bonuses, {attack:2,strength:2,attackCooldown:3,defense:5});
const [mouse, chicken] = compareTraining({attack:4,strength:1,defense:1}, bonuses);
near(mouse.hitChance, .65);
near(mouse.dodgeChance, .45);
near(chicken.hitChance, mouse.hitChance);
near(chicken.dodgeChance, mouse.dodgeChance);
assert.equal(mouse.maxHit, 1);
assert.equal(mouse.enemyMaxHit, 0);
assert.equal(chicken.enemyMaxHit, 1);
near(mouse.cycleSeconds, 6 + 12 / .65);
near(chicken.damagePerHour / mouse.damagePerHour, 1.089041095890411);
assert.equal(mouse.xpPerHour, null, "Do not invent an XP multiplier");

const noPrep = compareTraining({attack:4,strength:1,defense:1}, bonuses, {prepSeconds:0});
near(noPrep[0].damagePerHour, noPrep[1].damagePerHour);
const enteredXp = compareTraining({attack:4,strength:1,defense:1}, bonuses, {xpPerDamage:4});
near(enteredXp[1].xpPerHour, enteredXp[1].damagePerHour * 4);

near(expectedSwings(2, 2, 1), 1.5); // 50% one-shot; otherwise exactly one more swing.
near(expectedSwings(3, 2, 1), 2.25);
near(expectedSwings(2, 2, .5), 3); // Missing doubles the expected time.
near(expectedSwings(2, 2, 1, true), 2.25); // Zero damage also consumes a swing.
near(expectedSwings(2, 100, 1), 1.01); // Overkill must end the fight immediately.
assert.equal(expectedSwings(2, 0, .65), Infinity);
assert.equal(expectedSwings(0, 0, .65), 0);
assert.equal(meleeMaxHit(3, 2), 1);
assert.equal(meleeMaxHit(4, 2), 2);
near(meleeHitChance(999, 999, 1), .95);
near(meleeHitChance(1, -999, 999), .1);
// Attack bonuses are applied AFTER the soft floor, not folded into base level.
near(meleeHitChance(1, 20, 100), .3);
for (const prepSeconds of [-1, NaN, Infinity, 3601]) assert.throws(() => compareTraining({}, {}, {prepSeconds}));
for (const xpPerDamage of [-1, 0, NaN, Infinity]) assert.throws(() => compareTraining({}, {}, {xpPerDamage}));
assert.equal(compareTraining({}, {})[0].attackSeconds, 8, "Client's unarmed fallback is four 2-second ticks");
console.log("Passed: client accuracy and damage caps, negative gear bonuses, exact expected swings including overkill/zero rolls/misses, timing sensitivity, optional XP conversion, and invalid inputs.");
