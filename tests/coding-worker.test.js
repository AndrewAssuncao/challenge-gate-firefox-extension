'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createWorker}=require('./worker-cpython-harness.cjs'),C=require('../learning/curriculum');
test('scratch runs exactly editor code, captures output/errors, and never calls assessment cases',async()=>{
 const w=await createWorker();
 const result=await w.run({mode:'scratch',requestId:'scratch-1',code:'def pnl(q, entry, exit):\n    return q * (exit-entry)\nprint(pnl(-3,12,10))\nprint("<learner>")',functionName:'pnl',testCases:[{input:'raise hidden',expected:'secret'}]});
 assert.equal(result.requestId,'scratch-1');assert.equal(result.mode,'scratch');assert.equal(result.stdout,'6\n<learner>\n');assert.equal(result.results,undefined);assert.equal(result.diagnostics,undefined);
 const error=await w.run({mode:'scratch',requestId:'scratch-2',code:'print("before failure")\n1/0'});
 assert.match(error.error,/ZeroDivisionError/);assert.match(error.stdout,/before failure/);assert.equal(error.results,undefined);
 const fresh=await w.run({mode:'scratch',requestId:'scratch-3',code:'print("pnl" in globals())'});
 assert.equal(fresh.stdout,'False\n');assert.equal(w.destroyed,3);
});
test('Quant reference functions pass the actual worker protocol across authored families and edge seeds',async()=>{
 const w=await createWorker();let checks=0;
 for(const s of C.skills.filter(s=>s.mode==='python'))for(const level of [0,1])for(const harder of [false,true])for(const seed of [1,5,9]) {
  const q=C.question(s.id,seed,harder,level),code=q.starterCode.split('\n')[0]+'\n'+q.solution.split('\n').map(line=>'    '+line).join('\n');
  const result=await w.run({mode:'submit',requestId:q.id,code,functionName:q.functionName,testCases:q.testCases});
  assert.equal(result.error,undefined,q.id);assert.ok(result.results.every(r=>r.passed),JSON.stringify({q:q.id,result}));checks+=result.results.length;
 }
 assert.ok(checks>=210);console.log(`${checks} actual-worker/CPython reference checks`);
});
test('Position P&L handles signed/zero values and parameter renames; wrong wrapper has useful diagnostics',async()=>{
 const w=await createWorker(),cases=[{input:'-3, 12, 10',expected:'6',tolerance:1e-6},{input:'0, 50, 70',expected:'0',tolerance:1e-6},{input:'3, 12, 10',expected:'-6',tolerance:1e-6}];
 for(const code of ['def pnl(quantity, entry_price, exit_price):\n    return quantity * (exit_price-entry_price)','def pnl(q,e,x):\n    return q*(x-e)','def pnl(q,e,x):\n    print(q*(x-e))']) {
  const r=await w.run({code,functionName:'pnl',testCases:cases});assert.ok(r.results.every(t=>t.passed),code);
 }
 for(const code of ['quantity * (exit_price-entry_price)','return quantity * (exit_price-entry_price)']) {
  const r=await w.run({code,functionName:'pnl',testCases:cases});assert.equal(r.errorKind,'user-code');assert.ok(r.error);
 }
 const missing=await w.run({code:'def wrong_name(q,e,x):\n    return q*(x-e)',functionName:'pnl',testCases:cases});
 assert.equal(missing.results[0].passed,false);assert.match(missing.results[0].error,/Function "pnl" is not defined/);
 const renamed=await w.run({code:'def pnl(q,e,x):\n    return quantity*(exit_price-entry_price)',functionName:'pnl',testCases:cases});
 assert.equal(renamed.results[0].passed,false);assert.match(renamed.results[0].error,/quantity/);
});
test('a function exception cannot pass by returning expected-looking error text; tolerance remains intact',async()=>{
 const w=await createWorker();
 const r=await w.run({code:'def solve(x):\n    raise ValueError("fixture")',functionName:'solve',testCases:[{input:'1',expected:'ERROR: fixture'}]});
 assert.equal(r.results[0].passed,false);assert.match(r.results[0].error,/fixture/);
 const empty=await w.run({code:'def solve(x):\n    raise ValueError()',functionName:'solve',testCases:[{input:'1',expected:'ERROR:'}]});
 assert.equal(empty.results[0].passed,false);assert.match(empty.results[0].error,/ValueError/);
 const rounded=await w.run({code:'def solve(x):\n    return x/3',functionName:'solve',testCases:[{input:'8',expected:'2.666667',tolerance:1e-6},{input:'8',expected:'2.6666',tolerance:1e-6}]});
 assert.equal(rounded.results[0].passed,true);assert.equal(rounded.results[1].passed,false);
});
