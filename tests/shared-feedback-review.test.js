'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const C=require('../learning/curriculum'),E=require('../learning/engine'),B=require('../background/backup');
const plain=x=>JSON.parse(JSON.stringify(x));
const baselineContext=vm.createContext({QuantCurriculum:C,module:{exports:{}},Date,console});
vm.runInContext(execFileSync('git',['show','a206b8de54d48c7efac14ba23726b02a8923f9dd:learning/engine.js'],{encoding:'utf8'}),baselineContext);
const before=baselineContext.module.exports;
function fixture(skillId='brain-balance',seed=0,level=0,stage='diagnostic') {
 const skill=C.get(skillId),key=`${skill.mode}:${skill.mode==='math'?skill.track:''}:practice`;
 const lesson={id:'lesson-10',key,skillId,mode:skill.mode,track:skill.mode==='math'?skill.track:'',stage,seed,level,revision:0,assisted:stage==='guided',draft:'',checks:0,required:2,harder:false,practice:true,startedAt:1000,stepStartedAt:1000};
 const state=E.empty();state.serial=10;state.lessons[key]=lesson;
 return {state,lesson,q:E.question(lesson)};
}
function command(f,fields={}) {
 return {op:'attempt',lessonId:f.lesson.id,revision:f.lesson.revision,eventId:'review-attempt',answer:String(f.q.answer),construction:String(f.q.construction?.answer ?? ''),reason:f.q.correctReason || '',...fields};
}
test('independent full numeric component matrix matches the PR4 grading/evidence and identifies each part',()=>{
 let cases=0;
 for(const skill of C.skills.filter(s=>s.mode!=='python'))for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const f=fixture(skill.id,seed,level),q=f.q;
  for(const answerWrong of [false,true])for(const reasonWrong of q.reasonOptions?[false,true]:[false])for(const constructionWrong of q.construction?[false,true]:[false]){
   const cmd=command(f,{answer:String(q.answer+(answerWrong?100:0)),reason:reasonWrong?q.reasonOptions.find(o=>o.value!==q.correctReason).value:q.correctReason || '',construction:String((q.construction?.answer || 0)+(constructionWrong?100:0))});
   const result=E.apply(f.state,cmd,2000),old=before.apply(f.state,cmd,2000),snapshot=result.lesson.feedback.submission;
   assert.deepEqual(result.state.events,plain(old.state.events),q.id);
   assert.deepEqual(E.evidence(result.state,skill.id),plain(before.evidence(old.state,skill.id)),q.id);
   assert.deepEqual(result.lesson.feedback.components,{answer:answerWrong?'incorrect':'correct',...(q.reasonOptions?{reason:reasonWrong?'incorrect':'correct'}:{}),...(q.construction?{construction:constructionWrong?'incorrect':'correct'}:{})},q.id);
   assert.equal(result.lesson.feedback.correct,!answerWrong&&!reasonWrong&&!constructionWrong,q.id);
   assert.equal(snapshot.prompt,q.prompt);assert.equal(snapshot.answer,cmd.answer);
   if(q.reasonOptions)assert.equal(snapshot.reason,q.reasonOptions.find(o=>o.value===cmd.reason).label);
   if(q.construction){assert.equal(snapshot.construction,cmd.construction);assert.equal(snapshot.constructionPrompt,q.construction.prompt);}
   if(q.table)for(const row of q.table.rows)assert.ok(snapshot.data.includes(row.join(' | ')),q.id);
   cases++;
  }
 }
 assert.equal(cases,2412);console.log(`${cases} independent numeric component cases preserve PR4 grading/evidence`);
});
test('failed snapshot remains detached through JSON reload, assist, guided draft, and teaching replacement',()=>{
 for(const id of ['brain-balance','brain-order','data-weighted','prob-method','market-options']){
  const f=fixture(id),failed=E.apply(f.state,command(f,{answer:'9999'}),2000),saved=plain(failed.lesson.feedback);
  let r=E.apply(plain(failed.state),{op:'begin',mode:f.lesson.mode,track:f.lesson.track,practice:true},2500);
  assert.deepEqual(r.lesson.feedback,saved);
  r=E.apply(r.state,{op:'continue',lessonId:r.lesson.id,revision:r.lesson.revision},3000);
  r=E.apply(r.state,{op:'draft',lessonId:r.lesson.id,revision:r.lesson.revision,value:'new draft',construction:'new construction',reason:'new reason'},3500);
  r=E.apply(r.state,{op:'assist',lessonId:r.lesson.id,revision:r.lesson.revision},4000);
  r=E.apply(r.state,{op:'teaching',lessonId:r.lesson.id,revision:r.lesson.revision,value:{skillId:id,stage:'guided',explanation:'A new explanation',workedExample:'Another example',connection:'Connection',nextStep:'Next step'}},4500);
  assert.deepEqual(r.lesson.feedback,saved,id);assert.deepEqual(failed.lesson.feedback,saved,id);
  assert.equal(r.lesson.draft,'new draft');assert.equal(r.lesson.constructionDraft,'new construction');
  const restored=B.parse(JSON.stringify(B.exportState({quantLearner:r.state}))).data.quantLearner;
  assert.deepEqual(restored,r.state,id);assert.deepEqual(B.recoveryState({quantLearner:r.state}).data.quantLearner.lessons[r.lesson.key].feedback,saved,id);
 }
});
test('all numeric Teach me components are unevaluated; absent old snapshots do not fabricate prior work',()=>{
 for(const skill of C.skills.filter(s=>s.mode!=='python')){
  const f=fixture(skill.id),r=E.apply(f.state,command(f,{dontKnow:true,answer:'<draft>',construction:'<unfinished>',reason:''}),2000);
  assert.ok(Object.values(r.lesson.feedback.components).every(v=>v==='unevaluated'));
  const legacy=plain(r.state);delete legacy.lessons[f.lesson.key].feedback.submission;delete legacy.lessons[f.lesson.key].feedback.components;
  const restored=B.parse(JSON.stringify(B.exportState({quantLearner:legacy}))).data.quantLearner;
  assert.deepEqual(restored,legacy);assert.equal(E.apply(restored,{op:'begin',mode:f.lesson.mode,track:f.lesson.track,practice:true},3000).lesson.feedback.submission,undefined);
 }
});
test('schema accepts every bounded string, rejects oversized/nested/extra fields, and keeps credential redaction',()=>{
 const f=fixture('code-pnl'),r=E.apply(f.state,command(f,{answer:'<script>&'.repeat(3000),output:'<output>&'.repeat(3000),correct:false}),2000),saved=r.lesson.feedback.submission;
 assert.equal(saved.answer.length,20000);assert.equal(saved.output.length,20000);
 const limits={prompt:12000,answer:20000,reason:1600,construction:100,constructionPrompt:1600,data:12000,output:20000};
 for(const [field,max] of Object.entries(limits)){
  const state=plain(r.state),s=state.lessons[f.lesson.key].feedback.submission;s[field]='x'.repeat(max);
  const backup=B.exportState({quantLearner:state});assert.equal(B.parse(JSON.stringify(backup)).data.quantLearner.lessons[f.lesson.key].feedback.submission[field].length,max);
  s[field]+='x';assert.throws(()=>B.exportState({quantLearner:state}),field);
  backup.data.quantLearner.lessons[f.lesson.key].feedback.submission[field]+='x';assert.throws(()=>B.parse(JSON.stringify(backup)),field);
 }
 for(const alteration of [{answer:{nested:'x'}},{unrecognized:'x'},{reason:['x']},{data:12}]){
  const state=plain(r.state);Object.assign(state.lessons[f.lesson.key].feedback.submission,alteration);assert.throws(()=>B.exportState({quantLearner:state}));
 }
 const extra=plain(r.state);extra.lessons[f.lesson.key].feedback.submission.unknown={secret:'drop me'};
 assert.equal(B.recoveryState({quantLearner:extra}).data.quantLearner.lessons[f.lesson.key].feedback.submission.unknown,undefined);
 const known='fixture-private-api-key';r.lesson.feedback.submission.answer='sk-ant-credential-fixture '+known;
 const redacted=B.exportState({quantLearner:r.state,settings:{anthropicApiKey:known}});assert.ok(!JSON.stringify(redacted).includes(known));assert.ok(!JSON.stringify(redacted).includes('sk-ant-credential-fixture'));
});
test('arbitrary imported feedback cannot qualify evidence or expand either tutor prompt',()=>{
 const f=fixture(),r=E.apply(f.state,command(f,{answer:'9999'}),2000),original=E.evidence(r.state,'brain-balance');
 const state=plain(r.state);state.lessons[f.lesson.key].feedback.submission={prompt:'private-prompt-marker',answer:'private-answer-marker',output:'private-output-marker'};
 state.lessons[f.lesson.key].feedback.components={answer:'correct',reason:'correct',construction:'correct'};state.lessons[f.lesson.key].feedback.correct=true;
 const restored=B.parse(JSON.stringify(B.exportState({quantLearner:state}))).data.quantLearner,l=restored.lessons[f.lesson.key];
 assert.deepEqual(E.evidence(restored,'brain-balance'),original);
 for(const history of [true,false])assert.doesNotMatch(E.prompt(restored,l,history),/private-(prompt|answer|output)-marker/);
 assert.equal(restored.events.at(-1).correct,false);assert.equal(restored.events.at(-1).submission,undefined);
});
function uiHarness(state,mode,track,holdDraft=false) {
 const nodes=new Map();let current=plain(state),releaseDraft;const grants=[],commands=[],configs=[];
 function node(tag){return {tag,children:[],value:'',textContent:'',innerHTML:'',hidden:false,disabled:false,classList:{add(){},remove(){},toggle(){}},selectedOptions:[],setAttribute(){},removeAttribute(){},appendChild(c){this.children.push(c);},replaceChildren(){this.children=[];},querySelector(){return null;},addEventListener(){},removeEventListener(){}};}
 const el=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const ctx=vm.createContext({document:{getElementById:el,createElement:node},QuantLearning:E,QuantCurriculum:C,crypto:{randomUUID:()=> 'review-ui'},
  PythonChallenge:{destroyWorker(){},async init(c){configs.push(c);el('python-editor').value=c.quantDraft || c.quantChallenge.starterCode;}},Gate:{hideContinuePrompt(){},showContinuePrompt(){grants.push(true);}},
  browser:{runtime:{sendMessage:async m=>{commands.push(plain(m.command));if(holdDraft&&m.command.op==='draft') {holdDraft=false;await new Promise(resolve=>{releaseDraft=resolve;});}const r=E.apply(current,m.command,5000);current=r.state;return r;}}}});
 const source=fs.readFileSync('gate/quant.js','utf8').replace('return {init,destroy};','return {init,destroy,begin};');
 vm.runInContext(source,ctx);
 return {ui:vm.runInContext('QuantChallenge',ctx),el,grants,mode,track,commands,configs,release:()=>releaseDraft?.(),get state(){return current;}};
}
test('shared renderer uses inert text and preserves prior context on guided retry/resume/fresh independent checks',async()=>{
 const f=fixture('data-weighted'),r=E.apply(f.state,command(f,{answer:'9999'}),2000),attack='<img src=x onerror=alert(1)>&"';
 r.lesson.feedback.submission.answer=attack.repeat(100);r.lesson.feedback.submission.data=attack;
 const snapshot=plain(r.lesson.feedback.submission),h=uiHarness(r.state,'math','arithmetic');await h.ui.init({},'math');
 const review=()=>h.el('quant-submission').children.map(n=>n.textContent).join('\n');
 const original=review();assert.ok(original.includes(snapshot.answer));assert.ok(original.includes(snapshot.prompt));assert.ok(original.includes(snapshot.data));
 assert.equal(h.el('quant-submission').hidden,false);for(const n of h.el('quant-submission').children)assert.equal(n.innerHTML,'');
 await h.el('quant-next').onclick();assert.equal(review(),original);h.el('quant-answer').value='new input';assert.equal(review(),original);assert.equal(h.grants.length,0);
 for(const stage of ['guided','check','review']){
  const saved=plain(r.state);saved.lessons[f.lesson.key].stage=stage;
  const reload=uiHarness(saved,'math','arithmetic');await reload.ui.init({},'math');
  assert.equal(reload.el('quant-submission').hidden,false);assert.ok(reload.el('quant-submission').children.some(n=>n.textContent===snapshot.prompt));
  assert.equal(reload.el('quant-feedback').hidden,stage!=='guided');assert.equal(reload.grants.length,0);
 }
});
test('queued duplicate Submit gestures produce one assessment and never grade the new question',async()=>{
 const f=fixture('brain-balance'),h=uiHarness(f.state,'brainteasers','',true);await h.ui.init({},'brainteasers');
 h.el('quant-answer').value='2';h.el('quant-construction').value='2';h.el('quant-reason-choice').value='tree';
 h.el('quant-answer').oninput({isComposing:false});await new Promise(resolve=>setImmediate(resolve));
 const first=h.el('quant-form').onsubmit({preventDefault(){}}),second=h.el('quant-form').onsubmit({preventDefault(){}});
 h.release();await first;await second;await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.commands.filter(c=>c.op==='attempt').length,1);assert.equal(h.state.events.filter(e=>e.kind==='attempt').length,1);
 assert.equal(h.state.events.find(e=>e.kind==='attempt').correct,true);assert.equal(h.grants.length,0);
});
test('restarting while a numeric submission waits for autosave discards its old request',async()=>{
 const f=fixture('brain-balance'),h=uiHarness(f.state,'brainteasers','',true);await h.ui.init({},'brainteasers');
 h.el('quant-answer').value='2';h.el('quant-construction').value='2';h.el('quant-reason-choice').value='tree';
 h.el('quant-answer').oninput({isComposing:false});await new Promise(resolve=>setImmediate(resolve));
 const submit=h.el('quant-form').onsubmit({preventDefault(){}});await h.ui.begin();h.release();await submit;
 assert.equal(h.commands.filter(c=>c.op==='attempt').length,0);assert.equal(h.state.events.filter(e=>e.kind==='attempt').length,0);assert.equal(h.grants.length,0);
});
test('a numeric draft queued after Submit cannot overwrite the later independent question',async()=>{
 const f=fixture('brain-balance'),h=uiHarness(f.state,'brainteasers','',true);await h.ui.init({},'brainteasers');
 h.el('quant-answer').value='2';h.el('quant-construction').value='2';h.el('quant-reason-choice').value='tree';
 h.el('quant-answer').oninput({isComposing:false});await new Promise(resolve=>setImmediate(resolve));
 const submit=h.el('quant-form').onsubmit({preventDefault(){}});
 h.el('quant-answer').value='99';h.el('quant-construction').value='99';h.el('quant-answer').oninput({isComposing:false});
 h.release();await submit;await new Promise(resolve=>setImmediate(resolve));
 const lesson=h.state.lessons[f.lesson.key];assert.equal(lesson.stage,'check');assert.notEqual(E.question(lesson).id,f.q.id);
 assert.equal(lesson.draft,'');assert.equal(lesson.feedback.submission.answer,'2');assert.equal(h.commands.filter(c=>c.op==='attempt').length,1);assert.equal(h.grants.length,0);
});
test('coding Teach me preserves the current editor contents even when the hidden numeric input is stale',async()=>{
 const f=fixture('code-pnl'),h=uiHarness(f.state,'python','');await h.ui.init({},'python');
 const code='def pnl(quantity, entry_price, exit_price):\n    return 99\n';h.el('python-editor').value=code;
 await h.configs.at(-1).onQuantDraft(code);
 assert.equal(h.state.lessons[f.lesson.key].draft,code);assert.equal(h.el('quant-answer').value,'');
 await h.el('quant-learn').onclick();
 const saved=h.state.lessons[f.lesson.key];
 assert.equal(saved.feedback.submission.answer,code);assert.equal(saved.draft,code);assert.equal(h.el('python-editor').value,code);
 assert.equal(saved.feedback.components.answer,'unevaluated');assert.equal(saved.feedback.submission.output,undefined);
 assert.equal(h.grants.length,0);
});
for(const action of ['Submit','Teach me'])test(`numeric ${action} freezes fields at the gesture while an earlier autosave is pending`,async()=>{
 const f=fixture('brain-balance'),h=uiHarness(f.state,'brainteasers','',true);await h.ui.init({},'brainteasers');
 h.el('quant-answer').value='2';h.el('quant-construction').value='2';h.el('quant-reason-choice').value='tree';
 h.el('quant-answer').oninput({isComposing:false});await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.commands.at(-1).op,'draft');
 if(action==='Submit')h.el('quant-form').onsubmit({preventDefault(){}});
 else h.el('quant-learn').onclick();
 h.el('quant-answer').value='99';h.el('quant-construction').value='99';h.el('quant-reason-choice').value='unsupported';
 h.release();await new Promise(resolve=>setImmediate(resolve));
 const submitted=h.commands.find(c=>c.op==='attempt');
 assert.equal(submitted.answer,'2');assert.equal(submitted.construction,'2');assert.equal(submitted.reason,'tree');
 const attempt=h.state.events.find(e=>e.kind==='attempt');
 assert.equal(attempt.correct,action==='Submit');assert.equal(attempt.dontKnow,action==='Teach me');
 if(action==='Teach me')assert.ok(Object.values(h.state.lessons[f.lesson.key].feedback.components).every(v=>v==='unevaluated'));
});
