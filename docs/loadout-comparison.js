import {equipmentBonuses,compareCombat,COMBAT_XP_RATES} from "./combat-comparison.js?v=vendors-20261120";

export const loadoutSlots=[["head","Head"],["cape","Cape"],["amulet","Amulet"],["weapon","Weapon"],["shield","Shield"],["body","Body"],["hands","Hands"],["feet","Feet"],["ring","Ring"],["tool","Tool"],["food","Food"],["ammo","Ammunition"],["pet","Pet"],["potion1","Potion 1"],["potion2","Potion 2"],["potion3","Potion 3"]];
const nameOf=id=>String(id||"").replace(/([a-z])([A-Z])/g,"$1 $2").replace(/^./,s=>s.toUpperCase());
const skillName=id=>({evilMagic:"Evil Magic",goodMagic:"Good Magic"}[id]||nameOf(id));
export function slotAccepts(slot,item){return Boolean(item&&(slot.startsWith("potion")?item.slot==="potion1":item.slot===slot));}
export function loadoutRequirements(equipment,levels,items) {
  const issues=[];
  for(const [slot,label] of loadoutSlots){
    const id=equipment[slot];if(!id)continue;const item=items[id];
    if(!item){issues.push(label+": item data unavailable");continue;}
    if(!slotAccepts(slot,item))issues.push(item.name+" does not fit the "+label+" slot");
    for(const [skill,level] of Object.entries(item.requirements||{}))if((levels[skill]||1)<level)issues.push(item.name+" requires "+skillName(skill)+" "+level+" (current "+(levels[skill]||1)+")");
  }
  if(items[equipment.weapon]?.tags?.includes("2h")&&equipment.shield)issues.push("A two-handed weapon cannot be used with a shield");
  return issues;
}
export function changeLoadout(equipment,slot,id,items) {
  if(!loadoutSlots.some(([key])=>key===slot)||id&&!slotAccepts(slot,items[id]))throw Error("Choose an item for this equipment slot.");
  const next={...equipment};if(id)next[slot]=id;else delete next[slot];
  if(slot==="weapon"&&items[id]?.tags?.includes("2h"))delete next.shield;
  if(slot==="shield"&&id&&items[next.weapon]?.tags?.includes("2h"))delete next.weapon;
  return next;
}
export function loadoutSkill(equipment,items,choice="auto") {
  if(choice!=="auto")return choice;
  const tags=items[equipment.weapon]?.tags||[];
  return tags.includes("bow")?"ranged":tags.includes("staff")?"evilMagic":"attack";
}
export function modelLoadout({equipment,levels,catalog,foe,choice="auto",spellId,prepSeconds=6,includeZero=false}) {
  const bonuses=equipmentBonuses(equipment,catalog.items),skill=loadoutSkill(equipment,catalog.items,choice);
  const issues=loadoutRequirements(equipment,levels,catalog.items),notes=[];
  const spell=catalog.spells.find(s=>s.id===spellId),weapon=catalog.items[equipment.weapon];
  if(!COMBAT_XP_RATES[skill])throw Error("Choose a combat training skill.");
  if(skill==="ranged"&&!weapon?.tags?.includes("bow"))issues.push("Ranged training needs a bow");
  if(["attack","strength","defense"].includes(skill)&&weapon?.tags?.includes("bow"))issues.push("A bow cannot use this training style");
  if(skill==="ranged"&&!equipment.ammo)issues.push("Equip arrows for Ranged training");
  if(skill==="evilMagic"&&(!spell||(levels.evilMagic||1)<spell.level))issues.push(spell?spell.name+" requires Evil Magic "+spell.level:"Select a spell");
  if(skill==="evilMagic")notes.push("Spell unlocks and rune supplies must be checked in-game.");
  if(foe?.requiredItem)notes.push("Encounter item required: "+(catalog.items[foe.requiredItem]?.name||nameOf(foe.requiredItem))+". Inventory is not public.");
  let reason=issues.length?"Requirements are not met; combat estimates are unavailable.":foe?.special?"Boss or special encounter: this basic solo model cannot estimate a fight.":foe?.safeSpot&&!["ranged","evilMagic"].includes(skill)?"This safe spot requires Ranged or Evil Magic.":null;
  if(!foe)return {bonuses,skill,issues,notes,reason:"Select an enemy",row:null};
  const row=reason?null:compareCombat(levels,bonuses,[foe],{skill,spellMaxHit:spell?.maxHit,prepSeconds,includeZero})[0];
  return {bonuses,skill,issues,notes,reason,row};
}

export function renderLoadoutComparison({e,player,levels,catalog,appearance,abilities,byId,entryUrl,paintPlayer,renderSpriteFrame,checkedAt,refreshProfile}) {
  const baseline={...player.equipment};let test={...baseline},disposed=false,previewVersion=0,stopCurrent,stopTest,pickerSlot,pickerReturn,shown=60;
  const fmt=(n,digits=1)=>Number.isFinite(n)?new Intl.NumberFormat("en",{maximumFractionDigits:digits}).format(n):"Unavailable";
  const itemName=id=>catalog.items[id]?.name||nameOf(id)||"Not equipped";
  const link=(text,id,attrs={})=>id&&byId.has(id)?e("a",{href:entryUrl(id),...attrs},text):e("span",attrs,text);
  const icon=id=>catalog.items[id]?.icon?e("img",{src:catalog.items[id].icon,alt:"",width:30,height:30,loading:"lazy",referrerpolicy:"no-referrer"}):e("span",{class:"loadout-empty-icon","aria-hidden":"true"},"◇");
  const changed=e("p",{class:"loadout-change-status",role:"status","aria-live":"polite"});
  const reset=e("button",{type:"button",class:"button"},"Reset test loadout");
  const refresh=e("button",{type:"button",class:"button"},"Refresh profile and reset plan");refresh.addEventListener("click",refreshProfile);
  const root=e("section",{class:"loadout-tool","aria-label":"Gear and loadout comparison"},
    e("div",{class:"loadout-profile-summary"},e("div",{},e("h2",{},player.name),e("p",{},"Using reported base skill levels · Checked "+new Date(checkedAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}))),
      e("a",{class:"button",href:"#/player-lookup?"+new URLSearchParams({name:player.name})},"View player profile")),
    e("p",{class:"player-panel-caption"},"Test equipment here without changing your character. Your current gear is the baseline; the test loadout starts as a copy. Inventory ownership and active buffs are not public."),
    e("div",{class:"loadout-actions"},reset,refresh),changed);
  const side={};
  for(const key of ["current","test"]){
    const canvas=e("canvas",{width:192,height:192,role:"img","aria-label":player.name+" · "+(key==="current"?"current gear":"test loadout")});
    const artNote=e("p",{class:"player-art-note",hidden:""});
    const gear=e("div",{class:"loadout-gear-list",tabindex:"0",role:"region","aria-label":key==="current"?"Current equipment":"Test equipment"});
    const summary=e("p",{class:"loadout-bonus-summary"}),grants=e("div",{class:"loadout-granted"});
    const card=e("section",{class:"loadout-card "+(key==="test"?"loadout-card-test":"")},e("div",{class:"player-panel-heading"},e("h3",{},key==="current"?"Current gear":"Test loadout"),e("span",{},key==="current"?"Profile snapshot":"Editable")),
      e("div",{class:"player-sprite-stage loadout-sprite-stage"},canvas),artNote,summary,gear,
      e("details",{class:"loadout-abilities"},e("summary",{},"Gear-granted abilities"),e("p",{class:"world-map-help"},"Availability comes from equipped items. Ability level, unlocks and effects are not included in estimates."),grants));
    side[key]={card,canvas,artNote,gear,summary,grants};
  }
  root.append(e("div",{class:"loadout-columns"},side.current.card,side.test.card));
  const warnings=e("div",{class:"loadout-requirements",role:"status"}),statRows=e("tbody");
  root.append(warnings,e("section",{class:"player-panel loadout-stats"},e("h3",{},"Stat comparison"),e("p",{class:"player-panel-caption"},"Base level plus flat equipment bonuses. These totals are not percentage damage increases. Potions and ability effects are excluded."),
    e("div",{class:"table-wrap"},e("table",{},e("thead",{},e("tr",{},...["Skill / stat","Base","Current gear","Test gear","Change"].map(t=>e("th",{scope:"col"},t)))),statRows))));
  const foeSelect=e("select",{id:"loadout-enemy"},...catalog.activities.filter(a=>a.skill==="attack").sort((a,b)=>Number(a.otherActivity)-Number(b.otherActivity)||a.sortLevel-b.sortLevel).map(a=>e("option",{value:a.mob},a.name+" · Lv "+a.combatLevel)));
  foeSelect.value=catalog.foes.mouse?"mouse":foeSelect.options[0]?.value;
  const prep=e("input",{id:"loadout-preparation",type:"number",min:"0",max:"3600",step:"any",value:"6"});
  const zero=e("input",{type:"checkbox",id:"loadout-zero"});
  const styleOptions=[["auto","Auto from weapon"],["attack","Attack"],["strength","Strength"],["defense","Defense"],["ranged","Ranged"],["evilMagic","Evil Magic"]];
  const choices={},spells={};
  const styleControls=["current","test"].map(key=>{
    choices[key]=e("select",{id:"loadout-style-"+key},...styleOptions.map(([value,text])=>e("option",{value},text)));
    spells[key]=e("select",{id:"loadout-spell-"+key},...catalog.spells.map(s=>e("option",{value:s.id},s.name+" · Evil Magic "+s.level)));
    spells[key].value=catalog.spells.find(s=>s.level<=(levels.evilMagic||1))?.id||catalog.spells[0]?.id;
    const spellWrap=e("label",{for:"loadout-spell-"+key},(key==="current"?"Current":"Test")+" spell",spells[key]);side[key].spellWrap=spellWrap;
    return e("div",{},e("label",{for:"loadout-style-"+key},(key==="current"?"Current":"Test")+" training style",choices[key]),spellWrap);
  });
  const combatOutput=e("div",{class:"loadout-combat-output","aria-live":"polite"});
  root.append(e("section",{class:"player-panel loadout-combat"},e("h3",{},"Compare against an enemy"),
    e("div",{class:"loadout-combat-controls"},e("label",{for:"loadout-enemy"},"Enemy",foeSelect),...styleControls),
    e("details",{},e("summary",{},"Timing assumptions"),e("div",{class:"loadout-timing"},e("label",{for:"loadout-preparation"},"Seconds between fights",prep),e("label",{class:"loadout-checkbox",for:"loadout-zero"},zero,"Include zero-damage rolls"))),combatOutput,
    e("details",{class:"loadout-method"},e("summary",{},"How these estimates work"),
      e("p",{},"Hit chance and maximum hits use the public client formulas. Kill cycles assume uniform damage rolls, a full weapon interval per swing and the selected delay between full-health enemies. Eating, deaths, banking, queues, buffs, learned abilities and extra attacks are excluded. Dodge represents melee defense only."),
      e("p",{},"Attack uses an observed baseline of 4 XP per damage. Strength, Defense, Ranged and Evil Magic assume that rate and remain unverified. These are solo training estimates, not boss simulations. Gear-granted and manually listed abilities do not change these estimates."),
      e("a",{href:"./assets/game-data/combat-xp-2026-11-20.json"},"Combat XP evidence"))));
  const learned=new Set(),learnedList=e("div",{class:"loadout-learned-list"}),learnedSelect=e("select",{id:"loadout-learned"},e("option",{value:""},"Choose an ability…"),...abilities.map(a=>e("option",{value:a.id},a.name)).sort((a,b)=>a.textContent.localeCompare(b.textContent)));
  const addLearned=e("button",{type:"button",class:"button"},"Add ability");
  addLearned.addEventListener("click",()=>{if(learnedSelect.value)learned.add(learnedSelect.value);renderLearned();});
  function renderLearned(){learnedList.replaceChildren(...[...learned].map(id=>{const a=abilities.find(a=>a.id===id),remove=e("button",{type:"button","aria-label":"Remove "+a.name},"Remove");remove.addEventListener("click",()=>{learned.delete(id);renderLearned();});return e("div",{},link(a.name,a.wikiId),remove);}));}
  root.append(e("details",{class:"player-panel loadout-learned"},e("summary",{},"Learned abilities · optional planning notes"),e("p",{class:"player-panel-caption"},"The public profile does not provide learned abilities or their levels. Add any you want listed with this plan. They are notes only and do not change the calculated stats or rates."),e("div",{class:"loadout-actions"},e("label",{for:"loadout-learned"},"Learned ability",learnedSelect),addLearned),learnedList));
  const pickerSearch=e("input",{type:"search",id:"loadout-item-search",placeholder:"Search equipment…",autocomplete:"off"}),pickerList=e("div",{class:"loadout-picker-results"}),pickerTitle=e("h3",{id:"loadout-picker-title"}),onlyReady=e("input",{type:"checkbox",id:"loadout-ready-only"});
  const close=e("button",{type:"button",class:"button"},"Close"),more=e("button",{type:"button",class:"button"},"Show more items");
  const picker=e("dialog",{class:"loadout-picker","aria-labelledby":"loadout-picker-title"},e("div",{class:"player-panel-heading"},pickerTitle,close),e("label",{for:"loadout-item-search"},"Find equipment",pickerSearch),e("label",{class:"loadout-checkbox",for:"loadout-ready-only"},onlyReady,"Only show items whose level requirements I meet"),pickerList,more);
  root.append(picker);
  function closePicker(){picker.close();pickerReturn?.focus();}
  close.addEventListener("click",closePicker);
  picker.addEventListener("click",event=>{if(event.target===picker){const r=picker.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePicker();}});
  picker.addEventListener("close",()=>pickerReturn?.focus());
  function requirementText(item){const req=Object.entries(item.requirements||{});return req.length?req.map(([id,n])=>skillName(id)+" "+n).join(" · "):"No level requirement";}
  function updatePicker(){
    const q=pickerSearch.value.trim().toLowerCase(),levelsMet=item=>Object.entries(item.requirements||{}).every(([id,n])=>(levels[id]||1)>=n);
    const items=Object.entries(catalog.items).filter(([id,item])=>slotAccepts(pickerSlot,item)&&byId.get(item.wikiId)?.availabilityStatus!=="absent-current-build"&&(!q||item.name.toLowerCase().includes(q))&&(!onlyReady.checked||levelsMet(item)))
      .sort(([,a],[,b])=>Math.max(0,...Object.values(a.requirements||{}))-Math.max(0,...Object.values(b.requirements||{}))||a.name.localeCompare(b.name));
    const choose=(id)=>{test=changeLoadout(test,pickerSlot,id,catalog.items);closePicker();renderTest();side.test.gear.querySelector('[aria-label="Change '+loadoutSlots.find(([slot])=>slot===pickerSlot)[1]+'"]')?.focus();};
    const empty=e("button",{type:"button",class:"loadout-picker-item"},e("span",{},"Not equipped"));empty.addEventListener("click",()=>choose(""));
    pickerList.replaceChildren(empty,...items.slice(0,shown).map(([id,item])=>{const button=e("button",{type:"button",class:"loadout-picker-item"+(levelsMet(item)?"":" is-locked"),"aria-label":"Equip "+item.name},icon(id),e("span",{},e("strong",{},item.name),e("small",{},requirementText(item)+(levelsMet(item)?"":" · requirements not met")+(item.tags?.includes("2h")?" · Two-handed; replaces shield":""))));button.addEventListener("click",()=>choose(id));return button;}));
    if(!items.length)pickerList.append(e("p",{},"No equipment matches this search."));more.hidden=items.length<=shown;
  }
  pickerSearch.addEventListener("input",()=>{shown=60;updatePicker();});onlyReady.addEventListener("change",updatePicker);more.addEventListener("click",()=>{shown+=60;updatePicker();});
  function renderGear(key,equipment){
    side[key].gear.replaceChildren(...loadoutSlots.map(([slot,label])=>{
      const id=equipment[slot],button=key==="test"?e("button",{type:"button",class:"loadout-change","aria-label":"Change "+label},"Change"):null;
      if(button)button.addEventListener("click",()=>{pickerSlot=slot;pickerReturn=button;pickerTitle.textContent="Choose "+label.toLowerCase();pickerSearch.value="";shown=60;updatePicker();picker.showModal();pickerSearch.focus();});
      return e("div",{class:"loadout-gear-row"+(test[slot]!==baseline[slot]?" is-changed":"")},icon(id),e("div",{},e("small",{},label),link(id?itemName(id):"Not equipped",catalog.items[id]?.wikiId)),...(button?[button]:[]));
    }));
    const b=equipmentBonuses(equipment,catalog.items);side[key].summary.textContent=["attack","strength","defense","ranged","evilMagic"].filter(id=>b[id]).map(id=>skillName(id)+" "+(b[id]>=0?"+":"")+b[id]).join(" · ")||"No flat combat bonuses";
    const granted=abilities.filter(a=>Object.values(equipment).includes(a.onItem));
    side[key].grants.replaceChildren(...(granted.length?granted.map(a=>e("p",{},link(a.name,a.wikiId),e("small",{},itemName(a.onItem)+" · "+a.summary))):[e("p",{},"No equipment-granted abilities listed.")]));
  }
  function paint(key,equipment){
    if(key==="test")stopTest?.();else stopCurrent?.();const version=key==="test"?++previewVersion:0;
    if(key==="test"){const canvas=e("canvas",{width:192,height:192,role:"img","aria-label":player.name+" · test loadout"});side[key].canvas.replaceWith(canvas);side[key].canvas=canvas;}
    const stage=side[key].card.querySelector(".loadout-sprite-stage"),pet=appearance.pets[equipment.pet];stage.querySelector(".player-pet")?.remove();
    if(pet?.sprite&&renderSpriteFrame)stage.append(e("span",{class:"player-pet",role:"img","aria-label":pet.name},renderSpriteFrame(pet.sprite)));
    paintPlayer(side[key].canvas,{...equipment},appearance).then(({complete,dispose})=>{
      if(disposed||key==="test"&&version!==previewVersion){dispose();return;}
      if(key==="test")stopTest=dispose;else stopCurrent=dispose;
      side[key].artNote.hidden=complete;side[key].artNote.textContent=complete?"":"Some appearance artwork is unavailable.";
    }).catch(()=>{if(!disposed){side[key].artNote.hidden=false;side[key].artNote.textContent="Appearance artwork could not be loaded.";}});
  }
  function renderStats(){
    const a=equipmentBonuses(baseline,catalog.items),b=equipmentBonuses(test,catalog.items);
    const statIds=[...catalog.skills.map(s=>s.id),...new Set([...Object.keys(a),...Object.keys(b)].filter(id=>!catalog.skills.some(s=>s.id===id)&&id!=="attackCooldown"))];
    statRows.replaceChildren(...statIds.filter(id=>a[id]||b[id]).map(id=>{
      const isSkill=catalog.skills.some(s=>s.id===id),base=isSkill?(levels[id]||1):0,av=a[id]||0,bv=b[id]||0,delta=bv-av;
      const label={autoEat:"Auto-eat threshold (points)",eatRecovery:"Food healing (HP)",abilitySlots:"Extra ability slots"}[id]||skillName(id);
      return e("tr",{},e("th",{scope:"row"},label),e("td",{},isSkill?fmt(base):"—"),e("td",{},(av>=0?"+":"")+fmt(av)+(isSkill?" → "+fmt(base+av):"")),e("td",{},(bv>=0?"+":"")+fmt(bv)+(isSkill?" → "+fmt(base+bv):"")),e("td",{class:delta>0?"loadout-gain":delta<0?"loadout-loss":""},(delta>0?"+":"")+fmt(delta)));
    }));
    if(!statRows.children.length)statRows.append(e("tr",{},e("td",{colspan:"5"},"Neither set has flat equipment bonuses. Base skill levels are unchanged.")));
    const issues=loadoutRequirements(test,levels,catalog.items);warnings.replaceChildren(...(issues.length?[e("h3",{},"Test loadout requirements"),e("ul",{},...issues.map(t=>e("li",{},t)))]:[]));
    const count=loadoutSlots.filter(([slot])=>test[slot]!==baseline[slot]).length;
    changed.textContent=count?count+" equipment "+(count===1?"slot changed":"slots changed")+" · "+(issues.length?"Requirements not met":"Level requirements met"):"Both loadouts match your current equipment.";
  }
  function renderCombat(){
    const foe=catalog.foes[foeSelect.value],configs={current:baseline,test},models={};
    if(prep.value.trim()===""||!prep.validity.valid){combatOutput.replaceChildren(e("p",{class:"comparison-warning"},"Enter a valid delay from 0 to 3,600 seconds."));return;}
    for(const key of ["current","test"]){
      const skill=loadoutSkill(configs[key],catalog.items,choices[key].value);side[key].spellWrap.hidden=skill!=="evilMagic";
      models[key]=modelLoadout({equipment:configs[key],levels,catalog,foe,choice:choices[key].value,spellId:spells[key].value,prepSeconds:Number(prep.value),includeZero:zero.checked});
    }
    const headers=["Metric","Current gear","Test loadout","Change"],rows=[];
    const metric=(title,read,unit="",percent=false,lowerBetter=false)=>{
      const a=models.current,b=models.test,av=a.reason?null:read(a.row),bv=b.reason?null:read(b.row);
      const show=v=>v===null?"Not modeled":fmt(percent?v*100:v)+unit;
      const delta=av!==null&&bv!==null?bv-av:null,relative=delta!==null&&av!==0?delta/Math.abs(av)*100:null;
      const color=delta===null||delta===0?"":(lowerBetter?delta<0:delta>0)?"loadout-gain":"loadout-loss";
      rows.push(e("tr",{},e("th",{scope:"row"},title),e("td",{},show(av)),e("td",{},show(bv)),e("td",{class:color},delta===null?"—":(delta>0?"+":"")+fmt(percent?delta*100:delta)+(percent?" percentage points":unit)+(relative!==null&&!percent?" ("+(relative>0?"+":"")+fmt(relative)+"%)":""))));
    };
    metric("Hit chance",r=>r.hitChance,"%",true);metric("Maximum hit",r=>r.maxHit);metric("Attack interval",r=>r.attackSeconds,"s",false,true);metric("Melee dodge chance",r=>r.dodgeChance,"%",true);metric("Estimated kill cycle",r=>r.cycleSeconds,"s",false,true);metric("Estimated damage/hour",r=>r.damagePerHour);metric("Estimated XP/hour",r=>r.xpPerHour);
    combatOutput.replaceChildren(e("p",{class:"loadout-combat-context"},link(foe.name,foe.wikiId)," · "+foe.hp+" HP · Current: "+skillName(models.current.skill)+" · Test: "+skillName(models.test.skill)),
      e("div",{class:"table-wrap"},e("table",{},e("thead",{},e("tr",{},...headers.map(t=>e("th",{scope:"col"},t)))),e("tbody",{},...rows))),
      ...["current","test"].flatMap(key=>{const m=models[key];return [...(m.reason?[e("p",{class:"comparison-warning"},(key==="current"?"Current gear: ":"Test loadout: ")+m.reason+" "+m.issues.join("; "))]:[]),...m.notes.map(t=>e("p",{class:"world-map-help"},t))];}),
      e("p",{class:"world-map-help"},"XP baseline: Current "+COMBAT_XP_RATES[models.current.skill].status+" · Test "+COMBAT_XP_RATES[models.test.skill].status+". "+(models.current.skill!==models.test.skill?"These rates train different skills. ":"")+"Food, abilities and potion effects are not included."));
  }
  function renderTest(){renderGear("test",test);paint("test",test);renderStats();renderCombat();}
  reset.addEventListener("click",()=>{test={...baseline};choices.test.value="auto";renderTest();});
  for(const control of [foeSelect,prep,zero,...Object.values(choices),...Object.values(spells)])control.addEventListener("input",renderCombat);
  renderGear("current",baseline);paint("current",baseline);renderTest();
  return {node:root,dispose(){disposed=true;previewVersion++;stopCurrent?.();stopTest?.();if(picker.open)picker.close();}};
}
