import fs from "node:fs/promises";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {inflateSync} from "node:zlib";

export const norm = value => String(value || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
export const title = value => String(value || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").replace(/\b\w/g, letter => letter.toUpperCase()).replace(/(['’])S\b/g,"$1s");
export const slug = value => String(value).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const baseName = file => path.basename(file).replace(/-[A-Za-z0-9_-]{8}(?=\.[^.]+$)/, "").replace(/\.\w+$/, "");
export async function loadArtwork(snapshot, game) {
  const manifest = JSON.parse(await fs.readFile(path.join(snapshot, "manifest.json"), "utf8"));
  const client = manifest.files.find(file => /index-.*\.js$/.test(file.file));
  const {parse} = await import(pathToFileURL(path.resolve(snapshot, "../../node_modules/acorn/dist/acorn.mjs")));
  const ast = parse(await fs.readFile(path.join(snapshot, client.file), "utf8"), {ecmaVersion:"latest",sourceType:"module"});
  const bindings = new Map();
  for (const statement of ast.body) if (statement.type === "VariableDeclaration") for (const value of statement.declarations) bindings.set(value.id.name, value.init);
  function resolve(node, seen = new Set()) {
    if (!node) return;
    if (node.type === "Literal") return node.value;
    if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis[0].value.cooked;
    if (node.type === "Identifier" && !seen.has(node.name)) return resolve(bindings.get(node.name),new Set([...seen,node.name]));
    if (node.type === "CallExpression" && node.arguments[0]?.type === "ObjectExpression") {
      const value = node.arguments[0].properties.find(property=>property.key?.name === "default")?.value;
      if (value?.type === "ArrowFunctionExpression") return resolve(value.body,seen);
    }
  }
  const maps = {}, icons = {}, equipment = {}, foes = {};
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "Property") {
      const key = node.key.name || node.key.value, value = resolve(node.value);
      if (typeof value === "string" && value.startsWith("/play/assets/")) {
        const url = "https://microscape.cc" + value;
        if (game.locations[key]) maps[key] = url;
        if (game.foes[key]) foes[key] = url;
        const match = /^\.\.\/assets\/(icons|equipment)\/(.+)\.png$/.exec(key);
        if (match?.[1] === "icons") icons[match[2]] = url;
        if (match?.[1] === "equipment" && match[2].endsWith("World")) equipment[match[2].slice(0,-5)] = url;
      }
    }
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === "object") walk(value);
  }
  walk(ast);
  const files = new Map(manifest.files.map(file => [file.url,file]));
  const buffers = new Map(), pixels = new Map();
  async function bytes(url) {
    if (!buffers.has(url)) {
      const file = files.get(url); if (!file) throw Error("Artwork not archived: " + url);
      buffers.set(url,await fs.readFile(path.join(snapshot,file.file)));
    }
    return buffers.get(url);
  }
  async function size(url) { const b = await bytes(url); return [b.readUInt32BE(16),b.readUInt32BE(20)]; }
  async function rgba(url) {
    if (pixels.has(url)) return pixels.get(url);
    const b = await bytes(url), [width,height] = await size(url);
    const type=b[25], channels={2:3,3:1,6:4}[type];
    if (b[24]!==8 || b[28]!==0 || !channels) return null;
    const chunks=[]; let palette,alpha;
    for(let offset=8;offset<b.length;){const length=b.readUInt32BE(offset),kind=b.toString("ascii",offset+4,offset+8),chunk=b.subarray(offset+8,offset+8+length);
      if(kind==="IDAT")chunks.push(chunk);if(kind==="PLTE")palette=chunk;if(kind==="tRNS")alpha=chunk;offset+=length+12;}
    const raw=inflateSync(Buffer.concat(chunks)),stride=width*channels,out=new Uint8Array(width*height*4);let previous=Buffer.alloc(stride);
    for(let y=0;y<height;y++){const filter=raw[y*(stride+1)],row=Buffer.from(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)));
      for(let i=0;i<stride;i++){const left=i>=channels?row[i-channels]:0,above=previous[i],corner=i>=channels?previous[i-channels]:0;let predictor=0;
        if(filter===1)predictor=left;if(filter===2)predictor=above;if(filter===3)predictor=Math.floor((left+above)/2);
        if(filter===4){const p=left+above-corner,a=Math.abs(p-left),c=Math.abs(p-above),d=Math.abs(p-corner);predictor=a<=c&&a<=d?left:c<=d?above:corner;}row[i]=(row[i]+predictor)&255;}
      for(let x=0;x<width;x++){const at=x*channels,to=(y*width+x)*4;if(type===3){const color=row[at];out.set([palette[color*3],palette[color*3+1],palette[color*3+2],alpha?.[color]??255],to);}
        else out.set([row[at],row[at+1],row[at+2],type===6?row[at+3]:255],to);} previous=row;}
    const result={width,height,pixels:out};pixels.set(url,result);return result;
  }
  async function sprite(url, frameWidth) {
    const dims=await size(url),data=await rgba(url),frame=Math.min(frameWidth||dims[1],dims[0]);let left=frame,top=dims[1],right=0,bottom=0;
    if(data)for(let y=0;y<dims[1];y++)for(let x=0;x<frame;x++)if(data.pixels[(y*dims[0]+x)*4+3]){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
    return {layers:[url],size:dims,crop:right>left?[left,top,right-left,bottom-top]:[0,0,frame,dims[1]]};
  }
  function asset(id, minimumWidth=0) {
    return manifest.files.filter(file => norm(baseName(file.file))===norm(id) && file.file.endsWith(".png"));
  }
  return {manifest,client,icons,equipment,maps,foes,files,bytes,size,rgba,sprite,asset};
}
