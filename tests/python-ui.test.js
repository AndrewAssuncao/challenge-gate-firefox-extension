const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('submitted syntax errors record failed evidence; infrastructure failures do not',()=>{
 const node=()=>({classList:{remove(){},add(){}},innerHTML:'',textContent:'',disabled:false});
 const c=vm.createContext({document:{getElementById:node,createElement:node},window:{addEventListener(){}},clearTimeout});
 let source=fs.readFileSync(require.resolve('../gate/python.js'),'utf8');
 source=source.replace('return { init, destroyWorker };','return { handleResult, setup(callback) {config={quantChallenge:true,onQuantResult:callback};} };');
 vm.runInContext(source,c);const ui=vm.runInContext('PythonChallenge',c),outcomes=[];ui.setup(value=>outcomes.push(value));
 ui.handleResult({error:'SyntaxError',errorKind:'user-code'});assert.deepEqual(outcomes,[false]);
 ui.handleResult({error:'Runtime unavailable',errorKind:'infrastructure'});assert.deepEqual(outcomes,[false]);
});
