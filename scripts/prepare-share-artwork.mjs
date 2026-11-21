import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import sharp from "sharp";
const dirs=process.argv.slice(2);if(!dirs.length)throw Error("Pass directories containing captured public game artwork.");
const root=new URL("../docs/",import.meta.url),pages=JSON.parse(await fs.readFile(new URL("reference.json",root),"utf8"));
const {tutorials}=await import("../docs/tutorials.js");
const get=async src=>{
  if(src?.startsWith("./assets/"))return fs.readFile(new URL(src,root));
  if(!src?.startsWith("https://microscape.cc/play/assets/"))throw Error("Unsupported artwork source");
  const basename=path.basename(new URL(src).pathname);
  for(const dir of dirs)try{return await fs.readFile(path.join(dir,basename));}catch{}
  throw Error("Artwork not found: "+basename);
};
const entries={},artworks={};let missing=0;
for(const page of [...pages,...tutorials]){
  let buffer;const sprite=page.sprites?.[0]||pages.find(p=>p.id===page.spriteFoes?.[0])?.sprites?.[0];
  try{
    if(sprite){
      const [left,top,width,height]=sprite.crop;
      const layers=await Promise.all(sprite.layers.map(async src=>({input:await sharp(await get(src)).extract({left,top,width,height}).png().toBuffer(),left:0,top:0})));
      buffer=await sharp({create:{width,height,channels:4,background:"#00000000"}}).composite(layers).png().toBuffer();
    }else buffer=await get(page.abilityBottle||page.mapImage?.src||page.portrait?.src||page.artwork);
    buffer=await sharp(buffer).trim().resize(320,260,{fit:"inside",kernel:"nearest"}).png().toBuffer();
    const hash=crypto.createHash("sha256").update(buffer).digest("hex").slice(0,16);
    entries[page.id]=hash;artworks[hash]=buffer.toString("base64");
  }catch{missing++;}
}
await fs.writeFile(new URL("share-artwork.json",root),JSON.stringify({source:"Original Microscape game artwork; captured public client files, November 19–21, 2026. https://microscape.cc/credits/",entries,artworks})+"\n");
console.log(JSON.stringify({entries:Object.keys(entries).length,uniqueArtwork:Object.keys(artworks).length,withoutArtwork:missing}));
