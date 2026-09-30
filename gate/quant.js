/* Shared lesson UI: local teaching and assessment; optional personalized tutor. */
'use strict';
const QuantChallenge = (() => {
  let config, mode, track, lesson, state, generation=0, busy=false, pending=null, actions=Promise.resolve();
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
    destroy();config=cfg;mode=type;track=mode==='math'?'arithmetic':'';
    panel.classList.remove('hidden');
    el('quant-track-wrap').hidden=mode!=='math';
    el('quant-track').value=track;
    el('quant-track').onchange=async()=>{track=el('quant-track').value;await begin();};
    el('quant-reload').onclick=()=>begin();
    el('quant-hint').onclick=()=>act(async()=>{await mutate({op:'assist'});});
    el('quant-learn').onclick=()=>act(async()=>{await attempt(true);});
    el('quant-next').onclick=()=>act(async()=>{await mutate({op:'continue'});});
    el('quant-tutor').onclick=()=>act(tutor);
    el('quant-form').onsubmit=e=>{e.preventDefault();act(()=>attempt(false));};
    el('quant-answer').oninput=()=>{const value=el('quant-answer').value;act(()=>mutate({op:'draft',value},false));};
    await begin(true);
  }
  async function begin(fresh=false) {
    const token=++generation;busy=false;pending=null;
    Gate.hideContinuePrompt();
    PythonChallenge.destroyWorker();
    document.getElementById('python-challenge').classList.add('hidden');
    try {
      const r=await send({op:'begin',mode,track,settingsGate:config.isSettingsGate,practice:config.isArcade,fresh});
      if(token!==generation) return;
      lesson=r.lesson;state=r.state; await render();
    } catch(e){error(e);}
  }
  function act(fn) {
    const token=generation;
    const work=actions.then(async()=>{
      if(token!==generation) return;
      busy=true;panel.setAttribute('aria-busy','true');
      try {text('quant-error','');await fn();}catch(e){error(e);}finally{busy=false;panel.removeAttribute('aria-busy');}
    });
    actions=work.catch(()=>{});
    return work;
  }
  async function attempt(dontKnow, correct) {
    // Keep the same event ID on write failure, so retry is idempotent.
    pending ||= {op:'attempt',eventId:crypto.randomUUID(),answer:el('quant-answer').value,reason:el('quant-reason-choice').value,construction:el('quant-construction').value,correct,dontKnow};
    const cmd=pending;
    let r;
    try {r=await mutate(cmd,false);} catch(e) {if(!e.retryable) pending=null;throw e;}
    if(!r) return;
    pending=null;
    await render();
  }
  async function tutor() {
    // Revealing custom instruction must never count as independent evidence.
    await mutate({op:'assist'},false);
    const token=generation;
    text('quant-error','Asking your configured tutor…');
    const r=await browser.runtime.sendMessage({type:'claudeGenerate',prompt:QuantLearning.prompt(state,lesson),maxTokens:1600});
    if(token!==generation) return;
    if(r.error) throw Error(r.error+' — the local lesson remains available.');
    const value=QuantLearning.validateTeaching(r.content,lesson);
    await mutate({op:'teaching',value});
  }
  async function render() {
    text('quant-error','');el('quant-reload').hidden=true;
    const skill=QuantCurriculum.get(lesson.skillId), q=QuantLearning.question(lesson), ev=QuantLearning.evidence(state,skill.id);
    text('quant-title',skill.name);
    text('quant-reason',lesson.reason);
    text('quant-status',`${lesson.stage} · ${ev.status} · ${ev.novelIndependent} novel checks · ${ev.reassessed} known-item reassessments`);
    const teaching=lesson.stage==='teach' || lesson.stage==='guided';
    el('quant-teaching').hidden=!teaching && !lesson.teaching;
    text('quant-objective','Goal: '+skill.objective);
    text('quant-contrast','Watch for: '+skill.commonError);
    text('quant-explanation',lesson.teaching?.explanation || q.explanation);
    text('quant-example',lesson.teaching?.workedExample || q.workedExample);
    text('quant-connection',lesson.teaching?.connection || (skill.prerequisites.length?`Builds on: ${skill.prerequisites.map(id=>QuantCurriculum.get(id).name).join(', ')}.`:'Start from the definition, then apply it to a different example.'));
    text('quant-next-step',lesson.teaching?.nextStep || 'Try guided practice, then a fresh independent check. Hints remain available.');
    el('quant-ai-label').hidden=!lesson.teaching;
    text('quant-feedback',lesson.feedback?`${lesson.feedback.correct?'Correct':'Not yet'}. ${lesson.feedback.assisted?'Recorded as assisted practice. ':''}${lesson.feedback.solution}`:'');
    // Keep previous feedback hidden during a fresh independent assessment.
    el('quant-feedback').hidden=['check','review'].includes(lesson.stage);
    const assessing=['diagnostic','guided','check','review'].includes(lesson.stage);
    el('quant-next').hidden=lesson.stage!=='teach';
    el('quant-question').hidden=!assessing;
    text('quant-prompt',q.prompt);
    el('quant-construction').hidden=!assessing || !q.construction;el('quant-construction-label').hidden=!assessing || !q.construction;
    text('quant-construction-label',q.construction?.prompt || '');el('quant-construction').value='';
    const choice=el('quant-reason-choice');choice.replaceChildren();
    choice.hidden=!assessing || !q.reasonOptions;el('quant-reason-label').hidden=choice.hidden;
    if(q.reasonOptions){const blank=document.createElement('option');blank.value='';blank.textContent='Choose a reason';choice.appendChild(blank);
      for(const option of q.reasonOptions){const o=document.createElement('option');o.value=option.value;o.textContent=option.label;choice.appendChild(o);}}

    text('quant-hints',lesson.hints?q.hints.slice(0,lesson.hints).join('\n'):(lesson.stage==='guided'?q.hints[0]:''));
    el('quant-actions').hidden=!assessing;
    el('quant-hint').disabled=(lesson.hints || 0)>=q.hints.length;
    el('quant-form').hidden=!assessing || q.kind==='code';
    el('quant-answer').value=lesson.draft || '';
    el('quant-tutor').hidden=lesson.stage==='done';
    const py=document.getElementById('python-challenge');
    py.classList.toggle('hidden',!assessing || q.kind!=='code');
    if(assessing && q.kind==='code') {
      await PythonChallenge.init({...config,quantChallenge:q,quantDraft:lesson.draft,onQuantResult:correct=>act(()=>attempt(false,correct)),onQuantDraft:value=>act(()=>mutate({op:'draft',value},false))});
    } else PythonChallenge.destroyWorker();
    if(lesson.stage==='done') {
      text('quant-reason','Progress saved. This check is evidence of practice; readiness requires varied independent work, and retention is checked after at least seven days.');
      Gate.showContinuePrompt();
    }
  }
  function destroy() {generation++;busy=false;pending=null;if(panel)panel.classList.add('hidden');PythonChallenge.destroyWorker();}
  return {init,destroy};
})();
