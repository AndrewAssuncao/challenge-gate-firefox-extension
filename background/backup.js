/* Versioned, inert JSON backups. Never evaluate imported values. */
'use strict';
const GateBackup = (() => {
  const E = typeof QuantLearning !== 'undefined' ? QuantLearning : require('../learning/engine');
  const C = typeof QuantCurriculum !== 'undefined' ? QuantCurriculum : require('../learning/curriculum');
  const ID = 'challenge-gate@extension', MAX_BYTES = 16 * 1024 * 1024;
  const KEYS = ['quantLearner','blockedSites','settings','progression','learningProfile','terminalLearningProfile','gitLearningProfile','typingHistory','dailyChallengeLog','timeTracking','unlocks'];
  const SETTINGS = ['unlockDurationMinutes','idleTimeoutSeconds','typingWordCount','typingWpm25','typingWpm50','typingAccuracyThreshold','difficultySchedule','settingsProtected','settingsTypingWpm'];
  const own = (v,k) => Object.prototype.hasOwnProperty.call(v,k);
  const fail = () => { throw Error('Unsupported or malformed backup. No data was changed.'); };
  const object = v => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(); };
  const fields = (v,allowed,required=[]) => { object(v); if(Object.keys(v).some(k=>!allowed.includes(k)) || required.some(k=>!own(v,k))) fail(); };
  const str = (v,max=20000) => { if(typeof v!=='string' || v.length>max) fail(); };
  const num = (v,max=Number.MAX_SAFE_INTEGER) => { if(typeof v!=='number' || !Number.isFinite(v) || v<0 || v>max) fail(); };
  const integer = v => { num(v); if(!Number.isSafeInteger(v)) fail(); };
  const bool = v => { if(typeof v!=='boolean') fail(); };
  const choice = (v,list) => { if(!list.includes(v)) fail(); };
  const list = (v,fn,max=100000) => { if(!Array.isArray(v) || v.length>max) fail(); v.forEach(x=>fn(x)); };
  const dict = (v,fn) => { object(v); if(Object.keys(v).length>100000) fail(); Object.entries(v).forEach(([k,x])=>{str(k,200);fn(x,k);}); };
  const optional = (v,k,fn) => { if(own(v,k) && v[k]!==null) fn(v[k]); };
  const date = v => { str(v,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(v) || new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v) fail(); };
  const domain = v => { str(v,253); if(!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/.test(v) || ['__proto__','constructor','prototype'].includes(v)) fail(); };
  function inert(v,depth=0) {
    if(depth>30) fail();
    if(typeof v==='string') { str(v); if(/sk-ant-[\w-]+/i.test(v)) fail(); }
    else if(typeof v==='number') { if(!Number.isFinite(v)) fail(); }
    else if(Array.isArray(v)) { if(v.length>100000) fail(); v.forEach(x=>inert(x,depth+1)); }
    else if(v && typeof v==='object') {
      for(const [k,x] of Object.entries(v)) {
        if(['__proto__','constructor','prototype'].includes(k) || /sk-ant-[\w-]+/i.test(k)) fail();
        inert(x,depth+1);
      }
    } else if(v!==null && typeof v!=='boolean') fail();
  }
  const EVENT_FIELDS = {
    exposure:['id','kind','skillId','semanticKey','at'],
    invalidate:['id','kind','target','at'],
    attempt:['id','kind','skillId','semanticKey','at','lessonId','variant','familyId','contentVersion','gradingVersion','isTransfer','firstTry','retest','selectedReason','construction','stage','correct','assisted','dontKnow','error','elapsedMs','completed','methodTag']
  };
  function quant(v) {
    fields(v,['version','serial','events','lessons'],['version','serial','events','lessons']); E.validate(v); integer(v.serial);
    const ids=new Set();
    list(v.events,e=>{
      object(e);choice(e.kind,['attempt','exposure','invalidate']);
      fields(e,EVENT_FIELDS[e.kind],e.kind==='invalidate'?['id','kind','target','at']:['id','kind','skillId','semanticKey','at']);
      str(e.id,120); if(!e.id || ids.has(e.id)) fail(); ids.add(e.id); num(e.at); choice(e.kind,['attempt','exposure','invalidate']);
      if(e.kind==='invalidate') str(e.target,120);
      else { if(!C.get(e.skillId)) fail(); str(e.semanticKey); }
      if(e.kind==='attempt') {
        ['lessonId','variant','familyId'].forEach(k=>str(e[k])); choice(e.stage,['diagnostic','guided','check','review']);
        bool(e.correct);bool(e.assisted);
        optional(e,'methodTag',tag=>{str(tag,80);const allowed=C.get(e.skillId)?.requiredMethods || [];if(!allowed.includes(tag))fail();});
        ['isTransfer','firstTry','retest','dontKnow','completed'].forEach(k=>optional(e,k,bool));
        ['contentVersion','gradingVersion','elapsedMs'].forEach(k=>optional(e,k,num));
        if(e.construction!==null && own(e,'construction') && (typeof e.construction!=='number' || !Number.isFinite(e.construction))) fail();
        ['selectedReason','error'].forEach(k=>optional(e,k,str));
        if(C.validateItemIdentity && !C.validateItemIdentity(e))fail();
      }
    });
    dict(v.lessons,(l,k)=>{
      fields(l,['id','key','mode','track','skillId','stage','reason','seed','level','revision','assisted','draft','constructionDraft','reasonDraft','checks','required','harder','practice','startedAt','stepStartedAt','retestAt','hints','teaching','feedback'],['id','key','mode','track','skillId','stage','seed','revision']);
      if(l.key!==k || !C.get(l.skillId)) fail(); choice(l.mode,['math','brainteasers','python']);choice(l.stage,['diagnostic','teach','guided','check','review','done']);
      str(l.id,120);integer(l.seed);integer(l.revision);
      optional(l,'constructionDraft',x=>str(x,100));optional(l,'reasonDraft',x=>str(x,80));
      ['id','key','track','reason','draft'].forEach(x=>optional(l,x,str));
      ['seed','level','revision','checks','required','hints'].forEach(x=>optional(l,x,integer));
      ['startedAt','stepStartedAt','retestAt'].forEach(x=>optional(l,x,num)); ['assisted','harder','practice'].forEach(x=>optional(l,x,bool));
      if(l.teaching) {fields(l.teaching,['skillId','stage','explanation','workedExample','connection','nextStep']);const same=l.teaching.stage===l.stage, carried=l.stage==='guided' && l.teaching.stage==='teach';if(!same && !carried)fail();E.validateTeaching(l.teaching,{...l,stage:l.teaching.stage});}
      if(l.feedback) { fields(l.feedback,['correct','solution','assisted','stage','eventId','diagnosis'],['correct','assisted','stage','eventId']); bool(l.feedback.correct);bool(l.feedback.assisted);str(l.feedback.solution);str(l.feedback.stage);str(l.feedback.eventId);optional(l.feedback,'diagnosis',str); }
    });
  }
  function legacy(v) {
    if(v===null) return;
    fields(v,['currentTopicIndex','topicHistory','recentChallenges','conceptsIntroduced','weakAreas','totalSessions','streakDays','lastSessionDate','savedEvents'],['currentTopicIndex','topicHistory']); integer(v.currentTopicIndex); if(v.currentTopicIndex>100) fail();
    ['totalSessions','streakDays'].forEach(k=>optional(v,k,integer)); optional(v,'lastSessionDate',date);
    ['conceptsIntroduced','weakAreas','savedEvents'].forEach(k=>optional(v,k,a=>list(a,str)));
    optional(v,'recentChallenges',a=>list(a,c=>{ fields(c,['id','topic','passed','source','summary','timestamp','mistakes'],['id','topic','passed','timestamp']);str(c.id);str(c.topic);bool(c.passed);num(c.timestamp);optional(c,'source',str);optional(c,'summary',str);optional(c,'mistakes',num); }));
    dict(v.topicHistory,s=>{fields(s,['attempts','passes','fails','lastSeen','confidenceLevel','consecutivePasses','helpRequests','failedAttemptsThenPassed','lastReviewDate','nextReviewDate'],['attempts','passes']);
      num(s.attempts);num(s.passes);Object.keys(s).forEach(k=>optional(s,k,num)); if(s.passes>s.attempts || (s.confidenceLevel || 0)>5) fail(); });
  }
  function settings(v) {
    fields(v,SETTINGS);
    for(const k of Object.keys(v)) {
      if(k==='settingsProtected') bool(v[k]);
      else if(k==='difficultySchedule') {
        const s=v[k],levels=['relaxed','normal','hard','intense'];fields(s,['weekdayDefault','weekendDefault','timeRanges'],['weekdayDefault','weekendDefault','timeRanges']);
        choice(s.weekdayDefault,levels);choice(s.weekendDefault,levels);
        list(s.timeRanges,r=>{fields(r,['start','end','difficulty'],['start','end','difficulty']);choice(r.difficulty,levels);for(const x of [r.start,r.end]) if(typeof x!=='string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(x)) fail();},100);
      } else { integer(v[k]); const max=k==='idleTimeoutSeconds'?600:k==='typingAccuracyThreshold'?100:k==='unlockDurationMinutes'?1440:1000;if(v[k]<(k==='idleTimeoutSeconds'?15:1) || v[k]>max) fail(); }
    }
  }
  function validateData(v,partial=false) {
    fields(v,KEYS,partial?['quantLearner']:KEYS); inert(v);
    if(own(v,'quantLearner')) quant(v.quantLearner);
    if(own(v,'settings')) settings(v.settings);
    if(own(v,'blockedSites')) { const domains=new Set();list(v.blockedSites,s=>{
      fields(s,['domain','enabled','challengeType','dailyLimitMinutes','unlockDurationMinutes'],['domain','enabled','challengeType']);domain(s.domain);if(domains.has(s.domain))fail();domains.add(s.domain);bool(s.enabled);choice(s.challengeType,['typing','git','python','terminal','math','brainteasers']);
      optional(s,'dailyLimitMinutes',n=>num(n,1440));optional(s,'unlockDurationMinutes',n=>num(n,1440));
    },1000); }
    for(const k of ['learningProfile','terminalLearningProfile','gitLearningProfile']) if(own(v,k)) legacy(v[k]);
    if(own(v,'progression')) { fields(v.progression,['pythonTier','pythonCompleted','terminalTier','terminalCompleted','gitTier','gitCompleted','typingAvgWpm','totalChallengesCompleted']);
      Object.entries(v.progression).forEach(([k,x])=>['pythonCompleted','terminalCompleted','gitCompleted'].includes(k)?list(x,str):num(x)); }
    if(own(v,'typingHistory')) list(v.typingHistory,t=>{fields(t,['wpm','accuracy','wordCount','passed','timestamp'],['wpm','accuracy','wordCount','passed','timestamp']);num(t.wpm,10000);num(t.accuracy,100);integer(t.wordCount);bool(t.passed);num(t.timestamp);},10000);
    if(own(v,'dailyChallengeLog')) dict(v.dailyChallengeLog,(x,k)=>{date(k);fields(x,['typing','python','terminal','git','math','brainteasers','totalTime']);Object.values(x).forEach(n=>num(n));});
    if(own(v,'timeTracking')) dict(v.timeTracking,(x,k)=>{date(k);dict(x,(n,d)=>{domain(d);num(n);});});
    if(own(v,'unlocks')) dict(v.unlocks,(u,d)=>{domain(d);fields(u,['unlockedAt','expiresAt'],['expiresAt']);num(u.expiresAt);optional(u,'unlockedAt',num);if(u.unlockedAt>u.expiresAt)fail();});
    return v;
  }
  function defaults() { return {quantLearner:E.empty(),blockedSites:[],settings:{},progression:{},learningProfile:null,terminalLearningProfile:null,gitLearningProfile:null,typingHistory:[],dailyChallengeLog:{},timeTracking:{},unlocks:{}}; }
  function exportState(raw,version='1.1.0') {
    const data=defaults();
    KEYS.forEach(k=>{if(raw[k]!==undefined) data[k]=raw[k];});
    data.settings=Object.fromEntries(SETTINGS.filter(k=>own(raw.settings || {},k)).map(k=>[k,raw.settings[k]]));
    const known=typeof raw.settings?.anthropicApiKey==='string' && raw.settings.anthropicApiKey.length>=12 && !/\s/.test(raw.settings.anthropicApiKey)?raw.settings.anthropicApiKey:null;
    function checkKeys(v) {if(!v || typeof v!=='object')return;for(const [k,x] of Object.entries(v)){if(/sk-ant-[\w-]+/i.test(k) || (known && k.includes(known))) throw Error('A record key contains a credential. Use the recognized-field recovery export for reviewed cleanup.');checkKeys(x);}}
    checkKeys(data);
    const text=JSON.stringify(data,(_k,v)=>typeof v==='string'?v.replace(/sk-ant-[\w-]+/gi,'[REDACTED]').split(known || '\u0000').join(known?'[REDACTED]':'\u0000'):v);
    if(new TextEncoder().encode(text).length>MAX_BYTES) throw Error('Backup data exceeds the 16 MiB limit. No data was changed.');
    const clean=JSON.parse(text);validateData(clean);
    return bounded({format:'challenge-gate-backup',version:1,addonId:ID,addonVersion:version,exportedAt:new Date().toISOString(),data:clean});
  }

  // Recovery exports project only recognized fields. Arbitrary unknown objects
  // and nested credentials are never copied, even for an unsupported schema.
  function recoveryState(raw,version='1.1.0') {
    const primitive=v=>v===null || ['string','boolean','number'].includes(typeof v);
    const pick=(v,keys)=>Object.fromEntries(keys.filter(k=>v && own(v,k) && primitive(v[k])).map(k=>[k,v[k]]));
    const array=v=>Array.isArray(v)?v:[];
    const map=(v,fn)=>Object.fromEntries(Object.entries(v && typeof v==='object' && !Array.isArray(v)?v:{}).filter(([k])=>!['__proto__','constructor','prototype'].includes(k) && !/sk-ant-[\w-]+/i.test(k) && !(typeof raw.settings?.anthropicApiKey==='string' && raw.settings.anthropicApiKey.length>=12 && k.includes(raw.settings.anthropicApiKey))).map(([k,x])=>[k,fn(x)]));
    const lessonKeys=['id','key','mode','track','skillId','stage','reason','seed','level','revision','assisted','draft','constructionDraft','reasonDraft','checks','required','harder','practice','startedAt','stepStartedAt','retestAt','hints'];
    const data=defaults();
    const q=raw.quantLearner || {};
    data.quantLearner={...pick(q,['version','serial']),events:array(q.events).map(e=>pick(e,EVENT_FIELDS[e?.kind] || [])),lessons:map(q.lessons,l=>({...pick(l,lessonKeys),...(l?.feedback?{feedback:pick(l.feedback,['correct','solution','assisted','stage','eventId','diagnosis'])}:{}),...(l?.teaching?{teaching:pick(l.teaching,['skillId','stage','explanation','workedExample','connection','nextStep'])}:{})}))};
    data.blockedSites=array(raw.blockedSites).map(s=>pick(s,['domain','enabled','challengeType','dailyLimitMinutes','unlockDurationMinutes']));
    data.settings=pick(raw.settings,SETTINGS);
    if(raw.settings?.difficultySchedule) data.settings.difficultySchedule={...pick(raw.settings.difficultySchedule,['weekdayDefault','weekendDefault']),timeRanges:array(raw.settings.difficultySchedule.timeRanges).map(r=>pick(r,['start','end','difficulty']))};
    data.progression=pick(raw.progression,['pythonTier','terminalTier','gitTier','typingAvgWpm','totalChallengesCompleted']);
    for(const k of ['pythonCompleted','terminalCompleted','gitCompleted']) if(Array.isArray(raw.progression?.[k]))data.progression[k]=raw.progression[k].filter(primitive);
    for(const k of ['learningProfile','terminalLearningProfile','gitLearningProfile']) if(raw[k]) {
      const v=raw[k];data[k]={...pick(v,['currentTopicIndex','totalSessions','streakDays','lastSessionDate']),topicHistory:map(v.topicHistory,s=>pick(s,['attempts','passes','fails','lastSeen','confidenceLevel','consecutivePasses','helpRequests','failedAttemptsThenPassed','lastReviewDate','nextReviewDate'])),recentChallenges:array(v.recentChallenges).map(c=>pick(c,['id','topic','passed','source','summary','timestamp','mistakes']))};
      for(const field of ['conceptsIntroduced','weakAreas','savedEvents']) if(Array.isArray(v[field]))data[k][field]=v[field].filter(primitive);
    }
    data.typingHistory=array(raw.typingHistory).map(t=>pick(t,['wpm','accuracy','wordCount','passed','timestamp']));
    data.dailyChallengeLog=map(raw.dailyChallengeLog,l=>pick(l,['typing','python','terminal','git','math','brainteasers','totalTime']));
    data.timeTracking=map(raw.timeTracking,domains=>Object.fromEntries(Object.entries(domains && typeof domains==='object'?domains:{}).filter(([k,x])=>typeof x==='number' && Number.isFinite(x) && !/sk-ant-[\w-]+/i.test(k) && !(typeof raw.settings?.anthropicApiKey==='string' && raw.settings.anthropicApiKey.length>=12 && k.includes(raw.settings.anthropicApiKey)) && !['__proto__','constructor','prototype'].includes(k))));
    data.unlocks=map(raw.unlocks,u=>pick(u,['unlockedAt','expiresAt']));
    const known=typeof raw.settings?.anthropicApiKey==='string' && raw.settings.anthropicApiKey.length>=12 && !/\s/.test(raw.settings.anthropicApiKey)?raw.settings.anthropicApiKey:null;
    const clean=JSON.parse(JSON.stringify(data,(_k,v)=>typeof v==='string'?v.replace(/sk-ant-[\w-]+/gi,'[REDACTED]').split(known || '\u0000').join(known?'[REDACTED]':'\u0000'):v));
    return bounded({format:'challenge-gate-recovery',version:1,addonId:ID,addonVersion:version,exportedAt:new Date().toISOString(),notice:'Recognized fields only. Unknown fields and nested objects were excluded. This snapshot cannot be automatically restored; keep it for a reviewed migration.',data:clean});
  }
  function bounded(snapshot) {if(new TextEncoder().encode(JSON.stringify(snapshot)).length>MAX_BYTES)throw Error('Backup exceeds the 16 MiB limit. No data was changed.');return snapshot;}
  function safeSnapshot(snapshot,knownKey,version='1.1.0') {
    // Local rollback storage is untrusted at the download boundary too.
    fields(snapshot,['format','version','addonId','addonVersion','exportedAt','notice','data'],['format','version','addonId','data']);
    if(snapshot.version!==1 || snapshot.addonId!==ID)fail();
    if(snapshot.format==='challenge-gate-recovery') {
      object(snapshot.data);
      const prior=recoveryState(snapshot.data,version);
      return recoveryState({...prior.data,settings:{...prior.data.settings,anthropicApiKey:knownKey}},version);
    }
    if(snapshot.format!=='challenge-gate-backup')fail();
    const parsed=parse(JSON.stringify(snapshot));
    return exportState({...parsed.data,settings:{...parsed.data.settings,anthropicApiKey:knownKey}},version);
  }
  function validateRecord(key,value) {const d=defaults();d[key]=value;validateData(d);return value;}
  function parse(text) {
    if(typeof text!=='string' || new TextEncoder().encode(text).length>MAX_BYTES) fail();
    let b;try{b=JSON.parse(text);}catch{fail();}
    if(b?.version===1 && own(b,'events') && own(b,'lessons')) {inert(b);quant(b);return {partial:true,data:{quantLearner:b},label:'Legacy quant-only export: replace quant learning only.'};}
    if(b?.format==='challenge-gate-recovery') throw Error('Recovery-only snapshot: download and retain it for a reviewed migration. It cannot be restored automatically.');
    fields(b,['format','version','addonId','addonVersion','exportedAt','data'],['format','version','addonId','data']);
    if(b.format!=='challenge-gate-backup' || b.version!==1 || b.addonId!==ID) fail();
    optional(b,'addonVersion',str);optional(b,'exportedAt',str);validateData(b.data);
    return {partial:false,data:b.data,label:'Full backup: replace learning, legacy progress, site policies, time totals and non-secret settings.'};
  }
  function preview(text) {const b=parse(text);return {label:b.label,partial:b.partial,sites:b.data.blockedSites?.length || 0,events:b.data.quantLearner.events.length,warning:b.partial?'This quant-only file may include personal drafts. Import keeps your current API key and disables AI. Site policies, legacy progress, usage and temporary unlocks are retained.':'This file may include personal drafts and site domains. Import keeps your current API key and disables AI. All temporary unlocks will be cleared. Today’s consumed time will keep the larger current or backed-up total.'};}
  return {KEYS,SETTINGS,MAX_BYTES,exportState,recoveryState,parse,preview,validateData,validateRecord,safeSnapshot};
})();
if(typeof module!=='undefined') module.exports=GateBackup;
