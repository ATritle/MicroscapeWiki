import {worldMapData as data} from "./world-map-data.js?v=map-food-search-20261121";

export const normalizeMapSearch=value=>value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/['’]/g,"").replace(/[^a-z0-9]+/g," ").trim();
export function searchWorldMap(query,catalog=data) {
  const text=normalizeMapSearch(query),tokens=text.split(" ").filter(Boolean);
  if(!tokens.length)return [];
  const petHub=/^pets?$/.test(text);
  const cooking=text==="cooking";
  const enemyName=[text,text.endsWith("s")?text.slice(0,-1):text].find(name=>catalog.zones.some(z=>z.terms.some(([kind,label])=>kind==="Enemy"&&normalizeMapSearch(label)===name)));
  const exact=catalog.zones.filter(z=>normalizeMapSearch(z.name)===text);
  return (exact.length?exact:catalog.zones).flatMap(zone=>{
    if(petHub)return zone.petMaps?[{zone,reasons:["Pet maps · Mork and Otis"]}]:[];
    const terms=zone.terms.filter(([kind,name,detail,context])=>{
      if(enemyName)return kind==="Enemy"&&normalizeMapSearch(name)===enemyName;
      if(cooking)return context==="cooking"&&kind==="Skill";
      if(context==="cooking")return false;
      const words=normalizeMapSearch(kind+" "+name+(context==="cooking-pet"?"":" "+detail)).split(" ");
      return tokens.every(t=>words.some(word=>word.startsWith(t)));
    });
    return terms.length?[{zone,reasons:[...new Set(terms.map(([kind,name,detail])=>kind+": "+name+(detail?" · "+detail:"")))]}]:[];
  }).sort((a,b)=>a.zone.name.localeCompare(b.zone.name));
}
export function zoomMapView(view,factor,anchor,min,max) {
  const scale=Math.min(max,Math.max(min,view.scale*factor)),ratio=scale/view.scale;
  return {scale,x:anchor.x-(anchor.x-view.x)*ratio,y:anchor.y-(anchor.y-view.y)*ratio};
}
export function centeredMapView(view,position,size) {
  return {...view,x:size.width/2-position[0]*view.scale,y:size.height/2-position[1]*view.scale};
}

export function renderWorldMap({element:e,entryUrl,initialQuery=""}) {
  const search=e("input",{id:"location-map-search",type:"search",placeholder:"Search an item, activity, NPC or location…",maxlength:"120",autocomplete:"off",value:initialQuery,"aria-describedby":"world-map-search-help"});
  const clear=e("button",{type:"button",class:"button"},"Clear search");
  const form=e("form",{class:"world-map-search",role:"search","aria-label":"Find locations on the world map"},
    e("label",{for:"location-map-search"},"Find an item or activity"),e("div",{class:"world-map-search-row"},search,clear),
    e("p",{id:"world-map-search-help",class:"world-map-help"},"Try Pet, Mork, Copper Ore, Fishing or Bank. Search Cooking for cooking spots. One matching location is centered; multiple locations are highlighted without moving your view."));
  const status=e("p",{class:"world-map-status",role:"status","aria-live":"polite"});
  const image=e("img",{class:"world-map-art",src:data.image.src,width:data.image.width,height:data.image.height,alt:"Microscape world map",draggable:"false",decoding:"async"});
  const pins=e("div",{class:"world-map-pins"});
  const viewport=e("div",{class:"world-map-viewport",tabindex:"0",role:"region","aria-label":"Interactive Microscape world map","aria-describedby":"world-map-controls-help"},image,pins);
  const zoomOut=e("button",{type:"button",class:"button","aria-label":"Zoom out"},"−");
  const zoomIn=e("button",{type:"button",class:"button","aria-label":"Zoom in"},"+");
  const reset=e("button",{type:"button",class:"button"},"Reset view");
  const zoomLabel=e("span",{class:"world-map-zoom","aria-label":"Map zoom"},"100%");
  const results=e("div",{class:"world-map-results",hidden:""});
  const section=e("section",{class:"world-map","aria-labelledby":"world-map-heading"},
    e("div",{class:"world-map-heading"},e("h2",{id:"world-map-heading"},"Explore the world"),e("span",{class:"world-map-key"},"Teal pins show search matches")),form,
    e("div",{class:"world-map-toolbar"},e("p",{id:"world-map-controls-help",class:"world-map-help"},"Scroll to zoom · Drag to pan · Click a pin to open its location"),e("div",{class:"world-map-controls"},zoomOut,zoomLabel,zoomIn,reset)),
    viewport,status,results,
    e("p",{class:"world-map-credit"},"Original map and location data: ",e("a",{href:"https://microscape.cc/play/",target:"_blank",rel:"noopener noreferrer"},"Microscape")," · Checked November 21, 2026. Interior chambers use their dungeon entrance pin."));
  const grouped=new Map();
  for(const zone of data.zones){if(!grouped.has(zone.pin))grouped.set(zone.pin,[]);grouped.get(zone.pin).push(zone);}
  const markers=[...grouped].map(([id,zones])=>{
    const zone=zones.find(z=>!z.entrance)||zones[0];
    const anchor=e("a",{class:"world-map-pin",href:entryUrl(zone.id),"aria-label":zone.name,"data-pin":id},
      e("span",{class:"world-map-pin-dot","aria-hidden":"true"}),e("span",{class:"world-map-pin-label"},zone.name));
    pins.append(anchor);return {id,zones,anchor,position:zone.position};
  });
  let matches=[],view={scale:1,x:0,y:0},size={width:900,height:560},ready=false,disposed=false,timer,observer,drag,suppressClickUntil=0;
  const bounds={left:Math.min(...markers.map(m=>m.position[0]))-80,right:Math.max(...markers.map(m=>m.position[0]))+80,top:Math.min(...markers.map(m=>m.position[1]))-80,bottom:Math.max(...markers.map(m=>m.position[1]))+80};
  const minimum=()=>Math.min(size.width/data.image.width,size.height/data.image.height)*.8;
  function draw() {
    view.x=Math.max(size.width/2-data.image.width*view.scale,Math.min(size.width/2,view.x));
    view.y=Math.max(size.height/2-data.image.height*view.scale,Math.min(size.height/2,view.y));
    image.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.scale})`;
    for(const marker of markers){marker.anchor.style.left=(view.x+marker.position[0]*view.scale)+"px";marker.anchor.style.top=(view.y+marker.position[1]*view.scale)+"px";}
    zoomLabel.textContent=Math.round(view.scale*100)+"%";
    viewport.dataset.scale=String(view.scale);viewport.dataset.x=String(view.x);viewport.dataset.y=String(view.y);
    zoomOut.disabled=view.scale<=minimum()+.0001;zoomIn.disabled=view.scale>=3;
  }
  function resetView() {
    if(!size.width||!size.height)return;
    view.scale=Math.min(size.width/(bounds.right-bounds.left),size.height/(bounds.bottom-bounds.top));
    view=centeredMapView(view,[(bounds.left+bounds.right)/2,(bounds.top+bounds.bottom)/2],size);draw();
  }
  function zoom(factor,anchor={x:size.width/2,y:size.height/2}){view=zoomMapView(view,factor,anchor,minimum(),3);draw();}
  function applySearch({move=true,url=true}={}) {
    const query=search.value.trim().slice(0,120);
    matches=searchWorldMap(query);
    const ids=new Set(matches.map(m=>m.zone.id));
    for(const marker of markers){
      const hits=marker.zones.filter(z=>ids.has(z.id)),single=hits.length===1?hits[0]:null;
      marker.anchor.classList.toggle("is-match",hits.length>0);
      marker.anchor.classList.toggle("is-single-match",matches.length===1&&hits.length>0);
      marker.anchor.classList.toggle("is-muted",Boolean(query)&&!hits.length);
      const target=single||marker.zones.find(z=>!z.entrance)||marker.zones[0];
      marker.anchor.href=entryUrl(target.id);marker.anchor.setAttribute("aria-label",target.name+(hits.length?" · search match":""));
      marker.anchor.querySelector(".world-map-pin-label").textContent=target.name;
    }
    if(query&&matches.length===1){
      status.textContent="1 matching location · "+matches[0].zone.name+(matches[0].zone.entrance?" · entrance at "+matches[0].zone.entrance:"");
      if(move&&ready){view.scale=Math.max(view.scale,.85);view=centeredMapView(view,matches[0].zone.position,size);draw();}
    }else status.textContent=query?(matches.length?matches.length+" matching locations · highlighted pins · your map view stays in place":"No matching locations. Try an item, activity, NPC or shorter name."):markers.length+" world-map pins · browse locations or search above";
    results.hidden=!query||!matches.length;
    results.replaceChildren(...matches.map(({zone,reasons})=>e("a",{class:"world-map-result",href:entryUrl(zone.id)},
      e("strong",{},zone.name),e("span",{},reasons.slice(0,2).join("; ")),
      ...(zone.entrance?[e("small",{},"Inside dungeon · entrance: "+zone.entrance)]:[]))));
    if(url&&!globalThis.__WIKI_PRERENDER__){const next=new URL(window.location.href);if(query)next.searchParams.set("q",query);else next.searchParams.delete("q");window.history.replaceState(null,"",next);}
  }
  const updateSize=()=>{
    if(disposed||!viewport.isConnected)return;
    const previous=size;size={width:viewport.clientWidth,height:viewport.clientHeight};
    if(!size.width||!size.height)return;
    if(!ready){ready=true;viewport.dataset.ready="true";resetView();if(search.value.trim())applySearch({url:false});}
    else {view.x+=(size.width-previous.width)/2;view.y+=(size.height-previous.height)/2;draw();}
  };
  resetView();
  applySearch({move:false,url:false});
  if(!globalThis.__WIKI_PRERENDER__) {
    for(const marker of markers)marker.anchor.addEventListener("focus",()=>{
      if(!ready)return;
      const x=view.x+marker.position[0]*view.scale,y=view.y+marker.position[1]*view.scale;
      if(x<35||x>size.width-35||y<45||y>size.height-20){view=centeredMapView(view,marker.position,size);draw();}
    });
    form.addEventListener("submit",event=>{event.preventDefault();clearTimeout(timer);applySearch();});
    search.addEventListener("input",()=>{clearTimeout(timer);timer=setTimeout(()=>applySearch(),180);});
    clear.addEventListener("click",()=>{clearTimeout(timer);search.value="";applySearch();search.focus();});
    zoomIn.addEventListener("click",()=>zoom(1.3));zoomOut.addEventListener("click",()=>zoom(1/1.3));reset.addEventListener("click",resetView);
    viewport.addEventListener("wheel",event=>{event.preventDefault();const rect=viewport.getBoundingClientRect();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?size.height:1);zoom(Math.exp(-Math.max(-180,Math.min(180,delta))*.004),{x:event.clientX-rect.left,y:event.clientY-rect.top});},{passive:false});
    viewport.addEventListener("keydown",event=>{
      if(event.target!==viewport)return;
      const moves={ArrowLeft:[80,0],ArrowRight:[-80,0],ArrowUp:[0,80],ArrowDown:[0,-80]};
      if(moves[event.key]){event.preventDefault();view.x+=moves[event.key][0];view.y+=moves[event.key][1];draw();}
      else if(["+","=","-","Home"].includes(event.key)){event.preventDefault();if(event.key==="Home")resetView();else zoom(event.key==="-"?1/1.3:1.3);}
    });
    viewport.addEventListener("pointerdown",event=>{if(event.button!==0||!event.isPrimary)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,view:{...view},moved:false};});
    viewport.addEventListener("pointermove",event=>{
      if(!drag||event.pointerId!==drag.id)return;
      if(event.pointerType==="mouse"&&!(event.buttons&1)){drag=null;viewport.classList.remove("is-dragging");return;}
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
      if(!drag.moved&&Math.hypot(dx,dy)<5)return;
      if(!drag.moved){drag.moved=true;viewport.setPointerCapture(event.pointerId);viewport.classList.add("is-dragging");}
      event.preventDefault();view={...drag.view,x:drag.view.x+dx,y:drag.view.y+dy};draw();
    });
    const endDrag=event=>{if(drag?.id!==event.pointerId)return;if(drag.moved)suppressClickUntil=performance.now()+250;drag=null;viewport.classList.remove("is-dragging");if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);};
    viewport.addEventListener("pointerup",endDrag);viewport.addEventListener("pointercancel",endDrag);viewport.addEventListener("lostpointercapture",()=>{drag=null;viewport.classList.remove("is-dragging");});
    viewport.addEventListener("pointerleave",()=>{if(drag&&!drag.moved)drag=null;});
    viewport.addEventListener("click",event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();}},true);
    if(typeof ResizeObserver!=="undefined"){observer=new ResizeObserver(updateSize);observer.observe(viewport);}else window.addEventListener("resize",updateSize);
    queueMicrotask(updateSize);
  }
  return {node:section,dispose(){disposed=true;clearTimeout(timer);observer?.disconnect();if(!globalThis.__WIKI_PRERENDER__)window.removeEventListener("resize",updateSize);}};
}
