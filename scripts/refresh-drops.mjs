import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const source = "https://microscape.cc/server/tapi/live-communities";
const eventFields = [
  ["favor", "hasFestival", "festivalRemainingMinutes"],
  ["key", "hasDungeonEvent", "dungeonEventRemainingMinutes"]
];

export function makeSnapshot(rows, checkedAt = Date.now()) {
  if (!Array.isArray(rows) || rows.some(row => typeof row?.live !== "boolean")) {
    throw new Error("Microscape returned an unexpected communities list.");
  }

  const events = [];
  for (const row of rows) {
    if (!row.live) continue;
    for (const [type, activeField, timeField] of eventFields) {
      if (row[activeField] !== true) continue;
      const minutes = row[timeField];
      if (minutes === 0) continue;
      const channel = /^https:\/\/(?:www\.)?twitch\.tv\/([a-z0-9_]{1,25})\/?$/i.exec(row.streamUrl)?.[1];
      if (!channel || typeof row.displayName !== "string" || !row.displayName.trim()) {
        throw new Error("Microscape returned an active event without a Twitch channel.");
      }
      const avatarUrl = typeof row.imgUrl === "string"
        && /^https:\/\/static-cdn\.jtvnw\.net\/jtv_user_pictures\/[a-zA-Z0-9._-]+$/.test(row.imgUrl)
        ? row.imgUrl : null;
      events.push({
        type,
        channel: channel.toLowerCase(),
        name: row.displayName,
        endsAt: Number.isFinite(minutes) && minutes > 0 ? checkedAt + minutes * 60_000 : null,
        ...(avatarUrl ? {avatarUrl} : {}),
        ...(type === "key" && row.isMemberChannel === true ? {doubleKeys: true} : {})
      });
    }
  }

  return { checkedAt, events };
}

async function main(output) {
  if (!output) throw new Error("Provide a path for the live drops snapshot.");
  const response = await fetch(source, {cache: "no-store", signal: AbortSignal.timeout(15_000)});
  if (!response.ok) throw new Error("Microscape returned HTTP " + response.status);
  const body = await response.json();
  const snapshot = makeSnapshot(body?.result?.data);
  await writeFile(output, JSON.stringify(snapshot) + "\n");
  console.log("Recorded " + snapshot.events.length + " active Microscape events.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2]);
}
