/* Challenge Gate — Terminal Challenge Engine

   Simulated Oh My Zsh shell environment with virtual filesystem,
   command parser, and objective-based validation. */

'use strict';

const TerminalChallenge = (() => {
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
  let helpRequestCount = 0;
  let helpMetAtFirstRequest = 0;
  let currentChain = null;
  let chainStep = 0;
  let chainVFSSnapshot = null;
  let aliases = {};

  // ── Virtual Filesystem ────────────────────────────────────────────────

  const VFS = (() => {
    let root = null;
    let cwd = '/home/user';

    const HOME = '/home/user';

    function defaultFS() {
      return {
        type: 'dir', name: '/', permissions: 'rwxr-xr-x', owner: 'root', children: {
          home: {
            type: 'dir', name: 'home', permissions: 'rwxr-xr-x', owner: 'root', children: {
              user: {
                type: 'dir', name: 'user', permissions: 'rwxr-xr-x', owner: 'user', children: {
                  '.zshrc': { type: 'file', name: '.zshrc', permissions: 'rw-r--r--', owner: 'user', content: '# Oh My Zsh config\nexport ZSH="$HOME/.oh-my-zsh"\nZSH_THEME="agnoster"\nplugins=(git z zsh-autosuggestions zsh-syntax-highlighting aliases)\nsource $ZSH/oh-my-zsh.sh\n' },
                  '.gitconfig': { type: 'file', name: '.gitconfig', permissions: 'rw-r--r--', owner: 'user', content: '[user]\n  name = dev\n  email = dev@startup.com\n[core]\n  editor = vim\n' },
                  'projects': {
                    type: 'dir', name: 'projects', permissions: 'rwxr-xr-x', owner: 'user', children: {
                      'webapp': {
                        type: 'dir', name: 'webapp', permissions: 'rwxr-xr-x', owner: 'user', children: {
                          'package.json': { type: 'file', name: 'package.json', permissions: 'rw-r--r--', owner: 'user', content: '{\n  "name": "webapp",\n  "version": "1.0.0",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "nodemon server.js",\n    "build": "webpack --mode production",\n    "test": "jest"\n  },\n  "dependencies": {\n    "express": "^4.18.2",\n    "react": "^18.2.0"\n  }\n}' },
                          'server.js': { type: 'file', name: 'server.js', permissions: 'rw-r--r--', owner: 'user', content: 'const express = require(\'express\');\nconst app = express();\napp.listen(3000, () => console.log(\'Running on port 3000\'));' },
                          'README.md': { type: 'file', name: 'README.md', permissions: 'rw-r--r--', owner: 'user', content: '# Webapp\nA full-stack web application.\n\n## Setup\nnpm install && npm start' },
                          'src': {
                            type: 'dir', name: 'src', permissions: 'rwxr-xr-x', owner: 'user', children: {
                              'index.js': { type: 'file', name: 'index.js', permissions: 'rw-r--r--', owner: 'user', content: 'import React from \'react\';\nimport ReactDOM from \'react-dom\';\nimport App from \'./App\';\nReactDOM.render(<App />, document.getElementById(\'root\'));' },
                              'App.js': { type: 'file', name: 'App.js', permissions: 'rw-r--r--', owner: 'user', content: 'import React from \'react\';\nfunction App() { return <div>Hello World</div>; }\nexport default App;' }
                            }
                          }
                        }
                      }
                    }
                  },
                  'Documents': { type: 'dir', name: 'Documents', permissions: 'rwxr-xr-x', owner: 'user', children: {} },
                  'Downloads': { type: 'dir', name: 'Downloads', permissions: 'rwxr-xr-x', owner: 'user', children: {} }
                }
              }
            }
          },
          etc: {
            type: 'dir', name: 'etc', permissions: 'rwxr-xr-x', owner: 'root', children: {
              'hosts': { type: 'file', name: 'hosts', permissions: 'rw-r--r--', owner: 'root', content: '127.0.0.1\tlocalhost\n255.255.255.255\tbroadcasthost\n::1\tlocalhost' }
            }
          },
          tmp: { type: 'dir', name: 'tmp', permissions: 'rwxrwxrwx', owner: 'root', children: {} },
          usr: {
            type: 'dir', name: 'usr', permissions: 'rwxr-xr-x', owner: 'root', children: {
              local: {
                type: 'dir', name: 'local', permissions: 'rwxr-xr-x', owner: 'root', children: {
                  bin: { type: 'dir', name: 'bin', permissions: 'rwxr-xr-x', owner: 'root', children: {} }
                }
              }
            }
          }
        }
      };
    }

    function init(fsOverlay, startDir) {
      root = defaultFS();
      if (fsOverlay && typeof fsOverlay === 'object') {
        for (const [path, entry] of Object.entries(fsOverlay)) {
          applyOverlay(path, entry);
        }
      }
      cwd = resolvePath(startDir || '~');
    }

    function resolvePath(p) {
      let path = String(p || '').trim();
      if (path === '~' || path === '') return HOME;
      if (path.startsWith('~/')) path = HOME + path.slice(1);
      if (!path.startsWith('/')) path = cwd + '/' + path;
      // normalize
      const parts = path.split('/').filter(Boolean);
      const stack = [];
      for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') { stack.pop(); continue; }
        stack.push(part);
      }
      return '/' + stack.join('/');
    }

    function getNode(absPath) {
      if (absPath === '/') return root;
      const parts = absPath.split('/').filter(Boolean);
      let node = root;
      for (const part of parts) {
        if (!node || node.type !== 'dir' || !node.children[part]) return null;
        node = node.children[part];
      }
      return node;
    }

    function getParent(absPath) {
      const parts = absPath.split('/').filter(Boolean);
      if (parts.length === 0) return null;
      parts.pop();
      return getNode('/' + parts.join('/'));
    }

    function basename(absPath) {
      const parts = absPath.split('/').filter(Boolean);
      return parts[parts.length - 1] || '';
    }

    function applyOverlay(rawPath, entry) {
      const absPath = resolvePath(rawPath);
      if (entry.type === 'dir') {
        ensureDir(absPath);
      } else if (entry.type === 'file') {
        const parentPath = absPath.split('/').filter(Boolean).slice(0, -1).join('/');
        ensureDir('/' + parentPath);
        const parent = getNode('/' + parentPath);
        const name = basename(absPath);
        parent.children[name] = {
          type: 'file',
          name,
          permissions: entry.permissions || 'rw-r--r--',
          owner: entry.owner || 'user',
          content: entry.content || ''
        };
      }
    }

    function ensureDir(absPath) {
      const parts = absPath.split('/').filter(Boolean);
      let node = root;
      for (const part of parts) {
        if (!node.children[part]) {
          node.children[part] = {
            type: 'dir', name: part, permissions: 'rwxr-xr-x', owner: 'user', children: {}
          };
        }
        node = node.children[part];
      }
      return node;
    }

    function mkdir(path, recursive) {
      const abs = resolvePath(path);
      if (recursive) { return ensureDirSafe(abs); }
      const parent = getParent(abs);
      if (!parent || parent.type !== 'dir') return { ok: false, reason: 'parent' };
      const name = basename(abs);
      const existing = parent.children[name];
      if (existing) {
        if (existing.type === 'dir') return { ok: false, reason: 'exists_dir' };
        return { ok: false, reason: 'exists_file' };
      }
      parent.children[name] = { type: 'dir', name, permissions: 'rwxr-xr-x', owner: 'user', children: {} };
      return { ok: true };
    }

    function ensureDirSafe(absPath) {
      const parts = absPath.split('/').filter(Boolean);
      let node = root;
      for (const part of parts) {
        if (!node.children[part]) {
          node.children[part] = { type: 'dir', name: part, permissions: 'rwxr-xr-x', owner: 'user', children: {} };
        } else if (node.children[part].type !== 'dir') {
          return { ok: false, reason: 'not_dir', path: part };
        }
        node = node.children[part];
      }
      return { ok: true };
    }

    function touch(path) {
      const abs = resolvePath(path);
      const existing = getNode(abs);
      if (existing) return true;
      const parent = getParent(abs);
      if (!parent || parent.type !== 'dir') return false;
      const name = basename(abs);
      parent.children[name] = { type: 'file', name, permissions: 'rw-r--r--', owner: 'user', content: '' };
      return true;
    }

    function rm(path, recursive) {
      const abs = resolvePath(path);
      const node = getNode(abs);
      if (!node) return false;
      if (node.type === 'dir' && !recursive) return false;
      const parent = getParent(abs);
      if (!parent) return false;
      delete parent.children[basename(abs)];
      return true;
    }

    function cp(src, dst, recursive) {
      const srcAbs = resolvePath(src);
      const srcNode = getNode(srcAbs);
      if (!srcNode) return false;
      if (srcNode.type === 'dir' && !recursive) return false;

      const dstAbs = resolvePath(dst);
      const dstNode = getNode(dstAbs);
      // If dst is a directory, copy into it
      let targetPath = dstAbs;
      if (dstNode && dstNode.type === 'dir') {
        targetPath = dstAbs + '/' + basename(srcAbs);
      }

      const clone = JSON.parse(JSON.stringify(srcNode));
      const parent = getParent(targetPath);
      if (!parent || parent.type !== 'dir') return false;
      clone.name = basename(targetPath);
      parent.children[clone.name] = clone;
      return true;
    }

    function mv(src, dst) {
      const srcAbs = resolvePath(src);
      const srcNode = getNode(srcAbs);
      if (!srcNode) return false;

      const dstAbs = resolvePath(dst);
      const dstNode = getNode(dstAbs);
      let targetPath = dstAbs;
      if (dstNode && dstNode.type === 'dir') {
        targetPath = dstAbs + '/' + basename(srcAbs);
      }

      const parent = getParent(targetPath);
      if (!parent || parent.type !== 'dir') return false;
      const srcParent = getParent(srcAbs);
      if (!srcParent) return false;

      srcNode.name = basename(targetPath);
      parent.children[srcNode.name] = srcNode;
      delete srcParent.children[basename(srcAbs)];
      return true;
    }

    function readFile(path) {
      const abs = resolvePath(path);
      const node = getNode(abs);
      if (!node || node.type !== 'file') return null;
      return node.content;
    }

    function writeFile(path, content) {
      const abs = resolvePath(path);
      let node = getNode(abs);
      if (node && node.type === 'file') {
        node.content = content;
        return true;
      }
      // Create file
      const parent = getParent(abs);
      if (!parent || parent.type !== 'dir') return false;
      const name = basename(abs);
      parent.children[name] = { type: 'file', name, permissions: 'rw-r--r--', owner: 'user', content };
      return true;
    }

    function appendFile(path, content) {
      const abs = resolvePath(path);
      let node = getNode(abs);
      if (node && node.type === 'file') {
        node.content += content;
        return true;
      }
      return writeFile(path, content);
    }

    function listDir(path, showHidden) {
      const abs = resolvePath(path || '.');
      const node = getNode(abs);
      if (!node || node.type !== 'dir') return null;
      let names = Object.keys(node.children).sort();
      if (!showHidden) names = names.filter(n => !n.startsWith('.'));
      return names.map(n => node.children[n]);
    }

    function findFiles(startPath, pattern, type) {
      const abs = resolvePath(startPath);
      const results = [];
      const regex = pattern ? globToRegex(pattern) : null;

      function walk(node, currentPath) {
        if (!node || node.type !== 'dir') return;
        for (const [name, child] of Object.entries(node.children)) {
          const childPath = currentPath === '/' ? '/' + name : currentPath + '/' + name;
          const matchesPattern = !regex || regex.test(name);
          const matchesType = !type || (type === 'f' && child.type === 'file') || (type === 'd' && child.type === 'dir');
          if (matchesPattern && matchesType) results.push(childPath);
          if (child.type === 'dir') walk(child, childPath);
        }
      }

      walk(getNode(abs), abs);
      return results;
    }

    function globToRegex(glob) {
      const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
      return new RegExp('^' + escaped + '$');
    }

    function chmod(path, mode) {
      const abs = resolvePath(path);
      const node = getNode(abs);
      if (!node) return false;
      if (/^\d{3,4}$/.test(mode)) {
        const digits = mode.length === 4 ? mode.slice(1) : mode;
        const map = { '0': '---', '1': '--x', '2': '-w-', '3': '-wx', '4': 'r--', '5': 'r-x', '6': 'rw-', '7': 'rwx' };
        node.permissions = (map[digits[0]] || '---') + (map[digits[1]] || '---') + (map[digits[2]] || '---');
      } else {
        // Parse symbolic: [ugoa]*[+-=][rwx]+
        const match = mode.match(/^([ugoa]*)([+\-=])([rwx]+)$/);
        if (match) {
          const [, scope, op, bits] = match;
          const perms = node.permissions.split('');
          const targets = [];
          if (!scope || scope.includes('a')) targets.push(0, 1, 2); // owner, group, other
          else {
            if (scope.includes('u')) targets.push(0);
            if (scope.includes('g')) targets.push(1);
            if (scope.includes('o')) targets.push(2);
          }
          for (const t of targets) {
            const base = t * 3;
            for (const b of bits) {
              const idx = base + { r: 0, w: 1, x: 2 }[b];
              if (op === '+') perms[idx] = b;
              else if (op === '-') perms[idx] = '-';
              else if (op === '=') {
                perms[base] = bits.includes('r') ? 'r' : '-';
                perms[base + 1] = bits.includes('w') ? 'w' : '-';
                perms[base + 2] = bits.includes('x') ? 'x' : '-';
              }
            }
          }
          node.permissions = perms.join('');
        }
      }
      return true;
    }

    function stat(path) {
      const abs = resolvePath(path);
      return getNode(abs);
    }

    function getCwd() { return cwd; }
    function setCwd(p) { cwd = p; }
    function getHome() { return HOME; }
    function toDisplay(absPath) {
      if (absPath === HOME) return '~';
      if (absPath.startsWith(HOME + '/')) return '~' + absPath.slice(HOME.length);
      return absPath;
    }

    function serialize() {
      return { root: JSON.parse(JSON.stringify(root)), cwd };
    }

    function restore(snapshot) {
      if (snapshot && snapshot.root) {
        root = snapshot.root;
        cwd = snapshot.cwd || HOME;
      }
    }

    return {
      init, resolvePath, getNode, getCwd, setCwd, getHome, toDisplay,
      mkdir, touch, rm, cp, mv, readFile, writeFile, appendFile,
      listDir, findFiles, chmod, stat, basename, ensureDir,
      serialize, restore
    };
  })();

  // ── Environment Variables ─────────────────────────────────────────────

  let env = {};

  function initEnv() {
    env = {
      HOME: '/home/user',
      USER: 'user',
      SHELL: '/bin/zsh',
      PATH: '/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
      TERM: 'xterm-256color',
      EDITOR: 'vim',
      LANG: 'en_US.UTF-8',
      PWD: VFS.getCwd(),
      HOSTNAME: 'macbook'
    };
  }

  // ── Command Parser ────────────────────────────────────────────────────

  function expandVars(text) {
    return text.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_, name) => env[name] || '');
  }

  function parseCommandLine(input) {
    // Split into pipeline segments first, handling chains (&&, ||, ;)
    const chains = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
      if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
      if (inSingle || inDouble) { current += ch; continue; }

      if (ch === '&' && input[i + 1] === '&') {
        chains.push({ cmd: current.trim(), op: '&&' });
        current = '';
        i++;
        continue;
      }
      if (ch === '|' && input[i + 1] === '|') {
        chains.push({ cmd: current.trim(), op: '||' });
        current = '';
        i++;
        continue;
      }
      if (ch === ';') {
        chains.push({ cmd: current.trim(), op: ';' });
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) chains.push({ cmd: current.trim(), op: null });

    return chains;
  }

  function parsePipeline(cmdStr) {
    // Split by pipe |, but not ||
    const segments = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;

    for (let i = 0; i < cmdStr.length; i++) {
      const ch = cmdStr[i];
      if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
      if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }
      if (inSingle || inDouble) { current += ch; continue; }

      if (ch === '|' && cmdStr[i + 1] !== '|') {
        segments.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) segments.push(current.trim());
    return segments;
  }

  function parseArgs(cmdStr) {
    // Parse redirects and arguments
    const args = [];
    let redirects = [];
    let current = '';
    let inSingle = false;
    let inDouble = false;

    const tokens = [];
    for (let i = 0; i < cmdStr.length; i++) {
      const ch = cmdStr[i];
      if (ch === "'" && !inDouble) {
        inSingle = !inSingle;
        continue; // don't push — continue accumulating into current
      }
      if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
        continue; // don't push — continue accumulating into current
      }
      if (inSingle || inDouble) { current += ch; continue; }

      if (ch === ' ' || ch === '\t') {
        if (current) { tokens.push(current); current = ''; }
        continue;
      }
      // Handle 2>&1, 2>, 2>>
      if (ch === '2' && cmdStr[i + 1] === '>' && cmdStr[i + 2] === '&' && cmdStr[i + 3] === '1') {
        if (current) { tokens.push(current); current = ''; }
        tokens.push('2>&1');
        i += 3;
        continue;
      }
      if (ch === '2' && cmdStr[i + 1] === '>' && cmdStr[i + 2] === '>') {
        if (current) { tokens.push(current); current = ''; }
        tokens.push('2>>');
        i += 2;
        continue;
      }
      if (ch === '2' && cmdStr[i + 1] === '>') {
        if (current) { tokens.push(current); current = ''; }
        tokens.push('2>');
        i++;
        continue;
      }
      if (ch === '>' && cmdStr[i + 1] === '>') {
        if (current) { tokens.push(current); current = ''; }
        tokens.push('>>');
        i++;
        continue;
      }
      if (ch === '>') {
        if (current) { tokens.push(current); current = ''; }
        tokens.push('>');
        continue;
      }
      if (ch === '<') {
        if (current) { tokens.push(current); current = ''; }
        tokens.push('<');
        continue;
      }
      current += ch;
    }
    if (current) tokens.push(current);

    // Separate redirects from args
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i] === '2>&1') {
        redirects.push({ type: '2>&1', target: '' });
      } else if (tokens[i] === '>' || tokens[i] === '>>' || tokens[i] === '<' || tokens[i] === '2>' || tokens[i] === '2>>') {
        redirects.push({ type: tokens[i], target: tokens[i + 1] || '' });
        i++;
      } else {
        args.push(expandVars(tokens[i]));
      }
    }

    return { command: args[0] || '', args: args.slice(1), redirects };
  }

  // ── Command Registry ──────────────────────────────────────────────────

  const COMMANDS = {
    pwd(args, ctx) {
      return { stdout: ctx.cwd, exitCode: 0 };
    },

    cd(args, ctx) {
      let target = args[0] || '~';
      // cd - goes to previous directory
      if (target === '-') {
        if (!env.OLDPWD) return { stderr: 'cd: OLDPWD not set', exitCode: 1 };
        target = env.OLDPWD;
      }
      const abs = VFS.resolvePath(target);
      const node = VFS.getNode(abs);
      if (!node) return { stderr: `cd: no such file or directory: ${target}`, exitCode: 1 };
      if (node.type !== 'dir') return { stderr: `cd: not a directory: ${target}`, exitCode: 1 };
      env.OLDPWD = VFS.getCwd();
      VFS.setCwd(abs);
      env.PWD = abs;
      return { stdout: '', exitCode: 0 };
    },

    ls(args, ctx) {
      let showAll = false;
      let longFormat = false;
      let recursive = false;
      const paths = [];

      for (const arg of args) {
        if (arg.startsWith('-')) {
          if (arg.includes('a')) showAll = true;
          if (arg.includes('l')) longFormat = true;
          if (arg.includes('R')) recursive = true;
        } else {
          paths.push(arg);
        }
      }
      if (paths.length === 0) paths.push('.');

      const results = [];
      for (const p of paths) {
        const abs = VFS.resolvePath(p);
        const node = VFS.getNode(abs);
        if (!node) { results.push(`ls: ${p}: No such file or directory`); continue; }
        if (node.type === 'file') {
          results.push(longFormat ? formatLong(node) : node.name);
          continue;
        }
        const entries = VFS.listDir(abs, showAll);
        if (!entries) continue;

        if (paths.length > 1) results.push(`${p}:`);
        if (longFormat) {
          results.push(`total ${entries.length}`);
          for (const e of entries) results.push(formatLong(e));
        } else {
          results.push(entries.map(e => e.name + (e.type === 'dir' ? '/' : '')).join('  '));
        }
      }
      return { stdout: results.join('\n'), exitCode: 0 };
    },

    cat(args, ctx) {
      if (args.length === 0) {
        return { stdout: ctx.stdin || '', exitCode: 0 };
      }
      const parts = [];
      for (const arg of args) {
        const content = VFS.readFile(arg);
        if (content === null) return { stderr: `cat: ${arg}: No such file or directory`, exitCode: 1 };
        parts.push(content);
      }
      return { stdout: parts.join(''), exitCode: 0 };
    },

    echo(args) {
      let noNewline = false;
      const filtered = [];
      for (const a of args) {
        if (a === '-n' && filtered.length === 0) { noNewline = true; continue; }
        if (a === '-e' && filtered.length === 0) continue; // accept but ignore
        filtered.push(a);
      }
      return { stdout: filtered.join(' '), exitCode: 0, noNewline };
    },

    touch(args) {
      for (const arg of args) {
        if (!VFS.touch(arg)) return { stderr: `touch: cannot create ${arg}`, exitCode: 1 };
      }
      return { stdout: '', exitCode: 0 };
    },

    mkdir(args) {
      let recursive = false;
      const dirs = [];
      for (const a of args) {
        if (a === '-p') recursive = true;
        else dirs.push(a);
      }
      for (const d of dirs) {
        const result = VFS.mkdir(d, recursive);
        if (!result.ok) {
          if (result.reason === 'exists_file') return { stderr: `mkdir: ${d}: File exists (not a directory). Use rm ${d} first, then mkdir ${d}`, exitCode: 1 };
          if (result.reason === 'exists_dir') return { stderr: `mkdir: ${d}: File exists`, exitCode: 1 };
          if (result.reason === 'not_dir') return { stderr: `mkdir: ${result.path}: Not a directory`, exitCode: 1 };
          if (result.reason === 'parent') return { stderr: `mkdir: ${d}: No such file or directory`, exitCode: 1 };
          return { stderr: `mkdir: cannot create directory '${d}'`, exitCode: 1 };
        }
      }
      return { stdout: '', exitCode: 0 };
    },

    rm(args) {
      let recursive = false;
      let force = false;
      const targets = [];
      for (const a of args) {
        if (a.startsWith('-')) {
          if (a.includes('r') || a.includes('R')) recursive = true;
          if (a.includes('f')) force = true;
        } else targets.push(a);
      }
      for (const t of targets) {
        const node = VFS.stat(t);
        if (!node) {
          if (!force) return { stderr: `rm: ${t}: No such file or directory`, exitCode: 1 };
          continue;
        }
        if (node.type === 'dir' && !recursive) {
          return { stderr: `rm: ${t}: is a directory (use -r to remove)`, exitCode: 1 };
        }
        if (!VFS.rm(t, recursive)) {
          if (!force) return { stderr: `rm: cannot remove '${t}'`, exitCode: 1 };
        }
      }
      return { stdout: '', exitCode: 0 };
    },

    cp(args) {
      let recursive = false;
      const paths = [];
      for (const a of args) {
        if (a === '-r' || a === '-R' || a === '--recursive') recursive = true;
        else paths.push(a);
      }
      if (paths.length < 2) return { stderr: 'cp: missing operand', exitCode: 1 };
      const dst = paths.pop();
      for (const src of paths) {
        if (!VFS.cp(src, dst, recursive)) return { stderr: `cp: cannot copy '${src}'`, exitCode: 1 };
      }
      return { stdout: '', exitCode: 0 };
    },

    mv(args) {
      const paths = args.filter(a => !a.startsWith('-'));
      if (paths.length < 2) return { stderr: 'mv: missing operand', exitCode: 1 };
      const dst = paths[paths.length - 1];
      const sources = paths.slice(0, -1);
      for (const src of sources) {
        if (!VFS.mv(src, dst)) return { stderr: `mv: cannot move '${src}'`, exitCode: 1 };
      }
      return { stdout: '', exitCode: 0 };
    },

    head(args, ctx) {
      let n = 10;
      const files = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n' && args[i + 1]) { n = parseInt(args[i + 1], 10) || 10; i++; }
        else if (args[i].startsWith('-') && /^\d+$/.test(args[i].slice(1))) { n = parseInt(args[i].slice(1), 10); }
        else if (!args[i].startsWith('-')) files.push(args[i]);
      }
      if (files.length === 0) {
        return { stdout: (ctx.stdin || '').split('\n').slice(0, n).join('\n'), exitCode: 0 };
      }
      const results = [];
      for (const f of files) {
        const content = VFS.readFile(f);
        if (content === null) { results.push(`head: ${f}: No such file or directory`); continue; }
        if (files.length > 1) results.push(`==> ${f} <==`);
        results.push(content.split('\n').slice(0, n).join('\n'));
      }
      return { stdout: results.join('\n'), exitCode: 0 };
    },

    tail(args, ctx) {
      let n = 10;
      const files = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-n' && args[i + 1]) { n = parseInt(args[i + 1], 10) || 10; i++; }
        else if (args[i].startsWith('-') && /^\d+$/.test(args[i].slice(1))) { n = parseInt(args[i].slice(1), 10); }
        else if (!args[i].startsWith('-')) files.push(args[i]);
      }
      if (files.length === 0) {
        const lines = (ctx.stdin || '').split('\n');
        return { stdout: lines.slice(-n).join('\n'), exitCode: 0 };
      }
      const results = [];
      for (const f of files) {
        const content = VFS.readFile(f);
        if (content === null) { results.push(`tail: ${f}: No such file or directory`); continue; }
        if (files.length > 1) results.push(`==> ${f} <==`);
        results.push(content.split('\n').slice(-n).join('\n'));
      }
      return { stdout: results.join('\n'), exitCode: 0 };
    },

    grep(args, ctx) {
      let ignoreCase = false;
      let showLineNumbers = false;
      let recursive = false;
      let countOnly = false;
      let invertMatch = false;
      let filesOnly = false;
      let pattern = null;
      const files = [];

      for (const a of args) {
        if (a.startsWith('-') && !pattern) {
          if (a.includes('i')) ignoreCase = true;
          if (a.includes('n')) showLineNumbers = true;
          if (a.includes('r')) recursive = true;
          if (a.includes('c')) countOnly = true;
          if (a.includes('v')) invertMatch = true;
          if (a.includes('l')) filesOnly = true;
        } else if (!pattern) {
          pattern = a;
        } else {
          files.push(a);
        }
      }

      if (!pattern) return { stderr: 'grep: missing pattern', exitCode: 2 };

      let regex;
      try {
        regex = new RegExp(pattern, ignoreCase ? 'i' : '');
      } catch {
        // If the pattern is invalid regex, treat as literal
        regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), ignoreCase ? 'i' : '');
      }

      function grepContent(content, prefix) {
        const lines = content.split('\n');
        const matches = [];
        lines.forEach((line, i) => {
          const hit = regex.test(line);
          if (invertMatch ? !hit : hit) {
            let out = '';
            if (prefix) out += prefix + ':';
            if (showLineNumbers) out += (i + 1) + ':';
            out += line;
            matches.push(out);
          }
        });
        return matches;
      }

      let results = [];
      if (files.length === 0 && ctx.stdin) {
        results = grepContent(ctx.stdin, '');
      } else if (recursive) {
        const allFiles = VFS.findFiles(files[0] || '.', null, 'f');
        for (const f of allFiles) {
          const content = VFS.readFile(f);
          if (content !== null) {
            const display = f.startsWith(VFS.getCwd()) ? '.' + f.slice(VFS.getCwd().length) : f;
            results.push(...grepContent(content, display));
          }
        }
      } else {
        for (const f of files) {
          const content = VFS.readFile(f);
          if (content === null) { results.push(`grep: ${f}: No such file or directory`); continue; }
          const prefix = files.length > 1 ? f : '';
          results.push(...grepContent(content, prefix));
        }
      }

      if (filesOnly) {
        // -l: show only filenames that have matches
        const matchedFiles = new Set();
        if (recursive) {
          const allFiles = VFS.findFiles(files[0] || '.', null, 'f');
          for (const f of allFiles) {
            const content = VFS.readFile(f);
            if (content && grepContent(content, '').length > 0) {
              const display = f.startsWith(VFS.getCwd()) ? '.' + f.slice(VFS.getCwd().length) : f;
              matchedFiles.add(display);
            }
          }
        } else {
          for (const f of files) {
            const content = VFS.readFile(f);
            if (content && grepContent(content, '').length > 0) matchedFiles.add(f);
          }
        }
        return { stdout: [...matchedFiles].join('\n'), exitCode: matchedFiles.size > 0 ? 0 : 1 };
      }
      if (countOnly) return { stdout: String(results.length), exitCode: results.length > 0 ? 0 : 1 };
      return { stdout: results.join('\n'), exitCode: results.length > 0 ? 0 : 1 };
    },

    find(args) {
      let path = '.';
      let namePattern = null;
      let type = null;
      let execCmd = null;
      let iname = false;

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-name' && args[i + 1]) { namePattern = args[++i]; }
        else if (args[i] === '-iname' && args[i + 1]) { namePattern = args[++i]; iname = true; }
        else if (args[i] === '-type' && args[i + 1]) { type = args[++i]; }
        else if (args[i] === '-mtime') { i++; /* accept but skip — all files match */ }
        else if (args[i] === '-newer') { i++; /* accept but skip */ }
        else if (args[i] === '-exec') {
          // Collect everything until ; or +
          const execParts = [];
          i++;
          while (i < args.length && args[i] !== ';' && args[i] !== '+') {
            execParts.push(args[i]);
            i++;
          }
          execCmd = execParts.join(' ');
        }
        else if (!args[i].startsWith('-')) { path = args[i]; }
      }

      // If -iname, make pattern case-insensitive in VFS.findFiles
      let results;
      if (iname && namePattern) {
        // findFiles uses globToRegex which is case-sensitive; do manual filter
        const allFiles = VFS.findFiles(path, null, type);
        const regex = new RegExp('^' + namePattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
        results = allFiles.filter(f => regex.test(f.split('/').pop()));
      } else {
        results = VFS.findFiles(path, namePattern, type);
      }

      const cwdPrefix = VFS.getCwd();
      const display = results.map(r => {
        if (path === '.' && r.startsWith(cwdPrefix)) return '.' + r.slice(cwdPrefix.length);
        return r;
      });

      // Handle -exec: run command for each result (replace {} with filename)
      if (execCmd) {
        const outputs = [];
        for (const file of display) {
          const cmd = execCmd.replace(/\{\}/g, file);
          const res = execute(cmd);
          if (res.stdout) outputs.push(res.stdout);
        }
        return { stdout: outputs.join('\n'), exitCode: 0 };
      }

      return { stdout: display.join('\n'), exitCode: 0 };
    },

    wc(args, ctx) {
      let linesOnly = false;
      let wordsOnly = false;
      let charsOnly = false;
      const files = [];

      for (const a of args) {
        if (a.startsWith('-')) {
          if (a.includes('l')) linesOnly = true;
          if (a.includes('w')) wordsOnly = true;
          if (a.includes('c')) charsOnly = true;
        } else files.push(a);
      }

      const content = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `wc: ${files[0]}: No such file or directory`, exitCode: 1 };

      const lines = (content.match(/\n/g) || []).length;
      const words = content.split(/\s+/).filter(Boolean).length;
      const chars = content.length;

      if (linesOnly) return { stdout: `${lines}`, exitCode: 0 };
      if (wordsOnly) return { stdout: `${words}`, exitCode: 0 };
      if (charsOnly) return { stdout: `${chars}`, exitCode: 0 };
      return { stdout: `  ${lines}  ${words}  ${chars}${files[0] ? ' ' + files[0] : ''}`, exitCode: 0 };
    },

    sort(args, ctx) {
      let unique = false;
      let reverse = false;
      let numeric = false;
      let keyField = null;
      let delimiter = null;
      const files = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-k' && args[i + 1]) { keyField = parseInt(args[++i], 10); }
        else if (args[i] === '-t' && args[i + 1]) { delimiter = args[++i]; }
        else if (args[i].startsWith('-') && !args[i].startsWith('--')) {
          if (args[i].includes('u')) unique = true;
          if (args[i].includes('r')) reverse = true;
          if (args[i].includes('n')) numeric = true;
        } else files.push(args[i]);
      }

      const content = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `sort: ${files[0]}: No such file or directory`, exitCode: 1 };

      let lines = content.split('\n');

      if (keyField && keyField > 0) {
        // Sort by field
        const sep = delimiter || /\s+/;
        lines.sort((a, b) => {
          const fa = a.split(sep)[keyField - 1] || '';
          const fb = b.split(sep)[keyField - 1] || '';
          if (numeric) return parseFloat(fa) - parseFloat(fb);
          return fa.localeCompare(fb);
        });
      } else if (numeric) {
        lines.sort((a, b) => parseFloat(a) - parseFloat(b));
      } else {
        lines.sort();
      }

      if (unique) lines = [...new Set(lines)];
      if (reverse) lines.reverse();
      return { stdout: lines.join('\n'), exitCode: 0 };
    },

    uniq(args, ctx) {
      let countFlag = false;
      let dupsOnly = false;
      const files = [];
      for (const a of args) {
        if (a.startsWith('-')) {
          if (a.includes('c')) countFlag = true;
          if (a.includes('d')) dupsOnly = true;
        }
        else files.push(a);
      }

      const content = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `uniq: ${files[0]}: No such file or directory`, exitCode: 1 };

      const lines = content.split('\n');
      const result = [];
      let prev = null;
      let count = 0;

      for (const line of lines) {
        if (line === prev) { count++; }
        else {
          if (prev !== null) {
            if (!dupsOnly || count > 1) result.push(countFlag ? `   ${count} ${prev}` : prev);
          }
          prev = line;
          count = 1;
        }
      }
      if (prev !== null) {
        if (!dupsOnly || count > 1) result.push(countFlag ? `   ${count} ${prev}` : prev);
      }

      return { stdout: result.join('\n'), exitCode: 0 };
    },

    cut(args, ctx) {
      let delimiter = '\t';
      let fields = null;
      const files = [];

      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-d' && args[i + 1]) { delimiter = args[++i]; }
        else if (args[i] === '-f' && args[i + 1]) { fields = args[++i]; }
        else if (!args[i].startsWith('-')) files.push(args[i]);
      }

      const content = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `cut: ${files[0]}: No such file or directory`, exitCode: 1 };

      if (!fields) return { stdout: content, exitCode: 0 };

      // Parse field specs: 1,3 or 1-3 or 1,3-5
      const fieldNums = [];
      for (const spec of fields.split(',')) {
        const range = spec.match(/^(\d+)-(\d+)$/);
        if (range) {
          for (let f = parseInt(range[1], 10); f <= parseInt(range[2], 10); f++) fieldNums.push(f - 1);
        } else {
          fieldNums.push(parseInt(spec, 10) - 1);
        }
      }
      const lines = content.split('\n').map(line => {
        const parts = line.split(delimiter);
        return fieldNums.map(f => parts[f] || '').join(delimiter);
      });
      return { stdout: lines.join('\n'), exitCode: 0 };
    },

    tr(args, ctx) {
      if (args.length < 2) return { stderr: 'tr: missing operand', exitCode: 1 };
      let deleteMode = false;
      let fromArg = args[0];
      let toArg = args[1];
      if (fromArg === '-d') { deleteMode = true; fromArg = args[1]; toArg = ''; }

      const content = ctx.stdin || '';

      // Expand POSIX character classes
      function expandClass(s) {
        return s
          .replace(/\[:lower:]/g, 'abcdefghijklmnopqrstuvwxyz')
          .replace(/\[:upper:]/g, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
          .replace(/\[:digit:]/g, '0123456789')
          .replace(/\[:alpha:]/g, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ')
          .replace(/\[:alnum:]/g, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
          .replace(/\[:space:]/g, ' \t\n\r')
          .replace(/\[:punct:]/g, '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
      }
      const from = expandClass(fromArg);
      const to = expandClass(toArg || '');

      if (deleteMode) {
        const delSet = new Set(from);
        return { stdout: [...content].filter(c => !delSet.has(c)).join(''), exitCode: 0 };
      }

      let result = content;
      for (let i = 0; i < from.length; i++) {
        const replacement = i < to.length ? to[i] : to[to.length - 1] || '';
        result = result.split(from[i]).join(replacement);
      }
      return { stdout: result, exitCode: 0 };
    },

    sed(args) {
      const files = [];
      let expression = null;
      let inPlace = false;
      let suppressOutput = false;

      for (const a of args) {
        if (a === '-i' || a === "-i''") inPlace = true;
        else if (a === '-n') suppressOutput = true;
        else if (!expression && !a.startsWith('-') && (
          a.startsWith('s/') || a.startsWith('s|') ||
          /^\d/.test(a) || a.startsWith('/') || a.startsWith("'")
        )) {
          // Strip surrounding quotes if present
          expression = a.replace(/^'(.*)'$/, '$1');
        }
        else if (!a.startsWith('-')) files.push(a);
      }

      if (!expression) return { stderr: 'sed: no expression provided', exitCode: 1 };
      if (files.length === 0) return { stderr: 'sed: no input file', exitCode: 1 };

      const content = VFS.readFile(files[0]);
      if (content === null) return { stderr: `sed: ${files[0]}: No such file or directory`, exitCode: 1 };

      const lines = content.split('\n');

      // Handle line-range print: N,Mp or Np
      const rangeMatch = expression.match(/^(\d+)(?:,(\d+))?p$/);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : start;
        const selected = lines.slice(start - 1, end);
        return { stdout: selected.join('\n'), exitCode: 0 };
      }

      // Handle pattern-range print: /pat1/,/pat2/p
      const patternRangeMatch = expression.match(/^\/(.+?)\/,\/(.+?)\/p$/);
      if (patternRangeMatch) {
        const startRe = new RegExp(patternRangeMatch[1]);
        const endRe = new RegExp(patternRangeMatch[2]);
        const result = [];
        let inRange = false;
        for (const line of lines) {
          if (!inRange && startRe.test(line)) inRange = true;
          if (inRange) result.push(line);
          if (inRange && endRe.test(line)) inRange = false;
        }
        return { stdout: result.join('\n'), exitCode: 0 };
      }

      // Handle pattern print: /pattern/p
      const patternMatch = expression.match(/^\/(.+?)\/p$/);
      if (patternMatch) {
        const re = new RegExp(patternMatch[1]);
        const result = lines.filter(l => re.test(l));
        return { stdout: result.join('\n'), exitCode: 0 };
      }

      // Handle line delete: Nd or N,Md
      const deleteMatch = expression.match(/^(\d+)(?:,(\d+))?d$/);
      if (deleteMatch) {
        const start = parseInt(deleteMatch[1], 10);
        const end = deleteMatch[2] ? parseInt(deleteMatch[2], 10) : start;
        const result = lines.filter((_, i) => i < start - 1 || i >= end);
        const out = result.join('\n');
        if (inPlace) VFS.writeFile(files[0], out);
        return { stdout: suppressOutput ? '' : out, exitCode: 0 };
      }

      // Handle substitution: s/old/new/flags
      if (expression.startsWith('s/') || expression.startsWith('s|')) {
        const delim = expression[1];
        const parts = expression.slice(2).split(delim);
        if (parts.length < 2) return { stderr: 'sed: invalid expression', exitCode: 1 };
        const [search, replace] = parts;
        const flags = parts[2] || '';
        const regex = new RegExp(search, flags.includes('g') ? 'g' : '');
        // Apply substitution line by line (real sed behavior)
        const result = lines.map(line => line.replace(regex, replace)).join('\n');
        if (inPlace) VFS.writeFile(files[0], result);
        return { stdout: inPlace ? '' : result, exitCode: 0 };
      }

      return { stderr: `sed: unknown expression: ${expression}`, exitCode: 1 };
    },

    chmod(args) {
      if (args.length < 2) return { stderr: 'chmod: missing operand', exitCode: 1 };
      const mode = args[0];
      for (let i = 1; i < args.length; i++) {
        if (!VFS.chmod(args[i], mode)) return { stderr: `chmod: ${args[i]}: No such file or directory`, exitCode: 1 };
      }
      return { stdout: '', exitCode: 0 };
    },

    chown(args) {
      if (args.length < 2) return { stderr: 'chown: missing operand', exitCode: 1 };
      const owner = args[0];
      for (let i = 1; i < args.length; i++) {
        const node = VFS.stat(args[i]);
        if (!node) return { stderr: `chown: ${args[i]}: No such file or directory`, exitCode: 1 };
        node.owner = owner.split(':')[0];
      }
      return { stdout: '', exitCode: 0 };
    },

    ps(args) {
      const showAll = args.some(a => a.includes('a') || a.includes('e'));
      const lines = [
        '  PID TTY          TIME CMD',
        '    1 ?        00:00:03 init',
        '  234 ?        00:00:01 sshd',
        '  567 pts/0    00:00:00 zsh',
        ' 1234 pts/0    00:00:05 node server.js',
        ' 1456 pts/1    00:00:02 python3 app.py',
        ' 1789 pts/0    00:00:00 ps'
      ];
      if (!showAll) return { stdout: lines.slice(0, 1).concat(lines.slice(4)).join('\n'), exitCode: 0 };
      return { stdout: lines.join('\n'), exitCode: 0 };
    },

    kill(args) {
      let signal = 'TERM';
      const pids = [];
      for (const a of args) {
        if (a.startsWith('-')) signal = a.slice(1);
        else pids.push(a);
      }
      if (pids.length === 0) return { stderr: 'kill: missing operand', exitCode: 1 };
      return { stdout: '', exitCode: 0 };
    },

    jobs() {
      return { stdout: '[1]  + running    node server.js\n[2]  - suspended  python3 app.py', exitCode: 0 };
    },

    bg(args) {
      const job = args[0] || '%1';
      return { stdout: `[1]  + continued  ${job}`, exitCode: 0 };
    },

    fg(args) {
      const job = args[0] || '%1';
      return { stdout: `[1]  + running    ${job}`, exitCode: 0 };
    },

    top() {
      return {
        stdout: `Processes: 312 total, 2 running, 310 sleeping\nCPU usage: 5.2% user, 3.1% sys, 91.7% idle\nMemory: 16384M total, 8921M used, 7463M free\n\n  PID  USER     CPU%  MEM%  COMMAND\n 1234  user     12.3  2.1%  node server.js\n 1456  user      8.7  1.5%  python3 app.py\n  567  user      0.1  0.3%  zsh\n  234  root      0.0  0.1%  sshd`,
        exitCode: 0
      };
    },

    which(args) {
      if (args.length === 0) return { stderr: 'which: missing argument', exitCode: 1 };
      const known = {
        ls: '/bin/ls', cd: '(shell builtin)', cat: '/bin/cat', grep: '/usr/bin/grep',
        find: '/usr/bin/find', git: '/usr/bin/git', node: '/usr/local/bin/node',
        npm: '/usr/local/bin/npm', python3: '/usr/local/bin/python3', pip: '/usr/local/bin/pip',
        docker: '/usr/local/bin/docker', ssh: '/usr/bin/ssh', curl: '/usr/bin/curl',
        vim: '/usr/bin/vim', zsh: '/bin/zsh', brew: '/opt/homebrew/bin/brew'
      };
      const cmd = args[0];
      return { stdout: known[cmd] || `${cmd} not found`, exitCode: known[cmd] ? 0 : 1 };
    },

    man(args) {
      if (args.length === 0) return { stderr: 'What manual page do you want?', exitCode: 1 };
      const cmd = args[0];
      const manPages = {
        ls: 'LS(1)\n\nNAME\n  ls - list directory contents\n\nSYNOPSIS\n  ls [-AaCdFfhiklnqRrSstuw] [file ...]\n\nDESCRIPTION\n  List information about files (current directory by default).\n\n  -a  Include entries starting with .\n  -l  Use long listing format\n  -R  List subdirectories recursively\n  -h  Human-readable sizes',
        cd: 'CD(1)\n\nNAME\n  cd - change the current directory\n\nSYNOPSIS\n  cd [directory]\n\nDESCRIPTION\n  Change working directory to specified path.\n  With no arguments, changes to $HOME.\n  cd -  changes to previous directory.\n  cd .. changes to parent directory.',
        grep: 'GREP(1)\n\nNAME\n  grep - print lines matching a pattern\n\nSYNOPSIS\n  grep [-cinrvl] pattern [file ...]\n\nDESCRIPTION\n  Search for pattern in files or stdin.\n\n  -i  Ignore case\n  -n  Show line numbers\n  -r  Recursive search\n  -c  Count matching lines\n  -v  Invert match',
        find: 'FIND(1)\n\nNAME\n  find - walk a file hierarchy\n\nSYNOPSIS\n  find [path] [expression]\n\nDESCRIPTION\n  Recursively find files matching criteria.\n\n  -name pattern   Match filename\n  -type f|d       File type (f=file, d=dir)',
        chmod: 'CHMOD(1)\n\nNAME\n  chmod - change file modes\n\nSYNOPSIS\n  chmod mode file\n\nDESCRIPTION\n  Change file permissions.\n  Octal: chmod 755 file\n  Symbolic: chmod +x file',
        cat: 'CAT(1)\n\nNAME\n  cat - concatenate and print files\n\nSYNOPSIS\n  cat [file ...]\n\nDESCRIPTION\n  Concatenate files and print to stdout.',
        mkdir: 'MKDIR(1)\n\nNAME\n  mkdir - make directories\n\nSYNOPSIS\n  mkdir [-p] directory ...\n\nDESCRIPTION\n  Create directories.\n  -p  Create intermediate directories as needed.',
        rm: 'RM(1)\n\nNAME\n  rm - remove files or directories\n\nSYNOPSIS\n  rm [-rf] file ...\n\nDESCRIPTION\n  Remove files.\n  -r  Recursive (directories)\n  -f  Force (no confirmation)'
      };
      return { stdout: manPages[cmd] || `No manual entry for ${cmd}`, exitCode: manPages[cmd] ? 0 : 1 };
    },

    history() {
      if (commandHistory.length === 0) return { stdout: '(no history)', exitCode: 0 };
      return {
        stdout: commandHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`).join('\n'),
        exitCode: 0
      };
    },

    clear() {
      const output = document.getElementById('terminal-output');
      if (output) output.innerHTML = '';
      return { stdout: '', exitCode: 0 };
    },

    export(args) {
      for (const a of args) {
        const eq = a.indexOf('=');
        if (eq > 0) {
          const key = a.slice(0, eq);
          const val = a.slice(eq + 1).replace(/^["']|["']$/g, '');
          env[key] = val;
        }
      }
      return { stdout: '', exitCode: 0 };
    },

    env() {
      return { stdout: Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n'), exitCode: 0 };
    },

    alias(args) {
      if (args.length === 0) {
        const lines = Object.entries(aliases).map(([k, v]) => `${k}='${v}'`);
        return { stdout: lines.join('\n') || '(no aliases defined)', exitCode: 0 };
      }
      for (const a of args) {
        const eq = a.indexOf('=');
        if (eq > 0) {
          aliases[a.slice(0, eq)] = a.slice(eq + 1).replace(/^["']|["']$/g, '');
        }
      }
      return { stdout: '', exitCode: 0 };
    },

    unalias(args) {
      for (const a of args) delete aliases[a];
      return { stdout: '', exitCode: 0 };
    },

    date() {
      return { stdout: new Date().toString(), exitCode: 0 };
    },

    whoami() {
      return { stdout: 'user', exitCode: 0 };
    },

    hostname() {
      return { stdout: 'macbook', exitCode: 0 };
    },

    // ── Developer tool simulators ──────────────────────────────────────

    git(args) {
      const sub = args[0] || '';
      const rest = args.slice(1);

      const responses = {
        init: 'Initialized empty Git repository in ' + VFS.getCwd() + '/.git/',
        status: 'On branch main\nnothing to commit, working tree clean',
        add: '',
        commit: rest.includes('-m') ? `[main abc1234] ${rest[rest.indexOf('-m') + 1] || 'commit'}\n 2 files changed, 15 insertions(+)` : '[main abc1234] commit\n 2 files changed',
        log: 'commit abc1234 (HEAD -> main)\nAuthor: dev <dev@startup.com>\nDate:   Mon Jan 15 10:30:00 2024\n\n    Initial commit\n\ncommit def5678\nAuthor: dev <dev@startup.com>\nDate:   Mon Jan 14 09:00:00 2024\n\n    Setup project structure',
        branch: rest.length > 0 ? '' : '* main\n  develop\n  feature/auth',
        checkout: rest.length > 0 ? `Switched to branch '${rest[rest.length - 1]}'` : 'error: pathspec needed',
        switch: rest.length > 0 ? `Switched to branch '${rest[rest.length - 1]}'` : 'fatal: missing branch name',
        merge: rest.length > 0 ? `Merge made by the 'ort' strategy.\n 3 files changed, 42 insertions(+), 5 deletions(-)` : 'fatal: missing branch name',
        diff: '--- a/app.py\n+++ b/app.py\n@@ -1,3 +1,5 @@\n from flask import Flask\n+from auth import require_login\n app = Flask(__name__)\n+app.config[\'SECRET_KEY\'] = \'dev\'',
        rebase: rest.length > 0 ? `Successfully rebased and updated refs/heads/main.` : 'fatal: missing branch name',
        'cherry-pick': rest.length > 0 ? `[main 9f8e7d6] Cherry-picked commit\n 1 file changed, 3 insertions(+)` : 'fatal: missing commit hash',
        bisect: 'usage: git bisect [start|bad|good|reset]',
        pull: 'Already up to date.',
        push: 'Everything up-to-date',
        remote: 'origin\thttps://github.com/user/webapp.git (fetch)\norigin\thttps://github.com/user/webapp.git (push)',
        stash: 'Saved working directory and index state WIP on main: abc1234 Latest commit'
      };

      const out = responses[sub];
      if (out === undefined) return { stderr: `git: '${sub}' is not a git command`, exitCode: 1 };
      return { stdout: out, exitCode: 0 };
    },

    ssh(args) {
      if (args.length === 0) return { stderr: 'usage: ssh [user@]hostname', exitCode: 1 };
      const target = args[args.length - 1];
      if (args.includes('-T')) return { stdout: `Hi user! You've successfully authenticated to ${target}`, exitCode: 0 };
      return { stdout: `Connection to ${target} established.\nWelcome to Ubuntu 22.04 LTS\nLast login: Mon Jan 15 10:00:00 2024`, exitCode: 0 };
    },

    'ssh-keygen'(args) {
      let type = 'rsa';
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-t' && args[i + 1]) type = args[++i];
      }
      return {
        stdout: `Generating public/private ${type} key pair.\nYour identification has been saved in /home/user/.ssh/id_${type}\nYour public key has been saved in /home/user/.ssh/id_${type}.pub\nThe key fingerprint is:\nSHA256:xR4g7KqP2mN8vL5jF1hT9wY3aB6cD0eU ${env.USER}@${env.HOSTNAME}`,
        exitCode: 0
      };
    },

    docker(args) {
      const sub = args[0] || '';
      const responses = {
        ps: 'CONTAINER ID   IMAGE          STATUS         PORTS                    NAMES\na1b2c3d4e5f6   webapp:latest  Up 2 hours     0.0.0.0:3000->3000/tcp   webapp-web-1\nf6e5d4c3b2a1   postgres:14    Up 2 hours     5432/tcp                 webapp-db-1',
        images: 'REPOSITORY   TAG       IMAGE ID       CREATED        SIZE\nwebapp       latest    sha256:abc123  2 hours ago    945MB\npostgres     14        sha256:def456  3 weeks ago    379MB\nnode         18        sha256:ghi789  4 weeks ago    991MB',
        run: 'Unable to find image locally. Pulling...\nStatus: Downloaded newer image\nContainer started.',
        build: 'Step 1/5 : FROM node:18\n ---> Using cache\nStep 2/5 : WORKDIR /app\n ---> Using cache\nStep 3/5 : COPY . .\nStep 4/5 : RUN npm install\nStep 5/5 : CMD ["node", "server.js"]\nSuccessfully built abc123def456',
        pull: `Using default tag: latest\nlatest: Pulling from library/${args[1] || 'image'}\nDigest: sha256:abc123def456\nStatus: Downloaded newer image for ${args[1] || 'image'}:latest`,
        exec: `(attached to container ${args[1] || 'container'})`,
        compose: dockerCompose(args.slice(1)),
        stop: 'Container stopped.',
        rm: 'Container removed.',
        logs: '[webapp-web-1] Server started on port 3000\n[webapp-web-1] GET / 200 12ms\n[webapp-db-1] database system is ready to accept connections',
        inspect: `[{"Id": "a1b2c3d4e5f6", "Image": "webapp:latest", "State": {"Status": "running"}}]`
      };
      const out = responses[sub];
      if (out === undefined) return { stderr: `docker: '${sub}' is not a docker command`, exitCode: 1 };
      return { stdout: typeof out === 'string' ? out : out, exitCode: 0 };
    },

    npm(args) {
      const sub = args[0] || '';
      const responses = {
        init: 'Wrote to /home/user/projects/package.json',
        install: 'added 127 packages in 4.2s',
        i: 'added 127 packages in 4.2s',
        start: '> webapp@1.0.0 start\n> node server.js\n\nServer running on port 3000',
        run: `> webapp@1.0.0 ${args[1] || 'script'}\n> running...`,
        test: '> webapp@1.0.0 test\n> jest\n\nPASS  tests/app.test.js\n  2 tests passed',
        list: 'webapp@1.0.0\n├── express@4.18.2\n├── react@18.2.0\n└── jest@29.7.0'
      };
      return { stdout: responses[sub] || `npm: unknown command '${sub}'`, exitCode: responses[sub] ? 0 : 1 };
    },

    node(args) {
      if (args.length === 0) return { stdout: 'Welcome to Node.js v18.17.0.\nType ".exit" to exit.', exitCode: 0 };
      return { stdout: `Executing ${args[0]}...`, exitCode: 0 };
    },

    pip(args) {
      const sub = args[0] || '';
      const responses = {
        install: `Successfully installed ${args[1] || 'package'}`,
        list: 'Package         Version\n--------------- -------\nflask           3.0.0\nrequests        2.31.0\nnumpy           1.24.0\npytest          7.4.0',
        freeze: 'flask==3.0.0\nrequests==2.31.0\nnumpy==1.24.0\npytest==7.4.0'
      };
      return { stdout: responses[sub] || `pip: unknown command '${sub}'`, exitCode: responses[sub] ? 0 : 1 };
    },

    python3(args) {
      if (args.includes('-m') && args.includes('venv')) {
        const venvName = args[args.indexOf('venv') + 1] || args[args.length - 1] || 'venv';
        VFS.mkdir(venvName, true);
        VFS.ensureDir(VFS.resolvePath(venvName + '/bin'));
        VFS.writeFile(venvName + '/bin/activate', '# Activate script\nexport VIRTUAL_ENV="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"');
        return { stdout: '', exitCode: 0 };
      }
      if (args.length === 0) return { stdout: 'Python 3.11.5 (default)\nType "help" for more information.\n>>>', exitCode: 0 };
      return { stdout: `Executing ${args[0]}...`, exitCode: 0 };
    },

    source(args) {
      if (args[0] && args[0].includes('activate')) {
        env.VIRTUAL_ENV = VFS.getCwd() + '/venv';
        return { stdout: '', exitCode: 0 };
      }
      return { stdout: '', exitCode: 0 };
    },

    '.'(args) { return COMMANDS.source(args); },

    curl(args) {
      let url = '';
      let verbose = false;
      let method = 'GET';
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-v') verbose = true;
        else if (args[i] === '-X' && args[i + 1]) method = args[++i];
        else if (!args[i].startsWith('-')) url = args[i];
      }
      if (!url) return { stderr: 'curl: no URL specified', exitCode: 1 };

      let output = '';
      if (verbose) output += `> ${method} ${url}\n> Host: ${url.split('/')[2] || 'localhost'}\n> Accept: */*\n< HTTP/1.1 200 OK\n< Content-Type: application/json\n< \n`;
      if (url.includes('health')) output += '{"status":"ok","uptime":12345}';
      else output += '{"message":"success","data":[]}';
      return { stdout: output, exitCode: 0 };
    },

    wget(args) {
      const url = args.find(a => !a.startsWith('-')) || '';
      if (!url) return { stderr: 'wget: missing URL', exitCode: 1 };
      const filename = url.split('/').pop() || 'index.html';
      return { stdout: `--2024-01-15 10:30:00--  ${url}\nConnecting... connected.\nHTTP request sent, awaiting response... 200 OK\nSaving to: '${filename}'\n${filename}          100%[==================>] 2.4K  --.-KB/s    in 0s\n'${filename}' saved`, exitCode: 0 };
    },

    brew(args) {
      const sub = args[0] || '';
      const pkg = args[1] || 'package';
      const responses = {
        install: `==> Installing ${pkg}\n==> Pouring...\n==> Summary\n  /opt/homebrew/Cellar/${pkg}/1.0.0: 42 files, 3.2MB`,
        uninstall: `Uninstalling /opt/homebrew/Cellar/${pkg}/1.0.0...`,
        remove: `Uninstalling /opt/homebrew/Cellar/${pkg}/1.0.0...`,
        upgrade: `==> Upgrading ${pkg}\n==> Pouring ${pkg}-1.1.0.arm64_monterey.bottle.tar.gz\n==> Summary\n  /opt/homebrew/Cellar/${pkg}/1.1.0: 42 files, 3.4MB`,
        list: 'git\nnode\npython@3.11\nwget\ntree\njq',
        update: '==> Updated Homebrew!\n==> Updated 3 taps',
        search: `==> Formulae\n${pkg}`,
        info: `${pkg}: stable 1.0.0\nhttps://example.com\n/opt/homebrew/Cellar/${pkg}/1.0.0 (42 files, 3.2MB)`,
        cleanup: '==> Pruning files...\n==> Removed 12 files'
      };
      return { stdout: responses[sub] || `brew: unknown command '${sub}'`, exitCode: responses[sub] ? 0 : 1 };
    },

    virtualenv(args) { return COMMANDS.python3(['-m', 'venv', ...args]); },

    lsof(args) {
      let portFilter = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-i' && args[i + 1]) portFilter = args[++i];
        else if (args[i] === '-ti' && args[i + 1]) { portFilter = args[++i]; return { stdout: '1234', exitCode: 0 }; }
      }
      if (portFilter) {
        return { stdout: `COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    1234 user   12u  IPv4 0x1234   0t0  TCP *:${portFilter.replace(':', '')} (LISTEN)`, exitCode: 0 };
      }
      return { stdout: 'COMMAND  PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME\nnode    1234 user   12u  IPv4 0x1234   0t0  TCP *:3000 (LISTEN)\npython3 1456 user    8u  IPv4 0x5678   0t0  TCP *:8080 (LISTEN)', exitCode: 0 };
    },

    netstat(args) {
      return { stdout: 'Active Internet connections\nProto Local Address          Foreign Address        State\ntcp4  *.3000                 *.*                    LISTEN\ntcp4  *.8080                 *.*                    LISTEN\ntcp4  *.5432                 *.*                    LISTEN', exitCode: 0 };
    },

    dig(args) {
      const domain = args.find(a => !a.startsWith('-') && !a.startsWith('+')) || 'localhost';
      const short = args.includes('+short');
      if (short) return { stdout: '140.82.121.3', exitCode: 0 };
      return { stdout: `; <<>> DiG 9.10.6 <<>> ${domain}\n;; QUESTION SECTION:\n;${domain}.\t\tIN\tA\n\n;; ANSWER SECTION:\n${domain}.\t60\tIN\tA\t140.82.121.3\n\n;; Query time: 23 msec`, exitCode: 0 };
    },

    nslookup(args) {
      const domain = args[0] || 'localhost';
      return { stdout: `Server:\t\t8.8.8.8\nAddress:\t8.8.8.8#53\n\nNon-authoritative answer:\nName:\t${domain}\nAddress: 140.82.121.3`, exitCode: 0 };
    },

    host(args) {
      const domain = args[0] || 'localhost';
      return { stdout: `${domain} has address 140.82.121.3`, exitCode: 0 };
    },

    test(args) {
      // Support [ -f file ] style conditionals
      const flag = args[0];
      const target = args[1];
      if (!flag || !target) return { exitCode: 1 };
      const node = VFS.stat(target);
      if (flag === '-f') return { exitCode: node && node.type === 'file' ? 0 : 1 };
      if (flag === '-d') return { exitCode: node && node.type === 'dir' ? 0 : 1 };
      if (flag === '-e') return { exitCode: node ? 0 : 1 };
      if (flag === '-r' || flag === '-w') return { exitCode: node ? 0 : 1 };
      if (flag === '-x') return { exitCode: node && node.permissions && node.permissions.includes('x') ? 0 : 1 };
      if (flag === '-s') return { exitCode: node && node.type === 'file' && node.content && node.content.length > 0 ? 0 : 1 };
      return { exitCode: 1 };
    },

    '['(args) {
      // Shell [ -f file ] syntax — strip trailing ]
      const cleaned = args.filter(a => a !== ']');
      return COMMANDS.test(cleaned);
    },

    xargs(args, ctx) {
      if (!ctx.stdin) return { stderr: 'xargs: missing input', exitCode: 1 };
      const cmd = args[0] || 'echo';
      const cmdArgs = args.slice(1);
      const items = ctx.stdin.trim().split('\n');
      const results = [];
      for (const item of items) {
        const handler = COMMANDS[cmd];
        if (handler) {
          const res = handler([...cmdArgs, item], { ...ctx, stdin: '' });
          if (res.stdout) results.push(res.stdout);
        }
      }
      return { stdout: results.join('\n'), exitCode: 0 };
    },

    // ── Additional common commands ────────────────────────────────────

    less(args, ctx) {
      // Simulate pager — just show content (can't actually page in browser)
      if (args.length === 0 && ctx.stdin) return { stdout: ctx.stdin, exitCode: 0 };
      if (args.length === 0) return { stderr: 'Missing filename', exitCode: 1 };
      const content = VFS.readFile(args[0]);
      if (content === null) return { stderr: `${args[0]}: No such file or directory`, exitCode: 1 };
      return { stdout: content, exitCode: 0 };
    },

    more(args, ctx) { return COMMANDS.less(args, ctx); },

    tee(args, ctx) {
      let append = false;
      const files = [];
      for (const a of args) {
        if (a === '-a') append = true;
        else files.push(a);
      }
      const input = ctx.stdin || '';
      for (const f of files) {
        if (append) VFS.appendFile(f, input);
        else VFS.writeFile(f, input);
      }
      return { stdout: input, exitCode: 0 };
    },

    sleep(args) {
      // Can't actually sleep in browser — just acknowledge
      const dur = args[0] || '1';
      return { stdout: '', exitCode: 0 };
    },

    true() { return { stdout: '', exitCode: 0 }; },
    false() { return { stdout: '', exitCode: 1 }; },

    yes(args) {
      const text = args.join(' ') || 'y';
      return { stdout: Array(10).fill(text).join('\n'), exitCode: 0 };
    },

    seq(args) {
      let start = 1, end = 1, step = 1;
      if (args.length === 1) { end = parseInt(args[0], 10) || 1; }
      else if (args.length === 2) { start = parseInt(args[0], 10) || 1; end = parseInt(args[1], 10) || 1; }
      else if (args.length >= 3) { start = parseInt(args[0], 10); step = parseInt(args[1], 10); end = parseInt(args[2], 10); }
      const result = [];
      if (step > 0) { for (let i = start; i <= end; i += step) result.push(String(i)); }
      else if (step < 0) { for (let i = start; i >= end; i += step) result.push(String(i)); }
      return { stdout: result.join('\n'), exitCode: 0 };
    },

    basename(args) {
      if (args.length === 0) return { stderr: 'basename: missing operand', exitCode: 1 };
      const parts = args[0].split('/').filter(Boolean);
      let name = parts[parts.length - 1] || '';
      if (args[1]) name = name.replace(new RegExp(args[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'), '');
      return { stdout: name, exitCode: 0 };
    },

    dirname(args) {
      if (args.length === 0) return { stderr: 'dirname: missing operand', exitCode: 1 };
      const path = args[0];
      const parts = path.split('/');
      parts.pop();
      return { stdout: parts.join('/') || '.', exitCode: 0 };
    },

    realpath(args) {
      if (args.length === 0) return { stderr: 'realpath: missing operand', exitCode: 1 };
      return { stdout: VFS.resolvePath(args[0]), exitCode: 0 };
    },

    ln(args) {
      let symbolic = false;
      const paths = [];
      for (const a of args) {
        if (a === '-s' || a === '--symbolic') symbolic = true;
        else paths.push(a);
      }
      if (paths.length < 2) return { stderr: 'ln: missing operand', exitCode: 1 };
      // Simulate: just copy the file (symlinks aren't real in VFS)
      const src = paths[0], dst = paths[1];
      if (!VFS.cp(src, dst, false)) return { stderr: `ln: ${src}: No such file or directory`, exitCode: 1 };
      return { stdout: '', exitCode: 0 };
    },

    df() {
      return { stdout: 'Filesystem     Size   Used  Avail  Use%  Mounted on\n/dev/disk1s1   460G   210G   230G   48%  /\ntmpfs          8.0G   1.2G   6.8G   15%  /tmp', exitCode: 0 };
    },

    du(args) {
      let summary = false;
      let human = false;
      const paths = [];
      for (const a of args) {
        if (a.includes('s')) summary = true;
        if (a.includes('h')) human = true;
        if (!a.startsWith('-')) paths.push(a);
      }
      const target = paths[0] || '.';
      if (summary) return { stdout: `${human ? '4.2M' : '4300'}\t${target}`, exitCode: 0 };
      return { stdout: `${human ? '1.2K' : '1200'}\t${target}/src\n${human ? '2.8M' : '2800'}\t${target}/node_modules\n${human ? '4.2M' : '4300'}\t${target}`, exitCode: 0 };
    },

    tree(args) {
      let maxDepth = Infinity;
      const paths = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-L' && args[i + 1]) { maxDepth = parseInt(args[++i], 10); }
        else if (!args[i].startsWith('-')) paths.push(args[i]);
      }
      const target = paths[0] || '.';
      const abs = VFS.resolvePath(target);
      const node = VFS.getNode(abs);
      if (!node || node.type !== 'dir') return { stderr: `${target}: not a directory`, exitCode: 1 };

      const lines = [target];
      let dirs = 0, files = 0;
      function walk(dirNode, prefix, depth) {
        if (depth >= maxDepth) return;
        const entries = Object.values(dirNode.children || {}).sort((a, b) => a.name.localeCompare(b.name));
        entries.forEach((e, i) => {
          const isLast = i === entries.length - 1;
          const connector = isLast ? '└── ' : '├── ';
          lines.push(prefix + connector + e.name);
          if (e.type === 'dir') { dirs++; walk(e, prefix + (isLast ? '    ' : '│   '), depth + 1); }
          else files++;
        });
      }
      walk(node, '', 0);
      lines.push(`\n${dirs} directories, ${files} files`);
      return { stdout: lines.join('\n'), exitCode: 0 };
    },

    printf(args) {
      if (args.length === 0) return { stdout: '', exitCode: 0 };
      let fmt = args[0];
      const vals = args.slice(1);
      let vi = 0;
      const result = fmt.replace(/%s/g, () => vals[vi++] || '').replace(/%d/g, () => vals[vi++] || '0').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      return { stdout: result, exitCode: 0 };
    },

    file(args) {
      if (args.length === 0) return { stderr: 'file: missing operand', exitCode: 1 };
      const node = VFS.stat(args[0]);
      if (!node) return { stderr: `${args[0]}: No such file or directory`, exitCode: 1 };
      if (node.type === 'dir') return { stdout: `${args[0]}: directory`, exitCode: 0 };
      const ext = args[0].split('.').pop();
      const types = { js: 'JavaScript source', py: 'Python script', json: 'JSON data', md: 'Markdown', sh: 'Bourne-Again shell script', css: 'CSS', html: 'HTML document', txt: 'ASCII text', log: 'ASCII text', yml: 'YAML', yaml: 'YAML', toml: 'TOML', xml: 'XML' };
      return { stdout: `${args[0]}: ${types[ext] || 'ASCII text'}`, exitCode: 0 };
    },

    type(args) {
      if (args.length === 0) return { stderr: 'type: missing argument', exitCode: 1 };
      const cmd = args[0];
      if (COMMANDS[cmd]) return { stdout: `${cmd} is a shell builtin`, exitCode: 0 };
      if (aliases[cmd]) return { stdout: `${cmd} is an alias for '${aliases[cmd]}'`, exitCode: 0 };
      return { stderr: `${cmd}: not found`, exitCode: 1 };
    },

    time(args, ctx) {
      if (args.length === 0) return { stderr: 'time: missing command', exitCode: 1 };
      const result = execute(args.join(' '));
      const elapsed = (Math.random() * 0.5 + 0.01).toFixed(3);
      return { stdout: (result.stdout || '') + `\nreal\t0m${elapsed}s\nuser\t0m${(elapsed * 0.8).toFixed(3)}s\nsys\t0m${(elapsed * 0.2).toFixed(3)}s`, exitCode: result.exitCode };
    },

    diff(args) {
      const files = args.filter(a => !a.startsWith('-'));
      if (files.length < 2) return { stderr: 'diff: missing operand', exitCode: 1 };
      const a = VFS.readFile(files[0]);
      const b = VFS.readFile(files[1]);
      if (a === null) return { stderr: `diff: ${files[0]}: No such file or directory`, exitCode: 2 };
      if (b === null) return { stderr: `diff: ${files[1]}: No such file or directory`, exitCode: 2 };
      if (a === b) return { stdout: '', exitCode: 0 };
      const aLines = a.split('\n'), bLines = b.split('\n');
      const out = [`--- ${files[0]}`, `+++ ${files[1]}`];
      const maxLen = Math.max(aLines.length, bLines.length);
      for (let i = 0; i < maxLen; i++) {
        if (aLines[i] !== bLines[i]) {
          if (aLines[i] !== undefined) out.push(`-${aLines[i]}`);
          if (bLines[i] !== undefined) out.push(`+${bLines[i]}`);
        }
      }
      return { stdout: out.join('\n'), exitCode: 1 };
    },

    tar(args) {
      const hasCreate = args.some(a => a.includes('c'));
      const hasExtract = args.some(a => a.includes('x'));
      const hasView = args.some(a => a.includes('t'));
      const file = args.find(a => !a.startsWith('-') && (a.includes('.tar') || a.includes('.tgz')));
      if (hasCreate) return { stdout: '', exitCode: 0 };
      if (hasExtract) return { stdout: `Extracted to ./`, exitCode: 0 };
      if (hasView) return { stdout: 'drwxr-xr-x  user/staff  0 2024-01-15 10:00 ./\n-rw-r--r--  user/staff  1234 2024-01-15 10:00 ./package.json\n-rw-r--r--  user/staff  567 2024-01-15 10:00 ./README.md', exitCode: 0 };
      return { stderr: 'tar: missing operation', exitCode: 1 };
    },

    awk(args, ctx) {
      if (args.length === 0) return { stderr: 'awk: missing program', exitCode: 1 };

      // Parse -F flag for field separator
      let fieldSep = /\s+/;
      let programIdx = 0;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-F' && args[i + 1]) { fieldSep = args[++i]; programIdx = i + 1; }
        else if (args[i].startsWith('-F')) { fieldSep = args[i].slice(2); programIdx = i + 1; }
      }
      const program = args[programIdx] || args[0];
      const files = args.slice(programIdx + 1).filter(a => !a.startsWith('-'));
      const content = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `awk: ${files[0]}: No such file or directory`, exitCode: 1 };

      const lines = content.split('\n');
      const results = [];

      // Parse BEGIN { ... } main { ... } END { ... } structure
      const beginMatch = program.match(/BEGIN\s*\{([^}]*)\}/);
      const endMatch = program.match(/END\s*\{([^}]*)\}/);
      // Strip BEGIN/END to get the main program
      let mainProg = program
        .replace(/BEGIN\s*\{[^}]*\}/, '')
        .replace(/END\s*\{[^}]*\}/, '')
        .trim();

      // Helper to process a print statement for a given line
      function processPrint(printExpr, fields, line) {
        // Handle $0 (whole line), $N, $NF, NR, string literals
        return printExpr.replace(/\$NF/g, fields[fields.length - 1] || '')
          .replace(/\$0/g, line)
          .replace(/\$(\d+)/g, (_, n) => fields[parseInt(n, 10) - 1] || '')
          .replace(/NR/g, String(results.length + 1))
          .replace(/"([^"]*)"/g, '$1')
          .replace(/,\s*/g, ' '); // comma = OFS (default space)
      }

      // BEGIN block
      if (beginMatch) {
        const beginPrint = beginMatch[1].match(/print\s+(.*)/);
        if (beginPrint) results.push(processPrint(beginPrint[1], [], ''));
      }

      // Main block: /pattern/ { action } or just { action }
      const patternAction = mainProg.match(/(?:\/([^/]+)\/\s*)?\{\s*print\s+(.*?)\s*\}/);
      const patternFilter = mainProg.match(/^\/([^/]+)\/$/);
      const simplePrint = mainProg.match(/^\{\s*print\s+(.*?)\s*\}$/);

      for (const line of lines) {
        const fields = typeof fieldSep === 'string' ? line.split(fieldSep) : line.split(fieldSep);

        if (patternAction) {
          const pattern = patternAction[1];
          if (pattern && !new RegExp(pattern).test(line)) continue;
          results.push(processPrint(patternAction[2], fields, line));
        } else if (patternFilter) {
          if (new RegExp(patternFilter[1]).test(line)) results.push(line);
        } else if (simplePrint) {
          results.push(processPrint(simplePrint[1], fields, line));
        } else if (mainProg === '' || /^\{\s*print\s*\}$/.test(mainProg)) {
          results.push(line);
        } else {
          // Fallback: try to extract print $N
          const m = mainProg.match(/\$(\d+)/);
          if (m) results.push(fields[parseInt(m[1], 10) - 1] || '');
          else results.push(line);
        }
      }

      // END block
      if (endMatch) {
        const endPrint = endMatch[1].match(/print\s+(.*)/);
        if (endPrint) results.push(processPrint(endPrint[1], [], ''));
      }

      return { stdout: results.join('\n'), exitCode: 0 };
    },

    tac(args, ctx) {
      const content = args.length > 0 ? VFS.readFile(args[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `tac: ${args[0]}: No such file or directory`, exitCode: 1 };
      return { stdout: content.split('\n').reverse().join('\n'), exitCode: 0 };
    },

    rev(args, ctx) {
      const content = args.length > 0 ? VFS.readFile(args[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `rev: ${args[0]}: No such file or directory`, exitCode: 1 };
      return { stdout: content.split('\n').map(l => l.split('').reverse().join('')).join('\n'), exitCode: 0 };
    },

    nl(args, ctx) {
      const files = args.filter(a => !a.startsWith('-'));
      const content = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `nl: ${files[0]}: No such file or directory`, exitCode: 1 };
      return { stdout: content.split('\n').map((l, i) => `     ${i + 1}\t${l}`).join('\n'), exitCode: 0 };
    },

    read() {
      // Can't read interactive input — just simulate
      return { stdout: '', exitCode: 0 };
    },

    eval(args) {
      if (args.length === 0) return { stdout: '', exitCode: 0 };
      return execute(args.join(' '));
    },

    jq(args, ctx) {
      // Simplified jq: parse JSON from stdin or file, extract fields
      const filter = args.find(a => !a.startsWith('-')) || '.';
      const files = args.filter(a => !a.startsWith('-') && a !== filter);
      let input = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (input === null) return { stderr: `jq: ${files[0]}: No such file or directory`, exitCode: 1 };
      input = input.trim();
      if (!input) return { stderr: 'jq: null input', exitCode: 1 };

      try {
        const data = JSON.parse(input);
        if (filter === '.') return { stdout: JSON.stringify(data, null, 2), exitCode: 0 };
        // Simple key extraction: .key, .key.subkey, .key[]
        const parts = filter.replace(/^\./,'').split('.');
        let result = data;
        for (const part of parts) {
          if (!part) continue;
          const arrMatch = part.match(/^(\w+)\[\]$/);
          if (arrMatch) {
            result = result[arrMatch[1]];
            if (Array.isArray(result)) {
              return { stdout: result.map(item => typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)).join('\n'), exitCode: 0 };
            }
          } else {
            result = result?.[part];
          }
        }
        if (result === undefined) return { stdout: 'null', exitCode: 0 };
        return { stdout: typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result), exitCode: 0 };
      } catch (e) {
        return { stderr: `jq: parse error: ${e.message}`, exitCode: 1 };
      }
    },

    scp(args) {
      if (args.length < 2) return { stderr: 'usage: scp source destination', exitCode: 1 };
      const src = args[args.length - 2];
      const dst = args[args.length - 1];
      return { stdout: `${src}  100%  4.2KB  512KB/s   00:00`, exitCode: 0 };
    },

    // ── Commands added for curriculum coverage ──────────────────────

    printenv(args) {
      if (args.length === 0) return { stdout: Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n'), exitCode: 0 };
      const val = env[args[0]];
      return val !== undefined ? { stdout: val, exitCode: 0 } : { stderr: '', exitCode: 1 };
    },

    umask(args) {
      if (args.length === 0) return { stdout: '0022', exitCode: 0 };
      return { stdout: '', exitCode: 0 }; // Accept but no-op
    },

    ping(args) {
      const host = args.find(a => !a.startsWith('-')) || 'localhost';
      return { stdout: `PING ${host} (127.0.0.1): 56 data bytes\n64 bytes from 127.0.0.1: icmp_seq=0 ttl=64 time=0.042 ms\n64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.038 ms\n64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.041 ms\n\n--- ${host} ping statistics ---\n3 packets transmitted, 3 packets received, 0% packet loss`, exitCode: 0 };
    },

    traceroute(args) {
      const host = args.find(a => !a.startsWith('-')) || 'localhost';
      return { stdout: `traceroute to ${host} (140.82.121.3), 30 hops max, 60 byte packets\n 1  gateway (192.168.1.1)  1.234 ms  1.123 ms  1.089 ms\n 2  isp-router (10.0.0.1)  5.678 ms  5.543 ms  5.432 ms\n 3  ${host} (140.82.121.3)  12.345 ms  12.234 ms  12.123 ms`, exitCode: 0 };
    },

    nohup(args, ctx) {
      if (args.length === 0) return { stderr: 'nohup: missing operand', exitCode: 1 };
      return { stdout: 'nohup: ignoring input and appending output to nohup.out', exitCode: 0 };
    },

    disown() {
      return { stdout: '', exitCode: 0 };
    },

    'ssh-add'(args) {
      if (args.length === 0) return { stdout: 'Identity added: /home/user/.ssh/id_ed25519 (dev@startup.com)', exitCode: 0 };
      if (args[0] === '-l') return { stdout: '256 SHA256:xR4g7KqP2mN8vL5jF1hT9wY3aB6cD0eU dev@startup.com (ED25519)', exitCode: 0 };
      return { stdout: `Identity added: ${args[0]}`, exitCode: 0 };
    },

    htop() {
      return COMMANDS.top();
    },

    ss(args) {
      return COMMANDS.netstat(args);
    },

    dmesg() {
      return { stdout: '[    0.000000] Linux version 5.15.0-generic\n[    0.123456] Command line: BOOT_IMAGE=/vmlinuz-5.15.0\n[    1.234567] Memory: 16384MB available\n[    2.345678] CPU: 8 cores detected\n[    3.456789] Network: eth0 link up, 1000 Mbps\n[    5.678901] Filesystem: ext4 mounted on /', exitCode: 0 };
    },

    column(args, ctx) {
      let delimiter = null;
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-t') continue; // table mode, handled below
        if (args[i] === '-s' && args[i + 1]) { delimiter = args[++i]; }
      }
      const files = args.filter(a => !a.startsWith('-') && a !== delimiter);
      const content = files.length > 0 ? VFS.readFile(files[0]) : (ctx.stdin || '');
      if (content === null) return { stderr: `column: ${files[0]}: No such file or directory`, exitCode: 1 };
      // Simple columnation: split by whitespace and align
      const rows = content.split('\n').map(l => l.trim().split(delimiter || /\s+/));
      const cols = rows.reduce((max, r) => Math.max(max, r.length), 0);
      const widths = Array(cols).fill(0);
      for (const row of rows) { for (let i = 0; i < row.length; i++) widths[i] = Math.max(widths[i], (row[i] || '').length); }
      return { stdout: rows.map(r => r.map((c, i) => (c || '').padEnd(widths[i] + 2)).join('')).join('\n'), exitCode: 0 };
    },

    paste(args, ctx) {
      let delimiter = '\t';
      const files = [];
      for (let i = 0; i < args.length; i++) {
        if (args[i] === '-d' && args[i + 1]) { delimiter = args[++i]; }
        else if (!args[i].startsWith('-')) files.push(args[i]);
      }
      if (files.length === 0) return { stdout: ctx.stdin || '', exitCode: 0 };
      const contents = files.map(f => { const c = VFS.readFile(f); return c ? c.split('\n') : []; });
      const maxLines = contents.reduce((m, c) => Math.max(m, c.length), 0);
      const result = [];
      for (let i = 0; i < maxLines; i++) {
        result.push(contents.map(c => c[i] || '').join(delimiter));
      }
      return { stdout: result.join('\n'), exitCode: 0 };
    }
  };

  function dockerCompose(args) {
    const sub = args[0] || '';
    const responses = {
      up: 'Creating network "webapp_default"\nCreating webapp-db-1  ... done\nCreating webapp-web-1 ... done',
      down: 'Stopping webapp-web-1 ... done\nStopping webapp-db-1  ... done\nRemoving containers... done\nRemoving network webapp_default',
      ps: 'NAME            SERVICE   STATUS    PORTS\nwebapp-web-1    web       running   0.0.0.0:3000->3000/tcp\nwebapp-db-1     db        running   5432/tcp',
      logs: '[webapp-web-1] Server started on port 3000\n[webapp-db-1] database system is ready',
      build: 'Building web\nStep 1/5 : FROM node:18\nSuccessfully built abc123def456'
    };
    return responses[sub] || `docker compose: '${sub}' is not a command`;
  }

  function formatLong(node) {
    const typeChar = node.type === 'dir' ? 'd' : '-';
    const perms = node.permissions || 'rw-r--r--';
    const size = node.type === 'file' ? String(node.content?.length || 0).padStart(6) : '   4096';
    const date = 'Jan 15 10:30';
    return `${typeChar}${perms}  1 ${node.owner || 'user'}  staff  ${size} ${date} ${node.name}`;
  }

  // ── Shell Executor ────────────────────────────────────────────────────

  function execute(input) {
    const trimmed = input.trim();
    if (!trimmed) return { stdout: '', exitCode: 0 };

    // Handle for/while/if one-liners
    if (/^for\s+/.test(trimmed) || /^while\s+/.test(trimmed) || /^if\s+/.test(trimmed)) {
      return executeScriptBlock(trimmed);
    }

    const chains = parseCommandLine(trimmed);
    let finalResult = { stdout: '', exitCode: 0 };

    for (let i = 0; i < chains.length; i++) {
      const { cmd, op } = chains[i];
      if (!cmd) continue;

      // Check chain operator
      if (i > 0) {
        const prevOp = chains[i - 1].op;
        if (prevOp === '&&' && finalResult.exitCode !== 0) continue;
        if (prevOp === '||' && finalResult.exitCode === 0) continue;
      }

      finalResult = executePipeline(cmd);
    }

    return finalResult;
  }

  function executePipeline(cmdStr) {
    const segments = parsePipeline(cmdStr);
    let stdin = '';
    let result = { stdout: '', exitCode: 0 };

    for (const seg of segments) {
      const parsed = parseArgs(seg);
      if (!parsed.command) continue;

      // Check aliases
      let cmdName = parsed.command;
      if (aliases[cmdName]) {
        const expanded = aliases[cmdName] + ' ' + parsed.args.join(' ');
        const reparsed = parseArgs(expanded);
        cmdName = reparsed.command;
        parsed.args = reparsed.args;
      }

      // Handle 'docker compose' as a two-word command
      if (cmdName === 'docker' && parsed.args[0] === 'compose') {
        const dResult = { stdout: dockerCompose(parsed.args.slice(1)), exitCode: 0 };
        result = dResult;
        stdin = dResult.stdout || '';
        continue;
      }

      // Handle 'docker-compose'
      if (cmdName === 'docker-compose') {
        const dResult = { stdout: dockerCompose(parsed.args), exitCode: 0 };
        result = dResult;
        stdin = dResult.stdout || '';
        continue;
      }

      const handler = COMMANDS[cmdName];
      if (!handler) {
        result = { stderr: `zsh: command not found: ${cmdName}`, exitCode: 127 };
        stdin = '';
        continue;
      }

      const ctx = { cwd: VFS.getCwd(), stdin, env };
      result = handler(parsed.args, ctx) || { stdout: '', exitCode: 0 };
      result.stdout = result.stdout || '';
      result.stderr = result.stderr || '';

      // Handle redirects
      for (const redirect of parsed.redirects) {
        if (redirect.type === '2>&1') {
          // Merge stderr into stdout
          if (result.stderr) { result.stdout = (result.stdout || '') + result.stderr; result.stderr = ''; }
        } else if (redirect.target === '/dev/null') {
          // Discard output
          result.stdout = '';
          result.stderr = '';
        } else if (redirect.type === '>') {
          VFS.writeFile(redirect.target, result.stdout);
          result.stdout = '';
        } else if (redirect.type === '>>') {
          VFS.appendFile(redirect.target, result.stdout);
          result.stdout = '';
        } else if (redirect.type === '2>') {
          if (redirect.target === '/dev/null') result.stderr = '';
          else { VFS.writeFile(redirect.target, result.stderr || ''); result.stderr = ''; }
        }
      }

      stdin = result.stdout;
    }

    return result;
  }

  function executeScriptBlock(input) {
    // Simple for loop: for x in items; do cmd; done
    const forMatch = input.match(/^for\s+(\w+)\s+in\s+(.+?);\s*do\s+(.+?);\s*done$/);
    if (forMatch) {
      const [, varName, itemsStr, body] = forMatch;
      let items = itemsStr.trim().split(/\s+/);
      // Expand globs
      if (items.some(i => i.includes('*'))) {
        const expanded = [];
        for (const item of items) {
          if (item.includes('*')) {
            const entries = VFS.listDir('.', true);
            if (entries) {
              const regex = VFS.constructor ? new RegExp('^' + item.replace(/\*/g, '.*') + '$') : /.*/;
              try {
                const r = new RegExp('^' + item.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
                expanded.push(...entries.map(e => e.name).filter(n => r.test(n)));
              } catch { expanded.push(item); }
            }
          } else {
            expanded.push(item);
          }
        }
        items = expanded;
      }

      const outputs = [];
      for (const item of items) {
        env[varName] = item;
        const expanded = body.replace(new RegExp(`\\$${varName}\\b`, 'g'), item).replace(new RegExp(`\\$\\{${varName}\\}`, 'g'), item);
        const result = execute(expanded);
        if (result.stdout) outputs.push(result.stdout);
      }
      return { stdout: outputs.join('\n'), exitCode: 0 };
    }

    // Simple while: while cmd; do body; done
    const whileMatch = input.match(/^while\s+(.+?);\s*do\s+(.+?);\s*done$/);
    if (whileMatch) {
      const [, condition, body] = whileMatch;
      const outputs = [];
      let iterations = 0;
      const maxIter = 100; // safety limit
      while (iterations < maxIter) {
        const condResult = execute(condition);
        if (condResult.exitCode !== 0) break;
        const bodyResult = execute(body);
        if (bodyResult.stdout) outputs.push(bodyResult.stdout);
        iterations++;
      }
      return { stdout: outputs.join('\n'), exitCode: 0 };
    }

    // Simple if: if [ -f file ]; then cmd; fi
    const ifMatch = input.match(/^if\s+(.+?);\s*then\s+(.+?)(?:;\s*else\s+(.+?))?;\s*fi$/);
    if (ifMatch) {
      const [, condition, thenCmd, elseCmd] = ifMatch;
      const condResult = execute(condition);
      if (condResult.exitCode === 0) {
        return execute(thenCmd);
      } else if (elseCmd) {
        return execute(elseCmd);
      }
      return { stdout: '', exitCode: 0 };
    }

    return { stderr: 'zsh: parse error', exitCode: 1 };
  }

  // ── Syntax Highlighting ───────────────────────────────────────────────

  function highlightInput(text) {
    if (!text) return '';
    const parts = text.split(/\s+/);
    if (parts.length === 0) return escapeHtml(text);

    let html = '';
    let isFirst = true;
    let i = 0;

    for (const part of parts) {
      if (i > 0) html += ' ';
      if (!part) { i++; continue; }

      if (isFirst) {
        const known = COMMANDS[part] || aliases[part];
        html += `<span class="term-cmd${known ? '' : ' term-cmd-invalid'}">${escapeHtml(part)}</span>`;
        isFirst = false;
      } else if (part.startsWith('-')) {
        html += `<span class="term-flag">${escapeHtml(part)}</span>`;
      } else if (part === '|' || part === '>' || part === '>>' || part === '<') {
        html += `<span class="term-pipe">${escapeHtml(part)}</span>`;
      } else if (part === '&&' || part === '||' || part === ';') {
        html += `<span class="term-pipe">${escapeHtml(part)}</span>`;
        isFirst = true;
      } else if (/^["']/.test(part)) {
        html += `<span class="term-string">${escapeHtml(part)}</span>`;
      } else if (part.startsWith('$')) {
        html += `<span class="term-var">${escapeHtml(part)}</span>`;
      } else {
        html += `<span class="term-arg">${escapeHtml(part)}</span>`;
      }
      i++;
    }
    return html;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Cursor-aware rendering ────────────────────────────────────────────

  function renderInputWithCursor(text, cursorPos) {
    if (!text && cursorPos === 0) {
      return '<span class="term-cursor"></span>';
    }
    const highlighted = highlightInput(text);
    if (cursorPos >= text.length) {
      return highlighted + '<span class="term-cursor"></span>';
    }
    // Count plain-text characters through the HTML, insert cursor at the right position
    let plainIdx = 0;
    let inTag = false;
    let insertPos = -1;
    for (let i = 0; i < highlighted.length; i++) {
      if (highlighted[i] === '<') { inTag = true; continue; }
      if (highlighted[i] === '>') { inTag = false; continue; }
      if (!inTag) {
        if (plainIdx === cursorPos) {
          insertPos = i;
          break;
        }
        // Handle HTML entities (&amp; &lt; &gt; &quot;)
        if (highlighted[i] === '&') {
          const semiPos = highlighted.indexOf(';', i);
          if (semiPos > i && semiPos - i < 8) {
            i = semiPos; // skip to end of entity (the for loop will advance past ;)
          }
        }
        plainIdx++;
      }
    }
    if (insertPos === -1) {
      return highlighted + '<span class="term-cursor"></span>';
    }
    // Walk back to find the actual byte position (we were skipping tags above)
    let bytePos = 0;
    plainIdx = 0;
    inTag = false;
    for (let i = 0; i < highlighted.length; i++) {
      if (highlighted[i] === '<') { inTag = true; continue; }
      if (highlighted[i] === '>') { inTag = false; bytePos = i + 1; continue; }
      if (!inTag) {
        if (plainIdx === cursorPos) {
          bytePos = i;
          break;
        }
        if (highlighted[i] === '&') {
          const semiPos = highlighted.indexOf(';', i);
          if (semiPos > i && semiPos - i < 8) {
            i = semiPos;
          }
        }
        plainIdx++;
        bytePos = i + 1;
      }
    }
    return highlighted.slice(0, bytePos) + '<span class="term-cursor"></span>' + highlighted.slice(bytePos);
  }

  // ── Autosuggestion ────────────────────────────────────────────────────

  function getSuggestion(partial) {
    if (!partial) return '';
    for (let i = commandHistory.length - 1; i >= 0; i--) {
      if (commandHistory[i].startsWith(partial) && commandHistory[i] !== partial) {
        return commandHistory[i].slice(partial.length);
      }
    }
    return '';
  }

  // ── Prompt ────────────────────────────────────────────────────────────

  function renderPrompt() {
    const displayPath = VFS.toDisplay(VFS.getCwd());
    const arrow = lastExitCode === 0 ? '<span class="term-arrow-ok">&#10095;</span>' : '<span class="term-arrow-err">&#10095;</span>';
    return `<span class="term-user">user@macbook</span> <span class="term-dir">${escapeHtml(displayPath)}</span> ${arrow} `;
  }

  // ── Validation ────────────────────────────────────────────────────────

  function checkObjectives() {
    if (!challenge || !challenge.objectives) return { allMet: false, results: [] };

    // Re-validate every objective from scratch (no permanent caching)
    const results = challenge.objectives.map(obj => {
      const v = obj.validation;
      let met = false;

      switch (v.type) {
        case 'cwd':
          met = VFS.getCwd() === VFS.resolvePath(v.expected);
          break;
        case 'outputContains':
          met = lastOutput.includes(v.expected);
          break;
        case 'outputEquals':
          met = lastOutput.trim() === String(v.expected).trim();
          break;
        case 'fileExists':
          met = VFS.stat(v.expected) !== null;
          break;
        case 'fileContains': {
          if (!v.path) break;
          const content = VFS.readFile(v.path);
          met = content !== null && content.includes(v.expected);
          break;
        }
        case 'commandUsed':
          met = commandsExecuted.some(cmd => new RegExp(v.expected).test(cmd));
          break;
        case 'exitCode':
          met = lastExitCode === Number(v.expected);
          break;
      }

      return { ...obj, met };
    });

    const allMet = results.every(r => r.met);
    if (allMet) {
      challenge.objectives.forEach(obj => { obj._met = true; });
    }
    return { allMet, results };
  }

  // ── UI ────────────────────────────────────────────────────────────────

  const els = {};

  function cacheEls() {
    els.container = document.getElementById('terminal-container');
    els.output = document.getElementById('terminal-output');
    els.input = document.getElementById('terminal-input');
    els.inputDisplay = document.getElementById('terminal-input-display');
    els.suggestion = document.getElementById('terminal-suggestion');
    els.ps1 = document.getElementById('terminal-ps1');
    els.promptArea = document.getElementById('terminal-prompt-area');
    els.meta = document.getElementById('terminal-meta');
    els.tier = document.getElementById('terminal-tier');
    els.progress = document.getElementById('terminal-progress');
    els.hintBtn = document.getElementById('terminal-hint');
    els.helpBtn = document.getElementById('terminal-help');
    els.skipBtn = document.getElementById('terminal-skip');
    els.result = document.getElementById('terminal-result');
    els.objectivesPanel = document.getElementById('terminal-objectives');
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
    aliases = {};

    // Load profile
    try {
      profile = await browser.runtime.sendMessage({ type: 'getTerminalLearningProfile' });
    } catch { profile = null; }
    if (!profile) profile = TerminalChallengeProvider.defaultProfile();

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

  async function getChallenge() {
    els.output.innerHTML = '';
    els.result.classList.add('hidden');
    els.result.innerHTML = '';
    challengeResolved = false;
    hintsUsed = 0;
    commandsExecuted = [];
    lastOutput = '';
    lastExitCode = 0;

    // Show loading
    appendOutput('<span class="term-dim">Loading challenge...</span>');

    let scheduledDifficulty = config.arcadeDifficulty || 'normal';
    if (!config.arcadeDifficulty) {
      try { scheduledDifficulty = (await browser.runtime.sendMessage({ type: 'getCurrentDifficulty' })).difficulty; } catch {}
    }
    const { challenge: ch, source } = await TerminalChallengeProvider.getChallenge(profile, config.isSettingsGate, scheduledDifficulty, config.reinforceOnly);

    if (!ch) {
      appendOutput('<span class="term-error">Failed to load challenge. Falling back to typing.</span>');
      setTimeout(() => {
        // Fall back to typing
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
    helpRequestCount = 0;
    helpMetAtFirstRequest = 0;

    // Update meta
    const topic = TerminalChallengeProvider.TERMINAL_CURRICULUM[profile.currentTopicIndex] || TerminalChallengeProvider.TERMINAL_CURRICULUM[0];
    els.tier.textContent = `Tier ${topic.tier}`;
    els.progress.textContent = `${topic.name}`;

    // Initialize VFS — restore chain state if continuing a chain
    if (challenge.chain && chainVFSSnapshot && chainStep > 0) {
      VFS.restore(chainVFSSnapshot);
      // Apply any additional filesystem overlay for this step
      if (challenge.filesystem) {
        for (const [path, entry] of Object.entries(challenge.filesystem)) {
          if (entry.type === 'dir') VFS.mkdir(path, true);
          else if (entry.type === 'file') VFS.writeFile(path, entry.content || '');
        }
      }
      if (challenge.startDir) {
        const abs = VFS.resolvePath(challenge.startDir);
        if (VFS.getNode(abs)) VFS.setCwd(abs);
      }
    } else {
      VFS.init(challenge.filesystem, challenge.startDir);
    }
    initEnv();
    env.PWD = VFS.getCwd();

    // Render scenario
    els.promptArea.innerHTML = '';

    // Chain progress indicator
    if (challenge.chain) {
      const chainInfo = document.createElement('div');
      chainInfo.className = 'terminal-chain-info';
      chainInfo.innerHTML = `<span class="chain-title">${escapeHtml(challenge.chainTitle || challenge.chain)}</span> <span class="chain-step">Step ${challenge.chainStep || 1}/${challenge.chainTotal || '?'}</span>`;
      els.promptArea.appendChild(chainInfo);
    }
    if (challenge.teachingNote) {
      const note = document.createElement('div');
      note.className = 'terminal-teaching-note';
      note.textContent = challenge.teachingNote;
      els.promptArea.appendChild(note);
    }
    const scenario = document.createElement('div');
    scenario.className = 'terminal-scenario';
    scenario.textContent = challenge.scenario;
    els.promptArea.appendChild(scenario);

    // Render objectives
    renderObjectives();

    // Show prompt
    els.ps1.innerHTML = renderPrompt();
    els.inputDisplay.innerHTML = '';
    els.suggestion.textContent = '';
    els.input.value = '';
    els.input.focus();
  }

  function renderObjectives(results) {
    if (!els.objectivesPanel) return;
    els.objectivesPanel.innerHTML = '';
    if (!challenge || !challenge.objectives) return;

    const objs = results || checkObjectives().results;
    for (const obj of objs) {
      const div = document.createElement('div');
      div.className = 'terminal-objective' + (obj.met ? ' met' : '');
      div.innerHTML = `<span class="objective-check">${obj.met ? '&#10003;' : '&#9675;'}</span> ${escapeHtml(obj.description)}`;
      els.objectivesPanel.appendChild(div);
    }
  }

  function appendOutput(html) {
    const div = document.createElement('div');
    div.className = 'terminal-line';
    div.innerHTML = html;
    els.output.appendChild(div);
    els.container.scrollTop = els.container.scrollHeight;
  }

  function appendPromptLine(input) {
    appendOutput(renderPrompt() + highlightInput(input));
  }

  function handleKeydown(e) {
    if (challengeResolved) { e.preventDefault(); return; }

    if (e.key === 'Enter') {
      e.preventDefault();
      const input = els.input.value.trim();
      if (!input) return;

      // Record command
      commandHistory.push(input);
      commandsExecuted.push(input);
      historyIndex = commandHistory.length;

      // Show the command in output
      appendPromptLine(input);

      // Execute
      const result = execute(input);
      lastExitCode = result.exitCode || 0;
      lastOutput = result.stdout || '';

      // Show output
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

      // Check objectives and render with live results
      const check = checkObjectives();
      renderObjectives(check.results);

      if (check.allMet && !challengeResolved) {
        onPassed();
      }

      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      // Accept suggestion or tab-complete
      const suggestion = getSuggestion(els.input.value);
      if (suggestion) {
        els.input.value += suggestion;
        els.inputDisplay.innerHTML = renderInputWithCursor(els.input.value, els.input.value.length);
        els.suggestion.textContent = '';
      } else {
        tabComplete();
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
      COMMANDS.clear();
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
    // Re-render cursor position on arrow keys, clicks, etc.
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

  function tabComplete() {
    const val = els.input.value;
    const parts = val.split(/\s+/);
    const lastPart = parts[parts.length - 1] || '';
    if (!lastPart) return;

    // Get directory and prefix
    const slashIdx = lastPart.lastIndexOf('/');
    const dir = slashIdx >= 0 ? lastPart.slice(0, slashIdx + 1) : '';
    const prefix = slashIdx >= 0 ? lastPart.slice(slashIdx + 1) : lastPart;

    const entries = VFS.listDir(dir || '.', true);
    if (!entries) return;

    const matches = entries.filter(e => e.name.startsWith(prefix));
    if (matches.length === 1) {
      const completion = matches[0].name.slice(prefix.length);
      const suffix = matches[0].type === 'dir' ? '/' : ' ';
      els.input.value = val + completion + suffix;
      els.inputDisplay.innerHTML = renderInputWithCursor(els.input.value, els.input.value.length);
      els.suggestion.textContent = '';
    } else if (matches.length > 1) {
      // Show options
      appendOutput(matches.map(m => m.name + (m.type === 'dir' ? '/' : '')).join('  '));
      // Complete common prefix
      const names = matches.map(m => m.name);
      let common = '';
      for (let i = prefix.length; i < names[0].length; i++) {
        const ch = names[0][i];
        if (names.every(n => n[i] === ch)) common += ch;
        else break;
      }
      if (common) {
        els.input.value = val + common;
        els.inputDisplay.innerHTML = renderInputWithCursor(els.input.value, els.input.value.length);
      }
    }
  }

  async function onPassed() {
    challengeResolved = true;

    appendOutput('');
    appendOutput('<span class="term-success">All objectives complete!</span>');

    if (challenge.afterSolve) {
      appendOutput(`<span class="term-after-solve">${escapeHtml(challenge.afterSolve)}</span>`);
    }

    // Build compact summary for Claude's context on next challenge
    const struggled = commandsExecuted.length > 10;
    const cmdCount = commandsExecuted.length;
    const solveTimeSec = Math.round((Date.now() - challengeStartTime) / 1000);
    const parts = [];
    if (cmdCount <= 5 && !helpUsedThisChallenge) parts.push('clean');
    if (struggled) parts.push('struggled');
    if (helpUsedThisChallenge) parts.push('used help');
    parts.push(`${solveTimeSec}s`);
    const summary = `PASSED in ${cmdCount} commands (${parts.join(', ')})`;

    // Update profile (with spaced repetition context)
    TerminalChallengeProvider.updateProfileAfterChallenge(profile, challenge, true, challengeSource, struggled, helpUsedThisChallenge, summary);
    await browser.runtime.sendMessage({ type: 'saveTerminalLearningProfile', profile });

    // Log to daily challenge log
    const solveTime = Math.round((Date.now() - challengeStartTime) / 1000);
    browser.runtime.sendMessage({ type: 'logChallengeCompletion', challengeType: 'terminal', solveTime }).catch(() => {});

    // Update progression
    try {
      const state = await browser.runtime.sendMessage({ type: 'getState' });
      const prog = state.progression || {};
      prog.terminalTier = (TerminalChallengeProvider.TERMINAL_CURRICULUM[profile.currentTopicIndex] || { tier: 1 }).tier;
      if (!prog.terminalCompleted) prog.terminalCompleted = [];
      if (!prog.terminalCompleted.includes(challenge.id)) prog.terminalCompleted.push(challenge.id);
      prog.totalChallengesCompleted = (prog.totalChallengesCompleted || 0) + 1;
      await browser.runtime.sendMessage({ type: 'updateProgression', progression: prog });
    } catch {}

    // Chain handling: if part of a chain and more steps remain, auto-advance
    if (challenge.chain && challenge.chainStep < challenge.chainTotal) {
      chainVFSSnapshot = VFS.serialize();
      chainStep = challenge.chainStep;
      currentChain = challenge.chain;

      appendOutput('');
      appendOutput(`<span class="term-dim">Advancing to step ${challenge.chainStep + 1}/${challenge.chainTotal}...</span>`);

      setTimeout(async () => {
        challengeResolved = false;
        commandsExecuted = [];
        lastOutput = '';
        lastExitCode = 0;
        hintsUsed = 0;
        els.hintBtn.disabled = false;

        let nextDiff = config.arcadeDifficulty || 'normal';
        if (!config.arcadeDifficulty) {
          try { nextDiff = (await browser.runtime.sendMessage({ type: 'getCurrentDifficulty' })).difficulty; } catch {}
        }
        const { challenge: nextCh, source } = await TerminalChallengeProvider.getChallenge(profile, config.isSettingsGate, nextDiff, config.reinforceOnly);
        if (nextCh) {
          nextCh.chain = nextCh.chain || currentChain;
          nextCh.chainStep = (challenge.chainStep || 1) + 1;
          nextCh.chainTotal = challenge.chainTotal;
          nextCh.chainTitle = challenge.chainTitle;
          challenge = nextCh;
          challengeSource = source;
          renderChallenge();
        } else {
          Gate.showContinuePrompt();
        }
      }, 1500);
      return;
    }

    // Chain completed or standalone
    if (challenge.chain && challenge.chainStep >= challenge.chainTotal) {
      appendOutput('<span class="term-success">Scenario complete! All steps finished.</span>');
      currentChain = null;
      chainStep = 0;
      chainVFSSnapshot = null;
    }

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
    helpRequestCount++;
    appendOutput('<span class="term-dim">Asking for help...</span>');

    // After 3+ help requests with no progress, check if the challenge is broken
    const metCount = challenge.objectives.filter(o => o._met).length;
    if (helpRequestCount >= 3 && metCount === helpMetAtFirstRequest) {
      try {
        const diagPrompt = `Analyze if this terminal challenge is solvable in our simulated shell. The shell supports: ls, cd, pwd, cat, echo, touch, mkdir, rm, cp, mv, grep, find, head, tail, less, wc, sort, uniq, cut, tr, sed, awk, chmod, chown, ps, kill, jobs, bg, fg, top, lsof, netstat, export, env, alias, tee, jq, xargs, basename, dirname, seq, rev, nl, git, docker, npm, pip, python3, curl, wget, brew, ssh, ssh-keygen, scp, dig, nslookup, host, and basic for/if/while scripting. It does NOT support: rsync, tar, zip, vim, nano, screen, tmux, nc, make, gcc, apt, systemctl, crontab, diff, or strace.

Scenario: ${challenge.scenario}
Remaining objectives: ${challenge.objectives.filter(o => !o._met).map(o => `${o.description} (validation: ${o.validation.type}=${JSON.stringify(o.validation.expected)})`).join('; ')}
Commands the user tried: ${commandsExecuted.slice(-10).join(', ')}
Last command output: ${lastOutput.slice(0, 200)}

The user has asked for help ${helpRequestCount} times with no progress on remaining objectives.

Respond with ONLY valid JSON:
{"kind": "student_issue" | "challenge_issue", "message": "brief explanation", "suggestedAction": "hint for student OR 'skip' if challenge is broken"}`;

        const response = await browser.runtime.sendMessage({ type: 'claudeGenerate', prompt: diagPrompt });
        if (response.content) {
          const cleaned = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          try {
            const parsed = JSON.parse(cleaned);
            if (parsed.kind === 'challenge_issue') {
              appendOutput(`<span class="term-error">Challenge issue detected: ${escapeHtml(parsed.message)}</span>`);
              appendOutput('<span class="term-dim">This challenge appears to be broken. Skipping without penalty...</span>');
              // Remove this challenge's attempts from profile
              TerminalChallengeProvider.removeChallengeAttempts(profile, challenge);
              await browser.runtime.sendMessage({ type: 'saveTerminalLearningProfile', profile });
              setTimeout(() => getChallenge(), 1500);
              return;
            }
            appendOutput(`<span class="term-help">${escapeHtml(parsed.message)}</span>`);
            els.input.focus();
            return;
          } catch { /* fall through to normal help */ }
        }
      } catch { /* fall through to normal help */ }
    }

    // Track objectives met at first help request
    if (helpRequestCount === 1) helpMetAtFirstRequest = metCount;

    try {
      const helpPrompt = `The user is stuck on a terminal challenge in a simulated shell. The shell supports common Unix commands but not all features of a real shell.

Scenario: ${challenge.scenario}
Objectives: ${challenge.objectives.map(o => o.description + (o._met ? ' (DONE)' : ' (NOT DONE)')).join(', ')}
Commands tried: ${commandsExecuted.slice(-8).join(', ') || '(none yet)'}
${lastOutput ? `Last output: ${lastOutput.slice(0, 200)}` : ''}

Give a brief, helpful hint without giving away the exact answer. 2-3 sentences max. If the command they're using looks correct but isn't working, consider that this is a simulated shell with limited command support.`;

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

    // Generate contextual hints based on validation type
    if (v.type === 'cwd') {
      tips.push(`You need to change your working directory. Try: cd <path>`);
    } else if (v.type === 'outputContains' || v.type === 'outputEquals') {
      tips.push(`The next step requires producing specific output. Try reading a file or running a command.`);
    } else if (v.type === 'fileExists') {
      const path = v.expected || '';
      if (path.includes('/')) {
        tips.push(`You need to create something at a specific path. Check if parent directories exist first.`);
      } else {
        tips.push(`You need to create a file or directory. Use touch for files, mkdir for directories.`);
      }
    } else if (v.type === 'fileContains') {
      tips.push(`A file needs to contain specific content. Try using echo with redirection (> or >>).`);
    } else if (v.type === 'commandUsed') {
      tips.push(`Try using a specific command. Type man <command> if you need help with syntax.`);
    }

    if (tips.length > 0) {
      appendOutput(`<span class="term-help">${escapeHtml(tips[0])}</span>`);
    } else {
      appendOutput(`<span class="term-help">Next objective: ${escapeHtml(next.description)}</span>`);
    }
  }

  async function skipChallenge() {
    if (challengeResolved) return;

    // Record skip as failure
    TerminalChallengeProvider.updateProfileAfterChallenge(profile, challenge, false, challengeSource);
    await browser.runtime.sendMessage({ type: 'saveTerminalLearningProfile', profile });

    // Log skipped attempt so heatmap shows engagement
    browser.runtime.sendMessage({ type: 'logChallengeCompletion', challengeType: 'terminal', solveTime: 0 }).catch(() => {});

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
