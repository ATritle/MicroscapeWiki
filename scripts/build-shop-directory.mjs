import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import {pathToFileURL} from "node:url";

const [dataFile, clientFile, sourceFile, acornFile] = process.argv.slice(2);
if (!acornFile) throw Error("Pass extracted game JSON, public client JS, source metadata JSON and the Acorn module path.");
const game = JSON.parse(await fs.readFile(dataFile, "utf8"));
const client = await fs.readFile(clientFile, "utf8");
const source = JSON.parse(await fs.readFile(sourceFile, "utf8"));
const {parse} = await import(pathToFileURL(acornFile).href);
const ast = parse(client, {ecmaVersion:"latest", sourceType:"module"});
const date = source.checkedAt.slice(0, 10);
const evidenceUrl = "./assets/game-data/shops-" + date + ".json";
const referenceUrl = new URL("../docs/reference.json", import.meta.url);
const reference = JSON.parse(await fs.readFile(referenceUrl, "utf8"));
const art = JSON.parse(await fs.readFile(new URL("../docs/player-reference.json", import.meta.url), "utf8"));
const norm = value => String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
const title = value => String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase()).replace(/(['’])S\b/g, "$1s");
const slug = value => String(value).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const format = new Intl.NumberFormat("en", {maximumFractionDigits:5});
const coins = n => format.format(n) + (n === 1 ? " coin" : " coins");
const itemDefs = {...game.items, ...game.appearance};
const itemPages = new Map(Object.keys(itemDefs).map(id => [id, reference.find(page => page.category === "items" && (page.gameId === id || norm(page.id) === norm(id)))]));
const itemName = id => itemPages.get(id)?.title || title(itemDefs[id]?.name || id);
const itemValue = id => Number.isFinite(itemDefs[id]?.value) && itemDefs[id].value > 0 ? itemDefs[id].value : null;
const valueLabel = id => itemValue(id) === null ? "No sell value listed" : coins(itemValue(id));
const skillName = id => game.skills[id]?.name || title(id);
const equipmentReq = id => Object.entries(itemDefs[id]?.requirements || {}).filter(([, n]) => Number.isFinite(n)).map(([skill, level]) => skillName(skill) + " " + level).join(" · ") || "None listed";
const locationPage = id => reference.find(page => page.category === "locations" && (page.gameId === id || page.id === id));
const locationsFor = entity => Object.entries(game.locations).filter(([, location]) => location.entities?.[entity]).map(([id, location]) => ({
  id, name:locationPage(id)?.title || location.name, wikiId:locationPage(id)?.id, npc:location.entities[entity].npc
}));
const namedNpc = (entity, locations) => game.npcs[locations[0]?.npc]?.name || game.npcs[entity]?.name || game.entities[entity]?.name || title(entity);
const sourceLinks = [["Archived shop and service definitions · " + date, evidenceUrl], ["Official Microscape game", "https://microscape.cc/play/"]];
const suppliers = [], pages = [];
function basePage(id, name, entity, group, npc, locations, summary) {
  if (!locations.length) throw Error("Missing location for " + entity);
  const npcSprite = locations.flatMap(location => locationPage(location.id)?.npcSprites || []).find(sprite => sprite.label === npc);
  const page = {id, title:name, category:"shops", group, generatedShopDirectory:true, summary, statsDate:date,
    facts:[["Vendor / provider", npc], ["Location", locations.map(location => location.name).join(" · ")], ["Type", group]],
    tables:[], sections:[], related:locations.map(location => location.wikiId).filter(Boolean), sources:sourceLinks,
    ...(npcSprite ? {sprites:[structuredClone(npcSprite)]} : {portrait:{src:art.items.coins.icon, source:"https://microscape.cc/play/"}})};
  pages.push(page);
  return page;
}
function linkItems(page, ids) {
  page.related = [...new Set([...page.related, ...ids.map(id => itemPages.get(id)?.id).filter(Boolean)])];
}
for (const shop of Object.values(game.shops)) {
  const locations = locationsFor(shop.entityType);
  const npc = namedNpc(shop.entityType, locations);
  const stock = shop.items.map(id => {
    // ShopScreen iterates these exact IDs. "arrows" is the Bronze Arrows
    // item, not a category that includes every higher-tier ammunition item.
    const item = itemDefs[id], multiplier = shop.specificItemBuyMultipliers?.[id] ?? shop.globalBuyMultiplier;
    if (!item || !Number.isFinite(item.value) || !Number.isFinite(multiplier)) throw Error("Unresolved shop item or price: " + shop.id + "/" + id);
    return {id, name:itemName(id), wikiId:itemPages.get(id)?.id, buyPrice:Math.floor(item.value * multiplier), sellValue:itemValue(id), multiplier, equipRequirements:equipmentReq(id)};
  });
  const page = basePage("shop-" + slug(shop.entityType), shop.name, shop.entityType, "Coin shops", npc, locations,
    npc + " · " + locations.map(l => l.name).join(" · ") + " · " + stock.length + (stock.length === 1 ? " item" : " items") + " for coins.");
  page.facts.push(["Currency", "Coins"], ["Items for sale", String(stock.length)]);
  page.sections.push(["Buying and selling", "The buy price is what you pay for one item. The sell value is what a shop pays for one item; it is not the purchase price or a Bazaar price. Item-specific markups override the shop’s general markup. Equipment requirements describe wearing or using the item, not a confirmed restriction on buying it."]);
  page.tables.push({title:"Items for sale", columns:["Item", "You pay per item", "You receive when selling", "Equip requirements"],
    rows:stock.map(item => [item.name, coins(item.buyPrice), item.sellValue === null ? "No sell value listed" : coins(item.sellValue), item.equipRequirements])});
  linkItems(page, stock.map(item => item.id));
  suppliers.push({id:shop.id, wikiId:page.id, name:shop.name, entity:shop.entityType, npc, type:"shop", locations, stock});
}

const npcEntities = new Set(Object.keys(game.npcs));
for (const location of Object.values(game.locations)) for (const [entity, placement] of Object.entries(location.entities || {})) if (placement.npc) npcEntities.add(entity);
const chests = new Set(["rusty-chest", "bloodied-chest", "scorched-chest"]);
const exchanges = new Map();
for (const [key, activity] of Object.entries(game.activities)) {
  if (activity.softDeleted || activity.deprecated || (!npcEntities.has(activity.entity) && !chests.has(activity.entity))) continue;
  const changes = Object.entries(activity.inventoryChanges || {}).filter(([, amount]) => Number.isFinite(amount));
  const inputs = changes.filter(([, amount]) => amount < 0).map(([id, amount]) => ({id, amount:-amount}));
  const outputs = changes.filter(([id, amount]) => amount > 0 && !(id in game.pets)).map(([id, amount]) => ({id, amount}));
  if (!inputs.length || !outputs.length) continue;
  const skill = key.split("/")[0];
  const offer = {id:key, name:activity.name, skill, level:activity.level || 1, inputs, outputs,
    requiresMembership:activity.requiresMembership === true, requiresAbility:typeof activity.requiresAbility === "string" ? activity.requiresAbility : null,
    singleExecution:activity.singleExecution === true};
  if (!exchanges.has(activity.entity)) exchanges.set(activity.entity, []);
  exchanges.get(activity.entity).push(offer);
}
function amountLabel(item) {
  return item.amount >= 1 ? format.format(item.amount) + " × " + itemName(item.id) : itemName(item.id) + " (" + format.format(item.amount * 100) + "% chance)";
}
for (const [entity, offers] of exchanges) {
  const locations = locationsFor(entity), npc = chests.has(entity) ? "Dungeon reward chest" : namedNpc(entity, locations);
  const name = game.entities[entity]?.name || npc;
  const page = basePage((chests.has(entity) ? "exchange-" : "vendor-") + entity, name, entity, chests.has(entity) ? "Dungeon exchanges" : "Barter and services", npc, locations,
    locations.map(l => l.name).join(" · ") + " · " + offers.length + " trade or service " + (offers.length === 1 ? "option." : "options."));
  page.facts.push(["Offers", String(offers.length)]);
  page.sections.push(["How to use these offers", "These are NPC trades, crafting services or reward exchanges. Bring every listed input; coin-shop markups do not apply to these costs. The reward’s sell value is shown separately and does not convert Audience Favor, dungeon coins or ingredients into ordinary coins. Item possession, membership and completed unlocks must still be checked in game."]);
  const links = offers.flatMap(offer => [...offer.inputs, ...offer.outputs].flatMap(item => itemPages.get(item.id) ? [[amountLabel(item), itemPages.get(item.id).id]] : []));
  page.tables.push({title:chests.has(entity) ? "Dungeon coin rewards" : "Trade and service offers", columns:["Offer", "You receive", "You provide", "Reward sell value per item", "Activity requirements"],
    rows:offers.map(offer => [title(offer.name), offer.outputs.map(amountLabel).join(" · "), offer.inputs.map(amountLabel).join(" · "),
      offer.outputs.map(item => itemName(item.id) + ": " + valueLabel(item.id)).join(" · "),
      [skillName(offer.skill) + " " + offer.level, ...(offer.requiresMembership ? ["Membership"] : []), ...(offer.requiresAbility ? [game.abilities[offer.requiresAbility]?.name || title(offer.requiresAbility)] : []), ...(offer.singleExecution ? ["Single execution"] : [])].join(" · ")]), links, listColumns:[1,2]});
  linkItems(page, offers.flatMap(offer => [...offer.inputs, ...offer.outputs].map(item => item.id)));
  suppliers.push({id:entity, wikiId:page.id, name, npc, entity, type:chests.has(entity) ? "dungeon-exchange" : "service", locations, offers});
}

// Read literal appearance prices without running the downloaded game client.
const appearanceIds = Object.keys(game.appearance).filter(id => ["hair", "skin"].includes(game.appearance[id].slot));
let appearancePrices;
for (const statement of ast.body) if (statement.type === "VariableDeclaration") for (const declaration of statement.declarations) {
  const node = declaration.init;
  if (node?.type !== "ObjectExpression") continue;
  const pairs = node.properties.map(p => [p.key?.name || p.key?.value, p.value?.type === "Literal" ? p.value.value : NaN]);
  const values = Object.fromEntries(pairs);
  if (appearanceIds.every(id => Number.isFinite(values[id])) && pairs.every(([, value]) => Number.isFinite(value))) {
    if (appearancePrices) throw Error("More than one appearance price table found");
    appearancePrices = values;
  }
}
if (!appearancePrices) throw Error("The literal salon price table could not be verified");
const salonLocations = locationsFor("hair-stylist"), stylist = namedNpc("hair-stylist", salonLocations);
const salon = basePage("vendor-hair-stylist", stylist, "hair-stylist", "Appearance services", stylist, salonLocations,
  salonLocations.map(l => l.name).join(" · ") + " · Hairstyle and skin changes with individual coin prices.");
const styles = appearanceIds.map(id => ({id, name:itemName(id), slot:game.appearance[id].slot, price:appearancePrices[id], wikiId:itemPages.get(id)?.id}));
salon.facts.push(["Currency", "Coins"], ["Appearance choices", String(styles.length)]);
salon.sections.push(["Appearance changes", "These prices apply to appearance changes at the salon. A zero-cost skin change is free. Appearance services do not create inventory items that can be sold back to a vendor. The preview does not charge coins until the change is confirmed in game."]);
salon.tables.push({title:"Appearance services", columns:["Style", "Type", "You pay"], rows:styles.map(style => [style.name, title(style.slot), style.price ? coins(style.price) : "Free"])});
linkItems(salon, appearanceIds);
suppliers.push({id:"hair-stylist", wikiId:salon.id, name:stylist, npc:stylist, entity:"hair-stylist", type:"appearance", locations:salonLocations, styles});

// Replace only directory pages owned by this generator.
const existing = reference.filter(page => !page.generatedShopDirectory);
for (const page of existing) if (page.category === "locations") {
  const local = suppliers.filter(s => s.locations.some(location => location.wikiId === page.id));
  const table = page.tables?.find(table => table.title === "Shops and services");
  if (table && local.length) {
    const links = local.flatMap(s => [[s.name, s.wikiId], [s.npc, s.wikiId]]);
    table.links = [...links, ...(table.links || []).filter(([label]) => !links.some(([name]) => name === label))];
    page.related = [...new Set([...(page.related || []), ...local.map(s => s.wikiId)])];
  }
}
const vendor = existing.find(page => page.id === "vendor");
vendor.title = "Shops, vendors and sell values";
vendor.summary = "Find every defined coin shop, named barter vendor, appearance service and dungeon coin exchange, with locations and exact costs.";
vendor.facts = [["Coin shops", String(suppliers.filter(s => s.type === "shop").length)], ["Coin-shop listings", String(suppliers.filter(s => s.type === "shop").flatMap(s => s.stock).length)], ["Other traders and services", String(suppliers.filter(s => s.type !== "shop").length)]];
vendor.tables = (vendor.tables || []).filter(table => table.title !== "Shop and vendor directory");
vendor.tables.unshift({title:"Shop and vendor directory", columns:["Shop / vendor", "NPC / provider", "Location", "Type", "Offers"],
  rows:suppliers.map(s => [s.name, s.npc, s.locations.map(l => l.name + " (area)").join(" · "), pages.find(p => p.id === s.wikiId).group, String((s.stock || s.offers || s.styles).length)]),
  links:[...suppliers.map(s => [s.name, s.wikiId]), ...suppliers.flatMap(s => s.locations.map(l => [l.name + " (area)", l.wikiId]))], listColumns:[2]});
vendor.related = [...new Set([...(vendor.related || []), ...pages.map(page => page.id), ...suppliers.flatMap(s=>s.locations.map(l=>l.wikiId)).filter(Boolean)])];
vendor.sources = [...sourceLinks, ...(vendor.sources || []).filter(([, url]) => !sourceLinks.some(([, next]) => next === url))];
vendor.statsDate = date;

// Correct reciprocal item-source tables, including the former higher-arrow error.
for (const [id, page] of itemPages) if (page) {
  const shops = suppliers.filter(s => s.type === "shop" && s.stock.some(stock => stock.id === id));
  const tables = page.tables || [], shopTableIndex = tables.findIndex(table => table.title === "Shops");
  if (shops.length) {
    const table = {title:"Shops", columns:["Shop", "Location", "Purchase price"], rows:shops.map(shop => [shop.name, shop.locations.map(l => l.name + " (area)").join(" · "), coins(shop.stock.find(stock => stock.id === id).buyPrice)]),
      links:[...shops.map(shop => [shop.name, shop.wikiId]), ...shops.flatMap(shop => shop.locations.map(l => [l.name + " (area)", l.wikiId]))], listColumns:[1]};
    page.tables = [...tables];
    if (shopTableIndex >= 0) page.tables[shopTableIndex] = table;
    else page.tables.push(table);
    page.related = [...new Set([...(page.related || []), ...shops.map(shop => shop.wikiId)])];
  } else if (shopTableIndex >= 0) page.tables = tables.filter(table => table.title !== "Shops");
  if (shops.length || shopTableIndex >= 0) {
    page.sources = [...sourceLinks.slice(0,1), ...(page.sources || []).filter(([, url]) => url !== evidenceUrl)];
    page.statsDate = date;
  }
}
const evidence = {checkedAt:source.checkedAt, client:source.url, clientSha256:createHash("sha256").update(client).digest("hex"),
  priceRules:{shopBuy:"floor(item value * (item-specific multiplier ?? shop general multiplier))", shopSell:"Positive item base value", exactStockIds:true, salon:"Literal price table used by the salon UI"}, suppliers};
await fs.writeFile(new URL("../docs/" + evidenceUrl.slice(2), import.meta.url), JSON.stringify(evidence, null, 2) + "\n");
await fs.writeFile(referenceUrl, JSON.stringify([...existing, ...pages.sort((a,b) => a.title.localeCompare(b.title))], null, 2) + "\n");
console.log(JSON.stringify({directoryPages:pages.length, coinShops:suppliers.filter(s=>s.type==="shop").length, coinListings:suppliers.filter(s=>s.type==="shop").flatMap(s=>s.stock).length,
  services:suppliers.filter(s=>s.type==="service").length, dungeonExchanges:suppliers.filter(s=>s.type==="dungeon-exchange").length, appearanceChoices:styles.length, evidence:evidenceUrl}));
