import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {fetchPlayerSnapshot, fetchPlayerSuggestions, PlayerLookupError} from "../workers/live-drops.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../docs");
const port = Number(process.argv[2] || 8065);
const types = {".html":"text/html", ".js":"text/javascript", ".css":"text/css",
  ".json":"application/json", ".png":"image/png", ".jpg":"image/jpeg", ".svg":"image/svg+xml"};
const identities = new Map();
async function previewIdentity(username) {
  if (identities.get(username)?.expiresAt > Date.now()) return identities.get(username).id;
  const url = new URL("https://microwiki.mhmm.pl/api/leaderboard/search");
  url.searchParams.set("q", username);
  const response = await fetch(url, {signal:AbortSignal.timeout(8_000)});
  if (!response.ok) throw new PlayerLookupError("The preview username search is temporarily unavailable.");
  const body = await response.json();
  const match = body.results?.find(player => player.displayName?.toLowerCase() === username);
  if (match) identities.set(username, {id:match.twitchId, expiresAt:Date.now() + 5 * 60_000});
  return match?.twitchId;
}
http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1:" + port);
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (["/api/player.json", "/api/player-search.json"].includes(url.pathname)) {
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    try {
      const snapshot = url.pathname === "/api/player-search.json" ? await fetchPlayerSuggestions(url.searchParams.get("query")?.trim())
        : await fetchPlayerSnapshot(url.searchParams.get("username")?.trim(), {}, previewIdentity);
      response.end(JSON.stringify(snapshot));
    } catch (error) {
      response.statusCode = error instanceof PlayerLookupError ? error.status : 502;
      response.end(JSON.stringify({error:error instanceof PlayerLookupError ? error.message : "Could not load the public player profile."}));
    }
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { response.writeHead(400).end("Invalid path"); return; }
  const file = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(root + path.sep)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const body = await fs.readFile(file);
    response.setHeader("Content-Type", (types[path.extname(file)] || "application/octet-stream") + "; charset=utf-8");
    response.end(body);
  } catch {response.writeHead(404).end("Not found");}
}).listen(port, "127.0.0.1", () => {
  console.log("Local Player Lookup preview: http://127.0.0.1:" + port + "/#/player-lookup");
  console.log("Real public game data; preview username resolution uses the public community ranking index.");
  console.log("The prepared production Worker resolves names directly through Twitch. Nothing has been deployed.");
});
