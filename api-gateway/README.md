# Community API gateway

Cloudflare Pages advanced-mode Function. Build output: `api-gateway`.
Configure a service binding named `LIVE_DROPS` to the existing
`microscape-live-drops` Worker, then deploy. No credentials are copied here.

Only the five public read-only API paths are forwarded. The GitHub backup feed
URL is configured privately as the relay Worker's `DROPS_BACKUP_URL` variable.
