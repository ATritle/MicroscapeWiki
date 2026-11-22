# Community API gateway

Cloudflare Pages advanced-mode Function. Build output: `api-gateway`.
Configure a service binding named `LIVE_DROPS` to the existing
`microscape-live-drops` Worker, then deploy. No credentials are copied here.

Five public read-only API paths are forwarded. `/bazaar.json` reads public
Microscape market summaries; add `?item=ITEM_ID` for both order books and recent
trades. Market responses cache for 30 seconds. It never forwards account cookies,
requests private order history, or exposes trade mutations. The GitHub backup feed
URL is configured privately as the relay Worker's `DROPS_BACKUP_URL` variable.

`/bazaar-history.json` uses the `MARKET_HISTORY` service binding to the private
`microscape-market-history` Worker. Its scheduled collector stores observations
directly from the official game in the dedicated MARKET_DB D1 database. No other
wiki's history is requested. It supports a summary, bounded charts, or up to 30
sparklines. The versioned cache key prevents old third-party cache responses from
surviving the cutover. History caches for five minutes; current official orders
remain on the existing 30-second feed. No account data is collected.
