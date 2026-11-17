# Microscape Wiki

MzDunk’s community wiki for the Twitch-powered browser idle RPG Microscape. The site uses static HTML, CSS and JavaScript. GitHub Pages serves the `docs` folder.

## Preview locally

From the repository root, serve the site over HTTP and open `http://localhost:8000`.

```sh
python -m http.server 8000 --directory docs
```

## Edit the wiki

- Edit `docs/guides.js` for guides, patch coverage and playable walkthroughs. Each guide has a permanent ID, sections, related article IDs and sources.
- Edit `docs/reference.json` for catalog entries. An entry can include a summary, facts and tables. Keep existing IDs stable so saved links keep working. Add the patch date and link to the evidence when revising a beta-era value.
- Edit `docs/styles.css` for the visual theme. The original pixel-art village banner lives in `docs/assets`.

GitHub Pages is configured to deploy from `main`, folder `/docs`. To check a change, open the site and try an affected deep link, a search, and the relevant filters.

## Credits

Microscape is created by [K3nt0456](https://microscape.cc/credits/). Game systems in the guides are sourced from the [official patch notes](https://microscape.cc/patch-notes/) and the [Miraheze Microscape Wiki](https://microscape.miraheze.org/wiki/Main_Page). The reference catalog adapts Miraheze tables, indexes and article facts with source revisions and contributor history linked on each reference page. That adapted material is available under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
