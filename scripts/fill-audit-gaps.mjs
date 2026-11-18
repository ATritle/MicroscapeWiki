import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseline = process.argv[2];
if (!baseline) throw Error("Pass the archived beta snapshot directory.");
const read = async file => JSON.parse(await fs.readFile(file, "utf8"));
const data = await read(path.join(baseline, "game-data.json"));
const manifest = await read(path.join(baseline, "manifest.json"));
const referencePath = path.join(root, "docs/reference.json");
const reference = await read(referencePath);
const byId = new Map(reference.map(entry => [entry.id, entry]));
const date = "2026-11-18";
const evidenceUrl = "./assets/game-data/beta-2026-11-18.json";
const stableGameUrl = "https://microscape.cc/play/";
const normalize = value => String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const title = value => String(value || "").replace(/(^|\s)\S/g, character => character.toUpperCase());
const itemTitle = id => title(data.items[id]?.name || id.replace(/([a-z])([A-Z])/g, "$1 $2"));
const skillTitle = id => data.skills[id]?.name || title(id);
const facts = (entry, additions) => {
  const rows = new Map(entry.facts || []);
  for (const row of additions) rows.set(...row);
  entry.facts = [...rows];
};
function section(entry, heading, text) {
  entry.sections ||= [];
  const at = entry.sections.findIndex(([name]) => name === heading);
  if (at >= 0) entry.sections[at] = [heading, text];
  else entry.sections.push([heading, text]);
}
function table(entry, addition) {
  entry.tables ||= [];
  const at = entry.tables.findIndex(table => table.title === addition.title);
  if (at >= 0) entry.tables[at] = addition;
  else entry.tables.push(addition);
}
function related(entry, ...ids) {
  entry.related = [...new Set([...(entry.related || []), ...ids])].filter(id => byId.has(id));
}
function checked(entry) {
  entry.statsDate = date;
  entry.sources ||= [
    [entry.sourceTitle + " on Miraheze", entry.sourceUrl],
    ...(entry.revision ? [["Miraheze source revision " + entry.revision, "https://microscape.miraheze.org/wiki/Special:PermanentLink/" + entry.revision]] : []),
    ["Miraheze contributor history", entry.sourceUrl + "?action=history"],
    ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"]
  ];
  if (!entry.sources.some(([, url]) => url === evidenceUrl)) entry.sources.unshift(["Archived beta game data · November 18, 2026", evidenceUrl]);
  if (!entry.sources.some(([, url]) => url === stableGameUrl)) entry.sources.push(["Microscape official game", stableGameUrl]);
}
const named = id => byId.get(id) || (() => {throw Error("Missing page: " + id);})();
const stationTitle = id => data.entities[id]?.name || title(id.replaceAll("-", " "));
const materials = activity => Object.entries(activity.inventoryChanges || {})
  .filter(([, amount]) => typeof amount === "number" && amount < 0)
  .map(([id, amount]) => Math.abs(amount) + " × " + itemTitle(id)).join(", ") || "None";
const outputs = activity => Object.entries(activity.inventoryChanges || {})
  .filter(([id, amount]) => !id.startsWith("pet") && typeof amount === "number" && amount > 0)
  .map(([id, amount]) => amount + " × " + itemTitle(id)).join(", ");
const active = activity => !activity.softDeleted;
const activities = Object.entries(data.activities);
const sourceIds = [
  "candy-cane", "dross", "elpers-hat", "food-scraps", "headless-arrows", "iron-armor",
  "iron-arrows", "iron-arrowtips", "iron-axe", "iron-dagger", "iron-med-helm", "iron-scimitar",
  "iron-sq-shield", "lava-rod", "magic-carp", "santa-hat", "soft-clay", "uncut-dragonstone",
  "unstrung-diamond-amulet", "unstrung-dragonstone-amulet", "unstrung-emerald-amulet",
  "unstrung-evil-amulet", "unstrung-gold-amulet", "unstrung-holy-amulet", "unstrung-ruby-amulet",
  "unstrung-sapphire-amulet"
];
const itemResolutions = [];
for (const id of sourceIds) {
  const entry = named(id);
  const item = Object.values(data.items).find(item => normalize(item.name) === normalize(entry.title) || normalize(item.id) === normalize(entry.id));
  if (!item) throw Error("Could not identify game item " + id);
  const producers = activities.filter(([, activity]) => typeof activity.inventoryChanges?.[item.id] === "number" && activity.inventoryChanges[item.id] > 0);
  const historical = producers.filter(([, activity]) => activity.softDeleted);
  const listed = producers.filter(([, activity]) => active(activity));
  if (listed.length) {
    entry.availabilityStatus = listed.every(([, activity]) => activity.deprecated) ? "deprecated-recipe" : "documented-source";
    entry.summary = "Assemble " + entry.title + " at a Chillin’ Spot. The beta client still lists these recipes but marks them deprecated, with a warning that they will be removed in a future patch.";
    section(entry, "How to obtain", "The listed Fletching recipes remain visible in the checked beta client. Bring the ingredients below to a Chillin’ Spot, such as Falcrest Bank or O’Rock West. A deprecated recipe is scheduled for removal; it is not the same as a disabled recipe.");
    table(entry, {title:"Acquisition recipes", columns:["Recipe", "Requirements", "Station", "Materials", "Output", "Base XP", "Base time", "Status"],
      rows:listed.map(([key, activity]) => [title(activity.name), skillTitle(key.split("/")[0]) + " " + activity.level,
        stationTitle(activity.entity), materials(activity), outputs(activity), String(activity.exp || 0),
        ((activity.duration + 4) * 2) + "s", activity.deprecated ? "Deprecated; still listed" : "Listed"])});
    related(entry, "fletching", "falcrest-bank", "orock-west", "headless-arrows", "iron-arrowtips");
  } else if (historical.length) {
    entry.availabilityStatus = "disabled-recipe";
    entry.summary = "Legacy crafting material or equipment. Its production recipe is disabled in the November 18 beta client.";
    section(entry, "Availability", "The checked beta build keeps this item but disables its production recipe. The historical recipe below is not a current crafting instruction. No active production recipe, enemy drop or shop source was found in this build.");
    table(entry, {title:"Historical recipe · disabled", description:"Retained for reference. Action duration excludes preparation; this recipe cannot be selected from the current activity list.",
      columns:["Recipe", "Former skill requirement", "Station", "Materials", "Output", "Base XP", "Action duration", "Status"],
      rows:historical.map(([key, activity]) => [title(activity.name), skillTitle(key.split("/")[0]) + " " + activity.level,
        stationTitle(activity.entity), materials(activity), outputs(activity), String(activity.exp || 0),
        (activity.duration * 2) + "s (" + activity.duration + " ticks)", "Disabled in checked beta client"])});
    if (id === "soft-clay") {
      section(entry, "Current alternative", "Use Clay and a Water Bucket directly at a Pottery Wheel to shape an Unfired Pot or Unfired Pie Dish. Mixing a separate Soft Clay item is no longer part of these active recipes.");
      related(entry, "clay", "water-bucket", "unfired-pot", "unfired-pie-dish", "crafting");
    } else if (id.startsWith("unstrung-")) {
      section(entry, "Current alternative", "Current amulet recipes produce the corresponding wearable amulet directly and include a Ball of Wool among their materials. The disabled unstrung intermediate is not required by those active recipes.");
      if (["unstrung-holy-amulet", "unstrung-evil-amulet"].includes(id)) {
        const holy = id === "unstrung-holy-amulet";
        section(entry, "Current alternative", "The current Crafting recipe combines a Silver Bar and a Ball of Wool to make a Dim " + (holy ? "Holy" : "Evil") + " Amulet directly. It can then be " + (holy ? "blessed" : "cursed") + " through the corresponding NPC activity. The disabled unstrung intermediate is not needed for that direct recipe.");
        related(entry, holy ? "dim-holy-amulet" : "dim-evil-amulet", "silver-bar");
      }
      related(entry, id.replace("unstrung-", ""), "ball-of-wool", "crafting");
    } else if (id === "headless-arrows") {
      section(entry, "Current alternative", "Current arrow recipes generally combine Arrow Shafts, Feathers and the matching Arrowtips in one action. Some older recipes that consume existing Headless Arrows remain marked deprecated.");
      related(entry, "arrow-shafts", "feather", "fletching", "iron-arrows");
    } else related(entry, "smithing");
    const consumers = activities.filter(([, activity]) => active(activity)
      && typeof activity.inventoryChanges?.[item.id] === "number" && activity.inventoryChanges[item.id] < 0);
    if (consumers.length) {
      section(entry, "Using existing stock", "A disabled production recipe does not remove existing copies of an item. The client still lists the following uses for copies you already have. Rows marked deprecated carry a future-removal warning; rows marked listed are not disabled in this build.");
      table(entry, {title:"Recipes using existing stock", columns:["Activity", "Requirements", "Station", "Materials", "Output", "Base XP", "Status"],
        rows:consumers.map(([key, activity]) => [title(activity.name), skillTitle(key.split("/")[0]) + " " + activity.level,
          stationTitle(activity.entity), materials(activity), outputs(activity), String(activity.exp || 0),
          activity.deprecated ? "Deprecated; still listed" : "Listed in checked beta client"])});
    }
  } else {
    entry.availabilityStatus = "unconfirmed-current-source";
    entry.summary = "Defined in the November 18 beta client, but its current acquisition method is not established by the public game data.";
    section(entry, "Availability", "The item has a definition in the checked beta client, but no active production recipe, enemy drop or shop listing was found. This does not establish that it is obtainable now, nor does it confirm a particular event or seasonal source. The listed stats describe the item definition; availability still needs in-game or developer confirmation.");
  }
  if (id === "dross") {
    entry.availabilityStatus = "documented-source";
    entry.summary = "A Smithing by-product created by Drosswork and consumed by Quench.";
    entry.sections = [];
    section(entry, "How to obtain", "Use Drosswork while forging items. The Bronze Hammer grants this ability; its chance to create a piece of Dross scales from 1% to 10% with ability level.");
    section(entry, "What it is used for", "Quench, granted by the Mithril Hammer, consumes Dross when forging steel-tier or better items to build Quenched stacks. Those stacks reduce the coal needed when smelting the corresponding bar.");
    related(entry, "drosswork", "quench", "bronze-hammer", "mithril-hammer", "smithing");
  }
  if (id === "magic-carp") {
    entry.availabilityStatus = "documented-source";
    entry.summary = "An alternate Fishing catch produced by Angler’s Luck.";
    entry.sections = [];
    section(entry, "How to obtain", "Equip the Old Rod to use Angler’s Luck, or equip the permanently unlocked ability. While fishing, the ability can replace the normal catch with a Magic Carp. Its listed power range is 1–10%, so this is an ability-dependent chance rather than a fixed rare-catch rate.");
    related(entry, "anglers-luck", "old-rod", "fishing");
  }
  if (id === "food-scraps") {
    entry.availabilityStatus = "documented-source";
    entry.summary = "Leftovers from eating food that occupy loot-bag space.";
    entry.sections = [];
    section(entry, "How to obtain", "The item definition identifies Food Scraps as leftovers from eating. They can appear as a by-product of food consumption rather than a standard crafting output or enemy drop. The public client does not specify a per-meal probability or which foods produce them.");
    section(entry, "Managing the leftovers", "Food Scraps occupy space in the loot bag. Check Activity & Loot when managing supplies; do not plan a farming rate from an unspecified chance.");
    related(entry, "food", "combat", "activity-queue");
  }
  facts(entry, [["Availability", {
    "documented-source":"Mechanic documented in checked beta client",
    "deprecated-recipe":"Deprecated recipe; still listed in checked beta client",
    "disabled-recipe":"Historical production recipe disabled in checked beta client",
    "unconfirmed-current-source":"No verified current acquisition source"
  }[entry.availabilityStatus]]]);
  checked(entry);
  itemResolutions.push({id, status:entry.availabilityStatus});
}

const steel = named("steel-pickaxe");
steel.availabilityStatus = "absent-current-build";
steel.summary = "Archived equipment entry. No Steel Pickaxe definition is present in the November 18 beta client.";
section(steel, "Current build status", "No Steel Pickaxe item definition, production recipe, enemy drop or shop listing was found in the checked client. The community stats below are historical and should not be used as verified current equipment values. A missing client definition does not establish what will return in 1.0.");
section(steel, "Current pickaxe reference", "The game currently calls the usable tool Pickaxe. This wiki’s Bronze Pickaxe page lists its checked requirements, Mining bonus, Smithing recipe and Fire Dwarf drops.");
facts(steel, [["Availability", "Absent from checked beta client; archived stats only"]]);
related(steel, "bronze-pickaxe", "iron-pickaxe", "mining");
checked(steel);

for (const entry of reference.filter(entry => entry.category === "foes")) {
  const foe = data.foes[entry.id] || Object.values(data.foes).find(foe => normalize(foe.name) === normalize(entry.title));
  if (!foe || !Number.isFinite(foe.speed)) throw Error("Missing foe timing for " + entry.id);
  facts(entry, [["Base attack delay", foe.speed + " ticks"], ["Base interval at standard tick rate", (foe.speed * 2) + " seconds"]]);
  section(entry, "Attack timing", "The beta definition sets a base attack delay of " + foe.speed + " ticks. At the client’s standard 2-second tick rate, that corresponds to " + (foe.speed * 2) + " seconds. This is a base definition, not a guarantee for every hit: boss phases, multi-hit attacks, interruptions and ability effects can change the observed timing."
    + (foe.safeSpot ? " This is a safe encounter; the stored base delay does not mean the foe can hit you from its safe spot." : ""));
  related(entry, "ticks");
  checked(entry);
}

const nonCombat = named("non-combat");
nonCombat.summary = "Gather resources, process materials and cast utility spells using Microscape’s eleven non-combat skills.";
section(nonCombat, "How non-combat training works", "Choose a location and station, select an activity, and bring the required supplies. Activities list a skill level, XP per completed action and materials consumed. Some exchanges award no XP. Training uses Energy and the loot bag, so check your supplies and storage before leaving an activity running.");
section(nonCombat, "Levels, equipment and bonus actions", "Base skill levels unlock activities and equipment. Temporary stat boosts and equipment bonuses can improve an activity’s effective skill level and double-up chance; they do not replace the base-level requirement for equipping an item. Unlocks, stations and supplies are listed on each skill page.");
table(nonCombat, {title:"Non-combat skills", columns:["Skill", "What you do"], rows:[
  ["Woodcutting", "Gather logs from trees"], ["Mining", "Gather ore and mineral resources"],
  ["Fishing", "Catch fish and frogs"], ["Cooking", "Prepare and cook food"], ["Firemaking", "Burn logs and process fire-related materials"],
  ["Smithing", "Smelt bars and forge equipment"], ["Crafting", "Make pottery, glass, clothing and jewelry"],
  ["Fletching", "Make bows and ammunition"], ["Herblaw", "Brew potions"], ["Good Magic", "Cast utility spells"],
  ["Piety", "Bury remains and perform offerings or exchanges"]
]});
related(nonCombat, "cooking", "crafting", "double-up-bonus", "ticks", "energy", "activity-queue");
checked(nonCombat);

const doubleUp = named("double-up-bonus");
doubleUp.summary = "Each effective skill level above an activity’s required level adds one percentage point of double-up chance, capped at 100%.";
section(doubleUp, "Chance calculation", "For an XP-awarding skilling action, the client calculates: chance (%) = min(100, max(0, effective skill level − activity required level)). Effective skill level includes your base level, temporary stat boosts and the relevant equipped skill bonuses.");
section(doubleUp, "Worked example", "A level-30 miner with +3 Mining equipment doing a level-15 activity has an effective level of 33 and an 18% double-up chance. A level-15 miner with no bonus on the same activity has 0%. The chance cannot exceed 100%.");
section(doubleUp, "What a double-up does", "A successful double-up quickly repeats the eligible action. The October 21 rules count it as a regular action, so account for the repeated action’s materials and outputs. Abilities such as Iron Gut, Sweet Tooth and Sour Stomach can interact with double-ups. Actions with no positive base XP show no ordinary double-up chance in the checked client.");
related(doubleUp, "mining", "equipment-bonuses", "iron-gut", "sweet-tooth", "sour-stomach", "ticks");
checked(doubleUp);

const ticks = named("ticks");
ticks.summary = "The standard game tick is 2 seconds; activity definitions and attack delays are expressed in ticks.";
facts(ticks, [["Standard tick", "2 seconds"], ["Standard skilling preparation", "4 ticks (8 seconds)"]]);
section(ticks, "Reading activity times", "The client displays standard skilling time as (action duration + 4 preparation ticks) × 2 seconds. For example, a five-tick action is 10 seconds of action plus 8 seconds of preparation, or 18 seconds in the activity details.");
section(ticks, "What the estimate includes", "Preparation is not the same as the action itself. Travel, banking, combat interruptions and special activity behavior can add time. A page labelled action duration excludes preparation; a base-time column includes it unless stated otherwise.");
section(ticks, "Combat and bonus actions", "A foe’s base delay is also stored in ticks. Boss phases and multi-hit behavior can produce a different visible pattern. Double-up actions repeat quickly and should not be timed as a second full preparation cycle.");
table(ticks, {title:"Standard timing examples", columns:["Action duration", "Preparation", "Displayed base time"], rows:[
  ["2 ticks = 4 seconds", "4 ticks = 8 seconds", "12 seconds"],
  ["5 ticks = 10 seconds", "4 ticks = 8 seconds", "18 seconds"],
  ["9 ticks = 18 seconds", "4 ticks = 8 seconds", "26 seconds"]
]});
related(ticks, "double-up-bonus", "smithing", "mining", "combat");
checked(ticks);

const stationLocations = entity => Object.entries(data.locations).filter(([, location]) => location.entities?.[entity]).map(([, location]) => location.name);
const smelting = named("smelting");
smelting.summary = "Use a Furnace to turn ore and coal into bars for Smithing.";
section(smelting, "Where and how to smelt", "Select a Furnace, also called a Smelter in the wiki’s activity tables. Bring the ores and coal listed for the chosen bar and meet its Smithing level. Furnace locations in the checked client include " + stationLocations("furnace").join(", ") + ".");
section(smelting, "Coal-saving abilities", "Coal Keeper can reduce the coal consumed while smelting or superheating. Quench uses Dross while forging steel or better to build coal-saving stacks. These effects change actual consumption; the table shows each recipe’s unmodified inputs.");
table(smelting, {title:"Current smelting recipes", description:"Base time includes the standard four preparation ticks at two seconds per tick. Bonus drops and ability effects are not included in the guaranteed output.",
  columns:["Bar", "Smithing level", "Materials", "Guaranteed output", "Base XP", "Base time"],
  rows:data.skills.smithing.activities.filter(activity => activity.entity === "furnace" && active(activity))
    .map(activity => [title(activity.name), String(activity.level), materials(activity), outputs(activity),
      String(activity.exp), ((activity.duration + 4) * 2) + "s"])});
related(smelting, "smithing", "coal-keeper", "quench", "dross", "ticks");
checked(smelting);

for (const [id, entity, summary] of [
  ["kiln", "kiln", "Fire pottery and make Molten Glass at a Kiln in Solace Glasshouse or Viking Village."],
  ["glassblowing-pipe", "glassblowing-pipe", "Shape Molten Glass into Vials and Unpowered Orbs at Solace Glasshouse."]
]) {
  const entry = named(id);
  entry.summary = summary;
  entry.tables = [];
  section(entry, "Where to find it", "The checked game maps list this station at " + stationLocations(entity).join(", ") + ". Select the station and choose a Crafting activity.");
  section(entry, "Supplies and timing", "Bring the ingredients below and meet the Crafting level. Base time includes the standard preparation period. The station is a location interaction, not an inventory tool that must be bought or equipped.");
  table(entry, {title:"Current crafting activities", columns:["Activity", "Crafting level", "Materials", "Output", "Base XP", "Base time"],
    rows:data.skills.crafting.activities.filter(activity => activity.entity === entity && active(activity))
      .map(activity => [title(activity.name), String(activity.level), materials(activity), outputs(activity),
        String(activity.exp), ((activity.duration + 4) * 2) + "s"])});
  related(entry, "crafting", "solace-glasshouse", "molten-glass", "ticks");
  checked(entry);
}

const level = named("level");
level.summary = "Skill levels come from XP; player combat level combines base offensive levels with Defense.";
section(level, "Skill levels and experience", "Each skill has its own XP total. The client derives a base level from that total using the shared XP curve. Skill pages list level-gated activities and equipment, and the XP calculator can estimate progress between levels. Ability levels and permanent unlocks are separate from a player’s combat level.");
section(level, "Player combat-level formula", "Combat level = floor((max((Attack + Strength) / 2, Evil Magic, Ranged) + Defense) / 2). Use base skill levels. Temporary boosts and equipment bonuses are not added by this formula. The strongest offensive route is combined with Defense; raising an unused weaker offensive route may not immediately increase combat level.");
section(level, "Foe combat levels", "Foes use a separate formula: max(1, floor((((Attack + Strength) / 2) + Defense) / 2)). Their HP, Evil Magic and Ranged stats are still relevant in combat but are not inputs to this displayed foe-level calculation.");
related(level, "defense", "experience", "combat");
checked(level);

const crystal = named("time-crystal");
crystal.summary = "Each Time Crystal held adds one hour to maximum Energy capacity.";
facts(crystal, [["Base Energy capacity", "24 hours"], ["Capacity per Time Crystal", "+1 hour"],
  ["Maximum Time Crystals held", "48"], ["Maximum capacity from this formula", "72 hours"]]);
section(crystal, "Capacity versus available Energy", "The capacity formula is 24 + Time Crystals held, measured in hours. A crystal increases the storage ceiling; it does not itself award one hour of playable Energy. Earn Energy through supported streams and participation, and check the in-game Energy display for the current amount.");
section(crystal, "Where to exchange them", "Visit Brother Alep or Brother Pela at Falcrest Reach Temple. These exchanges have Piety 1 requirements in the checked beta client. Converting in both directions loses Audience Favor: three favors buy one crystal, but breaking that crystal returns only one favor.");
table(crystal, {title:"Time Crystal exchanges", columns:["NPC", "Activity", "Give", "Receive"], rows:[
  ["Brother Alep", "A prayer for time", "3 × Audience Favor", "1 × Time Crystal"],
  ["Brother Pela", "Time for a favor", "1 × Time Crystal", "1 × Audience Favor"]
]});
section(crystal, "Beta carryover", "The November 18 item definition marks Time Crystal as carrying to release. Treat that as the recorded beta rule and check the official launch announcements for any final changes.");
related(crystal, "energy", "audience-favor", "item-audience-favor", "falcrest-reach-temple", "piety");
checked(crystal);

const vendor = named("vendor");
vendor.summary = "An item’s vendor value is its base sell price; shop purchase prices use that shop’s markup.";
section(vendor, "Selling to a shop", "For items with a numeric sell value, the shop UI uses the item’s base value as its sell price. Do not assume an item with no listed sell value can be sold. Inventory and loot-bag management are separate from creating a player-to-player Bazaar offer.");
section(vendor, "Buying from a shop", "Purchase price = floor(item base value × shop multiplier). A shop-specific multiplier for an item overrides the shop’s general multiplier. For example, the General Store uses a 3× markup, while Merric’s Magic Shop applies a special 14× markup to Staff.");
section(vendor, "Choosing between shops and the Bazaar", "Shop stock is a fixed list. The Bazaar is player trading, so its offers can differ from vendor value. The client warns when an order is at or below vendor value and may hide it from the normal listing; use the current in-game price and fees when comparing options.");
table(vendor, {title:"Shop purchase markups", columns:["Shop", "General multiplier", "Item-specific exceptions"], rows:Object.values(data.shops).map(shop => [
  shop.name, shop.globalBuyMultiplier + "×",
  Object.entries(shop.specificItemBuyMultipliers || {}).map(([id, amount]) => itemTitle(id) + ": " + amount + "×").join("; ") || "None listed"
])});
related(vendor, "bazaar", "al-sahra", "merrics-magic-shop", "orock-west", "manor-kitchen");
checked(vendor);

const water = named("water-bucket");
water.artwork = "./assets/water-bucket.png";
section(water, "Artwork", "The current beta asset set has no separate Water Bucket image. This page shows the original Bucket icon as a visual reference; the filled bucket remains a distinct crafting material.");
related(water, "bucket");
checked(water);
await fs.copyFile(path.join(baseline, "files/bucket-B28_wI5Z.png"), path.join(root, "docs/assets/water-bucket.png"));

// Publish factual definitions as a durable citation, not the full executable client.
function factual(value) {
  if (Array.isArray(value)) return value.map(factual);
  if (!value || typeof value !== "object") return value;
  if ("$expression" in value) return {unresolvedExpression:true};
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["description", "lore", "flavorText", "disclaimer", "customActionText", "customPrepText", "actionText", "prepText"].includes(key))
    .map(([key, value]) => [key, factual(value)]));
}
await fs.mkdir(path.join(root, "docs/assets/game-data"), {recursive:true});
await fs.writeFile(path.join(root, "docs/assets/game-data/beta-2026-11-18.json"), JSON.stringify({
  capturedAt:manifest.capturedAt, officialGame:stableGameUrl,
  clientBuild:"index-CUJKZV-W.js",
  clientSha256:manifest.files.find(file => file.file.endsWith("index-CUJKZV-W.js")).sha256,
  scope:"Factual public beta definitions. Unresolved expressions are marked; private server code is not included.",
  mechanics:{
    standardTickMilliseconds:2000, standardSkillingPreparationTicks:4,
    doubleUpPercent:"min(100, max(0, base skill level + temporary boosts + equipment bonus - required activity level))",
    playerCombatLevel:"floor((max((Attack + Strength) / 2, Evil Magic, Ranged) + Defense) / 2)",
    foeCombatLevel:"max(1, floor((((Attack + Strength) / 2) + Defense) / 2))",
    energyCapacityHours:"24 + Time Crystals held",
    shopPurchasePrice:"floor(item base value * (item-specific multiplier or shop general multiplier))"
  },
  definitions:factual(data)
}, null, 2) + "\n");

let sourceLinksFixed = 0;
for (const entry of reference) {
  for (const source of entry.sources || []) {
    if (/^https:\/\/microscape\.cc\/play\/assets\/index-[^/]+\.js$/.test(source[1])) {
      source[0] = "Archived beta game data · November 18, 2026";
      source[1] = evidenceUrl;
      sourceLinksFixed++;
    }
  }
  if (entry.sources?.some(([, url]) => url === evidenceUrl)
      && !entry.sources.some(([, url]) => url === stableGameUrl)) {
    entry.sources.push(["Microscape official game", stableGameUrl]);
  }
  if (entry.sources) entry.sources = [...new Map(entry.sources.map(source => [source[1], source])).values()];
}
await fs.writeFile(referencePath, JSON.stringify(reference, null, 2) + "\n");
console.log(JSON.stringify({itemResolutions, foesUpdated:reference.filter(entry => entry.category === "foes").length,
  mechanicsUpdated:9, sourceLinksReplacedThisRun:sourceLinksFixed,
  referenceEntriesCitingArchive:reference.filter(entry => entry.sources?.some(([, url]) => url === evidenceUrl)).length,
  evidenceUrl}, null, 2));
