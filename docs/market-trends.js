export const priceChange=(current,baseline)=>Number.isFinite(current)&&current>0&&Number.isFinite(baseline)&&baseline>0?(current-baseline)/baseline*100:null;
export function chartGeometry(points,width=720,height=230,padding=30){
  if(!points.length)return null;
  const min=Math.min(...points.map(p=>p.price)),max=Math.max(...points.map(p=>p.price));
  const floor=Math.max(0,min-(max-min||min)*.12),ceil=max+(max-min||max)*.12;
  const first=points[0].at,last=points.at(-1).at;
  const coords=points.map(p=>({x:padding+(last===first ? .5 : (p.at-first)/(last-first))*(width-padding*2),y:height-padding-(p.price-floor)/(ceil-floor)*(height-padding*2)}));
  return {min,max,first,last,coords,path:coords.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' '),floor,ceil};
}
export function marketRows(live,history=[],includeUnlisted=false){
  const records=new Map(history.map(r=>[r.itemId,r]));
  const rows=new Map(live.map(row=>[row.itemId,{...row,history:records.get(row.itemId)}]));
  if(includeUnlisted)for(const row of history)if(!rows.has(row.itemId))rows.set(row.itemId,{itemId:row.itemId,history:row});
  return [...rows.values()].map(row=>({...row,change:priceChange(row.sellSummary?.bestPricePerUnit,row.history?.avg30d)}));
}
const svgNode=(name,attributes={},children=[])=>{const node=document.createElementNS('http://www.w3.org/2000/svg',name);for(const [k,v] of Object.entries(attributes))node.setAttribute(k,String(v));node.append(...children);return node;};
export function sparkline(values,label){
  if(values.length<2)return null;
  const g=chartGeometry(values.map((price,at)=>({price,at})),100,32,3),up=values.at(-1)>values[0],down=values.at(-1)<values[0];
  const title=svgNode('title');title.textContent=label;
  return svgNode('svg',{viewBox:'0 0 100 32',class:'market-spark '+(up?'market-up':down?'market-down':'market-flat'),role:'img','aria-label':label},[title,svgNode('path',{d:g.path,fill:'none',stroke:'currentColor','stroke-width':2,'vector-effect':'non-scaling-stroke'})]);
}
export function priceChart(points,e,resolution="observations"){
  if(!points.length)return e('p',{class:'bazaar-help'},'No recorded prices are available for this period. This does not mean the item has no live orders.');
  const g=chartGeometry(points),format=n=>new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(n),date=at=>new Date(at).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
  const label=`Recorded lowest sell prices (${resolution}): ${points.length} ${points.length===1?'observation':'observations'}, ${format(g.min)} to ${format(g.max)} coins. ${date(g.first)} to ${date(g.last)}.`;
  const title=svgNode('title');title.textContent=label;
  const children=[title];
  for(let i=0;i<4;i++){
    const y=30+i*170/3,value=g.ceil-i*(g.ceil-g.floor)/3,text=svgNode('text',{x:36,y:y-7,class:'market-chart-axis'});text.textContent=format(value)+' c';
    children.push(svgNode('line',{x1:30,x2:690,y1:y,y2:y,class:'market-chart-grid'}),text);
  }
  children.push(svgNode('path',{d:g.path,fill:'none',stroke:'currentColor','stroke-width':2.5,'vector-effect':'non-scaling-stroke'}));
  for(const [x,at,anchor] of [[30,g.first,'start'],[690,g.last,'end']]){const text=svgNode('text',{x,y:224,'text-anchor':anchor,class:'market-chart-axis'});text.textContent=date(at);children.push(text);}
  const cursor=svgNode('circle',{cx:g.coords.at(-1).x,cy:g.coords.at(-1).y,r:4.5,class:'market-chart-cursor'});children.push(cursor);
  const svg=svgNode('svg',{viewBox:'0 0 720 230',class:'market-price-chart',role:'img','aria-label':label,tabindex:0},children);
  const readout=e('p',{class:'market-chart-readout','aria-live':'polite'});let index=points.length-1;
  const show=i=>{index=Math.max(0,Math.min(points.length-1,i));cursor.setAttribute('cx',g.coords[index].x);cursor.setAttribute('cy',g.coords[index].y);readout.textContent=date(points[index].at)+' · '+format(points[index].price)+(points[index].price===1?' coin':' coins');};show(index);
  svg.addEventListener('pointermove',event=>{const box=svg.getBoundingClientRect(),at=g.first+Math.max(0,Math.min(1,((event.clientX-box.left)/box.width*720-30)/660))*(g.last-g.first);let best=0;for(let i=1;i<points.length;i++)if(Math.abs(points[i].at-at)<Math.abs(points[best].at-at))best=i;show(best);});
  svg.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();show(event.key==='Home'?0:event.key==='End'?points.length-1:index+(event.key==='ArrowLeft'?-1:1));}});
  return e('div',{class:'market-chart'},svg,readout,e('p',{class:'bazaar-help'},label+' Lines join sampled observations; prices between samples are not known. Hover or touch the chart to inspect a price; keyboard users can use the arrow keys.'));
}
