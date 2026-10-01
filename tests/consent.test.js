'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('./background-harness.cjs');
const key={settings:{anthropicApiKey:'fixture-key-not-real'}};
test('saved keys and old settings cannot bypass explicit consent',async()=>{
 let calls=0;const h=await create(key,undefined,{fetch:async()=>{calls++;throw Error('must not send');}});
 assert.match((await h.send({type:'claudeGenerate',prompt:'fixture',promptWithoutHistory:'fixture'})).error,/transmission is off/);
 await h.send({type:'updateSettings',settings:{aiConsent:true}});
 assert.match((await h.send({type:'claudeGenerate',prompt:'fixture',promptWithoutHistory:'fixture'})).error,/transmission is off/);assert.equal(calls,0);
});
test('defensive fallback without native permission metadata requires local opt-in and can be revoked',async()=>{
 const h=await create(key);
 assert.equal((await h.send({type:'getAiConsent'})).allowed,false);
 await h.send({type:'setAiConsent',allowed:true});assert.equal((await h.send({type:'getAiConsent'})).allowed,true);
 await h.send({type:'setAiConsent',allowed:false});assert.equal((await h.send({type:'getAiConsent'})).allowed,false);
});
test('modern Firefox permissions and local consent are both required and fail closed',async()=>{
 const denied=await create({...key,aiConsent:{version:2,allowed:true,technicalAllowed:true}},undefined,{permissions:{data_collection:[]}});
 assert.equal((await denied.send({type:'getAiConsent'})).allowed,false);
 assert.ok((await denied.send({type:'setAiConsent',allowed:true})).error);
 const allowed=await create(key,undefined,{permissions:{data_collection:['authenticationInfo','personalCommunications','technicalAndInteraction']}});
 assert.equal((await allowed.send({type:'getAiConsent'})).allowed,false);
 await allowed.send({type:'setAiConsent',allowed:true});assert.equal((await allowed.send({type:'getAiConsent'})).allowed,true);
});

test('a pending AI request does not block backup, and opting out aborts it',async()=>{
 let started,resolveStarted;started=new Promise(r=>resolveStarted=r);
 const h=await create({...key,aiConsent:{version:2,allowed:true,technicalAllowed:true}},undefined,{fetch:async(_url,opts)=>{resolveStarted();return new Promise((_resolve,reject)=>opts.signal.addEventListener('abort',()=>{reject(opts.signal.reason);}));}});
 const request=h.send({type:'claudeGenerate',prompt:'fixture',promptWithoutHistory:'fixture'});await started;
 assert.ok((await h.send({type:'exportBackup'})).backup);
 await h.send({type:'setAiConsent',allowed:false});assert.match((await request).error,/turned off/);
 assert.equal((await h.send({type:'getAiConsent'})).allowed,false);
});
test('idle, lock and active callbacks drain serialized persistence without losing learner state',async()=>{
 const E=require('../learning/engine'),h=await create({quantLearner:E.empty(),blockedSites:[]});
 const before=h.data.quantLearner;
 for(const state of ['idle','locked','active']) {h.idle(state);await h.send({type:'getState'});assert.deepEqual(h.data.quantLearner,before);}
});
