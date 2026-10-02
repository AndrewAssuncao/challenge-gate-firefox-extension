'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const C=require('../learning/curriculum'),E=require('../learning/engine');

function previous() {
 const ctx=vm.createContext({console,require,module:{exports:{}}});
 vm.runInContext(execFileSync('git',['show','a4bc4f5:learning/applied.js'],{encoding:'utf8'}),ctx);ctx.module={exports:{}};
 vm.runInContext(execFileSync('git',['show','a4bc4f5:learning/curriculum.js'],{encoding:'utf8'}),ctx);
 const curriculum=ctx.module.exports;ctx.module={exports:{}};
 vm.runInContext(execFileSync('git',['show','a4bc4f5:learning/engine.js'],{encoding:'utf8'}),ctx);
 return {C:curriculum,E:ctx.module.exports};
}
function attempt(C,E,overrides={}) {
 const state=E.empty(),q=C.question('brain-balance',0,false,0);
 const lesson={id:'balance-audit',key:'audit',skillId:'brain-balance',mode:'brainteasers',track:'',seed:0,level:0,stage:'diagnostic',revision:0,assisted:false,checks:0,required:1,stepStartedAt:1000};
 state.lessons.audit=lesson;
 return E.apply(state,{op:'attempt',lessonId:lesson.id,revision:0,eventId:'audit-attempt',answer:'2',construction:'2',reason:'tree',...overrides},2000);
}
for(const [name,api] of [['main a4bc4f5',previous()],['candidate', {C,E}]])test(`${name}: four known-heavier coins require two weighings; each submitted component affects grading separately`,()=>{
 const q=api.C.question('brain-balance',0,false,0);
 assert.match(q.prompt,/Among 4 identical-looking coins/);assert.equal(q.answer,2);assert.equal(q.construction.answer,2);assert.equal(q.correctReason,'tree');
 // One comparison leaves the equal 1:1 branch with two unweighed candidates.
 // A second comparison distinguishes them; all first branches have at most two.
 for(const [input,correct,error] of [[{},true,null],[{answer:'1'},false,'answer mismatch'],[{reason:'unsupported'},false,'reason mismatch'],[{construction:'1'},false,'construction mismatch'],[{reason:'unsupported',construction:'1'},false,'reason mismatch']]){
  const r=attempt(api.C,api.E,input),event=r.state.events.at(-1);
  assert.equal(event.correct,correct,JSON.stringify(input));assert.equal(event.error,error,JSON.stringify(input));
  if(!correct){assert.equal(r.lesson.stage,'teach');assert.equal(api.E.evidence(r.state,'brain-balance').independent,0);}
 }
});
