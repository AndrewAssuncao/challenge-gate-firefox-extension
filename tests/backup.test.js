'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../background/backup'),E=require('../learning/engine');
const {create}=require('./background-harness.cjs');
function fixture() {
 let q=E.apply(E.empty(),{op:'begin',mode:'math',track:'arithmetic',practice:true}).state;
 const lesson=Object.values(q.lessons)[0],problem=E.question(lesson);
 q=E.apply(q,{op:'attempt',lessonId:lesson.id,revision:lesson.revision,eventId:'fixture-attempt',answer:String(problem.answer),reason:problem.correctReason,construction:String(problem.construction?.answer ?? '')}).state;
 const legacy={currentTopicIndex:0,topicHistory:{},recentChallenges:[],conceptsIntroduced:[],weakAreas:[],totalSessions:0,streakDays:0,lastSessionDate:null};legacy.topicHistory.git_init={attempts:3,passes:2,fails:1,lastSeen:1};legacy.savedEvents=['fixture-legacy'];
 return {quantLearner:q,settings:{anthropicApiKey:'fixture-private-key',unlockDurationMinutes:7,idleTimeoutSeconds:120,difficultySchedule:{weekdayDefault:'normal',weekendDefault:'hard',timeRanges:[]},settingsProtected:true},blockedSites:[{domain:'example.com',enabled:true,challengeType:'terminal',dailyLimitMinutes:15,unlockDurationMinutes:7}],progression:{gitTier:2,gitCompleted:['g-init'],typingAvgWpm:100,totalChallengesCompleted:3},gitLearningProfile:legacy,learningProfile:legacy,terminalLearningProfile:legacy,typingHistory:[{wpm:100,accuracy:99,wordCount:25,passed:true,timestamp:1}],dailyChallengeLog:{'2026-01-01':{typing:2,git:1,totalTime:60}},timeTracking:{'2026-01-01':{'example.com':4}},unlocks:{'example.com':{unlockedAt:Date.now(),expiresAt:Date.now()+60000}},aiConsent:{version:2,allowed:true,technicalAllowed:true}};
}
test('full backup round trip preserves all evidence, legacy progress, site policies and non-secret settings',async()=>{
 const initial=fixture(),h=await create(initial),backup=(await h.send({type:'exportBackup'})).backup;
 assert.equal(JSON.stringify(backup).includes(initial.settings.anthropicApiKey),false);assert.equal('aiConsent' in backup.data,false);
 assert.equal(B.preview(JSON.stringify(backup)).events,1);
 await h.send({type:'removeSite',domain:'example.com'});
 await h.send({type:'updateSettings',settings:{anthropicApiKey:'current-fake-key',unlockDurationMinutes:90}});
 const imported=await h.send({type:'importBackup',text:JSON.stringify(backup)});assert.equal(imported.success,true);
 const after=(await h.send({type:'exportBackup'})).backup;assert.deepEqual(after.data,{...backup.data,unlocks:{}});
 assert.equal(h.data.settings.anthropicApiKey,'current-fake-key');assert.equal(h.data.aiConsent.allowed,false);
 assert.equal(JSON.stringify(h.data.backupRollback).includes('current-fake-key'),false);
 assert.match(h.request('https://example.com').redirectUrl,/challenge=terminal/); // restoring never revives a grant
 await h.send({type:'rollbackBackup'});assert.deepEqual(h.data.blockedSites,[]);assert.equal(h.data.settings.unlockDurationMinutes,90);assert.equal(h.data.settings.anthropicApiKey,'current-fake-key');
});
test('legacy quant-only export migrates without replacing unrelated records',async()=>{
 const initial=fixture(),h=await create(initial),old=E.empty();
 const preview=await h.send({type:'previewBackup',text:JSON.stringify(old)});assert.match(preview.warning,/temporary unlocks are retained/);
 const r=await h.send({type:'importBackup',text:JSON.stringify(old)});assert.equal(r.partial,true);assert.deepEqual(h.data.quantLearner,old);assert.match(r.notice,/temporary unlocks were retained/);assert.deepEqual(h.data.unlocks,initial.unlocks);assert.deepEqual(h.data.timeTracking,initial.timeTracking);
 assert.deepEqual(h.data.blockedSites,initial.blockedSites);assert.deepEqual(h.data.gitLearningProfile,initial.gitLearningProfile);assert.deepEqual(h.data.settings,initial.settings);
 assert.equal(h.data.aiConsent.allowed,false);
});
test('malformed and dangerous imports leave storage byte-for-byte unchanged',async()=>{
 const h=await create(fixture()),backup=(await h.send({type:'exportBackup'})).backup;
 const variants=['{','null',JSON.stringify({...backup,version:99}),JSON.stringify({...backup,addonId:'different@addon'})];
 const mutate=fn=>{const b=structuredClone(backup);fn(b);variants.push(JSON.stringify(b));};
 mutate(b=>b.data.settings.anthropicApiKey='fake');mutate(b=>b.data.settings.aiEnabled=true);
 mutate(b=>b.data.blockedSites[0].domain='https://example.com/x');mutate(b=>b.data.blockedSites[0].challengeType='javascript');
 mutate(b=>b.data.quantLearner.lessons=7);mutate(b=>b.data.quantLearner.events[0].correct='yes');
 mutate(b=>b.data.quantLearner.events.push({...b.data.quantLearner.events[0]}));
 mutate(b=>b.data.gitLearningProfile.topicHistory.git_init.passes=1000);
 mutate(b=>b.data.typingHistory[0].accuracy=999);mutate(b=>b.data.timeTracking['2026-01-01']['example.com']=-1);
 mutate(b=>b.data.quantLearner.lessons[Object.keys(b.data.quantLearner.lessons)[0]].seed=null);
 mutate(b=>b.data.quantLearner.lessons[Object.keys(b.data.quantLearner.lessons)[0]].revision=null);
 mutate(b=>b.data.gitLearningProfile.topicHistory.git_init.passes=null);
 mutate(b=>b.data.settings.idleTimeoutSeconds=1);
 variants.push(JSON.stringify(backup).replace('"settings":{','"settings":{"__proto__":{"polluted":true},'));
 for(const text of variants) {const before=h.data;const r=await h.send({type:'importBackup',text});assert.ok(r.error,text.slice(0,100));assert.deepEqual(h.data,before);}
 assert.throws(()=>B.parse('x'.repeat(B.MAX_BYTES+1)));assert.equal({}.polluted,undefined);
});
test('failed snapshot or replacement writes preserve data and a durable rollback when possible',async()=>{
 const original=fixture(),backup=B.exportState(fixture());backup.data.blockedSites=[];
 const h=await create(original);h.fail=true;
 assert.ok((await h.send({type:'importBackup',text:JSON.stringify(backup)})).error);assert.deepEqual(h.data.blockedSites,original.blockedSites);assert.equal(h.data.backupRollback,undefined);
 const failAfter=await create(original,undefined,{failSetNumber:2});
 assert.ok((await failAfter.send({type:'importBackup',text:JSON.stringify(backup)})).error);assert.deepEqual(failAfter.data.blockedSites,original.blockedSites);assert.ok(failAfter.data.backupRollback);
});
test('restore and concurrent commands serialize, expired unlocks are removed, unsupported learner is never overwritten',async()=>{
 const h=await create(fixture()),b=(await h.send({type:'exportBackup'})).backup;b.data.unlocks['example.com']={expiresAt:1};
 await Promise.all([h.send({type:'importBackup',text:JSON.stringify(b)}),h.send({type:'addSite',site:{domain:'other.example',challengeType:'typing',enabled:true}})]);
 assert.equal(h.data.blockedSites.length,2);assert.deepEqual(h.data.unlocks,{});
 const old=await create({quantLearner:{version:99,events:[],lessons:{},serial:0}}),before=old.data;
 assert.ok((await old.send({type:'importBackup',text:JSON.stringify(b)})).error);assert.deepEqual(old.data,before);
});
test('known credentials embedded in drafts are redacted from export and rollback',()=>{
 const raw=fixture();Object.values(raw.quantLearner.lessons)[0].draft='key=fixture-private-key and sk-ant-notreal-123';
 const b=B.exportState(raw);assert.equal(JSON.stringify(b).includes('fixture-private-key'),false);assert.equal(JSON.stringify(b).includes('sk-ant-notreal-123'),false);
});

test('absent schemas, unknown records and unknown learner versions are rejected without erasing evidence',async()=>{
 const h=await create(fixture()),b=(await h.send({type:'exportBackup'})).backup;
 for(const altered of [ {...b,version:undefined}, {...b,data:{...b.data,unknownKey:1}}, {...b,data:{...b.data,quantLearner:{...b.data.quantLearner,version:0}}} ]) {
  const before=h.data;assert.ok((await h.send({type:'importBackup',text:JSON.stringify(altered)})).error);assert.deepEqual(h.data,before);
 }
 const absent=await create({blockedSites:[]});assert.ok((await absent.send({type:'exportBackup'})).backup.data.quantLearner);
});
test('partial replacement failure recovers old records, including originally absent keys',async()=>{
 const h=await create({blockedSites:[],settings:{anthropicApiKey:'fake-current'}},undefined,{partialSetNumber:2});
 const b=B.exportState(fixture()),r=await h.send({type:'importBackup',text:JSON.stringify(b)});
 assert.match(r.error,/Previous records were recovered/);assert.deepEqual(h.data.blockedSites,[]);assert.equal(h.data.quantLearner,undefined);assert.equal(h.data.settings.anthropicApiKey,'fake-current');
 assert.equal(JSON.stringify(h.data.backupRollback).includes('fake-current'),false);
});
test('invalidations and their original evidence survive export/import and keep mastery withdrawn',async()=>{
 const raw=fixture(),target=raw.quantLearner.events[0].id;
 raw.quantLearner=E.apply(raw.quantLearner,{op:'invalidate',target}).state;
 const h=await create(raw),b=(await h.send({type:'exportBackup'})).backup;
 assert.equal(b.data.quantLearner.events.at(-1).kind,'invalidate');
 await h.send({type:'importBackup',text:JSON.stringify(b)});assert.deepEqual(h.data.quantLearner,raw.quantLearner);
 assert.equal(E.evidence(h.data.quantLearner,raw.quantLearner.events[0].skillId).independent,0);
});

test('restoring stale time totals cannot decrease today’s usage or revive unlocks',async()=>{
 const raw=fixture(),d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 raw.timeTracking[today]={'example.com':900};const h=await create(raw),b=B.exportState(raw);b.data.timeTracking[today]={'example.com':1};
 await h.send({type:'importBackup',text:JSON.stringify(b)});
 assert.equal(h.data.timeTracking[today]['example.com'],900);assert.deepEqual(h.data.unlocks,{});assert.match(h.request('https://example.com').redirectUrl,/reason=cap/);
});

test('markup-like drafts and credential-related domain/topic names remain inert data',()=>{
 const raw=fixture();Object.values(raw.quantLearner.lessons)[0].draft='<img src=x onerror=alert(1)> and javascript: text';
 raw.blockedSites[0].domain='1password.com';raw.gitLearningProfile.topicHistory.credential_helper={attempts:1,passes:0};
 const b=B.exportState(raw);assert.deepEqual(B.parse(JSON.stringify(b)).data.quantLearner,raw.quantLearner);
});

test('unsupported current schema requires explicit recovery approval, and snapshots exclude nested credentials',async()=>{
 const bad={quantLearner:{version:99,serial:1,events:[{id:'old',kind:'attempt',auth:{apiKey:'nested-sensitive-A'},password:'nested-sensitive-B'}],lessons:{old:{id:'old',draft:'public draft',credentials:{password:'nested-sensitive-C'},feedback:{solution:{apiKey:'nested-sensitive-D'}}}},token:'nested-sensitive-E'},settings:{anthropicApiKey:'fake-current-key'},timeTracking:{'2026-01-01':{apiKey:'nested-sensitive-F','example.com':2}},blockedSites:[]};
 const h=await create(bad),b=B.exportState(fixture()),text=JSON.stringify(b),preview=await h.send({type:'previewBackup',text});assert.equal(preview.needsRecoveryApproval,true);
 const before=h.data;assert.ok((await h.send({type:'importBackup',text})).error);assert.deepEqual(h.data,before);
 const snapshot=(await h.send({type:'exportRecovery'})).backup;const encoded=JSON.stringify(snapshot);
 for(const marker of ['fake-current-key','nested-sensitive-A','nested-sensitive-B','nested-sensitive-C','nested-sensitive-D','nested-sensitive-E','nested-sensitive-F'])assert.equal(encoded.includes(marker),false);
 assert.equal(snapshot.data.quantLearner.version,99);assert.equal(snapshot.data.quantLearner.lessons.old.draft,'public draft');
 assert.equal((await h.send({type:'importBackup',text,acceptRecovery:true})).success,true);
 assert.equal(h.data.backupRollback.format,'challenge-gate-recovery');assert.equal((await h.send({type:'exportRollback'})).backup.format,'challenge-gate-recovery');
 assert.match((await h.send({type:'rollbackBackup'})).error,/cannot be restored automatically/);
});
test('optional curriculum drafts preserve bounded strings and arbitrary method metadata cannot invent mastery',()=>{
 const raw=fixture(),lesson=Object.values(raw.quantLearner.lessons)[0];lesson.constructionDraft='12';lesson.reasonDraft='fixture';
 const b=B.exportState(raw);assert.equal(B.parse(JSON.stringify(b)).data.quantLearner.lessons[lesson.key].constructionDraft,'12');
 b.data.quantLearner.events[0].methodTag='invented';assert.throws(()=>B.parse(JSON.stringify(b)));
 lesson.reasonDraft='x'.repeat(81);assert.throws(()=>B.exportState(raw));
});

test('live legacy/progression writers reject records that could poison later export',async()=>{
 const h=await create(fixture()),before=h.data;
 assert.ok((await h.send({type:'recordLearningAttempt',discipline:'git',challenge:{id:'g-init',topic:'git_init'},passed:true})).error);
 assert.ok((await h.send({type:'updateProgression',progression:{gitTier:-1}})).error);
 assert.deepEqual(h.data,before);
});
test('startup preserves future-dated logs including math and brainteaser evidence',async()=>{
 const raw=fixture();raw.dailyChallengeLog['2099-12-31']={math:4,brainteasers:3,git:2,totalTime:42};
 const h=await create(raw);assert.deepEqual(h.data.dailyChallengeLog,raw.dailyChallengeLog);
});

test('exhausted genuine lesson with delayed retest remains fully exportable',()=>{
 const C=require('../learning/curriculum'),state=E.empty(),skill=C.skills.find(s=>s.mode==='math' && s.track==='arithmetic');
 for(const level of [0,1])for(let v=0;v<36;v++){const q=C.question(skill.id,v,false,level);state.events.push({id:`e-${level}-${v}`,kind:'exposure',skillId:skill.id,semanticKey:q.semanticKey,at:1});}
 const next=E.apply(state,{op:'begin',mode:skill.mode,track:skill.track,practice:true},1000).state;
 assert.equal(typeof Object.values(next.lessons)[0].retestAt,'number');assert.deepEqual(B.parse(JSON.stringify(B.exportState({quantLearner:next}))).data.quantLearner,next);
 assert.equal(typeof Object.values(B.recoveryState({quantLearner:next}).data.quantLearner.lessons)[0].retestAt,'number');
});
test('unsupported-current recovery ignores malformed time values instead of storing NaN or bypassing caps',async()=>{
 const d=new Date(),today=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const h=await create({blockedSites:[],timeTracking:{[today]:{'example.com':'bad','constructor':99,'good.example':200}}});
 const b=B.exportState(fixture()),r=await h.send({type:'importBackup',text:JSON.stringify(b),acceptRecovery:true});assert.equal(r.success,true);
 const after=(await h.send({type:'exportBackup'})).backup;assert.ok(B.parse(JSON.stringify(after)));assert.equal(after.data.timeTracking[today]['example.com'],undefined);assert.equal(after.data.timeTracking[today]['good.example'],200);
});
test('legacy-only restore and failed snapshot continue unchanged active-domain tracking',async()=>{
 const initial=fixture(),options={tabs:[{url:'https://example.com'}]},h=await create(initial,undefined,options);h.idle('active');await h.send({type:'getState'});assert.equal(h.activeDomain(),'example.com');
 assert.equal((await h.send({type:'importBackup',text:JSON.stringify(E.empty())})).success,true);assert.equal(h.activeDomain(),'example.com');
 const bad=await create(initial,undefined,options);bad.idle('active');await bad.send({type:'getState'});bad.fail=true;
 assert.ok((await bad.send({type:'importBackup',text:JSON.stringify(B.exportState(initial))})).error);assert.equal(bad.activeDomain(),'example.com');
});
test('credential-bearing dynamic keys cannot leak through normal or recovery exports',()=>{
 const raw=fixture();raw.gitLearningProfile.topicHistory['prefix-fixture-private-key-suffix']={attempts:1,passes:0};
 assert.throws(()=>B.exportState(raw));assert.equal(JSON.stringify(B.recoveryState(raw)).includes('fixture-private-key'),false);
 delete raw.gitLearningProfile.topicHistory['prefix-fixture-private-key-suffix'];raw.gitLearningProfile.topicHistory['sk-ant-notreal-123']={attempts:1,passes:0};
 assert.throws(()=>B.exportState(raw));assert.equal(JSON.stringify(B.recoveryState(raw)).includes('sk-ant-notreal-123'),false);
});
test('duplicate renamed site, unknown unlock and oversized learner draft cannot poison backup',async()=>{
 const raw=fixture();raw.blockedSites.push({...raw.blockedSites[0],domain:'other.example'});const h=await create(raw);
 assert.ok((await h.send({type:'updateSite',domain:'other.example',updates:{domain:'example.com'}})).error);
 assert.ok((await h.send({type:'unlock',domain:'https://bad.example/path'})).error);
 const lesson=Object.values(raw.quantLearner.lessons)[0];
 const draft=await h.send({type:'quantCommand',command:{op:'draft',lessonId:lesson.id,revision:lesson.revision,value:'x'.repeat(20001)}});
 if(!draft.error)assert.ok(h.data.quantLearner.lessons[lesson.key].draft.length<=20000);
 assert.ok((await h.send({type:'exportBackup'})).backup);
});
test('real legacy providers produce restorable records on each discipline',async()=>{
 const h=await create({blockedSites:[]});
 for(const discipline of ['python','git','terminal']) {
  const r=await h.send({type:'recordLearningAttempt',discipline,eventId:'real-'+discipline,challenge:{id:'fixture-'+discipline,topic:'fixture_topic'},passed:true,source:'local',struggled:false,usedHelp:false});assert.ok(!r.error,JSON.stringify(r));
 }
 assert.ok((await h.send({type:'exportBackup'})).backup);
});

test('previous-copy downloads validate local snapshot storage and redact the current key',async()=>{
 const snapshot=B.exportState(fixture()),lesson=Object.values(snapshot.data.quantLearner.lessons)[0];lesson.draft='new-fixture-private-key';
 const h=await create({blockedSites:[],settings:{anthropicApiKey:'new-fixture-private-key'},backupRollback:snapshot});
 const r=await h.send({type:'exportRollback'});assert.ok(r.backup);assert.equal(JSON.stringify(r.backup).includes('new-fixture-private-key'),false);
 const corrupt=structuredClone(snapshot);corrupt.data.quantLearner.credentials={password:'nested-fixture-secret'};
 const bad=await create({blockedSites:[],backupRollback:corrupt});assert.ok((await bad.send({type:'exportRollback'})).error);
 const recovery={format:'challenge-gate-recovery',version:1,addonId:'challenge-gate@extension',data:{quantLearner:{version:99,events:[{id:'x',apiKey:'nested-fixture-secret'}],lessons:{old:{draft:'nested-fixture-secret and new-fixture-private-key'}}},settings:{anthropicApiKey:'nested-fixture-secret'}}};
 const other=await create({blockedSites:[],settings:{anthropicApiKey:'new-fixture-private-key'},backupRollback:recovery});
 const safe=(await other.send({type:'exportRollback'})).backup;assert.equal(safe.format,'challenge-gate-recovery');assert.equal(JSON.stringify(safe).includes('nested-fixture-secret'),false);
});

test('AI teaching survives teach-to-guided continuation, resumed commands and full backup',async()=>{
 const h=await create({blockedSites:[]});let r=await h.send({type:'quantCommand',command:{op:'begin',mode:'math',track:'arithmetic',practice:true}});
 r=await h.send({type:'quantCommand',command:{op:'attempt',lessonId:r.lesson.id,revision:r.lesson.revision,eventId:'teaching-fail',dontKnow:true}});assert.equal(r.lesson.stage,'teach');
 const teaching={skillId:r.lesson.skillId,stage:'teach',explanation:'Fixture explanation',workedExample:'Fixture example',connection:'Fixture connection',nextStep:'Fixture check'};
 r=await h.send({type:'quantCommand',command:{op:'teaching',lessonId:r.lesson.id,revision:r.lesson.revision,value:teaching}});assert.ok(!r.error);
 r=await h.send({type:'quantCommand',command:{op:'continue',lessonId:r.lesson.id,revision:r.lesson.revision}});assert.ok(!r.error,JSON.stringify(r));assert.equal(r.lesson.stage,'guided');assert.equal(r.lesson.teaching.stage,'teach');
 const backup=(await h.send({type:'exportBackup'})).backup;assert.deepEqual(B.parse(JSON.stringify(backup)).data.quantLearner,r.state);
 assert.equal((await h.send({type:'importBackup',text:JSON.stringify(backup)})).success,true);
 r=await h.send({type:'quantCommand',command:{op:'begin',mode:'math',track:'arithmetic',practice:true}});assert.ok(!r.error);assert.equal(r.lesson.stage,'guided');
});
test('degenerate placeholder keys cannot be saved, sent or corrupt legitimate backups',async()=>{
 const h=await create({blockedSites:[],settings:{anthropicApiKey:'a'}});assert.ok((await h.send({type:'exportBackup'})).backup);
 for(const key of ['a','settings',' ','long key with spaces'])assert.ok((await h.send({type:'updateSettings',settings:{anthropicApiKey:key}})).error);
 assert.match((await h.send({type:'claudeGenerate',prompt:'fixture',promptWithoutHistory:'fixture'})).error,/key is invalid/);
 const raw=fixture();raw.settings.anthropicApiKey='a';assert.equal(B.exportState(raw).data.blockedSites[0].domain,'example.com');
});


test('event kinds reject irrelevant fields and nested payloads at all backup boundaries',async()=>{
 const base=B.exportState(fixture()),h=await create(fixture());
 for(const event of [{id:'exposure-only',kind:'exposure',skillId:'arith-percent',semanticKey:'key',at:1},{id:'invalidation-only',kind:'invalidate',target:'fixture-attempt',at:1}]) {
  for(const field of ['variant','methodTag','lessonId','familyId','selectedReason','construction','correct','target','skillId','semanticKey']) {
   if(Object.hasOwn(event,field))continue;
   const data=structuredClone(base.data),marker='NESTED-FAKE-SECRET';
   data.quantLearner.events.push({...event,[field]:{credentials:{password:marker}}});
   assert.throws(()=>B.exportState(data));
   const text=JSON.stringify({...base,data});assert.throws(()=>B.parse(text));
   assert.throws(()=>B.parse(JSON.stringify(data.quantLearner)));
   const before=h.data;assert.ok((await h.send({type:'importBackup',text})).error);assert.deepEqual(h.data,before);
   const recovered=B.recoveryState(data);assert.equal(JSON.stringify(recovered).includes(marker),false);
   assert.deepEqual(recovered.data.quantLearner.events.at(-1),event);
  }
 }
});
