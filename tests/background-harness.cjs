'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
async function create(initial={},base='http://127.0.0.1/',options={}) {
 let saved=structuredClone(initial), fail=false,sets=0;
 const event=()=>({listeners:[],addListener(fn){this.listeners.push(fn);}});
 const changed=event(),messages=event(),requests=event();
 const browser={
  storage:{onChanged:changed,local:{get:async keys=>{if(typeof keys==='string')return {[keys]:structuredClone(saved[keys])};return structuredClone(saved);},remove:async keys=>{for(const k of keys)delete saved[k];},set:async data=>{if(fail || ++sets===options.failSetNumber)throw Error('test disk failure');if(sets===options.partialSetNumber){saved[Object.keys(data)[0]]=structuredClone(Object.values(data)[0]);throw Error('test partial disk failure');}const changes={};for(const [key,value]of Object.entries(data)){changes[key]={oldValue:saved[key],newValue:structuredClone(value)};saved[key]=structuredClone(value);}for(const fn of changed.listeners)fn(changes,'local');}}},
  permissions:{getAll:async()=>options.permissions || {}},
  runtime:{getManifest:()=>({version:'1.1.0'}),onMessage:messages,onStartup:event(),onInstalled:event(),getURL:p=>base+p},
  webRequest:{onBeforeRequest:requests},tabs:{create:async()=>({}),query:async()=>options.tabs || [],onActivated:event(),onUpdated:event()},windows:{onFocusChanged:event(),WINDOW_ID_NONE:-1},idle:{setDetectionInterval(){},onStateChanged:event()}
 };
 const ctx=vm.createContext({browser,self:{addEventListener(){}},console:options.console || {log(){},error(){}},Date,URL,TextEncoder,AbortController,setTimeout:options.setTimeout || setTimeout,clearTimeout:options.clearTimeout || clearTimeout,setInterval:()=>1,clearInterval(){},fetch:options.fetch || (async()=>{throw Error('Network disabled in tests');})});
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));
 for(const script of manifest.background.scripts)vm.runInContext(fs.readFileSync(path.join(root,script),'utf8'),ctx,{filename:script});
 await new Promise(resolve=>setImmediate(resolve));
 return {activeDomain:()=>vm.runInContext("activeTrack?.domain",ctx),idle:state=>{for(const fn of browser.idle.onStateChanged.listeners)fn(state);},send:async msg=>JSON.parse(JSON.stringify(await messages.listeners[0](msg,{},()=>{}))),request:url=>requests.listeners[0]({url}),get data(){return structuredClone(saved);},set fail(v){fail=v;}};
}
module.exports={create};
