import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {guides} from "../docs/guides.js";
import {tutorials} from "../docs/tutorials.js";
import {buildPetEntries} from "../docs/pets.js";
import {itemIcons, itemIconGroups} from "../docs/item-icons.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const baseline = args.includes("--game-data") ? option("--game-data") : null;
const out = path.resolve(root, args.includes("--out") ? option("--out") : "audits/" + new Date().toISOString().slice(0, 10));
const read = async file => JSON.parse(await fs.readFile(file, "utf8"));
const referenceBytes = await fs.readFile(path.join(root, "docs/reference.json"));
const reference = JSON.parse(referenceBytes);
const entries = [...reference, ...buildPetEntries(reference), ...guides, ...tutorials];
const byId = new Map(entries.map(entry => [entry.id, entry]));
const data = baseline ? await read(baseline) : {};
const manifest = baseline ? await read(path.join(path.dirname(baseline), "manifest.json")) : null;
const normalize = value => String(value || "").replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  .normalize("NFKD").replace(/[^a-z0-9]/gi, "").toLowerCase();
const wikiUrl = entry => "https://microscapewiki.com/#/entry/" + entry.id;
const basename = url => path.basename(new URL(url, "https://microscape.cc/play/assets/").pathname).replace(/-[A-Za-z0-9_-]{8}(?=\.)/, "").replace(/\.\w+$/, "");
const findings = [];
const notes = [];
const exclusions = [];
function flag(entry, priority, rule, issue, evidence, recommendation) {
  findings.push({priority, category:entry.category, id:entry.id, title:entry.title,
    url:wikiUrl(entry), rule, issue, evidence, recommendation});
}
const facts = entry => new Map(entry.facts || []);
const table = (entry, title) => entry.tables?.find(table => table.title === title);
const sectionsText = entry => JSON.stringify([entry.summary, entry.sections, entry.facts, entry.tables]);
const number = value => {
  const match = String(value ?? "").replaceAll(",", "").replaceAll("−", "-").match(/[-+]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};
function hasImage(entry) {
  return !!(entry.portrait?.src || entry.artwork || entry.abilityBottle || entry.mapImage?.src
    || itemIcons[entry.id] || itemIconGroups[entry.id]);
}

for (const entry of entries) {
  const f = facts(entry);
  if (!entry.summary && !entry.sections?.length && !entry.tables?.some(table => table.rows?.length) && !f.size) {
    flag(entry, "P1", "empty-page", "No explanatory content", "The entry has no summary, facts, sections or populated tables.",
      "Write the purpose, mechanics, requirements and relevant links.");
  } else if (entry.category === "reference" && !entry.sections?.length && !entry.tables?.some(table => table.rows?.length)) {
    flag(entry, "P2", "mechanics-stub", "Mechanics page is only a short summary",
      entry.summary || "Related links only.", "Add an explanation, current values or formula, examples, and relevant requirements.");
  }
  if (entry.category === "reference" && ["glassblowing-pipe", "kiln", "level"].includes(entry.id) && !entry.sections?.length) {
    flag(entry, "P2", "thin-reference", "Reference page has a small legacy table but no explanation",
      "No prose sections; table has " + (entry.tables?.reduce((count, table) => count + table.rows.length, 0) || 0) + " rows.",
      entry.id === "level" ? "Explain and verify the combat-level formula and its inputs."
        : "Add station locations, how to use it, materials, outputs and action times; verify the old XP table.");
  }
  if (entry.category === "items" && entry.summary?.includes("Acquisition details are unlisted")) {
    flag(entry, "P2", "missing-acquisition", "No acquisition method",
      "The page explicitly says acquisition details are unlisted and contains no acquisition table.",
      "Add the recipe, drop source, shop, quest or event source; otherwise mark it historical or unobtainable with evidence.");
  }
  if (entry.category === "items" && /unverified/i.test(entry.summary || "")) {
    flag(entry, "P2", "unverified-item", "Current stats and availability are unverified",
      entry.summary, "Retain the archival label; confirm the current item exists before treating its old stats as current.");
  }
  if (["unconfirmed-current-source", "absent-current-build"].includes(entry.availabilityStatus)) {
    flag(entry, "P2", "availability-needs-confirmation", "Availability explicitly documented; further confirmation needed",
      entry.summary, "Keep the documented limitation; confirm from the game or developer rather than inventing a current source.");
  }
  if (["skills", "items", "abilities", "foes", "locations", "pets"].includes(entry.category) && !hasImage(entry)) {
    flag(entry, "P3", "missing-art", "No icon, artwork or map is configured", "No image source in entry or icon registry.",
      "Add original game artwork if available.");
  }
  if (entry.category === "foes") {
    const missing = ["Combat level", "HP", "Attack", "Strength", "Defense", "Evil Magic", "Ranged"].filter(label => !f.has(label));
    if (missing.length) flag(entry, "P1", "foe-stats", "Missing core combat stats", missing.join(", "), "Add verified current combat values.");
    if (!table(entry, "Where to find it")?.rows?.length) flag(entry, "P1", "foe-location", "No populated encounter locations", "", "Add area and spawn information.");
    if (!table(entry, "Loot") && !table(entry, "Safe encounter drops") && !/no loot|no drops/i.test(entry.summary || "")) {
      flag(entry, "P1", "foe-loot", "No loot table or explicit no-drops explanation", "", "List item quantities and odds, or explain no drops.");
    }
    if (!entry.sprites?.length) flag(entry, "P3", "foe-sprite", "No full in-game sprite", "", "Add an original sprite.");
  }
  if (entry.category === "skills") {
    for (const title of ["Level unlocks", "Training locations", "Activities and supplies"]) {
      if (title === "Activities and supplies" && f.get("Skill type") === "Combat") continue;
      if (entry.sections?.some(([heading]) => heading === title)) continue;
      if (!table(entry, title)) flag(entry, "P1", "skill-table", "Missing " + title + " table", "", "Add the relevant current progression or training details.");
    }
  }
  if (entry.category === "abilities") {
    const missing = ["Granted by", "Gear requirements", "Ability skill requirements", "Effect type", "Permanent unlock"].filter(label => !f.has(label));
    if (missing.length) flag(entry, "P1", "ability-facts", "Missing ability requirements or unlock details", missing.join(", "), "Add the missing verified fields.");
    if (!entry.summary && !entry.sections?.length) flag(entry, "P1", "ability-effect", "No ability effect description", "", "Explain what the ability does.");
    if (!table(entry, "Limit breaks") && f.get("Copies to invest") !== "None") flag(entry, "P1", "ability-limits", "No limit-break table", "", "Add limits and investment costs, or explicitly state no limit breaks.");
    if (f.get("Effect type") === "Scaling" && !f.has("Power range") && !/chance.*level/i.test(entry.summary || "")) {
      flag(entry, "P1", "ability-scaling", "Scaling range is missing", "", "Add minimum and maximum power or explain the level-dependent formula.");
    }
  }
  if (entry.category === "locations") {
    if (!entry.sections?.some(([heading, text]) => heading === "How to get there" && text)) {
      flag(entry, "P1", "location-route", "No travel directions", "", "Explain the map pin or connecting passage and entry requirements.");
    }
    for (const title of ["Travel connections", "Enemies", "Shops and services", "Skilling spots"]) {
      if (title === "Travel connections" && /World Map.*Travel Here/.test(sectionsText(entry))) continue;
      const t = table(entry, title);
      if (!t || (!t.rows?.length && !t.empty)) flag(entry, "P2", "location-table", "Missing " + title + " information", "",
        "Add the relevant content or explicitly state that the location has none.");
    }
  }
  if (entry.category === "pets") {
    if (!entry.tables?.some(t => /odds/i.test(t.title) && t.rows?.length)) flag(entry, "P1", "pet-odds", "No populated drop/catch odds", "", "Add eligible tasks and odds.");
    if (!entry.sections?.some(([heading]) => /how to|get|find/i.test(heading))) flag(entry, "P1", "pet-method", "No acquisition instructions", "", "Explain maps, costs, requirements and eligible activities.");
    if (!entry.sprites?.length && entry.id !== "pet-blue-lobster") flag(entry, "P3", "pet-sprite", "No full in-game sprite", "", "Add the companion sprite.");
  }
  if (entry.category === "tutorials") {
    for (const foe of entry.spriteFoes || []) if (!byId.get(foe)?.sprites?.length) flag(entry, "P3", "tutorial-sprite", "Referenced foe has no sprite", foe, "Add the foe's full sprite.");
  }
}

const indexes = {};
for (const category of ["items", "abilities", "foes", "skills", "locations", "pets"]) {
  const index = new Map();
  const assets = new Map();
  for (const entry of entries.filter(entry => entry.category === category)) {
    for (const key of [entry.id, entry.title, entry.title.replace(/\brobes\b/gi, "robe"),
      ...(entry.aliases || []), ...((entry.facts || []).filter(([label]) => label === "In-game name").map(([, value]) => value))
    ]) index.set(normalize(key), entry);
    if (itemIcons[entry.id]) assets.set(normalize(basename(itemIcons[entry.id])), entry);
    if (entry.mapImage) assets.set(normalize(basename(entry.mapImage.src)), entry);
  }
  indexes[category] = {primary:index, assets};
}
// Shared artwork is only a fallback: amulets and robes can reuse another item's icon.
const find = (category, id, record) => indexes[category]?.primary.get(normalize(record.name))
  || indexes[category]?.primary.get(normalize(id))
  || (category === "locations" && indexes[category]?.assets.get(normalize(id)));
const bonusLabels = {
  autoEat:"Auto-eat HP threshold", attackCooldown:"Attack cooldown", eatRecovery:"Healing per serving",
  abilitySlots:"Extra ability slots", evilMagic:"Evil Magic", goodMagic:"Good Magic"
};
const gameCoverage = {};
const ignoredItemIds = new Set(["laserDagger", "trainingSword", "loot"]);
for (const [id, record] of Object.entries(data.items || {})) {
  if (ignoredItemIds.has(id)) {
    exclusions.push({type:"internal-game-record", id, reason:record.description || "Generic internal loot placeholder."});
    continue;
  }
  const entry = find("items", id, record) || (record.slot === "pet" && find("pets", id.replace(/^pet/, ""), record));
  if (!entry) {
    flag({id, title:record.name, category:"items"}, "P2", "missing-game-item",
      "No matching item or pet page", "Public game definition " + id, "Check aliases and add a player-facing page if appropriate.");
    continue;
  }
  if (entry.category !== "items") continue;
  const f = facts(entry);
  for (const [bonus, expected] of Object.entries(record.bonuses || {})) {
    if (typeof expected !== "number" || expected === 0) continue;
    const label = bonusLabels[bonus] || bonus[0].toUpperCase() + bonus.slice(1);
    const actual = f.get(label);
    if (actual === undefined) flag(entry, "P1", "missing-item-bonus", "Missing " + label + " stat",
      "Game definition: " + bonus + " = " + expected, "Add the verified bonus to the item's stats.");
    else if (number(actual) !== (bonus === "attackCooldown" ? expected * 2 : expected)) {
      flag(entry, "P1", "item-stat-mismatch", label + " differs from saved beta definition",
        "Wiki: " + actual + "; client: " + expected + (bonus === "attackCooldown" ? " ticks (2 seconds/tick)" : ""),
        "Verify the game value and update the page or document the reason for the difference.");
    }
  }
  if (record.slot && !f.has("Slot")) flag(entry, "P1", "missing-slot", "Equip slot is missing", record.slot, "Add the slot.");
  const requirementText = [...f].filter(([label]) => /equip requirement/i.test(label)).map(([, value]) => value).join(" ");
  if (record.slot && !requirementText) flag(entry, "P1", "missing-equip-requirements", "Equip requirements are missing", JSON.stringify(record.requirements || {}),
    "List the required skill levels, or explicitly state None.");
  for (const [skill, level] of Object.entries(record.requirements || {})) {
    if (typeof level === "number" && !normalize(requirementText).includes(normalize(skill) + level)) {
      flag(entry, "P1", "item-requirement-mismatch", "Missing or different " + skill + " requirement",
        "Client: " + skill + " " + level + "; wiki: " + requirementText, "Verify and show the current required level.");
    }
  }
}
for (const category of ["abilities", "foes", "skills", "locations", "pets"]) {
  const records = Object.entries(data[category] || {});
  let matched = 0;
  for (const [id, record] of records) {
    const entry = find(category, id, record) || (category === "pets" && find("items", id, record));
    if (!entry) {
      flag({id, title:record.name || id, category}, "P2", "missing-game-entry",
        "No matching " + category + " page", "Public client record " + id, "Check aliases and add missing player-facing information.");
      continue;
    }
    matched++;
    if (category === "foes" && record.speed !== undefined && !id.endsWith("-safe")
        && ![...facts(entry).keys()].some(label => /speed|cooldown|interval/i.test(label))) {
      flag(entry, "P2", "missing-foe-speed", "Attack speed/cooldown is not shown",
        "The client has speed = " + record.speed + "; the page lists HP and combat stats but no attack interval.",
        "Add the verified attack interval, including units and multi-hit caveats.");
    }
  }
  gameCoverage[category] = {gameRecords:records.length, matched};
}

const imageOwners = new Map();
function image(entry, src) {
  if (!src) return;
  const url = src.startsWith("http") ? src : src.startsWith(".")
    ? src : new URL(src, "https://microscape.cc/play/assets/").href;
  if (!imageOwners.has(url)) imageOwners.set(url, []);
  imageOwners.get(url).push(entry);
}
for (const entry of entries) {
  [entry.artwork, entry.abilityBottle, entry.portrait?.src, entry.mapImage?.src,
    ...(entry.sprites || []).flatMap(sprite => sprite.layers || []),
    ...(entry.npcSprites || []).flatMap(sprite => sprite.layers || [])
  ].forEach(src => image(entry, src));
  if (itemIcons[entry.id]) image(entry, itemIcons[entry.id]);
  for (const id of itemIconGroups[entry.id] || []) if (itemIcons[id]) image(entry, itemIcons[id]);
  for (const [, , options] of entry.sections || []) {
    const screenshot = options?.screenshot;
    if (!screenshot) continue;
    image(entry, screenshot.source?.src || byId.get(screenshot.mapId)?.mapImage?.src || entry.screenshotSource?.src);
    image(entry, screenshot.tile?.src);
    image(entry, screenshot.tile?.frame);
  }
}
const archived = new Set(manifest?.files.map(file => file.url));
const imageChecks = [];
const pending = [];
for (const [url, owners] of imageOwners) {
  if (url.startsWith(".")) {
    try {
      await fs.access(path.join(root, "docs", url));
      imageChecks.push({url, status:"local-present"});
    } catch {
      imageChecks.push({url, status:"local-missing"});
      for (const entry of owners) flag(entry, "P1", "missing-local-image", "Referenced local image is missing", url, "Restore the image or correct its path.");
    }
  } else if (archived.has(url)) imageChecks.push({url, status:"archived-200", verifiedAt:manifest.completedAt});
  else pending.push(url);
}
const linkChecks = [];
if (args.includes("--check-links")) {
  await Promise.all(Array.from({length:6}, async () => {
    while (pending.length) {
      const url = pending.shift();
      try {
        const response = await fetch(url, {method:"HEAD", signal:AbortSignal.timeout(12_000)});
        imageChecks.push({url, status:response.status});
        if ([404, 410].includes(response.status)) for (const entry of imageOwners.get(url)) {
          flag(entry, "P2", "broken-image", "Image URL is no longer available", url + " — HTTP " + response.status, "Replace with a verified original asset or a locally archived image.");
        }
      } catch (error) { imageChecks.push({url, status:"unverified", error:error.message}); }
    }
  }));
  const oldClient = "https://microscape.cc/play/assets/index-Bjzb2vNm.js";
  const oldClientEntries = entries.filter(entry => (entry.sources || []).some(([, url]) => url === oldClient)).map(entry => entry.id);
  if (oldClientEntries.length) {
    const response = await fetch(oldClient, {method:"HEAD", signal:AbortSignal.timeout(12_000)});
    linkChecks.push({url:oldClient, status:response.status, affectedEntries:oldClientEntries});
  }
  const responseWiki = await fetch("https://microscapewiki.com/reference.json", {signal:AbortSignal.timeout(15_000)});
  const publishedBytes = Buffer.from(await responseWiki.arrayBuffer());
  linkChecks.push({url:responseWiki.url, status:responseWiki.status,
    matchesLocalReference:publishedBytes.equals(referenceBytes)});
} else for (const url of pending) imageChecks.push({url, status:"not-checked"});
notes.push("Empty shop/skilling tables with an explicit no-content message are intentional, not missing information.");
notes.push("Cosmetics do not need combat stats; skills/abilities do not need creature sprites.");
notes.push("Blue Lobster's missing companion sprite is documented in its page and excluded from missing-sprite findings.");
notes.push("Safe foe variants can share one page; 47 client foe definitions do not imply 47 separate wiki pages.");
notes.push("This is a structured completeness audit against the saved beta client, not a claim that every value is current for 1.0.");

const counts = Object.fromEntries([...new Set(entries.map(entry => entry.category))].map(category => [category, {
  entries:entries.filter(entry => entry.category === category).length,
  affectedEntries:new Set(findings.filter(finding => finding.category === category).map(finding => finding.id)).size,
  findings:findings.filter(finding => finding.category === category).length
}]));
findings.sort((a, b) => a.priority.localeCompare(b.priority) || a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
const report = {generatedAt:new Date().toISOString(), entriesAudited:entries.length, wikiReferenceSha256:createHash("sha256").update(referenceBytes).digest("hex"),
  baseline:manifest && {capturedAt:manifest.capturedAt, gameUrl:manifest.gameUrl, tables:manifest.tables},
  counts, gameCoverage, findings, imageChecks, linkChecks, exclusions, notes};
await fs.mkdir(out, {recursive:true});
await fs.writeFile(path.join(out, "wiki-audit.json"), JSON.stringify(report, null, 2) + "\n");
const escape = value => String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
const lines = ["# Microscape Wiki completeness audit", "", "Generated: " + report.generatedAt, "",
  "**" + entries.length + " published entry definitions audited**, including generated pet pages, guides and tutorials.",
  "", "P1: missing core data or a client-data discrepancy. P2: missing explanatory information or documentation. P3: presentation gaps.",
  "", "## Coverage", "", "| Category | Entries | Pages with findings | Findings |", "|---|---:|---:|---:|"];
for (const [category, count] of Object.entries(counts)) lines.push("| " + [category, count.entries, count.affectedEntries, count.findings].join(" | ") + " |");
lines.push("", "## Findings", "", "| Priority | Category | Page | Gap | Evidence | Next step |", "|---|---|---|---|---|---|");
for (const finding of findings) lines.push("| " + [finding.priority, finding.category, "[" + escape(finding.title) + "](" + finding.url + ")", escape(finding.issue), escape(finding.evidence), escape(finding.recommendation)].join(" | ") + " |");
lines.push("", "## Source and image checks", "");
for (const check of linkChecks) lines.push("- " + check.url + ": HTTP " + check.status
  + (check.matchesLocalReference !== undefined ? "; published reference matches local: " + check.matchesLocalReference : "")
  + (check.affectedEntries ? "; referenced by " + check.affectedEntries.length + " entries." : ""));
const imageStatuses = Object.fromEntries([...new Set(imageChecks.map(check => String(check.status)))].map(status => [status, imageChecks.filter(check => String(check.status) === status).length]));
lines.push("- Image checks: " + JSON.stringify(imageStatuses), "", "## Interpretation", "", ...notes.map(note => "- " + note),
  "", "## Intentionally excluded client records", "", ...exclusions.map(exclusion => "- " + exclusion.id + ": " + exclusion.reason));
await fs.writeFile(path.join(out, "wiki-audit.md"), lines.join("\n") + "\n");
const csv = value => '"' + String(value ?? "").replaceAll('"', '""') + '"';
await fs.writeFile(path.join(out, "wiki-audit.csv"),
  ["priority,category,title,url,issue,evidence,recommendation",
    ...findings.map(finding => ["priority", "category", "title", "url", "issue", "evidence", "recommendation"].map(key => csv(finding[key])).join(","))
  ].join("\r\n") + "\r\n");
console.log(JSON.stringify({entries:entries.length, counts, findings:findings.length,
  byRule:Object.fromEntries([...new Set(findings.map(finding => finding.rule))].map(rule => [rule, findings.filter(finding => finding.rule === rule).length])),
  gameCoverage, imageStatuses, output:out}, null, 2));
