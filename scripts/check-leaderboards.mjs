import assert from "node:assert/strict";
import gateway from "../api-gateway/_worker.js";
import {fetchRankings} from "../api-gateway/leaderboards.js";
const oldFetch=globalThis.fetch,oldCaches=globalThis.caches,cache=new Map(),pending=[],calls=[];
let fail=false,malformed=false;
globalThis.caches={default:{match:async r=>cache.get(r.url)?.clone(),put:async(r,v)=>cache.set(r.url,v.clone())}};
globalThis.fetch=async (input,options)=>{
  const url=new URL(input);calls.push(url);
  assert.equal(url.origin,"https://microscape.cc");assert.equal(options.credentials,"omit");assert.equal(options.method,undefined);assert.equal(options.headers?.Cookie,undefined);
  if(fail)return Response.json({error:"private detail"},{status:503});
  const q=JSON.parse(url.searchParams.get("input")||"null");
  assert(!url.pathname.endsWith("/communities"),"The unfiltered community directory must not supply leaderboard choices");
  if(url.pathname.endsWith("/communities-with-highscores"))return Response.json({result:{data:[{twitchId:"200",displayName:"Community",streamUrl:"https://www.twitch.tv/community",privateField:"omit"}]}});
  if(url.pathname.endsWith("/user-ranks")){assert.equal(q.communityId,"all");return Response.json({result:{data:q.userId==="999"?{}:{all:302,attack:9,privateField:"omit"}}});}
  assert(url.pathname.endsWith("/leaderboard"));assert(q.userId);assert(q.communityId);assert(q.skillId);
  return Response.json({result:{data:{ranking:malformed?[{twitchId:"unsafe/id",displayName:"Bad",rank:0,level:1}]:[{twitchId:"300",displayName:"Other",rank:2,level:20,privateField:"omit"},{twitchId:"100",displayName:"Player",rank:1,level:21},...(q.userId!=="0"?[{twitchId:q.userId,displayName:"Selected",rank:302,level:10}]:[])]}}});
};
const request=q=>new Request("https://microscape-wiki-api.pages.dev/"+q,{headers:{Origin:"https://microscapewiki.com"}}),context={waitUntil:p=>pending.push(p)};
try {
  cache.set("https://microscape-wiki-api.pages.dev/.cache/rankings-v1/communities.json",Response.json({checkedAt:1,communities:[{id:"999",name:"Unranked old directory entry"}]}));
  const community=await gateway.fetch(request("communities.json"),{},context),directory=await community.json();
  assert.equal(community.status,200);assert.equal(community.headers.get("Cache-Control"),"public, max-age=300");assert.equal(community.headers.get("Access-Control-Allow-Origin"),"https://microscapewiki.com");assert.deepEqual(directory.communities,[{id:"200",name:"Community",channel:"community"}]);
  const board=await gateway.fetch(request("leaderboard.json?community=200&skill=attack&player=500"),{},context),data=await board.json();
  assert.equal(board.headers.get("Cache-Control"),"public, max-age=60");assert.deepEqual(data.ranking.map(r=>r.rank),[1,2,302],"Preserve exact ranks and gaps rather than numbering rows");assert.equal(data.communityId,"200");assert.equal(data.skillId,"attack");assert.equal(data.playerId,"500");assert(!JSON.stringify(data).includes("omit"));
  await Promise.all(pending);const beforeCache=calls.length;
  await gateway.fetch(request("leaderboard.json?player=500&skill=attack&community=200"),{},context);assert.equal(calls.length,beforeCache,"Canonical cache keys ignore parameter ordering");
  await gateway.fetch(request("leaderboard.json?community=all&skill=attack"),{},context);assert.equal(calls.at(-1).searchParams.get("input"),JSON.stringify({communityId:"all",userId:"0",skillId:"attack"}));
  const ranks=await (await gateway.fetch(request("player-ranks.json?id=500"),{},context)).json();assert.equal(ranks.ranks.all,302);assert.equal(ranks.ranks.privateField,undefined);
  const missing=await (await gateway.fetch(request("player-ranks.json?id=999"),{},context)).json();assert.deepEqual(missing.ranks,{},"Missing ranks are not zero or fabricated");
  const beforeBad=calls.length;
  for(const q of ["communities.json?url=https://bad.test","leaderboard.json?skill=bad","leaderboard.json?community=../bad","leaderboard.json?skill=attack&skill=cooking","leaderboard.json?player=bad","leaderboard.json?url=https://bad.test","player-ranks.json","player-ranks.json?id=0","player-ranks.json?id=500&id=200","player-ranks.json?id=500&skill=attack"])assert.equal((await gateway.fetch(request(q),{},context)).status,400,q);
  assert.equal(calls.length,beforeBad);
  for(const skill of ["all","attack","strength","defense","evilMagic","ranged","piety","woodcutting","firemaking","fishing","cooking","mining","smithing","crafting","goodMagic","fletching","herblaw"])assert.equal((await fetchRankings(new URL("https://example.com/leaderboard.json?skill="+skill))).skillId,skill);
  malformed=true;await assert.rejects(fetchRankings(new URL("https://example.com/leaderboard.json")),/unreadable/);malformed=false;
  fail=true;cache.clear();const failed=await gateway.fetch(request("leaderboard.json"),{},context);assert.equal(failed.status,503);assert.equal(failed.headers.get("Cache-Control"),"no-store");assert(!JSON.stringify(await failed.json()).includes("private detail"));assert.equal(cache.size,0);
  assert.equal((await gateway.fetch(new Request("https://example.com/leaderboard.json",{method:"POST"}),{})).status,405);
  assert.equal((await gateway.fetch(new Request("https://example.com/leaderboard.json",{headers:{Origin:"https://bad.test"}}),{})).status,403);
} finally {globalThis.fetch=oldFetch;globalThis.caches=oldCaches;}
console.log("Passed: ranked-community directory, obsolete unfiltered cache isolation, all 16 skills, exact/global/community/selected-player ranks, empty ranks, private field omission, filter validation, isolated caches, CORS and uncached failures. No authentication or character mutations.");
