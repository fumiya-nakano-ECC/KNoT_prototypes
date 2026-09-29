'use strict';
// Square rail geometry inherited from skelton. Motion uses continuous perimeter phases.
const CONFIG = Object.freeze({count:18, outerHalf:0.5, innerHalf:0.327});
function squarePoint(phase, half) {
  const u=((phase%1)+1)%1*4, edge=Math.floor(u), f=u-edge;
  return [[-1+2*f,-1],[1,-1+2*f],[1-2*f,1],[-1,1-2*f]][edge].map(v=>v*half);
}
function createGeometry() {
  return ['top','bottom'].map(layer=>({id:layer,bars:Array.from({length:CONFIG.count},(_,i)=>({
    id:`${layer}-${String(i+1).padStart(2,'0')}`,index:i,outerPhase:i/CONFIG.count,innerPhase:i/CONFIG.count,
    outer:squarePoint(i/CONFIG.count,CONFIG.outerHalf),inner:squarePoint(i/CONFIG.count,CONFIG.innerHalf)
  }))}));
}
const geometry=createGeometry();
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
function element(parent,tag,attrs,text) {
  const el=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  if(text!==undefined)el.textContent=text;
  parent.appendChild(el);return el;
}
const screen=point=>point.map(v=>260+v*352);
const bindings=[];
function draw(svg,layers) {
  svg.replaceChildren();
  if($('guides').checked){
    element(svg,'path',{d:'M 20 260 H 500 M 260 20 V 500',class:'axis'});
    for(const half of [CONFIG.outerHalf,CONFIG.innerHalf])element(svg,'rect',{x:260-half*352,y:260-half*352,width:half*704,height:half*704,class:'rail'});
  }
  for(const layer of layers){
    const group=element(svg,'g',{'data-layer':layer.id});
    for(const bar of layer.bars){
      const [x1,y1]=screen(bar.outer),[x2,y2]=screen(bar.inner);
      const line=element(group,'line',{x1,y1,x2,y2,class:'bar','data-bar-id':bar.id});
      element(line,'title',{},bar.id);
      const nodes=[]; let label=null;
      if($('nodes').checked)for(const [cx,cy] of [[x1,y1],[x2,y2]])nodes.push(element(group,'circle',{cx,cy,r:3,class:'node'}));
      if($('ids').checked&&(layers.length===1||layer.id==='top')){
        const [x,y]=screen(bar.outer.map(v=>v*1.12));
        label=element(group,'text',{x,y,class:'id'},String(bar.index+1).padStart(2,'0'));
      }
      bindings.push({bar,line,nodes,label});
    }
  }
}
function render(){
  bindings.length=0;
  const overlay=$('view').value==='overlay';
  $('bottomPanel').classList.toggle('hidden',overlay);
  $('views').classList.toggle('overlay', overlay);
  $('topTitle').textContent=overlay?'TOP + BOTTOM / 18 + 18':'上層 / TOP · 18 BARS';
  $('top').setAttribute('aria-label',overlay?'上下各18本のバーの重ね合わせ':'上層の正方形レールと18本のバー');
  draw($('top'),overlay?[geometry[1],geometry[0]]:[geometry[0]]);
  draw($('bottom'),[geometry[1]]);
}
for(const id of ['view','ids','nodes','guides'])$(id).addEventListener('change',render);


const STAGES = [0,3,8,12];
const DESCRIPTIONS = ['6時方向を中心に、下辺へゆっくり集合。','傾きがばらばらに震え、少しずつ大きく。','振動をほどきながら、左右へふわっと。','左右に翼を広げ、ゆったりと羽ばたく。'];
const clamp = x=>Math.max(0,Math.min(1,x));
const smooth = x=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const mix = (a,b,t)=>a+(b-a)*t;
let elapsed=0, playing=true, lastTime=null, activeStage=-1;

// Each wing contains nine bars per layer. All endpoints stay on their square rails.
function poseAt(t,i,layerIndex) {
  const lane=i/17;
  const gathered=0.625+(lane-0.5)*0.19;
  const layerShift=layerIndex===0?-0.0015:0.0015;
  const rest=gathered+layerShift;
  if(t<3) {
    const start=i/CONFIG.count;
    const shortest=((rest-start+1.5)%1)-0.5;
    const phase=start+shortest*smooth(t/3);
    return [phase,phase];
  }
  const engineTime=t-3;
  const strength=smooth(engineTime/5);
  const seed=i*2.399963+layerIndex*1.83;
  // Incommensurate oscillators avoid a synchronized, rigid rocking motion.
  const rumble=(Math.sin(engineTime*(13+i*0.27)+seed)+0.38*Math.sin(engineTime*23.7+seed*1.7))/1.38;
  const tilt=0.030*strength*rumble;
  const engine=[rest+tilt*0.15,rest-tilt];
  if(t<8) return engine;
  const right=i<9;
  const feather=right?i/8:(17-i)/8;
  const sign=right?1:-1;
  const center=right?0.375:0.875;
  const spread=(feather-0.5)*0.105;
  const base=center+sign*spread+layerShift;
  // Start at rest and ease into the periodic motion, keeping deployment C2 continuous.
  const flightTime=Math.max(0,t-12);
  const envelope=smooth(flightTime/2.5);
  const wave=Math.sin(flightTime*Math.PI*2/6-feather*0.45+layerIndex*0.14);
  const stroke=wave*envelope;
  const wing=[base+sign*0.028*stroke,base-sign*(0.042+0.010*feather)*stroke];
  const unfurl=smooth((t-8)/4);
  return engine.map((phase,j)=>mix(phase,wing[j],unfurl));
}
function updateGeometry(t) {
  geometry.forEach((layer,l)=>layer.bars.forEach(bar=>{
    [bar.outerPhase,bar.innerPhase]=poseAt(t,bar.index,l);
    bar.outer=squarePoint(bar.outerPhase,CONFIG.outerHalf);
    bar.inner=squarePoint(bar.innerPhase,CONFIG.innerHalf);
  }));
}
function paint() {
  updateGeometry(elapsed);
  for(const {bar,line,nodes,label} of bindings) {
    const [x1,y1]=screen(bar.outer),[x2,y2]=screen(bar.inner);
    for(const [key,value] of Object.entries({x1,y1,x2,y2}))line.setAttribute(key,value);
    nodes.forEach((node,i)=>{node.setAttribute('cx',i?x2:x1);node.setAttribute('cy',i?y2:y1);});
    if(label){const [x,y]=screen(bar.outer.map(v=>v*1.12));label.setAttribute('x',x);label.setAttribute('y',y);}
  }
  const stage=elapsed<3?0:elapsed<8?1:elapsed<12?2:3;
  if(stage!==activeStage) {
    activeStage=stage;
    document.querySelectorAll('[data-stage]').forEach((button,i)=>{
      if(i===stage)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    });
    $('phaseText').textContent=DESCRIPTIONS[stage];
  }
  $('time').textContent=`${elapsed.toFixed(1)} s`;
}
$('play').addEventListener('click',()=>{playing=!playing;lastTime=null;$('play').textContent=playing?'一時停止':'再生';});
$('restart').addEventListener('click',()=>{elapsed=0;lastTime=null;playing=true;$('play').textContent='一時停止';paint();});
document.querySelectorAll('[data-stage]').forEach(button=>button.addEventListener('click',()=>{
  elapsed=STAGES[Number(button.dataset.stage)];lastTime=null;paint();
}));
document.addEventListener('visibilitychange',()=>{lastTime=null;});
function tick(now) {
  if(lastTime!==null && playing && !document.hidden)elapsed+=Math.min((now-lastTime)/1000,0.1)*Number($('speed').value);
  lastTime=now;
  if(playing)paint();
  requestAnimationFrame(tick);
}
updateGeometry(0);
render();
paint();
requestAnimationFrame(tick);

