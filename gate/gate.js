/* Challenge Gate — Gate Page Controller */

'use strict';

const Gate = (() => {
  const params = new URLSearchParams(window.location.search);
  const domain = params.get('domain') || '';
  const originalUrl = params.get('url') || '';
  const challengeType = params.get('challenge') || 'typing';
  const reason = params.get('reason') || '';
  const isSettingsGate = params.get('settingsGate') === '1';
  let activeChallenge = null;
  let continueListenerActive = false;

  function init() {
    document.getElementById('gate-domain').textContent = domain;

    if (reason === 'cap') {
      showCapExceeded();
      return;
    }

    if (isSettingsGate) {
      document.getElementById('gate-subtitle').textContent =
        'Complete a harder challenge to modify settings.';
    }

    // Always show the toggle so user can switch between typing and python
    const toggle = document.getElementById('challenge-toggle');
    toggle.classList.remove('hidden');
    const btns = toggle.querySelectorAll('.toggle-btn');
    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        hideContinuePrompt();
        showChallenge(btn.dataset.challenge);
      });
    });

    // Set initial active based on site's challenge type
    const initial = ['python', 'terminal', 'git'].includes(challengeType) ? challengeType : 'typing';
    btns.forEach(b => b.classList.toggle('active', b.dataset.challenge === initial));
    showChallenge(initial);
  }

  function showCapExceeded() {
    document.getElementById('gate-subtitle').classList.add('hidden');
    document.getElementById('challenge-toggle').classList.add('hidden');
    document.getElementById('cap-exceeded').classList.remove('hidden');
    browser.runtime.sendMessage({ type: 'getState' }).then(state => {
      const site = state.blockedSites.find(s => s.domain === domain);
      if (site && site.dailyLimitMinutes) {
        const used = state.timeToday[domain] || 0;
        const usedMin = Math.round(used / 60);
        document.getElementById('cap-detail').textContent =
          `${usedMin} of ${site.dailyLimitMinutes} minutes used today.`;
      }
    });
  }

  function showChallenge(type) {
    document.getElementById('typing-challenge').classList.add('hidden');
    document.getElementById('python-challenge').classList.add('hidden');
    document.getElementById('terminal-challenge').classList.add('hidden');
    const gitPanel = document.getElementById('git-challenge');
    if (gitPanel) gitPanel.classList.add('hidden');
    activeChallenge = type;

    if (type === 'typing') {
      document.getElementById('typing-challenge').classList.remove('hidden');
      if (typeof TypingChallenge !== 'undefined') TypingChallenge.init(getConfig());
    } else if (type === 'python') {
      document.getElementById('python-challenge').classList.remove('hidden');
      if (typeof PythonChallenge !== 'undefined') PythonChallenge.init(getConfig());
    } else if (type === 'terminal') {
      document.getElementById('terminal-challenge').classList.remove('hidden');
      if (typeof TerminalChallenge !== 'undefined') TerminalChallenge.init(getConfig());
    } else if (type === 'git') {
      const gp = document.getElementById('git-challenge');
      if (gp) gp.classList.remove('hidden');
      if (typeof GitChallenge !== 'undefined') GitChallenge.init(getConfig());
    }
  }

  function getConfig() {
    return { domain, originalUrl, isSettingsGate };
  }

  // ── Continue prompt (post-solve) ──────────────────────────────────────

  function showContinuePrompt() {
    const el = document.getElementById('gate-continue');
    if (!el) return;

    // Settings gate skips the continue prompt — just unlock immediately
    if (isSettingsGate) {
      onChallengeComplete();
      return;
    }

    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const modKey = isMac ? '⌘' : 'Ctrl';

    el.innerHTML = `<span class="continue-keys"><kbd>Enter</kbd> continue to <span class="continue-domain">${domain}</span></span><span class="continue-sep">·</span><span class="continue-keys"><kbd>${modKey}</kbd> + <kbd>Enter</kbd> next challenge</span>`;
    el.classList.remove('hidden');

    // Unlock the domain immediately (so timer starts), but don't navigate
    browser.runtime.sendMessage({ type: 'unlock', domain }).catch(() => {});

    if (!continueListenerActive) {
      continueListenerActive = true;
      document.addEventListener('keydown', handleContinueKey);
    }
  }

  function hideContinuePrompt() {
    const el = document.getElementById('gate-continue');
    if (el) {
      el.classList.add('hidden');
      el.innerHTML = '';
    }
    if (continueListenerActive) {
      continueListenerActive = false;
      document.removeEventListener('keydown', handleContinueKey);
    }
  }

  function handleContinueKey(e) {
    if (e.key !== 'Enter') return;

    e.preventDefault();
    e.stopPropagation();

    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl + Enter → new challenge of the same type
      hideContinuePrompt();
      showChallenge(activeChallenge);
    } else {
      // Enter → navigate to the page
      hideContinuePrompt();
      if (originalUrl) {
        window.location.href = originalUrl;
      }
    }
  }

  // ── Legacy direct-complete (for settings gate and bypasses) ───────────

  async function onChallengeComplete() {
    if (isSettingsGate) {
      window.opener?.postMessage({ type: 'settingsUnlocked' }, window.opener.origin || '*');
      window.close();
      return;
    }

    const result = await browser.runtime.sendMessage({
      type: 'unlock',
      domain: domain
    });

    if (result.success && originalUrl) {
      window.location.href = originalUrl;
    }
  }

  init();

  return { onChallengeComplete, showContinuePrompt, hideContinuePrompt, domain, isSettingsGate };
})();
