 'use strict';
const personalData=['authenticationInfo','personalCommunications'];
let builtinConsent=null;
const status=document.getElementById('ai-status'),allow=document.getElementById('ai-allow'),history=document.getElementById('ai-history');
allow.disabled=true;history.disabled=true;
Promise.all([browser.permissions.getAll(),browser.runtime.sendMessage({type:'getAiConsent'})]).then(([p,c])=>{builtinConsent=!!p.data_collection;history.checked=c.technicalAllowed===true;allow.disabled=false;history.disabled=false;}).catch(()=>{status.textContent='Could not read consent. AI remains off.';});
allow.addEventListener('click',async()=>{
  try {
    const technicalAllowed=history.checked;
    // Permission request starts synchronously from this user gesture.
    const grant=builtinConsent?browser.permissions.request({data_collection:[...personalData,...(technicalAllowed?['technicalAndInteraction']:[])]}):Promise.resolve(true);
    if(!await grant){status.textContent='Permission declined. AI remains off.';return;}
    const r=await browser.runtime.sendMessage({type:'setAiConsent',allowed:true,technicalAllowed});if(r.error)throw Error(r.error);
    if(builtinConsent && !technicalAllowed)await browser.permissions.remove({data_collection:['technicalAndInteraction']});
    status.textContent=technicalAllowed?'AI enabled with learning history.':'AI enabled without learning history. Add your own key in Settings when wanted.';
  } catch(e){status.textContent=e.message || 'Could not save the choices.';}
});
document.getElementById('ai-decline').addEventListener('click',async()=>{
  try {
    const r=await browser.runtime.sendMessage({type:'setAiConsent',allowed:false,technicalAllowed:false});if(r.error)throw Error(r.error);
    if(builtinConsent)await browser.permissions.remove({data_collection:[...personalData,'technicalAndInteraction']});
    status.textContent='AI and history sharing are off. Local challenges and Python remain available.';
  }catch{status.textContent='Could not save the choice. Revoke data permissions or remove the API key in Settings and try again.';}
});
