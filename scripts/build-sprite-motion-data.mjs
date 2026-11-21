import fs from "node:fs/promises";
import {pathToFileURL} from "node:url";
import {createHash} from "node:crypto";
const [clientFile,gameFile,acornFile] = process.argv.slice(2);
const {parse} = await import(pathToFileURL(acornFile).href);
const client = await fs.readFile(clientFile,"utf8");
const game = JSON.parse(await fs.readFile(gameFile,"utf8"));
const ast = parse(client,{ecmaVersion:"latest",sourceType:"module"});
const bindings = new Map();
for (const node of ast.body) if (node.type === "VariableDeclaration") for (const d of node.declarations) if (d.id.type === "Identifier") bindings.set(d.id.name,d.init);
function value(node,local=bindings,seen=new Set()) {
  if (!node) return undefined;
  if (node.type === "Literal") return node.value;
  if (node.type === "TemplateLiteral" && !node.expressions.length) return node.quasis[0].value.cooked;
  if (node.type === "Identifier" && !seen.has(node.name)) return value(local.get(node.name)||bindings.get(node.name),local,new Set([...seen,node.name]));
  if (node.type === "UnaryExpression" && node.operator === "-") return -value(node.argument,local,seen);
  if (node.type === "UnaryExpression" && node.operator === "!") return !value(node.argument,local,seen);
  if (node.type === "ArrayExpression") return node.elements.map(n=>value(n,local,seen));
  if (node.type === "ObjectExpression") {
    const out={};
    for (const p of node.properties) {
      if (p.type === "SpreadElement") Object.assign(out,value(p.argument,local,seen));
      else out[p.key.name??p.key.value]=value(p.value,local,seen);
    }
    return out;
  }
  // Bundler asset wrappers return a literal URL; never execute downloaded code.
  if (node.type === "CallExpression" && node.arguments[0]?.type === "ObjectExpression") {
    const fn=node.arguments[0].properties.find(p=>(p.key.name??p.key.value)==="default")?.value;
    if (fn?.type === "ArrowFunctionExpression") return value(fn.body,local,seen);
  }
  throw Error("Nonliteral animation definition: "+node.type);
}
function visit(node,fn) {if(!node||typeof node!=="object")return;fn(node);for(const v of Object.values(node))if(Array.isArray(v))v.forEach(n=>visit(n,fn));else if(v&&typeof v==="object")visit(v,fn);}
function renderer(name) {
  let found;
  visit(ast,node=>{if(node.type==="ObjectExpression"&&node.properties.some(p=>p.key?.name==="__name"&&value(p.value)===name))found=node;});
  if(!found)throw Error("Missing "+name);
  return found.properties.find(p=>p.key?.name==="setup").value.body;
}
const petBody=renderer("PetRenderer"),petBindings=new Map(bindings);
for(const node of petBody.body)if(node.type==="VariableDeclaration")for(const d of node.declarations)if(d.id.type==="Identifier")petBindings.set(d.id.name,d.init);
const petNode=[...petBindings.values()].find(n=>n?.type==="ObjectExpression"&&n.properties.some(p=>p.key?.name==="petBeatrix"));
const pets=value(petNode,petBindings);
const findMotion = name => {
  for(const node of bindings.values())if(node?.type==="ObjectExpression"&&node.properties.some(p=>p.key?.name==="name"&&p.value.type==="TemplateLiteral"&&value(p.value)===name))return value(node);
  throw Error("Missing motion "+name);
};
const meleeNode=[...bindings.values()].find(n=>n?.type==="ObjectExpression"&&["attack","strength","defense"].every(key=>n.properties.some(p=>p.key?.name===key)));
const melee=value(meleeNode);
const bowNode=[...bindings.values()].find(n=>n?.type==="ArrayExpression"&&n.elements[0]?.type==="ObjectExpression"&&n.elements[0].properties.some(p=>p.key?.name==="name"&&value(p.value)==="Heavy pull"));
const bows=value(bowNode).map(m=>({...m,duration:800,hidesHeldHand:true}));
const quick=findMotion("Quick swing");
const bySource={};
for(const [id,config]of Object.entries(pets)) bySource[new URL(config.spritesheet,"https://microscape.cc").href]={kind:"pet",id,...config,spritesheet:undefined};
const creatureBody=renderer("CreatureMobRenderer");
const mobBindings=new Map(bindings);
for(const node of creatureBody.body)if(node.type==="VariableDeclaration")for(const d of node.declarations)if(d.id.type==="Identifier")mobBindings.set(d.id.name,d.init);
const mobNode=[...mobBindings.values()].find(n=>n?.type==="ObjectExpression"&&n.properties.some(p=>(p.key?.name??p.key?.value)==="sewer-crocodile"));
const stanceNode=[...mobBindings.values()].find(n=>n?.type==="ObjectExpression"&&n.properties.some(p=>(p.key?.name??p.key?.value)==="king-onyx-dragon"&&p.value.type==="ObjectExpression"));
const sources=value(mobNode,mobBindings),stances=value(stanceNode,mobBindings);
const foes=Object.fromEntries(Object.entries(game.foes).map(([id,mob])=>[id,{kind:mob.enemyType==="humanoid"?"humanoid":"creature",scale:mob.scale||1,
  skill:["attack","strength","defense"].reduce((a,b)=>(mob.stats[b]||0)>(mob.stats[a]||0)?b:a),equipment:mob.equipment}]));
for(const [id,src]of Object.entries(sources))if(foes[id])bySource[new URL(src,"https://microscape.cc").href]={...foes[id],id};
for(const [id,variants]of Object.entries(stances))for(const src of Object.values(variants))bySource[new URL(src,"https://microscape.cc").href]={...foes[id],id};
const weaponTypes=Object.fromEntries(Object.entries({...game.items,...game.appearance}).filter(([,i])=>i.slot==="weapon").map(([id,i])=>[id,i.tags?.includes("bow")||i.bonuses?.ranged>0?"ranged":i.tags?.includes("staff")||/staff|wand/i.test(id)?"magic":"melee"]));
const playerReference=JSON.parse(await fs.readFile(new URL("../docs/player-reference.json",import.meta.url),"utf8"));
const equipmentSources=Object.fromEntries([...new Set(Object.values(foes).flatMap(f=>Object.values(f.equipment||{})))].map(id=>[id,playerReference.equipment[id]]));
const icons={};
visit(ast,n=>{if(n.type==="Property"&&["../assets/icons/corruptedDruid.png","../assets/icons/druidWarrior.png"].includes(n.key?.value))icons[n.key.value]=new URL(value(n.value),"https://microscape.cc").href;});
const referenceFile=new URL("../docs/reference.json",import.meta.url);
const reference=JSON.parse(await fs.readFile(referenceFile,"utf8"));
for(const [id,key]of [["corrupted-druid","corruptedDruid"],["druid-warrior","druidWarrior"]])reference.find(p=>p.id===id).artwork=icons["../assets/icons/"+key+".png"];
await fs.writeFile(referenceFile,JSON.stringify(reference,null,2)+"\n");
const data={source:"https://microscape.cc/play/assets/index-BsSHHy-E.js",checkedAt:"2026-11-21",clientSha256:createHash("sha256").update(client).digest("hex"),bySource,foes,equipmentSources,weaponTypes,motions:{quick,melee,bows,magic:{duration:960,body:[{at:0,x:0},{at:.4,x:0,squash:.16},{at:.5,x:0,squash:-.12},{at:1,x:0}]}},
  idle:{humanoid:{duration:600,scale:[.96,1.04]},creature:{duration:1000,scale:[.96,1.06]},pet:{duration:800,scale:[.97,1.03]}}};
await fs.writeFile(new URL("../docs/sprite-motion-data.js",import.meta.url),"// Animation definitions parsed from the public game client; source JavaScript is never executed.\nexport const spriteMotionData = "+JSON.stringify(data,null,2)+";\n");
console.log(JSON.stringify({pets:Object.keys(pets).length,foes:Object.keys(foes).length,sourceSprites:Object.keys(bySource).length,fixedIcons:icons}));
