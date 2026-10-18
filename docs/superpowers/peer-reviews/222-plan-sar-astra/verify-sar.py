"""Prose/data verification only. Writes temporary reconstruction bytes inside this SAR directory."""
from pathlib import Path
import re,json,hashlib,subprocess,tempfile,os
D=Path(__file__).resolve().parent;ROOT=D.parents[3];P=ROOT/'docs/superpowers/plans/2026-10-18-222-review-journal-refactoring.md';S=ROOT/'docs/superpowers/specs/2026-10-18-222-review-journal-refactoring-design.md'
H=lambda b:hashlib.sha256(b).hexdigest()
plan=P.read_bytes();assert H(S.read_bytes())=='f67d8a5c22b8a36537876aee529fe9dbc0530b7137650c28f144d7b9960ad5be';assert H(plan)=='139414a3851a2edc04d429805cc1c0cc656635745ee287409089e3acb1f3cee8'
text=plan.decode();g=json.loads((D/'plan-waves-r5.json').read_text());deps={};cost={}
for m in re.finditer(r'^## Task (\d{2}[A-Z]?\d?): [^\n]+\n(.*?)(?=^## Task |^## Specification coverage)',text,re.M|re.S):
 k=m[1];assert k not in deps;b=m[2];v=re.search(r'\*\*Prerequisite leaves:\*\* ([^\n]+)',b)[1].rstrip('.');deps[k]=[] if v.startswith('Owner-') else v.split(', ');c=re.search(r'Engineering/docs ([\d.]+)h; verification ([\d.]+)h; independent review ([\d.]+)h; delivery ([\d.]+)h',b);cost[k]=list(map(float,c.groups()));assert 0<sum(cost[k])<=4;assert sum(cost[k])==float(re.search(r'Total human estimate: ([\d.]+)',b)[1])
assert len(deps)==g['task_count']==50;assert deps==g['dependencies'];assert g['plan_sha256']==H(plan)
assert {k:sum(v) for k,v in cost.items()}==g['human_hours'];assert sum(map(sum,cost.values()))==g['aggregate_human_hours']==131
waves=[];done=set()
while len(done)<len(deps):
 w=[k for k in deps if k not in done and set(deps[k])<=done];assert w,'dependency cycle';waves.append(w);done.update(w)
assert waves==g['earliest_dependency_waves'];assert len(waves)==25
wave_section=text.split('### Dependency waves and safe parallel work')[1].split('Each row')[0] if 'Each row' in text else text.split('### Dependency waves and safe parallel work')[1].split('### Parallel ownership')[0]
rows=re.findall(r'^\|\s*(\d{2})\s*\|\s*([\dA-Z, ]+)\s*\|',wave_section,re.M)
assert [r[1].strip().split(', ') for r in rows]==waves
for k,c in cost.items():
 row=re.search(r'^\| '+re.escape(k)+r':[^\n]+',text,re.M);assert row,k;cells=[x.strip() for x in row[0].split('|')[2:-1]];assert list(map(float,cells[:4]))==c;assert float(cells[4].replace('*',''))==sum(c)
def ancestors(k):
 out=set(deps[k]);stack=list(out)
 while stack:
  for x in deps[stack.pop()]:
   if x not in out:out.add(x);stack.append(x)
 return out
for k in ['06A','06B','06C','07A','07B','07C','08','09','10','11','12','13','14','15A','15B1','15B2','15B3','16','17','19A','19D','19B','19C']:assert '05C3' in ancestors(k),k
for a,b in [('12','15B1'),('15B3','16'),('16','19D'),('19A','19D'),('19D','19B'),('19B','18'),('16','18'),('19B','19C'),('19C','25A'),('19C','25B')]:assert a in ancestors(b),(a,b)
# Named existing shared-source writers must be ordered. New discovery has an explicit amendment gate.
shared={'controller':['15B3','16','19B'],'api':['15B3','19A','19D'],'event/store':['11','16'],'templates':['10','15B3'],'package surface':['06C','19C']}
for group,ks in shared.items():
 for a,b in zip(ks,ks[1:]):assert a in ancestors(b),(group,a,b)
patches=[json.loads((D/n).read_text()) for n in ['r2-to-r3.metadata.json','r3-to-r4.metadata.json','r4-to-r5.metadata.json']]
revisions=[plan];curr=plan
with tempfile.TemporaryDirectory(dir=D,prefix='.verify-') as td:
 t=Path(td);env={k:v for k,v in os.environ.items() if not k.startswith('GIT_')}
 def apply(inp,patch,reverse,name):
  o=t/name;o.mkdir();(o/'FUR.md').write_bytes(inp);env['GIT_CEILING_DIRECTORIES']=str(o.parent)
  r=subprocess.run(['git','apply','--no-index','-p2','--unidiff-zero']+(['--reverse'] if reverse else []),cwd=o,input=patch,capture_output=True,env=env);assert r.returncode==0,r.stderr
  assert list(o.iterdir())==[o/'FUR.md'];return (o/'FUR.md').read_bytes()
 for i,m in enumerate(reversed(patches)):
  patch=(D/m['patch']).read_bytes();assert H(patch)==m['patch_sha256'];assert H(curr)==m['result_sha256'];prior=apply(curr,patch,True,'reverse-'+str(i));assert H(prior)==m['input_sha256'];assert apply(prior,patch,False,'forward-'+str(i))==curr;curr=prior;revisions.append(curr)
 assert H(curr)=='58bea1b4f965c858fe4d604794d42dcec939d24a51db9485dbb2105a3d33e2bc'
 # No Git object lookup occurs anywhere in the reconstruction procedure.
js=re.findall(r'```js\n(.*?)\n```',text,re.S)
for i,code in enumerate(js):
 r=subprocess.run(['node','--input-type=module','--check'],input=code.encode(),capture_output=True);assert r.returncode==0,(i,r.stderr)
json_count=0
for p in D.glob('*.json'):json.loads(p.read_text());json_count+=1
schema_count=0
for p in (ROOT/'schemas').glob('*.json'):json.loads(p.read_text());schema_count+=1
link_count=0
for p in [P,*D.glob('*.md')]:
 for target in re.findall(r'\[[^\]]*\]\(([^)]+)\)',p.read_text()):
  if re.match(r'[a-z]+:',target):continue
  target=target.split('#')[0].strip('<>')
  if not target:continue
  assert (p.parent/target).exists(),(str(p),target);link_count+=1
print(json.dumps({'status':'passed','plan_revision':'issue-222-plan-r5','plan_sha256':H(plan),'spec_unchanged':True,'leaf_tasks':50,'waves':25,'aggregate_human_hours':131,'maximum_leaf_hours':max(map(sum,cost.values())),'component_estimates_and_rendered_tables':'matched','critical_dependencies_and_shared_writer_order':'passed','reversible_patch_edges':3,'reconstructed_revisions':4,'reconstruction_uses_git_objects':False,'javascript_syntax_blocks':len(js),'sar_json_records_parsed':json_count,'published_schema_json_files_parsed':schema_count,'local_markdown_links_resolved':link_count,'production_tests':'not run; prose-only scope; syntax checks do not execute proposed implementations'},indent=2))
