import { guides } from "./guides.js?v=launch-notes-20261119";
import { tutorials } from "./tutorials.js?v=beta-audit";
import { buildPetEntries } from "./pets.js?v=dwarven-cannon";
import { itemIcons, itemIconGroups } from "./item-icons.js?v=beta-audit";
import { renderPlayerLookup } from "./player-lookup.js?v=player-world-20261119";

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
const playerLookupUrl = "#/player-lookup";
const liveDropsWorkerUrl = "https://microscape-wiki-api.pages.dev/drops.json";
const mzDunkStatusUrl = new URL("mzdunk.json", liveDropsWorkerUrl).href;
const liveDropsSnapshotUrl = "https://raw.githubusercontent.com/ATritle/MicroscapeWiki/refs/heads/live-data/drops.json";
const liveDropsMaxAge = 40 * 60_000;
const mzDunkChannel = "mzdunk";
const mzDunkTwitchUrl = "https://www.twitch.tv/" + mzDunkChannel;
const mzDunkProfile = {
  channel:mzDunkChannel, name:"MzDunk",
  avatarUrl:"https://static-cdn.jtvnw.net/jtv_user_pictures/dee8469b-4733-492c-a17a-e2a4a1100630-profile_image-300x300.png"
};
const mzDunkStatusMaxAge = 10 * 60_000;
const topicOrder = ["skills", "items", "foes", "locations", "abilities", "pets", "reference"];
const featured = ["energy", "dungeons", "bazaar", "activity-queue"];
const displayCount = 36;
let referenceLoadFailed = false;
let liveDropsSnapshot;
let mzDunkTwitchStatus;
let mzDunkStatusChecked = false;
let mzDunkStatusRequest;
let liveDropsRequest;
let liveDropsFailed = false;
let liveDropsExpiry;
let renderDropResults;
let disposePlayerLookup;

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
  return icon ? new URL(icon, icon.startsWith("./") ? import.meta.url : gameAssets).href : null;
}

function entryThumbnail(entry) {
  return entry.abilityBottle || entry.portrait?.src || entry.artwork || entry.mapImage?.src
    || (entry.category === "items" ? itemIconUrl(itemIconGroups[entry.id]?.[0] || entry.id) : null);
}

function tutorialSpriteFoes(entry) {
  return (entry.spriteFoes || []).map(id => byId.get(id)).filter(foe => foe?.sprites?.length);
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
      entry.sections?.flatMap(([heading, text, {steps = []} = {}]) => [heading, text, ...steps]).join(" "),
      entry.facts?.flat().join(" "),
      entry.tables?.flatMap(table => [table.title, ...table.columns, ...table.rows.flat()]).join(" ")
    ].filter(Boolean).join(" "))
  });
}

function liveDropBadge() {
  return element("span", {class:"live-drop-badge", hidden:""},
    element("span", {"aria-hidden":"true"}, "LIVE"),
    element("span", {class:"visually-hidden"}, " Drops active")
  );
}

function renderNav(category, currentId, home, liveDrops, playerLookup) {
  const sections = [
    ["Explore", [
      ["Overview", "#/", "⌂", home],
      ["Live drops", liveDropsUrl, "◉", liveDrops],
      ["Player lookup", playerLookupUrl, "⌕", playerLookup],
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
    ...links.map(([label, href, icon, active]) => {
      const navLink = element("a", {
        class:"nav-link", href, ...(active ? {"aria-current":"page"} : {})
      }, glyph(icon), label, ...(href === liveDropsUrl ? [liveDropBadge()] : []));
      if (href !== liveDropsUrl) return navLink;
      return element("div", {class:"nav-live-drops"}, navLink,
        element("div", {class:"mzdunk-live-flydown", hidden:""},
          element("a", {class:"nav-link mzdunk-live-button", href:mzDunkTwitchUrl,
            target:"_blank", rel:"noopener noreferrer", "aria-label":"MzDunk is live on Twitch (opens in a new tab)"},
            element("span", {class:"mzdunk-live-icon", "aria-hidden":"true"}),
            element("span", {class:"mzdunk-live-label"}, "MzDunk",
              element("span", {class:"mzdunk-live-badge"}, "LIVE"))
          )
        )
      );
    })
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
    document.querySelector("#hero-scene").content.cloneNode(true),
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
        element("a", {class:"button", href:liveDropsUrl}, "Live Twitch drops", liveDropBadge())
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
        element("time", {datetime:"2026-11-19"}, "November 19, 2026"),
        element("h3", {}, "Microscape launches!"),
        element("p", {}, "Launch servers open at 9:00 PM GMT (3:00 PM CST) for a fresh start."),
        element("ul", {},
          element("li", {}, "Updated new-player experience, new pets and more uses for dungeon coins."),
          element("li", {}, "No further character wipes planned; emergency rollbacks remain possible."),
          element("li", {}, "The Bazaar restricts targeted trading. Listings can still use any price and quantity.")
        ),
        element("p", {}, entryLink("release-notes", "Launch summary and beta archive")),
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

function updateLiveDrops() {
  clearTimeout(liveDropsExpiry);
  const now = Date.now();
  const snapshot = liveDropsSnapshot && now - liveDropsSnapshot.checkedAt < liveDropsMaxAge
    ? liveDropsSnapshot : null;
  const events = snapshot?.events.filter(event => event.endsAt === null || event.endsAt > now) || [];
  const twitchStatus = mzDunkTwitchStatus && now - mzDunkTwitchStatus.checkedAt < mzDunkStatusMaxAge
    ? mzDunkTwitchStatus : null;
  const microscapeStream = snapshot && now - snapshot.checkedAt < mzDunkStatusMaxAge ? snapshot.mzDunkStream : null;
  const mzDunkStream = twitchStatus
    ? twitchStatus.stream && {...microscapeStream, ...twitchStatus.stream}
    : microscapeStream;
  const mzDunkAvatarUrl = mzDunkTwitchStatus?.stream?.avatarUrl || mzDunkTwitchStatus?.avatarUrl
    || mzDunkStream?.avatarUrl || mzDunkProfile.avatarUrl;
  const mzDunkPresence = mzDunkStream ? "live"
    : twitchStatus ? "offline"
    : mzDunkStatusChecked ? "unknown" : "checking";
  const lastKnownStream = mzDunkTwitchStatus ? mzDunkTwitchStatus.stream : liveDropsSnapshot?.mzDunkStream;
  const flydownStream = mzDunkStream || lastKnownStream;
  const mzDunkFlydown = document.querySelector(".mzdunk-live-flydown");

  for (const badge of document.querySelectorAll(".live-drop-badge")) badge.hidden = !events.length;
  if (mzDunkFlydown) {
    mzDunkFlydown.hidden = !flydownStream;
    if (flydownStream) {
      const confirmedLive = mzDunkPresence === "live";
      const badge = mzDunkFlydown.querySelector(".mzdunk-live-badge");
      badge.textContent = confirmedLive ? "LIVE" : "Checking";
      badge.dataset.status = confirmedLive ? "live" : "checking";
      mzDunkFlydown.querySelector("a").setAttribute("aria-label", confirmedLive
        ? "MzDunk is live on Twitch (opens in a new tab)"
        : "MzDunk on Twitch — checking live status (opens in a new tab)");
      const icon = mzDunkFlydown.querySelector(".mzdunk-live-icon");
      if (icon.dataset.avatar !== mzDunkAvatarUrl) {
        icon.replaceChildren(dropAvatar({...mzDunkProfile, avatarUrl:mzDunkAvatarUrl}));
        icon.dataset.avatar = mzDunkAvatarUrl;
      }
    }
  }
  renderDropResults?.(snapshot, events, now, mzDunkPresence, mzDunkAvatarUrl);

  const nextChange = Math.min(
    snapshot ? snapshot.checkedAt + liveDropsMaxAge : Infinity,
    microscapeStream ? snapshot.checkedAt + mzDunkStatusMaxAge : Infinity,
    twitchStatus ? twitchStatus.checkedAt + mzDunkStatusMaxAge : Infinity,
    ...events.map(event => event.endsAt ?? Infinity)
  );
  if (Number.isFinite(nextChange)) liveDropsExpiry = setTimeout(updateLiveDrops, nextChange - now);
}

function validTwitchStream(stream) {
  return typeof stream?.name === "string" && typeof stream.channel === "string"
    && /^[a-z0-9_]{1,25}$/.test(stream.channel);
}

async function refreshLiveDrops() {
  if (liveDropsRequest) return liveDropsRequest;
  liveDropsRequest = (async () => {
    const twitchCheck = refreshMzDunkStatus();
    try {
      let received = false;
      for (const url of [liveDropsWorkerUrl, liveDropsSnapshotUrl]) {
        try {
          const snapshot = await readLiveDrops(url);
          received = true;
          if (!liveDropsSnapshot || snapshot.checkedAt >= liveDropsSnapshot.checkedAt) {
            liveDropsSnapshot = snapshot;
          }
          if (Date.now() - snapshot.checkedAt < liveDropsMaxAge) break;
        } catch {
          // If the Worker is unavailable, try the last published GitHub snapshot.
        }
      }
      liveDropsFailed = !received;
    } finally {
      await twitchCheck;
      liveDropsRequest = null;
      updateLiveDrops();
    }
  })();
  return liveDropsRequest;
}

async function refreshMzDunkStatus() {
  if (mzDunkStatusRequest) return mzDunkStatusRequest;
  mzDunkStatusRequest = (async () => {
    try {
      mzDunkTwitchStatus = await readMzDunkStatus();
    } catch {
      // Keep the last confirmed status during a failed check.
    } finally {
      mzDunkStatusChecked = true;
      mzDunkStatusRequest = null;
      updateLiveDrops();
    }
  })();
  return mzDunkStatusRequest;
}

function resumeLiveUpdates() {
  if (document.hidden) return;
  updateLiveDrops();
  refreshMzDunkStatus();
  if (!liveDropsSnapshot || Date.now() - liveDropsSnapshot.checkedAt >= 60_000) refreshLiveDrops();
}

async function readMzDunkStatus() {
  const response = await fetch(mzDunkStatusUrl, {
    cache:"no-store", credentials:"omit", signal:AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error("Twitch status HTTP " + response.status);
  const status = await response.json();
  if (!Number.isFinite(status?.checkedAt) || (status.stream !== null &&
      !(validTwitchStream(status.stream) && status.stream.channel === mzDunkChannel))) {
    throw new Error("Invalid Twitch status.");
  }
  return status;
}

async function readLiveDrops(url) {
  const response = await fetch(url, {
    cache:"no-store", credentials:"omit", signal:AbortSignal.timeout(10_000)
  });
  if (!response.ok) throw new Error("Live drops HTTP " + response.status);
  const data = await response.json();
  const energyStreams = data?.energyStreams ?? [];
  if (!Number.isFinite(data?.checkedAt) || !Array.isArray(data.events) || data.events.some(event =>
    !validTwitchStream(event) || !["favor", "key"].includes(event.type)
    || !(event.endsAt === null || Number.isFinite(event.endsAt)))
    || !Array.isArray(energyStreams) || !energyStreams.every(validTwitchStream)) {
    throw new Error("Invalid live drops snapshot.");
  }
  const mzDunkStream = [data.mzDunkStream, ...energyStreams, ...data.events].find(stream =>
    validTwitchStream(stream) && stream.channel === mzDunkChannel);
  return {...data, energyStreams, mzDunkStream};
}

function dropAvatar(event) {
  const avatar = element("span", {class:"drop-avatar", "aria-hidden":"true"}, event.name.trim().slice(0, 1).toUpperCase());
  if (typeof event.avatarUrl === "string" && event.avatarUrl.startsWith("https://static-cdn.jtvnw.net/jtv_user_pictures/")) {
    const image = element("img", {
      src:event.avatarUrl, alt:"", width:36, height:36, referrerpolicy:"no-referrer"
    });
    image.addEventListener("error", () => image.remove(), {once:true});
    avatar.append(image);
  }
  return avatar;
}

function streamCard(stream, description, badge) {
  return element("a", {class:badge ? "entry-card mzdunk-stream-card" : "entry-card",
    href:"https://www.twitch.tv/" + stream.channel, target:"_blank", rel:"noopener noreferrer"},
    element("span", {class:"entry-card-body"}, dropAvatar(stream),
      element("span", {}, element("strong", {}, stream.name, ...(badge ? [" ", badge] : [])),
        element("small", {}, description))),
    glyph("↗", "arrow")
  );
}

function streamCards(streams, description) {
  return element("ul", {}, ...streams.map(stream => element("li", {}, streamCard(stream, description(stream)))));
}

function renderLiveDrops() {
  const updateTime = new Intl.DateTimeFormat(undefined, {dateStyle:"medium", timeStyle:"short"});
  const status = element("p", {class:"drop-status", role:"status"}, "Checking for live drops…");
  const results = element("div", {class:"drop-groups"});
  const energyResults = element("div");
  const refreshButton = element("button", {class:"button", type:"button"}, "Refresh");
  const presenceLabels = {live:"Live", offline:"Offline", checking:"Checking", unknown:"Status unavailable"};
  const featuredBadge = element("span", {class:"mzdunk-stream-badge", "aria-live":"polite"}, presenceLabels.checking);
  const featuredStream = streamCard(mzDunkProfile, "Wiki community channel", featuredBadge);
  const featuredCaption = featuredStream.querySelector("small");
  let featuredAvatarUrl = mzDunkProfile.avatarUrl;

  function eventList(type, title, empty, events, now) {
    const matches = events.filter(event => event.type === type);
    return element("section", {class:"drop-group"}, element("h2", {}, title),
      matches.length ? streamCards(matches, event => {
        const minutes = Math.ceil((event.endsAt - now) / 60_000);
        const remaining = event.endsAt === null ? "End time unavailable"
          : minutes < 60 ? `About ${minutes} min left`
          : `About ${Math.floor(minutes / 60)}h ${minutes % 60}m left`;
        return event.doubleKeys ? "2× Dungeon Keys · " + remaining : remaining;
      }) : element("p", {class:"empty"}, empty)
    );
  }

  renderDropResults = (snapshot, events, now, mzDunkPresence, mzDunkAvatarUrl) => {
    const caption = mzDunkPresence === "live" && snapshot?.energyStreams.some(stream => stream.channel === mzDunkChannel)
      ? "Wiki community channel · 1.3× Energy" : "Wiki community channel";
    if (featuredCaption.textContent !== caption) featuredCaption.textContent = caption;
    if (featuredBadge.dataset.status !== mzDunkPresence) {
      featuredBadge.dataset.status = mzDunkPresence;
      featuredBadge.textContent = presenceLabels[mzDunkPresence];
    }
    if (featuredAvatarUrl !== mzDunkAvatarUrl) {
      featuredStream.querySelector(".drop-avatar").replaceWith(dropAvatar({...mzDunkProfile, avatarUrl:mzDunkAvatarUrl}));
      featuredAvatarUrl = mzDunkAvatarUrl;
    }

    const streams = (liveDropsSnapshot?.energyStreams || []).filter(stream => stream.channel !== mzDunkChannel).slice(0, 3);
    energyResults.replaceChildren(element("section", {class:"drop-group"},
      element("h2", {}, "Top 1.3× Energy channels"),
      ...(streams.length && !snapshot
        ? [element("p", {class:"drop-status"}, "From the last update. Check Twitch to see if these channels are still live.")]
        : []),
      streams.length ? streamCards(streams, () => "1.3× Energy")
        : element("p", {class:"empty"}, !liveDropsSnapshot && !liveDropsFailed
          ? "Checking for live channels…"
          : snapshot ? "No live 1.3× Energy channels were listed." : "Energy channel data is unavailable.")
    ));

    if (!snapshot) {
      if (liveDropsSnapshot) {
        status.textContent = "Live updates are delayed. Last checked " + updateTime.format(liveDropsSnapshot.checkedAt)
          + ". Open Streams in Microscape for current events.";
      } else {
        status.textContent = liveDropsFailed ? "Couldn’t load the live streams. Open Streams in Microscape for current events."
          : "Checking for live drops…";
      }
      results.replaceChildren();
      return;
    }
    status.textContent = (liveDropsFailed ? "Refresh failed. " : "") + "Last checked " + updateTime.format(snapshot.checkedAt) + ".";
    if (!events.length) {
      results.replaceChildren(element("p", {class:"empty"}, "No live drops right now."));
      return;
    }
    events.sort((a, b) => (a.endsAt ?? Infinity) - (b.endsAt ?? Infinity) || a.name.localeCompare(b.name));
    results.replaceChildren(
      eventList("favor", "Drop Festivals", "No active festivals were listed.", events, now),
      eventList("key", "Dungeon Key events", "No active Dungeon Key events were listed.", events, now)
    );
  };

  main.append(element("article", {class:"article"}, crumbs(null, "Live Twitch drops"),
    element("h1", {}, "Live Twitch drops"),
    element("p", {class:"intro"}, "Find Twitch channels with active Audience Favor or Dungeon Key rewards, and the top streams for 1.3× Energy."),
    featuredStream,
    element("div", {class:"actions"}, refreshButton, link("Open Microscape", "https://microscape.cc/play/", "button")),
    status, results, energyResults,
    element("p", {class:"drop-help"}, entryLink("audience-favor", "How to claim Audience Favor on Twitch"), " · ",
      entryLink("dungeons", "Dungeon Keys guide"))
  ), footer());
  refreshButton.addEventListener("click", async () => {
    refreshButton.disabled = true;
    await refreshLiveDrops();
    refreshButton.disabled = false;
  });
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
      const spriteFoes = tutorialSpriteFoes(entry);
      return element("a", {class:spriteFoes.length ? "entry-card tutorial-card" : "entry-card", href:entryUrl(entry.id)},
        ...(spriteFoes.length ? [element("span", {class:"tutorial-card-sprites", "aria-hidden":"true"},
          ...spriteFoes.map(foe => renderSpriteFrame(foe.sprites[0])))] : []),
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

function renderSpriteFrame(sprite, label) {
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
  return element("span", {
    class:sprite.flipped ? "game-sprite-frame flipped" : "game-sprite-frame",
    ...(label ? {role:"img", "aria-label":label} : {}),
    style:`--sprite-width:${displayWidth}px;aspect-ratio:${width}/${height}`
  }, ...layers);
}

function renderGameSprites(sprites, {title, heading = "In-game appearance"} = {}) {
  const figures = sprites.map(sprite => {
    const label = (title || sprite.label) + " full in-game sprite" + (title && sprite.label ? " · " + sprite.label : "");
    const frame = renderSpriteFrame(sprite, label);
    const stage = sprite.foeId
      ? element("a", {class:"game-sprite-stage game-sprite-link", href:entryUrl(sprite.foeId), "aria-label":`View ${sprite.label} in Foes`},
        frame, glyph("→", "arrow"))
      : element("div", {class:"game-sprite-stage"}, frame);
    return element("figure", {class:"game-sprite"},
      stage,
      ...(sprite.label ? [element("figcaption", {}, sprite.label)] : [])
    );
  });
  return element("section", {"aria-label":heading},
    element("h2", {}, heading),
    element("div", {class:"game-sprites"}, ...figures)
  );
}

function linkMentions(text, references) {
  if (!references.length) return [text];
  const targets = new Map(references.map(({id, title}) => [title.toLowerCase(), id]));
  for (const {id, title, category} of references) {
    if (category === "foes") targets.set(title.toLowerCase() + "s", id);
  }
  const names = [...targets.keys()].sort((a, b) => b.length - a.length)
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const mentions = new RegExp(`\\b(${names.join("|")})\\b`, "gi");
  return text.split(mentions).map((part, index) => index % 2 ? entryLink(targets.get(part.toLowerCase()), part) : part);
}

function renderTutorialScreenshot(source, screenshot, references) {
  const [x, y, width, height] = screenshot.crop || [0, 0, source.width, source.height];
  const marker = screenshot.marker;
  const tile = screenshot.tile;
  return element("figure", {class:"tutorial-screenshot"},
    element("div", {class:"tutorial-screenshot-frame", style:`aspect-ratio:${width}/${height}`},
      element("img", {
        src:source.src, alt:screenshot.alt, width:source.width, height:source.height,
        loading:"lazy", decoding:"async",
        style:`left:${-100 * x / width}%;top:${-100 * y / height}%;width:${100 * source.width / width}%`
      }),
      ...(tile ? [element("span", {class:"tutorial-screenshot-tile", "aria-hidden":"true",
        style:`left:${100 * (tile.position[0] - x) / width}%;top:${100 * (tile.position[1] - y) / height}%;width:${100 * tile.size / width}%;background-image:url('${tile.frame}')`},
        element("img", {src:tile.src, alt:"", width:32, height:32})
      )] : []),
      ...(marker ? [element("span", {class:"tutorial-screenshot-marker", "aria-hidden":"true",
        style:`left:${100 * (marker[0] - x) / width}%;top:${100 * (marker[1] - y) / height}%`})] : [])
    ),
    element("figcaption", {}, ...linkMentions(screenshot.caption, references))
  );
}

function renderEntry(entry, category) {
  const article = element("article", {class:"article"},
    crumbs(category, entry.title)
  );
  const inlineReferences = category === "tutorials"
    ? (entry.related || []).map(id => byId.get(id)).filter(ref => ["items", "abilities", "foes"].includes(ref?.category))
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
  const tutorialSprites = tutorialSpriteFoes(entry).flatMap(foe => foe.sprites.map(sprite => ({
    ...sprite, foeId:foe.id, label:sprite.label ? `${foe.title} · ${sprite.label}` : foe.title
  })));
  const sprites = entry.sprites || tutorialSprites;
  if (sprites.length) article.append(renderGameSprites(sprites, {title:entry.sprites ? entry.title : undefined}));
  for (const [heading, text, {steps, screenshot} = {}] of entry.sections || []) {
    const screenshotSource = screenshot && (screenshot.source || byId.get(screenshot.mapId)?.mapImage || entry.screenshotSource);
    article.append(element("section", {},
      element("h2", {}, ...linkMentions(heading, inlineReferences)),
      element("p", {}, ...linkMentions(text, inlineReferences)),
      ...(steps ? [element("ol", {class:"tutorial-steps"},
        ...steps.map(step => element("li", {}, ...linkMentions(step, inlineReferences))))] : []),
      ...(screenshotSource ? [renderTutorialScreenshot(screenshotSource, screenshot, inlineReferences)] : [])
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
  if (art || entry.mapImage || sprites.length) {
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
  const playerLookup = view === "player-lookup";
  disposePlayerLookup?.();
  disposePlayerLookup = null;
  renderDropResults = null;
  main.replaceChildren();
  menu.setAttribute("aria-expanded","false");
  const currentCategory = entry?.id === "pets" ? "pets" : entry?.category || category;
  renderNav(currentCategory, entry?.id, home, liveDrops, playerLookup);
  searchInput.value = view === "search" ? query : "";
  const title = entry?.title || groups[category]?.title || (liveDrops ? "Live Twitch drops" : playerLookup ? "Player lookup" : "");
  document.title = title ? title + " · Microscape Wiki" : "Microscape Wiki";
  if (home) renderHome();
  else if (liveDrops) renderLiveDrops();
  else if (playerLookup) disposePlayerLookup = renderPlayerLookup({
    main, element, crumbs, footer, byId, entryUrl, renderSpriteFrame,
    initialName:new URLSearchParams(params).get("name") || ""
  });
  else if (entry) renderEntry(entry, currentCategory);
  else if (view === "search" || category) renderList(category, query);
  else main.append(crumbs(null, "Page unavailable"), element("h1", {}, "Page unavailable"),
    element("p", {class:"intro"}, referenceLoadFailed ? "The reference catalog could not load." : "This entry could not be found."),
    link("Return to the wiki", "#/", "button"), footer());
  updateLiveDrops();
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
refreshLiveDrops();
setInterval(() => { if (!document.hidden) refreshMzDunkStatus(); }, 60_000);
setInterval(() => { if (!document.hidden) refreshLiveDrops(); }, 5 * 60_000);
document.addEventListener("visibilitychange", resumeLiveUpdates);
window.addEventListener("focus", resumeLiveUpdates);
window.addEventListener("pageshow", resumeLiveUpdates);
window.addEventListener("online", resumeLiveUpdates);
window.addEventListener("hashchange", () => {
  if (window.location.hash === "#content") return;
  render({focus:true});
  window.scrollTo(0,0);
});
