// The main file, loaded last: links and history (go, render), the card's width and the phone sheet, the search
// box, keys of the whole page, and the start. Depends on every file above.
'use strict';

// ---------- Navigation: hash routes so the back button closes and returns ----------
const stack = [];
function go(route, replace) {
  // An open page (the map) stays behind the cards opened from it, with what it shows (the branch of the booklet);
  // page: null leaves it.
  if (route.page === undefined && pageOpen && (route.p || route.l || route.f || route.pl)) route = {...PAGES.get(pageOpen).state?.(), ...route, page: pageOpen};
  if (!route.page && 'page' in route) { route = {...route}; delete route.page; }
  const hash = hashOf(route);
  if (replace) history.replaceState(route, '', hash); else history.pushState(route, '', hash);
  render(route, !replace);
}
// The link carries the picked branch, the open card and, if on, the focus person and the year of the tree (time.js):
// #ivanovy&p=anna, #p=ivan&focus=ivan, #p=ivan&y=1897
function hashOf(route) {
  const parts = activeGroup ? [activeGroup] : [];
  // A page: its name, or the part the page writes itself (#book=g:ivanovy, #finds=…).
  if (route.page) parts.push(PAGES.get(route.page)?.hash?.(route) || route.page);
  if (route.news) parts.push('news');
  else if (route.help) parts.push('help');
  else if (route.send) parts.push(`send=${encodeURIComponent(route.send)}`);
  else if (route.exp) parts.push(`exp=${encodeURIComponent(route.exp)}`);
  else for (const k of ['p', 'l', 'f', 'path', 'pl']) if (route[k]) { parts.push(`${k}=${encodeURIComponent(route[k])}`); break; }
  if (focus) parts.push(`focus=${encodeURIComponent(focus)}`);
  if (sliceYear) parts.push(`y=${sliceYear}`);
  return '#' + parts.join('&');
}
function syncHash() { history.replaceState(history.state, '', hashOf(history.state || {})); }
function parseHash() {
  const out = {};
  location.hash.replace(/^#/, '').split('&').forEach(part => {
    const [k, v] = part.split('=');
    if (v && ['p', 'l', 'f', 'focus', 'path', 'send', 'pl'].includes(k)) out[k] = decodeURIComponent(v);
    if (k === 'news') out.news = 1;
    // A page: #map, #docs, #days, #book=…, #finds=…; what follows «=» is the page's to read.
    if (PAGES.has(k)) { out.page = k; PAGES.get(k).parse?.(v, out); }
    if (k === 'help') out.help = 1;
    // The tree in a year: #y=1897 (time.js).
    if (k === 'y' && /^\d{4}$/.test(v || '')) out.y = +v;
    // «Скачать древо»: #exp is the whole tree, #exp=g:ivanovy a branch, #exp=p:ivan a person and ancestors.
    if (k === 'exp') out.exp = v ? decodeURIComponent(v) : 'g:';
    // A branch: #ivanovy, #g=ivanovy or the Russian name, #Ивановы.
    const g = groupOfToken(v === undefined ? k : k === 'g' ? v : '');
    if (g) out.g = g;
  });
  // Also accept ?focus=… before the #, as some copied links carry it there.
  const query = new URLSearchParams(location.search).get('focus');
  if (!out.focus && query) out.focus = query;
  if (out.focus) { out.startFocus = out.focus; delete out.focus; }
  return out;
}
function render(route, push) {
  setPage(route.page, route);
  if (!route.p && !route.l && !route.f && !route.news && !route.path && !route.help && !route.send && !route.pl && !route.exp) { closePanel(); return; }
  if (!route.path) clearPath();
  if (push && current) stack.push(current);
  // Going to someone outside the focus adds them to it; the focus itself stays on.
  // A shared link opens the card as is, even if that person is not on the focused tree.
  if (push && focus && route.p && inTree.has(cid(route.p)) && !shown.has(cid(route.p))) { shown.add(cid(route.p)); renderTree(); }
  // Going to someone in a folded branch opens that branch.
  if (!focus && route.p && inTree.has(cid(route.p)) && !shown.has(cid(route.p))) {
    const g = homeOf.get(cid(route.p));
    if (activeGroup) openGroups.add(g); else hiddenGroups.delete(g);
    shown = basePeople();
    if (!shown.has(cid(route.p))) reveal(cid(route.p));
    renderTree(); syncGroups();
  }
  // A card tapped on the canvas is already in view; moving it would break a double tap.
  const center = !tappedOnCanvas; tappedOnCanvas = false;
  if (route.p && P.has(route.p)) { personView(route.p); if (center && shown.has(cid(route.p))) setTimeout(() => centerOn(route.p), 0); }
  else if (route.l) lineView(route.l);
  else if (route.f) refView(route.f);
  else if (route.news) newsView();
  else if (route.help) helpView();
  else if (route.send) sendView(route.send);
  else if (route.path) pathView(route.path);
  else if (route.pl) placeView(route.pl);
  else if (route.exp) exportView(route.exp);
  $('back').hidden = history.state == null || stack.length === 0;
  // «Печать» only where there is something to print: not on the forms, «Помочь дополнить» and «Что нового».
  $('print-card').hidden = !!(route.send || route.help || route.news || route.exp);
  openPanel();
  panel.scrollTop = 0;
  sayTitle();
  if (byKey) panel.focus({preventScroll: true});
  if (route.p && route.x) toConflicts();
}
// The card scrolled to «Расхождения», under the row of its buttons.
function toConflicts() { toSection(body.querySelector('.conflicts')); }
// The card scrolled to a heading, under the row of its buttons.
function toSection(h) {
  if (!h) return;
  const top = panel.querySelector('.panel-top'), nav = body.querySelector('.contents');
  panel.scrollTop += h.getBoundingClientRect().top - panel.getBoundingClientRect().top - (top ? top.offsetHeight : 0) - (nav ? nav.offsetHeight : 0) - 6;
}
let skipPop = false;
// One history handler: a back step first closes an open document, otherwise it returns to the previous card.
window.addEventListener('popstate', e => {
  if (skipPop) { skipPop = false; return; }
  if (!$('viewer').hidden) { closeViewer(true); return; }
  stack.pop(); render(e.state || parseHash(), false);
});
$('back').onclick = () => history.back();
// Closing a card opened over the map returns to the map.
$('close').onclick = () => { stack.length = 0; go(pageOpen ? {...PAGES.get(pageOpen).state?.(), page: pageOpen} : {}, false); };
// The logo returns to the start of the current view: the card closes, the focus and any folded or
// opened branches reset, the picked branch stays and is shown whole. It opens nobody's card.
$('home').onclick = e => {
  e.preventDefault(); stack.length = 0; go({}, true);
  const g = activeGroup;
  setGroup(g);
  if (!g) centerOn(home(), narrow() ? .8 : 1);
};
body.addEventListener('click', e => {
  const t = e.target.closest('[data-rel],[data-line-link],[data-person-link],[data-ref],[data-doc],[data-focus],[data-unfocus],[data-path-from],[data-path-swap],[data-path-cancel],[data-path-to],[data-me-set],[data-send],[data-send-more],[data-tree-show]');
  if (!t) return;
  if (t.dataset.meSet) { setMe(t.dataset.meSet); return; }
  // From the map or the documents: back to the tree, the person chosen and in the middle.
  if (t.dataset.treeShow) { stack.length = 0; go({p: t.dataset.treeShow, page: null}); return; }
  if (t.dataset.pathTo) { go({path: t.dataset.pathTo}); return; }
  if (t.dataset.send) { go({send: t.dataset.send}); return; }
  if (t.hasAttribute('data-send-more')) { if (current?.help) { helpView(); body.querySelector('form.send')?.scrollIntoView({block: 'start'}); } else if (current?.send) sendView(current.send); return; }
  if (t.dataset.pathFrom) { startPathPick(t.dataset.pathFrom); return; }
  if (t.dataset.pathSwap) { go({path: t.dataset.pathSwap}, true); return; }
  if (t.hasAttribute('data-path-cancel')) { pathPick = null; t.closest('.path-pick')?.remove(); return; }
  if (t.dataset.focus) { focusOn(t.dataset.focus); if (narrow()) panel.dataset.state = 'peek'; return; }
  if (t.hasAttribute('data-unfocus')) { exitFocus(); return; }
  if (t.dataset.lineLink) go({l: t.dataset.lineLink});
  else if (t.dataset.rel) go({l: pairKey(R.get(t.dataset.rel))});
  else if (t.dataset.personLink) go({p: t.dataset.personLink});
  else if (t.dataset.ref) go({f: t.dataset.ref});
  else if (t.dataset.doc) openViewerFrom(t, body);
});


// Computers: the card's left edge drags its width, between 360 px and three quarters of the window; the width
// is kept in this browser; a double click or Enter on the edge returns it to 440 px. The tree keeps its middle.
const PANEL_W = 440, PANEL_KEY = 'familyPanelWidth';
const panelMax = () => Math.max(PANEL_W, Math.min(1100, Math.round(innerWidth * .75)));
function setPanelWidth(w, keep) {
  w = Math.round(Math.max(360, Math.min(panelMax(), w)));
  const before = panel.offsetWidth;
  document.documentElement.style.setProperty('--panel-w', w + 'px');
  if (document.body.classList.contains('panel-open') && !narrow()) { view.x -= (w - before) / 2; apply(); }
  if (keep) { try { if (w === PANEL_W) localStorage.removeItem(PANEL_KEY); else localStorage.setItem(PANEL_KEY, w); } catch (_) {} }
}
try { const w = +localStorage.getItem(PANEL_KEY); if (w) setPanelWidth(w); } catch (_) {}
{
  const edge = $('panel-resize');
  let drag = null;
  edge.addEventListener('pointerdown', e => { edge.setPointerCapture(e.pointerId); drag = {x: e.clientX, w: panel.offsetWidth}; document.body.classList.add('resizing'); e.preventDefault(); });
  edge.addEventListener('pointermove', e => { if (drag) setPanelWidth(drag.w + drag.x - e.clientX); });
  const end = () => { if (!drag) return; drag = null; document.body.classList.remove('resizing'); setPanelWidth(panel.offsetWidth, true); };
  edge.addEventListener('pointerup', end); edge.addEventListener('pointercancel', end);
  edge.addEventListener('dblclick', () => setPanelWidth(PANEL_W, true));
  edge.addEventListener('keydown', e => {
    const step = e.shiftKey ? 80 : 20;
    if (e.key === 'ArrowLeft') setPanelWidth(panel.offsetWidth + step, true);
    else if (e.key === 'ArrowRight') setPanelWidth(panel.offsetWidth - step, true);
    else if (e.key === 'Enter') setPanelWidth(PANEL_W, true);
    else return;
    e.preventDefault();
  });
  window.addEventListener('resize', () => { if (panel.offsetWidth > panelMax() && !narrow()) setPanelWidth(panelMax()); });
}

// Phones: an explicit button to open the card full screen and back.
function syncExpand() {
  const full = panel.dataset.state === 'full';
  $('expand-sheet').textContent = full ? L('⤡ Свернуть', '⤡ Collapse') : L('⤢ Развернуть', '⤢ Expand');
  $('expand-sheet').setAttribute('aria-label', full ? L('Свернуть карточку', 'Collapse the card') : L('Развернуть карточку на весь экран', 'Expand the card to the full screen'));
}
new MutationObserver(syncExpand).observe(panel, {attributes: true, attributeFilter: ['data-state']});
new MutationObserver(() => narrow() && redrawPage()).observe(panel, {attributes: true, attributeFilter: ['data-state']});
// The card's top row gets its shadow only while the card is scrolled under it.
panel.addEventListener('scroll', () => panel.classList.toggle('scrolled', panel.scrollTop > 2), {passive: true});
$('expand-sheet').onclick = () => { panel.dataset.state = panel.dataset.state === 'full' ? 'peek' : 'full'; };
// Bottom sheet on phones: the whole top strip of the card (the grip and the row of its buttons) is its handle.
// The card follows the finger; let go, and it settles: up opens it to full screen, down lowers it to half,
// and further down (or down from half) closes it. A tap on the grip switches half and full screen.
let sheetDrag = null, sheetDragEnd = 0;
const sheetTop = panel.querySelector('.panel-top');
sheetTop.addEventListener('pointerdown', e => {
  if (!narrow() || panel.dataset.state === 'closed' || e.target.closest('button:not(#grip)')) return;
  // How far the card stands below full screen now, in pixels.
  const offset = panel.getBoundingClientRect().top - (innerHeight - panel.offsetHeight);
  sheetDrag = {y: e.clientY, state: panel.dataset.state, offset, moved: false};
  sheetTop.setPointerCapture(e.pointerId);
});
sheetTop.addEventListener('pointermove', e => {
  if (!sheetDrag) return;
  const dy = e.clientY - sheetDrag.y;
  if (!sheetDrag.moved && Math.abs(dy) < 8) return;
  sheetDrag.moved = true;
  panel.style.transition = 'none';
  panel.style.transform = `translateY(${Math.max(0, sheetDrag.offset + dy)}px)`;
});
function endSheetDrag(e) {
  if (!sheetDrag) return;
  const d = sheetDrag, dy = e.clientY - d.y;
  sheetDrag = null;
  panel.style.transition = panel.style.transform = '';
  if (!d.moved) return;
  sheetDragEnd = Date.now();
  // Half screen leaves 48% of the card in view; a card pulled well below that closes.
  const half = panel.offsetHeight * .52;
  if (dy < -40) panel.dataset.state = 'full';
  else if (dy > 40 && (d.state === 'peek' || d.offset + dy > half + 60)) { stack.length = 0; go({}, false); }
  else if (dy > 40) panel.dataset.state = 'peek';
}
sheetTop.addEventListener('pointerup', endSheetDrag);
sheetTop.addEventListener('pointercancel', endSheetDrag);
$('grip').onclick = () => { if (Date.now() - sheetDragEnd > 400) panel.dataset.state = panel.dataset.state === 'full' ? 'peek' : 'full'; };

let hits = [], active = -1;
// The search is a combobox: a screen reader hears whether the list is open and which name the arrows picked.
function searchList(open) {
  $('results').hidden = !open;
  $('search').setAttribute('aria-expanded', String(open));
  $('search').removeAttribute('aria-activedescendant');
}
function showResults() {
  const value = $('search').value;
  document.querySelectorAll('.node.match').forEach(n => n.classList.remove('match'));
  if (!searchWords(value).length) { searchList(false); return; }
  hits = searchPeople(value);
  active = -1;
  hits.forEach(p => document.querySelector(`[data-person="${CSS.escape(p.id)}"]`)?.classList.add('match'));
  $('results').innerHTML = hits.length ? hits.map((p, i) => `<button role="option" id="hit-${i}" data-hit="${i}" aria-selected="false">${esc(nameOf(p.id))}<small>${esc((MERGE_OF.get(p.id)?.years || life(p)) || L('даты неизвестны', 'dates unknown'))}${inTree.has(p.id) ? '' : L(' · вне древа', ' · outside the tree')}</small></button>`).join('') : `<div class="empty">${L('Никого не нашлось', 'Nobody found')}</div>`;
  searchList(true);
}
function choose(i) {
  const p = hits[i]; if (!p) return;
  searchList(false); $('search').blur();
  if (pathPick && cid(p.id) !== pathPick) pickSecond(p.id); else go({p: p.id, page: null});
}
$('search').addEventListener('input', showResults);
$('search').addEventListener('focus', showResults);
$('search').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); active = Math.max(0, Math.min(hits.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
    $('results').querySelectorAll('[data-hit]').forEach((b, i) => b.setAttribute('aria-selected', String(i === active)));
    if (active >= 0 && $('hit-' + active)) { $('search').setAttribute('aria-activedescendant', 'hit-' + active); $('hit-' + active).scrollIntoView({block: 'nearest'}); }
  }
  if (e.key === 'Enter') choose(active < 0 ? 0 : active);
  if (e.key === 'Escape') { $('search').value = ''; showResults(); }
});
$('results').addEventListener('click', e => { const b = e.target.closest('[data-hit]'); if (b) choose(+b.dataset.hit); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('.search') && !$('results').hidden) searchList(false); });

document.addEventListener('keydown', e => {
  // Escape closes the question «Забыть…?»; in the form it only leaves the field, so nothing typed is lost.
  if (e.key === 'Escape' && !$('intro').hidden) { showIntro(false); return; }
  if (e.key === 'Escape' && !$('me-ask').hidden) { dialog($('me-ask'), false); $('me-forget')?.focus(); return; }
  if (e.key === 'Escape' && e.target.closest?.('form.send')) { e.target.blur(); return; }
  // Escape closes the document first, then the legend, then the card.
  if ($('viewer').hidden) {
    if (e.key === 'Escape' && !$('legend').hidden) showLegend(false);
    else if (e.key === 'Escape' && panel.dataset.state !== 'closed') $('close').click();
    else if (e.key === 'Escape' && !$('book-scope-list').hidden) showScopes(false);
    else if (e.key === 'Escape' && pageOpen) go({});
    // Last, the tree in a year turns off (not while Escape closes the menu «⋯» or clears the search).
    else if (e.key === 'Escape' && sliceYear && $('tree-menu-list').hidden && !e.target.closest?.('.search')) { const back = $('year-bar').contains(document.activeElement); setSlice(null); if (back) $('year-toggle').focus(); }
    return;
  }
  if (e.key === 'Escape') closeViewer();
  // ← → turn the pages, and past the first or the last page — the documents of «Документы».
  if (e.key === 'ArrowLeft') { if (!$('viewer-prev').disabled && !$('viewer-prev').hidden) showPage(viewerState.i - 1); else docStep(-1); }
  if (e.key === 'ArrowRight') { if (!$('viewer-next').disabled && !$('viewer-next').hidden) showPage(viewerState.i + 1); else docStep(1); }
});


// ---------- Start ----------
// A phone's header leaves the search little room until it is tapped: the short word fits.
const syncSearchHint = () => { $('search').placeholder = narrow() ? L('Найти', 'Find') : L('Найти человека…', 'Find a person…'); };
syncSearchHint();
window.addEventListener('resize', syncSearchHint);
if (touchScreen()) $('hint').textContent = L('Коснитесь человека — откроется его история, двойное касание — только его предки. Коснитесь линии — документы, на которых держится связь.', 'Tap a person to open their story, double-tap for their ancestors only. Tap a line for the documents the link rests on.');
$('groups').innerHTML = `<button data-group="" title="${L('Всё древо', 'Whole tree')}">${L('Все', 'All')}</button>` + GROUPS.map(g => `<button data-group="${esc(g.id)}" title="${esc(g.title)}: ${L('только эта ветка, остальные свёрнуты', 'only this branch, the others folded')}"><i style="background:var(--g-${esc(g.id)}-ink)"></i>${esc(g.title)}</button>`).join('');
$('groups').addEventListener('click', e => { const b = e.target.closest('[data-group]'); if (b) setGroup(b.dataset.group); });
const syncSide = () => {
  const say = sideAll ? L('Свернуть боковые ветки', 'Fold the side branches') : L('Раскрыть всех', 'Show everyone');
  $('side-toggle').dataset.tip = say;
  $('side-toggle').setAttribute('aria-label', say + (sideAll ? L(': прямая линия и братья и сёстры предков, остальные — по «+N»', ': the direct line and the ancestors’ brothers and sisters, the others under «+N»') : L(': показать всё древо сразу', ': show the whole tree at once')));
  $('side-toggle').setAttribute('aria-pressed', String(sideAll));
  $('side-toggle').hidden = !!focus;
};
// The menu of print and the GEDCOM file: closes on a choice, a click elsewhere or Escape.
const treeMenu = open => { $('tree-menu-list').hidden = !open; $('tree-menu').setAttribute('aria-expanded', String(open)); };
$('tree-menu').onclick = e => { e.stopPropagation(); treeMenu($('tree-menu-list').hidden); };
$('tree-menu-list').addEventListener('click', () => treeMenu(false));
document.addEventListener('click', e => { if (!e.target.closest('.tree-menu-wrap')) treeMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('tree-menu-list').hidden) { treeMenu(false); $('tree-menu').focus(); } });
$('side-toggle').onclick = () => {
  sideAll = !sideAll;
  try { localStorage.setItem('familySideAll', sideAll ? '1' : '0'); } catch (_) {}
  shown = basePeople(); renderTree(); fit(); syncSide();
};
syncSide();
// A row of branches wider than the screen turns under the mouse wheel too, not only under a trackpad or a finger.
$('groups').addEventListener('wheel', e => {
  const g = $('groups');
  if (g.scrollWidth <= g.clientWidth || Math.abs(e.deltaX) >= Math.abs(e.deltaY)) return;
  e.preventDefault(); g.scrollLeft += e.deltaY;
}, {passive: false});
// The reader's plate «● Имя ×», first in the row of branches: the name opens their card, × asks to forget them.
function syncMe() {
  $('me-pill')?.remove();
  dialog($('me-ask'), false);
  // «Веер моих предков» in the menu «⋯»: only for a reader who said «Это я» and has a parent in the tree (fan.js).
  $('fan-mine').hidden = !(me && fanCan(me));
  if (me) $('groups').insertAdjacentHTML('afterbegin', `<span class="me-pill" id="me-pill"><button class="me-name" id="me-open" title="${esc(sayName(me))} — ${L('ваша карточка', 'your card')}"><i aria-hidden="true"></i><span class="long">${esc(sayName(me))}</span><span class="short">${esc(firstName(me))}</span></button><button class="me-x" id="me-forget" aria-label="${L('Забыть, что вы —', 'Forget that you are')} ${esc(sayName(me))}" title="${L('Забыть', 'Forget')}">×</button></span>`);
}
function setMe(id) {
  me = id ? cid(id) : null;
  try { if (me) localStorage.setItem(ME_KEY, me); else localStorage.removeItem(ME_KEY); } catch (_) {}
  // The reader's own branch joins the folded tree at once.
  if (me && !focus && !sideAll) { const before = shown.size; basePeople().forEach(x => shown.add(x)); if (shown.size > before) keepInPlace(me, renderTree); }
  syncMe();
  if (current?.p) personView(current.p);
  if (pageOpen === 'finds') findsView();
}
$('groups').addEventListener('click', e => {
  if (e.target.closest('#me-open')) go({p: me});
  else if (e.target.closest('#me-forget')) { $('me-ask-text').textContent = `${L('Забыть, что вы —', 'Forget that you are')} ${sayName(me)}?`; dialog($('me-ask'), true); $('me-yes').focus(); }
});
// Forgotten, the reader's plate is gone with its ×: the focus goes to the first button of the row.
$('me-yes').onclick = () => { setMe(null); $('groups').querySelector('button')?.focus(); };
$('me-no').onclick = () => { dialog($('me-ask'), false); $('me-forget')?.focus(); };
syncMe();
$('help-toggle').onclick = () => go({help: 1});
const startRoute = parseHash();
const startFocus = startRoute.startFocus, startGroup = startRoute.g, startYear = startRoute.y; delete startRoute.startFocus; delete startRoute.g; delete startRoute.y;
if (startYear) setSlice(startYear, true);
if (startGroup) { activeGroup = startGroup; shown = basePeople(); }
renderTree(); syncGroups();
$('focus-exit').onclick = () => exitFocus();
$('news-toggle').onclick = () => go({news: 1});
markNews(false);
// A video about the site (intro_video and intro_poster in data/site.json, paths from app/, one per language as
// {"en": …, "ru": …}): shown to every reader until they play it or hide it, then only from «?». Without a video
// there is neither.
const INTRO_KEY = 'familyIntroSeen', INTRO_VIDEO = loc(SITE.intro_video) || '', INTRO_POSTER = loc(SITE.intro_poster) || '';
const introSeen = () => { try { localStorage.setItem(INTRO_KEY, '1'); } catch (_) {} };
function showIntro(open) {
  const video = $('intro-video');
  if (open) {
    // Nothing is loaded before the dialog opens (phones on mobile data); preload="none" waits for «play».
    if (!video.getAttribute('src')) { video.poster = INTRO_POSTER; video.src = INTRO_VIDEO; }
    dialog($('intro'), true); $('intro-close').focus();
  } else {
    video.pause(); dialog($('intro'), false); introSeen();
  }
}
$('intro-video').addEventListener('play', introSeen);
$('intro-close').onclick = $('intro-hide').onclick = () => showIntro(false);
$('intro').addEventListener('click', e => { if (e.target === $('intro')) showIntro(false); });
// The legend closes under the video: closing the video gives the focus to «?», which opened both.
$('intro-open').onclick = () => { showLegend(false); $('legend-toggle').focus(); showIntro(true); };
$('intro-open').hidden = !INTRO_VIDEO;
// The switch of the language in the header: the other language of the site (data/site.json languages), kept in this
// browser; the page loads again in it. A site of one language has no switch.
{
  const other = LANGS.find(l => l !== LANG), b = $('lang-toggle');
  b.hidden = !other;
  if (other) {
    b.textContent = other.toUpperCase();
    b.title = b.ariaLabel = other === 'en' ? 'English' : 'Русский';
    b.onclick = () => { try { localStorage.setItem('familyLang', other); } catch (_) {} location.reload(); };
  }
}
try { if (INTRO_VIDEO && !localStorage.getItem(INTRO_KEY)) showIntro(true); } catch (_) {}
history.replaceState(startRoute, '', location.hash || '#');
if (startFocus && shown.has(startFocus)) focusOn(startFocus);
if (startRoute.p || startRoute.l || startRoute.f || startRoute.path || startRoute.news || startRoute.help || startRoute.send || startRoute.exp || startRoute.page || startRoute.pl) { render(startRoute, false); } else centerOn(home(), 1);
// A branch link shows the whole branch; otherwise the tree opens on the reader («Это я») or on the root person.
if (!startRoute.p && !startRoute.path && !focus) setTimeout(() => activeGroup ? viewGroup() : centerOn(home(), narrow() ? .8 : 1), 0);
// The tree is drawn: the parts of the data the pages need come now, in the quiet after (ui.js).
preloadParts();
// The browser pane and phones resize after load: until the reader moves the tree, the focused person stays
// in view. A change of height alone (Safari hiding its address bar, the keyboard) leaves the tree where it is;
// a new width (a turned phone, a wider pane) keeps the middle of the view in the middle.
let lastWidth = innerWidth;
window.addEventListener('resize', () => {
  const dw = innerWidth - lastWidth;
  lastWidth = innerWidth;
  if (!dw) return;
  if (!handMoved) centerOn(current?.p && shown.has(current.p) ? current.p : activeGroup ? GROUP.get(activeGroup).head : home());
  else { view.x += dw / 2; apply(); }
});
