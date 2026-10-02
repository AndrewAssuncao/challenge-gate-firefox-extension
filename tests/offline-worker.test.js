'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('worker imports only packaged assets and blocks remote fetch/import/alternate transports',async()=>{
 const calls=[],messages=[];
 const self={location:{href:'moz-extension://fixture/gate/pyodide-worker.js'},fetch:async(input)=>{calls.push(['fetch',String(input)]);return {};},importScripts:(...urls)=>calls.push(['script',...urls]),postMessage:m=>messages.push(m)};
 const ctx=vm.createContext({self,URL,loadPyodide:async opts=>{calls.push(['load',opts.indexURL]);return {setStdout(){},setStderr(){}};},importScripts:(...urls)=>self.importScripts(...urls)});
 vm.runInContext(fs.readFileSync('gate/pyodide-worker.js','utf8'),ctx);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(calls,[['script','moz-extension://fixture/vendor/pyodide/pyodide.js'],['load','moz-extension://fixture/vendor/pyodide/']]);
 assert.equal(messages[0].type,'ready');
 for(const url of ['https://cdn.jsdelivr.net/anything.js','https://api.anthropic.com/v1/messages','moz-extension://fixture/vendor/pyodide/../../gate/anything.js']) {
  await assert.rejects(self.fetch(url),/Only bundled/);assert.throws(()=>self.importScripts(url),/Remote scripts/);
 }
 await self.fetch(new URL('moz-extension://fixture/vendor/pyodide/python_stdlib.zip'));
 assert.equal(calls.length,3);
 assert.throws(()=>new self.XMLHttpRequest(),/disabled/);assert.throws(()=>new self.WebSocket(),/disabled/);assert.throws(()=>new self.EventSource(),/disabled/);
 const request={url:'moz-extension://fixture/vendor/pyodide/pyodide-lock.json',toString:()=> 'https://cdn.jsdelivr.net/evil'};await self.fetch(request);assert.equal(calls.at(-1)[1],request.url);
 let count=0;self.importScripts({toString:()=>++count===1?'moz-extension://fixture/vendor/pyodide/pyodide.js':'https://cdn.jsdelivr.net/evil'});assert.equal(calls.at(-1)[1],'moz-extension://fixture/vendor/pyodide/pyodide.js');
 assert.equal(vm.runInContext('typeof nativeFetch',ctx),'undefined');assert.equal(vm.runInContext('typeof nativeImportScripts',ctx),'undefined');
});
