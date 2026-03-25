/* Typing Challenge Engine — Monkeytype-style
   No visible textarea. Words float. Characters highlighted as you type.
   Caret moves through characters. Errors underlined on words. */

'use strict';

const TypingChallenge = (() => {
  // State
  let config = {};
  let wordList = [];
  let testWords = [];
  let wordCount = 25;
  let currentWordIndex = 0;
  let currentLetterIndex = 0;
  let inputHistory = []; // array of strings, one per word
  let currentInput = '';
  let startTime = null;
  let finished = false;
  let lastTestPassed = false;
  let focused = false;
  let caretBlinkTimeout = null;
  let lineHeight = 0;
  let scrollOffset = 0;

  // Thresholds
  let wpmThreshold = 90;
  let accuracyThreshold = 95;

  // Elements
  const wordsEl = document.getElementById('words');
  const wrapperEl = document.getElementById('words-wrapper');
  const caretEl = document.getElementById('caret');
  const focusWarning = document.getElementById('focus-warning');
  const wpmEl = document.getElementById('typing-wpm');
  const accEl = document.getElementById('typing-accuracy');
  const progressEl = document.getElementById('typing-progress');
  const resultEl = document.getElementById('typing-result');
  const resultTextEl = document.getElementById('typing-result-text');
  const retryBtn = document.getElementById('typing-retry');

  // ── Init ────────────────────────────────────────────────────────────────

  async function init(cfg, overrideWordCount) {
    config = cfg;
    finished = false;
    lastTestPassed = false;
    currentWordIndex = 0;
    currentLetterIndex = 0;
    inputHistory = [];
    currentInput = '';
    startTime = null;
    scrollOffset = 0;

    // Load settings
    try {
      const state = await browser.runtime.sendMessage({ type: 'getState' });
      const s = state.settings;
      // Use explicit override (from word count button), else settings default
      wordCount = overrideWordCount || s.typingWordCount || 25;
      wpmThreshold = config.isSettingsGate
        ? (s.settingsTypingWpm || 100)
        : (wordCount === 25 ? (s.typingWpm25 || 90) : (s.typingWpm50 || 80));
      accuracyThreshold = config.isSettingsGate ? 98 : (s.typingAccuracyThreshold || 95);
      config._totalCompleted = state.progression.totalChallengesCompleted || 0;
    } catch {
      if (overrideWordCount) wordCount = overrideWordCount;
      wpmThreshold = config.isSettingsGate ? 100 : 90;
      accuracyThreshold = config.isSettingsGate ? 98 : 95;
      config._totalCompleted = 0;
    }

    // Set word count button state
    document.querySelectorAll('.word-count-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.count) === wordCount);
    });

    await loadWords();
    generateTest();
    renderWords();
    bindEvents();
    updateStats();
    resultEl.classList.add('hidden');
    wpmEl.textContent = '';
    accEl.textContent = '';
    progressEl.textContent = `0/${wordCount}`;

    // Focus
    requestAnimationFrame(() => {
      wrapperEl.focus();
      updateCaret();
    });
  }

  // ── Word loading ────────────────────────────────────────────────────────

  async function loadWords() {
    if (wordList.length > 0) return; // already loaded
    try {
      const resp = await fetch(browser.runtime.getURL('gate/challenges/words.json'));
      wordList = await resp.json();
    } catch {
      // Minimal fallback
      wordList = ['the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
        'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
        'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
        'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
        'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
        'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
        'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could',
        'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
        'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
        'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
        'any', 'these', 'give', 'day', 'most', 'us', 'great', 'where', 'still'];
    }
  }

  function generateTest() {
    testWords = [];
    for (let i = 0; i < wordCount; i++) {
      testWords.push(wordList[Math.floor(Math.random() * wordList.length)]);
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  function renderWords() {
    wordsEl.innerHTML = '';
    testWords.forEach((word, wi) => {
      const wordDiv = document.createElement('div');
      wordDiv.className = 'word' + (wi === 0 ? ' active' : '');
      wordDiv.dataset.index = wi;

      for (let ci = 0; ci < word.length; ci++) {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = word[ci];
        wordDiv.appendChild(span);
      }

      wordsEl.appendChild(wordDiv);
    });

    // Measure line height from the first word
    const firstWord = wordsEl.querySelector('.word');
    if (firstWord) {
      lineHeight = firstWord.offsetHeight + 10; // 10 = gap
    }

    wordsEl.style.transform = 'translateY(0px)';
    scrollOffset = 0;
  }

  // ── Input handling ──────────────────────────────────────────────────────

  function bindEvents() {
    // Remove previous listeners
    wrapperEl.onkeydown = handleKeydown;
    wrapperEl.onfocus = () => setFocused(true);
    wrapperEl.onblur = () => setFocused(false);
    wrapperEl.onclick = () => wrapperEl.focus();
    focusWarning.onclick = (e) => { e.stopPropagation(); wrapperEl.focus(); };

    document.querySelectorAll('.word-count-btn').forEach(btn => {
      btn.onclick = () => {
        if (finished) return;
        const count = parseInt(btn.dataset.count);
        document.querySelectorAll('.word-count-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        init(config, count); // restart with explicit word count
      };
    });

    retryBtn.onclick = () => init(config);
  }

  function setFocused(f) {
    focused = f;
    if (f) {
      focusWarning.classList.add('hidden');
      caretEl.style.display = '';
      updateCaret();
    } else {
      if (!finished) {
        focusWarning.classList.remove('hidden');
      }
      caretEl.style.display = 'none';
    }
  }

  function handleKeydown(e) {
    // Cmd/Ctrl+Enter restarts — only when failed (when passed, gate continue prompt handles it)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && finished && !lastTestPassed) {
      e.preventDefault();
      init(config, wordCount);
      return;
    }

    if (finished) return;
    if (!focused) return;

    // Block paste
    if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      e.preventDefault();
      return;
    }

    // Allow Ctrl+Backspace (word delete) — handle before generic modifier block
    const isCtrlBackspace = (e.ctrlKey || e.metaKey) && e.key === 'Backspace';

    // Ignore modifier combos except Ctrl+Backspace
    if ((e.ctrlKey || e.metaKey || e.altKey) && !isCtrlBackspace) return;

    // Ignore non-input keys
    if (['Shift', 'CapsLock', 'Tab', 'Escape', 'Control', 'Alt', 'Meta',
         'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
         'Home', 'End', 'PageUp', 'PageDown',
         'Insert', 'Delete', 'NumLock', 'ScrollLock',
         'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'
        ].includes(e.key)) return;
    if (e.key === 'Enter') return;

    e.preventDefault();

    // Start timer on first real input
    if (!startTime && (e.key.length === 1 || e.key === 'Backspace')) {
      startTime = Date.now();
    }

    // Show caret as solid (typing mode)
    caretEl.classList.add('typing');
    clearTimeout(caretBlinkTimeout);
    caretBlinkTimeout = setTimeout(() => caretEl.classList.remove('typing'), 800);

    if (e.key === 'Backspace') {
      handleBackspace(isCtrlBackspace);
    } else if (e.key === ' ') {
      handleSpace();
    } else if (e.key.length === 1) {
      handleChar(e.key);
    }

    updateWordDisplay();
    updateCaret();
    updateStats();
    handleScroll();
  }

  function handleChar(char) {
    currentInput += char;
    currentLetterIndex = currentInput.length;

    // Auto-finish: last word, typed enough characters to match word length
    if (currentWordIndex === testWords.length - 1) {
      const target = testWords[currentWordIndex];
      if (currentInput.length >= target.length) {
        // Record this word's input and finish
        inputHistory.push(currentInput);
        updateWordDisplay();
        updateCaret();
        updateStats();
        finish();
      }
    }
  }

  function handleBackspace(ctrlHeld) {
    if (ctrlHeld) {
      // Delete entire current word input
      currentInput = '';
      currentLetterIndex = 0;
    } else if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
      currentLetterIndex = currentInput.length;
    } else if (currentWordIndex > 0) {
      // Go back to previous word
      currentWordIndex--;
      currentInput = inputHistory.pop() || '';
      currentLetterIndex = currentInput.length;

      // Update active word class
      const wordEls = wordsEl.querySelectorAll('.word');
      wordEls.forEach(w => w.classList.remove('active'));
      wordEls[currentWordIndex]?.classList.add('active');
    }
  }

  function handleSpace() {
    if (currentInput.length === 0) return; // no empty words

    // Record this word's input
    inputHistory.push(currentInput);
    currentInput = '';
    currentLetterIndex = 0;
    currentWordIndex++;

    // Check if test is done
    if (currentWordIndex >= testWords.length) {
      finish();
      return;
    }

    // Update active word
    const wordEls = wordsEl.querySelectorAll('.word');
    wordEls.forEach(w => w.classList.remove('active'));
    wordEls[currentWordIndex]?.classList.add('active');
  }

  // ── Word display update ─────────────────────────────────────────────────

  function updateWordDisplay() {
    const wordEls = wordsEl.querySelectorAll('.word');

    // Update completed words
    for (let wi = 0; wi < inputHistory.length && wi < wordEls.length; wi++) {
      const wordEl = wordEls[wi];
      const target = testWords[wi];
      const input = inputHistory[wi];
      updateWordLetters(wordEl, target, input, false);
    }

    // Update current word
    if (currentWordIndex < wordEls.length) {
      const wordEl = wordEls[currentWordIndex];
      const target = testWords[currentWordIndex];
      updateWordLetters(wordEl, target, currentInput, true);
    }
  }

  function updateWordLetters(wordEl, target, input, isCurrent) {
    // Remove extra spans FIRST — before resetting classes strips their class
    wordEl.querySelectorAll('.letter-extra').forEach(el => el.remove());

    const existingLetters = wordEl.querySelectorAll('.letter');

    // Reset all letters
    for (let i = 0; i < existingLetters.length; i++) {
      existingLetters[i].className = 'letter';
    }

    // Apply states
    for (let i = 0; i < input.length; i++) {
      if (i < target.length) {
        const letterEl = existingLetters[i];
        if (input[i] === target[i]) {
          letterEl.className = 'letter correct';
        } else {
          letterEl.className = 'letter incorrect';
        }
      } else {
        // Extra characters typed beyond word length
        const extra = document.createElement('span');
        extra.className = 'letter letter-extra incorrect';
        extra.textContent = input[i];
        wordEl.appendChild(extra);
      }
    }

    // Check if entire word is wrong (for underline)
    const isComplete = !isCurrent && input.length > 0;
    const hasError = input !== target.substring(0, input.length) || input.length !== target.length;
    wordEl.classList.toggle('error', isComplete && hasError);
  }

  // ── Caret positioning ───────────────────────────────────────────────────

  function updateCaret() {
    if (!focused || finished) {
      caretEl.style.display = 'none';
      return;
    }
    caretEl.style.display = '';

    const wordEls = wordsEl.querySelectorAll('.word');
    if (currentWordIndex >= wordEls.length) return;

    const wordEl = wordEls[currentWordIndex];
    const letters = wordEl.querySelectorAll('.letter');

    let targetEl;
    let offsetLeft;

    if (currentLetterIndex < letters.length) {
      // Caret before this letter
      targetEl = letters[currentLetterIndex];
      const rect = targetEl.getBoundingClientRect();
      const wrapperRect = wrapperEl.getBoundingClientRect();
      offsetLeft = rect.left - wrapperRect.left;
    } else if (letters.length > 0) {
      // Caret after last letter
      targetEl = letters[letters.length - 1];
      const rect = targetEl.getBoundingClientRect();
      const wrapperRect = wrapperEl.getBoundingClientRect();
      offsetLeft = rect.right - wrapperRect.left;
    } else {
      // Empty word somehow
      const rect = wordEl.getBoundingClientRect();
      const wrapperRect = wrapperEl.getBoundingClientRect();
      offsetLeft = rect.left - wrapperRect.left;
      targetEl = wordEl;
    }

    const rect = targetEl.getBoundingClientRect();
    const wrapperRect = wrapperEl.getBoundingClientRect();
    const top = rect.top - wrapperRect.top;

    caretEl.style.left = offsetLeft + 'px';
    caretEl.style.top = (top + 2) + 'px';
    caretEl.style.height = (rect.height - 4) + 'px';
  }

  // ── Line scrolling ──────────────────────────────────────────────────────

  function handleScroll() {
    const wordEls = wordsEl.querySelectorAll('.word');
    if (currentWordIndex >= wordEls.length) return;

    const activeWord = wordEls[currentWordIndex];
    const wrapperRect = wrapperEl.getBoundingClientRect();
    const activeRect = activeWord.getBoundingClientRect();
    const relativeTop = activeRect.top - wrapperRect.top;

    // If active word is below the second visible line, scroll up
    if (lineHeight > 0 && relativeTop > lineHeight * 1.8) {
      scrollOffset += lineHeight;
      wordsEl.style.transform = `translateY(-${scrollOffset}px)`;
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────

  function updateStats() {
    if (!startTime) {
      progressEl.textContent = `0/${wordCount}`;
      return;
    }

    const elapsed = (Date.now() - startTime) / 1000;
    if (elapsed <= 0) return;

    // Count all correct characters (completed words + current word)
    let correctChars = 0;
    let totalChars = 0;

    for (let i = 0; i < inputHistory.length; i++) {
      const target = testWords[i];
      const input = inputHistory[i];
      for (let j = 0; j < input.length; j++) {
        totalChars++;
        if (j < target.length && input[j] === target[j]) correctChars++;
      }
      // Count the space
      if (i < inputHistory.length) {
        totalChars++;
        correctChars++; // space between words counts as correct
      }
    }

    // Current word
    const currentTarget = testWords[currentWordIndex] || '';
    for (let j = 0; j < currentInput.length; j++) {
      totalChars++;
      if (j < currentTarget.length && currentInput[j] === currentTarget[j]) correctChars++;
    }

    const wpm = Math.round((correctChars / 5) / (elapsed / 60));
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

    wpmEl.textContent = wpm > 0 ? wpm : '';
    wpmEl.classList.toggle('live', wpm > 0);
    accEl.textContent = totalChars > 0 ? `${accuracy}%` : '';
    accEl.classList.toggle('failing', accuracy < accuracyThreshold);
    progressEl.textContent = `${currentWordIndex}/${wordCount}`;
  }

  // ── Finish ──────────────────────────────────────────────────────────────

  function finish() {
    finished = true;
    caretEl.style.display = 'none';

    const elapsed = (Date.now() - startTime) / 1000;
    let correctChars = 0;
    let totalChars = 0;

    for (let i = 0; i < inputHistory.length; i++) {
      const target = testWords[i];
      const input = inputHistory[i];
      for (let j = 0; j < input.length; j++) {
        totalChars++;
        if (j < target.length && input[j] === target[j]) correctChars++;
      }
      totalChars++; correctChars++; // space
    }

    const wpm = Math.round((correctChars / 5) / (elapsed / 60));
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 0;
    const passed = wpm >= wpmThreshold && accuracy >= accuracyThreshold;

    // Save typing history (every test, pass or fail)
    browser.runtime.sendMessage({
      type: 'saveTypingResult',
      result: { wpm, accuracy, wordCount, passed, timestamp: Date.now() }
    }).catch(() => {});

    // Final stats display
    wpmEl.textContent = wpm;
    wpmEl.classList.add('live');
    accEl.textContent = `${accuracy}%`;
    progressEl.textContent = `${wordCount}/${wordCount}`;

    resultEl.classList.remove('hidden');
    resultTextEl.className = passed ? 'pass' : 'fail';

    if (passed) {
      lastTestPassed = true;
      resultTextEl.textContent = `${wpm} wpm · ${accuracy}% — passed`;
      browser.runtime.sendMessage({
        type: 'updateProgression',
        progression: {
          typingAvgWpm: wpm,
          totalChallengesCompleted: (config._totalCompleted || 0) + 1
        }
      }).catch(() => {});
      // Log to daily challenge log
      const solveTime = Math.round((Date.now() - startTime) / 1000);
      browser.runtime.sendMessage({ type: 'logChallengeCompletion', challengeType: 'typing', solveTime }).catch(() => {});
      Gate.showContinuePrompt();
    } else {
      const reasons = [];
      if (wpm < wpmThreshold) reasons.push(`${wpm} wpm (need ${wpmThreshold})`);
      if (accuracy < accuracyThreshold) reasons.push(`${accuracy}% (need ${accuracyThreshold}%)`);
      resultTextEl.textContent = reasons.join(' · ');
      // Log failed attempt so heatmap shows engagement
      const solveTime = Math.round((Date.now() - startTime) / 1000);
      browser.runtime.sendMessage({ type: 'logChallengeCompletion', challengeType: 'typing', solveTime }).catch(() => {});
    }
  }

  // Clean up timeout when the gate page is unloaded
  window.addEventListener('beforeunload', () => {
    if (caretBlinkTimeout) {
      clearTimeout(caretBlinkTimeout);
      caretBlinkTimeout = null;
    }
  });

  return { init };
})();
