// Runs the real worker message handler and its Python sources through CPython.
// This verifies protocol/grading logic, not WASM/browser integration.
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),{execFileSync}=require('node:child_process');
const bridge=`import ast,contextlib,io,json,sys,traceback
steps=json.load(sys.stdin); ns={}; result=None
for step in steps:
 if 'name' in step: ns[step['name']]=step['value']; continue
 output=io.StringIO(); errors=io.StringIO(); error=None
 try:
  with contextlib.redirect_stdout(output),contextlib.redirect_stderr(errors):
   tree=ast.parse(step['source']); tail=tree.body.pop() if tree.body and isinstance(tree.body[-1],ast.Expr) else None
   exec(compile(tree,'<learner>','exec'),ns)
   result=eval(compile(ast.Expression(tail.value),'<learner>','eval'),ns) if tail else None
 except BaseException:
  error=traceback.format_exc()
 if step is steps[-1]:
  print(json.dumps({'result':result,'stdout':output.getvalue(),'stderr':errors.getvalue(),'error':error}))
`;
async function createWorker(source=fs.readFileSync(require.resolve('../gate/pyodide-worker.js'),'utf8')) {
 const messages=[];let stdout=()=>{},stderr=()=>{},destroyed=0;
 const runtime={
  setStdout:opts=>{stdout=opts.batched;},setStderr:opts=>{stderr=opts.batched;},
  runPython(source,opts){
   if(source==='dict()')return {steps:[],set(name,value){this.steps.push({name,value});},destroy(){destroyed++;}};
   // Flush requests in the runtime globals have no learner code to replay.
   if(!opts)return;
   const steps=opts.globals.steps;steps.push({source});
   const data=JSON.parse(execFileSync('python3',['-c',bridge],{input:JSON.stringify(steps),encoding:'utf8',timeout:5000}));
   for(const line of data.stdout.split('\n').slice(0,-1))stdout(line);
   if(data.stdout && !data.stdout.endsWith('\n'))stdout(data.stdout.split('\n').at(-1));
   for(const line of data.stderr.split('\n').filter(Boolean))stderr(line);
   if(data.error)throw Error(data.error);
   return data.result;
  }
 };
 const self={location:{href:'moz-extension://fixture/gate/pyodide-worker.js'},fetch:async()=>({}),importScripts(){},postMessage:m=>messages.push(m)};
 const ctx=vm.createContext({self,URL,importScripts(){},loadPyodide:async()=>runtime});
 vm.runInContext(source,ctx);await new Promise(r=>setImmediate(r));
 return {messages,async run(data){await self.onmessage({data:{type:'run',...data}});return messages.at(-1);},get destroyed(){return destroyed;}};
}
module.exports={createWorker};
