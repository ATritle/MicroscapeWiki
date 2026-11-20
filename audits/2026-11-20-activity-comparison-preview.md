# Activity comparison release

Status: user approved publication on November 20, 2026. Activity Comparison replaces the XP Calculator link under Resources. The former calculator entry remains an experience guide with a threshold table and a link to the new tool.

The `#/activity-comparison` route reuses public player lookup, accepts any valid
username, and limits both activity selections to the same skill. All 16 skills
have choices. The catalog contains 217 positive-XP skilling activities and 48
combat targets exposed through each of the five combat training skills.

The public client `index-BsSHHy-E.js` was checked November 20, 2026. The generated
catalog records its URL, capture timestamp and SHA-256. It includes allowlisted
literal definitions only. Regenerate it with `scripts/build-activity-catalog.mjs`
and the extracted public game JSON, client JavaScript and source metadata JSON.

Combat accuracy and maximum hits use the client formulas. Kill times and relative
XP rates explicitly assume uniform damage, one full interval per swing, a
configurable per-kill delay, and XP proportional to HP removed. Automatic combat
XP/hour uses a baseline of 4 XP per damage, observed directly for one-damage
Attack hits on November 20. The other combat skills use the same baseline as an
explicit assumption pending independent measurement. The anonymous observation
is recorded in `docs/assets/game-data/combat-xp-2026-11-20.json`. There is no
XP-per-damage input. Magic additionally requires a selected spell. No
availability is inferred for learned spells, rune supplies or abilities.
Special encounters and incompatible styles receive no rate recommendation.

Skilling base rates use listed primary XP and the client-displayed duration,
including four 2-second preparation ticks by default. Double-up chance uses base
level plus equipment bonus, with required levels checked against base level.
Bonus actions are excluded by default. The optional repeat model is explicitly
an assumption of one extra action and a configurable extra delay; the default
4-second delay follows the two-tick timing in the official October 6 patch notes
(https://microscape.cc/patch-notes/). Ingredient
gathering, access, banking, active effects and temporary boosts are excluded.

The comparison page uses a profile snapshot and manual refresh so a background
refresh cannot interrupt activity selection. The ordinary Player Lookup retains
its existing automatic refresh and links to the comparison for the selected name.
The username input keeps the neutral `e.g. User12345` placeholder.

Activity selectors remain flat and use the game order, with level labels.
Selecting an above-level skilling activity or spell still shows its theoretical
XP/hour and ranks the pair for planning, clearly marking the unmet requirement.
Enemy combat levels are descriptive labels, not player entry requirements.

Validation:

- `node scripts/check-activity-comparison.mjs`
- `node scripts/check-combat-comparison.mjs`
- `node scripts/check-player-lookup.mjs`
- Browser checks: name entry; same-skill filtering; duplicate swapping; melee,
  ranged and magic behavior; locked levels; special encounters; optional bonus
  action model; desktop/mobile layout.
