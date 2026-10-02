const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const E=require('../learning/engine'),C=require('../learning/curriculum');
function harness(tutorResponse={error:'No API key configured'}){
 const nodes=new Map(),commands=[];let fail=false,id=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',classList:{add(){},remove(){},toggle(){}},setAttribute(){},removeAttribute(){}});return nodes.get(id);};
 const initial=E.apply(E.empty(),{op:'begin',mode:'math',track:'arithmetic'},1000);
 const c=vm.createContext({document:{getElementById:node},crypto:{randomUUID:()=>String(++id)},QuantLearning:E,QuantCurriculum:C,PythonChallenge:{destroyWorker(){}},Gate:{hideContinuePrompt(){}},browser:{runtime:{sendMessage:async request=>{
  commands.push(request);
  if(request.type==='claudeGenerate')return tutorResponse;
  if(fail){fail=false;return {error:'disk full',retryable:true};}
  return initial;
 }}}});
 let source=fs.readFileSync(require.resolve('../gate/quant.js'),'utf8');
 source=source.replace(/  async function render\(\) \{[\s\S]*?\n  function destroy/, '  async function render() {}\n  function destroy');
 source=source.replace('return {init,destroy};','return {attempt,tutor,begin,setup(s,l){state=s;lesson=l;config={};mode="math";track="arithmetic";}};');
 vm.runInContext(source,c);const ui=vm.runInContext('QuantChallenge',c);ui.setup(initial.state,initial.lesson);
 return {ui,node,commands,set fail(value){fail=value;}};
}
test('track/reload begin always requests a fresh lesson when the saved lesson is done',async()=>{
 const h=harness();await h.ui.begin();assert.equal(h.commands[0].command.fresh,true);
});
test('failed tutor request does not mark the lesson assisted',async()=>{
 const h=harness();await assert.rejects(h.ui.tutor(),/No API key/);assert.equal(h.commands.length,1);assert.equal(h.commands[0].type,'claudeGenerate');
});
test('model-unavailable Help leaves local teaching and progression available',async()=>{
 const h=harness({error:'The tutor model is unavailable (404). Update the extension or check model access in Claude Console.',status:404});
 await assert.rejects(h.ui.tutor(),/model is unavailable \(404\).*local lesson remains available/);
 assert.equal(h.commands.length,1);assert.equal(h.commands[0].type,'claudeGenerate');
 assert.equal(h.commands.some(request=>request.type==='quantCommand'),false);
});
test('storage retry keeps id for identical payload and changes id when answer changes',async()=>{
 const h=harness();h.node('quant-answer').value='1';h.fail=true;await assert.rejects(h.ui.attempt(false),/disk/);
 const first=h.commands[0].command;
 h.fail=true;await assert.rejects(h.ui.attempt(false),/disk/);assert.equal(h.commands[1].command.eventId,first.eventId);
 h.node('quant-answer').value='2';await h.ui.attempt(false);assert.notEqual(h.commands[2].command.eventId,first.eventId);assert.equal(h.commands[2].command.answer,'2');
});

test('history-free neutral teaching stage maps locally before validated persistence',async()=>{
 const r=E.apply(E.empty(),{op:'begin',mode:'math',track:'arithmetic'},1000),h=harness({content:JSON.stringify({skillId:r.lesson.skillId,stage:'lesson',explanation:'Fixture',workedExample:'Fixture',connection:'Fixture',nextStep:'Fixture'})});
 await h.ui.tutor();assert.equal(h.commands[1].command.op,'teaching');assert.equal(h.commands[1].command.value.stage,r.lesson.stage);
});
