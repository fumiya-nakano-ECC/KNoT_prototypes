'use strict';
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const {CONFIG,DURATION,frame}=WeaveMotion;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const state={time:0,playing:!reducedMotion.matches,speed:1,strength:0.8};
const STAGES=[['ほどける','UNFOLD'],['織り合う','INTERLACE'],['波が抜ける','EXHALE'],['整う','REST']];
let rendered=[],previous;
function element(parent,tag,attrs,text){
  const el=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  if(text!==undefined)el.textContent=text;
  parent.appendChild(el);return el;
}
function buildView(){
  const overlay=$('view').value==='overlay';
  $('views').classList.toggle('overlay',overlay);$('bottomPanel').classList.toggle('hidden',overlay);
  $('topTitle').textContent=overlay?'TOP + BOTTOM / 18 + 18':'TOP / 18 BARS';
  $('top').setAttribute('aria-label',overlay?'上下各18本のバーの重ね合わせ':'上層の正方形レールと18本のバー');
  rendered=[];
  for(const name of ['top','bottom']){
    const svg=$(name);svg.replaceChildren();
    if(name==='bottom'&&overlay)continue;
    if($('guides').checked){
      element(svg,'path',{d:'M 20 260 H 500 M 260 20 V 500',class:'axis'});
      for(const half of [CONFIG.outerHalf,CONFIG.innerHalf])element(svg,'rect',{x:260-half*352,y:260-half*352,width:half*704,height:half*704,class:'rail'});
    }
    for(const layer of overlay?['bottom','top']:[name]){
      const group=element(svg,'g',{'data-layer':layer});
      for(let i=0;i<CONFIG.count;i++){
        const id=`${layer}-${String(i+1).padStart(2,'0')}`;
        const line=element(group,'line',{class:'bar','data-bar-id':id});element(line,'title',{},id);
        const nodes=$('nodes').checked?[element(group,'circle',{r:3,class:'node'}),element(group,'circle',{r:3,class:'node'})]:[];
        const label=$('ids').checked?element(group,'text',{class:'id'},(overlay?(layer==='top'?'T':'B'):'')+String(i+1).padStart(2,'0')):null;
        rendered.push({layer,index:i,line,nodes,label});
      }
    }
  }
  render();
}
function render(){
  const pose=frame(state.time,state.strength);
  for(const item of rendered){
    const bar=pose[item.layer==='top'?0:1].bars[item.index];
    const p=[...bar.outer,...bar.inner].map(v=>260+v*352);
    ['x1','y1','x2','y2'].forEach((key,i)=>item.line.setAttribute(key,p[i]));
    item.nodes.forEach((node,i)=>{node.setAttribute('cx',p[i*2]);node.setAttribute('cy',p[i*2+1]);});
    if(item.label){
      const anchor=item.layer==='top'?bar.outer:bar.inner, scale=item.layer==='top'?1.12:0.86;
      item.label.setAttribute('x',260+anchor[0]*352*scale);item.label.setAttribute('y',260+anchor[1]*352*scale);
    }
  }
  const stage=Math.min(3,Math.floor(state.time/8));
  $('motionLabel').textContent=STAGES[stage].join(' / ');$('time').textContent=state.time.toFixed(1)+' / 32.0 s';
  $('seek').value=state.time;$('play').textContent=state.playing?'一時停止':'再生';
  STAGES.forEach((_,i)=>$('stage-'+i).setAttribute('aria-pressed',String(stage===i)));
}
STAGES.forEach((stage,i)=>{
  const button=document.createElement('button');button.id='stage-'+i;button.type='button';button.textContent=stage[0];
  const caption=document.createElement('span');caption.textContent=`${i*8}–${(i+1)*8} s`;button.appendChild(caption);
  button.addEventListener('click',()=>{state.time=i*8;previous=undefined;render();});$('sequence').appendChild(button);
});
$('play').addEventListener('click',()=>{state.playing=!state.playing;previous=undefined;render();});
$('restart').addEventListener('click',()=>{state.time=0;previous=undefined;render();});
$('seek').addEventListener('input',()=>{state.time=Number($('seek').value);state.playing=false;render();});
$('speed').addEventListener('change',()=>{state.speed=Number($('speed').value);});
for(const id of ['view','ids','nodes','guides'])$(id).addEventListener('change',buildView);
$('strength').addEventListener('input',()=>{state.strength=Number($('strength').value)/100;$('strengthValue').textContent=$('strength').value+'%';render();});
$('reset').addEventListener('click',()=>{state.strength=0.8;$('strength').value=80;$('strengthValue').textContent='80%';render();});
reducedMotion.addEventListener('change',event=>{if(event.matches){state.playing=false;render();}});
document.addEventListener('visibilitychange',()=>{previous=undefined;});
function tick(now){
  if(previous!==undefined&&state.playing&&!document.hidden){state.time=(state.time+Math.min((now-previous)/1000,0.1)*state.speed)%DURATION;render();}
  previous=now;requestAnimationFrame(tick);
}
buildView();requestAnimationFrame(tick);
