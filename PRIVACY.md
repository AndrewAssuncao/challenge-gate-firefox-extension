# Challenge Gate privacy notice (1.1.1)

Local extension storage contains learning evidence and drafts, legacy Python/Git/
Terminal progress, typing history, site rules, per-domain time totals, unlocks and
settings. There is no developer telemetry or analytics. Private browsing is
disabled. Python uses the packaged runtime without a CDN.

Each Quant lesson keeps one bounded original-submission snapshot locally, including
the question, submitted fields and coding output/errors when applicable. It stays
visible for comparison through correction and guided practice, is included in
local backups, and is not added to learner evidence or mentor prompts. Run executes
editor code without assessment or a graded record; Submit runs assessment tests.

The optional Anthropic mentor is disabled until explicit consent. When enabled
with a configured key, legacy generated challenges and help requests send exercise
prompts, code or command attempts, help conversation
to `https://api.anthropic.com/v1/messages`. The key authenticates the request; the
service also receives the connection's network address. Site policies, browsing
URLs and time totals are not included in mentor prompts. Requests may incur usage
charges. Anthropic handles submitted data under its own
[privacy policy](https://www.anthropic.com/legal/privacy).

A separate, default-off history choice adds recorded errors, objective completion,
attempt counts, performance summaries and cross-discipline progress. AI generation
and help work without this technical/interaction sharing, using the current
exercise, code/commands and chat. No crash reports or device metadata are sent.

Settings offers consent review and an off switch. Firefox 140+ additionally
requires personal data permissions for AI and a separate technical permission for history, checked before each request. Firefox 140.0+ is required;
older versions cannot load this release's manifest. Saving a key alone never grants consent. Declining leaves local
teaching, challenges and Python available. Clearing the key deletes the stored
credential; revoking consent cannot recall previously sent data.

For generated Python exercises, AI supplies descriptions, literal test data and
feedback. The executable starter and its function signature are supplied from a
fixed local catalog; remote executable starter/signature/default fields are
rejected. Cached legacy AI objects cannot authorize execution. Learner-written
editor contents run only when the learner presses Run or Submit. AI code-review samples and
tutor examples are displayed rather than automatically run.

Backups are user-initiated local JSON downloads. API-key settings, consent and
rollback snapshots are excluded; the currently configured key and recognizable
Anthropic keys in text are redacted. Drafts, summaries, domains and timestamps can
still contain personal information or other secrets typed by the user. Inspect
the file and keep it private. Exports are not uploaded by the extension.

Restore validates inert JSON before any write. If current data has an unsupported
format, the preview requires an explicit recovery choice and preserves only
recognized fields in a downloadable recovery copy; unknown/nested fields are
excluded, and that copy cannot be restored automatically. A reviewed migration is
needed. Normal restore preserves the current local key,
turns AI off, and saves one local rollback snapshot excluding the API-key setting and redacting known keys. Full restore
clears temporary unlocks and preserves the larger current or backed-up consumed
time for today's domains. Historical time totals are replaced. Quant-only legacy
imports replace only quant evidence and lessons, with AI still turned off. Import
does not grant permission to execute scripts, change endpoints, or enable AI.

Uninstalling the extension or deleting a profile may erase local data and the local
rollback copy. Keep an external backup before any installation transition. The
same add-on ID alone does not guarantee a safe temporary-to-signed transition.
