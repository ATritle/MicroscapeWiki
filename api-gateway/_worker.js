// Neutral public gateway. The service binding keeps the relay's hostname and
// Twitch credentials on Cloudflare; this project contains neither.
import {marketHistoryResponse,HistoryError} from "./market-history.js";
const paths = new Set(["/drops.json", "/drops-backup.json", "/mzdunk.json", "/player.json", "/player-search.json", "/bazaar.json", "/bazaar-history.json"]);
const origins = new Set(["https://microscapewiki.com", "https://www.microscapewiki.com"]);
const itemIdPattern = /^[a-zA-Z0-9_-]{1,80}$/;
const positive = value => Number.isSafeInteger(value) && value > 0;
const timestamp = value => Number.isSafeInteger(value) && value > 0;
class BazaarError extends Error {
  constructor(message, status = 503) {super(message); this.status = status;}
}
function summary(raw) {
  if (!raw || typeof raw.itemId !== "string" || !itemIdPattern.test(raw.itemId)) throw new BazaarError("The game returned an unreadable market summary.");
  const result = {itemId:raw.itemId};
  for (const side of ["sellSummary", "buySummary"]) if (raw[side] != null) {
    const row = raw[side];
    if (!positive(row.quantity) || !positive(row.bestPricePerUnit)) throw new BazaarError("The game returned an unreadable market price.");
    result[side] = {quantity:row.quantity, bestPricePerUnit:row.bestPricePerUnit};
  }
  return result;
}
async function readBazaar(procedure, input, signal) {
  const url = new URL("https://microscape.cc/server/tapi/" + procedure);
  if (input) url.searchParams.set("input", JSON.stringify(input));
  const response = await fetch(url, {signal, cache:"no-store", credentials:"omit"});
  if (!response.ok) throw new BazaarError("Current Bazaar data is temporarily unavailable. Open the Bazaar in Microscape or try again shortly.");
  const body = await response.json();
  if (!body?.result || !("data" in body.result)) throw new BazaarError("The game returned an unreadable Bazaar response.");
  return body.result.data;
}
export async function fetchBazaarSnapshot(itemId) {
  if (itemId != null && (typeof itemId !== "string" || !itemIdPattern.test(itemId))) throw new BazaarError("Choose a valid Bazaar item.", 400);
  const signal = AbortSignal.timeout(8_000);
  if (itemId == null) {
    const rows = await readBazaar("bazaar.getAllItemSummaries", undefined, signal);
    if (!Array.isArray(rows) || rows.length > 10_000) throw new BazaarError("The game returned an unreadable market list.");
    return {checkedAt:Date.now(), items:rows.map(summary)};
  }
  const [market, sells, buys] = await Promise.all([
    readBazaar("bazaar.getItemMarketSummary", {itemId}, signal),
    readBazaar("bazaar.getItemOrders", {itemId, side:"sell"}, signal),
    readBazaar("bazaar.getItemOrders", {itemId, side:"buy"}, signal)
  ]);
  if (market?.itemId !== itemId) throw new BazaarError("The game returned a different Bazaar item.");
  const orders = (rows, side) => {
    if (!Array.isArray(rows) || rows.length > 10_000) throw new BazaarError("The game returned an unreadable order list.");
    return rows.map(row => {
      if (row?.itemId !== itemId || row.side !== side || !positive(row.pricePerUnit)
        || !positive(row.stillAvailableQuantity) || !timestamp(row.postedAtMs)) throw new BazaarError("The game returned an unreadable Bazaar order.");
      return {itemId, side, pricePerUnit:row.pricePerUnit, quantity:row.stillAvailableQuantity, postedAt:row.postedAtMs};
    }).sort((a,b) => (side === "sell" ? a.pricePerUnit-b.pricePerUnit : b.pricePerUnit-a.pricePerUnit) || a.postedAt-b.postedAt);
  };
  if (!Array.isArray(market.recentTrades)) throw new BazaarError("The game returned unreadable trade history.");
  const recentTrades = market.recentTrades.slice(0,20).map(row => {
    if (!positive(row.quantity) || !positive(row.pricePerUnit) || !timestamp(row.tradedAtMs)) throw new BazaarError("The game returned unreadable trade history.");
    return {quantity:row.quantity, pricePerUnit:row.pricePerUnit, tradedAt:row.tradedAtMs};
  });
  return {checkedAt:Date.now(), item:{...summary(market),
    ...(positive(market.referencePrice) ? {referencePrice:market.referencePrice} : {}),
    sellOrders:orders(sells,"sell"), buyOrders:orders(buys,"buy"), recentTrades}};
}
async function bazaarResponse(url, context) {
  const values = url.searchParams.getAll("item");
  if (values.length > 1 || [...url.searchParams.keys()].some(key => key !== "item")) throw new BazaarError("Choose one Bazaar item.", 400);
  const itemId = values.length ? values[0] : undefined;
  if (itemId != null && !itemIdPattern.test(itemId)) throw new BazaarError("Choose a valid Bazaar item.", 400);
  const key = new URL("/bazaar.json", url.origin);
  if (itemId != null) key.searchParams.set("item",itemId);
  const cache = globalThis.caches?.default;
  const cached = await cache?.match(new Request(key));
  if (cached) return cached;
  const snapshot = await fetchBazaarSnapshot(itemId);
  const response = Response.json(snapshot, {headers:{"Cache-Control":"public, max-age=30", "X-Content-Type-Options":"nosniff"}});
  if (cache && context?.waitUntil) context.waitUntil(cache.put(new Request(key), response.clone()));
  return response;
}
export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (!paths.has(url.pathname)) return new Response("Not found", {status:404});
    if (request.method !== "GET") return new Response("Method not allowed", {status:405, headers:{Allow:"GET"}});
    const origin = request.headers.get("Origin");
    if (origin && !origins.has(origin)) return new Response("Origin not allowed", {status:403});
    try {
      if (["/bazaar.json","/bazaar-history.json"].includes(url.pathname)) {
        const response = await (url.pathname==="/bazaar.json"?bazaarResponse(url, context):marketHistoryResponse(url,context,env));
        const result = new Response(response.body, response);
        result.headers.set("Access-Control-Allow-Origin", origin || "https://microscapewiki.com");
        result.headers.append("Vary", "Origin");
        return result;
      }
      if (!env.LIVE_DROPS?.fetch) throw Error("Relay not bound");
      return await env.LIVE_DROPS.fetch(request);
    } catch (error) {
      return Response.json({error:error instanceof BazaarError||error instanceof HistoryError ? error.message : "The wiki API is temporarily unavailable. Please try again."}, {
        status:error instanceof BazaarError||error instanceof HistoryError ? error.status : 503, headers:{"Cache-Control":"no-store", "Access-Control-Allow-Origin":origin || "https://microscapewiki.com", Vary:"Origin"}
      });
    }
  }
};
