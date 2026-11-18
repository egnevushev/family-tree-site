// The page «Время» (Time: #time, #time=1897): the lives of the people of the tree on one scale of years, the events of the
// epoch (D.history) over them and a cursor of the year: who lived then, how old they were, whom a person met in life.
// And the tree in a year (#…&y=1897): the cards of those who did not live then go pale, the others show their age.
// Both read lifeSpan (facts.js); nothing is invented: an unknown end is an open edge with «?», not a guessed length.
// Depends on facts.js, family.js, ui.js, panel.js and tree.js (measure, W, H); go() and hashOf() are in app.js.
'use strict';

const TIME_NOW = new Date().getFullYear();
const peopleWord = n => plural(n, ['человек', 'человека', 'человек'], ['person', 'people']);
const ageWords = a => a === 0 ? L('меньше года', 'under a year') : `${a} ${yearsWord(a)}`;
// The span in figures, as written beside a name: «1858–1918», «≈1842–1903», «?–1918», «1850–?», «1950–» (living).
const spanFigures = s => `${s.fromKnown ? (s.fromRough ? '≈' : '') + s.from : '?'}–${s.living ? '' : s.toKnown ? (s.toRough ? '≈' : '') + s.to : '?'}`;
// The same for a screen reader, with what is known of an open end.
function spanWords(s) {
  const about = L('около ', 'about ');
  const a = s.fromKnown ? (s.fromRough ? about : '') + s.from : L('год рождения неизвестен', 'year of birth unknown');
  if (s.living) return s.fromKnown ? L(`с ${a}`, `since ${a}`) : L(`известно с ${s.from}`, `known since ${s.from}`);
  const b = s.toKnown ? (s.toRough ? about : '') + s.to : L('год смерти неизвестен', 'year of death unknown');
  return `${a} – ${b}${!s.fromKnown ? L(`, первый известный год — ${s.from}`, `, first known year ${s.from}`) : ''}${!s.toKnown ? L(`, последний известный год — ${s.to}`, `, last known year ${s.to}`) : ''}`;
}
// The people of the page: the cards of the tree with at least one year, children under 18 left out.
let TIME_ROWS = null;
function timePeople() {
  if (!TIME_ROWS) TIME_ROWS = [...new Set([...inTree].map(cid))].filter(id => P.has(id) && !minorChild(P.get(id)) && lifeSpan(id))
    .map(id => ({id, s: lifeSpan(id), home: homeOf.get(id) || '', of: memberOf.get(id) || new Set()}));
  return TIME_ROWS;
}
// The year in which most of them lived: where the cursor stands at first.
function fullestYear() {
  const rows = timePeople(), lo = Math.min(...rows.map(r => r.s.from));
  let best = lo, most = -1;
  for (let y = lo; y <= TIME_NOW; y++) { const n = rows.filter(r => livedIn(r.s, y)).length; if (n > most) { most = n; best = y; } }
  return best;
}

// ---------- The page ----------
// The scale: a fixed number of pixels a year (the whole span fits a computer's screen; a phone scrolls sideways).
const TIME_PAD = 18, TIME_TAIL = 14;
let timeYear = null, timeBranch = '', timeAll = false, timePx = 0, timeLo = 0, timeHi = 0, timeWidth = 0, timeRove = null, timeCardId = null, timeHashTimer = 0;
const timeX = y => TIME_PAD + (y - timeLo) * timePx;
const timeChart = () => $('time-body').querySelector('.tl');
const timeEls = () => [...$('time-body').querySelectorAll('.tl-row')];
const timeVisible = el => !el.hidden && !el.closest('.tl-group').hidden;
// The name and its years beside a bar, measured like the names of the tree (tree.js).
const timeLabelW = r => measure(nameOf(r.id), 600) * 12.5 / 13 + measure(spanFigures(r.s), 400) * 11.5 / 13 + 10;
function timeRowHtml(r, chartW) {
  const s = r.s, x = timeX(s.from), w = Math.max(timePx, (s.to - s.from + 1) * timePx);
  const cls = ['tl-bar', !s.fromKnown && 'open-l', s.living ? 'alive' : !s.toKnown && 'open-r', x + timeLabelW(r) > chartW - 8 && 'flip'].filter(Boolean).join(' ');
  return `<div class="tl-row" data-time-row="${esc(r.id)}">
    <button class="${cls}" data-time-person="${esc(r.id)}" tabindex="-1" style="left:${x}px;width:${w}px;--c:var(--g-${r.home || FIRST_GROUP}-ink)" aria-label="${esc(nameOf(r.id))}, ${esc(spanWords(s))}">
      <span class="tl-name" aria-hidden="true">${esc(nameOf(r.id))} <small>${esc(spanFigures(s))}</small></span><span class="tl-line" aria-hidden="true"></span>${!s.fromKnown ? '<span class="tl-q l" aria-hidden="true">?</span>' : ''}${!s.living && !s.toKnown ? '<span class="tl-q r" aria-hidden="true">?</span>' : ''}
    </button><span class="tl-age" aria-hidden="true" hidden></span></div>`;
}
function timeBuild() {
  const rows = timePeople();
  timeWidth = document.documentElement.clientWidth;
  timeLo = Math.floor((Math.min(...rows.map(r => r.s.from)) - 3) / 10) * 10;
  timeHi = TIME_NOW;
  const room = timeWidth - TIME_PAD * 2 - 40;
  timePx = Math.max(narrow() ? 5 : 4, Math.min(12, Math.floor(room / (timeHi - timeLo + 1) * 10) / 10));
  const chartW = timeX(timeHi + 1) + TIME_PAD;
  const decades = [];
  for (let y = Math.ceil(timeLo / 10) * 10; y <= timeHi; y += 10) decades.push(y);
  const groups = [...GROUPS.map(g => [g.id, g.title]), ['', L('Другие', 'Others')]].map(([gid, title]) => {
    const list = rows.filter(r => gid ? r.home === gid : !GROUP.has(r.home)).sort((a, b) => a.s.from - b.s.from || a.s.to - b.s.to || nameOf(a.id).localeCompare(nameOf(b.id), 'ru'));
    return list.length ? `<div class="tl-group" data-time-group="${esc(gid)}"><h3><span>${gid ? `<i style="background:var(--g-${esc(gid)}-ink)" aria-hidden="true"></i>` : ''}${esc(title)} <small></small></span></h3>${list.map(r => timeRowHtml(r, chartW)).join('')}</div>` : '';
  }).join('');
  $('time-body').innerHTML = `<div class="tl" style="width:${chartW}px;--px:${timePx}px">
    <div class="tl-labels" id="tl-labels"></div>
    <div class="tl-head" id="tl-head">
      <div class="tl-scale" aria-hidden="true">${decades.map(y => `<span style="left:${timeX(y)}px">${y}</span>`).join('')}</div>
      <div class="tl-knob" id="tl-knob" role="slider" tabindex="0" aria-label="${L('Год на шкале', 'Year on the scale')}" aria-valuemin="${timeLo}" aria-valuemax="${timeHi}"></div>
    </div>
    <div class="tl-grid" aria-hidden="true">${decades.map(y => `<i class="${y % 50 ? '' : 'half'}" style="left:${timeX(y)}px"></i>`).join('')}<div id="tl-bands"></div></div>
    <div class="tl-cursor" id="tl-cursor" aria-hidden="true"></div>
    <div class="tl-rows">${groups}</div>
  </div>`;
  $('time-year').min = timeLo; $('time-year').max = timeHi;
  timeFilter(); timeEvents();
}
// The branch pills, as on «Находки» (Finds): a person shows under the branch whose colour they wear, and under a
// picked branch, everyone who belongs to it (the family at the root of the tree belongs to every branch).
function timeFilter() {
  const rows = timePeople(), inBranch = r => !timeBranch || r.of.has(timeBranch);
  const branches = GROUPS.filter(g => rows.some(r => r.of.has(g.id)));
  $('time-filter').innerHTML = [['', L('Все', 'All'), rows.length], ...branches.map(g => [g.id, g.title, rows.filter(r => r.of.has(g.id)).length])]
    .map(([id, t, n]) => `<button data-time-branch="${esc(id)}" aria-pressed="${id === timeBranch}">${id ? `<i style="background:var(--g-${id}-ink)" aria-hidden="true"></i>` : ''}${esc(t)} <small>${n}</small></button>`).join('');
  const byId = new Map(rows.map(r => [r.id, r]));
  timeEls().forEach(el => { el.hidden = !inBranch(byId.get(el.dataset.timeRow)); });
  $('time-body').querySelectorAll('.tl-group').forEach(g => {
    const n = g.querySelectorAll('.tl-row:not([hidden])').length;
    g.hidden = !n; g.querySelector('h3 small').textContent = n;
  });
  timeRoveTo(null);
}
// The events of the epoch: major ones always, the rest with «Все события» (All events); under a picked branch, its own and the
// common ones. A thin band over their years, a label in the head of the scale, in lanes so labels never overlap.
function timeEvents() {
  const list = (D.history || []).filter(e => (timeAll || e.major) && (!e.branches || (timeBranch ? e.branches.includes(timeBranch) : true)) && (e.end || e.year) >= timeLo);
  $('time-events').setAttribute('aria-pressed', String(timeAll));
  $('time-events').textContent = timeAll ? L('Все события', 'All events') : `${L('Все события', 'All events')} (${(D.history || []).filter(e => !e.major && (!e.branches || !timeBranch || e.branches.includes(timeBranch))).length})`;
  const lanes = [];
  const labels = list.slice().sort((a, b) => a.year - b.year).map(e => {
    const short = cut(loc(e.text).split(':')[0], 34), x = timeX(e.year), w = measure(short, 500) * 11.5 / 13 + 14;
    let lane = lanes.findIndex(end => end < x - 4); if (lane < 0) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = x + w;
    const years = e.end ? `${e.year}–${e.end}` : String(e.year);
    return `<span class="tl-ev${e.major ? ' major' : ''}" style="left:${x}px;top:${lane * 17 + 4}px" title="${esc(years)}: ${esc(loc(e.text))}">${esc(short)}<span class="sr-only"> (${esc(years)})</span></span>`;
  });
  $('tl-labels').style.height = `${lanes.length * 17 + 8}px`;
  $('tl-labels').innerHTML = labels.join('');
  // On a computer the labels stay over the rows with the scale; on a phone they scroll away, leaving the rows room.
  timeChart().style.setProperty('--tl-labels', $('tl-labels').offsetHeight + 'px');
  $('tl-bands').innerHTML = list.map(e => `<i class="${e.major ? 'major' : ''}" style="left:${timeX(e.year)}px;width:${((e.end || e.year) - e.year + 1) * timePx}px"></i>`).join('');
  // Rows scrolled to by the keyboard stop under the head.
  $('time-body').style.scrollPaddingTop = (narrow() ? 0 : $('tl-labels').offsetHeight) + $('tl-head').offsetHeight + 'px';
}
// The cursor of the year: the line, the knob, the field, the rows that cross it (with ages), the line said aloud
// and, a moment later, the link (#time=1897; a later card opened over the page keeps it through state()).
function timeSet(y, scroll) {
  if (!timeChart()) return;
  y = Math.max(timeLo, Math.min(timeHi, Math.round(+y || timeYear || fullestYear())));
  const moved = y !== timeYear;
  timeYear = y;
  const x = timeX(y) + timePx / 2;
  $('tl-cursor').style.left = x + 'px';
  const knob = $('tl-knob');
  knob.style.left = x + 'px'; knob.textContent = y;
  // The decades under the knob step aside.
  $('tl-head').querySelectorAll('.tl-scale span').forEach(s => { s.style.visibility = Math.abs(parseFloat(s.style.left) - x) < 34 ? 'hidden' : ''; });
  knob.setAttribute('aria-valuenow', y); knob.setAttribute('aria-valuetext', L(`${y} год`, String(y)));
  if (document.activeElement !== $('time-year')) $('time-year').value = y;
  const rows = timePeople(), byId = new Map(rows.map(r => [r.id, r]));
  const shown = [], ages = [];
  timeEls().forEach(el => {
    const r = byId.get(el.dataset.timeRow), on = livedIn(r.s, y), age = ageIn(r.s, y), tag = el.querySelector('.tl-age');
    el.classList.toggle('on', on); el.classList.toggle('off', !on);
    tag.hidden = age === null;
    if (age !== null) { tag.textContent = (r.s.fromRough ? '≈' : '') + (age || '<1'); tag.style.left = (x + 5) + 'px'; }
    if (on && !el.hidden) { shown.push(r); if (age !== null) ages.push(age); }
  });
  const of = timeBranch ? L(`из ветки «${GROUP.get(timeBranch).title}»`, `of the branch «${GROUP.get(timeBranch).title}»`) : L('из древа', 'of the tree');
  $('time-say').textContent = shown.length
    ? L(`В ${y} году: ${shown.length} ${peopleWord(shown.length)} ${of}${ages.length ? `; старшему — ${ageWords(Math.max(...ages))}, младшему — ${ageWords(Math.min(...ages))}` : ''}`,
      `In ${y}: ${shown.length} ${peopleWord(shown.length)} ${of}${ages.length ? `; the eldest ${ageWords(Math.max(...ages))} old, the youngest ${ageWords(Math.min(...ages))} old` : ''}`)
    : L(`В ${y} году никого ${of} ещё или уже нет в записях`, `In ${y} no one ${of} is in the records yet, or any more`);
  if (scroll) {
    const body = $('time-body');
    if (x < body.scrollLeft + 40 || x > body.scrollLeft + body.clientWidth - 40) body.scrollLeft = x - body.clientWidth * .65;
  }
  if (moved && pageOpen === 'time') {
    clearTimeout(timeHashTimer);
    timeHashTimer = setTimeout(() => { if (pageOpen !== 'time') return; const st = {...(history.state || {}), page: 'time', year: timeYear}; history.replaceState(st, '', hashOf(st)); }, 250);
  }
}
// A card open over the page: its person's row is marked, and the rows of everyone whose life met theirs
// («кто кого застал», who lived at the same time as whom), with their number above the list.
function timeCard() {
  if (!timeChart()) return;
  const id = panel.dataset.state !== 'closed' && current?.p ? cid(current.p) : null;
  const rows = timePeople(), me = id && rows.find(r => r.id === id);
  const met = me ? rows.filter(r => r !== me && r.s.from <= me.s.to && me.s.from <= r.s.to) : [];
  const metIds = new Set(met.map(r => r.id));
  timeEls().forEach(el => { el.classList.toggle('me', !!me && el.dataset.timeRow === id); el.classList.toggle('met', metIds.has(el.dataset.timeRow)); });
  $('time-met').hidden = !me;
  if (me) $('time-met').innerHTML = `<i aria-hidden="true"></i>${esc(sayName(id))}: ${L(`застал${sexOf(id) === 'f' ? 'а' : ''} ${met.length} ${peopleWord(met.length)} из древа — их линии отмечены`, `lived at the same time as ${met.length} ${peopleWord(met.length)} of the tree — their lines are marked`)}`;
  // A newly opened person is brought into the part of the page the card leaves free.
  if (me && id !== timeCardId) {
    // On a phone the sheet of the card is still sliding up: measure where it stops, after its transition.
    const moving = narrow() && panel.getAnimations ? panel.getAnimations().map(a => a.finished.catch(() => {})) : [];
    Promise.all(moving).then(() => { if (pageOpen === 'time' && timeCardId === id) timeBring(id); });
  }
  timeCardId = id;
}
function timeBring(id) {
  const el = $('time-body').querySelector(`[data-time-row="${CSS.escape(id)}"]`), body = $('time-body');
  if (!el || !timeVisible(el)) return;
  const r = el.getBoundingClientRect(), b = body.getBoundingClientRect(), head = $('tl-head').getBoundingClientRect().bottom - b.top;
  const bottom = narrow() && panel.dataset.state !== 'closed' ? Math.min(b.bottom, panel.getBoundingClientRect().top) : b.bottom;
  if (r.top < b.top + head || r.bottom > bottom) body.scrollTop += r.top - (b.top + head) - Math.max(0, (bottom - b.top - head) / 3);
}
// The rows are one stop of Tab (as the cards of the tree): ↑ ↓ go along the shown rows, Home and End to the first
// and the last; ← → and PageUp, PageDown move the year; Enter opens the card over the page.
function timeRoveTo(id, focusIt) {
  const els = timeEls().filter(timeVisible);
  const el = els.find(x => x.dataset.timeRow === id) || els.find(x => x.dataset.timeRow === timeRove) || els[0];
  $('time-body').querySelectorAll('.tl-bar[tabindex="0"]').forEach(b => b.setAttribute('tabindex', '-1'));
  if (!el) return;
  timeRove = el.dataset.timeRow;
  const bar = el.querySelector('.tl-bar');
  bar.setAttribute('tabindex', '0');
  if (focusIt) bar.focus();
}
const TIME_KEYS = {ArrowLeft: -1, ArrowRight: 1, PageDown: -10, PageUp: 10};
function timeView(route) {
  if (!timeChart() || Math.abs(document.documentElement.clientWidth - timeWidth) > 1) timeBuild();
  timeSet(route.year || timeYear || sliceYear || fullestYear(), true);
  timeCard();
}
// Dragging along the head of the scale (or a click on it) moves the cursor.
{
  const yearAt = clientX => timeLo + Math.floor((clientX - timeChart().getBoundingClientRect().left - TIME_PAD) / timePx);
  let drag = false;
  $('time-body').addEventListener('pointerdown', e => {
    const head = e.target.closest('.tl-head, .tl-labels');
    if (!head || e.button) return;
    drag = true; head.setPointerCapture(e.pointerId);
    timeSet(yearAt(e.clientX));
    if (e.target.closest('.tl-knob')) e.preventDefault();
  });
  $('time-body').addEventListener('pointermove', e => { if (drag) timeSet(yearAt(e.clientX)); });
  const end = () => { drag = false; };
  $('time-body').addEventListener('pointerup', end);
  $('time-body').addEventListener('pointercancel', end);
}
$('time-body').addEventListener('keydown', e => {
  const knob = e.target.closest('.tl-knob'), bar = e.target.closest('.tl-bar');
  if (!knob && !bar) return;
  if (TIME_KEYS[e.key] !== undefined) { e.preventDefault(); timeSet(timeYear + TIME_KEYS[e.key], true); return; }
  if (knob && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); timeSet(timeYear + (e.key === 'ArrowUp' ? 1 : -1), true); return; }
  if (knob && (e.key === 'Home' || e.key === 'End')) { e.preventDefault(); timeSet(e.key === 'Home' ? timeLo : timeHi, true); return; }
  if (!bar || !['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  const els = timeEls().filter(timeVisible), at = els.findIndex(x => x.dataset.timeRow === bar.dataset.timePerson);
  const to = e.key === 'Home' ? 0 : e.key === 'End' ? els.length - 1 : Math.max(0, Math.min(els.length - 1, at + (e.key === 'ArrowDown' ? 1 : -1)));
  timeRoveTo(els[to]?.dataset.timeRow, true);
});
$('time-body').addEventListener('focusin', e => { const b = e.target.closest('.tl-bar'); if (b) timeRoveTo(b.dataset.timePerson); });
$('time-body').addEventListener('click', e => { const b = e.target.closest('[data-time-person]'); if (b) { timeRoveTo(b.dataset.timePerson); go({p: b.dataset.timePerson}); } });
$('time-filter').addEventListener('click', e => { const b = e.target.closest('[data-time-branch]'); if (!b) return; timeBranch = b.dataset.timeBranch; timeFilter(); timeEvents(); timeSet(timeYear); timeCard(); });
$('time-events').onclick = () => { timeAll = !timeAll; timeEvents(); };
$('time-year').addEventListener('input', e => { if (/^\d{4}$/.test(e.target.value)) timeSet(+e.target.value, true); });
$('time-year').addEventListener('change', e => { timeSet(+e.target.value, true); e.target.value = timeYear; });
$('time-year').addEventListener('keydown', e => { if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); timeSet(timeYear + TIME_KEYS[e.key], true); e.target.value = timeYear; } });
// «Показать на древе» (Show on the tree): the tree in the year of the cursor.
$('time-tree').onclick = () => { setSlice(timeYear, true); stack.length = 0; go({page: null}); };
window.addEventListener('resize', () => { if (pageOpen === 'time' && Math.abs(document.documentElement.clientWidth - timeWidth) > 1) { const left = $('time-body').scrollLeft / Math.max(1, timePx); timeBuild(); timeSet(timeYear); $('time-body').scrollLeft = left * timePx; timeCard(); } });
registerPage('time', {
  el: 'time-page', mode: true, again: true,
  available: () => timePeople().length > 0,
  show(route) { markTime(true); return timeView(route); },
  redraw: timeCard,
  state: () => ({year: timeYear}),
  parse(v, route) { if (/^\d{4}$/.test(v || '')) route.year = +v; },
  hash: route => route.year ? `time=${route.year}` : 'time',
});

// ---------- The tree in a year (#…&y=1897) ----------
// The switch «Древо в году» (The tree in a year) by the zoom buttons opens a bar with the year (a slider, a field, ×). The cards of those
// who did not live in that year (lifeSpan) go pale, without a new layout; those who did show their age, except the
// living and those whose year of birth is unknown; a card without a single year is dashed. The year lives in the
// link beside focus=, so cards, branches and the focus keep it; Escape or × turn it off. Print shows it as it is.
let sliceYear = null, sliceHashTimer = 0;
let SLICE_FROM = null;
const sliceFrom = () => SLICE_FROM ?? (SLICE_FROM = Math.min(...[...new Set([...inTree].map(cid))].map(lifeSpan).filter(Boolean).map(s => s.from)));
function setSlice(y, quiet) {
  sliceYear = y ? Math.max(sliceFrom(), Math.min(TIME_NOW, Math.round(+y))) : null;
  $('year-bar').hidden = !sliceYear;
  document.body.classList.toggle('slicing', !!sliceYear);
  $('year-toggle').setAttribute('aria-pressed', String(!!sliceYear));
  if (sliceYear) {
    $('year-range').value = sliceYear;
    if (document.activeElement !== $('year-input')) $('year-input').value = sliceYear;
  }
  sliceTree();
  if (!quiet) { clearTimeout(sliceHashTimer); sliceHashTimer = setTimeout(syncHash, 250); }
}
function sliceTree() {
  const nodes = [...document.querySelectorAll('#nodes [data-person]')];
  let on = 0, none = 0;
  for (const n of nodes) {
    n.querySelector('.y-age')?.remove();
    n.classList.remove('y-on', 'y-off', 'y-none');
    if (n.dataset.label) { n.setAttribute('aria-label', n.dataset.label); delete n.dataset.label; }
    if (!sliceYear) continue;
    const s = lifeSpan(n.dataset.person), said = n.getAttribute('aria-label');
    n.dataset.label = said;
    if (!s) { none++; n.classList.add('y-none'); n.setAttribute('aria-label', L(`${said}, годы жизни неизвестны`, `${said}, years of life unknown`)); continue; }
    if (!livedIn(s, sliceYear)) { n.classList.add('y-off'); n.setAttribute('aria-label', L(`${said}, в ${sliceYear} году — вне известных лет жизни`, `${said}, in ${sliceYear} — outside the known years of life`)); continue; }
    on++; n.classList.add('y-on');
    const age = ageIn(s, sliceYear);
    if (age === null) continue;
    const text = (s.fromRough ? '≈' : '') + (age ? `${age} ${yearsWord(age)}` : L('до года', 'under 1')), w = Math.ceil(measure(text, 600) * 11 / 13) + 14;
    n.insertAdjacentHTML('beforeend', `<g class="y-age" transform="translate(14,-9)" aria-hidden="true"><rect width="${w}" height="18" rx="9"/><text x="${w / 2}" y="12.5" text-anchor="middle">${esc(text)}</text></g>`);
    n.setAttribute('aria-label', L(`${said}, в ${sliceYear} году — ${s.fromRough ? 'около ' : ''}${ageWords(age)}`, `${said}, in ${sliceYear} — ${s.fromRough ? 'about ' : ''}${ageWords(age)} old`));
  }
  if (sliceYear) $('year-say').textContent = L(`${sliceYear} год: на схеме ${on} ${peopleWord(on)} из ${nodes.length}${none ? `; ${none} ${peopleWord(none)} без известных лет — пунктиром` : ''}`,
    `${sliceYear}: ${on} ${peopleWord(on)} of ${nodes.length} on the chart${none ? `; ${none} ${peopleWord(none)} with no known years — dashed` : ''}`);
}
{
  const range = $('year-range'), input = $('year-input');
  range.min = input.min = sliceFrom(); range.max = input.max = TIME_NOW;
  range.addEventListener('input', () => setSlice(+range.value));
  // PageUp and PageDown move ten years (a slider of the browser would move a tenth of its length).
  const tens = e => { if (e.key === 'PageUp' || e.key === 'PageDown') { e.preventDefault(); setSlice(sliceYear + (e.key === 'PageUp' ? 10 : -10)); input.value = sliceYear; } };
  range.addEventListener('keydown', tens);
  input.addEventListener('keydown', tens);
  input.addEventListener('input', () => { if (/^\d{4}$/.test(input.value)) setSlice(+input.value); });
  input.addEventListener('change', () => { setSlice(+input.value || sliceYear); input.value = sliceYear; });
  $('year-close').onclick = () => { setSlice(null); $('year-toggle').focus(); };
  $('year-toggle').onclick = () => {
    if (sliceYear) { setSlice(null); return; }
    const p = current?.p && lifeSpan(current.p);
    setSlice(timeYear || (p && !p.living ? p.from + Math.min(30, p.to - p.from) : fullestYear()));
    range.focus();
  };
}
// A section new to the reader: its button has the dot of «Находки» (Finds) until the first visit.
function markTime(seen) {
  try { if (seen) localStorage.setItem('seenTime', '1'); seen = localStorage.getItem('seenTime'); } catch (_) {}
  document.querySelectorAll('[data-mode="time"]').forEach(b => { b.classList.toggle('unread', !seen); b.setAttribute('aria-label', seen ? L('Время', 'Time') : L('Время — новый раздел', 'Time — a new section')); });
}
markTime();
