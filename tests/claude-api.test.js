'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create}=require('./background-harness.cjs');
const fixtureKey='fixture-key-not-a-real-credential';
const initial={settings:{anthropicApiKey:fixtureKey}};
const success=()=>({ok:true,status:200,json:async()=>({content:[{type:'text',text:'Local teaching explanation'}]})});

test('Help uses the supported Sonnet replacement and the Messages API contract',async()=>{
 const requests=[];
 const h=await create(initial,undefined,{fetch:async(url,options)=>{requests.push({url,options});return success();}});
 const before=h.data;
 const result=await h.send({type:'claudeGenerate',prompt:'Explain the isolated exercise.',maxTokens:1600});
 assert.equal(result.content,'Local teaching explanation');
 assert.equal(requests.length,1);
 const {url,options}=requests[0],body=JSON.parse(options.body);
 assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(options.method,'POST');
 assert.equal(options.headers['anthropic-version'],'2023-06-01');
 assert.equal(options.headers['x-api-key'],fixtureKey);
 assert.equal(options.headers['anthropic-dangerous-direct-browser-access'],'true');
 assert.deepEqual(body,{model:'claude-sonnet-4-6',max_tokens:1600,messages:[{role:'user',content:'Explain the isolated exercise.'}]});
 assert.deepEqual(h.data,before);
});

test('explicit advanced-tier requests retain the supported Opus choice',async()=>{
 let body;
 const h=await create(initial,undefined,{fetch:async(_url,options)=>{body=JSON.parse(options.body);return success();}});
 await h.send({type:'claudeGenerate',model:'claude-opus-4-8',prompt:'Fixture',maxTokens:2048});
 assert.equal(body.model,'claude-opus-4-8');assert.equal(body.max_tokens,2048);
});

test('HTTP failures are useful without reading or exposing response bodies',async t=>{
 const cases=[[400,/request.*400.*spend limits/],[401,/authenticate.*401.*Settings/],
  [402,/billing.*402.*payment/],[403,/access.*403.*permissions/],
  [404,/model is unavailable.*404.*Update/],[413,/too large.*413/],
  [429,/rate or spend limit.*429/],[500,/temporarily unavailable.*500/],
  [504,/timed out.*504/],[529,/overloaded.*529/],[418,/request.*418/]];
 for(const [status,expected]of cases)await t.test(String(status),async()=>{
  let bodyRead=false,calls=0;const logs=[];
  const h=await create(initial,undefined,{console:{log(...args){logs.push(args);},error(...args){logs.push(args);}},
   fetch:async()=>{calls++;return {ok:false,status,text:async()=>{bodyRead=true;return fixtureKey;},json:async()=>{bodyRead=true;return {error:{type:'not_found_error',message:fixtureKey}};}};}});
  const lesson=await h.send({type:'quantCommand',command:{op:'begin',mode:'math',track:'arithmetic',practice:true}});
  assert.ok(lesson.lesson);const before=h.data;
  const result=await h.send({type:'claudeGenerate',prompt:'Fixture'});
  assert.match(result.error,expected);assert.equal(result.status,status);assert.equal(calls,1);
  assert.equal(bodyRead,false);assert.equal(JSON.stringify(result).includes(fixtureKey),false);
  assert.equal(JSON.stringify(logs).includes(fixtureKey),false);assert.deepEqual(h.data,before);
 });
});

test('missing key performs no HTTP request',async()=>{
 let calls=0;const h=await create({},undefined,{fetch:async()=>{calls++;return success();}});
 assert.deepEqual(await h.send({type:'claudeGenerate',prompt:'Fixture'}),{error:'No API key configured'});
 assert.equal(calls,0);
});

test('network failure never echoes exception details and always clears its timer',async()=>{
 const logs=[],cleared=[];
 const h=await create(initial,undefined,{console:{log(...args){logs.push(args);},error(...args){logs.push(args);}},
  setTimeout:()=>37,clearTimeout:id=>cleared.push(id),fetch:async()=>{throw Error(fixtureKey);}});
 const result=await h.send({type:'claudeGenerate',prompt:'Fixture'});
 assert.match(result.error,/Could not reach Anthropic/);
 assert.equal(JSON.stringify(result).includes(fixtureKey),false);
 assert.equal(JSON.stringify(logs).includes(fixtureKey),false);assert.deepEqual(cleared,[37]);
});

test('timeout aborts the request and clears its timer without retrying',async()=>{
 let timeout,calls=0,cleared=false;
 const h=await create(initial,undefined,{setTimeout:fn=>{timeout=fn;return 21;},clearTimeout:id=>{cleared=id===21;},
  fetch:async(_url,options)=>{calls++;return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>{
   const error=Error(fixtureKey);error.name='AbortError';reject(error);
  }));}});
 const pending=h.send({type:'claudeGenerate',prompt:'Fixture'});timeout();
 const result=await pending;assert.match(result.error,/request timed out/);assert.equal(calls,1);assert.equal(cleared,true);
 assert.equal(JSON.stringify(result).includes(fixtureKey),false);
});

test('success extracts text blocks after thinking without exposing the thinking block',async()=>{
 const h=await create(initial,undefined,{fetch:async()=>({ok:true,status:200,json:async()=>({content:[
  {type:'thinking',thinking:'Fixture private reasoning'},{type:'text',text:'First explanation'},{type:'text',text:'Second explanation'}]})})});
 assert.deepEqual(await h.send({type:'claudeGenerate',prompt:'Fixture'}),{content:'First explanation\nSecond explanation'});
});

test('unreadable or empty successful responses return a safe failure',async()=>{
 const invalid=await create(initial,undefined,{fetch:async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError(fixtureKey);}})});
 assert.match((await invalid.send({type:'claudeGenerate',prompt:'Fixture'})).error,/unreadable response/);
 const empty=await create(initial,undefined,{fetch:async()=>({ok:true,status:200,json:async()=>({content:[]})})});
 assert.match((await empty.send({type:'claudeGenerate',prompt:'Fixture'})).error,/returned no text/);
});
