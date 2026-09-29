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


// Editor schema: replace these provisional choices when motion designs are defined.
const SEQUENCES = [
  {id:'takeoff', label:'離陸', description:'静止から動き始める区間。', duration:5,
    variations:[['standard','基本','ためてから展開する動き。'],['soft','ゆっくり','穏やかに立ち上がる動き。'],['burst','素早く','短い予備動作から一気に展開する動き。']]},
  {id:'flight', label:'飛行', description:'動きを持続・反復する区間。', duration:8,
    variations:[['standard','基本','一定のリズムで繰り返す動き。'],['wave','波状','バーごとに時間差を付ける動き。'],['drift','ゆらぎ','強弱に変化を付ける動き。']]},
  {id:'landing', label:'着陸', description:'動きを収束させ、静止に戻る区間。', duration:6,
    variations:[['standard','基本','減速しながら閉じる動き。'],['soft','ソフト','余韻を残して静止する動き。'],['bounce','反動','小さな反動を経て静止する動き。']]}
];
const PARAMETER_GROUPS = [
  {label:'タイミング', fields:[
    {key:'duration',label:'区間の長さ',min:1,max:30,step:0.5,unit:'s'},
    {key:'delay',label:'バー間の時間差',min:0,max:0.5,step:0.01,unit:'s',value:0.05}
  ]},
  {label:'動きの大きさ', fields:[
    {key:'amplitude',label:'振幅',min:0,max:100,step:1,unit:'%',value:60},
    {key:'travel',label:'周方向の移動量',min:0,max:100,step:1,unit:'%',value:40},
    {key:'softness',label:'なめらかさ',min:0,max:100,step:1,unit:'%',value:70}
  ]},
  {label:'上下の関係', fields:[
    {key:'phase',label:'位相差',min:0,max:360,step:5,unit:'°',value:180},
    {key:'direction',label:'周方向',options:[['clockwise','時計回り'],['counterclockwise','反時計回り']],value:'clockwise'}
  ]}
];
function defaultStage(stage) {
  const parameters = Object.fromEntries(PARAMETER_GROUPS.flatMap(group=>group.fields.map(field=>[
    field.key,field.key==='duration'?stage.duration:field.value
  ])));
  return {id:stage.id, variation:'standard', parameters};
}
// Each stage retains its own draft when switching selection; persistence is in memory.
const editorState = {selected:'takeoff', stages:SEQUENCES.map(defaultStage)};
function activeStage() { return editorState.stages.find(stage=>stage.id===editorState.selected); }
function htmlElement(parent,tag,attributes={},text) {
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attributes))node.setAttribute(key,value);
  if(text!==undefined)node.textContent=text;
  parent.appendChild(node);
  return node;
}
function updateSequence() {
  let total=0;
  SEQUENCES.forEach((stage,index)=>{
    const draft=editorState.stages[index];
    const button=$('sequence-'+stage.id);
    const duration=draft.parameters.duration;
    total+=duration;
    button.setAttribute('aria-pressed',String(stage.id===editorState.selected));
    button.style.flexGrow=duration;
    button.querySelector('span').textContent=duration.toFixed(1)+' s';
  });
  $('totalDuration').textContent='合計 '+total.toFixed(1)+' s';
}
function updateVariationDescription() {
  const definition=SEQUENCES.find(stage=>stage.id===editorState.selected);
  $('variationDescription').textContent=definition.variations.find(v=>v[0]===activeStage().variation)[2];
}
function buildParameters() {
  $('parameters').replaceChildren();
  const draft=activeStage();
  for(const group of PARAMETER_GROUPS) {
    const section=htmlElement($('parameters'),'section',{class:'setting-section'});
    htmlElement(section,'h3',{},group.label);
    for(const field of group.fields) {
      const control=htmlElement(section,'div',{class:'parameter'});
      const row=htmlElement(control,'div',{class:'parameter-heading'});
      const inputId='param-'+field.key;
      htmlElement(row,'label',{for:inputId},field.label);
      if(field.options) {
        const select=htmlElement(control,'select',{id:inputId});
        for(const [value,label] of field.options)htmlElement(select,'option',{value},label);
        select.value=draft.parameters[field.key];
        select.addEventListener('change',()=>{draft.parameters[field.key]=select.value;});
        continue;
      }
      const numberField=htmlElement(row,'div',{class:'number-field'});
      const attrs={min:field.min,max:field.max,step:field.step};
      const number=htmlElement(numberField,'input',{...attrs,type:'number','aria-label':field.label+'（数値）'});
      htmlElement(numberField,'span',{},field.unit);
      const slider=htmlElement(control,'input',{...attrs,type:'range',id:inputId});
      number.value=slider.value=draft.parameters[field.key];
      const update=value=>{
        if(!Number.isFinite(value))return;
        const rounded=field.min+Math.round((value-field.min)/field.step)*field.step;
        const normalized=Number(Math.min(field.max,Math.max(field.min,rounded)).toFixed(3));
        draft.parameters[field.key]=normalized;
        number.value=slider.value=normalized;
        updateSequence();
      };
      slider.addEventListener('input',()=>update(slider.valueAsNumber));
      number.addEventListener('change',()=>{
        if(Number.isFinite(number.valueAsNumber))update(number.valueAsNumber);
        else number.value=draft.parameters[field.key];
      });
    }
  }
}
function selectStage(id) {
  editorState.selected=id;
  const index=SEQUENCES.findIndex(stage=>stage.id===id), definition=SEQUENCES[index];
  $('stageIndex').textContent='SEQUENCE / '+String(index+1).padStart(2,'0');
  $('stageName').textContent=definition.label;
  $('stageDescription').textContent=definition.description;
  $('variation').replaceChildren();
  for(const [value,label] of definition.variations)htmlElement($('variation'),'option',{value},label);
  $('variation').value=activeStage().variation;
  updateVariationDescription();
  buildParameters();
  updateSequence();
}
for(const [index,stage] of SEQUENCES.entries()) {
  const button=htmlElement($('sequence'),'button',{type:'button',id:'sequence-'+stage.id},`${index+1}. ${stage.label}`);
  htmlElement(button,'span');
  button.addEventListener('click',()=>selectStage(stage.id));
}
$('variation').addEventListener('change',()=>{
  activeStage().variation=$('variation').value;
  updateVariationDescription();
});
$('resetStage').addEventListener('click',()=>{
  const index=SEQUENCES.findIndex(stage=>stage.id===editorState.selected);
  editorState.stages[index]=defaultStage(SEQUENCES[index]);
  selectStage(editorState.selected);
});
selectStage(editorState.selected);
