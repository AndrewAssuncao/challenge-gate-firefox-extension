/* Spaced Repetition — Shared algorithm for Python and Terminal challenge providers.

   Uses an SM-2 variant adapted for the challenge gate context.
   Confidence levels 0-5 map to increasing review intervals.
   Failed attempts, struggled passes, and help requests decrease confidence. */

'use strict';

const SpacedRepetition = (() => {

  // Review intervals in milliseconds, indexed by confidence level (0-5)
  const INTERVALS = [
    0,                        // 0: new — immediate
    1 * 24 * 60 * 60 * 1000, // 1: learning — 1 day
    3 * 24 * 60 * 60 * 1000, // 2: familiar — 3 days
    7 * 24 * 60 * 60 * 1000, // 3: confident — 7 days
    14 * 24 * 60 * 60 * 1000,// 4: mastered — 14 days
    30 * 24 * 60 * 60 * 1000 // 5: expert — 30 days
  ];

  const LABELS = ['new', 'learning', 'familiar', 'confident', 'mastered', 'expert'];

  /**
   * Compute the next review date based on confidence level.
   * @param {number} confidenceLevel 0-5
   * @returns {number} timestamp (ms)
   */
  function computeNextReview(confidenceLevel) {
    const level = Math.max(0, Math.min(5, confidenceLevel));
    return Date.now() + INTERVALS[level];
  }

  /**
   * Update confidence after a challenge attempt.
   * @param {object} topicStats - The topicHistory entry for this topic
   * @param {boolean} passed - Whether the challenge was passed
   * @param {boolean} struggled - Whether the user failed before passing or used many commands
   * @param {boolean} usedHelp - Whether the user asked for help
   * @returns {object} Updated topicStats (mutated in place)
   */
  function updateConfidence(topicStats, passed, struggled, usedHelp) {
    if (!topicStats) return topicStats;

    // Ensure new fields exist (migration)
    if (typeof topicStats.confidenceLevel === 'undefined') {
      topicStats.confidenceLevel = 0;
      topicStats.consecutivePasses = 0;
      topicStats.helpRequests = 0;
      topicStats.failedAttemptsThenPassed = 0;
      topicStats.lastReviewDate = null;
      topicStats.nextReviewDate = null;
    }

    if (usedHelp) {
      topicStats.helpRequests = (topicStats.helpRequests || 0) + 1;
      // Decrease confidence by 0.5 (floored)
      topicStats.confidenceLevel = Math.max(0, topicStats.confidenceLevel - 0.5);
      topicStats.confidenceLevel = Math.floor(topicStats.confidenceLevel);
    }

    if (passed) {
      if (struggled) {
        // Struggled pass: record it but only small confidence boost
        topicStats.failedAttemptsThenPassed = (topicStats.failedAttemptsThenPassed || 0) + 1;
        topicStats.consecutivePasses = (topicStats.consecutivePasses || 0) + 1;
        // Only advance confidence if 3+ consecutive passes even with struggles
        if (topicStats.consecutivePasses >= 3 && topicStats.confidenceLevel < 5) {
          topicStats.confidenceLevel = Math.min(5, topicStats.confidenceLevel + 1);
          topicStats.consecutivePasses = 0; // reset after advancement
        }
      } else {
        // Clean pass
        topicStats.consecutivePasses = (topicStats.consecutivePasses || 0) + 1;
        if (topicStats.consecutivePasses >= 2 && topicStats.confidenceLevel < 5) {
          topicStats.confidenceLevel = Math.min(5, topicStats.confidenceLevel + 1);
          topicStats.consecutivePasses = 0;
        }
      }
    } else {
      // Failed
      topicStats.consecutivePasses = 0;
      if (topicStats.confidenceLevel > 0) {
        topicStats.confidenceLevel = Math.max(0, topicStats.confidenceLevel - 1);
      }
    }

    // Update review schedule
    topicStats.lastReviewDate = Date.now();
    topicStats.nextReviewDate = computeNextReview(topicStats.confidenceLevel);

    return topicStats;
  }

  /**
   * Get topics that are due for review.
   * @param {object} profile - Learning profile with topicHistory
   * @param {Array} curriculum - Array of { id, name, tier }
   * @returns {Array} Topic IDs due for review, sorted by most overdue first
   */
  function getReviewDueTopics(profile, curriculum) {
    if (!profile || !profile.topicHistory) return [];

    const now = Date.now();
    const due = [];

    for (const [topicId, stats] of Object.entries(profile.topicHistory)) {
      // Only review topics we've actually seen
      if (!stats || stats.attempts === 0) continue;
      // Skip if never reviewed (new topics without nextReviewDate)
      if (!stats.nextReviewDate) continue;
      // Check if review is due
      if (now >= stats.nextReviewDate) {
        const topic = curriculum.find(c => c.id === topicId);
        if (topic) {
          due.push({
            id: topicId,
            name: topic.name,
            tier: topic.tier,
            confidenceLevel: stats.confidenceLevel || 0,
            overdueDays: Math.round((now - stats.nextReviewDate) / (24 * 60 * 60 * 1000))
          });
        }
      }
    }

    // Sort by most overdue first
    due.sort((a, b) => b.overdueDays - a.overdueDays);
    return due;
  }

  /**
   * Migrate an existing profile to include spaced repetition fields.
   * Safe to call multiple times (idempotent).
   */
  function migrateProfile(profile) {
    if (!profile) return profile;
    if (!profile.topicHistory) profile.topicHistory = {};

    for (const [_, stats] of Object.entries(profile.topicHistory)) {
      if (typeof stats.confidenceLevel === 'undefined') {
        stats.confidenceLevel = 0;
        stats.consecutivePasses = 0;
        stats.helpRequests = 0;
        stats.failedAttemptsThenPassed = 0;
        stats.lastReviewDate = stats.lastSeen || null;
        stats.nextReviewDate = null;

        // Bootstrap confidence from existing pass rate
        if (stats.attempts >= 3) {
          const rate = stats.passes / stats.attempts;
          if (rate >= 0.9) stats.confidenceLevel = 4;
          else if (rate >= 0.7) stats.confidenceLevel = 3;
          else if (rate >= 0.5) stats.confidenceLevel = 2;
          else stats.confidenceLevel = 1;
          stats.nextReviewDate = computeNextReview(stats.confidenceLevel);
        }
      }
    }

    return profile;
  }

  /**
   * Build a review schedule summary for the mentor prompt.
   */
  function buildReviewContext(profile, curriculum) {
    const due = getReviewDueTopics(profile, curriculum);
    if (due.length === 0) return '';

    const lines = due.slice(0, 5).map(t =>
      `  - ${t.name} (confidence: ${LABELS[t.confidenceLevel]}, ${t.overdueDays}d overdue)`
    );

    return `\n## Review Schedule\nThe following topics are due for review. Consider generating a review challenge for one of these instead of new material:\n${lines.join('\n')}\n`;
  }

  return {
    computeNextReview,
    updateConfidence,
    getReviewDueTopics,
    migrateProfile,
    buildReviewContext,
    LABELS,
    INTERVALS
  };
})();
