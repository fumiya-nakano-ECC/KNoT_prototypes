'use strict';
// Geometry is independent of rendering. Future motion changes outerPhase/innerPhase.
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
      if($('nodes').checked)for(const [cx,cy] of [[x1,y1],[x2,y2]])element(group,'circle',{cx,cy,r:3,class:'node'});
      if($('ids').checked&&(layers.length===1||layer.id==='top')){
        const [x,y]=screen(bar.outer.map(v=>v*1.12));
        element(group,'text',{x,y,class:'id'},String(bar.index+1).padStart(2,'0'));
      }
    }
  }
}
function render(){
  const overlay=$('view').value==='overlay';
  $('bottomPanel').classList.toggle('hidden',overlay);
  $('views').classList.toggle('overlay', overlay);
  $('topTitle').textContent=overlay?'TOP + BOTTOM / 18 + 18':'上層 / TOP · 18 BARS';
  $('top').setAttribute('aria-label',overlay?'上下各18本のバーの重ね合わせ':'上層の正方形レールと18本のバー');
  draw($('top'),overlay?[geometry[1],geometry[0]]:[geometry[0]]);
  draw($('bottom'),[geometry[1]]);
}
for(const id of ['view','ids','nodes','guides'])$(id).addEventListener('change',render);
// A smooth, strictly increasing circular map preserves each rail's ID order.
// Only phases change: squarePoint, rails, connections and bar count stay intact.
const parameterSpecs=[
  {name:'01 沈み込む',fields:[
    ['duration','時間',2,12,0.5,5,' s'],
    ['weight','沈み込みの強さ',0,3,0.05,2.15,''],
    ['settle','着地の揺れ',0,0.5,0.01,0.12,'']
  ]},
  {name:'02 浮き上がる',fields:[
    ['duration','時間',2,12,0.5,5,' s'],
    ['lift','浮上の強さ',0,3,0.05,1.35,''],
    ['ease','浮上前のため',0.5,3,0.1,1,'']
  ]},
  {name:'03 漂う',fields:[
    ['duration','時間',2,16,0.5,7,' s'],
    ['sway','揺らぎの幅',0,0.6,0.01,0.14,''],
    ['frequency','揺らぎの速さ',0.4,4,0.1,1.6,'']
  ]},
  {name:'04 落下と余韻',fields:[
    ['duration','時間',3,16,0.5,7,' s'],
    ['power','落下の加速感',1,4,0.1,2,''],
    ['bounce','跳ね返り',0,1,0.02,0.38,'']
  ]}
];
const defaultParameters=()=>parameterSpecs.map(stage=>Object.fromEntries(stage.fields.map(([key,,,,,value])=>[key,value])));
let parameters=defaultParameters();
const duration=()=>parameters.reduce((total,stage)=>total+stage.duration,0);
const stageStart=index=>parameters.slice(0,index).reduce((total,stage)=>total+stage.duration,0);
function sequenceAt(time){
  let start=0;
  for(let index=0;index<parameters.length;index++){
    const length=parameters[index].duration;
    if(time<start+length||index===parameters.length-1)return {index,progress:Math.max(0,Math.min(1,(time-start)/length))};
    start+=length;
  }
}
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*x*(x*(x*6-15)+10);};
const mix=(a,b,x)=>a+(b-a)*x;
function weightAt(time) {
  const total=duration(),t=((time%total)+total)%total;
  const {index,progress:p}=sequenceAt(t);
  const [sink,rise,float,fall]=parameters;
  if(index===0){
    if(p<0.68)return sink.weight*smooth(p/0.68);
    const u=(p-0.68)/0.32;
    return sink.weight+sink.settle*Math.sin(u*12.8)*Math.exp(-u*4.8)*smooth(u/0.125)*Math.pow(1-u,2);
  }
  if(index===1)return mix(sink.weight,-rise.lift,smooth(Math.pow(p,rise.ease)));
  if(index===2)return -rise.lift+float.sway*Math.sin(p*float.duration*float.frequency)*Math.pow(Math.sin(Math.PI*p),2);
  if(p<2.2/7)return mix(-rise.lift,sink.weight,Math.pow(p/(2.2/7),fall.power));
  if(p<4/7){const u=(p-2.2/7)/(1.8/7);return sink.weight-fall.bounce*Math.exp(-u*4.32)*Math.sin(u*12.6)*Math.pow(1-u,2);}
  return mix(sink.weight,0,smooth((p-4/7)/(3/7)));
}
function railPhase(base,weight,center) {
  const angle=Math.PI*(((base-center+0.5)%1+1)%1-0.5);
  return center+Math.atan2(Math.exp(-weight)*Math.sin(angle),Math.cos(angle))/Math.PI;
}
function updateGeometry(time) {
  const total=duration();
  const envelope=time===0||time===total?0:Math.pow(Math.sin(Math.PI*time/total),2);
  for(const [layerIndex,layer] of geometry.entries())for(const bar of layer.bars){
    const base=bar.index/CONFIG.count;
    const lag=layerIndex*0.19*envelope;
    const center=0.625+0.016*Math.sin(time*0.85)*envelope;
    bar.outerPhase=railPhase(base,weightAt(time-lag),center);
    bar.innerPhase=railPhase(base,weightAt(time-lag-0.14*envelope),center);
    bar.outer=squarePoint(bar.outerPhase,CONFIG.outerHalf);
    bar.inner=squarePoint(bar.innerPhase,CONFIG.innerHalf);
  }
}
const stages=[
  {text:'下辺へ重さが集まり、静かに沈み込む。'},
  {text:'重さがほどけ、ゆっくりと浮き上がる。'},
  {text:'上辺に留まり、わずかな遅れを伴って漂う。'},
  {text:'加速して落ちる。小さく弾み、余韻を残す。'}
];
let elapsed=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,last=null;
function paint(){
  updateGeometry(elapsed);render();
  const {index}=sequenceAt(elapsed);
  $('phaseText').textContent=stages[index].text;
  $('time').textContent=`${elapsed.toFixed(1)} / ${duration().toFixed(1)} s`;
  $('seek').max=duration();
  $('seek').value=elapsed;
  document.querySelectorAll('[data-stage]').forEach((button,i)=>{
    if(i===index)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
  });
}
function syncPlay(){ $('play').textContent=playing?'一時停止':'再生';$('play').setAttribute('aria-pressed',String(playing)); }
$('play').addEventListener('click',()=>{playing=!playing;last=null;syncPlay();});
$('restart').addEventListener('click',()=>{elapsed=0;last=null;paint();});
$('seek').addEventListener('input',()=>{elapsed=Number($('seek').value);last=null;paint();});
document.querySelectorAll('[data-stage]').forEach((button,index)=>button.addEventListener('click',()=>{
  elapsed=stageStart(index);last=null;paint();
}));
function parameterValue(value,step,unit){
  const decimals=String(step).split('.')[1]?.length||0;
  return `${value.toFixed(decimals)}${unit}`;
}
function buildParameterControls(){
  $('parameterControls').innerHTML=parameterSpecs.map((stage,index)=>`<fieldset><legend>${stage.name}</legend>${stage.fields.map(([key,label,min,max,step,,unit])=>{
    const id=`parameter-${index}-${key}`,value=parameters[index][key];
    return `<label class="parameter-control" for="${id}"><span>${label}<output id="${id}-value" for="${id}">${parameterValue(value,step,unit)}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;
  }).join('')}</fieldset>`).join('');
  parameterSpecs.forEach((stage,index)=>stage.fields.forEach(([key,,min,max,step,,unit])=>{
    const id=`parameter-${index}-${key}`;
    $(id).addEventListener('input',()=>{
      const value=Number($(id).value);
      if(!Number.isFinite(value))return;
      // Keep the same position within the current sequence when its timing changes.
      const current=sequenceAt(elapsed);
      parameters[index][key]=Math.max(min,Math.min(max,value));
      elapsed=stageStart(current.index)+current.progress*parameters[current.index].duration;
      $(id+'-value').textContent=parameterValue(parameters[index][key],step,unit);
      last=null;paint();
    });
  }));
}
$('resetParameters').addEventListener('click',()=>{
  parameters=defaultParameters();elapsed=0;last=null;buildParameterControls();paint();
});
document.addEventListener('visibilitychange',()=>{last=null;});
function tick(now){
  if(playing&&!document.hidden){
    if(last!==null)elapsed=(elapsed+Math.min((now-last)/1000,0.05)*Number($('speed').value))%duration();
    paint();
  }
  last=now;requestAnimationFrame(tick);
}
buildParameterControls();syncPlay();paint();requestAnimationFrame(tick);
