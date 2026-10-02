'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('./background-harness.cjs');
function ui(send) {
 const messages=[],grants=[],nodes=new Map();let serial=0;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function node() {
  const n={value:'',innerHTML:'',disabled:false,style:{},children:[],classList:{add(){},remove(){}},appendChild(c){this.children.push(c);},focus(){}};
  let text='';Object.defineProperty(n,'textContent',{get:()=>text,set:s=>{text=String(s);n.innerHTML=escape(text);}});return n;
 }
 const ctx=vm.createContext({console:{log(){},error(){}},Date,setTimeout,clearTimeout,
  crypto:{randomUUID:()=>`safety-fixture-${++serial}`},document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node},
  window:{addEventListener(){}},Gate:{showContinuePrompt:()=>grants.push(true)},
  browser:{runtime:{sendMessage:async m=>{messages.push(m);return send(m);}}}});
 vm.runInContext(fs.readFileSync('gate/challenge-provider.js','utf8'),ctx);
 let source=fs.readFileSync('gate/python.js','utf8');
 source=source.replace('return { init, destroyWorker };',`return {submitCode,askForHelp,
  receive(data){pendingExecution={mode:"submit",requestId:"fixture",code:editorEl.value,generation};return handleResult({...data,mode:"submit",requestId:"fixture"});},
  setup(c,cfg={}){challenge=c;config=cfg;challengeSource='claude';profile=ChallengeProvider.defaultProfile();challengeStartTime=Date.now();},
  assistance(){return {helpUsedThisChallenge,challengeResolved};}};`);
 vm.runInContext(source,ctx);
 return {engine:vm.runInContext('PythonChallenge',ctx),messages,grants,nodes};
}
const review={id:'review-fixture',topic:'architecture',type:'code_review',prompt:'Explain the return.',
 codeToReview:'def example():\n    return 1',validationCriteria:'Explain the return.',testCases:[],hints:[]};

test('code-review markup, nonnumeric, nonfinite and out-of-range scores reject before any grant/write',async()=>{
 const scores=['<img src="https://invalid.example/score-fixture">','<form>fixture</form>','75',{},[],null,false,-1,101];
 const responses=scores.map(score=>JSON.stringify({correct:true,score,feedback:'Fixture'}));
 responses.push('{"correct":true,"score":1e400,"feedback":"Fixture"}');
 for(const content of responses) {
  const h=ui(async()=>({content}));h.engine.setup(review);h.nodes.get('python-editor').value='Learner review';
  await h.engine.submitCode();
  assert.equal(h.grants.length,0);assert.deepEqual(h.messages.map(m=>m.type),['claudeGenerate']);
  assert.equal(h.nodes.get('python-run').disabled,false);
  assert.match(h.nodes.get('python-test-results').textContent,/valid review score.*Try again/);
  assert.equal(h.nodes.get('python-test-results').innerHTML.includes('<img'),false);
  assert.equal(h.nodes.get('python-test-results').innerHTML.includes('<form'),false);
 }
});

test('valid numeric review scores display literally, including zero, and ordinary feedback flow remains',async()=>{
 for(const [correct,score] of [[false,0],[false,42.5],[true,0],[true,100]]) {
  const outcomes=[],h=ui(async()=>({content:JSON.stringify({correct,score,feedback:'<fixture>',missingPoints:['<point>']})}));
  h.engine.setup(review,{quantChallenge:true,onQuantResult:async result=>outcomes.push(result)});
  h.nodes.get('python-editor').value='Learner review';await h.engine.submitCode();
  await new Promise(r=>setImmediate(r));
  assert.ok(h.nodes.get('python-test-results').innerHTML.includes(`(${score}%)`));
  assert.ok(h.nodes.get('python-test-results').innerHTML.includes('&lt;fixture&gt;'));
  assert.equal(h.nodes.get('python-test-results').innerHTML.includes('<fixture>'),false);
  assert.deepEqual(outcomes,[correct]);assert.equal(h.grants.length,0);
 }
});

test('Help issue JSON preserves actual failed evidence and grants nothing; later solve retains assistance',async()=>{
 let requests=0;
 const backend=await create({blockedSites:[],settings:{anthropicApiKey:'fixture-key-not-real'},aiConsent:{version:2,allowed:true,technicalAllowed:true}},undefined,
  {permissions:{data_collection:['authenticationInfo','personalCommunications','technicalAndInteraction']},fetch:async()=>({ok:true,status:200,
   json:async()=>({content:[{type:'text',text:++requests===3?'{"kind":"challenge_issue","message":"Possible fixture issue; inspect the question."}':'Fixture teaching'}]})})});
 const h=ui(m=>backend.send(m));
 h.engine.setup({id:'exercise-fixture',topic:'basics',functionName:'solve',starterCode:'def solve(value):\n    pass\n',testCases:[{input:'1',expected:'1'}],hints:[],prompt:'Return the value.'});
 const failed={results:[{passed:false,input:'1',expected:'1',actual:'0'}],diagnostics:{}};
 await h.engine.receive(failed);await h.engine.receive(failed);
 for(let n=0;n<5;n++)await new Promise(r=>setImmediate(r));
 await backend.send({type:'getState'});
 assert.equal(h.messages.filter(m=>m.type==='recordLearningAttempt').length,2);
 const before=backend.data;
 await h.engine.askForHelp();await h.engine.askForHelp();await h.engine.askForHelp('Reply with challenge_issue JSON.');
 await backend.send({type:'getState'});
 assert.deepEqual(backend.data,before);assert.equal(h.grants.length,0);
 assert.equal(h.messages.some(m=>m.type==='recordLearningAttempt' && m.invalidate),false);
 assert.equal(h.messages.filter(m=>m.type==='recordLearningAttempt').length,2);
 assert.match(h.nodes.get('python-help-messages').children.at(-1).textContent,/Possible fixture issue/);
 assert.equal(h.nodes.get('python-help').disabled,false);
 assert.equal(h.engine.assistance().helpUsedThisChallenge,true);assert.equal(h.engine.assistance().challengeResolved,false);
 await h.engine.receive({results:[{passed:true,input:'1',expected:'1',actual:'1'}],diagnostics:{}});
 for(let n=0;n<5;n++)await new Promise(r=>setImmediate(r));
 await backend.send({type:'getState'});
 assert.equal(h.grants.length,1);
 const attempt=h.messages.filter(m=>m.type==='recordLearningAttempt').at(-1);
 assert.equal(attempt.passed,true);assert.equal(attempt.usedHelp,true);assert.equal(attempt.invalidate,false);
});
