import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {buildPetEntries} from "../docs/pets.js";
import {inflateSync} from "node:zlib";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = process.argv[2];
if (!snapshot) throw Error("Pass the archived game snapshot directory.");
const {parse} = await import(pathToFileURL(path.resolve(snapshot, "../../node_modules/acorn/dist/acorn.mjs")).href);
const manifest = JSON.parse(await fs.readFile(path.join(snapshot, "manifest.json"), "utf8"));
const client = manifest.files.find(file => /index-.*\.js$/.test(file.file));
const source = await fs.readFile(path.join(snapshot, client.file), "utf8");
const ast = parse(source, {ecmaVersion:"latest", sourceType:"module"});
const bindings = new Map();
for (const node of ast.body) if (node.type === "VariableDeclaration") {
  for (const declaration of node.declarations) if (declaration.id.type === "Identifier") bindings.set(declaration.id.name, declaration.init);
}
function resolve(node, seen = new Set()) {
  if (!node) return;
  if (node.type === "Literal" && typeof node.value === "string") return node.value;
  if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis[0].value.cooked;
  if (node.type === "Identifier" && !seen.has(node.name)) return resolve(bindings.get(node.name), new Set([...seen, node.name]));
  if (node.type === "CallExpression" && node.arguments[0]?.type === "ObjectExpression") {
    const value = node.arguments[0].properties.find(property => property.key?.name === "default")?.value;
    if (value?.type === "ArrowFunctionExpression") return resolve(value.body, seen);
  }
}
const equipment = {}, icons = {};
function walk(node) {
  if (!node || typeof node !== "object") return;
  if (node.type === "Property" && node.key.type === "Literal") {
    const value = resolve(node.value);
    const key = node.key.value;
    const match = typeof key === "string" && /^\.\.\/assets\/(equipment|icons)\/(.+)\.png$/.exec(key);
    if (match && value?.startsWith("/play/assets/")) {
      if (match[1] === "equipment" && match[2].endsWith("World")) equipment[match[2].slice(0, -5)] = "https://microscape.cc" + value;
      if (match[1] === "icons") icons[match[2]] = "https://microscape.cc" + value;
    }
  }
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") walk(value);
  }
}
walk(ast);
// The game's held weapon hand uses pixel (17, 17) of the 32-pixel body.
// Read the same pixel from the original upscaled PNGs without modifying them.
function inspectArtwork(bytes) {
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (bytes[24] !== 8 || bytes[28] !== 0) return null;
  const type = bytes[25], channels = {2:3, 6:4}[type];
  if (!channels) return null;
  const chunks = [];
  for (let offset = 8; offset < bytes.length;) {
    const length = bytes.readUInt32BE(offset), kind = bytes.toString("ascii", offset + 4, offset + 8);
    if (kind === "IDAT") chunks.push(bytes.subarray(offset + 8, offset + 8 + length));
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels;
  let previous = Buffer.alloc(stride);
  const x = Math.floor(17.5 * width / 32), targetY = Math.floor(17.5 * height / 32);
  let hand, leftEdge = width, topEdge = height, rightEdge = -1, bottomEdge = -1;
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], row = Buffer.from(raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)));
    for (let i = 0; i < stride; i++) {
      const left = i >= channels ? row[i - channels] : 0, above = previous[i], corner = i >= channels ? previous[i - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      if (filter === 2) predictor = above;
      if (filter === 3) predictor = Math.floor((left + above) / 2);
      if (filter === 4) {
        const p = left + above - corner;
        const a = Math.abs(p - left), b = Math.abs(p - above), c = Math.abs(p - corner);
        predictor = a <= b && a <= c ? left : b <= c ? above : corner;
      }
      row[i] = (row[i] + predictor) & 255;
    }
    previous = row;
    for (let column = 0; column < width; column++) {
      const at = column * channels, alpha = type === 6 ? row[at + 3] : 255;
      if (!alpha) continue;
      leftEdge = Math.min(leftEdge, column); rightEdge = Math.max(rightEdge, column + 1);
      topEdge = Math.min(topEdge, y); bottomEdge = Math.max(bottomEdge, y + 1);
      if (column === x && y === targetY) hand = [row[at], row[at + 1], row[at + 2], alpha];
    }
  }
  return {hand, bounds:rightEdge < 0 ? null :
    [leftEdge * 128 / width, topEdge * 128 / height, rightEdge * 128 / width, bottomEdge * 128 / height]};
}
const handSamples = {}, artworkBounds = {};
for (const [id, url] of Object.entries(equipment)) {
  const file = manifest.files.find(file => file.url === url);
  if (file) {
    const info = inspectArtwork(await fs.readFile(path.join(snapshot, file.file)));
    if (info?.hand) handSamples[id] = info.hand;
    if (info?.bounds) artworkBounds[id] = info.bounds;
  }
}
const game = JSON.parse(await fs.readFile(path.join(snapshot, "game-data.json"), "utf8"));
const reference = JSON.parse(await fs.readFile(path.join(root, "docs/reference.json"), "utf8"));
const pages = [...reference, ...buildPetEntries(reference)];
const norm = value => String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
function pageFor(category, id, record) {
  return pages.find(page => page.category === category && [page.id, page.title, page.title.replace(/\brobes\b/gi, "robe"),
    ...(page.aliases || []), ...(page.facts || []).filter(([key]) => key === "In-game name").map(([, value]) => value)]
    .some(value => norm(value) === norm(id) || norm(value) === norm(record.name)));
}
const items = {};
for (const [id, record] of Object.entries({...game.items, ...game.appearance})) {
  const page = pageFor(record.slot === "pet" ? "pets" : "items", id, record) || pageFor("items", id, record);
  items[id] = {name:record.name, slot:record.slot, icon:icons[record.iconMapping || id] || icons[id],
    ...(page ? {wikiId:page.id} : {}), ...(record.bonuses ? {bonuses:record.bonuses} : {})};
}
const skills = Object.entries(game.skills).map(([id, record]) => ({
  id, name:record.name, icon:icons[id], wikiId:pageFor("skills", id, record)?.id
}));
const locations = Object.fromEntries(Object.entries(game.locations).map(([id, record]) => {
  const page = pageFor("locations", id, record) || reference.find(page => page.mapImage?.src.includes("/" + id + "-"));
  return [id, {name:record.name, ...(page ? {wikiId:page.id, map:page.mapImage} : {})}];
}));
const activities = Object.fromEntries(Object.entries(game.activities).filter(([, record]) => record.id && record.name)
  .map(([key, record]) => [key, {name:record.name, mob:record.mob}]));
const foes = Object.fromEntries(Object.entries(game.foes).map(([id, record]) => [id, {
  name:record.name, wikiId:pageFor("foes", id, record)?.id
}]));
const pets = {};
for (const [id, record] of Object.entries(game.pets)) {
  const page = pageFor("pets", id.replace(/^pet/, ""), record);
  if (page?.sprites?.[0]) pets[id] = {name:record.name, sprite:page.sprites[0]};
}
if (!equipment.skin1 || !equipment.adamantArmor || !equipment.krakenClub) throw Error("Required character art was not found.");
const output = {build:path.basename(client.file), equipment, handSamples, artworkBounds, items, skills, locations, activities, foes, pets};
await fs.writeFile(path.join(root, "docs/player-reference.json"), JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify({equipment:Object.keys(equipment).length, items:Object.keys(items).length,
  skills:skills.length, locations:Object.keys(locations).length, activities:Object.keys(activities).length, pets:Object.keys(pets).length}));
