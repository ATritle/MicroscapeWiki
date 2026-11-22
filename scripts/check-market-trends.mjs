import assert from "node:assert/strict";
import {priceChange,chartGeometry,marketRows} from "../docs/market-trends.js";
import gateway from "../api-gateway/_worker.js";
assert.equal(priceChange(15,10),50);assert.equal(priceChange(5,10),-50);assert.equal(priceChange(null,10),null);assert.equal(priceChange(10,0),null);
const merged=marketRows([{itemId:"ore",sellSummary:{bestPricePerUnit:5}}],[{itemId:"ore",avg30d:10},{itemId:"logs",lastPrice:20}],true);
assert.equal(merged[0].change,-50);assert.equal(merged[1].change,null);assert.equal(merged[1].sellSummary,undefined,"Historical prices must never become live orders");
assert.equal(marketRows([],[{itemId:"ore"}]).length,0);
const g=chartGeometry([{at:100,price:5},{at:110,price:10},{at:200,price:20}],100,50,5);assert.equal(g.coords[1].x,14);
for(const points of [[{at:100,price:5}],[{at:100,price:5},{at:200,price:5}]])assert(!/NaN|Infinity/.test(chartGeometry(points).path));assert.equal(chartGeometry([]),null);
const oldFetch=globalThis.fetch,oldCaches=globalThis.caches,cache=new Map(),pending=[],calls=[];
let fail=false,malformed=false;
globalThis.fetch=async()=>{throw Error("History must use our private service binding, never a third-party network source");};
globalThis.caches={default:{match:async r=>cache.get(r.url)?.clone(),put:async(r,v)=>cache.set(r.url,v.clone())}};
const base={checkedAt:1795329000000,lastPoll:1795328900000,collectionStartedAt:1795328800000,source:"MzDunk's Community Wiki"};
const env={MARKET_HISTORY:{async fetch(request){const url=new URL(request.url);calls.push(url.href);assert.equal(url.origin,"https://market-history.internal");assert.equal(url.pathname,"/history");assert.equal(request.method,"GET");assert.equal(request.headers.get("Cookie"),null);if(fail)return Response.json({error:"Collection unavailable"},{status:503});if(malformed)return Response.json({items:[]});if(url.searchParams.has("ids"))return Response.json({...base,series:{ore:[10,5]}});if(url.searchParams.has("item"))return Response.json({...base,itemId:"ore",points:[{at:1795328800000,price:5}]});return Response.json({...base,items:[{itemId:"ore",avg30d:10}]});}}};
const context={waitUntil:p=>pending.push(p)},request=query=>new Request("https://microscape-wiki-api.pages.dev/bazaar-history.json"+query,{headers:{Origin:"https://microscapewiki.com"}});
try{
  cache.set("https://microscape-wiki-api.pages.dev/bazaar-history.json",Response.json({source:"obsolete third-party history"}));
  const response=await gateway.fetch(request(""),env,context),body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get("Cache-Control"),"public, max-age=300");assert.equal(response.headers.get("Access-Control-Allow-Origin"),"https://microscapewiki.com");assert.equal(body.source,base.source,"Never reuse old third-party cache entries");assert.equal(body.items[0].avg30d,10);
  await Promise.all(pending);const count=calls.length;await gateway.fetch(request(""),env,context);assert.equal(calls.length,count);
  assert.equal((await (await gateway.fetch(request("?item=ore&range=7d"),env,context)).json()).points[0].price,5);
  assert.deepEqual((await (await gateway.fetch(request("?ids=ore"),env,context)).json()).series,{ore:[10,5]});
  const before=calls.length;for(const query of ["?item=../bad","?item=ore&range=nope","?ids=ore&item=ore","?range=7d","?url=https://bad.test","?item=ore&item=logs","?ids="+Array(31).fill("ore").join(",")])assert.equal((await gateway.fetch(request(query),env,context)).status,400);assert.equal(calls.length,before);
  fail=true;cache.clear();const unavailable=await gateway.fetch(request(""),env,context);assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get("Cache-Control"),"no-store");assert.equal(cache.size,0);
  fail=false;malformed=true;assert.equal((await gateway.fetch(request(""),env,context)).status,503);assert.equal((await gateway.fetch(request(""),{},context)).status,503);
  assert.equal((await gateway.fetch(new Request("https://example.com/bazaar-history.json",{method:"POST"}),env)).status,405);
  assert.equal((await gateway.fetch(new Request("https://example.com/bazaar-history.json",{headers:{Origin:"https://bad.test"}}),env)).status,403);
}finally{globalThis.fetch=oldFetch;globalThis.caches=oldCaches;}
console.log("Passed: independent private history service, obsolete cache isolation, no third-party fetches, live/history separation, real timestamp geometry, bounded requests, CORS/method guards and honest uncached failures.");
