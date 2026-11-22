import {communityApiBase} from "./api-config.js?v=community-api-20261119";
import {renderBazaarWalkthrough} from "./bazaar-walkthrough.js?v=bazaar-visual-20261120";
import {priceChange,marketRows,sparkline,priceChart} from "./market-trends.js?v=market-20261122";
const number = new Intl.NumberFormat("en");
const fallbackName = id => id.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,s=>s.toUpperCase());
const stamp = time => new Date(time).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit"});
const coins = value => value == null ? "—" : number.format(value) + " c";
const percent=value=>value===null?"—":(value>0?"+":"")+new Intl.NumberFormat("en",{maximumFractionDigits:1}).format(value)+"%";
const watchKey="microscape-bazaar-watch-v1";

export function renderBazaar({main, element, crumbs, footer, byId, guide, entryLink, initialItem}) {
  const api = ["localhost","127.0.0.1"].includes(window.location.hostname)
    ? new URL("/api/bazaar.json",window.location.origin) : new URL("bazaar.json",communityApiBase);
  const historyApi=new URL("bazaar-history.json",api);
  const catalog = new Map();
  for (const page of byId.values()) if (page.gameId && ["items","pets"].includes(page.category)) {
    if (!catalog.has(page.gameId) || page.category === "pets") catalog.set(page.gameId,page);
  }
  const meta = id => catalog.get(id) || {title:fallbackName(id)};
  const picture = id => {
    const page=meta(id),src=page.portrait?.src||page.artwork;
    return src ? element("img",{src,alt:"",width:32,height:32,loading:"lazy",referrerpolicy:"no-referrer"}) : element("span",{"aria-hidden":"true"},"◇");
  };
  let disposed=false, market, selected=/^[a-zA-Z0-9_-]{1,80}$/.test(initialItem||"")?initialItem:null;
  let listController, detailController, detailSnapshot, shown=30,history,historyController,historyAttempt=0,chartController,sparkController,sparkRetry=0;
  const sparkCache=new Map(),watched=new Set();let watchStorage=true;
  try{const ids=JSON.parse(localStorage.getItem(watchKey)||"[]");if(Array.isArray(ids))for(const id of ids.slice(0,100))if(typeof id==="string"&&/^[a-zA-Z0-9_-]{1,80}$/.test(id))watched.add(id);}catch{watchStorage=false;}
  const trendCell=value=>element("span",{class:value>0?"market-up":value<0?"market-down":"market-flat"},(value>0?"▲ ":value<0?"▼ ":value===0?"▬ ":"")+percent(value));
  const historyMeta=id=>history?.items.find(row=>row.itemId===id);
  const allItems=element("input",{type:"checkbox",id:"market-unlisted"}),watchOnly=element("input",{type:"checkbox",id:"market-watched"});
  const search=element("input",{type:"search",placeholder:"Search items, e.g. Copper Ore","aria-label":"Search live Bazaar"});
  const side=element("select",{"aria-label":"Orders to show"},
    element("option",{value:"all"},"All orders"),element("option",{value:"sell"},"Items for sale"),element("option",{value:"buy"},"Items wanted"));
  const sort=element("select",{"aria-label":"Sort market"},
    element("option",{value:"name"},"Item name"),element("option",{value:"sell"},"Lowest sell price"),element("option",{value:"buy"},"Highest buy price"),element("option",{value:"below"},"Furthest below recorded average"),element("option",{value:"above"},"Furthest above recorded average"));
  const refresh=element("button",{type:"button",class:"button"},"Refresh market");
  const status=element("p",{class:"bazaar-status",role:"status"},"Loading current market…");
  const results=element("div",{class:"bazaar-results"});
  const historyStatus=element("p",{class:"bazaar-help",role:"status"},"Loading historical observations…"),overview=element("div",{class:"market-overview"}),watchPanel=element("div",{class:"market-watch-panel"});
  const chartRange=element("select",{"aria-label":"Price chart period"},...[['24h','24 hours'],['7d','7 days'],['1m','30 days'],['3m','3 months'],['6m','6 months'],['12m','12 months'],['all','All recorded history']].map(([value,title])=>element("option",{value,...(value==="7d"?{selected:""}:{})},title)));
  const chartHost=element("section",{class:"market-chart-panel","aria-label":"Historical price chart"});
  const chartCache=new Map();
  const detail=element("section",{class:"bazaar-detail","aria-label":"Selected item market"},
    element("h2",{},"Buy and sell orders"),element("p",{},"Select an item below to see its current orders and recent trades."));
  const guideSection=element("section",{class:"bazaar-guide","aria-labelledby":"bazaar-guide-title"},
    element("h2",{id:"bazaar-guide-title"},"How the Bazaar works"),
    renderBazaarWalkthrough(element),
    element("h2",{},"More detail and common questions"),
    ...guide.sections.map(([heading,text],i)=>element("details",{...(i===0?{open:""}:{})},element("summary",{},heading),element("p",{},text))),
    element("div",{class:"related"},...(guide.related||[]).map(id=>entryLink(id,null,"button"))),
    element("div",{class:"sources"},element("h3",{},"Sources"),...guide.sources.map(([label,href])=>element("p",{},element("a",{href},label)))));
  const howButton=element("button",{class:"button",type:"button"},"How to trade — picture guide ↓");
  howButton.addEventListener("click",()=>guideSection.scrollIntoView({behavior:"smooth",block:"start"}));
  const article=element("article",{class:"bazaar-page"},crumbs(null,"Bazaar"),element("h1",{},"Bazaar"),
    element("p",{class:"intro"},"Follow live buy and sell orders, explore recorded price movements, and find your next trade."),
    element("div",{class:"bazaar-actions"},element("a",{class:"button",href:"https://microscape.cc/play/",target:"_blank",rel:"noopener noreferrer"},"Open Bazaar in Microscape ↗"),howButton),
    element("section",{"aria-label":"Live Bazaar market"},element("h2",{},"Live market"),
      element("p",{class:"bazaar-help"},"Read-only public listings. Place trades inside Microscape. Updates every 30 seconds while this page is visible."),
      element("div",{class:"bazaar-controls"},search,side,sort,refresh),
      element("div",{class:"market-filter-options"},element("label",{for:"market-unlisted"},allItems,"Include items with history but no open orders"),element("label",{for:"market-watched"},watchOnly,"Watchlist only")),
      status,overview,historyStatus,
      element("p",{class:"bazaar-help market-source"},"Live orders: Microscape. Price history: ",element("a",{href:"https://microwiki.mhmm.pl/bazaar",target:"_blank",rel:"noopener noreferrer"},"Microwiki")," (refreshes every 5 minutes). Historical windows use available observations; they may cover less than the full period. Recorded listing prices are separate from completed trades."),
      watchPanel,results),detail,guideSection);
  main.append(article,footer());

  function table(columns,rows,label) {
    return element("div",{class:"table-wrap",role:"region",tabindex:"0","aria-label":label},element("table",{},
      element("thead",{},element("tr",{},...columns.map(col=>element("th",{scope:"col"},col)))),
      element("tbody",{},...rows.map(row=>element("tr",{},...row.map(value=>element("td",{},value)))))));
  }
  function drawList() {
    if (!market) return;
    const q=search.value.trim().toLowerCase();
    const all=marketRows(market.items,history?.items,allItems.checked);
    const comparable=all.filter(row=>row.change!==null);
    overview.replaceChildren(...[[market.items.filter(r=>r.sellSummary||r.buySummary).length,"Items with open orders"],[history?comparable.filter(r=>r.change>0).length:null,"Above recorded 30d average"],[history?comparable.filter(r=>r.change<0).length:null,"Below recorded 30d average"]].map(([value,title])=>element("div",{},element("strong",{},value===null?"—":number.format(value)),element("span",{},title))));
    const watchRows=all.filter(row=>watched.has(row.itemId));
    watchPanel.replaceChildren(...(watched.size?[element("h3",{},"Your watchlist"),element("p",{class:"bazaar-help"},watchStorage?"Saved only in this browser. These are bookmarks, not price alerts.":"Browser storage is unavailable; this watchlist lasts for this visit."),element("div",{class:"market-watch-cards"},...[...watched].slice(0,100).map(id=>{const row=watchRows.find(r=>r.itemId===id),button=element("button",{type:"button",class:"market-watch-card"},picture(id),element("span",{},meta(id).title,element("small",{},"Sell "+coins(row?.sellSummary?.bestPricePerUnit)+" · Buy "+coins(row?.buySummary?.bestPricePerUnit))));button.addEventListener("click",()=>select(id,true));return button;}))]:[]));
    const rows=all.filter(row=>(!q||[meta(row.itemId).title,row.itemId].some(s=>s.toLowerCase().includes(q)))
      &&(side.value==="all"||row[side.value+"Summary"])&&(!watchOnly.checked||watched.has(row.itemId)));
    rows.sort((a,b)=>{
      if (sort.value==="sell") return (a.sellSummary?.bestPricePerUnit??Infinity)-(b.sellSummary?.bestPricePerUnit??Infinity)||meta(a.itemId).title.localeCompare(meta(b.itemId).title);
      if (sort.value==="buy") return (b.buySummary?.bestPricePerUnit??-1)-(a.buySummary?.bestPricePerUnit??-1)||meta(a.itemId).title.localeCompare(meta(b.itemId).title);
      if (["below","above"].includes(sort.value))return (sort.value==="below"?(a.change??Infinity)-(b.change??Infinity):(b.change??-Infinity)-(a.change??-Infinity))||meta(a.itemId).title.localeCompare(meta(b.itemId).title);
      return meta(a.itemId).title.localeCompare(meta(b.itemId).title);
    });
    results.replaceChildren(element("p",{class:"bazaar-help"},`${number.format(rows.length)} matching items · coins per item · ▲/▼ in recent prices compares the first and last available samples; % vs average compares the current lowest sell order with recorded 30-day observations.`));
    if (!rows.length) {results.append(element("p",{},market.items.length?"No open market listings match your search and filter.":"There are no open market listings in the latest public response."));return;}
    const cells=rows.slice(0,shown).map(row=>{
      const button=element("button",{type:"button",class:"bazaar-item-button",...(selected===row.itemId?{"aria-pressed":"true"}:{})},picture(row.itemId),meta(row.itemId).title);
      button.addEventListener("click",()=>select(row.itemId,true));
      const watch=element("button",{type:"button",class:"market-watch-button","aria-label":(watched.has(row.itemId)?"Unwatch ":"Watch ")+meta(row.itemId).title,"aria-pressed":String(watched.has(row.itemId))},watched.has(row.itemId)?"★":"☆");
      watch.addEventListener("click",()=>{if(watched.has(row.itemId))watched.delete(row.itemId);else if(watched.size<100)watched.add(row.itemId);try{localStorage.setItem(watchKey,JSON.stringify([...watched]));}catch{watchStorage=false;}drawList();});
      const values=sparkCache.get(row.itemId)?.values||[],movement=values.length>1?priceChange(values.at(-1),values[0]):null;
      const mini=sparkline(values,"Recent recorded prices: "+percent(movement)+" across "+values.length+" samples");
      return [element("div",{class:"market-item-cell"},watch,button),coins(row.sellSummary?.bestPricePerUnit),coins(row.buySummary?.bestPricePerUnit),element("div",{class:"market-spark-cell"},...(mini?[mini,trendCell(movement)]:["—"])),trendCell(row.change),coins(row.history?.avg30d),coins(row.history?.low24h),coins(row.history?.low7d),element("span",{},(row.sellSummary?number.format(row.sellSummary.quantity):"—")+" / "+(row.buySummary?number.format(row.buySummary.quantity):"—"))];
    });
    results.append(table(["Item","Lowest sell","Highest buy","Recent prices","vs 30d avg","30d avg","24h low","7d low","For sale / wanted"],cells,"Live market items"));
    loadSparks(rows.slice(0,shown).map(row=>row.itemId));
    if (rows.length>shown) {
      const more=element("button",{class:"button bazaar-more",type:"button"},"Show more items");
      more.addEventListener("click",()=>{shown+=30;drawList();});results.append(more);
    }
  }
  async function readHistory(params,signal){
    const url=new URL(historyApi);url.search=new URLSearchParams(params);const r=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(12_000)]),cache:"no-store"});const body=await r.json();if(!r.ok)throw Error(body.error||"Historical prices are temporarily unavailable.");return body;
  }
  async function loadHistory(){
    if(historyController)return;historyAttempt=Date.now();const controller=new AbortController();historyController=controller;
    try{const snapshot=await readHistory({},controller.signal);if(disposed)return;if(!Array.isArray(snapshot.items)||!Number.isFinite(snapshot.lastPoll))throw Error("Historical prices returned an unreadable response.");history=snapshot;historyStatus.className="bazaar-help";historyStatus.textContent="History source last polled "+stamp(history.lastPoll)+" · no history is displayed as —, never as zero.";drawList();if(detailSnapshot)drawDetails(detailSnapshot);}
    catch(error){if(disposed||error.name==="AbortError")return;historyStatus.className="bazaar-help bazaar-warning";historyStatus.textContent="Historical prices unavailable. "+(history?"Showing the last history check from "+stamp(history.checkedAt)+". ":"")+"Live orders continue independently.";}
    finally{if(historyController===controller)historyController=null;}
  }
  async function loadSparks(ids){
    const now=Date.now(),missing=ids.filter(id=>!sparkCache.has(id)||now-sparkCache.get(id).at>300000).slice(0,30);if(!missing.length||sparkController||now<sparkRetry)return;
    const controller=new AbortController();sparkController=controller;
    try{const data=await readHistory({ids:missing.join(",")},controller.signal);if(disposed)return;for(const id of missing)sparkCache.set(id,{at:Date.now(),values:Array.isArray(data.series?.[id])?data.series[id]:[]});}
    catch(error){if(!disposed&&error.name!=="AbortError")sparkRetry=Date.now()+300000;}
    finally{if(sparkController===controller)sparkController=null;if(!disposed)drawList();}
  }
  async function loadChart(){
    if(!selected)return;const id=selected,range=chartRange.value,key=id+"/"+range;chartController?.abort();const controller=new AbortController();chartController=controller;
    const previous=chartCache.get(key),body=element("div",{class:"market-chart-body"});
    chartHost.replaceChildren(element("div",{class:"market-chart-heading"},element("h3",{},"Recorded price history"),chartRange),body);
    const stats=historyMeta(id);
    if(stats){
      const metrics=[["30d observed average",stats.avg30d],["24h recorded low",stats.low24h],["7d recorded low",stats.low7d],["All-time recorded low",stats.allTimeLow]];
      body.append(element("div",{class:"market-item-statistics"},...metrics.map(([label,value])=>element("div",{},element("small",{},label),element("strong",{},coins(value))))));
    }
    const chart=element("div",{},previous?priceChart(previous.points,element):element("p",{class:"bazaar-help",role:"status"},"Loading recorded prices…"));body.append(chart);
    if(previous&&Date.now()-previous.checkedAt<300000){chartController=null;return;}
    try{const data=await readHistory({item:id,range},controller.signal);if(disposed||id!==selected||range!==chartRange.value)return;if(!Array.isArray(data.points)||data.itemId!==id)throw Error("Historical prices returned an unreadable chart.");chartCache.set(key,data);chart.replaceChildren(priceChart(data.points,element));}
    catch(error){if(disposed||error.name==="AbortError"||id!==selected||range!==chartRange.value)return;chart.replaceChildren(...(previous?[priceChart(previous.points,element)]:[]),element("p",{class:"bazaar-warning"},previous?"Could not refresh this chart. Showing the previous historical snapshot.":"Price history is unavailable. Live orders and completed trades are shown separately below."));}
    finally{if(chartController===controller)chartController=null;}
  }
  async function read(item,signal) {
    const url=new URL(api);if(item)url.searchParams.set("item",item);
    const response=await fetch(url,{signal:AbortSignal.any([signal,AbortSignal.timeout(12_000)]),cache:"no-store"});
    const body=await response.json();
    if(!response.ok)throw Error(body.error||"The live market could not be refreshed.");
    if(!Number.isFinite(body.checkedAt)||(item?body.item?.itemId!==item:!Array.isArray(body.items)))throw Error("The live market returned an unreadable response.");
    return body;
  }
  async function loadMarket() {
    if(listController)return;
    const controller=new AbortController();listController=controller;refresh.disabled=true;
    try {
      const snapshot=await read(null,controller.signal);if(disposed)return;
      market=snapshot;status.className="bazaar-status";
      status.textContent="Market checked "+stamp(snapshot.checkedAt)+" · refreshes every 30 seconds";drawList();
    } catch(error) {
      if(disposed||error.name==="AbortError")return;
      status.className="bazaar-status bazaar-warning";
      status.textContent=error.message+(market?" Showing the last successful check from "+stamp(market.checkedAt)+"; these listings may have changed.":" Try Refresh or open the Bazaar in Microscape.");
    } finally {if(listController===controller)listController=null;if(!disposed)refresh.disabled=false;}
  }
  function drawDetails(snapshot,warning) {
    const item=snapshot.item,page=meta(item.itemId);
    detail.replaceChildren(element("div",{class:"bazaar-item-heading"},picture(item.itemId),element("h2",{},page.title),
      ...(page.id?[entryLink(page.id,"Item stats and requirements ↗","button")]:[])),
      element("p",{class:"bazaar-status"},"Orders checked "+stamp(snapshot.checkedAt)),
      ...(warning?[element("p",{class:"bazaar-warning",role:"status"},warning)]:[]),
      element("p",{class:"bazaar-help"},"Prices are per item. Remaining quantities can change before the next check. Posted times use your local timezone."),chartHost);
    loadChart();
    for (const [key,title] of [["sellOrders","Sell orders — lowest price first"],["buyOrders","Buy orders — highest price first"]]) {
      const rows=item[key];detail.append(element("h3",{},title));
      detail.append(rows.length?table(["Price / each","Remaining","Order value","Posted"],rows.map(row=>[
        coins(row.pricePerUnit),number.format(row.quantity),coins(row.pricePerUnit*row.quantity),stamp(row.postedAt)]),title)
        :element("p",{},key==="sellOrders"?"No open sell orders for this item at the last check.":"No open buy orders for this item at the last check."));
    }
    detail.append(element("h3",{},"Recent completed trades"));
    if (item.referencePrice) detail.append(element("p",{class:"bazaar-help"},"Game market reference: "+coins(item.referencePrice)+" per item. This is separate from current orders and NPC vendor prices."));
    detail.append(item.recentTrades.length?table(["Traded","Quantity","Price / each"],item.recentTrades.map(row=>[stamp(row.tradedAt),number.format(row.quantity),coins(row.pricePerUnit)]),"Recent completed trades")
      :element("p",{},"No recent trades were included in the public response."));
  }
  async function select(id,scroll=false) {
    selected=id;detailController?.abort();const controller=new AbortController();detailController=controller;
    const previous=detailSnapshot?.item.itemId===id?detailSnapshot:null;
    if (!previous) detail.replaceChildren(element("h2",{},meta(id).title),element("p",{role:"status"},"Loading current buy/sell orders…"));
    window.history.replaceState(null,"","/bazaar/?"+new URLSearchParams({item:id}));drawList();
    if(scroll)detail.scrollIntoView({behavior:"smooth",block:"start"});
    try {
      const snapshot=await read(id,controller.signal);if(disposed||selected!==id)return;
      detailSnapshot=snapshot;drawDetails(snapshot);
    } catch(error) {
      if(disposed||error.name==="AbortError"||selected!==id)return;
      if(previous)drawDetails(previous,"Could not refresh these orders. The displayed snapshot may be out of date.");
      else detail.replaceChildren(element("h2",{},meta(id).title),element("p",{class:"bazaar-warning",role:"status"},error.message),element("p",{},"Use Refresh market to retry. A failed check does not mean there are no orders."));
    } finally {if(detailController===controller)detailController=null;}
  }
  function update() {if(!disposed&&!document.hidden){loadMarket();if(Date.now()-historyAttempt>=300000)loadHistory();if(selected&&!detailController)select(selected);}}
  refresh.addEventListener("click",()=>{historyAttempt=0;sparkRetry=0;update();});
  for(const control of [search,side,sort,allItems,watchOnly])control.addEventListener(control===search?"input":"change",()=>{shown=30;drawList();});
  chartRange.addEventListener("change",loadChart);
  const resume=()=>{if(!document.hidden)update();};document.addEventListener("visibilitychange",resume);
  const timer=setInterval(update,30_000);loadMarket();loadHistory();if(selected)select(selected);
  return ()=>{disposed=true;clearInterval(timer);document.removeEventListener("visibilitychange",resume);listController?.abort();detailController?.abort();historyController?.abort();sparkController?.abort();chartController?.abort();};
}
