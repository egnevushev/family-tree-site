#!/usr/bin/env python3
"""Pages and record boxes that the site shows for each cited source.

data/site-evidence.json is the editable layer between the canon and the site:

  "sources": {
    "A11": {"pages": [10]},                         # PDF: which pages to publish
    "A23": {"pages": [1, 2, 15], "cite": {"C202": [15]}},   # page per citation
    "S-1885-BIRTHS": {"boxes": [
        {"box": [x0, y0, x1, y1],                   # fractions of width/height
         "page": null,                              # PDF page, null for images
         "label": "No. 17, Anna",
         "for": ["C382", "R133"],                   # citations the box supports
         "checked": "2026-01-15: from the image"}]}
  }

A box is added only after looking at the image. Without a box the site shows the
whole page.

  init    add PDF pages parsed from claim locators ("PDF с.N", "PDF p. N"); print what is unresolved
  check   validate the file against data/family.json (also run by build_site_media.py)
  merge   add boxes from helper files (<file>.json with the same "sources"); existing boxes win
"""
import argparse
import collections
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'data/site-evidence.json'
IMAGE = ('.jpg', '.jpeg', '.png', '.webp')
TEXT = ('.md', '.txt', '.json', '.html')
PDF_PAGE = [
    re.compile(r'PDF\s*(?:с\.|стр\.|p\.|page)\s*(\d+)(?:\s*[–-]\s*(\d+))?', re.I),
    re.compile(r'/\s*PDF\s*(\d+)(?:\s*[–-]\s*(\d+))?', re.I),
    re.compile(r'PDF\s*(?:изображение|image)\s*(\d+)', re.I),
]


def flat(v):
    """A text of the data as one string: a plain string, or every language of {"ru": …, "en": …} joined."""
    if isinstance(v, dict):
        return ' '.join(t for t in v.values() if isinstance(t, str))
    return v if isinstance(v, str) else ''


def load_canon():
    return json.loads((ROOT / 'data/family.json').read_text())


def load_evidence():
    if EVIDENCE.exists():
        return json.loads(EVIDENCE.read_text())
    return {'sources': {}}


def save_evidence(evidence):
    evidence['sources'] = dict(sorted(evidence['sources'].items()))
    EVIDENCE.write_text(json.dumps(evidence, ensure_ascii=False, indent=1) + '\n')


def citations(data):
    """Source id → ids of the claims, relationships, conflicts and portraits that cite it."""
    cited = collections.defaultdict(list)
    for c in data['claims']:
        for s in c['source_ids']:
            cited[s].append(c['id'])
    for r in data['relationships']:
        for s in r['source_ids']:
            cited[s].append(r['id'])
    for x in data['conflicts']:
        for s in x.get('source_ids', []):
            cited[s].append(x['id'])
    for p in data['people']:
        for s in p.get('media', []):
            cited[s].append('media:' + p['id'])
    return cited


def site_file(source):
    """Local file the site derives its copy from; archived HTML is shown as its text snapshot."""
    path = source.get('local_path') or ''
    if not path or source.get('download_status') in ('failed', 'not_downloaded'):
        return None
    if path.endswith('.html') and (ROOT / (path[:-5] + '.txt')).is_file():
        path = path[:-5] + '.txt'
    return path if (ROOT / path).is_file() else None


def locator_pages(locator):
    pages = []
    for pattern in PDF_PAGE:
        for m in pattern.finditer(locator or ''):
            first = int(m.group(1))
            last = int(m.group(2)) if m.lastindex and m.lastindex > 1 and m.group(2) else first
            pages += range(first, last + 1)
    return sorted(set(pages))


def init(args):
    data, evidence = load_canon(), load_evidence()
    sources = {s['id']: s for s in data['sources']}
    cited = citations(data)
    unresolved = []
    for sid in sorted(cited):
        path = site_file(sources[sid])
        if not path or not path.endswith('.pdf'):
            continue
        entry = evidence['sources'].setdefault(sid, {})
        found = {}
        for c in data['claims']:
            pdfs = [s for s in c['source_ids'] if (site_file(sources[s]) or '').endswith('.pdf')]
            if pdfs == [sid] and locator_pages(flat(c['locator'])):
                found[c['id']] = locator_pages(flat(c['locator']))
        pages = sorted({p for v in found.values() for p in v})
        if pages and not entry.get('pages'):
            entry['pages'] = pages
            if len(set(map(tuple, found.values()))) > 1:
                entry['cite'] = found
        if not entry.get('pages'):
            unresolved.append((sid, cited[sid]))
    save_evidence(evidence)
    for sid, uses in unresolved:
        print(f'PDF without a page: {sid} ({sources[sid]["local_path"]}); cited by: {", ".join(uses[:6])}')
    print(f'Unresolved PDFs: {len(unresolved)}')


def check(data=None, evidence=None, quiet=False):
    data = data or load_canon()
    evidence = evidence or load_evidence()
    sources = {s['id']: s for s in data['sources']}
    cited = citations(data)
    problems = []
    for sid, entry in evidence['sources'].items():
        if sid not in sources:
            problems.append(f'{sid}: not in family.json')
            continue
        if sid not in cited:
            problems.append(f'{sid}: the source is no longer cited')
        path = site_file(sources[sid]) or ''
        if entry.get('pages') and not path.endswith('.pdf'):
            problems.append(f'{sid}: pages are given for a file that is not a PDF')
        for cid, pages in entry.get('cite', {}).items():
            if cid not in cited.get(sid, []) or not set(pages) <= set(entry.get('pages', [])):
                problems.append(f'{sid}: cite {cid} does not match the citations or pages')
        for b in entry.get('boxes', []):
            x0, y0, x1, y1 = b['box']
            if not (0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1):
                problems.append(f'{sid}: box outside [0,1] {b["box"]}')
            if path.endswith('.pdf') and b.get('page') not in entry.get('pages', []):
                problems.append(f'{sid}: box on an unpublished page {b.get("page")}')
            for cid in b.get('for', []):
                if cid not in cited.get(sid, []):
                    problems.append(f'{sid}: box for {cid}, which does not cite the source')
            if not b.get('checked'):
                problems.append(f'{sid}: box without a "checked" note')
    if problems and not quiet:
        print('\n'.join(problems))
    return problems


def merge(args):
    data, evidence = load_canon(), load_evidence()
    added, skipped = 0, []
    for path in args.files:
        found = json.loads(Path(path).read_text())
        for sid, entry in found.get('sources', {}).items():
            target = evidence['sources'].setdefault(sid, {})
            if target.get('boxes'):
                skipped.append(f'{sid}: boxes exist already, not replaced')
                continue
            trial = {'sources': {**evidence['sources'], sid: {**target, 'boxes': entry['boxes']}}}
            problems = [p for p in check(data, trial, quiet=True) if p.startswith(sid + ':')]
            if problems:
                skipped += problems
                continue
            target['boxes'] = entry['boxes']
            added += len(entry['boxes'])
    save_evidence(evidence)
    print(f'Boxes added: {added}')
    for line in skipped:
        print('Skipped:', line)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('command', choices=['init', 'check', 'merge'])
    parser.add_argument('files', nargs='*')
    args = parser.parse_args()
    if args.command == 'init':
        init(args)
    elif args.command == 'merge':
        merge(args)
    elif check():
        sys.exit(1)
    else:
        print('site-evidence.json agrees with family.json')
