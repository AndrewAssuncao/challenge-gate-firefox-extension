# Local attribution/provenance audit

Scope: isolated challenge-gate branch through 0a75fd4; compared tracked changes against original extension baseline 78641a4d66bda1c6673925037619afab774a43c8. No code was sent externally for this audit itself. A separately authorized Claude review receives only a prepared extension source/test/curriculum bundle.

## Finding

No imported Amos Learn source files, copied prompt files, TypeScript extensions, Pi runtime/dependency, vendored Learn configuration or copied lesson content was found in the tracked changes. The new learning engine/store, quant controller, quant question content and tutor prompt were authored locally for this extension. Existing Python/typing/Git/Terminal/browser functionality derives from the user's original MIT-licensed extension.

The recorded influence is at the teaching-practice level: diagnostic questions, prerequisite connections, motivated explanation, worked examples, concept checking, and a distinct “I don't know” response. Persistent structured skill evidence and deterministic progression are this project's implementation, not copied Learn memory code. Learn's logger was inspected as transcript recording, not imported as a mastery database.

ATTRIBUTION.md already names Amos Blomqvist, pins the inspected Learn revision, and links the three relevant sources. It explicitly does not assert that Learn is MIT licensed or that personal copying permission grants redistribution rights. There is no identified copied Amos material here for which the proposed publication would rely on personal-only copying permission.

## Evidence and limitation

Reviewed the changed-file inventory, dependency/manifest changes, the original new-file commit and subsequent fixes, attribution statements, and repository-wide references to Learn/Pi/Amos. Only documentation references to Learn were found. No cached copy of the original Learn source was available in this workspace for an automated verbatim comparison. Therefore this is a provenance and tracked-content audit, not a certification of exhaustive textual dissimilarity or a legal license opinion. Any newly copied upstream code or prompts must be identified and assessed separately before publication.

Original checkout /Users/andre/dev/FirefexExtension remained clean when checked. No publication was performed by this audit.
