"""Isolated compatibility overlay; never merge or edit the curriculum checkout."""
import argparse, hashlib, json, shutil, subprocess
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('curriculum_root',type=Path)
parser.add_argument('--output-name',default='curriculum-integration',help='New directory name under ignored output/')
parser.add_argument('--require-commit',help='Require this exact clean curriculum commit')
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
other=args.curriculum_root.resolve()
def git(*a):return subprocess.check_output(['git','-C',str(other),*a],text=True).strip()
commit=git('rev-parse','HEAD');dirty=git('status','--porcelain')
if args.require_commit and (commit!=args.require_commit or dirty):raise SystemExit('Curriculum candidate differs or is dirty.')
if not args.output_name.replace('-','').isalnum():raise SystemExit('Invalid output name.')
out=ROOT/'output'/args.output_name
if out.exists():raise SystemExit('Choose a new integration directory before a fresh overlay.')
out.parent.mkdir(exist_ok=True)
subprocess.run(['git','clone','--no-hardlinks',str(other),str(out)],check=True,stdout=subprocess.DEVNULL)
# Copy release source only. No browser data, .git, verification logs or credentials.
for directory in ('background','dashboard','gate','learning','popup','icons','vendor','tests'):
 shutil.copytree(ROOT/directory,out/directory,dirs_exist_ok=True)
shutil.copy2(ROOT/'manifest.json',out/'manifest.json')
owned=['learning/curriculum.js','learning/engine.js','gate/gate.html','gate/quant.js','gate/quant.css','dashboard/knowledge-graph.js']
for name in owned:shutil.copy2(other/name,out/name)
# Resolve only the documented engine.prompt/gate.tutor overlap for this test copy.
release=(ROOT/'learning/engine.js').read_text()
start=release.index('  function prompt(');end=release.index('\n  return {',start)
p=out/'learning/engine.js';text=p.read_text();a=text.index('  function prompt(');b=text.index('\n  return {',a);p.write_text(text[:a]+release[start:end]+text[b:])
# Keep the whole narrow tutor function, including neutral-stage response mapping.
release=(ROOT/'gate/quant.js').read_text()
a=release.index('  async function tutor()');b=release.index('  async function render()',a)
p=out/'gate/quant.js';text=p.read_text();start=text.index('  async function tutor()');end=text.index('  async function render()',start)
p.write_text(text[:start]+release[a:b]+text[end:])
for name in ('decisions.test.js','decision-bank-snapshot.json','exhaustion.test.js','graph-ui.test.js','learning.test.js','zen-curriculum-smoke.py'):
 shutil.copy2(other/'tests'/name,out/'tests'/name)
report={'curriculumCommit':commit,'curriculumDirty':bool(dirty),'curriculumSourceSha256':{name:hashlib.sha256((other/name).read_bytes()).hexdigest() for name in owned},'overlay':str(out),'gitMergePerformed':False,'resolvedOverlaps':['learning/engine.js prompt only','gate/quant.js tutor request and response normalization']}
(ROOT/'verification').mkdir(exist_ok=True)
(ROOT/'verification/curriculum-integration.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
