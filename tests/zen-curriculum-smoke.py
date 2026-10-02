"""Installed Zen + actual extension smoke. Uses only a fresh disposable profile."""
import socket,json,subprocess,tempfile,time,threading,http.server,base64,os,uuid
from pathlib import Path
ROOT=str(Path(__file__).resolve().parents[1])
BINARY='/Applications/Zen 2.app/Contents/MacOS/zen'
UUID=str(uuid.uuid4())
BASE='moz-extension://'+UUID+'/'
profile=tempfile.mkdtemp(prefix='curriculum-zen-')
with socket.socket() as probe:
 probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
prefs={'marionette.port':port,'browser.shell.checkDefaultBrowser':False,'zen.welcome-screen.seen':True,'extensions.webextensions.uuids':json.dumps({'challenge-gate@extension':UUID}),
 'datareporting.policy.dataSubmissionEnabled':False,'toolkit.telemetry.enabled':False,'extensions.update.enabled':False,
 'network.proxy.type':1,'network.proxy.http':'127.0.0.1','network.proxy.http_port':9,'network.proxy.ssl':'127.0.0.1','network.proxy.ssl_port':9,'network.proxy.no_proxies_on':'localhost, 127.0.0.1'}
Path(profile,'user.js').write_text('\n'.join('user_pref('+json.dumps(k)+', '+json.dumps(v)+');' for k,v in prefs.items()))
class Site(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.end_headers();self.wfile.write(b'<title>Local test destination</title>Unlocked test destination')
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Site)
threading.Thread(target=server.serve_forever,daemon=True).start()
target='http://127.0.0.1:'+str(server.server_port)+'/'
class Zen:
 def __init__(self,screen_width=1800):
  self.log=open(profile+'/runtime.log','a')
  env=dict(os.environ,MOZ_HEADLESS_WIDTH=str(screen_width),MOZ_HEADLESS_HEIGHT='1200')
  self.p=subprocess.Popen([BINARY,'--headless','--new-instance','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],stdout=self.log,stderr=subprocess.STDOUT,env=env)
  for _ in range(100):
   try:self.s=socket.create_connection(('127.0.0.1',port),timeout=1);break
   except OSError:time.sleep(.2)
  else:raise RuntimeError('No Marionette port')
  self.s.settimeout(60);self.serial=0;self.receive()
  session=self.call('WebDriver:NewSession',{})
  print('Zen',session['capabilities']['browserVersion'],'owned PID',self.p.pid,flush=True)
 def receive(self):
  n=b''
  while not n.endswith(b':'):
   chunk=self.s.recv(1)
   if not chunk:raise EOFError('Marionette disconnected')
   n+=chunk
  size=int(n[:-1]);b=b''
  while len(b)<size:b+=self.s.recv(size-len(b))
  return json.loads(b)
 def call(self,name,args=None):
  self.serial+=1;b=json.dumps([0,self.serial,name,args or {}]).encode();self.s.sendall(str(len(b)).encode()+b':'+b)
  r=self.receive()
  if r[2]:raise RuntimeError(r[2])
  return r[3]
 def js(self,script):return self.call('WebDriver:ExecuteScript',{'script':script,'args':[],'sandbox':None})['value']
 def navigate(self,url):
  # Installation opens a consent tab. Select the owned context before measuring.
  handle=self.call('WebDriver:GetWindowHandle',{})['value']
  self.call('WebDriver:SwitchToWindow',{'handle':handle})
  self.call('WebDriver:Navigate',{'url':url});time.sleep(.4)
 def wait(self,script,seconds=45):
  deadline=time.monotonic()+seconds
  while time.monotonic()<deadline:
   try:
    result=self.js(script)
    if result:return result
   except RuntimeError:pass
   time.sleep(.25)
  raise AssertionError('Timed out: '+script)
 def keys(self,selector,text):
  element=self.call('WebDriver:FindElement',{'using':'css selector','value':selector})['value']
  key=element.get('element-6066-11e4-a52e-4f735466cecf') or element.get('ELEMENT')
  self.call('WebDriver:ElementSendKeys',{'id':key,'text':text})
 def install(self):
  global BASE
  assert self.call('Addon:Install',{'path':ROOT,'temporary':True})['value']=='challenge-gate@extension'
  self.call('Marionette:SetContext',{'value':'chrome'})
  try:BASE=self.js("return WebExtensionPolicy.getByID('challenge-gate@extension').getURL('');")
  finally:self.call('Marionette:SetContext',{'value':'content'})
 def stop(self):
  try:self.call('Marionette:Quit',{'flags':['eAttemptQuit']})
  except (EOFError,OSError,RuntimeError):pass
  try:self.p.wait(timeout=10)
  except subprocess.TimeoutExpired:self.p.terminate();self.p.wait(timeout=10)
  self.s.close();self.log.close()
# Each targeted display fixture is explicitly test-only and lives only in this
# disposable profile. The real UI submits answers; no fixture is used as product evidence.
def content_width(z,width):
 # Measure the Marionette context after navigation; Zen chrome width changes.
 for _ in range(6):
  actual=z.js('return innerWidth')
  if abs(actual-width)<=1:return
  current=z.call('WebDriver:GetWindowRect',{})['width']
  rect=z.call('WebDriver:SetWindowRect',{'width':round(current+width-actual),'height':1000})
  time.sleep(.3)
 raise AssertionError({'requested':width,'actual':z.js('return innerWidth'),'window':rect})
def record(z):
 learner=z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner)')
 return json.loads(subprocess.check_output(['node','-e','const E=require("./learning/engine"),s=JSON.parse(require("fs").readFileSync(0,"utf8")),l=Object.values(s.lessons).find(l=>l.stage!=="done");console.log(JSON.stringify({lesson:l,q:l&&E.question(l)}))'],input=json.dumps(learner),cwd=ROOT,text=True))
def fixture(z,skill,seed,level,stage='diagnostic'):
 z.navigate(BASE+'dashboard/dashboard.html');z.wait('return typeof browser !== "undefined"')
 state=json.loads(subprocess.check_output(['node','-e','const C=require("./learning/curriculum"),E=require("./learning/engine"),[id,seed,level,stage]=process.argv.slice(1),s=E.empty(),skill=C.get(id),key=skill.mode+":"+(skill.mode==="math"?skill.track:"")+":practice";s.serial=500;s.lessons[key]={id:"fixture",key,mode:skill.mode,track:skill.track,skillId:id,seed:Number(seed),level:Number(level),stage,revision:0,assisted:false,checks:0,required:1,practice:true,startedAt:Date.now(),stepStartedAt:Date.now(),reason:"Disposable curriculum UI fixture"};console.log(JSON.stringify(s))',skill,str(seed),str(level),stage],cwd=ROOT,text=True))
 z.js('return browser.storage.local.set({quantLearner:'+json.dumps(state)+'})')
 mode='brainteasers' if skill=='brain-order' else 'math'
 z.navigate(BASE+'gate/gate.html?arcade=1&challenge='+mode)
 if skill=='prob-method':z.wait('return !!document.querySelector("#quant-track")');z.js('document.querySelector("#quant-track").value="probability";document.querySelector("#quant-track").dispatchEvent(new Event("change"))')
 z.wait('return document.querySelector("#quant-title").textContent==='+json.dumps({'data-weighted':'Weighted rates from tables','data-base':'Percentage bases in tables','brain-order':'Constraint orders: must and could','prob-method':'Choose a probability method'}[skill]))
 return record(z)
def solve(z,q,answer=None,construction=None):
 z.js('document.querySelector("#quant-answer").value='+json.dumps(str(q['answer'] if answer is None else answer))+';document.querySelector("#quant-construction").value='+json.dumps(str(q['construction']['answer'] if construction is None else construction))+';document.querySelector("#quant-reason-choice").value='+json.dumps(q['correctReason'])+';document.querySelector("#quant-form").requestSubmit()')
def screenshot(z,name):
 output=Path(ROOT,'output','zen');output.mkdir(parents=True,exist_ok=True)
 result=z.call('WebDriver:TakeScreenshot',{'full':True})
 (output/name).write_bytes(base64.b64decode(result['value']))
z=None
try:
 z=Zen();z.install();print('Owned Zen PID',z.p.pid,'profile',profile,flush=True)
 # Natural novice path, using authentic Gecko keyboard events and durable storage.
 z.navigate(BASE+'gate/gate.html?arcade=1&challenge=math')
 z.wait('return document.querySelector("#quant-status").textContent.startsWith("diagnostic")')
 z.keys('#quant-answer','123');time.sleep(.3)
 assert z.js('return document.activeElement.id==="quant-answer" && document.querySelector("#quant-answer").selectionStart===3')
 z.js('document.querySelector("#quant-form").requestSubmit()');z.wait('return document.querySelector("#quant-status").textContent.startsWith("teach")')
 z.navigate(BASE+'gate/gate.html?arcade=1&challenge=math');z.wait('return document.querySelector("#quant-status").textContent.startsWith("teach")')
 assert '10% of 80' in z.js('return document.querySelector("#quant-example").textContent')
 z.js('document.querySelector("#quant-next").click()');z.wait('return document.querySelector("#quant-status").textContent.startsWith("guided")')
 r=record(z);z.js('document.querySelector("#quant-answer").value='+json.dumps(str(r['q']['answer']))+';document.querySelector("#quant-form").requestSubmit()');z.wait('return document.querySelector("#quant-status").textContent.startsWith("check")')
 r=record(z);z.js('document.querySelector("#quant-answer").value='+json.dumps(str(r['q']['answer']))+';document.querySelector("#quant-form").requestSubmit()');z.wait('return document.querySelector("#quant-status").textContent.startsWith("done")')
 events=z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner.events)')
 assert [e['assisted'] for e in events if e['kind']=='attempt']==[False,True,False]
 print('PASS: authentic keyboard/caret, error → teaching, saved reload, guided assistance exclusion, independent check',flush=True)
 for width in [1200,390]:
  print('Requested content width',width,flush=True)
  for skill in ['data-weighted','data-base','brain-order','prob-method']:
   r=fixture(z,skill,0,1);q=r['q']
   assert q['transfer']
   content_width(z,width)
   layout=z.js('return {viewport:innerWidth,body:document.documentElement.scrollWidth,footer:document.querySelector("#quant-footer").getBoundingClientRect().top,form:document.querySelector("#quant-form").getBoundingClientRect().bottom,scope:document.querySelector("#quant-scope").textContent,caption:document.querySelector("#quant-data caption")?.textContent,headers:[...document.querySelectorAll("#quant-data th")].map(n=>n.scope),region:document.querySelector("#quant-data").getAttribute("role")}')
   assert abs(layout['viewport']-width)<=1,layout
   assert layout['body']<=layout['viewport']+1,layout
   assert layout['footer']>=layout['form']-1,layout
   assert 'bounded local unit' in layout['scope']
   if q.get('table'):
    assert layout['caption']==q['table']['caption'] and 'col' in layout['headers'] and 'row' in layout['headers'] and layout['region']=='region',layout
    z.js('document.querySelector("#quant-data").focus()');assert z.js('return document.activeElement.id==="quant-data"')
   if width==390:screenshot(z,skill+'-narrow.png')
   elif skill=='data-weighted':screenshot(z,'weighted-normal.png')
   solve(z,q);z.wait('return document.querySelector("#quant-status").textContent.startsWith("done")')
   e=z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner.events.at(-1))');assert e['correct'] and e['firstTry'] and e['isTransfer'] and not e['assisted'],e
  print('PASS: '+str(width)+'px authentic Zen layout, accessible table captions/headers/focus, bottom helpers, scope labels, transfer submissions',flush=True)
 # Partial work persists through assistance and reload; real draft queue stays ordered.
 r=fixture(z,'data-weighted',2,0);q=r['q']
 z.keys('#quant-construction','42');z.keys('#quant-answer','12')
 z.js('document.querySelector("#quant-reason-choice").value="counts";document.querySelector("#quant-reason-choice").dispatchEvent(new Event("change"))')
 z.wait('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner.lessons["math:arithmetic:practice"].constructionDraft==="42"&&d.quantLearner.lessons["math:arithmetic:practice"].reasonDraft==="counts")')
 z.js('document.querySelector("#quant-hint").click()');z.wait('return document.querySelector("#quant-hints").textContent.length>0')
 assert z.js('return [document.querySelector("#quant-construction").value,document.querySelector("#quant-answer").value,document.querySelector("#quant-reason-choice").value]')==['42','12','counts']
 z.navigate(BASE+'gate/gate.html?arcade=1&challenge=math');z.wait('return document.querySelector("#quant-title").textContent==="Weighted rates from tables"')
 assert z.js('return [document.querySelector("#quant-construction").value,document.querySelector("#quant-answer").value,document.querySelector("#quant-reason-choice").value]')==['42','12','counts']
 assert z.js('return document.querySelector("#quant-reason-preview").textContent')==next(o['label'] for o in q['reasonOptions'] if o['value']=='counts')
 # Exercise both composition paths without changing the user's clipboard/IME settings.
 for selector,field in [('#quant-construction','constructionDraft'),('#quant-answer','draft')]:
  old=z.js('return document.querySelector('+json.dumps(selector)+').value')
  z.js('const e=document.querySelector('+json.dumps(selector)+');e.focus();e.dispatchEvent(new CompositionEvent("compositionstart",{data:"",bubbles:true}));e.value="99";e.dispatchEvent(new InputEvent("input",{isComposing:true,inputType:"insertCompositionText",data:"99",bubbles:true}))')
  time.sleep(.3)
  assert z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner.lessons["math:arithmetic:practice"].'+field+')')==old
  z.js('document.querySelector('+json.dumps(selector)+').dispatchEvent(new CompositionEvent("compositionend",{data:"99",bubbles:true}))')
  z.wait('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner.lessons["math:arithmetic:practice"].'+field+'==="99")')
 # A final multi-field draft and immediate submit must land in queue order.
 z.js('document.querySelector("#quant-answer").value="";document.querySelector("#quant-construction").value=""')
 z.keys('#quant-construction',str(q['construction']['answer']));z.keys('#quant-answer',format(q['answer'],'.4f'));z.js('document.querySelector("#quant-form").requestSubmit()')
 z.wait('return document.querySelector("#quant-status").textContent.startsWith("check")')
 assert z.js('return !document.querySelector("#quant-error").textContent')
 e=z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner.events.at(-1))');assert e['correct'] and e['assisted'],e
 r=fixture(z,'brain-order',1,0)
 z.keys('#quant-construction','6');z.keys('#quant-answer','1');z.js('document.querySelector("#quant-reason-choice").value="could";document.querySelector("#quant-reason-choice").dispatchEvent(new Event("change"));document.querySelector("#quant-learn").click()')
 z.wait('return document.querySelector("#quant-status").textContent.startsWith("teach")')
 assert z.js('return [document.querySelector("#quant-construction").value,document.querySelector("#quant-answer").value,document.querySelector("#quant-reason-choice").value]')==['6','1','could']
 z.navigate(BASE+'gate/gate.html?arcade=1&challenge=brainteasers');z.wait('return document.querySelector("#quant-status").textContent.startsWith("teach")')
 assert z.js('return [document.querySelector("#quant-construction").value,document.querySelector("#quant-answer").value,document.querySelector("#quant-reason-choice").value]')==['6','1','could']
 z.js('document.querySelector("#quant-next").click()');z.wait('return document.querySelector("#quant-status").textContent.startsWith("guided")')
 assert z.js('return [document.querySelector("#quant-construction").value,document.querySelector("#quant-answer").value,document.querySelector("#quant-reason-choice").value]')==['','','']
 assert record(z)['q']['methodTag']=='could'
 print('PASS: all three fields persist through Hint/Teach/reload, readable selected reason, both composition paths defer drafts, rapid draft→submit queue and honest assistance, guided repair stays in classification',flush=True)
 # Specific feedback is tied to a submitted wrong intermediate.
 r=fixture(z,'prob-method',4,0);q=r['q'];rule=q['feedbackRules'][0]
 solve(z,q,construction=rule['intermediate']);z.wait('return document.querySelector("#quant-status").textContent.startsWith("teach")')
 assert rule['message'] in z.js('return document.querySelector("#quant-feedback").textContent')
 z.navigate(BASE+'gate/gate.html?arcade=1&challenge=math');z.wait('return document.querySelector("#quant-track")')
 z.js('document.querySelector("#quant-track").value="probability";document.querySelector("#quant-track").dispatchEvent(new Event("change"))');z.wait('return document.querySelector("#quant-status").textContent.startsWith("teach")')
 assert rule['message'] in z.js('return document.querySelector("#quant-feedback").textContent')
 print('PASS: observed without-replacement intermediate feedback and teaching persist across reload',flush=True)
 # Natural background/store selection from an empty learner reaches all 30 units;
 # unchanged Python grading is separately covered by executable solution/mutation tests.
 z.navigate(BASE+'dashboard/dashboard.html');z.wait('return typeof browser !== "undefined"');z.js('return browser.storage.local.set({quantLearner:{version:1,serial:0,events:[],lessons:{}}})')
 serial=0
 for mode,track in [('math','arithmetic'),('math','probability'),('brainteasers',''),('python',''),('math','applied')]:
  for _ in range(200):
   result=z.js('return browser.runtime.sendMessage({type:"quantCommand",command:'+json.dumps({'op':'begin','mode':mode,'track':track,'practice':True,'fresh':True})+'})')
   assert not result.get('error'),result
   check=json.loads(subprocess.check_output(['node','-e','const E=require("./learning/engine"),C=require("./learning/curriculum"),r=JSON.parse(require("fs").readFileSync(0,"utf8")),[mode,track]=process.argv.slice(1);console.log(JSON.stringify({ready:C.skills.filter(s=>s.mode===mode&&(!track||s.track===track)).every(s=>E.evidence(r.state,s.id).practiced),q:E.question(r.lesson)}))',mode,track],input=json.dumps(result),cwd=ROOT,text=True))
   if check['ready']:break
   lesson=result['lesson']
   if lesson['stage']=='teach':
    result=z.js('return browser.runtime.sendMessage({type:"quantCommand",command:'+json.dumps({'op':'continue','lessonId':lesson['id'],'revision':lesson['revision']})+'})');lesson=result['lesson']
    check['q']=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./learning/engine").question(JSON.parse(require("fs").readFileSync(0,"utf8")))))'],input=json.dumps(lesson),cwd=ROOT,text=True))
   q=check['q'];serial+=1
   command={'op':'attempt','lessonId':lesson['id'],'revision':lesson['revision'],'eventId':'zen-perfect-'+str(serial),'answer':q.get('answer'),'reason':q.get('correctReason'),'construction':q.get('construction',{}).get('answer'),'correct':True}
   result=z.js('return browser.runtime.sendMessage({type:"quantCommand",command:'+json.dumps(command)+'})');assert not result.get('error'),result
  else:raise AssertionError('Natural progression stalled: '+mode+' '+track)
 saved=z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner)')
 nodes=json.loads(subprocess.check_output(['node','-e','const E=require("./learning/engine"),s=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(JSON.stringify(E.graph(s).nodes.map(n=>({id:n.id,practiced:n.evidence.practiced,retained:n.evidence.retained}))))'],input=json.dumps(saved),cwd=ROOT,text=True))
 assert len(nodes)==30 and all(n['practiced'] and not n['retained'] for n in nodes),nodes
 z.stop();z=None;z=Zen();z.install();z.navigate(BASE+'dashboard/dashboard.html');z.wait('return typeof browser !== "undefined"')
 assert z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner)')==saved
 content_width(z,390)
 z.js('document.querySelector("[data-tab=learning]").click()');z.wait('return document.querySelectorAll("#quant-tree-nodes [data-skill-id]").length===30')
 z.js('document.querySelector("#skill-prob-method").focus()')
 assert 'bounded local unit' in z.js('return document.querySelector("#quant-skill-detail").textContent')
 expected=json.loads(subprocess.check_output(['node','-e','const C=require("./learning/curriculum");console.log(JSON.stringify(C.skills.flatMap(s=>s.prerequisites.map(p=>({from:p,to:s.id})))))'],cwd=ROOT,text=True))
 edges=z.js('return [...document.querySelectorAll("#quant-tree-nodes [data-skill-id]")].flatMap(n=>JSON.parse(n.dataset.prerequisites).map(from=>({from,to:n.dataset.skillId})))')
 assert sorted((e['from'],e['to']) for e in edges)==sorted((e['from'],e['to']) for e in expected)
 screenshot(z,'tree-narrow.png')
 print('PASS: authentic background/store perfect reachability for all 30 skills, no immediate retention, full owned-PID restart persistence, exact 35-edge skill tree',flush=True)
 print('Screenshots:',str(Path(ROOT,'output','zen')),flush=True)
finally:
 if z:z.stop()
 server.shutdown();server.server_close()
 print('Disposable curriculum profile:',profile,flush=True)
