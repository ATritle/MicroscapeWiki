import assert from "node:assert/strict";
import fs from "node:fs/promises";
import worker, {fetchPlayerSnapshot, validPlayerUsername} from "../workers/live-drops.mjs";

globalThis.window = {location:{hostname:"127.0.0.1", origin:"http://127.0.0.1:8065"}};
const {playerStats, xpThreshold, appearanceLayers, appearanceOffset, activityDetails} = await import("../docs/player-lookup.js");
const reference = JSON.parse(await fs.readFile(new URL("../docs/player-reference.json", import.meta.url), "utf8"));
assert.equal(xpThreshold(2), 830);
assert.equal(xpThreshold(99), 130344310);
const stats = playerStats({attack:1154352,strength:867752,defense:983024,evilMagic:0,goodMagic:0,ranged:60940,
  fishing:693938,cooking:146572,woodcutting:1320,mining:31395,firemaking:0,smithing:11395,piety:0,crafting:1352,fletching:351,herblaw:0});
assert.equal(stats.totalLevel, 282, "Total level must sum levels, not XP");
assert.equal(stats.combatLevel, 49);
assert.equal(stats.levels.attack, 51);
assert.equal(stats.levels.defense, 49);
const layers = appearanceLayers({weapon:"krakenClub",head:"blackFullHelm",skin:"skin1",hair:"mediumBrown",
  body:"adamantArmor",hands:"leatherGloves",feet:"rubberBoots",shield:"shellOfKa",food:"cookedSalmon"}, reference);
assert.deepEqual(layers.map(layer => layer.slot), ["skin","hands","feet","body","head","shield","weapon"]);
assert(!layers.some(layer => layer.slot === "hair"), "Hair must be hidden under a helmet");
assert(layers.every(layer => layer.src?.startsWith("https://microscape.cc/play/assets/")));
assert.deepEqual(reference.handSamples.leatherGloves, [173,119,87,255]);
assert.equal(Object.keys(reference.artworkBounds).length, Object.keys(reference.equipment).length);
const offset = appearanceOffset(layers, reference);
const boxes = layers.map(layer => reference.artworkBounds[layer.id]);
for (const axis of [0, 1]) {
  const center = (Math.min(...boxes.map(box => box[axis])) + Math.max(...boxes.map(box => box[axis + 2]))) / 2;
  assert(Math.abs(center + offset[axis] - 64) <= .5, "Center the visible sprite rather than transparent PNG padding");
}
assert.deepEqual(appearanceOffset([], reference), [0, 0]);
assert.equal(activityDetails({kind:"travel",destination:"jesters-room"}, reference).label, "Traveling to Jester's Room");
assert.equal(activityDetails({kind:"banking"}, reference).label, "Clearing out the loot bag");
assert.equal(activityDetails({kind:"preparing",skill:"attack",mob:"gurgle"}, reference).label, "Preparing · Fighting Gurgle");
assert.equal(activityDetails({kind:"queued",skill:"fishing",id:"catch-frogs"}, reference).label, "Queued · Catch frogs");
assert(validPlayerUsername("xMrTwister23x"));
assert(!validPlayerUsername("../test"));
assert(!validPlayerUsername("name<script>"));
assert(!validPlayerUsername("a".repeat(26)));

const actualFetch = globalThis.fetch;
const cache = new Map(), pending = [], calls = [];
globalThis.caches = {default:{
  match:async request => cache.get(request.url)?.clone(),
  put:async (request, response) => {cache.set(request.url, response.clone());}
}};
const ids = {alpha:"101", beta:"202", nogame:"303", malformed:"404", mzdunk:"505"};
let failProfile = false;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(input);
  calls.push(url.href);
  if (url.hostname === "id.twitch.tv") return Response.json({access_token:"test-token", expires_in:3600});
  if (url.pathname === "/helix/users") {
    assert.equal(init.headers.Authorization, "Bearer test-token");
    const login = url.searchParams.get("login");
    return Response.json({data:ids[login] ? [{login,id:ids[login],profile_image_url:"https://static-cdn.jtvnw.net/jtv_user_pictures/test.png"}] : []});
  }
  if (url.pathname === "/helix/streams") return Response.json({data:[{user_login:"mzdunk", type:"live"}]});
  if (url.pathname === "/server/tapi/live-communities") return Response.json({result:{data:[]}});
  assert.equal(url.pathname, "/server/tapi/character-by-id");
  const {characterId:id} = JSON.parse(url.searchParams.get("input"));
  if (id === "303") return Response.json({error:"No game profile"}, {status:404});
  if (failProfile) return Response.json({error:"Busy"}, {status:503});
  if (id === "404") return Response.json({result:{data:{id,name:"malformed"}}});
  return Response.json({result:{data:{
    id, name:id === "101" ? "Alpha" : "Beta", exp:{attack:1154352,strength:0,defense:0,bad:"wrong"},
    equipment:{skin:"skin1",weapon:"krakenClub",head:"blackFullHelm",invalid:"../../bad",counter:7},
    isMember:true, pos:{map:"jesters-room",self:{x:17,y:14}}, currentWorldId:id === "101" ? "shared-67" : "../invalid",
    activity:{zone:"jesters-room",skill:"piety",activity:"jesters-chest-large",myState:{privateMarker:"omit"}},
    resources:{hp:60,maxHp:60}, inventory:{privateMarker:"omit"}, communityIdAllegiances:["omit"]
  }}});
};
const env = {TWITCH_CLIENT_ID:"test-id",TWITCH_CLIENT_SECRET:"test-secret"};
const context = {waitUntil:promise => pending.push(promise)};
const request = name => new Request("https://worker.example/player.json?username=" + encodeURIComponent(name), {
  headers:{Origin:"https://microscapewiki.com"}
});
try {
  const invalid = await worker.fetch(request("<script>"), env, context);
  assert.equal(invalid.status, 400);
  assert.equal(calls.length, 0, "Reject bad names before making an upstream request");
  const alphaResponse = await worker.fetch(request("Alpha"), env, context);
  assert.equal(alphaResponse.status, 200);
  assert.equal(alphaResponse.headers.get("Access-Control-Allow-Origin"), "https://microscapewiki.com");
  assert.equal(alphaResponse.headers.get("Cache-Control"), "public, max-age=30");
  const alpha = await alphaResponse.json();
  assert.equal(alpha.player.id, "101");
  assert.equal(alpha.player.hp, 60);
  assert.equal(alpha.player.location, "jesters-room");
  assert.equal(alpha.player.worldId, "shared-67", "Preserve the reported world ID without guessing a display number");
  assert.equal(alpha.player.inventory, undefined);
  assert.equal(alpha.player.communityIdAllegiances, undefined);
  assert.equal(alpha.player.equipment.invalid, undefined);
  assert.equal(alpha.player.exp.bad, undefined);
  assert.equal(alpha.player.activity.myState, undefined);
  await Promise.all(pending);
  const callsBefore = calls.length;
  assert.equal((await (await worker.fetch(request("ALPHA"), env, context)).json()).player.id, "101");
  assert.equal(calls.length, callsBefore, "Uppercase names share the canonical cache");
  const beta = await (await worker.fetch(request("beta"), env, context)).json();
  assert.equal(beta.player.id, "202", "Different usernames must never share a cached profile");
  assert.equal(beta.player.worldId, null, "Omit malformed world IDs");
  await Promise.all(pending);
  assert([...cache.keys()].some(key => key.endsWith("?username=alpha")));
  assert([...cache.keys()].some(key => key.endsWith("?username=beta")));
  for (const name of ["unknown","nogame","malformed"]) assert.equal((await worker.fetch(request(name), env, context)).status, 404);
  assert(![...cache.keys()].some(key => /unknown|nogame|malformed/.test(key)), "Do not cache lookup errors");
  failProfile = true;
  await assert.rejects(fetchPlayerSnapshot("alpha", env), /could not return/);
  failProfile = false;
  const denied = await worker.fetch(new Request("https://worker.example/player.json?username=alpha",
    {headers:{Origin:"https://untrusted.example"}}), env, context);
  assert.equal(denied.status, 403);
  assert.equal((await worker.fetch(new Request("https://worker.example/player.json?username=alpha",
    {method:"POST"}), env, context)).status, 405);
  const live = await (await worker.fetch(new Request("https://worker.example/mzdunk.json"), env, context)).json();
  assert.equal(live.stream.channel, "mzdunk");
  const drops = await (await worker.fetch(new Request("https://worker.example/drops.json"), env, context)).json();
  assert.deepEqual(drops.events, []);
  console.log("Passed: skill math, original sprite layers and hand color, input validation, safe public profile fields, separate player caches, case handling, missing profiles, upstream errors, CORS, and existing live feeds.");
} finally {
  globalThis.fetch = actualFetch;
  delete globalThis.caches;
}
