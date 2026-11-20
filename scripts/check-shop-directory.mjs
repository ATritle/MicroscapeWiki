import assert from "node:assert/strict";
import fs from "node:fs/promises";
const evidence = JSON.parse(await fs.readFile(new URL("../docs/assets/game-data/shops-2026-11-20.json", import.meta.url), "utf8"));
const reference = JSON.parse(await fs.readFile(new URL("../docs/reference.json", import.meta.url), "utf8"));
const byId = new Map(reference.map(page => [page.id,page]));
const {suppliers} = evidence;
const shops = suppliers.filter(s => s.type === "shop");
const shop = id => shops.find(s => s.id === id);
const stock = (shopId, itemId) => shop(shopId).stock.find(item => item.id === itemId);
assert.equal(shops.length, 10);
assert.equal(shops.flatMap(s => s.stock).length, 41);
assert.equal(reference.filter(page => page.generatedShopDirectory).length, 26);
for (const supplier of suppliers) {
  const page = byId.get(supplier.wikiId);
  assert.equal(page.category, "shops");
  assert(supplier.locations.length && supplier.locations.every(location => byId.has(location.wikiId)), "Every vendor needs a working location link");
  assert(page.related.every(id => byId.has(id)), "New vendor related links must resolve");
  if (supplier.type === "shop") for (const item of supplier.stock) {
    assert(byId.has(item.wikiId));
    assert(Number.isInteger(item.buyPrice) && item.buyPrice > 0);
    assert(item.sellValue > 0 && item.buyPrice >= item.sellValue);
    const reciprocal = byId.get(item.wikiId).tables.find(table => table.title === "Shops");
    assert(reciprocal.rows.some(row => row[0] === supplier.name));
  }
}
assert.equal(stock("merricsMagic","staff").buyPrice, 28);
assert.equal(stock("merricsMagic","staff").sellValue, 2);
assert.equal(stock("avasCookery","chocolateDust").buyPrice, 52);
assert.equal(stock("avasCookery","snapeGrass").buyPrice, 130);
assert.equal(stock("jaciensSupplies","trainingPickaxe").buyPrice, 7);
assert.equal(stock("jaciensSupplies","trainingFishingRod").buyPrice, 4);
assert.equal(stock("braffsStaves","battlestaff").buyPrice, 1176);
assert.deepEqual(shop("rodrigosArrows").stock.map(item => item.id), ["arrows","shortbow"], "Bronze Arrows is an exact item, not all arrow tiers");
for (const id of ["steelArrows","mithrilArrows","adamantArrows","progriteArrows"]) {
  const page = reference.find(page => page.gameId === id && page.category === "items");
  assert(!page.tables.some(table => table.title === "Shops" && table.rows.some(row => /Rodrigo/.test(row[0]))));
}
const mork = suppliers.find(s=>s.id==="mork"), otis = suppliers.find(s=>s.id==="otis");
assert.equal(mork.offers.length, 24);
assert.equal(otis.offers.length, 11);
assert(otis.offers.every(offer=>offer.requiresMembership && offer.inputs[0].id==="audienceFavor" && offer.inputs[0].amount===15));
assert.equal(mork.offers.find(offer=>offer.outputs.some(item=>item.id==="petMapAmber")).inputs[0].amount, 10);
assert.equal(mork.offers.find(offer=>offer.outputs.some(item=>item.id==="petMapBog")).inputs[0].amount, 20);
assert.equal(suppliers.find(s=>s.id==="sir-bratley").offers.find(offer=>offer.outputs.some(item=>item.id==="dragonShieldRight")).inputs[0].amount, 7300000);
assert.equal(suppliers.find(s=>s.id==="rusty-chest").offers.find(offer=>offer.outputs.some(item=>item.id==="rubberBoots")).inputs[0].amount, 16);
const salon = suppliers.find(s=>s.type==="appearance");
assert.equal(salon.styles.length, 33);
assert.equal(salon.styles.find(style=>style.id==="theJohnny").price, 30000);
assert.equal(salon.styles.find(style=>style.id==="boldBrown").price, 20);
assert(salon.styles.filter(style=>style.slot==="skin").every(style=>style.price===0));
console.log("Passed: 26 directory entries, 10 exact coin-shop stocks, 41 listings, markup exceptions and sell values, reciprocal source corrections, map-vendor costs, dungeon rewards, salon fees, and working item/location links.");
