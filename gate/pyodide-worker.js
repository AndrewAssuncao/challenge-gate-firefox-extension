/* Pyodide Web Worker — Runs Python code in WebAssembly sandbox */

'use strict';

let pyodide = null;

async function loadPyodideRuntime() {
  importScripts('https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js');
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/'
  });
  self.postMessage({ type: 'ready' });
}

loadPyodideRuntime().catch(err => {
  self.postMessage({ type: 'error', error: 'Failed to load Python runtime: ' + err.message });
});

self.onmessage = async (e) => {
  if (e.data.type !== 'run') return;
  if (!pyodide) {
    self.postMessage({ type: 'result', error: 'Python runtime not loaded yet.' });
    return;
  }

  const { code, testCases, functionName } = e.data;
  const results = [];

  try {
    // Reset namespace for each run
    pyodide.runPython(`
import sys
import io
`);

    // Load user code into the namespace
    try {
      pyodide.runPython(code);
    } catch (err) {
      self.postMessage({
        type: 'result',
        error: cleanError(err.message)
      });
      return;
    }

    // Run each test case
    for (const tc of testCases) {
      try {
        // Capture stdout
        const testCode = `
__stdout_capture = io.StringIO()
__old_stdout = sys.stdout
sys.stdout = __stdout_capture
try:
    __result = ${functionName}(${tc.input})
except Exception as __e:
    __result = f"ERROR: {__e}"
finally:
    sys.stdout = __old_stdout
__printed = __stdout_capture.getvalue().strip()
str(__result)
`;
        const result = pyodide.runPython(testCode);
        const printed = pyodide.runPython('__printed');

        // Compare: use return value primarily, fallback to stdout
        const actual = result !== 'None' ? result : printed;
        const expected = String(tc.expected);
        const passed = normalizeOutput(actual) === normalizeOutput(expected);

        results.push({
          passed,
          actual: actual,
          expected: tc.expected,
          input: tc.input
        });
      } catch (err) {
        results.push({
          passed: false,
          actual: null,
          expected: tc.expected,
          input: tc.input,
          error: cleanError(err.message)
        });
      }
    }

    self.postMessage({ type: 'result', results });
  } catch (err) {
    self.postMessage({
      type: 'result',
      error: cleanError(err.message)
    });
  }
};

function normalizeOutput(str) {
  if (str === null || str === undefined) return '';
  return String(str).trim().replace(/\s+/g, ' ');
}

function cleanError(msg) {
  // Remove Pyodide internals, keep the Python traceback
  const lines = msg.split('\n');
  const pythonLines = lines.filter(l =>
    !l.includes('pyodide') && !l.includes('wasm')
  );
  return pythonLines.length > 0 ? pythonLines.join('\n') : msg;
}
