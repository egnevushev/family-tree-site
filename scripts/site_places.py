"""Places of the site's map from data/site-places.json, checked against the site's data.

Called by site_data.py. A place carries its coordinates from a free source (source: the page where they
are seen), the facts of people who were there (claims) and the spellings used to hint at new facts (forms).
A claim of a child under 18 is left out (child_view in site_data.py drops it before this runs).
The map's base (land, lakes, rivers) is data/site-map-base.json, made by site_map_base.py.
"""
import json
import re
from pathlib import Path

from site_evidence import flat

ROOT = Path(__file__).resolve().parents[1]
KINDS = {'village', 'city', 'monastery', 'far'}


def places_payload(data, canon_claims):
    """(places, map base, problems, warnings) for data.js."""
    path = ROOT / 'data/site-places.json'
    if not path.exists():
        return [], None, [], []
    doc = json.loads(path.read_text())
    base_path = ROOT / 'data/site-map-base.json'
    base = json.loads(base_path.read_text()) if base_path.exists() else None
    claims = {c['id']: c for c in data['claims']}
    lon0, lat0, lon1, lat1 = base['projection']['box'] if base else (-180, -90, 180, 90)
    problems, warnings, out, seen = [], [], [], set()
    where = 'data/site-places.json'
    for p in doc['places']:
        pid = p.get('id', '')
        if not re.fullmatch(r'[a-z0-9-]+', pid) or pid in seen:
            problems.append(f'{where}: wrong or repeated id «{pid}»')
        seen.add(pid)
        if not p.get('name') or p.get('kind') not in KINDS:
            problems.append(f'{where}: {pid}: name and kind are needed ({", ".join(sorted(KINDS))})')
        has_point = p.get('lat') is not None or p.get('lon') is not None
        if p.get('kind') != 'far':
            if not (isinstance(p.get('lat'), (int, float)) and isinstance(p.get('lon'), (int, float))
                    and lat0 <= p['lat'] <= lat1 and lon0 <= p['lon'] <= lon1):
                problems.append(f'{where}: {pid}: no coordinates within the map, {lon0}–{lon1}° E, {lat0}–{lat1}° N (or kind far)')
            src = p.get('source') or {}
            if not (src.get('title') and str(src.get('url', '')).startswith('https://')):
                problems.append(f'{where}: {pid}: the point has no source of its coordinates (source: title and url)')
        elif has_point:
            problems.append(f'{where}: {pid}: a far place has no coordinates on the map')
        ids = p.get('claims', [])
        problems += [f'{where}: {pid}: fact {c} is listed twice' for c in sorted({c for c in ids if ids.count(c) > 1})]
        problems += [f'{where}: {pid}: no fact {c}' for c in ids if c not in canon_claims]
        shown = [c for c in ids if c in claims]  # a child's fact is not on the site
        if not shown:
            problems.append(f'{where}: {pid}: a place with no facts on the site — remove it or add facts')
            continue
        item = {k: p[k] for k in ('id', 'name', 'kind', 'lat', 'lon', 'approx', 'historic', 'today', 'source') if p.get(k) not in (None, '')}
        item['claims'] = shown
        item['forms'] = p.get('forms', [])  # the gallery of documents places a scan by its title
        out.append(item)
    # A new fact naming a place, not yet bound to it: a hint, not a stop.
    excluded = set(doc.get('excluded', {}).get('claims', {}))
    for p in doc['places']:
        forms = [f for f in p.get('forms', []) if len(f) > 3]
        for c in claims.values():
            if c['id'] in p.get('claims', []) or c['id'] in excluded or c['field'] in ('name', 'identification', 'identity', 'archive_lead', 'archive', 'archive_reference', 'research_lead'):
                continue
            if any(re.search(r'(?<![А-Яа-яЁё])' + re.escape(f) + r'(?![а-яё])', flat(c['value'])) for f in forms):
                warnings.append(f'{c["id"]} ({c["person_id"]}) mentions «{p["name"]}» but is not bound to the place')
    if warnings:
        warnings = [f'Map hint: {len(warnings)} facts name a place but are not bound to it — '
                    f'add them to the claims of the place or to excluded.claims ({where}): ' + '; '.join(warnings[:5]) + ('…' if len(warnings) > 5 else '')]
    if base:
        base = {k: base[k] for k in ('source', 'projection', 'land', 'coast', 'frontiers', 'lakes', 'rivers', 'borders', 'towns') if k in base}
        base['source'] = {k: base['source'][k] for k in ('title', 'url')}
    return out, base, problems, warnings
