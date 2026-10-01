// Same-extension DOM bridge for authentic worker tests. Excluded from release ZIP.
'use strict';
(() => {
  const results=[];
  const worker=new Worker(browser.runtime.getURL('gate/pyodide-worker.js'));
  const publish=()=>document.documentElement.setAttribute('data-release-results',JSON.stringify(results));
  publish();
  worker.onmessage=e=>{results.push(e.data);publish();};
  worker.onerror=e=>{results.push({type:'error',error:e.message});publish();};
  document.addEventListener('release-worker-run',()=>{
    results.length=0;publish();
    worker.postMessage(JSON.parse(document.documentElement.getAttribute('data-release-request')));
  });
  document.addEventListener('release-worker-stop',()=>worker.terminate());
})();
