'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{execFileSync}=require('node:child_process');
const C=require('../learning/curriculum'),E=require('../learning/engine');
const ids=['data-weighted','data-base','brain-order','prob-method'],DAY=86400000;
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
function permutations(xs){if(xs.length===1)return [xs];const result=[];for(let i=0;i<xs.length;i++)for(const tail of permutations(xs.slice(0,i).concat(xs.slice(i+1))))result.push([xs[i],...tail]);return result;}
function valid(order,rule){const [type,a,b]=rule,x=order.indexOf(a),y=order.indexOf(b);switch(type){case 'before':return x<y;case 'immediate':return y-x===1;case 'apart':return Math.abs(y-x)>1;case 'first':return x===0;case 'last':return x===order.length-1;case 'notFirst':return x>0;default:throw Error(type);}}
function oracle(q){
 const s=q.scenario;
 if(s.type==='counts'){const rows=q.table.rows.filter(r=>r[1]==='Live');return [100*rows.reduce((n,r)=>n+r[3],0)/rows.reduce((n,r)=>n+r[2],0),rows.reduce((n,r)=>n+r[2],0)];}
 if(s.type==='time'){const rows=q.table.rows.filter(r=>r[1]==='Current');const work=rows.reduce((n,r)=>n+r[2]*r[3],0);return [work/rows.reduce((n,r)=>n+r[2],0),work];}
 if(s.type==='aggregate'){const rows=q.table.rows.filter(r=>r[1]==='Paid'),before=rows.reduce((n,r)=>n+r[2],0),after=rows.reduce((n,r)=>n+r[3],0);return [100*(after-before)/before,before];}
 if(s.type==='reverse'){const rows=q.table.rows.filter(r=>r[1]==='Paid'),before=rows.map(r=>r[2]*100/(100+r[3]));return [before[0]+before[1],before[0]];}
 if(s.type==='orders'){const feasible=permutations(s.labels).filter(order=>s.rules.every(rule=>valid(order,rule))),witness=feasible.filter(order=>valid(order,s.claim));return [witness.length,feasible.length,witness.length===0?'impossible':witness.length===feasible.length?'must':'could'];}
 if(s.type==='independent')return [s.pA*s.pB,s.pB,'independent'];
 if(s.type==='without'){
  // Enumerate individual tokens, instead of reusing the generator's probability formula.
  const red=Array.from({length:s.red},(_,i)=>'r'+i),blue=Array.from({length:s.blue},(_,i)=>'b'+i),tokens=[...red,...blue];let total=0,both=0;
  for(const a of tokens)for(const b of tokens)if(a!==b){total++;if(a.startsWith('r')&&b.startsWith('r'))both++;}
  return [both/total,(s.red-1)/(tokens.length-1),'conditional'];
 }
 if(s.type==='replacement')return [(s.red/(s.red+s.blue))**2,s.red/(s.red+s.blue),'independent'];
 if(s.type==='conditional-table'){
  const [[,yesA,noA],[,yesOther,noOther]]=q.table.rows;return [yesA/(yesA+noA+yesOther+noOther),yesA/(yesA+noA),'conditional'];
 }
 // Enumerate overlapping events on ten equally likely atoms. Every attainable overlap
 // is represented by a size-P(B) subset of this population.
 const kA=Math.round(s.pA*10),kB=Math.round(s.pB*10),rates=[];
 for(let mask=0;mask<1024;mask++)if(mask.toString(2).replace(/0/g,'').length===kB){let overlap=0;for(let i=0;i<kA;i++)if(mask&(1<<i))overlap++;rates.push(overlap/(s.type==='conditional-bounds'?kB:10));}
 return [Math.max(...rates),s.type==='joint-bounds'?Math.min(...rates)/s.pA:Math.min(...rates),'insufficient'];
}
function attempt(state,id,seed,level,now,overrides={},stage='check'){
 const serial=state.serial+1,lesson={id:'d'+serial,key:'test',skillId:id,mode:C.get(id).mode,track:C.get(id).track,seed,level,stage,revision:0,assisted:false,checks:0,required:1,stepStartedAt:now};state.lessons.test=lesson;state.serial=serial;
 const q=E.question(lesson);return E.apply(state,{op:'attempt',lessonId:lesson.id,revision:0,eventId:'e'+serial,answer:q.answer,reason:q.correctReason,construction:q.construction?.answer,correct:true,...overrides},now);
}
test('every new item agrees with independent table, permutation and sample-space oracles',()=>{
 for(const id of ids)for(const level of [0,1])for(let seed=0;seed<18;seed++)for(const harder of [false,true]){
  const q=C.question(id,seed,harder,level),[answer,intermediate,method]=oracle(q);close(q.answer,answer);close(q.construction.answer,intermediate);if(method)assert.equal(q.correctReason,method);
  assert.ok(q.explanation&&q.workedExample&&q.hints.length===2&&q.solution&&q.reasonOptions);assert.equal(q.transfer,!!level);
  assert.ok(q.reasonOptions.some(o=>o.value===q.correctReason));
  if(q.table){assert.ok(q.table.caption&&q.table.headers.length);assert.ok(q.table.rows.length>=2);assert.ok(q.table.rows.every(r=>r.length===q.table.headers.length));}
  if(q.scenario.type==='counts')for(const row of q.table.rows){assert.ok(Number.isInteger(row[2])&&Number.isInteger(row[3]));assert.ok(row[3]<=row[2]);}
 }
});
test('transfer changes the calculation or constraint structure, and method coverage is explicit',()=>{
 for(const id of ids)for(let seed=0;seed<9;seed++){
  const a=C.question(id,seed,false,0),b=C.question(id,seed,false,1);assert.notEqual(a.semanticKey,b.semanticKey);assert.notEqual(a.familyId,b.familyId);
  if(id!=='brain-order')assert.notEqual(a.scenario.type,b.scenario.type);
  else assert.ok(b.scenario.rules.some(r=>['immediate','apart','first','notFirst'].includes(r[0])));
 }
 for(const id of ['brain-order','prob-method'])for(const level of [0,1])assert.deepEqual(new Set(Array.from({length:9},(_,seed)=>C.question(id,seed,false,level).methodTag)),new Set(C.get(id).requiredMethods));
});
test('negative oracles reject wrong weights, bases, constraints and unsupported probability methods',()=>{
 for(const id of ids)for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const q=C.question(id,seed,false,level),s=q.scenario,mutants=[];
  if(s.type==='counts')mutants.push(50*(s.sa/s.a+s.sb/s.b),100*(s.sa+s.sb+s.pilot)/(s.a+s.b+s.pilot));
  if(s.type==='time')mutants.push((s.rateA+s.rateB)/2,s.hoursA*s.rateA+s.hoursB*s.rateB);
  if(s.type==='aggregate')mutants.push(100*(s.laterA+s.laterB-s.a-s.b)/(s.laterA+s.laterB));
  if(s.type==='reverse')mutants.push(s.laterA+s.laterB,s.laterA*(1-s.changeA/100)+s.laterB*(1-s.changeB/100));
  if(s.type==='without')mutants.push((s.red/(s.red+s.blue))**2);
  if(s.type==='replacement')mutants.push(s.red/(s.red+s.blue)*(s.red-1)/(s.red+s.blue-1));
  if(s.type==='conditional-table')mutants.push(s.totalA/(s.totalA+s.totalOther)*(s.successA+s.successOther)/(s.totalA+s.totalOther));
  if(s.type==='joint-bounds')mutants.push(s.pA*s.pB);
  if(s.type==='conditional-bounds')mutants.push(s.pA);
  for(const answer of mutants){assert.ok(Math.abs(answer-q.answer)>q.tolerance,`${q.id}: ineffective mutant`);assert.equal(attempt(E.empty(),id,seed,level,1000,{answer}).state.events.at(-1).correct,false);}
  assert.equal(attempt(E.empty(),id,seed,level,1000,{reason:'unsupported-method'}).state.events.at(-1).correct,false);
  assert.equal(attempt(E.empty(),id,seed,level,1000,{construction:q.construction.answer+1}).state.events.at(-1).correct,false);
  if(s.type==='orders')assert.equal(attempt(E.empty(),id,seed,level,1000,{construction:24}).state.events.at(-1).correct,false);
 }
});
test('feedback diagnoses only an observed intermediate mismatch, with consistent parameters',()=>{
 for(const id of ids)for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const q=C.question(id,seed,false,level);
  const wrongFinal=attempt(E.empty(),id,seed,level,1000,{answer:q.answer+1000});assert.equal(wrongFinal.lesson.feedback.diagnosis,null);
  const unknown=attempt(E.empty(),id,seed,level,1000,{dontKnow:true,construction:q.feedbackRules?.[0]?.intermediate});assert.equal(unknown.lesson.feedback.diagnosis,null);
  for(const rule of q.feedbackRules||[]){assert.ok(Math.abs(rule.intermediate-q.construction.answer)>q.tolerance);const wrong=attempt(E.empty(),id,seed,level,1000,{construction:rule.intermediate});assert.equal(wrong.lesson.feedback.diagnosis,rule.message);assert.equal(wrong.lesson.stage,'teach');assert.equal(wrong.state.events.at(-1).construction,rule.intermediate);}
  const arbitrary=attempt(E.empty(),id,seed,level,1000,{construction:999999});assert.equal(arbitrary.lesson.feedback.diagnosis,null);
 }
 const q=C.question('prob-method',4);assert.match(C.diagnose(q,q.feedbackRules[0].intermediate),/6 remaining reds out of 10 tokens/);
 const base=C.question('data-base',2);assert.ok(C.diagnose(base,base.scenario.laterA+base.scenario.laterB).includes(String(base.scenario.a+base.scenario.b)));
});
test('a method/classification cannot be skipped when qualifying practice; invalidation removes coverage',()=>{
 for(const id of ['brain-order','prob-method']){
  const required=C.get(id).requiredMethods,missing=required.at(-1);let state=E.empty();
  for(const level of [0,1])for(let seed=0;seed<9;seed++)if(C.question(id,seed,false,level).methodTag!==missing)state=attempt(state,id,seed,level,1000).state;
  assert.ok(E.evidence(state,id).independent>=5);assert.equal(E.evidence(state,id).practiced,false);
  const seed=Array.from({length:9},(_,s)=>s).find(seed=>C.question(id,seed).methodTag===missing);state=attempt(state,id,seed,0,1000).state;assert.equal(E.evidence(state,id).practiced,true);
  const target=state.events.at(-1).id;state=E.apply(state,{op:'invalidate',target},1000).state;assert.equal(E.evidence(state,id).practiced,false);
 }
});
test('new teaching/error/hint paths survive reload and do not turn assistance into evidence',()=>{
 for(const id of ids){
  let r=attempt(E.empty(),id,1,0,1000,{answer:999999});assert.equal(r.lesson.stage,'teach');let state=JSON.parse(JSON.stringify(r.state)),lesson=r.lesson;
  r=E.apply(state,{op:'begin',mode:lesson.mode,track:lesson.track},1000); // separate natural-key begin cannot replace the test lesson
  assert.equal(r.state.lessons.test.stage,'teach');
  r=E.apply(state,{op:'continue',lessonId:lesson.id,revision:lesson.revision},1000);assert.equal(r.lesson.stage,'guided');const q=E.question(r.lesson);
  r=E.apply(JSON.parse(JSON.stringify(r.state)),{op:'attempt',lessonId:r.lesson.id,revision:r.lesson.revision,eventId:'guided',answer:q.answer,reason:q.correctReason,construction:q.construction.answer},1000);
  assert.equal(r.lesson.stage,'check');assert.equal(E.evidence(r.state,id).independent,0);assert.equal(r.state.events.at(-1).assisted,true);
  const independent=E.question(r.lesson);r=E.apply(r.state,{op:'assist',lessonId:r.lesson.id,revision:r.lesson.revision},1000);r=E.apply(r.state,{op:'attempt',lessonId:r.lesson.id,revision:r.lesson.revision,eventId:'hinted',answer:independent.answer,reason:independent.correctReason,construction:independent.construction.answer},1000);assert.equal(E.evidence(r.state,id).independent,0);
 }
});
test('canonical authored identity is independent of wording, seed and choice order',()=>{
 for(const id of ids)for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const q=C.question(id,seed,false,level);assert.equal(q.semanticKey,C.question(id,seed+9,true,level).semanticKey);
  assert.ok(q.semanticKey.includes(q.skillId));
 }
 // Sample original canonical keys across multiple residues; prose labels and new optional fields must
 // not silently invalidate lifetime evidence for existing content.
 const old=new Module(path.resolve(__dirname,'../learning/old-curriculum.js'));old.filename=path.resolve(__dirname,'../learning/old-curriculum.js');old.paths=module.paths;
 old._compile(execFileSync('git',['show','a4bc4f5:learning/curriculum.js'],{encoding:'utf8'}),old.filename);
 for(const skill of old.exports.skills)for(const level of [0,1])for(const harder of [false,true])for(let seed=0;seed<36;seed++)assert.equal(C.question(skill.id,seed,harder,level).semanticKey,old.exports.question(skill.id,seed,harder,level).semanticKey);
});
test('delayed reassessment keeps known content distinct and retention requires an unexposed interval',()=>{
 for(const id of ids){let state=E.empty();for(const level of [0,1])for(let seed=0;seed<9;seed++)state=attempt(state,id,seed,level,1000,{answer:999999}).state;
  for(const level of [0,1])for(let seed=0;seed<9;seed++)state=attempt(JSON.parse(JSON.stringify(state)),id,seed,level,8*DAY,{},'review').state;
  const e=E.evidence(state,id);assert.equal(e.practiced,true);assert.equal(e.recovered,true);assert.equal(e.novelIndependent,0);assert.equal(e.retained,false,'all first independent evidence arrived today');
  state=attempt(state,id,0,0,16*DAY,{},'review').state;assert.equal(E.evidence(state,id).retained,true);
  assert.equal(new Set(state.events.filter(e=>e.correct&&!e.assisted).map(e=>e.semanticKey)).size,18);
 }
});
test('pre-change saved learners retain old evidence and naturally reach all 30 units',()=>{
 const oldState=JSON.parse(JSON.stringify(require('./graph-fixture.cjs').state));assert.equal(oldState.version,1);
 const before=Object.fromEntries(C.skills.filter(s=>!ids.includes(s.id)).map(s=>[s.id,E.evidence(oldState,s.id)]));
 const read=E.apply(oldState,{op:'begin',mode:'math',track:'arithmetic'},1000);
 for(const [id,ev] of Object.entries(before))assert.deepEqual(E.evidence(read.state,id),ev);
 for(const id of ids)assert.equal(E.evidence(read.state,id).independent,0);
 let state=read.state,serial=0;
 for(const [mode,track] of [['math','arithmetic'],['math','probability'],['brainteasers',''],['python',''],['math','applied']]){
  const target=C.skills.filter(s=>s.mode===mode&&(!track||s.track===track));
  for(let i=0;i<200&&!target.every(s=>E.evidence(state,s.id).practiced);i++){
   let r=E.apply(JSON.parse(JSON.stringify(state)),{op:'begin',mode,track,practice:true,fresh:true},1000);state=r.state;let lesson=r.lesson;
   if(lesson.stage==='teach'){r=E.apply(state,{op:'continue',lessonId:lesson.id,revision:lesson.revision},1000);state=r.state;lesson=r.lesson;}
   const q=E.question(lesson);state=E.apply(state,{op:'attempt',lessonId:lesson.id,revision:lesson.revision,eventId:'old-save-'+(++serial),answer:q.answer,reason:q.correctReason,construction:q.construction?.answer,correct:true},1000).state;
  }
  for(const skill of target)assert.equal(E.evidence(state,skill.id).practiced,true,skill.id);
 }
 assert.equal(C.skills.filter(s=>E.evidence(state,s.id).practiced).length,30);
});
test('exhausted failed or hinted method banks recover with full coverage and no novel credit',()=>{
 for(const id of ['brain-order','prob-method'])for(const intervention of ['fail','hint']){
  let state=E.empty();for(const level of [0,1])for(let seed=0;seed<9;seed++)state=attempt(state,id,seed,level,1000,intervention==='fail'?{answer:999999}:{},intervention==='hint'?'guided':'check').state;
  assert.equal(E.evidence(state,id).independent,0);
  state=attempt(JSON.parse(JSON.stringify(state)),id,0,0,2000).state;assert.equal(E.evidence(state,id).independent,0);
  const missing=C.get(id).requiredMethods.at(-1);
  for(const level of [0,1])for(let seed=0;seed<9;seed++)if(C.question(id,seed,false,level).methodTag!==missing)state=attempt(JSON.parse(JSON.stringify(state)),id,seed,level,8*DAY).state;
  assert.equal(E.evidence(state,id).practiced,false);
  for(const level of [0,1])for(let seed=0;seed<9;seed++)if(C.question(id,seed,false,level).methodTag===missing)state=attempt(JSON.parse(JSON.stringify(state)),id,seed,level,8*DAY).state;
  const e=E.evidence(state,id);assert.equal(e.practiced,true);assert.equal(e.recovered,true);assert.equal(e.novelIndependent,0);assert.equal(e.independent,18);
 }
});
test('pre-follow-up candidate exposure aliases cannot become fake novel evidence',()=>{
 for(const ref of ['999d0b7','c57b081']){
 const filename=path.resolve(__dirname,'../learning/legacy-candidate-'+ref+'.js'),old=new Module(filename);old.filename=filename;old.paths=module.paths;old._compile(execFileSync('git',['show',ref+':learning/curriculum.js'],{encoding:'utf8'}),filename);
 for(const id of ids)for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const previous=old.exports.question(id,seed,false,level),q=C.question(id,seed,false,level);assert.equal(C.canonicalKey(previous.semanticKey),q.semanticKey);
  const state=E.empty();state.events.push({id:'prior-exposure',kind:'exposure',skillId:id,semanticKey:previous.semanticKey,at:1000});
  const r=attempt(state,id,seed,level,2000);assert.equal(r.state.events.at(-1).firstTry,false);assert.equal(r.state.events.at(-1).retest,false);assert.equal(E.evidence(r.state,id).independent,0);assert.equal(r.state.events[0].semanticKey,previous.semanticKey,'raw history retained');
  const delayed=attempt(state,id,seed,level,8*DAY);assert.equal(delayed.state.events.at(-1).retest,true);assert.equal(E.evidence(delayed.state,id).novelIndependent,0);
 }
 let state=E.empty();for(const level of [0,1])for(let seed=0;seed<9;seed++)state=attempt(state,'prob-method',seed,level,1000).state;
 for(const e of state.events){const parts=e.variant.split(':');e.semanticKey=old.exports.question(e.skillId,Number(parts[1]),false,Number(parts[2])).semanticKey;}
 assert.equal(E.evidence(state,'prob-method').practiced,true);const initial=E.evidence(state,'prob-method').independent;
 state=attempt(state,'prob-method',0,0,8*DAY).state;assert.equal(E.evidence(state,'prob-method').independent,initial,'old and new aliases replace one item');
 }
});
test('new prose improvements cannot create additional authored items',()=>{
 const filename=path.resolve(__dirname,'../learning/prose-edit.js'),edited=new Module(filename);edited.filename=filename;edited.paths=module.paths;
 edited._compile(fs.readFileSync(require.resolve('../learning/curriculum'),'utf8').replace('Service requests this week. Each request belongs to one row.','Service request counts. Rows are disjoint.').replace('what percentage of requests completed?','what percentage was completed?'),filename);
 for(const level of [0,1])for(let seed=0;seed<9;seed++)assert.equal(edited.exports.question('data-weighted',seed,false,level).semanticKey,C.question('data-weighted',seed,false,level).semanticKey);
});
test('human-rounded new answers and intermediates satisfy their explicit precision contract',()=>{
 for(const id of ids)for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const q=C.question(id,seed,false,level);assert.match(q.prompt,/4 decimal places/);
  const r=attempt(E.empty(),id,seed,level,1000,{answer:q.answer.toFixed(4),construction:q.construction.answer.toFixed(4)});assert.equal(r.state.events.at(-1).correct,true,q.id);
 }
});
test('guided repair and the next check preserve the failed method/classification family',()=>{
 for(const id of ['prob-method','brain-order'])for(const level of [0,1])for(let seed=0;seed<9;seed++){
  let r=attempt(E.empty(),id,seed,level,1000,{construction:99999}),original=C.question(id,seed,false,level);
  r=E.apply(JSON.parse(JSON.stringify(r.state)),{op:'continue',lessonId:r.lesson.id,revision:r.lesson.revision},1000);
  assert.equal(E.question(r.lesson).familyId,original.familyId);assert.equal(r.lesson.stage,'guided');const q=E.question(r.lesson);
  r=E.apply(r.state,{op:'attempt',lessonId:r.lesson.id,revision:r.lesson.revision,eventId:'guided-repair',answer:q.answer,construction:q.construction.answer,reason:q.correctReason},1000);
  assert.equal(E.question(r.lesson).familyId,original.familyId);assert.equal(r.lesson.stage,'check');assert.equal(E.evidence(r.state,id).independent,0);
 }
});
test('all three drafts persist through hints/teaching/resume and clear only for a new question',()=>{
 let r=E.apply(E.empty(),{op:'begin',mode:'math',track:'arithmetic'},1000),lesson=r.lesson;
 r=E.apply(r.state,{op:'draft',lessonId:lesson.id,revision:lesson.revision,value:'12',construction:'42',reason:'counts'},1000);
 r=E.apply(r.state,{op:'assist',lessonId:lesson.id,revision:r.lesson.revision},1000);
 r=E.apply(JSON.parse(JSON.stringify(r.state)),{op:'begin',mode:'math',track:'arithmetic'},1000);
 assert.equal(r.lesson.draft,'12');assert.equal(r.lesson.constructionDraft,'42');assert.equal(r.lesson.reasonDraft,'counts');assert.equal(r.lesson.assisted,true);
 const value={skillId:r.lesson.skillId,stage:r.lesson.stage,explanation:'Explanation',workedExample:'Different example',connection:'Connection',nextStep:'Guided practice'};
 r=E.apply(r.state,{op:'teaching',lessonId:lesson.id,revision:r.lesson.revision,value},1000);assert.equal(r.lesson.constructionDraft,'42');assert.equal(r.lesson.reasonDraft,'counts');
 r=E.apply(r.state,{op:'attempt',lessonId:lesson.id,revision:r.lesson.revision,eventId:'draft-failure',dontKnow:true},1000);assert.equal(r.lesson.draft,'12');assert.equal(r.lesson.constructionDraft,'42');assert.equal(r.lesson.reasonDraft,'counts');assert.equal(r.lesson.stage,'teach');
 r=E.apply(JSON.parse(JSON.stringify(r.state)),{op:'continue',lessonId:r.lesson.id,revision:r.lesson.revision},1000);assert.equal(r.lesson.draft,'');assert.equal(r.lesson.constructionDraft,'');assert.equal(r.lesson.reasonDraft,'');
});
test('new engine retains exactly the prior engine evidence for original saved skills',()=>{
 const filename=path.resolve(__dirname,'../learning/old-engine.js'),old=new Module(filename);old.filename=filename;old.paths=module.paths;old._compile(execFileSync('git',['show','a4bc4f5:learning/engine.js'],{encoding:'utf8'}),filename);
 const saved=JSON.parse(JSON.stringify(require('./graph-fixture.cjs').state));
 for(const skill of C.skills.filter(s=>!ids.includes(s.id)))assert.deepEqual(E.evidence(saved,skill.id),old.exports.evidence(saved,skill.id));
});
test('both earlier candidate versions normalize every exposure and attempt identity',()=>{
 for(const ref of ['999d0b7','c57b081']){
  const filename=path.resolve(__dirname,'../learning/legacy-'+ref+'.js'),old=new Module(filename);old.filename=filename;old.paths=module.paths;old._compile(execFileSync('git',['show',ref+':learning/curriculum.js'],{encoding:'utf8'}),filename);
  for(const id of ids)for(const level of [0,1])for(let seed=0;seed<9;seed++){
   const previous=old.exports.question(id,seed,false,level),q=C.question(id,seed,false,level);assert.equal(C.canonicalKey(previous.semanticKey),q.semanticKey);
   const event={kind:'attempt',skillId:id,variant:previous.id,semanticKey:previous.semanticKey,familyId:previous.familyId,methodTag:previous.methodTag??null,isTransfer:previous.transfer};assert.equal(C.validateItemIdentity(event),true);
  }
 }
});
test('method choices make distinct claims and every item uses the same uncertainty protocol',()=>{
 for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const q=C.question('prob-method',seed,false,level);assert.match(q.prompt,/If the requested probability is not uniquely determined, enter its largest possible value/);assert.match(q.construction.prompt,/If multiple values fit the stated facts, enter the smallest/);
  assert.match(q.reasonOptions.find(o=>o.value==='conditional').label,/conditional rate differs from its marginal/);
  const r=attempt(E.empty(),'prob-method',seed,level,1000,{reason:q.correctReason==='independent'?'conditional':'independent'});assert.equal(r.state.events.at(-1).correct,false);
  if(q.scenario.type==='replacement'){assert.doesNotMatch(q.prompt,/independen/i);assert.match(q.prompt,/choose uniformly from all \d+ tokens in the restored bag/);assert.match(q.hints[0],/depend on the first color/);}
 }
 for(const [seed,expected] of [[2,0],[5,.5],[8,.25]])close(C.question('prob-method',seed,false,0).construction.answer,expected);
});
test('cross-key and invalidated repairs use the actual affected method family',()=>{
 for(const id of ['prob-method','brain-order'])for(const level of [0,1])for(let seed=0;seed<9;seed++){
  let state=E.empty();
  const prerequisites=new Set();function add(skill){for(const p of C.get(skill).prerequisites)if(!prerequisites.has(p)){prerequisites.add(p);add(p);}}add(id);
  for(const p of prerequisites)for(const level of [0,1])for(let seed=0;seed<9;seed++)state=attempt(state,p,seed,level,1000).state;
  let r=attempt(state,id,seed,level,1000,{construction:9999}),failed=E.question(r.lesson);
  r=E.apply(r.state,{op:'begin',mode:C.get(id).mode,track:C.get(id).track,settingsGate:true},1000);assert.equal(r.lesson.stage,'teach');assert.equal(E.question(r.lesson).familyId,failed.familyId);
  r=E.apply(r.state,{op:'continue',lessonId:r.lesson.id,revision:r.lesson.revision},1000);assert.equal(E.question(r.lesson).familyId,failed.familyId);
  r=attempt(E.empty(),id,seed,level,1000);const target=r.state.events.at(-1);r=E.apply(r.state,{op:'invalidate',target:target.id,lessonId:target.lessonId},1000);assert.equal(E.question(r.lesson).familyId,target.familyId);
 }
});
test('supported method-tag spoof and inconsistent imported item metadata cannot qualify evidence',()=>{
 let state=E.empty();for(const level of [0,1])for(let seed=0;seed<9;seed++)if(C.question('prob-method',seed,false,level).methodTag!=='insufficient')state=attempt(state,'prob-method',seed,level,1000).state;
 assert.equal(E.evidence(state,'prob-method').practiced,false);const e=state.events.find(e=>e.correct&&e.methodTag==='independent');assert.equal(C.validateItemIdentity(e),true);
 e.methodTag='insufficient';assert.equal(C.validateItemIdentity(e),false);assert.equal(E.evidence(state,'prob-method').practiced,false);
 const q=C.question('prob-method',2,false,0);Object.assign(e,{methodTag:q.methodTag,familyId:q.familyId,semanticKey:q.semanticKey});assert.equal(C.validateItemIdentity(e),false,'variant must agree, too');
 const valid=attempt(E.empty(),'prob-method',2,0,1000).state.events.at(-1);for(const mutation of [{variant:'prob-method:9:0'},{familyId:'unrelated'},{isTransfer:true},{semanticKey:'fake'},{methodTag:'independent'}])assert.equal(C.validateItemIdentity({...valid,...mutation}),false);
 assert.equal(C.validateItemIdentity({...valid,skillId:'prob-independent',methodTag:'conditional'}),false);
});
test('authored content guard detects changes to math, constraints and visible table data',()=>{
 const snapshot=require('./decision-bank-snapshot.json');assert.equal(snapshot.items.length,72);
 const items=[];for(const id of ids)for(const level of [0,1])for(let seed=0;seed<9;seed++){const q=C.question(id,seed,false,level);items.push({key:q.semanticKey,scenario:q.scenario,answer:q.answer,intermediate:q.construction.answer,rows:q.table?.rows||null,headers:q.table?.headers||null,method:q.correctReason});}
 assert.deepEqual(items,snapshot.items,'A math/data change requires explicit identity and historical-evidence review, not an unnoticed prose edit.');
});
