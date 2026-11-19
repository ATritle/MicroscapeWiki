# November 19 release comparison and publication

Compared the November 18 beta capture with the public launch build captured on
November 19 at 20:54:38 UTC. A post-launch request confirmed the same client and
version. The capture contains 997 files, no download failures and no build change
during capture. Original beta files and the pre-release wiki remain preserved.

The migration covers current item bonuses, equip requirements, recipes and shop
prices; standard, safe and Champion foe loot; skill unlocks and training; all
location maps and services; ability sources; and all 36 current pets with original
sprites, map requirements, prices and task-specific probabilities. Removed beta
entries retain their routes with explicit archive labels and locally preserved art.

The release guide explains the new starter island, login/resource/activity queues,
Bazaar Invite, achievement rewards, pet changes, equipment buffs, long amulet
actions, boss HP and drop adjustments, and fixed dungeon-coin chest exchanges.
Starter, Favor, Bazaar, queue, dungeon and boss guides were updated accordingly.
Player Lookup's original sprite metadata now uses release assets; its safeguards
against unreliable public live-location/activity/HP fields remain in place.

## Validation

- `node scripts/check-audit-updates.mjs SNAPSHOT`: passed for 745 routes, every
  current item bonus and requirement, all foe stats/timing/drop odds, all pet
  sprites/task counts/map costs, original routes, source paths, release hash and
  referenced game-art URLs.
- `node scripts/check-player-lookup.mjs`: passed, including sprite centering,
  skill order/math, suggestions, cache isolation, safe fields and feed behavior.
- `node scripts/audit-wiki.mjs --game-data SNAPSHOT/game-data.json --check-links`:
  no missing core stats or presentation findings. Five explicit acquisition
  uncertainties remain: Candy Cane, Elper's Hat, Lava Rod, Santa Hat and Uncut
  Dragonstone. Sixteen historical entries are separately marked archived.
- 835 remote game image URLs matched the successful release capture, 121 local
  images existed, and the remaining external image returned HTTP 200.
- Browser review: home release notice, comparison guide, new island map and
  services, Amber and Blob sprites/odds, Island Rodent, King Onyx Dragon stats,
  Gurgle route map/marker and preserved fight sprites. Mobile Blob page checked
  at 390px with no document overflow or broken loaded images.
- Existing hosted Twitch status and drops feeds returned HTTP 200; the drops
  response included three fallback energy channels. Worker code was unchanged.

`build-comparison.json` preserves the field comparison with executable expressions
marked rather than executed. Minified identifier changes were reviewed separately
and were not presented as gameplay changes. `update-ledger.json` records the
captured client hash, migrated pages, archive status and final reference hash.

Public files do not establish every server-side rule or account migration outcome.
Unconfirmed sources remain labeled rather than guessed. The pre-publication audit
initially reports a different published reference; deployment verification checks
the final live reference separately.
