# Search-friendly publication

Published commit `b64f10376aa91437c46b3fc0597e92d9d755c1d5` through the
`Build and deploy searchable wiki` workflow, run `44830771188` (success).
GitHub Pages source is now GitHub Actions. The custom domain and enforced HTTPS
were preserved. The pre-SEO revision is saved remotely as
`seo-rollback-2026-11-20` at `82f9956c3f1a016d1432b08e93e7e1e8cd5d3f62`.

The build renders 787 HTML pages with the existing app renderer and unchanged CSS;
785 indexable URLs are listed in the sitemap. It supplies unique page titles,
descriptions, canonical URLs, social metadata and WebSite/WebPage JSON-LD.
Old hash bookmarks normalize to real paths. Search results and player lookup are
excluded from the sitemap; individual player results receive noindex. Builds
never retrieve live feeds or player data. No analytics tracker was added.

All generated internal links and legacy reference-entry routes were checked.
Existing shop, player lookup, Activity Comparison and Bazaar checks passed.
Browser checks covered the homepage and item layout, search, old bookmarks,
item/ability links, browser Back and a public-profile Activity Comparison.
Live HTTP checks confirmed static article content, canonical URLs, the sitemap,
robots file, verification tag and a genuine 404 response for unknown paths.

Google Search Console ownership was verified using the public HTML tag. Google
processed `https://microscapewiki.com/sitemap.xml` successfully and reported
785 discovered pages on November 20, 2026. The initial “Couldn't fetch” status
cleared after processing; this is not a claim that all pages are indexed or
ranked. No Hover DNS change was needed.

Bing Webmaster Tools is awaiting the user's sign-in in the prepared browser tab.
No community messages or promotional posts were sent.
