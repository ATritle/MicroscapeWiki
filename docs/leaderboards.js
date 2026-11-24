import {communityApiBase} from "./api-config.js?v=community-api-20261119";
export const leaderboardSkills = [["all","Overall · Total levels"],["attack","Attack"],["strength","Strength"],["defense","Defense"],["evilMagic","Evil Magic"],["ranged","Ranged"],["piety","Piety"],["woodcutting","Woodcutting"],["firemaking","Firemaking"],["fishing","Fishing"],["cooking","Cooking"],["mining","Mining"],["smithing","Smithing"],["crafting","Crafting"],["goodMagic","Good Magic"],["fletching","Fletching"],["herblaw","Herblaw"]];
const numericId=/^[1-9][0-9]{0,24}$/;
const number=new Intl.NumberFormat("en");
function base() { return ["localhost","127.0.0.1"].includes(window.location.hostname)?new URL("/api/",window.location.origin):new URL(communityApiBase); }
async function read(endpoint,params,signal) {
  const url=new URL(endpoint,base());url.search=new URLSearchParams(params);
  const response=await fetch(url,{credentials:"omit",cache:"no-store",signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15_000)]):AbortSignal.timeout(15_000)});
  const data=await response.json();if(!response.ok)throw Error(data.error||"Rankings are temporarily unavailable.");
  if(!Number.isFinite(data.checkedAt))throw Error("Rankings returned an unreadable response.");return data;
}
export async function readPlayerRanks(id,signal) {
  if(!numericId.test(id))throw Error("Player rank is unavailable.");
  const data=await read("player-ranks.json",{id},signal);
  if(data.playerId!==id||data.communityId!=="all"||!data.ranks||typeof data.ranks!=="object"||Array.isArray(data.ranks))throw Error("Player rank returned an unreadable response.");
  if(data.ranks.all!=null&&(!Number.isSafeInteger(data.ranks.all)||data.ranks.all<1))throw Error("Player rank returned an unreadable response.");return data;
}
export function renderLeaderboards({main,element:e,crumbs,footer,initialParams=""}) {
  const params=new URLSearchParams(initialParams),skills=new Map(leaderboardSkills);
  let currentCommunity=params.get("community")||"all",currentSkill=params.get("skill")||"all";
  const player=numericId.test(params.get("player")||"")?params.get("player"):"0";
  if(currentCommunity!=="all"&&!numericId.test(currentCommunity))currentCommunity="all";
  if(!skills.has(currentSkill))currentSkill="all";
  let communities=[],disposed=false,controller,communityController,lastSnapshot;
  const communitySearch=e("input",{type:"search",placeholder:"Search Twitch communities…","aria-label":"Find a Twitch community"});
  const communitySelect=e("select",{"aria-label":"Twitch community"},e("option",{value:"all"},"All communities · Global"));
  const communityStatus=e("p",{class:"leaderboard-help",role:"status"},"Loading the community directory…");
  const skillSelect=e("select",{"aria-label":"Rank by skill"},...leaderboardSkills.map(([id,name])=>e("option",{value:id,...(id===currentSkill?{selected:""}:{})},name)));
  const refresh=e("button",{class:"button",type:"button"},"Refresh rankings");
  const status=e("p",{class:"leaderboard-status",role:"status","aria-live":"polite"},"Loading official rankings…");
  const results=e("div",{class:"leaderboard-results","aria-busy":"true"});
  main.append(e("article",{class:"leaderboards-page"},crumbs(null,"Leaderboards"),e("h1",{},"Leaderboards"),
    e("p",{class:"intro"},"Compare Microscape’s overall and skill rankings, globally or within any listed Twitch community."),
    e("div",{class:"leaderboard-controls"},e("label",{},"Find a community",communitySearch),e("label",{},"Twitch community",communitySelect),e("label",{},"Rank by",skillSelect),refresh),
    communityStatus,status,results,
    e("p",{class:"leaderboard-help"},"Ranks and levels come directly from the game for the selected community and skill. Overall means total skill levels. The game returns a leading list (up to 200 entries), and may add a selected player’s row. Missing ranks are not treated as zero. This is not a complete player directory."),
    e("p",{class:"leaderboard-help"},"Checks for updates every minute while this page is visible. Community results can differ from global results. ",e("a",{href:"https://microscape.cc/play/",target:"_blank",rel:"noopener noreferrer"},"Open Microscape ↗"))),footer());
  function fillCommunities() {
    const q=communitySearch.value.trim().toLocaleLowerCase();
    const matches=communities.filter(c=>!q||c.name.toLocaleLowerCase().includes(q)||c.channel?.includes(q));
    const selected=communities.find(c=>c.id===currentCommunity);
    const options=selected&&!matches.some(c=>c.id===selected.id)?[selected,...matches]:matches;
    communitySelect.replaceChildren(e("option",{value:"all"},"All communities · Global"),...options.map(c=>e("option",{value:c.id,...(c.id===currentCommunity?{selected:""}:{})},c.name)));
    if(currentCommunity!=="all"&&!selected)communitySelect.append(e("option",{value:currentCommunity,selected:""},"Community "+currentCommunity));
    communityStatus.textContent=number.format(matches.length)+" matching communities · "+number.format(communities.length)+" in the game directory";
  }
  function syncUrl() {
    const q=new URLSearchParams();if(currentCommunity!=="all")q.set("community",currentCommunity);if(currentSkill!=="all")q.set("skill",currentSkill);if(player!=="0")q.set("player",player);
    window.history.replaceState(null,"","/leaderboards/"+(q.size?"?"+q:""));
  }
  function draw(snapshot) {
    const community=communities.find(c=>c.id===snapshot.communityId)?.name || (snapshot.communityId==="all"?"All communities":"Selected community");
    const heading=e("h2",{},community+" · "+skills.get(snapshot.skillId));
    const caption=e("p",{class:"leaderboard-help"},number.format(snapshot.ranking.length)+" ranked players returned · Select a name to open Player Lookup.");
    const selected=snapshot.ranking.find(row=>row.id===player);
    if(selected)caption.append(e("span",{class:"leaderboard-selected-label"},"Selected: "+selected.name+" · #"+number.format(selected.rank)));
    if(!snapshot.ranking.length){results.replaceChildren(heading,e("p",{},"No rankings were returned for this community and skill."));return;}
    const table=e("table",{},e("thead",{},e("tr",{},...["Rank","Player",snapshot.skillId==="all"?"Total level":"Skill level"].map(label=>e("th",{scope:"col"},label)))),
      e("tbody",{},...snapshot.ranking.map(row=>e("tr",{...(row.id===player?{class:"leaderboard-selected"}:{})},e("td",{},"#"+number.format(row.rank)),
        e("td",{},e("a",{href:"/player-lookup/?"+new URLSearchParams({name:row.name})},row.name),...(row.id===player?[e("span",{class:"leaderboard-selected-label"},"Selected player")]:[])),e("td",{},number.format(row.level))))));
    results.replaceChildren(heading,caption,e("div",{class:"table-wrap",tabindex:"0",role:"region","aria-label":"Player rankings"},table));
  }
  async function loadCommunities() {
    communityController=new AbortController();
    try { const data=await read("communities.json",{},communityController.signal);if(disposed)return;if(!Array.isArray(data.communities))throw Error("The community directory could not be read.");communities=data.communities;fillCommunities();if(lastSnapshot)draw(lastSnapshot); }
    catch(error) { if(disposed||error.name==="AbortError")return;communityStatus.textContent="Community directory unavailable. Global rankings and the current selection still work. Refresh to retry."; }
    finally {communityController=null;}
  }
  async function load() {
    controller?.abort();const request=new AbortController();controller=request;refresh.disabled=true;results.setAttribute("aria-busy","true");
    const community=currentCommunity,skill=currentSkill;status.textContent="Loading official rankings…";
    if(lastSnapshot&&(lastSnapshot.communityId!==community||lastSnapshot.skillId!==skill)){lastSnapshot=null;results.replaceChildren();}
    try {
      const snapshot=await read("leaderboard.json",{community,skill,...(player!=="0"?{player}:{})},request.signal);
      if(disposed||controller!==request)return;
      if(!Array.isArray(snapshot.ranking)||snapshot.communityId!==community||snapshot.skillId!==skill)throw Error("The leaderboard returned an unreadable response.");
      lastSnapshot=snapshot;draw(snapshot);status.textContent="Official game rankings · Checked "+new Date(snapshot.checkedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})+" · "+(community==="all"?"Global ranks":"Community ranks");
    } catch(error) {
      if(disposed||controller!==request||error.name==="AbortError")return;
      status.textContent=(error.name==="TimeoutError"?"The ranking check timed out.":error.message)+(lastSnapshot?" Showing the last successful check; rankings may have changed.":" Try Refresh shortly.");
    } finally {if(controller===request){controller=null;if(!disposed){refresh.disabled=false;results.setAttribute("aria-busy","false");}}}
  }
  communitySearch.addEventListener("input",fillCommunities);
  communitySelect.addEventListener("change",()=>{currentCommunity=communitySelect.value;syncUrl();load();});
  skillSelect.addEventListener("change",()=>{currentSkill=skillSelect.value;syncUrl();load();});
  refresh.addEventListener("click",()=>{if(!communities.length&&!communityController)loadCommunities();load();});
  const resume=()=>{if(!document.hidden)load();};
  let timer;if(!globalThis.__WIKI_PRERENDER__){if(currentCommunity!=="all")fillCommunities();loadCommunities();load();timer=setInterval(resume,60_000);document.addEventListener("visibilitychange",resume);}
  return ()=>{disposed=true;controller?.abort();communityController?.abort();clearInterval(timer);document.removeEventListener("visibilitychange",resume);};
}
