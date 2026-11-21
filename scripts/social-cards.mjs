import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {socialImagePath} from "../docs/seo.js";
const escape=s=>String(s||"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
function wrap(text,max,count){
  const words=String(text||"").split(/\s+/),lines=[];let line="";
  for(const word of words){if(line&&(line+" "+word).length>max){lines.push(line);line=word;if(lines.length===count){line="";break;}}else line+=(line?" ":"")+word;}
  if(line&&lines.length<count)lines.push(line);if(lines.length===count&&words.join(" ").length>lines.join(" ").length)lines[count-1]=lines[count-1].replace(/[.,;:]$/,"")+"…";
  return lines;
}
export async function createSocialCards({output,manifest,byId,groups}) {
  const artwork=JSON.parse(await fs.readFile(new URL("../docs/share-artwork.json",import.meta.url),"utf8"));
  const directory=path.join(output,"assets/social");await fs.mkdir(directory,{recursive:true});
  let index=0;
  async function worker(){
    while(index<manifest.length){
      const page=manifest[index++];if(page.path==="/")continue;
      const parts=page.path.split("/").filter(Boolean),entry=parts.length===2?byId.get(decodeURIComponent(parts[1])):null;
      const title=entry?.title||page.title.replace(/ \| Microscape Wiki$/,"").replace(/^Browse /,"");
      const category=entry?(groups[entry.category]?.title||"Guide"):parts[0]?.replaceAll("-"," ")||"Community Wiki";
      const image=entry&&artwork.artworks[artwork.entries[entry.id]];
      const titleLines=wrap(title,image?24:36,3);
      const detail=entry?.summary||({"gear-comparison":"Compare current gear with a test loadout. Preview equipment, check requirements and estimate combat performance.","player-lookup":"Find a player’s public skill levels, XP and equipped gear.",locations:"Explore the interactive world map. Search items and activities, zoom, pan and open location guides."}[parts[0]]||"Explore Microscape guides, game data and community tools.");
      const details=wrap(detail,image?51:74,titleLines.length>=3?2:3);
      const facts=(entry?.facts||[]).filter(([label])=>!["In-game name","Continent","Region"].includes(label)).slice(0,2).map(([a,b])=>a+": "+b);
      const y=190+titleLines.length*66;
      const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0d1421"/><rect x="0" y="0" width="12" height="630" fill="#83d8bb"/><text x="64" y="65" fill="#83d8bb" font-family="DejaVu Sans,Arial,sans-serif" font-size="27" font-weight="700">MzDunk’s Microscape Wiki</text><path d="M64 99H1136" stroke="#26364a" stroke-width="2"/><text x="64" y="149" fill="#a6b5c8" font-family="DejaVu Sans,Arial,sans-serif" font-size="20">${escape(category.toUpperCase())}</text>${titleLines.map((line,i)=>`<text x="60" y="${214+i*66}" fill="#edf2f8" font-family="DejaVu Sans,Arial,sans-serif" font-weight="700" font-size="54">${escape(line)}</text>`).join("")}${details.map((line,i)=>`<text x="64" y="${y+46+i*29}" fill="#a6b5c8" font-family="DejaVu Sans,Arial,sans-serif" font-size="22">${escape(line)}</text>`).join("")}${facts.map((line,i)=>`<text x="64" y="${Math.min(520,y+46+details.length*29+15)+i*29}" fill="#83d8bb" font-family="DejaVu Sans,Arial,sans-serif" font-size="20">${escape(wrap(line,image?52:80,1)[0])}</text>`).join("")}${image?`<rect x="810" y="175" width="334" height="326" rx="24" fill="#162b29" stroke="#35594c"/><image href="data:image/png;base64,${image}" x="817" y="206" width="320" height="260" preserveAspectRatio="xMidYMid meet"/>`:""}<text x="64" y="591" fill="#a6b5c8" font-family="DejaVu Sans,Arial,sans-serif" font-size="20">microscapewiki.com · ${escape(entry?"Stats, sources and game guides":"Community guides and planning tools")}</text></svg>`;
      await sharp(Buffer.from(svg)).png().toFile(path.join(output,socialImagePath(page.path)));
    }
  }
  await Promise.all([worker(),worker(),worker(),worker()]);
}
