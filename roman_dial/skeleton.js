'use strict';
const $ = id => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const CONFIG = Object.freeze({count:18, outerHalf:0.5, innerHalf:0.327});
const ROMAN = ['I','II','III','IIII','V','VI','VII','VIII','IX','X','XI','XII'];
const STAGES = [['文字盤','ROMAN / 時計の秩序',0],['並び替え','SHIFT / 数字が場所を交換する',8],['分解','FRAGMENTS / 線がほどける',16],['架空文字','GLYPHS / 新しい文字が生まれる',24],['帰還','RETURN / 再び、時を読む',32]];
const state = {time:0, playing:!matchMedia('(prefers-reduced-motion: reduce)').matches, speed:1, seed:0, variation:'rune', scatter:0.65, stagger:0.35};
const clamp = n => Math.max(0, Math.min(1,n));
const ease = n => { const x=clamp(n); return x*x*x*(x*(x*6-15)+10); };
function random(n) { const x=Math.sin(n*127.1+state.seed*311.7+74.7)*43758.5453; return x-Math.floor(x); }
function squarePoint(phase,half) {
  const u=((phase%1)+1)%1*4, edge=Math.floor(u), f=u-edge;
  return [[-1+2*f,-1],[1,-1+2*f],[1-2*f,1],[-1,1-2*f]][edge].map(v=>v*half*352);
}
function railLine(outerPhase,innerPhase) {
  return [...squarePoint(outerPhase,CONFIG.outerHalf),...squarePoint(innerPhase,CONFIG.innerHalf)];
}
function slot(index,line) {
  const phase=(index+2.5)/12;
  return [phase+line[0]/(CONFIG.outerHalf*2816),phase+line[2]/(CONFIG.innerHalf*2816)];
}
// Every stroke retains its identity through all target layouts; IIII makes 36.
const strokes=[];
ROMAN.forEach((word,group)=>{
  const widths=[...word].map(c=>c==='I'?7:18), total=widths.reduce((a,b)=>a+b,0)+(word.length-1)*7;
  let left=-total/2;
  [...word].forEach((letter,i)=>{
    const w=widths[i], segments=letter==='I'?[[w/2,-19,w/2,19]]:letter==='V'?[[0,-19,w/2,19],[w,-19,w/2,19]]:[[0,-19,w,19],[w,-19,0,19]];
    segments.forEach(s=>strokes.push({group, local:[s[0]+left,s[1],s[2]+left,s[3]]}));
    left+=w+7;
  });
});
function dial() { return strokes.map(s=>slot(s.group,s.local)); }
function shuffled() {
  const order=Array.from({length:12},(_,i)=>i);
  for(let i=11;i>0;i--) { const j=Math.floor(random(i+41)*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
  return strokes.map(s=>slot(order[s.group],s.local));
}
function fragments() {
  return strokes.map((s,i)=>{
    const phase=(i+0.5)/36+state.scatter*(random(i+8)-0.5)/90;
    return [phase,phase+state.scatter*(random(i+76)-0.5)/28];
  });
}
function rotate(line,a) {
  const out=[];
  for(let i=0;i<4;i+=2)out.push(line[i]*Math.cos(a)-line[i+1]*Math.sin(a),line[i]*Math.sin(a)+line[i+1]*Math.cos(a));
  return out;
}
function glyphs() {
  const runes=[
    [[-8,-23,-8,23],[-8,-23,17,-4],[-8,6,17,-4]],
    [[-18,-20,0,22],[0,22,18,-20],[-12,0,12,0]],
    [[0,-24,0,24],[-18,-9,18,9],[-18,9,18,-9]],
    [[-18,-20,18,-20],[0,-20,0,24],[0,4,20,20]]
  ];
  return strokes.map((s,i)=>{
    const group=Math.floor(i/3), k=i%3;
    let line;
    if(state.variation==='rune') {
      line=runes[(group+state.seed)%4][k];
      if(group%3===1)line=line.map((v,j)=>j%2===0?-v:v);
    } else if(state.variation==='weave') {
      line=rotate([[-21,-21,21,21],[-21,21,21,-21],[-23,0,23,0]][k],(group%3-1)*Math.PI/4);
    } else {
      const angle=k*Math.PI*2/3+group*0.47;
      line=[0,0,Math.cos(angle)*29,Math.sin(angle)*29];
    }
    return slot(group,[line[0]+line[1]*0.35,0,line[2]+line[3]*0.35,0]);
  });
}
let targets;
function rebuild() { const home=dial(); targets=[home,shuffled(),fragments(),glyphs(),home,home]; }
function frame(time) {
  const stage=Math.min(4,Math.floor(time/8)), local=time-stage*8;
  return strokes.map((stroke,i)=>{
    const lag=state.stagger*1.25*random(i+101);
    const t=ease((local-2-lag)/(6-state.stagger*1.25));
    const a=targets[stage][i], b=targets[stage+1][i];
    const line=a.map((phase,k)=>{
      const travel=((b[k]-phase+1.5)%1)-0.5;
      return phase+travel*t;
    });
    if(stage<4) {
      const arc=Math.sin(Math.PI*t)*0.008*Math.cos(i*2.399);
      line[0]+=arc;line[1]-=arc;
    }
    return railLine(line[0],line[1]);
  });
}
function element(parent,tag,attrs,text) {
  const node=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));
  if(text!==undefined)node.textContent=text;
  parent.appendChild(node);return node;
}
let rendered=[];
function buildView() {
  const overlay=$('view').value==='overlay';
  $('views').classList.toggle('overlay',overlay); $('bottomPanel').classList.toggle('hidden',overlay);
  $('topTitle').textContent=overlay?'TOP + BOTTOM / 18 + 18':'TOP / 18 BARS';
  rendered=[];
  for(const name of ['top','bottom']) {
    const svg=$(name);svg.replaceChildren();
    if($('guides').checked) {
      element(svg,'path',{d:'M 40 260 H 480 M 260 40 V 480',class:'axis'});
      for(const half of [CONFIG.outerHalf,CONFIG.innerHalf])element(svg,'rect',{x:260-half*352,y:260-half*352,width:half*704,height:half*704,class:'rail'});
    }
    for(let i=0;i<36;i++) {
      const layer=i%2===0?'top':'bottom';
      if(!(name==='top'&&overlay)&&name!==layer)continue;
      if(name==='bottom'&&overlay)continue;
      const id=layer+'-'+String(Math.floor(i/2)+1).padStart(2,'0');
      const line=element(svg,'line',{class:'bar','data-bar-id':id});element(line,'title',{},id);
      const nodes=$('nodes').checked?[element(svg,'circle',{r:2.5,class:'node'}),element(svg,'circle',{r:2.5,class:'node'})]:[];
      const label=$('ids').checked?element(svg,'text',{class:'id'},id):null;
      rendered.push({i,line,nodes,label});
    }
  }
  render();
}
function render() {
  const pose=frame(state.time);
  for(const entry of rendered) {
    const p=pose[entry.i].map(v=>v+260);
    ['x1','y1','x2','y2'].forEach((key,i)=>entry.line.setAttribute(key,p[i].toFixed(3)));
    entry.nodes.forEach((node,i)=>{node.setAttribute('cx',p[i*2]);node.setAttribute('cy',p[i*2+1]);});
    if(entry.label) { entry.label.setAttribute('x',(p[0]+p[2])/2+8);entry.label.setAttribute('y',(p[1]+p[3])/2-8); }
  }
  const index=Math.min(4,Math.floor(state.time/8));
  $('motionLabel').textContent=STAGES[index][1]; $('time').textContent=state.time.toFixed(1)+' / 40.0 s';
  $('seek').value=state.time;
  STAGES.forEach((s,i)=>$('stage-'+i).setAttribute('aria-pressed',String(index===i)));
  $('play').textContent=state.playing?'一時停止':'再生';
}
STAGES.forEach((stage,i)=>{
  const button=document.createElement('button');button.type='button';button.id='stage-'+i;
  button.textContent=String(i+1).padStart(2,'0')+' '+stage[0];
  const sub=document.createElement('span');sub.textContent=stage[2]+'–'+(stage[2]+8)+' s';button.appendChild(sub);
  button.addEventListener('click',()=>{state.time=stage[2];render();});$('sequence').appendChild(button);
});
$('play').addEventListener('click',()=>{state.playing=!state.playing;render();});
$('restart').addEventListener('click',()=>{state.time=0;render();});
$('seek').addEventListener('input',()=>{state.time=Number($('seek').value);state.playing=false;render();});
$('speed').addEventListener('change',()=>{state.speed=Number($('speed').value);});
for(const id of ['view','ids','nodes','guides'])$(id).addEventListener('change',buildView);
$('variation').addEventListener('change',()=>{state.variation=$('variation').value;rebuild();render();});
for(const id of ['scatter','stagger'])$(id).addEventListener('input',()=>{state[id]=Number($(id).value)/100;$(id+'Value').textContent=$(id).value+'%';rebuild();render();});
$('shuffle').addEventListener('click',()=>{state.seed++;rebuild();render();});
$('reset').addEventListener('click',()=>{
  Object.assign(state,{seed:0,variation:'rune',scatter:0.65,stagger:0.35});$('variation').value='rune';
  for(const id of ['scatter','stagger']) { $(id).value=state[id]*100;$(id+'Value').textContent=$(id).value+'%'; }
  rebuild();render();
});
rebuild();buildView();
let previous;
function tick(now) {
  if(previous!==undefined&&state.playing&&!document.hidden)state.time=(state.time+Math.min((now-previous)/1000,0.1)*state.speed)%40;
  previous=now;if(state.playing)render();requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
