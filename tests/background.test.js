const {test}=require('node:test'),assert=require('node:assert/strict');
const {create}=require('./background-harness.cjs');
test('startup preserves real legacy history and Terminal site policy',async()=>{
 const profile={currentTopicIndex:0,topicHistory:{basics:{passes:6,attempts:6}}};
 const site={domain:'example.com',challengeType:'terminal',dailyLimitMinutes:15,unlockDurationMinutes:7,enabled:true};
 const h=await create({learningProfile:profile,blockedSites:[site],settings:{settingsProtected:true}});
 assert.deepEqual(h.data.learningProfile,profile);assert.deepEqual(h.data.blockedSites,[site]);assert.match(h.request('https://example.com').redirectUrl,/challenge=terminal/);
 const r=await h.send({type:'unlock',domain:'example.com'});assert.ok(Math.abs(r.expiresAt-Date.now()-7*60000)<1000);assert.deepEqual(Object.keys(h.request('https://example.com')),[]);
});
test('daily cap continues overriding unlock',async()=>{
 const d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const h=await create({blockedSites:[{domain:'example.com',challengeType:'math',dailyLimitMinutes:1,enabled:true}],timeTracking:{[today]:{'example.com':60}},unlocks:{'example.com':{expiresAt:Date.now()+60000}}});
 assert.match(h.request('https://example.com').redirectUrl,/reason=cap/);
});
test('concurrent legacy outcomes merge and persistence failure reports an error',async()=>{
 const h=await create();
 const make=i=>({type:'recordLearningAttempt',discipline:'git',eventId:'git'+i,challenge:{id:'q'+i,topic:'git_init'},passed:true,source:'local',struggled:false,usedHelp:false});
 await Promise.all([h.send(make(1)),h.send(make(2))]);assert.equal(h.data.gitLearningProfile.topicHistory.git_init.passes,2);
 await h.send(make(2));assert.equal(h.data.gitLearningProfile.topicHistory.git_init.passes,2);
 h.fail=true;const bad=await h.send(make(3));assert.match(bad.error,/disk failure/);assert.equal(h.data.gitLearningProfile.topicHistory.git_init.passes,2);
});
