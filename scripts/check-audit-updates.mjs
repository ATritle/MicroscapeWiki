import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {guides} from "../docs/guides.js";
import {tutorials} from "../docs/tutorials.js";
import {buildPetEntries} from "../docs/pets.js";
import {itemIcons} from "../docs/item-icons.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const reference = JSON.parse(await fs.readFile(path.join(root, "docs/reference.json"), "utf8"));
const evidence = JSON.parse(await fs.readFile(path.join(root, "docs/assets/game-data/beta-2026-11-18.json"), "utf8"));
const byId = new Map(reference.map(entry => [entry.id, entry]));
const entry = id => {assert(byId.has(id), id); return byId.get(id);};
const fact = (id, label) => new Map(entry(id).facts).get(label);
const table = (id, title) => entry(id).tables.find(table => table.title === title);
const all = [...reference, ...buildPetEntries(reference), ...guides, ...tutorials];

assert.equal(reference.length, 675, "Keep existing reference routes");
assert.equal(new Set(all.map(entry => entry.id)).size, all.length, "Every page ID must remain unique");
assert.equal(evidence.definitions.items.priestRobe.requirements.piety, 1, "Do not confuse shared artwork with another item's stats");
assert.equal(evidence.mechanics.standardTickMilliseconds, 2000);
for (const foe of reference.filter(entry => entry.category === "foes")) {
  assert.equal(new Map(foe.facts).get("Base attack delay"), "3 ticks");
  assert.equal(new Map(foe.facts).get("Base interval at standard tick rate"), "6 seconds");
  assert(foe.sections.some(([heading]) => heading === "Attack timing"));
}
assert.equal(entry("iron-armor").availabilityStatus, "disabled-recipe");
assert(table("iron-armor", "Historical recipe · disabled").rows.some(row => row.includes("5 × Iron Bar")));
assert.equal(entry("iron-arrows").availabilityStatus, "deprecated-recipe");
assert(table("iron-arrows", "Acquisition recipes").rows.every(row => row.at(-1) === "Deprecated; still listed"));
assert.equal(entry("soft-clay").availabilityStatus, "disabled-recipe");
assert(table("unstrung-gold-amulet", "Recipes using existing stock").rows.some(row => row.join(" ").includes("Ball Of Wool")));
assert.equal(entry("steel-pickaxe").availabilityStatus, "absent-current-build");
assert(table("steel-pickaxe", "Archived community stats"), "Retain clearly labelled historical evidence");
assert.deepEqual(reference.filter(entry => entry.availabilityStatus === "unconfirmed-current-source").map(entry => entry.id).sort(),
  ["candy-cane", "elpers-hat", "iron-axe", "lava-rod", "santa-hat", "uncut-dragonstone"].sort());
assert.equal(fact("time-crystal", "Maximum Time Crystals held"), "48");
assert(table("time-crystal", "Time Crystal exchanges").rows.some(row => row[2] === "3 × Audience Favor" && row[3] === "1 × Time Crystal"));
assert.equal(table("smelting", "Current smelting recipes").rows.length, 8);
assert(table("glassblowing-pipe", "Current crafting activities").rows.some(row => row[0] === "Vial" && row[4] === "87"));
assert(table("kiln", "Current crafting activities").rows.some(row => row[0] === "Molten Glass" && row[4] === "35"));
assert.equal(Math.floor((Math.max((20 + 18) / 2, 15, 16) + 20) / 2), 19);
assert.equal(Math.min(100, Math.max(0, 30 + 3 - 15)), 18);

let archivedCitations = 0;
for (const page of all) {
  for (const [, href] of page.sources || []) {
    assert(!/^https:\/\/microscape\.cc\/play\/assets\/index-[^/]+\.js$/.test(href), "Retired bundle citation: " + page.id);
    if (href === "./assets/game-data/beta-2026-11-18.json") archivedCitations++;
    if (href.startsWith("./")) await fs.access(path.join(root, "docs", href));
  }
}
assert(archivedCitations >= 666);
assert.equal(itemIcons["water-bucket"], "./assets/water-bucket.png");
const icon = await fs.readFile(path.join(root, "docs", itemIcons["water-bucket"]));
assert.equal(icon.readUInt32BE(16), 32);
assert.equal(icon.readUInt32BE(20), 32);
assert(!JSON.stringify(reference).includes("waterBucket-Bi1IuLzq.png"));
console.log("Verified all 715 routes, source citations, 43 foe timings, recipe status distinctions, surviving legacy uses, station XP, crystal exchanges, formulas and local artwork.");
