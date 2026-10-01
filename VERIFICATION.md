# Release verification and publication scope

The local combined implementation was independently reviewed at
`a79b18006311e3dfe2af48f55fb631c07e45a2a9`, combining release `72bc71a` and
curriculum `ef6295a`. Publication commit 7aa7366 kept its product, learner and test
code byte-identical. Its clean history omits private review artifacts and removes
local paths, browser/process identifiers and machine observations from public docs.
The enclosing publication commit (`git rev-parse HEAD`) is the upload identity.
The original reviewed branches remain local and unchanged.
The approved follow-up changes only the legacy Python executable-start boundary,
minimum Firefox version and associated tests/docs; it requires a new exact review.

Two historical curriculum commits (`999d0b7`, `c57b081`) are retained because the
unchanged regression tests load their authored content by exact Git identity. Both
predate the private verification artifacts; their new reachable trees were checked
for private paths/records. Publication does not include the later private review
history. Remote main remains the verified `a4bc4f5` base; no main merge is included.

## Verified implementation

- Current static suite: 157 tests passed, zero failed/skipped, including twelve new
  local-starter/cache/input tests, 105 executable CPython oracle
  cases and all 30 fully exposed-bank recovery cases.
  Three focused legacy regressions additionally verify safe review-score rendering,
  no grant/write on invalid score data, and preservation of actual failed evidence
  after Help issue JSON while ordinary later success retains the assistance marker.
- Prior approved implementation's authentic Zen 1.22.3b release smoke: all 13 checks passed. Separate default-off
  history consent/decline, blocked local destination, packaged Python gate, fresh
  denied-network worker with 105 oracle cases/stdlib, new optional curriculum fields
  and method spoof no-write, malformed rejection, full loss/recovery, invalidation,
  legacy progress, file preview, idle observer, controlled restart and disposable
  removal/reinstall. Fake keys and owned disposable processes only.
- Prior approved implementation's authentic curriculum smoke: six groups passed at measured 1200px/390px, including
  keyboard/caret, teaching/guided/independent flows, accessible transfer tables,
  three-field draft persistence/composition/queue, supported repair feedback,
  all 30 skills, exact 35 edges and controlled full restart persistence.
- Unit/adversarial probes cover full/legacy/recovery optional drafts, diagnosis,
  retestAt, rollback/write failure, unchanged active tracking, malformed usage,
  irrelevant nested event fields, schema/prototype/size bounds and credential
  exclusion. Full restore clears unlocks and cannot decrease today's usage;
  quant-only restore preserves unrelated records and disables AI.
- Shared item identity validation follows inert/type/size checks. Authored supported
  tags must agree with variant/family/canonical key/transfer; aliases remain raw
  and cannot mint duplicate evidence. Editable JSON is not authenticated history.
- Separate personal/history consent branches inspect actual provider prompts and
  mocked HTTP bodies. Declined history keeps AI available without accumulated
  evidence/errors/counts. Tutor neutral stages map locally before validation;
  valid teaching counts only as assisted exposure. No real API request is tested.
- Both independent local release and curriculum/integration scopes passed exact
  combined source. Three authorized source-only Claude reviews were completed;
  material findings were fixed. Private reports/logs are omitted from publication.

## Packaging

Pyodide 0.25.1/CPython 3.11.3 core, standard library, pinned source archives and
licenses are bundled. All 36 byte/SHA-256 provenance records match. The worker
allows only bundled executable resources; generated test inputs are literal parsed.
No from-source reproduction of upstream compiler output is claimed.

The clean packager produces deterministic unsigned runtime/source ZIPs under
ignored `dist/`. Extracted source rebuilds without Git or network using sealed
SOURCE_BUILD.json; modified input rejects. Both archives rebuilt byte-identically
in the tested Python/zlib environment. Publication produces new BUILD metadata
and artifact seals for its enclosing commit; the earlier private-commit ZIPs are
not the publication artifacts.

Mozilla addons-linter 10.13.0 self-hosted validation of the reviewed runtime had
zero errors/notices and 59 unsuppressed warnings: legacy/vendor HTML assignments,
unmodified Emscripten eval sites, CSP and minimum-version/Android declarations.
The sanitized publication runtime receives a fresh package/validator check.
Local linting/review is not Mozilla policy certification.

## Remaining gates

The approved follow-up removes remote executable Python starters/signatures/defaults
and requires Firefox 140.0+. Native deny/accept/history/revoke checks passed in owned
Zen before local browser testing stopped. Independent cloud checks accepted the
preceding manifest on official Firefox 140 and 157; Firefox 102 rejected it. The
revised exact candidate requires independent cloud recheck; no Mac browser launch
is authorized. New negative unit cases cover executable response metadata, cached
legacy objects, descriptor mutation and literal-only worker input parsing.
The source review identified a legacy access-grant path for rejected test/signature
inputs. It now reports a retryable error with no grant, invalidation or progress
write. A conservative provider literal grammar rejects expression/call input data
before the worker; the independent worker ast.literal_eval check remains.
The bounded legacy follow-up accepts only finite numeric 0–100 review scores and
renders that validated value. AI Help issue JSON now remains displayed feedback;
it cannot grant access or invalidate attempts. The authored Quant route is unchanged.
Provider grammar validation is preliminary: unhashable literal keys/elements and
some interior Unicode whitespace can still be rejected by the worker. This safe
no-write/no-grant reliability limitation is documented and deferred.
Physical sleep and a genuine temporary-to-signed transition remain unverified;
local tests do not establish AMO approval or a prior disappearance cause.

The source is prepared for a draft PR, with bounded publication equivalence/privacy
recheck before push. No AMO upload/signing, normal-profile installation, main merge
or credential creation is included. A separately approved disposable same-ID signed
transition/backup/restart test must precede any everyday-profile installation.
See SIGNING.md, PRIVACY.md and the read-only procedure in DIAGNOSIS.md.
