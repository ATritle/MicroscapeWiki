# Shop directory and combat XP research

The user requested research only for combat XP verification. No character
activity, equipment, ammunition, runes or other supplies were changed.

The current public build remains `index-BsSHHy-E.js`. The public client explains
that damage earns combat XP, but does not expose the server conversion for
Strength, Defense, Ranged or Evil Magic. The Microscape Scribe's own published
model uses `combat.damage.xpPerHpRemoved = 4` for combat. This corroborates the
shared estimate; it does not independently verify those four skills. They
remain individually marked unverified in the calculator. Attack retains the
previous directly observed 4-XP-per-damage baseline.

The shop audit covers 10 ordinary coin shops with 41 exact stock entries, 12
named barter/service NPCs, three dungeon coin exchanges, and Marcel's 33
appearance choices. Every entry includes its provider, location, stock or
services, exact costs, and requirements where defined. Purchase prices and
positive item sell values are separate fields. Appearance changes have no
inventory resale value. The evidence file is
`docs/assets/game-data/shops-2026-11-20.json`.

The public `ShopScreen` directly iterates `shop.items`, calculates purchase price
as `floor(item.value * (specificItemBuyMultipliers[itemId] ?? globalBuyMultiplier))`,
and uses positive `item.value` when selling. In particular, `arrows` is the exact
Bronze Arrows item, not a category. The four erroneous higher-arrow source
tables were removed and the release importer now requires exact stock IDs.

The salon price table was parsed as literals from the public client with Acorn;
the downloaded game JavaScript was not executed. NPC sprites reuse previously
captured original artwork from the corresponding location entries.

Validation: `node scripts/check-shop-directory.mjs`, existing Activity Comparison
and player lookup checks, and browser verification of the directory, stock,
service and item/location links.
