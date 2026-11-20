import assert from 'node:assert/strict';
import gateway from '../api-gateway/_worker.js';
import {fetchBackupSnapshot} from '../workers/live-drops.mjs';
const origin='https://microscapewiki.com';
let calls=0;
const env={LIVE_DROPS:{fetch:async request=>{calls++;assert.equal(request.headers.get('Origin'),origin);return Response.json({ok:true},{headers:{'Access-Control-Allow-Origin':origin}});}}};
for(const p of ['/drops.json','/drops-backup.json','/mzdunk.json','/player.json?username=WOLFIN','/player-search.json?query=wolfin']) {
 const r=await gateway.fetch(new Request('https://microscape-wiki-api.pages.dev'+p,{headers:{Origin:origin}}),env);
 assert.equal(r.status,200);assert.equal(r.headers.get('Access-Control-Allow-Origin'),origin);assert((await r.json()).ok);
}
assert.equal(calls,5);
assert.equal((await gateway.fetch(new Request('https://example.com/.env'),env)).status,404);
assert.equal((await gateway.fetch(new Request('https://example.com/player.json',{method:'POST'}),env)).status,405);
assert.equal((await gateway.fetch(new Request('https://example.com/player.json',{headers:{Origin:'https://untrusted.example'}}),env)).status,403);
const unavailable=await gateway.fetch(new Request('https://example.com/drops.json',{headers:{Origin:origin}}),{});
assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('Cache-Control'),'no-store');
const actual=globalThis.fetch;
try{
 globalThis.fetch=async()=>Response.json({checkedAt:Date.now(),events:[],energyStreams:[]});
 assert.deepEqual((await fetchBackupSnapshot({DROPS_BACKUP_URL:'https://raw.githubusercontent.com/community/wiki/live-data/drops.json'})).events,[]);
 await assert.rejects(fetchBackupSnapshot({DROPS_BACKUP_URL:'http://untrusted.example/'}),/configured/);
 globalThis.fetch=async()=>Response.json({checkedAt:1,events:'wrong',energyStreams:[]});
 await assert.rejects(fetchBackupSnapshot({DROPS_BACKUP_URL:'https://raw.githubusercontent.com/community/wiki/live-data/drops.json'}),/Invalid/);
}finally{globalThis.fetch=actual;}
console.log('Passed: neutral gateway paths, origin restrictions, method restrictions, binding failures, and backup-feed validation.');
