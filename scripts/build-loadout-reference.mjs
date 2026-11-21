import fs from "node:fs/promises";
const [snapshot]=process.argv.slice(2);
if(!snapshot)throw Error("Pass the extracted public game data JSON.");
const game=JSON.parse(await fs.readFile(snapshot,"utf8"));
const pages=JSON.parse(await fs.readFile(new URL("../docs/reference.json",import.meta.url),"utf8"));
const abilities=Object.values(game.abilities).filter(a=>a.onItem).map(a=>({id:a.id,name:a.name,onItem:a.onItem,
  wikiId:pages.find(p=>p.category==="abilities"&&p.gameId===a.id)?.id,
  requirements:a.requiredSkills||{},permanentUnlockLevel:a.permanentUnlockLevel,type:a.type,
  summary:pages.find(p=>p.category==="abilities"&&p.gameId===a.id)?.summary||"See the ability page for its effect."}));
await fs.writeFile(new URL("../docs/loadout-reference.json",import.meta.url),JSON.stringify({source:"./assets/game-data/release-2026-11-19.json",abilities},null,2)+"\n");
console.log(JSON.stringify({abilities:abilities.length}));
