'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {graph,expected}=require('./graph-fixture.cjs');
test('graph paints practiced/reassessed/retained evidence brightly and keeps repair/review distinct from new nodes',()=>{
 class Node {
  constructor(){this.dataset={};this.style={};this.children=[];this.attributes={};}
  appendChild(n){this.children.push(n);return n;}
  replaceChildren(){this.children=[];}
  setAttribute(k,v){this.attributes[k]=v;}
 }
 const elements=Object.fromEntries(['quant-knowledge-tree','quant-tree-canvas','quant-tree-nodes','quant-skill-detail'].map(id=>[id,new Node()]));
 elements['quant-knowledge-tree'].parentElement={clientWidth:1000};
 const marks=[];let arc;
 const ctx=new Proxy({globalAlpha:1,beginPath(){arc=null;},arc(x,y,r){arc={x,y,r};},fill(){if(arc)marks.push({...arc,alpha:this.globalAlpha,kind:'fill'});},stroke(){if(arc)marks.push({...arc,color:this.strokeStyle,kind:'stroke'});}},{get(t,k){return k in t?t[k]:()=>{};}});
 elements['quant-tree-canvas'].getContext=()=>ctx;
 const context={document:{getElementById:id=>elements[id],createElement:()=>new Node(),activeElement:null},window:{devicePixelRatio:1}};
 vm.createContext(context);vm.runInContext(fs.readFileSync(require.resolve('../dashboard/knowledge-graph.js'),'utf8'),context);
 context.renderCurriculumGraph(graph);
 for(const [id,status] of Object.entries(expected)){
  const node=graph.nodes.find(n=>n.id===id),button=elements['quant-tree-nodes'].children.find(b=>b.dataset.skillId===id);
  assert.equal(node.evidence.status,status);assert.equal(button.dataset.status,status);
  const bright=node.evidence.practiced||node.evidence.retained;
  assert.equal(button.dataset.practiced,String(bright));
  const x=parseFloat(button.style.left),y=parseFloat(button.style.top)+8;
  assert.ok(marks.some(m=>m.x===x&&m.y===y&&m.r===6&&m.kind==='fill'&&m.alpha===(bright?.9:node.evidence.attempts?.45:.08)),id+' fill');
  if(bright)assert.ok(marks.some(m=>m.x===x&&m.y===y&&m.r===11&&m.alpha===.23),id+' glow');
  if(status==='needs practice')assert.ok(marks.some(m=>m.x===x&&m.y===y&&m.r===9&&m.kind==='stroke'&&m.color==='#e0af68'),'repair ring');
 }
 assert.equal(elements['quant-tree-nodes'].children.find(n=>n.dataset.skillId==='arith-fraction').dataset.reviewDue,'true');
 assert.equal(graph.nodes.length,30);assert.equal(graph.edges.length,35);
});
