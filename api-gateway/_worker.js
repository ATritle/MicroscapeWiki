// Neutral public gateway. The service binding keeps the relay's hostname and
// Twitch credentials on Cloudflare; this project contains neither.
const paths = new Set(["/drops.json", "/drops-backup.json", "/mzdunk.json", "/player.json", "/player-search.json"]);
const origins = new Set(["https://microscapewiki.com", "https://www.microscapewiki.com"]);
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!paths.has(url.pathname)) return new Response("Not found", {status:404});
    if (request.method !== "GET") return new Response("Method not allowed", {status:405, headers:{Allow:"GET"}});
    const origin = request.headers.get("Origin");
    if (origin && !origins.has(origin)) return new Response("Origin not allowed", {status:403});
    try {
      if (!env.LIVE_DROPS?.fetch) throw Error("Relay not bound");
      return await env.LIVE_DROPS.fetch(request);
    } catch {
      return Response.json({error:"The wiki API is temporarily unavailable. Please try again."}, {
        status:503, headers:{"Cache-Control":"no-store", "Access-Control-Allow-Origin":origin || "https://microscapewiki.com", Vary:"Origin"}
      });
    }
  }
};
