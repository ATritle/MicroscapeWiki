import {MAX_STEPS,MAX_ACTIONS,cleanPlan,newPlan,estimateQueue,encodePlan,decodePlan,queueLevel,queueXpThreshold,alchemyItems,queueActivity} from './queue-model.js?v=good-magic-20261127';
import {activitiesForSkill} from './activity-comparison.js?v=equipment-20261124';
import {lookupXpPlayer,lookupXpSuggestions} from './xp-player.js?v=hypothetical-20261121';
const draftKey='microscape-wiki-queue-draft-v1',savesKey='microscape-wiki-queue-saves-v1';
const fmt=n=>new Intl.NumberFormat('en',{maximumFractionDigits:1}).format(n);
export function queueDuration(seconds){if(!Number.isFinite(seconds))return 'Not estimated';const s=Math.round(seconds);return s>=3600?Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m':s>=60?Math.floor(s/60)+'m '+s%60+'s':s+'s';}
export function renderActivityPlanner({e,byId,entryUrl}){
  const node=e('section',{class:'queue-planner',id:'queue-planner','aria-labelledby':'queue-planner-title'},
    e('div',{class:'queue-heading'},e('div',{},e('p',{class:'queue-eyebrow'},'MATERIALS · XP · TIME'),e('h2',{id:'queue-planner-title'},'Activity Planner')),e('span',{class:'queue-count'},'Up to 20 steps')),
    e('p',{class:'queue-intro'},'Choose activities to calculate materials, projected XP and active time. Save a plan on this device or share a link.'),
    e('p',{class:'queue-help'},'Need activities with saved-loadout changes between them? ',e('a',{href:entryUrl('activity-queue')},'Open Activity Queue')));
  const loading=e('p',{role:'status'},'Loading the activity planner…');node.append(loading);
  let disposed=false,request,timer,suggestionRequest;
  if(globalThis.__WIKI_PRERENDER__){loading.textContent='Choose activities, estimate XP and time, and budget materials across your plan. The interactive planner loads in your browser.';return {node,dispose(){}};}
  fetch(new URL('./queue-catalog.json?v=good-magic-20261127',import.meta.url)).then(r=>{if(!r.ok)throw Error('The activity planner could not load. Please refresh to try again.');return r.json();}).then(catalog=>{
    if(disposed)return;loading.remove();
    let plan=newPlan(catalog),undo=[],saved=[],selected,editing=null,limit=24,profileName='Manual starting stats';
    const status=e('p',{class:'queue-status',role:'status'}),error=e('p',{class:'queue-error',role:'alert'});error.hidden=true;
    const fail=message=>{error.textContent=message;error.hidden=!message;};
    function readStorage(key){try{const value=localStorage.getItem(key);return value?JSON.parse(value):null;}catch{return null;}}
    try{
      const shared=new URLSearchParams(location.hash.slice(1)).get('plan');
      if(shared){plan=decodePlan(shared,catalog);status.textContent='Shared plan opened. Save a named copy to keep it on this device.';}
      else {const draft=readStorage(draftKey);if(draft)plan=cleanPlan(draft,catalog);}
      const stored=readStorage(savesKey);if(Array.isArray(stored))saved=stored.slice(0,30).flatMap(p=>{try{return [{...p,plan:cleanPlan(p.plan,catalog)}];}catch{return [];}});
    }catch(err){fail(err.message);}
    const itemName=id=>catalog.items[id]?.name||id,skillName=id=>catalog.skills.find(s=>s.id===id)?.name||id;
    const activity=id=>catalog.activities.find(a=>a.id===id),label=a=>byId.get(a.wikiId)?.title||a.name;
    const wikiLink=(id,text)=>id&&byId.has(id)?e('a',{href:entryUrl(id)},text):e('span',{},text);
    const icon=(src,size=32)=>src?e('img',{src,alt:'',width:size,height:size,loading:'lazy',decoding:'async',referrerpolicy:'no-referrer'}):e('span',{});
    const button=(text,fn,attrs={})=>{const b=e('button',{type:'button',class:'button',...attrs},text);b.addEventListener('click',fn);return b;};
    function persist(){try{localStorage.setItem(draftKey,JSON.stringify(plan));status.textContent='Draft saved on this device.';}catch{status.textContent='Browser storage is unavailable. Use a share link or copy your checklist to keep this plan.';}
      if(location.hash.startsWith('#plan='))history.replaceState(null,'',location.pathname+location.search);
    }
    function change(fn){undo.push(JSON.stringify(plan));undo=undo.slice(-15);fn();plan=cleanPlan(plan,catalog);fail('');persist();shareOutput.hidden=true;renderPlan();}
    const name=e('input',{type:'text',value:plan.name,maxlength:80,'aria-label':'Plan name'});
    name.addEventListener('input',()=>{plan.name=name.value;persist();});
    const savedSelect=e('select',{'aria-label':'Saved plans'});
    const shareOutput=e('textarea',{class:'queue-share-output',rows:3,readonly:'','aria-label':'Shareable plan link or manual checklist'});shareOutput.hidden=true;
    function drawSaves(){savedSelect.replaceChildren(e('option',{value:''},'Choose a saved plan…'),...saved.map((s,i)=>e('option',{value:i},s.plan.name)));}
    async function copy(text,message){shareOutput.value=text;shareOutput.hidden=false;try{await navigator.clipboard.writeText(text);status.textContent=message;}catch{status.textContent='Select and copy the text below.';shareOutput.focus();shareOutput.select();}}
    const tools=e('div',{class:'queue-toolbar'},e('label',{},'Plan name',name),e('div',{class:'queue-toolbar-actions'},
      button('Save plan',()=>{plan.name=name.value.trim()||'My activity plan';name.value=plan.name;const i=saved.findIndex(s=>s.plan.name===plan.name),value={updatedAt:Date.now(),plan:cleanPlan(plan,catalog)};if(i>=0)saved[i]=value;else saved.unshift(value);saved=saved.slice(0,30);try{localStorage.setItem(savesKey,JSON.stringify(saved));persist();drawSaves();status.textContent='Saved “'+plan.name+'” on this device.';}catch{fail('This browser could not save the plan. Copy a share link instead.');}}),
      button('Share plan',()=>{try{copy(new URL(location.pathname,location.origin).href+'#plan='+encodePlan(cleanPlan(plan,catalog)),'Plan link copied. It includes steps, starting XP, gear and inventory counts; the lookup name is omitted.');}catch(err){fail(err.message);}}),
      button('Copy checklist',()=>{const result=estimateQueue(plan,catalog);copy([plan.name,'Enter these steps manually in Microscape:',...result.rows.map((r,i)=>(i+1)+'. '+manualStep(r.step)),
        (result.partial?'Known totals':'Estimated totals')+': '+fmt(result.totalXp)+' XP · '+queueDuration(result.seconds),
        'Additional materials: '+(Object.entries(result.starting).map(([id,n])=>fmt(n)+' × '+itemName(id)).join(', ')||'None for the estimated recipe steps.'),
        'Base estimates exclude Double Ups, abilities, potions, travel and resource queues.'].join('\n'),'Manual checklist copied.');}),
      button('New plan',()=>{change(()=>{plan=newPlan(catalog);editing=null;});name.value=plan.name;resetProfileLabel('Manual starting stats');drawStartingStats();})));
    const savedBar=e('div',{class:'queue-saved-bar'},e('label',{},'Saved on this device',savedSelect),button('Load plan',()=>{if(savedSelect.value==='')return;change(()=>{plan=cleanPlan(saved[Number(savedSelect.value)].plan,catalog);editing=null;});name.value=plan.name;resetProfileLabel('Saved starting stats');drawStartingStats();}),
      button('Delete saved copy',()=>{if(savedSelect.value==='')return;const i=Number(savedSelect.value);saved.splice(i,1);try{localStorage.setItem(savesKey,JSON.stringify(saved));drawSaves();status.textContent='Saved copy removed. The open plan is still available.';}catch{fail('Could not update saved plans.');}}));drawSaves();
    const starting=e('details',{class:'queue-starting'},e('summary',{},'Starting skills, equipped gear and inventory'));
    const profileInput=e('input',{type:'text',placeholder:'e.g. User12345',autocomplete:'off','aria-label':'Activity planner player username',maxlength:25});
    const suggestions=e('div',{class:'queue-suggestions','aria-label':'Matching player names'}),profileStatus=e('p',{class:'queue-help',role:'status'});
    const lookupButton=e('button',{type:'submit',class:'button'},'Load starting stats');
    const profileForm=e('form',{class:'queue-profile-form'},e('label',{},'Optional player lookup',profileInput),lookupButton);
    function resetProfileLabel(label){request?.abort();request=null;clearTimeout(timer);suggestionRequest?.abort();profileName=label;profileInput.value='';profileStatus.textContent='';suggestions.replaceChildren();lookupButton.disabled=false;}
    const levelsPanel=e('div',{class:'queue-level-grid'}),inventoryRows=e('div',{class:'queue-inventory-rows'}),gearDescription=e('p',{class:'queue-help'});
    const inventorySelect=e('select',{'aria-label':'Starting inventory item'},...Object.entries(catalog.items).filter(([,i])=>byId.has(i.wikiId)&&!['skin','hair','pet'].includes(i.slot)).sort((a,b)=>a[1].name.localeCompare(b[1].name)).map(([id,i])=>e('option',{value:id},i.name)));
    inventorySelect.value='copperOre';const inventoryCount=e('input',{type:'number',min:0,max:1_000_000,value:10,'aria-label':'Starting inventory quantity'});
    starting.append(profileForm,suggestions,profileStatus,e('p',{class:'queue-help'},'Lookup reads public XP and base equipment only. Inventory is not public; enter your starting supplies below. You can also edit each starting skill manually.'),levelsPanel,gearDescription,
      button('Use no equipped gear',()=>{change(()=>{plan.equipment={};});drawStartingStats();}),e('h3',{},'Starting inventory'),e('div',{class:'queue-inventory-add'},inventorySelect,inventoryCount,
        button('Set item count',()=>{const n=Number(inventoryCount.value);if(!Number.isInteger(n)||n<0||n>1_000_000){fail('Enter a whole inventory count from 0 to 1,000,000.');return;}change(()=>{if(n)plan.inventory[inventorySelect.value]=n;else delete plan.inventory[inventorySelect.value];});drawInventory();})),inventoryRows);
    function drawInventory(){inventoryRows.replaceChildren(...Object.entries(plan.inventory).map(([id,n])=>e('div',{class:'queue-inventory-row'},icon(catalog.items[id]?.icon,24),e('span',{},fmt(n)+' × '+itemName(id)),button('Remove',()=>{change(()=>delete plan.inventory[id]);drawInventory();},{'aria-label':'Remove starting '+itemName(id)}))));if(!inventoryRows.children.length)inventoryRows.append(e('p',{class:'queue-help'},'No starting supplies entered.'));
    }
    function drawStartingStats(){levelsPanel.replaceChildren(...catalog.skills.map(skill=>{const level=e('input',{type:'number',min:1,max:99,value:queueLevel(plan.xp[skill.id]),'aria-label':skill.name+' starting level'}),xp=e('input',{type:'number',min:0,max:1e12,value:plan.xp[skill.id],'aria-label':skill.name+' starting XP'});
      level.addEventListener('change',()=>{const n=Number(level.value);if(!Number.isInteger(n)||n<1||n>99){fail('Use a level from 1 to 99.');return;}change(()=>{plan.xp[skill.id]=queueXpThreshold(n);});xp.value=plan.xp[skill.id];});
      xp.addEventListener('change',()=>{const n=Number(xp.value);if(!Number.isFinite(n)||n<0||n>1e12){fail('Enter a valid starting XP amount.');return;}change(()=>{plan.xp[skill.id]=n;});level.value=queueLevel(n);});
      return e('label',{},skill.name,e('span',{},e('small',{},'Level'),level,e('small',{},'XP'),xp));}));
      const equipment=Object.values(plan.equipment).map(itemName);gearDescription.textContent=profileName+' · '+(equipment.length?'Base gear: '+equipment.join(', '):'No gear bonuses loaded. Combat assumes an unarmed character.');drawInventory();}
    profileInput.addEventListener('input',()=>{clearTimeout(timer);suggestionRequest?.abort();suggestions.replaceChildren();const query=profileInput.value.trim();if(query.length<2)return;timer=setTimeout(async()=>{suggestionRequest=new AbortController();try{const names=await lookupXpSuggestions(query,{signal:suggestionRequest.signal});if(disposed||profileInput.value.trim()!==query)return;suggestions.replaceChildren(...names.map(n=>button(n,()=>{profileInput.value=n;suggestions.replaceChildren();profileForm.requestSubmit();})));}catch{}},300);});
    profileForm.addEventListener('submit',async event=>{event.preventDefault();clearTimeout(timer);suggestionRequest?.abort();suggestions.replaceChildren();request?.abort();const currentRequest=new AbortController();request=currentRequest;lookupButton.disabled=true;profileStatus.textContent='Reading the public profile…';
      try{const snapshot=await lookupXpPlayer(profileInput.value,{signal:currentRequest.signal});if(disposed||currentRequest.signal.aborted||request!==currentRequest)return;change(()=>{plan.xp=Object.fromEntries(catalog.skills.map(s=>[s.id,snapshot.player.exp[s.id]||0]));plan.equipment=snapshot.player.equipment||{};});profileName=snapshot.player.name;drawStartingStats();profileStatus.textContent='Loaded '+profileName+'’s public starting XP and base gear. No game actions were sent.';}catch(err){if(!disposed&&!currentRequest.signal.aborted&&request===currentRequest)profileStatus.textContent=err.message;}finally{if(!disposed&&request===currentRequest)lookupButton.disabled=false;}});
    const skillSelect=e('select',{'aria-label':'Queue skill'},...catalog.skills.map(s=>e('option',{value:s.id},s.name)));skillSelect.value='smithing';
    const search=e('input',{type:'search',placeholder:'Search an item or activity…','aria-label':'Find a queue item or activity'}),results=e('div',{class:'queue-item-grid'}),resultsCount=e('p',{class:'queue-help',role:'status'});
    const more=button('Show more items',()=>{limit+=24;drawPicker();}),selectedPanel=e('div',{class:'queue-selected'});
    const builder=e('section',{class:'queue-builder','aria-labelledby':'queue-step-heading'},e('h3',{id:'queue-step-heading'},'Add a step'),e('div',{class:'queue-filters'},e('label',{},'Skill',skillSelect),e('label',{},'Item or activity',search)),resultsCount,results,more,selectedPanel);
    let goalInput,valueInput,itemInput,locationInput,spellInput,alchemyInput;
    function drawPicker(){const query=search.value.trim().toLowerCase();const choices=activitiesForSkill(catalog,skillSelect.value).filter(a=>!query||[a.name,label(a),...(a.outputs||[]).map(i=>itemName(i.id))].join(' ').toLowerCase().includes(query));
      resultsCount.textContent=choices.length+' activities · in-game level order';results.replaceChildren(...choices.slice(0,limit).map(a=>{const b=button('',()=>{selected=a;editing=null;drawSelected();drawPicker();},{class:'queue-item'+(selected?.id===a.id?' selected':''),'aria-pressed':String(selected?.id===a.id)});b.append(icon(a.icon,36),e('span',{},e('strong',{},label(a)),e('small',{},a.name+' · Lv '+(a.mob?a.combatLevel:a.level))));return b;}));more.hidden=choices.length<=limit;
    }
    function drawSelected(step){selectedPanel.replaceChildren();if(!selected)return;const a=selected.alchemy&&step?.alchemyItemId?queueActivity(catalog,{activityId:selected.id,alchemyItemId:step.alchemyItemId}):selected,form=e('form',{}),isCombat=!!a.mob;
      alchemyInput=e('select',{'aria-label':'Alchemy item'},e('option',{value:''},'Choose an item to convert…'),...alchemyItems(catalog).map(([id,item])=>e('option',{value:id},item.name)));alchemyInput.value=step?.alchemyItemId||'';
      alchemyInput.addEventListener('change',()=>drawSelected({goal:goalInput.value,value:Number(valueInput.value),itemId:itemInput.value,location:locationInput.value,spellId:spellInput.value,alchemyItemId:alchemyInput.value}));
      goalInput=e('select',{'aria-label':'Step stopping condition'},e('option',{value:'actions'},isCombat?'Defeat a number of enemies':'Complete a number of actions'),...(isCombat||a.exp>0?[e('option',{value:'level'},'Reach a skill level')]:[]),
        ...(!isCombat&&(a.outputs||[]).length?[e('option',{value:'items-gte'},'Have at least an item count')]:[]),...(!isCombat&&(a.inputs||[]).length?[e('option',{value:'items-lte'},'Use an item down to a count')]:[]),e('option',{value:'indefinite'},'Until I stop it manually'));
      goalInput.value=step?.goal||'actions';valueInput=e('input',{type:'number',min:1,max:MAX_ACTIONS,value:step?.value??10,'aria-label':'Step target value'});itemInput=e('select',{'aria-label':'Step target item'});
      locationInput=e('select',{'aria-label':'Step location'},...(a.locations?.length?a.locations.map(l=>e('option',{value:l.wikiId},l.name)):[e('option',{value:''},'See the activity’s location guide')]));locationInput.value=step?.location||a.locations?.[0]?.wikiId||'';
      spellInput=e('select',{'aria-label':'Queue spell'},...catalog.spells.map(s=>e('option',{value:s.id},s.name+' · Lv '+s.level)));spellInput.value=step?.spellId||catalog.spells[0].id;
      const targetLabel=e('label',{},'Target',valueInput),itemLabel=e('label',{},'Item count to watch',itemInput),spellLabel=e('label',{},'Spell',spellInput);spellLabel.hidden=a.skill!=='evilMagic';
      function goalFields(reset=false){targetLabel.hidden=goalInput.value==='indefinite';itemLabel.hidden=!goalInput.value.startsWith('items-');valueInput.min=goalInput.value==='items-lte'?0:1;valueInput.max=goalInput.value==='level'?99:MAX_ACTIONS;
        const items=goalInput.value==='items-lte'?a.inputs||[]:a.outputs||[];itemInput.replaceChildren(...items.map(i=>e('option',{value:i.id},itemName(i.id))));itemInput.value=items.some(i=>i.id===step?.itemId)?step.itemId:items[0]?.id||'';
        if(reset)valueInput.value=goalInput.value==='level'?Math.min(99,queueLevel(plan.xp[a.skill])+1):goalInput.value==='items-lte'?0:10;
      }goalInput.addEventListener('change',()=>goalFields(true));goalFields();
      form.append(e('div',{class:'queue-selected-title'},icon(a.icon,42),e('div',{},e('strong',{},label(a)),e('p',{class:'queue-help'},skillName(a.skill)+' · '+a.name+(isCombat?'':' · '+fmt(a.exp)+' XP/action · '+queueDuration(a.duration*2+8)+'/action')))),
        ...(a.alchemy?[e('label',{},'Item to convert with '+a.name,alchemyInput)]:[]),
        e('div',{class:'queue-step-fields'},e('label',{},'Stop when…',goalInput),targetLabel,itemLabel,e('label',{},'Where to train',locationInput),spellLabel),
        e('p',{class:'queue-help'},isCombat?'Kills use the same base combat model as Activity Comparison. Boss estimates are unavailable.':
          'Per action: '+((a.inputs||[]).map(i=>fmt(i.amount)+' × '+itemName(i.id)).join(' + ')||'No materials')+' → '+((a.outputs||[]).map(i=>fmt(i.amount)+' × '+itemName(i.id)).join(' + ')||'No guaranteed item output')),
        ...(Object.keys(a.otherExp||{}).length?[e('p',{class:'queue-help'},'Also grants '+Object.entries(a.otherExp).map(([id,n])=>fmt(n)+' '+skillName(id)+' XP').join(', ')+' per action.')]:[]),
        ...(a.alchemy?[e('p',{class:'queue-help'},'Each cast consumes one selected item in addition to the runes. Coins are gross proceeds, before item and rune costs.')]:[]),
        ...(a.singleExecution?[e('p',{class:'queue-warning'},'This activity stops after one cast in-game. Restart it manually for each additional action in the plan.')]:[]),
        ...(a.requiresAbility?[e('p',{class:'queue-warning'},'Requires ability: '+a.requiresAbility+'. Random rewards are excluded from estimates.')]:[]));
      const add=e('button',{type:'submit',class:'button primary'},editing===null?'Add to plan':'Save step changes');add.disabled=editing===null&&plan.steps.length>=MAX_STEPS||a.alchemy&&!alchemyInput.value;form.append(add);
      if(editing!==null)form.append(button('Cancel editing',()=>{editing=null;drawSelected();}));
      form.addEventListener('submit',event=>{event.preventDefault();try{const s={activityId:a.id,goal:goalInput.value,value:Number(valueInput.value),itemId:itemInput.value,location:locationInput.value,spellId:spellInput.value,...(a.alchemy?{alchemyItemId:alchemyInput.value}:{})};
        const candidate={...plan,steps:editing===null?[...plan.steps,s]:plan.steps.map((old,i)=>i===editing?s:old)};cleanPlan(candidate,catalog);change(()=>{plan=candidate;});editing=null;drawSelected();}catch(err){fail(err.message);}});selectedPanel.append(form);
    }
    skillSelect.addEventListener('change',()=>{limit=24;selected=null;editing=null;drawPicker();drawSelected();});search.addEventListener('input',()=>{limit=24;drawPicker();});
    const queueCount=e('span',{class:'queue-count'}),queueRows=e('ol',{class:'queue-steps'}),summary=e('aside',{class:'queue-estimates','aria-label':'Plan totals'}),empty=e('div',{class:'queue-empty'});
    const undoButton=button('Undo',()=>{if(!undo.length)return;plan=cleanPlan(JSON.parse(undo.pop()),catalog);editing=null;name.value=plan.name;resetProfileLabel('Saved starting stats');persist();renderPlan();drawStartingStats();});
    const planPanel=e('section',{class:'queue-plan','aria-labelledby':'queue-plan-heading'},e('div',{class:'queue-heading'},e('h3',{id:'queue-plan-heading'},'Your activity plan'),queueCount,undoButton),empty,queueRows);
    empty.append(e('p',{},'Your activity plan is empty. Select an item above, or try a complete crafting chain.'),button('Load example: bronze daggers',()=>{
      change(()=>{plan.steps=['mining/mine-copper','mining/mine-tin','smithing/smelt-bronze','smithing/forge-bronze-dagger'].map(activityId=>({activityId,goal:'actions',value:10}));plan.name='Bronze daggers from ore';});name.value=plan.name;
    }));
    function targetText(s){if(s.goal==='indefinite')return 'Until stopped manually';if(s.goal==='level')return 'Reach '+skillName(activity(s.activityId).skill)+' '+s.value;if(s.goal==='items-gte')return 'Have at least '+fmt(s.value)+' × '+itemName(s.itemId);if(s.goal==='items-lte')return 'Use '+itemName(s.itemId)+' down to '+fmt(s.value);return fmt(s.value)+(activity(s.activityId).mob?' kills':' actions');}
    function manualStep(s){const a=activity(s.activityId),where=a.locations?.find(l=>l.wikiId===s.location)?.name;return skillName(a.skill)+': '+a.name+(a.alchemy?' · '+itemName(s.alchemyItemId):'')+(where?' at '+where:'')+' — '+targetText(s)+(a.skill==='evilMagic'?' · '+catalog.spells.find(p=>p.id===s.spellId)?.name:'');}
    function materialList(title,values,explanation){
      const section=e('section',{},e('h4',{},title));
      if(explanation)section.append(e('p',{class:'queue-help'},explanation));
      const items=Object.entries(values).filter(([,n])=>n>0).sort((a,b)=>itemName(a[0]).localeCompare(itemName(b[0])));
      if(!items.length)section.append(e('p',{class:'queue-help'},'None for the estimated steps.'));
      else section.append(e('ul',{class:'queue-materials'},...items.map(([id,n])=>e('li',{},
        icon(catalog.items[id]?.icon,24),wikiLink(catalog.items[id]?.wikiId,itemName(id)),e('strong',{},fmt(n))))));
      return section;
    }
    function renderPlan(){const result=estimateQueue(plan,catalog);queueCount.textContent=plan.steps.length+' / '+MAX_STEPS+' steps';empty.hidden=!!plan.steps.length;undoButton.disabled=!undo.length;
      queueRows.replaceChildren(...result.rows.map((r,i)=>{const a=r.activity,s=r.step,where=a.locations?.find(l=>l.wikiId===s.location),warnings=[...new Set(r.notes)];
        const move=(to)=>change(()=>{const [item]=plan.steps.splice(i,1);plan.steps.splice(to,0,item);editing=null;});
        const controls=e('div',{class:'queue-row-actions'},button('Edit',()=>{selected=a;editing=i;skillSelect.value=a.skill;search.value='';drawPicker();drawSelected(s);selectedPanel.scrollIntoView({block:'center',behavior:'smooth'});},{'aria-label':'Edit step '+(i+1)}),
          button('Top',()=>move(0),{'aria-label':'Move step '+(i+1)+' to top'}),button('Up',()=>move(i-1),{'aria-label':'Move step '+(i+1)+' up'}),button('Down',()=>move(i+1),{'aria-label':'Move step '+(i+1)+' down'}),button('Bottom',()=>move(plan.steps.length-1),{'aria-label':'Move step '+(i+1)+' to bottom'}),button('Remove',()=>change(()=>{plan.steps.splice(i,1);editing=null;}),{'aria-label':'Remove step '+(i+1)}));
        controls.children[1].disabled=controls.children[2].disabled=i===0;controls.children[3].disabled=controls.children[4].disabled=i===plan.steps.length-1;
        return e('li',{},e('div',{class:'queue-row-main'},e('span',{class:'queue-step-number'},String(i+1).padStart(2,'0')),icon(a.icon,38),e('div',{class:'queue-row-copy'},e('strong',{},label(a)),...(a.alchemy?[wikiLink(catalog.items[s.alchemyItemId]?.wikiId,itemName(s.alchemyItemId))]:[]),e('span',{},skillName(a.skill)+' · '+targetText(s)),where?wikiLink(where.wikiId,where.name):e('span',{},'Location: see activity guide')),
          e('div',{class:'queue-row-metrics'},e('strong',{},r.unavailable?'Not estimated':fmt(r.xp)+' XP'),e('span',{},r.unavailable?'—':queueDuration(r.seconds)),e('span',{},r.unavailable?'':fmt(r.actions)+(a.mob?' kills':' actions')),e('span',{},'Lv '+r.startLevel+' → '+r.endLevel))),
          ...(r.unavailable?[e('p',{class:'queue-warning'},r.unavailable)]:[]),...(warnings.length?[e('details',{class:'queue-row-notes'},e('summary',{},warnings.length+' planning note'+(warnings.length===1?'':'s')),e('ul',{},...warnings.map(w=>e('li',{},w))))]:[]),controls);
      }));
      summary.replaceChildren(e('h3',{},result.partial?'Known plan totals':'Estimated plan totals'),e('dl',{class:'queue-total-metrics'},e('div',{},e('dt',{},'XP gained'),e('dd',{},fmt(result.totalXp))),e('div',{},e('dt',{},'Active time'),e('dd',{},queueDuration(result.seconds)))),
        e('p',{class:'queue-help'},'Base rates. Travel, resource queues, Double Ups, potions and active abilities are excluded. Earlier steps update the projected XP and inventory for later steps.'),
        ...result.warnings.map(w=>e('p',{class:'queue-warning'},w)),materialList('Additional supplies needed',result.starting,'After your entered inventory and materials produced by earlier steps. Missing supplies are assumed available when that step needs them.'),
        materialList('Projected items left',result.stock,'Guaranteed products only. Random loot and rare catches are excluded.'),
        ...(Object.keys(result.supplyEstimates).length?[materialList('Estimated combat shots / casts',result.supplyEstimates,'Estimated ammunition uses or rune costs before conservation. Not guaranteed consumption.')]:[]),
        e('details',{},e('summary',{},'All recipe materials consumed'),materialList('Gross recipe requirements',result.consumed)));
      if(plan.steps.some(s=>s.goal.startsWith('items-'))&&Object.keys(result.starting).length)summary.append(e('p',{class:'queue-warning'},'Item-count targets use the starting inventory you entered. Bringing extra supplies before an earlier item-count target can change when that target finishes.'));
      if(selected&&editing===null)drawSelected();
    }
    const assumptions=e('details',{class:'queue-assumptions'},e('summary',{},'Estimates and manual in-game setup'),e('ul',{},
      e('li',{},'Enter activities manually in-game. For a setup reference that includes saved-loadout changes, use the separate Activity Queue builder. Running an automatic queue in-game requires Adventurer’s Guild membership.'),
      e('li',{},'Skilling uses the catalog’s base XP and action time plus 8 seconds of preparation per action. Guaranteed inputs and outputs are carried forward in order.'),
      e('li',{},'Combat uses starting XP and base gear, with estimated hit chances and level gains. Strength, Defense, Ranged and Evil Magic XP conversion remains unverified. Boss fights, food use and random loot are not simulated.'),
      e('li',{},'Alchemy consumes one chosen item plus runes per cast. Enchant Amulet 5 stops after a single cast in-game. Dark Ritual grants Evil Magic XP, requires Death’s Bargain, and has random rewards excluded from material totals. Other one-off trades are not included. Verify required equipment, abilities, membership, locations and supplies in-game.'),
      e('li',{},'Named plans and the working draft are stored in this browser. Share links include the plan and its starting XP, gear and inventory counts, but no username or account credentials.')));
    node.append(error,tools,savedBar,shareOutput,status,starting,builder,e('div',{class:'queue-workspace'},planPanel,summary),assumptions);
    drawStartingStats();drawPicker();renderPlan();
  }).catch(err=>{if(!disposed){loading.textContent=err.message;loading.setAttribute('role','alert');}});
  return {node,dispose(){disposed=true;clearTimeout(timer);request?.abort();suggestionRequest?.abort();}};
}
