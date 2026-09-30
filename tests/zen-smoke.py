"""Installed Zen + actual extension smoke. Uses only a fresh disposable profile."""
import socket,json,subprocess,tempfile,time,threading,http.server
from pathlib import Path
ROOT=str(Path(__file__).resolve().parents[1])
BINARY='/Applications/Zen 2.app/Contents/MacOS/zen'
UUID='a7ba1111-2222-4333-8444-555555555555'
BASE='moz-extension://'+UUID+'/'
profile=tempfile.mkdtemp(prefix='quant-zen-')
with socket.socket() as probe:
 probe.bind(('127.0.0.1',0));port=probe.getsockname()[1]
prefs={'marionette.port':port,'browser.shell.checkDefaultBrowser':False,'zen.welcome-screen.seen':True,'extensions.webextensions.uuids':json.dumps({'challenge-gate@extension':UUID})}
Path(profile,'user.js').write_text('\n'.join('user_pref('+json.dumps(k)+', '+json.dumps(v)+');' for k,v in prefs.items()))
class Site(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  self.send_response(200);self.end_headers();self.wfile.write(b'<title>Local test destination</title>Unlocked test destination')
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Site)
threading.Thread(target=server.serve_forever,daemon=True).start()
target='http://127.0.0.1:'+str(server.server_port)+'/'
class Zen:
 def __init__(self):
  self.log=open(profile+'/runtime.log','a')
  self.p=subprocess.Popen([BINARY,'--headless','--new-instance','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],stdout=self.log,stderr=subprocess.STDOUT)
  for _ in range(100):
   try:self.s=socket.create_connection(('127.0.0.1',port),timeout=1);break
   except OSError:time.sleep(.2)
  else:raise RuntimeError('No Marionette port')
  self.s.settimeout(60);self.serial=0;self.receive()
  session=self.call('WebDriver:NewSession',{})
  print('Zen',session['capabilities']['browserVersion'],flush=True)
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
  self.call('Marionette:SetContext',{'value':'chrome'})
  self.js('gBrowser.selectedBrowser.loadURI(Services.io.newURI('+json.dumps(url)+'),{triggeringPrincipal:Services.scriptSecurityManager.getSystemPrincipal()});')
  time.sleep(.4);self.call('Marionette:SetContext',{'value':'content'})
 def wait(self,script,seconds=45):
  deadline=time.monotonic()+seconds
  while time.monotonic()<deadline:
   try:
    result=self.js(script)
    if result:return result
   except RuntimeError:pass
   time.sleep(.25)
  raise AssertionError('Timed out: '+script)
 def install(self):assert self.call('Addon:Install',{'path':ROOT,'temporary':True})['value']=='challenge-gate@extension'
 def stop(self):
  try:self.call('Marionette:Quit',{'flags':['eAttemptQuit']})
  except (EOFError,OSError,RuntimeError):pass
  try:self.p.wait(timeout=10)
  except subprocess.TimeoutExpired:self.p.terminate();self.p.wait(timeout=10)
  self.s.close();self.log.close()
z=None
try:
 z=Zen();z.install();z.navigate(BASE+'dashboard/dashboard.html')
 z.wait('return typeof browser !== "undefined" && !!document.querySelector("#tab-overview")')
 result=z.js('return browser.runtime.sendMessage({type:"addSite",site:{enabled:true,domain:"127.0.0.1",challengeType:"python",unlockDurationMinutes:7}})')
 assert result.get('success'),result
 print('Configured isolated test site',result,flush=True)
 z.navigate(target)
 z.wait('return location.protocol === "moz-extension:" && document.querySelector("#python-editor")?.value.includes("def pnl")')
 print('PASS: real blocked-site interception',flush=True)
 z.wait('return document.querySelector("#python-loading").classList.contains("hidden")',90)
 z.js('document.querySelector("#python-editor").value="def pnl(quantity, entry_price, exit_price):\\n    return quantity * (exit_price-entry_price)";document.querySelector("#python-run").click();')
 z.wait('return document.querySelector("#quant-status").textContent.startsWith("done")')
 saved=z.js('return browser.storage.local.get(["quantLearner","unlocks","blockedSites"])')
 assert saved['unlocks']['127.0.0.1']['expiresAt']>int(time.time()*1000),saved
 events=saved['quantLearner']['events'];assert any(e.get('firstTry') and e.get('correct') for e in events)
 z.navigate(target);z.wait('return document.title === "Local test destination"')
 print('PASS: actual CDN Python grading and real destination unlock',flush=True)
 z.stop();z=None
 z=Zen()
 # Temporary add-ons are removed on shutdown; reloading the same ID is required.
 z.install();z.navigate(BASE+'dashboard/dashboard.html')
 z.wait('return typeof browser !== "undefined" && !!document.querySelector("#tab-overview")')
 tree=z.js('return [...document.querySelectorAll("#quant-knowledge-tree [data-skill-id]")].map(n=>({id:n.dataset.skillId,status:n.dataset.status}))')
 assert len(tree)==21,tree
 links=z.js('return [...document.querySelectorAll("#quant-knowledge-tree a[data-from]")].map(a=>({from:a.dataset.from,to:a.dataset.to,target:a.hash,label:a.textContent}))')
 expected=json.loads(subprocess.check_output(['node','-e','console.log(JSON.stringify(require("./learning/engine").graph(require("./learning/engine").empty()).edges))'],cwd=ROOT,text=True))
 assert sorted((e['from'],e['to']) for e in links)==sorted((e['from'],e['to']) for e in expected)
 assert all(e['target']=='#skill-'+e['from'] and e['label'] for e in links)
 print('PASS: every visible prerequisite link exactly matches the curriculum DAG',flush=True)
 assert next(n for n in tree if n['id']=='code-pnl')['status']=='learning'
 persisted=z.js('return browser.storage.local.get(["quantLearner","blockedSites"])')
 assert persisted['quantLearner']['events']==events,persisted
 assert persisted['blockedSites']==saved['blockedSites']
 print('PASS: learner evidence and site policy survive full browser restart and temporary add-on reload',flush=True)
 solutions={
  'g-init-01':['git init','git status'],
  'g-staging-01':['git add .','git commit -m "Save changes"'],
  'g-commit-01':['git add one.txt','git commit -m "One"','git add two.txt','git commit -m "Two"','git add three.txt','git commit -m "Three"'],
  'g-log-01':['git log','git log --oneline'],
  't1-01':['pwd','ls'],'t1-02':['cd ~/projects/webapp'],
  't1-03':['mkdir -p ~/projects/webapp/config','touch ~/projects/webapp/config/settings.json'],
  't1-04':['mkdir -p ~/projects/api','touch ~/projects/api/server.py ~/projects/api/routes.py'],
  't1-05':['cat ~/projects/webapp/README.md'],'t1-06':['tail -n 3 ~/projects/webapp/app.log'],
  't1-07':['cat ../README.md'],'t1-08':['man ls']
 }
 for mode in ['typing','git','terminal']:
  z.navigate(BASE+'dashboard/dashboard.html');z.wait('return typeof browser !== "undefined"')
  z.js('return browser.storage.local.set({unlocks:{},blockedSites:[{enabled:true,domain:"127.0.0.1",challengeType:'+json.dumps(mode)+',unlockDurationMinutes:7}]})')
  z.navigate(target)
  if mode=='typing':
   z.wait('return document.querySelectorAll("#words .word").length===25')
   words=z.js('return [...document.querySelectorAll("#words .word")].map(e=>e.textContent).join(" ")')
   element=z.call('WebDriver:FindElement',{'using':'css selector','value':'#words-wrapper'})['value']
   key=element.get('element-6066-11e4-a52e-4f735466cecf') or element.get('ELEMENT')
   z.call('WebDriver:ElementSendKeys',{'id':key,'text':words})
  else:
   z.wait('return document.querySelector("#'+mode+'-prompt-area")?.textContent.length>0')
   prompt=z.js('return document.querySelector("#'+mode+'-prompt-area").textContent')
   bank=json.loads(Path(ROOT,'gate/challenges/'+mode+'-problems.json').read_text())
   item=next(q for q in bank if q['scenario'] in prompt)
   print('Solving',mode,item['id'],flush=True)
   for command in solutions[item['id']]:
    z.js('const input=document.querySelector("#'+mode+'-input");input.value='+json.dumps(command)+';input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true}));')
    time.sleep(.1)
  z.wait('return document.querySelector("#gate-continue") && !document.querySelector("#gate-continue").classList.contains("hidden")')
  z.wait('return browser.storage.local.get("unlocks").then(d=>!!d.unlocks?.["127.0.0.1"])')
  history=z.js('return browser.storage.local.get(["typingHistory","gitLearningProfile","terminalLearningProfile"])')
  if mode=='typing':assert history.get('typingHistory'),history
  else:assert any(e.get('passed') for e in history[mode+'LearningProfile']['recentChallenges']),history
  z.navigate(target);z.wait('return document.title === "Local test destination"')
  print('PASS: '+mode+' exercise, saved completion and actual destination unlock',flush=True)

finally:
 if z:z.stop()
 server.shutdown();server.server_close()
 print('Disposable test profile:',profile,flush=True)
