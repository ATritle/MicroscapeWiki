import {activitiesForSkill} from './activity-comparison.js?v=equipment-20261124';
import {cleanPlan,encodePlan,MAX_STEPS,MAX_ACTIONS,alchemyItems,queueActivity,activityXpText,activityPlanningNotes} from './queue-model.js?v=all-activities-20261127';
import {loadoutSlots,slotAccepts,changeLoadout} from './loadout-comparison.js?v=queue-gear-20261124';
const kinds=new Set(['actions','level','items-gte','items-lte','indefinite']);
const draftKey='microscape-wiki-membership-queue-draft-v1',saveKey='microscape-wiki-membership-queue-saves-v1';
export function queuePlayerEquipment(player,catalog){
  if(!player?.equipment||typeof player.equipment!=='object'||Array.isArray(player.equipment))throw Error('Equipped gear is not available in this public profile. Try again or confirm owned items manually.');
  return Object.fromEntries(loadoutSlots.flatMap(([slot])=>{
    const id=player.equipment[slot];
    return typeof id==='string'&&Object.hasOwn(catalog.items,id)&&slotAccepts(slot,catalog.items[id])?[[slot,id]]:[];
  }));
}
export function queueAvailableItems(equipment,confirmed,catalog){
  return new Set([...Object.values(equipment),...confirmed].filter(id=>Object.hasOwn(catalog.items,id)&&loadoutSlots.some(([slot])=>slotAccepts(slot,catalog.items[id]))));
}
export function missingQueueEquipment(equipment,available){return [...new Set(Object.values(equipment||{}))].filter(id=>!available.has(id));}
export function queueGearChoices(slot,available,catalog){return Object.entries(catalog.items).filter(([id,item])=>available.has(id)&&slotAccepts(slot,item)).sort((a,b)=>a[1].name.localeCompare(b[1].name));}
export function cleanMembershipQueue(input,catalog){
  if(!input||input.version!==1||!Array.isArray(input.steps)||input.steps.length>MAX_STEPS)throw Error('Choose a queue with no more than 20 steps.');
  const steps=input.steps.map((s,i)=>{
    if(s?.type==='loadout'){
      const name=String(s.name||'Custom loadout').trim().slice(0,60)||'Custom loadout';
      // Preserve earlier preview links without inventing the contents of a saved slot.
      if(!Object.hasOwn(s,'equipment')&&(Object.hasOwn(s,'slot')||Object.hasOwn(s,'legacySlot'))){
        const slot=s.legacySlot??s.slot;
        if(!Number.isInteger(slot)||slot<1||slot>4)throw Error('Step '+(i+1)+' has an invalid earlier saved loadout reference.');
        return {type:'loadout',name,legacySlot:slot};
      }
      if(!s.equipment||typeof s.equipment!=='object'||Array.isArray(s.equipment))throw Error('Configure the equipment for loadout step '+(i+1)+'.');
      const equipment={};
      for(const [slot,id] of Object.entries(s.equipment)){
        if(!loadoutSlots.some(([key])=>key===slot)||typeof id!=='string'||!Object.hasOwn(catalog.items,id)||!slotAccepts(slot,catalog.items[id]))throw Error('Step '+(i+1)+' has an item in the wrong equipment slot.');
        equipment[slot]=id;
      }
      if(catalog.items[equipment.weapon]?.tags?.includes('2h')&&equipment.shield)throw Error('A two-handed weapon cannot be used with a shield in step '+(i+1)+'.');
      return {type:'loadout',name,equipment};
    }
    if(s?.type!=='activity'||!kinds.has(s.goal))throw Error('Step '+(i+1)+' has an invalid step type or stopping condition.');
    const base=cleanPlan({version:1,steps:[{...s,goal:'actions',value:1}]},catalog).steps[0];
    const definition=catalog.activities.find(a=>a.id===s.activityId);
    if(s.goal==='level'&&!definition.mob&&!(definition.exp>0))throw Error('Choose an action or item target; this activity does not award XP in its listed skill.');
    const value=s.goal==='indefinite'?0:Number(s.value),minimum=s.goal==='items-lte'||s.goal==='indefinite'?0:1;
    if(!Number.isInteger(value)||value<minimum||value>(s.goal==='level'?99:MAX_ACTIONS))throw Error('Step '+(i+1)+' has an invalid stopping target.');
    if(definition.travelsTo&&(s.goal!=='actions'||value!==1))throw Error('Travel steps must be one action. Plan the return trip separately.');
    if(s.goal.startsWith('items-')&&!Object.hasOwn(catalog.items,s.itemId))throw Error('Select the inventory item to watch for step '+(i+1)+'.');
    if(s.goal.startsWith('items-')&&definition.randomOutputs?.some(i=>i.id===s.itemId)&&![...(definition.inputs||[]),...(definition.outputs||[])].some(i=>i.id===s.itemId))throw Error('Random rewards cannot be guaranteed item-count targets. Choose an action-count target.');
    return {type:'activity',...base,goal:s.goal,value,itemId:s.goal.startsWith('items-')?s.itemId:''};
  });
  return {version:1,name:String(input.name||'My activity queue').slice(0,80),steps};
}
export function exampleMembershipQueue(catalog){return cleanMembershipQueue({version:1,name:'Shrimp → melee loadout → cows',steps:[
  {type:'activity',activityId:'fishing/catch-shrimp',goal:'items-gte',value:100,itemId:'rawShrimp',location:'fencewell-bridge'},
  {type:'loadout',name:'Melee',equipment:{head:'bronzeMedHelm',body:'bronzeArmor',weapon:'bronzeScimitar',shield:'bronzeSqShield',feet:'leatherBoots'}},
  {type:'activity',activityId:'attack/fight-cow',goal:'actions',value:20,location:'fencewell-bridge'}
]},catalog);}
export function decodeMembershipQueue(text,catalog){
  if(typeof text!=='string'||text.length>32000||!/^[A-Za-z0-9_-]+$/.test(text))throw Error('This shared queue link is invalid.');
  try{return cleanMembershipQueue(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)))),catalog);}
  catch(error){throw Error('Could not open the queue: '+error.message);}
}
export function renderMembershipQueue({e,byId,entryUrl}){
  const node=e('section',{class:'queue-planner membership-queue','aria-labelledby':'membership-queue-heading'},
    e('div',{class:'queue-heading'},e('div',{},e('p',{class:'queue-eyebrow'},'ACTIVITIES + CUSTOM LOADOUTS'),e('h2',{id:'membership-queue-heading'},'Activity Queue')),e('span',{class:'queue-count'},'BETA · In development')),
    e('p',{class:'queue-help'},'This beta builder is still being refined. Use it to plan the steps for Microscape’s Guild membership queue.'),
    e('p',{class:'queue-intro'},'Arrange activities with stopping conditions and configure the equipment for each loadout change. Build the gear setup here, then save it as an in-game loadout when entering your queue.'),
    e('p',{class:'membership-manual'},'Wiki setup only. Add these steps manually in-game; this page does not run or update your character.'));
  const loading=e('p',{role:'status'},'Loading the queue builder…');node.append(loading);
  if(globalThis.__WIKI_PRERENDER__){loading.textContent='Example: fish for Shrimp until you hold 100 Raw Shrimp → equip a custom Melee loadout → train Attack on Cows for 20 kills.';return {node,dispose(){}};}
  let disposed=false,profileRequest,suggestionRequest,suggestionTimer;
  fetch(new URL('./queue-catalog.json?v=planner-icons-20261128',import.meta.url)).then(r=>{if(!r.ok)throw Error('The queue builder could not load. Refresh to try again.');return r.json();}).then(async c=>{
    const {lookupXpPlayer,lookupXpSuggestions}=await import('./xp-player.js?v=hypothetical-20261121');
    if(disposed)return;loading.remove();let queue=exampleMembershipQueue(c),saved=[],undo=[],editing=null,mode='activity';
    let profileEquipment={},profileName='',confirmedItems=new Set(),loadoutEditor;
    const availableItems=()=>queueAvailableItems(profileEquipment,confirmedItems,c);
    const status=e('p',{class:'queue-status',role:'status'}),error=e('p',{class:'queue-error',role:'alert'});error.hidden=true;
    const fail=message=>{error.textContent=message;error.hidden=!message;};
    const button=(label,fn,attrs={})=>{const b=e('button',{type:'button',class:'button',...attrs},label);b.addEventListener('click',fn);return b;};
    const image=(src,size=36)=>src?e('img',{src,alt:'',width:size,height:size,loading:'lazy',referrerpolicy:'no-referrer'}):e('span',{});
    const skillName=id=>c.skills.find(s=>s.id===id)?.name||id,itemName=id=>c.items[id]?.name||id,activity=id=>c.activities.find(a=>a.id===id);
    const itemLink=id=>byId.has(c.items[id]?.wikiId)?e('a',{href:entryUrl(c.items[id].wikiId)},itemName(id)):e('span',{},itemName(id));
    const profileInput=e('input',{type:'text',placeholder:'e.g. User12345',autocomplete:'off',maxlength:25,'aria-label':'Queue player username'}),lookupButton=e('button',{type:'submit',class:'button'},'Load equipped gear');
    const profileStatus=e('p',{class:'queue-help',role:'status'}),suggestions=e('div',{class:'queue-suggestions','aria-label':'Matching queue player names'});
    const profileForm=e('form',{class:'queue-profile-form'},e('label',{},'Player username',profileInput),lookupButton);
    const ownedSearch=e('input',{type:'search',placeholder:'Search equipment you own…','aria-label':'Find owned equipment'}),ownedSelect=e('select',{'aria-label':'Owned equipment to add'}),ownedList=e('ul',{class:'membership-owned-items'}),ownedSummary=e('summary',{},'Available equipment: 0 items');
    const ownedPicker=e('details',{class:'membership-owned-picker'},e('summary',{},'Add other equipment you own'),
      e('p',{class:'queue-help'},'Inventory is not public. Add an item here only if you own it. This confirms the item type, not how many copies, arrows, food or potion charges you have.'),
      e('label',{},'Find an owned item',ownedSearch),e('div',{class:'queue-saved-bar'},e('label',{},'Owned item',ownedSelect),button('Confirm I own this item',()=>{
        if(!ownedSelect.value)return;confirmedItems.add(ownedSelect.value);refreshAvailability();
      })));
    const availablePanel=e('details',{class:'membership-owned-panel'},ownedSummary,ownedList);
    const profilePanel=e('section',{class:'membership-profile','aria-labelledby':'queue-player-heading'},e('h3',{id:'queue-player-heading'},'Player & available equipment'),
      e('p',{class:'queue-help'},'Load current equipped gear as your starting point. Gear choices are limited to equipped items plus equipment you confirm you own. The game does not publish full inventories. Look up again and reconfirm additional items after reloading this page.'),profileForm,suggestions,profileStatus,ownedPicker,availablePanel);
    const equipmentChoices=Object.entries(c.items).filter(([,item])=>loadoutSlots.some(([slot])=>slotAccepts(slot,item))&&byId.has(item.wikiId)&&byId.get(item.wikiId)?.availabilityStatus!=='absent-current-build').sort((a,b)=>a[1].name.localeCompare(b[1].name));
    function drawOwnedChoices(){const query=ownedSearch.value.trim().toLowerCase(),available=availableItems(),choices=equipmentChoices.filter(([id,item])=>!available.has(id)&&(!query||item.name.toLowerCase().includes(query)));
      ownedSelect.replaceChildren(...(choices.length?choices.map(([id,item])=>e('option',{value:id},item.name)):[e('option',{value:''},'No matching equipment')]));
    }
    function refreshAvailability(){
      const available=availableItems(),equipped=new Set(Object.values(profileEquipment));
      ownedSummary.textContent='Available equipment: '+available.size+' item types';
      ownedList.replaceChildren(...[...available].sort((a,b)=>itemName(a).localeCompare(itemName(b))).map(id=>e('li',{},image(c.items[id].icon,24),itemLink(id),
        equipped.has(id)?e('small',{},'Equipped'):button('Remove',()=>{confirmedItems.delete(id);refreshAvailability();},{'aria-label':'Remove owned '+itemName(id)}))));
      if(!available.size)ownedList.append(e('li',{},'No available gear loaded. Look up a player or confirm an owned item above.'));
      drawOwnedChoices();loadoutEditor?.refresh();drawQueue();
    }
    ownedSearch.addEventListener('input',drawOwnedChoices);
    function abortLookup(){profileRequest?.abort();profileRequest=null;lookupButton.disabled=false;}
    profileInput.addEventListener('input',()=>{
      abortLookup();clearTimeout(suggestionTimer);suggestionRequest?.abort();suggestions.replaceChildren();
      profileStatus.textContent=profileName?'Still using '+profileName+'’s gear. Load equipped gear to switch or refresh.':'';
      const query=profileInput.value.trim();if(query.length<2)return;
      suggestionTimer=setTimeout(async()=>{const request=new AbortController();suggestionRequest=request;try{
        const names=await lookupXpSuggestions(query,{signal:request.signal});if(disposed||request.signal.aborted||suggestionRequest!==request||profileInput.value.trim()!==query)return;
        suggestions.replaceChildren(...names.map(n=>button(n,()=>{profileInput.value=n;suggestions.replaceChildren();profileForm.requestSubmit();})));
      }catch{}},300);
    });
    profileForm.addEventListener('submit',async event=>{
      event.preventDefault();clearTimeout(suggestionTimer);suggestionRequest?.abort();suggestions.replaceChildren();abortLookup();
      const request=new AbortController(),query=profileInput.value.trim();profileRequest=request;lookupButton.disabled=true;profileStatus.textContent='Reading the public equipped gear…';
      try{
        const snapshot=await lookupXpPlayer(query,{signal:request.signal});if(disposed||request.signal.aborted||profileRequest!==request)return;
        const equipment=queuePlayerEquipment(snapshot.player,c);
        if(profileName.toLowerCase()!==snapshot.player.name.toLowerCase())confirmedItems=new Set();
        profileEquipment=equipment;profileName=snapshot.player.name;profileInput.value=profileName;
        refreshAvailability();loadoutEditor?.apply(profileEquipment);
        profileStatus.textContent='Loaded '+profileName+'’s equipped gear ('+new Date(snapshot.checkedAt).toLocaleTimeString()+'). '+(Object.keys(equipment).length?'The loadout editor starts with this gear.':'No supported equipment is currently equipped.')+' Saved queue steps stay unchanged until you save edits.';
      }catch(err){if(!disposed&&!request.signal.aborted&&profileRequest===request)profileStatus.textContent=err.message+(profileName?' Still using '+profileName+'’s previous gear.':'');}
      finally{if(!disposed&&profileRequest===request)lookupButton.disabled=false;}
    });
    profilePanel.append(button('Clear player and available items',()=>{abortLookup();clearTimeout(suggestionTimer);suggestionRequest?.abort();suggestions.replaceChildren();profileName='';profileEquipment={};confirmedItems=new Set();profileInput.value='';profileStatus.textContent='Player and available items cleared. Saved queue steps are unchanged.';refreshAvailability();}));
    function read(key){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch{return null;}}
    try{
      const shared=new URLSearchParams(location.hash.slice(1)).get('queue'),draft=read(draftKey);
      if(shared){queue=decodeMembershipQueue(shared,c);status.textContent='Shared queue opened. Save a named copy to keep it on this device.';}
      else if(draft)queue=cleanMembershipQueue(draft,c);
      const values=read(saveKey);if(Array.isArray(values))saved=values.slice(0,30).flatMap(q=>{try{return [cleanMembershipQueue(q,c)];}catch{return [];}});
    }catch(err){fail(err.message);}
    const name=e('input',{value:queue.name,maxlength:80,'aria-label':'Queue name'}),savedSelect=e('select',{'aria-label':'Saved activity queues'}),copyOutput=e('textarea',{rows:4,readonly:'','aria-label':'Queue link or manual setup steps',class:'queue-share-output'});copyOutput.hidden=true;
    function drawSaves(){savedSelect.replaceChildren(e('option',{value:''},'Choose a saved queue…'),...saved.map((q,i)=>e('option',{value:i},q.name)));}
    function persist(){try{localStorage.setItem(draftKey,JSON.stringify(queue));status.textContent='Queue draft saved on this device.';}catch{status.textContent='Storage unavailable. Copy the setup steps or a share link to keep this queue.';}if(location.hash.startsWith('#queue='))history.replaceState(null,'',location.pathname+location.search);}
    function change(fn){undo.push(JSON.stringify(queue));undo=undo.slice(-15);fn();queue=cleanMembershipQueue(queue,c);fail('');persist();copyOutput.hidden=true;drawQueue();}
    name.addEventListener('input',()=>{queue.name=name.value;persist();});
    async function copy(text,message){copyOutput.value=text;copyOutput.hidden=false;try{await navigator.clipboard.writeText(text);status.textContent=message;}catch{status.textContent='Select and copy the text below.';copyOutput.focus();copyOutput.select();}}
    function stopText(s){
      if(s.goal==='indefinite')return 'Until you stop it manually';
      if(s.goal==='level')return 'Until '+skillName(activity(s.activityId).skill)+' reaches level '+s.value;
      if(s.goal==='items-gte')return 'Until inventory has at least '+s.value+' × '+itemName(s.itemId);
      if(s.goal==='items-lte')return 'Until inventory has '+s.value+' or fewer '+itemName(s.itemId);
      return 'After '+s.value+(activity(s.activityId).mob?' kills':' actions');
    }
    function setupText(){return [queue.name,'Enter manually in Microscape → Activity Queue (Guild membership required):',...queue.steps.map((s,i)=>{
      if(s.type==='loadout')return (i+1)+'. '+(s.legacySlot?'Earlier saved loadout '+s.legacySlot+' (“'+s.name+'”): edit this step to configure its equipment.':
        'Configure “'+s.name+'”: '+loadoutSlots.map(([slot,label])=>label+': '+(s.equipment[slot]?itemName(s.equipment[slot]):'Empty')).join('; ')+'. Save this setup in an in-game Equipment loadout and select it for this queue step. Continue to the next step.');
      const a=activity(s.activityId),where=a.locations?.find(l=>l.wikiId===s.location)?.name;return (i+1)+'. '+skillName(a.skill)+' / '+a.name+(a.alchemy?' · '+itemName(s.alchemyItemId):'')+(where?' at '+where:'')+'. Stop: '+stopText(s)+'.';
    }),'Custom wiki loadouts must be recreated and saved in-game before selecting them in the game’s queue. Empty slots mean unequip. Availability uses equipped gear and manually confirmed items; item quantities and level requirements are not checked.'].join('\n');}
    function loadoutIssue(s){
      if(s.legacySlot)return 'Edit the earlier saved-loadout reference to configure its gear.';
      const missing=missingQueueEquipment(s.equipment,availableItems());
      return missing.length?'Not in your available items: '+missing.map(itemName).join(', ')+'. Load your gear, confirm owned items, or replace these selections.':'';
    }
    const toolbar=e('div',{class:'queue-toolbar'},e('label',{},'Queue name',name),e('div',{class:'queue-toolbar-actions'},
      button('Save queue',()=>{queue.name=name.value.trim()||'My activity queue';name.value=queue.name;const i=saved.findIndex(q=>q.name===queue.name),q=cleanMembershipQueue(queue,c);if(i>=0)saved[i]=q;else saved.unshift(q);saved=saved.slice(0,30);try{localStorage.setItem(saveKey,JSON.stringify(saved));persist();drawSaves();status.textContent='Saved “'+queue.name+'” on this device.';}catch{fail('Could not save this queue. Copy a share link instead.');}}),
      button('Share queue',()=>{try{copy(new URL(location.pathname,location.origin).href+'#queue='+encodePlan(cleanMembershipQueue(queue,c)),'Queue link copied.');}catch(err){fail(err.message);}}),
      button('Copy in-game setup',()=>{const issues=queue.steps.flatMap((s,i)=>s.type==='loadout'&&loadoutIssue(s)?['Step '+(i+1)+': '+loadoutIssue(s)]:[]);if(issues.length){fail(issues.join(' '));return;}copy(setupText(),'Manual queue setup copied.');}),
      button('New queue',()=>{change(()=>{queue={version:1,name:'My activity queue',steps:[]};editing=null;});name.value=queue.name;drawEditor();})));
    const savedBar=e('div',{class:'queue-saved-bar'},e('label',{},'Saved queues on this device',savedSelect),button('Load queue',()=>{if(savedSelect.value==='')return;change(()=>{queue=cleanMembershipQueue(saved[Number(savedSelect.value)],c);editing=null;});name.value=queue.name;drawEditor();}),
      button('Load shrimp example',()=>{change(()=>{queue=exampleMembershipQueue(c);editing=null;});name.value=queue.name;drawEditor();}));drawSaves();
    const oldPlan=new URLSearchParams(location.hash.slice(1)).get('plan');
    if(oldPlan)node.append(e('p',{class:'notice'},'This link contains an Activity Planner plan. ',e('a',{href:'/guides/activity-planner/#plan='+encodeURIComponent(oldPlan)},'Open it in Activity Planner')));
    const compare=e('p',{class:'membership-planner-link'},'Need material totals or XP/time estimates? ',e('a',{href:entryUrl('activity-planner')},'Open Activity Planner'));
    const typeActivity=button('Add activity',()=>{mode='activity';editing=null;drawEditor();}),typeLoadout=button('Add loadout change',()=>{mode='loadout';editing=null;drawEditor();});
    const editor=e('section',{class:'membership-editor'},e('h3',{},'Choose a step type'),e('div',{class:'membership-types'},typeActivity,typeLoadout));
    const fields=e('div',{class:'membership-fields'});editor.append(fields);
    function drawEditor(step){
      loadoutEditor=null;fields.replaceChildren();typeActivity.setAttribute('aria-pressed',String(mode==='activity'));typeLoadout.setAttribute('aria-pressed',String(mode==='loadout'));
      const form=e('form',{}),submit=e('button',{type:'submit',class:'button primary'},editing===null?'Add step':'Save queue step');submit.disabled=editing===null&&queue.steps.length>=MAX_STEPS;
      if(mode==='loadout'){
        let equipment={...(step?.equipment??profileEquipment)};
        const title=e('input',{value:step?.name||'Melee',maxlength:60,placeholder:'e.g. Melee','aria-label':'Custom loadout name'}),gear=e('div',{class:'membership-gear-grid'}),gearStatus=e('p',{class:'queue-help',role:'status'});
        function drawGear(){gear.replaceChildren(...loadoutSlots.map(([slot,label])=>{
          const id=equipment[slot],selected=c.items[id],available=availableItems(),choices=queueGearChoices(slot,available,c);
          const unavailable=id&&!choices.some(([key])=>key===id);
          const picker=e('select',{'aria-label':'Loadout '+label},e('option',{value:''},'Empty / unequip'),...(unavailable?[e('option',{value:id,disabled:''},'Unavailable: '+selected.name)]:[]),...choices.map(([key,item])=>e('option',{value:key},item.name)));picker.value=id||'';
          picker.addEventListener('change',()=>{const before={...equipment};equipment=changeLoadout(equipment,slot,picker.value,c.items);const removed=Object.keys(before).filter(key=>key!==slot&&!equipment[key]);gearStatus.textContent=removed.length?'Cleared '+removed.map(key=>loadoutSlots.find(([s])=>s===key)[1]).join(', ')+' to keep the weapon and shield compatible.':'';drawGear();});
          const requirements=Object.entries(selected?.requirements||{}).map(([skill,level])=>skillName(skill)+' '+level).join(' · ');
          return e('div',{class:'membership-gear-slot'+(unavailable?' is-unavailable':'')},selected?image(selected.icon,32):e('span',{class:'membership-empty-icon','aria-hidden':'true'},'◇'),e('label',{},label,picker),...(selected?[e('div',{class:'membership-gear-info'},itemLink(id),...(unavailable?[e('small',{class:'queue-warning'},'Not in available items')]:[]),...(requirements?[e('small',{},'Requires '+requirements)]:[]))]:[]));
        }));}
        form.append(e('label',{},'Loadout name',title),e('p',{class:'queue-help'},'Choose from the equipped gear and additional owned items listed above. Empty slots mean unequip, not keep previous gear. Item quantities and player level requirements are not checked.'),
          button('Use current equipped gear',()=>{if(!profileName){gearStatus.textContent='Look up a player above first.';return;}loadoutEditor.apply(profileEquipment);gearStatus.textContent='Editor filled with '+profileName+'’s current equipped gear. Save this step to keep the changes.';}),
          ...(step?.legacySlot?[e('p',{class:'queue-warning'},'This older queue referenced saved loadout '+step.legacySlot+'. Its gear was never available to the wiki. Choose the equipment below to replace that reference.')]:[]),gear,gearStatus,
          e('p',{class:'queue-help'},'When entering this queue manually, recreate and save this gear setup on Microscape’s Equipment screen, then select that saved loadout in the game’s queue.'));
        loadoutEditor={refresh(){drawGear();const issue=loadoutIssue({equipment});gearStatus.textContent=issue;gearStatus.setAttribute('role',issue?'alert':'status');},apply(value){equipment={...value};gearStatus.textContent='';gearStatus.setAttribute('role','status');drawGear();}};
        drawGear();form.addEventListener('submit',event=>{event.preventDefault();const candidate={type:'loadout',name:title.value,equipment},issue=loadoutIssue(candidate);if(issue){gearStatus.textContent=issue;gearStatus.setAttribute('role','alert');return;}commit(candidate);});
      }else{
        const skill=e('select',{'aria-label':'Queue activity skill'},...c.skills.map(s=>e('option',{value:s.id},s.name))),choice=e('select',{'aria-label':'Queue activity'}),where=e('select',{'aria-label':'Queue activity location'}),goal=e('select',{'aria-label':'Queue activity stopping condition'}),value=e('input',{type:'number',min:1,max:MAX_ACTIONS,value:step?.value??100,'aria-label':'Queue activity target'}),item=e('select',{'aria-label':'Queue inventory item'}),preview=e('div',{class:'membership-activity-preview'});
        skill.value=step?activity(step.activityId).skill:'fishing';
        const alchemy=e('select',{'aria-label':'Queue alchemy item'},e('option',{value:''},'Choose an item to convert…'),...alchemyItems(c).map(([id,item])=>e('option',{value:id},item.name))),alchemyLabel=e('label',{},'Item to convert with alchemy',alchemy),specialNote=e('div',{class:'queue-help'});
        alchemy.value=step?.alchemyItemId||'';
        const valueLabel=e('label',{},'Target',value),itemLabel=e('label',{},'Inventory item',item);
        function drawGoal(reset=false){
          const base=activity(choice.value),a=base.alchemy&&alchemy.value?queueActivity(c,{activityId:base.id,alchemyItemId:alchemy.value}):base,kind=goal.value;valueLabel.hidden=kind==='indefinite';itemLabel.hidden=!kind.startsWith('items-');value.min=kind==='items-lte'?0:1;value.max=a.travelsTo?1:kind==='level'?99:MAX_ACTIONS;value.readOnly=!!a.travelsTo;
          const preferred=[...new Set([...(a.outputs||[]).map(i=>i.id),...(a.inputs||[]).map(i=>i.id),...(c.foes[a.mob]?.dropItems||[])])];
          const randomOnly=new Set((a.randomOutputs||[]).map(i=>i.id).filter(id=>!preferred.includes(id)));
          const known=Object.keys(c.items).filter(id=>!randomOnly.has(id)&&byId.has(c.items[id].wikiId)&&!['skin','hair','pet'].includes(c.items[id].slot));
          const ids=[...preferred,...known.filter(id=>!preferred.includes(id)).sort((a,b)=>itemName(a).localeCompare(itemName(b)))];
          item.replaceChildren(...ids.map(id=>e('option',{value:id},itemName(id))));item.value=step?.itemId&&ids.includes(step.itemId)?step.itemId:ids[0]||'';
          if(reset)value.value=kind==='level'?10:kind==='items-lte'?0:a.singleExecution?1:a.mob?20:100;
          if(a.travelsTo)value.value=1;
        }
        function drawActivity(reset=false){const a=activity(choice.value),previous=goal.value;goal.replaceChildren(e('option',{value:'actions'},a.travelsTo?'One trip':a.mob?'After a number of kills':'After a number of actions'),...(!a.travelsTo?[...(a.mob||a.exp>0?[e('option',{value:'level'},'Until a skill level')]:[]),e('option',{value:'items-gte'},'Until inventory reaches a count'),e('option',{value:'items-lte'},'Until inventory falls to a count'),e('option',{value:'indefinite'},'Until stopped manually')]:[]));goal.value=step?.goal||previous||'actions';if(!goal.value)goal.value='actions';
          alchemyLabel.hidden=!a.alchemy;specialNote.replaceChildren(...activityPlanningNotes(a,c).map(note=>e('p',{class:'queue-warning'},note)),...(a.alchemy?[e('p',{},'Each cast consumes the selected item plus runes. Choose the same item when entering this step in-game.')]:[]),...(a.requiresAbility?[e('p',{class:'queue-warning'},'Requires ability: '+a.requiresAbility)]:[]),...(a.requiresMembership?[e('p',{class:'queue-warning'},'Requires membership. Membership is not checked.')]:[]));
          where.replaceChildren(...(a.locations?.length?a.locations.map(l=>e('option',{value:l.wikiId},l.name)):[e('option',{value:''},'Check the activity guide')]));where.value=step?.location||a.locations?.[0]?.wikiId||'';
          preview.replaceChildren(image(a.icon),e('div',{},e('strong',{},a.name),e('span',{},skillName(a.skill)+' · Lv '+(a.mob?a.combatLevel:a.level)),...(!a.mob?[e('span',{},activityXpText(a,c)+'/action')]:[])));drawGoal(reset);
        }
        function drawChoices(reset=false){choice.replaceChildren(...activitiesForSkill(c,skill.value).map(a=>e('option',{value:a.id},a.name+' · Lv '+(a.mob?a.combatLevel:a.level)+(!a.mob?' · '+activityXpText(a,c):''))));if(step&&activity(step.activityId).skill===skill.value)choice.value=step.activityId;else if(skill.value==='fishing')choice.value='fishing/catch-shrimp';drawActivity(reset);}
        skill.addEventListener('change',()=>{step=undefined;drawChoices(true);});choice.addEventListener('change',()=>{step=undefined;drawActivity(true);});goal.addEventListener('change',()=>drawGoal(true));alchemy.addEventListener('change',()=>drawGoal());drawChoices();
        form.append(preview,e('div',{class:'queue-step-fields'},e('label',{},'Skill / training style',skill),e('label',{},'Activity',choice),alchemyLabel,e('label',{},'Location',where),e('label',{},'Stop when…',goal),valueLabel,itemLabel),specialNote,
          e('p',{class:'queue-help'},'The stopping condition belongs to this activity only. Choose an inventory item whose count the activity changes. Any loadout change after it is a separate queue entry.'));
        form.addEventListener('submit',event=>{event.preventDefault();commit({type:'activity',activityId:choice.value,location:where.value,goal:goal.value,value:Number(value.value),itemId:item.value,...(activity(choice.value).alchemy?{alchemyItemId:alchemy.value}:{})});});
      }
      form.append(submit);if(editing!==null)form.append(button('Cancel edit',()=>{editing=null;drawEditor();}));fields.append(form);
    }
    function commit(step){try{if(step.type==='loadout'&&loadoutIssue(step))throw Error(loadoutIssue(step));const candidate={...queue,steps:editing===null?[...queue.steps,step]:queue.steps.map((s,i)=>i===editing?step:s)};cleanMembershipQueue(candidate,c);change(()=>{queue=candidate;editing=null;});drawEditor();}catch(err){fail(err.message);}}
    const count=e('span',{class:'queue-count'}),list=e('ol',{class:'membership-steps'}),undoButton=button('Undo',()=>{if(!undo.length)return;queue=cleanMembershipQueue(JSON.parse(undo.pop()),c);editing=null;name.value=queue.name;persist();drawQueue();drawEditor();});
    const sequence=e('section',{'aria-label':'Activity queue sequence',class:'membership-sequence'},e('div',{class:'queue-heading'},e('h3',{},'Queue sequence'),count,undoButton),list);
    function drawQueue(){count.textContent=queue.steps.length+' / '+MAX_STEPS+' steps';undoButton.disabled=!undo.length;let waits=false;
      list.replaceChildren(...queue.steps.map((s,i)=>{
        const blocked=waits;if(s.type==='activity'&&s.goal==='indefinite')waits=true;
        const a=s.type==='activity'?activity(s.activityId):null,isLoadout=s.type==='loadout',where=a?.locations?.find(l=>l.wikiId===s.location);
        const text=isLoadout?'Change to “'+s.name+'”':skillName(a.skill)+' / '+a.name+(a.alchemy?' · '+itemName(s.alchemyItemId):'');
        const trigger=isLoadout?(s.legacySlot?'Earlier saved loadout '+s.legacySlot+' — edit to configure its gear':Object.keys(s.equipment).length+' equipped items · other slots empty'):stopText(s);
        const card=e('li',{class:isLoadout?'membership-step loadout-step':'membership-step activity-step'},
          e('div',{class:'membership-step-heading'},e('span',{class:'membership-step-number'},i+1),isLoadout?e('span',{class:'membership-loadout-icon','aria-hidden':'true'},'◇'):image(a.icon,40),
            e('div',{},e('span',{class:'membership-kind'},isLoadout?'CUSTOM LOADOUT CHANGE':'ACTIVITY'),e('h4',{},text),e('p',{class:'membership-stop'},trigger))),
          ...(where?[e('p',{class:'queue-help'},'Location: ',e('a',{href:entryUrl(where.wikiId)},where.name))]:[]),
          ...(blocked?[e('p',{class:'queue-warning'},'This step waits behind an activity set to run until stopped manually.')]:[]),
          ...(isLoadout&&loadoutIssue(s)?[e('p',{class:'queue-warning'},loadoutIssue(s))]:[]));
        if(isLoadout&&s.equipment){const chosen=loadoutSlots.filter(([slot])=>s.equipment[slot]);card.append(chosen.length?e('ul',{class:'membership-equipped-items'},...chosen.map(([slot,label])=>{const item=c.items[s.equipment[slot]];return e('li',{},image(item.icon,25),e('span',{},e('small',{},label),itemLink(s.equipment[slot])));})):e('p',{class:'queue-help'},'All equipment slots empty.'));}
        const move=to=>{change(()=>{const [s]=queue.steps.splice(i,1);queue.steps.splice(to,0,s);editing=null;});drawEditor();};
        const controls=e('div',{class:'queue-row-actions'},button('Edit',()=>{editing=i;mode=s.type==='loadout'?'loadout':'activity';drawEditor(s);fields.scrollIntoView({block:'center'});},{'aria-label':'Edit queue step '+(i+1)}),
          button('Up',()=>move(i-1),{'aria-label':'Move queue step '+(i+1)+' up'}),button('Down',()=>move(i+1),{'aria-label':'Move queue step '+(i+1)+' down'}),
          button('Remove',()=>{change(()=>{queue.steps.splice(i,1);editing=null;});drawEditor();},{'aria-label':'Remove queue step '+(i+1)}));
        controls.children[1].disabled=i===0;controls.children[2].disabled=i===queue.steps.length-1;card.append(controls);
        if(i<queue.steps.length-1)card.append(e('p',{class:'membership-next'},isLoadout?'After the loadout changes, continue to step '+(i+2):'When this condition is met, continue to step '+(i+2)));
        return card;
      }));
      if(!queue.steps.length)list.append(e('li',{class:'queue-empty'},'No steps yet. Choose an activity or a custom loadout change below.'));
    }
    node.append(error,profilePanel,toolbar,savedBar,status,copyOutput,sequence,editor,compare,e('p',{class:'queue-help'},'To run the sequence: enter these steps in Microscape’s Activity Queue, check your saved loadouts and supplies, then use Start Queue inside the game.'));
    drawEditor();refreshAvailability();
  }).catch(err=>{if(!disposed){loading.textContent=err.message;loading.setAttribute('role','alert');}});
  return {node,dispose(){disposed=true;clearTimeout(suggestionTimer);profileRequest?.abort();suggestionRequest?.abort();}};
}
