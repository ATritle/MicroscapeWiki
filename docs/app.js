import { guides } from "./guides.js";

const groups = {
  guides: { title: "Guides", icon: "▤", blurb: "Start here, earn Energy, trade and plan dungeon runs." },
  skills: { title: "Skills", icon: "✧", blurb: "Training activities, unlocks and supplies." },
  items: { title: "Items", icon: "◇", blurb: "Browse gear, materials, food and tools." },
  foes: { title: "Foes", icon: "⚔", blurb: "Find enemies, dungeon bosses and their loot." },
  locations: { title: "Locations", icon: "⌖", blurb: "Find towns, resource spots and dungeons." },
  abilities: { title: "Abilities", icon: "ϟ", blurb: "Equipment requirements and limit break costs." },
  reference: { title: "Game mechanics", icon: "◈", blurb: "Pet maps, titles, healing and equipment bonuses." }
};

const main = document.querySelector("main");
const nav = document.querySelector("#wiki-nav");
const menu = document.querySelector("#menu-button");
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#wiki-search");
const number = new Intl.NumberFormat("en");
const topicOrder = ["skills", "items", "foes", "locations", "abilities", "reference"];
const featured = ["energy", "dungeons", "bazaar", "activity-queue"];
const displayCount = 36;
let referenceLoadFailed = false;

const entries = [...guides];
const byId = new Map(entries.map(entry => [entry.id, entry]));
const index = new Map();

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

function addToSearch(entry) {
  index.set(entry.id, {
    title: normalize(entry.title),
    full: normalize([
      entry.title, entry.group, entry.summary, groups[entry.category].title,
      entry.sections?.flat().join(" "), entry.facts?.flat().join(" "),
      entry.tables?.flatMap(table => [table.title, ...table.columns, ...table.rows.flat()]).join(" ")
    ].filter(Boolean).join(" "))
  });
}

function renderNav(category, currentId, home) {
  const sections = [
    ["Explore", [
      ["Overview", "#/", "⌂", home],
      ["Getting started", entryUrl("getting-started"), "↳", currentId === "getting-started"],
      ["All guides", categoryUrl("guides"), "▤", category === "guides" && !currentId]
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
      element("p", {class:"eyebrow"}, "MzDunk’s community wiki"),
      element("h1", {id:"page-title"}, "Microscape Wiki"),
      element("p", {}, "Player guides and reference tables for the Twitch-powered browser idle RPG."),
      element("div", {class:"actions"},
        element("a", {class:"button primary", href:entryUrl("getting-started")}, "Getting started", glyph("→", "")),
        entryLink("experience", "XP calculator", "button outline")
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
      })
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
    grid.replaceChildren(...filtered.slice(0,limit).map(entry => element("a", {class:"entry-card", href:entryUrl(entry.id)},
      element("span", {}, element("strong", {}, entry.title),
        element("small", {}, entry.summary || entry.group || groups[entry.category].title)),
      glyph("→", "arrow")
    )));
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
  if (referenceLoadFailed && category !== "guides") main.append(element("p", {class:"notice"}, "The reference catalog could not load. Refresh the page to retry."));
  if (filterBar.children.length) main.append(filterBar);
  main.append(count, grid, empty, more, footer());
}

function renderTable(table, relatedIds = []) {
  const candidates = relatedIds.map(id => byId.get(id)).filter(Boolean);
  const names = new Map(candidates.map(entry => [normalize(entry.title), entry.id]));
  const wrapper = element("div", {class:"table-wrap", role:"region", tabindex:"0", "aria-label":table.title || "Reference table"});
  const head = element("thead", {}, element("tr", {}, ...table.columns.map(col => element("th", {scope:"col"}, col))));
  const body = element("tbody", {}, ...table.rows.map(row => element("tr", {},
    ...row.map((value, col) => {
      const target = col === 0 ? names.get(normalize(value)) : null;
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

function renderEntry(entry) {
  const article = element("article", {class:"article"},
    crumbs(entry.category, entry.title),
    element("h1", {}, entry.title)
  );
  if (entry.summary) article.append(element("p", {class:"intro"}, entry.summary));
  if (entry.sourceDate) {
    article.append(element("div", {class:"notice"}, glyph("◷"),
      element("p", {}, "Beta reference · Source revised ", element("time", {datetime:entry.sourceDate}, entry.sourceDate), ". Check current in-game values.")
    ));
  }
  if (entry.indexOnly) article.append(element("p", {class:"intro"}, "Listed in the community catalog. Detailed values are still needed."));
  if (entry.calculator) article.append(calculator());
  for (const [title, text] of entry.sections || []) {
    article.append(element("section", {}, element("h2", {}, title), element("p", {}, text)));
  }
  if (entry.facts?.length) {
    article.append(element("dl", {class:"facts"}, ...entry.facts.map(([label, value]) => element("div", {}, element("dt", {}, label), element("dd", {}, value)))));
  }
  for (const table of entry.tables || []) {
    const content = renderTable(table, entry.related);
    if (table.collapsed) {
      article.append(element("details", {class:"table-disclosure"}, element("summary", {}, table.title), content));
      continue;
    }
    article.append(element("section", {},
      element("h2", {}, table.title || "Reference"),
      content
    ));
  }
  const related = (entry.related || []).filter(id => byId.has(id));
  if (related.length) {
    article.append(element("section", {}, element("h2", {}, "Related entries"),
      element("div", {class:"related"}, ...related.map(id => entryLink(id, null, "button")))
    ));
  }
  const sources = entry.sources || [
    [entry.sourceTitle + " on Miraheze", entry.sourceUrl],
    ...(entry.revision ? [["Source revision " + entry.revision, "https://microscape.miraheze.org/wiki/Special:PermanentLink/" + entry.revision]] : []),
    ["Contributor history", entry.sourceUrl + "?action=history"],
    ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"]
  ];
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
  main.replaceChildren();
  menu.setAttribute("aria-expanded","false");
  renderNav(entry?.category || category, entry?.id, home);
  searchInput.value = view === "search" ? query : "";
  document.title = entry ? entry.title + " · Microscape Wiki" : category ? groups[category].title + " · Microscape Wiki" : "Microscape Wiki";
  if (home) renderHome();
  else if (entry) renderEntry(entry);
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
  const response = await fetch(new URL("./reference.json", import.meta.url));
  if (!response.ok) throw new Error("Reference HTTP " + response.status);
  const reference = await response.json();
  for (const entry of reference) {
    entries.push(entry);
    byId.set(entry.id, entry);
  }
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
