#!/usr/bin/env python3
"""Copies of the cited sources for the site: site-media/ and site-media/index.json.

    python3 scripts/build_media.py

Only sources that a person, fact, link or conflict cites are published. An image (jpg, png, webp, tif)
becomes a JPEG of at most 2400 px and a lighter 1100 px copy for cards; a PDF gives only the pages chosen in
data/site-evidence.json ("pages": [3, 4]) and needs `pip install pypdfium2`; a text (.txt, .md) is copied
as it is. Needs Pillow (`pip install pillow`). Run scripts/build.py afterwards.
"""
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from site_evidence import IMAGE, check, citations, load_canon, load_evidence, site_file

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site-media'
MAX_PX, MID_PX = 2400, 1100
IMAGES = IMAGE + ('.tif', '.tiff')


def fresh(target, source):
    return target.exists() and target.stat().st_mtime >= source.stat().st_mtime


def save(img, target, px, quality):
    img = img.convert('RGB')
    img.thumbnail((px, px))
    img.save(target, 'JPEG', quality=quality, optimize=True)


def pdf_pages(original, sid, pages):
    try:
        import pypdfium2
    except ImportError:
        sys.exit(f'{sid}: pages of a PDF need pypdfium2 (pip install pypdfium2)')
    pdf = pypdfium2.PdfDocument(str(original))
    for p in pages:
        target = OUT / f'{sid}-p{p}.jpg'
        if not fresh(target, original):
            page = pdf[p - 1]
            scale = MAX_PX / max(page.get_size())
            save(page.render(scale=scale).to_pil(), target, MAX_PX, 80)


def main():
    data, evidence = load_canon(), load_evidence()
    if check(data, evidence):
        sys.exit('data/site-evidence.json does not agree with data/family.json, see above')
    sources = {s['id']: s for s in data['sources']}
    OUT.mkdir(exist_ok=True)
    index, wanted = {}, set()
    for sid in sorted(citations(data)):
        path = site_file(sources.get(sid, {}))
        if not path:
            continue
        original = ROOT / path
        ext = original.suffix.lower()
        if ext == '.pdf':
            pages = evidence['sources'].get(sid, {}).get('pages', [])
            if not pages:
                print(f'{sid}: no PDF pages chosen in data/site-evidence.json — skipped')
                continue
            pdf_pages(original, sid, pages)
            views = [dict(file=f'{sid}-p{p}.jpg', page=p) for p in pages]
        elif ext in IMAGES:
            target = OUT / f'{sid}.jpg'
            if not fresh(target, original):
                save(Image.open(original), target, MAX_PX, 80)
            views = [dict(file=target.name, page=None)]
        else:
            target = OUT / f'{sid}.txt'
            target.write_text(original.read_text(errors='replace'))
            index[sid] = dict(text=target.name, bytes=target.stat().st_size)
            wanted.add(target.name)
            continue
        for view in views:
            full = OUT / view['file']
            with Image.open(full) as img:
                view['w'], view['h'] = img.size
                mid = full.with_name(full.stem + '.m.jpg')
                if not fresh(mid, full):
                    save(img, mid, MID_PX, 72)
            view['mid'] = mid.name
            wanted.update((view['file'], mid.name))
        index[sid] = dict(views=views)
    keep = {'index.json'}
    for stale in OUT.iterdir():
        if stale.name not in wanted and stale.name not in keep:
            stale.unlink()
    (OUT / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=1) + '\n')
    size = sum((OUT / f).stat().st_size for f in wanted)
    print(f'site-media: {len(index)} sources, {len(wanted)} files, {size / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
