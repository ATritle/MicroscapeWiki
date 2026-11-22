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
