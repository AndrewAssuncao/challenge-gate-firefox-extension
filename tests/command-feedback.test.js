'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');

function harness(mode) {
 const nodes=new Map(),messages=[];
 function node() {
  const n={children:[],listeners:{},className:'',style:{},value:'',textContent:'',disabled:false,scrollHeight:0,focus(){}};let html='';
  Object.defineProperty(n,'innerHTML',{get:()=>html,set:s=>{html=String(s);n.children=[];}});
  n.appendChild=c=>n.children.push(c);
  n.classList={add(){},remove(){},toggle(){}};
  n.addEventListener=(name,fn)=>{n.listeners[name]=fn;};n.removeEventListener=()=>{};
  return n;
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);};
 const q={id:'retention-fixture',topic:'fixture',scenario:'Create the target branch or directory. <context>',hints:['Keep the scenario in view. <hint>'],objectives:[{description:'Create target',validation:{type:mode==='git'?'branchExists':'directoryExists',expected:'target'}}],initialState:{},filesystem:{},startDir:'/home/user'};
 const provider={getChallenge:async()=>({challenge:structuredClone(q),source:'local'}),defaultProfile:()=>({currentTopicIndex:0}),GIT_CURRICULUM:[{tier:1,name:'Fixture'}],TERMINAL_CURRICULUM:[{tier:1,name:'Fixture'}]};
 const ctx=vm.createContext({document:{getElementById:get,createElement:node,querySelector:()=>null},console,Date,Math,setTimeout:()=>1,clearTimeout(){},crypto:{randomUUID:()=> 'fixture'},
  window:{addEventListener(){},alert(){}},Gate:{showContinuePrompt:()=>messages.push({type:'grant'})},GitChallengeProvider:provider,TerminalChallengeProvider:provider,
  browser:{runtime:{sendMessage:async m=>{messages.push(structuredClone(m));return m.type==='claudeGenerate'?{content:'Compare your command with the objective. <feedback>'}:m.type==='getCurrentDifficulty'?{difficulty:'normal'}:{currentTopicIndex:0};}}}});
 vm.runInContext(fs.readFileSync(`gate/${mode}.js`,'utf8'),ctx);
 const api=vm.runInContext(mode==='git'?'GitChallenge':'TerminalChallenge',ctx);
 return {api,nodes,messages,get,send:command=>{const input=get(`${mode}-input`);input.value=command;input.listeners.keydown({key:'Enter',preventDefault(){}});},transcript:()=>get(`${mode}-output`).children.map(c=>c.innerHTML)};
}
for(const mode of ['git','terminal'])test(`${mode} appends error/help beside immutable entered command and keeps scenario/objectives`,async()=>{
 const h=harness(mode);await h.api.init({arcadeDifficulty:'normal'});
 const scenario=h.get(`${mode}-prompt-area`).children.map(c=>c.textContent).join(''),objectives=h.get(`${mode}-objectives`).children.map(c=>c.innerHTML).join('');
 h.send(mode==='git'?'git unknown "<img src=x>"':'unknown "<img src=x>"');
 const before=h.transcript();assert.equal(before.length,2);assert.match(before[0],/&lt;img/);assert.match(before[1],/term-error/);
 h.get(`${mode}-hint`).listeners.click();
 await h.get(`${mode}-help`).listeners.click();
 assert.deepEqual(h.transcript().slice(0,before.length),before);
 assert.match(h.transcript().join(''),/&lt;feedback&gt;/);assert.doesNotMatch(h.transcript().join(''),/<img|<feedback>/);
 assert.equal(h.get(`${mode}-prompt-area`).children.map(c=>c.textContent).join(''),scenario);
 assert.equal(h.get(`${mode}-objectives`).children.map(c=>c.innerHTML).join(''),objectives);
 h.get(`${mode}-input`).value='new draft';assert.deepEqual(h.transcript().slice(0,before.length),before);
 assert.equal(h.messages.some(m=>m.type==='recordLearningAttempt'||m.type==='grant'||m.type==='updateProgression'),false);
 const ai=h.messages.find(m=>m.type==='claudeGenerate');
 assert.match(ai.prompt,/Commands tried:/);assert.ok(!Object.keys(ai).some(k=>/snapshot|submission|transcript/i.test(k)));
});
