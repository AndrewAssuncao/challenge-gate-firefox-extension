'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../learning/engine'),C=require('../learning/curriculum');
function harness() {
 const nodes=new Map(),workers=[],timers=new Map(),outcomes=[],messages=[];let id=0,focus=0,save;
 function node() {
  const n={value:'',innerHTML:'',disabled:false,hidden:false,style:{},children:[],classList:{add(){},remove(){}},appendChild(c){this.children.push(c);},addEventListener(){},focus(){focus++;}};
  let text='';Object.defineProperty(n,'textContent',{get:()=>text,set:value=>{text=String(value);n.innerHTML=text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}});return n;
 }
 class Worker {
  constructor(){this.posts=[];workers.push(this);}postMessage(data){this.posts.push(data);}terminate(){this.terminated=true;}
  async respond(data){return this.onmessage({data});}
 }
 const initial=E.apply(E.empty(),{op:'begin',mode:'python'},1000);
 // This test deliberately selects the authored P&L question without curriculum scheduling.
 initial.lesson.skillId='code-pnl';let state=initial.state,lesson=initial.lesson;
 const ctx=vm.createContext({console,Date,Worker,crypto:{randomUUID:()=>`action-${++id}`},
  setTimeout:fn=>{const id=timers.size+1;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
  document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node},window:{addEventListener(){}},
  browser:{runtime:{getURL:x=>x,sendMessage:async m=>{messages.push(m);return {};}}}});
 let source=fs.readFileSync(require.resolve('../gate/python.js'),'utf8').replace('return { init, destroyWorker };','return {init,destroyWorker,runCode,submitCode,handleResult};');
 vm.runInContext(source,ctx);const ui=vm.runInContext('PythonChallenge',ctx);
 async function init(q=C.question('code-pnl',1)) {
  await ui.init({quantChallenge:q,onQuantDraft(){},onQuantResult:async(correct,snapshot)=>{
   outcomes.push({correct,snapshot});if(save)await save;
   const r=E.apply(state,{op:'attempt',lessonId:lesson.id,revision:lesson.revision,eventId:`submission-${outcomes.length}`,correct,answer:snapshot.answer,output:snapshot.output,draft:nodes.get('python-editor').value},2000);state=r.state;lesson=r.lesson;
  }});
  workers.at(-1).onmessage({data:{type:'ready'}});
 }
 return {ui,init,nodes,workers,outcomes,messages,timers,get state(){return state;},get focus(){return focus;},pause(p){save=p;}};
}
const data=(m,extra={})=>({type:'result',requestId:m.requestId,mode:m.mode,...extra});
test('repeated scratch success/errors never mutate learner state, disclose assessment, or clear code/caret/focus',async()=>{
 const h=harness();await h.init();const editor=h.nodes.get('python-editor');editor.value='def pnl(q,e,x):\n    return q*(x-e)\nprint(pnl(-3,12,10))';editor.selectionStart=12;
 const state=JSON.stringify(h.state),focus=h.focus;
 for(const extra of [{stdout:'6\n'},{error:'NameError: learner',errorKind:'user-code'},{stdout:'0\n'}]) {
  await h.ui.runCode();const m=h.workers.at(-1).posts.at(-1);
  assert.equal(m.mode,'scratch');assert.equal(m.testCases,undefined);assert.equal(m.functionName,undefined);
  await h.ui.handleResult(data(m,extra));assert.equal(JSON.stringify(h.state),state);assert.equal(h.outcomes.length,0);
  assert.equal(editor.selectionStart,12);assert.equal(h.focus,focus);assert.match(editor.value,/pnl/);assert.equal(h.nodes.get('python-run').disabled,false);
 }
 assert.equal(h.messages.length,0);
});
test('Submit freezes edited code, records one outcome and ignores double clicks/duplicate or unrelated responses',async()=>{
 const h=harness();await h.init();const editor=h.nodes.get('python-editor');editor.value='bad scratch';await h.ui.runCode();const run=h.workers.at(-1).posts.at(-1);
 await h.ui.handleResult(data(run,{error:'NameError',errorKind:'user-code'}));
 const code='def pnl(q,e,x):\n    return q*(x-e)';editor.value=code;
 await h.ui.submitCode();await h.ui.submitCode();await h.ui.runCode();const w=h.workers.at(-1),m=w.posts.at(-1);
 assert.equal(w.posts.length,2);assert.equal(m.mode,'submit');assert.ok(m.testCases.length);assert.equal(m.code,code);
 await h.ui.handleResult(data(run,{results:[{passed:false}]}));assert.equal(h.nodes.get('python-submit').disabled,true);
 let resolve;h.pause(new Promise(r=>resolve=r));const result=data(m,{results:m.testCases.map(tc=>({passed:true,input:tc.input,actual:tc.expected,expected:tc.expected}))});
 const saving=h.ui.handleResult(result);await h.ui.handleResult(result);await h.ui.submitCode();assert.equal(h.outcomes.length,1);assert.equal(w.posts.length,2);
 editor.value='new draft while saving';resolve();await saving;
 assert.equal(h.state.events.filter(e=>e.kind==='attempt').length,1);assert.equal(h.outcomes[0].snapshot.answer,code);assert.equal(editor.value,'new draft while saving');
});
test('new lesson/worker and timed-out requests reject stale grading and recover controls without evidence',async()=>{
 const h=harness();await h.init();await h.ui.submitCode();const old=h.workers.at(-1),m=old.posts[0];
 h.ui.destroyWorker();await h.init(C.question('code-pnl',5));old.onmessage({data:data(m,{results:[{passed:true}]})});await h.ui.handleResult(data(m,{results:[{passed:true}]}));assert.equal(h.outcomes.length,0);
 await h.ui.runCode();h.timers.values().next().value();assert.equal(h.outcomes.length,0);assert.equal(h.nodes.get('python-run').disabled,false);
 assert.match(h.nodes.get('python-test-results').textContent,/No graded attempt/);
});
test('Submit user errors are graded once; infrastructure and unparseable test errors preserve draft without grading',async()=>{
 for(const [extra,expected] of [[{error:'SyntaxError',errorKind:'user-code'},1],[{error:'runtime unavailable',errorKind:'infrastructure'},0],[{results:[]},0],[{results:[{passed:true}]},0],[{results:[{passed:false,challengeIssue:true}],diagnostics:{unrecoverableChallengeIssue:true,unrecoverableTests:[{input:'bad',error:'parse'}]}},0]]) {
  const h=harness();await h.init();h.nodes.get('python-editor').value='learner code';await h.ui.submitCode();const m=h.workers.at(-1).posts.at(-1);await h.ui.handleResult(data(m,extra));
  assert.equal(h.outcomes.length,expected);assert.equal(h.nodes.get('python-editor').value,'learner code');
  if(expected){assert.equal(h.state.events[0].correct,false);assert.equal(h.state.lessons[Object.keys(h.state.lessons)[0]].feedback.submission.answer,'learner code');}
 }
});
