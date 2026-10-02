# Bundled interpreter and reviewer source material

The unmodified released Pyodide 0.25.1 core is pinned in `pyodide/`:
`pyodide.js`, `pyodide.asm.js`, `pyodide.asm.wasm`, `python_stdlib.zip` and
`pyodide-lock.json`. Python is 3.11.3, compiled with Emscripten 3.1.46. The worker
uses the extension-local index URL, rejects remote fetch/import transports, and
does not install optional packages. No wheels (numpy, pandas, micropip, etc.) are
required by the current exercises. The standard library supplies math, statistics,
random, json, ast, inspect and io.

`PYODIDE_PROVENANCE.json` records original download URLs, byte counts and SHA-256
digests. Licenses for Pyodide, CPython and the pinned libffi, hiwire and Emscripten
components (including upstream bundled library notices) accompany the runtime.
The matching source archives are in `sources/pyodide/`; they are included in the
reviewer source ZIP, rather than unnecessarily increasing the runtime ZIP.
CPython's archive digest is independently checked against Pyodide's
`Makefile.envs` pin. Other recorded digests seal the downloaded artifacts; they are
not upstream signature attestations.

Source archives include Pyodide's TypeScript/Python/C source, build definitions,
CPython patches and pinned compiler settings. The runtime is downloaded unchanged
from the official versioned distribution described in
[Pyodide deployment documentation](https://pyodide.org/en/0.25.1/usage/downloading-and-deploying.html).
There is no extension compilation/bundling step: package scripts copy reviewed
source files and these exact library assets into reproducible ZIPs. To rebuild
Pyodide itself, unpack the 0.25.1 source and follow its upstream build instructions
with the pinned Emscripten SDK; further toolchain dependencies require downloads.
This task verifies packaged asset integrity and execution, not a from-source
reproduction of the upstream WASM compiler output.

`unsafe-eval`/`wasm-unsafe-eval` remain for the packaged Emscripten runtime and the
user's local Python interpreter. The CSP has no remote script source. Imported
backups are never passed to Python or JavaScript evaluation.
