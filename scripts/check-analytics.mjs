import assert from "node:assert/strict";
import {parseHTML} from "linkedom";
import {createPageTracker,measurementId} from "../docs/analytics.js";
function fixture(options={}) {
  const {document}=parseHTML("<html><head></head><body></body></html>");
  Object.defineProperty(document,"referrer",{value:"https://www.google.com/search?q=private-search"});
  const browser={location:{hostname:"microscapewiki.com"}},navigator={};
  const track=createPageTracker({browser,doc:document,navigator,prerender:false,...options});
  return {browser,document,track};
}
const {browser,document,track}=fixture();
const page=(canonical,title="Player Lookup | Microscape Wiki")=>({canonical,title});
assert(track(page("https://microscapewiki.com/player-lookup/?name=PrivatePlayer#private")));
assert(!track(page("https://microscapewiki.com/player-lookup/?name=AnotherPlayer")),"Query changes must not create extra page views");
assert(track(page("https://microscapewiki.com/pets/","Browse Pets | Microscape Wiki")));
assert(track(page("https://microscapewiki.com/player-lookup/")),"Back navigation must count a new page view");
assert(!track(page("https://untrusted.example/private")));
assert.equal(document.querySelectorAll("script").length,1,"Load the tag only once");
assert.equal(document.querySelector("script").src,"https://www.googletagmanager.com/gtag/js?id="+measurementId);
const commands=browser.dataLayer.map(args=>Array.from(args)),views=commands.filter(c=>c[0]==="event");
assert.equal(views.length,3);
assert.equal(views[0][2].page_referrer,"https://www.google.com/");
assert.equal(views[1][2].page_referrer,"https://microscapewiki.com/player-lookup/");
assert.equal(views[2][2].page_referrer,"https://microscapewiki.com/pets/");
assert(!/PrivatePlayer|AnotherPlayer|private-search|#private/.test(JSON.stringify(commands)));
assert.equal(commands.filter(c=>c[0]==="config").length,1);
assert.deepEqual(commands.find(c=>c[0]==="config")[2],{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
for(const options of [{prerender:true},{browser:{location:{hostname:"localhost"}}},{navigator:{doNotTrack:"1"}},{navigator:{globalPrivacyControl:true}}]) {
  const f=fixture(options);assert(!f.track(page("https://microscapewiki.com/")));assert.equal(f.document.querySelectorAll("script").length,0);
}
console.log("Passed: one tag and one view per route, real back navigation, sanitized query/hash/referrer data, advertising signals off, no preview/build/DNT/GPC tracking.");
