import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";
import {parseHTML} from "linkedom";
import {entryPath, categoryPath, siteOrigin} from "../docs/seo.js";
import {createSocialCards} from "./social-cards.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const docs = path.join(root,"docs");
const output = path.resolve(root,process.argv[2] || ".seo-site");
if (output !== path.join(root,".seo-site")) throw Error("SEO output must be the repository’s .seo-site directory.");
// Only this explicitly checked, generated directory is removed; never source files.
await fs.rm(output,{recursive:true,force:true});
await fs.mkdir(output,{recursive:true});
// Copy current assets and source modules. Generated URLs are validated below.
await fs.cp(docs,output,{recursive:true});
const {window,document} = parseHTML(await fs.readFile(path.join(docs,"index.html"),"utf8"));
window.location = new URL(siteOrigin + "/");
window.history = {
  replaceState(_state,_unused,url) {window.location = new URL(url,window.location);},
  pushState(_state,_unused,url) {window.location = new URL(url,window.location);}
};
window.scrollTo = () => {};
globalThis.window = window;
globalThis.document = document;
globalThis.__WIKI_PRERENDER__ = true;
globalThis.setInterval = () => 0;
globalThis.clearInterval = () => {};
globalThis.fetch = async input => {
  const url = new URL(input);
  if (url.protocol !== "file:") return new Promise(() => {}); // Never capture a live feed or player profile.
  const file = fileURLToPath(url);
  if (!file.startsWith(docs + path.sep)) throw Error("Build fetch outside docs: " + url);
  const body = await fs.readFile(file,"utf8");
  return {ok:true,status:200,json:async()=>JSON.parse(body),text:async()=>body};
};
const {render,byId,groups} = await import(pathToFileURL(path.join(docs,"app.js")).href);
const routes = new Set(["/", ...Object.keys(groups).map(category=>"/"+categoryPath(category)+"/"),
  ...[...byId.values()].map(entryPath), "/live-drops/","/player-lookup/","/activity-comparison/","/gear-comparison/","/bazaar/","/search/"]);
const manifest = [];
for (const route of routes) {
  if (!/^\/(?:[a-zA-Z0-9%-]+\/)*$/.test(route)) throw Error("Unsafe route " + route);
  window.location = new URL(route,siteOrigin);
  render();
  const canonical = document.querySelector('link[rel="canonical"]').getAttribute("href");
  if (canonical !== siteOrigin + route) throw Error("Canonical mismatch " + route + ": " + canonical);
  const indexable = document.querySelector('meta[name="robots"]').getAttribute("content") === "index,follow";
  const target = path.join(output,decodeURIComponent(route),"index.html");
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,"<!doctype html>\n" + document.documentElement.outerHTML + "\n");
  manifest.push({path:route,title:document.title,indexable});
}
window.location = new URL("/404.html",siteOrigin);
render();
document.querySelector('link[rel="canonical"]').remove();
await fs.writeFile(path.join(output,"404.html"),"<!doctype html>\n"+document.documentElement.outerHTML+"\n");
const escape = text => text.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;");
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + manifest.filter(page=>page.indexable).map(page=>"  <url><loc>"+escape(siteOrigin+page.path)+"</loc></url>").join("\n") + "\n</urlset>\n";
await fs.writeFile(path.join(output,"sitemap.xml"),sitemap);
await fs.writeFile(path.join(output,"robots.txt"),"User-agent: *\nAllow: /\n\nSitemap: "+siteOrigin+"/sitemap.xml\n");
await fs.writeFile(path.join(output,".nojekyll"),"");
await fs.writeFile(path.join(output,"seo-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
await createSocialCards({output,manifest,byId,groups});
console.log(JSON.stringify({pages:manifest.length,indexable:manifest.filter(page=>page.indexable).length,output}));
