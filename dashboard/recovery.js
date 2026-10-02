'use strict';
(() => {
  const status=document.getElementById('backup-status'), preview=document.getElementById('backup-preview'), apply=document.getElementById('import-backup');
  let pending=null,pendingRecovery=false;
  async function send(type,extra={}) {const r=await browser.runtime.sendMessage({type,...extra});if(r.error)throw Error(r.error);return r;}
  async function exportBackup(kind='exportBackup') {
    try {
      const {backup}=await send(kind);
      const url=URL.createObjectURL(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='challenge-gate-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      status.textContent=backup.notice || 'Backup downloaded. Keep the file private; it includes drafts and site domains.';
    } catch(e) {status.textContent=e.message;}
  }
  document.getElementById('export-backup').onclick=()=>exportBackup();
  document.getElementById('export-learning').onclick=()=>exportBackup();
  document.getElementById('export-recovery').onclick=()=>exportBackup('exportRecovery');
  document.getElementById('export-rollback').onclick=()=>exportBackup('exportRollback');
  document.getElementById('backup-file').addEventListener('change',async e=>{
    pending=null;apply.disabled=true;preview.textContent='';status.textContent='';
    try {
      const f=e.target.files[0];if(!f)return;
      if(f.size>16*1024*1024)throw Error('Backup exceeds the 16 MiB limit.');
      const text=await f.text(),r=await send('previewBackup',{text});
      preview.textContent=r.label+' '+r.sites+' site policies; '+r.events+' learning events. '+r.warning;
      pending=text;pendingRecovery=r.needsRecoveryApproval;apply.disabled=false;
    } catch(e) {status.textContent=e.message;}
  });
  apply.onclick=async()=>{
    if(!pending || !confirm(pendingRecovery?'Current data is unsupported. Save a recognized-field recovery copy (unknown fields excluded), then replace it? This recovery copy cannot be automatically rolled back. Download it for a reviewed migration.':'Replace the records shown in this preview? A local rollback copy will be saved first. Close other exercise tabs before restoring.'))return;
    apply.disabled=true;
    try {const r=await send('importBackup',{text:pending,acceptRecovery:pendingRecovery});pending=null;status.textContent=r.notice;document.dispatchEvent(new Event('gate-restored'));}
    catch(e) {status.textContent=e.message;apply.disabled=false;}
  };
  document.getElementById('rollback-backup').onclick=async()=>{
    if(!confirm('Restore the previous local rollback copy? The current records will become the new rollback copy.'))return;
    try {const r=await send('rollbackBackup');status.textContent=r.notice;document.dispatchEvent(new Event('gate-restored'));}
    catch(e) {status.textContent=e.message;}
  };
  document.getElementById('review-ai-consent').onclick=()=>browser.tabs.create({url:browser.runtime.getURL('dashboard/consent.html'),active:true});
  document.getElementById('disable-ai').onclick=async()=>{
    try {await send('setAiConsent',{allowed:false});const p=await browser.permissions.getAll();if(p.data_collection)await browser.permissions.remove({data_collection:['authenticationInfo','personalCommunications','technicalAndInteraction']});document.getElementById('ai-consent-status').textContent='AI transmission is off.';}
    catch(e) {document.getElementById('ai-consent-status').textContent=e.message;}
  };
})();
