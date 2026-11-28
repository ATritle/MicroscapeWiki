# Activity Planner coverage audit — November 27, 2026

Compared every skill definition in the current public client with the planner.
The official play page still references `index-BsSHHy-E.js`; its data was extracted
earlier the same day. Source: https://microscape.cc/play/assets/index-BsSHHy-E.js.
No signed-in game data or character-control actions were used.

After the Good Magic update, 93 active definitions remained absent. Five grant
XP; 88 grant none. The earlier builder filtered out single-action recipes and
inherited a training catalog that excluded zero-XP tasks. The owner requested
all activities, with clear XP and limitation labels.

| Skill | Previously listed | Added | Complete total |
| --- | ---: | ---: | ---: |
| Attack | 48 | 0 | 48 |
| Strength | 48 | 0 | 48 |
| Defense | 48 | 0 | 48 |
| Evil Magic | 48 | 0 | 48 |
| Ranged | 48 | 0 | 48 |
| Piety | 3 | 63 | 66 |
| Woodcutting | 6 | 0 | 6 |
| Firemaking | 7 | 2 | 9 |
| Fishing | 10 | 5 | 15 |
| Cooking | 23 | 2 | 25 |
| Mining | 9 | 2 | 11 |
| Smithing | 42 | 3 | 45 |
| Crafting | 39 | 14 | 53 |
| Good Magic | 17 | 0 | 17 |
| Fletching | 25 | 0 | 25 |
| Herblaw | 32 | 2 | 34 |
| Total | 453 | 93 | 546 |

The five additional XP recipes are Dragonstone Amulet (Crafting 80, 1,006,113 XP),
Emberstone (Crafting 82, 450,000 XP), Heartwood Haft (Crafting 84, 900,000 XP),
Everflame Core (Firemaking 85, 900,000 XP), and Brimstone Axe Head (Smithing 86,
900,000 XP). All stop after one action in-game.

Utility actions include bucket/vial filling, leather tanning, NPC crafting,
Blue Flame recipes, pet-map and currency exchanges, sigil and dungeon chests,
Jester's Chest attempts, clearing rubble, tutorial passage trades, and boat travel.
The checked-in catalog contains each exact recipe, XP award and location.

## Modeling limits

- Zero XP is explicit; skill-level goals are unavailable for actions without XP
  in the listed skill. Secondary XP, such as Dark Ritual's Evil Magic award,
  contributes to total XP.
- Fractional non-pet rewards are listed separately with their chances. They are
  excluded from guaranteed inventory and deterministic item-count targets.
  Action-count goals budget attempts and supplies without promising a reward.
- Single-action activities default to one action. Repeating a recipe or exchange
  requires restarting only where permitted by the game; ownership limits and
  one-time unlocks are not verified. Membership and source disclaimers are shown.
- Travel steps represent one boat trip. The ticket is consumed where required,
  destinations are named, and return trips need a separate step. Other movement
  between activities is not tracked.
- Existing base time, combat, ability, potion, resource-wait and supply assumptions
  remain estimates. Random pet drops remain outside guaranteed products.

Checks verify coverage counts for every skill, all five advanced XP recipes,
zero-XP material chains, alchemy persistence, chance exclusions, membership maps,
boat restrictions, share round trips and unchanged game state. The release
includes the full activity catalog and these modeling limits. Unrelated local
prototype work is excluded.

## Product icon corrections — November 28

Unfired Pot, Unfired Pie Dish and Dough use their crafted product icons and item
links. Their recipes also return empty containers, which had incorrectly become
the tile identity. Returned buckets and pots remain in material totals. Both
catalog builders share the explicit product selection so regeneration retains
the correction.
