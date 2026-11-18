// The page «Карта мест» (Map of places): the map, its list of places, moving it, and the card of a place.
// Depends on facts.js (places), ui.js (registerPage), panzoom.js and panel.js.
'use strict';
// ---------- The map of places: a page over the tree (ui.js) ----------
// The map projects x = lon · cos 55°, y = −lat, as the base made by scripts/site_map_base.py. The base itself is the
// part «map» (ui.js, loadPart); data.js keeps its projection, map_projection (a data.js without parts, the base).
const MAPPROJ = D.map_projection || D.map_base?.projection || {};
const MAPK = MAPPROJ.k || Math.cos(55 * Math.PI / 180);
const proj = pl => [pl.lon * MAPK, -pl.lat];
// The base covers only this box (lon0, lat0, lon1, lat1): the land is cut to it, so the coasts and borders are cut to
// it on the screen too, and the map zooms out no further than the whole box.
const MAPBOX = MAPPROJ.box || [4, 40, 72, 74];
const [boxX, boxY, boxW, boxH] = [MAPBOX[0] * MAPK, -MAPBOX[3], (MAPBOX[2] - MAPBOX[0]) * MAPK, MAPBOX[3] - MAPBOX[1]];
const mapViews = [];  // the stack of zoomed views, each a list of place ids
let mapView = {k: 1, tx: 0, ty: 0}, mapHand = false;  // the drawn view; mapHand: the reader moved or zoomed it
let mapFocus = null;  // a place to show and mark (from a card)
// mapShown: the map is drawn for this opening of the page; till then (its part still coming) a card's place waits
// for the first drawing to choose its view (mapFocusDue).
let mapShown = false, mapFocusDue = false;
const measureLabel = (() => {
  const ctx = document.createElement('canvas').getContext('2d');
  return (t, size, weight) => { ctx.font = `${weight} ${size}px ${getComputedStyle(document.body).fontFamily}`; return ctx.measureText(t).width; };
})();
// A circle of several places is named by the province most of them were in («Тверская губерния», «Tver Governorate»),
// else by its place with the most people: «Тверь и ещё 1».
const province = pl => {
  const m = /([А-ЯЁ][а-яё-]+)(ской|цкой) губернии/.exec(pl.historic || '');
  if (m) return `${m[1]}${m[2] === 'ской' ? 'ская' : 'цкая'} губерния`;
  const e = /\b([A-Z][A-Za-z-]+) (Governorate|Province)\b/.exec(pl.historic || '');
  return e ? `${e[1]} ${e[2]}` : '';
};
function clusterName(members) {
  const count = new Map();
  members.forEach(m => { const p = province(m); if (p) count.set(p, (count.get(p) || 0) + 1); });
  const [best, n] = [...count].sort((a, b) => b[1] - a[1])[0] || [];
  return drawMap.overview && best && n / members.length >= .6 && members.length > 2 ? best : `${members[0].name.replace(/ \(.*\)$/, '')} ${L('и ещё', 'and')} ${members.length - 1}${L('', ' more')}`;
}
function drawMap() {
  // Nothing to draw over until the base has come (a redraw or a resize while it loads, or after it failed).
  if (!partReady('map')) return;
  const svg = $('map-svg'), wrap = $('map-wrap');
  const mapW = wrap.clientWidth, full = wrap.clientHeight;
  if (!mapW || !full) return;
  svg.setAttribute('viewBox', `0 0 ${mapW} ${full}`);
  // On a phone the half-open card covers the lower part of the map: the view is fitted to the part above it.
  let Hh = full;
  if (narrow() && document.body.classList.contains('panel-open') && panel.dataset.state === 'peek') {
    const bar = parseFloat(getComputedStyle(document.body).getPropertyValue('--bar')) || 94;
    Hh = Math.max(140, Math.min(full, innerHeight - (innerHeight - bar) * .48 - wrap.getBoundingClientRect().top - 8));
  }
  const all = PLACES.filter(onMap);
  const ids = mapViews[mapViews.length - 1];
  // The box of a view: its places with a margin; a zoomed view at least ~25 km tall, a focused one ~250 km.
  const fitTo = (pls, least) => {
    const xs = pls.map(pl => proj(pl)[0]), ys = pls.map(pl => proj(pl)[1]);
    let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const grow = (a, b, n) => { const m = (a + b) / 2, h = Math.max(b - a, n) / 2; return [m - h, m + h]; };
    [y0, y1] = grow(y0, y1, least); [x0, x1] = grow(x0, x1, least * mapW / Hh);
    const padX = (x1 - x0) * .12 + 1e-3, padY = (y1 - y0) * .14 + 1e-3;
    x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
    const k = Math.min(mapW / (x1 - x0), Hh / (y1 - y0));
    return {k, tx: mapW / 2 - (x0 + x1) / 2 * k, ty: Hh / 2 - (y0 + y1) / 2 * k};
  };
  const kAll = fitTo(all, 0).k;
  drawMap.kMin = Math.min(kAll, mapW / boxW, Hh / boxH);
  // A view set by the site (the whole map, a circle opened, a card's place) or moved by the reader's hand.
  if (!mapHand) mapView = fitTo(ids ? all.filter(pl => ids.includes(pl.id)) : all, mapFocus && ids?.length === 1 ? 2.2 : ids ? .22 : 0);
  const {k, tx, ty} = mapView;
  mapView.W = mapW; mapView.H = full;
  // The places on the screen, a circle's radius (12) and its line clear of the edge; a view of a circle shows only its
  // places, until the reader moves it.
  let inView = ids && !ids.auto && !mapHand ? all.filter(pl => ids.includes(pl.id)) : all.filter(pl => { const x = proj(pl)[0] * k + tx, y = proj(pl)[1] * k + ty; return x >= 14 && x <= mapW - 14 && y >= 14 && y <= Hh - 14; });
  const overview = drawMap.overview = k < kAll * 1.8;
  const at = pl => { const [x, y] = proj(pl); return [x * k + tx, y * k + ty]; };
  const base = D.map_base;
  // Rivers by the scale: the big ones far out, the small ones close in.
  const ranks = k > 400 ? 10 : k > 150 ? 9 : k > 60 ? 8 : 6;
  const rivers = (base?.rivers || []).filter(r => r.rank <= ranks).map(r => `<path class="river r${Math.round(r.rank)}" d="${r.d}"/>`).join('');
  // Points close on the screen go into one circle with their number; it opens a closer view of them.
  const near = overview ? 30 : 22, groups = [];
  for (const pl of inView.slice().sort((a, b) => b.people.length - a.people.length || b.cs.length - a.cs.length)) {
    const [x, y] = at(pl);
    // On the whole map the places of one province near each other also go into one circle.
    const g = groups.find(g => Math.hypot(g.x - x, g.y - y) < near) || (overview && province(pl) && groups.find(g => province(g.members[0]) === province(pl) && Math.hypot(g.x - x, g.y - y) < 4 * near));
    if (g) g.members.push(pl); else groups.push({x, y, members: [pl]});
  }
  // Labels: the heaviest first, at the first of eight places around the point that is free of other labels,
  // the points and the edge; with no free place the name stays in the list beside the map.
  const taken = groups.map(g => { const r = g.members.length > 1 ? 13 : 8; return [g.x - r, g.y - r, g.x + r, g.y + r]; });
  // The scale bar keeps its room in the lower left corner.
  const km = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(n => n * k / 111.2 >= 70) || 1000, barW = km * k / 111.2;
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  // The scale bar goes to a lower corner free of the family's points, the left one first; with none free, no bar.
  const scaleW = barW + 66, groupBoxes = taken.slice();
  const scaleAt = [[14, 0, Hh - 30, scaleW + 14, Hh], [mapW - scaleW - 14, mapW - scaleW - 14, Hh - 30, mapW, Hh]].find(([, x0, y0, x1, y1]) => !groupBoxes.some(o => hit(o, [x0, y0, x1, y1])));
  if (scaleAt) taken.push(scaleAt.slice(1));
  const labels = [];
  for (const g of groups) {
    const big = g.members.length > 1, head = g.members[0];
    const text = big ? clusterName(g.members) : head.name.replace(/ \(.*\)$/, '');
    const size = big || head.kind === 'city' ? 13 : 12, w = measureLabel(text, size, 600) + 2, h = size + 3, r = big ? 15 : 8;
    const spots = [[r, -h / 2], [-r - w, -h / 2], [-w / 2, -r - h], [-w / 2, r], [r - 2, -r - h + 4], [-r - w + 2, -r - h + 4], [r - 2, r - 4], [-r - w + 2, r - 4]];
    const spot = spots.map(([dx, dy]) => [g.x + dx, g.y + dy, g.x + dx + w, g.y + dy + h]).find(b => b[0] >= 2 && b[1] >= 2 && b[2] <= mapW - 2 && b[3] <= Hh - 2 && !taken.some(t => hit(t, b)));
    if (spot) { taken.push(spot); labels.push({g, text, size, box: spot, big}); }
  }
  // For orientation in a close view: towns of today (grey, only where their name fits after the family's places),
  // borders of regions and a scale bar.
  const townRank = k < 20 ? 3 : k < 50 ? 5 : k < 120 ? 7 : 9;
  const ours = new Set(inView.map(pl => plain(pl.name.replace(/ \(.*\)$/, '').split(' (')[0])));
  const towns = [];
  for (const t of base?.towns || []) {
    if (t.r > townRank) continue;
    const x = t.x * k + tx, y = t.y * k + ty;
    if (x < 8 || y < 8 || x > mapW - 8 || y > Hh - 8 || ours.has(plain(t.n)) || groups.some(g => Math.hypot(g.x - x, g.y - y) < 16)) continue;
    const w = measureLabel(t.n, 10.5, 400) + 2, h = 13;
    const spot = [[6, -h / 2], [-6 - w, -h / 2], [-w / 2, -5 - h], [-w / 2, 5]].map(([dx, dy]) => [x + dx, y + dy, x + dx + w, y + dy + h])
      .find(b => b[0] >= 2 && b[1] >= 2 && b[2] <= mapW - 2 && b[3] <= Hh - 2 && !taken.some(o => hit(o, b)));
    if (!spot) continue;
    taken.push(spot, [x - 3, y - 3, x + 3, y + 3]);
    towns.push({t, x, y, box: spot});
  }
  svg.innerHTML = `<defs><clipPath id="map-box"><rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}"/></clipPath><radialGradient id="map-zone"><stop offset="0" stop-color="#2f5d47" stop-opacity=".16"/><stop offset=".6" stop-color="#2f5d47" stop-opacity=".07"/><stop offset="1" stop-color="#2f5d47" stop-opacity="0"/></radialGradient></defs><g id="map-all"><g class="map-base" clip-path="url(#map-box)" transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${k.toFixed(3)})">
      <path class="land" d="${base?.land || ''}"/><path class="coast" d="${base?.coast || ''}"/><path class="frontier" d="${base?.frontiers || ''}"/><path class="lake" d="${base?.lakes || ''}"/>${rivers}${k > 40 && base?.borders ? `<path class="borders" d="${base.borders}"/>` : ''}</g>
    <g class="map-zones" aria-hidden="true">${groups.map(g => `<circle cx="${g.x.toFixed(1)}" cy="${g.y.toFixed(1)}" r="${g.members.length > 1 ? 44 : 30}"/>`).join('')}</g>
    <g class="map-towns" aria-hidden="true">${towns.map(({t, x, y, box}) => `<rect x="${(x - 2).toFixed(1)}" y="${(y - 2).toFixed(1)}" width="4" height="4"/><text x="${(box[0] + 1).toFixed(1)}" y="${(box[3] - 3.5).toFixed(1)}">${esc(t.n)}</text>`).join('')}</g>
    ${scaleAt ? `<g class="map-scale" aria-hidden="true" transform="translate(${scaleAt[0].toFixed(1)},${(Hh - 18).toFixed(1)})"><path d="M0,-4V0H${barW.toFixed(1)}V-4"/><text x="${(barW + 6).toFixed(1)}" y="0">${km} ${L('км', 'km')}</text></g>` : ''}
    <g class="map-points">${groups.map((g, i) => {
      const big = g.members.length > 1, pl = g.members[0], mark = mapFocus && g.members.some(m => m.id === mapFocus);
      const what = big ? `${g.members.length} ${L('мест', 'places')}: ${g.members.map(m => m.name).join(', ')}` : `${pl.name}: ${pl.people.length} ${L('человек', pl.people.length === 1 ? 'person' : 'people')}`;
      return `<g class="map-pt${big ? ' many' : ''}${pl.approx && !big ? ' approx' : ''}${mark ? ' marked' : ''}" data-map-group="${i}" tabindex="0" role="button" aria-label="${esc(what)}" transform="translate(${g.x.toFixed(1)},${g.y.toFixed(1)})">
        <circle class="hit" r="${big ? 18 : 13}"/>${big ? '' : '<circle class="halo" r="10"/>'}<circle class="dot" r="${big ? 12 : pl.kind === 'city' ? 5.5 : 4.5}"/>${big ? `<text dy="4.2">${g.members.length}</text>` : ''}<title>${esc(what)}</title></g>`;
    }).join('')}</g>
    <g class="map-labels" aria-hidden="true">${labels.map(l => `<text class="${l.big ? 'many' : ''}" x="${(l.box[0] + 1).toFixed(1)}" y="${(l.box[3] - 4).toFixed(1)}" font-size="${l.size}" data-label-group="${groups.indexOf(l.g)}">${esc(l.text)}</text>`).join('')}</g></g>`;
  drawMap.groups = groups;
  $('map-back').hidden = !mapViews.length && !mapHand;
  mapList(inView);
}
// The list beside the map: the places of the view, most people first; the far ones under «За краем карты».
function mapList(inView) {
  const row = pl => `<button data-place="${esc(pl.id)}"><strong>${esc(pl.name)}</strong><small>${esc(pl.people.map(id => sayName(id)).slice(0, 3).join(', '))}${pl.people.length > 3 ? ` ${L('и ещё', 'and')} ${pl.people.length - 3}${L('', ' more')}` : ''}${span(yearsOf(pl.cs)) ? ' · ' + span(yearsOf(pl.cs)) : ''}</small></button>`;
  const far = mapViews.length || mapHand ? [] : PLACES.filter(pl => !onMap(pl));
  const sorted = inView.slice().sort((a, b) => b.people.length - a.people.length || a.name.localeCompare(b.name, 'ru'));
  $('map-list').innerHTML = `<p class="map-count">${mapViews.length || mapHand ? L('В этой части карты', 'In this part of the map') : L('Все места', 'All places')} · ${inView.length}</p>${sorted.map(row).join('')}
    ${far.length ? `<p class="map-count">${L('За краем карты', 'Beyond the map')}</p>${far.map(row).join('')}` : ''}
    <p class="map-src">${L('Подложка — Natural Earth. Координаты сёл — по свободным источникам, ссылка в карточке места.', 'Base map — Natural Earth. Coordinates of villages are from free sources, linked in the card of each place.')}</p>`;
}
$('map-svg').addEventListener('click', e => {
  if (mapDragged) { mapDragged = false; return; }
  const t = e.target.closest('[data-map-group],[data-label-group]'); if (!t) return;
  const g = drawMap.groups[+(t.dataset.mapGroup ?? t.dataset.labelGroup)]; if (!g) return;
  if (g.members.length > 1) { mapViews.push(g.members.map(m => m.id)); mapFocus = null; mapHand = false; drawMap(); }
  else go({pl: g.members[0].id});
});
$('map-svg').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest('[data-map-group]')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', {bubbles: true})); } });
$('map-list').addEventListener('click', e => { const b = e.target.closest('[data-place]'); if (b) go({pl: b.dataset.place}); });
// «← Вся карта» returns to the whole map at once, however deep the reader went.
$('map-back').onclick = () => { mapHand = false; mapViews.length = 0; mapFocus = null; drawMap(); };
// Moving the map as the tree: drag with a mouse or a finger, the wheel or a pinch to zoom, the buttons + and −.
// While it moves, the drawn map is only shifted and scaled; when it stops, the circles and the names are laid out
// again for the new view. Dragging and pinching stay the map's own, not panzoom.js: the map moves by the step of
// each move, and it takes the pointer only once it moves, so a click still reaches a place.
let mapDragged = false;
const mapPointers = new Map();
let mapGesture = null, mapSettle = 0;
const mapMove = () => { const {k, tx, ty} = mapView, g = mapGesture; $('map-svg').classList.add('moving');
  $('map-all')?.setAttribute('transform', `translate(${g.tx - tx * g.k / k},${g.ty - ty * g.k / k}) scale(${g.k / k})`); };
function mapZoomAt(f, cx, cy) {
  const g = mapGesture || {...mapView};
  const k = Math.max(drawMap.kMin || 4, Math.min(6000, g.k * f)), r = k / g.k;
  mapGesture = {k, tx: cx - (cx - g.tx) * r, ty: cy - (cy - g.ty) * r};
  mapMove();
}
function mapCommit() {
  if (!mapGesture) return;
  Object.assign(mapView, {k: mapGesture.k, tx: mapGesture.tx, ty: mapGesture.ty});
  mapGesture = null; mapHand = true; mapFocus = mapFocus && current?.pl ? mapFocus : null;
  $('map-svg').classList.remove('moving');
  drawMap();
}
const mapSvg = $('map-svg');
mapSvg.addEventListener('pointerdown', e => {
  mapPointers.set(e.pointerId, {x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY});
  if (mapPointers.size === 1) mapDragged = false;
});
mapSvg.addEventListener('pointermove', e => {
  const p = mapPointers.get(e.pointerId); if (!p) return;
  const r = mapSvg.getBoundingClientRect();
  if (mapPointers.size === 2) {
    const [a, b] = [...mapPointers.values()], d0 = Math.hypot(a.x - b.x, a.y - b.y);
    p.x = e.clientX; p.y = e.clientY;
    const [c, d] = [...mapPointers.values()], d1 = Math.hypot(c.x - d.x, c.y - d.y);
    if (d0 > 0) { mapDragged = true; mapSvg.setPointerCapture(e.pointerId); mapZoomAt(d1 / d0, (c.x + d.x) / 2 - r.left, (c.y + d.y) / 2 - r.top); }
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  if (!mapDragged && Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 5) return;
  if (!mapDragged) { mapDragged = true; mapSvg.setPointerCapture(e.pointerId); }
  const g = mapGesture || {...mapView};
  mapGesture = {k: g.k, tx: g.tx + dx, ty: g.ty + dy};
  mapMove();
});
const mapUp = e => { mapPointers.delete(e.pointerId); if (!mapPointers.size && mapGesture) mapCommit(); };
mapSvg.addEventListener('pointerup', mapUp); mapSvg.addEventListener('pointercancel', mapUp);
// The wheel as on the tree (panzoom.js), but a mouse wheel zooms by every notch and a little slower; once it stops,
// the map is laid out for the new view.
wheelZoom(mapSvg, {
  zooms: e => e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX), rate: .0022,
  zoomBy: mapZoomAt,
  panBy(dx, dy) { const g = mapGesture || {...mapView}; mapGesture = {k: g.k, tx: g.tx - dx, ty: g.ty - dy}; mapMove(); },
  after() { clearTimeout(mapSettle); mapSettle = setTimeout(mapCommit, 160); },
});
document.querySelectorAll('[data-map-zoom]').forEach(b => b.onclick = () => {
  const r = mapSvg.getBoundingClientRect();
  mapZoomAt(b.dataset.mapZoom === 'in' ? 1.6 : 1 / 1.6, r.width / 2, r.height / 2); mapCommit();
});
window.addEventListener('resize', () => { if (pageOpen === 'map') drawMap(); });
// Opening the map shows all of it, unless a card asked for its place (mapFocus).
registerPage('map', {
  el: 'map-page', mode: true, part: 'map',
  available: () => !!D.places?.length,
  show() {
    if (!mapFocus) { mapViews.length = 0; mapHand = false; }
    drawMap(); mapShown = true;
    if (mapFocusDue) { mapFocusDue = false; if (mapFocus) { mapCloseIn(mapFocus); drawMap(); } }
  },
  leave() { mapFocus = null; mapShown = mapFocusDue = false; },
  // The map beside an open card is drawn again in the part left free (on a computer).
  redraw: drawMap,
  // A card closed over the map: its place is no longer marked; a close view opened for that place goes with it.
  cardClosed() { mapFocus = null; if (mapViews[mapViews.length - 1]?.auto) mapViews.pop(); },
});
// A place's card: who was there and when, with the facts; where the point comes from.
function placeView(id) {
  const pl = PLACE.get(id);
  if (!pl) return;
  current = {pl: id};
  mark();
  const ref = c => `<button class="ref r${level(c.status)}" data-ref="${esc(c.id)}" aria-label="${L('Факт', 'Fact')} ${esc(c.id)}">↗</button>`;
  const people = pl.people.map(pid => {
    const cs = pl.cs.filter(c => cid(c.person_id) === pid);
    return {pid, cs, ys: yearsOf(cs)};
  }).sort((a, b) => (a.ys?.[0] ?? 9999) - (b.ys?.[0] ?? 9999));
  body.innerHTML = `<p class="eyebrow">${L('Место', 'Place')}${pl.kind === 'monastery' ? L(' · монастырь', ' · monastery') : pl.kind === 'city' ? L(' · город', ' · town') : pl.kind === 'far' ? L(' · за краем карты', ' · beyond the map') : ''}</p>
    <h2 class="card-title">${esc(pl.name)}</h2>
    ${pl.historic ? `<p class="life">${esc(pl.historic)}</p>` : ''}${pl.today ? `<p class="muted">${L('Сейчас', 'Today')}: ${esc(pl.today)}</p>` : ''}
    ${pl.approx ? `<p class="note">${L('Точка приблизительная.', 'The point is approximate.')} ${esc(pl.approx)}</p>` : ''}
    ${onMap(pl) && pageOpen !== 'map' ? `<div class="card-actions"><button class="focus-btn" data-map-show="${esc(pl.id)}">${L('Показать на карте', 'Show on the map')}</button></div>` : ''}
    <h3>${L('Кто здесь был', 'Who was here')}</h3>
    <ul class="place-people">${people.map(({pid, cs, ys}) => `<li><button class="pp-name" data-person-link="${esc(pid)}">${esc(nameOf(pid))}</button>
      <span class="pp-years">${esc(span(ys))}</span>
      <span class="pp-what">${[...new Set(cs.map(c => c.field))].map(f => { const fs = cs.filter(c => c.field === f); return `${esc(field(f).toLowerCase())} ${fs.slice(0, 3).map(ref).join('')}${fs.length > 3 ? `<small> +${fs.length - 3}</small>` : ''}`; }).join(', ')}</span></li>`).join('')}</ul>
    ${pl.source ? `<p class="muted map-src">${L('Координаты', 'Coordinates')}: <a href="${esc(pl.source.url)}" target="_blank" rel="noopener">${esc(pl.source.title)}</a></p>` : ''}`;
  // On the map the card's place is marked; a place hidden in a circle, or any place on a phone, gets a close view
  // of its own, which goes again with the card.
  if (pageOpen === 'map' && onMap(pl)) {
    if (mapViews[mapViews.length - 1]?.auto) mapViews.pop();
    mapFocus = id;
    if (mapShown) mapCloseIn(id); else mapFocusDue = true;
  }
  return pl.name;
}
function mapCloseIn(id) {
  const seen = drawMap.groups?.find(g => g.members.some(m => m.id === id));
  if (narrow() || !seen || seen.members.length > 1) { mapViews.push(Object.assign([id], {auto: true})); mapHand = false; }
}
body.addEventListener('click', e => {
  const b = e.target.closest('[data-map-show],[data-place-link]'); if (!b) return;
  const id = b.dataset.mapShow || b.dataset.placeLink;
  if (b.dataset.mapShow) { mapViews.length = 0; mapViews.push([id]); mapFocus = id; go({page: 'map', pl: id}, true); }
  else go({pl: id});
});
