#!/usr/bin/env python3
"""The base of the site's map of places: land, lakes and rivers of Eastern Europe as SVG paths.

Made once from Natural Earth (public domain, https://www.naturalearthdata.com/, files from
github.com/nvkelso/natural-earth-vector, geojson/): ne_50m_admin_0_countries, ne_50m_lakes,
ne_10m_rivers_lake_centerlines; for the close views also ne_10m_rivers_europe, ne_10m_lakes_europe,
ne_10m_admin_1_states_provinces_lines (borders of regions) and ne_10m_populated_places (towns with their
Russian names, for orientation). The site loads no map tiles or services; it draws these paths itself.

Borders of countries as Ukraine sees them: the land is one fill, the coast
comes from ne_50m_coastline, and the borders from ne_50m_admin_0_boundary_lines_land by their FCLASS_UA class —
the line at Perekop is an «Admin-1 boundary» there, so Crimea is Ukraine's, with no border across it.

    python3 scripts/site_map_base.py <folder with the nine .geojson files listed in FILES>

Writes data/site-map-base.json. Coordinates are projected as x = lon · cos 55°, y = −lat (degrees),
cut to the box below and simplified to about a kilometre; the points of data/site-places.json use the
same projection in app/app.js.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOX = (4.0, 40.0, 72.0, 74.0)  # lon0, lat0, lon1, lat1: well past every point, so a view never shows its edge
K = math.cos(math.radians(55))
TOLERANCE = 0.012  # degrees
LAND_TOLERANCE = 0.025  # coasts and borders, seen only from afar
# Small rivers only within ~150 km of a place of data/site-places.json: they show only in a close view.
SPOTS = [(p['lon'], p['lat']) for p in json.loads((ROOT / 'data/site-places.json').read_text())['places'] if p.get('lat') is not None]
near = lambda p, w=1: any(abs(p[0] - x) < 2.2 * w and abs(p[1] - y) < 1.3 * w for x, y in SPOTS)
FILES = ('ne_50m_admin_0_countries', 'ne_50m_coastline', 'ne_50m_admin_0_boundary_lines_land', 'ne_50m_lakes', 'ne_10m_rivers_lake_centerlines', 'ne_10m_rivers_europe',
         'ne_10m_lakes_europe', 'ne_10m_admin_1_states_provinces_lines', 'ne_10m_populated_places')
# Borders of regions only in the countries of the family's places, near them.
REGION_COUNTRIES = {'RUS', 'UKR', 'BLR'}
# Rivers that get their name on the map; Natural Earth names them in English only. Smaller rivers are not in it.
NAMED = {'Volga': 'Волга', 'Sura': 'Сура', 'Dnipro': 'Днепр', 'Oka': 'Ока', 'Kama': 'Кама', 'Don': 'Дон', 'Desna': 'Десна'}


def clip_ring(ring):
    """Sutherland–Hodgman against the box; the ring stays closed."""
    lon0, lat0, lon1, lat1 = BOX
    edges = [(lambda p: p[0] >= lon0, lambda a, b: inter(a, b, 0, lon0)), (lambda p: p[0] <= lon1, lambda a, b: inter(a, b, 0, lon1)),
             (lambda p: p[1] >= lat0, lambda a, b: inter(a, b, 1, lat0)), (lambda p: p[1] <= lat1, lambda a, b: inter(a, b, 1, lat1))]
    pts = ring
    for inside, cross in edges:
        if not pts:
            break
        out, prev = [], pts[-1]
        for cur in pts:
            if inside(cur):
                if not inside(prev):
                    out.append(cross(prev, cur))
                out.append(cur)
            elif inside(prev):
                out.append(cross(prev, cur))
            prev = cur
        pts = out
    return pts


def inter(a, b, axis, v):
    t = (v - a[axis]) / (b[axis] - a[axis])
    return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))


def inside_box(p, margin=0.0):
    lon0, lat0, lon1, lat1 = BOX
    return lon0 - margin <= p[0] <= lon1 + margin and lat0 - margin <= p[1] <= lat1 + margin


def simplify(pts, tol=TOLERANCE):
    """Douglas–Peucker."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    norm = math.hypot(dx, dy) or 1e-12
    far, idx = 0, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / norm if (dx or dy) else math.hypot(pts[i][0] - a[0], pts[i][1] - a[1])
        if d > far:
            far, idx = d, i
    if far <= tol:
        return [a, b]
    return simplify(pts[:idx + 1], tol)[:-1] + simplify(pts[idx:], tol)


def path(pts, closed):
    xy = [(round(lon * K, 2), round(-lat, 2)) for lon, lat in pts]
    # Consecutive equal points after rounding say nothing.
    xy = [p for i, p in enumerate(xy) if not i or p != xy[i - 1]]
    if len(xy) < (3 if closed else 2):
        return ''
    return 'M' + ' '.join(f'{x:g},{y:g}' for x, y in xy) + ('Z' if closed else '')


def polygons(geom):
    if geom['type'] == 'Polygon':
        return [geom['coordinates']]
    if geom['type'] == 'MultiPolygon':
        return geom['coordinates']
    return []


def lines(geom):
    if geom['type'] == 'LineString':
        return [geom['coordinates']]
    if geom['type'] == 'MultiLineString':
        return geom['coordinates']
    return []


def areas(features):
    out = []
    for f in features:
        for poly in polygons(f['geometry']):
            for ring in poly:
                ring = [tuple(p[:2]) for p in ring]
                if not any(inside_box(p, 2) for p in ring):
                    continue
                d = path(simplify(clip_ring(ring), LAND_TOLERANCE), True)
                if d:
                    out.append(d)
    return ''.join(out)


def rivers(features, europe=False):
    out = []
    for f in features:
        props = f['properties']
        name = (props.get('name_ru') or '') if europe else NAMED.get(props.get('name') or '', '')
        if europe and (props.get('name_en') or props.get('name')) in NAMED:
            continue  # the big rivers come from the world layer
        if europe:  # the Europe layer adds small rivers; they stay near the family's places
            props = dict(props, scalerank=max(props.get('scalerank', 10), 8))
        for line in lines(f['geometry']):
            # Cut into the runs that are inside the box.
            run = []
            small = props.get('scalerank', 10) >= 8
            for p in [tuple(p[:2]) for p in line] + [None]:
                if p is not None and inside_box(p, .2) and (not small or near(p)):
                    run.append(p)
                    continue
                d = path(simplify(run), False) if len(run) > 1 else ''
                if d:
                    out.append({'d': d, 'rank': props.get('scalerank', 10), **({'name': name} if name else {})})
                run = []
    # One entry per river and rank: the paths of a river are joined.
    joined = {}
    for r in out:
        joined.setdefault((r.get('name', ''), r['rank']), []).append(r['d'])
    return [{'rank': rank, **({'name': name} if name else {}), 'd': ''.join(ds)} for (name, rank), ds in sorted(joined.items(), key=lambda kv: (kv[0][1], kv[0][0]))]


def frontiers(features):
    # Borders of countries in Ukraine's view of them (FCLASS_UA); a line it does not count as a border is left out.
    out = []
    for f in features:
        p = f['properties']
        if (p.get('FCLASS_UA') or p.get('FEATURECLA') or '') in ('Admin-1 boundary', 'Unrecognized'):
            continue
        for line in lines(f['geometry']):
            pts = [tuple(q[:2]) for q in line]
            if any(inside_box(q, 2) for q in pts):
                d = path(simplify(pts, LAND_TOLERANCE), False)
                if d:
                    out.append(d)
    return ''.join(out)


def coast(features):
    # Coasts seen only from afar: simplified more, and the small islands of the north left as land without a line.
    out = []
    for f in features:
        for line in lines(f['geometry']):
            pts = [tuple(q[:2]) for q in line]
            if any(inside_box(q, 2) for q in pts):
                pts = simplify(pts, .04)
                if len(pts) < 5 and not any(near(q, 2) for q in pts):
                    continue
                d = path(pts, False)
                if d:
                    out.append(d)
    return ''.join(out)


def borders(features):
    # Borders of regions (oblasts) near the family's places: one path, simplified.
    out = []
    for f in features:
        if f['properties'].get('ADM0_A3') not in REGION_COUNTRIES:
            continue
        for line in lines(f['geometry']):
            run = []
            for p in [tuple(p[:2]) for p in line] + [None]:
                if p is not None and near(p, 1.5):
                    run.append(p)
                    continue
                d = path(simplify(run, .02), False) if len(run) > 1 else ''
                if d:
                    out.append(d)
                run = []
    return ''.join(out)


def towns(features):
    # Towns for orientation with their Russian and English names; rank decides from which zoom they show.
    out = []
    for f in features:
        p = f['properties']
        lon, lat, name = p.get('LONGITUDE'), p.get('LATITUDE'), p.get('NAME_RU')
        rank = int(p.get('SCALERANK', 10))
        # Big towns anywhere on the map; smaller ones only around the family's places.
        if not name or not inside_box((lon, lat)) or not (rank <= 3 or rank <= 9 and near((lon, lat), 2)):
            continue
        out.append({'n': {'ru': name, 'en': p.get('NAME_EN') or p.get('NAME') or name}, 'x': round(lon * K, 3), 'y': round(-lat, 3), 'r': rank})
    return sorted(out, key=lambda t: (t['r'], t['n']['ru']))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('folder')
    args = parser.parse_args()
    folder = Path(args.folder)
    data = {name: json.loads((folder / f'{name}.geojson').read_text()) for name in FILES}
    # The Europe lakes are drawn only near the family's places, like the small rivers.
    eu_lakes = [f for f in data['ne_10m_lakes_europe']['features'] if any(near(tuple(p[:2])) for poly in polygons(f['geometry']) for p in poly[0])]
    base = {
        'note': 'Base of the map of places. Natural Earth, public domain; made by scripts/site_map_base.py. Do not edit by hand.',
        'source': {'title': 'Natural Earth: land, coasts, country borders (as Ukraine sees them) and lakes 1:50m; rivers, lakes of Europe, borders of regions and towns 1:10m', 'url': 'https://www.naturalearthdata.com/',
                   'files': {name: hashlib.sha256((folder / f'{name}.geojson').read_bytes()).hexdigest() for name in FILES}},
        'projection': {'k': round(K, 6), 'box': BOX},
        'land': areas(data['ne_50m_admin_0_countries']['features']),
        'coast': coast(data['ne_50m_coastline']['features']),
        'frontiers': frontiers(data['ne_50m_admin_0_boundary_lines_land']['features']),
        'lakes': areas(data['ne_50m_lakes']['features'] + eu_lakes),
        'rivers': rivers(data['ne_10m_rivers_lake_centerlines']['features']) + rivers(data['ne_10m_rivers_europe']['features'], europe=True),
        'borders': borders(data['ne_10m_admin_1_states_provinces_lines']['features']),
        'towns': towns(data['ne_10m_populated_places']['features']),
    }
    target = ROOT / 'data/site-map-base.json'
    target.write_text(json.dumps(base, ensure_ascii=False) + '\n')
    print(f'{target.relative_to(ROOT)}: {target.stat().st_size / 1e3:.0f} KB, {len(base["rivers"])} rivers')


if __name__ == '__main__':
    main()
