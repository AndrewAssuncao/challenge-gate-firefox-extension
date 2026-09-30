const {test}=require('node:test'),assert=require('node:assert/strict');
const C=require('../learning/curriculum'),E=require('../learning/engine');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
test('applied canonical scenarios match independently calculated cash flows',()=>{
 const execution=C.question('market-execution',0);close(execution.answer,-42.6);close(execution.construction.answer,841.3);close(execution.construction.answer+execution.answer,798.7);
 const option=C.question('market-options',0);close(option.answer,99);close(option.construction.answer,107.01);close(C.question('market-options',1).answer,-101);
 const quote=C.question('market-quote',0);close(quote.answer,-4);close(quote.construction.answer,106);
 const greeks=C.question('market-greeks',0);close(greeks.answer,276);close(greeks.construction.answer,5.38);
});
function oracle(id,s){
 const units=s.multiplier*s.quantity;
 if(id==='market-contracts')return [(s.side==='buy'?s.ask:s.bid)*units,s.side==='buy'?s.ask:s.bid];
 if(id==='market-execution')return [s.short?(s.bid-s.closingAsk)*units-2*s.perFee*s.quantity:(s.bid-s.ask)*units-2*s.perFee*s.quantity,s.short?s.bid*units-s.perFee*s.quantity:s.ask*units+s.perFee*s.quantity];
 if(id==='market-options')return [Math.max(s.put?s.strike-s.spot:s.spot-s.strike,0)*units-s.premium*units-s.fee,s.strike+(s.put?-1:1)*(s.premium+s.fee/units)];
 if(id==='market-quote'){
  const highLikelihood=s.customerSells?1-s.buyHigh:s.buyHigh,lowLikelihood=s.customerSells?1-s.buyLow:s.buyLow;
  const value=(.5*highLikelihood*s.high+.5*lowLikelihood*s.low)/(.5*highLikelihood+.5*lowLikelihood);
  return [s.customerSells?value-s.price:s.price-value,value];
 }
 const change=s.delta*s.spotChange+s.gamma*s.spotChange*s.spotChange/2+s.theta*s.days+s.vega*s.ivChange;
 return [change*units,s.initial+change];
}
test('all applied variants carry explicit assumptions and agree with independent numeric oracles',()=>{
 for(const skill of C.skills.filter(s=>s.track==='applied'))for(const level of [0,1])for(let seed=0;seed<18;seed++){
  const q=C.question(skill.id,seed,false,level),[answer,intermediate]=oracle(skill.id,q.scenario);
  close(q.answer,answer);close(q.construction.answer,intermediate);
  assert.match(q.prompt,/SIMULATED DATA/);assert.match(q.prompt,/multiplier/i);assert.ok(q.reasonOptions);assert.ok(q.solution&&q.explanation&&q.workedExample&&q.hints.length===2);
 }
});
test('applied graders reject common sign, unit, fee and conditioning mistakes',()=>{
 for(const skill of C.skills.filter(s=>s.track==='applied'))for(const level of [0,1])for(let seed=0;seed<9;seed++){
  const q=C.question(skill.id,seed,false,level),s=q.scenario,units=s.multiplier*s.quantity;
  let mutants=[];
  if(skill.id==='market-contracts')mutants=[(s.side==='buy'?s.bid:s.ask)*units,(s.bid+s.ask)/2*units,q.answer/s.quantity];
  if(skill.id==='market-execution')mutants=[q.answer+2*s.perFee*s.quantity,-q.answer,q.answer+s.perFee*s.quantity];
  if(skill.id==='market-options')mutants=[q.answer+s.premium*units+s.fee,q.answer+s.fee,-q.answer];
  if(skill.id==='market-quote')mutants=[s.customerSells?(s.high+s.low)/2-s.price:s.price-(s.high+s.low)/2,-q.answer];
  if(skill.id==='market-greeks')mutants=[q.answer+.5*s.gamma*s.spotChange**2*units,q.answer-s.vega*s.ivChange*.99*units,q.answer-2*s.theta*s.days*units,q.answer/s.quantity];
  for(let i=0;i<mutants.length;i++){
   assert.ok(Math.abs(mutants[i]-q.answer)>1e-6,`${q.id} indistinguishable mutation`);
   const state=E.empty(),lesson={id:'lesson',key:'x',skillId:skill.id,mode:'math',track:'applied',practice:true,seed,level,stage:'check',revision:0,assisted:false,checks:0,required:1,stepStartedAt:0};state.lessons.x=lesson;
   const result=E.apply(state,{op:'attempt',lessonId:'lesson',revision:0,eventId:'mutation',answer:mutants[i],reason:q.correctReason,construction:q.construction.answer},1000);
   assert.equal(result.state.events.at(-1).correct,false);
  }
 }
});
test('applied track is Arcade-only and routes prerequisites without fabricating progress',()=>{
 assert.throws(()=>E.apply(E.empty(),{op:'begin',mode:'math',track:'applied'}),/only in Arcade/);
 let state=E.empty(),lesson,serial=0;
 for(let i=0;i<150;i++){
  const start=E.apply(state,{op:'begin',mode:'math',track:'applied',practice:true,fresh:true},1000);state=start.state;lesson=start.lesson;
  if(i===0){assert.equal(lesson.skillId,'arith-percent');assert.equal(E.evidence(state,'market-contracts').attempts,0);}
  const q=E.question(lesson);state=E.apply(state,{op:'attempt',lessonId:lesson.id,revision:lesson.revision,eventId:'applied-'+(++serial),answer:q.answer,construction:q.construction?.answer,reason:q.correctReason,correct:true},1000).state;
 }
 for(const s of C.skills.filter(s=>s.track==='applied'))assert.equal(E.evidence(state,s.id).practiced,true,s.id);
});

test('conditional quote explanations format complements and retain semantic identity',()=>{
 for(let seed=0;seed<18;seed++)for(const level of [0,1]){
  const q=C.question('market-quote',seed,false,level);
  assert.ok(!q.solution.includes('999999999'));
  assert.match(q.solution,/conditional value = [0-9.]+ ×/);
  assert.ok(q.familyId && q.semanticKey);
 }
});

test('applied variants require checking conditional rates, profit signs and put moneyness',()=>{
 for(const id of ['market-quote','market-execution']){
  const answers=Array.from({length:9},(_,seed)=>C.question(id,seed,false,1).answer);
  assert.ok(answers.some(x=>x>0)&&answers.some(x=>x<0),id);
 }
 const puts=Array.from({length:9},(_,seed)=>C.question('market-options',seed,false,1).scenario);
 assert.ok(puts.some(s=>s.spot<s.strike)&&puts.some(s=>s.spot>s.strike));
 const posteriors=new Set(Array.from({length:9},(_,seed)=>{const s=C.question('market-quote',seed).scenario;return s.buyHigh/(s.buyHigh+s.buyLow);}));
 assert.ok(posteriors.size>=3);
});
