# Microscape Wiki

MzDunk’s community wiki for the Twitch-powered browser idle RPG Microscape. The site uses static HTML, CSS and JavaScript. GitHub Pages serves the `docs` folder.

## Preview locally

From the repository root, serve the site over HTTP and open `http://localhost:8000`.

```sh
python -m http.server 8000 --directory docs
```

## Edit the wiki

- Edit `docs/guides.js` for guides, patch coverage and playable walkthroughs. Each guide has a permanent ID, sections, related article IDs and sources.
- Add combat tutorials in `docs/tutorials.js`. List the relevant foe, equipment and ability IDs so their reference pages link back to the tutorial.
- Edit `docs/reference.json` for catalog entries. An entry can include a summary, facts and tables. Keep existing IDs stable so saved links keep working. Add the patch date and link to the evidence when revising a beta-era value.
- Location entries use `mapImage` for the official map preview, with the image URL and its original width and height. Keep entrance requirements and dungeon chamber routes with the travel directions.
- Pet profiles use the map and odds tables in `docs/reference.json`. Their image sources and training locations are managed in `docs/pets.js`.
- Edit `docs/styles.css` for the visual theme. The original pixel-art village banner lives in `docs/assets`.

GitHub Pages is configured to deploy from `main`, folder `/docs`. To check a change, open the site and try an affected deep link, a search, and the relevant filters.

The Live Drops tracker reads `drops.json` from the `microscape-live-drops` Cloudflare Worker. The Worker fetches the game’s stream list on demand and caches each response for one minute. The wiki checks on page load, every five minutes while visible, and when readers click **Refresh**. Deploy the Worker from the `workers` directory using its `wrangler.toml` configuration.

If the Worker is unavailable, the tracker tries `drops.json` from the `live-data` branch. The **Refresh live Microscape drops** GitHub Actions workflow can publish that fallback automatically or run manually from Actions. If both sources are unavailable or more than 40 minutes old, the tracker directs readers to Streams in Microscape.

Run `./scripts/register-drops-backup.ps1` in PowerShell 7 to register the optional **Microscape Wiki Live Drops Backup** task. Pass `-Replace` to update the existing task. It runs every 15 minutes while its user is signed in and the PC is awake, and publishes to `live-data` using the existing GitHub sign-in when the snapshot is at least 10 minutes old. Check `last-run.log` in the task’s state directory for the latest result. To stop the backup, disable the named task in Task Scheduler.

## Credits

Microscape is created by [K3nt0456](https://microscape.cc/credits/). Game systems in the guides are sourced from the [official patch notes](https://microscape.cc/patch-notes/) and the [Miraheze Microscape Wiki](https://microscape.miraheze.org/wiki/Main_Page). The reference catalog adapts Miraheze tables, indexes and article facts with source revisions and contributor history linked on each reference page. That adapted material is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
