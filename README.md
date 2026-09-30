# Challenge Gate — quant learning branch

A Firefox extension that blocks distracting sites until a short challenge is
completed. This branch keeps the existing blocker, Typing, Git, Python editor,
dashboard and optional Anthropic relay, and adds durable quant learning.

Visible modes: **Typing, Git, Quant Coding, Brainteasers, Quant Math**. Quant Math
has separate arithmetic and probability tracks. Existing Terminal-configured sites
retain their old challenge until you explicitly choose a replacement.

Quant lessons diagnose a skill, explain it with a worked example when needed,
provide guided practice, then ask an independent question. Progress is saved
locally across sessions. Hints and AI explanations count as assistance, not mastery.
The existing Arcade is the place to continue practice. See [CURRICULUM.md](CURRICULUM.md)
for the 21-skill core plus five applied Trading & Options units in Arcade.

## Try locally

1. Use a disposable Firefox profile for initial verification. See [LOCAL_INSTALL.md](LOCAL_INSTALL.md) for the tested Zen path and temporary-install limitations.
2. Open `about:debugging` → **This Firefox** → **Load Temporary Add-on**.
3. Select this checkout's `manifest.json`.
4. Open the popup → Dashboard to configure sites or use Arcade.

The extension's ID and permissions are unchanged. No backend or Pi installation
is required. Quant assessment and local teaching need no model API key. Python
execution still loads the existing Pyodide runtime from jsDelivr.

**Personalize explanation with AI** uses the existing configured Anthropic key
only when clicked. Learning evidence and the selected lesson are supplied as
context. The model does not select mastery or change assessment answer keys.
Git's existing AI behavior is retained. No API key is shipped in the repository.

The Learning tab displays independent evidence and review dates and can export
quant learner JSON. Import/restore UI is not implemented.

## Development

```sh
node --test tests/*.test.js
```

Tests require Node.js and Python 3; no package installation or network is needed
for the core suite. The authentic extension smoke uses installed Zen and Python 3 (`python3 tests/zen-smoke.py`); it creates a disposable profile. A complementary browser harness uses installed Playwright and Chromium. See [IMPLEMENTATION.md](IMPLEMENTATION.md) for test commands,
verification limits, architecture and remaining manual Firefox checks.

[ATTRIBUTION.md](ATTRIBUTION.md) records teaching-workflow inspiration from
Amos Blomqvist's Learn configuration. Existing project license: MIT.
