"""Reproduce unsigned runtime/source ZIPs from clean Git or extracted reviewer source."""
import fnmatch
import hashlib
import json
import re
import subprocess
import zipfile
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 200 * 1024 * 1024
STAMP = (1980, 1, 1, 0, 0, 0)
ID = 'challenge-gate@extension'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def encoded(value):
    return (json.dumps(value, indent=2, sort_keys=True) + '\n').encode()

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

if (ROOT / '.git').exists():
    if git('status', '--porcelain'):
        raise SystemExit('Commit or resolve source changes before packaging.')
    commit = git('rev-parse', 'HEAD')
    tracked = git('ls-files').splitlines()
    if 'SOURCE_BUILD.json' in tracked:
        raise SystemExit('SOURCE_BUILD.json is reserved for generated reviewer metadata.')
else:
    # A source ZIP contains no .git and needs neither Git nor network downloads.
    info = json.loads((ROOT / 'SOURCE_BUILD.json').read_text())
    if info['version'] != 1 or not re.fullmatch(r'[0-9a-f]{40}', info['commit']):
        raise SystemExit('Invalid reviewer source manifest.')
    commit, tracked = info['commit'], sorted(info['files'])
    for name, seal in info['files'].items():
        asset = (ROOT / name).resolve()
        if not asset.is_relative_to(ROOT) or not asset.is_file():
            raise SystemExit('Invalid source manifest path: ' + name)
        data = asset.read_bytes()
        if len(data) != seal['bytes'] or digest(data) != seal['sha256']:
            raise SystemExit('Reviewer source differs from sealed input: ' + name)

for name in tracked:
    if not (ROOT / name).resolve().is_relative_to(ROOT):
        raise SystemExit('Source path escapes package root: ' + name)

runtime = ('background/', 'dashboard/', 'gate/', 'icons/', 'learning/', 'popup/', 'vendor/')
docs = {'manifest.json', 'LICENSE', 'README.md', 'ATTRIBUTION.md', 'LOCAL_INSTALL.md',
        'CURRICULUM.md', 'REVIEW_NOTES.md', 'PRIVACY.md', 'SIGNING.md'}
files = sorted(p for p in tracked if p.startswith(runtime) or p in docs)
manifest = json.loads((ROOT / 'manifest.json').read_text())

def asset(name, base=ROOT):
    path = (base / urlsplit(name).path).resolve()
    if not path.is_relative_to(ROOT) or path.relative_to(ROOT).as_posix() not in files:
        raise SystemExit('Missing packaged asset: ' + name)

for script in manifest['background']['scripts']:
    asset(script)
for pattern in manifest.get('web_accessible_resources', []):
    if not any(fnmatch.fnmatchcase(p, pattern) for p in files):
        raise SystemExit('Missing packaged accessible resource: ' + pattern)
for name in manifest.get('icons', {}).values():
    asset(name)
for action in ('browser_action', 'page_action'):
    section = manifest.get(action, {})
    for name in section.get('default_icon', {}).values():
        asset(name)
    if section.get('default_popup'):
        asset(section['default_popup'])
if manifest.get('options_ui', {}).get('page'):
    asset(manifest['options_ui']['page'])
for html in [p for p in files if p.endswith('.html')]:
    for attribute, name in re.findall(r'(src|href)="([^"]+)"', (ROOT / html).read_text()):
        if not name or name.startswith('#'):
            continue
        if urlsplit(name).scheme:
            if attribute == 'src':
                raise SystemExit('External HTML executable/resource: ' + html + ' -> ' + name)
            continue  # Ordinary privacy/documentation links.
        asset(name, (ROOT / html).parent)
for script in [p for p in files if p.endswith('.js') and not p.startswith('vendor/')]:
    code = (ROOT / script).read_text()
    for name in re.findall(r'getURL\([\'\"]([^\'\"]+)[\'\"]\)', code):
        asset(name)
    for name in re.findall(r'new Worker\([\'\"]([^\'\"]+)[\'\"]\)', code):
        asset(name, (ROOT / script).parent)

provenance = json.loads((ROOT / 'vendor/PYODIDE_PROVENANCE.json').read_text())
for item in provenance['files']:
    if item['path'] not in tracked:
        raise SystemExit('Untracked dependency: ' + item['path'])
    data = (ROOT / item['path']).read_bytes()
    if len(data) != item['bytes'] or digest(data) != item['sha256']:
        raise SystemExit('Dependency digest/size mismatch: ' + item['path'])
expected_csp = {'script-src': ["'self'", "'unsafe-eval'", "'wasm-unsafe-eval'"],
                'object-src': ["'none'"], 'connect-src': ["'self'", 'https://api.anthropic.com']}
parts = [d.split() for d in manifest['content_security_policy'].split(';') if d.split()]
directives = {p[0]: p[1:] for p in parts}
if len(parts) != len(directives) or directives != expected_csp:
    raise SystemExit('Unexpected CSP directives or origins.')
for name in ('pyodide.js', 'pyodide.asm.js', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'):
    asset('vendor/pyodide/' + name)
if manifest['browser_specific_settings']['gecko']['id'] != ID:
    raise SystemExit('Add-on ID changed.')
if 'data_collection_permissions' not in manifest['browser_specific_settings']['gecko']:
    raise SystemExit('Missing data declaration.')

source_files = sorted(p for p in tracked if not p.startswith(('verification/', '.agents/', '.codex/', '.claude/')) and not p.endswith('.log'))
source_entries = {p: (ROOT / p).read_bytes() for p in source_files}
source_entries['SOURCE_BUILD.json'] = encoded({'version': 1, 'commit': commit,
    'files': {p: {'bytes': len(data), 'sha256': digest(data)} for p, data in source_entries.items()}})
entries = {p: (ROOT / p).read_bytes() for p in files}
entries['BUILD.json'] = encoded({'commit': commit, 'unsigned': True,
    'purpose': 'Unsigned candidate for AMO self-distribution review', 'runtimeFiles': len(files)})
output = ROOT / 'dist'
output.mkdir(exist_ok=True)
archive = output / ('challenge-gate-' + commit[:7] + '.zip')
source = output / ('challenge-gate-source-' + commit[:7] + '.zip')

def write_checked(path, contents, runtime_archive=False):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(contents.items()):
            info = zipfile.ZipInfo(name, STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info._compresslevel = 9
            info.external_attr = 0o100644 << 16
            z.writestr(info, data)
    if path.stat().st_size > LIMIT:
        raise SystemExit('Archive exceeds 200 MiB guard: ' + path.name)
    with zipfile.ZipFile(path) as z:
        if z.testzip() is not None:
            raise SystemExit('Corrupt archive: ' + path.name)
        if runtime_archive and any(p.startswith(('sources/', 'tests/', 'verification/', '.git/', '.claude/')) for p in z.namelist()):
            raise SystemExit('Unexpected runtime archive contents.')

runtime_temp, source_temp = archive.with_suffix('.zip.part'), source.with_suffix('.zip.part')
try:
    write_checked(runtime_temp, entries, True)
    write_checked(source_temp, source_entries)
    runtime_temp.replace(archive)
    source_temp.replace(source)
finally:
    runtime_temp.unlink(missing_ok=True)
    source_temp.unlink(missing_ok=True)
# Checksums and success output only follow successful validation of both archives.
for path in (archive, source):
    path.with_suffix('.sha256').write_text(digest(path.read_bytes()) + '  ' + path.name + '\n')
print(json.dumps({'commit': commit, 'archive': str(archive), 'sha256': digest(archive.read_bytes()),
    'entries': len(entries), 'bytes': archive.stat().st_size, 'sourceArchive': str(source),
    'sourceSha256': digest(source.read_bytes()), 'sourceBytes': source.stat().st_size,
    'runtimeUncompressedBytes': sum(map(len, entries.values()))}, indent=2))
