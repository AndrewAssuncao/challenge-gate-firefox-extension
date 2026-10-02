# Narrow read-only disappearance diagnosis

For a future temporary add-on disappearance, preserve before/after target status and
process metadata before drawing a conclusion. Distinguish a missing toolbar control,
a missing live add-on entry and a gate that stopped blocking. A sleep-time report
alone cannot establish a browser restart or cause. There is no uninstall/reload code
in this extension. Disk metadata alone cannot establish live temporary installation,
background health or lifecycle cause.

Take private snapshots manually using this repository's script:

```sh
python3 scripts/addon-status.py --processes > /tmp/challenge-gate-status.json
```

The script reads profile paths, target add-on status/path allowlist, metadata mtime
and Zen PID/start/executable metadata. It does not enable anything, read extension
storage/history, collect URLs, attach a debugger or enumerate other add-on records
in its output. Disk records can lag or omit temporary installations; absence is
not proof of removal. If process metadata is unavailable, retain that limitation
rather than changing security settings. Keep snapshots private with distinct times;
do not commit or attach them to a public PR.

Using existing visible `about:debugging` or `about:addons`, record only the target
ID, version, temporary/permanent status and source path. Preserve a timestamp and
PID privately before drawing a conclusion. This public document contains a
procedure only; local observations and machine/profile records are omitted.

Stop for approval before enabling normal-profile Marionette/remote debugging,
adding management/lifecycle permissions, installing an observer add-on, recording
console content or attaching process tracing. A lifecycle observer needs an
approved bounded design that records target ID/event/time/PID only. None is installed
or requested in this build. Controlled disposable restart and idle checks do not
reproduce physical system sleep/wake or establish a prior disappearance cause.
