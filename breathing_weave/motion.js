'use strict';
// Geometry and IDs match skelton/skeleton.js. Only rail phases change.
const WeaveMotion = (() => {
  const CONFIG = Object.freeze({count:18, outerHalf:0.5, innerHalf:0.327});
  const DURATION = 32;
  function squarePoint(phase, half) {
    const u=((phase%1)+1)%1*4, edge=Math.floor(u), f=u-edge;
    return [[-1+2*f,-1],[1,-1+2*f],[1-2*f,1],[-1,1-2*f]][edge].map(v=>v*half);
  }
  function frame(time, strength=0.8) {
    const s=((time%DURATION)+DURATION)%DURATION/DURATION;
    const gain=Math.max(0,Math.min(1,strength))*Math.sin(Math.PI*s)**2;
    const twist=gain*(0.075+0.055*Math.sin(2*Math.PI*s));
    return ['top','bottom'].map((layer,l)=>({id:layer,bars:Array.from({length:CONFIG.count},(_,i)=>{
      const u=i/CONFIG.count, sign=l===0?1:-1;
      const wave=2*Math.PI*u-4*Math.PI*s+l*Math.PI;
      // Phase derivative is >= 1 - 2*pi*0.024 > 0 on each rail:
      // neighboring endpoints retain their order, including across the seam.
      const outerPhase=u+sign*twist*0.35+0.018*gain*Math.sin(wave);
      const innerPhase=u-sign*twist*0.65-0.024*gain*Math.sin(wave);
      return {id:`${layer}-${String(i+1).padStart(2,'0')}`,index:i,outerPhase,innerPhase,
        outer:squarePoint(outerPhase,CONFIG.outerHalf),inner:squarePoint(innerPhase,CONFIG.innerHalf)};
    })}));
  }
  return {CONFIG,DURATION,squarePoint,frame};
})();
if(typeof module!=='undefined')module.exports=WeaveMotion;
