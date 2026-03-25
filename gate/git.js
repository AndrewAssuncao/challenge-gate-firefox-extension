/* Challenge Gate — Git Challenge Engine

   Simulated Git environment with in-memory repository model,
   SVG branch graph visualization, and objective-based validation. */

'use strict';

const GitChallenge = (() => {
  // ── State ─────────────────────────────────────────────────────────────
  let config = null;
  let challenge = null;
  let challengeSource = null;
  let profile = null;
  let challengeResolved = false;
  let hintsUsed = 0;
  let commandHistory = [];
  let historyIndex = -1;
  let lastExitCode = 0;
  let lastOutput = '';
  let commandsExecuted = [];
  let challengeStartTime = 0;
  let helpUsedThisChallenge = false;

  // ── Git Simulator ───────────────────────────────────────────────────

  const GitSim = (() => {
    let commits = new Map();     // SHA → { message, parents: [SHA], timestamp }
    let branches = new Map();    // name → SHA
    let HEAD = { type: 'branch', ref: 'main' };
    let staging = new Set();     // filenames
    let workingTree = new Map(); // filename → 'modified'|'new'|'deleted'
    let stash = [];              // [{ message, workingTree: Map snapshot }]
    let tags = new Map();        // name → SHA

    function generateSHA() {
      const chars = '0123456789abcdef';
      let sha = '';
      for (let i = 0; i < 7; i++) sha += chars[Math.floor(Math.random() * 16)];
      return sha;
    }

    function getHEADsha() {
      if (HEAD.type === 'branch') return branches.get(HEAD.ref) || null;
      return HEAD.ref;
    }

    function init(state) {
      commits = new Map();
      branches = new Map();
      staging = new Set();
      workingTree = new Map();
      stash = [];
      tags = new Map();

      if (!state) {
        HEAD = { type: 'branch', ref: 'main' };
        return;
      }

      // Load commits
      if (Array.isArray(state.commits)) {
        for (const c of state.commits) {
          commits.set(c.sha, {
            message: c.message || '',
            parents: Array.isArray(c.parents) ? [...c.parents] : [],
            timestamp: c.timestamp || Date.now()
          });
        }
      }

      // Load branches
      if (state.branches && typeof state.branches === 'object') {
        for (const [name, sha] of Object.entries(state.branches)) {
          branches.set(name, sha);
        }
      }

      // Load HEAD
      if (state.HEAD) {
        HEAD = { type: state.HEAD.type || 'branch', ref: state.HEAD.ref || 'main' };
      } else {
        HEAD = { type: 'branch', ref: 'main' };
      }

      // Load tags
      if (state.tags && typeof state.tags === 'object') {
        for (const [name, sha] of Object.entries(state.tags)) {
          tags.set(name, sha);
        }
      }

      // Load working tree / staging
      if (state.workingTree && typeof state.workingTree === 'object') {
        for (const [f, s] of Object.entries(state.workingTree)) {
          workingTree.set(f, s);
        }
      }
      if (Array.isArray(state.staging)) {
        for (const f of state.staging) staging.add(f);
      }
    }

    function serialize() {
      const commitArr = [];
      for (const [sha, data] of commits) {
        commitArr.push({ sha, message: data.message, parents: [...data.parents], timestamp: data.timestamp });
      }
      const branchObj = {};
      for (const [name, sha] of branches) branchObj[name] = sha;
      const tagObj = {};
      for (const [name, sha] of tags) tagObj[name] = sha;
      const wt = {};
      for (const [f, s] of workingTree) wt[f] = s;
      return {
        commits: commitArr,
        branches: branchObj,
        HEAD: { ...HEAD },
        tags: tagObj,
        workingTree: Object.keys(wt).length > 0 ? wt : undefined,
        staging: staging.size > 0 ? [...staging] : undefined
      };
    }

    function resolveRef(ref) {
      if (!ref) return null;
      if (ref === 'HEAD') return getHEADsha();
      if (branches.has(ref)) return branches.get(ref);
      if (tags.has(ref)) return tags.get(ref);
      // Try partial SHA match
      for (const sha of commits.keys()) {
        if (sha.startsWith(ref)) return sha;
      }
      // HEAD~N syntax
      const tildeMatch = ref.match(/^HEAD~(\d+)$/);
      if (tildeMatch) {
        let current = getHEADsha();
        let n = parseInt(tildeMatch[1], 10);
        while (n > 0 && current) {
          const commit = commits.get(current);
          if (!commit || commit.parents.length === 0) return null;
          current = commit.parents[0];
          n--;
        }
        return current;
      }
      return null;
    }

    // Get the ancestry chain from a commit
    function getAncestors(sha) {
      const visited = new Set();
      const queue = [sha];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        const commit = commits.get(current);
        if (commit) {
          for (const p of commit.parents) queue.push(p);
        }
      }
      return visited;
    }

    // Check if ancestor is reachable from descendant
    function isAncestor(ancestor, descendant) {
      return getAncestors(descendant).has(ancestor);
    }

    // Find merge base of two commits
    function findMergeBase(sha1, sha2) {
      const ancestors1 = getAncestors(sha1);
      const queue = [sha2];
      const visited = new Set();
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);
        if (ancestors1.has(current)) return current;
        const commit = commits.get(current);
        if (commit) {
          for (const p of commit.parents) queue.push(p);
        }
      }
      return null;
    }

    return {
      init,
      serialize,
      generateSHA,
      getHEADsha,
      resolveRef,
      isAncestor,
      findMergeBase,
      getAncestors,

      get commits() { return commits; },
      get branches() { return branches; },
      get HEAD() { return HEAD; },
      set HEAD(v) { HEAD = v; },
      get staging() { return staging; },
      get workingTree() { return workingTree; },
      get stash() { return stash; },
      get tags() { return tags; }
    };
  })();

  // ── Git Commands ────────────────────────────────────────────────────

  const GIT_COMMANDS = {
    init() {
      if (GitSim.commits.size > 0) {
        return { stderr: 'Reinitialized existing Git repository', exitCode: 0 };
      }
      const sha = GitSim.generateSHA();
      GitSim.commits.set(sha, { message: 'Initial commit', parents: [], timestamp: Date.now() });
      GitSim.branches.set('main', sha);
      GitSim.HEAD = { type: 'branch', ref: 'main' };
      return { stdout: 'Initialized empty Git repository', exitCode: 0 };
    },

    status() {
      const headSha = GitSim.getHEADsha();
      const branchName = GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : null;
      const lines = [];

      if (branchName) {
        lines.push(`On branch ${branchName}`);
      } else {
        lines.push(`HEAD detached at ${headSha ? headSha.slice(0, 7) : '(unknown)'}`);
      }

      if (GitSim.staging.size > 0) {
        lines.push('');
        lines.push('Changes to be committed:');
        for (const f of GitSim.staging) {
          const status = GitSim.workingTree.get(f) || 'new file';
          lines.push(`  ${status}:   ${f}`);
        }
      }

      if (GitSim.workingTree.size > 0) {
        const unstaged = [...GitSim.workingTree.entries()].filter(([f]) => !GitSim.staging.has(f));
        if (unstaged.length > 0) {
          lines.push('');
          lines.push('Changes not staged for commit:');
          for (const [f, status] of unstaged) {
            lines.push(`  ${status}:   ${f}`);
          }
        }
      }

      if (GitSim.staging.size === 0 && GitSim.workingTree.size === 0) {
        lines.push('nothing to commit, working tree clean');
      }

      return { stdout: lines.join('\n'), exitCode: 0 };
    },

    add(args) {
      if (args.length === 0) return { stderr: 'Nothing specified, nothing added.', exitCode: 1 };

      if (args[0] === '.' || args[0] === '-A' || args[0] === '--all') {
        // Stage everything in working tree
        for (const [f] of GitSim.workingTree) {
          GitSim.staging.add(f);
        }
        // If working tree is empty, simulate adding a new file
        if (GitSim.workingTree.size === 0) {
          GitSim.workingTree.set('changes.txt', 'new');
          GitSim.staging.add('changes.txt');
        }
        return { stdout: '', exitCode: 0 };
      }

      for (const file of args) {
        if (file.startsWith('-')) continue;
        if (!GitSim.workingTree.has(file)) {
          // Simulate adding a new file
          GitSim.workingTree.set(file, 'new');
        }
        GitSim.staging.add(file);
      }
      return { stdout: '', exitCode: 0 };
    },

    commit(args) {
      let message = '';
      for (let i = 0; i < args.length; i++) {
        if ((args[i] === '-m' || args[i] === '--message') && args[i + 1]) {
          message = args[++i].replace(/^["']|["']$/g, '');
        } else if (args[i] === '--allow-empty') {
          // Allow empty commits
        } else if (args[i] === '--amend') {
          const headSha = GitSim.getHEADsha();
          if (!headSha) return { stderr: 'fatal: no commits to amend', exitCode: 1 };
          const headCommit = GitSim.commits.get(headSha);
          if (!message) message = headCommit.message;
          const newSha = GitSim.generateSHA();
          GitSim.commits.set(newSha, {
            message,
            parents: [...headCommit.parents],
            timestamp: Date.now()
          });
          // Update branch pointer
          if (GitSim.HEAD.type === 'branch') {
            GitSim.branches.set(GitSim.HEAD.ref, newSha);
          } else {
            GitSim.HEAD = { type: 'detached', ref: newSha };
          }
          GitSim.staging.clear();
          GitSim.workingTree.clear();
          return { stdout: `[${GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : 'HEAD'} ${newSha}] ${message}`, exitCode: 0 };
        }
      }

      if (!message) return { stderr: 'Aborting commit due to empty commit message.', exitCode: 1 };

      if (GitSim.staging.size === 0) {
        return { stderr: 'nothing to commit, working tree clean\n(use "git add" to stage changes)', exitCode: 1 };
      }

      const headSha = GitSim.getHEADsha();
      const parents = headSha ? [headSha] : [];
      const newSha = GitSim.generateSHA();

      GitSim.commits.set(newSha, { message, parents, timestamp: Date.now() });

      if (GitSim.HEAD.type === 'branch') {
        GitSim.branches.set(GitSim.HEAD.ref, newSha);
      } else {
        GitSim.HEAD = { type: 'detached', ref: newSha };
      }

      const fileCount = GitSim.staging.size;
      GitSim.staging.clear();
      // Clear committed files from working tree
      for (const f of [...GitSim.workingTree.keys()]) {
        if (GitSim.staging.has(f) || !GitSim.staging.size) {
          GitSim.workingTree.delete(f);
        }
      }
      GitSim.workingTree.clear();

      const branch = GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : 'HEAD';
      return { stdout: `[${branch} ${newSha}] ${message}\n ${fileCount} file(s) changed`, exitCode: 0 };
    },

    log(args) {
      let oneline = args.includes('--oneline');
      let graphMode = args.includes('--graph');
      let allBranches = args.includes('--all');
      let maxCount = -1;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n' && args[i + 1]) maxCount = parseInt(args[i + 1], 10);
        else if (args[i].startsWith('-n') && args[i].length > 2) maxCount = parseInt(args[i].slice(2), 10);
      }

      // Collect starting points
      const startShas = new Set();
      if (allBranches) {
        for (const sha of GitSim.branches.values()) startShas.add(sha);
      } else {
        const headSha = GitSim.getHEADsha();
        if (headSha) startShas.add(headSha);
      }

      if (startShas.size === 0) return { stdout: '', exitCode: 0 };

      // Topological sort
      const visited = new Set();
      const sorted = [];
      function dfs(sha) {
        if (!sha || visited.has(sha)) return;
        visited.add(sha);
        const commit = GitSim.commits.get(sha);
        if (!commit) return;
        for (const p of commit.parents) dfs(p);
        sorted.push(sha);
      }
      for (const sha of startShas) dfs(sha);
      sorted.reverse();

      if (maxCount > 0) sorted.splice(maxCount);

      // Build branch/tag labels
      const labels = new Map();
      for (const [name, sha] of GitSim.branches) {
        if (!labels.has(sha)) labels.set(sha, []);
        labels.get(sha).push(name);
      }
      for (const [name, sha] of GitSim.tags) {
        if (!labels.has(sha)) labels.set(sha, []);
        labels.get(sha).push(`tag: ${name}`);
      }

      const headSha = GitSim.getHEADsha();
      const lines = [];
      for (const sha of sorted) {
        const commit = GitSim.commits.get(sha);
        if (!commit) continue;

        const isHead = sha === headSha;
        const refLabels = labels.get(sha) || [];
        const headLabel = isHead && GitSim.HEAD.type === 'branch'
          ? `HEAD -> ${GitSim.HEAD.ref}` : (isHead ? 'HEAD' : '');
        const allLabels = headLabel ? [headLabel, ...refLabels.filter(l => l !== GitSim.HEAD.ref)] : refLabels;
        const labelStr = allLabels.length > 0 ? ` (${allLabels.join(', ')})` : '';

        if (oneline) {
          lines.push(`${sha}${labelStr} ${commit.message}`);
        } else {
          lines.push(`commit ${sha}${labelStr}`);
          lines.push(`    ${commit.message}`);
          lines.push('');
        }
      }

      return { stdout: lines.join('\n').trimEnd(), exitCode: 0 };
    },

    branch(args) {
      // Parse flags
      let deleteFlag = false;
      let deleteName = null;
      const positional = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-d' || args[i] === '-D' || args[i] === '--delete') {
          deleteFlag = true;
          if (args[i + 1] && !args[i + 1].startsWith('-')) {
            deleteName = args[++i];
          }
        } else if (!args[i].startsWith('-')) {
          positional.push(args[i]);
        }
      }

      // Delete branch
      if (deleteFlag) {
        const name = deleteName || positional[0];
        if (!name) return { stderr: 'fatal: branch name required', exitCode: 1 };
        if (!GitSim.branches.has(name)) return { stderr: `error: branch '${name}' not found.`, exitCode: 1 };
        if (GitSim.HEAD.type === 'branch' && GitSim.HEAD.ref === name) {
          return { stderr: `error: Cannot delete branch '${name}' checked out at current HEAD`, exitCode: 1 };
        }
        GitSim.branches.delete(name);
        return { stdout: `Deleted branch ${name}`, exitCode: 0 };
      }

      // No args: list branches
      if (positional.length === 0) {
        const lines = [];
        for (const name of [...GitSim.branches.keys()].sort()) {
          const isCurrent = GitSim.HEAD.type === 'branch' && GitSim.HEAD.ref === name;
          lines.push(`${isCurrent ? '* ' : '  '}${name}`);
        }
        return { stdout: lines.join('\n'), exitCode: 0 };
      }

      // Create branch
      const name = positional[0];
      const startPoint = positional[1] ? GitSim.resolveRef(positional[1]) : GitSim.getHEADsha();
      if (!startPoint) return { stderr: `fatal: not a valid object name: '${positional[1] || 'HEAD'}'`, exitCode: 1 };
      if (GitSim.branches.has(name)) return { stderr: `fatal: A branch named '${name}' already exists.`, exitCode: 1 };
      GitSim.branches.set(name, startPoint);
      return { stdout: '', exitCode: 0 };
    },

    checkout(args) {
      let createBranch = false;
      const positional = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-b') {
          createBranch = true;
        } else if (!args[i].startsWith('-')) {
          positional.push(args[i]);
        }
      }

      if (positional.length === 0) return { stderr: 'fatal: you must specify a branch or commit', exitCode: 1 };

      const target = positional[0];

      if (createBranch) {
        const startPoint = positional[1] ? GitSim.resolveRef(positional[1]) : GitSim.getHEADsha();
        if (!startPoint) return { stderr: `fatal: not a valid object name: '${positional[1] || 'HEAD'}'`, exitCode: 1 };
        if (GitSim.branches.has(target)) return { stderr: `fatal: A branch named '${target}' already exists.`, exitCode: 1 };
        GitSim.branches.set(target, startPoint);
        GitSim.HEAD = { type: 'branch', ref: target };
        return { stdout: `Switched to a new branch '${target}'`, exitCode: 0 };
      }

      // Check if it's a branch
      if (GitSim.branches.has(target)) {
        GitSim.HEAD = { type: 'branch', ref: target };
        return { stdout: `Switched to branch '${target}'`, exitCode: 0 };
      }

      // Check if it's a resolvable ref (tag, SHA)
      const sha = GitSim.resolveRef(target);
      if (sha) {
        GitSim.HEAD = { type: 'detached', ref: sha };
        return { stdout: `Note: switching to '${target}'.\nYou are in 'detached HEAD' state.`, exitCode: 0 };
      }

      return { stderr: `error: pathspec '${target}' did not match any file(s) known to git`, exitCode: 1 };
    },

    switch(args) {
      let createBranch = false;
      const positional = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-c' || args[i] === '--create') {
          createBranch = true;
        } else if (!args[i].startsWith('-')) {
          positional.push(args[i]);
        }
      }

      if (positional.length === 0) return { stderr: 'fatal: missing branch name', exitCode: 1 };

      const target = positional[0];

      if (createBranch) {
        const startSha = GitSim.getHEADsha();
        if (!startSha) return { stderr: 'fatal: not a valid object name: HEAD', exitCode: 1 };
        if (GitSim.branches.has(target)) return { stderr: `fatal: A branch named '${target}' already exists.`, exitCode: 1 };
        GitSim.branches.set(target, startSha);
        GitSim.HEAD = { type: 'branch', ref: target };
        return { stdout: `Switched to a new branch '${target}'`, exitCode: 0 };
      }

      if (!GitSim.branches.has(target)) {
        return { stderr: `fatal: invalid reference: ${target}`, exitCode: 1 };
      }

      GitSim.HEAD = { type: 'branch', ref: target };
      return { stdout: `Switched to branch '${target}'`, exitCode: 0 };
    },

    merge(args) {
      const positional = args.filter(a => !a.startsWith('-'));
      if (positional.length === 0) return { stderr: 'fatal: missing branch to merge', exitCode: 1 };

      const targetBranch = positional[0];
      const targetSha = GitSim.resolveRef(targetBranch);
      if (!targetSha) return { stderr: `merge: ${targetBranch} - not something we can merge`, exitCode: 1 };

      const headSha = GitSim.getHEADsha();
      if (!headSha) return { stderr: 'fatal: no commits on current branch', exitCode: 1 };

      if (GitSim.HEAD.type !== 'branch') {
        return { stderr: 'fatal: cannot merge into a detached HEAD', exitCode: 1 };
      }

      // Already up to date
      if (headSha === targetSha) {
        return { stdout: 'Already up to date.', exitCode: 0 };
      }

      // Fast-forward: HEAD is ancestor of target
      if (GitSim.isAncestor(headSha, targetSha)) {
        GitSim.branches.set(GitSim.HEAD.ref, targetSha);
        return { stdout: `Updating ${headSha}..${targetSha}\nFast-forward`, exitCode: 0 };
      }

      // Target is ancestor of HEAD — already up to date
      if (GitSim.isAncestor(targetSha, headSha)) {
        return { stdout: 'Already up to date.', exitCode: 0 };
      }

      // Three-way merge: create merge commit
      const noFF = args.includes('--no-ff');
      const mergeMsg = `Merge branch '${targetBranch}'`;
      const mergeSha = GitSim.generateSHA();

      GitSim.commits.set(mergeSha, {
        message: mergeMsg,
        parents: [headSha, targetSha],
        timestamp: Date.now()
      });

      GitSim.branches.set(GitSim.HEAD.ref, mergeSha);
      return { stdout: `Merge made by the 'ort' strategy.\n[${GitSim.HEAD.ref} ${mergeSha}] ${mergeMsg}`, exitCode: 0 };
    },

    rebase(args) {
      const positional = args.filter(a => !a.startsWith('-'));
      if (positional.length === 0) return { stderr: 'fatal: missing target branch', exitCode: 1 };

      const targetBranch = positional[0];
      const targetSha = GitSim.resolveRef(targetBranch);
      if (!targetSha) return { stderr: `fatal: invalid upstream '${targetBranch}'`, exitCode: 1 };

      const headSha = GitSim.getHEADsha();
      if (!headSha) return { stderr: 'fatal: no commits on current branch', exitCode: 1 };

      // Already up to date
      if (GitSim.isAncestor(targetSha, headSha) && GitSim.isAncestor(headSha, targetSha)) {
        return { stdout: 'Current branch is up to date.', exitCode: 0 };
      }

      // If HEAD is ancestor of target, just fast-forward
      if (GitSim.isAncestor(headSha, targetSha)) {
        if (GitSim.HEAD.type === 'branch') {
          GitSim.branches.set(GitSim.HEAD.ref, targetSha);
        } else {
          GitSim.HEAD = { type: 'detached', ref: targetSha };
        }
        return { stdout: `Successfully rebased and updated refs/heads/${GitSim.HEAD.ref}.`, exitCode: 0 };
      }

      // Find merge base
      const mergeBase = GitSim.findMergeBase(headSha, targetSha);

      // Collect commits to replay (from merge base to HEAD)
      const toReplay = [];
      let current = headSha;
      while (current && current !== mergeBase) {
        const commit = GitSim.commits.get(current);
        if (!commit) break;
        toReplay.unshift({ sha: current, message: commit.message });
        current = commit.parents[0];
      }

      // Replay commits on top of target
      let parentSha = targetSha;
      for (const orig of toReplay) {
        const newSha = GitSim.generateSHA();
        GitSim.commits.set(newSha, {
          message: orig.message,
          parents: [parentSha],
          timestamp: Date.now()
        });
        parentSha = newSha;
      }

      // Update HEAD
      if (GitSim.HEAD.type === 'branch') {
        GitSim.branches.set(GitSim.HEAD.ref, parentSha);
      } else {
        GitSim.HEAD = { type: 'detached', ref: parentSha };
      }

      return { stdout: `Successfully rebased and updated refs/heads/${GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : 'HEAD'}.`, exitCode: 0 };
    },

    'cherry-pick'(args) {
      const positional = args.filter(a => !a.startsWith('-'));
      if (positional.length === 0) return { stderr: 'fatal: missing commit to cherry-pick', exitCode: 1 };

      const targetSha = GitSim.resolveRef(positional[0]);
      if (!targetSha) return { stderr: `fatal: bad revision '${positional[0]}'`, exitCode: 1 };

      const commit = GitSim.commits.get(targetSha);
      if (!commit) return { stderr: `fatal: bad revision '${positional[0]}'`, exitCode: 1 };

      const headSha = GitSim.getHEADsha();
      const newSha = GitSim.generateSHA();

      GitSim.commits.set(newSha, {
        message: commit.message,
        parents: [headSha],
        timestamp: Date.now()
      });

      if (GitSim.HEAD.type === 'branch') {
        GitSim.branches.set(GitSim.HEAD.ref, newSha);
      } else {
        GitSim.HEAD = { type: 'detached', ref: newSha };
      }

      return { stdout: `[${GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : 'HEAD'} ${newSha}] ${commit.message}`, exitCode: 0 };
    },

    stash(args) {
      const sub = args[0] || 'push';

      if (sub === 'push' || sub === 'save' || (!['pop', 'list', 'drop', 'apply', 'show'].includes(sub))) {
        // Stash working tree
        if (GitSim.workingTree.size === 0 && GitSim.staging.size === 0) {
          return { stderr: 'No local changes to save', exitCode: 1 };
        }
        const message = args.slice(sub === 'push' || sub === 'save' ? 1 : 0).join(' ') || `WIP on ${GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : 'HEAD'}`;
        GitSim.stash.push({
          message,
          workingTree: new Map(GitSim.workingTree),
          staging: new Set(GitSim.staging)
        });
        GitSim.workingTree.clear();
        GitSim.staging.clear();
        return { stdout: `Saved working directory and index state "${message}"`, exitCode: 0 };
      }

      if (sub === 'list') {
        if (GitSim.stash.length === 0) return { stdout: '', exitCode: 0 };
        const lines = GitSim.stash.map((s, i) => `stash@{${i}}: ${s.message}`).reverse();
        return { stdout: lines.join('\n'), exitCode: 0 };
      }

      if (sub === 'pop') {
        if (GitSim.stash.length === 0) return { stderr: 'error: no stash entries found.', exitCode: 1 };
        const entry = GitSim.stash.pop();
        for (const [f, s] of entry.workingTree) GitSim.workingTree.set(f, s);
        for (const f of entry.staging) GitSim.staging.add(f);
        return { stdout: `On branch ${GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : 'HEAD'}\nDropped refs/stash@{0}`, exitCode: 0 };
      }

      if (sub === 'apply') {
        if (GitSim.stash.length === 0) return { stderr: 'error: no stash entries found.', exitCode: 1 };
        const entry = GitSim.stash[GitSim.stash.length - 1];
        for (const [f, s] of entry.workingTree) GitSim.workingTree.set(f, s);
        for (const f of entry.staging) GitSim.staging.add(f);
        return { stdout: `On branch ${GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : 'HEAD'}`, exitCode: 0 };
      }

      if (sub === 'drop') {
        if (GitSim.stash.length === 0) return { stderr: 'error: no stash entries found.', exitCode: 1 };
        GitSim.stash.pop();
        return { stdout: 'Dropped refs/stash@{0}', exitCode: 0 };
      }

      return { stderr: `error: unknown stash subcommand '${sub}'`, exitCode: 1 };
    },

    reset(args) {
      let mode = '--mixed'; // default
      let targetRef = 'HEAD';

      for (const a of args) {
        if (a === '--soft' || a === '--mixed' || a === '--hard') {
          mode = a;
        } else if (!a.startsWith('-')) {
          targetRef = a;
        }
      }

      const sha = GitSim.resolveRef(targetRef);
      if (!sha) return { stderr: `fatal: ambiguous argument '${targetRef}': unknown revision`, exitCode: 1 };

      // Move HEAD
      if (GitSim.HEAD.type === 'branch') {
        GitSim.branches.set(GitSim.HEAD.ref, sha);
      } else {
        GitSim.HEAD = { type: 'detached', ref: sha };
      }

      if (mode === '--mixed' || mode === '--hard') {
        GitSim.staging.clear();
      }
      if (mode === '--hard') {
        GitSim.workingTree.clear();
      }

      return { stdout: `HEAD is now at ${sha} ${(GitSim.commits.get(sha) || {}).message || ''}`, exitCode: 0 };
    },

    tag(args) {
      let deleteFlag = false;
      const positional = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-d' || args[i] === '--delete') {
          deleteFlag = true;
        } else if (!args[i].startsWith('-')) {
          positional.push(args[i]);
        }
      }

      if (deleteFlag) {
        const name = positional[0];
        if (!name) return { stderr: 'fatal: tag name required', exitCode: 1 };
        if (!GitSim.tags.has(name)) return { stderr: `error: tag '${name}' not found.`, exitCode: 1 };
        GitSim.tags.delete(name);
        return { stdout: `Deleted tag '${name}'`, exitCode: 0 };
      }

      // No args: list tags
      if (positional.length === 0) {
        const tagNames = [...GitSim.tags.keys()].sort();
        return { stdout: tagNames.join('\n'), exitCode: 0 };
      }

      const name = positional[0];
      const target = positional[1] ? GitSim.resolveRef(positional[1]) : GitSim.getHEADsha();
      if (!target) return { stderr: `fatal: not a valid object name`, exitCode: 1 };
      if (GitSim.tags.has(name)) return { stderr: `fatal: tag '${name}' already exists`, exitCode: 1 };
      GitSim.tags.set(name, target);
      return { stdout: '', exitCode: 0 };
    },

    diff() {
      if (GitSim.workingTree.size === 0 && GitSim.staging.size === 0) {
        return { stdout: '(no changes)', exitCode: 0 };
      }
      const lines = [];
      for (const [f, status] of GitSim.workingTree) {
        const staged = GitSim.staging.has(f) ? ' (staged)' : '';
        lines.push(`diff --git a/${f} b/${f}`);
        lines.push(`--- a/${f}`);
        lines.push(`+++ b/${f}`);
        lines.push(`@@ file ${status}${staged} @@`);
      }
      return { stdout: lines.join('\n'), exitCode: 0 };
    },

    show(args) {
      const ref = args[0] || 'HEAD';
      const sha = GitSim.resolveRef(ref);
      if (!sha) return { stderr: `fatal: bad revision '${ref}'`, exitCode: 1 };
      const commit = GitSim.commits.get(sha);
      if (!commit) return { stderr: `fatal: bad revision '${ref}'`, exitCode: 1 };
      const lines = [
        `commit ${sha}`,
        `    ${commit.message}`,
        ''
      ];
      if (commit.parents.length > 0) {
        lines.splice(1, 0, `Parent: ${commit.parents.join(' ')}`);
      }
      return { stdout: lines.join('\n'), exitCode: 0 };
    },

    reflog() {
      // Simplified reflog — show last N commits from HEAD perspective
      const headSha = GitSim.getHEADsha();
      if (!headSha) return { stdout: '', exitCode: 0 };

      const entries = [];
      let current = headSha;
      let i = 0;
      while (current && i < 20) {
        const commit = GitSim.commits.get(current);
        if (!commit) break;
        entries.push(`${current} HEAD@{${i}}: ${commit.message}`);
        current = commit.parents[0];
        i++;
      }
      return { stdout: entries.join('\n'), exitCode: 0 };
    },

    bisect(args) {
      const sub = args[0];
      if (!sub) return { stdout: 'usage: git bisect <start|good|bad|reset>', exitCode: 0 };
      if (sub === 'start') return { stdout: 'Bisecting: starting bisect session', exitCode: 0 };
      if (sub === 'good') return { stdout: 'Bisecting: marking current commit as good', exitCode: 0 };
      if (sub === 'bad') return { stdout: 'Bisecting: marking current commit as bad', exitCode: 0 };
      if (sub === 'reset') return { stdout: 'Bisect session reset', exitCode: 0 };
      return { stderr: `error: unknown bisect subcommand '${sub}'`, exitCode: 1 };
    }
  };

  // ── Command Execution ───────────────────────────────────────────────

  function execute(input) {
    const trimmed = input.trim();
    if (!trimmed) return { stdout: '', exitCode: 0 };

    // Must start with "git"
    if (!trimmed.startsWith('git ') && trimmed !== 'git') {
      // Allow a few helper commands
      if (trimmed === 'clear') {
        els.output.innerHTML = '';
        return { stdout: '', exitCode: 0 };
      }
      if (trimmed === 'help') {
        return {
          stdout: 'Available git commands:\n  init, status, add, commit, log, branch, checkout, switch,\n  merge, rebase, cherry-pick, stash, reset, tag, diff, show, reflog, bisect\n\nType "git <command>" to execute.',
          exitCode: 0
        };
      }
      return { stderr: `This is a git challenge. Commands must start with "git".\nType "help" for available commands.`, exitCode: 1 };
    }

    if (trimmed === 'git') {
      return { stdout: 'usage: git <command> [<args>]\n\nType "help" for available commands.', exitCode: 0 };
    }

    // Parse: git <subcommand> [args...]
    const parts = parseGitCommand(trimmed);
    const subcommand = parts[0];
    const args = parts.slice(1);

    const handler = GIT_COMMANDS[subcommand];
    if (!handler) {
      return { stderr: `git: '${subcommand}' is not a git command. See 'help'.`, exitCode: 1 };
    }

    try {
      return handler(args);
    } catch (err) {
      return { stderr: `error: ${err.message}`, exitCode: 1 };
    }
  }

  function parseGitCommand(input) {
    // Remove "git " prefix
    const rest = input.slice(4).trim();
    const parts = [];
    let current = '';
    let inQuote = null;

    for (let i = 0; i < rest.length; i++) {
      const ch = rest[i];
      if (inQuote) {
        if (ch === inQuote) { inQuote = null; }
        else { current += ch; }
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
      } else if (ch === ' ' || ch === '\t') {
        if (current) { parts.push(current); current = ''; }
      } else {
        current += ch;
      }
    }
    if (current) parts.push(current);
    return parts;
  }

  // ── SVG Branch Graph Renderer ───────────────────────────────────────

  const BRANCH_COLORS = ['#7aa2f7', '#9ece6a', '#bb9af7', '#e0af68', '#7dcfff', '#f7768e'];

  function renderGraph(state, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Parse state
    const commits = new Map();
    if (Array.isArray(state.commits)) {
      for (const c of state.commits) {
        commits.set(c.sha, { message: c.message, parents: c.parents || [], timestamp: c.timestamp || 0 });
      }
    }
    const branchMap = state.branches || {};
    const tagMap = state.tags || {};
    const head = state.HEAD || { type: 'branch', ref: 'main' };

    // Topological sort (newest first)
    const visited = new Set();
    const sorted = [];
    function dfs(sha) {
      if (!sha || visited.has(sha)) return;
      visited.add(sha);
      const commit = commits.get(sha);
      if (!commit) return;
      for (const p of commit.parents) dfs(p);
      sorted.push(sha);
    }

    // Start from all branch tips and tags
    const tips = new Set([...Object.values(branchMap), ...Object.values(tagMap)]);
    for (const sha of tips) dfs(sha);
    sorted.reverse(); // newest first

    if (sorted.length === 0) {
      container.innerHTML = '<svg viewBox="0 0 300 60" class="git-graph-svg"><text x="150" y="35" text-anchor="middle" fill="#565f89" font-size="13" font-family="var(--mono)">No commits</text></svg>';
      return;
    }

    // Assign columns to branches
    const branchColumns = new Map();
    let nextCol = 0;

    // Assign main branch (or first branch in HEAD) to column 0
    const mainBranch = branchMap.main ? 'main' : (branchMap.master ? 'master' : Object.keys(branchMap)[0]);
    if (mainBranch) branchColumns.set(mainBranch, nextCol++);

    // Assign other branches
    for (const name of Object.keys(branchMap)) {
      if (!branchColumns.has(name)) {
        branchColumns.set(name, nextCol++);
      }
    }

    // Determine which column each commit belongs to
    const commitColumn = new Map();
    const branchTips = new Map();
    for (const [name, sha] of Object.entries(branchMap)) {
      branchTips.set(sha, name);
    }

    // Assign commit columns based on which branch they belong to
    // Walk from each branch tip backward
    for (const [name, col] of branchColumns) {
      const branchSha = branchMap[name];
      let current = branchSha;
      while (current) {
        if (commitColumn.has(current)) break; // already claimed
        commitColumn.set(current, col);
        const commit = commits.get(current);
        if (!commit || commit.parents.length === 0) break;
        current = commit.parents[0]; // follow first parent
      }
    }

    // Any unclaimed commits go to column 0
    for (const sha of sorted) {
      if (!commitColumn.has(sha)) commitColumn.set(sha, 0);
    }

    const totalCols = Math.max(nextCol, 1);
    const nodeRadius = 8;
    const rowHeight = 48;
    const colWidth = 50;
    const leftPad = 20;
    const hasDirtyState = (state.workingTree && Object.keys(state.workingTree).length > 0) || (state.staging && state.staging.length > 0);
    const topPad = hasDirtyState ? 60 : 25; // extra space for working tree indicator
    const labelPad = totalCols * colWidth + leftPad + 10;
    const svgWidth = Math.max(labelPad + 200, 300);
    const svgHeight = sorted.length * rowHeight + topPad + 15;

    // Build commit positions
    const positions = new Map();
    sorted.forEach((sha, i) => {
      const col = commitColumn.get(sha) || 0;
      const x = leftPad + col * colWidth + colWidth / 2;
      const y = i * rowHeight + topPad;
      positions.set(sha, { x, y });
    });

    // Resolve HEAD SHA
    const headSha = head.type === 'branch' ? branchMap[head.ref] : head.ref;

    // Build SVG
    let svg = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="git-graph-svg" xmlns="http://www.w3.org/2000/svg">`;

    // Draw connection lines
    for (const sha of sorted) {
      const commit = commits.get(sha);
      if (!commit) continue;
      const pos = positions.get(sha);
      if (!pos) continue;

      for (const parentSha of commit.parents) {
        const parentPos = positions.get(parentSha);
        if (!parentPos) continue;

        const col = commitColumn.get(sha) || 0;
        const parentCol = commitColumn.get(parentSha) || 0;
        const color = BRANCH_COLORS[col % BRANCH_COLORS.length];

        if (col === parentCol) {
          // Straight line
          svg += `<line x1="${pos.x}" y1="${pos.y}" x2="${parentPos.x}" y2="${parentPos.y}" stroke="${color}" stroke-width="2.5" stroke-opacity="0.6"/>`;
        } else {
          // Curved path for cross-branch connections
          const midY = (pos.y + parentPos.y) / 2;
          svg += `<path d="M${pos.x},${pos.y} C${pos.x},${midY} ${parentPos.x},${midY} ${parentPos.x},${parentPos.y}" stroke="${color}" stroke-width="2.5" stroke-opacity="0.5" fill="none"/>`;
        }
      }
    }

    // Draw commit nodes
    for (const sha of sorted) {
      const pos = positions.get(sha);
      if (!pos) continue;
      const col = commitColumn.get(sha) || 0;
      const color = BRANCH_COLORS[col % BRANCH_COLORS.length];
      const isHead = sha === headSha;
      const commit = commits.get(sha);

      // Commit circle
      if (isHead) {
        svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius + 3}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="3,2"/>`;
      }
      svg += `<circle cx="${pos.x}" cy="${pos.y}" r="${nodeRadius}" fill="${isHead ? color : '#1a1b26'}" stroke="${color}" stroke-width="2.5"/>`;

      // Collect branch/tag labels for this commit
      const labels = [];
      for (const [bName, bSha] of Object.entries(branchMap)) {
        if (bSha === sha) {
          const bCol = branchColumns.get(bName) || 0;
          const bColor = BRANCH_COLORS[bCol % BRANCH_COLORS.length];
          const isCurrent = head.type === 'branch' && head.ref === bName;
          labels.push({ text: (isCurrent ? 'HEAD \u2192 ' : '') + bName, color: bColor, bold: isCurrent });
        }
      }

      // Layout: [node] [branch labels...] [sha message]
      let cursorX = pos.x + nodeRadius + 8;

      // Draw branch labels inline
      for (const label of labels) {
        const textLen = label.text.length * 6.5 + 12;
        svg += `<rect x="${cursorX - 2}" y="${pos.y - 10}" width="${textLen}" height="18" rx="4" fill="${label.color}" fill-opacity="${label.bold ? 0.25 : 0.12}"/>`;
        svg += `<text x="${cursorX + 4}" y="${pos.y + 3}" fill="${label.color}" font-size="10" font-family="var(--mono)" font-weight="${label.bold ? '700' : '500'}">${escapeHtml(label.text)}</text>`;
        cursorX += textLen + 6;
      }

      // Commit SHA + message after labels
      const shortSha = sha.slice(0, 7);
      const msg = commit ? commit.message.slice(0, 28) : '';
      svg += `<text x="${cursorX}" y="${pos.y + 4}" fill="#565f89" font-size="10" font-family="var(--mono)">${escapeHtml(shortSha)}</text>`;
      svg += `<text x="${cursorX + 56}" y="${pos.y + 4}" fill="#a9b1d6" font-size="11" font-family="var(--mono)">${escapeHtml(msg)}</text>`;
    }

    // Draw tag labels
    for (const [name, sha] of Object.entries(tagMap)) {
      const pos = positions.get(sha);
      if (!pos) continue;

      const labelX = pos.x - nodeRadius - 6;
      svg += `<text x="${labelX}" y="${pos.y + 3}" fill="#e0af68" font-size="9" font-family="var(--mono)" text-anchor="end">\uD83C\uDFF7 ${escapeHtml(name)}</text>`;
    }

    // Show working tree indicator if there are uncommitted changes
    const wt = state.workingTree || {};
    const stg = state.staging || [];
    const dirtyFiles = Object.keys(wt);
    if (dirtyFiles.length > 0 || stg.length > 0) {
      const topPos = sorted.length > 0 ? positions.get(sorted[0]) : null;
      if (topPos) {
        const wy = topPos.y - 32;
        const wx = topPos.x;
        // Dashed line from dirty indicator to HEAD
        svg += `<line x1="${wx}" y1="${wy + 6}" x2="${topPos.x}" y2="${topPos.y - nodeRadius}" stroke="#e0af68" stroke-width="1.5" stroke-dasharray="3,3" stroke-opacity="0.5"/>`;
        // Dirty state circle (unfilled, orange)
        svg += `<circle cx="${wx}" cy="${wy}" r="5" fill="none" stroke="#e0af68" stroke-width="1.5" stroke-dasharray="2,2"/>`;
        // Label
        const label = stg.length > 0 ? `${stg.length} staged, ${dirtyFiles.length - stg.length} unstaged` : `${dirtyFiles.length} modified`;
        svg += `<text x="${wx + 12}" y="${wy + 3}" fill="#e0af68" font-size="9" font-family="var(--mono)" fill-opacity="0.7">${escapeHtml(label)}</text>`;
      }
    }

    svg += '</svg>';
    container.innerHTML = svg;
  }

  // ── Validation ──────────────────────────────────────────────────────

  function checkObjectives() {
    if (!challenge || !challenge.objectives) return { allMet: false, results: [] };

    const currentState = GitSim.serialize();

    const results = challenge.objectives.map(obj => {
      if (obj._met) return { ...obj, met: true };

      const v = obj.validation;
      let met = false;

      switch (v.type) {
        case 'branchExists':
          met = GitSim.branches.has(v.expected);
          break;
        case 'branchAt': {
          const branchSha = GitSim.branches.get(v.branch);
          if (v.expected === 'HEAD') {
            met = branchSha === GitSim.getHEADsha();
          } else {
            met = branchSha === GitSim.resolveRef(v.expected);
          }
          break;
        }
        case 'headOnBranch':
          met = GitSim.HEAD.type === 'branch' && GitSim.HEAD.ref === v.expected;
          break;
        case 'headDetached':
          met = GitSim.HEAD.type === 'detached';
          break;
        case 'commitCount':
          met = GitSim.commits.size === Number(v.expected);
          break;
        case 'commitCountMin':
          met = GitSim.commits.size >= Number(v.expected);
          break;
        case 'commitMessageExists':
          met = [...GitSim.commits.values()].some(c => c.message === v.expected || c.message.includes(v.expected));
          break;
        case 'mergeCommitExists': {
          // Check for a commit with 2+ parents
          met = [...GitSim.commits.values()].some(c => c.parents.length >= 2);
          break;
        }
        case 'tagExists':
          met = GitSim.tags.has(v.expected);
          break;
        case 'commandUsed':
          met = commandsExecuted.some(cmd => new RegExp(v.expected).test(cmd));
          break;
        case 'outputContains':
          met = lastOutput.includes(v.expected);
          break;
        case 'stateMatch':
          met = validateStateMatch(v);
          break;
        default:
          break;
      }

      if (met) obj._met = true;
      return { ...obj, met };
    });

    return { allMet: results.every(r => r.met), results };
  }

  function validateStateMatch(v) {
    // Compare current branches to target branches
    if (v.branches) {
      for (const [name, expectedSha] of Object.entries(v.branches)) {
        const actualSha = GitSim.branches.get(name);
        if (!actualSha) return false;
        // For state match, we check structural equivalence by comparing
        // relative positions rather than exact SHAs (since SHAs are random)
      }
    }
    return true;
  }

  // ── UI ──────────────────────────────────────────────────────────────

  const els = {};

  function cacheEls() {
    els.container = document.getElementById('git-container');
    els.output = document.getElementById('git-output');
    els.input = document.getElementById('git-input');
    els.inputDisplay = document.getElementById('git-input-display');
    els.suggestion = document.getElementById('git-suggestion');
    els.ps1 = document.getElementById('git-ps1');
    els.promptArea = document.getElementById('git-prompt-area');
    els.meta = document.getElementById('git-meta');
    els.tier = document.getElementById('git-tier');
    els.progress = document.getElementById('git-progress');
    els.hintBtn = document.getElementById('git-hint');
    els.helpBtn = document.getElementById('git-help');
    els.skipBtn = document.getElementById('git-skip');
    els.result = document.getElementById('git-result');
    els.objectivesPanel = document.getElementById('git-objectives');
    els.targetGraph = document.getElementById('git-target-svg');
    els.currentGraph = document.getElementById('git-current-svg');
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Syntax Highlighting ─────────────────────────────────────────────

  function highlightInput(text) {
    if (!text) return '';
    const parts = text.split(/\s+/);
    if (parts.length === 0) return escapeHtml(text);

    let html = '';
    let i = 0;

    for (const part of parts) {
      if (i > 0) html += ' ';
      if (!part) { i++; continue; }

      if (i === 0) {
        // "git" keyword
        const isGit = part === 'git' || part === 'clear' || part === 'help';
        html += `<span class="term-cmd${isGit ? '' : ' term-cmd-invalid'}">${escapeHtml(part)}</span>`;
      } else if (i === 1 && parts[0] === 'git') {
        // git subcommand
        const known = GIT_COMMANDS[part];
        html += `<span class="term-cmd${known ? '' : ' term-cmd-invalid'}">${escapeHtml(part)}</span>`;
      } else if (part.startsWith('-')) {
        html += `<span class="term-flag">${escapeHtml(part)}</span>`;
      } else if (/^["']/.test(part)) {
        html += `<span class="term-string">${escapeHtml(part)}</span>`;
      } else {
        html += `<span class="term-arg">${escapeHtml(part)}</span>`;
      }
      i++;
    }
    return html;
  }

  function renderInputWithCursor(text, cursorPos) {
    if (!text && cursorPos === 0) {
      return '<span class="term-cursor"></span>';
    }
    const highlighted = highlightInput(text);
    if (cursorPos >= text.length) {
      return highlighted + '<span class="term-cursor"></span>';
    }
    // Insert cursor at correct position within highlighted HTML
    let plainIdx = 0;
    let inTag = false;
    for (let i = 0; i < highlighted.length; i++) {
      if (highlighted[i] === '<') { inTag = true; continue; }
      if (highlighted[i] === '>') { inTag = false; continue; }
      if (!inTag) {
        if (plainIdx === cursorPos) {
          // Find actual byte position
          let bytePos = 0;
          let pi = 0;
          let tag = false;
          for (let j = 0; j < highlighted.length; j++) {
            if (highlighted[j] === '<') { tag = true; bytePos = j; continue; }
            if (highlighted[j] === '>') { tag = false; bytePos = j + 1; continue; }
            if (!tag) {
              if (pi === cursorPos) {
                return highlighted.slice(0, j) + '<span class="term-cursor"></span>' + highlighted.slice(j);
              }
              if (highlighted[j] === '&') {
                const semiPos = highlighted.indexOf(';', j);
                if (semiPos > j && semiPos - j < 8) j = semiPos;
              }
              pi++;
            }
          }
          break;
        }
        if (highlighted[i] === '&') {
          const semiPos = highlighted.indexOf(';', i);
          if (semiPos > i && semiPos - i < 8) i = semiPos;
        }
        plainIdx++;
      }
    }
    return highlighted + '<span class="term-cursor"></span>';
  }

  function getSuggestion(partial) {
    if (!partial) return '';
    for (let i = commandHistory.length - 1; i >= 0; i--) {
      if (commandHistory[i].startsWith(partial) && commandHistory[i] !== partial) {
        return commandHistory[i].slice(partial.length);
      }
    }
    // Suggest git subcommands
    if (partial === 'git ') return '';
    if (partial.startsWith('git ')) {
      const sub = partial.slice(4);
      const cmds = Object.keys(GIT_COMMANDS);
      const match = cmds.find(c => c.startsWith(sub) && c !== sub);
      if (match) return match.slice(sub.length);
    }
    return '';
  }

  // ── Prompt ──────────────────────────────────────────────────────────

  function renderPrompt() {
    const branch = GitSim.HEAD.type === 'branch' ? GitSim.HEAD.ref : GitSim.getHEADsha()?.slice(0, 7) || 'HEAD';
    const arrow = lastExitCode === 0 ? '<span class="term-arrow-ok">&#10095;</span>' : '<span class="term-arrow-err">&#10095;</span>';
    return `<span class="term-user">user</span> <span class="git-branch-prompt">${escapeHtml(branch)}</span> ${arrow} `;
  }

  // ── Objectives Rendering ────────────────────────────────────────────

  function renderObjectives() {
    if (!els.objectivesPanel) return;
    els.objectivesPanel.innerHTML = '';
    if (!challenge || !challenge.objectives) return;

    for (const obj of challenge.objectives) {
      const div = document.createElement('div');
      div.className = 'git-objective' + (obj._met ? ' met' : '');
      div.innerHTML = `<span class="objective-check">${obj._met ? '&#10003;' : '&#9675;'}</span> ${escapeHtml(obj.description)}`;
      els.objectivesPanel.appendChild(div);
    }
  }

  function appendOutput(html) {
    const div = document.createElement('div');
    div.className = 'git-line';
    div.innerHTML = html;
    els.output.appendChild(div);
    els.container.scrollTop = els.container.scrollHeight;
  }

  function appendPromptLine(input) {
    appendOutput(renderPrompt() + highlightInput(input));
  }

  // ── Event Handlers ──────────────────────────────────────────────────

  function handleKeydown(e) {
    if (challengeResolved) { e.preventDefault(); return; }

    if (e.key === 'Enter') {
      e.preventDefault();
      const input = els.input.value.trim();
      if (!input) return;

      commandHistory.push(input);
      commandsExecuted.push(input);
      historyIndex = commandHistory.length;

      appendPromptLine(input);

      const result = execute(input);
      lastExitCode = result.exitCode || 0;
      lastOutput = result.stdout || '';

      if (result.stderr) {
        appendOutput(`<span class="term-error">${escapeHtml(result.stderr)}</span>`);
      }
      if (result.stdout) {
        appendOutput(`<span class="term-output">${escapeHtml(result.stdout)}</span>`);
      }

      // Update prompt
      els.ps1.innerHTML = renderPrompt();
      els.input.value = '';
      els.inputDisplay.innerHTML = '';
      els.suggestion.textContent = '';

      // Update current graph
      renderGraph(GitSim.serialize(), 'git-current-svg');

      // Check objectives
      const check = checkObjectives();
      renderObjectives();

      if (check.allMet && !challengeResolved) {
        onPassed();
      }

      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const suggestion = getSuggestion(els.input.value);
      if (suggestion) {
        els.input.value += suggestion;
        els.inputDisplay.innerHTML = renderInputWithCursor(els.input.value, els.input.value.length);
        els.suggestion.textContent = '';
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        els.input.value = commandHistory[historyIndex];
        els.inputDisplay.innerHTML = renderInputWithCursor(els.input.value, els.input.value.length);
        els.suggestion.textContent = '';
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        els.input.value = commandHistory[historyIndex];
        els.inputDisplay.innerHTML = renderInputWithCursor(els.input.value, els.input.value.length);
      } else {
        historyIndex = commandHistory.length;
        els.input.value = '';
        els.inputDisplay.innerHTML = '';
      }
      els.suggestion.textContent = '';
      return;
    }

    if (e.key === 'ArrowRight' && els.input.selectionStart === els.input.value.length) {
      const suggestion = getSuggestion(els.input.value);
      if (suggestion) {
        e.preventDefault();
        els.input.value += suggestion;
        els.inputDisplay.innerHTML = renderInputWithCursor(els.input.value, els.input.value.length);
        els.suggestion.textContent = '';
      }
      return;
    }

    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      els.output.innerHTML = '';
      return;
    }
  }

  function handleInput() {
    const val = els.input.value;
    const cursorPos = els.input.selectionStart;
    els.inputDisplay.innerHTML = renderInputWithCursor(val, cursorPos);
    els.suggestion.textContent = cursorPos >= val.length ? getSuggestion(val) : '';
  }

  function handleCursorUpdate() {
    const val = els.input.value;
    const cursorPos = els.input.selectionStart;
    els.inputDisplay.innerHTML = renderInputWithCursor(val, cursorPos);
    els.suggestion.textContent = cursorPos >= val.length ? getSuggestion(val) : '';
  }

  function handlePaste(e) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    if (!text) return;
    const start = els.input.selectionStart;
    const end = els.input.selectionEnd;
    els.input.value = els.input.value.slice(0, start) + text + els.input.value.slice(end);
    els.input.selectionStart = els.input.selectionEnd = start + text.length;
    handleInput();
  }

  // ── Challenge Lifecycle ─────────────────────────────────────────────

  async function onPassed() {
    challengeResolved = true;

    appendOutput('');
    appendOutput('<span class="term-success">All objectives complete!</span>');

    if (challenge.afterSolve) {
      appendOutput(`<span class="term-after-solve">${escapeHtml(challenge.afterSolve)}</span>`);
    }

    // Update profile
    const struggled = commandsExecuted.length > 10;
    GitChallengeProvider.updateProfileAfterChallenge(profile, challenge, true, challengeSource, struggled, helpUsedThisChallenge);
    await browser.runtime.sendMessage({ type: 'saveGitLearningProfile', profile });

    // Log to daily challenge log
    const solveTime = Math.round((Date.now() - challengeStartTime) / 1000);
    browser.runtime.sendMessage({ type: 'logChallengeCompletion', challengeType: 'git', solveTime }).catch(() => {});

    // Update progression
    try {
      const state = await browser.runtime.sendMessage({ type: 'getState' });
      const prog = state.progression || {};
      prog.gitTier = (GitChallengeProvider.GIT_CURRICULUM[profile.currentTopicIndex] || { tier: 1 }).tier;
      if (!prog.gitCompleted) prog.gitCompleted = [];
      if (!prog.gitCompleted.includes(challenge.id)) prog.gitCompleted.push(challenge.id);
      prog.totalChallengesCompleted = (prog.totalChallengesCompleted || 0) + 1;
      await browser.runtime.sendMessage({ type: 'updateProgression', progression: prog });
    } catch {}

    Gate.showContinuePrompt();
  }

  function showHint() {
    if (!challenge || !challenge.hints || hintsUsed >= challenge.hints.length) return;
    const hint = challenge.hints[hintsUsed];
    hintsUsed++;
    appendOutput(`<span class="term-hint">Hint ${hintsUsed}: ${escapeHtml(hint)}</span>`);
    if (hintsUsed >= challenge.hints.length) els.hintBtn.disabled = true;
    els.input.focus();
  }

  async function askForHelp() {
    helpUsedThisChallenge = true;
    appendOutput('<span class="term-dim">Asking for help...</span>');
    try {
      const helpPrompt = `The user is stuck on a git challenge. Here's the context:

Scenario: ${challenge.scenario}
Objectives: ${challenge.objectives.map(o => o.description + (o._met ? ' (DONE)' : ' (NOT DONE)')).join(', ')}
Commands tried: ${commandsExecuted.join(', ') || '(none yet)'}

Give a brief, helpful hint without giving away the exact answer. 2-3 sentences max.`;

      const response = await browser.runtime.sendMessage({ type: 'claudeGenerate', prompt: helpPrompt });
      if (response.content) {
        appendOutput(`<span class="term-help">${escapeHtml(response.content)}</span>`);
      } else {
        showLocalHelp();
      }
    } catch {
      showLocalHelp();
    }
    els.input.focus();
  }

  function showLocalHelp() {
    const remaining = challenge.objectives.filter(o => !o._met);
    if (remaining.length === 0) return;

    const next = remaining[0];
    const v = next.validation;
    const tips = [];

    if (v.type === 'branchExists') tips.push('Create a new branch using: git branch <name>');
    else if (v.type === 'branchAt') tips.push('Make sure the right branch points to the right commit.');
    else if (v.type === 'headOnBranch') tips.push(`Switch to the right branch using: git checkout <branch>`);
    else if (v.type === 'commitMessageExists') tips.push('Create a commit with the right message using: git commit -m "message"');
    else if (v.type === 'mergeCommitExists') tips.push('You need to merge two branches: git merge <branch>');
    else if (v.type === 'tagExists') tips.push('Create a tag using: git tag <name>');
    else if (v.type === 'commandUsed') tips.push(`Try using the git command mentioned in the objective.`);
    else tips.push(`Next objective: ${next.description}`);

    appendOutput(`<span class="term-help">${escapeHtml(tips[0])}</span>`);
  }

  async function skipChallenge() {
    if (challengeResolved) return;

    GitChallengeProvider.updateProfileAfterChallenge(profile, challenge, false, challengeSource);
    await browser.runtime.sendMessage({ type: 'saveGitLearningProfile', profile });

    // Log skipped attempt so heatmap shows engagement
    browser.runtime.sendMessage({ type: 'logChallengeCompletion', challengeType: 'git', solveTime: 0 }).catch(() => {});

    await getChallenge();
  }

  // ── Init / Destroy ──────────────────────────────────────────────────

  async function getChallenge() {
    els.output.innerHTML = '';
    els.result.classList.add('hidden');
    els.result.innerHTML = '';
    challengeResolved = false;
    hintsUsed = 0;
    commandsExecuted = [];
    lastOutput = '';
    lastExitCode = 0;

    appendOutput('<span class="term-dim">Loading challenge...</span>');

    const { challenge: ch, source } = await GitChallengeProvider.getChallenge(profile, config.isSettingsGate);

    if (!ch) {
      appendOutput('<span class="term-error">Failed to load challenge. Falling back to typing.</span>');
      setTimeout(() => {
        const toggle = document.querySelector('.toggle-btn[data-challenge="typing"]');
        if (toggle) toggle.click();
      }, 1500);
      return;
    }

    challenge = ch;
    challengeSource = source;
    renderChallenge();
  }

  function renderChallenge() {
    els.output.innerHTML = '';
    challengeStartTime = Date.now();
    helpUsedThisChallenge = false;

    // Update meta
    const topic = GitChallengeProvider.GIT_CURRICULUM[profile.currentTopicIndex] || GitChallengeProvider.GIT_CURRICULUM[0];
    els.tier.textContent = `Tier ${topic.tier}`;
    els.progress.textContent = `${topic.name}`;

    // Initialize git simulator with challenge initial state
    GitSim.init(challenge.initialState);

    // Render scenario
    els.promptArea.innerHTML = '';
    if (challenge.teachingNote) {
      const note = document.createElement('div');
      note.className = 'git-teaching-note';
      note.textContent = challenge.teachingNote;
      els.promptArea.appendChild(note);
    }
    const scenario = document.createElement('div');
    scenario.className = 'git-scenario';
    scenario.textContent = challenge.scenario;
    els.promptArea.appendChild(scenario);

    // Render objectives
    renderObjectives();

    // Render graphs
    if (challenge.targetState) {
      renderGraph(challenge.targetState, 'git-target-svg');
    } else {
      // No target state — show hint text
      const tgt = document.getElementById('git-target-svg');
      if (tgt) tgt.innerHTML = '<svg viewBox="0 0 300 60" class="git-graph-svg"><text x="150" y="35" text-anchor="middle" fill="#565f89" font-size="12" font-family="var(--mono)">Complete objectives to see result</text></svg>';
    }
    renderGraph(GitSim.serialize(), 'git-current-svg');

    // Show prompt
    els.ps1.innerHTML = renderPrompt();
    els.inputDisplay.innerHTML = '';
    els.suggestion.textContent = '';
    els.input.value = '';
    els.input.focus();
  }

  async function init(cfg) {
    config = cfg;
    cacheEls();
    challengeResolved = false;
    hintsUsed = 0;
    commandHistory = [];
    historyIndex = -1;
    lastExitCode = 0;
    lastOutput = '';
    commandsExecuted = [];

    // Load profile
    try {
      profile = await browser.runtime.sendMessage({ type: 'getGitLearningProfile' });
    } catch { profile = null; }
    if (!profile) profile = GitChallengeProvider.defaultProfile();

    // Bind events
    els.input.addEventListener('keydown', handleKeydown);
    els.input.addEventListener('input', handleInput);
    els.input.addEventListener('keyup', handleCursorUpdate);
    els.input.addEventListener('click', handleCursorUpdate);
    els.input.addEventListener('paste', handlePaste);
    els.hintBtn.addEventListener('click', showHint);
    els.helpBtn.addEventListener('click', askForHelp);
    els.skipBtn.addEventListener('click', skipChallenge);

    // Focus management
    els._containerClick = () => els.input.focus();
    els.container.addEventListener('click', els._containerClick);

    await getChallenge();
  }

  function destroy() {
    if (els.input) {
      els.input.removeEventListener('keydown', handleKeydown);
      els.input.removeEventListener('input', handleInput);
      els.input.removeEventListener('keyup', handleCursorUpdate);
      els.input.removeEventListener('click', handleCursorUpdate);
      els.input.removeEventListener('paste', handlePaste);
    }
    if (els.hintBtn) els.hintBtn.removeEventListener('click', showHint);
    if (els.helpBtn) els.helpBtn.removeEventListener('click', askForHelp);
    if (els.skipBtn) els.skipBtn.removeEventListener('click', skipChallenge);
    if (els.container && els._containerClick) {
      els.container.removeEventListener('click', els._containerClick);
    }
  }

  return { init, destroy };
})();
