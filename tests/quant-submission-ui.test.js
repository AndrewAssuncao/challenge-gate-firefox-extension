'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../learning/engine'),C=require('../learning/curriculum');
function harness(skillId='code-pnl',saved) {
 const nodes=new Map(),configs=[],commands=[];let id=0,state=saved || E.empty(),draftWait;
 function node(){return {value:'',textContent:'',innerHTML:'',disabled:false,hidden:false,children:[],classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){},appendChild(c){this.children.push(c);return c;},replaceChildren(){this.children=[];},remove(){},addEventListener(){},removeEventListener(){},querySelector(){return null;},selectedOptions:[]};}
 const el=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const ctx=vm.createContext({document:{getElementById:el,createElement:node},crypto:{randomUUID:()=>`ui-${++id}`},QuantLearning:E,QuantCurriculum:C,
  PythonChallenge:{destroyWorker(){},async init(cfg){configs.push(cfg);el('python-editor').value=cfg.quantDraft || cfg.quantChallenge.starterCode;}},
  Gate:{hideContinuePrompt(){},showContinuePrompt(){}},browser:{runtime:{async sendMessage(request){
   commands.push(request.command);if(request.command.op==='draft' && draftWait)await draftWait;
   let result=E.apply(state,request.command,1000+id);
   if(request.command.op==='begin' && !saved){result.lesson.skillId=skillId;result.lesson.seed=3;result.lesson.level=0;}
   state=result.state;return result;
  }}}});
 let source=fs.readFileSync(require.resolve('../gate/quant.js'),'utf8').replace('return {init,destroy};','return {init,destroy,begin,attempt};');vm.runInContext(source,ctx);
 return {ui:vm.runInContext('QuantChallenge',ctx),el,configs,commands,get state(){return state;},text:()=>el('quant-submission').children.map(n=>n.textContent).join('\n'),
  holdDraft(){let release;draftWait=new Promise(resolve=>release=resolve);return ()=>{draftWait=null;release();};}};
}
test('coding pass/fail preserve original code and test results while completed/correction editors remain visible',async()=>{
 for(const correct of [false,true]) {
  const h=harness();await h.ui.init({},'python');const cfg=h.configs.at(-1),code='def pnl(q,e,x):\n    return q*(x-e)';h.el('python-editor').value=code;
  await cfg.onQuantResult(correct,{answer:code,output:'Test 1 (-3,12,10): expected 6, got '+(correct?'6':'0')});
  assert.equal(h.el('quant-submission').hidden,false);assert.match(h.text(),/Previous submission/);assert.ok(h.text().includes(code));assert.match(h.text(),/Test 1/);
  assert.equal(h.configs.at(-1).quantAssessing,false);
  if(!correct){await h.el('quant-next').onclick();assert.ok(h.text().includes(code));assert.equal(h.configs.at(-1).quantAssessing,true);}
 }
});
test('prior callbacks cannot grade a restarted lesson, and blank legacy feedback requires no snapshot migration',async()=>{
 const h=harness();await h.ui.init({},'python');const cfg=h.configs.at(-1);await h.ui.begin();const count=h.commands.length;
 await cfg.onQuantResult(true,{answer:'old code',output:'old tests'});assert.equal(h.commands.length,count);
 const initial=E.apply(E.empty(),{op:'begin',mode:'python'},1000);initial.lesson.skillId='code-pnl';initial.lesson.stage='teach';initial.lesson.draft='saved code';initial.lesson.feedback={correct:false,solution:'return quantity * (exit_price-entry_price)',assisted:false,stage:'diagnostic',eventId:'old'};
 const old=harness('code-pnl',initial.state);await old.ui.init({},'python');assert.equal(old.el('quant-submission').hidden,true);assert.equal(old.configs.at(-1).quantDraft,'saved code');assert.equal(old.configs.at(-1).quantAssessing,false);
});
test('component display shows correct final answer beside wrong construction/reason using original context',async()=>{
 const h=harness('brain-balance');await h.ui.init({},'brainteasers');h.el('quant-answer').value='2';h.el('quant-construction').value='1';h.el('quant-reason-choice').value='arithmetic';
 await h.ui.attempt(false);assert.match(h.text(),/Final answer — Correct/);assert.match(h.text(),/Incorrect/);assert.match(h.text(),/Reasoning choice — Incorrect/);assert.match(h.text(),/\n2\n/);
 const before=h.text();await h.el('quant-next').onclick();assert.equal(h.text(),before);
});
test('Check freezes numeric fields before queued autosave permits further editing',async()=>{
 const h=harness('brain-balance');await h.ui.init({},'brainteasers');
 h.el('quant-answer').value='2';h.el('quant-construction').value='1';h.el('quant-reason-choice').value='arithmetic';
 h.el('quant-form').onsubmit({preventDefault(){}});
 h.el('quant-answer').value='99';h.el('quant-construction').value='88';h.el('quant-reason-choice').value='tree';
 for(let i=0;i<3;i++)await new Promise(r=>setImmediate(r));
 assert.match(h.text(),/\n2\n/);assert.match(h.text(),/\n1\n/);assert.equal(h.state.events.find(e=>e.kind==='attempt').selectedReason,'arithmetic');
});
test('queued numeric submission ignores duplicate gestures, later hints and obsolete drafts',async()=>{
 const h=harness('brain-balance');await h.ui.init({},'brainteasers');const release=h.holdDraft();
 h.el('quant-answer').value='2';h.el('quant-construction').value='2';h.el('quant-reason-choice').value='tree';
 h.el('quant-answer').oninput({isComposing:false});await new Promise(r=>setImmediate(r));
 const saving=h.el('quant-form').onsubmit({preventDefault(){}});
 await h.el('quant-form').onsubmit({preventDefault(){}});await h.el('quant-learn').onclick();
 assert.equal(h.el('quant-hint').disabled,true);await h.el('quant-hint').onclick();
 h.el('quant-answer').value='99';h.el('quant-construction').value='99';h.el('quant-reason-choice').value='unsupported';
 h.el('quant-answer').oninput({isComposing:false});release();await saving;await new Promise(r=>setImmediate(r));
 const attempts=h.state.events.filter(e=>e.kind==='attempt');assert.equal(attempts.length,1);assert.equal(attempts[0].correct,true);assert.equal(attempts[0].assisted,false);
 assert.equal(h.commands.filter(c=>c.op==='attempt').length,1);assert.equal(h.commands.filter(c=>c.op==='draft').length,1);assert.equal(h.commands.some(c=>c.op==='assist'),false);
 assert.match(h.text(),/\n2\n/);assert.equal(h.el('quant-error').textContent,'');
});
test('Teach me freezes numeric work and actual editor code without fabricating output or component correctness',async()=>{
 for(const coding of [false,true]){
  const h=harness(coding?'code-pnl':'brain-balance');await h.ui.init({},coding?'python':'brainteasers');const release=h.holdDraft();
  const code='def pnl(q,e,x):\n    return 99\n';
  if(coding){h.el('python-editor').value=code;h.configs.at(-1).onQuantDraft(code);}
  else {h.el('quant-answer').value='2';h.el('quant-construction').value='2';h.el('quant-reason-choice').value='tree';h.el('quant-answer').oninput({isComposing:false});}
  await new Promise(r=>setImmediate(r));const saving=h.el('quant-learn').onclick();
  if(coding)h.el('python-editor').value='new unsubmitted edit';
  else {h.el('quant-answer').value='99';h.el('quant-construction').value='99';h.el('quant-reason-choice').value='unsupported';}
  release();await saving;const command=h.commands.find(c=>c.op==='attempt'),lesson=Object.values(h.state.lessons)[0];
  assert.equal(command.answer,coding?code:'2');assert.equal(command.output,undefined);assert.equal(lesson.feedback.submission.output,undefined);
  assert.ok(Object.values(lesson.feedback.components).every(v=>v==='unevaluated'));
  if(coding){assert.equal(command.draft,code);assert.equal(lesson.draft,code);assert.match(h.text(),/Submitted code — Not evaluated/);}
  else {assert.equal(command.construction,'2');assert.equal(command.reason,'tree');assert.match(h.text(),/Final answer — Not evaluated/);}
 }
});
test('restart discards a submission waiting behind autosave',async()=>{
 const h=harness('brain-balance');await h.ui.init({},'brainteasers');const release=h.holdDraft();
 h.el('quant-answer').value='2';h.el('quant-construction').value='2';h.el('quant-reason-choice').value='tree';h.el('quant-answer').oninput({isComposing:false});
 await new Promise(r=>setImmediate(r));const saving=h.el('quant-form').onsubmit({preventDefault(){}});
 await h.ui.begin();release();await saving;
 assert.equal(h.commands.some(c=>c.op==='attempt'),false);assert.equal(h.state.events.some(e=>e.kind==='attempt'),false);
});
test('queued coding drafts cannot overwrite a completed lesson or the next question',async()=>{
 for(const stage of ['diagnostic','guided']){
  const initial=E.apply(E.empty(),{op:'begin',mode:'python'},1000);initial.lesson.skillId='code-pnl';initial.lesson.stage=stage;initial.lesson.assisted=stage==='guided';
  const h=harness('code-pnl',initial.state);await h.ui.init({},'python');const cfg=h.configs.at(-1),release=h.holdDraft();
  h.el('python-editor').value='original editor';cfg.onQuantDraft('original editor');await new Promise(r=>setImmediate(r));
  const saving=cfg.onQuantResult(true,{answer:'submitted code',output:'All tests passed'}),late=cfg.onQuantDraft('obsolete editor');
  release();await saving;await late;
  assert.equal(h.commands.filter(c=>c.op==='draft').length,1);assert.equal(h.el('quant-error').textContent,'');
  assert.equal(Object.values(h.state.lessons)[0].draft,'');assert.ok(h.text().includes('submitted code'));
 }
});
