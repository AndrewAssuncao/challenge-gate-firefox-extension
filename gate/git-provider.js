/* Git Challenge Provider — Claude-powered git mentor.

   Maintains a learning profile of what the user knows about Git,
   and where they are in a structured curriculum.
   Sends this context to Claude so it can teach progressively.

   When offline or API fails, falls back to the local problem bank.
   If both fail, the gate falls back to the typing challenge. */

'use strict';

const GitChallengeProvider = (() => {

  // ── Curriculum structure ──────────────────────────────────────────────
  // Ordered topics. The mentor advances through these, but can revisit.

  const GIT_CURRICULUM = [
    // Tier 1 — Git Basics
    { id: 'git_init',           name: 'Repository setup (init, status)',                tier: 1 },
    { id: 'git_staging',        name: 'Staging changes (add, restore)',                 tier: 1 },
    { id: 'git_commit',         name: 'Making commits',                                tier: 1 },
    { id: 'git_log',            name: 'Viewing history (log, show)',                    tier: 1 },

    // Tier 2 — Branching
    { id: 'git_branch_create',  name: 'Creating branches',                             tier: 2 },
    { id: 'git_checkout',       name: 'Switching branches (checkout, switch)',          tier: 2 },
    { id: 'git_merge_ff',       name: 'Fast-forward merges',                           tier: 2 },
    { id: 'git_merge_3way',     name: 'Three-way merges',                              tier: 2 },

    // Tier 3 — Intermediate
    { id: 'git_rebase',         name: 'Rebasing branches',                             tier: 3 },
    { id: 'git_cherry_pick',    name: 'Cherry-picking commits',                        tier: 3 },
    { id: 'git_stash',          name: 'Stashing changes',                              tier: 3 },
    { id: 'git_reset',          name: 'Reset (soft, mixed, hard)',                     tier: 3 },

    // Tier 4 — Advanced
    { id: 'git_rebase_interactive', name: 'Interactive rebase concepts',                tier: 4 },
    { id: 'git_bisect',         name: 'Finding bugs with bisect',                      tier: 4 },
    { id: 'git_reflog',         name: 'Recovery with reflog',                          tier: 4 },
    { id: 'git_tags',           name: 'Tagging releases',                              tier: 4 },

    // Tier 5 — Mastery
    { id: 'git_merge_conflicts', name: 'Resolving merge conflicts',                    tier: 5 },
    { id: 'git_workflows',      name: 'Git workflows (GitFlow, trunk-based)',          tier: 5 },
    { id: 'git_advanced_rebase', name: 'Advanced rebase and history rewriting',        tier: 5 },
    { id: 'git_submodules',     name: 'Submodules and subtrees',                       tier: 5 }
  ];

  // ── Default learning profile ──────────────────────────────────────────

  function defaultProfile() {
    return {
      currentTopicIndex: 0,
      topicHistory: {},
      recentChallenges: [],
      conceptsIntroduced: [],
      weakAreas: [],
      totalSessions: 0,
      streakDays: 0,
      lastSessionDate: null
    };
  }

  // ── Build mentor prompt ───────────────────────────────────────────────

  function buildMentorPrompt(profile, isSettingsGate, crossDisciplineContext) {
    const currentTopic = GIT_CURRICULUM[profile.currentTopicIndex] || GIT_CURRICULUM[0];
    const tier = currentTopic.tier;

    const reviewContext = (typeof SpacedRepetition !== 'undefined')
      ? SpacedRepetition.buildReviewContext(profile, GIT_CURRICULUM)
      : '';

    const topicSummary = Object.entries(profile.topicHistory)
      .map(([id, data]) => {
        const topic = GIT_CURRICULUM.find(c => c.id === id);
        const name = topic ? topic.name : id;
        const rate = data.attempts > 0 ? Math.round((data.passes / data.attempts) * 100) : 0;
        return `  ${name}: ${data.passes}/${data.attempts} passed (${rate}%)`;
      }).join('\n');

    const recentSummary = profile.recentChallenges.slice(-5)
      .map(c => `  - ${c.topic}: ${c.passed ? 'passed' : 'failed'}`)
      .join('\n');

    const conceptsList = profile.conceptsIntroduced.slice(-20).join(', ');
    const weakList = profile.weakAreas.join(', ');
    const difficulty = isSettingsGate ? 'harder than usual (this is a settings-gate challenge)' : 'appropriate for the current level';

    return `You are a Git mentor embedded in a browser extension. The user must solve your challenge to access a blocked site. Your job is to genuinely teach them to master Git — not just test them.

## Context
The user is a developer who needs to build deep Git proficiency. Challenges run in a simulated Git environment with an in-memory repository model and visual branch graph. The user types real git commands and sees the repository graph update in real-time.

## Your Teaching Style
- Concise, dry, intelligent. No fake enthusiasm.
- Introduce ONE new concept or technique per challenge when appropriate.
- When the user is learning something new, briefly explain the concept (2-3 sentences max) before the task.
- When reinforcing, just give the scenario.
- Gradually increase complexity within a topic before moving to the next.
- Frame scenarios realistically: fixing a release branch, cleaning up history, preparing for code review.

## Current Curriculum Position
Topic: ${currentTopic.name} (Tier ${tier}/5)
Curriculum position: ${profile.currentTopicIndex + 1}/${GIT_CURRICULUM.length}
Total sessions: ${profile.totalSessions}

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

${profile.totalSessions === 0 ? 'This is the user\'s FIRST git challenge ever. Start simple and welcoming (but not cheery). Briefly explain what Git is and what they\'re about to do.' : ''}
${profile.weakAreas.length > 0 ? `Consider revisiting: ${weakList}` : ''}

If the user has been passing consistently on this topic (3+ passes), introduce a harder variant or transition to the next concept.

The challenge runs in a simulated Git environment. You define the initial repository state (commits, branches, HEAD) and the target state. The user types git commands to transform the initial state into the target state. Two SVG branch graphs are shown side-by-side: "Target" (static goal) and "Current" (updates after each command).

Validation types you can use in objectives:
- "branchExists": check a branch with name "expected" exists
- "branchAt": check branch "branch" points to commit resolvable by "expected"
- "headOnBranch": check HEAD is on branch "expected"
- "headDetached": check HEAD is detached (no "expected" needed, set to "true")
- "commitCount": check total number of commits equals "expected"
- "commitCountMin": check total commits >= "expected"
- "commitMessageExists": check a commit with message containing "expected" exists
- "mergeCommitExists": check a merge commit (2+ parents) exists (set "expected" to "true")
- "tagExists": check a tag named "expected" exists
- "commandUsed": check the user ran a command matching "expected" regex pattern
- "outputContains": check the last command's output contains "expected" string

For initialState and targetState, use this format:
{
  "commits": [{"sha": "a1b2c3d", "message": "Initial commit", "parents": []}, ...],
  "branches": {"main": "sha1", "feature": "sha2"},
  "HEAD": {"type": "branch", "ref": "main"},
  "workingTree": {"filename.js": "modified", "newfile.py": "new"},
  "staging": ["filename.js"]
}

CRITICAL: If the scenario involves uncommitted changes, modified files, or files the user needs to stage/commit, you MUST include "workingTree" in the initialState. Without it, "git status" will show "nothing to commit" and the challenge will be impossible. Use "modified" for changed existing files and "new" for untracked files. "staging" is an array of filenames already staged.

IMPORTANT: Use short 7-character hex strings for SHAs. Keep commit graphs small (2-8 commits). Make sure parent references are consistent.

Respond with ONLY valid JSON (no markdown fences, no commentary):
{
  "id": "g-<unique-8-char-id>",
  "topic": "${currentTopic.id}",
  "tier": ${tier},
  "conceptIntroduced": "brief name of new concept if any, or null",
  "teachingNote": "1-3 sentence explanation of a concept IF introducing something new. null if just reinforcing.",
  "scenario": "A realistic scenario description. What the user needs to accomplish and why.",
  "initialState": {
    "commits": [{"sha":"<7hex>","message":"...","parents":["<parent_sha>"]}],
    "branches": {"main":"<sha>"},
    "HEAD": {"type":"branch","ref":"main"}
  },
  "targetState": {
    "commits": [... includes result commits ...],
    "branches": {"main":"<sha>"},
    "HEAD": {"type":"branch","ref":"main"}
  },
  "objectives": [
    {
      "description": "Human-readable description of what to do",
      "validation": { "type": "<validation_type>", "expected": "<value>", "branch": "<optional>" }
    }
  ],
  "hints": ["Subtle hint", "More direct hint"],
  "afterSolve": "1-2 sentence note about what they just learned or a tip. Shown after passing."
}`;
  }

  // ── Sanitize challenge from Claude or local ────────────────────────

  function sanitizeChallenge(challenge) {
    if (!challenge || typeof challenge !== 'object') return null;

    const sanitized = {
      ...challenge,
      id: String(challenge.id || `g-${Math.random().toString(36).slice(2, 10)}`),
      scenario: String(challenge.scenario || ''),
      teachingNote: challenge.teachingNote ? String(challenge.teachingNote) : null,
      conceptIntroduced: challenge.conceptIntroduced ? String(challenge.conceptIntroduced) : null,
      afterSolve: challenge.afterSolve ? String(challenge.afterSolve) : '',
      tier: Number(challenge.tier) || 1
    };

    if (!sanitized.scenario) return null;

    // Validate initialState
    if (challenge.initialState && typeof challenge.initialState === 'object') {
      sanitized.initialState = {
        commits: Array.isArray(challenge.initialState.commits) ? challenge.initialState.commits : [],
        branches: challenge.initialState.branches || {},
        HEAD: challenge.initialState.HEAD || { type: 'branch', ref: 'main' },
        tags: challenge.initialState.tags || {}
      };
      // Pass through workingTree and staging if present
      if (challenge.initialState.workingTree && typeof challenge.initialState.workingTree === 'object') {
        sanitized.initialState.workingTree = challenge.initialState.workingTree;
      }
      if (Array.isArray(challenge.initialState.staging)) {
        sanitized.initialState.staging = challenge.initialState.staging;
      }
    } else {
      sanitized.initialState = { commits: [], branches: {}, HEAD: { type: 'branch', ref: 'main' } };
    }

    // Validate targetState
    if (challenge.targetState && typeof challenge.targetState === 'object') {
      sanitized.targetState = {
        commits: Array.isArray(challenge.targetState.commits) ? challenge.targetState.commits : [],
        branches: challenge.targetState.branches || {},
        HEAD: challenge.targetState.HEAD || { type: 'branch', ref: 'main' },
        tags: challenge.targetState.tags || {}
      };
    } else {
      sanitized.targetState = null;
    }

    // Validate objectives
    const objectives = Array.isArray(challenge.objectives) ? challenge.objectives : [];
    sanitized.objectives = objectives
      .map(obj => {
        if (!obj || !obj.validation || !obj.validation.type) return null;
        const validTypes = [
          'branchExists', 'branchAt', 'headOnBranch', 'headDetached',
          'commitCount', 'commitCountMin', 'commitMessageExists',
          'mergeCommitExists', 'tagExists', 'commandUsed', 'outputContains',
          'stateMatch'
        ];
        if (!validTypes.includes(obj.validation.type)) return null;
        return {
          description: String(obj.description || ''),
          validation: obj.validation,
          _met: false
        };
      })
      .filter(Boolean);

    if (sanitized.objectives.length === 0) return null;

    sanitized.hints = Array.isArray(challenge.hints)
      ? challenge.hints.map(h => String(h)).filter(Boolean)
      : [];

    return sanitized;
  }

  // ── Generate via Claude API ────────────────────────────────────────

  async function generateFromClaude(profile, isSettingsGate) {
    const currentTopic = GIT_CURRICULUM[profile.currentTopicIndex] || GIT_CURRICULUM[0];
    const useOpus = currentTopic.tier >= 5;

    // Fetch cross-discipline context
    let crossCtx = '';
    if (typeof CrossDiscipline !== 'undefined') {
      try {
        const [pyProfile, termProfile] = await Promise.all([
          browser.runtime.sendMessage({ type: 'getLearningProfile' }),
          browser.runtime.sendMessage({ type: 'getTerminalLearningProfile' })
        ]);
        crossCtx = CrossDiscipline.getContext('git', currentTopic.id, {
          python: pyProfile, terminal: termProfile, git: profile
        });
      } catch {}
    }

    const prompt = buildMentorPrompt(profile, isSettingsGate, crossCtx);

    try {
      const response = await browser.runtime.sendMessage({
        type: 'claudeGenerate',
        prompt: prompt,
        model: useOpus ? 'claude-opus-4-20250514' : undefined,
        maxTokens: useOpus ? 2048 : undefined
      });

      if (response.error) {
        console.error('[GitMentor] Claude API error:', response.error);
        return null;
      }

      const content = response.content;
      if (!content) return null;

      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const challenge = sanitizeChallenge(JSON.parse(cleaned));

      if (!challenge || !challenge.scenario || !challenge.objectives.length) {
        console.error('[GitMentor] Invalid challenge structure');
        return null;
      }

      return challenge;
    } catch (err) {
      console.error('[GitMentor] Generation failed:', err);
      return null;
    }
  }

  // ── Local fallback ────────────────────────────────────────────────

  let localProblems = null;

  async function loadLocal() {
    if (localProblems) return;
    try {
      const resp = await fetch(browser.runtime.getURL('gate/challenges/git-problems.json'));
      localProblems = await resp.json();
    } catch {
      localProblems = [];
    }
  }

  function pickLocal(profile) {
    if (!localProblems || localProblems.length === 0) return null;
    const completed = profile.recentChallenges.map(c => c.id);
    const tier = (GIT_CURRICULUM[profile.currentTopicIndex] || GIT_CURRICULUM[0]).tier;

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

  // ── Profile management ────────────────────────────────────────────

  function recomputeWeakAreas(profile) {
    profile.weakAreas = Object.entries(profile.topicHistory)
      .filter(([_, data]) => data.attempts >= 3 && (data.passes / data.attempts) < 0.5)
      .map(([id]) => {
        const topic = GIT_CURRICULUM.find(c => c.id === id);
        return topic ? topic.name : id;
      });
  }

  function updateProfileAfterChallenge(profile, challenge, passed, source, struggled, usedHelp) {
    const topicId = challenge.topic || 'unknown';

    if (typeof SpacedRepetition !== 'undefined') SpacedRepetition.migrateProfile(profile);

    if (!profile.topicHistory[topicId]) {
      profile.topicHistory[topicId] = { attempts: 0, passes: 0, fails: 0, lastSeen: null };
    }
    const th = profile.topicHistory[topicId];
    th.attempts++;
    if (passed) th.passes++;
    else th.fails++;
    th.lastSeen = Date.now();

    if (typeof SpacedRepetition !== 'undefined') {
      SpacedRepetition.updateConfidence(th, passed, !!struggled, !!usedHelp);
    }

    if (challenge.conceptIntroduced && !profile.conceptsIntroduced.includes(challenge.conceptIntroduced)) {
      profile.conceptsIntroduced.push(challenge.conceptIntroduced);
    }

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

    // Advance curriculum: confidence-aware advancement
    const currentTopic = GIT_CURRICULUM[profile.currentTopicIndex];
    if (currentTopic && passed) {
      const topicData = profile.topicHistory[currentTopic.id];
      const hasConfidence = topicData && typeof topicData.confidenceLevel === 'number';
      const shouldAdvance = hasConfidence
        ? (topicData.consecutivePasses >= 3 || topicData.confidenceLevel >= 3)
        : (topicData && topicData.passes >= 3);
      if (shouldAdvance && profile.currentTopicIndex < GIT_CURRICULUM.length - 1) {
        profile.currentTopicIndex++;
      }
    }

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
      topicStats.attempts = Math.max(0, topicStats.attempts - attemptsToRemove.length);
      topicStats.passes = Math.max(0, topicStats.passes - removedPasses);
      topicStats.fails = Math.max(0, topicStats.fails - (attemptsToRemove.length - removedPasses));

      if (topicStats.attempts === 0 && topicStats.passes === 0 && topicStats.fails === 0) {
        delete profile.topicHistory[topicId];
      }
    }

    recomputeWeakAreas(profile);
    return profile;
  }

  // ── Public API ────────────────────────────────────────────────────

  async function getChallenge(profile, isSettingsGate) {
    const aiChallenge = await generateFromClaude(profile, isSettingsGate);
    if (aiChallenge) {
      return { challenge: aiChallenge, source: 'claude' };
    }

    await loadLocal();
    const local = pickLocal(profile);
    if (local) {
      return { challenge: local, source: 'local' };
    }

    return { challenge: null, source: 'none' };
  }

  return {
    getChallenge,
    updateProfileAfterChallenge,
    removeChallengeAttempts,
    defaultProfile,
    GIT_CURRICULUM
  };
})();
