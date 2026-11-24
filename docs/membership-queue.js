import {activitiesForSkill} from './activity-comparison.js?v=equipment-20261124';
import {cleanPlan,encodePlan,MAX_STEPS,MAX_ACTIONS} from './queue-model.js?v=queue-preview-20261124';
import {loadoutSlots,slotAccepts,changeLoadout} from './loadout-comparison.js?v=queue-gear-20261124';
const kinds=new Set(['actions','level','items-gte','items-lte','indefinite']);
const draftKey='microscape-wiki-membership-queue-draft-v1',saveKey='microscape-wiki-membership-queue-saves-v1';
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
    const value=s.goal==='indefinite'?0:Number(s.value),minimum=s.goal==='items-lte'||s.goal==='indefinite'?0:1;
    if(!Number.isInteger(value)||value<minimum||value>(s.goal==='level'?99:MAX_ACTIONS))throw Error('Step '+(i+1)+' has an invalid stopping target.');
    if(s.goal.startsWith('items-')&&!Object.hasOwn(catalog.items,s.itemId))throw Error('Select the inventory item to watch for step '+(i+1)+'.');
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
  let disposed=false;
  fetch(new URL('./queue-catalog.json?v=queue-types-20261124',import.meta.url)).then(r=>{if(!r.ok)throw Error('The queue builder could not load. Refresh to try again.');return r.json();}).then(c=>{
    if(disposed)return;loading.remove();let queue=exampleMembershipQueue(c),saved=[],undo=[],editing=null,mode='activity';
    const status=e('p',{class:'queue-status',role:'status'}),error=e('p',{class:'queue-error',role:'alert'});error.hidden=true;
    const fail=message=>{error.textContent=message;error.hidden=!message;};
    const button=(label,fn,attrs={})=>{const b=e('button',{type:'button',class:'button',...attrs},label);b.addEventListener('click',fn);return b;};
    const image=(src,size=36)=>src?e('img',{src,alt:'',width:size,height:size,loading:'lazy',referrerpolicy:'no-referrer'}):e('span',{});
    const skillName=id=>c.skills.find(s=>s.id===id)?.name||id,itemName=id=>c.items[id]?.name||id,activity=id=>c.activities.find(a=>a.id===id);
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
      const a=activity(s.activityId),where=a.locations?.find(l=>l.wikiId===s.location)?.name;return (i+1)+'. '+skillName(a.skill)+' / '+a.name+(where?' at '+where:'')+'. Stop: '+stopText(s)+'.';
    }),'Custom wiki loadouts must be recreated and saved in-game before selecting them in the game’s queue. Empty slots mean unequip; ownership and level requirements are not checked.'].join('\n');}
    const toolbar=e('div',{class:'queue-toolbar'},e('label',{},'Queue name',name),e('div',{class:'queue-toolbar-actions'},
      button('Save queue',()=>{queue.name=name.value.trim()||'My activity queue';name.value=queue.name;const i=saved.findIndex(q=>q.name===queue.name),q=cleanMembershipQueue(queue,c);if(i>=0)saved[i]=q;else saved.unshift(q);saved=saved.slice(0,30);try{localStorage.setItem(saveKey,JSON.stringify(saved));persist();drawSaves();status.textContent='Saved “'+queue.name+'” on this device.';}catch{fail('Could not save this queue. Copy a share link instead.');}}),
      button('Share queue',()=>{try{copy(new URL(location.pathname,location.origin).href+'#queue='+encodePlan(cleanMembershipQueue(queue,c)),'Queue link copied.');}catch(err){fail(err.message);}}),
      button('Copy in-game setup',()=>copy(setupText(),'Manual queue setup copied.')),
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
      fields.replaceChildren();typeActivity.setAttribute('aria-pressed',String(mode==='activity'));typeLoadout.setAttribute('aria-pressed',String(mode==='loadout'));
      const form=e('form',{}),submit=e('button',{type:'submit',class:'button primary'},editing===null?'Add step':'Save queue step');submit.disabled=editing===null&&queue.steps.length>=MAX_STEPS;
      if(mode==='loadout'){
        let equipment={...step?.equipment};
        const title=e('input',{value:step?.name||'Melee',maxlength:60,placeholder:'e.g. Melee','aria-label':'Custom loadout name'}),gear=e('div',{class:'membership-gear-grid'}),gearStatus=e('p',{class:'queue-help',role:'status'});
        function drawGear(){gear.replaceChildren(...loadoutSlots.map(([slot,label])=>{
          const id=equipment[slot],selected=c.items[id],choices=Object.entries(c.items).filter(([,item])=>slotAccepts(slot,item)&&byId.has(item.wikiId)&&byId.get(item.wikiId)?.availabilityStatus!=='absent-current-build').sort((a,b)=>a[1].name.localeCompare(b[1].name));
          if(id&&!choices.some(([key])=>key===id))choices.unshift([id,selected]);
          const picker=e('select',{'aria-label':'Loadout '+label},e('option',{value:''},'Empty / unequip'),...choices.map(([key,item])=>e('option',{value:key},item.name)));picker.value=id||'';
          picker.addEventListener('change',()=>{const before={...equipment};equipment=changeLoadout(equipment,slot,picker.value,c.items);const removed=Object.keys(before).filter(key=>key!==slot&&!equipment[key]);gearStatus.textContent=removed.length?'Cleared '+removed.map(key=>loadoutSlots.find(([s])=>s===key)[1]).join(', ')+' to keep the weapon and shield compatible.':'';drawGear();});
          const requirements=Object.entries(selected?.requirements||{}).map(([skill,level])=>skillName(skill)+' '+level).join(' · ');
          return e('div',{class:'membership-gear-slot'},selected?image(selected.icon,32):e('span',{class:'membership-empty-icon','aria-hidden':'true'},'◇'),e('label',{},label,picker),...(selected?[e('div',{class:'membership-gear-info'},e('a',{href:entryUrl(selected.wikiId)},selected.name),...(requirements?[e('small',{},'Requires '+requirements)]:[]))]:[]));
        }));}
        form.append(e('label',{},'Loadout name',title),e('p',{class:'queue-help'},'Choose the exact equipment for this step. Empty slots mean unequip, not keep previous gear. This is a complete setup; item ownership and player level requirements are not checked.'),
          ...(step?.legacySlot?[e('p',{class:'queue-warning'},'This older queue referenced saved loadout '+step.legacySlot+'. Its gear was never available to the wiki. Choose the equipment below to replace that reference.')]:[]),gear,gearStatus,
          e('p',{class:'queue-help'},'When entering this queue manually, recreate and save this gear setup on Microscape’s Equipment screen, then select that saved loadout in the game’s queue.'));
        drawGear();form.addEventListener('submit',event=>{event.preventDefault();commit({type:'loadout',name:title.value,equipment});});
      }else{
        const skill=e('select',{'aria-label':'Queue activity skill'},...c.skills.map(s=>e('option',{value:s.id},s.name))),choice=e('select',{'aria-label':'Queue activity'}),where=e('select',{'aria-label':'Queue activity location'}),goal=e('select',{'aria-label':'Queue activity stopping condition'}),value=e('input',{type:'number',min:1,max:MAX_ACTIONS,value:step?.value??100,'aria-label':'Queue activity target'}),item=e('select',{'aria-label':'Queue inventory item'}),preview=e('div',{class:'membership-activity-preview'});
        skill.value=step?activity(step.activityId).skill:'fishing';
        const valueLabel=e('label',{},'Target',value),itemLabel=e('label',{},'Inventory item',item);
        function drawGoal(reset=false){
          const a=activity(choice.value),kind=goal.value;valueLabel.hidden=kind==='indefinite';itemLabel.hidden=!kind.startsWith('items-');value.min=kind==='items-lte'?0:1;value.max=kind==='level'?99:MAX_ACTIONS;
          const preferred=[...new Set([...(a.outputs||[]).map(i=>i.id),...(a.inputs||[]).map(i=>i.id),...(c.foes[a.mob]?.dropItems||[])])];
          const known=Object.keys(c.items).filter(id=>byId.has(c.items[id].wikiId)&&!['skin','hair','pet'].includes(c.items[id].slot));
          const ids=[...preferred,...known.filter(id=>!preferred.includes(id)).sort((a,b)=>itemName(a).localeCompare(itemName(b)))];
          item.replaceChildren(...ids.map(id=>e('option',{value:id},itemName(id))));item.value=step?.itemId&&ids.includes(step.itemId)?step.itemId:ids[0]||'';
          if(reset)value.value=kind==='level'?10:kind==='items-lte'?0:a.mob?20:100;
        }
        function drawActivity(reset=false){const a=activity(choice.value),previous=goal.value;goal.replaceChildren(e('option',{value:'actions'},a.mob?'After a number of kills':'After a number of actions'),e('option',{value:'level'},'Until a skill level'),e('option',{value:'items-gte'},'Until inventory reaches a count'),e('option',{value:'items-lte'},'Until inventory falls to a count'),e('option',{value:'indefinite'},'Until stopped manually'));goal.value=step?.goal||previous||'actions';
          where.replaceChildren(...(a.locations?.length?a.locations.map(l=>e('option',{value:l.wikiId},l.name)):[e('option',{value:''},'Check the activity guide')]));where.value=step?.location||a.locations?.[0]?.wikiId||'';
          preview.replaceChildren(image(a.icon),e('div',{},e('strong',{},a.name),e('span',{},skillName(a.skill)+' · Lv '+(a.mob?a.combatLevel:a.level))));drawGoal(reset);
        }
        function drawChoices(reset=false){choice.replaceChildren(...activitiesForSkill(c,skill.value).map(a=>e('option',{value:a.id},a.name+' · Lv '+(a.mob?a.combatLevel:a.level))));if(step&&activity(step.activityId).skill===skill.value)choice.value=step.activityId;else if(skill.value==='fishing')choice.value='fishing/catch-shrimp';drawActivity(reset);}
        skill.addEventListener('change',()=>{step=undefined;drawChoices(true);});choice.addEventListener('change',()=>{step=undefined;drawActivity(true);});goal.addEventListener('change',()=>drawGoal(true));drawChoices();
        form.append(preview,e('div',{class:'queue-step-fields'},e('label',{},'Skill / training style',skill),e('label',{},'Activity',choice),e('label',{},'Location',where),e('label',{},'Stop when…',goal),valueLabel,itemLabel),
          e('p',{class:'queue-help'},'The stopping condition belongs to this activity only. Choose an inventory item whose count the activity changes. Any loadout change after it is a separate queue entry.'));
        form.addEventListener('submit',event=>{event.preventDefault();commit({type:'activity',activityId:choice.value,location:where.value,goal:goal.value,value:Number(value.value),itemId:item.value});});
      }
      form.append(submit);if(editing!==null)form.append(button('Cancel edit',()=>{editing=null;drawEditor();}));fields.append(form);
    }
    function commit(step){try{const candidate={...queue,steps:editing===null?[...queue.steps,step]:queue.steps.map((s,i)=>i===editing?step:s)};cleanMembershipQueue(candidate,c);change(()=>{queue=candidate;editing=null;});drawEditor();}catch(err){fail(err.message);}}
    const count=e('span',{class:'queue-count'}),list=e('ol',{class:'membership-steps'}),undoButton=button('Undo',()=>{if(!undo.length)return;queue=cleanMembershipQueue(JSON.parse(undo.pop()),c);editing=null;name.value=queue.name;persist();drawQueue();drawEditor();});
    const sequence=e('section',{'aria-label':'Activity queue sequence',class:'membership-sequence'},e('div',{class:'queue-heading'},e('h3',{},'Queue sequence'),count,undoButton),list);
    function drawQueue(){count.textContent=queue.steps.length+' / '+MAX_STEPS+' steps';undoButton.disabled=!undo.length;let waits=false;
      list.replaceChildren(...queue.steps.map((s,i)=>{
        const blocked=waits;if(s.type==='activity'&&s.goal==='indefinite')waits=true;
        const a=s.type==='activity'?activity(s.activityId):null,isLoadout=s.type==='loadout',where=a?.locations?.find(l=>l.wikiId===s.location);
        const text=isLoadout?'Change to “'+s.name+'”':skillName(a.skill)+' / '+a.name;
        const trigger=isLoadout?(s.legacySlot?'Earlier saved loadout '+s.legacySlot+' — edit to configure its gear':Object.keys(s.equipment).length+' equipped items · other slots empty'):stopText(s);
        const card=e('li',{class:isLoadout?'membership-step loadout-step':'membership-step activity-step'},
          e('div',{class:'membership-step-heading'},e('span',{class:'membership-step-number'},i+1),isLoadout?e('span',{class:'membership-loadout-icon','aria-hidden':'true'},'◇'):image(a.icon,40),
            e('div',{},e('span',{class:'membership-kind'},isLoadout?'CUSTOM LOADOUT CHANGE':'ACTIVITY'),e('h4',{},text),e('p',{class:'membership-stop'},trigger))),
          ...(where?[e('p',{class:'queue-help'},'Location: ',e('a',{href:entryUrl(where.wikiId)},where.name))]:[]),
          ...(blocked?[e('p',{class:'queue-warning'},'This step waits behind an activity set to run until stopped manually.')]:[]));
        if(isLoadout&&s.equipment){const chosen=loadoutSlots.filter(([slot])=>s.equipment[slot]);card.append(chosen.length?e('ul',{class:'membership-equipped-items'},...chosen.map(([slot,label])=>{const item=c.items[s.equipment[slot]];return e('li',{},image(item.icon,25),e('span',{},e('small',{},label),e('a',{href:entryUrl(item.wikiId)},item.name)));})):e('p',{class:'queue-help'},'All equipment slots empty.'));}
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
    node.append(error,toolbar,savedBar,status,copyOutput,sequence,editor,compare,e('p',{class:'queue-help'},'To run the sequence: enter these steps in Microscape’s Activity Queue, check your saved loadouts and supplies, then use Start Queue inside the game.'));
    drawQueue();drawEditor();
  }).catch(err=>{if(!disposed){loading.textContent=err.message;loading.setAttribute('role','alert');}});
  return {node,dispose(){disposed=true;}};
}
