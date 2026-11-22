# Independent Bazaar history — November 22, 2026

The Bazaar now reads its own stored observations. No third-party wiki is queried
or used to backfill market history.

- Official source: `https://microscape.cc/server/tapi/bazaar.getAllItemSummaries`.
- Collector: `microscape-market-history`, with its workers.dev and preview URLs
  disabled. It is reached through the Pages `MARKET_HISTORY` service binding.
- Dedicated D1 database: `microscape-market-history`, binding `MARKET_DB`.
- Final recurring trigger: `*/15 * * * *` in UTC. A temporary every-minute test
  trigger was removed and the saved settings showed only Every 15 minutes.
- First successful stored sample: **2026-11-22 07:07:24 UTC** (1:07 AM Central),
  containing 174 public item summaries.
- First verified autonomous scheduled collection: **07:23:42 UTC**, after the
  initial trigger propagation delay. The public API returned two timestamped
  samples and its own source label. Later test ticks updated `lastScheduledAt`
  without duplicating a sample within the same 15-minute bucket.

Raw per-item asking/bidding prices and total quantities retain 14 days. Daily
asking-price aggregates retain 400 days; collection start and lifetime observed
lows persist. Daily cleanup bounds storage. Calendar-day aggregates are labeled
UTC; the 24-hour low is calculated precisely as of the last successful sample.
Summaries are materialized once per collection rather than rescanned per visitor.

Actual production SQL was exercised against SQLite for null/missing asks,
duplicate and late events, observed averages, the exact 24-hour window, failed
polls, retention and lifetime lows. The gateway tests reject unbounded requests,
isolate obsolete third-party caches and assert that no third-party fetch occurs.
GitHub Pages checks and the production history, live-order and Twitch endpoints
passed after deployment. The live UI displayed the new source/start date and
showed the independent chart without console errors.

All requests to the game are unauthenticated public reads. The collector stores
no player IDs, usernames, seller names, inventory, cookies or session credentials.
No paid plan was enabled. Monitor D1 usage as item coverage and readership grow.

## Public order ownership investigation — 19:45 UTC

Recaptured the current public game client at 19:44:26 UTC and parsed its Bazaar
calls and all 14 Bazaar components with Acorn. The asset remains
`index-BsSHHy-E.js`, SHA-256
`228bbcdac7deb74e394e283dc124611450abc4dd7f9d7ba98fb141846f649878`.
Source, AST trace and anonymous probe results are preserved locally in
`C:/dev/MicroscapeBuilds/bazaar-owner-research-2026-11-22/`.

The client contains six Bazaar read procedures: the four public market reads
and `getMyOrders` / `getMyOrderHistory`. Its other four Bazaar procedures create,
edit or cancel orders; none was executed. No public owner lookup by order ID
was found.

The game's `(you)` label is not a public identity field. The `E$` helper
(character offset 811052) compares a public order ID with IDs returned by the
signed-in player's `getMyOrders`. `BazaarPublicOrderRow` (offset 825142) receives
that Boolean as `isMine`. Selecting an order prepares a matching order using
item, opposite side, price and quantity; it passes no seller/buyer identity.
The personal history renderer likewise displays no counterparty username.

Fresh anonymous API checks, completed at 19:45:10 UTC:

| Procedure | Result | Ownership evidence |
| --- | --- | --- |
| `getItemOrders`, Copper Ore sell | HTTP 200, 21 rows | No owner field |
| `getItemOrders`, Copper Ore buy | HTTP 200, 2 rows | No owner field |
| `getNewOrders` | HTTP 200, 100 rows | No owner field |
| `getItemMarketSummary` | HTTP 200 | Trades contain only time, quantity and price |
| `getMyOrders` | HTTP 401, UNAUTHORIZED | Requires authentication |
| `getMyOrderHistory` | HTTP 401, UNAUTHORIZED | Requires authentication |

Public order rows contain `id`, `itemId`, `side`, `pricePerUnit`,
`stillAvailableQuantity`, `postedAtMs` and `isGoodDeal`. There is no player ID or
username to join to Player Lookup. This establishes no supported public mapping
in the checked client, not a claim about undocumented server internals or why
the developer omits ownership. Keep the wiki's order display unchanged.

No cookies, saved sessions, game sockets, trades or character actions were used.
