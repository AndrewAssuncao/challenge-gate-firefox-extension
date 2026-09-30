# Quant learning implementation and verification

## Scope

Local branch `quant-learning`, based on `78641a4d66bda1c6673925037619afab774a43c8`.
The source checkout `/Users/andre/dev/FirefexExtension` is unchanged. No push,
publication, deployment, credential change, paid model call, or Erevno edit.

Five visible modes: Typing, Git, Quant Coding, Brainteasers and Quant Math.
Math separates arithmetic and probability records. Terminal implementation and
history remain available through existing site routes. The site edit form retains
an existing Terminal choice unless the user deliberately selects its replacement.
Daily caps, unlock duration and settings protection keep their existing policy.

## Durable memory and selection

`learning/curriculum.js` defines 21 foundation skills, prerequisites, teaching
notes, worked examples, error contrasts, numeric/Python oracles and distinct
foundation/transfer families. `CURRICULUM.md` is the reviewable content map.

`learning/engine.js` chooses prerequisites, repair, due reviews and next skills.
It stores evidence rather than model claims. Each attempt records its lesson,
skill, question variant, family, content/grading versions, assistance, first-try
status, correctness, observed error category and elapsed time. Timing does not
control conceptual mastery. Brainteasers require both a number and a structured
supporting reason; coding uses executable tests.

Readiness is an explicit product heuristic: at least five recent unassisted
first-try assessments with at least four correct, spanning two lessons and both
families with transfer evidence. Retention additionally requires a successful
independent review at least seven days after initial evidence. These are not
psychometrically validated thresholds. Prerequisites receive no automatic credit.

The active lesson persists through diagnostic, explanation, guided practice,
independent check and completion. `learning/store.js` owns serialized background
writes and acknowledges only after storage succeeds. Repeated event IDs are
idempotent; stale tabs are rejected with a reload action. The dashboard exports
raw learner JSON, including unsupported versions for recovery. Evidence is kept
locally without a destructive retention cutoff; very long-term compaction and
import/restore UI are not implemented.

AI personalization is explicit and optional through the existing Anthropic
relay. Only teaching prose can change; skill identity, phase, tests, answer keys,
and progress are controlled locally. Malformed/wrong-topic responses are rejected
and the local lesson remains available. AI prose is not independently fact-checked;
no live AI request was used during implementation.

## Legacy fixes

Removed startup redistribution that manufactured passes on unseen topics.
Added actual topic IDs to the 42 retained Python problems and topic-based fallback
selection. Removed the assisted-pass advancement shortcut. Invalidating defective
legacy questions reopens their topic and confidence. Hint usage is included in
assistance evidence. Legacy Git/Terminal/Python outcomes are applied atomically
by the background script, including skips. Stale whole-profile save messages are
rejected rather than overwriting newer evidence. Existing possibly contaminated
history is preserved, not silently reinterpreted as quant mastery.

## Verification

- `node --test tests/*.test.js`: 25 tests, including 93 executable CPython oracle
  checks across every Quant Coding skill and both assessment families.
- Actual background scripts exercised with an isolated WebExtension API harness:
  restart, concurrent saves, retry idempotence, failed writes, preserved Terminal
  policy, daily caps and unlock durations.
- Real Chromium UI smoke test: diagnostic → teaching → guided → independent check,
  refresh/resume, invalid numeric recovery, track switching, saved unlock, Python
  editor with local CPython, no-key tutor fallback, Typing, legacy Terminal,
  dashboard and unchanged Terminal configuration when saving unrelated settings.
- JavaScript syntax, JSON parsing and Git whitespace checks.

Browser smoke invocation (requires installed Playwright and Chromium):

```sh
PLAYWRIGHT_MODULE=/path/to/playwright \
CHROME_EXECUTABLE=/path/to/chrome node tests/browser-smoke.cjs
```

The browser harness loads the actual UI and background code, but substitutes the
WebExtension transport and Python execution worker. It does not prove Firefox's
webRequest integration or the CDN-hosted Pyodide runtime. A normal Firefox build
was not available in this environment; the installed Tor bundle is not treated
as a supported extension test target. Screenshots are in `output/playwright/`.

## Remaining manual acceptance

Load this checkout's manifest into a disposable Firefox profile. Confirm real
redirect/unlock/cap behavior, real Pyodide load and code execution, reload/resume,
and no changes to existing extension data. Do not use paid AI until explicitly
approved. This is a foundation curriculum, not a full quant interview course.
