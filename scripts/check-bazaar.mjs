import assert from "node:assert/strict";
import gateway, {fetchBazaarSnapshot} from "../api-gateway/_worker.js";
const actualFetch = globalThis.fetch, actualCaches = globalThis.caches;
const calls = [], store = new Map(), pending = [];
let upstreamStatus = 200, malformed = false;
globalThis.caches = {default:{match:async r=>store.get(r.url)?.clone(),put:async(r,v)=>store.set(r.url,v.clone())}};
globalThis.fetch = async (url, options) => {
  url = new URL(url); calls.push(url);
  assert.equal(url.origin,"https://microscape.cc");
  assert.equal(options.credentials,"omit"); assert.equal(options.method,undefined);
  if (upstreamStatus !== 200) return Response.json({error:"unavailable"},{status:upstreamStatus});
  const input = JSON.parse(url.searchParams.get("input")||"null");
  if (url.pathname.endsWith("getAllItemSummaries")) return Response.json({result:{data:[malformed ? {itemId:undefined} : {
    itemId:"copperOre", sellSummary:{quantity:9,bestPricePerUnit:2}, privateAccountField:"omit"
  }]}});
  if (url.pathname.endsWith("getItemMarketSummary")) return Response.json({result:{data:{itemId:input.itemId,
    sellSummary:{quantity:9,bestPricePerUnit:2}, referencePrice:3,
    recentTrades:[{quantity:2,pricePerUnit:3,tradedAtMs:1795157100000,privateAccountField:"omit"}]}}});
  assert(url.pathname.endsWith("getItemOrders"));
  return Response.json({result:{data:[4,2].map((price,i)=>({itemId:input.itemId,side:input.side,pricePerUnit:price,
    stillAvailableQuantity:i+2,postedAtMs:1795155884373+i,id:"omit",characterId:"omit"}))}});
};
const context = {waitUntil:p=>pending.push(p)};
const request = path => new Request("https://microscape-wiki-api.pages.dev/bazaar.json"+path,{headers:{Origin:"https://microscapewiki.com"}});
try {
  const response = await gateway.fetch(request(""),{},context), body = await response.json();
  assert.equal(response.status,200); assert.equal(response.headers.get("Access-Control-Allow-Origin"),"https://microscapewiki.com");
  assert.equal(body.items[0].privateAccountField,undefined); await Promise.all(pending);
  const count=calls.length; assert.equal((await gateway.fetch(request(""),{},context)).status,200); assert.equal(calls.length,count,"Reuse public market cache");
  const detail = await (await gateway.fetch(request("?item=copperOre"),{},context)).json();
  assert.deepEqual(detail.item.sellOrders.map(r=>r.pricePerUnit),[2,4]);
  assert.deepEqual(detail.item.buyOrders.map(r=>r.pricePerUnit),[4,2]);
  assert(!JSON.stringify(detail).includes("omit"),"Only public market fields leave the relay");
  const before=calls.length;
  for(const query of ["?item=../secret","?item=copperOre&item=bones","?url=https://untrusted.example/"]) {
    assert.equal((await gateway.fetch(request(query),{},context)).status,400);
  }
  assert.equal(calls.length,before,"Reject invalid input before fetching");
  upstreamStatus=401; store.clear();
  const unavailable=await gateway.fetch(request(""),{},context);
  assert.equal(unavailable.status,503); assert.equal(unavailable.headers.get("Cache-Control"),"no-store");
  assert((await unavailable.json()).error); assert.equal(store.size,0,"Do not cache failures as empty markets");
  upstreamStatus=200; malformed=true;
  await assert.rejects(fetchBazaarSnapshot(),/unreadable/);
  assert.equal((await gateway.fetch(new Request("https://example.com/bazaar.json",{method:"POST"}),{})).status,405);
  assert.equal((await gateway.fetch(new Request("https://example.com/bazaar.json",{headers:{Origin:"https://untrusted.example"}}),{})).status,403);
} finally {globalThis.fetch=actualFetch;globalThis.caches=actualCaches;}
console.log("Passed: public market normalization, both order books, per-item caching, input/CORS/method validation, and honest upstream failures. No credentials or trade mutations.");
