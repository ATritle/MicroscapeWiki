import fs from "node:fs/promises";
import {createHash} from "node:crypto";
const [dataFile, clientFile, sourceFile] = process.argv.slice(2);
if (!sourceFile) throw Error("Pass the extracted public game JSON, client JS, and source metadata JSON.");
const game = JSON.parse(await fs.readFile(dataFile, "utf8"));
const source = JSON.parse(await fs.readFile(sourceFile, "utf8"));
const reference = JSON.parse(await fs.readFile(new URL("../docs/player-reference.json", import.meta.url), "utf8"));
const pages = JSON.parse(await fs.readFile(new URL("../docs/reference.json", import.meta.url), "utf8"));
const title = value => String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const pageFor = (category, id) => pages.find(page => page.category === category && (page.gameId === id || page.id === id));
const finite = record => Object.fromEntries(Object.entries(record || {}).filter(([, n]) => Number.isFinite(n)));
const items = Object.fromEntries(Object.entries({...game.items, ...game.appearance}).map(([id, item]) => [id, {
  name:pageFor("items", id)?.title || title(item.name || id), slot:item.slot,
  bonuses:finite(item.bonuses), tags:Array.isArray(item.tags) ? item.tags.filter(t => typeof t === "string") : [],
  icon:reference.items[id]?.icon, wikiId:reference.items[id]?.wikiId,
  requirements:finite(item.requirements)
}]));
const locationsFor = entity => Object.entries(game.locations).filter(([, location]) => location.entities?.[entity])
  .map(([id, location]) => ({name:location.name, wikiId:pageFor("locations", id)?.id}));
const combat = Object.entries(game.activities).filter(([key, a]) => key.startsWith("combat/") && a.mob);
const foes = Object.fromEntries(Object.entries(game.foes).map(([id, foe]) => [id, {
  id, name:title(foe.name) + (foe.safeSpot ? " (Safe spot)" : ""), ...finite(foe.stats),
  speed:foe.speed, safeSpot:foe.safeSpot === true, requiredItem:foe.requiredItem,
  special:!!(foe.dungeonBoss || foe.serverSpawned || foe.persistent || foe.scale),
  wikiId:reference.foes[id]?.wikiId || pageFor("foes", id)?.id,
  locations:locationsFor(id)
}]));
const skillOrder = ["attack", "strength", "defense", "evilMagic", "ranged", "piety", "woodcutting", "firemaking", "fishing", "cooking", "mining", "smithing", "crafting", "goodMagic", "fletching", "herblaw"];
const skills = reference.skills.map(skill => ({...skill, combat:game.skills[skill.id]?.isCombatSkill === true}))
  .sort((a, b) => skillOrder.indexOf(a.id) - skillOrder.indexOf(b.id));
const activities = [];
for (const skill of skills) {
  if (skill.combat) {
    for (const [, activity] of combat) if (foes[activity.mob]) activities.push({id:skill.id + "/" + activity.id,
      skill:skill.id, name:foes[activity.mob].name, mob:activity.mob, level:0});
    continue;
  }
  for (const activity of game.skills[skill.id]?.activities || []) {
    if (activity.softDeleted || activity.deprecated || !Number.isFinite(activity.exp) || activity.exp <= 0 || !Number.isFinite(activity.duration)) continue;
    const inputs = Object.entries(finite(activity.inventoryChanges)).filter(([, amount]) => amount < 0).map(([id, amount]) => ({id, amount:-amount}));
    const outputs = Object.entries(finite(activity.inventoryChanges)).filter(([id, amount]) => amount >= 1 && !id.startsWith("pet")).sort((a, b) => b[1] - a[1]);
    const iconId = activity.icon || (activity.useInputAsIcon ? inputs[0]?.id : outputs[0]?.[0]);
    activities.push({id:skill.id + "/" + activity.id, skill:skill.id, name:title(activity.name),
      level:activity.level || 1, duration:activity.duration, exp:activity.exp,
      inputs, icon:items[iconId]?.icon || skill.icon, wikiId:items[iconId]?.wikiId,
      entity:game.entities[activity.entity]?.name || game.npcs[activity.entity]?.name || title(activity.entity),
      locations:locationsFor(activity.entity), otherExp:finite(activity.otherExp),
      requiresAbility:typeof activity.requiresAbility === "string" ? activity.requiresAbility : undefined,
      requiresMembership:activity.requiresMembership === true, singleExecution:activity.singleExecution === true});
  }
}
const spells = Object.values(game.spells).filter(spell => spell.type === "offensive" && Number.isFinite(spell.maxHit)).map(spell => ({
  id:spell.id, name:game.abilities[spell.id]?.name || title(spell.id), maxHit:spell.maxHit,
  level:game.abilities[spell.id]?.requiredSkills?.evilMagic || 1,
  onItem:game.abilities[spell.id]?.onItem, runes:finite(spell.runes)
})).sort((a, b) => a.level - b.level);
const catalog = {schemaVersion:1, source:{url:source.url, checkedAt:source.checkedAt,
  sha256:createHash("sha256").update(await fs.readFile(clientFile)).digest("hex")},
  mechanics:{tickSeconds:2, skillingPreparationTicks:4}, skills, activities, foes, spells, items};
await fs.writeFile(new URL("../docs/activity-catalog.json", import.meta.url), JSON.stringify(catalog, null, 2) + "\n");
console.log(JSON.stringify({activities:activities.length, skills:skills.length, foes:Object.keys(foes).length, spells:spells.length, source:source.url}));
