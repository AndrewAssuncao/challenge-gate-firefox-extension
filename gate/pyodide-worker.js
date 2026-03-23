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
  const diagnostics = {
    repairedTests: [],
    unrecoverableTests: [],
    unrecoverableChallengeIssue: false
  };

  try {
    // Reset namespace for each run
    pyodide.runPython(`
import sys
import io
import ast
import inspect
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

    pyodide.globals.set('__function_name', functionName);
    pyodide.runPython(`
def __split_top_level_args(src):
    text = '' if src is None else str(src)
    if not text.strip():
        return []

    parts = []
    current = []
    depth = 0
    quote = None
    escape_next = False

    for ch in text:
        if quote is not None:
            current.append(ch)
            if escape_next:
                escape_next = False
            elif ch == '\\\\':
                escape_next = True
            elif ch == quote:
                quote = None
            continue

        if ch in ('"', "'"):
            quote = ch
            current.append(ch)
            continue

        if ch in '([{':
            depth += 1
            current.append(ch)
            continue

        if ch in ')]}':
            depth = max(0, depth - 1)
            current.append(ch)
            continue

        if ch == ',' and depth == 0:
            token = ''.join(current).strip()
            if token:
                parts.append(token)
            current = []
            continue

        current.append(ch)

    token = ''.join(current).strip()
    if token:
        parts.append(token)

    return parts

def __looks_like_bare_string(token):
    value = '' if token is None else str(token).strip()
    if not value:
        return False
    if any(ch in value for ch in ('"', "'", '(', ')', '[', ']', '{', '}', ':')):
        return False
    if any(op in value for op in ('=', '<', '>', '+', '-', '*', '/', '%')):
        return False
    return any(ch.isalpha() for ch in value)

def __should_retry_with_repair(raw_input, exc):
    if isinstance(exc, SyntaxError):
        return True
    if isinstance(exc, NameError):
        message = str(exc)
        candidates = [
            token.strip()
            for token in __split_top_level_args(raw_input)
            if __looks_like_bare_string(token)
        ]
        return any(candidate and candidate in message for candidate in candidates)
    return False

def __coerce_token(token):
    value = '' if token is None else str(token).strip()
    if not value:
        raise SyntaxError('Empty argument')

    try:
        return ast.literal_eval(value), False
    except Exception:
        if value == 'True':
            return True, False
        if value == 'False':
            return False, False
        if value == 'None':
            return None, False
        if __looks_like_bare_string(value):
            return value, True
        raise

def __get_arg_bounds(fn):
    signature = inspect.signature(fn)
    positional = [
        param for param in signature.parameters.values()
        if param.kind in (inspect.Parameter.POSITIONAL_ONLY, inspect.Parameter.POSITIONAL_OR_KEYWORD)
    ]
    min_args = sum(1 for param in positional if param.default is inspect._empty)
    has_varargs = any(param.kind == inspect.Parameter.VAR_POSITIONAL for param in signature.parameters.values())
    max_args = None if has_varargs else len(positional)
    return min_args, max_args

def __repair_and_parse_test_args(fn, raw_input):
    expr = '' if raw_input is None else str(raw_input).strip()
    min_args, max_args = __get_arg_bounds(fn)
    tokens = __split_top_level_args(expr)
    if not tokens and not expr:
        tokens = []

    repaired = False
    args = []
    for token in tokens:
        value, token_repaired = __coerce_token(token)
        args.append(value)
        repaired = repaired or token_repaired

    if len(args) < min_args or (max_args is not None and len(args) > max_args):
        raise TypeError(f'Expected between {min_args} and {max_args if max_args is not None else "many"} arguments, got {len(args)}.')

    repair_reason = 'Quoted bare string arguments in malformed test input.' if repaired else None
    return args, repaired, repair_reason

def __normalize_call_input(args):
    if len(args) == 1:
        return repr(args[0])
    return ', '.join(repr(arg) for arg in args)

def __execute_call(callable_fn=None, call_expr=None, args=None):
    stdout_capture = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = stdout_capture
    try:
        if call_expr is not None:
            result = eval(call_expr, globals())
        else:
            result = callable_fn(*args)
        error = None
        raised_exc = None
    except Exception as exc:
        result = f'ERROR: {exc}'
        error = str(exc)
        raised_exc = exc
    finally:
        sys.stdout = old_stdout

    printed = stdout_capture.getvalue().strip()
    actual = printed if result is None and printed else result
    return actual, printed, error, raised_exc

def __run_single_test(fn_name, raw_input):
    fn = globals().get(fn_name)
    if fn is None:
        return {
            'challenge_issue': True,
            'error': f'Function "{fn_name}" is not defined.',
            'actual': None,
            'repaired': False,
            'repair_reason': None,
            'normalized_input': None
        }

    expr = '' if raw_input is None else str(raw_input).strip()
    call_expr = f'{fn_name}({expr})' if expr else f'{fn_name}()'
    actual, printed, error, raised_exc = __execute_call(call_expr=call_expr)

    if error is None:
        return {
            'challenge_issue': False,
            'error': None,
            'actual': '' if actual is None else str(actual),
            'repaired': False,
            'repair_reason': None,
            'normalized_input': expr
        }

    try:
        if raised_exc is None or not __should_retry_with_repair(expr, raised_exc):
            return {
                'challenge_issue': False,
                'error': None,
                'actual': '' if actual is None else str(actual),
                'repaired': False,
                'repair_reason': None,
                'normalized_input': expr
            }

        args, repaired, repair_reason = __repair_and_parse_test_args(fn, expr)
        repaired_actual, _, _, _ = __execute_call(callable_fn=fn, args=args)
        return {
            'challenge_issue': False,
            'error': None,
            'actual': '' if repaired_actual is None else str(repaired_actual),
            'repaired': repaired,
            'repair_reason': repair_reason,
            'normalized_input': __normalize_call_input(args)
        }
    except Exception as exc:
        return {
            'challenge_issue': True,
            'error': f'Test input could not be parsed safely: {exc}',
            'actual': None,
            'repaired': False,
            'repair_reason': None,
            'normalized_input': None
        }
`);

    // Run each test case
    for (const tc of testCases) {
      try {
        pyodide.globals.set('__raw_input', String(tc.input ?? ''));
        const payloadJson = pyodide.runPython(`
import json
json.dumps(__run_single_test(__function_name, __raw_input))
`);
        const payload = JSON.parse(payloadJson);

        if (payload.challenge_issue) {
          diagnostics.unrecoverableChallengeIssue = true;
          diagnostics.unrecoverableTests.push({
            input: tc.input,
            error: payload.error
          });

          results.push({
            passed: false,
            actual: null,
            expected: tc.expected,
            input: tc.input,
            error: cleanError(payload.error),
            challengeIssue: true
          });
          continue;
        }

        // Compare: use return value primarily, fallback to stdout
        const actual = payload.actual;
        const expected = String(tc.expected);
        const passed = normalizeOutput(actual) === normalizeOutput(expected);

        if (payload.repaired) {
          diagnostics.repairedTests.push({
            input: tc.input,
            normalizedInput: payload.normalized_input,
            reason: payload.repair_reason
          });
        }

        results.push({
          passed,
          actual: actual,
          expected: tc.expected,
          input: tc.input,
          repairApplied: Boolean(payload.repaired),
          normalizedInput: payload.normalized_input,
          repairReason: payload.repair_reason
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

    self.postMessage({ type: 'result', results, diagnostics });
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
