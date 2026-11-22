// Public observed-price data, credited in the UI. No seller/account fields leave
// this relay. The official live order feed remains independent of this source.
const source="https://microwiki.mhmm.pl";
const idPattern=/^[a-zA-Z0-9_-]{1,80}$/;
const ranges=new Set(["24h","7d","1m","3m","6m","12m","all"]);
const price=n=>Number.isFinite(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER?n:null;
const time=n=>Number.isFinite(n)&&n>0&&n<1e11?Math.round(n*1000):null;
export class HistoryError extends Error{constructor(message,status=503){super(message);this.status=status;}}
function query(url){
  const entries=[...url.searchParams],keys=entries.map(([k])=>k);
  if(new Set(keys).size!==keys.length||keys.some(k=>!["item","range","ids"].includes(k)))throw new HistoryError("Choose a valid market history request.",400);
  const item=url.searchParams.get("item"),range=url.searchParams.get("range"),ids=url.searchParams.get("ids");
  if(ids!==null){const list=ids.split(",");if(item!==null||range!==null||list.length>30||!list.length||list.some(id=>!idPattern.test(id)))throw new HistoryError("Choose up to 30 valid items.",400);return {ids:[...new Set(list)].sort()};}
  if(item!==null){if(!idPattern.test(item)||range!==null&&!ranges.has(range))throw new HistoryError("Choose a valid item and chart period.",400);return {item,range:range||"7d"};}
  if(range!==null)throw new HistoryError("Choose an item for this chart period.",400);
  return {};
}
async function read(path,params){
  const url=new URL(path,source);url.search=new URLSearchParams(params);
  const response=await fetch(url,{signal:AbortSignal.timeout(8_000),credentials:"omit",cache:"no-store",headers:{Accept:"application/json"}});
  if(!response.ok)throw new HistoryError("Historical prices are temporarily unavailable. Live orders are independent of this source.");
  return response.json();
}
export async function fetchMarketHistory(requestUrl){
  const q=query(requestUrl),base={checkedAt:Date.now(),source:"Microwiki",sourceUrl:source+"/bazaar"};
  if(q.ids){
    const data=await read("/api/bazaar/sparklines",{ids:q.ids.join(",")});
    if(!data.series||typeof data.series!=="object")throw new HistoryError("Historical prices returned an unreadable response.");
    const series=Object.create(null);for(const id of q.ids){const values=Object.hasOwn(data.series,id)?data.series[id]:undefined;if(values===undefined)continue;if(!Array.isArray(values)||values.length>1000||values.some(v=>price(v)===null))throw new HistoryError("Historical prices returned an unreadable series.");series[id]=values;}
    return {...base,series};
  }
  if(q.item){
    const data=await read("/api/bazaar/history",{itemId:q.item,chart:q.range});
    if(!Array.isArray(data.points)||data.points.length>20000)throw new HistoryError("Historical prices returned an unreadable chart.");
    const points=data.points.map(p=>{const at=time(p?.ts),value=price(p?.price);if(!at||value===null)throw new HistoryError("Historical prices returned an unreadable point.");return {at,price:value};}).sort((a,b)=>a.at-b.at);
    return {...base,itemId:q.item,range:q.range,points};
  }
  const data=await read("/api/bazaar/all",{});
  if(!Array.isArray(data.items)||data.items.length>10000||!time(data.updatedAt)||!time(data.lastPoll))throw new HistoryError("Historical prices returned an unreadable market.");
  const items=data.items.map(row=>{
    if(!idPattern.test(row?.itemId||""))throw new HistoryError("Historical prices returned an unreadable item.");
    return {itemId:row.itemId,lastPrice:price(row.currentPrice),lastAt:time(row.currentTs),avg30d:price(row.avg1m),avg7d:price(row.avg7d),low24h:price(row.min24h),low7d:price(row.min7d),low30d:price(row.min1m),allTimeLow:price(row.allTimeMin)};
  });
  return {...base,updatedAt:time(data.updatedAt),lastPoll:time(data.lastPoll),items};
}
export async function marketHistoryResponse(url,context){
  const q=query(url),key=new URL("/bazaar-history.json",url.origin);
  if(q.ids)key.searchParams.set("ids",q.ids.join(","));if(q.item){key.searchParams.set("item",q.item);key.searchParams.set("range",q.range);}
  const cache=globalThis.caches?.default,cached=await cache?.match(new Request(key));if(cached)return cached;
  const data=await fetchMarketHistory(key),response=Response.json(data,{headers:{"Cache-Control":"public, max-age=300","X-Content-Type-Options":"nosniff"}});
  if(cache&&context?.waitUntil)context.waitUntil(cache.put(new Request(key),response.clone()));return response;
}
