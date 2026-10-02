'use strict';
const assert=require('node:assert/strict'),C=require('../learning/curriculum'),E=require('../learning/engine'),DAY=86400000;
const {test}=require('node:test');
// Bank exposure is a fixture; every repair/reassessment after exposure uses real begin/continue selection.
test('every genuinely fully exposed normal bank recovers through natural delayed selection',()=>{
for(const skill of C.skills)for(const exposure of ['fail','hint']){
 let state=E.empty(),l,now=1000,serial=0;
 const apply=cmd=>{const r=E.apply(JSON.parse(JSON.stringify(state)),cmd,now++);state=r.state;l=r.lesson;return r;};
 const bank=new Map();const period=['brain-invariant','brain-bounds'].includes(skill.id)?22680:18;for(let seed=0;seed<period;seed++)for(const level of [0,1]){const q=C.question(skill.id,seed,false,level);bank.set(q.semanticKey,{seed,level});}
 for(const {seed,level} of bank.values()){
  const n=++state.serial;l={id:'exhaust-'+n,key:'test',skillId:skill.id,mode:skill.mode,track:skill.track,seed,level,stage:'check',revision:0,assisted:false,required:1,checks:0,stepStartedAt:now};state.lessons.test=l;
  if(exposure==='hint')apply({op:'assist',lessonId:l.id,revision:l.revision});
  const q=E.question(l);apply({op:'attempt',lessonId:l.id,revision:l.revision,eventId:'e-'+(++serial),answer:exposure==='fail'?999999:q.answer,reason:q.correctReason,construction:q.construction?.answer,correct:exposure!=='fail'});
 }
 // Narrow the mode's prerequisites with independently correct authored evidence; target remains exposed only.
 let prereqSet=new Set();function add(id){for(const p of C.get(id).prerequisites){if(!prereqSet.has(p)){prereqSet.add(p);add(p);}}}add(skill.id);
 for(const id of prereqSet)for(let seed=0;seed<9;seed++)for(const level of [0,1]){const n=++state.serial;l={id:'prereq-'+n,key:'prereq',skillId:id,mode:C.get(id).mode,track:C.get(id).track,seed,level,stage:'check',revision:0,assisted:false,required:1,checks:0,stepStartedAt:now};state.lessons.prereq=l;const q=E.question(l);apply({op:'attempt',lessonId:l.id,revision:l.revision,eventId:'p-'+(++serial),answer:q.answer,reason:q.correctReason,construction:q.construction?.answer,correct:true});}
 assert.equal(E.evidence(state,skill.id).independent,0);
 now=8*DAY;let visited=0;
 for(let step=0;step<100;step++){
  if(E.evidence(state,skill.id).practiced)break;
  apply({op:'begin',mode:skill.mode,track:skill.track,practice:true,fresh:true});
  if(l.stage==='teach')apply({op:'continue',lessonId:l.id,revision:l.revision});
  const q=E.question(l);if(l.skillId===skill.id)visited++;
  apply({op:'attempt',lessonId:l.id,revision:l.revision,eventId:'natural-'+(++serial),answer:q.answer,reason:q.correctReason,construction:q.construction?.answer,correct:true});
 }
 const e=E.evidence(state,skill.id);assert.equal(e.practiced,true,skill.id+' '+exposure+' selector reassessment failed');assert.equal(e.novelIndependent,0);assert.ok(e.recovered);
 assert.ok(visited>0);
 if(skill.id==='brain-invariant')assert.equal(bank.size,48);
 if(skill.id==='brain-bounds')assert.equal(bank.size,116);
}

});
