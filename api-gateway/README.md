# Community API gateway

Cloudflare Pages advanced-mode Function. Build output: `api-gateway`.
Configure a service binding named `LIVE_DROPS` to the existing
`microscape-live-drops` Worker, then deploy. No credentials are copied here.

Five public read-only API paths are forwarded. `/bazaar.json` reads public
Microscape market summaries; add `?item=ITEM_ID` for both order books and recent
trades. Market responses cache for 30 seconds. It never forwards account cookies,
requests private order history, or exposes trade mutations. The GitHub backup feed
URL is configured privately as the relay Worker's `DROPS_BACKUP_URL` variable.

`/bazaar-history.json` independently relays the publicly available Microwiki
historical price observations, credited on the wiki. It supports a summary,
bounded per-item charts, or sparklines for up to 30 IDs; only market price fields
are returned. No seller data or browser cookies are forwarded. History caches
for five minutes; current official orders remain on the existing 30-second feed.
