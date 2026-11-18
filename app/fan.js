// The page «Веер предков» (Ancestor fan: #fan=<id>): the ancestors of one person as rings of a fan around them — three quarters
// of a circle, the father's side on the left, the mother's on the right, the centre's name in the gap below.
// A place is coloured by the weakest link of its chain from the centre; an empty place next to a known one is a
// dashed «?». Beside the fan: how many are found in each generation and whose parents are missing nearest.
// A click opens the card over the fan; a double click (or the card's button) draws the fan from that person.
// Depends on ancestors.js (the rings), tree.js (measure, fitText), ui.js and panel.js.
'use strict';

let fanId = null, fanData = null, fanItems = [], fanBox = null, fanSelected = null, fanFocus = '0:0', fanTap = {}, fanDrawn = '', fanWait = 0;
// The view of the fan: moved by x, y and zoomed by k over the laid-out fan; {0, 0, 1} is the fan fitted to its room.
const fanV = {x: 0, y: 0, k: 1};
const FAN_SPAN = Math.PI * 1.5;
// Inner rings get more room: they are the ones read at a glance; the far ones are colour first.
const FAN_WEIGHT = [1.5, 1.35, 1.2, 1, .72, .55, .45, .4];
const FAN_FONT = [15, 15, 14, 13, 12, 12, 11, 11, 10];
const fanYears = id => MERGE_OF.has(id) ? MERGE_OF.get(id).years || life(P.get(id)) : life(P.get(id));
const fanAt = (r, t) => `${(fanBox.cx + r * Math.sin(t)).toFixed(1)},${(fanBox.cy - r * Math.cos(t)).toFixed(1)}`;
function fanSector(a, b, t0, t1) {
  const big = t1 - t0 > Math.PI ? 1 : 0;
  return `M${fanAt(b, t0)}A${b},${b} 0 ${big} 1 ${fanAt(b, t1)}L${fanAt(a, t1)}A${a},${a} 0 ${big} 0 ${fanAt(a, t0)}Z`;
}
const fanLevelName = lv => (LEGEND.find(l => l[0] === lv) || [])[1] || '';
// What the reader can send for an empty place: «fa:» the father, «mo:» the mother, «pa:» both parents of a person.
const fanRef = (roles, child) => (roles.length > 1 ? 'pa:' : roles[0] === 'f' ? 'fa:' : 'mo:') + child;
const fanSay = (roles, child) => { const t = fanMissing(roles, child); return t[0].toUpperCase() + t.slice(1); };
// The generations and the empty places in the reader's language: the Russian words come from ancestors.js
// (fanRingName, fanMissingText), the English ones are made here.
const fanOrdinal = n => EN ? n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th') : `${n}-го`;
const FAN_RINGS_EN = ['', 'parents', 'grandparents', 'great-grandparents', 'great-great-grandparents'];
const fanRing = k => EN ? FAN_RINGS_EN[k] || `${fanOrdinal(k)} generation` : fanRingName(k);
const fanMissing = (roles, child) => EN ? `the ${roles.length > 1 ? 'parents' : roles[0] === 'f' ? 'father' : 'mother'} of ${sayName(child)}` : fanMissingText(roles, child);

// ---------- Labels: the richest lines that fit the place at a readable size ----------
// The candidates of a name, richest first; each line {t, w: its width at 13 px, yr: the years}.
function fanCandidates(id) {
  const line = (t, yr) => ({t, w: measure(t, yr ? 400 : 600), yr});
  const parts = nameParts(id), years = fanYears(id), y = years ? [line(years, true)] : [];
  // A name with no surname, only a maiden one: «(Соколова) Анна Ивановна».
  if (parts && !parts.surname && parts.given) {
    const given = line(parts.given), f = line(parts.plain.split(' ')[0] || parts.given), m = parts.maiden ? [line(`(${parts.maiden})`)] : [];
    return [[...m, given, ...y], [...m, given], [given, ...y], [given], [f]];
  }
  if (!parts?.surname) {
    const words = nameOf(id).split(/\s+/);
    return [[line(words.join(' ')), ...y], [line(words.join(' '))], [line(words.slice(0, 2).join(' '))], [line(words[0])]];
  }
  const s = line(parts.surname), first = parts.plain.split(' ')[0] || parts.given, given = line(parts.given || first), f = line(first);
  return [[s, given, ...y], [s, given], [s, f, ...y], [s, f], [line(`${first} ${parts.surname}`)], [s, ...y], [s], [line(`${parts.surname} ${first[0]}.`)], [line(`${first[0]}. ${parts.surname[0]}.`)]];
}
// Whether lines fit the place g {a, b, th, flip} at the font f: tangential (across the radius, lines from the rim
// inwards) or radial (along it). Each line must stay inside both radii and both sides of the place.
function fanFits(g, lines, f, radial) {
  const hs = lines.map(l => (l.yr ? .84 : 1) * f * 1.2), ws = lines.map(l => l.w * (l.yr ? .84 : 1) * f / 13);
  const H = hs.reduce((n, h) => n + h, 0), half = Math.min(g.th / 2, 1.35);
  if (radial) {
    const len = Math.max(...ws), start = (g.a + g.b - len) / 2;
    return len <= g.b - g.a - 6 && H <= 2 * start * Math.tan(half) - 3 && Math.hypot(start + len, H / 2) <= g.b - 2;
  }
  if (H > g.b - g.a - 4) return false;
  let y = -H / 2;
  return lines.every((l, i) => {
    const r = (g.a + g.b) / 2 - (g.flip ? -1 : 1) * (y + hs[i] / 2), lo = r - hs[i] / 2, hi = r + hs[i] / 2;
    y += hs[i];
    return ws[i] / 2 <= Math.min(lo * Math.tan(half) - 3, Math.sqrt(Math.max(0, (g.b - 2) ** 2 - hi ** 2)));
  });
}
// The best label of a place: a comfortable size first, then the richer lines, the bigger font, the less tilt.
function fanLabel(g, cands, fmax) {
  let best = null;
  for (const radial of [false, true]) {
    const turn = radial ? g.deg + (g.deg < 0 ? 90 : -90) : g.deg + (g.flip ? 180 : 0), tilt = Math.abs(((turn % 180) + 270) % 180 - 90);
    for (let c = 0; c < cands.length; c++) {
      const lines = cands[c], yr = lines.some(l => l.yr);
      let f = fmax;
      while (f >= (yr ? 9 : 7) && !fanFits(g, lines, f, radial)) f -= .5;
      if (f < (yr ? 9 : 7)) continue;
      const score = (f >= 10.5 ? 100 : 0) - c * 10 + f - tilt / 30;
      if (!best || score > best.score) best = {score, lines, f, radial, turn};
      if (f >= 10.5) break;
    }
  }
  return best;
}
// The label as SVG: one <text> per line, centred on the middle of the place.
function fanLabelSvg(g, lab) {
  const hs = lab.lines.map(l => (l.yr ? .84 : 1) * lab.f * 1.2), H = hs.reduce((n, h) => n + h, 0), at = fanAt((g.a + g.b) / 2, g.mid);
  let y = -H / 2;
  return lab.lines.map((l, i) => {
    const size = (l.yr ? .84 : 1) * lab.f, base = y + hs[i] / 2 + size * .35;
    y += hs[i];
    return `<text${l.yr ? ' class="yr"' : ''} transform="translate(${at}) rotate(${lab.turn.toFixed(1)})" y="${base.toFixed(1)}" font-size="${size.toFixed(1)}">${esc(l.t)}</text>`;
  }).join('');
}

// ---------- Drawing ----------
// The places as items: a known ancestor, or an empty place (both parents of one person unknown make one item).
function fanItemsOf(fan) {
  const items = [{key: '0:0', k: 0, i: 0, n: 1, id: fan.id, weak: 5}];
  fan.rings.slice(1).forEach(ring => ring.forEach(x => {
    const last = items[items.length - 1];
    if (!x.id && last.k === x.k && !last.id && last.child === x.child && last.i + 1 === x.i) { last.n = 2; last.roles.push(x.role); return; }
    items.push(x.id ? {key: `${x.k}:${x.i}`, k: x.k, i: x.i, n: 1, id: x.id, weak: x.weak, child: x.child} : {key: `${x.k}:${x.i}`, k: x.k, i: x.i, n: 1, id: null, child: x.child, roles: [x.role]});
  }));
  return items;
}
// Laid out for the room the fan has now; drawn again only when the room or the centre changed (or force).
function fanLayout(force) {
  const wrap = $('fan-wrap'), W = wrap.clientWidth, H = wrap.clientHeight;
  if (!fanData || !W || !H) { $('fan-world').innerHTML = ''; fanDrawn = ''; return; }
  if (!force && fanDrawn === `${fanId} ${W} ${H}`) return;
  fanDrawn = `${fanId} ${W} ${H}`;
  const depth = fanData.depth, weights = FAN_WEIGHT.slice(0, depth), sum = weights.reduce((n, w) => n + w, 0);
  let R = Math.min((W - 20) / 2, (H - 20) / (1 + Math.SQRT1_2));
  const r0 = Math.max(20, Math.min(40, R * .11));
  // A shallow fan is not blown up: its first ring is at most 120 px wide.
  const unit = Math.min((R - r0 - 2) / sum, 120 / FAN_WEIGHT[0]);
  R = r0 + 2 + unit * sum;
  fanBox = {cx: W / 2, cy: (H - R * (1 + Math.SQRT1_2)) / 2 + R, r0, R};
  const radii = [0, r0 + 2];
  weights.forEach(w => radii.push(radii[radii.length - 1] + w * unit));
  const sectors = [], edges = [], labels = [];
  fanItems.forEach(it => {
    if (!it.k) return;
    const step = FAN_SPAN / 2 ** it.k, t0 = -FAN_SPAN / 2 + it.i * step, t1 = t0 + step * it.n, a = radii[it.k], b = radii[it.k + 1];
    const mid = (t0 + t1) / 2, deg = mid * 180 / Math.PI;
    Object.assign(it, {a, b, t0, t1, d: fanSector(a + .5, b - .5, t0 + .4 / b, t1 - .4 / b)});
    if (it.id) {
      const ring = fanRing(it.k), father = it.i < 2 ** (it.k - 1);
      const where = it.k === 1 ? (it.i ? L('Мать', 'Mother') : L('Отец', 'Father')) : `${ring[0].toUpperCase() + ring.slice(1)}, ${L(`сторона ${father ? 'отца' : 'матери'}`, `${father ? 'father' : 'mother'}’s side`)}`;
      const title = `${nameOf(it.id)}${fanYears(it.id) ? ', ' + fanYears(it.id) : ''}. ${where}. ${L('Самая слабая связь на пути', 'The weakest link on the way')}: ${fanLevelName(it.weak).toLowerCase()}`;
      sectors.push(`<path class="fan-sec w${it.weak}" data-fan-slot="${it.key}" d="${it.d}" tabindex="-1" role="button" aria-label="${esc(title)}"><title>${esc(title)}</title></path>`);
      edges.push(`<path class="fan-edge lvl${it.weak}" d="M${fanAt(a + 1.5, t0 + 1.5 / a)}A${a + 1.5},${a + 1.5} 0 0 1 ${fanAt(a + 1.5, t1 - 1.5 / a)}"/>`);
      const g = {a, b, th: t1 - t0, mid, deg, flip: Math.abs(deg) > 90};
      const lab = fanLabel(g, fanCandidates(it.id), FAN_FONT[it.k]);
      if (lab) labels.push(`<g class="fan-lab${it.weak <= 2 ? ' halo' : ''}">${fanLabelSvg(g, lab)}</g>`);
    } else {
      const title = `${L('Неизвестно', 'Unknown')}: ${fanMissing(it.roles, it.child)}. ${L('Знаете — напишите нам', 'If you know, write to us')}`;
      sectors.push(`<path class="fan-sec empty" data-fan-slot="${it.key}" d="${it.d}" tabindex="-1" role="button" aria-label="${esc(title)}"><title>${esc(title)}</title></path>`);
      const q = Math.min(16, (b - a) * .6, (a * (t1 - t0)) * .8);
      if (q >= 7) labels.push(`<text class="fan-q" transform="translate(${fanAt((a + b) / 2, mid)})" y="${(q * .35).toFixed(1)}" font-size="${q.toFixed(1)}">?</text>`);
    }
  });
  // The centre: a disc with the initials; the name, given name and years in the gap below.
  const c = fanData.id, parts = nameParts(c), title = `${nameOf(c)}${fanYears(c) ? ', ' + fanYears(c) : ''} — ${L('центр веера', 'the centre of the fan')}`;
  const initials = parts?.surname ? `${(parts.plain || parts.given || '?')[0]}${parts.surname[0]}` : nameOf(c)[0];
  const under = parts?.surname ? [[parts.surname, 15, 600], [parts.given, 13, 400], [fanYears(c), 12, 400]] : [[nameOf(c), 14, 600], [fanYears(c), 12, 400]];
  // The gap widens downwards (its sides are at 45°): the lines go as far down as the widest of them needs, within
  // the fan's own height.
  const rows = under.filter(u => u[0]), room = (y, size) => 2 * (y - size * .75) - 6;
  let y = r0 + 8;
  const at = rows.map(([t, size, weight]) => { y += size * 1.3; return {t, size, weight, y, need: (measure(t, weight) * size / 13 + 6) / 2 + size * .75}; });
  const shift = Math.max(0, Math.min(R * Math.SQRT1_2 - y, Math.max(...at.map(a => a.need - a.y))));
  const names = at.map(({t, size, weight, y}, i) => `<text class="fan-centre-name${i ? ' sub' : ''}" x="${fanBox.cx.toFixed(1)}" y="${(fanBox.cy + y + shift).toFixed(1)}" font-size="${size}" font-weight="${weight}">${esc(fitText(t, room(y + shift, size), size, weight))}</text>`).join('');
  sectors.unshift(`<circle class="fan-sec fan-centre" data-fan-slot="0:0" cx="${fanBox.cx.toFixed(1)}" cy="${fanBox.cy.toFixed(1)}" r="${r0}" tabindex="0" role="button" aria-label="${esc(title)}"><title>${esc(title)}</title></circle>`);
  labels.push(`<text class="fan-initials" x="${fanBox.cx.toFixed(1)}" y="${(fanBox.cy + r0 * .17).toFixed(1)}" font-size="${(r0 * .5).toFixed(1)}">${esc(initials)}</text>`, names);
  fanApply();
  $('fan-world').innerHTML = `<g class="fan-secs">${sectors.join('')}</g><g class="fan-edges" aria-hidden="true">${edges.join('')}</g><g class="fan-labels" aria-hidden="true">${labels.join('')}</g><g class="fan-hi" aria-hidden="true"></g>`;
  fanRove(fanFocus, false);
  fanHilite();
}
// The open card's person and the keyboard's place, outlined over the fan (a stroke of the place itself would hide
// under its neighbours).
function fanHilite() {
  const hi = $('fan-world').querySelector('.fan-hi');
  if (!hi) return;
  const outline = (it, cls) => it.k ? `<path class="${cls}" d="${it.d}"/>` : `<circle class="${cls}" cx="${fanBox.cx.toFixed(1)}" cy="${fanBox.cy.toFixed(1)}" r="${fanBox.r0}"/>`;
  const kb = $('fan-svg').contains(document.activeElement) && document.activeElement.matches(':focus-visible') ? fanItems.find(it => it.key === fanFocus) : null;
  hi.innerHTML = fanItems.filter(it => it.id && it.id === fanSelected).map(it => outline(it, 'sel')).join('') + (kb ? outline(kb, 'kb') : '');
}

// ---------- The side: counts by generation, the colours, the nearest empty places ----------
function fanSide() {
  const side = $('fan-side');
  if (!fanData) {
    side.innerHTML = `<p class="fan-none">${fanId && P.has(fanId) ? `${esc(sayName(fanId))}: ${L('веер не строится.', 'no fan can be drawn.')}` : L('Человек не найден.', 'Person not found.')} ${L('Веер строится для взрослых людей древа, у которых известен хотя бы один из родителей.', 'A fan is drawn for the grown-ups of the tree with at least one known parent.')}</p>`;
    return;
  }
  const f = fanData, n = f.missing.length, near = f.missing.slice(0, 6);
  const by = touchScreen() ? L('Коснитесь имени — откроется карточка, двойное касание — веер от этого человека.', 'Tap a name to open the card; tap twice to draw the fan from that person.')
    : L('Нажмите на имя — откроется карточка, двойной клик — веер от этого человека. Стрелки переходят по местам веера.', 'Click a name to open the card; double-click to draw the fan from that person. The arrow keys move between the places of the fan.');
  side.innerHTML = `<p class="eyebrow">${L('Предки', 'Ancestors')}</p><h3 class="fan-who"><button class="linklike" data-fan-card="${esc(f.id)}">${esc(nameOf(f.id))}</button></h3>
    <p class="fan-hint">${L('Каждое кольцо — колено: отец слева, мать справа.', 'Each ring is a generation: the father on the left, the mother on the right.')} ${esc(by)}</p>
    <h4>${L('Найдено по коленам', 'Found by generation')}</h4>
    <ul class="fan-counts">${f.counts.map(c => `<li><span>${esc(fanRing(c.k))}</span><b>${c.found} ${L('из', 'of')} ${c.max}</b><i style="width:${(100 * c.found / c.max).toFixed(1)}%"></i></li>`).join('')}</ul>
    <p class="fan-total"><b>${f.found} ${L('из', 'of')} ${f.max}</b> ${L(`до ${fanOrdinal(f.depth)} колена`, `up to the ${fanOrdinal(f.depth)} generation`)}</p>
    <h4>${L('Цвет — самая слабая связь на пути от центра', 'Colour: the weakest link on the way from the centre')}</h4>
    <ul class="fan-key">${LEGEND.map(([lv, name]) => `<li><svg viewBox="0 0 22 14" aria-hidden="true"><rect class="fan-sec w${lv}" x="1" y="1" width="20" height="12" rx="2"/></svg>${esc(name)}</li>`).join('')}
      <li><svg viewBox="0 0 22 14" aria-hidden="true"><rect class="fan-sec empty" x="1" y="1" width="20" height="12" rx="2"/><text class="fan-q" x="11" y="11" font-size="10">?</text></svg>${L('Место пустое: человек неизвестен', 'An empty place: the person is unknown')}</li></ul>
    ${n ? `<h4>${L('Кого не хватает ближе всего', 'Who is missing nearest')}</h4>
    <ul class="fan-missing">${near.map(m => `<li><span>${esc(fanSay(m.roles, m.child))}</span><button data-fan-send="${esc(fanRef(m.roles, m.child))}">${L('Знаю', 'I know')}</button></li>`).join('')}</ul>
    ${n > near.length ? `<p class="fan-more">${L(`И ещё ${n - near.length} ${n - near.length === 1 ? 'пустое место' : 'пустых мест'} дальше по кольцам.`, `And ${n - near.length} more empty ${n - near.length === 1 ? 'place' : 'places'} further out.`)}</p>` : ''}` : `<p class="fan-more">${L('Пустых мест рядом с известными нет.', 'No empty places next to the known ones.')}</p>`}`;
}
function fanBuild(id) {
  fanId = id;
  fanData = fanCan(id) ? fanOf(id) : null;
  fanItems = fanData ? fanItemsOf(fanData) : [];
  fanFocus = '0:0';
  fanSide();
  fanFit();
  fanLayout(true);
  $('fan-side').scrollTop = 0;
}

// ---------- Reading the fan: clicks, double clicks, the keyboard ----------
// One Tab stop for the whole fan; the arrows go along a ring (← →), outwards (↑) and inwards (↓).
function fanRove(key, focusIt = true) {
  const el = $('fan-world').querySelector(`[data-fan-slot="${key}"]`) || $('fan-world').querySelector('[data-fan-slot="0:0"]');
  if (!el) return;
  fanFocus = el.dataset.fanSlot;
  $('fan-world').querySelectorAll('[data-fan-slot]').forEach(s => s.setAttribute('tabindex', s === el ? '0' : '-1'));
  if (focusIt) el.focus({preventScroll: true});
}
function fanStep(key, how) {
  const it = fanItems.find(x => x.key === key);
  if (!it) return null;
  const ring = fanItems.filter(x => x.k === it.k), at = ring.indexOf(it);
  // A place's span in the units of the ring k: places i…i+n-1 of 2^k.
  const span = (x, k) => [x.i * 2 ** (k - x.k), (x.i + x.n) * 2 ** (k - x.k)];
  if (how === 'ArrowLeft') return ring[at - 1]?.key;
  if (how === 'ArrowRight') return ring[at + 1]?.key;
  if (how === 'Home') return ring[0].key;
  if (how === 'End') return ring[ring.length - 1].key;
  if (how === 'ArrowUp') { const [lo, hi] = span(it, it.k + 1); return fanItems.find(x => x.k === it.k + 1 && x.i < hi && x.i + x.n > lo)?.key; }
  if (how === 'ArrowDown') return it.k ? fanItems.find(x => x.k === it.k - 1 && (() => { const [lo, hi] = span(x, it.k); return it.i >= lo && it.i < hi; })())?.key : null;
  return null;
}
function fanOpen(key, again) {
  const it = fanItems.find(x => x.key === key);
  if (!it) return;
  if (!it.id) { go({page: 'fan', fan: fanId, send: fanRef(it.roles, it.child)}); return; }
  if (again && it.id !== fanId && fanCan(it.id)) { stack.length = 0; go({page: 'fan', fan: it.id}); return; }
  go({p: it.id});
}
function fanTapOn(key) {
  const now = Date.now(), again = fanTap.key === key && now - fanTap.t < 400;
  fanTap = again ? {} : {key, t: now};
  fanRove(key, false);
  fanOpen(key, again);
}
// A tap (a pointer that went down and up without moving) opens the place; a click without a pointer (assistive
// technology) too.
$('fan-svg').addEventListener('click', e => { const t = e.target.closest('[data-fan-slot]'); if (t && !e.detail) fanTapOn(t.dataset.fanSlot); });

// ---------- Zoom: drag, the wheel, a pinch, the buttons «+», «−», «вписать» (fit) ----------
function fanApply() { if (document.body.classList.contains('printing-fan')) return; $('fan-world').setAttribute('transform', `translate(${fanV.x.toFixed(1)},${fanV.y.toFixed(1)}) scale(${fanV.k.toFixed(4)})`); }
function fanFit() { Object.assign(fanV, {x: 0, y: 0, k: 1}); fanApply(); }
function fanZoom(k, cx, cy) {
  k = Math.max(.5, Math.min(10, k));
  fanV.x = cx - (cx - fanV.x) * k / fanV.k; fanV.y = cy - (cy - fanV.y) * k / fanV.k; fanV.k = k; fanApply();
}
const fanMid = f => { const w = $('fan-wrap'); fanZoom(fanV.k * f, w.clientWidth / 2, w.clientHeight / 2); };
panZoom($('fan-svg'), {
  view: () => fanV, slop: 6,
  down(e, g) { g.slot = e.target.closest('[data-fan-slot]')?.dataset.fanSlot; },
  pan(e, g, dx, dy) { $('fan-svg').classList.add('dragging'); fanV.x = g.view.x + dx; fanV.y = g.view.y + dy; fanApply(); },
  pinch: (g, d, x, y) => fanZoom(g.pinch.k * d / g.pinch.d, x, y),
  up(e, g, n) {
    $('fan-svg').classList.remove('dragging');
    if (g && !n && !g.moved && g.slot) fanTapOn(g.slot);
  },
});
wheelZoom($('fan-svg'), {zoomBy: (f, x, y) => fanZoom(fanV.k * f, x, y), panBy(dx, dy) { fanV.x -= dx; fanV.y -= dy; fanApply(); }});
$('fan-zoom').addEventListener('click', e => {
  const b = e.target.closest('[data-fan-zoom]');
  if (b) ({in: () => fanMid(1.4), out: () => fanMid(1 / 1.4), fit: fanFit})[b.dataset.fanZoom]();
});
$('fan-svg').addEventListener('keydown', e => {
  if (e.key === '+' || e.key === '=') { fanMid(1.4); return; }
  if (e.key === '-' || e.key === '_') { fanMid(1 / 1.4); return; }
  if (e.key === '0') { fanFit(); return; }
  const t = e.target.closest('[data-fan-slot]');
  if (!t) return;
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fanOpen(t.dataset.fanSlot, false); return; }
  const next = fanStep(t.dataset.fanSlot, e.key);
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) e.preventDefault();
  if (next) { fanRove(next); fanHilite(); }
});
$('fan-svg').addEventListener('focusin', fanHilite);
$('fan-svg').addEventListener('focusout', () => setTimeout(fanHilite));
$('fan-side').addEventListener('click', e => {
  const t = e.target.closest('[data-fan-send],[data-fan-card]');
  if (!t) return;
  if (t.dataset.fanSend) go({page: 'fan', fan: fanId, send: t.dataset.fanSend});
  else go({p: t.dataset.fanCard});
});
// The card's button «Веер предков» (Ancestor fan, panel.js) and «Веер моих предков» (My ancestor fan) in the menu «⋯»
// of the tree.
body.addEventListener('click', e => { const b = e.target.closest('[data-fan-open]'); if (b) { stack.length = 0; go({page: 'fan', fan: cid(b.dataset.fanOpen)}); } });
$('fan-mine').addEventListener('click', () => { if (me) { stack.length = 0; go({page: 'fan', fan: me}); } });
window.addEventListener('resize', () => { if (pageOpen === 'fan' && !printing) fanLayout(); });

registerPage('fan', {
  el: 'fan-page', again: true,
  show(route) {
    const id = route.fan && P.has(route.fan) ? cid(route.fan) : route.fan ? route.fan : fanId || me || ROOT;
    fanSelected = route.p && P.has(route.p) ? cid(route.p) : null;
    if (id !== fanId) fanBuild(id); else fanLayout();
    fanHilite();
    // A page that has no size yet is drawn once it is laid out.
    if (!$('fan-wrap').clientWidth) requestAnimationFrame(() => fanLayout());
  },
  state: () => ({fan: fanId}),
  parse(v, route) { if (v) route.fan = decodeURIComponent(v); },
  hash: route => route.fan ? `fan=${encodeURIComponent(route.fan)}` : 'fan',
  // The card opening beside the fan narrows it: right after a click on the fan the fan waits a moment, so the second
  // click of a double click still finds the same place.
  redraw() { clearTimeout(fanWait); const wait = 420 - (Date.now() - (fanTap.t || 0)), fit = () => { fanFit(); fanLayout(); }; if (wait > 0) fanWait = setTimeout(fit, wait); else fit(); },
  cardClosed() { fanSelected = null; fanFit(); fanHilite(); },
});

// ---------- Print: the whole fan on A4 landscape, its title, the counts and the colours (book.js calls these) ----------
$('fan-print').addEventListener('click', () => window.print());
function fanPrintStart() {
  const svg = $('fan-svg'), world = $('fan-world');
  world.removeAttribute('transform');
  if (fanData) {
    const b = world.getBBox(), pad = 6;
    svg.setAttribute('viewBox', `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }
  const f = fanData;
  $('fan-print-head').textContent = f ? `${L('Предки', 'Ancestors')}: ${nameOf(f.id)}` : L('Веер предков', 'Ancestor fan');
  $('fan-print-foot').innerHTML = f ? `<p>${L('Найдено по коленам', 'Found by generation')}: ${esc(f.counts.map(c => `${fanRing(c.k)} ${c.found} ${L('из', 'of')} ${c.max}`).join(' · '))}; ${L(`всего ${f.found} из ${f.max} до ${fanOrdinal(f.depth)} колена.`, `in all ${f.found} of ${f.max} up to the ${fanOrdinal(f.depth)} generation.`)}</p>
    <p class="fan-print-key">${LEGEND.map(([lv, name]) => `<i><svg viewBox="0 0 22 14" aria-hidden="true"><rect class="fan-sec w${lv}" x="1" y="1" width="20" height="12" rx="2"/></svg>${esc(name)}</i>`).join('')}<i><svg viewBox="0 0 22 14" aria-hidden="true"><rect class="fan-sec empty" x="1" y="1" width="20" height="12" rx="2"/></svg>${L('Место пустое', 'An empty place')}</i></p>` : '';
  document.body.classList.add('printing-fan');
}
function fanPrintEnd() {
  document.body.classList.remove('printing-fan');
  $('fan-svg').removeAttribute('viewBox'); $('fan-svg').removeAttribute('preserveAspectRatio');
  fanApply();
}
