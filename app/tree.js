// The tree on the screen: cards, lines, branch areas and pills, the path of «Кем приходится», moving and zooming
// the tree, and the keyboard on it. Depends on everything above (layout.js for positions, ui.js, panzoom.js).
'use strict';

// ---------- Drawing ----------
// Names wrap by their rendered width (the card font), so wide letters never cross the card edge.
const measure = (() => {
  const ctx = document.createElement('canvas').getContext('2d'), family = getComputedStyle(document.body).fontFamily;
  return (t, weight = 600) => { ctx.font = `${weight} 13px ${family}`; return ctx.measureText(t).width; };
})();
function wrap(name, first = W - 28, rest = W - 28) {
  const words = name.split(/\s+/), out = [];
  let cur = '';
  const room = () => out.length ? rest : first;
  for (const w of words) {
    const next = (cur + ' ' + w).trim();
    if (measure(next) > room() && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  if (out.length > 2) out.splice(1, out.length - 1, out.slice(1).join(' '));
  // The last line is shortened with an ellipsis until it fits.
  for (let i = 0; i < out.length; i++) {
    const max = i ? rest : first;
    if (measure(out[i]) <= max) continue;
    let t = out[i];
    while (t.length > 1 && measure(t + '…') > max) t = t.slice(0, -1);
    out[i] = t.trimEnd() + '…';
  }
  return out;
}
// A round badge on the card's top-right corner, clear of the name.
const CROSS = '<g class="cross" transform="translate(%X,0)" aria-hidden="true"><circle r="15"/><path transform="translate(-5.6,-9) scale(.8)" d="M7 0V22M4 3.5H10M1 8H13M3.5 17L10.5 14"/></g>';
// Card text: see nameParts (family.js).
// The text fits the width, cut with an ellipsis.
const fitText = (t, room, size = 13, weight = 600) => { const w = x => measure(x, weight) * size / 13; if (w(t) <= room) return t; while (t.length > 1 && w(t + '…') > room) t = t.slice(0, -1); return t.trimEnd() + '…'; };
function cardText(id, lifeText) {
  const room = W - 28, first = canonized.has(id) ? W - 46 : room, parts = nameParts(id);
  // The years leave the bottom right corner to the ⚑ of a card with an open conflict.
  const yearsAt = y => lifeText ? `<text class="years" x="14" y="${y}">${esc(fitText(lifeText, FLAGGED.has(id) ? room - 16 : room, 12, 400))}</text>` : '';
  if (!parts) {
    const name = wrap(rawName(id), first, room);
    return name.map((t, i) => `<text class="name" x="14" y="${(lifeText ? 24 : 30) + i * 17}">${esc(t)}</text>`).join('') + yearsAt(name.length > 1 ? 62 : 46);
  }
  const lines = [];
  if (parts.surname || parts.maiden) {
    const head = fitText(parts.surname, first);
    const rest = parts.maiden ? fitText(`(${parts.maiden})`, Math.max(0, first - measure(head + ' ')), 13, 500) : '';
    lines.push(`<tspan class="surname">${esc(head)}</tspan>${rest ? `<tspan class="maiden">${parts.surname ? ' ' : ''}${esc(rest)}</tspan>` : ''}`);
  }
  // A bracketed addition that does not fit («(Серафим)») is left to the open card.
  const givenRoom = lines.length ? room : first, given = measure(parts.given, 500) <= givenRoom ? parts.given : parts.plain;
  // A long given name and patronymic («Екатерина Александровна») first gets a slightly smaller letter.
  const small = measure(given, 500) > givenRoom && measure(given, 500) * 12 / 13 <= givenRoom;
  if (given) lines.push(`<tspan class="given"${small ? ' style="font-size:12px"' : ''}>${esc(fitText(given, givenRoom, small ? 12 : 13, 500))}</tspan>`);
  const top = lines.length > 1 ? 24 : lifeText ? 28 : 40;
  return lines.map((t, i) => `<text class="name" x="14" y="${top + i * 17}">${t}</text>`).join('') + yearsAt(lines.length > 1 ? 62 : 48);
}
// New stories for this reader: the browser keeps a hash of each card's story (with its merged records) as of the
// reader's first visit and of every card opened since. A card whose story is new or rewritten after that has a dot in
// its corner until it is opened; the open card then says «new» or «rewritten». The hash is of the site's own language.
// The stories do not change while the page lives, and draw() asks for every card at each redraw: hash each once.
const storyHashes = new Map();
const storyHash = id => {
  if (!storyHashes.has(id)) { const t = [id, ...(MERGE_OF.get(id)?.members || [])].map(r => baseText(BASE.stories[r]?.text) || '').join('\n'); storyHashes.set(id, t.trim() ? textHash(t) : ''); }
  return storyHashes.get(id);
};
const storiesRead = (() => {
  try {
    const kept = localStorage.getItem('storiesRead');
    if (kept) return JSON.parse(kept);
    // A first visit: every story there is now counts as known, so only later ones are new.
    const m = {}; for (const id of P.keys()) { const h = storyHash(id); if (h) m[id] = h; }
    localStorage.setItem('storiesRead', JSON.stringify(m));
    return m;
  } catch (_) { return null; }
})();
const storyNew = id => { const h = storyHash(id); return !!storiesRead && !!h && storiesRead[id] !== h; };
let storyTag = null;
function storyRead(id) {
  if (!storyNew(id)) return;
  storyTag = {id, text: storiesRead[id] ? L('дописана', 'rewritten') : L('новая', 'new')};
  storiesRead[id] = storyHash(id);
  try { localStorage.setItem('storiesRead', JSON.stringify(storiesRead)); } catch (_) {}
  document.querySelector(`#nodes [data-person="${CSS.escape(id)}"] .new-dot`)?.remove();
}
// The tree is one stop of Tab (a roving tabindex): the card the keyboard last stood on, else the open card, the
// reader or the root; the arrows move between the cards. The ⚑, «+N» and branch pills of that card come next in the
// order of Tab; those of the other cards are for the mouse and fingers (and come in turn with their card).
let roveId = null;
const CARD_KEYS = '[data-flag],[data-expand],[data-group-open]';
const tabStop = set => [roveId, current?.p && cid(current.p), home(), activeGroup && GROUP.get(activeGroup).head].find(id => id && set.has(id)) || set.values().next().value;
function setRove(id) {
  const el = id && document.querySelector(`#nodes [data-person="${CSS.escape(id)}"]`);
  if (!el) return;
  roveId = id;
  document.querySelectorAll('#nodes [data-person][tabindex="0"]').forEach(n => { if (n !== el) n.setAttribute('tabindex', '-1'); });
  el.setAttribute('tabindex', '0');
  $('nodes').querySelectorAll(CARD_KEYS).forEach(n => n.setAttribute('tabindex', el.contains(n) ? '0' : '-1'));
}
function draw(shown, lines) {
  // Weaker lines first so a shared stretch shows the stronger style on top.
  const order = lines.slice().sort((a, b) => level(a.best.status) - level(b.best.status));
  $('edges').innerHTML = order.map(l => `<path class="hit" data-line="${esc(l.key)}" d="${l.d}"><title>${esc(lineTitle(l))}: ${esc(label(l.best.status))}</title></path><path class="edge ${lineClass(l)}" data-edge="${esc(l.key)}" d="${l.d}"/>`).join('');
  $('edges').innerHTML += order.filter(l => l.hypothesis).map(l => `<text class="hypothesis-label" x="${l.caption.x}" y="${l.caption.y}" text-anchor="middle">${esc(l.hypothesis.caption)}</text>`).join('');
  const stop = tabStop(shown);
  $('nodes').innerHTML = [...shown].map(id => {
    const p = P.get(id), {x, y} = pos.get(id);
    const age = MERGE_OF.has(id) ? '' : ageText(p);
    const lifeText = (MERGE_OF.has(id) ? (MERGE_OF.get(id).years || life(p)) : life(p)) + (age ? ' · ' + age : '');
    const tab = id === stop ? 0 : -1, saint = canonized.has(id), badge = hiddenBadge(id, shown, tab), fresh = storyNew(id);
    return `<g class="node${id === ROOT ? ' root' : ''}${saint ? ' saint' : ''}" data-person="${esc(id)}" transform="translate(${x},${y})" tabindex="${tab}" role="button" aria-label="${esc(nameOf(id))} ${esc(lifeText)}${saint ? L(', прославлен Церковью', ', glorified by the Church') : ''}${fresh ? L(', новое в истории', ', new in the story') : ''}">
      <rect class="card" width="${W}" height="${H}" rx="10"/>
      ${fresh ? `<circle class="new-dot" cx="3" cy="3" r="5.5"><title>${L('Новое в истории жизни', 'New in the life story')}</title></circle>` : ''}
      ${cardText(id, lifeText)}
      ${saint ? CROSS.replace('%X', W - 8) : ''}
      ${conflictFlag(id, badge, tab)}${badge}${groupPills(id, shown, tab)}
    </g>`;
  }).join('');
}

// Bring the given cards into view together (the panel's part of the screen left free on phones).
function fitPeople(ids, maxK = 1) {
  const ps = ids.map(id => pos.get(cid(id))).filter(Boolean);
  if (!ps.length) return;
  const x0 = Math.min(...ps.map(p => p.x)), x1 = Math.max(...ps.map(p => p.x)) + W;
  const y0 = Math.min(...ps.map(p => p.y)), y1 = Math.max(...ps.map(p => p.y)) + H;
  const r = stageBox(), pad = 40, top = 68;
  const visibleH = narrow() && panel.dataset.state !== 'closed' ? r.height * .45 : r.height;
  view.k = Math.max(.12, Math.min(maxK, (r.width - pad * 2) / (x1 - x0), (visibleH - top - pad) / (y1 - y0)));
  view.x = r.width / 2 - (x0 + x1) / 2 * view.k; view.y = top + (visibleH - top) / 2 - (y0 + y1) / 2 * view.k; handMoved = false; apply();
}
// The last drop of a straight child line: its x, the bar it hangs from and the card's top.
const childDrop = l => { const m = /M([-\d.]+),([-\d.]+) V([-\d.]+)\s*$/.exec(l.d || ''); return m && {x: +m[1], bar: +m[2], y: +m[3]}; };
function markPath(steps, from) {
  // A common parent of a brother and sister is passed through, not a person on the path: their card stays
  // pale, and of their lines only the stretch between the two of them is drawn over, along the shared bar.
  const read = readableSteps(steps || []), keys = new Set(), over = [];
  const people = new Set([from, ...read.map(s => s.to)]);
  read.forEach(s => {
    const [a, b] = s.pair || [], da = a && childDrop(a), db = b && childDrop(b);
    if (!da || !db) { (s.pair || [s.line]).forEach(l => keys.add(l.key)); return; }
    const weak = level(a.best.status) <= level(b.best.status) ? a : b, bar = Math.max(da.bar, db.bar);
    over.push(`<path class="edge on-path ${lineClass(weak)}" d="M${da.x},${da.y} V${bar} H${db.x} V${db.y}"/>`);
  });
  $('path-overlay').innerHTML = over.join('');
  document.querySelectorAll('.node').forEach(n => { const on = people.has(n.dataset.person); n.classList.toggle('on-path', on); n.classList.toggle('off-path', !on); });
  document.querySelectorAll('#edges .edge').forEach(e => { const on = keys.has(e.dataset.edge); e.classList.toggle('on-path', on); e.classList.toggle('off-path', !on); });
}
function clearPath() { document.querySelectorAll('#nodes .on-path,#nodes .off-path,#edges .on-path,#edges .off-path').forEach(n => n.classList.remove('on-path', 'off-path')); $('path-overlay').innerHTML = ''; }

// Where a «+N» counts from: relatives in the shown branches (a folded branch has its own pill); in focus, all.
let badgePool = null;
// The size of the drawn tree, for fitting it to the screen.
let bounds = {w: 1, h: 1};
// A quiet ⚑ in the bottom right corner (the top right holds the cross of a saint) for a person with an open
// conflict; a tap opens the card on «Расхождения». It moves left of a focus badge «+N», which takes the corner.
// tab: the tabindex of the card's own buttons, 0 on the card that is the stop of Tab (see setRove).
function conflictFlag(id, badge, tab = -1) {
  if (!FLAGGED.has(id)) return '';
  return `<g class="xflag" data-flag="${esc(id)}" transform="translate(${badge ? W - 42 : W - 13},${H - 12})" tabindex="${tab}" role="button" aria-label="${L('Записи расходятся — открыть раздел «Расхождения»', 'Records disagree — open «Disagreements»')}"><title>${L('Записи о человеке расходятся', 'Records about this person disagree')}</title><rect x="-13" y="-13" width="26" height="26" rx="6"/><text x="0" y="5" text-anchor="middle">⚑</text></g>`;
}
function hiddenBadge(id, set, tab = -1) {
  const out = id => relativesOf(id).filter(x => !set.has(x) && (focus || badgePool.has(x)));
  const mine = out(id), n = mine.length;
  // A couple's common children are counted once, on the right card of the two.
  const p = pos.get(id), partner = n && relativesOf(id).find(x => set.has(x) && pos.get(x)?.y === p.y && Math.abs(pos.get(x).x - p.x - W - SG) < 1);
  if (partner && mine.every(x => out(partner).includes(x))) return '';
  return n ? `<g class="expand" data-expand="${esc(id)}" transform="translate(${W - 4},${H - 4})" tabindex="${tab}" role="button" aria-label="${L('Показать скрытых родственников', 'Show hidden relatives')}: ${n}"><title>${L('Показать скрытых родственников', 'Show hidden relatives')} (${n})</title><rect x="-22" y="-11" width="40" height="22" rx="11"/><text x="-2" y="4" text-anchor="middle">+${n}</text></g>` : '';
}
// With one branch picked, a card whose parents (or brothers, children) are in a folded branch
// carries a pill with that branch's name just above (or below) it; the pill opens the whole branch.
// Each pill names the folded branch that holds most of the remaining relatives, the first in order on a tie.
function groupPills(id, set, tab = -1) {
  if (allGroupsShown() || focus || !inTree.has(id)) return '';
  let hidden = relativesOf(id).filter(x => inTree.has(x) && !set.has(x));
  const ups = new Set(parentsOf(id)), folded = GROUPS.filter(g => !visibleGroups().has(g.id)), pills = [];
  while (hidden.length) {
    const [g, xs] = folded.map(g => [g, hidden.filter(x => shownIn.get(x).has(g.id))]).sort((a, b) => b[1].length - a[1].length)[0] || [];
    if (!xs?.length) break;
    pills.push({g, above: xs.some(x => ups.has(x))});
    hidden = hidden.filter(x => !xs.includes(x));
  }
  return pills.map(({g, above}, i) => {
    const n = [...inTree].filter(x => !set.has(x) && shownIn.get(x).has(g.id)).length;
    const text = `${above ? '↑' : '↓'} ${g.title} · ${n}`, w = Math.ceil(measure(text) * 12 / 13) + 24;
    const same = pills.filter(p => p.above === above), x = W * (same.indexOf(pills[i]) + 1) / (same.length + 1);
    return `<g class="group-pill" data-group-open="${esc(g.id)}" style="--pill:var(--g-${esc(g.id)}-ink)" transform="translate(${x},${above ? -17 : H + 17})" tabindex="${tab}" role="button" aria-label="${L('Показать ветку', 'Show the branch')} «${esc(g.title)}»: ${L('ещё', 'more')} ${n}">
      <title>${L('Показать ветку', 'Show the branch')} «${esc(g.title)}» (${L('ещё', 'more')} ${n})</title>${above ? '<path d="M0,-12 V-50"/>' : ''}
      <rect x="${-w / 2}" y="-12" width="${w}" height="24" rx="12"/><text y="4" text-anchor="middle">${esc(text)}</text></g>`;
  }).join('');
}
// Branch colours behind the cards: a soft area over each run of neighbouring cards of one branch
// in a generation, so the sides of the family read as regions. A region's name stands over its top.
function groupAreas() {
  const rows = new Map();
  // A row is a generation: a block of children belongs to the row it hangs from. The row's band covers its
  // top cards; the lower rows of a block get their own patches (below), so no band grows into empty space.
  const patches = [];
  pos.forEach((p, id) => {
    if (!homeOf.has(id)) return;
    const y = p.row ?? p.y;
    if (y !== p.y) { patches.push({x: p.x, y: p.y, g: homeOf.get(id)}); return; }
    if (!rows.has(y)) rows.set(y, []); rows.get(y).push({id, x: p.x, g: homeOf.get(id)});
  });
  const ys = [...rows.keys()].sort((a, b) => a - b), runs = [];
  ys.forEach((y, row) => {
    let run = null;
    rows.get(y).sort((a, b) => a.x - b.x).forEach(c => {
      if (run && run.g === c.g && c.x - run.x1 <= 90) { run.x1 = c.x + W; run.ids.push(c.id); }
      else runs.push(run = {g: c.g, x0: c.x, x1: c.x + W, y, row, ids: [c.id]});
    });
  });
  // Runs of one branch that touch across neighbouring generations form one region.
  const root = runs.map((_, i) => i), find = i => root[i] === i ? i : (root[i] = find(root[i]));
  runs.forEach((a, i) => runs.forEach((b, j) => { if (j > i && a.g === b.g && b.row === a.row + 1 && a.x0 < b.x1 + 36 && b.x0 < a.x1 + 36) root[find(j)] = find(i); }));
  const regions = new Map();
  runs.forEach((r, i) => { const k = find(i); if (!regions.has(k)) regions.set(k, []); regions.get(k).push(r); });
  const PX = 18, PY = 70;
  // The names that fold a branch are one stop of Tab, the first of them; the arrows go along them (stepName).
  let tabName = 0;
  const areas = runs.map(r => `<rect x="${r.x0 - PX}" y="${r.y - PY}" width="${r.x1 - r.x0 + PX * 2}" height="${H + PY * 2}" rx="22" style="fill:var(--g-${r.g})"/>`).join('')
    + patches.map(c => `<rect x="${c.x - PX}" y="${c.y - SV}" width="${W + PX * 2}" height="${H + SV + PY}" rx="22" style="fill:var(--g-${c.g})"/>`).join('');
  // Each branch is named once, over the region that holds most of its grandparent's ancestors of
  // that surname (the branch's own line, not the families who married into it), else most ancestors at all;
  // a branch shown without them (the root's family inside another branch) stays unnamed.
  const names = GROUPS.map(g => {
    const stem = g.title.slice(0, -1), weight = id => g.depth.get(id) > 0 ? (nameOf(id).includes(stem) ? 1 : .01) : 0;
    const score = rs => rs.reduce((s, r) => s + r.ids.reduce((t, id) => t + weight(id), 0), 0);
    const best = [...regions.values()].filter(rs => rs[0].g === g.id && score(rs)).sort((a, b) => score(b) - score(a))[0];
    if (!best) return '';
    const top = best.slice().sort((a, b) => a.y - b.y || (b.x1 - b.x0) - (a.x1 - a.x0))[0];
    // A shown branch other than the picked one can be folded by its name (the last one cannot).
    const foldable = !focus && (activeGroup ? g.id !== activeGroup : visibleGroups().size > 1);
    // The name keeps one size on screen at any zoom (see labelScale). A name that can fold the branch
    // is itself the button: a capsule like the pills that open a branch, with an up chevron.
    const tw = measureTitle(g.title), title = `<text class="group-title" y="-10" style="fill:var(--g-${g.id}-ink)">${esc(g.title)}</text>`;
    let name = title, full = tw;
    if (foldable) {
      full = tw + 44;
      name = `<g class="group-fold" data-group-fold="${esc(g.id)}" style="--pill:var(--g-${esc(g.id)}-ink)" tabindex="${tabName++ ? -1 : 0}" role="button" aria-label="${L('Свернуть ветку', 'Fold the branch')} «${esc(g.title)}»"><title>${L('Свернуть ветку', 'Fold the branch')} «${esc(g.title)}»</title>
        <rect x="-12" y="-32" width="${full}" height="32" rx="16"/>${title}<path d="M${tw + 12},-13 l5,-5 l5,5"/></g>`;
    }
    // A name stands on its bottom edge just above the cards and grows upward. All names share one size,
    // the largest at which none of them reaches the next region on its row.
    const next = Math.min(...runs.filter(r => r.y === top.y && r.x0 > top.x0).map(r => r.x0 - 30), top.x0 + 1200);
    const max = Math.max(1, (next - top.x0) / full).toFixed(3);
    return `<g class="group-label" data-x="${top.x0 + (foldable ? 12 : 0)}" data-y="${top.y - 10}" data-max="${max}">${name}</g>`;
  }).join('');
  return [areas, names];
}
function renderTree() {
  badgePool = focus ? null : branchPeople();
  const picture = layoutTree(shown), ls = picture.ls;
  bounds = picture.bounds;
  draw(shown, ls);
  // Names go above the lines: a fold button under a line would not take the click.
  [$('group-areas').innerHTML, $('group-names').innerHTML] = groupAreas(); scaleLabels();
  if (current?.p) mark(current.p); else if (current?.l) mark(null, current.l);
  else if (current?.path) { const [a, b] = current.path.split('~'); markPath(kinOf(a, b)?.steps, cid(a)); }
  $('focusbar').hidden = !focus;
  $('side-toggle').hidden = !!focus;
  if (focus) $('focus-name').textContent = nameOf(focus);
  // The tree in a year (time.js): pale cards of those who did not live then, ages of those who did.
  sliceTree();
}
// The switcher: «Все» and one chip per branch; branches opened by a pill are marked on their chips.
function syncGroups() {
  const vg = visibleGroups();
  $('groups').querySelectorAll('[data-group]').forEach(b => {
    const id = b.dataset.group, on = id ? id === activeGroup : !activeGroup;
    b.classList.toggle('active', on);
    b.classList.toggle('opened', !!activeGroup && !on && vg.has(id));
    b.classList.toggle('folded', !activeGroup && !!id && !vg.has(id));
    b.setAttribute('aria-pressed', String(on));
  });
  document.title = activeGroup ? `${GROUP.get(activeGroup).title} · ${SITE_NAME}` : SITE_NAME;
}
// Picking a branch (or «Все») rebuilds the tree around it; the other branches fold into pills.
function setGroup(id) {
  leavePage();
  activeGroup = GROUP.has(id) ? id : null; openGroups.clear(); hiddenGroups.clear();
  focus = null; shown = basePeople();
  renderTree(); viewGroup(); syncHash(); syncGroups();
  if (current?.p) personView(current.p);
}
// A branch that fits the screen at a readable size is shown whole; a larger one opens on its
// grandparent together with their parents, where the branch goes up.
function viewGroup() {
  fit();
  if (!activeGroup || view.k >= .45) return;
  const head = GROUP.get(activeGroup).head, ps = [head, ...parentsOf(head)].map(id => pos.get(id)).filter(Boolean);
  const x0 = Math.min(...ps.map(p => p.x)), x1 = Math.max(...ps.map(p => p.x)) + W;
  const y0 = Math.min(...ps.map(p => p.y)), y1 = Math.max(...ps.map(p => p.y)) + H;
  const r = stageBox(), top = 68, pad = 40;
  view.k = Math.max(.35, Math.min(narrow() ? .8 : .9, (r.width - pad * 2) / (x1 - x0), (r.height - top - pad) / (y1 - y0)));
  view.x = r.width / 2 - (x0 + x1) / 2 * view.k; view.y = top + (r.height - top) / 2 - (y0 + y1) / 2 * view.k; handMoved = false; apply();
}
function openGroup(id, keep) {
  if (!GROUP.has(id) || visibleGroups().has(id)) return;
  if (activeGroup) openGroups.add(id); else hiddenGroups.delete(id);
  keepInPlace(keep, () => { shown = basePeople(); renderTree(); });
  syncGroups();
  if (current?.p) personView(current.p);
}
// Folding keeps the open card (or the root card) where it was on screen.
function foldGroup(id) {
  if (!GROUP.has(id) || id === activeGroup || !visibleGroups().has(id) || (!activeGroup && visibleGroups().size < 2)) return;
  if (activeGroup) openGroups.delete(id); else hiddenGroups.add(id);
  const next = basePeople(), keep = current?.p && next.has(current.p) ? current.p : ROOT;
  keepInPlace(keep, () => { shown = next; renderTree(); });
  syncGroups();
  if (current?.p) personView(current.p);
}
// Redraw without moving the given card on screen.
function keepInPlace(id, redraw) {
  const before = pos.get(id), screen = before && {x: view.x + before.x * view.k, y: view.y + before.y * view.k};
  redraw();
  const after = pos.get(id);
  if (screen && after) { view.x = screen.x - after.x * view.k; view.y = screen.y - after.y * view.k; apply(); }
}
function focusOn(id) {
  leavePage();
  id = cid(id);
  const set = new Set([id]);
  for (const queue = [id]; queue.length;) parentsOf(queue.pop()).forEach(x => { if (!set.has(x)) { set.add(x); queue.push(x); } });
  focus = id; shown = set;
  renderTree(); fit(); syncHash();
  if (current?.p) personView(current.p);
}
function exitFocus(keep) {
  focus = null; shown = basePeople();
  renderTree(); syncHash();
  centerOn(keep || current?.p || ROOT);
  if (current?.p) personView(current.p);
}
function expand(id) {
  openStep(id, shown, focus ? null : branchPeople());
  // Keep the expanded card where it was on screen.
  keepInPlace(id, renderTree);
}


// ---------- Pan and zoom (mouse, trackpad, touch) ----------
const view = {x: 0, y: 0, k: 1};
const stage = $('tree');
// Branch names grow when the tree is zoomed out, so they stay readable.
const labelScale = () => Math.max(1, 15 / 22 / view.k);
const measureTitle = (() => {
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `22px ${getComputedStyle(document.documentElement).getPropertyValue('--serif')}`;
  return t => ctx.measureText(t).width;
})();
let labelK = 0;
const FAR_K = .5;
function apply() {
  $('world').setAttribute('transform', `translate(${view.x},${view.y}) scale(${view.k})`);
  // Branch names keep a readable size when the whole tree is zoomed out.
  if (view.k !== labelK) scaleLabels();
}
function scaleLabels() {
  labelK = view.k;
  // Lines keep their width on screen; zoomed out they thin a little so the small cards are not drowned.
  stage.style.setProperty('--lw', Math.max(.45, Math.min(1, view.k ** .6)).toFixed(3));
  // Zoomed far out, the ⚑ on cards would be specks: it hides.
  stage.classList.toggle('far', view.k < FAR_K);
  const els = [...$('group-names').querySelectorAll('.group-label')];
  const s = Math.min(labelScale(), ...els.map(el => +el.dataset.max)).toFixed(3);
  els.forEach(el => el.setAttribute('transform', `translate(${el.dataset.x},${el.dataset.y}) scale(${s})`));
}
// handMoved: the reader has moved or zoomed the tree since it was last placed by the site.
let handMoved = false;
function zoomAt(k, cx, cy) {
  k = Math.max(.12, Math.min(2.6, k)); handMoved = true;
  view.x = cx - (cx - view.x) * k / view.k; view.y = cy - (cy - view.y) * k / view.k; view.k = k; apply();
}
// The part of the canvas the card leaves free. The card slides in over the canvas (style.css), so on a wide screen
// the tree is placed left of where the card ends up, even in the middle of the slide.
function stageBox() {
  const r = stage.getBoundingClientRect(), wide = document.documentElement.clientWidth;
  const right = document.body.classList.contains('panel-open') && !narrow() ? wide - panel.offsetWidth : wide;
  return {left: r.left, top: r.top, width: right - r.left, height: r.height};
}
function fit() {
  // In focus the bar sits over the top of the canvas, so leave room below it.
  const r = stageBox(), pad = 30, top = focus ? 116 : 68;
  const k = Math.min((r.width - pad * 2) / bounds.w, (r.height - pad - top) / bounds.h, 1);
  view.k = k; view.x = (r.width - bounds.w * k) / 2; view.y = top; handMoved = false; apply();
}
function centerOn(id, k = Math.max(view.k, .85)) {
  const p = pos.get(cid(id)); if (!p) return;
  const r = stageBox();
  const visibleH = narrow() && $('panel').dataset.state !== 'closed' ? r.height * .45 : r.height;
  view.k = Math.min(k, 2.6); view.x = r.width / 2 - (p.x + W / 2) * view.k; view.y = visibleH / 2 - (p.y + H / 2) * view.k; handMoved = false; apply();
}
// lastUp: the last finger tap anywhere on the canvas, for "double tap, then drag" zoom.
let lastTap = {}, lastUp = {}, tappedOnCanvas = false;
panZoom(stage, {
  view: () => view, slop: 6,
  down(e, g, n) {
    g.target = e.target.closest('[data-flag],[data-expand],[data-group-open],[data-group-fold],[data-person],[data-line]');
    // A finger that lands again where it just tapped holds a zoom: drag down to zoom in, up to zoom out.
    if (e.pointerType !== 'mouse' && n === 1 && Date.now() - lastUp.t < 350 && Math.hypot(e.clientX - lastUp.x, e.clientY - lastUp.y) < 40) {
      const r = stage.getBoundingClientRect();
      g.tapZoom = {k: view.k, x: e.clientX - r.left, y: e.clientY - r.top};
    }
  },
  pan(e, g, dx, dy) {
    if (g.tapZoom) { const z = g.tapZoom; zoomAt(z.k * Math.exp(dy * .008), z.x, z.y); return; }
    stage.classList.add('dragging');
    view.x = g.view.x + dx; view.y = g.view.y + dy; handMoved = true; apply();
  },
  pinch: (g, d, x, y) => zoomAt(g.pinch.k * d / g.pinch.d, x, y),
  up(e, g, n) {
    stage.classList.remove('dragging');
    if (!g || n) return;
    // Only a still single tap can start the next double tap; the second tap of a pair cannot.
    lastUp = e.pointerType !== 'mouse' && !g.moved && !g.pinch && !g.tapZoom ? {t: Date.now(), x: e.clientX, y: e.clientY} : {};
    if (g.moved) return;
    // A plain double tap on empty space zooms in there, as on maps.
    if (g.tapZoom && !g.target) zoomAt(view.k * 1.6, g.tapZoom.x, g.tapZoom.y);
    const t = g.target, now = Date.now();
    if (!t) return;
    // The ⚑ opens the card on its conflicts; it never counts as the first tap of a double tap.
    if (t.dataset.flag) { lastTap = {}; tappedOnCanvas = true; go({p: t.dataset.flag, x: 1}); }
    else if (t.dataset.expand) expand(t.dataset.expand);
    else if (t.dataset.groupFold) foldGroup(t.dataset.groupFold);
    else if (t.dataset.groupOpen) openGroup(t.dataset.groupOpen, t.closest('[data-person]')?.dataset.person);
    else if (t.dataset.person && (pathPick || (e.shiftKey && current?.p)) && cid(t.dataset.person) !== cid(pathPick || current.p)) {
      // Choosing the second person of a pair: after «Кем приходится…», or Shift and a card on a computer.
      if (!pathPick) pathPick = cid(current.p);
      tappedOnCanvas = true; pickSecond(t.dataset.person);
    }
    else if (t.dataset.person) {
      // A second tap on the same card within a moment focuses on that person.
      if (lastTap.id === t.dataset.person && now - lastTap.t < 400) { lastTap = {}; focusOn(t.dataset.person); }
      else { lastTap = {id: t.dataset.person, t: now}; tappedOnCanvas = true; go({p: t.dataset.person}); }
    }
    else go({l: t.dataset.line});
  },
});
wheelZoom(stage, {
  zoomBy: (f, x, y) => zoomAt(view.k * f, x, y),
  panBy(dx, dy) { view.x -= dx; view.y -= dy; handMoved = true; apply(); },
});
// Safari trackpad pinch.
let gestureK = null;
stage.addEventListener('gesturestart', e => { e.preventDefault(); gestureK = view.k; });
stage.addEventListener('gesturechange', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(gestureK * e.scale, e.clientX - r.left, e.clientY - r.top); });
// The nearest card the way the arrow points, as drawn: distance along the arrow, a step aside counting thrice.
const ARROWS = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
function stepCard(id, dx, dy) {
  const a = pos.get(id); if (!a) return;
  let best = null, score = Infinity;
  for (const [b, p] of pos) {
    const ex = p.x - a.x, ey = p.y - a.y, along = ex * dx + ey * dy, s = along + 3 * Math.abs(dx ? ey : ex);
    if (b !== id && along >= (dx ? W : H) / 2 && s < score) { score = s; best = b; }
  }
  const el = best && document.querySelector(`#nodes [data-person="${CSS.escape(best)}"]`);
  if (!el) return;
  setRove(best); el.focus({preventScroll: true});
  // A card off the free part of the canvas is brought to its middle, at the reader's zoom.
  const r = el.getBoundingClientRect(), box = stageBox(), bottom = box.top + (narrow() && panel.dataset.state !== 'closed' ? box.height * .45 : box.height);
  if (r.left < box.left || r.right > box.left + box.width || r.top < box.top || r.bottom > bottom) centerOn(best, view.k);
}
// The next name that folds a branch, the way the arrow points (in the order of the branches); it becomes the stop of
// Tab among the names and is brought into view.
function stepName(el, dx, dy) {
  const names = [...$('group-names').querySelectorAll('[data-group-fold]')], next = names[names.indexOf(el) + (dx + dy > 0 ? 1 : -1)];
  if (!next) return;
  names.forEach(n => n.setAttribute('tabindex', n === next ? '0' : '-1'));
  next.focus({preventScroll: true});
  const r = next.getBoundingClientRect(), box = stageBox();
  if (r.left < box.left || r.right > box.left + box.width || r.top < box.top || r.bottom > box.top + box.height) {
    view.x += box.left + box.width / 2 - (r.left + r.right) / 2; view.y += box.top + box.height / 2 - (r.top + r.bottom) / 2; apply();
  }
}
// Focus on a card, or on its ⚑ or «+N» (also by a click), makes that card the stop of Tab, and the arrows go on from
// it; a branch pill does not.
const cardOf = el => !el.closest?.('[data-group-open]') && el.closest?.('#nodes [data-person]');
$('nodes').addEventListener('focusin', e => { const card = cardOf(e.target); if (card) setRove(card.dataset.person); });
stage.addEventListener('keydown', e => {
  if (ARROWS[e.key] && cardOf(e.target)) { e.preventDefault(); stepCard(cardOf(e.target).dataset.person, ...ARROWS[e.key]); return; }
  if (ARROWS[e.key] && e.target.matches?.('#group-names [data-group-fold]')) { e.preventDefault(); stepName(e.target, ...ARROWS[e.key]); return; }
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const pill = e.target.closest?.('[data-group-open]'), node = e.target.closest?.('[data-person]'), fold = e.target.closest?.('[data-group-fold]');
  const flag = e.target.closest?.('[data-flag]'), more = e.target.closest?.('[data-expand]');
  if (fold) { e.preventDefault(); foldGroup(fold.dataset.groupFold); }
  else if (pill) { e.preventDefault(); openGroup(pill.dataset.groupOpen, node?.dataset.person); }
  // As a tap: the ⚑ opens the card on «Расхождения»; «+N» shows the hidden relatives, and the focus stays on the card.
  else if (flag) { e.preventDefault(); go({p: flag.dataset.flag, x: 1}); }
  else if (more) { e.preventDefault(); expand(more.dataset.expand); document.querySelector(`#nodes [data-person="${CSS.escape(more.dataset.expand)}"]`)?.focus({preventScroll: true}); }
  else if (node) { e.preventDefault(); go({p: node.dataset.person}); }
});
const zoomCenter = f => { const r = stageBox(); zoomAt(view.k * f, r.width / 2, r.height / 2); };
$('zoom-in').onclick = () => zoomCenter(1.3);
$('zoom-out').onclick = () => zoomCenter(1 / 1.3);
$('zoom-fit').onclick = fit;
