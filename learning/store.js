'use strict';
// One owner (the persistent background page), serialized updates, commit before ack.
const LearnerStore = (() => {
  const E=typeof QuantLearning!=='undefined'?QuantLearning:require('./engine');
  function create(storage) {
    let queue=Promise.resolve();
    async function read() {const data=await storage.get('quantLearner');return E.validate(Object.hasOwn(data,'quantLearner') && data.quantLearner !== undefined ? data.quantLearner : E.empty());}
    function command(cmd) {
      const work=queue.then(async()=>{
        if(cmd.op==='export') {const raw=await storage.get('quantLearner');return {state:raw.quantLearner ?? E.empty()};}
        const state=await read();
        if(cmd.op==='read') return {state};
        const result=E.apply(state,cmd);
        try { await storage.set({quantLearner:result.state}); } catch(error) { error.retryable = true; throw error; }
        return result;
      });
      queue=work.catch(()=>{});
      return work;
    }
    return {command};
  }
  return {create};
})();
if(typeof module!=='undefined') module.exports=LearnerStore;
