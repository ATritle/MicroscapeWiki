# Good Magic planner coverage — November 27, 2026

Read the public game client at https://microscape.cc/play/assets/index-BsSHHy-E.js
on November 27. No authenticated game connection or character changes were used.
The asset remains the same build used for the existing catalog.

The planner listed 13 of the client's 17 Good Magic activities. Its catalog
builder explicitly excluded alchemy and all `singleExecution` activities; the
shared activity catalog also filtered out activities without primary skill XP.

Planner additions:

| Activity | Good Magic requirement | XP per action | Notes |
| --- | --- | --- | --- |
| Low Alchemy | 1 | 12 Good Magic | 2 Fire Runes, 1 Nature Rune, 1 selected item |
| High Alchemy | 55 | 180 Good Magic | 4 Fire Runes, 1 Nature Rune, 1 selected item |
| Enchant Amulet 5 | 68 | 293,652 Good Magic | Single cast; restarting required for additional planned actions |
| Dark Ritual | 1 | 1,000 Evil Magic | Requires Death's Bargain; no Good Magic XP; random shards excluded |

The client's `Ov` chooser permits items with a positive numeric `value`. Its `kv`
function computes gross coins as value + max(floor(value * 0.1), 1) for Low,
or value + max(floor(value * 0.5), 2) for High. These are gross receipts, not
profit. The planner consumes the chosen item and runes and carries coins forward.

Alchemy targets are preserved in plan validation, edits, saves, share links,
checklists and the shared BETA-Activity Queue. Converting a rune that is also in
the base recipe adds one more of that rune without mutating the catalog.

Checks cover complete activity coverage, both tiers, XP/time, rune costs, item
shortfalls, prior-step products, item-count goals, share round trips, invalid
targets, immutable recipes, one-cast notes and Ritual's secondary XP.

The release includes these planner additions and their checks. Unrelated local
prototype work is excluded.
