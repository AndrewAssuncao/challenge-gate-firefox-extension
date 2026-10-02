'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path'),Module=require('node:module'),{execFileSync}=require('node:child_process');
const B=require('../background/backup'),E=require('../learning/engine'),C=require('../learning/curriculum');
const integrated=C.validateItemIdentity?test:test.skip;
function attempt(id,seed,level) {
 const skill=C.get(id),q=C.question(id,seed,false,level),key='fixture';
 const lesson={id:'fixture-lesson',key,skillId:id,mode:skill.mode,track:skill.track,stage:'check',seed,level,revision:0,assisted:false,draft:'',checks:0,required:1,harder:false,practice:true,startedAt:1000,stepStartedAt:1000};
 const state=E.empty();state.lessons[key]=lesson;
 return E.apply(state,{op:'attempt',lessonId:lesson.id,revision:lesson.revision,eventId:'event-'+id,answer:q.answer,reason:q.correctReason,construction:q.construction?.answer,correct:true},2000).state;
}
integrated('integrated authored method tags and all optional drafts/feedback round trip without loss',()=>{
 for(const id of ['data-weighted','data-base','brain-order','prob-method']) {
  const state=attempt(id,0,0),lesson=state.lessons.fixture;lesson.constructionDraft='12';lesson.reasonDraft='bounded';lesson.draft='saved answer';lesson.feedback.diagnosis='Observed intermediate fixture';
  const parsed=B.parse(JSON.stringify(B.exportState({quantLearner:state})));assert.deepEqual(parsed.data.quantLearner,state);
  const recovered=B.recoveryState({quantLearner:state});assert.equal(recovered.data.quantLearner.lessons.fixture.feedback.diagnosis,lesson.feedback.diagnosis);
 }
});
integrated('supported relabeling and inconsistent variant/family/transfer/key cannot qualify imported method coverage',()=>{
 const state=attempt('prob-method',0,0),event=state.events.at(-1),other=C.get('prob-method').requiredMethods.find(x=>x!==event.methodTag);
 assert.equal(C.validateItemIdentity(event),true);
 for(const fields of [{methodTag:other},{variant:'prob-method:9:0'},{familyId:'unrelated'},{isTransfer:!event.isTransfer},{semanticKey:'fake'}]) {
  const edited=structuredClone(state);Object.assign(edited.events.at(-1),fields);
  assert.throws(()=>B.parse(JSON.stringify({format:'challenge-gate-backup',version:1,addonId:'challenge-gate@extension',data:{...B.exportState({quantLearner:state}).data,quantLearner:edited}})));
  assert.equal(E.evidence(edited,'prob-method').independent,0);
 }
});
integrated('historical authored aliases stay raw and duplicate canonical items cannot mint new credit',()=>{
 const filename=path.resolve(__dirname,'../learning/legacy-c57b081.js'),old=new Module(filename);old.filename=filename;old.paths=module.paths;old._compile(execFileSync('git',['show','c57b081:learning/curriculum.js'],{encoding:'utf8',cwd:path.resolve(__dirname,'..')}),filename);
 const state=attempt('prob-method',0,0),event=state.events.at(-1),previous=old.exports.question('prob-method',0,false,0),current=C.question('prob-method',0,false,0);
 event.semanticKey=previous.semanticKey;assert.equal(C.validateItemIdentity(event),true);
 state.events.push({...event,id:'alias-duplicate',semanticKey:current.semanticKey});
 const imported=B.parse(JSON.stringify(B.exportState({quantLearner:state}))).data.quantLearner;
 assert.equal(imported.events[0].semanticKey,previous.semanticKey);assert.equal(E.evidence(imported,'prob-method').independent,1);
});
