import { guides } from "./guides.js?v=lurk-price";
import { tutorials } from "./tutorials.js";
import { buildPetEntries } from "./pets.js?v=world-sprites";
import { itemIcons, itemIconGroups } from "./item-icons.js";

const groups = {
  guides: { title: "Guides", icon: "▤", blurb: "Start here, earn Energy, trade and plan dungeon runs." },
  tutorials: { title: "Tutorials", icon: "◎", blurb: "Find equipment and abilities for specific enemies and boss mechanics." },
  skills: { title: "Skills", icon: "✧", blurb: "Training activities, unlocks and supplies." },
  items: { title: "Items", icon: "◇", blurb: "Browse gear, materials, food and tools." },
  foes: { title: "Foes", icon: "⚔", blurb: "Find enemies, dungeon bosses and their loot." },
  locations: { title: "Locations", icon: "⌖", blurb: "Explore in-game maps, travel routes, enemies, shops and skilling spots." },
  abilities: { title: "Abilities", icon: "ϟ", blurb: "Equipment requirements and limit break costs." },
  pets: { title: "Pets", icon: "✿", blurb: "Companions, pet maps, eligible tasks and drop odds." },
  reference: { title: "Game mechanics", icon: "◈", blurb: "Pet maps, titles, healing and equipment bonuses." }
};

const main = document.querySelector("main");
const nav = document.querySelector("#wiki-nav");
const menu = document.querySelector("#menu-button");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#wiki-search");
const number = new Intl.NumberFormat("en");
const gameAssets = "https://microscape.cc/play/assets/";
const liveDropsUrl = "#/live-drops";
const topicOrder = ["skills", "items", "foes", "locations", "abilities", "pets", "reference"];
const featured = ["energy", "dungeons", "bazaar", "activity-queue"];
const displayCount = 36;
let referenceLoadFailed = false;
let stopLiveDrops;

const entries = [...guides, ...tutorials];
const byId = new Map(entries.map(entry => [entry.id, entry]));
const index = new Map();
const petLinks = new Map();

function element(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

function link(label, href, className) {
  return element("a", className ? {href, class:className} : {href}, label);
}
const glyph = (text, className = "glyph") => element("span", {class:className, "aria-hidden":"true"}, text);
const categoryUrl = category => "#/browse/" + category;
const entryUrl = id => "#/entry/" + id;
const entryLink = (id, label, className) => link(label || byId.get(id)?.title || id, entryUrl(id), className);
const normalize = value => value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/['’]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

function entryImage(src, alt, thumbnail = false) {
  return element("img", {
    class: thumbnail ? "entry-icon entry-thumbnail" : "entry-icon",
    src,
    alt,
    width: thumbnail ? "42" : "96",
    height: thumbnail ? "42" : "96",
    loading: thumbnail ? "lazy" : "eager",
    referrerpolicy: "no-referrer"
  });
}

function itemIconUrl(id) {
  const icon = itemIcons[id];
  return icon ? new URL(icon, gameAssets).href : null;
}

function entryThumbnail(entry) {
  return entry.abilityBottle || entry.portrait?.src || entry.artwork || entry.mapImage?.src
    || (entry.category === "items" ? itemIconUrl(itemIconGroups[entry.id]?.[0] || entry.id) : null);
}

function entryArtwork(entry) {
  const artwork = entry.abilityBottle || entry.artwork;
  if (artwork) {
    const label = entry.abilityBottle ? " in-game Ability XP bottle" : " in-game icon";
    return element("div", {class:"profile-art"}, entryImage(artwork, entry.title + label));
  }
  if (entry.category !== "items") return null;
  const group = itemIconGroups[entry.id];
  if (group) {
    return element("div", {class:"profile-art item-art-group", role:"group", "aria-label":entry.title + " icons"},
      ...group.map(id => entryImage(itemIconUrl(id), byId.get(id).title + " in-game icon", true))
    );
  }
  const icon = itemIconUrl(entry.id);
  if (!icon) return null;
  const label = entry.id === "steel-pickaxe" ? " archived icon" : " in-game icon";
  return element("div", {class:"profile-art"}, entryImage(icon, entry.title + label));
}

function addToSearch(entry) {
  index.set(entry.id, {
    title: normalize(entry.title),
    full: normalize([
      entry.title, entry.aliases?.join(" "), entry.group, entry.summary, groups[entry.category].title,
      entry.sections?.flat().join(" "), entry.facts?.flat().join(" "),
      entry.tables?.flatMap(table => [table.title, ...table.columns, ...table.rows.flat()]).join(" ")
    ].filter(Boolean).join(" "))
  });
}

function renderNav(category, currentId, home, liveDrops) {
  const sections = [
    ["Explore", [
      ["Overview", "#/", "⌂", home],
      ["Live drops", liveDropsUrl, "◉", liveDrops],
      ["Getting started", entryUrl("getting-started"), "↳", currentId === "getting-started"],
      ["All guides", categoryUrl("guides"), "▤", category === "guides" && !currentId],
      ["Tutorials", categoryUrl("tutorials"), groups.tutorials.icon, category === "tutorials"]
    ]],
    ["Compendium", topicOrder.map(id => [groups[id].title, categoryUrl(id), groups[id].icon, category === id])],
    ["Resources", [
      ["XP calculator", entryUrl("experience"), "∑", currentId === "experience"],
      ["Release notes", entryUrl("release-notes"), "◷", currentId === "release-notes"],
      ["About and sources", entryUrl("about"), "ⓘ", currentId === "about"]
    ]]
  ];
  nav.replaceChildren(...sections.map(([heading, links]) => element("div", {class:"nav-group"},
    element("p", {class:"nav-heading"}, heading),
    ...links.map(([label, href, icon, active]) => element("a", {
      class:"nav-link", href, ...(active ? {"aria-current":"page"} : {})
    }, glyph(icon), label))
  )));
}

function footer() {
  return element("footer", {class:"footer"},
    element("span", {}, "MzDunk’s community wiki"),
    entryLink("about", "About and sources"),
    link("Suggest an edit", "https://github.com/ATritle/MicroscapeWiki/issues"),
    link("Official patch notes", "https://microscape.cc/patch-notes/")
  );
}

function renderHome() {
  const hero = element("section", {class:"hero", "aria-labelledby":"page-title"},
    element("div", {class:"hero-copy"},
      element("p", {class:"hero-brand"},
        element("span", {class:"hero-wordmark", "aria-hidden":"true"},
          element("span", {class:"hero-wordmark-signature"}),
          element("span", {class:"hero-wordmark-suffix"})
        ),
        element("span", {class:"visually-hidden"}, "MzDunk’s "),
        element("span", {class:"hero-brand-label"}, "Community Wiki")
      ),
      element("h1", {id:"page-title"}, "Microscape ", element("span", {class:"hero-title-wiki"}, "Wiki")),
      element("p", {}, "Player guides and reference tables for the Twitch-powered browser idle RPG."),
      element("div", {class:"actions"},
        element("a", {class:"button primary", href:entryUrl("getting-started")}, "Getting started", glyph("→", "")),
        link("Live Twitch drops", liveDropsUrl, "button")
      )
    )
  );
  const launch = element("div", {class:"notice"}, glyph("◷"),
    element("p", {}, entryLink("release-notes", "November 19 launch"), " · Reference tables reflect the beta. Check the game for current values.")
  );
  const topics = element("section", {"aria-labelledby":"topic-heading"},
    element("h2", {id:"topic-heading"}, "Browse the compendium"),
    element("div", {class:"topic-grid"}, ...topicOrder.map(id => {
      const group = groups[id];
      return element("a", {class:"topic-card", href:categoryUrl(id)},
        glyph(group.icon, "topic-icon"),
        element("span", {}, element("span", {class:"topic-name"}, group.title), element("span", {class:"topic-desc"}, group.blurb)),
        glyph("→", "arrow")
      );
    }))
  );
  const columns = element("div", {class:"home-columns"},
    element("section", {"aria-labelledby":"guides-heading"},
      element("h2", {id:"guides-heading"}, "Player guides"),
      ...featured.map(id => {
        const entry = byId.get(id);
        return element("a", {class:"list-card", href:entryUrl(id)},
          element("span", {}, element("strong", {}, entry.title), element("small", {}, entry.summary)),
          glyph("→", "arrow")
        );
      }),
      element("a", {class:"list-card", href:categoryUrl("tutorials")},
        element("span", {}, element("strong", {}, "Combat tutorials"), element("small", {}, groups.tutorials.blurb)),
        glyph("→", "arrow")
      )
    ),
    element("section", {"aria-labelledby":"patch-heading"},
      element("h2", {id:"patch-heading"}, "From the patch notes"),
      element("div", {class:"updates"},
        element("time", {datetime:"2026-11-12"}, "November 12, 2026"),
        element("h3", {}, "The King’s Jubilee"),
        element("p", {}, "The King of O’Rock held a party at the castle as the beta drew to a close."),
        link("Read the official patch notes ↗", "https://microscape.cc/patch-notes/")
      )
    )
  );
  main.append(hero, launch, topics, columns, footer());
}

function crumbs(category, current) {
  return element("nav", {class:"breadcrumbs", "aria-label":"Breadcrumb"},
    link("Home", "#/"), glyph("›", ""),
    ...(category ? [link(groups[category].title, categoryUrl(category)), glyph("›", "")] : []),
    element("span", {"aria-current":"page"}, current)
  );
}

function renderLiveDrops() {
  const snapshotUrl = "https://raw.githubusercontent.com/ATritle/MicroscapeWiki/live-data/drops.json";
  const updateTime = new Intl.DateTimeFormat(undefined, {dateStyle:"medium", timeStyle:"short"});
  const maxAge = 40 * 60_000;
  const status = element("p", {class:"drop-status", role:"status"}, "Checking for live drops…");
  const results = element("div", {class:"drop-groups"});
  const refreshButton = element("button", {class:"button", type:"button"}, "Refresh");
  let snapshot;
  let request;
  let stopped = false;

  function eventList(type, title, empty, events, now) {
    const matches = events.filter(event => event.type === type);
    return element("section", {class:"drop-group"}, element("h2", {}, title),
      matches.length ? element("ul", {}, ...matches.map(event => {
        const minutes = Math.ceil((event.endsAt - now) / 60_000);
        const remaining = event.endsAt === null ? "End time unavailable"
          : minutes < 60 ? `About ${minutes} min left`
          : `About ${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
        return element("li", {},
          element("a", {class:"entry-card", href:"https://www.twitch.tv/" + event.channel, target:"_blank", rel:"noopener noreferrer"},
            element("span", {}, element("strong", {}, event.name),
              element("small", {}, event.doubleKeys ? "2× Dungeon Keys · " + remaining : remaining)),
            glyph("↗", "arrow")
          )
        );
      })) : element("p", {class:"empty"}, empty)
    );
  }

  function showSnapshot(failed) {
    const now = Date.now();
    if (!snapshot || now - snapshot.checkedAt > maxAge) {
      status.textContent = "Live data is temporarily unavailable. Open Streams in Microscape for current events.";
      results.replaceChildren();
      return;
    }
    const events = snapshot.events
      .filter(event => event.endsAt === null || event.endsAt > now)
      .sort((a, b) => (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity) || a.name.localeCompare(b.name));
    status.textContent = (failed ? "Refresh failed. " : "") + "Last checked " + updateTime.format(snapshot.checkedAt) + ".";
    results.replaceChildren(
      eventList("favor", "Drop Festivals", "No active festivals were listed.", events, now),
      eventList("key", "Dungeon Key events", "No active Dungeon Key events were listed.", events, now)
    );
  }

  async function refresh() {
    if (request || stopped) return;
    request = new AbortController();
    refreshButton.disabled = true;
    try {
      const signal = AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]);
      const response = await fetch(snapshotUrl, {cache:"no-store", credentials:"omit", signal});
      if (!response.ok) throw new Error("Live drops HTTP " + response.status);
      const data = await response.json();
      if (!Number.isFinite(data?.checkedAt) || !Array.isArray(data.events) || data.events.some(event =>
        !event || !["favor", "key"].includes(event.type) || typeof event.name !== "string"
        || !/^[a-z0-9_]{1,25}$/.test(event.channel) || !(event.endsAt === null || Number.isFinite(event.endsAt)))) {
        throw new Error("Invalid live drops snapshot.");
      }
      snapshot = data;
      if (!stopped) showSnapshot(false);
    } catch {
      if (!stopped) showSnapshot(true);
    } finally {
      request = null;
      refreshButton.disabled = false;
    }
  }

  main.append(element("article", {class:"article"}, crumbs(null, "Live Twitch drops"),
    element("h1", {}, "Live Twitch drops"),
    element("p", {class:"intro"}, "Find Twitch channels with active Audience Favor or Dungeon Key rewards. The wiki checks Microscape’s Streams list about every 15 minutes."),
    element("div", {class:"actions"}, refreshButton, link("Open Microscape", "https://microscape.cc/play/", "button")),
    status, results,
    element("p", {class:"drop-help"}, entryLink("audience-favor", "How to claim Audience Favor on Twitch"), " · ",
      entryLink("dungeons", "Dungeon Keys guide"))
  ), footer());
  refreshButton.addEventListener("click", refresh);
  const timer = setInterval(() => { if (!document.hidden) refresh(); }, 5 * 60_000);
  refresh();
  stopLiveDrops = () => {
    stopped = true;
    clearInterval(timer);
    request?.abort();
  };
}

function renderList(category, query) {
  const name = category ? groups[category].title : "Search the wiki";
  const isSearch = !category;
  const tokens = normalize(query).split(" ").filter(Boolean);
  const matching = category ? entries.filter(entry => entry.category === category) : entries.filter(entry => {
    const data = index.get(entry.id);
    return tokens.every(token => data.full.includes(token));
  });
  if (isSearch && tokens.length) {
    const phrase = tokens.join(" ");
    const score = entry => {
      const title = index.get(entry.id).title;
      if (title === phrase) return 0;
      if (title.startsWith(phrase)) return 1;
      if (title.includes(phrase)) return 2;
      return 3;
    };
    matching.sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title));
  }
  const filters = [...new Set(matching.map(entry => isSearch ? entry.category : entry.group).filter(Boolean))];
  if (category !== "skills") filters.sort((a,b) => (isSearch ? groups[a].title.localeCompare(groups[b].title) : a.localeCompare(b)));
  let filter = "";
  let limit = displayCount;
  const filterBar = element("div", {class:"filters", role:"group", "aria-label":"Filter entries"});
  const count = element("p", {class:"result-label", role:"status"});
  const grid = element("div", {class:"entry-grid"});
  const empty = element("p", {class:"empty"}, isSearch ? "No entries match. Try a different name or a shorter search." : "No entries match this filter.");
  const more = element("button", {class:"button more", type:"button"}, "Show more");
  function update() {
    const filtered = matching.filter(entry => !filter || (isSearch ? entry.category : entry.group) === filter);
    count.textContent = number.format(filtered.length) + (filtered.length === 1 ? " entry" : " entries") + (isSearch && query ? " for “" + query + "”" : "");
    grid.replaceChildren(...filtered.slice(0,limit).map(entry => {
      const thumbnail = entryThumbnail(entry);
      return element("a", {class:"entry-card", href:entryUrl(entry.id)},
        element("span", {class:"entry-card-body"},
          ...(thumbnail ? [entryImage(thumbnail, "", true)] : []),
          element("span", {}, element("strong", {}, entry.title),
            element("small", {}, entry.summary || entry.group || groups[entry.category].title))),
        glyph("→", "arrow")
      );
    }));
    empty.hidden = Boolean(filtered.length);
    more.hidden = filtered.length <= limit;
    for (const button of filterBar.children) button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
  }
  if (filters.length > 1) {
    for (const value of ["", ...filters]) {
      const button = element("button", {type:"button", class:"filter", "data-filter":value}, value ? (isSearch ? groups[value].title : value) : "All");
      button.addEventListener("click", () => {
        filter = value;
        limit = displayCount;
        update();
      });
      filterBar.append(button);
    }
  }
  more.addEventListener("click", () => {
    const firstNew = limit;
    limit += displayCount;
    update();
    grid.children[firstNew]?.focus();
  });
  update();
  main.append(crumbs(null, name), element("h1", {}, name));
  if (category) main.append(element("p", {class:"intro"}, groups[category].blurb));
  if (category === "pets" && byId.has("pets")) main.append(entryLink("pets", null, "button"));
  if (referenceLoadFailed && category !== "guides" && category !== "tutorials") main.append(element("p", {class:"notice"}, "The reference catalog could not load. Refresh the page to retry."));
  if (filterBar.children.length) main.append(filterBar);
  main.append(count, grid, empty, more, footer());
}

function renderTable(table, relatedIds = [], namedLinks = new Map()) {
  const candidates = relatedIds.map(id => byId.get(id)).filter(Boolean);
  const itemLinks = table.links || [];
  const names = new Map([
    ...candidates.map(entry => [normalize(entry.title), entry.id]),
    ...itemLinks.filter(([, id]) => byId.has(id)).map(([label,id]) => [normalize(label),id])
  ]);
  const wrapper = element("div", {class:"table-wrap", role:"region", tabindex:"0", "aria-label":table.title || "Reference table"});
  const head = element("thead", {}, element("tr", {}, ...table.columns.map(col => {
    const target = namedLinks.get(normalize(col));
    return element("th", {scope:"col"}, target ? entryLink(target, col) : col);
  })));
  const body = element("tbody", {}, ...table.rows.map(row => element("tr", {},
    ...row.map((value, col) => {
      if (table.listColumns?.includes(col)) {
        return element("td", {}, ...value.split(" · ").flatMap((label, index) => {
          const target = names.get(normalize(label));
          return [...(index ? [" · "] : []), target ? entryLink(target, label) : label];
        }));
      }
      const key = normalize(value);
      const target = namedLinks.get(key) || (col === 0 ? names.get(key) : null);
      return element("td", {}, target ? entryLink(target, value) : value);
    })
  )));
  wrapper.append(element("table", {}, head, body));
  return wrapper;
}

const xp = [0, 0];
let points = 0;
for (let level = 1; level < 99; level++) {
  points += Math.floor(level + 300 * 2 ** (level / 7));
  xp.push(10 * Math.floor(points / 4));
}

function calculator() {
  const field = (label, attrs) => {
    const input = element("input", {type:"number", ...attrs});
    return [element("label", {}, label, input), input];
  };
  const [startLabel, start] = field("Start level", {min:"1", max:"99", step:"1", value:"1", required:""});
  const [targetLabel, target] = field("Target level", {min:"1", max:"99", step:"1", value:"20", required:""});
  const [currentLabel, current] = field("Current XP (optional)", {min:"0", step:"1", placeholder:"Use start level"});
  const [rateLabel, rate] = field("XP per action (optional)", {min:"0", step:"any", placeholder:"e.g. 40"});
  const output = element("output", {class:"calc-result", "aria-live":"polite"});
  const fields = element("div", {class:"calc-inputs"}, startLabel, targetLabel, currentLabel, rateLabel);
  const update = () => {
    const from = start.valueAsNumber;
    const to = target.valueAsNumber;
    if (!start.validity.valid || !target.validity.valid || to < from) {
      output.textContent = "Enter levels from 1 to 99, with a target at or above the start level.";
      return;
    }
    const baseline = current.value === "" ? xp[from] : current.valueAsNumber;
    if (!current.validity.valid || Number.isNaN(baseline) || baseline < xp[from]) {
      output.textContent = "Enter a whole current XP value at or above the start level’s threshold.";
      return;
    }
    if (!rate.validity.valid || (rate.value !== "" && !(rate.valueAsNumber > 0))) {
      output.textContent = "Enter a positive XP per action.";
      return;
    }
    const needed = Math.max(0, xp[to] - baseline);
    const count = rate.value === "" ? "" : " · " + number.format(Math.ceil(needed / rate.valueAsNumber)) + " estimated actions";
    output.textContent = number.format(needed) + " XP remaining" + count;
  };
  fields.addEventListener("input", update);
  update();
  const thresholds = renderTable({
    title:"Experience thresholds",
    columns:["Level","Total XP","XP from previous level"],
    rows: xp.slice(1).map((value,index) => [String(index + 1), number.format(value), number.format(value - xp[index])])
  });
  return element("section", {class:"calculator", "aria-label":"XP calculator inputs"}, fields, output,
    element("details", {}, element("summary", {}, "View XP thresholds"), thresholds)
  );
}

function renderLocationMap(entry) {
  const {src, width, height} = entry.mapImage;
  return element("figure", {class:"location-map"},
    element("a", {class:"location-map-image", href:src, "aria-label":`Open ${entry.title} map at full size (new tab)`, target:"_blank", rel:"noopener"},
      element("img", {src, alt:`In-game map of ${entry.title}`, width, height, decoding:"async", referrerpolicy:"no-referrer"})
    ),
    element("figcaption", {}, "Original in-game map · Select the image for full size.")
  );
}

function renderGameSprites(sprites, {title, heading = "In-game appearance"} = {}) {
  const figures = sprites.map(sprite => {
    const [x, y, width, height] = sprite.crop;
    const [imageWidth, imageHeight] = sprite.size;
    const longestSide = Math.max(width, height);
    const displayWidth = Math.round(width * Math.min(208, Math.max(128, longestSide)) / longestSide);
    const percent = (value, whole) => 100 * value / whole + "%";
    const layerStyle = `left:${percent(-x, width)};top:${percent(-y, height)};width:${percent(imageWidth, width)};height:${percent(imageHeight, height)}`;
    const layers = sprite.layers.map(src => element("img", {
      class:"game-sprite-layer", src, alt:"", width:imageWidth, height:imageHeight,
      decoding:"async", referrerpolicy:"no-referrer", style:layerStyle
    }));
    if (sprite.heldHand) {
      const hand = sprite.heldHand;
      const position = `left:${percent(hand.x - x, width)};top:${percent(hand.y - y, height)};width:${percent(hand.size, width)};height:${percent(hand.size, height)}`;
      layers.splice(-1, 0, element("span", {class:"game-sprite-layer", style:`${position};background:${hand.color}`}));
    }
    const label = (title || sprite.label) + " full in-game sprite" + (title && sprite.label ? " · " + sprite.label : "");
    return element("figure", {class:"game-sprite"},
      element("div", {class:"game-sprite-stage"},
        element("div", {
          class:sprite.flipped ? "game-sprite-frame flipped" : "game-sprite-frame",
          role:"img", "aria-label":label, style:`--sprite-width:${displayWidth}px;aspect-ratio:${width}/${height}`
        }, ...layers)
      ),
      ...(sprite.label ? [element("figcaption", {}, sprite.label)] : [])
    );
  });
  return element("section", {"aria-label":heading},
    element("h2", {}, heading),
    element("div", {class:"game-sprites"}, ...figures)
  );
}

function linkMentions(text, references) {
  let parts = [text];
  for (const {id, title} of references) {
    parts = parts.flatMap(part => {
      if (typeof part !== "string") return [part];
      return part.split(title).flatMap((piece, index) =>
        index === 0 ? [piece] : [entryLink(id, title), piece]
      );
    });
  }
  return parts;
}

function renderEntry(entry, category) {
  const article = element("article", {class:"article"},
    crumbs(category, entry.title)
  );
  const inlineReferences = category === "tutorials"
    ? (entry.related || []).map(id => byId.get(id)).filter(ref => ref?.category === "items" || ref?.category === "abilities")
    : [];
  const title = [
    element("h1", {}, entry.title),
    ...(entry.summary ? [element("p", {class:"intro"}, ...linkMentions(entry.summary, inlineReferences))] : [])
  ];
  const facts = entry.facts?.length ? [
    element("dl", {class:"facts"}, ...entry.facts.map(([label, value]) => element("div", {}, element("dt", {}, label), element("dd", {}, value))))
  ] : [];
  const art = entryArtwork(entry);
  if (art) {
    article.append(element("header", {class:"artwork-header"}, art, element("div", {class:"artwork-title"}, ...title), ...facts));
  } else if (entry.portrait) {
    article.append(element("header", {class:"pet-profile-header"},
      entryImage(entry.portrait.src, entry.title + " in-game icon"), element("div", {}, ...title)
    ));
  } else {
    article.append(...title);
  }
  if (entry.mapImage) article.append(...facts, renderLocationMap(entry));
  const referenceDate = entry.statsDate || entry.sourceDate;
  if (referenceDate) {
    const label = entry.statsDate ? "Game client checked " : "Beta reference · Source revised ";
    article.append(element("div", {class:"notice"}, glyph("◷"),
      element("p", {}, label, element("time", {datetime:referenceDate}, referenceDate), ". Check current in-game values.")
    ));
  }
  if (entry.indexOnly) article.append(element("p", {class:"intro"}, "Listed in the community catalog. Detailed values are still needed."));
  if (entry.calculator) article.append(calculator());
  if (!art && !entry.mapImage) article.append(...facts);
  if (entry.sprites?.length) article.append(renderGameSprites(entry.sprites, {title:entry.title}));
  for (const [heading, text] of entry.sections || []) {
    article.append(element("section", {},
      element("h2", {}, ...linkMentions(heading, inlineReferences)),
      element("p", {}, ...linkMentions(text, inlineReferences))
    ));
  }
  for (const table of entry.tables || []) {
    if (!table.rows.length && table.empty) {
      article.append(element("section", {}, element("h2", {}, table.title), element("p", {}, table.empty)));
      continue;
    }
    const showPetLinks = entry.id === "pets";
    const content = renderTable(table, table.related || entry.related, showPetLinks ? petLinks : undefined);
    if (table.collapsed) {
      article.append(element("details", {class:"table-disclosure"}, element("summary", {}, table.title), content));
      continue;
    }
    article.append(element("section", {},
      element("h2", {}, table.title || "Reference"),
      ...(table.description ? [element("p", {}, table.description)] : []),
      content
    ));
  }
  if (entry.npcSprites?.length) article.append(renderGameSprites(entry.npcSprites, {heading:"NPC appearances"}));
  const relatedTutorials = tutorials.filter(tutorial => tutorial.related?.includes(entry.id));
  const related = [...new Set([...(entry.related || []), ...relatedTutorials.map(tutorial => tutorial.id)])].filter(id => byId.has(id));
  if (related.length) {
    article.append(element("section", {}, element("h2", {}, "Related entries"),
      element("div", {class:"related"}, ...related.map(id => entryLink(id, null, "button")))
    ));
  }
  const sources = [...(entry.sources || [
    [entry.sourceTitle + " on Miraheze", entry.sourceUrl],
    ...(entry.revision ? [["Source revision " + entry.revision, "https://microscape.miraheze.org/wiki/Special:PermanentLink/" + entry.revision]] : []),
    ["Contributor history", entry.sourceUrl + "?action=history"],
    ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"]
  ])];
  if (art || entry.mapImage || entry.sprites?.length) {
    sources.push(entry.id === "steel-pickaxe"
      ? ["Archived Steel Pickaxe icon on Miraheze", "https://microscape.miraheze.org/wiki/File:Steel_Pickaxe.png"]
      : ["Microscape game artwork credits", "https://microscape.cc/credits/"]
    );
  }
  article.append(element("section", {class:"sources"}, element("h2", {}, "Sources"),
    element("ul", {}, ...sources.map(([label, href]) => element("li", {}, link(label, href))))
  ));
  main.append(article, footer());
}

function render({focus = false} = {}) {
  const [path, params] = window.location.hash.slice(1).split("?");
  if (path === "content") return;
  const [, view, id] = path.split("/");
  const entry = view === "entry" ? byId.get(id) : null;
  const category = view === "browse" && Object.hasOwn(groups,id) ? id : null;
  const query = new URLSearchParams(params).get("q") || "";
  const home = !view;
  const liveDrops = view === "live-drops";
  stopLiveDrops?.();
  stopLiveDrops = null;
  main.replaceChildren();
  menu.setAttribute("aria-expanded","false");
  const currentCategory = entry?.id === "pets" ? "pets" : entry?.category || category;
  renderNav(currentCategory, entry?.id, home, liveDrops);
  searchInput.value = view === "search" ? query : "";
  const title = entry?.title || groups[category]?.title || (liveDrops ? "Live Twitch drops" : "");
  document.title = title ? title + " · Microscape Wiki" : "Microscape Wiki";
  if (home) renderHome();
  else if (liveDrops) renderLiveDrops();
  else if (entry) renderEntry(entry, currentCategory);
  else if (view === "search" || category) renderList(category, query);
  else main.append(crumbs(null, "Page unavailable"), element("h1", {}, "Page unavailable"),
    element("p", {class:"intro"}, referenceLoadFailed ? "The reference catalog could not load." : "This entry could not be found."),
    link("Return to the wiki", "#/", "button"), footer());
  if (focus) main.focus({preventScroll:true});
}

menu.addEventListener("click", () => menu.setAttribute("aria-expanded", String(menu.getAttribute("aria-expanded") !== "true")));
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  const next = "#/search?" + new URLSearchParams({q:searchInput.value.trim()});
  if (window.location.hash === next) main.focus();
  else window.location.hash = next;
});
document.querySelector(".skip").addEventListener("click", event => {
  event.preventDefault();
  main.focus();
});
document.addEventListener("keydown", event => {
  if (event.key === "/" && !event.ctrlKey && !event.altKey && !event.metaKey && !event.target.closest("input, textarea, select, [contenteditable]")) {
    event.preventDefault();
    searchInput.focus();
  }
});

try {
  const referenceUrl = new URL("./reference.json", import.meta.url);
  referenceUrl.search = new URL(import.meta.url).search;
  const response = await fetch(referenceUrl);
  if (!response.ok) throw new Error("Reference HTTP " + response.status);
  const reference = await response.json();
  const pets = buildPetEntries(reference);
  for (const entry of [...reference, ...pets]) {
    entries.push(entry);
    byId.set(entry.id, entry);
  }
  for (const pet of pets) petLinks.set(normalize(pet.title), pet.id);
  if (petLinks.has("scales")) petLinks.set("pet scales", petLinks.get("scales"));
} catch (error) {
  referenceLoadFailed = true;
  console.error("Could not load the Microscape reference.", error);
}
entries.forEach(addToSearch);
render();
window.addEventListener("hashchange", () => {
  if (window.location.hash === "#content") return;
  render({focus:true});
  window.scrollTo(0,0);
});
