# Signing and installation gates

This branch prepares an **unsigned candidate**, not an approved or signed add-on.
It retains `challenge-gate@extension` and MV2 persistent background, and requires
Firefox 140.0+. Independent cloud testing found that Firefox 102 rejects the data
permission declaration before loading. Official Firefox 140 accepted the preceding
candidate's same declaration and passed native consent checks. Raising the minimum
was explicitly approved. Retained fallback consent code is defensive; it does not
provide support for older browsers. The revised exact candidate still needs its
bounded independent cloud recheck. No browser testing is authorized on the user's Mac.

## Local preparation

From a clean reviewed commit:

```sh
node --test tests/*.test.js
python3 tests/zen-release-smoke.py
python3 scripts/package-local.py
```

Reviewer rebuild requires Python 3.9+ (tested with Python 3.12.7 on macOS),
with no third-party Python packages or network downloads. Extract the source ZIP
and run `python3 scripts/package-local.py` from its root. Its sealed
`SOURCE_BUILD.json` supplies the original commit and file inventory without Git;
modified/missing source fails validation. Compare the output runtime ZIP SHA-256
to the submitted ZIP. ZIP compression byte identity is verified in the tested
local environment; reviewers on other zlib versions can also compare every
uncompressed entry and BUILD.json. Extension JS itself has no transpilation step.

The packager checks vendored digests, referenced assets, executable origins,
archive contents/size and deterministic timestamps. It writes runtime and reviewer
source ZIPs plus checksums under ignored `dist/`. Both contain only tracked source
and licenses, never browser data, credentials, test profiles or local logs.

## Exact AMO self-distribution steps (requires separate user approval)

1. Review the final commit, verification report, privacy notice, runtime ZIP and
   reviewer source ZIP. This branch already includes the separately reviewed
   curriculum; recheck the exact candidate after the approved signing changes.
2. In the [AMO Developer Hub](https://addons.mozilla.org/developers/), sign in with
   the user's chosen existing Mozilla account. Creating credentials or accepting
   the Firefox Add-on Distribution Agreement requires the user's own approval.
3. Choose **Submit a New Add-on** (or the existing same-ID add-on's **Upload New
   Version**, if one already exists). For distribution choose **On your own**,
   rather than a public AMO listing. Upload the exact runtime ZIP and retain the
   local SHA-256. Keep the stable ID and increase the version if AMO already has
   1.1.0; do not reuse a published version number.
4. Review automated validation results. Provide the source ZIP when requested
   because the bundled runtime contains minified JS and WASM. Explain that the
   library is the unchanged released Pyodide 0.25.1, point to provenance/build
   instructions, and describe deliberate user-triggered Python evaluation in the worker. Legacy
   AI exercise descriptions, literal test data, explanations and feedback remain.
   Executable starters, names and signatures come from a fixed packaged catalog;
   returned executable metadata/default expressions are rejected, not interpolated.
   Serialized legacy AI objects have no trusted executable identity and cannot run.
   The learner writes editor code and deliberately presses Run; displayed AI review
   samples/examples are not automatically executed. Generated test arguments use
   ast.literal_eval, never eval. This removes the former remote-starter route but
   does not claim Mozilla policy approval or an impermeable Python sandbox. Provide the
   privacy notice and reviewer notes about default-off Anthropic consent, separate optional history sharing, and the
   Firefox 140 minimum. Do not claim `none` for all optional transmission: the
   manifest declares optional authentication, communications and interaction data.
5. Resolve all review/validation issues before requesting signing. Submission,
   agreement acceptance and any resulting publication/signing are not performed
   by this task. Mozilla's decision is separate from local validation.
6. Once approved, use **Manage Status & Versions**, open the approved version and
   download its signed XPI. Record its SHA-256 and retain the exact source/build
   artifacts. Never treat the unsigned ZIP as a permanent-install artifact.

## Before any everyday-profile installation (separate approval)

First test the exact signed XPI in a fresh disposable profile: seed realistic
fake progress, export, install/update from temporary to signed with the same ID,
verify data and backup recovery, quit/reopen, and verify persistence again. A
same-ID temporary reload has been tested; a signed transition has **not**.

Only after that test and separate user approval should the everyday profile be
changed. Export a full backup from the current add-on first, inspect that it has
no credentials, retain a private offline copy, and verify restore in a disposable
profile. If the current temporary add-on is absent, do not reinstall, remove it or
read its storage without authorization to recover it. Re-enter a key and opt in
only after verifying the signed installation and privacy choice.

Primary guidance:
[self-contained add-on policy](https://extensionworkshop.com/documentation/publish/add-on-policies/),
[data consent and compatibility](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/),
[submission workflow](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/),
[Gecko settings and signature caveat](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings).
