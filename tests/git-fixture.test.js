const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('three-commit Git fixture is solvable with supplied files through the real simulator',()=>{
 const source=fs.readFileSync(require.resolve('../gate/git.js'),'utf8').replace('return { init, destroy };','return { GitSim, execute };');
 const context=vm.createContext({document:{getElementById:()=>({})},console,Date,Math});vm.runInContext(source,context);
 const api=vm.runInContext('GitChallenge',context),q=require('../gate/challenges/git-problems.json').find(q=>q.id==='g-commit-01');
 api.GitSim.init(q.initialState);
 for(const file of ['one.txt','two.txt','three.txt']){assert.equal(api.execute('git add '+file).exitCode,0);assert.equal(api.execute('git commit -m "Save '+file+'"').exitCode,0);}
 assert.equal(api.GitSim.commits.size,4);assert.equal(api.GitSim.HEAD.ref,'main');
});
