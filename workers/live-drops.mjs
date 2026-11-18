const source = "https://microscape.cc/server/tapi/live-communities";
const defaultWikiOrigin = "https://atritle.github.io";
const wikiOrigins = new Set([defaultWikiOrigin, "https://microscapewiki.com", "https://www.microscapewiki.com"]);
const feedPath = "/drops.json";
const twitchStatusPath = "/mzdunk.json";
const mzDunkChannel = "mzdunk";
const twitchStreamsUrl = "https://api.twitch.tv/helix/streams?user_login=" + mzDunkChannel;
const twitchUsersUrl = "https://api.twitch.tv/helix/users?login=" + mzDunkChannel;
const eventFields = [
  ["favor", "hasFestival", "festivalRemainingMinutes"],
  ["key", "hasDungeonEvent", "dungeonEventRemainingMinutes"]
];
let twitchToken;
let mzDunkAvatar;

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
    if (!twitchStatus && url.pathname !== feedPath) return new Response("Not found", {status: 404});
    if (request.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});

    const origin = request.headers.get("Origin");
    if (origin && !wikiOrigins.has(origin)) return new Response("Origin not allowed", {status: 403, headers: {Vary: "Origin"}});
    const headers = {"X-Content-Type-Options": "nosniff"};

    // Share each endpoint's response across wiki origins and ignore query parameters.
    const cache = globalThis.caches?.default;
    const key = new Request(new URL(url.pathname, url.origin));
    let response = await cache?.match(key).catch(() => undefined);
    if (!response) {
      try {
        if (twitchStatus && (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET)) {
          response = Response.json({error: "Twitch status is not configured."}, {
            status: 503, headers: {...headers, "Cache-Control": "no-store"}
          });
        } else {
          const snapshot = twitchStatus ? await fetchTwitchStatus(env) : await fetchSnapshot(8_000);
          response = Response.json(snapshot, {headers: {...headers, "Cache-Control": "public, max-age=60"}});
          if (cache) context.waitUntil(cache.put(key, response.clone()).catch(() => {}));
        }
      } catch (error) {
        const service = twitchStatus ? "Twitch status" : "Microscape streams";
        console.error(`${service} request failed:`, error.message);
        response = Response.json({error: `${service} temporarily unavailable.`}, {
          status: 502, headers: {...headers, "Cache-Control": "no-store"}
        });
      }
    }

    const result = new Response(response.body, response);
    result.headers.set("Access-Control-Allow-Origin", origin || defaultWikiOrigin);
    result.headers.append("Vary", "Origin");
    return result;
  }
};
