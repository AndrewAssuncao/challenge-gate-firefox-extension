# Decision-first curriculum implementation plan

Base: verified remote main `a4bc4f5d701ec5a22d54aac899d6b5af31ee0472` on 2026-10-01. Isolated local clone; branch `curriculum/reasoning-methods`. Baseline: `node --test tests/*.test.js`, 81 passed.

## Scope and sequence (before implementation)

1. Add four bounded foundation units using the current engine and prerequisites:
   - `data-weighted` after fractions: select relevant multi-row table data, aggregate counts, and transfer to time-weighted throughput. Do not average unequal-sized group rates.
   - `data-base` after weighted data and successive returns: identify the percentage base and relevant period; transfer from forward change to reconstruction from final values and rates.
   - `brain-order` after exhaustive cases: enumerate feasible orders, count a statement's witnesses, and distinguish must/could/impossible. Transfer introduces adjacency and exclusion constraints. This checks enumeration and recognition, not writing a general proof.
   - `prob-method` after independent events: choose independent multiplication, conditional multiplication (including without replacement), or insufficient information. Transfer uses conditional tables, replacement contrasts and attainable joint-probability bounds. No independence inference from marginal rates.
2. Each unit includes explicit assumptions/prerequisites, a different worked example, two guided hints, independent checks, a structurally changed transfer family and the existing repair/reassessment path. Preserve existing item identities and evidence. New tables are native HTML tables with captions and header cells; no chart-only information.
3. Ground feedback in an observed intermediate response. A wrong final answer alone cannot diagnose a misconception. Show the concrete mismatch and repair step, without claiming to know the learner's thought process.
4. Correct legacy objectives that overclaim full proof/tree construction. Add a visible local-bank scope statement to lesson/skill details: practiced means evidence on this bounded unit; retention is delayed retrieval, neither means broad interview readiness.
5. Prepare a separate original diagnostic-first practice document for Oct 3. It must not claim to reproduce IMC/SHL components or access any live assessment.
6. Document staged long-term gaps: combinatorics; distributions; linearity, variance and covariance; multistep expectation; simulation uncertainty; coding prerequisites/scaffolds. Seek product decisions before changing the prerequisite model, assessment schema, or broad track architecture.

## Verification and review

- Independent numeric/permutation oracles for every new variant; negative oracles for wrong weighting, wrong percentage bases, ignored constraints, unjustified independence and unsupported exact probabilities.
- Perfect progression, novice errors/hints, transfer coverage, save/reload, lifetime identity, exhausted-bank delayed recovery, invalidation and retention. Existing all-skill tests extend to new units.
- Parameterized hints, worked examples and intermediate feedback remain consistent with the item. New content must not change old canonical keys.
- Read-only Claude CLI adversarial review of objective alignment, correctness, hints and shallow transfer; no installs, setup or secret transmission.
- Authentic installed Zen in an owned disposable profile/PID: normal and narrow layouts, native table accessibility, helper placement, keyboard entry, teaching/repair, independent transfer, persistence and skill-tree nodes. No normal profile changes and no other task's browser termination.
- Run all Node tests plus existing Python solution/mutation oracles; record exact results and a clean local commit. No push or merge.

## Coordination

Release task owns manifest, Pyodide runtime, background backup/consent and dashboard Settings. Curriculum task owns learning content/engine feedback, gate quant UI, graph labels and teaching docs/tests. Avoid release files; share any additional edits before making them. The existing learner schema and store remain unchanged.
