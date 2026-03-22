/* Python Challenge Engine — Claude-powered mentor flow.
   Shows teaching notes, provides after-solve feedback,
   tracks learning progress, falls back to typing on total failure. */

'use strict';

const PythonChallenge = (() => {
  let config = {};
  let challenge = null;
  let challengeSource = 'local';
  let hintsUsed = 0;
  let worker = null;
  let pyodideReady = false;
  let profile = null;

  const promptEl = document.getElementById('python-prompt');
  const editorEl = document.getElementById('python-editor');
  const highlightEl = document.getElementById('python-highlight');
  const lineNumEl = document.getElementById('python-line-numbers');
  const outputEl = document.getElementById('python-output');
  const resultsEl = document.getElementById('python-test-results');
  const runBtn = document.getElementById('python-run');
  const hintBtn = document.getElementById('python-hint');
  const tierEl = document.getElementById('python-tier');
  const progressEl = document.getElementById('python-progress');
  const loadingEl = document.getElementById('python-loading');
  const skipBtn = document.getElementById('python-skip');
  const helpBtn = document.getElementById('python-help');
  let lastErrorOutput = '';

  async function init(cfg) {
    config = cfg;
    hintsUsed = 0;
    lastErrorOutput = '';
    outputEl.classList.add('hidden');
    hintBtn.disabled = false;
    helpBtn.disabled = false;
    helpBtn.textContent = 'Help';

    // Load learning profile
    profile = await browser.runtime.sendMessage({ type: 'getLearningProfile' });
    if (!profile) {
      profile = ChallengeProvider.defaultProfile();
    }

    // Show current position
    const curriculum = ChallengeProvider.CURRICULUM;
    const currentTopic = curriculum[profile.currentTopicIndex] || curriculum[0];
    tierEl.textContent = `Tier ${currentTopic.tier}`;
    progressEl.textContent = currentTopic.name;

    // Show loading state
    promptEl.innerHTML = '<span style="color: var(--text-dim)">Generating challenge…</span>';
    editorEl.value = '';
    updateHighlight();
    updateLineNumbers();

    // Get challenge from mentor
    const result = await ChallengeProvider.getChallenge(profile, config.isSettingsGate);
    challenge = result.challenge;
    challengeSource = result.source;

    if (!challenge) {
      // Total failure — fall back to typing
      promptEl.innerHTML = '<span style="color: var(--text-dim)">Could not load a challenge. Switching to typing.</span>';
      setTimeout(() => {
        // Switch to typing via the toggle
        const typingBtn = document.querySelector('.toggle-btn[data-challenge="typing"]');
        if (typingBtn) typingBtn.click();
      }, 1500);
      return;
    }

    renderChallenge();
    bindEvents();
    initPyodide();
  }

  function renderChallenge() {
    let html = '';

    // Teaching note (when Claude introduces a new concept)
    if (challenge.teachingNote) {
      html += `<div class="teaching-note">${escapeHtml(challenge.teachingNote)}</div>`;
    }

    // Problem prompt
    html += `<div class="problem-text">${escapeHtml(challenge.prompt).replace(/`([^`]+)`/g, '<code>$1</code>')}</div>`;

    // Source indicator
    if (challengeSource === 'claude') {
      const concept = challenge.conceptIntroduced;
      if (concept) {
        html += `<div class="concept-tag">New concept: ${escapeHtml(concept)}</div>`;
      }
    } else {
      html += `<div class="concept-tag">Offline mode — local challenge</div>`;
    }

    promptEl.innerHTML = html;
    editorEl.value = challenge.starterCode || '';
    updateHighlight();
    updateLineNumbers();
    editorEl.focus();
  }

  function bindEvents() {
    runBtn.onclick = runCode;
    hintBtn.onclick = showHint;
    helpBtn.onclick = askForHelp;
    skipBtn.onclick = skipChallenge;

    editorEl.oninput = () => {
      updateHighlight();
      updateLineNumbers();
    };

    editorEl.onscroll = () => {
      highlightEl.scrollTop = editorEl.scrollTop;
      highlightEl.scrollLeft = editorEl.scrollLeft;
      lineNumEl.scrollTop = editorEl.scrollTop;
    };

    editorEl.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editorEl.selectionStart;
        const end = editorEl.selectionEnd;
        editorEl.value = editorEl.value.substring(0, start) + '    ' + editorEl.value.substring(end);
        editorEl.selectionStart = editorEl.selectionEnd = start + 4;
        updateHighlight();
        updateLineNumbers();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
    };
  }

  // ── Syntax highlighting (token-based) ───────────────────────────────────

  const PY_KEYWORDS = new Set(['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while',
    'in', 'not', 'and', 'or', 'is', 'import', 'from', 'as', 'try', 'except',
    'finally', 'raise', 'with', 'yield', 'lambda', 'pass', 'break', 'continue',
    'global', 'nonlocal', 'assert', 'del', 'async', 'await']);

  const PY_BUILTINS = new Set(['print', 'len', 'range', 'int', 'str', 'float', 'list', 'dict',
    'set', 'tuple', 'sorted', 'reversed', 'enumerate', 'zip', 'map', 'filter',
    'sum', 'min', 'max', 'abs', 'round', 'type', 'isinstance', 'input', 'open',
    'any', 'all', 'iter', 'next', 'super', 'property', 'staticmethod', 'classmethod',
    'hasattr', 'getattr', 'setattr', 'ValueError', 'TypeError', 'KeyError',
    'IndexError', 'Exception', 'bool', 'bytes', 'object', 'repr']);

  function highlightPython(code) {
    const tokens = tokenize(code);
    return tokens.map(t => {
      const text = escapeHtml(t.value);
      if (t.type === 'plain') return text;
      return `<span class="${t.type}">${text}</span>`;
    }).join('');
  }

  function tokenize(code) {
    const tokens = [];
    let i = 0;
    let prevWord = '';

    while (i < code.length) {
      if (code[i] === '#') {
        const end = code.indexOf('\n', i);
        const slice = end === -1 ? code.slice(i) : code.slice(i, end);
        tokens.push({ type: 'py-comment', value: slice });
        i += slice.length;
        continue;
      }

      if (code.slice(i, i + 3) === '"""' || code.slice(i, i + 3) === "'''") {
        const q = code.slice(i, i + 3);
        const end = code.indexOf(q, i + 3);
        const slice = end === -1 ? code.slice(i) : code.slice(i, end + 3);
        tokens.push({ type: 'py-string', value: slice });
        i += slice.length;
        continue;
      }

      if (code[i] === '"' || code[i] === "'") {
        const q = code[i];
        let j = i + 1;
        while (j < code.length && code[j] !== q && code[j] !== '\n') {
          if (code[j] === '\\') j++;
          j++;
        }
        tokens.push({ type: 'py-string', value: code.slice(i, j + 1) });
        i = j + 1;
        continue;
      }

      if (code[i] === '@' && (i === 0 || code[i - 1] === '\n' || code[i - 1] === ' ')) {
        let j = i + 1;
        while (j < code.length && /\w/.test(code[j])) j++;
        tokens.push({ type: 'py-decorator', value: code.slice(i, j) });
        i = j;
        continue;
      }

      if (/\d/.test(code[i]) && (i === 0 || !/\w/.test(code[i - 1]))) {
        let j = i;
        while (j < code.length && /[\d.xXoObB_a-fA-F]/.test(code[j])) j++;
        tokens.push({ type: 'py-number', value: code.slice(i, j) });
        i = j;
        continue;
      }

      if (/[a-zA-Z_]/.test(code[i])) {
        let j = i;
        while (j < code.length && /\w/.test(code[j])) j++;
        const word = code.slice(i, j);
        let type = 'plain';
        if (PY_KEYWORDS.has(word)) type = 'py-keyword';
        else if (word === 'True' || word === 'False') type = 'py-bool';
        else if (word === 'None') type = 'py-none';
        else if (word === 'self') type = 'py-self';
        else if (PY_BUILTINS.has(word)) type = 'py-builtin';
        else if (prevWord === 'def') type = 'py-function';
        tokens.push({ type, value: word });
        prevWord = word;
        i = j;
        continue;
      }

      if ('+-*/%=<>!&|^~:'.includes(code[i])) {
        tokens.push({ type: 'py-operator', value: code[i] });
        i++;
        continue;
      }

      tokens.push({ type: 'plain', value: code[i] });
      if (!/\s/.test(code[i])) prevWord = '';
      i++;
    }
    return tokens;
  }

  function updateHighlight() {
    highlightEl.innerHTML = highlightPython(editorEl.value) + '\n';
  }

  function updateLineNumbers() {
    const lines = editorEl.value.split('\n').length;
    lineNumEl.innerHTML = Array.from({ length: lines }, (_, i) =>
      `<span>${i + 1}</span>`
    ).join('');
  }

  // ── Pyodide ─────────────────────────────────────────────────────────────

  function initPyodide() {
    if (worker) return;
    loadingEl.classList.remove('hidden');

    worker = new Worker(browser.runtime.getURL('gate/pyodide-worker.js'));
    worker.onmessage = (e) => {
      if (e.data.type === 'ready') {
        pyodideReady = true;
        loadingEl.classList.add('hidden');
      } else if (e.data.type === 'result') {
        handleResult(e.data);
      }
    };
    worker.onerror = (err) => {
      console.error('[Challenge Gate] Pyodide worker error:', err);
      loadingEl.classList.add('hidden');
    };
  }

  async function runCode() {
    if (!pyodideReady || !challenge) return;

    runBtn.disabled = true;
    runBtn.textContent = 'Running…';
    outputEl.classList.add('hidden');

    worker.postMessage({
      type: 'run',
      code: editorEl.value,
      testCases: challenge.testCases,
      functionName: challenge.functionName
    });
  }

  function handleResult(data) {
    runBtn.disabled = false;
    runBtn.textContent = 'Run';
    outputEl.classList.remove('hidden');

    if (data.error) {
      lastErrorOutput = data.error;
      resultsEl.innerHTML = `<div class="test-case fail">
        <div class="test-label">Error</div>
        <div class="test-error">${escapeHtml(data.error)}</div>
      </div>`;
      return;
    }

    const results = data.results || [];
    const allPassed = results.length > 0 && results.every(r => r.passed);

    let html = results.map((r, i) => {
      const cls = r.passed ? 'pass' : 'fail';
      const label = r.passed ? '✓' : '✗';
      let detail = r.passed
        ? `<span class="expected">${label} Test ${i + 1} passed</span>`
        : `<span class="actual">${label} Test ${i + 1}: expected ${escapeHtml(String(r.expected))}, got ${escapeHtml(String(r.actual))}</span>`;
      let errorHtml = r.error ? `<div class="test-error">${escapeHtml(r.error)}</div>` : '';
      return `<div class="test-case ${cls}"><div class="test-detail">${detail}</div>${errorHtml}</div>`;
    }).join('');

    if (allPassed) {
      lastErrorOutput = '';
      html += `<div class="test-summary all-pass">All tests passed.</div>`;
      // Show after-solve feedback from mentor
      if (challenge.afterSolve) {
        html += `<div class="after-solve">${escapeHtml(challenge.afterSolve)}</div>`;
      }
      onPassed();
    } else {
      // Capture failure details for help button
      lastErrorOutput = results
        .filter(r => !r.passed)
        .map((r, i) => {
          let msg = `Test: expected ${r.expected}, got ${r.actual}`;
          if (r.error) msg += ` (${r.error})`;
          return msg;
        }).join('\n');
      const passCount = results.filter(r => r.passed).length;
      html += `<div class="test-summary some-fail">${passCount}/${results.length} tests passed.</div>`;
      onFailed();
    }

    resultsEl.innerHTML = html;
  }

  async function onPassed() {
    // Update learning profile
    profile = ChallengeProvider.updateProfileAfterChallenge(profile, challenge, true, challengeSource);
    await browser.runtime.sendMessage({ type: 'saveLearningProfile', profile });

    // Also update progression
    const state = await browser.runtime.sendMessage({ type: 'getState' });
    const prog = state.progression || {};
    if (!prog.pythonCompleted) prog.pythonCompleted = [];
    if (challenge.id && !prog.pythonCompleted.includes(challenge.id)) {
      prog.pythonCompleted.push(challenge.id);
    }
    prog.totalChallengesCompleted = (prog.totalChallengesCompleted || 0) + 1;
    prog.pythonTier = (ChallengeProvider.CURRICULUM[profile.currentTopicIndex] || {}).tier || 1;

    await browser.runtime.sendMessage({ type: 'updateProgression', progression: prog });

    setTimeout(() => Gate.onChallengeComplete(), 1500);
  }

  async function onFailed() {
    // Record failure in learning profile (no gate unlock)
    profile = ChallengeProvider.updateProfileAfterChallenge(profile, challenge, false, challengeSource);
    await browser.runtime.sendMessage({ type: 'saveLearningProfile', profile });
  }

  function showHint() {
    if (!challenge || !challenge.hints || hintsUsed >= challenge.hints.length) return;
    const hint = challenge.hints[hintsUsed];
    hintsUsed++;

    const existing = outputEl.querySelector('.python-hint');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.className = 'python-hint';
    div.textContent = `Hint ${hintsUsed}: ${hint}`;
    outputEl.classList.remove('hidden');
    outputEl.appendChild(div);

    if (hintsUsed >= challenge.hints.length) {
      hintBtn.disabled = true;
    }
  }

  async function askForHelp() {
    if (!challenge) return;

    helpBtn.disabled = true;
    helpBtn.textContent = 'Thinking…';

    const userCode = editorEl.value;
    const prompt = `You are a concise Python tutor. The student is working on this problem:

Problem: ${challenge.prompt}
Function signature: ${challenge.starterCode}

Their current code:
\`\`\`python
${userCode}
\`\`\`

${lastErrorOutput ? `Their code produced these errors/failures:\n${lastErrorOutput}` : 'They have not run the code yet, or it produced no output.'}

Give a SHORT, targeted hint (2-4 sentences max). Don't give the solution. Point them toward the right approach or identify the specific mistake in their logic. Be direct and dry — no encouragement, no fluff.`;

    try {
      const response = await browser.runtime.sendMessage({
        type: 'claudeGenerate',
        prompt
      });

      const helpText = response.content || response.error || 'Could not get help right now.';

      // Show help in output area
      const existing = outputEl.querySelector('.python-help');
      if (existing) existing.remove();

      const div = document.createElement('div');
      div.className = 'python-help';
      div.textContent = helpText;
      outputEl.classList.remove('hidden');
      outputEl.appendChild(div);
    } catch (err) {
      console.error('[Challenge Gate] Help request failed:', err);
    }

    helpBtn.disabled = false;
    helpBtn.textContent = 'Help';
  }

  async function skipChallenge() {
    // Record a skip (counts as a fail for progression)
    if (challenge) {
      profile = ChallengeProvider.updateProfileAfterChallenge(profile, challenge, false, challengeSource);
      await browser.runtime.sendMessage({ type: 'saveLearningProfile', profile });
    }
    // Re-init to get a new challenge
    init(config);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init };
})();
