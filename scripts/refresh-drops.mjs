import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const source = "https://microscape.cc/server/tapi/live-communities";
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

export async function fetchSnapshot() {
  const response = await fetch(source, {cache: "no-store", signal: AbortSignal.timeout(15_000)});
  if (!response.ok) throw new Error("Microscape returned HTTP " + response.status);
  const body = await response.json();
  return makeSnapshot(body?.result?.data);
}

async function main(output) {
  if (!output) throw new Error("Provide a path for the live drops snapshot.");
  const snapshot = await fetchSnapshot();
  await writeFile(output, JSON.stringify(snapshot) + "\n");
  console.log("Recorded " + snapshot.events.length + " active Microscape events.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2]);
}
