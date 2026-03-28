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
    { id: 'basics', name: 'Variables, types, basic operations', tier: 1,
      concepts: ['variable assignment (=)', 'int, float, str, bool types', 'arithmetic operators (+, -, *, /, //, %, **)', 'type conversion (int(), str(), float())', 'f-strings and string concatenation', 'comparison operators (==, !=, <, >, <=, >=)'],
      progressionSignal: 'Assign variables, do multi-step arithmetic, convert between types, and format strings without hints.' },
    { id: 'strings', name: 'Strings and string methods', tier: 1,
      concepts: ['indexing and slicing (s[0], s[1:3], s[::-1])', 'common methods (upper, lower, strip, replace)', 'split() and join()', 'string searching (in, find, count, startswith/endswith)', 'string immutability', 'multi-line strings and escape characters'],
      progressionSignal: 'Use slicing, split/join, and search methods fluently. Understand string immutability.' },
    { id: 'conditionals', name: 'Conditionals (if/elif/else)', tier: 1,
      concepts: ['if statement with boolean condition', 'if/else branching', 'if/elif/else chains', 'logical operators (and, or, not)', 'ternary expression (x if cond else y)', 'truthy/falsy values (0, "", None, [], {})'],
      progressionSignal: 'Write multi-branch conditionals with compound logic, use ternary expressions, and understand truthiness.' },
    { id: 'loops', name: 'Loops (for, while, break, continue)', tier: 1,
      concepts: ['for loop with range()', 'for loop over collections (list, string, dict)', 'while loop with condition', 'break and continue', 'enumerate() and zip()', 'nested loops'],
      progressionSignal: 'Write for/while loops over different iterables, use break/continue, and handle nested iteration.' },

    // Tier 2 — Data Structures & Functions
    { id: 'lists', name: 'Lists and list operations', tier: 2,
      concepts: ['creating lists and indexing', 'slicing and negative indices', 'append, extend, insert, pop, remove', 'list as stack (append/pop)', 'sorting in-place vs sorted()', 'list unpacking and tuple basics'],
      progressionSignal: 'Manipulate lists fluently with slicing, mutation methods, and unpacking.' },
    { id: 'dicts', name: 'Dictionaries', tier: 2,
      concepts: ['creating dicts and accessing keys', 'get() with default, setdefault()', 'iterating keys/values/items', 'dict comprehension basics', 'nested dicts', 'defaultdict and Counter from collections'],
      progressionSignal: 'Build, query, and iterate dicts. Use get() defaults and basic collections helpers.' },
    { id: 'sets_tuples', name: 'Sets and tuples', tier: 2,
      concepts: ['set creation and membership (in)', 'set operations (union, intersection, difference)', 'set for deduplication', 'tuple creation and immutability', 'tuple unpacking and swapping', 'named tuples basics'],
      progressionSignal: 'Use sets for dedup and membership, apply set operations, and leverage tuple unpacking.' },
    { id: 'comprehensions', name: 'List/dict/set comprehensions', tier: 2,
      concepts: ['basic list comprehension [expr for x in iterable]', 'comprehension with condition [x for x in list if cond]', 'dict comprehension {k: v for ...}', 'set comprehension {x for ...}', 'nested comprehension', 'generator expression (x for x in ...)'],
      progressionSignal: 'Write list/dict/set comprehensions with filters. Recognize when to use a generator expression.' },
    { id: 'functions', name: 'Functions, scope, default args', tier: 2,
      concepts: ['def, parameters, return', 'default arguments and keyword arguments', '*args and **kwargs', 'scope: local, enclosing, global (LEGB)', 'lambda basics', 'docstrings'],
      progressionSignal: 'Define functions with flexible signatures, understand scope rules, and use lambda for simple cases.' },

    // Tier 3 — Intermediate
    { id: 'string_ops', name: 'String parsing and manipulation', tier: 3,
      concepts: ['regex basics: re.search, re.findall', 'character classes and quantifiers ([a-z], +, *, ?)', 'groups and capturing (...)', 're.sub for replacement', 'parsing structured text (CSV-like, key=value)', 'string translate and maketrans'],
      progressionSignal: 'Write basic regex patterns, extract groups, and parse structured text.' },
    { id: 'error_handling', name: 'Try/except, error types, raising', tier: 3,
      concepts: ['try/except basic syntax', 'catching specific exceptions (ValueError, TypeError, KeyError)', 'else and finally clauses', 'raise and custom exceptions', 'exception chaining (from)', 'using exceptions for flow control vs LBYL'],
      progressionSignal: 'Handle specific exceptions, define custom exceptions, and choose between EAFP and LBYL.' },
    { id: 'file_io', name: 'File I/O patterns', tier: 3,
      concepts: ['open() with mode strings (r, w, a, rb)', 'with statement for auto-close', 'reading: read(), readline(), readlines(), iteration', 'writing: write(), writelines()', 'os.path and pathlib basics', 'CSV and JSON reading/writing'],
      progressionSignal: 'Read and write files safely with context managers. Parse CSV and JSON.' },
    { id: 'sorting', name: 'Sorting, key functions, custom sorts', tier: 3,
      concepts: ['sorted() vs list.sort()', 'key= parameter with lambda', 'operator.itemgetter and attrgetter', 'reverse sorting', 'sorting by multiple criteria (tuple key)', 'stable sort behavior'],
      progressionSignal: 'Sort complex data by custom keys, chain sort criteria, and leverage sort stability.' },
    { id: 'recursion', name: 'Recursion and recursive thinking', tier: 3,
      concepts: ['base case and recursive case', 'recursive functions (factorial, fibonacci)', 'recursion on data structures (nested lists, trees)', 'recursion vs iteration tradeoffs', 'memoization with functools.lru_cache', 'recursive backtracking basics'],
      progressionSignal: 'Write recursive solutions with clear base cases. Apply memoization. Convert between recursive and iterative.' },

    // Tier 4 — Advanced Concepts
    { id: 'classes', name: 'Classes, OOP basics, dunder methods', tier: 4,
      concepts: ['class definition, __init__, self', 'instance vs class attributes', 'methods: instance, @classmethod, @staticmethod', '__repr__ and __str__', 'operator overloading (__add__, __eq__, __lt__)', 'inheritance and super()'],
      progressionSignal: 'Design classes with proper init, implement dunder methods for comparison/display, and use inheritance.' },
    { id: 'generators', name: 'Generators, iterators, yield', tier: 4,
      concepts: ['yield keyword and generator functions', 'generator as lazy iterator', 'next() and StopIteration', 'generator expressions vs list comprehensions', 'yield from for delegation', 'send() and generator coroutines'],
      progressionSignal: 'Write generators for lazy sequences, chain with yield from, and understand memory advantages.' },
    { id: 'decorators', name: 'Decorators and higher-order functions', tier: 4,
      concepts: ['functions as first-class objects', 'closures and free variables', 'basic decorator pattern (wrapper function)', '@decorator syntax and functools.wraps', 'decorators with arguments', 'chaining multiple decorators'],
      progressionSignal: 'Write decorators with and without arguments, use wraps, and chain decorators.' },
    { id: 'data_structs', name: 'Stacks, queues, linked structures', tier: 4,
      concepts: ['stack with list (append/pop)', 'queue with collections.deque', 'priority queue with heapq', 'linked list concept (node with next pointer)', 'hash map internals (how dict works)', 'choosing the right data structure'],
      progressionSignal: 'Implement stack/queue/priority queue operations. Understand when to use each structure.' },
    { id: 'algorithms', name: 'Two pointers, sliding window, binary search', tier: 4,
      concepts: ['two-pointer technique (sorted array, palindrome)', 'sliding window (fixed and variable size)', 'binary search on sorted data', 'bisect module', 'algorithm complexity analysis (Big-O basics)', 'greedy algorithm basics'],
      progressionSignal: 'Apply two-pointer, sliding window, and binary search to novel problems. Reason about time complexity.' },

    // Tier 5 — Expert Algorithms
    { id: 'dp', name: 'Dynamic programming', tier: 5,
      concepts: ['overlapping subproblems and optimal substructure', 'top-down memoization', 'bottom-up tabulation', 'classic 1D problems (climbing stairs, coin change)', '2D DP (grid paths, edit distance)', 'state transition design'],
      progressionSignal: 'Identify DP problems, choose memoization vs tabulation, and design state transitions.' },
    { id: 'graphs', name: 'Graph traversal (BFS, DFS)', tier: 5,
      concepts: ['adjacency list and adjacency matrix representations', 'BFS with deque (level-order, shortest path)', 'DFS recursive and iterative', 'cycle detection', 'topological sort', 'connected components'],
      progressionSignal: 'Represent graphs, implement BFS/DFS, detect cycles, and perform topological sort.' },
    { id: 'advanced_python', name: 'Context managers, metaclasses, advanced patterns', tier: 5,
      concepts: ['__enter__ and __exit__ protocol', 'contextlib.contextmanager decorator', 'metaclass basics (__new__ vs __init__)', 'descriptors (__get__, __set__, __delete__)', '__slots__ for memory optimization', 'abstract base classes (ABC, abstractmethod)'],
      progressionSignal: 'Write context managers, understand the descriptor protocol, and use ABCs for interfaces.' },
    { id: 'functional', name: 'Functional programming patterns', tier: 5,
      concepts: ['map, filter, reduce', 'functools.partial and partialmethod', 'function composition patterns', 'immutability and pure functions', 'itertools (chain, product, combinations, groupby)', 'operator module for functional-style code'],
      progressionSignal: 'Apply map/filter/reduce, use itertools fluently, and compose functions.' },
    { id: 'concurrency', name: 'Threading and async basics', tier: 5,
      concepts: ['threading.Thread and thread safety', 'GIL and its implications', 'locks and synchronization primitives', 'asyncio event loop basics', 'async/await syntax', 'concurrent.futures (ThreadPoolExecutor, ProcessPoolExecutor)'],
      progressionSignal: 'Write threaded and async code. Understand GIL limitations and when to use processes vs threads.' },

    // Tier 6 — Multi-function & System Design
    { id: 'composition', name: 'Multi-function composition', tier: 6,
      concepts: ['breaking problems into small functions', 'function pipelines (output of one feeds next)', 'dependency injection basics', 'callback and hook patterns', 'separation of concerns in function design', 'building a mini-framework from composed functions'],
      progressionSignal: 'Decompose complex problems into clean function pipelines with clear interfaces.' },
    { id: 'testing', name: 'Testing patterns (unittest, pytest)', tier: 6,
      concepts: ['unittest.TestCase basics (setUp, tearDown)', 'pytest functions and assertions', 'parametrize for multiple test cases', 'mocking with unittest.mock (patch, MagicMock)', 'fixtures and test organization', 'TDD workflow: red-green-refactor'],
      progressionSignal: 'Write unit tests with pytest, mock external dependencies, and follow TDD rhythm.' },
    { id: 'api_patterns', name: 'API design patterns', tier: 6,
      concepts: ['REST concepts (endpoints, methods, status codes)', 'request/response pattern with error handling', 'pagination and rate limiting', 'retry with exponential backoff', 'data validation and serialization', 'API client class design'],
      progressionSignal: 'Design API client code with proper error handling, retry logic, and pagination.' },
    { id: 'data_pipelines', name: 'Data transformation pipelines', tier: 6,
      concepts: ['ETL pattern (extract, transform, load)', 'generator-based streaming pipelines', 'data validation and cleaning steps', 'batch processing vs streaming', 'error handling in pipelines (skip, retry, dead-letter)', 'pipeline composition and reuse'],
      progressionSignal: 'Build multi-stage data pipelines with generators, validation, and error recovery.' },
    { id: 'design_patterns', name: 'Design patterns (strategy, observer)', tier: 6,
      concepts: ['strategy pattern (interchangeable algorithms)', 'observer pattern (pub/sub, event-driven)', 'factory pattern (object creation)', 'singleton (module-level instance)', 'adapter pattern (interface compatibility)', 'when NOT to use patterns (simplicity first)'],
      progressionSignal: 'Recognize when patterns apply, implement strategy/observer/factory, and know when YAGNI wins.' },

    // Tier 7 — Code Review & Architecture
    { id: 'code_review_bugs', name: 'Code review: finding bugs', tier: 7,
      concepts: ['off-by-one errors', 'null/None reference bugs', 'mutable default argument trap', 'race conditions in shared state', 'logic errors in boolean expressions', 'boundary condition failures'],
      progressionSignal: 'Spot logic errors, off-by-ones, and subtle Python gotchas in unfamiliar code.' },
    { id: 'code_review_perf', name: 'Code review: performance issues', tier: 7,
      concepts: ['O(n^2) hidden in nested loops', 'repeated work that should be cached', 'string concatenation in loops (use join)', 'unnecessary list copies', 'N+1 query patterns', 'choosing wrong data structure (list vs set for lookup)'],
      progressionSignal: 'Identify performance anti-patterns and suggest concrete fixes with complexity analysis.' },
    { id: 'code_review_style', name: 'Code review: style and best practices', tier: 7,
      concepts: ['PEP 8 violations and naming conventions', 'dead code and unused imports', 'overly complex conditionals (simplify with early return)', 'magic numbers and missing constants', 'unpythonic patterns (C-style loops, manual index tracking)', 'missing error handling at boundaries'],
      progressionSignal: 'Identify style issues, unpythonic code, and missing safeguards. Suggest idiomatic alternatives.' },
    { id: 'refactoring', name: 'Refactoring legacy code', tier: 7,
      concepts: ['extract method/function', 'replace magic numbers with named constants', 'simplify conditionals (guard clauses, early return)', 'remove duplication (DRY)', 'improve naming for clarity', 'break god functions into cohesive units'],
      progressionSignal: 'Apply systematic refactoring techniques to messy code while preserving behavior.' },
    { id: 'architecture', name: 'Architectural patterns', tier: 7,
      concepts: ['separation of concerns (layers)', 'coupling vs cohesion', 'dependency inversion principle', 'repository pattern for data access', 'service layer pattern', 'SOLID principles overview'],
      progressionSignal: 'Evaluate code architecture, identify coupling issues, and suggest structural improvements.' }
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
      .map(c => `  - ${c.topic}: ${c.summary || (c.passed ? 'passed' : 'failed')}`)
      .join('\n');

    const conceptsList = profile.conceptsIntroduced.slice(-20).join(', ');
    const weakList = profile.weakAreas.join(', ');

    const difficulty = isSettingsGate ? 'harder than usual (this is a settings-gate challenge)' : 'appropriate for the current level';

    // Spaced repetition context
    const reviewContext = (typeof SpacedRepetition !== 'undefined')
      ? SpacedRepetition.buildReviewContext(profile, CURRICULUM)
      : '';

    // Sub-concept coverage for current topic
    const topicConcepts = currentTopic.concepts || [];
    const introduced = profile.conceptsIntroduced || [];
    const nextConcept = topicConcepts.find(c => !introduced.includes(c));
    const conceptProgress = topicConcepts.length > 0
      ? topicConcepts.map(c => `  ${introduced.includes(c) ? '✓' : '○'} ${c}`).join('\n')
      : '';

    return `You are a Python programming mentor embedded in a browser extension that blocks distracting websites. The user must solve your challenge to access a site they've blocked. Your job is to genuinely teach them Python — not just test them.

## Your Teaching Style
- Concise, dry, intelligent. No fake enthusiasm.
- Introduce ONE new concept or technique per challenge when appropriate.
- When the user is learning something new, briefly explain the concept AND show the exact syntax with a brief example before the problem. Don't just explain what something does — show how to write it. E.g. "List comprehensions build lists in one line. Syntax: [expression for item in iterable]. Example: [x**2 for x in range(5)] gives [0, 1, 4, 9, 16]."
- The syntax example should differ from the challenge so the user still needs to think.
- When reinforcing, just give the problem.
- Gradually increase complexity within a topic before moving to the next.

## Current Topic: ${currentTopic.name} (Tier ${tier}/7)
Curriculum position: ${profile.currentTopicIndex + 1}/${CURRICULUM.length}
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
  "conceptIntroduced": "EXACT string from sub-concepts list above, or null if reinforcing",
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
  "conceptIntroduced": "EXACT string from sub-concepts list above, or null if reinforcing",
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

  function updateProfileAfterChallenge(profile, challenge, passed, source, struggled, usedHelp, summary) {
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
      summary: summary || null,
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
