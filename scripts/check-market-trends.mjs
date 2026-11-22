import assert from "node:assert/strict";
import {priceChange,chartGeometry,marketRows} from "../docs/market-trends.js";
import gateway from "../api-gateway/_worker.js";
assert.equal(priceChange(15,10),50);assert.equal(priceChange(5,10),-50);assert.equal(priceChange(null,10),null);assert.equal(priceChange(10,0),null);
const merged=marketRows([{itemId:"ore",sellSummary:{bestPricePerUnit:5}}],[{itemId:"ore",avg30d:10},{itemId:"logs",lastPrice:20}],true);
assert.equal(merged[0].change,-50);assert.equal(merged[1].change,null);assert.equal(merged[1].sellSummary,undefined,"Do not turn a historical price into a current order");
assert.equal(marketRows([],[{itemId:"ore"}]).length,0);
const g=chartGeometry([{at:100,price:5},{at:110,price:10},{at:200,price:20}],100,50,5);
assert.equal(g.coords[1].x,14,"Charts must reflect real timestamp spacing");
for(const points of [[{at:100,price:5}],[{at:100,price:5},{at:200,price:5}]])assert(!/NaN|Infinity/.test(chartGeometry(points).path));
assert.equal(chartGeometry([]),null);
const oldFetch=globalThis.fetch,oldCaches=globalThis.caches,calls=[],cache=new Map(),pending=[];
let fail=false,malformed=false;
globalThis.caches={default:{match:async r=>cache.get(r.url)?.clone(),put:async(r,v)=>cache.set(r.url,v.clone())}};
globalThis.fetch=async(url,options)=>{
  url=new URL(url);calls.push(url.href);assert.equal(url.origin,"https://microwiki.mhmm.pl");assert.equal(options.credentials,"omit");assert.equal(options.method,undefined);
  if(fail)return Response.json({}, {status:503});
  if(url.pathname.endsWith("/all"))return Response.json({updatedAt:1795329000,lastPoll:1795328900,items:[{itemId:"ore",currentPrice:5,currentTs:1795328800,avg1m:10,min24h:3,min7d:2,allTimeMin:1,sellerId:"PRIVATE"}]});
  if(url.pathname.endsWith("/sparklines"))return Response.json({series:{ore:malformed?[5,"bad"]:[10,5],unrequested:[999]}});
  assert.equal(url.searchParams.get("itemId"),"ore");assert.equal(url.searchParams.get("chart"),"7d");
  return Response.json({points:[{ts:1795328800,price:5,sellerId:"PRIVATE"},{ts:1795328700,price:10}]});
};
const context={waitUntil:p=>pending.push(p)},request=query=>new Request("https://microscape-wiki-api.pages.dev/bazaar-history.json"+query,{headers:{Origin:"https://microscapewiki.com"}});
try{
  const response=await gateway.fetch(request(""),{},context),body=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get("Cache-Control"),"public, max-age=300");assert.equal(response.headers.get("Access-Control-Allow-Origin"),"https://microscapewiki.com");
  assert.equal(body.items[0].avg30d,10);assert.equal(body.lastPoll,1795328900000);assert(!JSON.stringify(body).includes("PRIVATE"));
  await Promise.all(pending);const count=calls.length;await gateway.fetch(request(""),{},context);assert.equal(calls.length,count);
  const chart=await (await gateway.fetch(request("?item=ore&range=7d"),{},context)).json();assert.equal(chart.points[0].at,1795328700000);assert.equal(chart.points[1].price,5);assert(!JSON.stringify(chart).includes("PRIVATE"));
  const sparks=await (await gateway.fetch(request("?ids=ore"),{},context)).json();assert.deepEqual(sparks.series,{ore:[10,5]});
  const before=calls.length;
  for(const query of ["?item=../bad","?item=ore&range=nope","?ids=ore&item=ore","?range=7d","?url=https://bad.test","?item=ore&item=logs","?ids="+Array(31).fill("ore").join(",")])assert.equal((await gateway.fetch(request(query),{},context)).status,400);
  assert.equal(calls.length,before);
  fail=true;cache.clear();const unavailable=await gateway.fetch(request(""),{},context);assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get("Cache-Control"),"no-store");assert.equal(cache.size,0);
  fail=false;malformed=true;assert.equal((await gateway.fetch(request("?ids=ore"),{},context)).status,503);
  assert.equal((await gateway.fetch(new Request("https://example.com/bazaar-history.json",{method:"POST"}),{})).status,405);
  assert.equal((await gateway.fetch(new Request("https://example.com/bazaar-history.json",{headers:{Origin:"https://bad.test"}}),{})).status,403);
}finally{globalThis.fetch=oldFetch;globalThis.caches=oldCaches;}
console.log("Passed: live versus historical price separation, percent changes, missing history, timestamp-scaled charts, flat/single-point charts, public history normalization, bounded requests, source attribution, cache/CORS/method guards and uncached failures.");
