// The collector is a private Cloudflare service backed by our own D1 database.
// This gateway never requests another community wiki's historical observations.
const idPattern=/^[a-zA-Z0-9_-]{1,80}$/;
const ranges=new Set(["24h","7d","1m","3m","6m","12m","all"]);
export class HistoryError extends Error{constructor(message,status=503){super(message);this.status=status;}}
function query(url){
  const entries=[...url.searchParams],keys=entries.map(([k])=>k);
  if(new Set(keys).size!==keys.length||keys.some(k=>!["item","range","ids"].includes(k)))throw new HistoryError("Choose a valid market history request.",400);
  const item=url.searchParams.get("item"),range=url.searchParams.get("range"),ids=url.searchParams.get("ids");
  if(ids!==null){const list=ids.split(",");if(item!==null||range!==null||list.length>30||!list.length||list.some(id=>!idPattern.test(id)))throw new HistoryError("Choose up to 30 valid items.",400);return {ids:[...new Set(list)].sort()};}
  if(item!==null){if(!idPattern.test(item)||range!==null&&!ranges.has(range))throw new HistoryError("Choose a valid item and chart period.",400);return {item,range:range||"7d"};}
  if(range!==null)throw new HistoryError("Choose an item for this chart period.",400);return {};
}
export async function fetchMarketHistory(requestUrl,env){
  const q=query(requestUrl),url=new URL("https://market-history.internal/history");
  if(q.ids)url.searchParams.set("ids",q.ids.join(","));if(q.item){url.searchParams.set("item",q.item);url.searchParams.set("range",q.range);}
  if(!env?.MARKET_HISTORY?.fetch)throw new HistoryError("Our price-history collector is not connected yet. Live orders remain available.");
  const response=await env.MARKET_HISTORY.fetch(new Request(url,{signal:AbortSignal.timeout(15_000)}));
  const body=await response.json();if(!response.ok)throw new HistoryError(body.error||"Our price history is temporarily unavailable.",response.status===400?400:503);
  if(!Number.isFinite(body.checkedAt)||!Number.isFinite(body.lastPoll)||!Number.isFinite(body.collectionStartedAt)||(q.ids?!body.series:q.item?body.itemId!==q.item||!Array.isArray(body.points):!Array.isArray(body.items)))throw new HistoryError("Our collector returned an unreadable history response.");
  return body;
}
export async function marketHistoryResponse(url,context,env){
  const q=query(url),key=new URL("/.cache/bazaar-history-own-v1",url.origin);
  if(q.ids)key.searchParams.set("ids",q.ids.join(","));if(q.item){key.searchParams.set("item",q.item);key.searchParams.set("range",q.range);}
  const cache=globalThis.caches?.default,cached=await cache?.match(new Request(key));if(cached)return cached;
  const data=await fetchMarketHistory(url,env),response=Response.json(data,{headers:{"Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}});
  if(cache&&context?.waitUntil)context.waitUntil(cache.put(new Request(key),response.clone()));return response;
}
