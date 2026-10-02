# Curriculum integration contract

This curriculum branch changes learning/curriculum.js, learning/engine.js, the quant gate and skill-graph labels. It does not change the learner schema/store, backup, consent, manifest, Pyodide, dashboard Settings or packaging. Integration with the release branch needs an explicit shared-file review; isolated passing suites do not establish merge compatibility.

## Imported item identity

`QuantCurriculum.validateItemIdentity(event)` returns a boolean and has no side effects. Call it **after inert field/type/size validation** for imported attempts. Reject a new decision-bank attempt if it returns false; an enum check alone cannot establish method coverage.

For `data-weighted`, `data-base`, `brain-order` and `prob-method` it requires:

- `kind === 'attempt'`, a known skill, and `variant === 'skillId:v:level'` with v in 0..8 and level in 0..1.
- Reconstruct `question(skillId, v, false, level)` and compare canonical `semanticKey`, exact `familyId`, exact `isTransfer`, and `methodTag` (null/absent normalize to null).
- `canonicalKey()` recognizes the 72 historical prose keys used by both local candidates 999d0b7 and c57b081. Both sets are tested explicitly; they share those keys. Keep raw history unchanged. An alias and its stable authored key represent the same item and cannot create novel credit.

The engine also requires this check for qualifying independent/reassessment evidence. Consequently, changing a supported `independent` tag to `insufficient` cannot supply missing coverage. Repair family routing uses only validated identity metadata.

For the original 26 skills the helper only rejects a nonnull method tag. **It is not a complete legacy identity validator**; retain existing backup validation for those records. It does not authenticate history or prove that an editable JSON record was earned by the learner. Existing structural, version, correctness/assistance, first-try/retest, duplicate and invalidation checks remain necessary.

## Optional saved fields and vocabulary

- Attempt `methodTag`: nullable. The complete nonnull vocabulary is `C.get(skillId).requiredMethods`: brain-order = must/could/impossible; prob-method = independent/conditional/insufficient. Other skills emit null. Supported values still must agree with reconstructed item identity.
- Lesson `constructionDraft`: optional string, maximum 100 characters.
- Lesson `reasonDraft`: optional string, maximum 80 characters. This is an input draft, not evidence.
- `draft` and `retestAt` are existing fields. No additional saved fields were introduced for cross-key repair.

Cross-key repair derives family and level from the last actual failed/assisted attempt. Invalidation reopens a completed affected lesson using the invalidated item's family. Guided practice and the next independent check retain that family; they clear drafts on a new question. No history migration is required.

## Content compatibility and shared consent patch

The final probability response protocol applies to every item: supply a largest attainable requested value when undetermined, and a smallest attainable intermediate when several values fit. Foundation bounds intermediates now ask for P(B | A), instead of joint overlap. The scenario, requested final probability and required method are unchanged. These are the same exposed problems, so their authored identities deliberately remain unchanged; earlier correct overlap/method evidence remains useful and cannot become new novelty. The 72-item snapshot guards numerical scenarios, answers, intermediates, table rows/headers and method keys; future mathematical changes require explicit compatibility review.

The release task owns the consent integration: `QuantLearning.prompt(state, lesson, includeEvidence=true)` and the quant tutor's `getAiConsent().technicalAllowed` handling. This curriculum branch retains the existing prompt signature; integrate that narrow release patch into learning/engine.js and gate/quant.js and run both suites. Do not overwrite the curriculum evidence, draft queue, repair or table changes when resolving shared files.
