'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const E=require('../learning/engine'), C=require('../learning/curriculum'), Store=require('../learning/store');
const DAY=86400000;
function session(mode='math',track='arithmetic') {
  let state=E.empty(), lesson, time=1000, serial=0;
  const run=cmd=>{const r=E.apply(state,{lessonId:lesson?.id,revision:lesson?.revision,...cmd},time);state=r.state;lesson=r.lesson;return r;};
  return {run,begin:(fresh=true)=>run({op:'begin',mode,track,fresh}),answer:(correct=true)=>run({op:'attempt',eventId:'e'+(++serial),answer:correct?E.question(lesson).answer:123456,reason:E.question(lesson).correctReason,construction:E.question(lesson).construction?.answer,correct}),get state(){return state;},get lesson(){return lesson;},set time(n){time=n;}};
}
test('diagnostic → explanation → guided practice → independent check survives reload',()=>{
 const h=session();h.begin();assert.equal(h.lesson.stage,'diagnostic');h.answer(false);assert.equal(h.lesson.stage,'teach');
 h.run({op:'continue'});assert.equal(h.lesson.stage,'guided');h.answer();assert.equal(h.lesson.stage,'check');
 assert.equal(E.evidence(h.state,'arith-percent').independent,0);
 const resumed=E.apply(JSON.parse(JSON.stringify(h.state)),{op:'begin',mode:'math',track:'arithmetic'});
 assert.equal(resumed.lesson.id,h.lesson.id);assert.equal(resumed.lesson.stage,'check');
 h.answer();assert.equal(h.lesson.stage,'done');assert.equal(E.evidence(h.state,'arith-percent').independent,1);
});
test('five varied assessments unlock prerequisite, only seven-day review establishes retention',()=>{
 const h=session();for(let i=0;i<5;i++){h.begin();h.answer();}
 assert.equal(E.evidence(h.state,'arith-percent').status,'practiced');assert.equal(E.select(h.state,'math','arithmetic',1000).skill.id,'arith-fraction');
 h.time=7*DAY+2000;h.begin();assert.equal(h.lesson.stage,'review');assert.equal(h.lesson.skillId,'arith-percent');h.answer();
 assert.equal(E.evidence(h.state,'arith-percent').status,'retained');
});
test('hints and custom teaching never count as independent mastery',()=>{
 const h=session();h.begin();h.run({op:'assist'});h.answer();assert.equal(h.lesson.stage,'check');assert.equal(E.evidence(h.state,'arith-percent').independent,0);
});
test('independent math tracks do not inherit mastery',()=>{
 const h=session();h.begin();h.answer();h.begin();h.answer();
 const r=E.apply(h.state,{op:'begin',mode:'math',track:'probability'});assert.equal(r.lesson.skillId,'prob-complement');assert.equal(E.evidence(r.state,'prob-complement').attempts,0);
});
test('invalidated evidence reopens prerequisites without inventing replacements',()=>{
 const h=session();for(let i=0;i<5;i++){h.begin();h.answer();}assert.equal(E.evidence(h.state,'arith-percent').practiced,true);
 h.run({op:'invalidate',target:h.state.events.at(-1).id});assert.equal(E.evidence(h.state,'arith-percent').practiced,false);
 assert.equal(E.select(h.state,'math','arithmetic',2000).skill.id,'arith-percent');
});
test('settings gate requires two independent checks',()=>{
 const h=session();h.run({op:'begin',mode:'math',track:'arithmetic',settingsGate:true});h.answer();assert.equal(h.lesson.stage,'check');h.answer();assert.equal(h.lesson.stage,'done');
});
test('numeric input accepts fractions but rejects coercion and nonfinite input',()=>{
 assert.equal(E.parseNumber(' 3/8 '),.375);for(const x of ['', 'Infinity','NaN','0/0','0x10','1+1','1e999'])assert.equal(E.parseNumber(x),null);
});
test('attempt retries are idempotent and stale tabs cannot replace evidence',()=>{
 const h=session();h.begin();const before=h.lesson;
 const cmd={op:'attempt',lessonId:before.id,revision:before.revision,eventId:'retry',answer:E.question(before).answer};
 const a=E.apply(h.state,cmd);const b=E.apply(a.state,cmd);assert.equal(b.state.events.length,1);assert.equal(b.duplicate,true);
 assert.throws(()=>E.apply(a.state,{...cmd,eventId:'other'}),/another tab/);
});
test('serialized store retains independent tabs and rejects failed writes before ack',async()=>{
 let saved={},fail=false;const storage={get:async()=>structuredClone(saved),set:async value=>{if(fail)throw Error('disk full');saved=structuredClone({...saved,...value});}};
 const store=Store.create(storage);
 const [a,b]=await Promise.all([store.command({op:'begin',mode:'math',track:'arithmetic'}),store.command({op:'begin',mode:'brainteasers'})]);
 assert.equal(Object.keys(saved.quantLearner.lessons).length,2);
 fail=true;await assert.rejects(store.command({op:'assist',lessonId:a.lesson.id,revision:a.lesson.revision}),/disk full/);assert.equal(saved.quantLearner.lessons[a.lesson.key].assisted,false);
 fail=false;await store.command({op:'assist',lessonId:b.lesson.id,revision:b.lesson.revision});
 const reopened=Store.create(storage);assert.equal((await reopened.command({op:'read'})).state.lessons[b.lesson.key].assisted,true);
});
test('unknown schema is not silently reset',async()=>{
 let writes=0;const store=Store.create({get:async()=>({quantLearner:{version:99}}),set:async()=>writes++});
 await assert.rejects(store.command({op:'begin',mode:'math'}),/Unsupported/);assert.equal(writes,0);
});
test('generated teaching must match selected skill and phase and contain complete prose',()=>{
 const h=session();h.begin();const valid={skillId:h.lesson.skillId,stage:h.lesson.stage,explanation:'Explain',workedExample:'Example',connection:'Foundation',nextStep:'Practice'};
 assert.deepEqual(E.validateTeaching(JSON.stringify(valid),h.lesson),valid);
 for(const x of ['not json',{}, {...valid,skillId:'other'}, {...valid,stage:'done'}, {...valid,workedExample:''}, {...valid,explanation:'<script>bad</script>'}]) assert.throws(()=>E.validateTeaching(x,h.lesson));
});
test('AI context includes actual mistakes, assistance, prerequisites and fixed assessment',()=>{
 const h=session();h.begin();h.answer(false);const p=E.prompt(h.state,h.lesson);assert.match(p,/answer mismatch/);assert.match(p,/prerequisites/);assert.match(p,/answer key/);
});
test('all curriculum IDs, dependencies and generated questions are valid',()=>{
 assert.equal(new Set(C.skills.map(s=>s.id)).size,C.skills.length);
 for(const s of C.skills){for(const id of s.prerequisites)assert.ok(C.get(id));for(let seed=1;seed<20;seed++){const q=C.question(s.id,seed);assert.ok(q.solution);if(q.kind==='number')assert.ok(Number.isFinite(q.answer));else assert.ok(q.testCases.length>=3);}}
});
function legacy(){const c=vm.createContext({console,Date});for(const f of ['spaced-repetition.js','challenge-provider.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../gate',f),'utf8'),c);return vm.runInContext('ChallengeProvider',c);}
test('legacy local bank has valid topics; assisted passes do not advance',()=>{
 const P=legacy(),bank=require('../gate/challenges/python-problems.json');for(const q of bank)assert.ok(P.CURRICULUM.some(t=>t.id===q.topic));
 const p=P.defaultProfile();for(let i=0;i<2;i++)P.updateProfileAfterChallenge(p,{id:'help'+i,topic:'basics'},true,'local',true,true);
 assert.equal(p.currentTopicIndex,0);
});
test('legacy invalidation reopens topic and resets confidence',()=>{
 const P=legacy(),p=P.defaultProfile(),q={id:'bad',topic:'basics'};
 for(let i=0;i<4;i++)P.updateProfileAfterChallenge(p,q,true,'local',false,false);
 assert.ok(p.currentTopicIndex>0);P.removeChallengeAttempts(p,q);assert.equal(p.currentTopicIndex,0);
});
test('ten hinted answers never produce readiness',()=>{
 const h=session();h.begin();for(let i=0;i<10;i++){h.run({op:'assist'});h.answer();}
 assert.equal(E.evidence(h.state,'arith-percent').independent,0);assert.equal(E.evidence(h.state,'arith-percent').practiced,false);
});
test('five same-template answers cannot substitute for transfer',()=>{
 const h=session();h.begin();h.answer();const s=structuredClone(h.state),e=s.events[0];
 s.events=Array.from({length:5},(_,i)=>({...e,id:'clone'+i,lessonId:'other'+i,variant:'v'+i,familyId:'foundation',isTransfer:false}));
 assert.equal(E.evidence(s,'arith-percent').practiced,false);
});
test('cross-track prerequisites select honest diagnostics instead of crediting math',()=>{
 const h=session('python','');for(let i=0;i<5;i++){h.begin();h.answer();}
 h.begin();assert.equal(h.lesson.skillId,'prob-complement');assert.match(h.lesson.reason,/Prerequisite/);assert.equal(E.evidence(h.state,'prob-ev').attempts,0);
});
test('brainteaser number without a correct reason cannot pass',()=>{
 const h=session('brainteasers','');h.begin();const q=E.question(h.lesson);
 h.run({op:'attempt',eventId:'bad-reason',answer:q.answer,reason:'unsupported'});
 assert.equal(h.lesson.stage,'teach');assert.equal(h.state.events[0].error,'reason mismatch');
});
test('transfer questions change the task structure and include oracles',()=>{
 for(const skill of C.skills){const a=C.question(skill.id,2,false,0),b=C.question(skill.id,2,false,1);assert.notEqual(a.prompt,b.prompt);assert.notEqual(a.familyId,b.familyId);assert.equal(b.transfer,true);}
 assert.equal(C.question('prob-conditional',2,false,1).answer,2/3);
 assert.equal(C.question('prob-bayes',2,false,1).answer,8/17);
 assert.equal(C.question('brain-invariant',2,false,1).answer,2);
});
test('raw export preserves unsupported schema for recovery',async()=>{
 const raw={version:99,important:'keep me'};const store=Store.create({get:async()=>({quantLearner:raw}),set:async()=>{throw Error('must not write');}});
 assert.deepEqual((await store.command({op:'export'})).state,raw);
});
test('repeated content across lessons cannot invent independent evidence',()=>{
 const h=session('brainteasers','');for(let i=0;i<15;i++){h.begin();h.answer();}
 const independent=h.state.events.filter(e=>e.kind==='attempt' && e.firstTry && !e.assisted);
 assert.equal(new Set(independent.map(e=>e.semanticKey)).size,independent.length);
 const q=C.question('code-simulation',1,false,1),same=C.question('code-simulation',1,false,1);
 assert.equal(q.semanticKey,same.semanticKey);
 const old=structuredClone(h.state);old.events.forEach(e=>{e.contentVersion=1;});
 for(const s of C.skills)assert.equal(E.evidence(old,s.id).practiced,false);
});
test('durable evidence can be invalidated after its lesson is replaced',()=>{
 const h=session();h.begin();h.answer();const target=h.state.events[0].id;h.begin();
 const active=structuredClone(h.lesson);const r=E.apply(h.state,{op:'invalidate',target});
 assert.deepEqual(r.state.lessons[active.key],active);assert.equal(E.evidence(r.state,'arith-percent').independent,0);
 assert.equal(E.apply(r.state,{op:'invalidate',target}).state.events.length,r.state.events.length);
});
test('activity derives completed quant lessons and time without mutating legacy logs',()=>{
 const h=session('python','');h.begin();h.time=6000;h.answer();
 const d=new Date(6000),day=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const legacy={[day]:{typing:2,totalTime:10}};
 const a=E.activity(h.state,legacy);assert.equal(a[day].python,1);assert.equal(a[day].totalTime,15);
 assert.deepEqual(E.activity(h.state,legacy),a);assert.deepEqual(legacy,{[day]:{typing:2,totalTime:10}});
 const duplicate=structuredClone(h.state);duplicate.events.push(duplicate.events[0]);assert.deepEqual(E.activity(duplicate,legacy),a);
});
test('construction objectives require a correct intermediate check',()=>{
 for(const id of ['brain-pigeon','brain-balance','brain-invariant','brain-bounds'])for(const level of [0,1]){
  const q=C.question(id,3,false,level);assert.ok(q.construction);
  const h=session('brainteasers','');h.begin();const state=structuredClone(h.state),lesson=state.lessons[h.lesson.key];lesson.skillId=id;lesson.level=level;
  const item=E.question(lesson);const r=E.apply(state,{op:'attempt',lessonId:lesson.id,revision:lesson.revision,eventId:'construction',answer:item.answer,reason:item.correctReason,construction:item.construction.answer+1});
  assert.equal(r.state.events.at(-1).correct,false);assert.equal(r.state.events.at(-1).error,'construction mismatch');
 }
});
test('transfer hints describe the transfer task rather than the foundation',()=>{
 assert.match(C.question('brain-invariant',1,false,1).hints.join(' '),/3|three/i);
 assert.match(C.question('brain-pigeon',1,false,1).hints.join(' '),/three|triple|2/i);
 assert.match(C.question('arith-percent',1,false,1).hints.join(' '),/divid|original/i);
});
test('perfect learner reaches every foundation skill without repeated-content credit',()=>{
 const reached=new Set();
 for(const [mode,track] of [['math','arithmetic'],['math','probability'],['python',''],['brainteasers','']]){
  const h=session(mode,track);const targets=C.skills.filter(s=>s.mode===mode && (!track || s.track===track));
  for(let i=0;i<160 && !targets.every(s=>E.evidence(h.state,s.id).practiced);i++){
   h.begin();h.answer();
  }
  for(const skill of targets){assert.equal(E.evidence(h.state,skill.id).practiced,true,`${mode}: ${skill.id} stalled`);reached.add(skill.id);}
  const novel=h.state.events.filter(e=>e.kind==='attempt' && e.firstTry);
  assert.equal(new Set(novel.map(e=>e.semanticKey)).size,novel.length);
  for(const skill of targets)assert.equal(E.evidence(h.state,skill.id).retained,false,'readiness is not retention');
 }
 assert.equal(reached.size,21);
});
