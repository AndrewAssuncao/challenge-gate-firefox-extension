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
    // Tier 1 — Shell Basics (paths first — you need to understand paths before cd)
    { id: 'paths', name: 'Relative and absolute paths', tier: 1,
      concepts: ['absolute paths starting with /', 'relative paths and current directory (.)', 'parent directory (..)', 'home directory (~)', 'path separator and path construction', 'tab completion for paths'],
      progressionSignal: 'Navigate using relative and absolute paths, understand ~, ., and .. without confusion.' },
    { id: 'navigation', name: 'Navigation (pwd, ls, cd)', tier: 1,
      concepts: ['pwd to print working directory', 'cd with relative and absolute paths', 'cd - to go back, cd ~ to go home', 'ls basic listing', 'ls flags (-l, -a, -h, -R)', 'combining ls flags for detailed output'],
      progressionSignal: 'Navigate freely between directories and read ls -la output.' },
    { id: 'file_creation', name: 'Creating files and directories (touch, mkdir)', tier: 1,
      concepts: ['touch to create empty files', 'mkdir to create directories', 'mkdir -p for nested directories', 'echo with redirection to create files with content', 'file naming conventions (no spaces, lowercase)', 'creating multiple files/dirs at once'],
      progressionSignal: 'Create files and directory structures efficiently using touch, mkdir -p, and echo.' },
    { id: 'file_reading', name: 'Reading files (cat, echo, head, tail)', tier: 1,
      concepts: ['cat to display file contents', 'head and tail with -n flag', 'less for paging through files', 'echo for printing text', 'wc for counting lines/words/chars', 'file command to check file type'],
      progressionSignal: 'Read and inspect files of any size using the right tool for the job.' },
    { id: 'help_man', name: 'Getting help (man, --help, which)', tier: 1,
      concepts: ['man pages and navigating them', '--help flag convention', 'which and type to find command locations', 'reading command synopsis (brackets = optional, ... = repeatable)', 'searching man pages with /', 'tldr for quick summaries'],
      progressionSignal: 'Look up any unfamiliar command independently using man, --help, or which.' },

    // Tier 2 — File Operations
    { id: 'copy_move', name: 'Copying and moving (cp, mv)', tier: 2,
      concepts: ['cp file to new location', 'cp -r for directories', 'mv for moving and renaming', 'overwrite behavior and -i flag', 'copying multiple files to a directory', 'preserving permissions with cp -p'],
      progressionSignal: 'Copy and move files/directories confidently, including recursive operations.' },
    { id: 'remove_find', name: 'Removing and finding (rm, find)', tier: 2,
      concepts: ['rm for files, rm -r for directories', 'rm -i for safe deletion', 'find by name (-name, -iname)', 'find by type (-type f, -type d)', 'find by time (-mtime, -newer)', 'find with -exec for actions on results'],
      progressionSignal: 'Remove files safely and construct find commands with multiple criteria and actions.' },
    { id: 'grep_search', name: 'Searching text (grep)', tier: 2,
      concepts: ['grep for pattern in file', 'grep -r for recursive search', 'grep -i for case-insensitive', 'grep -n for line numbers, -l for filenames only', 'grep -E for extended regex', 'grep -v for inverted matches'],
      progressionSignal: 'Search codebases with grep using regex, recursion, and output formatting flags.' },
    { id: 'permissions', name: 'Permissions (chmod, chown, ls -l)', tier: 2,
      concepts: ['reading ls -l permission string (rwxrwxrwx)', 'user, group, other permission model', 'chmod with symbolic mode (u+x, go-w)', 'chmod with octal mode (755, 644)', 'chown for changing ownership', 'umask for default permissions'],
      progressionSignal: 'Read and set file permissions using both symbolic and octal notation.' },
    { id: 'redirection', name: 'Redirection and pipes (>, >>, |)', tier: 2,
      concepts: ['stdout redirection (> and >>)', 'stdin redirection (<)', 'stderr redirection (2> and 2>&1)', 'pipes (|) to chain commands', '/dev/null for discarding output', 'tee for splitting output to file and stdout'],
      progressionSignal: 'Chain commands with pipes, redirect stdout/stderr independently, and use tee.' },

    // Tier 3 — Power User
    { id: 'text_processing', name: 'Text processing (sort, uniq, wc, cut)', tier: 3,
      concepts: ['sort (-n, -r, -k, -t for field sorting)', 'uniq (-c for counts, -d for duplicates)', 'cut (-d delimiter, -f fields)', 'tr for character translation and deletion', 'paste and column for formatting', 'chaining text tools with pipes'],
      progressionSignal: 'Extract, transform, and analyze text data by chaining sort/uniq/cut/tr in pipelines.' },
    { id: 'processes', name: 'Process management (ps, kill, jobs, bg, fg)', tier: 3,
      concepts: ['ps aux and reading process listings', 'kill with signal numbers (SIGTERM, SIGKILL)', 'running commands in background (&)', 'jobs, fg, bg for job control', 'Ctrl+C (SIGINT) and Ctrl+Z (SIGTSTP)', 'nohup and disown for persistent processes'],
      progressionSignal: 'Find and manage processes, use job control, and keep processes running after logout.' },
    { id: 'environment', name: 'Environment variables (export, PATH, env)', tier: 3,
      concepts: ['viewing env variables (echo $VAR, env, printenv)', 'setting variables (VAR=value, export VAR=value)', 'PATH variable and how commands are found', 'modifying PATH safely', '.env files and source command', 'variable expansion and quoting ("$VAR" vs \'$VAR\')'],
      progressionSignal: 'Manage environment variables, modify PATH, and understand variable expansion and quoting.' },
    { id: 'aliases_history', name: 'Aliases, history, shell config (.zshrc)', tier: 3,
      concepts: ['alias for command shortcuts', 'persisting aliases in .zshrc', 'history command and !!, !$, !n', 'reverse search with Ctrl+R', 'shell functions vs aliases', 'source ~/.zshrc to reload config'],
      progressionSignal: 'Create aliases, write shell functions, and navigate history efficiently.' },
    { id: 'package_managers', name: 'Package managers (brew, pip, npm)', tier: 3,
      concepts: ['brew install/uninstall/update/upgrade', 'pip install, pip freeze, requirements.txt', 'npm install, package.json, node_modules', 'global vs local installation', 'version pinning and lock files', 'virtual environments (python -m venv)'],
      progressionSignal: 'Install and manage packages across brew/pip/npm. Use virtual environments and lock files.' },

    // Tier 4 — Developer Tools
    { id: 'git_basics', name: 'Git basics (init, add, commit, status, log)', tier: 4,
      concepts: ['git init and .git directory', 'git status to check state', 'git add (staging files, -p for partial)', 'git commit with message', 'git log (--oneline, --graph)', 'git diff (unstaged, staged, between commits)'],
      progressionSignal: 'Initialize repos, stage selectively, commit, and read log/diff output from the command line.' },
    { id: 'git_branching', name: 'Git branching (branch, checkout, merge)', tier: 4,
      concepts: ['git branch to list/create branches', 'git checkout / git switch to move between branches', 'git merge basics (fast-forward and 3-way)', 'resolving simple merge conflicts', 'git branch -d to delete merged branches', 'git stash for saving work in progress'],
      progressionSignal: 'Create branches, switch between them, merge, and handle basic conflicts from the CLI.' },
    { id: 'ssh', name: 'SSH (keys, config, tunneling)', tier: 4,
      concepts: ['ssh to connect to remote hosts', 'ssh-keygen for key generation', '~/.ssh/config for host aliases', 'ssh-add and ssh-agent', 'scp and rsync for file transfer', 'port forwarding (-L, -R basics)'],
      progressionSignal: 'Set up SSH keys, configure host aliases, transfer files, and use basic port forwarding.' },
    { id: 'docker_basics', name: 'Docker (images, containers, run, build)', tier: 4,
      concepts: ['docker pull and image layers', 'docker run (-d, -p, -v, --rm, -e flags)', 'docker ps and docker logs', 'docker exec for running commands in containers', 'Dockerfile basics (FROM, COPY, RUN, CMD)', 'docker build and tagging images'],
      progressionSignal: 'Run containers with proper flags, inspect logs, and build images from Dockerfiles.' },
    { id: 'curl_networking', name: 'curl, wget, and basic networking', tier: 4,
      concepts: ['curl GET requests', 'curl with headers (-H) and POST data (-d, -X POST)', 'curl output options (-o, -s, -w)', 'wget for downloading files', 'ping, traceroute, dig for DNS', 'jq for parsing JSON responses'],
      progressionSignal: 'Make API calls with curl, parse JSON with jq, and diagnose basic networking issues.' },

    // Tier 5 — Mastery
    { id: 'shell_scripting', name: 'Shell scripting (loops, conditionals, functions)', tier: 5,
      concepts: ['shebang (#!/bin/bash or #!/bin/zsh)', 'variables and parameter expansion ($1, $@, $#, $?)', 'if/then/else/fi conditionals', 'for and while loops in scripts', 'functions in shell scripts', 'exit codes and error handling (set -e, trap)'],
      progressionSignal: 'Write shell scripts with arguments, conditionals, loops, functions, and proper error handling.' },
    { id: 'git_advanced', name: 'Advanced git (rebase, cherry-pick, bisect)', tier: 5,
      concepts: ['git rebase vs merge (when to use each)', 'interactive rebase (squash, fixup, reword)', 'git cherry-pick for selective commits', 'git bisect for finding bug-introducing commits', 'git reflog for recovery', 'git reset --soft/--mixed/--hard'],
      progressionSignal: 'Rebase interactively, cherry-pick, bisect bugs, and recover from mistakes with reflog.' },
    { id: 'docker_compose', name: 'Docker compose and multi-container', tier: 5,
      concepts: ['docker-compose.yml structure (services, networks, volumes)', 'docker compose up/down/logs', 'service dependencies (depends_on)', 'environment variables and .env files', 'volume mounts for development', 'multi-stage builds for production'],
      progressionSignal: 'Define multi-service apps in compose, manage volumes, and use multi-stage builds.' },
    { id: 'sed_awk', name: 'sed and awk text processing', tier: 5,
      concepts: ['sed s/old/new/g substitution', 'sed with address ranges (line numbers, patterns)', 'sed -i for in-place editing', 'awk field splitting ($1, $2, $NF)', 'awk patterns and actions {print ...}', 'awk with BEGIN/END blocks and variables'],
      progressionSignal: 'Transform text files with sed substitutions and awk field processing.' },
    { id: 'system_debug', name: 'System debugging (lsof, netstat, dig, dmesg)', tier: 5,
      concepts: ['lsof for open file and port inspection', 'netstat/ss for network connections', 'top/htop for system resource monitoring', 'dig for DNS queries', 'strace/dtruss for system call tracing', 'dmesg for kernel messages'],
      progressionSignal: 'Diagnose port conflicts, network issues, resource usage, and DNS problems from the terminal.' }
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

  const DIFFICULTY_INSTRUCTIONS = {
    relaxed: 'Generate a quick, straightforward challenge. Single concept, minimal edge cases. The user wants a fast gate (~30 seconds).',
    normal: 'Generate an appropriately challenging exercise for the current level (~1-2 minutes).',
    hard: 'Generate a challenging exercise. Include edge cases and require deeper thinking (~3-5 minutes).',
    intense: 'Generate a demanding challenge. Combine multiple concepts, include tricky edge cases, require demonstrated mastery (~5-10 minutes).',
    brutal: 'Generate a very demanding challenge requiring multiple advanced commands combined in a pipeline. Include subtle edge cases and realistic production debugging scenarios (~10-20 minutes).',
    marathon: 'Generate an extensive, multi-step scenario that tests deep terminal mastery. Require sustained focus, complex pipelines, multi-tool integration, and thorough problem solving (~20-40 minutes).'
  };

  function buildMentorPrompt(profile, isSettingsGate, crossDisciplineContext, scheduledDifficulty, reinforceOnly) {
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
      .map(c => `  - ${c.topic}: ${c.summary || (c.passed ? 'passed' : 'failed')}`)
      .join('\n');

    const conceptsList = profile.conceptsIntroduced.slice(-20).join(', ');
    const weakList = profile.weakAreas.join(', ');
    const difficulty = isSettingsGate
      ? 'harder than usual (this is a settings-gate challenge)'
      : (DIFFICULTY_INSTRUCTIONS[scheduledDifficulty] || DIFFICULTY_INSTRUCTIONS.normal);

    // Sub-concept coverage for current topic
    const topicConcepts = currentTopic.concepts || [];
    const introduced = profile.conceptsIntroduced || [];
    const nextConcept = topicConcepts.find(c => !introduced.includes(c));
    const conceptProgress = topicConcepts.length > 0
      ? topicConcepts.map(c => `  ${introduced.includes(c) ? '✓' : '○'} ${c}`).join('\n')
      : '';

    return `You are a terminal/shell mentor embedded in a browser extension. The user must solve your challenge to access a blocked site. Your job is to genuinely teach them to master the terminal — not just test them.

## Context
The user uses macOS with Oh My Zsh, iTerm2, zsh-autosuggestions, zsh-syntax-highlighting, z plugin, and aliases plugin. They run a full-stack startup (Python + JS/TS) and need versatile terminal skills for development, deployment, and debugging.

## Your Teaching Style
- Concise, dry, intelligent. No fake enthusiasm.
- Introduce ONE new concept or technique per challenge when appropriate.
- When the user is learning something new, briefly explain the concept AND show the exact command syntax with a brief example before the task. Don't just explain what a command does — show how to type it. E.g. "The find command locates files by criteria. Syntax: find <path> -name '<pattern>'. Example: find /var/log -name '*.log' lists all .log files under /var/log."
- The syntax example should differ from the challenge so the user still needs to think.
- When reinforcing, just give the scenario.
- Gradually increase complexity within a topic before moving to the next.
- Frame scenarios realistically: debugging a deploy, managing a project, setting up a dev environment.

## Current Topic: ${currentTopic.name} (Tier ${tier}/5)
Curriculum position: ${profile.currentTopicIndex + 1}/${TERMINAL_CURRICULUM.length}
Total challenge attempts: ${profile.totalSessions}
${conceptProgress ? `
Sub-concepts to cover in order (introduce ONE per challenge):
${conceptProgress}
${nextConcept ? `Next to introduce: "${nextConcept}". Teach this with syntax + example, then build a challenge around it.` : 'All sub-concepts covered. Focus on mastery, edge cases, and harder variants.'}` : ''}
${currentTopic.progressionSignal ? `Mastery signal — advance when the user can: ${currentTopic.progressionSignal}` : ''}

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
${reinforceOnly ? '\nREINFORCE MODE: Do NOT introduce new concepts. Focus exclusively on reinforcing known commands and techniques. Combine familiar tools in novel pipelines, test edge cases, and require more sophisticated solutions using only concepts from the "Concepts Already Introduced" list.\n' : ''}
${profile.totalSessions === 0 ? 'This is the user\'s FIRST terminal challenge ever. Start simple and welcoming (but not cheery). Briefly explain what the terminal is and what they\'re about to do.' : ''}
${profile.weakAreas.length > 0 ? `Consider revisiting: ${weakList}` : ''}

${!reinforceOnly ? 'If the user has been passing consistently on this topic (3+ passes), introduce a harder variant or transition to the next concept.' : ''}

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
  "conceptIntroduced": "EXACT string from sub-concepts list above, or null if reinforcing",
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

  async function generateFromClaude(profile, isSettingsGate, scheduledDifficulty, reinforceOnly) {
    const currentTopic = TERMINAL_CURRICULUM[profile.currentTopicIndex] || TERMINAL_CURRICULUM[0];
    const useOpus = currentTopic.tier >= 5;

    // Fetch cross-discipline context
    let crossCtx = '';
    if (typeof CrossDiscipline !== 'undefined') {
      try {
        const [pyProfile, gitProfile] = await Promise.all([
          browser.runtime.sendMessage({ type: 'getLearningProfile' }),
          browser.runtime.sendMessage({ type: 'getGitLearningProfile' })
        ]);
        crossCtx = CrossDiscipline.getContext('terminal', currentTopic.id, {
          python: pyProfile, terminal: profile, git: gitProfile
        });
      } catch {}
    }

    const prompt = buildMentorPrompt(profile, isSettingsGate, crossCtx, scheduledDifficulty, reinforceOnly);

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

  function updateProfileAfterChallenge(profile, challenge, passed, source, struggled, usedHelp, summary) {
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
      summary: summary || null,
      timestamp: Date.now()
    });
    if (profile.recentChallenges.length > 15) {
      profile.recentChallenges = profile.recentChallenges.slice(-15);
    }

    // Advance curriculum: move forward when the current topic is learned
    if (passed && profile.currentTopicIndex < TERMINAL_CURRICULUM.length - 1) {
      const currentTopic = TERMINAL_CURRICULUM[profile.currentTopicIndex];
      const topicData = currentTopic ? profile.topicHistory[currentTopic.id] : null;
      const hasConfidence = topicData && typeof topicData.confidenceLevel === 'number';
      const shouldAdvance = hasConfidence
        ? (topicData.confidenceLevel >= 2 || topicData.passes >= 2)
        : (topicData && topicData.passes >= 2);

      if (shouldAdvance) {
        profile.currentTopicIndex++;
        while (profile.currentTopicIndex < TERMINAL_CURRICULUM.length - 1) {
          const nextTopic = TERMINAL_CURRICULUM[profile.currentTopicIndex];
          const nextData = profile.topicHistory[nextTopic.id];
          if (nextData && nextData.passes >= 2) profile.currentTopicIndex++;
          else break;
        }
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

  async function getChallenge(profile, isSettingsGate, scheduledDifficulty, reinforceOnly) {
    const aiChallenge = await generateFromClaude(profile, isSettingsGate, scheduledDifficulty, reinforceOnly);
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
