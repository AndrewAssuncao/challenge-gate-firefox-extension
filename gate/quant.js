/* Shared lesson UI: local teaching and assessment; optional personalized tutor. */
'use strict';
const QuantChallenge = (() => {
  let config, mode, track, lesson, state, generation=0, busy=false, pending=null, queuedSubmission=null, actions=Promise.resolve(), answerComposition=null, constructionComposition=null;
  const composing=new Set();
  const panel=document.getElementById('quant-challenge');
  const el=id=>document.getElementById(id);
  const text=(id,value)=>{el(id).textContent=value;};
  async function send(cmd) {
    const r=await browser.runtime.sendMessage({type:'quantCommand',command:cmd});
    if(r.error) {const e=Error(r.error);e.retryable=!!r.retryable;throw e;}
    return r;
  }
  function error(e) {text('quant-error',e.message || String(e));el('quant-reload').hidden=false;}
  async function mutate(cmd, redraw=true) {
    const token=generation;
    const r=await send({lessonId:lesson.id,revision:lesson.revision,...cmd});
    if(token!==generation) return null;
    lesson=r.lesson;state=r.state;
    if(redraw) await render();
    return r;
  }
  async function init(cfg, type) {
    destroy();config=cfg;mode=type;track=mode==='math'?(cfg.isArcade && cfg.appliedTrack?'applied':'arithmetic'):'';
    panel.classList.remove('hidden');
    el('quant-track-wrap').hidden=mode!=='math';
    const oldApplied=el('quant-track').querySelector('option[value=applied]');if(oldApplied)oldApplied.remove();
    if(cfg.isArcade){const option=document.createElement('option');option.value='applied';option.textContent='Trading & Options (simulated)';el('quant-track').appendChild(option);}
    el('quant-track').value=track;
    el('quant-track').onchange=async()=>{track=el('quant-track').value;await begin();};
    el('quant-reload').onclick=()=>begin();
    el('quant-hint').onclick=()=>queuedSubmission?Promise.resolve():act(async()=>{await mutate({op:'assist'});});
    el('quant-learn').onclick=()=>submitGesture(true);
    el('quant-next').onclick=()=>act(async()=>{await mutate({op:'continue'});});
    el('quant-tutor').onclick=()=>queuedSubmission?Promise.resolve():act(tutor);
    el('quant-form').onsubmit=e=>{e.preventDefault();return submitGesture(false);};
    const saveAnswer=()=>{
      if(composing.size || !lesson)return;
      const lessonId=lesson.id,questionId=QuantLearning.question(lesson).id;
      const value=el('quant-answer').value,construction=el('quant-construction').value,reason=el('quant-reason-choice').value;
      return act(()=>{
        if(lesson.id===lessonId && QuantLearning.question(lesson).id===questionId && ['diagnostic','guided','check','review'].includes(lesson.stage))
          return mutate({op:'draft',value,construction,reason},false);
      },true);
    };
    el('quant-answer').oninput=e=>{if(!e.isComposing)saveAnswer();};
    answerComposition=e=>{composing.delete(e.currentTarget.id);saveAnswer();};
    constructionComposition=answerComposition;
    ['quant-answer','quant-construction'].forEach(id=>{el(id).oncompositionstart=()=>composing.add(id);});
    el('quant-construction').oninput=e=>{if(!e.isComposing)saveAnswer();};
    el('quant-reason-choice').onchange=()=>{text('quant-reason-preview',el('quant-reason-choice').selectedOptions[0]?.textContent || '');saveAnswer();};
    el('quant-construction').addEventListener('compositionend',constructionComposition);
    el('quant-answer').addEventListener('compositionend',answerComposition);
    await begin(true);
  }
  async function begin(fresh=true) {
    const token=++generation;busy=false;pending=null;queuedSubmission=null;
    Gate.hideContinuePrompt();
    PythonChallenge.destroyWorker();
    document.getElementById('python-challenge').classList.add('hidden');
    try {
      const r=await send({op:'begin',mode,track,practice:config.isArcade,fresh});
      if(token!==generation) return;
      lesson=r.lesson;state=r.state; await render();
    } catch(e){error(e);}
  }
  function act(fn, draft=false) {
    const token=generation;
    const work=actions.then(async()=>{
      if(token!==generation) return;
      // Autosave shares the ordered mutation queue but never disables or redraws inputs.
      // Disabling a focused field during op:draft drops focus/caret in Gecko.
      if(!draft){busy=true;panel.setAttribute('aria-busy','true');syncControls();}
      try {if(!draft)text('quant-error','');await fn();}catch(e){if(token===generation)error(e);}finally{
        if(!draft && token===generation){busy=false;panel.removeAttribute('aria-busy');syncControls();}
      }
    });
    actions=work.catch(()=>{});
    return work;
  }
  function submitGesture(dontKnow) {
    if(queuedSubmission || busy || !lesson || !['diagnostic','guided','check','review'].includes(lesson.stage))return Promise.resolve();
    const q=QuantLearning.question(lesson);
    const request={generation,lessonId:lesson.id,questionId:q.id,submission:{
      answer:q.kind==='code'?el('python-editor').value:el('quant-answer').value,
      ...(q.kind==='code'?{draft:el('python-editor').value}:{}),
      reason:el('quant-reason-choice').value,construction:el('quant-construction').value}};
    queuedSubmission=request;syncControls();
    return act(async()=>{
      if(request.generation!==generation || lesson.id!==request.lessonId || QuantLearning.question(lesson).id!==request.questionId || !['diagnostic','guided','check','review'].includes(lesson.stage))return;
      await attempt(dontKnow,undefined,request.submission);
    }).finally(()=>{if(queuedSubmission===request){queuedSubmission=null;syncControls();}});
  }
  async function attempt(dontKnow, correct, submission) {
    // A retry keeps its identifier only while the submitted payload is unchanged.
    const next={op:'attempt',answer:submission?.answer ?? el('quant-answer').value,reason:submission?.reason ?? el('quant-reason-choice').value,construction:submission?.construction ?? el('quant-construction').value,correct,dontKnow,
      ...(submission && QuantLearning.question(lesson).kind==='code'?{draft:submission.draft ?? el('python-editor').value}:{}),
      ...(typeof submission?.output==='string'?{output:submission.output}:{})};
    if(!pending || JSON.stringify({...pending,eventId:undefined})!==JSON.stringify(next))pending={...next,eventId:crypto.randomUUID()};
    const cmd=pending;
    let r;
    try {r=await mutate(cmd,false);} catch(e) {if(!e.retryable) pending=null;throw e;}
    if(!r) return;
    pending=null;
    await render();
  }
  async function tutor() {
    // Only a validated, durably saved teaching response counts as assistance.
    const token=generation;
    text('quant-error','Asking your configured tutor…');
    const r=await browser.runtime.sendMessage({type:'claudeGenerate',prompt:QuantLearning.prompt(state,lesson),promptWithoutHistory:QuantLearning.prompt(state,lesson,false),maxTokens:1600});
    if(token!==generation) return;
    if(r.error) throw Error(r.error+' — the local lesson remains available.');
    const response=JSON.parse(r.content);
    if(response.stage==='lesson')response.stage=lesson.stage;
    const value=QuantLearning.validateTeaching(response,lesson);
    await mutate({op:'teaching',value});
  }
  async function render() {
    text('quant-error','');el('quant-reload').hidden=true;
    const skill=QuantCurriculum.get(lesson.skillId), q=QuantLearning.question(lesson), ev=QuantLearning.evidence(state,skill.id);
    text('quant-title',skill.name);
    text('quant-reason',lesson.reason);
    text('quant-status',`${lesson.stage} · ${ev.status} · ${ev.novelIndependent} novel checks · ${ev.reassessed} known-item reassessments`);
    text('quant-scope',skill.scopeNote);
    const teaching=lesson.stage==='teach' || lesson.stage==='guided';
    el('quant-teaching').hidden=!teaching && !lesson.teaching;
    text('quant-objective','Goal: '+skill.objective);
    text('quant-contrast','Watch for: '+skill.commonError);
    text('quant-explanation',lesson.teaching?.explanation || q.explanation);
    text('quant-example',lesson.teaching?.workedExample || q.workedExample);
    text('quant-connection',lesson.teaching?.connection || (skill.prerequisites.length?`Builds on: ${skill.prerequisites.map(id=>QuantCurriculum.get(id).name).join(', ')}.`:'Start from the definition, then apply it to a different example.'));
    text('quant-next-step',lesson.teaching?.nextStep || 'Try guided practice, then a fresh independent check. Hints remain available.');
    el('quant-ai-label').hidden=!lesson.teaching;
    text('quant-feedback',lesson.feedback?`${lesson.feedback.correct?'Correct.':'Review the marked parts.'} ${lesson.feedback.assisted?'Recorded as assisted practice. ':''}${lesson.feedback.diagnosis ? lesson.feedback.diagnosis+'\n' : ''}${lesson.feedback.solution}`:'');
    // Keep previous feedback hidden during a fresh independent assessment.
    el('quant-feedback').hidden=['check','review'].includes(lesson.stage);
    renderSubmission(lesson.feedback);
    const assessing=['diagnostic','guided','check','review'].includes(lesson.stage);
    el('quant-next').hidden=lesson.stage!=='teach';
    el('quant-question').hidden=!assessing;
    text('quant-prompt',q.prompt);
    const data=el('quant-data');data.replaceChildren();data.hidden=!q.table;
    if(q.table) {
      const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=q.table.caption;table.appendChild(caption);
      const head=document.createElement('thead'),row=document.createElement('tr');
      for(const label of q.table.headers){const cell=document.createElement('th');cell.scope='col';cell.textContent=label;row.appendChild(cell);}head.appendChild(row);table.appendChild(head);
      const body=document.createElement('tbody');
      for(const values of q.table.rows){const row=document.createElement('tr');values.forEach((value,i)=>{const cell=document.createElement(i?'td':'th');if(!i)cell.scope='row';cell.textContent=value;row.appendChild(cell);});body.appendChild(row);}table.appendChild(body);data.appendChild(table);
      data.setAttribute('tabindex','0');data.setAttribute('role','region');data.setAttribute('aria-label',q.table.caption);
    }
    el('quant-construction').hidden=!assessing || !q.construction;el('quant-construction-label').hidden=!assessing || !q.construction;
    text('quant-construction-label',q.construction?.prompt || '');el('quant-construction').value=lesson.constructionDraft || '';
    const choice=el('quant-reason-choice');choice.replaceChildren();
    choice.hidden=!assessing || !q.reasonOptions;el('quant-reason-label').hidden=choice.hidden;
    if(q.reasonOptions){const blank=document.createElement('option');blank.value='';blank.textContent='Choose a reason';choice.appendChild(blank);
      for(const option of q.reasonOptions){const o=document.createElement('option');o.value=option.value;o.textContent=option.label;choice.appendChild(o);}}
    choice.value=lesson.reasonDraft || '';
    text('quant-reason-preview',choice.value?choice.selectedOptions[0]?.textContent || '':'');

    text('quant-hints',lesson.hints?q.hints.slice(0,lesson.hints).join('\n'):(lesson.stage==='guided'?q.hints[0]:''));
    el('quant-actions').hidden=lesson.stage==='done';
    el('quant-hint').hidden=!assessing;
    el('quant-learn').hidden=!assessing;
    el('quant-hint').disabled=(lesson.hints || 0)>=q.hints.length;
    el('quant-form').hidden=!assessing || q.kind==='code';
    el('quant-answer').value=lesson.draft || '';
    el('quant-tutor').hidden=lesson.stage==='done';
    const py=document.getElementById('python-challenge');
    const coding=q.kind==='code';
    py.classList.toggle('hidden',!coding);
    py.classList.toggle('quant-code',coding);
    // One helper row follows the active exercise, including the coding editor/output.
    (coding ? py : panel).appendChild(el('quant-footer'));
    if(coding) {
      const token=generation,lessonId=lesson.id,questionId=q.id;
      const current=()=>token===generation && lesson?.id===lessonId && QuantLearning.question(lesson).id===questionId;
      await PythonChallenge.init({...config,quantChallenge:q,quantDraft:lesson.draft,quantAssessing:assessing,
        onQuantResult:(correct,submission)=>current()?act(async()=>{if(current())await attempt(false,correct,submission);}):Promise.resolve(),
        onQuantDraft:value=>current() && lesson.stage!=='done'?act(()=>{
          if(current() && lesson.stage!=='done')return mutate({op:'draft',value},false);
        },true):Promise.resolve()});
    } else PythonChallenge.destroyWorker();
    syncControls();
    if(lesson.stage==='done') {
      text('quant-reason','Progress saved. Practice qualification uses varied independent checks in this unit. Retention requires delayed retrieval after at least seven days.');
      Gate.showContinuePrompt();
    }
  }
  function renderSubmission(feedback) {
    const box=el('quant-submission'),s=feedback?.submission;
    box.replaceChildren();box.hidden=!s;
    if(!s)return;
    const add=(tag,value)=>{const n=document.createElement(tag);n.textContent=value;box.appendChild(n);};
    const verdict=key=>({correct:'Correct',incorrect:'Incorrect',unevaluated:'Not evaluated'}[feedback.components?.[key]] || '');
    add('h3','Previous submission — your original work');
    add('p',s.prompt);if(s.data)add('pre',s.data);
    for(const [key,label] of [['answer',QuantLearning.question(lesson).kind==='code'?'Submitted code':'Final answer'],['construction',s.constructionPrompt || 'Intermediate calculation'],['reason','Reasoning choice']]) {
      if(typeof s[key]!=='string')continue;
      add('p',label+(verdict(key)?' — '+verdict(key):''));add('pre',s[key] || '(blank)');
    }
    if(s.output){add('p','Submitted output and test results');add('pre',s.output);}
  }
  function syncControls() {
    if (!lesson) return;
    const q=QuantLearning.question(lesson);
    ['quant-answer','quant-construction','quant-reason-choice'].forEach(id=>{el(id).disabled=busy;});
    ['quant-learn','quant-tutor','quant-next','quant-track'].forEach(id=>{el(id).disabled=busy || !!queuedSubmission;});
    el('quant-hint').disabled=busy || !!queuedSubmission || (lesson.hints || 0)>=q.hints.length;
    const check=el('quant-form').querySelector('button');if(check)check.disabled=busy || !!queuedSubmission;
  }
  function destroy() {generation++;busy=false;pending=null;queuedSubmission=null;composing.clear();if(answerComposition){el('quant-answer').removeEventListener('compositionend',answerComposition);answerComposition=null;}if(constructionComposition){el('quant-construction').removeEventListener('compositionend',constructionComposition);constructionComposition=null;}['quant-answer','quant-construction'].forEach(id=>{el(id).oncompositionstart=null;});if(panel){panel.appendChild(el('quant-footer'));panel.classList.add('hidden');}PythonChallenge.destroyWorker();}
  return {init,destroy};
})();
