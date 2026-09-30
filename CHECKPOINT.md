# Completed implementation checkpoint

Branch: quant-learning. Base: 78641a4.
Work was performed in an isolated checkout; the original checkout remains unchanged.

Implemented: five modes, 21-skill foundation curriculum, prerequisite-aware
selection, diagnostic/teach/guided/independent/transfer/review flow, structured
reasoning checks, durable evidence/checkpoints, atomic background writes,
malformed AI response handling, optional existing-provider coaching, legacy
progression and migration fixes, preserved Terminal routes and unlock policy.

Latest checks: 25/25 tests passing, 93 Python executable oracle checks passing,
real Chromium UI smoke passing, JS syntax/JSON/manifest/whitespace checks passing.
No approval pending. No API spend or external service introduced.

Limitations: real Firefox webRequest + CDN Pyodide still require manual acceptance;
AI personalization was tested with no-key/malformed fixtures, not a paid model.
Trading & Options is explicitly staged in CURRICULUM.md; no applied/live trading UI
is claimed. See IMPLEMENTATION.md and ATTRIBUTION.md.

## Independent review corrections (2026-09-30)

Canonical semantic content keys now prevent previously attempted or exposed material from becoming new independent evidence merely through new lesson/variant IDs. Existing version-1 evidence remains in history but is not trusted for readiness. Evidence invalidation works by durable attempt ID after lesson replacement. Python runs use a fresh namespace per submission; missing functions fail, submitted syntax errors count as learner failures, and infrastructure errors do not. Simulation tests cover equality and both mixed-coordinate directions. Transfer hints match their task. Pigeonhole, weighing, invariant and bounds exercises require an intermediate numerical construction check as well as the answer and reasoning selection.

Dashboard activity is derived from durable quant attempts plus legacy logs without rewriting legacy history; completed Quant Coding and Math lessons appear in activity totals. Tests cover duplicate-event aggregation and historical invalidation.

Verification: 32 Node tests pass, including 102 executable reference checks and mutation rejection across 18 simulation variants. The browser smoke runs the actual pinned CDN Pyodide 0.25.1 Worker in an isolated installed Chrome profile, including repeated submissions, deleted function, syntax error classification, lesson reload/resume, gate unlock, dashboard activity and legacy Terminal settings preservation. Browser extension APIs are still supplied by the background harness. Standard Firefox/web-ext/geckodriver are unavailable on this machine; no actual Firefox extension integration claim is made.

Scope: this is a 21-skill foundation with two exercise families per skill, not a complete quant interview course. Brainteaser checks are structured recognition and bounded construction, not free-form proof grading. Trading & Options remains the next approved Arcade slice, to follow independent re-review of these core corrections. No API credits spent, software installed, credentials changed or code published.

### Reachability correction

Review found that fixed transfer-family selection could exhaust a small family and stall a perfect learner. Selection now searches unseen content in the preferred family, then the other family; it never relabels repeat content as novel. Independent-event foundation questions now vary the stated probability rather than repeating one fixed item. A full-path regression reaches readiness for all 21 skills across arithmetic, probability, coding and brainteasers, checks globally unique novel content, and confirms that same-time readiness does not imply retention. All 33 tests pass.

Zen was found at `/Applications/Zen 2.app`: version 1.22.3b, Gecko 156.0.1. Its help output confirms isolated-profile, headless, Marionette and WebDriver BiDi flags. This corrects the earlier incomplete browser inventory; authentic Zen extension testing is being investigated, and is not yet a passing test.

The call-spread oracle now always includes an expiry above the upper strike. A mutation sweep covers all ten coding templates, both difficulty settings and nine seeds (360 mutant/variant combinations), rejecting common sign, weighting, fee, variance and threshold errors. All 34 tests pass, with 105 reference oracle checks. The bounds construction prompt no longer gives away the optimum load before the main answer.

### Authentic Zen runtime

The installed Zen 1.22.3b (Gecko 156.0.1) successfully loads the extension temporarily via its built-in Marionette `Addon:Install` API in a new headless profile. `tests/zen-smoke.py` uses a fixed UUID only in that disposable profile, navigates with the explicit test-system-context flag, and runs a Quant Coding exercise in the real extension page using the actual CDN Pyodide Worker and extension APIs. All four P&L tests pass and the learner records one independent check. This is a Zen result, not a standard Firefox result. Full browser restart, gate unlock and old-mode Zen coverage remain to be added; the broader Chromium harness remains complementary coverage. No geckodriver, web-ext, or new browser installation was needed.

The reproducible Zen smoke also confirms saved independent evidence survives page reload (a completed lesson advances to a fresh check on reopening). The smoke exits successfully.

### Recovery, visible tree and full Zen restart

Expanded formerly single-item transfer families for percentages, complements, conditional probability and Bayes. Readiness now combines recent independent accuracy with durable valid family/transfer qualification, preventing continued correct foundation practice from erasing a valid transfer. Invalidation still removes the underlying qualification. New tests exercise a failed/hinted first transfer followed by 160 steps, review-failure repair, unrelated-skill preservation, and graph acyclicity/evidence consistency. All 38 Node tests pass. The bank remains a bounded foundation; exhausted content is labelled retrieval and never receives new first-try credit.

The visible quant skill tree now renders all 21 real skill IDs and prerequisite arrows from `QuantCurriculum`, using `QuantLearning.graph`/`evidence` for status, independent-check count, review due/date and prerequisite availability. It has no action that awards progress. Existing Typing/Git views and historical programming/Terminal map remain intact. Previously only text progress rows represented quant skills; this closes that visible-tree gap.

Expanded authentic Zen smoke passes: actual blocked loopback-site interception, CDN Python grading, actual domain unlock and navigation, full browser process shutdown/restart, learner event and site-policy equality after restart, and Typing/Git/legacy Terminal initialization. The test also checks all 21 visible graph nodes and saved P&L status after restart. Temporary add-ons do not remain installed across browser shutdown: the smoke explicitly reloads the same extension ID in the same disposable profile. Learner storage persists across that reload; this does not imply temporary installation persistence. Compatibility coverage for the older modes establishes initialization, not exhaustive exercise completion.

### General exhausted-bank recovery and unambiguous prerequisite display

A seven-day, unassisted known-item reassessment can replace evidence for the same semantic item. It does not create novel evidence or inflate distinct-item counts. Five distinct assessed items, four correct, two lessons and both families are still required. Recovery is explicitly labelled `practiced (reassessed)`; the gate and dashboard separately display novel checks and known-item reassessments. Immediate repetitions and hints do not qualify. The earliest reassessment date is shown, and further exposure resets that item's delay. All 21 skills now pass failure/hint exhaustion sweeps with JSON roundtrips and delayed recovery; a separate natural-selector regression reproduces and recovers the two-failure/three-hint balance scenario without growing novel counts.

Conditional-probability and Bayes transfer hints now derive from the same parameters as their answer oracle. Seed/difficulty sweeps check consistency. The quant map uses explicit named prerequisite links instead of ambiguous lines hidden behind unrelated cards. Links only navigate to a skill description; they cannot award progress or bypass prerequisites.

Authentic Zen completed Typing (real WebDriver text input), Git staging and legacy Terminal navigation exercises through their UI handlers, saved passed outcomes, and unlocked the real loopback destination. Full restart and learner/site persistence continue to pass. Testing discovered an old three-commit Git fixture had no files and no supported way to create them; it now supplies three named files for separate commits, with a real-simulator regression verifying the four-commit result. No everyday browser profile or installed user extension was changed.

Final rerun: all 42 Node tests pass. Zen additionally verified every visible prerequisite link exactly matches the source DAG, and completed another Git log exercise and Terminal file-reading exercise through actual destination unlock.

Retention review correction: the retained baseline now uses the earliest non-invalidated qualifying pass, independently of latest per-item reassessments. A regression retains all six balance items through day8 and day16 reviews, then verifies that invalidating the earlier evidence removes unsupported retention. The focused 35 learner tests pass.

### Applied Arcade and authorized external review

Five applied units now reuse the existing learner state and UI: market-contracts, market-execution, market-options, market-quote, market-greeks. They form the applied Quant Math track, exposed in Arcade only. Every scenario is simulated with explicit units/multiplier/fees/assumptions. Independent numeric oracles and conceptual mutations cover the supplied fixtures and generated variants. The recovery/graph sweeps now include all 26 skills.

The authorized installed Claude Code review was read-only, with no tools/MCP/customizations and only a supplied extension source/test/curriculum bundle. Its confirmed stale-gate, review scheduling, rounding, failed-AI-assistance, changed-retry payload, recent-hint retention, timing/header and constant-answer findings were addressed with regressions. REVIEW_NOTES.md records the remaining non-security-boundary and legacy-only limitations; no hostile-code/anti-cheating guarantee is claimed.

Current verification: 55 Node tests pass. Authentic Zen passes full interception/CDN Python/unlock/restart, Typing/Git/Terminal completion, exact prerequisite links and the dedicated applied Arcade through all five units, including saved teaching reload and unchanged browsing unlock state. LOCAL_INSTALL.md explains temporary loading and data persistence. Standard Firefox remains untested.
