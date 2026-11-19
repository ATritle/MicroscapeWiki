const apiUrl = ["localhost", "127.0.0.1"].includes(window.location.hostname)
  ? new URL("/api/player.json", window.location.origin)
  : new URL("https://microscape-wiki-api.pages.dev/player.json");
const suggestionUrl = new URL("player-search.json", apiUrl);
const format = new Intl.NumberFormat("en");
const displayName = text => String(text || "").replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, value => value.toUpperCase());
let referenceRequest;
function readReference() {
  referenceRequest ||= fetch(new URL("./player-reference.json?v=player-lookup-20261119", import.meta.url)).then(response => {
    if (!response.ok) throw Error("Could not load the player reference artwork.");
    return response.json();
  }).catch(error => {referenceRequest = null; throw error;});
  return referenceRequest;
}

export function xpThreshold(level) {
  let points = 0;
  for (let n = 1; n < level; n++) points += Math.floor(n + 300 * 2 ** (n / 7));
  return Math.floor(points / 4) * 10;
}
export function skillLevel(xp) {
  let level = 1;
  while (level < 999 && xpThreshold(level + 1) <= xp) level++;
  return level;
}
export function playerStats(exp) {
  const levels = Object.fromEntries(Object.entries(exp).map(([id, xp]) => [id, skillLevel(xp)]));
  return {
    levels, totalLevel:Object.values(levels).reduce((sum, level) => sum + level, 0),
    totalXp:Object.values(exp).reduce((sum, xp) => sum + xp, 0),
    combatLevel:Math.floor((Math.max(((levels.attack || 1) + (levels.strength || 1)) / 2,
      levels.evilMagic || 1, levels.ranged || 1) + (levels.defense || 1)) / 2)
  };
}

export function appearanceLayers(equipment, data) {
  const order = {skin:0, feet:1, hands:1, body:2, cape:3, hair:3, head:4, shield:5, weapon:6};
  return Object.entries(equipment).filter(([slot]) => slot in order && !(slot === "hair" && equipment.head))
    .sort(([a], [b]) => order[a] - order[b])
    .map(([slot, id]) => ({slot, id, src:data.equipment[id]}));
}
export function appearanceOffset(layers, data) {
  const bounds = layers.map(layer => data.artworkBounds?.[layer.id]).filter(Boolean);
  if (!bounds.length) return [0, 0];
  const left = Math.min(...bounds.map(box => box[0])), top = Math.min(...bounds.map(box => box[1]));
  const right = Math.max(...bounds.map(box => box[2])), bottom = Math.max(...bounds.map(box => box[3]));
  return [Math.round(64 - (left + right) / 2), Math.round(64 - (top + bottom) / 2)];
}
export function activityDetails(activity, data) {
  if (!activity) return {label:"No activity reported"};
  if (activity.kind === "travel") return {label:"Traveling to " + (data.locations[activity.destination]?.name || displayName(activity.destination) || "another area")};
  if (activity.kind === "banking") return {label:"Clearing out the loot bag"};
  const record = data.activities[activity.skill + "/" + activity.id];
  const foe = activity.mob && data.foes[activity.mob];
  const target = foe ? "Fighting " + displayName(foe.name) : displayName(record?.name || activity.id) || "Activity not reported";
  const prefix = activity.kind === "preparing" ? "Preparing · " : activity.kind === "queued" ? "Queued · " : "";
  return {label:prefix + target, skill:activity.skill, foeId:foe?.wikiId};
}
const images = new Map();
function readImage(src) {
  if (!images.has(src)) images.set(src, new Promise((resolve, reject) => {
    const image = new Image();
    image.referrerPolicy = "no-referrer";
    image.onload = () => resolve(image);
    image.onerror = () => {images.delete(src); reject(Error("Artwork unavailable"));};
    image.src = src;
  }));
  return images.get(src);
}
async function paintPlayer(canvas, equipment, data) {
  const layers = appearanceLayers(equipment, data);
  const loaded = await Promise.all(layers.map(async layer => {
    try {return {...layer, image:layer.src ? await readImage(layer.src) : null};}
    catch {return {...layer, image:null};}
  }));
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, 128, 128);
  const [offsetX, offsetY] = appearanceOffset(loaded.filter(layer => layer.image), data);
  context.save();
  context.translate(offsetX, offsetY);
  let hand;
  for (const layer of loaded) if (!["weapon", "shield"].includes(layer.slot) && data.handSamples[layer.id]) hand = data.handSamples[layer.id];
  for (const layer of loaded) {
    if (layer.slot === "weapon" && hand) {
      context.fillStyle = "rgba(" + hand.slice(0, 3).join(",") + "," + hand[3] / 255 + ")";
      context.fillRect(68, 68, 4, 4);
    }
    if (!layer.image) continue;
    context.save();
    if (layer.slot === "shield") {
      context.translate(54, 76);
      context.rotate(-Math.PI / 180);
      context.translate(-54, -76);
    }
    context.drawImage(layer.image, 0, 0, 128, 128);
    context.restore();
  }
  context.restore();
  return loaded.length > 0 && loaded.every(layer => layer.image);
}

export function renderPlayerLookup({main, element:e, crumbs, footer, byId, entryUrl, renderSpriteFrame, initialName = ""}) {
  let controller, disposed = false, requestNumber = 0, currentName = "", lastSnapshot;
  let suggestionController, suggestionTimer, suggestionNumber = 0;
  const heading = e("h1", {id:"page-title"}, "Player lookup");
  const status = e("p", {class:"player-lookup-status", role:"status", "aria-live":"polite"});
  const input = e("input", {id:"player-username", name:"username", type:"text", placeholder:"e.g. User12345",
    autocomplete:"off", autocapitalize:"none", spellcheck:"false", maxlength:"25", required:"", "aria-describedby":"player-username-help"});
  input.value = initialName;
  const submit = e("button", {class:"button primary", type:"submit"}, "Look up player", e("span", {"aria-hidden":"true"}, "→"));
  const form = e("form", {class:"player-lookup-form"},
    e("label", {for:"player-username"}, "In-game / Twitch username"),
    e("div", {class:"player-search-row"}, input, submit),
    e("small", {id:"player-username-help"}, "Type part of a name or choose a match. No sign-in needed.")
  );
  const suggestions = e("div", {class:"player-suggestions", hidden:"", role:"region", "aria-label":"Player name suggestions"});
  form.append(suggestions);
  const results = e("div", {class:"player-lookup-results", "aria-busy":"false"});
  const empty = e("div", {class:"player-lookup-empty"},
    e("span", {class:"player-empty-icon", "aria-hidden":"true"}, "⌕"),
    e("h2", {}, "Find your adventurer"),
    e("p", {}, "See skill levels, equipped gear and where a character is training—all in one place."),
    e("button", {type:"button", class:"button"}, "Try User12345")
  );
  empty.querySelector("button").addEventListener("click", () => {input.value = "User12345"; lookup(input.value);});
  results.append(empty);
  main.append(e("article", {class:"player-lookup-page"}, crumbs(null, "Player lookup"), heading,
    e("p", {class:"intro"}, "An adventurer’s skills, gear and journey. Look up a player to see their public game profile."),
    form, status, results), footer());

  function clearSuggestions() {
    clearTimeout(suggestionTimer);
    suggestionController?.abort();
    suggestionNumber++;
    suggestions.hidden = true;
    suggestions.replaceChildren();
  }
  async function suggest(name) {
    const query = name.trim();
    clearSuggestions();
    if (!/^[a-zA-Z0-9_]{2,25}$/.test(query)) return;
    const version = suggestionNumber;
    suggestionController = new AbortController();
    suggestions.hidden = false;
    suggestions.replaceChildren(e("p", {role:"status"}, "Finding matching players…"));
    try {
      const url = new URL(suggestionUrl);
      url.searchParams.set("query", query);
      const response = await fetch(url, {credentials:"omit", signal:AbortSignal.any([suggestionController.signal, AbortSignal.timeout(10_000)])});
      const body = await response.json();
      if (disposed || version !== suggestionNumber) return;
      if (!response.ok || !Array.isArray(body.results)) throw Error("Name suggestions are temporarily unavailable. You can still look up a full username.");
      const names = body.results.slice(0, 8).map(player => player?.name).filter(name => /^[a-zA-Z0-9_]{1,25}$/.test(name));
      const buttons = names.map(name => {
        const button = e("button", {type:"button", class:"player-suggestion"}, e("span", {}, name), e("span", {"aria-hidden":"true"}, "→"));
        button.addEventListener("click", () => {input.value = name; lookup(name);});
        return button;
      });
      buttons.forEach((button, index) => button.addEventListener("keydown", event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : buttons.length - 1)) % buttons.length].focus();
        } else if (event.key === "Escape") {event.preventDefault(); clearSuggestions(); input.focus();}
      }));
      suggestions.replaceChildren(e("p", {role:"status"}, names.length ? "Matching players · select a name" : "No matching names found. Try another spelling or enter the full username."), ...buttons);
    } catch (error) {
      if (disposed || version !== suggestionNumber) return;
      suggestions.replaceChildren(e("p", {role:"status"}, "Name suggestions are temporarily unavailable. You can still look up a full username."));
    }
  }
  input.addEventListener("input", () => {
    clearSuggestions();
    suggestionTimer = setTimeout(() => suggest(input.value), 350);
  });
  input.addEventListener("keydown", event => {
    if (event.key === "Escape") clearSuggestions();
    if (event.key === "ArrowDown" && suggestions.querySelector("button")) {event.preventDefault(); suggestions.querySelector("button").focus();}
  });

  function wikiLink(label, id, attributes = {}) {
    return id && byId.has(id) ? e("a", {href:entryUrl(id), ...attributes}, label) : e("span", attributes, label);
  }
  function icon(src, className = "player-item-icon") {
    return src ? e("img", {class:className, src, alt:"", width:32, height:32, referrerpolicy:"no-referrer", loading:"lazy"})
      : e("span", {class:className, "aria-hidden":"true"}, "◇");
  }
  function result(snapshot, data) {
    const {player} = snapshot, stats = playerStats(player.exp);
    const canvas = e("canvas", {width:128, height:128, role:"img",
      "aria-label":player.name + " in-game appearance with current equipped gear"});
    const artNote = e("p", {class:"player-art-note", hidden:""});
    const artStage = e("div", {class:"player-appearance"},
      e("div", {class:"player-sprite-stage"}, canvas), artNote);
    const pet = data.pets[player.equipment.pet];
    if (pet?.sprite) artStage.firstChild.append(e("span", {class:"player-pet", role:"img", "aria-label":pet.name}, renderSpriteFrame(pet.sprite)));
    const metric = (label, value) => e("div", {}, e("dt", {}, label), e("dd", {}, value));
    const health = player.hp !== null && player.maxHp > 0 ? Math.max(0, Math.min(100, player.hp / player.maxHp * 100)) : null;
    const hero = e("section", {class:"player-profile-hero", "aria-label":player.name + " profile"},
      artStage, e("div", {class:"player-profile-identity"},
        e("p", {class:"player-eyebrow"}, "ADVENTURER PROFILE"),
        e("div", {class:"player-name-row"}, e("h2", {}, player.name),
          ...(player.isMember ? [e("span", {class:"player-member-badge"}, "❖ Member")] : [])),
        e("dl", {class:"player-headline-stats"},
          metric("Combat level", String(stats.combatLevel)), metric("Total level", format.format(stats.totalLevel)),
          metric("Total XP", format.format(stats.totalXp))),
        e("div", {class:"player-health"},
          e("div", {}, e("span", {}, "Hitpoints"), e("strong", {}, health === null ? "Not reported" : player.hp + " / " + player.maxHp)),
          ...(health === null ? [] : [e("span", {class:"player-health-track", role:"meter",
            "aria-label":"Hitpoints", "aria-valuemin":"0", "aria-valuemax":String(player.maxHp), "aria-valuenow":String(player.hp)},
            e("span", {style:"width:" + health + "%"}))]))
      )
    );
    const location = data.locations[player.location];
    const activity = player.activity;
    const activityInfo = activityDetails(activity, data);
    const skill = data.skills.find(skill => skill.id === activity?.skill);
    const where = e("section", {class:"player-whereabouts", "aria-label":"Location and activity"},
      e("div", {class:"player-location-card"},
        ...(location?.map ? [e("img", {src:location.map.src, alt:"", class:"player-location-map", width:150, height:90, loading:"lazy"})] : []),
        e("div", {}, e("span", {class:"player-eyebrow"}, "CURRENT LOCATION"),
          wikiLink(location?.name || displayName(player.location) || "Not reported", location?.wikiId, {class:"player-place-name"}))),
      e("div", {class:"player-activity-card"},
        icon(skill?.icon, "player-activity-icon"),
        e("div", {}, e("span", {class:"player-eyebrow"}, "CURRENT ACTIVITY"),
          wikiLink(activityInfo.label, activityInfo.foeId, {class:"player-place-name"}),
          e("small", {}, skill ? skill.name : "Last reported by the game")))
    );
    const skills = e("section", {class:"player-panel", "aria-labelledby":"player-skills-heading"},
      e("div", {class:"player-panel-heading"}, e("h2", {id:"player-skills-heading"}, "Skills"),
        e("span", {}, data.skills.length + " skills")),
      e("p", {class:"player-panel-caption"}, "Base levels and XP. Temporary boosts are not included."),
      e("div", {class:"player-skills-grid"}, ...data.skills.map(skill => {
        const xp = player.exp[skill.id] || 0, level = stats.levels[skill.id] || 1;
        const start = xpThreshold(level), end = xpThreshold(level + 1);
        const progress = Math.max(0, Math.min(100, (xp - start) / (end - start) * 100));
        const details = e("span", {class:"player-skill-copy"}, e("span", {}, skill.name),
          e("small", {}, format.format(xp) + " XP"));
        return e("a", {class:"player-skill", href:entryUrl(skill.wikiId || skill.id),
          title:format.format(end - xp) + " XP to level " + (level + 1)},
          icon(skill.icon, "player-skill-icon"), details, e("strong", {}, String(level)),
          e("span", {class:"player-skill-progress", "aria-hidden":"true"}, e("span", {style:"width:" + progress + "%"})));
      }))
    );
    const slots = [["head","Head"],["cape","Cape"],["amulet","Amulet"],["weapon","Weapon"],
      ["shield","Shield"],["body","Body"],["hands","Hands"],["feet","Feet"],["ring","Ring"],
      ["tool","Tool"],["food","Food"],["ammo","Ammunition"],["pet","Pet"],["potion1","Potion 1"],["potion2","Potion 2"],["potion3","Potion 3"]];
    const gear = e("section", {class:"player-panel", "aria-labelledby":"player-gear-heading"},
      e("div", {class:"player-panel-heading"}, e("h2", {id:"player-gear-heading"}, "Equipped gear"),
        e("span", {}, "Select an item for details")),
      e("div", {class:"player-equipment-grid"}, ...slots.map(([slot, label]) => {
        const id = player.equipment[slot], item = data.items[id];
        const copy = e("span", {}, e("small", {}, label), e("strong", {}, id ? (byId.get(item?.wikiId)?.title || displayName(item?.name || id)) : "Not equipped"));
        const cell = e(item?.wikiId && byId.has(item.wikiId) ? "a" : "div",
          {class:"player-gear-slot" + (id ? "" : " is-empty"),
            ...(item?.wikiId && byId.has(item.wikiId) ? {href:entryUrl(item.wikiId)} : {})},
          icon(item?.icon), copy);
        return cell;
      }))
    );
    const refresh = e("button", {type:"button", class:"button player-refresh"}, "↻ Refresh");
    refresh.addEventListener("click", () => lookup(currentName, true));
    const stamp = e("div", {class:"player-result-stamp"},
      e("span", {}, "Checked " + new Date(snapshot.checkedAt).toLocaleTimeString([], {hour:"numeric", minute:"2-digit"}) + " · Refreshes every minute while open"), refresh);
    const bonuses = {};
    for (const id of Object.values(player.equipment)) {
      for (const [stat, amount] of Object.entries(data.items[id]?.bonuses || {})) {
        if (Number.isFinite(amount)) bonuses[stat] = (bonuses[stat] || 0) + amount;
      }
    }
    const bonusLabels = {autoEat:"Auto-eat threshold", eatRecovery:"Food healing", attackCooldown:"Base attack interval",
      abilitySlots:"Extra ability slots", evilMagic:"Evil Magic", goodMagic:"Good Magic"};
    const bonusPanel = e("section", {class:"player-panel player-bonuses"},
      e("h2", {}, "Equipment bonuses"),
      e("p", {class:"player-panel-caption"}, "Base item bonuses. Ability effects and temporary buffs are not included."),
      e("dl", {}, ...Object.entries(bonuses).filter(([, amount]) => amount !== 0).map(([stat, amount]) => {
        const value = stat === "attackCooldown" ? amount * 2 + "s"
          : stat === "eatRecovery" ? amount + " HP"
          : (amount > 0 ? "+" : "") + amount + (stat === "autoEat" ? " percentage points" : "");
        return metric(bonusLabels[stat] || displayName(stat), value);
      }))
    );
    results.replaceChildren(hero, where, e("div", {class:"player-detail-columns"}, skills, gear),
      ...(Object.keys(bonuses).length ? [bonusPanel] : []), stamp,
      e("p", {class:"player-public-note"}, "Public game profile. A character’s activity can continue while the player is offline."));
    paintPlayer(canvas, player.equipment, data).then(complete => {
      if (!disposed && !complete) {artNote.hidden = false; artNote.textContent = "Some appearance artwork is unavailable for this build.";}
    }).catch(() => {if (!disposed) {artNote.hidden = false; artNote.textContent = "Appearance artwork could not be loaded.";}});
  }
  async function lookup(name, refresh = false) {
    const username = name.trim();
    if (!refresh) clearSuggestions();
    if (!/^[a-zA-Z0-9_]{1,25}$/.test(username)) {
      status.textContent = "Enter a username using up to 25 letters, numbers or underscores.";
      status.dataset.state = "error";
      input.focus();
      return;
    }
    controller?.abort();
    controller = new AbortController();
    const request = ++requestNumber;
    currentName = username;
    submit.disabled = true;
    results.setAttribute("aria-busy", "true");
    status.dataset.state = "loading";
    status.textContent = refresh ? "Refreshing " + username + "…" : "Looking up " + username + "…";
    if (!refresh) {lastSnapshot = null; results.replaceChildren(e("div", {class:"player-loading"}, "Loading public player profile…"));}
    try {
      const url = new URL(apiUrl);
      url.searchParams.set("username", username);
      const [response, data] = await Promise.all([
        fetch(url, {cache:"no-store", credentials:"omit", signal:AbortSignal.any([controller.signal, AbortSignal.timeout(18_000)])}),
        readReference()
      ]);
      let snapshot;
      try {snapshot = await response.json();}
      catch {throw Error("The lookup service did not respond correctly. Please try again.");}
      if (!response.ok) {
        const error = Error(snapshot.error || "Could not load that player. Please try again.");
        error.status = response.status;
        throw error;
      }
      if (!Number.isFinite(snapshot.checkedAt) || !snapshot.player?.name || !snapshot.player.exp || !snapshot.player.equipment) throw Error("The game returned an incomplete player profile.");
      if (disposed || request !== requestNumber) return;
      lastSnapshot = snapshot;
      result(snapshot, data);
      status.dataset.state = "success";
      status.textContent = "Profile found · " + snapshot.player.name;
      const target = new URL(window.location.href);
      target.hash = "/player-lookup?" + new URLSearchParams({name:username});
      window.history.replaceState(null, "", target);
    } catch (error) {
      if (disposed || request !== requestNumber) return;
      status.dataset.state = "error";
      status.textContent = refresh && lastSnapshot ? "Couldn’t refresh. Showing the last checked profile."
        : error.name === "TimeoutError" ? "The lookup took too long. Please try again." : error.message;
      if (!lastSnapshot) results.replaceChildren(e("div", {class:"player-lookup-empty player-no-result"},
        e("h2", {}, error.status === 404 ? "Player not found" : "Couldn’t load this profile"),
        e("p", {}, error.status === 404 ? "Check the full username and try again. The player needs a public Microscape profile."
          : "Try again in a moment. A connection problem does not mean the player is offline.")));
      if (!refresh && error.status === 404) suggest(username);
    } finally {
      if (!disposed && request === requestNumber) {
        submit.disabled = false;
        results.setAttribute("aria-busy", "false");
      }
    }
  }
  form.addEventListener("submit", event => {event.preventDefault(); lookup(input.value);});
  const timer = setInterval(() => {if (!document.hidden && currentName && lastSnapshot) lookup(currentName, true);}, 60_000);
  const resume = () => {
    if (!document.hidden && lastSnapshot && Date.now() - lastSnapshot.checkedAt >= 60_000) lookup(currentName, true);
  };
  document.addEventListener("visibilitychange", resume);
  if (initialName) lookup(initialName);
  return () => {
    disposed = true;
    clearSuggestions();
    controller?.abort();
    clearInterval(timer);
    document.removeEventListener("visibilitychange", resume);
  };
}
