# Microscape Wiki completeness audit

Generated: 2026-11-18T21:44:06.382Z

**715 published entry definitions audited**, including generated pet pages, guides and tutorials.

P1: missing core data or a client-data discrepancy. P2: missing explanatory information or documentation. P3: presentation gaps.

## Coverage

| Category | Entries | Pages with findings | Findings |
|---|---:|---:|---:|
| items | 458 | 7 | 7 |
| locations | 56 | 0 | 0 |
| abilities | 89 | 0 | 0 |
| skills | 16 | 0 | 0 |
| foes | 43 | 0 | 0 |
| reference | 13 | 0 | 0 |
| pets | 26 | 0 | 0 |
| guides | 11 | 0 | 0 |
| tutorials | 3 | 0 | 0 |

## Findings

| Priority | Category | Page | Gap | Evidence | Next step |
|---|---|---|---|---|---|
| P2 | items | [Candy Cane](https://microscapewiki.com/#/entry/candy-cane) | Availability explicitly documented; further confirmation needed | Defined in the November 18 beta client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Elper's Hat](https://microscapewiki.com/#/entry/elpers-hat) | Availability explicitly documented; further confirmation needed | Defined in the November 18 beta client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Iron Axe](https://microscapewiki.com/#/entry/iron-axe) | Availability explicitly documented; further confirmation needed | Defined in the November 18 beta client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Lava Rod](https://microscapewiki.com/#/entry/lava-rod) | Availability explicitly documented; further confirmation needed | Defined in the November 18 beta client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Santa Hat](https://microscapewiki.com/#/entry/santa-hat) | Availability explicitly documented; further confirmation needed | Defined in the November 18 beta client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Steel Pickaxe](https://microscapewiki.com/#/entry/steel-pickaxe) | Availability explicitly documented; further confirmation needed | Archived equipment entry. No Steel Pickaxe definition is present in the November 18 beta client. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |
| P2 | items | [Uncut Dragonstone](https://microscapewiki.com/#/entry/uncut-dragonstone) | Availability explicitly documented; further confirmation needed | Defined in the November 18 beta client, but its current acquisition method is not established by the public game data. | Keep the documented limitation; confirm from the game or developer rather than inventing a current source. |

## Source and image checks

- https://microscapewiki.com/reference.json: HTTP 200; published reference matches local: true
- Image checks: {"200":26,"archived-200":802,"local-present":99}

## Interpretation

- Empty shop/skilling tables with an explicit no-content message are intentional, not missing information.
- Cosmetics do not need combat stats; skills/abilities do not need creature sprites.
- Blue Lobster's missing companion sprite is documented in its page and excluded from missing-sprite findings.
- Safe foe variants can share one page; 47 client foe definitions do not imply 47 separate wiki pages.
- This is a structured completeness audit against the saved beta client, not a claim that every value is current for 1.0.

## Intentionally excluded client records

- laserDagger: Test weapon. Not obtainable in-game.
- loot: Generic internal loot placeholder.
- trainingSword: Test weapon. Not obtainable in-game.
