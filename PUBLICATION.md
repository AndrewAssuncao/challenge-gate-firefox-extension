# Publication hygiene

The implementation reviewed locally at `a79b18006311e3dfe2af48f55fb631c07e45a2a9`
remains preserved in a private local checkout. This public branch starts from
verified remote main `a4bc4f5d701ec5a22d54aac899d6b5af31ee0472` and carries
byte-identical runtime, learning, scripts, test, vendor and pinned-source content.
Only repository hygiene/public documentation and omitted private artifacts differ.

Private verification logs/raw review reports are absent from every newly reachable
commit. Machine home/temp paths, actual browser PID/start observations and local
profile records are removed from public documentation. Screenshots, private audit
snapshots, credentials and machine data are not attached or included in packages.
Generic diagnosis instructions remain, with observations stored privately.

The two original historical curriculum checkpoints `999d0b7` and `c57b081` are
retained for unchanged Git-identity regression tests. Their trees contain no private
verification material or machine records. Later private review/release commits
are not ancestors of this publication branch. Adding a cleanup commit to the
private branch would have retained old private blobs; this clean history avoids it.

The publication hash differs because of this documentation/artifact hygiene.
Product behavior and all test code remain the independently reviewed source.
Full tests are rerun in the clean publication checkout; archive content, provenance,
sealed-source reproduction and every new reachable tree are rechecked. Local
publication equivalence/privacy signoff does not certify AMO policy or signatures.

See VERIFICATION.md and SIGNING.md for test scope and the unresolved generated-
Python policy, authentic native permission acceptance, Firefox 102, physical sleep
and signed-transition gates. Publication is a draft PR only; no main merge,
normal-profile installation or AMO upload/signing is included.
