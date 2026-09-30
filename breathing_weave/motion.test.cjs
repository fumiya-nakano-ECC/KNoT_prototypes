const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {CONFIG,DURATION,frame}=require('./motion.js');
// Evaluate the original geometry only, before its DOM-dependent renderer.
const source=fs.readFileSync(path.join(__dirname,'../skelton/skeleton.js'),'utf8');
const reference=vm.runInNewContext(source.slice(0,source.indexOf('const geometry='))+';createGeometry()');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-11,`${a} != ${b}`);
for(const strength of [0,0.5,0.8,1]){
  for(const time of [0,DURATION])frame(time,strength).forEach((layer,l)=>layer.bars.forEach((bar,i)=>{
    const original=reference[l].bars[i];assert.equal(bar.id,original.id);
    for(const end of ['outer','inner'])bar[end].forEach((v,j)=>close(v,original[end][j]));
  }));
  for(let step=0;step<=1920;step++){
    const pose=frame(step/60,strength);assert.equal(pose.length,2);
    for(const layer of pose){
      assert.equal(layer.bars.length,CONFIG.count);assert.equal(new Set(layer.bars.map(b=>b.id)).size,18);
      for(const [end,half] of [['outer',0.5],['inner',0.327]]){
        layer.bars.forEach((bar,i)=>{
          assert.ok(bar[end].every(Number.isFinite));close(Math.max(...bar[end].map(Math.abs)),half);
          const next=layer.bars[(i+1)%CONFIG.count][end+'Phase']+(i===CONFIG.count-1?1:0);
          assert.ok(next-bar[end+'Phase']>0.04,'Rail endpoint order must be preserved');
          if(strength===0)bar[end].forEach((v,j)=>close(v,reference[layer.id==='top'?0:1].bars[i][end][j]));
        });
      }
    }
  }
}
for(const end of ['outerPhase','innerPhase']){
  const h=1e-4;
  for(const l of [0,1])for(let i=0;i<18;i++){
    const before=frame(DURATION-h)[l].bars[i][end],home=frame(0)[l].bars[i][end],after=frame(h)[l].bars[i][end];
    assert.ok(Math.abs((after-home)/h)<1e-5);assert.ok(Math.abs((home-before)/h)<1e-5);
  }
}
assert.notDeepEqual(frame(8),frame(0));assert.notDeepEqual(frame(8)[0].bars[0].outer,frame(8)[1].bars[0].outer);
console.log('PASS: Skelton baseline, 36 stable IDs, square rails, cyclic order, loop continuity, strength range.');
