# Teaching workflow attribution

The personal-use teaching adaptation was informed by Amos Blomqvist's
[Learn configuration](https://github.com/amosblomqvist/learn), inspected at commit
`7cfd8942f82ab9476e63572387e1fe9bcea5082c`.

Relevant sources:
- [Teaching skill](https://github.com/amosblomqvist/learn/blob/7cfd8942f82ab9476e63572387e1fe9bcea5082c/skills/teach/SKILL.md): diagnostic probing, prerequisite connections, motivated explanations, worked examples, and concept-by-concept checking.
- [Quiz extension](https://github.com/amosblomqvist/learn/blob/7cfd8942f82ab9476e63572387e1fe9bcea5082c/extensions/quiz.ts): a distinct “I don't know” response and structured grading feedback.
- [Markdown logger](https://github.com/amosblomqvist/learn/blob/7cfd8942f82ab9476e63572387e1fe9bcea5082c/extensions/md-log.ts): useful durable lesson records. Its transcript mirror does not itself implement learner-state retrieval.

This implementation uses original JavaScript, original quant content and original
prompt wording. It adapts teaching practices into an explicit persisted state
machine instead of importing Pi, its terminal UI, or its agent runtime. The
README invites personal copying/adaptation; no separate license file was found
in the inspected Learn tree. This attribution does not assert that Learn's
configuration is MIT licensed or grant publication rights to copied material.
The existing Challenge Gate MIT license remains unchanged.
