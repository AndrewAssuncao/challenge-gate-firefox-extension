'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {create}=require('./background-harness.cjs'),E=require('../learning/engine');
const personal=['authenticationInfo','personalCommunications'];
const response=()=>({ok:true,json:async()=>({content:[{type:'text',text:'Fixture teaching'}]})});
async function transmitted(message,history,permissions) {
 const bodies=[];
 const h=await create({blockedSites:[],settings:{anthropicApiKey:'fixture-key-not-real'},aiConsent:{version:2,allowed:true,technicalAllowed:history}},undefined,{permissions,fetch:async(_url,options)=>{bodies.push(JSON.parse(options.body));return response();}});
 const result=await h.send(message);assert.equal(result.content,'Fixture teaching');return {h,bodies};
}
test('personal consent alone supports AI while technical decline excludes accumulated history',async()=>{
 const message={type:'claudeGenerate',prompt:'PRIVATE-HISTORY-MARKER',promptWithoutHistory:'Current exercise and user question'};
 for(const permissions of [{},{data_collection:personal}]) {
  const {h,bodies}=await transmitted(message,false,permissions);
  assert.equal(bodies[0].messages[0].content,message.promptWithoutHistory);
  assert.deepEqual(await h.send({type:'getAiConsent'}),{allowed:true,technicalAllowed:false});
  assert.equal(JSON.stringify(bodies).includes('PRIVATE-HISTORY-MARKER'),false);
 }
 const {bodies}=await transmitted(message,true,{data_collection:[...personal,'technicalAndInteraction']});assert.equal(bodies[0].messages[0].content,message.prompt);
 const revoked=await transmitted(message,true,{data_collection:personal});assert.equal(revoked.bodies[0].messages[0].content,message.promptWithoutHistory);
});
test('enabling personal consent does not imply learning-history consent',async()=>{
 const h=await create({blockedSites:[],settings:{anthropicApiKey:'fixture-key-not-real'}},undefined,{permissions:{data_collection:personal}});
 assert.equal((await h.send({type:'setAiConsent',allowed:true})).success,true);
 assert.deepEqual(await h.send({type:'getAiConsent'}),{allowed:true,technicalAllowed:false});
 assert.ok((await h.send({type:'setAiConsent',allowed:true,technicalAllowed:true})).error);
 assert.deepEqual(await h.send({type:'getAiConsent'}),{allowed:true,technicalAllowed:false});
});
test('all legacy generated exercise prompts have a functioning history-free form',async()=>{
 for(const [file,name] of [['challenge-provider.js','ChallengeProvider'],['git-provider.js','GitChallengeProvider'],['terminal-provider.js','TerminalChallengeProvider']]) {
  const messages=[];
  const ctx=vm.createContext({console:{error(){},log(){}},Date,URL,fetch:async()=>({json:async()=>[]}),browser:{runtime:{getURL:p=>p,sendMessage:async msg=>{if(msg.type==='claudeGenerate'){messages.push(msg);return {error:'fixture offline'};}return null;}}}});
  for(const source of ['spaced-repetition.js',file])vm.runInContext(fs.readFileSync('gate/'+source,'utf8'),ctx);
  const provider=vm.runInContext(name,ctx),profile=provider.defaultProfile();
  profile.totalSessions=47;profile.recentChallenges=[{topic:'fixture',summary:'PRIVATE-HISTORY-MARKER',passed:false}];profile.weakAreas=['PRIVATE-HISTORY-WEAK'];profile.conceptsIntroduced=['PRIVATE-HISTORY-CONCEPT'];
  await provider.getChallenge(profile,'intense',false);assert.equal(messages.length,1);
  assert.ok(messages[0].prompt.includes('PRIVATE-HISTORY-MARKER'));
  for(const marker of ['PRIVATE-HISTORY-MARKER','PRIVATE-HISTORY-WEAK','PRIVATE-HISTORY-CONCEPT','Total challenge attempts:','Curriculum position:'])assert.equal(messages[0].promptWithoutHistory.includes(marker),false,file+' '+marker);
  const {bodies}=await transmitted(messages[0],false,{data_collection:personal});assert.equal(JSON.stringify(bodies).includes('PRIVATE-HISTORY'),false);
 }
});
test('quant current-exercise teaching remains available without accumulated evidence or repair reason',async()=>{
 const r=E.apply(E.empty(),{op:'begin',mode:'math',track:'arithmetic',practice:true});r.lesson.reason='PRIVATE-HISTORY-REASON';
 const full=E.prompt(r.state,r.lesson),minimal=E.prompt(r.state,r.lesson,false);
 assert.ok(full.includes('PRIVATE-HISTORY-REASON'));assert.equal(minimal.includes('PRIVATE-HISTORY-REASON'),false);assert.equal(minimal.includes('"evidence"'),false);assert.ok(minimal.includes('"question"'));assert.equal(minimal.includes('recorded error'),false);assert.ok(minimal.includes('"stage":"lesson"'));
 await transmitted({type:'claudeGenerate',prompt:full,promptWithoutHistory:minimal},false,{data_collection:personal});
});
