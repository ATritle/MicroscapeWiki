# Microscape Wiki

MzDunk’s community wiki for the Twitch-powered browser idle RPG Microscape. The site uses static HTML, CSS and JavaScript. GitHub Pages serves the `docs` folder.

## Preview locally

From the repository root, serve the site over HTTP and open `http://localhost:8000`.

```sh
python -m http.server 8000 --directory docs
```

To preview Player Lookup locally with real public profiles, run
`node scripts/preview-player-lookup.mjs 8065` and open
`http://127.0.0.1:8065/#/player-lookup`. This localhost-only server uses the public
community ranking index to resolve exact usernames, then reads current profiles
from Microscape. Unindexed characters may be missing from this preview.
The production `/player.json` Worker endpoint resolves names directly
through Twitch using the existing server-side app credentials. Neither command
publishes changes. Run `node scripts/check-player-lookup.mjs` to check profile
validation, cache isolation, skill math, sprite layers and existing feed behavior.
The original sprite and activity metadata in `docs/player-reference.json` is built
by `scripts/build-player-reference.mjs` from a captured public game build.

Name suggestions use the public player index at `microwiki.mhmm.pl` through
`/player-search.json`, with partial matches and a bounded close-spelling fallback.
The index may omit new characters; exact username lookup still goes directly
through Twitch and Microscape. The game's `currentWorldId` is an internal ID,
not its displayed world number. The client resolves it through
`meta.availableWorlds` on the authenticated game socket. No public directory was
found, so world information is omitted from the page until joinable world
numbers can be verified.

## Edit the wiki

- Edit `docs/guides.js` for guides, patch coverage and playable walkthroughs. Each guide has a permanent ID, sections, related article IDs and sources.
- Add combat tutorials in `docs/tutorials.js`. List the relevant foe, equipment and ability IDs so their reference pages link back to the tutorial.
- Edit `docs/reference.json` for catalog entries. An entry can include a summary, facts and tables. Keep existing IDs stable so saved links keep working. Add the patch date and link to the evidence when revising a beta-era value.
- Location entries use `mapImage` for the official map preview, with the image URL and its original width and height. Keep entrance requirements and dungeon chamber routes with the travel directions.
- Pet profiles use the map and odds tables in `docs/reference.json`. Their image sources and training locations are managed in `docs/pets.js`.
- Edit `docs/styles.css` for the visual theme. The original pixel-art village banner lives in `docs/assets`.

The November 18 audit and follow-up reports are saved in `audits`. To repeat the
completeness check against a captured public build, run
`node scripts/audit-wiki.mjs --game-data path/to/snapshot/game-data.json --out audits/DATE --check-links`.
Run `node scripts/check-audit-updates.mjs` to verify the filled reference pages,
recipe status labels, source paths and artwork. The preserved factual beta
definitions in `docs/assets/game-data/beta-2026-11-18.json` keep source citations
working after the game's generated bundle filenames disappear.

GitHub Pages is configured to deploy from `main`, folder `/docs`. To check a change, open the site and try an affected deep link, a search, and the relevant filters.

The Live Drops tracker reads `drops.json` from the `microscape-live-drops` Cloudflare Worker. The Worker fetches the game’s stream list on demand and caches each response for one minute. The wiki checks on page load, every five minutes while visible, and when readers click **Refresh**. Deploy the Worker from the `workers` directory using its `wrangler.toml` configuration.

The same Worker serves `/mzdunk.json` for Twitch status. Set `TWITCH_CLIENT_ID` as a Worker variable and `TWITCH_CLIENT_SECRET` as a Worker secret from the wiki’s dedicated Twitch app. The wiki checks Twitch every minute while visible and immediately on tab visibility, focus, page restoration, or reconnection. Concurrent Twitch checks share one request. The wiki uses Microscape’s stream list as a fallback while Twitch status is unavailable. When the last confirmed live status is too old, the sidebar keeps the channel link visible with a Checking badge until another check confirms whether she is live or offline.

If the Worker is unavailable, the tracker tries `drops.json` from the `live-data` branch. The **Refresh live Microscape drops** GitHub Actions workflow can publish that fallback automatically or run manually from Actions. If both sources are unavailable or more than 40 minutes old, the tracker directs readers to Streams in Microscape.

Run `./scripts/register-drops-backup.ps1` in PowerShell 7 to register the optional **Microscape Wiki Live Drops Backup** task. Pass `-Replace` to update the existing task. It runs every 15 minutes while its user is signed in and the PC is awake, and publishes to `live-data` using the existing GitHub sign-in when the snapshot is at least 10 minutes old. Check `last-run.log` in the task’s state directory for the latest result. To stop the backup, disable the named task in Task Scheduler.

## Credits

Microscape is created by [K3nt0456](https://microscape.cc/credits/). Game systems in the guides are sourced from the [official patch notes](https://microscape.cc/patch-notes/) and the [Miraheze Microscape Wiki](https://microscape.miraheze.org/wiki/Main_Page). The reference catalog adapts Miraheze tables, indexes and article facts with source revisions and contributor history linked on each reference page. That adapted material is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
