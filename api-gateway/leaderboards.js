const skills = new Set(["all","attack","strength","defense","evilMagic","ranged","piety","woodcutting","firemaking","fishing","cooking","mining","smithing","crafting","goodMagic","fletching","herblaw"]);
const idPattern = /^[1-9][0-9]{0,24}$/;
const validName = value => typeof value === "string" && value.trim().length > 0 && value.length <= 80 && !/[\u0000-\u001f]/.test(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
export class RankingsError extends Error { constructor(message,status=503) { super(message); this.status=status; } }
function parameters(url) {
  const kind = url.pathname.split("/").at(-1);
  const allowed = kind === "communities.json" ? [] : kind === "player-ranks.json" ? ["id","community"] : ["skill","community","player"];
  const keys=[...url.searchParams.keys()];
  if(new Set(keys).size!==keys.length || keys.some(key=>!allowed.includes(key)))throw new RankingsError("Choose valid leaderboard filters.",400);
  const community=url.searchParams.get("community")??"all",skill=url.searchParams.get("skill")??"all";
  const player=url.searchParams.get(kind==="player-ranks.json"?"id":"player")??"0";
  if((community!=="all"&&!idPattern.test(community)) || !skills.has(skill)
    || (player!=="0"&&!idPattern.test(player)) || (kind==="player-ranks.json"&&player==="0"))throw new RankingsError("Choose a valid skill, community or player.",400);
  return {kind,community,skill,player};
}
async function read(procedure,input) {
  const url=new URL(procedure,"https://microscape.cc/server/tapi/");
  if(input)url.searchParams.set("input",JSON.stringify(input));
  let response,body;
  try { response=await fetch(url,{credentials:"omit",cache:"no-store",signal:AbortSignal.timeout(12_000)});body=await response.json(); }
  catch { throw new RankingsError("Microscape rankings are temporarily unavailable. Try Refresh shortly."); }
  if(!response.ok || !body?.result || !("data" in body.result))throw new RankingsError("Microscape rankings are temporarily unavailable. Try Refresh shortly.");
  return body.result.data;
}
export async function fetchRankings(url) {
  const q=parameters(url),checkedAt=Date.now();
  if(q.kind==="communities.json") {
    const rows=await read("communities");
    if(!Array.isArray(rows)||rows.length>20_000)throw new RankingsError("The game returned an unreadable community directory.");
    const communities=rows.map(row=>{
      if(!idPattern.test(row?.twitchId)||!validName(row.displayName))throw new RankingsError("The game returned an unreadable community.");
      const channel=/^https:\/\/(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]{1,25})\/?$/.exec(row.streamUrl)?.[1];
      return {id:row.twitchId,name:row.displayName,...(channel?{channel:channel.toLowerCase()}: {})};
    }).sort((a,b)=>a.name.localeCompare(b.name));
    return {checkedAt,source:"Microscape",communities};
  }
  const input={communityId:q.community,userId:q.player};
  if(q.kind==="player-ranks.json") {
    const data=await read("user-ranks",input);
    if(!data||typeof data!=="object"||Array.isArray(data))throw new RankingsError("The game returned unreadable player ranks.");
    const ranks={};for(const key of skills)if(data[key]!=null){if(!positive(data[key]))throw new RankingsError("The game returned an unreadable rank.");ranks[key]=data[key];}
    return {checkedAt,source:"Microscape",playerId:q.player,communityId:q.community,ranks};
  }
  const data=await read("leaderboard",{...input,skillId:q.skill});
  if(!Array.isArray(data?.ranking)||data.ranking.length>1_000)throw new RankingsError("The game returned an unreadable leaderboard.");
  const seen=new Set();
  const ranking=data.ranking.map(row=>{
    if(!idPattern.test(row?.twitchId)||!validName(row.displayName)||!positive(row.rank)||!Number.isSafeInteger(row.level)||row.level<0||seen.has(row.twitchId))throw new RankingsError("The game returned an unreadable leaderboard row.");
    seen.add(row.twitchId);return {id:row.twitchId,name:row.displayName,rank:row.rank,level:row.level};
  }).sort((a,b)=>a.rank-b.rank);
  return {checkedAt,source:"Microscape",communityId:q.community,skillId:q.skill,playerId:q.player,ranking};
}
export async function rankingsResponse(url,context) {
  const q=parameters(url),key=new URL("/.cache/rankings-v1/"+q.kind,url.origin);
  if(q.kind!=="communities.json") { key.searchParams.set("community",q.community);key.searchParams.set("player",q.player);if(q.kind==="leaderboard.json")key.searchParams.set("skill",q.skill); }
  const cache=globalThis.caches?.default,cached=await cache?.match(new Request(key));if(cached)return cached;
  const data=await fetchRankings(url),response=Response.json(data,{headers:{"Cache-Control":"public, max-age="+(q.kind==="communities.json"?300:60),"X-Content-Type-Options":"nosniff"}});
  if(cache&&context?.waitUntil)context.waitUntil(cache.put(new Request(key),response.clone()));return response;
}
