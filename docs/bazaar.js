import {communityApiBase} from "./api-config.js?v=community-api-20261119";
const number = new Intl.NumberFormat("en");
const fallbackName = id => id.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,s=>s.toUpperCase());
const stamp = time => new Date(time).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit",second:"2-digit"});
const coins = value => value == null ? "—" : number.format(value) + " c";

export function renderBazaar({main, element, crumbs, footer, byId, guide, entryLink, initialItem}) {
  const api = ["localhost","127.0.0.1"].includes(window.location.hostname)
    ? new URL("/api/bazaar.json",window.location.origin) : new URL("bazaar.json",communityApiBase);
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
  let listController, detailController, detailSnapshot, shown=30;
  const search=element("input",{type:"search",placeholder:"Search items, e.g. Copper Ore","aria-label":"Search live Bazaar"});
  const side=element("select",{"aria-label":"Orders to show"},
    element("option",{value:"all"},"All orders"),element("option",{value:"sell"},"Items for sale"),element("option",{value:"buy"},"Items wanted"));
  const sort=element("select",{"aria-label":"Sort market"},
    element("option",{value:"name"},"Item name"),element("option",{value:"sell"},"Lowest sell price"),element("option",{value:"buy"},"Highest buy price"));
  const refresh=element("button",{type:"button",class:"button"},"Refresh market");
  const status=element("p",{class:"bazaar-status",role:"status"},"Loading current market…");
  const results=element("div",{class:"bazaar-results"});
  const detail=element("section",{class:"bazaar-detail","aria-label":"Selected item market"},
    element("h2",{},"Buy and sell orders"),element("p",{},"Select an item below to see its current orders and recent trades."));
  const guideSection=element("section",{class:"bazaar-guide","aria-labelledby":"bazaar-guide-title"},
    element("h2",{id:"bazaar-guide-title"},"How the Bazaar works"),
    element("p",{class:"intro"},"Release trading rules, costs and order controls. Checked November 20, 2026."),
    ...guide.sections.map(([heading,text],i)=>element("details",{...(i===0?{open:""}:{})},element("summary",{},heading),element("p",{},text))),
    element("div",{class:"related"},...(guide.related||[]).map(id=>entryLink(id,null,"button"))),
    element("div",{class:"sources"},element("h3",{},"Sources"),...guide.sources.map(([label,href])=>element("p",{},element("a",{href},label)))));
  const howButton=element("button",{class:"button",type:"button"},"How trading works ↓");
  howButton.addEventListener("click",()=>guideSection.scrollIntoView({behavior:"smooth",block:"start"}));
  const article=element("article",{class:"bazaar-page"},crumbs(null,"Bazaar"),element("h1",{},"Bazaar"),
    element("p",{class:"intro"},"Search Microscape’s current buy and sell orders, then learn how the release trading system works."),
    element("div",{class:"bazaar-actions"},element("a",{class:"button",href:"https://microscape.cc/play/",target:"_blank",rel:"noopener noreferrer"},"Open Bazaar in Microscape ↗"),howButton),
    element("section",{"aria-label":"Live Bazaar market"},element("h2",{},"Live market"),
      element("p",{class:"bazaar-help"},"Read-only public listings. Place trades inside Microscape. Updates every 30 seconds while this page is visible."),
      element("div",{class:"bazaar-controls"},search,side,sort,refresh),status,results),detail,guideSection);
  main.append(article,footer());

  function table(columns,rows,label) {
    return element("div",{class:"table-wrap",role:"region",tabindex:"0","aria-label":label},element("table",{},
      element("thead",{},element("tr",{},...columns.map(col=>element("th",{scope:"col"},col)))),
      element("tbody",{},...rows.map(row=>element("tr",{},...row.map(value=>element("td",{},value)))))));
  }
  function drawList() {
    if (!market) return;
    const q=search.value.trim().toLowerCase();
    const rows=market.items.filter(row=>(!q||[meta(row.itemId).title,row.itemId].some(s=>s.toLowerCase().includes(q)))
      &&(side.value==="all"||row[side.value+"Summary"]));
    rows.sort((a,b)=>{
      if (sort.value==="sell") return (a.sellSummary?.bestPricePerUnit??Infinity)-(b.sellSummary?.bestPricePerUnit??Infinity)||meta(a.itemId).title.localeCompare(meta(b.itemId).title);
      if (sort.value==="buy") return (b.buySummary?.bestPricePerUnit??-1)-(a.buySummary?.bestPricePerUnit??-1)||meta(a.itemId).title.localeCompare(meta(b.itemId).title);
      return meta(a.itemId).title.localeCompare(meta(b.itemId).title);
    });
    results.replaceChildren(element("p",{class:"bazaar-help"},`${number.format(rows.length)} matching items · quantities cover each side’s listed orders`));
    if (!rows.length) {results.append(element("p",{},market.items.length?"No open market listings match your search and filter.":"There are no open market listings in the latest public response."));return;}
    const cells=rows.slice(0,shown).map(row=>{
      const button=element("button",{type:"button",class:"bazaar-item-button",...(selected===row.itemId?{"aria-pressed":"true"}:{})},picture(row.itemId),meta(row.itemId).title);
      button.addEventListener("click",()=>select(row.itemId,true));
      return [button,coins(row.sellSummary?.bestPricePerUnit),row.sellSummary?number.format(row.sellSummary.quantity):"—",coins(row.buySummary?.bestPricePerUnit),row.buySummary?number.format(row.buySummary.quantity):"—"];
    });
    results.append(table(["Item","Lowest sell / each","For sale","Highest buy / each","Wanted"],cells,"Live market items"));
    if (rows.length>shown) {
      const more=element("button",{class:"button bazaar-more",type:"button"},"Show more items");
      more.addEventListener("click",()=>{shown+=30;drawList();});results.append(more);
    }
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
      element("p",{class:"bazaar-help"},"Prices are per item. Remaining quantities can change before the next check. Posted times use your local timezone."));
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
    window.history.replaceState(null,"","#/bazaar?"+new URLSearchParams({item:id}));drawList();
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
  function update() {if(!disposed&&!document.hidden){loadMarket();if(selected&&!detailController)select(selected);}}
  refresh.addEventListener("click",update);
  for(const control of [search,side,sort])control.addEventListener(control===search?"input":"change",()=>{shown=30;drawList();});
  const resume=()=>{if(!document.hidden)update();};document.addEventListener("visibilitychange",resume);
  const timer=setInterval(update,30_000);loadMarket();if(selected)select(selected);
  return ()=>{disposed=true;clearInterval(timer);document.removeEventListener("visibilitychange",resume);listController?.abort();detailController?.abort();};
}
