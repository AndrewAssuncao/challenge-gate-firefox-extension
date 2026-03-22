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
    { id: 'basics',        name: 'Variables, types, basic operations',    tier: 1 },
    { id: 'strings',       name: 'Strings and string methods',           tier: 1 },
    { id: 'conditionals',  name: 'Conditionals (if/elif/else)',          tier: 1 },
    { id: 'loops',         name: 'Loops (for, while, break, continue)',  tier: 1 },
    { id: 'lists',         name: 'Lists and list operations',            tier: 2 },
    { id: 'dicts',         name: 'Dictionaries',                         tier: 2 },
    { id: 'sets_tuples',   name: 'Sets and tuples',                      tier: 2 },
    { id: 'comprehensions',name: 'List/dict/set comprehensions',         tier: 2 },
    { id: 'functions',     name: 'Functions, scope, default args',       tier: 2 },
    { id: 'string_ops',    name: 'String parsing and manipulation',      tier: 3 },
    { id: 'error_handling',name: 'Try/except, error types, raising',     tier: 3 },
    { id: 'file_patterns', name: 'File I/O patterns (conceptual)',       tier: 3 },
    { id: 'sorting',       name: 'Sorting, key functions, custom sorts', tier: 3 },
    { id: 'recursion',     name: 'Recursion and recursive thinking',     tier: 3 },
    { id: 'classes',       name: 'Classes, OOP basics, dunder methods',  tier: 4 },
    { id: 'generators',    name: 'Generators, iterators, yield',         tier: 4 },
    { id: 'decorators',    name: 'Decorators and higher-order functions',tier: 4 },
    { id: 'data_structs',  name: 'Stacks, queues, linked structures',    tier: 4 },
    { id: 'algorithms',    name: 'Two pointers, sliding window, binary search', tier: 4 },
    { id: 'dp',            name: 'Dynamic programming',                  tier: 5 },
    { id: 'graphs',        name: 'Graph traversal (BFS, DFS)',           tier: 5 },
    { id: 'advanced',      name: 'Context managers, metaclasses, advanced patterns', tier: 5 }
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

  function buildMentorPrompt(profile, isSettingsGate) {
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

    return `You are a Python programming mentor embedded in a browser extension that blocks distracting websites. The user must solve your challenge to access a site they've blocked. Your job is to genuinely teach them Python — not just test them.

## Your Teaching Style
- Concise, dry, intelligent. No fake enthusiasm.
- Introduce ONE new concept or technique per challenge when appropriate.
- When the user is learning something new, briefly explain the concept (2-3 sentences max) before the problem.
- When reinforcing, just give the problem.
- Gradually increase complexity within a topic before moving to the next.

## Current Curriculum Position
Topic: ${currentTopic.name} (Tier ${tier}/5)
Curriculum position: ${profile.currentTopicIndex + 1}/${CURRICULUM.length}
Total sessions: ${profile.totalSessions}

## What the User Knows
${topicSummary || '  (New user — no history yet)'}

## Concepts Already Introduced
${conceptsList || '(None yet)'}

## Weak Areas
${weakList || '(None identified)'}

## Recent Challenges
${recentSummary || '  (None yet)'}

## Instructions
Generate a challenge that is ${difficulty}. Focus on the current topic: "${currentTopic.name}".

${profile.totalSessions === 0 ? 'This is the user\'s FIRST challenge ever. Start simple and welcoming (but not cheery). Briefly explain what they\'re about to do.' : ''}
${profile.weakAreas.length > 0 ? `Consider revisiting: ${weakList}` : ''}

If the user has been passing consistently on this topic (3+ passes), introduce a slightly harder variant or begin transitioning to the next concept.

Respond with ONLY valid JSON (no markdown fences, no commentary):
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
}`;
  }

  // ── Generate via Claude API (called through background script) ──────────

  async function generateFromClaude(profile, isSettingsGate) {
    const prompt = buildMentorPrompt(profile, isSettingsGate);

    try {
      const response = await browser.runtime.sendMessage({
        type: 'claudeGenerate',
        prompt: prompt
      });

      if (response.error) {
        console.error('[Mentor] Claude API error:', response.error);
        return null;
      }

      // Parse JSON from response
      const content = response.content;
      if (!content) return null;

      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const challenge = JSON.parse(cleaned);

      // Validate
      if (!challenge.functionName || !challenge.testCases || !challenge.starterCode) {
        console.error('[Mentor] Invalid challenge structure');
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
    const eligible = localProblems.filter(p =>
      p.tier === tier && !completed.includes(p.id)
    );
    if (eligible.length > 0) return eligible[Math.floor(Math.random() * eligible.length)];
    const all = localProblems.filter(p => p.tier === tier);
    if (all.length > 0) return all[Math.floor(Math.random() * all.length)];
    return localProblems[Math.floor(Math.random() * localProblems.length)];
  }

  // ── Profile management ──────────────────────────────────────────────────

  function updateProfileAfterChallenge(profile, challenge, passed, source) {
    const topicId = challenge.topic || 'unknown';

    // Update topic history
    if (!profile.topicHistory[topicId]) {
      profile.topicHistory[topicId] = { attempts: 0, passes: 0, fails: 0, lastSeen: null };
    }
    const th = profile.topicHistory[topicId];
    th.attempts++;
    if (passed) th.passes++;
    else th.fails++;
    th.lastSeen = Date.now();

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

    // Advance curriculum: if 3+ passes on current topic, move forward
    const currentTopic = CURRICULUM[profile.currentTopicIndex];
    if (currentTopic && passed) {
      const topicData = profile.topicHistory[currentTopic.id];
      if (topicData && topicData.passes >= 3 && profile.currentTopicIndex < CURRICULUM.length - 1) {
        profile.currentTopicIndex++;
      }
    }

    // Identify weak areas: topics with pass rate < 50% and 3+ attempts
    profile.weakAreas = Object.entries(profile.topicHistory)
      .filter(([_, data]) => data.attempts >= 3 && (data.passes / data.attempts) < 0.5)
      .map(([id]) => {
        const topic = CURRICULUM.find(c => c.id === id);
        return topic ? topic.name : id;
      });

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
    defaultProfile,
    CURRICULUM
  };
})();
