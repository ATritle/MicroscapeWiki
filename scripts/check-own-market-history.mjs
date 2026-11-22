import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import worker,{collectMarket,readMarketHistory,normalizeSummaries,SAMPLE_MS,DAY,RAW_DAYS,DAILY_DAYS} from "../workers/market-history.mjs";
// Execute the production SQL in SQLite, adapting only the D1 transport methods.
const sqlite=new DatabaseSync(":memory:");
const db={prepare(sql){return {sql,args:[],bind(...args){return {...this,args};},async all(){return {results:sqlite.prepare(this.sql).all(...this.args)};},async run(){return sqlite.prepare(this.sql).run(...this.args);}};},async batch(statements){sqlite.exec("BEGIN");try{const results=[];for(const s of statements){const p=sqlite.prepare(s.sql);results.push(p.columns().length?{results:p.all(...s.args)}:{results:[],meta:p.run(...s.args)});}sqlite.exec("COMMIT");return results;}catch(error){sqlite.exec("ROLLBACK");throw error;}}};
const env={MARKET_DB:db},oldFetch=globalThis.fetch,calls=[];
let ask=10,bid=8,fail=false;
globalThis.fetch=async(url,options)=>{calls.push(String(url));assert.equal(String(url),"https://microscape.cc/server/tapi/bazaar.getAllItemSummaries");assert.equal(options.headers.Cookie,undefined);assert.equal(options.headers.Authorization,undefined);assert.equal(options.method,undefined);if(fail)return Response.json({}, {status:503});return Response.json({result:{data:[{itemId:"ore",...(ask===null?{}:{sellSummary:{bestPricePerUnit:ask,quantity:5}}),buySummary:{bestPricePerUnit:bid,quantity:3},sellerId:"PRIVATE"}]}});};
const t=Date.UTC(2026,10,22,0,0),url=query=>new URL("https://internal/history"+query);
try{
  assert.throws(()=>normalizeSummaries([{sellSummary:{quantity:1,bestPricePerUnit:1}}]));
  assert.throws(()=>normalizeSummaries([{itemId:"ore"},{itemId:"ore"}]));
  assert.throws(()=>normalizeSummaries([{itemId:"ore",sellSummary:{quantity:1,bestPricePerUnit:-1}}]));
  const first=await readMarketHistory(env,url(""),t);assert.equal(first.lastPoll,t);assert.equal(first.collectionStartedAt,t);assert.equal(first.lastScheduledAt,null);assert.equal(first.items[0].avg30d,10);assert(!JSON.stringify(first).includes("PRIVATE"));
  const count=calls.length;await collectMarket(env,{now:t+1000,scheduledAt:t});assert.equal(calls.length,count,"Same-bucket duplicate events must not refetch or double-count");
  ask=20;await collectMarket(env,{now:t+SAMPLE_MS,scheduledAt:t+SAMPLE_MS});
  let summary=await readMarketHistory(env,url(""),t+SAMPLE_MS);assert.equal(summary.items[0].avg30d,15);assert.equal(summary.items[0].low24h,10);assert.equal(summary.items[0].observations30d,2);assert.equal(summary.lastScheduledAt,t+SAMPLE_MS);
  let chart=await readMarketHistory(env,url("?item=ore&range=7d"),t+SAMPLE_MS);assert.deepEqual(chart.points.map(p=>p.price),[10,20]);assert.equal(chart.resolution,"15-minute samples");
  const sparks=await readMarketHistory(env,url("?ids=ore,missing"),t+SAMPLE_MS);assert.deepEqual(sparks.series,{missing:[],ore:[10,20]});
  ask=null;await collectMarket(env,{now:t+2*SAMPLE_MS});summary=await readMarketHistory(env,url(""),t+2*SAMPLE_MS);assert.equal(summary.items[0].lastPrice,20);assert.equal(summary.items[0].avg30d,15,"Missing asks must not count as zero");
  fail=true;await assert.rejects(collectMarket(env,{now:t+3*SAMPLE_MS}));summary=await readMarketHistory(env,url(""),t+6*SAMPLE_MS);assert.equal(summary.lastPoll,t+2*SAMPLE_MS);assert(summary.stale);assert.equal(calls.length,4,"History reads must not conceal a broken schedule by polling the game");
  fail=false;ask=30;await collectMarket(env,{now:t+DAY+SAMPLE_MS});summary=await readMarketHistory(env,url(""),t+DAY+SAMPLE_MS);assert.equal(summary.items[0].low24h,20,"24-hour low must exclude observations outside the precise window");
  const daily=await readMarketHistory(env,url("?item=ore&range=1m"),t+DAY+SAMPLE_MS);assert.equal(daily.resolution,"daily averages");assert.deepEqual(daily.points.map(p=>p.price),[15,30]);
  await collectMarket(env,{now:t+(RAW_DAYS+2)*DAY});assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM market_samples WHERE bucket<?").get(t+2*DAY).n,0);assert(sqlite.prepare("SELECT COUNT(*) AS n FROM market_daily WHERE day=?").get(t).n>0,"Daily rollups survive raw-sample retention");
  await collectMarket(env,{now:t+(DAILY_DAYS+2)*DAY});summary=await readMarketHistory(env,url(""),t+(DAILY_DAYS+2)*DAY);assert.equal(summary.items[0].allTimeLow,10,"Lifetime low remains after chart retention cleanup");assert.equal(summary.collectionStartedAt,t);assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM market_daily WHERE day=?").get(t).n,0);
  for(const query of ["?item=../bad","?ids=ore&item=ore","?range=7d","?item=ore&range=nope","?url=https://example.com","?item=ore&item=x"]){const response=await worker.fetch(new Request(url(query)),env);assert.equal(response.status,400);}
  assert.equal((await worker.fetch(new Request("https://internal/history",{method:"POST"}),env)).status,405);
  assert.equal((await worker.fetch(new Request("https://internal/private"),env)).status,404);
}finally{globalThis.fetch=oldFetch;sqlite.close();}
console.log("Passed: production SQLite schema/SQL, direct official-game collection, duplicate cron idempotency, weighted observed averages, exact 24-hour lows, null asks, scheduled-run metadata, honest stale/failure behavior, raw/daily retention and lifetime lows. No account data or third-party history.");
