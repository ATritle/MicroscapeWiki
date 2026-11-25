import {abilityPower,potionBoost,temporaryBuffs,effectSupport} from "./loadout-effects.js?v=activity-effects-20261125";

export function createEffectControls({e,key,getEquipment,levels,reference,catalog,link,onChange,title:heading,defaultPotionsActive=true}){
  const title=heading||(key==="current"?"Current":"Test"),learned=new Set(),config=new Map(),overrides={};let spell=null;
  const label=id=>catalog.skills.find(s=>s.id===id)?.name||id;
  const root=e("div",{class:"loadout-effect-controls"}),abilityRows=e("div",{class:"loadout-effect-abilities"}),potionRows=e("div",{class:"loadout-effect-potions"});
  const activePotions=e("input",{type:"checkbox",id:key+"-potions-active"});activePotions.checked=defaultPotionsActive;
  const potionsLabel=e("label",{class:"loadout-checkbox",for:key+"-potions-active"},activePotions,"Assume equipped potions stay active");
  const learnedSelect=e("select",{id:key+"-learned-ability"},e("option",{value:""},"Choose a learned ability…"),...reference.abilities.filter(a=>a.category!=="evilMagic").sort((a,b)=>a.name.localeCompare(b.name)).map(a=>e("option",{value:a.id},a.name)));
  const add=e("button",{type:"button",class:"button"},"Add learned ability");
  const quick=e("input",{type:"number",id:key+"-quick-delay",min:"0.1",max:"3600",step:"any",value:"2"});
  const focus=e("input",{type:"number",id:key+"-focus-interval",min:"0.1",max:"3600",step:"any",placeholder:"Enter in-game seconds"});
  const maxHp=e("input",{type:"number",id:key+"-max-hp",min:"1",max:"1000000",step:"1",placeholder:"Optional; for Shield Wall"});
  const breaks=e("select",{id:key+"-spell-breaks"},...[0,1,2].map(n=>e("option",{value:String(n)},String(n))));
  const stack=e("select",{id:key+"-xp-stacking"},e("option",{value:"add"},"Additive (assumption)"),e("option",{value:"multiply"},"Multiplicative (assumption)"));
  const advanced=e("details",{class:"loadout-effects-advanced"},e("summary",{},"Proc timing, spell upgrades and assumptions"),
    e("label",{for:key+"-quick-delay"},"Bonus / quick attack delay (seconds)",quick),
    e("small",{},"Default 2s is an assumption. Used for Rapid Fire, Sacred Strike, Bloodscent, Quick Hex and Spell Echo."),
    e("label",{for:key+"-focus-interval"},"Focus cast interval (seconds)",focus),e("small",{},"Focus specifies slower casting without a number. Enter the in-game interval to get XP/hour with Focus."),
    e("label",{for:key+"-max-hp"},"Maximum HP",maxHp),
    e("label",{for:key+"-spell-breaks"},"Selected spell limit breaks",breaks),e("small",{},"Each invested break adds +1 spell max hit. Not read from the public profile."),
    e("label",{for:key+"-xp-stacking"},"XP bonus stacking",stack));
  root.append(e("p",{class:"world-map-help"},"Planning inputs: the public profile does not report ability levels or active buffs. Equipped abilities start at level 1; prayers start off. Learned abilities assume a permanent unlock. Verify your available ability slots and supplies in game."),
    e("h4",{},"Potion effects"),potionsLabel,potionRows,
    e("h4",{},"Active abilities"),abilityRows,e("div",{class:"loadout-actions"},e("label",{for:key+"-learned-ability"},"Add a learned ability",learnedSelect),add),advanced);
  function selected(){const equipment=getEquipment();return reference.abilities.filter(a=>a.category!=="evilMagic"&&(learned.has(a.id)||Object.values(equipment).includes(a.onItem)));}
  function settingsFor(a){if(!config.has(a.id))config.set(a.id,{enabled:a.category!=="prayer",level:1,uptime:0});return config.get(a.id);}
  function sync(){
    const equipped=getEquipment();
    const grouped=new Map();for(const id of [...new Set([equipped.potion1,equipped.potion2,equipped.potion3].filter(Boolean))]){
      const p=reference.potions[id];if(!p)continue;if(!grouped.has(p.skill))grouped.set(p.skill,[]);grouped.get(p.skill).push(id);
    }
    potionRows.replaceChildren(...[...grouped].map(([skill,ids])=>{
      const boost=Math.max(...ids.map(id=>potionBoost(reference.potions[id],levels[skill]||1)));
      const input=e("input",{type:"number",id:key+"-potion-"+skill,min:"0",max:"1000",step:"any",placeholder:String(boost)});if(overrides[skill]!=null)input.value=String(overrides[skill]);
      input.addEventListener("input",()=>{overrides[skill]=input.value.trim()===""?null:Number(input.value);onChange();});
      return e("div",{class:"loadout-potion-effect"},e("strong",{},ids.map(id=>catalog.items[id].name).join(" / ")),
        e("span",{},"+"+boost+" "+label(skill)+(ids.some(id=>reference.potions[id].type==="super")?" · floor(15% of base level) + 3 (assumed rounding)":"")),
        e("label",{for:key+"-potion-"+skill},"Override "+label(skill)+" potion boost",input),e("small",{},"Use the exact buff shown in game if different. Same-skill potions use the highest boost, not a sum, unless overridden."));
    }));
    if(!grouped.size)potionRows.append(e("p",{class:"world-map-help"},"No potion selected in this loadout’s potion slots."));
    abilityRows.replaceChildren(...selected().map(a=>{
      const state=settingsFor(a),isLearned=learned.has(a.id),enabled=e("input",{type:"checkbox",id:key+"-ability-"+a.id});enabled.checked=state.enabled;
      const power=e("span",{class:"loadout-ability-power"});
      const updatePower=()=>{try{power.textContent=a.type==="scaling"?abilityPower(a,isLearned?a.permanentUnlockLevel:state.level)+"% power / chance":"Static effect";}catch{power.textContent="Enter a valid level";}};updatePower();
      enabled.addEventListener("change",()=>{state.enabled=enabled.checked;onChange();});
      const row=e("div",{class:"loadout-effect-ability"},e("div",{class:"loadout-effect-title"},e("label",{class:"loadout-checkbox",for:key+"-ability-"+a.id},enabled,a.name),link("Details",a.wikiId)),
        e("small",{},isLearned?"Learned / slotted · verify your unlocked slots":catalog.items[a.onItem]?.name||a.onItem),power,
        e("p",{},a.summary),e("small",{class:"loadout-effect-support"},effectSupport(a)));
      if(a.type==="scaling"&&!isLearned){
        const level=e("input",{type:"number",id:key+"-level-"+a.id,"aria-label":a.name+" ability level",min:"1",max:String(a.permanentUnlockLevel),step:"any",value:String(state.level)});
        level.addEventListener("input",()=>{state.level=level.value.trim()===""?NaN:Number(level.value);updatePower();onChange();});
        row.append(e("label",{for:key+"-level-"+a.id},"Ability level (1–"+a.permanentUnlockLevel+")",level));
      }
      if(temporaryBuffs[a.id]){
        const uptime=e("input",{type:"number",id:key+"-uptime-"+a.id,min:"0",max:"100",step:"any",value:String(state.uptime)});
        uptime.addEventListener("input",()=>{state.uptime=uptime.value.trim()===""?NaN:Number(uptime.value);onChange();});
        row.append(e("label",{for:key+"-uptime-"+a.id},"Assumed combat uptime (%)",uptime),e("small",{},"Enter a measured time share. 0% excludes this temporary buff from stats and XP; the trigger rate is not its uptime."));
      }
      if(isLearned){const remove=e("button",{type:"button",class:"button","aria-label":title+": remove "+a.name},"Remove learned ability");remove.addEventListener("click",()=>{learned.delete(a.id);sync();onChange();});row.append(remove);}
      return row;
    }));
    if(!selected().length)abilityRows.append(e("p",{class:"world-map-help"},"No equipped abilities. Add learned abilities below."));
  }
  add.addEventListener("click",()=>{if(!learnedSelect.value)return;learned.add(learnedSelect.value);const a=reference.abilities.find(a=>a.id===learnedSelect.value);settingsFor(a).enabled=true;sync();onChange();});
  for(const input of [activePotions,quick,focus,maxHp,breaks,stack])input.addEventListener("input",onChange);
  function read(){
    for(const input of [quick,focus,maxHp])if((input===quick||input.value!=="")&&!input.validity.valid)throw Error("Enter valid "+title.toLowerCase()+" effect assumptions.");
    return {potionsActive:activePotions.checked,potionOverrides:{...overrides},abilities:selected().map(a=>({...settingsFor(a),id:a.id,learned:learned.has(a.id)})),
      quickSeconds:quick.value.trim()===""?NaN:Number(quick.value),focusSeconds:focus.value.trim()===""?null:Number(focus.value),maxHp:maxHp.value.trim()===""?null:Number(maxHp.value),spellBreaks:Number(breaks.value),xpStack:stack.value};
  }
  sync();
  return {node:root,sync,read,setSpell(next){spell=next;const a=reference.abilities.find(a=>a.id===spell?.id),max=Math.min(2,a?.investmentTier??2);for(const option of breaks.options)option.disabled=Number(option.value)>max;if(Number(breaks.value)>max)breaks.value=String(max);},
    copyFrom(other){const input=other.read();learned.clear();config.clear();for(const a of input.abilities){config.set(a.id,{enabled:a.enabled,level:a.level,uptime:a.uptime});if(a.learned)learned.add(a.id);}Object.keys(overrides).forEach(k=>delete overrides[k]);Object.assign(overrides,input.potionOverrides);activePotions.checked=input.potionsActive;quick.value=String(input.quickSeconds);focus.value=input.focusSeconds??"";maxHp.value=input.maxHp??"";breaks.value=String(input.spellBreaks);stack.value=input.xpStack;sync();},
    reset(){learned.clear();config.clear();Object.keys(overrides).forEach(k=>delete overrides[k]);activePotions.checked=defaultPotionsActive;quick.value="2";focus.value="";maxHp.value="";breaks.value="0";stack.value="add";sync();}};
}
