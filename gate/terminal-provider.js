/* Terminal Challenge Provider — Claude-powered terminal mentor.

   Maintains a learning profile of what the user knows about terminal/shell
   usage, and where they are in a structured curriculum.
   Sends this context to Claude so it can teach progressively.

   When offline or API fails, falls back to the local problem bank.
   If both fail, the gate falls back to the typing challenge. */

'use strict';

const TerminalChallengeProvider = (() => {

  // ── Curriculum structure ────────────────────────────────────────────────
  // Ordered topics. The mentor advances through these, but can revisit.

  const TERMINAL_CURRICULUM = [
    // Tier 1 — Shell Basics
    { id: 'navigation',       name: 'Navigation (pwd, ls, cd)',                        tier: 1 },
    { id: 'file_creation',    name: 'Creating files and directories (touch, mkdir)',    tier: 1 },
    { id: 'file_reading',     name: 'Reading files (cat, echo, head, tail)',            tier: 1 },
    { id: 'paths',            name: 'Relative and absolute paths',                     tier: 1 },
    { id: 'help_man',         name: 'Getting help (man, --help, which)',               tier: 1 },

    // Tier 2 — File Operations
    { id: 'copy_move',        name: 'Copying and moving (cp, mv)',                     tier: 2 },
    { id: 'remove_find',      name: 'Removing and finding (rm, find)',                 tier: 2 },
    { id: 'grep_search',      name: 'Searching text (grep)',                           tier: 2 },
    { id: 'permissions',      name: 'Permissions (chmod, chown, ls -l)',               tier: 2 },
    { id: 'redirection',      name: 'Redirection and pipes (>, >>, |)',                tier: 2 },

    // Tier 3 — Power User
    { id: 'text_processing',  name: 'Text processing (sort, uniq, wc, cut)',           tier: 3 },
    { id: 'processes',        name: 'Process management (ps, kill, jobs, bg, fg)',      tier: 3 },
    { id: 'environment',      name: 'Environment variables (export, PATH, env)',        tier: 3 },
    { id: 'aliases_history',  name: 'Aliases, history, shell config (.zshrc)',          tier: 3 },
    { id: 'package_managers', name: 'Package managers (brew, pip, npm)',                tier: 3 },

    // Tier 4 — Developer Tools
    { id: 'git_basics',       name: 'Git basics (init, add, commit, status, log)',     tier: 4 },
    { id: 'git_branching',    name: 'Git branching (branch, checkout, merge)',          tier: 4 },
    { id: 'ssh',              name: 'SSH (keys, config, tunneling)',                    tier: 4 },
    { id: 'docker_basics',    name: 'Docker (images, containers, run, build)',          tier: 4 },
    { id: 'curl_networking',  name: 'curl, wget, and basic networking',                tier: 4 },

    // Tier 5 — Mastery
    { id: 'shell_scripting',  name: 'Shell scripting (loops, conditionals, functions)', tier: 5 },
    { id: 'git_advanced',     name: 'Advanced git (rebase, cherry-pick, bisect)',       tier: 5 },
    { id: 'docker_compose',   name: 'Docker compose and multi-container',              tier: 5 },
    { id: 'sed_awk',          name: 'sed and awk text processing',                     tier: 5 },
    { id: 'system_debug',     name: 'System debugging (lsof, netstat, dig, dmesg)',    tier: 5 }
  ];

  // ── Default learning profile ────────────────────────────────────────────

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

  // ── Build mentor prompt ─────────────────────────────────────────────────

  function buildMentorPrompt(profile, isSettingsGate) {
    const currentTopic = TERMINAL_CURRICULUM[profile.currentTopicIndex] || TERMINAL_CURRICULUM[0];
    const tier = currentTopic.tier;

    const reviewContext = (typeof SpacedRepetition !== 'undefined')
      ? SpacedRepetition.buildReviewContext(profile, TERMINAL_CURRICULUM)
      : '';

    const topicSummary = Object.entries(profile.topicHistory)
      .map(([id, data]) => {
        const topic = TERMINAL_CURRICULUM.find(c => c.id === id);
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

    return `You are a terminal/shell mentor embedded in a browser extension. The user must solve your challenge to access a blocked site. Your job is to genuinely teach them to master the terminal — not just test them.

## Context
The user uses macOS with Oh My Zsh, iTerm2, zsh-autosuggestions, zsh-syntax-highlighting, z plugin, and aliases plugin. They run a full-stack startup (Python + JS/TS) and need versatile terminal skills for development, deployment, and debugging.

## Your Teaching Style
- Concise, dry, intelligent. No fake enthusiasm.
- Introduce ONE new concept or technique per challenge when appropriate.
- When the user is learning something new, briefly explain the concept (2-3 sentences max) before the task.
- When reinforcing, just give the scenario.
- Gradually increase complexity within a topic before moving to the next.
- Frame scenarios realistically: debugging a deploy, managing a project, setting up a dev environment.

## Current Curriculum Position
Topic: ${currentTopic.name} (Tier ${tier}/5)
Curriculum position: ${profile.currentTopicIndex + 1}/${TERMINAL_CURRICULUM.length}
Total sessions: ${profile.totalSessions}

## What the User Knows
${topicSummary || '  (New user — no history yet)'}

## Concepts Already Introduced
${conceptsList || '(None yet)'}

## Weak Areas
${weakList || '(None identified)'}

## Recent Challenges
${recentSummary || '  (None yet)'}
${reviewContext}
## Instructions
Generate a challenge that is ${difficulty}. Focus on the current topic: "${currentTopic.name}".

${profile.totalSessions === 0 ? 'This is the user\'s FIRST terminal challenge ever. Start simple and welcoming (but not cheery). Briefly explain what the terminal is and what they\'re about to do.' : ''}
${profile.weakAreas.length > 0 ? `Consider revisiting: ${weakList}` : ''}

If the user has been passing consistently on this topic (3+ passes), introduce a harder variant or transition to the next concept.

The challenge runs in a simulated shell environment with a virtual filesystem. The user types real commands and sees output. You define the filesystem state and objectives.

Validation types you can use in objectives:
- "cwd": check the user's current working directory matches "expected" path
- "outputContains": check the last command's output contains "expected" string
- "outputEquals": check the last command's output exactly equals "expected" (trimmed)
- "fileExists": check a file exists at "expected" path
- "fileContains": check file at "path" contains "expected" string
- "commandUsed": check the user ran a command matching "expected" regex pattern
- "exitCode": check the last command's exit code equals "expected" number

Respond with ONLY valid JSON (no markdown fences, no commentary):
{
  "id": "tm-<unique-8-char-id>",
  "topic": "${currentTopic.id}",
  "tier": ${tier},
  "conceptIntroduced": "brief name of new concept if any, or null",
  "teachingNote": "1-3 sentence explanation of a concept IF introducing something new. null if just reinforcing.",
  "scenario": "A realistic scenario description. What the user needs to accomplish and why.",
  "filesystem": {
    "description": "Object mapping paths to file/dir definitions. Paths starting with ~ are relative to home.",
    "example_dir": { "~/projects/myapp": { "type": "dir" } },
    "example_file": { "~/projects/myapp/README.md": { "type": "file", "content": "# My App\\nA sample project." } }
  },
  "startDir": "~/projects",
  "objectives": [
    {
      "description": "Human-readable description of what to do",
      "validation": { "type": "cwd|outputContains|fileExists|fileContains|commandUsed|exitCode", "expected": "value", "path": "optional, for fileContains" }
    }
  ],
  "hints": ["Subtle hint", "More direct hint"],
  "afterSolve": "1-2 sentence note about what they just learned or a tip. Shown after passing."
}

IMPORTANT: The "filesystem" field must be a flat object mapping path strings to { "type": "dir" } or { "type": "file", "content": "..." }. Do NOT nest it or include description/example fields. Example:
{
  "filesystem": {
    "~/projects": { "type": "dir" },
    "~/projects/app.py": { "type": "file", "content": "print('hello')" }
  }
}`;
  }

  // ── Sanitize challenge from Claude or local ────────────────────────────

  function sanitizeChallenge(challenge) {
    if (!challenge || typeof challenge !== 'object') return null;

    const sanitized = {
      ...challenge,
      id: String(challenge.id || `tm-${Math.random().toString(36).slice(2, 10)}`),
      scenario: String(challenge.scenario || ''),
      teachingNote: challenge.teachingNote ? String(challenge.teachingNote) : null,
      conceptIntroduced: challenge.conceptIntroduced ? String(challenge.conceptIntroduced) : null,
      afterSolve: challenge.afterSolve ? String(challenge.afterSolve) : '',
      startDir: String(challenge.startDir || '~'),
      tier: Number(challenge.tier) || 1
    };

    if (!sanitized.scenario) return null;

    // Validate filesystem overlay
    if (challenge.filesystem && typeof challenge.filesystem === 'object') {
      const fs = {};
      for (const [path, entry] of Object.entries(challenge.filesystem)) {
        if (entry && typeof entry === 'object' && entry.type) {
          fs[path] = entry;
        }
      }
      sanitized.filesystem = fs;
    } else {
      sanitized.filesystem = {};
    }

    // Validate objectives
    const objectives = Array.isArray(challenge.objectives) ? challenge.objectives : [];
    sanitized.objectives = objectives
      .map(obj => {
        if (!obj || !obj.validation || !obj.validation.type) return null;
        const validTypes = ['cwd', 'outputContains', 'outputEquals', 'fileExists', 'fileContains', 'commandUsed', 'exitCode'];
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

  // ── Generate via Claude API ────────────────────────────────────────────

  async function generateFromClaude(profile, isSettingsGate) {
    const prompt = buildMentorPrompt(profile, isSettingsGate);
    const currentTopic = TERMINAL_CURRICULUM[profile.currentTopicIndex] || TERMINAL_CURRICULUM[0];
    const useOpus = currentTopic.tier >= 5;

    try {
      const response = await browser.runtime.sendMessage({
        type: 'claudeGenerate',
        prompt: prompt,
        model: useOpus ? 'claude-opus-4-20250514' : undefined,
        maxTokens: useOpus ? 2048 : undefined
      });

      if (response.error) {
        console.error('[TerminalMentor] Claude API error:', response.error);
        return null;
      }

      const content = response.content;
      if (!content) return null;

      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const challenge = sanitizeChallenge(JSON.parse(cleaned));

      if (!challenge || !challenge.scenario || !challenge.objectives.length) {
        console.error('[TerminalMentor] Invalid challenge structure');
        return null;
      }

      return challenge;
    } catch (err) {
      console.error('[TerminalMentor] Generation failed:', err);
      return null;
    }
  }

  // ── Local fallback ────────────────────────────────────────────────────

  let localProblems = null;

  async function loadLocal() {
    if (localProblems) return;
    try {
      const resp = await fetch(browser.runtime.getURL('gate/challenges/terminal-problems.json'));
      localProblems = await resp.json();
    } catch {
      localProblems = [];
    }
  }

  function pickLocal(profile) {
    if (!localProblems || localProblems.length === 0) return null;
    const completed = profile.recentChallenges.map(c => c.id);
    const tier = (TERMINAL_CURRICULUM[profile.currentTopicIndex] || TERMINAL_CURRICULUM[0]).tier;

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

  // ── Profile management ────────────────────────────────────────────────

  function recomputeWeakAreas(profile) {
    profile.weakAreas = Object.entries(profile.topicHistory)
      .filter(([_, data]) => data.attempts >= 3 && (data.passes / data.attempts) < 0.5)
      .map(([id]) => {
        const topic = TERMINAL_CURRICULUM.find(c => c.id === id);
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
    const currentTopic = TERMINAL_CURRICULUM[profile.currentTopicIndex];
    if (currentTopic && passed) {
      const topicData = profile.topicHistory[currentTopic.id];
      const hasConfidence = topicData && typeof topicData.confidenceLevel === 'number';
      const shouldAdvance = hasConfidence
        ? (topicData.consecutivePasses >= 3 || topicData.confidenceLevel >= 3)
        : (topicData && topicData.passes >= 3);
      if (shouldAdvance && profile.currentTopicIndex < TERMINAL_CURRICULUM.length - 1) {
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

  // ── Public API ────────────────────────────────────────────────────────

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
    TERMINAL_CURRICULUM
  };
})();
