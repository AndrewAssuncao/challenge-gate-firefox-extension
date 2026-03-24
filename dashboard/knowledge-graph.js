/* Knowledge Graph — Cross-discipline dependency map.

   Defines nodes (all topics from all curricula) and edges
   (cross-discipline dependencies that show compound learning).

   Also provides getCrossDisciplineContext() which mentor prompts
   use to tell Claude about related mastered topics in other disciplines. */

'use strict';

const KNOWLEDGE_GRAPH = {
  // Disciplines and their colors
  disciplines: {
    python: { label: 'Python', color: '#4a7eff', x: 0 },
    terminal: { label: 'Terminal', color: '#9ece6a', x: 1 },
    git: { label: 'Git', color: '#bb9af7', x: 2 }
  },

  // Cross-discipline edges (same-discipline edges are implicit from curriculum order)
  edges: [
    // ── Terminal ↔ Python (Tier 1-2: Foundations) ─────────────────────
    { from: 'py:basics', to: 'term:navigation', label: 'First steps in both' },
    { from: 'py:strings', to: 'term:grep_search', label: 'Pattern matching' },
    { from: 'py:loops', to: 'term:shell_scripting', label: 'Loop constructs' },
    { from: 'py:dicts', to: 'term:environment', label: 'Key-value mappings' },

    // ── Terminal ↔ Python (Tier 2-3: Intermediate) ───────────────────
    { from: 'term:redirection', to: 'py:file_patterns', label: 'I/O concepts' },
    { from: 'py:sorting', to: 'term:text_processing', label: 'Sort & filter' },
    { from: 'py:error_handling', to: 'term:environment', label: 'Debugging with env' },
    { from: 'py:recursion', to: 'term:remove_find', label: 'Recursive traversal' },

    // ── Terminal ↔ Python (Tier 3-5: Advanced) ───────────────────────
    { from: 'py:functions', to: 'term:shell_scripting', label: 'Function patterns' },
    { from: 'py:classes', to: 'term:docker_basics', label: 'OOP in containers' },
    { from: 'py:concurrency', to: 'term:processes', label: 'Processes & threads' },
    { from: 'term:package_managers', to: 'py:testing', label: 'pip + pytest' },
    { from: 'py:data_pipelines', to: 'term:text_processing', label: 'Data transforms' },
    { from: 'term:sed_awk', to: 'py:string_ops', label: 'Text processing' },
    { from: 'term:docker_compose', to: 'py:api_patterns', label: 'Service architecture' },

    // ── Terminal ↔ Git ───────────────────────────────────────────────
    { from: 'term:git_basics', to: 'git:git_init', label: 'Git fundamentals' },
    { from: 'term:git_branching', to: 'git:git_branch_create', label: 'Branching' },
    { from: 'term:git_advanced', to: 'git:git_rebase', label: 'Advanced git' },
    { from: 'term:ssh', to: 'git:git_workflows', label: 'Remote workflows' },
    { from: 'term:permissions', to: 'git:git_init', label: 'File ownership' },
    { from: 'term:aliases_history', to: 'git:git_log', label: 'History & shortcuts' },

    // ── Python ↔ Git ─────────────────────────────────────────────────
    { from: 'py:testing', to: 'git:git_workflows', label: 'CI/CD patterns' },
    { from: 'py:refactoring', to: 'git:git_rebase', label: 'Clean history' },
    { from: 'py:composition', to: 'git:git_merge_3way', label: 'Collaboration' },
    { from: 'py:error_handling', to: 'git:git_bisect', label: 'Systematic debugging' },
    { from: 'py:data_structs', to: 'git:git_stash', label: 'Stack operations' },
    { from: 'py:algorithms', to: 'git:git_rebase_interactive', label: 'Reordering logic' },
    { from: 'py:design_patterns', to: 'git:git_workflows', label: 'Workflow patterns' },

    // ── Git ↔ Terminal (reverse direction for some) ──────────────────
    { from: 'git:git_log', to: 'term:grep_search', label: 'Searching history' },
    { from: 'git:git_stash', to: 'term:aliases_history', label: 'Workflow shortcuts' }
  ]
};

/**
 * Build the full node list from available learning profiles.
 * Each node: { id, label, discipline, tier, mastery, confidence, passes, attempts }
 */
function buildKnowledgeNodes(pythonProfile, terminalProfile, gitProfile) {
  const nodes = [];

  const PY_TOPICS = [
    { id: 'basics', name: 'Variables & types', tier: 1 },
    { id: 'strings', name: 'Strings', tier: 1 },
    { id: 'conditionals', name: 'Conditionals', tier: 1 },
    { id: 'loops', name: 'Loops', tier: 1 },
    { id: 'lists', name: 'Lists', tier: 2 },
    { id: 'dicts', name: 'Dicts', tier: 2 },
    { id: 'sets_tuples', name: 'Sets & tuples', tier: 2 },
    { id: 'comprehensions', name: 'Comprehensions', tier: 2 },
    { id: 'functions', name: 'Functions', tier: 2 },
    { id: 'string_ops', name: 'String ops', tier: 3 },
    { id: 'error_handling', name: 'Error handling', tier: 3 },
    { id: 'file_patterns', name: 'File I/O', tier: 3 },
    { id: 'sorting', name: 'Sorting', tier: 3 },
    { id: 'recursion', name: 'Recursion', tier: 3 },
    { id: 'classes', name: 'Classes & OOP', tier: 4 },
    { id: 'generators', name: 'Generators', tier: 4 },
    { id: 'decorators', name: 'Decorators', tier: 4 },
    { id: 'data_structs', name: 'Data structures', tier: 4 },
    { id: 'algorithms', name: 'Algorithms', tier: 4 },
    { id: 'dp', name: 'Dynamic programming', tier: 5 },
    { id: 'graphs', name: 'Graph traversal', tier: 5 },
    { id: 'advanced', name: 'Advanced patterns', tier: 5 },
    { id: 'functional', name: 'Functional programming', tier: 5 },
    { id: 'concurrency', name: 'Concurrency', tier: 5 },
    { id: 'composition', name: 'Multi-function', tier: 6 },
    { id: 'testing', name: 'Testing', tier: 6 },
    { id: 'api_patterns', name: 'API design', tier: 6 },
    { id: 'data_pipelines', name: 'Data pipelines', tier: 6 },
    { id: 'design_patterns', name: 'Design patterns', tier: 6 },
    { id: 'code_review_bugs', name: 'Review: bugs', tier: 7 },
    { id: 'code_review_perf', name: 'Review: perf', tier: 7 },
    { id: 'code_review_style', name: 'Review: style', tier: 7 },
    { id: 'refactoring', name: 'Refactoring', tier: 7 },
    { id: 'architecture', name: 'Architecture', tier: 7 }
  ];

  const TERM_TOPICS = [
    { id: 'navigation', name: 'Navigation', tier: 1 },
    { id: 'file_creation', name: 'File creation', tier: 1 },
    { id: 'file_reading', name: 'File reading', tier: 1 },
    { id: 'paths', name: 'Paths', tier: 1 },
    { id: 'help_man', name: 'Help & man', tier: 1 },
    { id: 'copy_move', name: 'Copy & move', tier: 2 },
    { id: 'remove_find', name: 'Remove & find', tier: 2 },
    { id: 'grep_search', name: 'grep', tier: 2 },
    { id: 'permissions', name: 'Permissions', tier: 2 },
    { id: 'redirection', name: 'Pipes & redirect', tier: 2 },
    { id: 'text_processing', name: 'Text processing', tier: 3 },
    { id: 'processes', name: 'Processes', tier: 3 },
    { id: 'environment', name: 'Environment', tier: 3 },
    { id: 'aliases_history', name: 'Aliases', tier: 3 },
    { id: 'package_managers', name: 'Package mgrs', tier: 3 },
    { id: 'git_basics', name: 'Git basics', tier: 4 },
    { id: 'git_branching', name: 'Git branching', tier: 4 },
    { id: 'ssh', name: 'SSH', tier: 4 },
    { id: 'docker_basics', name: 'Docker', tier: 4 },
    { id: 'curl_networking', name: 'curl & net', tier: 4 },
    { id: 'shell_scripting', name: 'Shell scripting', tier: 5 },
    { id: 'git_advanced', name: 'Advanced git', tier: 5 },
    { id: 'docker_compose', name: 'Docker compose', tier: 5 },
    { id: 'sed_awk', name: 'sed & awk', tier: 5 },
    { id: 'system_debug', name: 'System debug', tier: 5 }
  ];

  const GIT_TOPICS = [
    { id: 'git_init', name: 'Init & status', tier: 1 },
    { id: 'git_staging', name: 'Staging', tier: 1 },
    { id: 'git_commit', name: 'Commits', tier: 1 },
    { id: 'git_log', name: 'Log & history', tier: 1 },
    { id: 'git_branch_create', name: 'Branches', tier: 2 },
    { id: 'git_checkout', name: 'Checkout', tier: 2 },
    { id: 'git_merge_ff', name: 'FF merge', tier: 2 },
    { id: 'git_merge_3way', name: '3-way merge', tier: 2 },
    { id: 'git_rebase', name: 'Rebase', tier: 3 },
    { id: 'git_cherry_pick', name: 'Cherry-pick', tier: 3 },
    { id: 'git_stash', name: 'Stash', tier: 3 },
    { id: 'git_reset', name: 'Reset', tier: 3 },
    { id: 'git_rebase_interactive', name: 'Interactive rebase', tier: 4 },
    { id: 'git_bisect', name: 'Bisect', tier: 4 },
    { id: 'git_reflog', name: 'Reflog', tier: 4 },
    { id: 'git_tags', name: 'Tags', tier: 4 },
    { id: 'git_merge_conflicts', name: 'Conflicts', tier: 5 },
    { id: 'git_workflows', name: 'Workflows', tier: 5 },
    { id: 'git_advanced_rebase', name: 'Adv. rebase', tier: 5 },
    { id: 'git_submodules', name: 'Submodules', tier: 5 }
  ];

  function addTopics(topics, discipline, prefix, profile) {
    const history = profile?.topicHistory || {};
    const currentIdx = profile?.currentTopicIndex || 0;
    topics.forEach((t, i) => {
      const stats = history[t.id] || {};
      const confidence = stats.confidenceLevel || 0;
      let mastery = 'not_started';
      if (i < currentIdx || confidence >= 4) mastery = 'mastered';
      else if (confidence >= 2) mastery = 'learning';
      else if (stats.attempts > 0) mastery = 'started';
      nodes.push({
        id: `${prefix}:${t.id}`,
        label: t.name,
        discipline,
        tier: t.tier,
        mastery,
        confidence,
        passes: stats.passes || 0,
        attempts: stats.attempts || 0
      });
    });
  }

  addTopics(PY_TOPICS, 'python', 'py', pythonProfile);
  addTopics(TERM_TOPICS, 'terminal', 'term', terminalProfile);
  addTopics(GIT_TOPICS, 'git', 'git', gitProfile);

  return nodes;
}

/**
 * Get cross-discipline context for a mentor prompt.
 * Given a discipline and topic, returns mastered related topics in OTHER disciplines.
 * This is called by providers before generating challenges.
 *
 * @param {string} discipline - 'python', 'terminal', or 'git'
 * @param {string} topicId - Current topic being challenged (e.g., 'shell_scripting')
 * @param {object} allProfiles - { python: profile, terminal: profile, git: profile }
 * @returns {string} Context paragraph for the mentor prompt, or empty string
 */
function getCrossDisciplineContext(discipline, topicId, allProfiles) {
  if (!allProfiles) return '';

  const prefixMap = { python: 'py', terminal: 'term', git: 'git' };
  const prefix = prefixMap[discipline];
  if (!prefix) return '';

  const nodeId = `${prefix}:${topicId}`;
  const edges = KNOWLEDGE_GRAPH.edges;

  // Find all edges connected to this topic
  const related = [];
  for (const edge of edges) {
    let otherNodeId = null;
    let edgeLabel = edge.label;
    if (edge.from === nodeId) otherNodeId = edge.to;
    else if (edge.to === nodeId) otherNodeId = edge.from;
    if (!otherNodeId) continue;

    // Parse other node: "py:functions" → discipline=python, topicId=functions
    const [otherPrefix, otherTopicId] = otherNodeId.split(':');
    const otherDisc = Object.entries(prefixMap).find(([_, p]) => p === otherPrefix)?.[0];
    if (!otherDisc || otherDisc === discipline) continue; // skip same-discipline

    // Check if the user has mastered this related topic
    const otherProfile = allProfiles[otherDisc];
    if (!otherProfile?.topicHistory?.[otherTopicId]) continue;
    const stats = otherProfile.topicHistory[otherTopicId];
    if (!stats || stats.passes === 0) continue;

    const confidence = stats.confidenceLevel || 0;
    const label = confidence >= 3 ? 'mastered' : confidence >= 1 ? 'familiar with' : 'seen';

    related.push({
      discipline: otherDisc,
      topicId: otherTopicId,
      edgeLabel,
      confidence,
      label
    });
  }

  if (related.length === 0) return '';

  const lines = related.map(r =>
    `  - The user has ${r.label} "${r.topicId}" in ${r.discipline} (${r.edgeLabel})`
  );

  return `\n## Cross-Discipline Knowledge\nThis topic connects to concepts the user has studied in other disciplines. Leverage this existing knowledge when teaching:\n${lines.join('\n')}\n`;
}
