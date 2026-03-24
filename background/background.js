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
  anthropicApiKey: '',
  difficultySchedule: {
    weekdayDefault: 'normal',
    weekendDefault: 'hard',
    timeRanges: []
  }
};
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
  if (changes.gitLearningProfile) gitLearningProfile = changes.gitLearningProfile.newValue || null;
  if (changes.dailyChallengeLog) dailyChallengeLog = changes.dailyChallengeLog.newValue || {};
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

browser.tabs.onActivated.addListener(() => updateActiveTab());
browser.tabs.onUpdated.addListener((_, changeInfo) => {
  if (changeInfo.url || changeInfo.status === 'complete') updateActiveTab();
});
browser.windows.onFocusChanged.addListener((windowId) => {
  windowFocused = windowId !== browser.windows.WINDOW_ID_NONE;
  updateActiveTab();
});

browser.idle.setDetectionInterval(settings.idleTimeoutSeconds || 120);

// ── Single idle listener (handles both tracking + flush) ────────────────────
// Previously there were two separate idle listeners causing duplicate events
// and race conditions. Now merged into one.

browser.idle.onStateChanged.addListener((newState) => {
  isIdle = newState !== 'active';
  updateActiveTab();

  // On sleep/lock, flush all state to storage
  if (newState === 'locked' || newState === 'idle') {
    flushAllState();
  }
});

// Safety-net flush every 30s
let flushIntervalId = setInterval(() => flushActiveTrack(), 30000);

// ── Message handling (from gate, popup, dashboard) ──────────────────────────

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handler = messageHandlers[msg.type];
  if (handler) {
    return handler(msg, sender);
  }
});

const messageHandlers = {
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
          model: msg.model || 'claude-sonnet-4-20250514',
          max_tokens: msg.maxTokens || 1024,
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

  // Git learning profile
  async getGitLearningProfile() {
    return gitLearningProfile;
  },

  async saveGitLearningProfile(msg) {
    gitLearningProfile = msg.profile;
    await browser.storage.local.set({ gitLearningProfile }).catch(logStorageError);
    return { success: true };
  },

  async getProgression() {
    return progression;
  },

  async saveTypingResult(msg) {
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

browser.runtime.onStartup.addListener(() => {
  loadState().then(() => {
    console.log('[Challenge Gate] Startup reload complete.');
  });
});

// Also reload on install/update
browser.runtime.onInstalled.addListener(() => {
  loadState().then(() => {
    console.log('[Challenge Gate] Install/update reload complete.');
  });
});

// ── Init ────────────────────────────────────────────────────────────────────

loadState().then(() => {
  console.log('[Challenge Gate] Loaded.', blockedSites.length, 'sites blocked.');
});
