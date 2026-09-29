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
render();
