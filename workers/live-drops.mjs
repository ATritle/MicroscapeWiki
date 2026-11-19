const source = "https://microscape.cc/server/tapi/live-communities";
const defaultWikiOrigin = "https://atritle.github.io";
const wikiOrigins = new Set([defaultWikiOrigin, "https://microscapewiki.com", "https://www.microscapewiki.com"]);
const feedPath = "/drops.json";
const twitchStatusPath = "/mzdunk.json";
const playerPath = "/player.json";
const playerSearchPath = "/player-search.json";
const mzDunkChannel = "mzdunk";
const twitchStreamsUrl = "https://api.twitch.tv/helix/streams?user_login=" + mzDunkChannel;
const twitchUsersUrl = "https://api.twitch.tv/helix/users?login=" + mzDunkChannel;
const eventFields = [
  ["favor", "hasFestival", "festivalRemainingMinutes"],
  ["key", "hasDungeonEvent", "dungeonEventRemainingMinutes"]
];
let twitchToken;
let mzDunkAvatar;

export class PlayerLookupError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

export function validPlayerUsername(username) {
  return typeof username === "string" && /^[a-zA-Z0-9_]{1,25}$/.test(username);
}

export function nameDistance(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const rows = Array.from({length:a.length + 1}, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) rows[i][0] = i;
  for (let j = 0; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
  }
  return rows[a.length][b.length];
}

export async function fetchPlayerSuggestions(query) {
  if (!validPlayerUsername(query) || query.length < 2) throw new PlayerLookupError("Type at least two letters, numbers or underscores.", 400);
  query = query.toLowerCase();
  async function search(fragment) {
    const url = new URL("https://microwiki.mhmm.pl/api/leaderboard/search");
    url.searchParams.set("q", fragment);
    const response = await fetch(url, {signal:AbortSignal.timeout(4_000)});
    if (!response.ok) throw new PlayerLookupError("Name suggestions are temporarily unavailable. You can still look up a full username.");
    const body = await response.json();
    if (!Array.isArray(body.results)) throw new PlayerLookupError("Name suggestions are temporarily unavailable.");
    return body.results.slice(0, 50).map(player => player?.displayName).filter(validPlayerUsername);
  }
  let names = await search(query);
  if (!names.length && query.length >= 4) {
    const fragments = [...new Set([query.slice(0, 3), query.slice(Math.floor((query.length - 3) / 2), Math.floor((query.length - 3) / 2) + 3)])];
    const extra = await Promise.allSettled(fragments.map(search));
    if (extra.every(result => result.status === "rejected")) throw new PlayerLookupError("Name suggestions are temporarily unavailable. You can still look up a full username.");
    names = extra.filter(result => result.status === "fulfilled").flatMap(result => result.value)
      .filter(name => nameDistance(name, query) <= Math.min(4, Math.max(1, Math.floor(query.length / 3))));
  }
  const unique = [...new Map(names.map(name => [name.toLowerCase(), name])).values()];
  const score = name => name.toLowerCase() === query ? -2 : name.toLowerCase().startsWith(query) ? -1 : nameDistance(name, query);
  unique.sort((a, b) => score(a) - score(b) || a.localeCompare(b));
  return {checkedAt:Date.now(), results:unique.slice(0, 8).map(name => ({name}))};
}

async function resolveTwitchPlayer(username, env) {
  let token = await getTwitchToken(env);
  let response = await fetchTwitch("https://api.twitch.tv/helix/users?login=" + encodeURIComponent(username), env, token);
  if (response.status === 401) {
    if (twitchToken?.value === token) twitchToken = undefined;
    token = await getTwitchToken(env);
    response = await fetchTwitch("https://api.twitch.tv/helix/users?login=" + encodeURIComponent(username), env, token);
  }
  if (!response.ok) throw new PlayerLookupError("Player lookup is temporarily unavailable.");
  const body = await response.json();
  return body.data?.find(user => user?.login?.toLowerCase() === username.toLowerCase())?.id;
}

export async function fetchPlayerSnapshot(username, env, resolveUsername = resolveTwitchPlayer) {
  if (!validPlayerUsername(username)) throw new PlayerLookupError("Enter a username using up to 25 letters, numbers or underscores.", 400);
  const id = await resolveUsername(username.toLowerCase(), env);
  if (!id) throw new PlayerLookupError("No player was found with that exact username. Check the spelling and try again.", 404);
  if (!/^[0-9]{1,25}$/.test(id)) throw new PlayerLookupError("The player could not be identified.");
  const url = new URL("https://microscape.cc/server/tapi/character-by-id");
  url.searchParams.set("input", JSON.stringify({characterId:id}));
  const response = await fetch(url, {signal:AbortSignal.timeout(8_000), cache:"no-store"});
  if (response.status === 404) throw new PlayerLookupError("That channel does not have a public Microscape character.", 404);
  if (!response.ok) throw new PlayerLookupError("Microscape could not return the player profile. Please try again.");
  const body = await response.json();
  const raw = body?.result?.data;
  if (!raw || raw.id !== id || typeof raw.name !== "string" || !raw.exp || !raw.equipment) {
    throw new PlayerLookupError("A public Microscape profile is not available for that player.", 404);
  }
  const exp = Object.fromEntries(Object.entries(raw.exp).filter(([key, value]) =>
    /^[a-zA-Z]{1,24}$/.test(key) && Number.isFinite(value) && value >= 0));
  const equipment = Object.fromEntries(Object.entries(raw.equipment).filter(([key, value]) =>
    /^[a-zA-Z0-9]{1,24}$/.test(key) && typeof value === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(value)));
  // Public profiles return identical example live-state fields across players.
  // Keep only verified public profile data; see the November 19 status audit.
  return {checkedAt:Date.now(), player:{
    id, name:raw.name, exp, equipment, isMember:raw.isMember === true,
    liveStatusAvailable:false, location:null, activity:null, hp:null, maxHp:null
  }};
}

function twitchAvatarUrl(url) {
  return typeof url === "string"
    && /^https:\/\/static-cdn\.jtvnw\.net\/jtv_user_pictures\/[a-zA-Z0-9._-]+$/.test(url) ? url : null;
}

function streamDetails(row) {
  const channel = /^https:\/\/(?:www\.)?twitch\.tv\/([a-z0-9_]{1,25})\/?$/i.exec(row.streamUrl)?.[1];
  if (!channel || typeof row.displayName !== "string" || !row.displayName.trim()) return null;

  const avatarUrl = twitchAvatarUrl(row.imgUrl);
  return {
    channel: channel.toLowerCase(),
    name: row.displayName,
    ...(avatarUrl ? {avatarUrl} : {})
  };
}

export function makeSnapshot(rows, checkedAt = Date.now()) {
  if (!Array.isArray(rows) || rows.some(row => typeof row?.live !== "boolean")) {
    throw new Error("Microscape returned an unexpected communities list.");
  }

  const events = [];
  const energyCandidates = [];
  let mzDunkStream;
  for (const row of rows) {
    if (!row.live) continue;
    const stream = streamDetails(row);
    if (stream?.channel === mzDunkChannel) mzDunkStream = {...stream, name:"MzDunk"};
    // Microscape shows 1.3x for member channels that aren't long-running.
    if (stream && row.isMemberChannel === true && !row.lr) {
      energyCandidates.push({stream, players: row.clampedLivePlayers ?? 0});
    }

    for (const [type, activeField, timeField] of eventFields) {
      if (row[activeField] !== true) continue;
      const minutes = row[timeField];
      if (minutes === 0) continue;
      if (!stream) {
        throw new Error("Microscape returned an active event without a Twitch channel.");
      }
      events.push({
        type,
        ...stream,
        endsAt: Number.isFinite(minutes) && minutes > 0 ? checkedAt + minutes * 60_000 : null,
        ...(type === "key" && row.isMemberChannel === true ? {doubleKeys: true} : {})
      });
    }
  }

  const ranked = energyCandidates.sort((a, b) => {
    const priority = Number(b.stream.channel === mzDunkChannel) - Number(a.stream.channel === mzDunkChannel);
    return priority || b.players - a.players;
  });
  const unique = new Map();
  // Give the wiki three Energy channels in addition to its featured channel.
  const limit = ranked[0]?.stream.channel === mzDunkChannel ? 4 : 3;
  for (const {stream} of ranked) {
    if (!unique.has(stream.channel)) unique.set(stream.channel, stream);
    if (unique.size === limit) break;
  }
  const energyStreams = [...unique.values()];
  return {checkedAt, events, energyStreams, ...(mzDunkStream ? {mzDunkStream} : {})};
}

export async function fetchSnapshot(timeout = 15_000) {
  const response = await fetch(source, {cache: "no-store", signal: AbortSignal.timeout(timeout)});
  if (!response.ok) throw new Error("Microscape returned HTTP " + response.status);
  const body = await response.json();
  return makeSnapshot(body?.result?.data);
}

async function getTwitchToken(env) {
  if (twitchToken?.expiresAt > Date.now() + 60_000) return twitchToken.value;
  const response = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials"
    }),
    signal: AbortSignal.timeout(2_500)
  });
  if (!response.ok) throw new Error("Twitch token HTTP " + response.status);
  const body = await response.json();
  if (typeof body.access_token !== "string" || !Number.isFinite(body.expires_in)) {
    throw new Error("Invalid Twitch token response.");
  }
  twitchToken = {value: body.access_token, expiresAt: Date.now() + body.expires_in * 1_000};
  return twitchToken.value;
}

function fetchTwitch(url, env, token) {
  return fetch(url, {
    headers: {"Client-Id": env.TWITCH_CLIENT_ID, Authorization: "Bearer " + token},
    signal: AbortSignal.timeout(2_500)
  });
}

async function readMzDunkAvatar(env, token) {
  if (mzDunkAvatar?.expiresAt > Date.now()) return mzDunkAvatar.url;
  try {
    const response = await fetchTwitch(twitchUsersUrl, env, token);
    if (response.ok) {
      const body = await response.json();
      const user = body.data?.find(user => user?.login === mzDunkChannel);
      const url = twitchAvatarUrl(user?.profile_image_url);
      if (url) mzDunkAvatar = {url, expiresAt: Date.now() + 60 * 60_000};
    }
  } catch {
    // A profile lookup failure should never hide an active stream.
  }
  return mzDunkAvatar?.url;
}

async function fetchTwitchStatus(env) {
  let token = await getTwitchToken(env);
  let response = await fetchTwitch(twitchStreamsUrl, env, token);
  if (response.status === 401) {
    if (twitchToken?.value === token) twitchToken = undefined;
    token = await getTwitchToken(env);
    response = await fetchTwitch(twitchStreamsUrl, env, token);
  }
  if (!response.ok) throw new Error("Twitch streams HTTP " + response.status);
  const body = await response.json();
  if (!Array.isArray(body.data)) throw new Error("Invalid Twitch streams response.");
  const live = body.data.some(stream => stream?.user_login === mzDunkChannel && stream.type === "live");
  const avatarUrl = await readMzDunkAvatar(env, token);
  return {
    checkedAt: Date.now(),
    ...(!live && avatarUrl ? {avatarUrl} : {}),
    stream: live ? {channel: mzDunkChannel, name: "MzDunk", ...(avatarUrl ? {avatarUrl} : {})} : null
  };
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const twitchStatus = url.pathname === twitchStatusPath;
    const playerLookup = url.pathname === playerPath;
    const playerSearch = url.pathname === playerSearchPath;
    if (!twitchStatus && !playerLookup && !playerSearch && url.pathname !== feedPath) return new Response("Not found", {status: 404});
    if (request.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});

    const origin = request.headers.get("Origin");
    if (origin && !wikiOrigins.has(origin)) return new Response("Origin not allowed", {status: 403, headers: {Vary: "Origin"}});
    const headers = {"X-Content-Type-Options": "nosniff"};
    const username = url.searchParams.get("username")?.trim().toLowerCase();
    const query = url.searchParams.get("query")?.trim().toLowerCase();
    if ((playerLookup && !validPlayerUsername(username)) || (playerSearch && (!validPlayerUsername(query) || query.length < 2))) {
      return Response.json({error:playerSearch ? "Type at least two letters, numbers or underscores." : "Enter a username using up to 25 letters, numbers or underscores."}, {
        status:400, headers:{...headers, "Cache-Control":"no-store", "Access-Control-Allow-Origin":origin || defaultWikiOrigin, Vary:"Origin"}
      });
    }

    // Public profiles must have a separate cache key for each normalized username.
    const cache = globalThis.caches?.default;
    const cacheUrl = new URL(url.pathname, url.origin);
    if (playerLookup) cacheUrl.searchParams.set("username", username);
    if (playerSearch) cacheUrl.searchParams.set("query", query);
    const key = new Request(cacheUrl);
    let response = await cache?.match(key).catch(() => undefined);
    if (!response) {
      try {
        if ((twitchStatus || playerLookup) && (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET)) {
          response = Response.json({error:playerLookup ? "Player lookup is not configured." : "Twitch status is not configured."}, {
            status: 503, headers: {...headers, "Cache-Control": "no-store"}
          });
        } else {
          const snapshot = playerSearch ? await fetchPlayerSuggestions(query) : playerLookup ? await fetchPlayerSnapshot(username, env)
            : twitchStatus ? await fetchTwitchStatus(env) : await fetchSnapshot(8_000);
          response = Response.json(snapshot, {headers: {...headers, "Cache-Control": playerLookup ? "public, max-age=30" : "public, max-age=60"}});
          if (cache) context.waitUntil(cache.put(key, response.clone()).catch(() => {}));
        }
      } catch (error) {
        const service = playerSearch ? "Name suggestions" : playerLookup ? "Player lookup" : twitchStatus ? "Twitch status" : "Microscape streams";
        console.error(`${service} request failed:`, error.message);
        response = Response.json({error: error instanceof PlayerLookupError ? error.message : `${service} temporarily unavailable.`}, {
          status: error instanceof PlayerLookupError ? error.status : 502, headers: {...headers, "Cache-Control": "no-store"}
        });
      }
    }

    const result = new Response(response.body, response);
    result.headers.set("Access-Control-Allow-Origin", origin || defaultWikiOrigin);
    result.headers.append("Vary", "Origin");
    return result;
  }
};
