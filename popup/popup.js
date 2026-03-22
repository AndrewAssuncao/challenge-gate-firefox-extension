/* Popup Controller */

'use strict';

(async () => {
  const sitesEl = document.getElementById('popup-sites');
  const emptyEl = document.getElementById('popup-empty');
  const statsEl = document.getElementById('popup-stats');
  const dashBtn = document.getElementById('open-dashboard');

  dashBtn.addEventListener('click', () => {
    browser.tabs.create({ url: browser.runtime.getURL('dashboard/dashboard.html') });
    window.close();
  });

  const state = await browser.runtime.sendMessage({ type: 'getState' });
  const sites = state.blockedSites || [];

  if (sites.length === 0) {
    emptyEl.classList.remove('hidden');
    statsEl.textContent = 'Open dashboard to add sites.';
    return;
  }

  sites.forEach(site => {
    const unlock = state.unlocks[site.domain];
    const isUnlocked = unlock && unlock.expiresAt > Date.now();
    const usedSec = state.timeToday[site.domain] || 0;
    const usedMin = Math.round(usedSec / 60);
    const capMin = site.dailyLimitMinutes;
    const capExceeded = capMin && usedSec >= capMin * 60;

    let statusClass, statusText;
    if (!site.enabled) {
      statusClass = 'ps-disabled';
      statusText = 'Off';
    } else if (capExceeded) {
      statusClass = 'ps-capped';
      statusText = 'Cap';
    } else if (isUnlocked) {
      statusClass = 'ps-unlocked';
      statusText = formatExpiry(unlock.expiresAt);
    } else {
      statusClass = 'ps-locked';
      statusText = 'Locked';
    }

    const row = document.createElement('div');
    row.className = 'popup-site';

    const domainSpan = document.createElement('span');
    domainSpan.className = 'popup-site-domain';
    domainSpan.textContent = site.domain;

    const statusSpan = document.createElement('span');
    statusSpan.className = `popup-site-status ${statusClass}`;
    statusSpan.textContent = statusText;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'popup-site-time';
    timeSpan.textContent = capMin ? `${usedMin}/${capMin}m` : `${usedMin}m`;

    row.appendChild(domainSpan);
    row.appendChild(statusSpan);
    row.appendChild(timeSpan);

    if (isUnlocked) {
      const lockBtn = document.createElement('button');
      lockBtn.className = 'popup-site-lock';
      lockBtn.textContent = 'Lock';
      lockBtn.addEventListener('click', async () => {
        await browser.runtime.sendMessage({ type: 'lockNow', domain: site.domain });
        window.close();
      });
      row.appendChild(lockBtn);
    }

    sitesEl.appendChild(row);
  });

  // Stats
  const totalUsed = Object.values(state.timeToday).reduce((a, b) => a + b, 0);
  const totalMin = Math.round(totalUsed / 60);
  const p = state.progression;
  statsEl.textContent = `${totalMin}m today · ${p.totalChallengesCompleted || 0} challenges`;

  function formatExpiry(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
})();
