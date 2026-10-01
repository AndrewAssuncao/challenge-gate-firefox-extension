# Tutor API model repair

Verified against Anthropic's official documentation on October 1, 2026.

Quant Help, Git Help and other calls without an explicit model used
`claude-sonnet-4-20250514`. Advanced legacy sessions explicitly used
`claude-opus-4-20250514`. Both were retired on June 15, 2026, and requests to
retired models fail. This is a confirmed code defect consistent with the user's
404. The individual authenticated response was not inspected or reproduced.

The replacements are `claude-sonnet-4-6` and `claude-opus-4-8`, the documented
migration targets for these retired models. Both remain available in the native
Claude API. These preserve the Sonnet default and existing explicit Opus callers.

Base prices per million input/output tokens are $3/$15 for Sonnet 4.6, matching
Sonnet 4, and $5/$25 for Opus 4.8 versus $15/$75 for Opus 4. Opus 4.8 uses a newer
tokenizer, so token counts and total costs can differ by workload. Existing output
caps are unchanged; this repair adds no retries, thinking configuration, fast mode,
tools or provider integration.

The existing POST `https://api.anthropic.com/v1/messages`, `anthropic-version:
2023-06-01`, API-key header and user-message shape remain valid. Successful
responses now extract text blocks even when a thinking block precedes them.
HTTP, timeout, connection and malformed-response failures use fixed messages.
Raw API response bodies and exception messages are neither displayed nor logged.
The request timer is cleared on all completion paths.

Validation: `node --test tests/*.test.js` passes 81 tests, including 105 executable
Python oracle checks. New mocked tests cover the request contract, explicit Opus,
11 HTTP statuses, timeout, network failure, malformed/empty response, text blocks
and unchanged stored progress after failures. Quant UI tests preserve the local
lesson after a mocked 404. No real credential was read, changed or transmitted;
live authenticated behavior remains untested.

Learning engine, curriculum, storage schema, manifest permissions, styles and
lesson controls are unchanged. This repair does not diagnose the separate
reported add-on disappearance.

Official sources:

- [Model retirements and replacements](https://platform.claude.com/docs/en/about-claude/model-deprecations)
- [Sonnet 4.6 availability and API ID](https://platform.claude.com/docs/en/models/sonnet-4-6/overview)
- [Opus 4.8 availability and API ID](https://platform.claude.com/docs/en/models/opus-4-8/overview)
- [Messages request contract](https://platform.claude.com/docs/en/api/messages/create)
- [Error codes](https://platform.claude.com/docs/en/api/errors)
- [Pricing and tokenizer notes](https://platform.claude.com/docs/en/about-claude/pricing)
