"""Create a reproducible unsigned local extension ZIP from a clean commit."""
import hashlib,json,subprocess,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
if git('status','--porcelain'):raise SystemExit('Commit or resolve source changes before packaging.')
commit=git('rev-parse','HEAD')
tracked=git('ls-files').splitlines()
runtime=('background/','dashboard/','gate/','icons/','learning/','popup/')
docs={'manifest.json','LICENSE','README.md','ATTRIBUTION.md','LOCAL_INSTALL.md','CURRICULUM.md','REVIEW_NOTES.md'}
files=[p for p in tracked if p.startswith(runtime) or p in docs]
manifest=json.loads((ROOT/'manifest.json').read_text())
for script in manifest['background']['scripts']:
 if script not in files:raise SystemExit('Missing background script: '+script)
for resource in manifest.get('web_accessible_resources',[]):
 if not list(ROOT.glob(resource)):raise SystemExit('Missing runtime resource: '+resource)
for html in [p for p in files if p.endswith('.html')]:
 import re
 for relative in re.findall(r'(?:src|href)="([^"#?]+)"',(ROOT/html).read_text()):
  if '://' in relative or relative.startswith('data:'):continue
  resolved=(ROOT/html).parent/relative
  if not resolved.exists():raise SystemExit('Missing HTML asset: '+html+' -> '+relative)
output=ROOT/'dist';output.mkdir(exist_ok=True)
archive=output/('challenge-gate-'+commit[:7]+'.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 entries={p:(ROOT/p).read_bytes() for p in files}
 entries['BUILD.json']=(json.dumps({'commit':commit,'unsigned':True,'purpose':'Temporary local add-on loading','runtimeFiles':len(files)},indent=2)+'\n').encode()
 for name,data in sorted(entries.items()):
  info=zipfile.ZipInfo(name,(1980,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;z.writestr(info,data)
digest=hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.sha256').write_text(digest+'  '+archive.name+'\n')
print(json.dumps({'archive':str(archive),'commit':commit,'sha256':digest,'entries':len(entries),'bytes':archive.stat().st_size},indent=2))
