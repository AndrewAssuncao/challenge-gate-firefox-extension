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
  let challengeResolved = false;
  let lastRunDiagnostics = null;
  let challengeStartTime = 0;
  let failedBeforePass = 0;
  let helpUsedThisChallenge = false;

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
  let fallbackTimeout = null;

  function destroyWorker() {
    if (worker) {
      worker.terminate();
      worker = null;
      pyodideReady = false;
    }
  }

  async function init(cfg) {
    // Clear any pending fallback timeout from a previous init
    if (fallbackTimeout) {
      clearTimeout(fallbackTimeout);
      fallbackTimeout = null;
    }
    config = cfg;
    hintsUsed = 0;
    lastErrorOutput = '';
    lastRunDiagnostics = null;
    challengeResolved = false;
    challengeStartTime = Date.now();
    failedBeforePass = 0;
    helpUsedThisChallenge = false;
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
      fallbackTimeout = setTimeout(() => {
        fallbackTimeout = null;
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
    const isCodeReview = challenge.type === 'code_review';

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

    // Code review mode: show code to review + text area
    const reviewCodeEl = document.getElementById('python-review-code');
    if (isCodeReview && reviewCodeEl) {
      reviewCodeEl.classList.remove('hidden');
      reviewCodeEl.innerHTML = `<div class="review-code-header">Code to review:</div><pre class="review-code-block">${escapeHtml(challenge.codeToReview || '')}</pre>`;
      editorEl.value = '';
      editorEl.placeholder = 'Type your analysis here. What issues do you see? How would you fix them?';
      editorEl.style.minHeight = '120px';
      runBtn.textContent = 'Submit';
    } else {
      if (reviewCodeEl) reviewCodeEl.classList.add('hidden');
      editorEl.placeholder = '';
      editorEl.style.minHeight = '';
      runBtn.textContent = 'Run';
      editorEl.value = challenge.starterCode || '';
    }

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
      // Clean up the broken worker so a retry can create a fresh one
      destroyWorker();
    };
  }

  async function runCode() {
    if (challengeResolved) return;

    // Code review mode: send text to Claude for validation
    if (challenge.type === 'code_review') {
      await submitCodeReview();
      return;
    }

    if (!pyodideReady || !challenge) return;

    runBtn.disabled = true;
    runBtn.textContent = 'Running…';
    outputEl.classList.add('hidden');
    lastRunDiagnostics = null;

    worker.postMessage({
      type: 'run',
      code: editorEl.value,
      testCases: challenge.testCases,
      functionName: challenge.functionName
    });
  }

  async function submitCodeReview() {
    const userAnswer = editorEl.value.trim();
    if (!userAnswer) return;

    runBtn.disabled = true;
    runBtn.textContent = 'Evaluating…';
    outputEl.classList.remove('hidden');
    resultsEl.innerHTML = '<div class="test-summary">Evaluating your answer...</div>';

    try {
      const validationPrompt = `You are evaluating a code review response. The student was shown this code:

\`\`\`python
${challenge.codeToReview}
\`\`\`

They were asked: "${challenge.prompt}"

Validation criteria: ${challenge.validationCriteria}

The student's answer:
"${userAnswer}"

Evaluate their response. Did they identify the key issues? Is their analysis correct?

Respond with ONLY valid JSON:
{
  "correct": true/false,
  "score": 0-100,
  "feedback": "Specific feedback on what they got right/wrong. 2-3 sentences max.",
  "missingPoints": ["any key points they missed"]
}`;

      const response = await browser.runtime.sendMessage({
        type: 'claudeGenerate',
        prompt: validationPrompt,
        model: 'claude-opus-4-20250514',
        maxTokens: 1024
      });

      runBtn.disabled = false;
      runBtn.textContent = 'Submit';

      if (response.error) {
        resultsEl.innerHTML = '<div class="test-summary some-fail">Could not validate (no API key). Try again.</div>';
        return;
      }

      const cleaned = (response.content || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      let result;
      try {
        result = JSON.parse(cleaned);
      } catch {
        result = { correct: false, feedback: response.content || 'Could not parse response.', score: 0 };
      }

      let html = '';
      if (result.correct || result.score >= 70) {
        html += `<div class="test-summary all-pass">Good analysis! (${result.score || 100}%)</div>`;
        html += `<div class="test-detail">${escapeHtml(result.feedback || '')}</div>`;
        if (challenge.afterSolve) {
          html += `<div class="after-solve">${escapeHtml(challenge.afterSolve)}</div>`;
        }
        resultsEl.innerHTML = html;
        onPassed();
      } else {
        html += `<div class="test-summary some-fail">Not quite. (${result.score || 0}%)</div>`;
        html += `<div class="test-detail">${escapeHtml(result.feedback || '')}</div>`;
        if (result.missingPoints && result.missingPoints.length > 0) {
          html += `<div class="test-detail" style="margin-top: 6px;">Missing: ${result.missingPoints.map(p => escapeHtml(p)).join(', ')}</div>`;
        }
        resultsEl.innerHTML = html;
        failedBeforePass++;
      }
    } catch (err) {
      runBtn.disabled = false;
      runBtn.textContent = 'Submit';
      resultsEl.innerHTML = `<div class="test-summary some-fail">Evaluation error: ${escapeHtml(err.message)}</div>`;
    }
  }

  function handleResult(data) {
    if (challengeResolved) return;

    runBtn.disabled = false;
    runBtn.textContent = 'Run';
    outputEl.classList.remove('hidden');
    lastRunDiagnostics = data.diagnostics || null;

    if (data.error) {
      lastErrorOutput = data.error;
      resultsEl.innerHTML = `<div class="test-case fail">
        <div class="test-label">Error</div>
        <div class="test-error">${escapeHtml(data.error)}</div>
      </div>`;
      return;
    }

    if (lastRunDiagnostics?.unrecoverableChallengeIssue) {
      const issueText = buildChallengeIssueText(lastRunDiagnostics);
      void bypassChallengeForIssue(issueText);
      return;
    }

    const results = data.results || [];
    const allPassed = results.length > 0 && results.every(r => r.passed);
    const repairNoticeHtml = buildRepairNoticeHtml(lastRunDiagnostics);
    const repairNoticeText = buildRepairNoticeText(lastRunDiagnostics);

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
      html += repairNoticeHtml;
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
      if (repairNoticeText) {
        lastErrorOutput = `${lastErrorOutput}\n${repairNoticeText}`.trim();
      }
      const passCount = results.filter(r => r.passed).length;
      html += `<div class="test-summary some-fail">${passCount}/${results.length} tests passed.</div>`;
      html += repairNoticeHtml;
      onFailed();
    }

    resultsEl.innerHTML = html;
  }

  async function onPassed() {
    if (challengeResolved) return;
    challengeResolved = true;

    // Update learning profile (with spaced repetition context)
    const struggled = failedBeforePass > 0;
    profile = ChallengeProvider.updateProfileAfterChallenge(profile, challenge, true, challengeSource, struggled, helpUsedThisChallenge);
    await browser.runtime.sendMessage({ type: 'saveLearningProfile', profile });

    // Log to daily challenge log
    const solveTime = Math.round((Date.now() - challengeStartTime) / 1000);
    browser.runtime.sendMessage({ type: 'logChallengeCompletion', challengeType: 'python', solveTime }).catch(() => {});

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

    Gate.showContinuePrompt();
  }

  async function onFailed() {
    if (challengeResolved) return;
    failedBeforePass++;

    // Record failure in learning profile (no gate unlock)
    profile = ChallengeProvider.updateProfileAfterChallenge(profile, challenge, false, challengeSource, false, helpUsedThisChallenge);
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
    if (!challenge || challengeResolved) return;
    helpUsedThisChallenge = true;

    helpBtn.disabled = true;
    helpBtn.textContent = 'Thinking…';

    const userCode = editorEl.value;
    const prompt = `You are reviewing a Python challenge in a browser extension.
Decide whether the problem is in the student's code or in the challenge itself.
Return ONLY valid JSON:
{
  "kind": "student_issue" | "challenge_issue",
  "message": "2-4 sentence response",
  "suggestedAction": "none" | "bypass"
}

Use "challenge_issue" only if the prompt/tests are flawed or the test harness is calling the function incorrectly.
If it is a challenge issue, say that plainly and do not blame the student's logic.
Do not provide the full solution.

The student is working on this problem:

Problem: ${challenge.prompt}
Function signature: ${challenge.starterCode}
Test cases:
${formatTestCasesForHelp()}

Their current code:
\`\`\`python
${userCode}
\`\`\`

${lastErrorOutput ? `Their latest run produced these errors/failures:\n${lastErrorOutput}` : 'They have not run the code yet, or it produced no output.'}

Runtime diagnostics:
${formatDiagnosticsForHelp(lastRunDiagnostics)}
`;

    try {
      const response = await browser.runtime.sendMessage({
        type: 'claudeGenerate',
        prompt
      });

      const parsed = parseHelpResponse(response.content || '');
      const helpText = parsed?.message || response.content || response.error || 'Could not get help right now.';

      // Show help in output area
      const existing = outputEl.querySelector('.python-help');
      if (existing) existing.remove();

      const div = document.createElement('div');
      div.className = 'python-help';
      div.textContent = helpText;
      outputEl.classList.remove('hidden');
      outputEl.appendChild(div);

      if (parsed?.kind === 'challenge_issue') {
        await bypassChallengeForIssue(parsed.message);
      }
    } catch (err) {
      console.error('[Challenge Gate] Help request failed:', err);
    }

    if (!challengeResolved) {
      helpBtn.disabled = false;
      helpBtn.textContent = 'Help';
    }
  }

  async function skipChallenge() {
    if (challengeResolved) return;

    // Record a skip (counts as a fail for progression)
    if (challenge) {
      profile = ChallengeProvider.updateProfileAfterChallenge(profile, challenge, false, challengeSource);
      await browser.runtime.sendMessage({ type: 'saveLearningProfile', profile });
    }
    // Re-init to get a new challenge
    init(config);
  }

  function buildRepairNoticeText(diagnostics) {
    const repairedTests = diagnostics?.repairedTests || [];
    if (!repairedTests.length) return '';

    const lines = repairedTests.map(test => {
      const normalized = test.normalizedInput ? ` -> ${test.normalizedInput}` : '';
      return `Adjusted malformed test input ${test.input}${normalized}`;
    });

    return `Repaired test harness:\n${lines.join('\n')}`;
  }

  function buildRepairNoticeHtml(diagnostics) {
    const text = buildRepairNoticeText(diagnostics);
    if (!text) return '';
    return `<div class="python-help">${escapeHtml(text)}</div>`;
  }

  function buildChallengeIssueText(diagnostics) {
    const issueLines = (diagnostics?.unrecoverableTests || []).map(test => {
      return `Broken test input ${test.input}: ${test.error}`;
    });

    const detail = issueLines.length
      ? issueLines.join('\n')
      : 'The challenge test harness could not run safely.';

    return `${detail}\nChallenge issue detected. Access granted. This one will not count against your progress.`;
  }

  function formatTestCasesForHelp() {
    if (!challenge?.testCases?.length) return '(No test cases available)';
    return challenge.testCases
      .map((tc, i) => `Test ${i + 1}: input=${tc.input} expected=${tc.expected}`)
      .join('\n');
  }

  function formatDiagnosticsForHelp(diagnostics) {
    if (!diagnostics) return 'None.';

    const parts = [];
    if (diagnostics.repairedTests?.length) {
      parts.push(buildRepairNoticeText(diagnostics));
    }
    if (diagnostics.unrecoverableTests?.length) {
      parts.push(buildChallengeIssueText(diagnostics));
    }
    return parts.length ? parts.join('\n') : 'None.';
  }

  function parseHelpResponse(raw) {
    const text = String(raw || '').trim();
    if (!text) return null;

    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;

    try {
      const parsed = JSON.parse(match[0]);
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        kind: parsed.kind,
        message: String(parsed.message || ''),
        suggestedAction: parsed.suggestedAction || 'none'
      };
    } catch {
      return null;
    }
  }

  async function bypassChallengeForIssue(reason) {
    if (challengeResolved) return;
    challengeResolved = true;

    runBtn.disabled = true;
    hintBtn.disabled = true;
    helpBtn.disabled = true;
    skipBtn.disabled = true;
    outputEl.classList.remove('hidden');
    lastErrorOutput = reason;

    resultsEl.innerHTML = `
      <div class="test-case fail">
        <div class="test-label">Challenge issue</div>
        <div class="test-error">${escapeHtml(reason)}</div>
      </div>
      <div class="test-summary all-pass">Broken challenge detected. Access granted. This attempt was removed from challenge progress history.</div>
    `;

    if (challenge && profile) {
      profile = ChallengeProvider.removeChallengeAttempts(profile, challenge);
      await browser.runtime.sendMessage({ type: 'saveLearningProfile', profile });
    }

    Gate.showContinuePrompt();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Clean up worker when the gate page is unloaded
  window.addEventListener('beforeunload', destroyWorker);

  return { init, destroyWorker };
})();
