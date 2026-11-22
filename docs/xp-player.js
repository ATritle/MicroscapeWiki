import {communityApiBase} from "./api-config.js?v=community-api-20261119";
import {skillLevel} from "./player-lookup.js?v=effects-20261121";

export const xpSkills = ["attack", "strength", "defense", "evilMagic", "ranged", "piety",
  "woodcutting", "firemaking", "fishing", "cooking", "mining", "smithing", "crafting", "goodMagic", "fletching", "herblaw"];

function endpoint(file) {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? new URL("/api/" + file, window.location.origin) : new URL(file, communityApiBase);
}

export async function lookupXpSuggestions(query, {signal, fetcher = fetch} = {}) {
  const name = query.trim();
  if (!/^[a-zA-Z0-9_]{2,25}$/.test(name)) throw Error("Type at least two letters, numbers or underscores.");
  const url = endpoint("player-search.json");
  url.searchParams.set("query", name);
  const response = await fetcher(url, {credentials:"omit", signal:signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000)});
  const body = await response.json();
  if (!response.ok || !Array.isArray(body.results)) throw Error("Name suggestions are temporarily unavailable. You can still look up a full username.");
  return body.results.slice(0,8).map(player=>player?.name).filter(name=>typeof name === "string" && /^[a-zA-Z0-9_]{1,25}$/.test(name));
}

export function xpPlayerProgress(player, skill) {
  if (!xpSkills.includes(skill) || !Object.hasOwn(player?.exp || {}, skill)) throw Error("This skill’s XP is not available in the public profile. Enter it manually or choose another skill.");
  const xp = player.exp[skill];
  if (!Number.isFinite(xp) || xp < 0) throw Error("The public profile returned an invalid XP value. You can still enter it manually.");
  const level = skillLevel(xp);
  if (level > 99) throw Error("This skill is above the calculator’s supported level range of 1–99.");
  return {level, xp};
}

export async function lookupXpPlayer(username, {signal, fetcher = fetch} = {}) {
  const name = username.trim();
  if (!/^[a-zA-Z0-9_]{1,25}$/.test(name)) throw Error("Enter a full username using up to 25 letters, numbers or underscores.");
  const url = endpoint("player.json");
  url.searchParams.set("username", name);
  const response = await fetcher(url, {credentials:"omit", cache:"no-store", signal:signal ? AbortSignal.any([signal, AbortSignal.timeout(18_000)]) : AbortSignal.timeout(18_000)});
  let snapshot;
  try {snapshot = await response.json();}
  catch {throw Error("The lookup service did not respond correctly. Please try again.");}
  if (!response.ok) {
    const error = Error(snapshot.error || "Could not load that player. Please try again.");
    error.status = response.status;
    throw error;
  }
  if (!Number.isFinite(snapshot.checkedAt) || typeof snapshot.player?.name !== "string" || !snapshot.player.name || !snapshot.player.exp || Array.isArray(snapshot.player.exp) || typeof snapshot.player.exp !== "object") throw Error("The public profile is incomplete. You can still enter your level and XP manually.");
  return snapshot;
}
