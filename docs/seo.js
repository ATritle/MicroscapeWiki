export const siteOrigin = "https://microscapewiki.com";
const categoryPaths = {reference:"game-mechanics"};
export const categoryPath = category => categoryPaths[category] || category;
export const socialImagePath = pathname => "/assets/social/"+(pathname.replace(/^\/|\/$/g,"").replaceAll("/","--")||"home")+"-20261121.png";
export function entryPath(entry) {
  return "/" + categoryPath(entry.category) + "/" + encodeURIComponent(entry.id) + "/";
}
export function publicUrl(value, byId) {
  if (typeof value !== "string" || !value.startsWith("#/")) return value;
  const [path, query] = value.slice(1).split("?");
  const [, view, id] = path.split("/");
  let result;
  if (!view) result = "/";
  else if (view === "entry") {
    const entry = byId.get(id);
    if (!entry) return value;
    result = entryPath(entry);
  } else if (view === "browse") result = "/" + categoryPath(id) + "/";
  else result = "/" + view + "/";
  return result + (query ? "?" + query : "");
}
export function legacyRoute(location, byId, groups) {
  if (location.hash.startsWith("#/")) return location.hash.slice(1);
  let parts;
  try { parts = location.pathname.replace(/\/index\.html$/, "/").split("/").filter(Boolean).map(decodeURIComponent); }
  catch { return "/not-found"; }
  if (!parts.length) return "/";
  const category = Object.keys(groups).find(id => categoryPath(id) === parts[0]);
  if (category && parts.length === 2 && byId.get(parts[1])?.category === category) return "/entry/" + parts[1] + location.search;
  if (category && parts.length === 1) return "/browse/" + category + location.search;
  if (parts.length === 1 && ["live-drops","player-lookup","activity-comparison","gear-comparison","bazaar","search"].includes(parts[0])) return "/" + parts[0] + location.search;
  return "/not-found";
}
export function pageMetadata(route, byId, groups) {
  const [path, query] = route.split("?");
  const [, view, id] = path.split("/");
  const entry = view === "entry" && byId.get(id);
  const group = view === "browse" && groups[id];
  const tools = {
    "live-drops":["Live Twitch Drops", "Find active Microscape Audience Favor festivals, Dungeon Key drops and Twitch channels offering 1.3× Energy."],
    "player-lookup":["Player Lookup", "Look up a Microscape player’s public skills, stats and equipped gear."],
    "activity-comparison":["Activity Comparison", "Compare Microscape training activities using your player’s levels and gear, with estimated XP per hour, hit chances and requirements."],
    "gear-comparison":["Gear and Loadout Comparison", "Compare a Microscape player’s current equipment with a test loadout, preview gear, check requirements and estimate combat performance."],
    bazaar:["Live Bazaar", "Search Microscape Bazaar buy and sell orders, prices and trading guides."],
    search:["Search the Wiki", "Search Microscape guides, items, skills, pets, foes and locations."]
  };
  const suffix = {items:"Stats, Requirements & Sources", foes:"Stats, Locations & Drops", pets:"How to Get, Tasks & Drop Odds", skills:"Level Unlocks & Training", abilities:"Effects & Requirements", shops:"Stock, Prices & Location", locations:"Travel, Enemies & Skilling", tutorials:"Boss Guide"};
  const name = entry?.title || group?.title || tools[view]?.[0] || (!view ? "MzDunk’s Microscape Wiki" : "Page not found");
  const title = !view ? "Microscape Wiki — Guides, Items & Tools | MzDunk’s Community" : (group ? "Browse " : "") + name + (entry && suffix[entry.category] ? " — " + suffix[entry.category] : "") + " | Microscape Wiki";
  let description = entry ? name + ": " + (entry.summary || "Find " + (suffix[entry.category] || "game information and guides") + " for " + name + " in Microscape.")
    : group?.blurb || tools[view]?.[1] || "MzDunk’s Microscape community wiki: illustrated boss guides, skills, items, pets, shop prices, live Twitch drops and training tools.";
  description = description.replace(/\s+/g," ").trim();
  if (description.length < 75) description += " Explore " + (entry ? (suffix[entry.category] || "guides and game information").toLowerCase() : "guides and game information") + " in MzDunk’s Microscape community wiki.";
  if (description.length > 165) description = description.slice(0,162).replace(/\s+\S*$/, "") + "…";
  const noindex = view === "not-found" || view === "search" || view === "player-lookup" || entry?.indexOnly || new URLSearchParams(query).has("name");
  const canonical = siteOrigin + publicUrl("#" + path, byId);
  const image = new URL(!view||view==="not-found"?"/assets/twilight-village.jpg":socialImagePath(new URL(canonical).pathname),siteOrigin+"/").href;
  return {title, name, description, canonical, image, noindex:Boolean(noindex)};
}
export function updateMetadata(document, meta) {
  document.title = meta.title;
  function tag(selector, name, value, attribute="content") {
    let node = document.head.querySelector(selector);
    if (!node) { node = document.createElement(name); document.head.append(node); }
    // Selectors here contain only our fixed metadata names.
    const match = selector.match(/\[([^=]+)="([^"]+)"\]/);
    if (match) node.setAttribute(match[1],match[2]);
    node.setAttribute(attribute,value);
  }
  tag('meta[name="description"]',"meta",meta.description);
  tag('meta[name="robots"]',"meta",meta.noindex ? "noindex,follow" : "index,follow");
  tag('link[rel="canonical"]',"link",meta.canonical,"href");
  for (const [key,value] of Object.entries({title:meta.title,description:meta.description,url:meta.canonical,image:meta.image})) tag('meta[property="og:' + key + '"]',"meta",value);
  // Dimensions and alt text describing the village do not apply to every item or map.
  for (const property of ["og:image:width","og:image:height","og:image:type","og:image:alt"]) document.head.querySelector('meta[property="' + property + '"]')?.remove();
  const card=meta.image.includes("/assets/social/");
  for(const [name,value] of Object.entries({width:card?"1200":"2172",height:card?"630":"724",type:card?"image/png":"image/jpeg",alt:meta.name+" · MzDunk’s Microscape Wiki"}))tag('meta[property="og:image:'+name+'"]',"meta",value);
  tag('meta[property="og:site_name"]',"meta","MzDunk’s Microscape Wiki");
  tag('meta[name="twitter:title"]',"meta",meta.title);
  tag('meta[name="twitter:description"]',"meta",meta.description);
  tag('meta[name="twitter:image"]',"meta",meta.image);
  let schema = document.querySelector("#wiki-schema");
  if (!schema) {schema = document.createElement("script"); schema.id="wiki-schema"; schema.type="application/ld+json"; document.head.append(schema);}
  schema.textContent = JSON.stringify({"@context":"https://schema.org","@graph":[
    {"@type":"WebSite","@id":siteOrigin+"/#website",url:siteOrigin+"/",name:"MzDunk’s Microscape Wiki"},
    {"@type":"WebPage","@id":meta.canonical+"#webpage",url:meta.canonical,name:meta.name,description:meta.description,isPartOf:{"@id":siteOrigin+"/#website"},inLanguage:"en"}
  ]}).replace(/</g,"\\u003c");
}
