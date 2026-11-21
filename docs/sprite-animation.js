import {spriteMotionData as data} from "./sprite-motion-data.js?v=sprites-20261121";

const active = new Set();
export function stopSpritePreviews() {for(const stop of [...active])stop();}
export function spriteMotion(sprite,foeId) {
  const profile = data.bySource[sprite.layers?.[0]];
  if (profile?.kind === "pet") return profile;
  return data.foes[foeId] || profile;
}
export function petPose(profile,elapsed) {
  const special=profile.specialAnimation||[],length=special.length*profile.frameDuration;
  const t=(elapsed % (length+1350))-350;
  return {frame:t>=0&&t<length?special[Math.floor(t/profile.frameDuration)]:profile.standardAnimation[0],
    flipped:Boolean(profile.flipOnSpecial&&t>=0&&t<length+1000)};
}
export function previewMotion(profile,cycle=0) {
  if(profile.kind === "creature") {
    const amount=(profile.scale||1)**2;
    return {...data.motions.quick,body:[{at:0,x:0},{at:.4,x:-.6*amount},{at:.6,x:1.2*amount},{at:.7,x:-1.2*amount},{at:1,x:0}],weapon:[],shield:[]};
  }
  const list=profile.weaponType==="ranged"?data.motions.bows:profile.weaponType==="magic"?[data.motions.magic]:data.motions.melee[profile.skill||"attack"];
  return list[((cycle%list.length)+list.length)%list.length];
}
export function weaponMotionType(id) {return data.weaponTypes[id]||"melee";}
function ease(t,name) {
  if(t<=0)return 0;if(t>=1)return 1;
  if(!name||name==="linear")return t;
  const [x1,y1,x2,y2]=name==="ease-in"?[.42,0,1,1]:name==="ease-out"?[0,0,.58,1]:[.42,0,.58,1];
  const bez=(p,a,b)=>3*(1-p)**2*p*a+3*(1-p)*p*p*b+p**3;
  let lo=0,hi=1;
  for(let i=0;i<18;i++){const mid=(lo+hi)/2;if(bez(mid,x1,x2)<t)lo=mid;else hi=mid;}
  return bez((lo+hi)/2,y1,y2);
}
export function sampleMotion(frames,t) {
  if(!frames?.length)return {x:0,y:0,angle:0,squash:0};
  let right=frames.findIndex(f=>f.at>=t);
  if(right<0)right=frames.length-1;
  const a=frames[Math.max(0,right-1)],b=frames[right];
  const p=a===b?0:ease(Math.max(0,Math.min(1,(t-a.at)/(b.at-a.at))),a.easing);
  return Object.fromEntries(["x","y","angle","squash"].map(key=>[key,(a[key]||0)+((b[key]||0)-(a[key]||0))*p]));
}

// Hover and keyboard focus share a single controller. Nothing runs off-hover,
// off-page, in a hidden tab, or for readers requesting reduced motion.
export function attachHoverPreview(target,start) {
  if(globalThis.__WIKI_PRERENDER__)return ()=>{};
  const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let cleanup=null,hover=false,focus=false;
  function stop(){cleanup?.();cleanup=null;active.delete(stop);target.removeAttribute("data-preview-active");}
  function sync(){
    if((hover||focus)&&!document.hidden&&!reduced?.matches&&target.isConnected){
      if(!cleanup){cleanup=start(stop);active.add(stop);target.setAttribute("data-preview-active","true");}
    }else stop();
  }
  target.addEventListener("pointerenter",()=>{hover=true;sync();});
  target.addEventListener("pointerleave",()=>{hover=false;sync();});
  target.addEventListener("focusin",()=>{focus=target.matches(":focus-visible");sync();});
  target.addEventListener("focusout",event=>{if(!target.contains(event.relatedTarget)){focus=false;sync();}});
  return stop;
}
function bodyFrames(motion,unit) {
  return motion.body.map(p=>({offset:p.at,easing:p.easing||"linear",transform:`translate(${(p.x||0)*unit}px,${(p.y||0)*unit}px) rotate(${p.angle||0}deg) scale(${1+(p.squash||0)},${1-(p.squash||0)})`}));
}
function gearFrames(frames,unit) {
  return frames.map(p=>({offset:p.at,easing:p.easing||"linear",transform:`translate(${(p.x||0)*unit}px,${(p.y||0)*unit}px) rotate(${p.angle||0}deg)`}));
}
export function prepareSpriteFrame(frame,sprite,profile) {
  if(!profile)return;
  frame.classList.add("animated-game-sprite");
  frame.setAttribute("tabindex","0");
  frame.setAttribute("title",profile.kind==="pet"?"Hover or focus to preview the pet’s in-game idle animation":"Hover or focus to preview in-game idle, attack and hit animations");
  frame.setAttribute("data-sprite-kind",profile.kind);
  const [x,y,w,h]=sprite.crop;
  const body=document.createElement("span"),idle=document.createElement("span"),clip=document.createElement("span");
  body.className="sprite-motion-body";idle.className="sprite-motion-idle";clip.className="sprite-motion-clip";
  const origin=(a,b)=>`${100*(a-x)/w}% ${100*(b-y)/h}%`;
  body.style.transformOrigin=origin(60,92);
  idle.style.transformOrigin=profile.kind==="pet"?origin(64,96):origin(sprite.size[1]/2+20/(profile.scale||1),sprite.size[1]/2+(profile.kind==="humanoid"?4:0));
  clip.append(...frame.childNodes);idle.append(clip);body.append(idle);frame.append(body);
  let sheet,turn,weapon,shield,hand;
  if(profile.kind==="pet") {
    sheet=clip.querySelector("img");
    const size=profile.frameSize*4;
    const window=document.createElement("span");window.className="sprite-pet-window";
    window.style.cssText=`left:${-100*x/w}%;top:${-100*y/h}%;width:${100*size/w}%;height:${100*size/h}%`;
    sheet.style.cssText=`left:0;top:0;width:${100*sprite.size[0]/size}%;height:100%`;
    window.append(sheet);turn=clip;turn.style.transformOrigin=origin(64,64);clip.append(window);clip.style.overflow="visible";
  }else if(profile.kind==="humanoid") {
    clip.style.overflow="visible";
    for(const layer of [...clip.children]) {
      const src=layer.getAttribute("src");
      const slot=Object.entries(profile.equipment||{}).find(([,id])=>data.equipmentSources[id]===src)?.[0];
      if(slot==="weapon"||slot==="shield") {
        const wrap=document.createElement("span");wrap.className="sprite-gear-motion";
        wrap.style.transformOrigin=slot==="weapon"?origin(74,74):origin(54,76);
        if(slot==="shield")wrap.style.rotate="-1deg";
        clip.insertBefore(wrap,layer);wrap.append(layer);
        if(slot==="weapon")weapon=wrap;else shield=wrap;
      }else if(!src)hand=layer;
    }
    if(weapon&&hand)weapon.prepend(hand);
  }
  return attachHoverPreview(frame,stop=>{
    const unit=4*frame.getBoundingClientRect().width/w;
    const config=data.idle[profile.kind==="pet"?"pet":"creature"],animations=new Set(),timers=new Set();let raf,stopped=false,cycle=0;
    const animate=(node,keyframes,options)=>{if(!node)return;const a=node.animate(keyframes,options);animations.add(a);a.onfinish=()=>animations.delete(a);return a;};
    animate(idle,[{transform:"scale(1)"},{transform:`scale(${config.scale})`},{transform:"scale(1)"}],{duration:config.duration,iterations:Infinity});
    if(weapon)animate(weapon,[{transform:"rotate(0deg)"},{transform:"rotate(3deg)"},{transform:"rotate(0deg)"}],{duration:config.duration,iterations:Infinity});
    if(shield)animate(shield,[{transform:"translateY(0) rotate(0deg)"},{transform:`translateY(${.1*unit}px) rotate(-2deg)`},{transform:"translateY(0) rotate(0deg)"}],{duration:config.duration,iterations:Infinity});
    const later=(fn,ms)=>{const timer=setTimeout(()=>{timers.delete(timer);if(!stopped){if(frame.isConnected)fn();else stop();}},ms);timers.add(timer);};
    if(profile.kind==="pet") {
      const start=performance.now();
      const tick=now=>{if(stopped)return;if(!frame.isConnected){stop();return;}const pose=petPose(profile,now-start);sheet.style.left=(-100*pose.frame)+"%";turn.style.transform=pose.flipped?"scaleX(-1)":"";raf=requestAnimationFrame(tick);};
      raf=requestAnimationFrame(tick);
    }else {
      const attack=()=>{
        const motion=previewMotion(profile,cycle++);
        animate(body,bodyFrames(motion,unit),{duration:motion.duration});
        if(motion.weapon)animate(weapon,gearFrames(motion.weapon,unit),{duration:motion.duration});
        if(motion.shield)animate(shield,gearFrames(motion.shield,unit),{duration:motion.duration});
        later(()=>{
          animate(frame,[{filter:"brightness(2) saturate(0)"},{filter:"brightness(2) saturate(0)"}],{duration:70});
          const shake=3*unit/4;
          animate(frame,[{translate:"0"},{translate:shake+"px",offset:.25},{translate:-shake+"px",offset:.75},{translate:"0"}],{duration:300,easing:"ease-out"});
          animate(frame,[{scale:"1"},{scale:"1.05 .92"},{scale:"1"}],{duration:120,easing:"ease-out"});
        },motion.duration+650);
        later(attack,3500);
      };
      later(attack,350);
    }
    return ()=>{stopped=true;cancelAnimationFrame(raf);timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());if(sheet)sheet.style.left="0";if(turn)turn.style.transform="";};
  });
}

if(!globalThis.__WIKI_PRERENDER__&&typeof document!=="undefined") {
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stopSpritePreviews();});
  window.addEventListener("blur",stopSpritePreviews);
  window.matchMedia?.("(prefers-reduced-motion: reduce)").addEventListener("change",stopSpritePreviews);
}
