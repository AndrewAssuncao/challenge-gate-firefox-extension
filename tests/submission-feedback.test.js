'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../learning/engine'),C=require('../learning/curriculum'),B=require('../background/backup');
function fixture(skillId='brain-balance') {
 const r=E.apply(E.empty(),{op:'begin',mode:'brainteasers'},1000),l=r.lesson;
 l.skillId=skillId;l.seed=3;l.level=0;
 return {...r,q:E.question(l)};
}
function attempt(r,fields={}) {return E.apply(r.state,{op:'attempt',lessonId:r.lesson.id,revision:r.lesson.revision,eventId:'feedback-fixture',answer:'2',construction:'2',reason:'tree',...fields},2000);}
test('partial component verdicts identify correct final answers and every incorrect component',()=>{
 for(const [construction,reason,expected] of [['2','tree',{answer:'correct',reason:'correct',construction:'correct'}],['1','tree',{answer:'correct',reason:'correct',construction:'incorrect'}],['2','arithmetic',{answer:'correct',reason:'incorrect',construction:'correct'}],['1','arithmetic',{answer:'correct',reason:'incorrect',construction:'incorrect'}]]) {
  const r=fixture(),out=attempt(r,{construction,reason});
  assert.deepEqual(out.lesson.feedback.components,expected);assert.equal(out.lesson.feedback.correct,construction==='2' && reason==='tree');
  assert.equal(out.lesson.feedback.submission.answer,'2');assert.equal(out.lesson.feedback.submission.construction,construction);
  assert.equal(out.lesson.feedback.submission.prompt,r.q.prompt);
 }
});
test('failed original work remains frozen through guided retry, draft edits and backup/recovery roundtrip',()=>{
 const r=fixture(),failed=attempt(r,{construction:'1',reason:'arithmetic'}),snapshot=structuredClone(failed.lesson.feedback);
 const guided=E.apply(failed.state,{op:'continue',lessonId:failed.lesson.id,revision:failed.lesson.revision},3000);
 const edit=E.apply(guided.state,{op:'draft',lessonId:guided.lesson.id,revision:guided.lesson.revision,value:'99',construction:'88',reason:'tree'},4000);
 assert.deepEqual(edit.lesson.feedback,snapshot);assert.equal(edit.lesson.draft,'99');
 const round=B.parse(JSON.stringify(B.exportState({quantLearner:edit.state}))).data.quantLearner;
 assert.deepEqual(round,edit.state);
 assert.deepEqual(B.recoveryState({quantLearner:edit.state}).data.quantLearner.lessons[edit.lesson.key].feedback,snapshot);
 const old=structuredClone(edit.state);delete old.lessons[edit.lesson.key].feedback.submission;delete old.lessons[edit.lesson.key].feedback.components;
 assert.deepEqual(B.parse(JSON.stringify(B.exportState({quantLearner:old}))).data.quantLearner,old);
});
test('code failures retain the frozen submission and output without adding evidence metadata or exposing a new identity',()=>{
 const r=fixture('code-pnl'),code='def pnl(q,e,x):\n    return q*(x-e)',out=attempt(r,{answer:code,correct:false,output:'NameError: original fixture'});
 assert.equal(out.lesson.feedback.submission.answer,code);assert.equal(out.lesson.feedback.submission.output,'NameError: original fixture');
 assert.equal(out.state.events[0].submission,undefined);assert.equal(out.state.events[0].components,undefined);
 assert.equal(out.state.events[0].semanticKey,r.q.semanticKey);
 const b=B.exportState({quantLearner:out.state});b.data.quantLearner.lessons[out.lesson.key].feedback.components.answer='invented';assert.throws(()=>B.parse(JSON.stringify(b)));
});
test('dontKnow does not label unevaluated parts incorrect and snapshot strings are bounded',()=>{
 const out=attempt(fixture(),{dontKnow:true,answer:'<learner>'.repeat(4000)});
 assert.deepEqual(out.lesson.feedback.components,{answer:'unevaluated',reason:'unevaluated',construction:'unevaluated'});
 assert.equal(out.lesson.feedback.submission.answer.length,20000);
 const b=B.exportState({quantLearner:out.state});b.data.quantLearner.lessons[out.lesson.key].feedback.submission.output='x'.repeat(20001);assert.throws(()=>B.parse(JSON.stringify(b)));
});
test('display snapshots cannot mint evidence, enter tutor prompts, or make exposed repeated items independent',()=>{
 const r=fixture(),assisted=E.apply(r.state,{op:'assist',lessonId:r.lesson.id,revision:r.lesson.revision},1500),q=E.question(assisted.lesson);
 const out=E.apply(assisted.state,{op:'attempt',lessonId:assisted.lesson.id,revision:assisted.lesson.revision,eventId:'exposed-repeat',answer:String(q.answer),construction:String(q.construction.answer),reason:q.correctReason},2000);
 const e=out.state.events.find(e=>e.id==='exposed-repeat');assert.equal(e.firstTry,false);assert.equal(e.assisted,true);assert.equal(E.evidence(out.state,q.skillId).novelIndependent,0);
 out.lesson.feedback.submission.answer='sensitive-display-fixture';out.lesson.feedback.components.answer='correct';
 assert.equal(E.evidence(out.state,q.skillId).novelIndependent,0);assert.equal(E.prompt(out.state,out.lesson).includes('sensitive-display-fixture'),false);assert.equal(E.prompt(out.state,out.lesson,false).includes('sensitive-display-fixture'),false);
});
