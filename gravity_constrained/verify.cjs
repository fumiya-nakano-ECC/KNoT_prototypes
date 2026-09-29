// Run with: node gravity_constrained/verify.cjs
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=fs.readFileSync(`${__dirname}/skeleton.js`,'utf8');
const mock=()=>({value:'overlay',checked:false,dataset:{},listeners:{},setAttribute(){},removeAttribute(){},appendChild(){},replaceChildren(){},addEventListener(event,fn){this.listeners[event]=fn;},classList:{toggle(){}}});
const elements=new Map();
const buttons=Array.from({length:4},mock);
const context=vm.createContext({document:{getElementById(id){if(!elements.has(id))elements.set(id,mock());return elements.get(id);},createElementNS:mock,querySelectorAll:()=>buttons,addEventListener(){}},matchMedia:()=>({matches:true}),requestAnimationFrame(){}});
vm.runInContext(source,context);
const evaluate=code=>vm.runInContext(code,context);
let minGap=1,checkedFrames=0;
for(const profile of ['defaults','minimum','maximum','mixed']){
  evaluate('parameters=defaultParameters()');
  if(profile!=='defaults')evaluate(`parameterSpecs.forEach((stage,i)=>stage.fields.forEach(([key,,min,max],j)=>{parameters[i][key]=${profile==='minimum'?'min':profile==='maximum'?'max':'(i+j)%2?min:max'};}))`);
  const total=evaluate('duration()');
  for(let frame=0;frame<=total*120;frame++){
    checkedFrames++;
    evaluate(`updateGeometry(${frame/120})`);
  const layers=evaluate('geometry');
  assert.equal(layers.length,2);
  for(const layer of layers){
    assert.equal(layer.bars.length,18);
    for(const [key,half] of [['outer',0.5],['inner',0.327]]){
      let sum=0;
      layer.bars.forEach((bar,i)=>{
        assert.equal(bar.id,`${layer.id}-${String(i+1).padStart(2,'0')}`);
        const [x,y]=bar[key];
        assert.ok(Number.isFinite(x)&&Number.isFinite(y));
        assert.ok(Math.abs(Math.max(Math.abs(x),Math.abs(y))-half)<1e-12,'Endpoint must stay on its square rail');
        const gap=((layer.bars[(i+1)%18][`${key}Phase`]-bar[`${key}Phase`])%1+1)%1;
        assert.ok(gap>0,'Endpoints must remain separated');
        sum+=gap;minGap=Math.min(minGap,gap);
      });
      assert.ok(Math.abs(sum-1)<1e-10,'IDs must retain circular order');
    }
  }
  }
  evaluate('updateGeometry(0)');
  const initial=JSON.stringify(evaluate('geometry'));
  evaluate(`updateGeometry(${total})`);
  assert.equal(JSON.stringify(evaluate('geometry')),initial,'Loop must close at the initial geometry');
  for(const boundary of evaluate('[stageStart(1),stageStart(2),stageStart(3),duration()]')){
    assert.ok(Math.abs(evaluate(`weightAt(${boundary}-1e-7)-weightAt(${boundary}+1e-7)`))<1e-5,'Sequence boundaries must be continuous');
  }
}
evaluate('parameters=defaultParameters()');
assert.ok(evaluate('weightAt(3.4)')>2);
assert.ok(evaluate('weightAt(12)')<-1);
// Exercise the actual input and button handlers with a paused animation.
evaluate('elapsed=7.5');
elements.get('parameter-1-duration').value='10';
elements.get('parameter-1-duration').listeners.input();
assert.equal(evaluate('elapsed'),10);
assert.equal(evaluate('duration()'),29);
assert.equal(elements.get('seek').max,29);
assert.equal(elements.get('parameter-1-duration-value').textContent,'10.0 s');
buttons[2].listeners.click();
assert.equal(evaluate('elapsed'),15,'Stage jump must use edited durations');
elements.get('parameter-0-weight').value='1';
elements.get('parameter-0-weight').listeners.input();
assert.equal(evaluate('weightAt(stageStart(1))'),1,'Strength input must change motion');
elements.get('seek').value='29';
elements.get('seek').listeners.input();
assert.equal(evaluate('elapsed'),29);
elements.get('resetParameters').listeners.click();
assert.equal(evaluate('elapsed'),0);
assert.equal(evaluate('duration()'),24);
assert.equal(evaluate('parameters[0].weight'),2.15);
assert.equal(evaluate('playing'),false,'Reset must preserve pause');
console.log(`PASS: ${checkedFrames} frames across defaults, minimum, maximum and mixed parameters; rail constraints, loop and sequence continuity; input, timing, stage jump, seek and reset handlers. Minimum phase gap: ${minGap.toFixed(6)}`);
