"""Actual extension release tests; unique disposable profile and owned PID only."""
import socket, json, subprocess, tempfile, time, threading, http.server, uuid
from pathlib import Path
ROOT = str(Path(__file__).resolve().parents[1])
BINARY = '/Applications/Zen 2.app/Contents/MacOS/zen'
UUID = str(uuid.uuid4())
BASE = 'moz-extension://' + UUID + '/'
RUN = 'cg-release-' + uuid.uuid4().hex[:12]
profile = tempfile.mkdtemp(prefix=RUN + '-')
with socket.socket() as probe:
    probe.bind(('127.0.0.1', 0)); port = probe.getsockname()[1]
prefs = {'marionette.port': port, 'browser.shell.checkDefaultBrowser': False,
         'zen.welcome-screen.seen': True,
         'extensions.webextensions.uuids': json.dumps({'challenge-gate@extension': UUID}),
         'datareporting.policy.dataSubmissionEnabled': False, 'toolkit.telemetry.enabled': False,
         'extensions.update.enabled': False, 'network.proxy.type': 1,
         'network.proxy.http': '127.0.0.1', 'network.proxy.http_port': 9,
         'network.proxy.ssl': '127.0.0.1', 'network.proxy.ssl_port': 9,
         'network.proxy.no_proxies_on': 'localhost, 127.0.0.1'}
Path(profile, 'user.js').write_text('\n'.join('user_pref(' + json.dumps(k) + ', ' + json.dumps(v) + ');' for k, v in prefs.items()))

class Site(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.end_headers()
        self.wfile.write(b'<title>Release test destination</title>Local release destination')
    def log_message(self, *args): pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Site)
threading.Thread(target=server.serve_forever, daemon=True).start()
target = 'http://127.0.0.1:' + str(server.server_port) + '/'

class Zen:
    def __init__(self):
        self.log = open(profile + '/runtime.log', 'a')
        self.p = subprocess.Popen([BINARY, '--headless', '--new-instance', '--profile', profile,
                                  '--marionette', '--remote-allow-system-access', 'about:blank'],
                                  stdout=self.log, stderr=subprocess.STDOUT)
        for _ in range(100):
            try: self.s = socket.create_connection(('127.0.0.1', port), timeout=1); break
            except OSError: time.sleep(.2)
        else:
            self.p.terminate(); self.p.wait(timeout=10); self.log.close()
            raise RuntimeError('Owned Zen did not expose its Marionette port')
        self.s.settimeout(60); self.serial = 0; self.receive()
        session = self.call('WebDriver:NewSession', {})
        self.version = session['capabilities']['browserVersion']
        print('Zen', self.version, 'owned PID', self.p.pid, flush=True)
    def receive(self):
        n = b''
        while not n.endswith(b':'):
            chunk = self.s.recv(1)
            if not chunk: raise EOFError('Owned Marionette disconnected')
            n += chunk
        size = int(n[:-1]); b = b''
        while len(b) < size:
            chunk = self.s.recv(size-len(b))
            if not chunk: raise EOFError('Owned Marionette disconnected')
            b += chunk
        return json.loads(b)
    def call(self, name, args=None):
        self.serial += 1; b = json.dumps([0, self.serial, name, args or {}]).encode()
        self.s.sendall(str(len(b)).encode() + b':' + b)
        r = self.receive()
        if r[2]: raise RuntimeError(r[2])
        return r[3]
    def js(self, script):
        return self.call('WebDriver:ExecuteScript', {'script': script, 'args': [], 'sandbox': None})['value']
    def chrome(self, script):
        self.call('Marionette:SetContext', {'value': 'chrome'})
        try: return self.js(script)
        finally: self.call('Marionette:SetContext', {'value': 'content'})
    def navigate(self, url):
        # Navigate the Marionette-owned browsing context, even if consent opens a tab.
        self.call('WebDriver:Navigate', {'url':url})
        time.sleep(.4)
    def wait(self, script, seconds=45):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            try:
                result = self.js(script)
                if result: return result
            except RuntimeError: pass
            time.sleep(.25)
        print('Test-only page diagnostics:', self.js('return {url:location.href,quantError:document.querySelector("#quant-error")?.textContent,pythonError:document.querySelector("#python-output")?.textContent,editor:document.querySelector("#python-editor")?.value.slice(0,80),workerResults:document.documentElement.getAttribute("data-release-results")}'),flush=True)
        raise AssertionError('Timed out: ' + script)
    def keys(self, selector, text):
        element = self.call('WebDriver:FindElement', {'using': 'css selector', 'value': selector})['value']
        key = element.get('element-6066-11e4-a52e-4f735466cecf') or element.get('ELEMENT')
        self.call('WebDriver:ElementSendKeys', {'id': key, 'text': text})
    def install(self):
        global BASE
        assert self.call('Addon:Install', {'path': ROOT, 'temporary': True})['value'] == 'challenge-gate@extension'
        BASE=self.chrome("return WebExtensionPolicy.getByID('challenge-gate@extension').getURL('');")
    def stop(self):
        try: self.call('Marionette:Quit', {'flags': ['eAttemptQuit']})
        except (EOFError, OSError, RuntimeError): pass
        try: self.p.wait(timeout=10)
        except subprocess.TimeoutExpired: self.p.terminate(); self.p.wait(timeout=10)
        self.s.close(); self.log.close()

checks = []
completed = False
def passed(label):
    checks.append(label); print('PASS:', label, flush=True)
def message(z, kind, **kwargs):
    r = z.js('return browser.runtime.sendMessage(' + json.dumps({'type': kind, **kwargs}) + ')')
    assert not r.get('error'), r
    return r

z = None
try:
    z = Zen(); z.install(); z.navigate(BASE + 'dashboard/dashboard.html?tab=settings')
    z.wait('return !!document.querySelector("#export-backup") && typeof browser !== "undefined"')
    assert z.js('return typeof document.querySelector("#export-backup").onclick === "function"')
    assert not message(z, 'getAiConsent')['allowed']
    z.navigate(BASE+'dashboard/consent.html');z.wait('return !document.querySelector("#ai-history").disabled');
    assert not z.js('return document.querySelector("#ai-history").checked')
    z.js('document.querySelector("#ai-decline").click()');z.wait('return document.querySelector("#ai-status").textContent.startsWith("AI and history")');
    assert not message(z,'getAiConsent')['allowed'] and not message(z,'getAiConsent')['technicalAllowed']
    passed('Authentic consent exposes separate default-off history choice and saves decline')
    z.navigate(BASE+'dashboard/dashboard.html?tab=settings')
    message(z, 'updateSettings', settings={'anthropicApiKey': 'fixture-key-not-real', 'idleTimeoutSeconds': 30})
    error = z.js('return browser.runtime.sendMessage({type:"claudeGenerate",prompt:"fixture",promptWithoutHistory:"fixture"})')
    assert 'transmission is off' in error['error']
    passed('Real default consent blocks a saved fake key')
    message(z, 'addSite', site={'domain':'127.0.0.1','enabled':True,'challengeType':'python','unlockDurationMinutes':7})
    z.navigate(target)
    z.wait('return location.protocol === "moz-extension:" && document.querySelector("#python-editor")?.value.includes("def pnl")')
    passed('Real blocked local destination interception')
    z.chrome('Services.io.offline=true;return true;')
    z.wait('return document.querySelector("#python-loading").classList.contains("hidden")', 90)
    z.js('document.querySelector("#python-editor").value='+json.dumps("def pnl(quantity, entry_price, exit_price):\n    return quantity * (exit_price-entry_price)")+';document.querySelector("#python-run").click();')
    z.wait('return document.querySelector("#quant-status").textContent.startsWith("done")')
    passed('Packaged Python grades a genuine gate with remote network denied')
    z.chrome('Services.io.offline=false;return true;')
    z.navigate(target); z.wait('return document.title === "Release test destination"')
    passed('Python completion saves evidence and unlocks local destination')
    z.navigate(BASE + 'dashboard/dashboard.html')
    z.wait('return typeof browser !== "undefined" && !!document.querySelector("#export-backup")')
    # Fresh worker with the same dead external proxy. Firefox global offline mode
    # stalls some extension resource fetches; the proxy still denies CDN access.
    z.js('const script=document.createElement("script");script.src=browser.runtime.getURL("tests/release-worker-fixture.js");document.head.appendChild(script);')
    ready=z.wait('return JSON.parse(document.documentElement.getAttribute("data-release-results") || "[]").find(r=>r.type==="ready" || r.type==="error")', 90)
    assert ready['type']=='ready',ready
    questions = json.loads(subprocess.check_output(['node','-e','const C=require("./learning/curriculum");console.log(JSON.stringify(C.skills.filter(s=>s.mode==="python").flatMap(s=>[0,1].flatMap(level=>[1,5,9].map(seed=>C.question(s.id,seed,false,level))))))'], cwd=ROOT, text=True))
    n = 0
    for q in questions:
        code = q['starterCode'].split('\n')[0] + '\n' + '\n'.join('    ' + line for line in q['solution'].split('\n'))
        z.js('document.documentElement.setAttribute("data-release-request",' + json.dumps(json.dumps({'type':'run','code':code,'functionName':q['functionName'],'testCases':q['testCases']})) + ');document.dispatchEvent(new Event("release-worker-run"));')
        result = z.wait('return JSON.parse(document.documentElement.getAttribute("data-release-results") || "[]").find(r=>r.type==="result")')
        assert not result.get('error') and all(t['passed'] for t in result['results']), (q['id'], result)
        n += len(result['results'])
    code = 'def stdlib():\n    import math, statistics, random, json\n    return math.sqrt(9) + statistics.mean([1,3])'
    z.js('document.documentElement.setAttribute("data-release-request",' + json.dumps(json.dumps({'type':'run','code':code,'functionName':'stdlib','testCases':[{'input':'','expected':'5.0'}]})) + ');document.dispatchEvent(new Event("release-worker-run"));')
    assert z.wait('return JSON.parse(document.documentElement.getAttribute("data-release-results") || "[]").find(r=>r.type==="result")')['results'][0]['passed']
    passed(str(n) + ' authentic offline Python oracle cases and standard-library imports')
    z.js('document.dispatchEvent(new Event("release-worker-stop"))'); z.chrome('Services.io.offline=false;return true;')
    # When run against the isolated curriculum overlay, exercise real saved new fields.
    extra = json.loads(subprocess.check_output(['node','-e',"const C=require('./learning/curriculum'),E=require('./learning/engine');const result=[];for(const id of ['data-weighted','data-base','brain-order','prob-method']){const skill=C.get(id);if(!skill)continue;const q=C.question(id,0,false,0),state=E.empty(),key='fixture';state.lessons[key]={id:'fixture-'+id,key,skillId:id,mode:skill.mode,track:skill.track,stage:'check',seed:0,level:0,revision:0,assisted:false,draft:'',checks:0,required:2,harder:false,practice:true,startedAt:1000,stepStartedAt:1000};result.push(E.apply(state,{op:'attempt',lessonId:state.lessons[key].id,revision:0,eventId:'fixture-'+id,answer:q.answer,reason:q.correctReason,construction:q.construction?.answer,correct:true},2000).state);}console.log(JSON.stringify(result));"],cwd=ROOT,text=True))
    if extra:
        original=message(z,'exportBackup')['backup']
        for state in extra:
            message(z,'importBackup',text=json.dumps(state))
            lesson=state['lessons']['fixture']
            message(z,'quantCommand',command={'op':'draft','lessonId':lesson['id'],'revision':lesson['revision'],'value':'84','construction':'42','reason':'bounded'})
            current=message(z,'exportBackup')['backup']
            assert current['data']['quantLearner']['lessons']['fixture']['constructionDraft']=='42'
            assert current['data']['quantLearner']['lessons']['fixture']['reasonDraft']=='bounded'
            message(z,'importBackup',text=json.dumps(current))
            assert message(z,'exportBackup')['backup']['data']['quantLearner']==current['data']['quantLearner']
            event=current['data']['quantLearner']['events'][0]
            if event.get('methodTag'):
                bad=json.loads(json.dumps(current));tag='insufficient' if event['skillId']=='prob-method' else 'impossible'
                if tag==event['methodTag']:tag='independent' if event['skillId']=='prob-method' else 'could'
                bad['data']['quantLearner']['events'][0]['methodTag']=tag
                before=message(z,'exportBackup')['backup']['data']
                rejected=z.js('return browser.runtime.sendMessage('+json.dumps({'type':'importBackup','text':json.dumps(bad)})+')')
                assert rejected.get('error') and message(z,'exportBackup')['backup']['data']==before
        message(z,'importBackup',text=json.dumps(original))
        passed('Integrated new lesson drafts/evidence round trip in real storage; supported method-tag spoof rejects without writes')
    message(z,'recordLearningAttempt',discipline='git',eventId='release-git-1',challenge={'id':'g-init-01','topic':'git_init'},passed=True,source='local',struggled=False,usedHelp=False)
    learner = z.js('return browser.storage.local.get("quantLearner").then(d=>d.quantLearner)')
    attempt = next(e for e in learner['events'] if e['kind']=='attempt')
    message(z,'quantCommand',command={'op':'invalidate','target':attempt['id']})
    backup = message(z,'exportBackup')['backup']; encoded = json.dumps(backup)
    assert 'fixture-key-not-real' not in encoded and 'anthropicApiKey' not in encoded and 'aiConsent' not in encoded
    before = z.js('return browser.storage.local.get(["quantLearner","blockedSites","progression"])')
    malformed = json.loads(encoded); malformed['data']['settings']['anthropicApiKey'] = 'fake-imported'
    rejected = z.js('return browser.runtime.sendMessage(' + json.dumps({'type':'importBackup','text':json.dumps(malformed)}) + ')')
    assert rejected.get('error')
    assert z.js('return browser.storage.local.get(["quantLearner","blockedSites","progression"])') == before
    passed('Malformed import leaves real extension storage unchanged')
    # Complete data loss simulated only in the owned disposable profile.
    z.js('return browser.storage.local.clear()')
    assert message(z,'importBackup',text=encoded)['success']
    after = message(z,'exportBackup')['backup']['data']
    expected = backup['data']; expected['unlocks'] = {}
    assert after == expected
    assert not message(z,'getAiConsent')['allowed']
    assert not z.js('return browser.storage.local.get("settings").then(d=>d.settings.anthropicApiKey)')
    assert after['quantLearner']['events'][-1]['kind'] == 'invalidate'
    z.navigate(target); z.wait('return location.protocol === "moz-extension:"')
    passed('Loss/recovery preserves evidence, invalidation, legacy progress and site policies; keys and AI stay off')
    z.navigate(BASE + 'dashboard/dashboard.html?tab=settings'); z.wait('return typeof browser !== "undefined"')
    fixture_file = Path(profile,'roundtrip-backup.json'); fixture_file.write_text(encoded)
    z.keys('#backup-file',str(fixture_file))
    z.wait('return !document.querySelector("#import-backup").disabled && document.querySelector("#backup-preview").textContent.includes("Full backup")')
    passed('Real file-input restore preview shows replacement scope')
    idle = z.js('return browser.idle.queryState(30)')
    assert idle in ['idle','active','locked']
    z.chrome("Services.obs.notifyObservers(null,'idle','30');return true;")
    time.sleep(1)
    assert z.chrome("return !!WebExtensionPolicy.getByID('challenge-gate@extension');")
    passed('Real idle query and isolated observer notification retain persistent background (physical sleep not simulated)')
    saved = message(z,'exportBackup')['backup']['data']
    z.stop(); z = None
    z = Zen()
    assert not z.chrome("return !!WebExtensionPolicy.getByID('challenge-gate@extension');")
    z.install(); z.navigate(BASE + 'dashboard/dashboard.html'); z.wait('return typeof browser !== "undefined"')
    assert message(z,'exportBackup')['backup']['data'] == saved
    passed('Controlled test-browser restart removes temporary install; same-ID reload preserves data')
    z.navigate('about:blank') # Uninstall closes add-on tabs; keep WebDriver context alive.
    z.call('Addon:Uninstall',{'id':'challenge-gate@extension'})
    z.install(); z.navigate(BASE + 'dashboard/dashboard.html'); z.wait('return typeof browser !== "undefined"')
    message(z,'importBackup',text=encoded)
    assert message(z,'exportBackup')['backup']['data']['quantLearner'] == expected['quantLearner']
    passed('Disposable add-on removal/reinstall recovers from external backup')
    completed = True
finally:
    if z: z.stop()
    server.shutdown(); server.server_close()
    report = {'runTag':RUN,'profilePath':profile,'checks':checks,'passed':len(checks),
              'completed':completed,'physicalSleepTested':False,'normalProfileTouched':False}
    out = Path(ROOT,'verification','zen-release-smoke.json'); out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+'\n')
    print('Owned disposable profile:',profile,flush=True)
