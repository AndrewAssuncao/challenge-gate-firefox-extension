/* Real Chromium UI + actual background scripts with an isolated WebExtension API harness.
   Python execution uses local CPython in this test only. No external requests/API keys. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {create}=require('./background-harness.cjs');
const root=path.join(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}try{res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.json')?'application/json':'text/html');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
 let browser;
 try {
  const h=await create({blockedSites:[{domain:'example.com',challengeType:'terminal',dailyLimitMinutes:15,unlockDurationMinutes:7,enabled:true}],settings:{settingsProtected:false}},base);
  browser=await chromium.launch({executablePath:process.env.CHROME_EXECUTABLE,headless:true});
  const context=await browser.newContext();
  await context.route('**/*',route=>(route.request().url().startsWith(base) || (process.env.REAL_PYODIDE === '1' && route.request().url().startsWith('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/')))?route.continue():route.abort());
  await context.exposeBinding('extensionMessage',(_,msg)=>h.send(msg));
  await context.exposeBinding('pythonRun',(_,job)=>{
   const script=`import json,sys,math\nj=json.loads(sys.stdin.read())\nns={}\ntry:\n exec(j['code'],ns)\nexcept Exception as e:\n print(json.dumps({'type':'result','error':str(e)}));sys.exit()\nr=[]\nfor t in j['testCases']:\n try:\n  v=eval(j['functionName']+'('+t['input']+')',ns)\n  expected=eval(t['expected'])\n  ok=abs(v-expected)<=t.get('tolerance',0) if isinstance(v,(int,float)) else v==expected\n  r.append({'passed':ok,'actual':str(v),'expected':t['expected'],'input':t['input']})\n except Exception as e:\n  r.append({'passed':False,'error':str(e),'input':t['input'],'expected':t['expected']})\nprint(json.dumps({'type':'result','results':r}))`;
   return JSON.parse(execFileSync('python3',['-c',script],{input:JSON.stringify(job),timeout:5000,encoding:'utf8'}));
  });
  await context.addInitScript(({base,realPyodide})=>{
   window.browser={runtime:{getURL:p=>base+p,sendMessage:msg=>window.extensionMessage(msg)},tabs:{create:async()=>{}}};
   if (!realPyodide) window.Worker=class {constructor(){setTimeout(()=>this.onmessage?.({data:{type:'ready'}}),10);} async postMessage(job){const data=await window.pythonRun(job);if(!this.dead)this.onmessage?.({data});}terminate(){this.dead=true;}};
  },{base,realPyodide:process.env.REAL_PYODIDE === '1'});
  const page=await context.newPage(), errors=[];page.setDefaultTimeout(process.env.REAL_PYODIDE === '1'?120000:10000);page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.error('CONSOLE',m.text());});
  console.log('Starting math flow');await page.goto(base+'gate/gate.html?challenge=math&domain=example.com');
  await page.waitForFunction(()=>document.querySelector('#quant-status').textContent.includes('diagnostic'));
  assert.equal(await page.locator('#challenge-toggle button').count(),5);
  console.log('Loaded math');await page.locator('#quant-answer').fill('not a number');await page.locator('#quant-form button').click();await page.waitForFunction(()=>document.querySelector('#quant-error').textContent.includes('finite number'));await page.locator('#quant-learn').click();await page.waitForFunction(()=>document.querySelector('#quant-status').textContent.startsWith('teach'));
  assert.equal(await page.locator('#quant-teaching').isVisible(),true);fs.mkdirSync(path.join(root,'output/playwright'),{recursive:true});await page.screenshot({path:path.join(root,'output/playwright/math-teaching.png'),fullPage:true});
  await page.reload();await page.waitForFunction(()=>document.querySelector('#quant-status').textContent.startsWith('teach'));
  await page.locator('#quant-next').click();await page.waitForFunction(()=>document.querySelector('#quant-status').textContent.startsWith('guided'));
  async function answer(){const lesson=Object.values(h.data.quantLearner.lessons).find(l=>l.mode==='math'&&l.track==='arithmetic');const C=require('../learning/curriculum');await page.locator('#quant-answer').fill(String(C.question(lesson.skillId,lesson.seed,lesson.harder).answer));await page.locator('#quant-form button').click();}
  await answer();await page.waitForFunction(()=>document.querySelector('#quant-status').textContent.startsWith('check'));
  await answer();await page.waitForFunction(()=>document.querySelector('#quant-status').textContent.startsWith('done'));
  assert.ok(h.data.unlocks['example.com']);
  await page.locator('#quant-track').selectOption('probability');await page.waitForFunction(()=>document.querySelector('#quant-title').textContent==='Complements');
  assert.equal(await page.locator('#gate-continue').isVisible(),false);
  console.log('Starting Python');await page.locator('[data-challenge=python]').click();await page.waitForFunction(()=>document.querySelector('#python-editor').value.includes('def pnl'));
  await page.locator('#python-editor').fill('def pnl(quantity, entry_price, exit_price):\n    return quantity * (exit_price - entry_price)');
  await page.waitForFunction(()=>document.querySelector('#python-loading').classList.contains('hidden'));await page.locator('#python-run').click();await page.waitForFunction(()=>document.querySelector('#quant-status').textContent.startsWith('done'));
  await page.locator('[data-challenge=brainteasers]').click();await page.waitForFunction(()=>document.querySelector('#quant-title').textContent==='Exhaustive cases');
  await page.locator('#quant-tutor').click();await page.waitForFunction(()=>document.querySelector('#quant-error').textContent.includes('No API key'));
  await page.locator('[data-challenge=typing]').click();assert.equal(await page.locator('#typing-challenge').isVisible(),true);
  await page.goto(base+'gate/gate.html?challenge=terminal&domain=example.com');await page.waitForFunction(()=>document.querySelector('#terminal-container').offsetHeight>0);
  console.log('Starting dashboard');await page.goto(base+'dashboard/dashboard.html');await page.waitForFunction(()=>document.body.textContent.includes('1 python') && document.body.textContent.includes('1 quant math'));await page.locator('[data-tab=learning]').click();await page.locator('[data-view=python]').click();
  await page.waitForFunction(()=>document.querySelector('#quant-progress-view').textContent.includes('Position P&L'));
  await page.locator('[data-tab=overview]').click();await page.locator('.action-edit').first().click();
  assert.equal(await page.locator('#edit-challenge-type').inputValue(),'terminal');await page.locator('#edit-save-btn').click();assert.equal(h.data.blockedSites[0].challengeType,'terminal');assert.equal(h.data.blockedSites[0].unlockDurationMinutes,7);
  await page.locator('[data-tab=learning]').click();await page.locator('[data-view=math]').click();
  fs.mkdirSync(path.join(root,'output/playwright'),{recursive:true});await page.screenshot({path:path.join(root,'output/playwright/learning-dashboard.png'),fullPage:true});
  if (process.env.REAL_PYODIDE === '1') {
    const results=await page.evaluate(async()=>{
      const worker=new Worker('/gate/pyodide-worker.js');
      const ready=new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.type==='ready'?resolve():e.data.type==='error'?reject(Error(e.data.error)):null;worker.onerror=reject;});
      await ready;
      const run=code=>new Promise(resolve=>{worker.onmessage=e=>resolve(e.data);worker.postMessage({type:'run',code,functionName:'pnl',testCases:[{input:'2, 10, 12',expected:'4'}]});});
      const correct=await run('def pnl(quantity, entry_price, exit_price):\n    return quantity * (exit_price-entry_price)');
      const deleted=await run('# function deleted');
      const syntax=await run('def pnl(:');
      const corrected=await run('def pnl(quantity, entry_price, exit_price):\n    return quantity * (exit_price-entry_price)');
      worker.terminate();return {correct,deleted,syntax,corrected};
    });
    assert.equal(results.correct.results.every(r=>r.passed),true);
    assert.equal(results.deleted.results.every(r=>r.passed),false);
    assert.equal(results.syntax.errorKind,'user-code');
    assert.equal(results.corrected.results.every(r=>r.passed),true);
    console.log('PASS: actual CDN Pyodide worker, repeated submissions, deleted-function isolation, syntax error classification');
  }
  assert.deepEqual(errors,[]);console.log('PASS: real-browser lesson, reload, guided/check, unlock, tracks, Python editor (runtime selected by REAL_PYODIDE), AI fallback, typing, legacy Terminal, dashboard policy preservation');
 } finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
