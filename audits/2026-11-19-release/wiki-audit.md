# Microscape Wiki completeness audit

Generated: 2026-11-19T21:25:53.871Z

**745 published entry definitions audited**, including generated pet pages, guides and tutorials.

P1: missing core data or a client-data discrepancy. P2: missing explanatory information or documentation. P3: presentation gaps.

## Coverage

| Category | Entries | Pages with findings | Findings |
|---|---:|---:|---:|
| items | 474 | 5 | 5 |
| locations | 57 | 0 | 0 |
| abilities | 89 | 0 | 0 |
| skills | 16 | 0 | 0 |
| foes | 44 | 0 | 0 |
| reference | 13 | 0 | 0 |
| pets | 37 | 0 | 0 |
| guides | 12 | 0 | 0 |
| tutorials | 3 | 0 | 0 |

## Findings

| Priority | Category | Page | Gap | Evidence | Next step |
|---|---|---|---|---|---|
| P2 | items | [Candy Cane](https://microscapewiki.com/#/entry/candy-cane) | Availability explicitly documented; further confirmation needed | Defined in the November 19 release client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Elper's Hat](https://microscapewiki.com/#/entry/elpers-hat) | Availability explicitly documented; further confirmation needed | Defined in the November 19 release client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Lava Rod](https://microscapewiki.com/#/entry/lava-rod) | Availability explicitly documented; further confirmation needed | Defined in the November 19 release client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Santa Hat](https://microscapewiki.com/#/entry/santa-hat) | Availability explicitly documented; further confirmation needed | Defined in the November 19 release client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Uncut Dragonstone](https://microscapewiki.com/#/entry/uncut-dragonstone) | Availability explicitly documented; further confirmation needed | Defined in the November 19 release client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |

## Source and image checks

- https://microscapewiki.com/reference.json: HTTP 200; published reference matches local: false
- Image checks: {"200":1,"archived-200":835,"local-present":121}

## Interpretation

- Empty shop/skilling tables with an explicit no-content message are intentional, not missing information.
- Cosmetics do not need combat stats; skills/abilities do not need creature sprites.
- Blob now has a release companion sprite. Removed beta content is explicitly archived.
- Safe foe variants can share a page; client foe-definition counts do not equal the number of wiki pages.
- This structured audit checks the supplied captured build. Server-only behavior and future hotfixes require separate confirmation.
- 16 entries are explicitly archived because they are absent from the checked client. These are documented historical records, not missing current sources.

## Intentionally excluded client records

- laserDagger: Test weapon. Not obtainable in-game.
- loot: Generic internal loot placeholder.
- trainingSword: Test weapon. Not obtainable in-game.
