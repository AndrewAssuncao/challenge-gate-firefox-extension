# Signing and recovery implementation plan

Base: clean main `a4bc4f5d701ec5a22d54aac899d6b5af31ee0472`.
Preserve the approved standalone `signing-backup-offline-runtime` clone. The
curriculum task owns lesson content and teaching UI. The later authorized local
integration combines the exact approved curriculum in its own isolated checkout.
Publication hygiene creates a separate clean-history branch for the authorized
push and draft PR. Private review/browser metadata stays local. No normal-profile
changes, credential inspection/creation, AMO upload, agreement acceptance or
main/remote merge is authorized.

1. Pin the existing Pyodide 0.25.1 runtime locally (JS, WASM, standard library and
   lock metadata), retain upstream licenses and source provenance, check digests,
   restrict worker network requests to packaged resources, and remove CDN CSP.
2. Declare optional authentication, personal communication and interaction data
   for Anthropic. Require explicit local consent plus Firefox optional data
   permissions when supported. Show install/update consent in a focused extension
   page and recheck consent before every request. The approved follow-up requires
   Firefox140 after cloud verification; Firefox102 rejects the declaration.
3. Add a versioned full backup with explicit settings allowlist and no credentials
   or transmission consent. Include quant learner, legacy profiles/progression,
   typing history, daily counts, time totals, site policies and unlocks. Validate
   shape, bounds, versions and dangerous keys before writing. Preview replacements,
   serialize writes, persist a secret-free rollback snapshot first, then commit in
   one storage write. Keep the current key and disable AI after import. Migrate old
   quant-only exports without replacing unrelated data. Make rollback available.
4. Test schema rejection, migration, write failure, serialization, consent and
   offline Python with unit/Python tests and authentic installed Zen using owned
   disposable profiles, fake keys and local test destinations. Exercise data loss,
   recovery, reload, idle and a full controlled test-browser restart. Never label
   the earlier sleep disappearance as a restart or infer its cause.
5. Obtain a separate Claude CLI review using only repository source and fake
   fixtures. Fix material findings. Commit locally, produce deterministic unsigned
   runtime/source ZIPs, document exact self-distribution signing steps and the
   separate approvals needed for AMO and any eventual normal-profile installation.
6. Collect only currently accessible target add-on/PID/path metadata; prepare a
   read-only future snapshot procedure. Do not add lifecycle permissions, alter
   security/debug settings or enable normal-profile automation without approval.
7. Approved signing follow-up: replace remote Python starter/signature/default
   routes with packaged local stubs, reject serialized legacy AI execution, retain
   generated descriptions/feedback and learner-written Run, add adversarial tests,
   and freeze the exact candidate for independent cloud review before any PR update.
   No further browser launches on the user's Mac.

Acceptance requires passing core suite and isolated release smoke, secret-free
backup/rollback, no remote executable fetch, checked package contents and clean
local commit. Actual AMO acceptance and temporary-to-signed migration remain
unverified until signing and a separate disposable-profile transition test.
