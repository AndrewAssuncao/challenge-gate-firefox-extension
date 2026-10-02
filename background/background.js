/* Challenge Gate — Background Script
   Handles: domain blocking, unlock state, time tracking, message routing */

'use strict';

// One queue serializes background writes, tracking, learner commands and restore.
let stateQueue = Promise.resolve();
function stateCommand(action) {
  const work = stateQueue.then(action);
  stateQueue = work.catch(() => {});
  return work;
}
const aiRequests = new Set();
let aiConsentEpoch = 0;
const AI_PERSONAL = ['authenticationInfo','personalCommunications'];
const AI_DATA = [...AI_PERSONAL,'technicalAndInteraction'];
browser.permissions.onRemoved?.addListener(p=>{
  if(p.data_collection?.some(x=>AI_DATA.includes(x))) {aiConsentEpoch++;for(const controller of aiRequests) controller.abort('consent-revoked');}
});
async function aiAllowed() {
  const { aiConsent } = await browser.storage.local.get('aiConsent');
  if (aiConsent?.version !== 2 || aiConsent.allowed !== true) return false;
  const permissions = await browser.permissions.getAll();
  return !permissions.data_collection || AI_PERSONAL.every(p => permissions.data_collection.includes(p));
}

async function aiTechnicalAllowed() {
  const {aiConsent}=await browser.storage.local.get('aiConsent');
  if(aiConsent?.version!==2 || aiConsent.technicalAllowed!==true)return false;
  const p=await browser.permissions.getAll();
  return !p.data_collection || p.data_collection.includes('technicalAndInteraction');
}

// Global unhandled rejection handler — prevents silent crashes
self.addEventListener('unhandledrejection', (event) => {
  console.error('[Challenge Gate] Unhandled promise rejection:', 'A background operation failed.');
  event.preventDefault();
});

// ── In-memory state (synced from storage) ──────────────────────────────────

let blockedSites = [];
let unlocks = {};
let timeTracking = {};
const DEFAULT_SETTINGS = {
  unlockDurationMinutes: 30,
  idleTimeoutSeconds: 120,
  typingWordCount: 25,
  typingWpm25: 90,
  typingWpm50: 80,
  typingAccuracyThreshold: 95,
  anthropicApiKey: '',
  difficultySchedule: {
    weekdayDefault: 'normal',
    weekendDefault: 'hard',
    timeRanges: []
  }
};
let settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
let progression = {
  pythonTier: 1,
  pythonCompleted: [],
  terminalTier: 1,
  terminalCompleted: [],
  gitTier: 1,
  gitCompleted: [],
  typingAvgWpm: 0,
  totalChallengesCompleted: 0
};
let learningProfile = null;
let terminalLearningProfile = null;
let gitLearningProfile = null;
let typingHistory = [];
let dailyChallengeLog = {};

// ── Default blocked sites for first run ─────────────────────────────────────

const DEFAULT_SITES = [
  { domain: 'youtube.com', challengeType: 'typing', dailyLimitMinutes: 60, enabled: true },
  { domain: 'twitter.com', challengeType: 'typing', dailyLimitMinutes: 30, enabled: true },
  { domain: 'x.com', challengeType: 'typing', dailyLimitMinutes: 30, enabled: true },
  { domain: 'instagram.com', challengeType: 'typing', dailyLimitMinutes: 30, enabled: true },
  { domain: 'reddit.com', challengeType: 'typing', dailyLimitMinutes: 45, enabled: true },
  { domain: 'tiktok.com', challengeType: 'typing', dailyLimitMinutes: 30, enabled: true }
];

// ── Storage helpers ─────────────────────────────────────────────────────────

async function loadState() {
  try {
    const data = await browser.storage.local.get([
      'blockedSites', 'unlocks', 'timeTracking', 'settings', 'progression', 'learningProfile', 'terminalLearningProfile', 'gitLearningProfile', 'typingHistory', 'dailyChallengeLog'
    ]);

    if (!data.blockedSites) {
      blockedSites = DEFAULT_SITES;
      await browser.storage.local.set({ blockedSites }).catch(logStorageError);
    } else {
      blockedSites = data.blockedSites;
    }

    unlocks = data.unlocks || {};
    timeTracking = data.timeTracking || {};
    settings = { ...settings, ...(data.settings || {}) };
    progression = { ...progression, ...(data.progression || {}) };
    learningProfile = data.learningProfile || null;
    terminalLearningProfile = data.terminalLearningProfile || null;
    gitLearningProfile = data.gitLearningProfile || null;
    typingHistory = data.typingHistory || [];
    dailyChallengeLog = data.dailyChallengeLog || {};

    // Legacy profiles are preserved as evidence, never redistributed into unattempted topics.
    // Quant learner state is versioned and owned by LearnerStore independently.

  } catch (err) {
    console.error('[Challenge Gate] Failed to load state:', err);
  }
}

function logStorageError(err) {
  console.error('[Challenge Gate] Storage write failed:', err);
}

async function saveUnlocks() {
  await browser.storage.local.set({ unlocks }).catch(logStorageError);
}

async function saveTimeTracking() {
  await browser.storage.local.set({ timeTracking }).catch(logStorageError);
}

async function saveProgression() {
  await browser.storage.local.set({ progression }).catch(logStorageError);
}

async function saveSettings() {
  await browser.storage.local.set({ settings }).catch(logStorageError);
}

async function saveBlockedSites() {
  await browser.storage.local.set({ blockedSites }).catch(logStorageError);
}

// Keep in-memory state in sync when other pages write to storage
browser.storage.onChanged.addListener((changes) => {
  if(changes.aiConsent) {aiConsentEpoch++;if(changes.aiConsent.newValue?.allowed!==true || changes.aiConsent.newValue?.technicalAllowed!==changes.aiConsent.oldValue?.technicalAllowed) for(const controller of aiRequests) controller.abort('consent-revoked');}
  if(changes.settings && changes.settings.oldValue?.anthropicApiKey!==changes.settings.newValue?.anthropicApiKey) {aiConsentEpoch++;for(const controller of aiRequests) controller.abort('consent-revoked');}
  if (changes.blockedSites) blockedSites = changes.blockedSites.newValue || [];
  if (changes.unlocks) unlocks = changes.unlocks.newValue || {};
  if (changes.timeTracking) timeTracking = changes.timeTracking.newValue || {};
  if (changes.settings) settings = { ...DEFAULT_SETTINGS, ...(changes.settings.newValue || {}) };
  if (changes.progression) progression = { ...progression, ...(changes.progression.newValue || {}) };
  if (changes.learningProfile) learningProfile = changes.learningProfile.newValue || null;
  if (changes.terminalLearningProfile) terminalLearningProfile = changes.terminalLearningProfile.newValue || null;
  if (changes.gitLearningProfile) gitLearningProfile = changes.gitLearningProfile.newValue || null;
  if (changes.typingHistory) typingHistory = changes.typingHistory.newValue || [];
  if (changes.dailyChallengeLog) dailyChallengeLog = changes.dailyChallengeLog.newValue || {};
});

// ── Domain matching ─────────────────────────────────────────────────────────

// Domains and paths that should never be blocked, even if a parent domain is blocked.
// These are essential services (auth flows, admin consoles, APIs) that share
// domain suffixes with blocked entertainment sites.
const ALWAYS_ALLOW = [
  // Google ecosystem — admin, auth, cloud, workspace (shares infra with youtube.com)
  'accounts.google.com',
  'accounts.youtube.com',   // OAuth redirects during Google sign-in
  'admin.google.com',
  'console.cloud.google.com',
  'console.firebase.google.com',
  'workspace.google.com',
  'mail.google.com',
  'calendar.google.com',
  'docs.google.com',
  'drive.google.com',
  'meet.google.com',
  'studio.youtube.com',     // YouTube Studio (for creators/work)
  // Meta — business tools (shares infra with instagram.com)
  'business.facebook.com',
  'developers.facebook.com',
  // Twitter/X — developer platform
  'developer.twitter.com',
  'developer.x.com'
];

function findBlockedSite(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return null;
  }

  // Check allowlist first — these are never blocked
  if (ALWAYS_ALLOW.some(allowed => hostname === allowed || hostname.endsWith('.' + allowed))) {
    return null;
  }

  return blockedSites.find(s =>
    s.enabled && (hostname === s.domain || hostname.endsWith('.' + s.domain))
  );
}

function isUnlocked(domain) {
  const u = unlocks[domain];
  return u && u.expiresAt > Date.now();
}

function todayKey() {
  // Use local date (not UTC) so it matches the user's calendar day
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getTimeUsedToday(domain) {
  const today = todayKey();
  return (timeTracking[today] && timeTracking[today][domain]) || 0;
}

function isDailyCapExceeded(site) {
  if (!site.dailyLimitMinutes) return false;
  const used = getTimeUsedToday(site.domain);
  return used >= site.dailyLimitMinutes * 60;
}

// ── Request blocking ────────────────────────────────────────────────────────

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    try {
      const site = findBlockedSite(details.url);
      if (!site) return {};

      // Check daily cap first
      if (isDailyCapExceeded(site)) {
        return {
          redirectUrl: browser.runtime.getURL('gate/gate.html')
            + '?domain=' + encodeURIComponent(site.domain)
            + '&url=' + encodeURIComponent(details.url)
            + '&reason=cap'
        };
      }

      if (isUnlocked(site.domain)) return {};

      return {
        redirectUrl: browser.runtime.getURL('gate/gate.html')
          + '?domain=' + encodeURIComponent(site.domain)
          + '&url=' + encodeURIComponent(details.url)
          + '&challenge=' + encodeURIComponent(site.challengeType)
      };
    } catch (err) {
      console.error('[Challenge Gate] webRequest handler error:', err);
      return {}; // Don't block on error — let the request through
    }
  },
  { urls: ['<all_urls>'], types: ['main_frame'] },
  ['blocking']
);

// ── Time tracking ───────────────────────────────────────────────────────────

let activeTrack = null; // { domain, startTime }
let isIdle = false;
let windowFocused = true;
let flushInProgress = false; // guard against concurrent flushes

async function flushActiveTrack() {
  if (!activeTrack || flushInProgress) return;
  flushInProgress = true;

  try {
    const elapsed = Math.round((Date.now() - activeTrack.startTime) / 1000);
    if (elapsed <= 0) return;

    const today = todayKey();
    if (!timeTracking[today]) timeTracking[today] = {};
    timeTracking[today][activeTrack.domain] =
      (timeTracking[today][activeTrack.domain] || 0) + elapsed;

    activeTrack.startTime = Date.now();

    // Check if daily cap is now exceeded
    const site = blockedSites.find(s => s.domain === activeTrack.domain);
    if (site && isDailyCapExceeded(site)) {
      delete unlocks[activeTrack.domain];
      await saveUnlocks();
      activeTrack = null;
    }

    await saveTimeTracking();
  } finally {
    flushInProgress = false;
  }
}

async function updateActiveTab() {
  if (isIdle || !windowFocused) {
    await flushActiveTrack();
    activeTrack = null;
    return;
  }

  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0] || !tabs[0].url) {
      await flushActiveTrack();
      activeTrack = null;
      return;
    }

    const site = findBlockedSite(tabs[0].url);
    if (!site || !isUnlocked(site.domain)) {
      await flushActiveTrack();
      activeTrack = null;
      return;
    }

    if (activeTrack && activeTrack.domain === site.domain) {
      return;
    }

    // Different domain or new track
    await flushActiveTrack();
    activeTrack = { domain: site.domain, startTime: Date.now() };
  } catch {
    await flushActiveTrack();
    activeTrack = null;
  }
}

// All tab/window listeners call async updateActiveTab — must catch errors
// to prevent unhandled rejections from crashing the background script on sleep/wake.
browser.tabs.onActivated.addListener(() => {
  stateCommand(updateActiveTab).catch(() => {});
});
browser.tabs.onUpdated.addListener((_, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    stateCommand(updateActiveTab).catch(() => {});
  }
});
browser.windows.onFocusChanged.addListener((windowId) => {
  windowFocused = windowId !== browser.windows.WINDOW_ID_NONE;
  stateCommand(updateActiveTab).catch(() => {});
});

// Idle detection interval set after loadState (see init at bottom)
// Default used until settings are loaded.
browser.idle.setDetectionInterval(120);

// ── Single idle listener (handles both tracking + flush) ────────────────────
// Keep the listener synchronous and serialize its asynchronous storage work.

browser.idle.onStateChanged.addListener((newState) => {
  isIdle = newState !== 'active';
  stateCommand(updateActiveTab).catch(() => {});

  // On sleep/lock, flush all state to storage
  // Schedule the work and report a failure without exposing stored values.
  // but Promise.allSettled inside flushAllState ensures partial failures don't cascade
  if (newState === 'locked' || newState === 'idle') {
    stateCommand(flushAllState).catch(err => console.error('[Challenge Gate] Flush on idle failed:', err));
  }
});

// Safety-net flush every 30s — cleared and re-created on startup/reload
// to prevent interval accumulation across script reloads.
let flushIntervalId = null;

function startFlushInterval() {
  if (flushIntervalId) clearInterval(flushIntervalId);
  flushIntervalId = setInterval(() => {
    stateCommand(flushActiveTrack).catch(() => {});
  }, 30000);
}

startFlushInterval();

// ── Message handling (from gate, popup, dashboard) ──────────────────────────

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    const handler = messageHandlers[msg.type];
    if (handler) {
      const result = msg.type==='claudeGenerate'
        ? stateQueue.then(() => handler(msg, sender))
        : stateCommand(() => handler(msg, sender));
      // Catch promise rejections from async handlers
      if (result && typeof result.catch === 'function') {
        return result.catch(err => {
          console.error(`[Challenge Gate] Message handler '${msg.type}' failed:`, err);
          return { error: String(err) };
        });
      }
      return result;
    }
  } catch (err) {
    console.error(`[Challenge Gate] Message handler '${msg.type}' threw:`, err);
    return Promise.resolve({ error: String(err) });
  }
});

let legacyQueue = Promise.resolve();
function legacyCommand(msg) {
  if(typeof msg.eventId!=='string' || !msg.eventId || msg.eventId.length>120) throw Error('A bounded learning event ID is required.');
  const work = legacyQueue.then(async () => {
    const map = {python:['learningProfile',ChallengeProvider],git:['gitLearningProfile',GitChallengeProvider],terminal:['terminalLearningProfile',TerminalChallengeProvider]};
    const [key, provider] = map[msg.discipline] || [];
    if (!key) throw Error('Unknown learning discipline');
    const data = await browser.storage.local.get(key);
    const next = JSON.parse(JSON.stringify(data[key] || provider.defaultProfile()));
    next.savedEvents ||= [];
    if (next.savedEvents.includes(msg.eventId)) return {profile:next};
    if (msg.invalidate) provider.removeChallengeAttempts(next, msg.challenge);
    else provider.updateProfileAfterChallenge(next, msg.challenge, msg.passed, msg.source, msg.struggled, msg.usedHelp, msg.summary);
    next.savedEvents.push(msg.eventId);
    GateBackup.validateRecord(key,next);
    await browser.storage.local.set({[key]:next});
    if(key==='learningProfile') learningProfile=next;
    if(key==='gitLearningProfile') gitLearningProfile=next;
    if(key==='terminalLearningProfile') terminalLearningProfile=next;
    return {profile:next};
  });
  legacyQueue=work.catch(()=>{});
  return work;
}
const quantStore = LearnerStore.create(browser.storage.local,s=>GateBackup.validateRecord('quantLearner',s));

async function replaceBackup(parsed,acceptRecovery=false) {
  await flushActiveTrack();
  activeTrack = null;
  try {
  const current = await browser.storage.local.get([...GateBackup.KEYS,'aiConsent']);
  let before;
  try {before=GateBackup.exportState(current,browser.runtime.getManifest().version);}
  catch {
    if(!acceptRecovery) throw Error('Current records use an unsupported format. Review the recovery warning in the preview before replacing them. No data was changed.');
    before=GateBackup.recoveryState(current,browser.runtime.getManifest().version);
  }
  // A durable recovery point must exist before the replacement can start.
  await browser.storage.local.set({ backupRollback: before });
  const next = {...parsed.data};
  if (next.settings) next.settings = {...next.settings, anthropicApiKey: current.settings?.anthropicApiKey || ''};
  // Unlock grants are ephemeral, and an old backup must not revive one.
  if(next.unlocks) next.unlocks = {};
  if(next.timeTracking) {
    const today=todayKey();
    next.timeTracking[today] ||= {};
    for(const [domain,seconds] of Object.entries(current.timeTracking?.[today] || {})) {
      try {GateBackup.validateRecord('timeTracking',{[today]:{[domain]:seconds}});}catch {continue;}
      next.timeTracking[today][domain]=Math.max(seconds,next.timeTracking[today][domain] || 0);
    }
    if(!Object.keys(next.timeTracking[today]).length) delete next.timeTracking[today];
  }
  const checked={...next};
  if(checked.settings)checked.settings=Object.fromEntries(Object.entries(checked.settings).filter(([k])=>GateBackup.SETTINGS.includes(k)));
  GateBackup.validateData(checked,parsed.partial);
  try {
    await browser.storage.local.set({...next, aiConsent:{version:2,allowed:false,technicalAllowed:false}});
  } catch {
    // Also recover if a storage implementation committed only part of a failed set.
    try {
      await browser.storage.local.set(current);
      await browser.storage.local.remove([...GateBackup.KEYS,'aiConsent'].filter(k=>!Object.prototype.hasOwnProperty.call(current,k)));
      await loadState();
    } catch {
      throw Error('Restore failed. A recovery copy is saved, but storage is unavailable. Use the previous local copy once writes recover.');
    }
    throw Error('Restore write failed. Previous records were recovered; the local rollback copy is available.');
  }
  // Read the committed replacement before releasing the queue to other commands.
  settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  progression = {pythonTier:1,pythonCompleted:[],terminalTier:1,terminalCompleted:[],gitTier:1,gitCompleted:[],typingAvgWpm:0,totalChallengesCompleted:0};
  await loadState();onStateLoaded();
  return {success:true,partial:parsed.partial,notice:parsed.partial?'Quant learning restored. Site policies, legacy progress, usage and temporary unlocks were retained. AI transmission is off. Reload other exercise tabs before continuing.':'Restored. Temporary unlocks were cleared; today’s consumed time cannot decrease. AI transmission is off. Reload other exercise tabs before continuing.'};
  } finally {await updateActiveTab();}
}

const messageHandlers = {
  async exportBackup() {
    await flushActiveTrack();
    return {backup:GateBackup.exportState(await browser.storage.local.get(GateBackup.KEYS),browser.runtime.getManifest().version)};
  },
  async exportRecovery() {
    return {backup:GateBackup.recoveryState(await browser.storage.local.get(GateBackup.KEYS),browser.runtime.getManifest().version)};
  },
  async exportRollback() {
    const {backupRollback,settings:currentSettings}=await browser.storage.local.get(['backupRollback','settings']);
    if(!backupRollback) throw Error('No previous copy is available.');
    return {backup:GateBackup.safeSnapshot(backupRollback,currentSettings?.anthropicApiKey,browser.runtime.getManifest().version)};
  },
  async previewBackup(msg) {
    const preview=GateBackup.preview(msg.text);
    try {GateBackup.exportState(await browser.storage.local.get(GateBackup.KEYS));preview.needsRecoveryApproval=false;}
    catch {preview.needsRecoveryApproval=true;preview.warning+=' Current records use an unsupported format. A recognized-field recovery snapshot will be saved first, with unknown/nested fields excluded. It cannot be automatically rolled back; download it for a reviewed migration.';}
    return preview;
  },
  importBackup(msg) { return replaceBackup(GateBackup.parse(msg.text),msg.acceptRecovery===true); },
  async rollbackBackup() {
    const {backupRollback} = await browser.storage.local.get('backupRollback');
    if(!backupRollback) throw Error('No rollback copy is available in this profile.');
    return replaceBackup(GateBackup.parse(JSON.stringify(backupRollback)));
  },
  async getAiConsent() { return {allowed:await aiAllowed(),technicalAllowed:await aiTechnicalAllowed()}; },
  async setAiConsent(msg) {
    if(typeof msg.allowed!=='boolean') throw Error('Invalid consent choice.');
    if(msg.allowed) {
      const p=await browser.permissions.getAll();
      if(p.data_collection && !AI_PERSONAL.every(x=>p.data_collection.includes(x))) return {error:'Firefox data permissions were not granted. AI remains off.'};
    }
    const technicalAllowed=msg.technicalAllowed===true;
    if(technicalAllowed){const p=await browser.permissions.getAll();if(p.data_collection && !p.data_collection.includes('technicalAndInteraction'))throw Error('Learning history permission was not granted.');}
    await browser.storage.local.set({aiConsent:{version:2,allowed:msg.allowed,technicalAllowed}});
    return {success:true};
  },
  recordLearningAttempt(msg) { return legacyCommand(msg); },
  quantCommand(msg) { return quantStore.command(msg.command).catch(error => ({error:error.message,retryable:!!error.retryable})); },
  async getState() {
    await flushActiveTrack();

    const now = Date.now();
    let changed = false;
    for (const domain in unlocks) {
      if (unlocks[domain].expiresAt <= now) {
        delete unlocks[domain];
        changed = true;
      }
    }
    if (changed) await saveUnlocks();

    const today = todayKey();
    return {
      blockedSites,
      unlocks,
      timeToday: timeTracking[today] || {},
      settings,
      progression,
      learningProfile,
      terminalLearningProfile,
      gitLearningProfile,
      typingHistory,
      dailyChallengeLog
    };
  },

  async unlock(msg) {
    const site = blockedSites.find(s => s.domain === msg.domain);
    if(!site) throw Error('Unknown site policy.');
    const durationMin = (site && site.unlockDurationMinutes) || settings.unlockDurationMinutes || 30;
    const duration = durationMin * 60 * 1000;
    unlocks[msg.domain] = {
      unlockedAt: Date.now(),
      expiresAt: Date.now() + duration
    };
    await saveUnlocks();
    return { success: true, expiresAt: unlocks[msg.domain].expiresAt };
  },

  async lockNow(msg) {
    delete unlocks[msg.domain];
    await saveUnlocks();
    return { success: true };
  },

  async updateSite(msg) {
    const idx = blockedSites.findIndex(s => s.domain === msg.domain);
    if (idx >= 0) {
      const next = { ...blockedSites[idx], ...msg.updates };
      GateBackup.validateRecord('blockedSites',blockedSites.map((s,i)=>i===idx?next:s));
      blockedSites[idx] = next;
    }
    await saveBlockedSites();
    return { success: true };
  },

  async addSite(msg) {
    GateBackup.validateRecord('blockedSites',[msg.site]);
    const exists = blockedSites.find(s => s.domain === msg.site.domain);
    if (exists) return { success: false, error: 'Already exists' };
    blockedSites.push(msg.site);
    await saveBlockedSites();
    return { success: true };
  },

  async removeSite(msg) {
    blockedSites = blockedSites.filter(s => s.domain !== msg.domain);
    await saveBlockedSites();
    delete unlocks[msg.domain];
    await saveUnlocks();
    return { success: true };
  },

  async updateSettings(msg) {
    if(msg.settings.anthropicApiKey!==undefined && (typeof msg.settings.anthropicApiKey!=='string' || msg.settings.anthropicApiKey.length>4000 || (msg.settings.anthropicApiKey!=='' && (msg.settings.anthropicApiKey.length<12 || /\s/.test(msg.settings.anthropicApiKey)))))throw Error('Invalid API key setting.');
    if(Object.keys(msg.settings).some(k=>!GateBackup.SETTINGS.includes(k) && k!=='anthropicApiKey')) throw Error('Unknown settings field.');
    GateBackup.validateRecord('settings',Object.fromEntries(Object.entries({...settings,...msg.settings}).filter(([k])=>GateBackup.SETTINGS.includes(k))));
    settings = { ...settings, ...msg.settings };
    await saveSettings();
    if (msg.settings.idleTimeoutSeconds) {
      browser.idle.setDetectionInterval(msg.settings.idleTimeoutSeconds);
    }
    return { success: true };
  },

  async updateProgression(msg) {
    const next={ ...progression, ...msg.progression };
    GateBackup.validateRecord('progression',next);
    progression = next;
    await saveProgression();
    return { success: true };
  },

  // Claude API — called from extension pages to avoid CORS issues
  async claudeGenerate(msg) {
    const apiKey = settings.anthropicApiKey;
    if (typeof apiKey!=='string' || (apiKey && (apiKey.length<12 || /\s/.test(apiKey))))return {error:'The saved API key is invalid. Replace it in Settings.'};
    if (!apiKey) {
      return { error: 'No API key configured' };
    }

    const consentEpoch=aiConsentEpoch;
    const technicalAllowed=await aiTechnicalAllowed();
    if (!await aiAllowed() || consentEpoch!==aiConsentEpoch) return { error: 'AI transmission is off. Review data consent in Settings.' };
    const prompt=technicalAllowed ? msg.prompt : msg.promptWithoutHistory;
    if(typeof prompt!=='string' || !prompt.trim())return {error:'Reload this exercise to use AI without learning history.'};

    const controller = new AbortController();
    aiRequests.add(controller);
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          // Anthropic's replacement for Sonnet 4, retired June 15, 2026.
          model: msg.model || 'claude-sonnet-4-6',
          max_tokens: msg.maxTokens || 1024,
          messages: [
            { role: 'user', content: prompt }
          ]
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        // Never echo or log response bodies: they may contain request content.
        const errors = {
          400: 'Anthropic rejected the tutor request (400). Check API access and spend limits in Claude Console.',
          401: 'Anthropic could not authenticate the saved API key (401). Check the key in Settings.',
          402: 'Anthropic billing needs attention (402). Check payment details in Claude Console.',
          403: 'Anthropic denied access to this tutor model (403). Check workspace permissions in Claude Console.',
          404: 'The tutor model is unavailable (404). Update the extension or check model access in Claude Console.',
          413: 'The tutor request is too large (413). Try a shorter request.',
          429: 'Anthropic reached a rate or spend limit (429). Wait before retrying and check limits in Claude Console.',
          504: 'Anthropic timed out (504). Try Help again.',
          529: 'Anthropic is temporarily overloaded (529). Try Help again later.'
        };
        const error = errors[response.status] || (response.status >= 500
          ? `Anthropic is temporarily unavailable (${response.status}). Try Help again later.`
          : `Anthropic rejected the tutor request (${response.status}). Check API access in Claude Console.`);
        return { error, status: response.status };
      }

      const data = await response.json();
      const content = Array.isArray(data.content)
        ? data.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
        : '';
      if (!content.trim()) {
        return { error: 'The tutor returned no text. Try Help again.' };
      }
      return { content };
    } catch (err) {
      if(controller.signal.reason==='consent-revoked') return {error:'AI transmission was turned off. Local teaching is still available.'};
      if (err.name === 'AbortError') {
        return { error: 'The tutor request timed out. Try Help again.' };
      }
      if (err.name === 'SyntaxError') {
        return { error: 'The tutor returned an unreadable response. Try Help again.' };
      }
      return { error: 'Could not reach Anthropic. Check your connection and try Help again.' };
    } finally {
      clearTimeout(timeoutId);
      aiRequests.delete(controller);
    }
  },

  // Learning profile
  async getLearningProfile() {
    return learningProfile;
  },

  async saveLearningProfile() {
    return {error:'This page uses an outdated learning format. Reload before saving progress.'};
  },

  // Terminal learning profile
  async getTerminalLearningProfile() {
    return terminalLearningProfile;
  },

  async saveTerminalLearningProfile() {
    return {error:'This page uses an outdated learning format. Reload before saving progress.'};
  },

  // Git learning profile
  async getGitLearningProfile() {
    return gitLearningProfile;
  },

  async saveGitLearningProfile() {
    return {error:'This page uses an outdated learning format. Reload before saving progress.'};
  },

  async getProgression() {
    return progression;
  },

  async saveTypingResult(msg) {
    GateBackup.validateRecord('typingHistory',[msg.result]);
    typingHistory.push(msg.result);
    if (typingHistory.length > 500) {
      typingHistory = typingHistory.slice(-500);
    }
    await browser.storage.local.set({ typingHistory }).catch(logStorageError);
    return { success: true };
  },

  async getTypingHistory() {
    return typingHistory;
  },

  // Daily challenge log (for heatmap and time metrics)
  async logChallengeCompletion(msg) {
    if(msg.challengeType && !['typing','python','terminal','git','math','brainteasers'].includes(msg.challengeType)) throw Error('Unknown challenge type.');
    if(msg.solveTime!==undefined && (!Number.isFinite(msg.solveTime) || msg.solveTime<0)) throw Error('Invalid solve time.');
    const today = todayKey();
    if (!dailyChallengeLog[today]) {
      dailyChallengeLog[today] = { typing: 0, python: 0, terminal: 0, git: 0, totalTime: 0 };
    }
    const log = dailyChallengeLog[today];
    if (msg.challengeType) log[msg.challengeType] = (log[msg.challengeType] || 0) + 1;
    if (msg.solveTime) log.totalTime = (log.totalTime || 0) + msg.solveTime;
    // Prune entries older than 1 year
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    for (const key of Object.keys(dailyChallengeLog)) {
      if (key < cutoffKey) delete dailyChallengeLog[key];
    }
    await browser.storage.local.set({ dailyChallengeLog }).catch(logStorageError);
    return { success: true };
  },

  async getDailyChallengeLog() {
    return dailyChallengeLog;
  },

  // Difficulty schedule
  async getCurrentDifficulty() {
    const schedule = settings.difficultySchedule || {};
    const now = new Date();
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check time range overrides first
    for (const range of (schedule.timeRanges || [])) {
      if (range.start && range.end) {
        // Handle overnight ranges (e.g., 22:00-06:00)
        if (range.start > range.end) {
          if (currentTime >= range.start || currentTime < range.end) {
            return { difficulty: range.difficulty };
          }
        } else {
          if (currentTime >= range.start && currentTime < range.end) {
            return { difficulty: range.difficulty };
          }
        }
      }
    }

    return { difficulty: isWeekend ? (schedule.weekendDefault || 'normal') : (schedule.weekdayDefault || 'normal') };
  }
};

// ── Suspend / shutdown handler ───────────────────────────────────────────────
// Flush all in-memory state to storage. Called on sleep/idle and startup.
// Uses Promise.allSettled so one failing save doesn't block the rest.

async function flushAllState() {
  await Promise.allSettled([
    flushActiveTrack(),
    saveUnlocks(),
    saveTimeTracking(),
    saveProgression(),
    saveSettings(),
    saveBlockedSites()
  ]);
}

// ── Startup handler ──────────────────────────────────────────────────────────
// Re-initialize state cleanly on browser restart / extension reload.

function onStateLoaded() {
  // Apply user's idle timeout now that settings are loaded
  browser.idle.setDetectionInterval(settings.idleTimeoutSeconds || 120);
  // Reset flush interval to prevent accumulation
  startFlushInterval();
}

browser.runtime.onStartup.addListener(() => {
  stateCommand(loadState)
    .then(() => { onStateLoaded(); console.log('[Challenge Gate] Startup reload complete.'); })
    .catch(err => console.error('[Challenge Gate] Startup load failed:', err));
});

browser.runtime.onInstalled.addListener(() => {
  stateCommand(loadState)
    .then(async () => {
      onStateLoaded();
      const {aiConsent} = await browser.storage.local.get('aiConsent');
      if(aiConsent?.version!==2) await browser.tabs.create({url:browser.runtime.getURL('dashboard/consent.html'),active:true});
    })
    .catch(err => console.error('[Challenge Gate] Install load failed:', err));
});

// ── Init ────────────────────────────────────────────────────────────────────

stateCommand(loadState)
  .then(() => { onStateLoaded(); console.log('[Challenge Gate] Loaded.', blockedSites.length, 'sites blocked.'); })
  .catch(err => console.error('[Challenge Gate] Init load failed:', err));
