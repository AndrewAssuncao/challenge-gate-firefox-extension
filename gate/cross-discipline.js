/* Cross-Discipline Context — Lightweight module for gate page.

   Provides getCrossDisciplineContext() which mentor prompts use to
   tell Claude about related mastered topics in other disciplines.
   This enriches teaching by connecting knowledge across Python, Terminal, and Git. */

'use strict';

const CrossDiscipline = (() => {

  // Cross-discipline edges (mirrors dashboard/knowledge-graph.js)
  const EDGES = [
    // Terminal ↔ Python
    { from: 'py:basics', to: 'term:navigation' },
    { from: 'py:strings', to: 'term:grep_search' },
    { from: 'py:loops', to: 'term:shell_scripting' },
    { from: 'py:dicts', to: 'term:environment' },
    { from: 'term:redirection', to: 'py:file_patterns' },
    { from: 'py:sorting', to: 'term:text_processing' },
    { from: 'py:error_handling', to: 'term:environment' },
    { from: 'py:recursion', to: 'term:remove_find' },
    { from: 'py:functions', to: 'term:shell_scripting' },
    { from: 'py:classes', to: 'term:docker_basics' },
    { from: 'py:concurrency', to: 'term:processes' },
    { from: 'term:package_managers', to: 'py:testing' },
    { from: 'py:data_pipelines', to: 'term:text_processing' },
    { from: 'term:sed_awk', to: 'py:string_ops' },
    { from: 'term:docker_compose', to: 'py:api_patterns' },
    // Terminal ↔ Git
    { from: 'term:git_basics', to: 'git:git_init' },
    { from: 'term:git_branching', to: 'git:git_branch_create' },
    { from: 'term:git_advanced', to: 'git:git_rebase' },
    { from: 'term:ssh', to: 'git:git_workflows' },
    { from: 'term:permissions', to: 'git:git_init' },
    { from: 'term:aliases_history', to: 'git:git_log' },
    // Python ↔ Git
    { from: 'py:testing', to: 'git:git_workflows' },
    { from: 'py:refactoring', to: 'git:git_rebase' },
    { from: 'py:composition', to: 'git:git_merge_3way' },
    { from: 'py:error_handling', to: 'git:git_bisect' },
    { from: 'py:data_structs', to: 'git:git_stash' },
    { from: 'py:algorithms', to: 'git:git_rebase_interactive' },
    { from: 'py:design_patterns', to: 'git:git_workflows' },
    // Git → Terminal
    { from: 'git:git_log', to: 'term:grep_search' },
    { from: 'git:git_stash', to: 'term:aliases_history' }
  ];

  const PREFIX_MAP = { python: 'py', terminal: 'term', git: 'git' };

  /**
   * Get cross-discipline context for a mentor prompt.
   * @param {string} discipline - 'python', 'terminal', or 'git'
   * @param {string} topicId - Current topic ID (e.g., 'shell_scripting')
   * @param {object} allProfiles - { python, terminal, git } learning profiles
   * @returns {string} Context paragraph for the mentor prompt, or ''
   */
  function getContext(discipline, topicId, allProfiles) {
    if (!allProfiles) return '';

    const prefix = PREFIX_MAP[discipline];
    if (!prefix) return '';
    const nodeId = `${prefix}:${topicId}`;

    const related = [];
    for (const edge of EDGES) {
      let otherNodeId = null;
      if (edge.from === nodeId) otherNodeId = edge.to;
      else if (edge.to === nodeId) otherNodeId = edge.from;
      if (!otherNodeId) continue;

      const colonIdx = otherNodeId.indexOf(':');
      const otherPrefix = otherNodeId.slice(0, colonIdx);
      const otherTopicId = otherNodeId.slice(colonIdx + 1);
      const otherDisc = Object.entries(PREFIX_MAP).find(([_, p]) => p === otherPrefix)?.[0];
      if (!otherDisc || otherDisc === discipline) continue;

      const otherProfile = allProfiles[otherDisc];
      if (!otherProfile?.topicHistory?.[otherTopicId]) continue;
      const stats = otherProfile.topicHistory[otherTopicId];
      if (!stats) continue;

      const conf = stats.confidenceLevel || 0;
      const level = conf >= 3 ? 'mastered' : conf >= 1 ? 'familiar with' : 'attempted';
      related.push({ discipline: otherDisc, topic: otherTopicId, level });
    }

    if (related.length === 0) return '';

    const lines = related.map(r =>
      `  - ${r.level} "${r.topic.replace(/_/g, ' ')}" in ${r.discipline}`
    );
    return `\n## Cross-Discipline Knowledge\nThe user has related experience in other disciplines. Leverage this when teaching — connect concepts they already know:\n${lines.join('\n')}\n`;
  }

  return { getContext };
})();
