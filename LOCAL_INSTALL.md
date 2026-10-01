# Run the local build

Use a new disposable Firefox or Zen profile so the same-ID development extension does not replace the extension in your everyday profile. Keep the original checkout unchanged.
Firefox 140.0+ is required. Release browser verification currently runs on a
separate cloud host; do not launch local desktop browser tests during this task.

1. Extract the supplied ZIP, or use this checkout directly.
2. In the disposable browser profile, open `about:debugging`.
3. Choose **This Firefox** (Zen may retain this label), then **Load Temporary Add-on**.
4. Select `manifest.json` from the extracted folder/check-out.
5. Open Challenge Gate from the extensions toolbar, then open Dashboard.
6. Choose **Arcade → Trading & Options** to start the applied curriculum. Missing prerequisites are taught first; no mastery is granted for opening a unit.

The five browsing-gate choices remain Typing, Git, Quant Coding, Brainteasers and Quant Math. Existing Terminal-configured sites retain Terminal until explicitly changed. All trading data is simulated. Local teaching and deterministic grading require no AI account. Python execution uses the packaged Pyodide 0.25.1 runtime without network access.

Temporary add-ons stop being installed when the browser closes. Reload the same `manifest.json` with the same extension ID in the same disposable profile to resume. The Zen test confirms that learner evidence and site policy survive this reload; that is data persistence, not a permanent installation. This unsigned ZIP is a local test artifact, not a signed browser-store release.

Settings downloads and restores validated full backups without API keys or AI consent; old quant-only exports remain importable. Restore clears temporary unlocks and never lowers today’s consumed time. Avoid deleting the test profile if you want to preserve its data. Do not install into your everyday profile as part of these test steps.

## Verified automation

Core and applied checks, with Node.js and Python 3 already installed:

```sh
node --test tests/*.test.js
```

Authentic installed Zen smoke, with `/Applications/Zen 2.app` present:

```sh
python3 tests/zen-release-smoke.py
```

It creates a fresh temporary profile and loopback test site, loads the extension temporarily through Zen's built-in Marionette API, verifies interception, offline Python, secret-free backup/recovery, consent, and controlled restart. It does not access your everyday profile or require geckodriver/web-ext installation. The tested browser is Zen 1.22.3b (Gecko 156.0.1); standard Firefox is not installed on the test machine and is not claimed as tested.

Optional personalized explanations use the extension's existing provider only when requested. No API credentials are included in the build.
