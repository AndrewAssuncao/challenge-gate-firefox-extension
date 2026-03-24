/* Dashboard Controller */

'use strict';

const Dashboard = (() => {
  let state = null;
  let settingsUnlocked = false;
  let editingDomain = null;
  let refreshTimer = null;
  let activeProgressView = 'typing'; // 'typing', 'python', or 'terminal'

  // Elements
  const els = {
    statChallenges: document.getElementById('stat-challenges'),
    statTier: document.getElementById('stat-tier'),
    sitesTbody: document.getElementById('sites-tbody'),
    noSites: document.getElementById('no-sites'),
    sitesTable: document.getElementById('sites-table'),
    addSiteBtn: document.getElementById('add-site-btn'),
    addSiteForm: document.getElementById('add-site-form'),
    newDomain: document.getElementById('new-domain'),
    newChallengeType: document.getElementById('new-challenge-type'),
    newDailyLimit: document.getElementById('new-daily-limit'),
    newUnlockDuration: document.getElementById('new-unlock-duration'),
    confirmAddBtn: document.getElementById('confirm-add-btn'),
    cancelAddBtn: document.getElementById('cancel-add-btn'),
    usageBars: document.getElementById('usage-bars'),
    noUsage: document.getElementById('no-usage'),
    settingsOverlay: document.getElementById('settings-overlay'),
    settingsLockText: document.getElementById('settings-lock-text'),
    unlockSettingsBtn: document.getElementById('unlock-settings-btn'),
    settingUnlockDuration: document.getElementById('setting-unlock-duration'),
    settingIdleTimeout: document.getElementById('setting-idle-timeout'),
    settingProtected: document.getElementById('setting-protected'),
    settingWordCount: document.getElementById('setting-word-count'),
    settingWpm25: document.getElementById('setting-wpm-25'),
    settingWpm50: document.getElementById('setting-wpm-50'),
    settingTypingAcc: document.getElementById('setting-typing-acc'),
    settingSettingsWpm: document.getElementById('setting-settings-wpm'),
    settingApiKey: document.getElementById('setting-api-key'),
    progressToggle: document.getElementById('progress-toggle'),
    typingSpeedView: document.getElementById('typing-speed-view'),
    pythonProgressView: document.getElementById('python-progress-view'),
    typingChart: document.getElementById('typing-chart'),
    typingChartStats: document.getElementById('typing-chart-stats'),
    learningCurriculum: document.getElementById('learning-curriculum'),
    learningStats: document.getElementById('learning-stats'),
    terminalProgressView: document.getElementById('terminal-progress-view'),
    terminalCurriculum: document.getElementById('terminal-curriculum'),
    terminalStats: document.getElementById('terminal-stats'),
    saveSettingsBtn: document.getElementById('save-settings-btn'),
    editModal: document.getElementById('edit-modal'),
    editChallengeType: document.getElementById('edit-challenge-type'),
    editDailyLimit: document.getElementById('edit-daily-limit'),
    editEnabled: document.getElementById('edit-enabled'),
    editUnlockDuration: document.getElementById('edit-unlock-duration'),
    editSaveBtn: document.getElementById('edit-save-btn'),
    editCancelBtn: document.getElementById('edit-cancel-btn'),
    editRemoveBtn: document.getElementById('edit-remove-btn'),
    editModalTitle: document.getElementById('edit-modal-title'),
    heatmapCanvas: document.getElementById('heatmap-canvas'),
    heatmapTooltip: document.getElementById('heatmap-tooltip'),
    timeWeekDetail: document.getElementById('time-week-detail'),
    timeTotalDetail: document.getElementById('time-total-detail'),
    settingDifficultyWeekday: document.getElementById('setting-difficulty-weekday'),
    settingDifficultyWeekend: document.getElementById('setting-difficulty-weekend')
  };

  async function init() {
    await loadState();
    render();
    bindEvents();
    // Refresh every 15 seconds
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      await loadState();
      render();
    }, 15000);

    // Clean up timer when page unloads to prevent leaks
    window.addEventListener('beforeunload', () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
    });
  }

  async function loadState() {
    state = await browser.runtime.sendMessage({ type: 'getState' });
  }

  function render() {
    renderHeader();
    renderSites();
    renderUsage();
    renderHeatmap();
    renderTimeMetrics();
    renderProgress();
    renderSettings();
  }

  function renderHeader() {
    const p = state.progression;
    els.statChallenges.textContent = `${p.totalChallengesCompleted || 0} challenges`;
    els.statTier.textContent = `Tier ${p.pythonTier || 1}`;
  }

  function renderSites() {
    const sites = state.blockedSites || [];
    if (sites.length === 0) {
      els.sitesTable.classList.add('hidden');
      els.noSites.classList.remove('hidden');
      return;
    }

    els.sitesTable.classList.remove('hidden');
    els.noSites.classList.add('hidden');

    els.sitesTbody.innerHTML = sites.map(site => {
      const unlock = state.unlocks[site.domain];
      const isUnlocked = unlock && unlock.expiresAt > Date.now();
      const usedSec = state.timeToday[site.domain] || 0;
      const usedMin = Math.round(usedSec / 60);
      const capMin = site.dailyLimitMinutes || null;
      const capExceeded = capMin && usedSec >= capMin * 60;
      const remainMin = capMin ? Math.max(0, capMin - usedMin) : null;

      let statusClass, statusText;
      if (!site.enabled) {
        statusClass = 'status-disabled';
        statusText = 'Disabled';
      } else if (capExceeded) {
        statusClass = 'status-capped';
        statusText = 'Cap reached';
      } else if (isUnlocked) {
        statusClass = 'status-unlocked';
        statusText = 'Unlocked';
      } else {
        statusClass = 'status-locked';
        statusText = 'Locked';
      }

      const expiresText = isUnlocked
        ? formatTime(new Date(unlock.expiresAt))
        : '—';

      const capText = capMin ? `${capMin}m` : '—';
      const usedText = `${usedMin}m`;
      const remainText = remainMin !== null ? `${remainMin}m` : '—';
      const remainClass = remainMin !== null && remainMin <= 5 ? 'cell-warn' : 'cell-dim';

      const challengeLabel = { typing: 'Typing', python: 'Python', terminal: 'Terminal', both: 'Both' }[site.challengeType] || 'Typing';

      return `<tr data-domain="${esc(site.domain)}">
        <td>${esc(site.domain)}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td class="cell-dim">${expiresText}</td>
        <td class="cell-dim">${capText}</td>
        <td>${usedText}</td>
        <td class="${remainClass}">${remainText}</td>
        <td class="cell-dim">${challengeLabel}</td>
        <td class="cell-actions">
          ${isUnlocked ? `<button class="dash-btn dash-btn-sm action-lock" data-domain="${esc(site.domain)}">Lock</button>` : ''}
          <button class="dash-btn dash-btn-sm dash-btn-ghost action-edit" data-domain="${esc(site.domain)}">Edit</button>
        </td>
      </tr>`;
    }).join('');

    // Bind action buttons
    els.sitesTbody.querySelectorAll('.action-lock').forEach(btn => {
      btn.addEventListener('click', () => lockNow(btn.dataset.domain));
    });
    els.sitesTbody.querySelectorAll('.action-edit').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.domain));
    });
  }

  function renderUsage() {
    const today = state.timeToday || {};
    const domains = Object.keys(today).filter(d => today[d] > 0);

    if (domains.length === 0) {
      els.usageBars.innerHTML = '';
      els.noUsage.classList.remove('hidden');
      return;
    }

    els.noUsage.classList.add('hidden');

    els.usageBars.innerHTML = domains
      .sort((a, b) => today[b] - today[a])
      .map(domain => {
        const sec = today[domain];
        const min = Math.round(sec / 60);
        const site = (state.blockedSites || []).find(s => s.domain === domain);
        const capMin = site?.dailyLimitMinutes;

        // Scale bar against daily cap if set, otherwise against 1 hour default
        const maxSec = capMin ? capMin * 60 : 3600;
        const pct = Math.max(2, Math.min(100, (sec / maxSec) * 100));

        let barClass = '';
        if (capMin) {
          const ratio = sec / (capMin * 60);
          if (ratio >= 1) barClass = 'exceeded';
          else if (ratio >= 0.8) barClass = 'warning';
        }
        const capLabel = capMin ? ` / ${capMin}m` : '';
        return `<div class="usage-row">
          <div class="usage-domain">${esc(domain)}</div>
          <div class="usage-bar-container">
            <div class="usage-bar ${barClass}" style="width: ${pct}%"></div>
          </div>
          <div class="usage-time">${min}m${capLabel}</div>
        </div>`;
      }).join('');
  }

  // ── Progress section (toggle between typing chart and python curriculum) ──

  function renderProgress() {
    els.typingSpeedView.classList.add('hidden');
    els.pythonProgressView.classList.add('hidden');
    els.terminalProgressView.classList.add('hidden');

    if (activeProgressView === 'typing') {
      els.typingSpeedView.classList.remove('hidden');
      renderTypingChart();
    } else if (activeProgressView === 'python') {
      els.pythonProgressView.classList.remove('hidden');
      renderLearning();
    } else if (activeProgressView === 'terminal') {
      els.terminalProgressView.classList.remove('hidden');
      renderTerminalLearning();
    }
  }

  function renderTypingChart() {
    const history = state.typingHistory || [];
    const canvas = els.typingChart;
    const ctx = canvas.getContext('2d');

    // HiDPI support — lock CSS size first, then set buffer
    const dpr = window.devicePixelRatio || 1;
    const parent = canvas.parentElement;
    const W = parent.clientWidth;
    const H = 260;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, W, H);

    if (history.length === 0) {
      ctx.fillStyle = '#444';
      ctx.font = '13px "SF Mono", "Fira Code", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('No typing tests yet.', W / 2, H / 2);
      els.typingChartStats.textContent = '';
      return;
    }

    // Chart area with padding
    const pad = { top: 20, right: 20, bottom: 36, left: 50 };
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;

    // Data range
    const wpms = history.map(h => h.wpm);
    const minWpm = Math.max(0, Math.min(...wpms) - 10);
    const maxWpm = Math.max(...wpms) + 10;
    const wpmRange = maxWpm - minWpm || 1;

    // X = test index (0..n-1), Y = wpm
    const n = history.length;

    // Map data point to canvas coords
    function toX(i) { return pad.left + (i / Math.max(n - 1, 1)) * cw; }
    function toY(wpm) { return pad.top + ch - ((wpm - minWpm) / wpmRange) * ch; }

    // ── Grid lines ──
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const wpm = minWpm + (wpmRange / gridSteps) * i;
      const y = toY(wpm);
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();

      // Y-axis labels
      ctx.fillStyle = '#444';
      ctx.font = '11px "SF Mono", ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(wpm), pad.left - 8, y + 4);
    }

    // X-axis label
    ctx.fillStyle = '#444';
    ctx.font = '11px "SF Mono", ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('tests', W / 2, H - 4);

    // ── Trendline (moving average, window = max(5, n/10)) ──
    if (n >= 2) {
      const windowSize = Math.max(5, Math.floor(n / 10));
      const trend = [];
      for (let i = 0; i < n; i++) {
        const start = Math.max(0, i - Math.floor(windowSize / 2));
        const end = Math.min(n, i + Math.ceil(windowSize / 2));
        let sum = 0;
        for (let j = start; j < end; j++) sum += history[j].wpm;
        trend.push(sum / (end - start));
      }

      ctx.strokeStyle = '#4a7eff';
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = toX(i);
        const y = toY(trend[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // ── Scatter points ──
    for (let i = 0; i < n; i++) {
      const x = toX(i);
      const y = toY(history[i].wpm);
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = history[i].passed
        ? 'rgba(74, 126, 255, 0.35)'
        : 'rgba(204, 68, 68, 0.35)';
      ctx.fill();
    }

    // ── Stats summary ──
    const recent = history.slice(-10);
    const avgWpm = Math.round(wpms.reduce((a, b) => a + b, 0) / n);
    const recentAvg = Math.round(recent.reduce((a, b) => a + b.wpm, 0) / recent.length);
    const best = Math.max(...wpms);
    const passRate = Math.round((history.filter(h => h.passed).length / n) * 100);

    els.typingChartStats.textContent =
      `avg ${avgWpm} wpm · last ${recent.length} avg ${recentAvg} wpm · best ${best} wpm · ${passRate}% pass rate · ${n} tests`;
  }

  function renderLearning() {
    const profile = state.learningProfile;
    const CURRICULUM = [
      { id: 'basics',        name: 'Variables, types, basic operations',    tier: 1 },
      { id: 'strings',       name: 'Strings and string methods',           tier: 1 },
      { id: 'conditionals',  name: 'Conditionals',                         tier: 1 },
      { id: 'loops',         name: 'Loops',                                tier: 1 },
      { id: 'lists',         name: 'Lists and list operations',            tier: 2 },
      { id: 'dicts',         name: 'Dictionaries',                         tier: 2 },
      { id: 'sets_tuples',   name: 'Sets and tuples',                      tier: 2 },
      { id: 'comprehensions',name: 'Comprehensions',                       tier: 2 },
      { id: 'functions',     name: 'Functions and scope',                  tier: 2 },
      { id: 'string_ops',    name: 'String parsing',                       tier: 3 },
      { id: 'error_handling',name: 'Error handling',                       tier: 3 },
      { id: 'file_patterns', name: 'File I/O patterns',                    tier: 3 },
      { id: 'sorting',       name: 'Sorting and custom sorts',             tier: 3 },
      { id: 'recursion',     name: 'Recursion',                            tier: 3 },
      { id: 'classes',       name: 'Classes and OOP',                      tier: 4 },
      { id: 'generators',    name: 'Generators and iterators',             tier: 4 },
      { id: 'decorators',    name: 'Decorators',                           tier: 4 },
      { id: 'data_structs',  name: 'Data structures',                      tier: 4 },
      { id: 'algorithms',    name: 'Algorithms',                           tier: 4 },
      { id: 'dp',            name: 'Dynamic programming',                  tier: 5 },
      { id: 'graphs',        name: 'Graph traversal',                      tier: 5 },
      { id: 'advanced',      name: 'Advanced patterns',                    tier: 5 }
    ];

    const currentIdx = profile ? profile.currentTopicIndex : 0;
    const history = profile ? profile.topicHistory || {} : {};

    els.learningCurriculum.innerHTML = CURRICULUM.map((topic, i) => {
      let rowClass, markerClass, markerText;
      if (i < currentIdx) {
        rowClass = 'completed';
        markerClass = 'done';
        markerText = '✓';
      } else if (i === currentIdx) {
        rowClass = 'current';
        markerClass = 'active';
        markerText = '→';
      } else {
        rowClass = 'future';
        markerClass = 'pending';
        markerText = '·';
      }

      const th = history[topic.id];
      const statsText = th ? `${th.passes}/${th.attempts}` : '';

      return `<div class="curriculum-row ${rowClass}">
        <span class="curriculum-marker ${markerClass}">${markerText}</span>
        <span class="curriculum-name">${esc(topic.name)}</span>
        <span class="curriculum-stats">${statsText}</span>
      </div>`;
    }).join('');

    if (profile) {
      const parts = [];
      parts.push(`${profile.totalSessions || 0} sessions`);
      if (profile.streakDays > 1) parts.push(`${profile.streakDays} day streak`);
      if (profile.conceptsIntroduced?.length) parts.push(`${profile.conceptsIntroduced.length} concepts`);
      els.learningStats.textContent = parts.join(' · ');
    } else {
      els.learningStats.textContent = 'No sessions yet.';
    }
  }

  function renderTerminalLearning() {
    const profile = state.terminalLearningProfile;
    const TERMINAL_CURRICULUM = [
      { id: 'navigation',       name: 'Navigation (pwd, ls, cd)',             tier: 1 },
      { id: 'file_creation',    name: 'Creating files and directories',       tier: 1 },
      { id: 'file_reading',     name: 'Reading files (cat, head, tail)',      tier: 1 },
      { id: 'paths',            name: 'Relative and absolute paths',          tier: 1 },
      { id: 'help_man',         name: 'Getting help (man, which)',            tier: 1 },
      { id: 'copy_move',        name: 'Copying and moving (cp, mv)',          tier: 2 },
      { id: 'remove_find',      name: 'Removing and finding (rm, find)',      tier: 2 },
      { id: 'grep_search',      name: 'Searching text (grep)',               tier: 2 },
      { id: 'permissions',      name: 'Permissions (chmod, chown)',           tier: 2 },
      { id: 'redirection',      name: 'Redirection and pipes',               tier: 2 },
      { id: 'text_processing',  name: 'Text processing (sort, uniq, wc)',    tier: 3 },
      { id: 'processes',        name: 'Process management (ps, kill)',        tier: 3 },
      { id: 'environment',      name: 'Environment variables',               tier: 3 },
      { id: 'aliases_history',  name: 'Aliases and shell config',            tier: 3 },
      { id: 'package_managers', name: 'Package managers (brew, pip, npm)',    tier: 3 },
      { id: 'git_basics',       name: 'Git basics',                          tier: 4 },
      { id: 'git_branching',    name: 'Git branching and merging',           tier: 4 },
      { id: 'ssh',              name: 'SSH',                                 tier: 4 },
      { id: 'docker_basics',    name: 'Docker basics',                       tier: 4 },
      { id: 'curl_networking',  name: 'curl and networking',                 tier: 4 },
      { id: 'shell_scripting',  name: 'Shell scripting',                     tier: 5 },
      { id: 'git_advanced',     name: 'Advanced git',                        tier: 5 },
      { id: 'docker_compose',   name: 'Docker compose',                      tier: 5 },
      { id: 'sed_awk',          name: 'sed and awk',                         tier: 5 },
      { id: 'system_debug',     name: 'System debugging',                    tier: 5 }
    ];

    const currentIdx = profile ? profile.currentTopicIndex : 0;
    const history = profile ? profile.topicHistory || {} : {};

    els.terminalCurriculum.innerHTML = TERMINAL_CURRICULUM.map((topic, i) => {
      let rowClass, markerClass, markerText;
      if (i < currentIdx) {
        rowClass = 'completed';
        markerClass = 'done';
        markerText = '✓';
      } else if (i === currentIdx) {
        rowClass = 'current';
        markerClass = 'active';
        markerText = '→';
      } else {
        rowClass = 'future';
        markerClass = 'pending';
        markerText = '·';
      }

      const th = history[topic.id];
      const statsText = th ? `${th.passes}/${th.attempts}` : '';

      return `<div class="curriculum-row ${rowClass}">
        <span class="curriculum-marker ${markerClass}">${markerText}</span>
        <span class="curriculum-name">${esc(topic.name)}</span>
        <span class="curriculum-stats">${statsText}</span>
      </div>`;
    }).join('');

    if (profile) {
      const parts = [];
      parts.push(`${profile.totalSessions || 0} sessions`);
      if (profile.streakDays > 1) parts.push(`${profile.streakDays} day streak`);
      if (profile.conceptsIntroduced?.length) parts.push(`${profile.conceptsIntroduced.length} concepts`);
      els.terminalStats.textContent = parts.join(' · ');
    } else {
      els.terminalStats.textContent = 'No sessions yet.';
    }
  }

  // ── Heatmap ────────────────────────────────────────────────────────────

  function renderHeatmap() {
    const canvas = els.heatmapCanvas;
    if (!canvas) return;
    const log = state.dailyChallengeLog || {};

    const cellSize = 13;
    const gap = 3;
    const step = cellSize + gap;
    const weeks = 52;
    const days = 7;
    const padLeft = 30;
    const padTop = 20;

    const width = padLeft + weeks * step + gap;
    const height = padTop + days * step + gap;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Blue color scale
    const colors = ['#161b22', '#0a2e5c', '#1a4a8a', '#2d6abf', '#4a9eff'];
    function getColor(count) {
      if (count === 0) return colors[0];
      if (count <= 1) return colors[1];
      if (count <= 3) return colors[2];
      if (count <= 5) return colors[3];
      return colors[4];
    }

    // Build date grid (52 weeks back from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0=Sun
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * 7 - 1) - dayOfWeek);

    // Day labels
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillStyle = '#666';
    const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
    dayLabels.forEach((label, i) => {
      if (label) ctx.fillText(label, 0, padTop + i * step + cellSize - 2);
    });

    // Month labels
    let lastMonth = -1;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Draw cells
    const cellData = []; // for tooltip hover
    const d = new Date(startDate);
    for (let w = 0; w < weeks; w++) {
      for (let dow = 0; dow < days; dow++) {
        const dateKey = d.toISOString().slice(0, 10);
        const entry = log[dateKey] || {};
        const total = (entry.typing || 0) + (entry.python || 0) + (entry.terminal || 0) + (entry.git || 0);

        const x = padLeft + w * step;
        const y = padTop + dow * step;

        ctx.fillStyle = getColor(total);
        ctx.beginPath();
        ctx.roundRect(x, y, cellSize, cellSize, 2);
        ctx.fill();

        // Month label on first Monday of each month
        if (dow === 0 && d.getMonth() !== lastMonth) {
          lastMonth = d.getMonth();
          ctx.fillStyle = '#666';
          ctx.font = '10px system-ui, sans-serif';
          ctx.fillText(monthNames[d.getMonth()], x, padTop - 6);
        }

        cellData.push({ x, y, dateKey, entry, total, date: new Date(d) });
        d.setDate(d.getDate() + 1);
      }
    }

    // Tooltip on hover
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cell = cellData.find(c => mx >= c.x && mx <= c.x + cellSize && my >= c.y && my <= c.y + cellSize);
      const tooltip = els.heatmapTooltip;
      if (cell && cell.total > 0) {
        const parts = [];
        if (cell.entry.typing) parts.push(`${cell.entry.typing} typing`);
        if (cell.entry.python) parts.push(`${cell.entry.python} python`);
        if (cell.entry.terminal) parts.push(`${cell.entry.terminal} terminal`);
        if (cell.entry.git) parts.push(`${cell.entry.git} git`);
        tooltip.textContent = `${cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${parts.join(', ')}`;
        tooltip.style.left = (e.clientX - rect.left + 10) + 'px';
        tooltip.style.top = (e.clientY - rect.top - 30) + 'px';
        tooltip.classList.remove('hidden');
      } else {
        tooltip.classList.add('hidden');
      }
    };
    canvas.onmouseleave = () => els.heatmapTooltip.classList.add('hidden');
  }

  function renderTimeMetrics() {
    const log = state.dailyChallengeLog || {};
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; // 1=Mon, 7=Sun
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
    weekStart.setHours(0, 0, 0, 0);

    let weekCounts = { typing: 0, python: 0, terminal: 0, git: 0, time: 0 };
    let totalCounts = { typing: 0, python: 0, terminal: 0, git: 0, time: 0 };

    for (const [dateKey, entry] of Object.entries(log)) {
      const d = new Date(dateKey + 'T00:00:00');
      for (const type of ['typing', 'python', 'terminal', 'git']) {
        totalCounts[type] += entry[type] || 0;
        if (d >= weekStart) weekCounts[type] += entry[type] || 0;
      }
      totalCounts.time += entry.totalTime || 0;
      if (d >= weekStart) weekCounts.time += entry.totalTime || 0;
    }

    function fmt(counts) {
      const parts = [];
      if (counts.typing) parts.push(`${counts.typing} typing`);
      if (counts.python) parts.push(`${counts.python} python`);
      if (counts.terminal) parts.push(`${counts.terminal} terminal`);
      if (counts.git) parts.push(`${counts.git} git`);
      const time = counts.time > 0 ? ` · ${Math.floor(counts.time / 60)}m` : '';
      return (parts.join(', ') || 'none') + time;
    }

    if (els.timeWeekDetail) els.timeWeekDetail.textContent = fmt(weekCounts);
    if (els.timeTotalDetail) els.timeTotalDetail.textContent = fmt(totalCounts);
  }

  // ── Settings ──────────────────────────────────────────────────────────

  function renderSettings() {
    const s = state.settings;
    const isProtected = s.settingsProtected !== false;

    if (isProtected && !settingsUnlocked) {
      els.settingsOverlay.classList.add('settings-locked');
      els.settingsLockText.textContent = 'Locked';
      els.unlockSettingsBtn.classList.remove('hidden');
    } else {
      els.settingsOverlay.classList.remove('settings-locked');
      els.settingsLockText.textContent = settingsUnlocked ? 'Unlocked' : '';
      els.unlockSettingsBtn.classList.add('hidden');
    }

    els.settingUnlockDuration.value = s.unlockDurationMinutes || 30;
    els.settingIdleTimeout.value = s.idleTimeoutSeconds || 120;
    els.settingProtected.checked = isProtected;
    els.settingWordCount.value = s.typingWordCount || 25;
    els.settingWpm25.value = s.typingWpm25 || 90;
    els.settingWpm50.value = s.typingWpm50 || 80;
    els.settingTypingAcc.value = s.typingAccuracyThreshold || 95;
    els.settingSettingsWpm.value = s.settingsTypingWpm || 100;
    els.settingApiKey.value = s.anthropicApiKey || '';

    // Difficulty schedule
    const schedule = s.difficultySchedule || {};
    if (els.settingDifficultyWeekday) els.settingDifficultyWeekday.value = schedule.weekdayDefault || 'normal';
    if (els.settingDifficultyWeekend) els.settingDifficultyWeekend.value = schedule.weekendDefault || 'hard';
  }

  function bindEvents() {
    // Add site
    els.addSiteBtn.addEventListener('click', () => {
      if (state.settings.settingsProtected !== false && !settingsUnlocked) {
        promptSettingsUnlock();
        return;
      }
      els.addSiteForm.classList.toggle('hidden');
      if (!els.addSiteForm.classList.contains('hidden')) {
        els.newDomain.focus();
      }
    });

    els.cancelAddBtn.addEventListener('click', () => {
      els.addSiteForm.classList.add('hidden');
      clearAddForm();
    });

    els.confirmAddBtn.addEventListener('click', addSite);
    els.newDomain.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') addSite();
    });

    // Progress view toggle
    els.progressToggle.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        els.progressToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeProgressView = btn.dataset.view;
        renderProgress();
      });
    });

    // Settings unlock
    els.unlockSettingsBtn.addEventListener('click', promptSettingsUnlock);

    // Save settings
    els.saveSettingsBtn.addEventListener('click', saveSettings);

    // Edit modal
    els.editCancelBtn.addEventListener('click', closeEditModal);
    els.editSaveBtn.addEventListener('click', saveEdit);
    els.editRemoveBtn.addEventListener('click', removeSite);

    // Close modal on backdrop click
    els.editModal.addEventListener('click', (e) => {
      if (e.target === els.editModal) closeEditModal();
    });

    // Listen for settings unlock from gate window
    let settingsLockTimeout = null;
    window.addEventListener('message', (e) => {
      // Only accept messages from our own extension origin
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'settingsUnlocked') {
        settingsUnlocked = true;
        render();
        // Auto-lock after 5 minutes (clear previous timer to prevent accumulation)
        if (settingsLockTimeout) clearTimeout(settingsLockTimeout);
        settingsLockTimeout = setTimeout(() => {
          settingsLockTimeout = null;
          settingsUnlocked = false;
          render();
        }, 5 * 60 * 1000);
      }
    });
  }

  async function addSite() {
    const domain = els.newDomain.value.trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '');

    if (!domain || !domain.includes('.')) return;

    const site = {
      domain,
      challengeType: els.newChallengeType.value,
      dailyLimitMinutes: els.newDailyLimit.value ? parseInt(els.newDailyLimit.value) : null,
      unlockDurationMinutes: els.newUnlockDuration.value ? parseInt(els.newUnlockDuration.value) : null,
      enabled: true
    };

    await browser.runtime.sendMessage({ type: 'addSite', site });
    await loadState();
    render();
    els.addSiteForm.classList.add('hidden');
    clearAddForm();
  }

  function clearAddForm() {
    els.newDomain.value = '';
    els.newChallengeType.value = 'typing';
    els.newDailyLimit.value = '';
    els.newUnlockDuration.value = '';
  }

  async function lockNow(domain) {
    await browser.runtime.sendMessage({ type: 'lockNow', domain });
    await loadState();
    render();
  }

  function openEditModal(domain) {
    if (state.settings.settingsProtected !== false && !settingsUnlocked) {
      promptSettingsUnlock();
      return;
    }

    editingDomain = domain;
    const site = state.blockedSites.find(s => s.domain === domain);
    if (!site) return;

    els.editModalTitle.textContent = domain;
    els.editChallengeType.value = site.challengeType || 'typing';
    els.editDailyLimit.value = site.dailyLimitMinutes || '';
    els.editUnlockDuration.value = site.unlockDurationMinutes || '';
    els.editEnabled.checked = site.enabled !== false;
    els.editModal.classList.remove('hidden');
  }

  function closeEditModal() {
    els.editModal.classList.add('hidden');
    editingDomain = null;
  }

  async function saveEdit() {
    if (!editingDomain) return;
    await browser.runtime.sendMessage({
      type: 'updateSite',
      domain: editingDomain,
      updates: {
        challengeType: els.editChallengeType.value,
        dailyLimitMinutes: els.editDailyLimit.value ? parseInt(els.editDailyLimit.value) : null,
        unlockDurationMinutes: els.editUnlockDuration.value ? parseInt(els.editUnlockDuration.value) : null,
        enabled: els.editEnabled.checked
      }
    });
    closeEditModal();
    await loadState();
    render();
  }

  async function removeSite() {
    if (!editingDomain) return;
    await browser.runtime.sendMessage({ type: 'removeSite', domain: editingDomain });
    closeEditModal();
    await loadState();
    render();
  }

  async function saveSettings() {
    const s = {
      unlockDurationMinutes: parseInt(els.settingUnlockDuration.value) || 30,
      idleTimeoutSeconds: parseInt(els.settingIdleTimeout.value) || 120,
      settingsProtected: els.settingProtected.checked,
      typingWordCount: parseInt(els.settingWordCount.value) || 25,
      typingWpm25: parseInt(els.settingWpm25.value) || 90,
      typingWpm50: parseInt(els.settingWpm50.value) || 80,
      typingAccuracyThreshold: parseInt(els.settingTypingAcc.value) || 95,
      settingsTypingWpm: parseInt(els.settingSettingsWpm.value) || 100,
      anthropicApiKey: els.settingApiKey.value.trim(),
      difficultySchedule: {
        weekdayDefault: els.settingDifficultyWeekday ? els.settingDifficultyWeekday.value : 'normal',
        weekendDefault: els.settingDifficultyWeekend ? els.settingDifficultyWeekend.value : 'hard',
        timeRanges: (state.settings.difficultySchedule || {}).timeRanges || []
      }
    };
    await browser.runtime.sendMessage({ type: 'updateSettings', settings: s });
    await loadState();
    render();
  }

  function promptSettingsUnlock() {
    // Open the gate page in settings-gate mode
    const url = browser.runtime.getURL('gate/gate.html')
      + '?settingsGate=1&challenge=typing&domain=settings';
    window.open(url, 'settingsGate', 'width=800,height=600');
  }

  function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function esc(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  init();
})();
