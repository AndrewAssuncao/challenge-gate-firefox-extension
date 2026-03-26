/* Challenge Provider — Claude-powered Python mentor.

   Maintains a learning profile of what the user knows, what they've
   struggled with, and where they are in a structured curriculum.
   Sends this context to Claude so it can teach progressively.

   When offline or API fails, falls back to the local problem bank.
   If both fail, the gate falls back to the typing challenge. */

'use strict';

const ChallengeProvider = (() => {

  // ── Curriculum structure ────────────────────────────────────────────────
  // Ordered topics. The mentor advances through these, but can revisit.

  const CURRICULUM = [
    // Tier 1 — Fundamentals
    { id: 'basics',        name: 'Variables, types, basic operations',    tier: 1 },
    { id: 'strings',       name: 'Strings and string methods',           tier: 1 },
    { id: 'conditionals',  name: 'Conditionals (if/elif/else)',          tier: 1 },
    { id: 'loops',         name: 'Loops (for, while, break, continue)',  tier: 1 },

    // Tier 2 — Data Structures & Functions
    { id: 'lists',         name: 'Lists and list operations',            tier: 2 },
    { id: 'dicts',         name: 'Dictionaries',                         tier: 2 },
    { id: 'sets_tuples',   name: 'Sets and tuples',                      tier: 2 },
    { id: 'comprehensions',name: 'List/dict/set comprehensions',         tier: 2 },
    { id: 'functions',     name: 'Functions, scope, default args',       tier: 2 },

    // Tier 3 — Intermediate
    { id: 'string_ops',    name: 'String parsing and manipulation',      tier: 3 },
    { id: 'error_handling',name: 'Try/except, error types, raising',     tier: 3 },
    { id: 'file_patterns', name: 'File I/O patterns (conceptual)',       tier: 3 },
    { id: 'sorting',       name: 'Sorting, key functions, custom sorts', tier: 3 },
    { id: 'recursion',     name: 'Recursion and recursive thinking',     tier: 3 },

    // Tier 4 — Advanced Concepts
    { id: 'classes',       name: 'Classes, OOP basics, dunder methods',  tier: 4 },
    { id: 'generators',    name: 'Generators, iterators, yield',         tier: 4 },
    { id: 'decorators',    name: 'Decorators and higher-order functions',tier: 4 },
    { id: 'data_structs',  name: 'Stacks, queues, linked structures',    tier: 4 },
    { id: 'algorithms',    name: 'Two pointers, sliding window, binary search', tier: 4 },

    // Tier 5 — Expert Algorithms
    { id: 'dp',            name: 'Dynamic programming',                  tier: 5 },
    { id: 'graphs',        name: 'Graph traversal (BFS, DFS)',           tier: 5 },
    { id: 'advanced',      name: 'Context managers, metaclasses, advanced patterns', tier: 5 },
    { id: 'functional',    name: 'Functional programming patterns',      tier: 5 },
    { id: 'concurrency',   name: 'Threading and async basics',           tier: 5 },

    // Tier 6 — Multi-function & System Design
    { id: 'composition',     name: 'Multi-function composition',           tier: 6 },
    { id: 'testing',         name: 'Testing patterns (unittest, pytest)',   tier: 6 },
    { id: 'api_patterns',    name: 'API design patterns',                  tier: 6 },
    { id: 'data_pipelines',  name: 'Data transformation pipelines',        tier: 6 },
    { id: 'design_patterns', name: 'Design patterns (strategy, observer)', tier: 6 },

    // Tier 7 — Code Review & Architecture
    { id: 'code_review_bugs',    name: 'Code review: finding bugs',              tier: 7 },
    { id: 'code_review_perf',    name: 'Code review: performance issues',        tier: 7 },
    { id: 'code_review_style',   name: 'Code review: style and best practices',  tier: 7 },
    { id: 'refactoring',         name: 'Refactoring legacy code',                tier: 7 },
    { id: 'architecture',        name: 'Architectural patterns',                 tier: 7 }
  ];

  // ── Default learning profile ────────────────────────────────────────────

  function defaultProfile() {
    return {
      currentTopicIndex: 0,        // position in CURRICULUM
      topicHistory: {},            // { topicId: { attempts, passes, fails, lastSeen } }
      recentChallenges: [],        // last 15 challenges: { id, topic, passed, mistakes, timestamp }
      conceptsIntroduced: [],      // concepts Claude has explained
      weakAreas: [],               // topics user struggles with
      totalSessions: 0,
      streakDays: 0,
      lastSessionDate: null
    };
  }

  // ── Build mentor prompt ─────────────────────────────────────────────────

  function buildMentorPrompt(profile, isSettingsGate, crossDisciplineContext) {
    const currentTopic = CURRICULUM[profile.currentTopicIndex] || CURRICULUM[0];
    const tier = currentTopic.tier;

    // Build context about what the user knows
    const topicSummary = Object.entries(profile.topicHistory)
      .map(([id, data]) => {
        const topic = CURRICULUM.find(c => c.id === id);
        const name = topic ? topic.name : id;
        const rate = data.attempts > 0 ? Math.round((data.passes / data.attempts) * 100) : 0;
        return `  ${name}: ${data.passes}/${data.attempts} passed (${rate}%)`;
      }).join('\n');

    // Recent challenges for context
    const recentSummary = profile.recentChallenges.slice(-5)
      .map(c => `  - ${c.topic}: ${c.passed ? 'passed' : 'failed'}${c.mistakes ? ` (${c.mistakes})` : ''}`)
      .join('\n');

    const conceptsList = profile.conceptsIntroduced.slice(-20).join(', ');
    const weakList = profile.weakAreas.join(', ');

    const difficulty = isSettingsGate ? 'harder than usual (this is a settings-gate challenge)' : 'appropriate for the current level';

    // Spaced repetition context
    const reviewContext = (typeof SpacedRepetition !== 'undefined')
      ? SpacedRepetition.buildReviewContext(profile, CURRICULUM)
      : '';

    return `You are a Python programming mentor embedded in a browser extension that blocks distracting websites. The user must solve your challenge to access a site they've blocked. Your job is to genuinely teach them Python — not just test them.

## Your Teaching Style
- Concise, dry, intelligent. No fake enthusiasm.
- Introduce ONE new concept or technique per challenge when appropriate.
- When the user is learning something new, briefly explain the concept (2-3 sentences max) before the problem.
- When reinforcing, just give the problem.
- Gradually increase complexity within a topic before moving to the next.

## Current Curriculum Position
Topic: ${currentTopic.name} (Tier ${tier}/7)
Curriculum position: ${profile.currentTopicIndex + 1}/${CURRICULUM.length}
Total challenge attempts: ${profile.totalSessions}

## What the User Knows
${topicSummary || '  (New user — no history yet)'}

## Concepts Already Introduced
${conceptsList || '(None yet)'}

## Weak Areas
${weakList || '(None identified)'}

## Recent Challenges
${recentSummary || '  (None yet)'}
${reviewContext}${crossDisciplineContext || ''}
## Instructions
Generate a challenge that is ${difficulty}. Focus on the current topic: "${currentTopic.name}".

${profile.totalSessions === 0 ? 'This is the user\'s FIRST challenge ever. Start simple and welcoming (but not cheery). Briefly explain what they\'re about to do.' : ''}
${profile.weakAreas.length > 0 ? `Consider revisiting: ${weakList}` : ''}

If the user has been passing consistently on this topic (3+ passes), introduce a slightly harder variant or begin transitioning to the next concept.

${tier <= 5 ? `Every test case input must be a valid Python argument list fragment that can be inserted directly into \`function_name(<input>)\`.
If a test case uses a string, the string MUST be quoted inside the JSON string.
Examples:
- Good single string input: "\\"Hello World\\""
- Good mixed input: "[1, 2, 3], 5"
- Bad input: "Hello World"` : ''}

${tier === 6 ? `For Tier 6 challenges: generate multi-function challenges where the user writes 2-3 functions that work together. The starterCode should contain multiple function stubs. Test cases should test the main/top-level function.` : ''}

${tier === 7 ? `For Tier 7 code review challenges: generate a "code_review" type challenge. Show buggy or inefficient code that the user must analyze and explain what's wrong in free text. The user's text answer will be sent to Claude for validation.

Respond with ONLY valid JSON for code review:
{
  "id": "m-<unique-8-char-id>",
  "type": "code_review",
  "topic": "${currentTopic.id}",
  "conceptIntroduced": "brief name of concept or null",
  "teachingNote": "explanation if new concept, null if reinforcing",
  "prompt": "What issues do you see in this code? Explain what's wrong and how to fix it.",
  "codeToReview": "def process(data):\\n    ...",
  "validationCriteria": "The user should identify: 1) ... 2) ... Key points to look for in their answer.",
  "hints": ["Subtle hint", "More direct hint"],
  "afterSolve": "Teaching note about the issues found."
}

IMPORTANT: For code_review type, do NOT include functionName, starterCode, or testCases.` : ''}

${tier <= 6 ? `Respond with ONLY valid JSON (no markdown fences, no commentary):
{
  "id": "m-<unique-8-char-id>",
  "topic": "${currentTopic.id}",
  "conceptIntroduced": "brief name of new concept if any, or null",
  "teachingNote": "1-3 sentence explanation of a concept IF introducing something new. null if just reinforcing.",
  "prompt": "Clear problem statement. Use backticks for code references.",
  "functionName": "function_name",
  "starterCode": "def function_name(params):\\n    pass\\n",
  "testCases": [
    {"input": "arg1, arg2", "expected": "expected_output_as_string"}
  ],
  "hints": ["Subtle hint", "More direct hint"],
  "afterSolve": "1-2 sentence note about what they just learned or a related tip. Shown after passing."
}` : ''}`;
  }

  function extractFunctionParamInfo(starterCode, functionName) {
    const fallback = { minArgs: 1, maxArgs: 1 };
    if (!starterCode || !functionName) return fallback;

    const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(starterCode).match(new RegExp(`def\\s+${escapedName}\\s*\\(([^)]*)\\)`));
    if (!match) return fallback;

    const params = splitTopLevelArgs(match[1] || '')
      .map(p => p.trim())
      .filter(Boolean);

    let minArgs = 0;
    let maxArgs = 0;
    let hasVarArgs = false;

    for (const param of params) {
      if (param.startsWith('*')) {
        hasVarArgs = true;
        continue;
      }

      const normalized = param.split(':')[0].trim();
      if (!normalized) continue;
      maxArgs++;
      if (!normalized.includes('=')) minArgs++;
    }

    return {
      minArgs,
      maxArgs: hasVarArgs ? Number.POSITIVE_INFINITY : maxArgs
    };
  }

  function splitTopLevelArgs(input) {
    const src = String(input || '');
    if (!src.trim()) return [];

    const parts = [];
    let current = '';
    let depth = 0;
    let quote = null;
    let escapeNext = false;

    for (let i = 0; i < src.length; i++) {
      const ch = src[i];

      if (quote) {
        current += ch;
        if (escapeNext) {
          escapeNext = false;
        } else if (ch === '\\') {
          escapeNext = true;
        } else if (ch === quote) {
          quote = null;
        }
        continue;
      }

      if (ch === '"' || ch === '\'') {
        quote = ch;
        current += ch;
        continue;
      }

      if (ch === '(' || ch === '[' || ch === '{') {
        depth++;
        current += ch;
        continue;
      }

      if (ch === ')' || ch === ']' || ch === '}') {
        depth = Math.max(0, depth - 1);
        current += ch;
        continue;
      }

      if (ch === ',' && depth === 0) {
        parts.push(current.trim());
        current = '';
        continue;
      }

      current += ch;
    }

    if (current.trim() || src.endsWith(',')) {
      parts.push(current.trim());
    }

    return parts.filter(part => part.length > 0);
  }

  function isSimpleLiteralToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;

    if (/^[-+]?\d+(?:\.\d+)?$/.test(value)) return true;
    if (/^[-+]?\d+(?:\.\d+)?[eE][-+]?\d+$/.test(value)) return true;
    if (/^(True|False|None)$/.test(value)) return true;
    if (/^(['"]).*\1$/s.test(value)) return true;
    if (/^[\[{(].*[\]})]$/s.test(value)) return true;

    return false;
  }

  function looksLikeBareStringToken(token) {
    const value = String(token || '').trim();
    if (!value) return false;
    if (isSimpleLiteralToken(value)) return false;
    if (/[=<>+\-*/%]/.test(value)) return false;
    if (/[:]/.test(value)) return false;
    if (/[\[\]{}()]/.test(value)) return false;
    return /[A-Za-z]/.test(value);
  }

  function quoteToken(token) {
    return JSON.stringify(String(token || '').trim());
  }

  function repairLikelyMalformedInput(input, paramInfo) {
    const raw = String(input || '').trim();
    if (!raw) return { input: raw, repaired: false };
    if (raw.includes('"') || raw.includes('\'')) return { input: raw, repaired: false };

    const tokens = splitTopLevelArgs(raw);
    if (tokens.length === 0) return { input: raw, repaired: false };

    const minArgs = Number.isFinite(paramInfo?.minArgs) ? paramInfo.minArgs : 1;
    const maxArgs = paramInfo?.maxArgs ?? 1;
    const withinRange = tokens.length >= minArgs &&
      (maxArgs === Number.POSITIVE_INFINITY || tokens.length <= maxArgs);
    if (!withinRange) return { input: raw, repaired: false };

    let repaired = false;
    const repairedTokens = tokens.map(token => {
      if (looksLikeBareStringToken(token)) {
        repaired = true;
        return quoteToken(token);
      }
      return token;
    });

    if (!repaired) return { input: raw, repaired: false };

    return {
      input: repairedTokens.join(', '),
      repaired: true,
      reason: 'Quoted bare string arguments in malformed test input.'
    };
  }

  function sanitizeChallenge(challenge) {
    if (!challenge || typeof challenge !== 'object') return null;

    // Handle code_review type (Tier 7)
    if (challenge.type === 'code_review') {
      return {
        ...challenge,
        type: 'code_review',
        id: String(challenge.id || `m-${Math.random().toString(36).slice(2, 10)}`),
        prompt: String(challenge.prompt || ''),
        codeToReview: String(challenge.codeToReview || ''),
        validationCriteria: String(challenge.validationCriteria || ''),
        teachingNote: challenge.teachingNote ? String(challenge.teachingNote) : null,
        conceptIntroduced: challenge.conceptIntroduced ? String(challenge.conceptIntroduced) : null,
        afterSolve: challenge.afterSolve ? String(challenge.afterSolve) : '',
        hints: Array.isArray(challenge.hints) ? challenge.hints.map(h => String(h)).filter(Boolean) : []
      };
    }

    const sanitized = {
      ...challenge,
      id: String(challenge.id || `m-${Math.random().toString(36).slice(2, 10)}`),
      prompt: String(challenge.prompt || ''),
      functionName: String(challenge.functionName || ''),
      starterCode: String(challenge.starterCode || ''),
      teachingNote: challenge.teachingNote ? String(challenge.teachingNote) : null,
      conceptIntroduced: challenge.conceptIntroduced ? String(challenge.conceptIntroduced) : null,
      afterSolve: challenge.afterSolve ? String(challenge.afterSolve) : ''
    };

    if (!sanitized.functionName || !sanitized.starterCode) return null;

    const paramInfo = extractFunctionParamInfo(sanitized.starterCode, sanitized.functionName);
    const repairNotes = [];

    const testCases = Array.isArray(challenge.testCases) ? challenge.testCases : [];
    sanitized.testCases = testCases
      .map(tc => {
        if (!tc || typeof tc.input === 'undefined' || typeof tc.expected === 'undefined') return null;

        const repaired = repairLikelyMalformedInput(tc.input, paramInfo);
        if (repaired.repaired) {
          repairNotes.push(`Adjusted test input ${JSON.stringify(String(tc.input))} -> ${JSON.stringify(repaired.input)}`);
        }

        return {
          input: repaired.input,
          expected: String(tc.expected)
        };
      })
      .filter(Boolean);

    if (sanitized.testCases.length === 0) return null;

    sanitized.hints = Array.isArray(challenge.hints)
      ? challenge.hints.map(h => String(h)).filter(Boolean)
      : [];

    if (repairNotes.length) {
      sanitized.__repairNotes = repairNotes;
    }

    return sanitized;
  }

  // ── Generate via Claude API (called through background script) ──────────

  async function generateFromClaude(profile, isSettingsGate) {
    const currentTopic = CURRICULUM[profile.currentTopicIndex] || CURRICULUM[0];

    // Fetch cross-discipline context
    let crossCtx = '';
    if (typeof CrossDiscipline !== 'undefined') {
      try {
        const [termProfile, gitProfile] = await Promise.all([
          browser.runtime.sendMessage({ type: 'getTerminalLearningProfile' }),
          browser.runtime.sendMessage({ type: 'getGitLearningProfile' })
        ]);
        crossCtx = CrossDiscipline.getContext('python', currentTopic.id, {
          python: profile, terminal: termProfile, git: gitProfile
        });
      } catch {}
    }

    const prompt = buildMentorPrompt(profile, isSettingsGate, crossCtx);
    const useOpus = currentTopic.tier >= 5;

    try {
      const response = await browser.runtime.sendMessage({
        type: 'claudeGenerate',
        prompt: prompt,
        model: useOpus ? 'claude-opus-4-20250514' : undefined,
        maxTokens: useOpus ? 2048 : undefined
      });

      if (response.error) {
        console.error('[Mentor] Claude API error:', response.error);
        return null;
      }

      // Parse JSON from response
      const content = response.content;
      if (!content) return null;

      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const challenge = sanitizeChallenge(JSON.parse(cleaned));

      // Validate
      if (!challenge) {
        console.error('[Mentor] Invalid challenge structure');
        return null;
      }
      // Code review challenges don't need functionName/testCases
      if (challenge.type !== 'code_review' && (!challenge.functionName || !challenge.testCases || !challenge.starterCode)) {
        console.error('[Mentor] Invalid standard challenge structure');
        return null;
      }

      return challenge;
    } catch (err) {
      console.error('[Mentor] Generation failed:', err);
      return null;
    }
  }

  // ── Local fallback ──────────────────────────────────────────────────────

  let localProblems = null;

  async function loadLocal() {
    if (localProblems) return;
    try {
      const resp = await fetch(browser.runtime.getURL('gate/challenges/python-problems.json'));
      localProblems = await resp.json();
    } catch {
      localProblems = [];
    }
  }

  function pickLocal(profile) {
    if (!localProblems || localProblems.length === 0) return null;
    const completed = profile.recentChallenges.map(c => c.id);
    const tier = (CURRICULUM[profile.currentTopicIndex] || CURRICULUM[0]).tier;
    const sanitizePool = (problems) => problems.map(sanitizeChallenge).filter(Boolean);
    const eligible = sanitizePool(localProblems.filter(p =>
      p.tier === tier && !completed.includes(p.id)
    ));
    if (eligible.length > 0) return eligible[Math.floor(Math.random() * eligible.length)];
    const all = sanitizePool(localProblems.filter(p => p.tier === tier));
    if (all.length > 0) return all[Math.floor(Math.random() * all.length)];
    const fallback = sanitizePool(localProblems);
    return fallback[Math.floor(Math.random() * fallback.length)] || null;
  }

  function recomputeWeakAreas(profile) {
    profile.weakAreas = Object.entries(profile.topicHistory)
      .filter(([_, data]) => data.attempts >= 3 && (data.passes / data.attempts) < 0.5)
      .map(([id]) => {
        const topic = CURRICULUM.find(c => c.id === id);
        return topic ? topic.name : id;
      });
  }

  // ── Profile management ──────────────────────────────────────────────────

  function updateProfileAfterChallenge(profile, challenge, passed, source, struggled, usedHelp) {
    const topicId = challenge.topic || 'unknown';

    // Migrate profile if needed
    if (typeof SpacedRepetition !== 'undefined') SpacedRepetition.migrateProfile(profile);

    // Update topic history
    if (!profile.topicHistory[topicId]) {
      profile.topicHistory[topicId] = { attempts: 0, passes: 0, fails: 0, lastSeen: null };
    }
    const th = profile.topicHistory[topicId];
    th.attempts++;
    if (passed) th.passes++;
    else th.fails++;
    th.lastSeen = Date.now();

    // Update spaced repetition confidence
    if (typeof SpacedRepetition !== 'undefined') {
      SpacedRepetition.updateConfidence(th, passed, !!struggled, !!usedHelp);
    }

    // Track introduced concepts
    if (challenge.conceptIntroduced && !profile.conceptsIntroduced.includes(challenge.conceptIntroduced)) {
      profile.conceptsIntroduced.push(challenge.conceptIntroduced);
    }

    // Update recent challenges (keep last 15)
    profile.recentChallenges.push({
      id: challenge.id,
      topic: topicId,
      passed,
      source,
      timestamp: Date.now()
    });
    if (profile.recentChallenges.length > 15) {
      profile.recentChallenges = profile.recentChallenges.slice(-15);
    }

    // Advance curriculum: move forward when the current topic is learned
    // Also handles review challenges by checking if the challenge topic is ahead of current
    if (passed && profile.currentTopicIndex < CURRICULUM.length - 1) {
      const currentTopic = CURRICULUM[profile.currentTopicIndex];
      const topicData = currentTopic ? profile.topicHistory[currentTopic.id] : null;
      const hasConfidence = topicData && typeof topicData.confidenceLevel === 'number';
      const shouldAdvance = hasConfidence
        ? (topicData.confidenceLevel >= 2 || topicData.passes >= 2)
        : (topicData && topicData.passes >= 2);

      if (shouldAdvance) {
        profile.currentTopicIndex++;
        // Keep advancing through topics that already have 2+ passes (catchup)
        while (profile.currentTopicIndex < CURRICULUM.length - 1) {
          const nextTopic = CURRICULUM[profile.currentTopicIndex];
          const nextData = profile.topicHistory[nextTopic.id];
          if (nextData && nextData.passes >= 2) {
            profile.currentTopicIndex++;
          } else {
            break;
          }
        }
      }
    }

    // Identify weak areas: topics with pass rate < 50% and 3+ attempts
    recomputeWeakAreas(profile);

    // Session tracking
    const today = new Date().toISOString().slice(0, 10);
    if (profile.lastSessionDate !== today) {
      if (profile.lastSessionDate) {
        const lastDate = new Date(profile.lastSessionDate);
        const todayDate = new Date(today);
        const diffDays = Math.round((todayDate - lastDate) / (1000 * 60 * 60 * 24));
        profile.streakDays = diffDays === 1 ? profile.streakDays + 1 : 1;
      } else {
        profile.streakDays = 1;
      }
      profile.lastSessionDate = today;
    }
    profile.totalSessions++;

    return profile;
  }

  function removeChallengeAttempts(profile, challenge) {
    if (!profile || !challenge?.id) return profile;

    const attemptsToRemove = profile.recentChallenges.filter(entry => entry.id === challenge.id);
    if (attemptsToRemove.length === 0) return profile;

    profile.recentChallenges = profile.recentChallenges.filter(entry => entry.id !== challenge.id);

    const topicId = challenge.topic || attemptsToRemove[0]?.topic || 'unknown';
    const topicStats = profile.topicHistory[topicId];
    if (topicStats) {
      const removedPasses = attemptsToRemove.filter(entry => entry.passed).length;
      const removedFails = attemptsToRemove.length - removedPasses;

      topicStats.attempts = Math.max(0, topicStats.attempts - attemptsToRemove.length);
      topicStats.passes = Math.max(0, topicStats.passes - removedPasses);
      topicStats.fails = Math.max(0, topicStats.fails - removedFails);

      if (topicStats.attempts === 0 && topicStats.passes === 0 && topicStats.fails === 0) {
        delete profile.topicHistory[topicId];
      }
    }

    recomputeWeakAreas(profile);
    return profile;
  }

  // ── Public API ──────────────────────────────────────────────────────────

  async function getChallenge(profile, isSettingsGate) {
    // Try Claude first
    const aiChallenge = await generateFromClaude(profile, isSettingsGate);
    if (aiChallenge) {
      return { challenge: aiChallenge, source: 'claude' };
    }

    // Fallback to local
    await loadLocal();
    const local = pickLocal(profile);
    if (local) {
      return { challenge: local, source: 'local' };
    }

    // Total failure
    return { challenge: null, source: 'none' };
  }

  return {
    getChallenge,
    updateProfileAfterChallenge,
    removeChallengeAttempts,
    defaultProfile,
    CURRICULUM
  };
})();
