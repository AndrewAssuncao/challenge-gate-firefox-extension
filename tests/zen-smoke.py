import socket,json,subprocess,tempfile,time,os
from pathlib import Path
ROOT=str(Path(__file__).resolve().parents[1])
profile=tempfile.mkdtemp(prefix='quant-zen-')
uuid='a7ba1111-2222-4333-8444-555555555555'
open(profile+'/user.js','w').write('user_pref("marionette.port", 28319);\nuser_pref("browser.shell.checkDefaultBrowser", false);\nuser_pref("zen.welcome-screen.seen", true);\n')
with open(profile+'/user.js','a') as f:f.write('user_pref("extensions.webextensions.uuids", '+json.dumps(json.dumps({'challenge-gate@extension':uuid}))+');\n')
p=subprocess.Popen(['/Applications/Zen 2.app/Contents/MacOS/zen','--headless','--new-instance','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],stdout=open('/tmp/quant-zen.log','w'),stderr=subprocess.STDOUT)
try:
 for _ in range(100):
  try:s=socket.create_connection(('127.0.0.1',28319),timeout=1);break
  except OSError:time.sleep(.2)
 else:raise Exception('No Marionette port')
 s.settimeout(30)
 def receive():
  n=b''
  while not n.endswith(b':'):n+=s.recv(1)
  size=int(n[:-1]);b=b''
  while len(b)<size:b+=s.recv(size-len(b))
  return json.loads(b)
 print('handshake',receive(),flush=True)
 serial=0
 def call(name,args={}):
  global serial
  serial+=1;b=json.dumps([0,serial,name,args]).encode();s.sendall(str(len(b)).encode()+b':'+b)
  r=receive()
  if r[2]:raise Exception(r[2])
  return r[3]
 print('session',call('WebDriver:NewSession',{'capabilities':{'alwaysMatch':{'acceptInsecureCerts':False}}}),flush=True)
 print('install',call('Addon:Install',{'path':ROOT,'temporary':True}),flush=True)
 call('Marionette:SetContext',{'value':'chrome'})
 call('WebDriver:ExecuteScript',{'script':'gBrowser.selectedBrowser.loadURI(Services.io.newURI('+json.dumps('moz-extension://'+uuid+'/gate/gate.html?challenge=python&practice=true')+'), {triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()});','args':[]})
 time.sleep(1)
 call('Marionette:SetContext',{'value':'content'})
 def js(script):return call('WebDriver:ExecuteScript',{'script':script,'args':[]})['value']
 for _ in range(80):
  status=js('return {title:document.title,status:document.querySelector("#quant-status")?.textContent,loading:document.querySelector("#python-loading")?.textContent,editor:document.querySelector("#python-editor")?.value}')
  if status.get('editor'):break
  time.sleep(.25)
 print('page',status,flush=True)
 for _ in range(80):
  if js('return document.querySelector("#python-loading").classList.contains("hidden")'):break
  time.sleep(.5)
 print('runtime',js('return {loading:document.querySelector("#python-loading").textContent,hidden:document.querySelector("#python-loading").classList.contains("hidden")}'),flush=True)
 js('document.querySelector("#python-editor").value="def pnl(quantity, entry_price, exit_price):\\n    return quantity * (exit_price-entry_price)";document.querySelector("#python-run").click();return true')
 for _ in range(60):
  status=js('return {status:document.querySelector("#quant-status").textContent,output:document.querySelector("#python-test-results").textContent,error:document.querySelector("#quant-error").textContent}')
  if status['status'].startswith('done'):break
  time.sleep(.5)
 print('result',status,flush=True)
 assert status['status'].startswith('done'),status
 call('WebDriver:Refresh')
 time.sleep(1)
 assert '1 independent checks' in js('return document.querySelector("#quant-status").textContent')
 print('PASS: actual Zen extension page, CDN Python grading, saved completion after reload',flush=True)

finally:
 p.terminate()
 try:p.wait(timeout=10)
 except subprocess.TimeoutExpired:p.kill()
 print('profile',profile,flush=True)
