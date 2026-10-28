#!/usr/bin/env python3
"""Check data/family.json and write app/data.js, the site's view of it.

    python3 scripts/build.py

Run scripts/build_media.py first when sources or data/site-evidence.json changed: the site shows the
copies of scans it made in site-media/.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from site_data import payload
from site_evidence import check as check_site_evidence

data = json.loads((ROOT / 'data/family.json').read_text())
people = {p['id']: p for p in data['people']}
sources = {s['id']: s for s in data['sources']}
assert len(people) == len(data['people']), 'Duplicate person IDs'
assert len(sources) == len(data['sources']), 'Duplicate source IDs'
assert data['root_person_id'] in people, 'root_person_id is not a person'
for c in data['claims']:
    assert c['person_id'] in people, c
    assert c['status'] in data['status_labels'], c
    assert c['source_ids'] and all(s in sources for s in c['source_ids']), c
for r in data['relationships']:
    assert r['from_id'] in people and r['to_id'] in people, r
    assert r['from_id'] != r['to_id'], r
    assert r['status'] in data['status_labels'], r
    assert r['source_ids'] and all(s in sources for s in r['source_ids']), r
for x in data['conflicts']:
    assert all(i in people for i in x['people']), x
    assert all(s in sources for s in x.get('source_ids', [])), x
children = {p: set() for p in people}
for r in data['relationships']:
    if r['kind'] == 'parent':
        children[r['from_id']].add(r['to_id'])
def visit(i, path):
    assert i not in path, 'Ancestry cycle: ' + i
    for kid in children[i]:
        visit(kid, path | {i})
for i in people:
    visit(i, set())
for s in sources.values():
    if s.get('local_path'):
        assert (ROOT / s['local_path']).is_file(), f"{s['id']}: no file {s['local_path']}"

for problem in check_site_evidence(data, quiet=True):
    print('Warning, site-evidence:', problem)
site = payload(data)
missing = [s['id'] for s in site['sources'] if sources[s['id']].get('local_path') and not s.get('views') and not s.get('text')]
if missing:
    print(f'Warning: {len(missing)} sources have no copy for the site ({", ".join(missing[:8])}); run scripts/build_media.py')
(ROOT / 'app/data.js').write_text('window.FAMILY_DATA = ' + json.dumps(site, ensure_ascii=False).replace('</', '<\\/') + ';\n')
print(f"app/data.js: {len(people)} people, {len(data['claims'])} facts, {len(data['relationships'])} links, "
      f"{len(site['sources'])} cited sources, {len(site['stories'])} stories")
