'use strict';
// Keep the copied skeleton's geometry source: two layers, each with 18 bars.
const CONFIG = Object.freeze({count:18, outerHalf:0.5, innerHalf:0.327});
function squarePoint(phase, half) {
  const u=((phase%1)+1)%1*4, edge=Math.floor(u), f=u-edge;
  return [[-1+2*f,-1],[1,-1+2*f],[1-2*f,1],[-1,1-2*f]][edge].map(v=>v*half);
}
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let mode='auto', playing=!reducedMotion.matches, time=0, last=null, ripple=null;
const bars=['bottom','top'].flatMap((layer,l)=>Array.from({length:CONFIG.count},(_,i)=>{
  const outer=squarePoint(i/CONFIG.count,CONFIG.outerHalf), inner=squarePoint(i/CONFIG.count,CONFIG.innerHalf);
  const el=document.createElementNS(NS,'line');
  el.setAttribute('class',`bar ${layer}`); el.dataset.barId=`${layer}-${String(i+1).padStart(2,'0')}`;
  $('bars').appendChild(el);
  return {el,layer,l,i,x:500+(outer[0]+inner[0])*230,y:255+(outer[1]+inner[1])*230,vx:0,vy:0,angle:Math.atan2(outer[1]-inner[1],outer[0]-inner[0]),spin:0,length:34+Math.hypot(outer[0]-inner[0],outer[1]-inner[1])*65};
}));
function floating(){return mode==='float'||(mode==='auto'&&time%18<10);}
function target(b){
  const a=b.i/18*Math.PI*2 + time*(b.l?0.075:-0.06) + b.l*.16;
  return {x:500+Math.cos(a)*(b.l?172:215)+Math.sin(time*.4+b.i)*8,y:248+Math.sin(a)*(b.l?130:156)+Math.sin(time*.75+b.i*.24)*10,a:a+Math.PI/2+Math.sin(time*.7+b.i*.4)*.22};
}
function render(){
  for(const b of bars){const dx=Math.cos(b.angle)*b.length/2,dy=Math.sin(b.angle)*b.length/2;for(const [k,v] of Object.entries({x1:b.x-dx,y1:b.y-dy,x2:b.x+dx,y2:b.y+dy}))b.el.setAttribute(k,v.toFixed(3));}
  const height=bars.reduce((s,b)=>s+(500-b.y),0)/bars.length;
  $('shadow').setAttribute('rx',String(190+height*.2));$('shadow').style.opacity=String(.06+(1-height/400)*.1);
  $('phaseLabel').textContent=floating()?'01 — 浮遊':'02 — 落下';
  $('forceLabel').textContent=floating()?'WEIGHTLESS / ↑':'GRAVITY / ↓';
  if(ripple){const age=time-ripple.t;$('ripple').setAttribute('cx',ripple.x);$('ripple').setAttribute('cy',ripple.y);$('ripple').setAttribute('r',String(age*190));$('ripple').style.opacity=String(Math.max(0,1-age/1.2));if(age>1.2)ripple=null;}else $('ripple').style.opacity='0';
}
function step(dt){
  time+=dt;
  for(const b of bars){
    if(floating()){
      const t=target(b);
      b.vx+=(t.x-b.x)*2.3*dt;b.vy+=(t.y-b.y)*2.3*dt;
      b.vx*=Math.exp(-1.9*dt);b.vy*=Math.exp(-1.9*dt);
      const da=Math.atan2(Math.sin(t.a-b.angle),Math.cos(t.a-b.angle));b.spin+=da*3*dt;b.spin*=Math.exp(-2*dt);
    }else{
      const landing=132+(b.i/17)*736+(b.l?8:-8);
      b.vx+=(landing-b.x)*.5*dt;b.vx*=Math.exp(-.6*dt);b.vy+=460*dt;
      b.spin+=Math.sin(b.i*2.4+b.l)*.16*dt;
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.spin*dt;
    const extent=Math.abs(Math.sin(b.angle))*b.length/2+3.5;
    const floor=498-b.l*9;
    if(b.y+extent>floor){b.y=floor-extent;if(b.vy>0){const impact=b.vy;b.vy=impact>22?-impact*(.37+b.i%3*.055):0;b.vx*=.8;b.spin+=(b.i%2?1:-1)*Math.min(impact/170,2);b.spin*=.6;}}
    b.x=Math.max(60,Math.min(940,b.x));b.y=Math.max(38,Math.min(500,b.y));
  }
}
function updatePlay(){ $('play').textContent=playing?'Ⅱ':'▶';$('play').setAttribute('aria-label',playing?'一時停止':'再生'); }
function pulse(x=500,y=380){
  if(!playing){playing=true;updatePlay();}
  ripple={x,y,t:time};
  for(const b of bars){const dx=b.x-x,dy=b.y-y,d=Math.hypot(dx,dy),force=250*Math.exp(-d/420);b.vx+=dx/(d||1)*force*.7;b.vy-=force+70;b.spin+=(b.i%2?1:-1)*1.8;}
}
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
  mode=button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
  if(mode==='auto'){time=0;ripple=null;}render();
}));
$('play').addEventListener('click',()=>{playing=!playing;updatePlay();});
$('pulse').addEventListener('click',()=>pulse());
$('reset').addEventListener('click',()=>{time=0;ripple=null;for(const b of bars){const t=target(b);Object.assign(b,{x:t.x,y:t.y,angle:t.a,vx:0,vy:0,spin:0});}render();});
$('speed').addEventListener('input',()=>{$('speedValue').value=Number($('speed').value).toFixed(2)+'×';});
$('stage').addEventListener('pointerdown',e=>{const matrix=$('stage').getScreenCTM();if(!matrix)return;const p=new DOMPoint(e.clientX,e.clientY).matrixTransform(matrix.inverse());pulse(p.x,p.y);});
document.addEventListener('visibilitychange',()=>{last=null;});
reducedMotion.addEventListener('change',e=>{if(e.matches){playing=false;updatePlay();}});
function frame(now){
  const elapsed=last===null?0:Math.min((now-last)/1000,.05);last=now;
  if(playing&&!document.hidden){let remaining=elapsed*Number($('speed').value);while(remaining>0){const dt=Math.min(remaining,1/120);step(dt);remaining-=dt;}render();}
  requestAnimationFrame(frame);
}
for(const b of bars){const t=target(b);b.x=t.x;b.y=t.y;b.angle=t.a;}
updatePlay();render();requestAnimationFrame(frame);
