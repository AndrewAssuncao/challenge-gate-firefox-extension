'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const local=JSON.parse(fs.readFileSync('gate/challenges/python-problems.json','utf8'));
function harness(response) {
 const messages=[],posts=[],unlocks=[],nodes=new Map();
 const node=()=>({value:'',innerHTML:'',textContent:'',disabled:false,style:{},classList:{remove(){},add(){}},appendChild(){},focus(){}});
 const ctx=vm.createContext({console:{log(){},error(){}},Date,clearTimeout,setTimeout:()=>1,crypto:{randomUUID:()=>"fixture"},
  document:{getElementById:id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},createElement:node},
  window:{addEventListener(){}},Gate:{showContinuePrompt:()=>unlocks.push(true)},fetch:async()=>({json:async()=>local}),
  browser:{runtime:{getURL:p=>p,sendMessage:async m=>{messages.push(m);return m.type==='claudeGenerate'?response:{}}}}});
 vm.runInContext(fs.readFileSync('gate/challenge-provider.js','utf8'),ctx);
 const provider=vm.runInContext('ChallengeProvider',ctx);
 let source=fs.readFileSync('gate/python.js','utf8');
 source=source.replace('return { init, destroyWorker };',`return {runCode,submitCode,renderChallenge,
  receive(data){pendingExecution={mode:"submit",requestId:"fixture",code:editorEl.value,generation};return handleResult({...data,mode:"submit",requestId:"fixture"});},
  setup(c,cfg,w){challenge=c;config=cfg;challengeSource='claude';worker=w;pyodideReady=true;}};`);
 vm.runInContext(source,ctx);
 return {provider,ui:vm.runInContext('PythonChallenge',ctx),nodes,messages,posts,unlocks,worker:{postMessage:m=>posts.push(m)}};
}
const fixture=(starterTemplate='one')=>({id:'m-fixture',topic:'basics',starterTemplate,prompt:'Return the supplied value.',
 teachingNote:'Write the return statement yourself.',conceptIntroduced:null,hints:['Use return.'],afterSolve:'Values can be returned.',
 testCases:[{input:starterTemplate==='none'?'':Array({none:0,one:1,two:2,three:3,four:4}[starterTemplate]).fill('1').join(', '),expected:'1'}]});

test('AI exercises use only exact local catalog signatures; descriptions, tests and feedback survive',async()=>{
 const h=harness();
 for(const id of ['two','three'])assert.equal(h.provider.prepareGeneratedChallenge({...fixture(id),testCases:[{input:'1,,2',expected:'0'}]}),null);
 assert.equal(h.provider.prepareGeneratedChallenge({...fixture('none'),testCases:[{input:',',expected:''}]}),null);
 const sources=[];
 for(const [id,args] of [['none',[]],['one',['value']],['two',['value','other']],['three',['value','other','extra']],['four',['value','other','extra','option']]]) {
  const raw=fixture(id),c=h.provider.prepareGeneratedChallenge(raw);assert.ok(c,id);
  const trusted=h.provider.getExecutable(c);assert.equal(trusted.starterCode,`def solve(${args.join(', ')}):\n    pass\n`);
  assert.equal(trusted.functionName,'solve');assert.equal(c.prompt,raw.prompt);assert.equal(c.afterSolve,raw.afterSolve);
  assert.equal(trusted.testCases[0].input,raw.testCases[0].input);sources.push(trusted.starterCode);
 }
 const result=execFileSync('python3',['-c','import ast,json,sys\nfor code in json.load(sys.stdin):\n t=ast.parse(code); assert len(t.body)==1 and isinstance(t.body[0],ast.FunctionDef); f=t.body[0]; assert f.name=="solve" and not f.args.defaults and not f.args.kw_defaults and len(f.body)==1 and isinstance(f.body[0],ast.Pass)\nprint("5 local stubs checked")'],{input:JSON.stringify(sources),encoding:'utf8'});
 assert.match(result,/5 local stubs checked/);
});

test('remote and cached legacy executable metadata, signatures and default expressions are rejected',()=>{
 const h=harness();
 const attacks={starterCode:'__import__("js").eval("REMOTE-FIXTURE")',functionName:'solve);REMOTE-FIXTURE(',
  signature:'solve(value=__import__("js"))',parameters:['value=print("REMOTE-FIXTURE")'],params:'value: print("REMOTE-FIXTURE")',
  arguments:['*args'],defaults:{value:'REMOTE-FIXTURE()'},defaultExpressions:['REMOTE-FIXTURE()'],
  source:'local',trusted:true};
 for(const [field,value] of Object.entries(attacks))assert.equal(h.provider.prepareGeneratedChallenge({...fixture(),[field]:value}),null,field);
 for(const id of ['__proto__','constructor','one);REMOTE-FIXTURE(',{},null])assert.equal(h.provider.prepareGeneratedChallenge({...fixture(),starterTemplate:id}),null);
 const old={id:'m-fixture',topic:'basics',prompt:'Legacy cached exercise',functionName:'solve',starterCode:'def solve(value=print("REMOTE-FIXTURE")):\n    pass',testCases:[{input:'1',expected:'1'}],hints:[]};
 assert.equal(h.provider.prepareGeneratedChallenge(JSON.parse(JSON.stringify(old))),null);
 assert.equal(h.provider.getExecutable(old),null);
 const c=h.provider.prepareGeneratedChallenge(fixture());
 assert.equal(h.provider.getExecutable(JSON.parse(JSON.stringify(c))),null);
 assert.equal(h.provider.prepareGeneratedChallenge(JSON.parse(JSON.stringify(c))),null);
});

test('invalid generated executable fields fall back to authored local problems, never remote starters',async()=>{
 const malicious={...fixture(),starterCode:'REMOTE-FIXTURE()',functionName:'injected'};
 const h=harness({content:JSON.stringify(malicious)});
 const r=await h.provider.getChallenge(h.provider.defaultProfile(),'normal',false);
 assert.equal(r.source,'local');assert.ok(h.provider.getExecutable(r.challenge));
 assert.equal(JSON.stringify(h.provider.getExecutable(r.challenge)).includes('REMOTE-FIXTURE'),false);
});

test('new generated exercises remain useful and both consent prompt forms require local templates',async()=>{
 const h=harness({content:JSON.stringify(fixture('two'))});
 const r=await h.provider.getChallenge(h.provider.defaultProfile(),'normal',false);
 assert.equal(r.source,'claude');assert.equal(r.challenge.starterCode,'def solve(value, other):\n    pass\n');
 const m=h.messages.find(m=>m.type==='claudeGenerate');
 for(const p of [m.prompt,m.promptWithoutHistory]) {
  assert.ok(p.includes('two: def solve(value, other):'));assert.ok(p.includes('"starterTemplate"'));
  assert.ok(p.includes('only comma-separated Python literals'));assert.ok(p.includes('No calls, operators, comprehensions'));
  assert.equal(p.includes('"starterCode":'),false);assert.equal(p.includes('"functionName":'),false);
 }
});

test('AI string-encoded expressions/calls and malformed containers fall back before worker submission',async()=>{
 for(const input of ['[0]*3','set()','range(5)',"float('inf')",'"ab" * 3','value=1','print("x")',
  '[print("x")]','{1: print("x")}',"f'{print(123)}'",'[1, 2','1,,2','01',"'\\xGG'","'\\U00110000'"]) {
  const raw={...fixture(),testCases:[{input,expected:'0'}]},h=harness({content:JSON.stringify(raw)});
  assert.equal(h.provider.prepareGeneratedChallenge(raw),null,input);
  assert.equal((await h.provider.getChallenge(h.provider.defaultProfile(),'normal',false)).source,'local',input);
 }
 const h=harness();
 for(const input of ['[1, 2, None]','{"a": (1, True), "b": [2.5, -3e2]}','(1,)','{1, 2}','"a,b"','Hello World','01.2','01e2',"'\\u0061'","'\\x61'","'\\U00000061'"]) {
  assert.ok(h.provider.prepareGeneratedChallenge({...fixture(),testCases:[{input,expected:'fixture'}]}),input);
 }
});

test('worker test/signature issues cannot grant access, invalidate history or award progress',()=>{
 const h=harness(),c=h.provider.prepareGeneratedChallenge(fixture());h.ui.setup(c,{},h.worker);
 h.ui.receive({results:[{passed:false,challengeIssue:true}],diagnostics:{unrecoverableChallengeIssue:true,
  unrecoverableTests:[{input:'1',error:'Signature requires 0 arguments.'}]}});
 assert.equal(h.unlocks.length,0);assert.equal(h.messages.length,0);assert.equal(h.posts.length,0);
 assert.equal(h.nodes.get('python-run').disabled,false);
 assert.match(h.nodes.get('python-test-results').textContent,/signature.*retry.*progress was not changed/);
});

test('AI test/schema bounds reject executable test objects, wrong arity and oversized fields',()=>{
 const h=harness();
 for(const testCases of [[],[{input:{code:'REMOTE-FIXTURE'},expected:'1'}],[{input:'1',expected:'1',call_expr:'REMOTE-FIXTURE()'}],
  [{input:'1, 2',expected:'1'}],Array(21).fill({input:'1',expected:'1'})])assert.equal(h.provider.prepareGeneratedChallenge({...fixture(),testCases}),null);
 assert.equal(h.provider.prepareGeneratedChallenge({...fixture(),prompt:'x'.repeat(12001)}),null);
 assert.equal(h.provider.prepareGeneratedChallenge({...fixture(),hints:[{}]}),null);
});

test('editor blocks cached legacy objects and copied trust fields before rendering or worker submission',async()=>{
 const h=harness();
 const old={...fixture(),functionName:'injected',starterCode:'REMOTE-FIXTURE()',trusted:true};
 h.ui.setup(old,{},h.worker);h.ui.renderChallenge();
 assert.equal(h.nodes.get('python-editor').value,'');assert.ok(h.nodes.get('python-run').disabled);
 await h.ui.runCode();assert.equal(h.posts.length,0);
 const c=h.provider.prepareGeneratedChallenge(fixture());h.ui.setup(JSON.parse(JSON.stringify(c)),{},h.worker);
 await h.ui.runCode();assert.equal(h.posts.length,0);
});

test('Submit grades learner-authored code and immutable local descriptor despite challenge metadata mutation',async()=>{
 const h=harness(),c=h.provider.prepareGeneratedChallenge(fixture());
 c.starterCode='REMOTE-FIXTURE()';c.functionName='injected';c.testCases=[{input:'REMOTE-FIXTURE()',expected:'bad'}];
 h.ui.setup(c,{},h.worker);h.ui.renderChallenge();assert.equal(h.nodes.get('python-editor').value,'def solve(value):\n    pass\n');
 const learner='def solve(value):\n    return value + 1';h.nodes.get('python-editor').value=learner;
 await h.ui.submitCode();assert.equal(h.posts.length,1);const m=h.posts[0];
 assert.equal(m.code,learner);assert.equal(m.functionName,'solve');assert.equal(m.testCases[0].input,'1');
 assert.equal(m.testCases[0].expected,'1');
});

test('AI code review remains display-only and cannot attach executable metadata',()=>{
 const h=harness(),raw={id:'review-fixture',topic:'architecture',type:'code_review',prompt:'Explain the problem.',
  codeToReview:'def example():\n    return 1',validationCriteria:'Explain the return.',hints:[],afterSolve:'Feedback'};
 const c=h.provider.prepareGeneratedChallenge(raw);assert.ok(c);assert.equal(h.provider.getExecutable(c),null);
 assert.equal(c.codeToReview,raw.codeToReview);assert.equal(h.provider.prepareGeneratedChallenge({...raw,starterCode:'REMOTE-FIXTURE()'}),null);
});

test('manifest requires the cloud-verified Firefox140 native data-permission boundary',()=>{
 const m=JSON.parse(fs.readFileSync('manifest.json','utf8'));
 assert.equal(m.browser_specific_settings.gecko.strict_min_version,'140.0');
 assert.deepEqual(m.browser_specific_settings.gecko.data_collection_permissions.optional,
  ['authenticationInfo','personalCommunications','technicalAndInteraction']);
});

test('actual worker Python parser accepts literal containers and rejects executable AI test payloads',async()=>{
 const scripts=[],self={location:{href:'moz-extension://fixture/gate/pyodide-worker.js'},fetch:async()=>({}),importScripts(){},postMessage(){}};
 const namespace={set(){},destroy(){}};
 const runtime={setStdout(){},setStderr(){},runPython:s=>{scripts.push(s);return s==='dict()'?namespace:undefined;}};
 const ctx=vm.createContext({self,URL,importScripts:()=>{},loadPyodide:async()=>runtime});
 vm.runInContext(fs.readFileSync('gate/pyodide-worker.js','utf8'),ctx);
 await new Promise(r=>setImmediate(r));await self.onmessage({data:{type:'run',code:'def solve(value):\n    return value',functionName:'solve',testCases:[]}});
 const parser=scripts.find(s=>s.includes('def __repair_and_parse_test_args'));
 assert.ok(parser);
 const attacks=['__import__("builtins").print("REMOTE-FIXTURE")','[x for x in [1]]','(lambda: 1)()',
  'print("REMOTE-FIXTURE")','1 + 2','globals()["solve"](1)','f"{print(123)}"'];
 const code='import ast,inspect,io,sys,json\n'+parser+'\ndef solve(value): return value\n'+
  'for s in json.load(sys.stdin):\n try: __repair_and_parse_test_args(solve,s)\n except Exception: pass\n else: raise AssertionError(s)\n'+
  'for s,expected in [("[1,2]",[1,2]),("{\\\"a\\\":1}",{"a":1}),("(1,2)",(1,2)),("None",None),("True",True),("\\\"a,b\\\"","a,b")]:\n assert __repair_and_parse_test_args(solve,s)[0]==[expected]\nprint("7 payloads rejected; 6 literal cases accepted")';
 const result=execFileSync('python3',['-c',code],{input:JSON.stringify(attacks),encoding:'utf8'});
 assert.match(result,/7 payloads rejected; 6 literal cases accepted/);
});
