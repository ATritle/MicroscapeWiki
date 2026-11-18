const source = "https://microscape.cc/server/tapi/live-communities";
const wikiOrigin = "https://atritle.github.io";
const feedPath = "/drops.json";
const eventFields = [
  ["favor", "hasFestival", "festivalRemainingMinutes"],
  ["key", "hasDungeonEvent", "dungeonEventRemainingMinutes"]
];

function streamDetails(row) {
  const channel = /^https:\/\/(?:www\.)?twitch\.tv\/([a-z0-9_]{1,25})\/?$/i.exec(row.streamUrl)?.[1];
  if (!channel || typeof row.displayName !== "string" || !row.displayName.trim()) return null;

  const avatarUrl = typeof row.imgUrl === "string"
    && /^https:\/\/static-cdn\.jtvnw\.net\/jtv_user_pictures\/[a-zA-Z0-9._-]+$/.test(row.imgUrl)
    ? row.imgUrl : null;
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
  for (const row of rows) {
    if (!row.live) continue;
    const stream = streamDetails(row);
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

  const ranked = energyCandidates.sort((a, b) => b.players - a.players);
  const unique = new Map();
  for (const {stream} of ranked) {
    if (!unique.has(stream.channel)) unique.set(stream.channel, stream);
    if (unique.size === 3) break;
  }
  const energyStreams = [...unique.values()];
  return { checkedAt, events, energyStreams };
}

export async function fetchSnapshot(timeout = 15_000) {
  const response = await fetch(source, {cache: "no-store", signal: AbortSignal.timeout(timeout)});
  if (!response.ok) throw new Error("Microscape returned HTTP " + response.status);
  const body = await response.json();
  return makeSnapshot(body?.result?.data);
}

export default {
  async fetch(request, _env, context) {
    const url = new URL(request.url);
    if (url.pathname !== feedPath) return new Response("Not found", {status: 404});
    if (request.method !== "GET") return new Response("Method not allowed", {status: 405, headers: {Allow: "GET"}});

    const origin = request.headers.get("Origin");
    if (origin && origin !== wikiOrigin) return new Response("Origin not allowed", {status: 403});
    const headers = {"Access-Control-Allow-Origin": wikiOrigin, "X-Content-Type-Options": "nosniff"};

    // Use one cache key for the public feed, regardless of query parameters.
    const cache = globalThis.caches?.default;
    const key = new Request(new URL(feedPath, url.origin));
    const cached = await cache?.match(key).catch(() => undefined);
    if (cached) return cached;

    try {
      const snapshot = await fetchSnapshot(8_000);
      const response = Response.json(snapshot, {headers: {...headers, "Cache-Control": "public, max-age=60"}});
      if (cache) context.waitUntil(cache.put(key, response.clone()).catch(() => {}));
      return response;
    } catch (error) {
      console.error("Cannot refresh Microscape streams:", error.message);
      return Response.json({error: "Microscape streams are temporarily unavailable."}, {
        status: 502, headers: {...headers, "Cache-Control": "no-store"}
      });
    }
  }
};
