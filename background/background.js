/* Challenge Gate — Background Script
   Handles: domain blocking, unlock state, time tracking, message routing */

'use strict';

// ── In-memory state (synced from storage) ──────────────────────────────────

let blockedSites = [];
let unlocks = {};
let timeTracking = {};
let settings = {
  unlockDurationMinutes: 30,
  settingsProtected: true,
  idleTimeoutSeconds: 120,
  typingWordCount: 25,
  typingWpm25: 90,
  typingWpm50: 80,
  typingAccuracyThreshold: 95,
  settingsTypingWpm: 100,
  anthropicApiKey: ''
};
let progression = {
  pythonTier: 1,
  pythonCompleted: [],
  terminalTier: 1,
  terminalCompleted: [],
  typingAvgWpm: 0,
  totalChallengesCompleted: 0
};
let learningProfile = null; // loaded from storage
let terminalLearningProfile = null; // loaded from storage
let typingHistory = []; // array of { wpm, accuracy, wordCount, passed, timestamp }

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
      'blockedSites', 'unlocks', 'timeTracking', 'settings', 'progression', 'learningProfile', 'terminalLearningProfile', 'typingHistory'
    ]);

    if (!data.blockedSites) {
      // First run — seed defaults
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
    typingHistory = data.typingHistory || [];
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
  if (changes.blockedSites) blockedSites = changes.blockedSites.newValue || [];
  if (changes.unlocks) unlocks = changes.unlocks.newValue || {};
  if (changes.timeTracking) timeTracking = changes.timeTracking.newValue || {};
  if (changes.settings) settings = { ...settings, ...(changes.settings.newValue || {}) };
  if (changes.progression) progression = { ...progression, ...(changes.progression.newValue || {}) };
  if (changes.terminalLearningProfile) terminalLearningProfile = changes.terminalLearningProfile.newValue || null;
});

// ── Domain matching ─────────────────────────────────────────────────────────

function findBlockedSite(url) {
  let hostname;
  try {
    hostname = new URL(url).hostname;
  } catch {
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
  return new Date().toISOString().slice(0, 10);
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
  },
  { urls: ['<all_urls>'], types: ['main_frame'] },
  ['blocking']
);

// ── Time tracking ───────────────────────────────────────────────────────────

let activeTrack = null; // { domain, startTime }
let isIdle = false;
let windowFocused = true;

async function flushActiveTrack() {
  if (!activeTrack) return;
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
    // Revoke unlock
    delete unlocks[activeTrack.domain];
    await saveUnlocks();
    activeTrack = null;
  }

  await saveTimeTracking();
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
      // Same domain, keep tracking
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

browser.tabs.onActivated.addListener(() => updateActiveTab());
browser.tabs.onUpdated.addListener((_, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') updateActiveTab();
});
browser.windows.onFocusChanged.addListener((windowId) => {
  windowFocused = windowId !== browser.windows.WINDOW_ID_NONE;
  updateActiveTab();
});

browser.idle.setDetectionInterval(settings.idleTimeoutSeconds || 120);
browser.idle.onStateChanged.addListener((state) => {
  isIdle = state !== 'active';
  updateActiveTab();
});

// Safety-net flush every 30s (store ID so it could be cleared if needed)
let flushIntervalId = setInterval(() => flushActiveTrack(), 30000);

// ── Message handling (from gate, popup, dashboard) ──────────────────────────

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = messageHandlers[msg.type];
  if (handler) {
    // Return a promise for async handlers
    return handler(msg, sender);
  }
});

const messageHandlers = {
  async getState() {
    // Flush active tracking so data is fresh
    await flushActiveTrack();

    // Clean expired unlocks
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
      typingHistory
    };
  },

  async unlock(msg) {
    // Per-site unlock duration overrides global default
    const site = blockedSites.find(s => s.domain === msg.domain);
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
      blockedSites[idx] = { ...blockedSites[idx], ...msg.updates };
    }
    await saveBlockedSites();
    return { success: true };
  },

  async addSite(msg) {
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
    settings = { ...settings, ...msg.settings };
    await saveSettings();
    if (msg.settings.idleTimeoutSeconds) {
      browser.idle.setDetectionInterval(msg.settings.idleTimeoutSeconds);
    }
    return { success: true };
  },

  async updateProgression(msg) {
    progression = { ...progression, ...msg.progression };
    await saveProgression();
    return { success: true };
  },

  // Claude API — called from extension pages to avoid CORS issues
  async claudeGenerate(msg) {
    const apiKey = settings.anthropicApiKey;
    if (!apiKey) {
      return { error: 'No API key configured' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [
            { role: 'user', content: msg.prompt }
          ]
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Challenge Gate] Claude API error:', response.status, errText);
        return { error: `API error: ${response.status}` };
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '';
      return { content };
    } catch (err) {
      console.error('[Challenge Gate] Claude API fetch failed:', err);
      return { error: err.message };
    }
  },

  // Learning profile
  async getLearningProfile() {
    return learningProfile;
  },

  async saveLearningProfile(msg) {
    learningProfile = msg.profile;
    await browser.storage.local.set({ learningProfile }).catch(logStorageError);
    return { success: true };
  },

  // Terminal learning profile
  async getTerminalLearningProfile() {
    return terminalLearningProfile;
  },

  async saveTerminalLearningProfile(msg) {
    terminalLearningProfile = msg.profile;
    await browser.storage.local.set({ terminalLearningProfile }).catch(logStorageError);
    return { success: true };
  },

  async getProgression() {
    return progression;
  },

  async saveTypingResult(msg) {
    typingHistory.push(msg.result);
    // Keep last 500 results
    if (typingHistory.length > 500) {
      typingHistory = typingHistory.slice(-500);
    }
    await browser.storage.local.set({ typingHistory }).catch(logStorageError);
    return { success: true };
  },

  async getTypingHistory() {
    return typingHistory;
  }
};

// ── Suspend / shutdown handler ───────────────────────────────────────────────
// Flush in-memory state to storage before the background script is unloaded
// (e.g. system sleep, browser shutdown, extension update).

function flushAllState() {
  // Use synchronous-ish best-effort saves. In MV2 background scripts,
  // the browser may kill us shortly after this fires, so we fire-and-forget.
  flushActiveTrack().catch(logStorageError);
  saveUnlocks().catch(logStorageError);
  saveTimeTracking().catch(logStorageError);
  saveProgression().catch(logStorageError);
  saveSettings().catch(logStorageError);
  saveBlockedSites().catch(logStorageError);
}

// idle state "locked" fires when the OS is about to sleep (screen locks)
// We already handle idle → updateActiveTab, but also flush everything.
browser.idle.onStateChanged.addListener((state) => {
  if (state === 'locked' || state === 'idle') {
    flushAllState();
  }
});

// ── Init ────────────────────────────────────────────────────────────────────

loadState().then(() => {
  console.log('[Challenge Gate] Loaded.', blockedSites.length, 'sites blocked.');
});
