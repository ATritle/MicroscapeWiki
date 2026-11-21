import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {parseHTML} from "linkedom";
import {publicUrl,legacyRoute,entryPath} from "../docs/seo.js";
import sharp from "sharp";
const root = fileURLToPath(new URL("../.seo-site/",import.meta.url));
const manifest = JSON.parse(await fs.readFile(path.join(root,"seo-manifest.json"),"utf8"));
const paths = new Set(manifest.map(page=>page.path));
const reference = JSON.parse(await fs.readFile(new URL("../docs/reference.json",import.meta.url),"utf8"));
const byId = new Map(reference.map(entry=>[entry.id,entry]));
const groups = Object.fromEntries(["items","skills","foes","locations","shops","abilities","pets","reference","guides","tutorials","bazaar"].map(id=>[id,{}]));
assert(manifest.length > 750);
assert.equal(paths.size,manifest.length);
const titles = new Set();
for (const page of manifest) {
  const {document} = parseHTML(await fs.readFile(path.join(root,decodeURIComponent(page.path),"index.html"),"utf8"));
  assert.equal(document.querySelectorAll("h1").length,1,page.path+" needs one rendered title");
  assert.equal(document.querySelector('link[rel="canonical"]').getAttribute("href"),"https://microscapewiki.com"+page.path);
  assert.equal(document.querySelector('base').getAttribute("href"),"/");
  assert(!titles.has(document.title),"Duplicate page title: "+document.title);
  titles.add(document.title);
  assert(document.querySelector('meta[name="description"]').getAttribute("content").length > 30);
  assert.equal(JSON.parse(document.querySelector("#wiki-schema").textContent)["@graph"][1].url,"https://microscapewiki.com"+page.path);
  const image=new URL(document.querySelector('meta[property="og:image"]').getAttribute("content"));
  assert.equal(image.hostname,"microscapewiki.com","Preview artwork must use the wiki domain");
  if(page.path!=="/"){
    const meta=await sharp(path.join(root,image.pathname)).metadata();assert.equal(meta.width,1200);assert.equal(meta.height,630);assert.equal(meta.format,"png");
    assert.equal(document.querySelector('meta[property="og:image:width"]').getAttribute("content"),"1200");
  }
  for (const a of document.querySelectorAll("a[href]")) {
    const href = a.getAttribute("href");
    assert(!href.startsWith("#/"),"Unconverted legacy link on "+page.path+": "+href);
    if (href.startsWith("/") && !href.startsWith("//")) {
      const url = new URL(href,"https://microscapewiki.com");
      assert(paths.has(url.pathname),"Broken internal page link "+href+" on "+page.path);
    }
  }
}
const {document:boots} = parseHTML(await fs.readFile(path.join(root,"items/rubber-boots/index.html"),"utf8"));
assert.match(boots.querySelector("main").textContent,/Soft Landing/);
assert.match(boots.querySelector("main").textContent,/16/);
const {document:shop} = parseHTML(await fs.readFile(path.join(root,"shops/shop-merrics-magic/index.html"),"utf8"));
assert.equal(shop.querySelectorAll(".table-item-link img").length,9);
for (const entry of reference) {
  assert.equal(publicUrl("#/entry/"+entry.id,byId),entryPath(entry));
  assert.equal(legacyRoute(new URL(entryPath(entry),"https://microscapewiki.com"),byId,groups),"/entry/"+entry.id);
}
assert.equal(publicUrl("#/browse/reference",byId),"/game-mechanics/");
assert.equal(publicUrl("#/activity-comparison?name=User12345",byId),"/activity-comparison/?name=User12345");
assert.equal(legacyRoute(new URL("https://microscapewiki.com/gear-comparison/"),byId,groups),"/gear-comparison");
assert(paths.has("/gear-comparison/"));
assert.equal(legacyRoute(new URL("https://microscapewiki.com/#/entry/rubber-boots"),byId,groups),"/entry/rubber-boots");
const sitemap = await fs.readFile(path.join(root,"sitemap.xml"),"utf8");
assert.equal((sitemap.match(/<loc>/g)||[]).length,manifest.filter(page=>page.indexable).length);
assert([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].every(([,url])=>!url.includes("#")&&!url.includes("?")));
assert(!sitemap.includes("/search/") && !sitemap.includes("/player-lookup/"));
assert.match(await fs.readFile(path.join(root,"robots.txt"),"utf8"),/Sitemap: https:\/\/microscapewiki.com\/sitemap.xml/);
const notFound = await fs.readFile(path.join(root,"404.html"),"utf8");
assert.match(notFound,/noindex,follow/);
assert.match(notFound,/Page unavailable/);
console.log("Passed: "+manifest.length+" rendered pages, unique metadata, canonical URLs, structured data, all internal page links, legacy entry routes, item icons, sitemap exclusions and 404 handling.");
