# Challenge Gate — quant learning branch

A Firefox extension that blocks distracting sites until a short challenge is
completed. This branch keeps the existing blocker, Typing, Git, Python editor,
dashboard and optional Anthropic relay, and adds durable quant learning.
Requires Firefox 140.0 or newer, including a compatible current Zen build.

Visible modes: **Typing, Git, Quant Coding, Brainteasers, Quant Math**. Quant Math
has separate arithmetic and probability tracks. Existing Terminal-configured sites
retain their old challenge until you explicitly choose a replacement.

Quant lessons diagnose a skill, explain it with a worked example when needed,
provide guided practice, then ask an independent question. Progress is saved
locally across sessions. Hints and AI explanations count as assistance, not mastery.
The existing Arcade is the place to continue practice. See [CURRICULUM.md](CURRICULUM.md)
for the 25-skill core plus five applied Trading & Options units in Arcade.

## Try locally

1. Use a disposable Firefox profile for initial verification. See [LOCAL_INSTALL.md](LOCAL_INSTALL.md) for the tested Zen path and temporary-install limitations.
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**.
3. Select this checkout's `manifest.json`.
4. Open the popup → Dashboard to configure sites or use Arcade.

The stable extension ID is retained. Privacy controls now disable private browsing and declare optional AI data transmission. No backend or Pi installation
is required. Quant assessment and local teaching need no model API key. Python
execution uses the packaged Pyodide 0.25.1 runtime and works offline.

**Personalize explanation with AI** uses a configured Anthropic key after explicit data consent
when clicked. Saving a key alone does not enable transmission. The current exercise is supplied as context; a separate default-off choice controls learning-history sharing. The model does not select mastery or change assessment answer keys.
Git's existing AI behavior is retained. No API key is shipped in the repository.
Legacy Python AI exercises keep generated descriptions, explanations and feedback;
their starter functions come from a packaged local catalog. The learner writes the
solution and presses Run. Remote starter code, function signatures and defaults
are rejected; old serialized AI challenges must be reloaded before running.

The Learning tab displays independent evidence and review dates. Settings exports a full
backup excluding API-key settings and redacting known keys, previews and validates restore, and offers local rollback.
Old quant-only JSON exports can be imported without replacing site policies or legacy progress.
See [PRIVACY.md](PRIVACY.md), [SIGNING.md](SIGNING.md) and [DIAGNOSIS.md](DIAGNOSIS.md).

## Development

```sh
node --test tests/*.test.js
```

Tests require Node.js and Python 3; no package installation or network is needed
for the core suite. The authentic extension smoke uses installed Zen and Python 3 (`python3 tests/zen-release-smoke.py`); it creates a disposable profile. A complementary browser harness uses installed Playwright and Chromium. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for test commands,
verification limits, architecture and remaining manual Firefox checks.

[ATTRIBUTION.md](ATTRIBUTION.md) records teaching-workflow inspiration from
Amos Blomqvist's Learn configuration. Existing project license: MIT.
