'use strict';
// Square rails and the initial two-layer layout are inherited from skelton.
const CONFIG = Object.freeze({count:18, outerHalf:0.5, innerHalf:0.327});
function squarePoint(phase, half) {
  const u=((phase%1)+1)%1*4, edge=Math.floor(u), f=u-edge;
  return [[-1+2*f,-1],[1,-1+2*f],[1-2*f,1],[-1,1-2*f]][edge].map(v=>v*half);
}
function createGeometry() {
  return ['top','bottom'].map(id=>({id,bars:Array.from({length:CONFIG.count},(_,index)=>({
    id:`${id}-${String(index+1).padStart(2,'0')}`,index,
    outer:squarePoint(index/CONFIG.count,CONFIG.outerHalf),
    inner:squarePoint(index/CONFIG.count,CONFIG.innerHalf)
  }))}));
}
const geometry=createGeometry();
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const screen=point=>point.map(v=>260+v*352);
const bindings=[];
const VARIANTS = Object.freeze({
  zigzag:{outer:0,inner:0.5,label:'ジグザグに広がる',description:'外側を支点に、内側だけを左右へ半間隔ずつ開く。隣の端点と出会った位置で折り返します。'},
  cross:{outer:0.25,inner:-0.25,label:'バッテンに開く',description:'重なった一組が、内外の端点を逆向きに1/4間隔ずつ動かしてバッテンに。隣の組へは移動しません。'},
  original:{outer:0.5,inner:1,label:'ジグザグに広がる',description:'従来の動き。上下の層が逆方向に進み、内側の端点が隣の組を通り過ぎてジグザグになります。'}
});
const variant=()=>VARIANTS[$('variant').value];
const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let elapsed=0, amount=0, playing=!reducedMotion.matches, lastTime=null;
const smooth=x=>x*x*x*(10+x*(-15+6*x));
function motionAt(time) {
  const t=((time%10.2)+10.2)%10.2;
  if(t<1.2)return {amount:0,label:'重なりを保つ'};
  if(t<4.8)return {amount:smooth((t-1.2)/3.6),label:'傾きながら、逆方向へ開く'};
  if(t<6.6)return {amount:1,label:variant().label};
  return {amount:1-smooth((t-6.6)/3.6),label:'ゆっくり重なりへ戻る'};
}
function updateGeometry(value) {
  geometry.forEach((layer,l)=>layer.bars.forEach(bar=>{
    const shift=(l===0?1:-1)*value/CONFIG.count;
    // Zigzag meets the nearest inner endpoint without passing it; cross keeps
    // each pair inside its original cell. Only the original mode passes a neighbor.
    bar.outer=squarePoint(bar.index/CONFIG.count+shift*variant().outer,CONFIG.outerHalf);
    bar.inner=squarePoint(bar.index/CONFIG.count+shift*variant().inner,CONFIG.innerHalf);
  }));
}
function element(parent,tag,attrs,text) {
  const el=document.createElementNS(NS,tag);
  Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
  if(text!==undefined)el.textContent=text;
  parent.appendChild(el);return el;
}
function draw(svg,layers) {
  svg.replaceChildren();
  if($('guides').checked){
    element(svg,'path',{d:'M 20 260 H 500 M 260 20 V 500',class:'axis'});
    for(const half of [CONFIG.outerHalf,CONFIG.innerHalf])element(svg,'rect',{x:260-half*352,y:260-half*352,width:half*704,height:half*704,class:'rail'});
  }
  for(const layer of layers){
    const group=element(svg,'g',{'data-layer':layer.id});
    for(const bar of layer.bars){
      const line=element(group,'line',{class:'bar','data-bar-id':bar.id});
      element(line,'title',{},bar.id);
      const nodes=[];
      if($('nodes').checked)for(let i=0;i<2;i++)nodes.push(element(group,'circle',{r:3,class:'node'}));
      const label=$('ids').checked&&(layers.length===1||layer.id==='top')?element(group,'text',{class:'id'},String(bar.index+1).padStart(2,'0')):null;
      bindings.push({bar,line,nodes,label});
    }
  }
}
function paint(){
  updateGeometry(amount);
  for(const {bar,line,nodes,label} of bindings){
    const [x1,y1]=screen(bar.outer),[x2,y2]=screen(bar.inner);
    for(const [key,value] of Object.entries({x1,y1,x2,y2}))line.setAttribute(key,value);
    nodes.forEach((node,i)=>{node.setAttribute('cx',i?x2:x1);node.setAttribute('cy',i?y2:y1);});
    if(label){const [x,y]=screen(bar.outer.map(v=>v*1.12));label.setAttribute('x',x);label.setAttribute('y',y);}
  }
  $('expansion').value=amount*100;
  $('amount').value=`${Math.round(amount*100)}%`;
}
function render(){
  bindings.length=0;
  const overlay=$('view').value==='overlay';
  $('bottomPanel').classList.toggle('hidden',overlay);
  $('views').classList.toggle('overlay',overlay);
  $('topTitle').textContent=overlay?'TOP + BOTTOM / 18 + 18':'上層 / TOP · 18 BARS';
  $('top').setAttribute('aria-label',overlay?'上下各18本の拡張モーション':'上層18本の拡張モーション');
  $('bottom').setAttribute('aria-label','下層18本の拡張モーション');
  draw($('top'),overlay?[geometry[1],geometry[0]]:[geometry[0]]);
  if(!overlay)draw($('bottom'),[geometry[1]]);
  paint();
}
function setPlaying(value){playing=value;lastTime=null;$('play').textContent=playing?'一時停止':'再生';}
for(const id of ['view','ids','nodes','guides'])$(id).addEventListener('change',render);
$('variant').addEventListener('change',()=>{
  elapsed=0;amount=0;lastTime=null;
  $('variantDescription').textContent=variant().description;
  $('phaseText').textContent=motionAt(0).label;paint();
});
$('play').addEventListener('click',()=>setPlaying(!playing));
$('restart').addEventListener('click',()=>{elapsed=0;amount=0;$('phaseText').textContent=motionAt(0).label;setPlaying(!reducedMotion.matches);paint();});
$('expansion').addEventListener('input',()=>{
  setPlaying(false);amount=Number($('expansion').value)/100;
  // Invert the easing so resuming continues from the exact scrubbed shape.
  let low=0,high=1;
  for(let i=0;i<40;i++){const mid=(low+high)/2;if(smooth(mid)<amount)low=mid;else high=mid;}
  elapsed=1.2+3.6*(low+high)/2;
  $('phaseText').textContent='展開量を確認中';paint();
});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)setPlaying(false);});
document.addEventListener('visibilitychange',()=>{lastTime=null;});
function tick(now){
  if(lastTime!==null&&playing&&!document.hidden){
    elapsed=(elapsed+Math.min((now-lastTime)/1000,0.1)*Number($('speed').value))%10.2;
    const state=motionAt(elapsed);amount=state.amount;$('phaseText').textContent=state.label;paint();
  }
  lastTime=now;requestAnimationFrame(tick);
}
$('variantDescription').textContent=variant().description;
setPlaying(playing);render();requestAnimationFrame(tick);
