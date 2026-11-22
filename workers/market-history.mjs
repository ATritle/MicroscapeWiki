// This Worker is reached only through the wiki's service binding. Its cron
// collects public order-book summaries; no character/session data is requested.
export const SAMPLE_MS=15*60_000,DAY=86_400_000;
export const RAW_DAYS=14,DAILY_DAYS=400;
const source="https://microscape.cc/server/tapi/bazaar.getAllItemSummaries";
const idPattern=/^[a-zA-Z0-9_-]{1,80}$/;
const rangeDays={"24h":1,"7d":7,"1m":30,"3m":90,"6m":180,"12m":365,all:DAILY_DAYS};
const schemas=[
  `CREATE TABLE IF NOT EXISTS market_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL) WITHOUT ROWID`,
  `CREATE TABLE IF NOT EXISTS market_samples (item_id TEXT NOT NULL,bucket INTEGER NOT NULL,at INTEGER NOT NULL,ask REAL,bid REAL,sell_quantity INTEGER NOT NULL,buy_quantity INTEGER NOT NULL,PRIMARY KEY(item_id,bucket)) WITHOUT ROWID`,
  `CREATE TABLE IF NOT EXISTS market_daily (day INTEGER NOT NULL,item_id TEXT NOT NULL,ask_sum REAL NOT NULL,ask_count INTEGER NOT NULL,low REAL NOT NULL,high REAL NOT NULL,first_at INTEGER NOT NULL,last_at INTEGER NOT NULL,last_bucket INTEGER NOT NULL,PRIMARY KEY(day,item_id)) WITHOUT ROWID`,
  `CREATE TABLE IF NOT EXISTS market_items (item_id TEXT PRIMARY KEY,first_at INTEGER NOT NULL,last_seen INTEGER NOT NULL,last_bucket INTEGER NOT NULL,last_ask REAL,last_ask_at INTEGER,all_time_low REAL,all_time_low_at INTEGER) WITHOUT ROWID`
];
const initialized=new WeakMap();
export class MarketHistoryError extends Error{constructor(message,status=503){super(message);this.status=status;}}
export async function ensureSchema(db){
  if(!db)throw new MarketHistoryError("The wiki price-history database is not connected.");
  if(!initialized.has(db))initialized.set(db,db.batch(schemas.map(sql=>db.prepare(sql))).catch(error=>{initialized.delete(db);throw error;}));
  await initialized.get(db);
}
const stmt=(db,sql,...values)=>db.prepare(sql).bind(...values);
const rows=async statement=>(await statement.all()).results;
const midnight=now=>Math.floor(now/DAY)*DAY;
export function normalizeSummaries(data){
  if(!Array.isArray(data)||data.length>2000)throw new MarketHistoryError("The game returned an unreadable market snapshot.");
  const ids=new Set();
  return data.map(row=>{
    if(!row||typeof row.itemId!=="string"||!idPattern.test(row.itemId)||ids.has(row.itemId))throw new MarketHistoryError("The game returned an unreadable market item.");
    ids.add(row.itemId);
    const side=key=>{const value=row[key];if(value==null)return null;if(!Number.isSafeInteger(value.bestPricePerUnit)||value.bestPricePerUnit<1||!Number.isSafeInteger(value.quantity)||value.quantity<1)throw new MarketHistoryError("The game returned an unreadable market price.");return {price:value.bestPricePerUnit,quantity:value.quantity};};
    const ask=side("sellSummary"),bid=side("buySummary");return {id:row.itemId,ask:ask?.price??null,bid:bid?.price??null,sellQuantity:ask?.quantity??0,buyQuantity:bid?.quantity??0};
  });
}
export async function collectMarket(env,{now=Date.now(),scheduledAt=null}={}){
  const db=env.MARKET_DB;await ensureSchema(db);
  const bucket=Math.floor(now/SAMPLE_MS)*SAMPLE_MS,day=midnight(now);
  const meta=Object.fromEntries((await rows(db.prepare("SELECT key,value FROM market_meta WHERE key!='summary_cache'"))).map(r=>[r.key,r.value]));
  if(Number(meta.last_bucket)>=bucket){
    if(scheduledAt!==null)await stmt(db,"INSERT INTO market_meta VALUES('last_scheduled_at',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(excluded.value AS INTEGER)>CAST(market_meta.value AS INTEGER)",String(scheduledAt)).run();
    return {collected:false,at:Number(meta.last_success_at)};
  }
  const response=await fetch(source,{signal:AbortSignal.timeout(10_000),cache:"no-store",headers:{Accept:"application/json"}});
  if(!response.ok)throw new MarketHistoryError("The game market is temporarily unavailable; the previous history was retained.");
  const body=await response.json(),sample=normalizeSummaries(body?.result?.data);
  const statements=[];
  for(const item of sample){
    statements.push(stmt(db,`INSERT OR IGNORE INTO market_samples VALUES(?,?,?,?,?,?,?)`,item.id,bucket,now,item.ask,item.bid,item.sellQuantity,item.buyQuantity));
    statements.push(stmt(db,`INSERT INTO market_items VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(item_id) DO UPDATE SET
      last_seen=excluded.last_seen,last_bucket=excluded.last_bucket,last_ask=COALESCE(excluded.last_ask,market_items.last_ask),
      last_ask_at=COALESCE(excluded.last_ask_at,market_items.last_ask_at),
      all_time_low=CASE WHEN excluded.all_time_low IS NOT NULL AND (market_items.all_time_low IS NULL OR excluded.all_time_low<market_items.all_time_low) THEN excluded.all_time_low ELSE market_items.all_time_low END,
      all_time_low_at=CASE WHEN excluded.all_time_low IS NOT NULL AND (market_items.all_time_low IS NULL OR excluded.all_time_low<market_items.all_time_low) THEN excluded.all_time_low_at ELSE market_items.all_time_low_at END
      WHERE excluded.last_bucket>market_items.last_bucket`,item.id,now,now,bucket,item.ask,item.ask===null?null:now,item.ask,item.ask===null?null:now));
    if(item.ask!==null)statements.push(stmt(db,`INSERT INTO market_daily VALUES(?,?,?,1,?,?,?,?,?) ON CONFLICT(day,item_id) DO UPDATE SET
      ask_sum=market_daily.ask_sum+excluded.ask_sum,ask_count=market_daily.ask_count+1,low=MIN(market_daily.low,excluded.low),high=MAX(market_daily.high,excluded.high),last_at=excluded.last_at,last_bucket=excluded.last_bucket
      WHERE excluded.last_bucket>market_daily.last_bucket`,day,item.id,item.ask,item.ask,item.ask,now,now,bucket));
  }
  statements.push(stmt(db,"INSERT OR IGNORE INTO market_meta VALUES('started_at',?)",String(now)));
  for(const [key,value] of Object.entries({last_bucket:bucket,last_success_at:now,...(scheduledAt!==null?{last_scheduled_at:scheduledAt}:{})}))statements.push(stmt(db,"INSERT INTO market_meta VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(excluded.value AS INTEGER)>CAST(market_meta.value AS INTEGER)",key,String(value)));
  // One daily scan keeps retention bounded without adding a write-heavy time
  // index. Query charts use the (item_id,bucket) primary key directly.
  if(Number(meta.cleanup_day)!==day){
    statements.push(stmt(db,"DELETE FROM market_samples WHERE bucket<?",day-RAW_DAYS*DAY));
    statements.push(stmt(db,"DELETE FROM market_daily WHERE day<?",day-(DAILY_DAYS-1)*DAY));
    statements.push(stmt(db,"INSERT INTO market_meta VALUES('cleanup_day',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",String(day)));
  }
  await db.batch(statements);
  await storeSummary(db,now);
  return {collected:true,at:now,itemCount:sample.length};
}
export function parseHistoryQuery(url){
  const entries=[...url.searchParams],keys=entries.map(([k])=>k);
  if(new Set(keys).size!==keys.length||keys.some(k=>!["item","range","ids"].includes(k)))throw new MarketHistoryError("Choose a valid market history request.",400);
  const item=url.searchParams.get("item"),range=url.searchParams.get("range"),ids=url.searchParams.get("ids");
  if(ids!==null){const list=ids.split(",");if(item!==null||range!==null||!list.length||list.length>30||list.some(id=>!idPattern.test(id)))throw new MarketHistoryError("Choose up to 30 valid items.",400);return {ids:[...new Set(list)].sort()};}
  if(item!==null){if(!idPattern.test(item)||range!==null&&!Object.hasOwn(rangeDays,range))throw new MarketHistoryError("Choose a valid item and chart period.",400);return {item,range:range||"7d"};}
  if(range!==null)throw new MarketHistoryError("Choose an item for this chart period.",400);return {};
}
export async function readMarketHistory(env,url,now=Date.now()){
  const query=parseHistoryQuery(url),db=env.MARKET_DB;await ensureSchema(db);
  let meta=Object.fromEntries((await rows(db.prepare("SELECT key,value FROM market_meta WHERE key!='summary_cache'"))).map(r=>[r.key,r.value]));
  // Bootstrap the empty database once. Subsequent reads never hide a failed
  // schedule by silently polling the game; lastScheduledAt proves cron activity.
  if(!meta.started_at){await collectMarket(env,{now});meta=Object.fromEntries((await rows(db.prepare("SELECT key,value FROM market_meta WHERE key!='summary_cache'"))).map(r=>[r.key,r.value]));}
  const base={checkedAt:now,source:"MzDunk's Community Wiki",sourceUrl:"https://microscape.cc/play/",collectionStartedAt:Number(meta.started_at),lastPoll:Number(meta.last_success_at),lastScheduledAt:meta.last_scheduled_at?Number(meta.last_scheduled_at):null,
    samplingMinutes:SAMPLE_MS/60000,rawRetentionDays:RAW_DAYS,dailyRetentionDays:DAILY_DAYS,stale:now-Number(meta.last_success_at)>SAMPLE_MS*3};
  if(query.ids){
    const result=await db.batch(query.ids.map(id=>stmt(db,"SELECT ask FROM market_samples WHERE item_id=? ORDER BY bucket DESC LIMIT 16",id)));
    return {...base,series:Object.fromEntries(query.ids.map((id,i)=>[id,result[i].results.map(r=>r.ask).reverse().filter(price=>price!==null)]))};
  }
  if(query.item){
    const raw=["24h","7d"].includes(query.range),cutoff=raw?now-rangeDays[query.range]*DAY:midnight(now)-(rangeDays[query.range]-1)*DAY;
    const points=raw?await rows(stmt(db,"SELECT at,ask AS price FROM market_samples WHERE item_id=? AND bucket>=? AND at>=? AND ask IS NOT NULL ORDER BY bucket",query.item,Math.floor(cutoff/SAMPLE_MS)*SAMPLE_MS,cutoff))
      :await rows(stmt(db,"SELECT last_at AS at,ask_sum/ask_count AS price FROM market_daily WHERE item_id=? AND day>=? ORDER BY day",query.item,cutoff));
    return {...base,itemId:query.item,range:query.range,resolution:raw?"15-minute samples":"daily averages",points};
  }
  const cached=(await rows(db.prepare("SELECT value FROM market_meta WHERE key='summary_cache'")))[0];
  const summary=cached?JSON.parse(cached.value):null;
  return {...base,updatedAt:base.lastPoll,items:summary?.at===base.lastPoll?summary.items:(await storeSummary(db,base.lastPoll)).items};
}
async function storeSummary(db,at){
  const day=midnight(at),cut7=day-6*DAY,cut30=day-29*DAY,cut24=at-DAY;
  const [items,stats,lows]=await db.batch([
    db.prepare("SELECT * FROM market_items ORDER BY item_id"),
    stmt(db,`SELECT item_id,SUM(ask_sum)*1.0/SUM(ask_count) AS avg30d,MIN(low) AS low30d,SUM(ask_count) AS observations30d,
      SUM(CASE WHEN day>=? THEN ask_sum END)*1.0/SUM(CASE WHEN day>=? THEN ask_count END) AS avg7d,MIN(CASE WHEN day>=? THEN low END) AS low7d
      FROM market_daily WHERE day>=? GROUP BY item_id`,cut7,cut7,cut7,cut30),
    stmt(db,`SELECT i.item_id,(SELECT MIN(s.ask) FROM market_samples s WHERE s.item_id=i.item_id AND s.bucket>=? AND s.at>=?) AS low24h FROM market_items i`,Math.floor(cut24/SAMPLE_MS)*SAMPLE_MS,cut24)
  ]);
  const byId=new Map(stats.results.map(r=>[r.item_id,r])),lowById=new Map(lows.results.map(r=>[r.item_id,r.low24h]));
  const summary={at,items:items.results.map(row=>{const stat=byId.get(row.item_id);return {itemId:row.item_id,lastPrice:row.last_ask,lastAt:row.last_ask_at,firstObservedAt:row.first_at,avg30d:stat?.avg30d??null,avg7d:stat?.avg7d??null,low24h:lowById.get(row.item_id)??null,low7d:stat?.low7d??null,low30d:stat?.low30d??null,allTimeLow:row.all_time_low,observations30d:stat?.observations30d??0};})};
  await stmt(db,"INSERT INTO market_meta VALUES('summary_cache',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify(summary)).run();
  return summary;
}
export default {
  async fetch(request,env){
    if(new URL(request.url).pathname!=="/history")return new Response("Not found",{status:404});
    if(request.method!=="GET")return new Response("Method not allowed",{status:405,headers:{Allow:"GET"}});
    try{return Response.json(await readMarketHistory(env,new URL(request.url)),{headers:{"Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}});}
    catch(error){return Response.json({error:error instanceof MarketHistoryError?error.message:"Our price history is temporarily unavailable. Live orders remain independent."},{status:error instanceof MarketHistoryError?error.status:503,headers:{"Cache-Control":"no-store"}});}
  },
  async scheduled(controller,env){
    try{const result=await collectMarket(env,{scheduledAt:controller.scheduledTime});console.log("Public market collection",JSON.stringify(result));}
    catch(error){console.error("Public market collection failed",error.message);throw error;}
  }
};
