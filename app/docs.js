// The page «Документы» (Documents: every cited scan by place or year) and the document viewer with the record box, which
// cards and «Находки» open too. Depends on facts.js (docsData), ui.js, panzoom.js and panel.js.
'use strict';

// ---------- Documents: every cited scan, by place or by year, opened in the viewer with its box ----------
let docsBy = 'place';
// A thumbnail cropped to the record box, loaded only when it comes into view.
const lazyThumbs = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const el = e.target; el.style.backgroundImage = `url('${el.dataset.bg}')`; lazyThumbs.unobserve(el);
}), {root: null, rootMargin: '300px'}) : null;
function docTile(d) {
  const v = viewsFor(d.s, d.citing || null).find(v => v.boxes.mine.length) || viewsFor(d.s, null)[0];
  const b = v.boxes.mine[0], img = v.mid || v.src;
  let style = `background-size:cover;background-position:50% 0`;
  if (b) { const c = cropOf(b); style = `${c.size};${c.at}`; }
  const where = [d.places.map(pl => pl.name.replace(/ \(.*\)$/, '')).join(', '), d.year || ''].filter(Boolean).join(' · ');
  return `<button class="doc-tile" data-doc="${esc(d.s.id)}" data-citing="${esc(d.citing)}"><span class="tile-img${b ? ' boxed' : ''}" data-bg="${esc(img)}" style="${style}" role="img" aria-label="${esc(b?.label || d.s.title)}"></span>
    <span class="tile-meta"><strong>${esc(d.s.title)}</strong><small>${esc(where)}</small>${d.people.length ? `<small class="tile-who">${esc(d.people.slice(0, 2).map(sayName).join(', '))}${d.people.length > 2 ? ` ${L('и ещё', 'and')} ${d.people.length - 2}${L('', ' more')}` : ''}</small>` : ''}</span></button>`;
}
// A photo of the album: the snapshot opens the viewer; under it the people it is tied to and «Знаю, кто на снимке».
function photoTile(d) {
  const v = d.s.views[0];
  return `<div class="photo-card"><button class="doc-tile" data-doc="${esc(d.s.id)}" data-citing="${esc(d.citing)}"><span class="tile-img photo-img" data-bg="${esc(v.mid || v.src)}" role="img" aria-label="${esc(d.s.title)}"></span>
    <span class="tile-meta"><strong>${esc(d.s.title)}</strong></span></button>
    ${d.people.length ? `<div class="photo-who">${d.people.map(id => `<button class="linklike" data-person-link="${esc(id)}">${esc(sayName(id))}</button>`).join('')}</div>` : ''}
    <button class="linklike photo-know" data-send="ph:${esc(d.s.id)}">${L('Знаю, кто на снимке или когда он сделан', 'I know who is in the photo or when it was taken')}</button></div>`;
}
function docsView() {
  document.querySelectorAll('[data-docs-by]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.docsBy === docsBy)));
  $('docs-page').classList.toggle('photos', docsBy === 'photo');
  if (docsBy === 'photo') {
    const photos = photosData();
    $('docs-jump').innerHTML = '';
    $('docs-body').innerHTML = `<p class="muted docs-lead">${L(`Снимков: ${photos.length}. Портреты и семейные фотографии людей древа. Нажмите на снимок, чтобы рассмотреть его. Знаете, кто на нём или когда он сделан, — напишите.`, `${photos.length} ${plural(photos.length, ['снимок', 'снимка', 'снимков'], ['photo', 'photos'])}: portraits and family photos of the people of the tree. Click a photo to look at it closely. If you know who is in it or when it was taken, write to us.`)}</p>
      <div class="docs-grid photo-grid">${photos.map(photoTile).join('')}</div>`;
    $('docs-body').scrollTop = 0;
    $('docs-body').querySelectorAll('.tile-img').forEach(el => lazyThumbs ? lazyThumbs.observe(el) : (el.style.backgroundImage = `url('${el.dataset.bg}')`));
    return;
  }
  const docs = docsData();
  const byYear = (a, b) => (a.year || 9999) - (b.year || 9999) || a.s.title.localeCompare(b.s.title, 'ru');
  let sections;
  if (docsBy === 'place') {
    const groups = new Map();
    docs.forEach(d => (d.places.length ? d.places : [null]).forEach(pl => { const k = pl?.id || ''; if (!groups.has(k)) groups.set(k, {title: pl ? pl.name : L('Место не указано', 'Place not given'), docs: []}); groups.get(k).docs.push(d); }));
    sections = [...groups.entries()].sort((a, b) => (!a[0]) - (!b[0]) || b[1].docs.length - a[1].docs.length || a[1].title.localeCompare(b[1].title, 'ru')).map(([, g]) => g);
  } else {
    const groups = new Map();
    docs.forEach(d => { const k = d.year ? Math.floor(d.year / 10) * 10 : 0; if (!groups.has(k)) groups.set(k, {title: k ? L(`${k}-е`, `${k}s`) : L('Год не указан', 'Year not given'), docs: []}); groups.get(k).docs.push(d); });
    sections = [...groups.entries()].sort((a, b) => (a[0] || 9999) - (b[0] || 9999)).map(([, g]) => g);
  }
  sections.forEach(g => g.docs.sort(byYear));
  $('docs-jump').innerHTML = sections.map((g, i) => `<button data-docs-to="${i}">${esc(g.title.replace(/ \(.*\)$/, ''))} <small>${g.docs.length}</small></button>`).join('');
  $('docs-body').innerHTML = `<p class="muted docs-lead">${docs.length} ${L('документов эпохи и публикаций, на которые ссылаются факты древа. Нажмите — документ откроется с рамкой вокруг записи.', 'documents of the time and publications that the facts of the tree cite. Click one to open it with a box around the record.')}</p>`
    + sections.map((g, i) => `<section class="docs-section" data-docs-section="${i}"><h3>${esc(g.title)} <small>${g.docs.length}</small></h3><div class="docs-grid">${g.docs.map(docTile).join('')}</div></section>`).join('');
  $('docs-body').scrollTop = 0;
  syncDocsJump();
  $('docs-body').querySelectorAll('.tile-img').forEach(el => lazyThumbs ? lazyThumbs.observe(el) : (el.style.backgroundImage = `url('${el.dataset.bg}')`));
}
document.querySelectorAll('[data-docs-by]').forEach(b => { b.onclick = () => { docsBy = b.dataset.docsBy; docsView(); }; });
$('docs-jump').addEventListener('click', e => { const b = e.target.closest('[data-docs-to]'); if (!b) return; const sec = $('docs-body').querySelector(`[data-docs-section="${b.dataset.docsTo}"]`); $('docs-body').scrollTop += sec.getBoundingClientRect().top - $('docs-body').getBoundingClientRect().top - 4; });
$('docs-body').addEventListener('click', e => {
  // The album: a person's card over the page, the form with the snapshot as its subject (the page stays).
  const t = e.target.closest('[data-person-link],[data-send]');
  if (t) { if (t.dataset.personLink) go({p: t.dataset.personLink}); else go({page: 'docs', send: t.dataset.send}); return; }
  const b = e.target.closest('[data-doc]'); if (b) openViewerFrom(b, $('docs-body'));
});
// A document opened from a list — the documents page, a card, a find — steps through the other documents of that
// list (the side arrows, ← → past the first or the last page), in their order; a document that stands twice is
// stepped through once, where it first stands.
function openViewerFrom(b, scope) {
  const tiles = [...scope.querySelectorAll('[data-doc]')].filter((t, k, all) => all.findIndex(x => x.dataset.doc === t.dataset.doc) === k);
  const i = tiles.findIndex(t => t.dataset.doc === b.dataset.doc);
  openViewer(b.dataset.doc, b.dataset.citing, tiles.length > 1 ? {items: tiles.map(t => ({sid: t.dataset.doc, citing: t.dataset.citing})), i} : null);
}
// The row of sections marks the one being looked at and keeps it in view, as the contents of a long card.
function syncDocsJump() {
  const nav = $('docs-jump'), box = $('docs-body').getBoundingClientRect();
  const secs = [...$('docs-body').querySelectorAll('.docs-section')];
  let on = secs.filter(s => s.getBoundingClientRect().top <= box.top + 40).pop() || secs[0];
  if ($('docs-body').scrollTop + $('docs-body').clientHeight >= $('docs-body').scrollHeight - 2) on = secs[secs.length - 1];
  nav.querySelectorAll('[data-docs-to]').forEach(b => {
    const mine = !!on && b.dataset.docsTo === on.dataset.docsSection;
    if (mine && !b.classList.contains('on')) nav.scrollTo({left: b.offsetLeft - 16, behavior: 'smooth'});
    b.classList.toggle('on', mine);
  });
}
$('docs-body').addEventListener('scroll', syncDocsJump, {passive: true});
registerPage('docs', {el: 'docs-page', mode: true, show: docsView});


// ---------- Document viewer with the record box ----------
const vv = {x: 0, y: 0, k: 1, w: 1, h: 1};
let viewerState = null;
function vApply() { $('viewer-sheet').style.transform = `translate(${vv.x}px,${vv.y}px) scale(${vv.k})`; }
function vFitTo(box) {
  const r = $('viewer-stage').getBoundingClientRect();
  const [x0, y0, x1, y1] = box ? [Math.max(0, box[0] - .06), Math.max(0, box[1] - .08), Math.min(1, box[2] + .06), Math.min(1, box[3] + .08)] : [0, 0, 1, 1];
  const k = Math.min(r.width / ((x1 - x0) * vv.w), r.height / ((y1 - y0) * vv.h)) * .96;
  vv.k = k; vv.x = r.width / 2 - (x0 + x1) / 2 * vv.w * k; vv.y = r.height / 2 - (y0 + y1) / 2 * vv.h * k; vApply();
}
function showPage(i) {
  const {src, views, citing} = viewerState;
  viewerState.i = i;
  const v = views[i];
  $('viewer-page').textContent = views.length > 1 ? `${i + 1} / ${views.length}` : '';
  $('viewer-prev').disabled = i === 0; $('viewer-next').disabled = i >= views.length - 1;
  $('viewer-prev').hidden = $('viewer-next').hidden = views.length < 2;
  if (!v) {
    const r = $('viewer-stage').getBoundingClientRect();
    vv.w = Math.min(900, r.width); vv.h = r.height; vv.k = 1; vv.x = (r.width - vv.w) / 2; vv.y = 0; vApply();
    $('viewer-sheet').style.width = vv.w + 'px'; $('viewer-sheet').style.height = vv.h + 'px';
    $('viewer-sheet').innerHTML = `<iframe src="${esc(src.text)}" title="${esc(src.title)}"></iframe>`;
    return;
  }
  vv.w = v.w; vv.h = v.h;
  $('viewer-sheet').style.width = v.w + 'px'; $('viewer-sheet').style.height = v.h + 'px';
  const boxes = [...v.boxes.mine.map(b => [b, '']), ...v.boxes.other.map(b => [b, 'other'])];
  $('viewer-sheet').innerHTML = `<img src="${esc(v.src)}" alt="${esc(src.title)}">` + boxes.map(([b, cls]) => {
    const [x0, y0, x1, y1] = b.box;
    return `<div class="box ${cls}" style="left:${x0 * 100}%;top:${y0 * 100}%;width:${(x1 - x0) * 100}%;height:${(y1 - y0) * 100}%;border-width:${3 / Math.max(.2, vv.k)}px">${b.label && !cls ? `<span>${esc(b.label)}</span>` : ''}</div>`;
  }).join('');
  vFitTo(v.boxes.mine[0]?.box);
  // Keep the box outline readable at any zoom.
  $('viewer-sheet').querySelectorAll('.box').forEach(el => el.style.borderWidth = (3 / vv.k) + 'px');
  $('viewer-sheet').querySelectorAll('.box span').forEach(el => { el.style.transform = `scale(${1 / vv.k})`; el.style.transformOrigin = '0 100%'; });
}
// From «Документы» (Documents) the viewer also steps to the previous and the next document of the page (the side arrows,
// ← → past the first or the last page), in the order of the page; the history keeps one entry for the viewer.
function openViewer(sid, citing, list) {
  const src = S.get(sid); if (!src) return;
  if (!viewerLoad(sid, citing, list)) { if (src.url) window.open(src.url, '_blank', 'noopener'); return; }
  dialog($('viewer'), true);
  showPage(0);
  $('viewer-close').focus();
  history.pushState({...history.state, viewer: true}, '', location.hash);
}
function viewerLoad(sid, citing, list) {
  const src = S.get(sid);
  const views = viewsFor(src, citing && citing !== 'null' ? citing : null);
  if (!views.length && !src.text) return false;
  viewerState = {src, views, citing, i: 0, list};
  const c = C.get(citing), r = R.get(citing);
  $('viewer-title').textContent = src.title;
  $('viewer-sub').textContent = c ? `${nameOf(c.person_id)}: ${field(c.field)} — ${c.locator || ''}` : r ? `${L('Связь', 'Link')}: ${nameOf(r.from_id)} → ${nameOf(r.to_id)}` : '';
  $('viewer-foot').innerHTML = [
    c?.value ? `<strong>${esc(fmtDate(c.value))}</strong>` : '',
    views.some(v => v.boxes.mine.length) ? L('Рамкой выделена запись, на которую ссылается факт.', 'The box marks the record the fact cites.') : (views.length ? L('Запись на странице рамкой пока не отмечена.', 'The record is not boxed on the page yet.') : ''),
    src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${L('Открыть в архиве или на сайте источника', 'Open in the archive or on the source’s site')} ↗</a>` : '',
  ].filter(Boolean).join(' · ');
  if (list) $('viewer-sub').textContent = `${L('Документ', 'Document')} ${list.i + 1} ${L('из', 'of')} ${list.items.length}` + ($('viewer-sub').textContent ? ' · ' + $('viewer-sub').textContent : '');
  $('viewer-doc-prev').hidden = $('viewer-doc-next').hidden = !list;
  if (list) { $('viewer-doc-prev').disabled = list.i === 0; $('viewer-doc-next').disabled = list.i >= list.items.length - 1; }
  return true;
}
function docStep(d) {
  const list = viewerState?.list;
  if (!list) return;
  // A document without pages to show (only a site link) is passed over.
  for (let j = list.i + d; j >= 0 && j < list.items.length; j += d) {
    const it = list.items[j];
    if (viewerLoad(it.sid, it.citing, {...list, i: j})) { showPage(d < 0 ? Math.max(0, viewerState.views.length - 1) : 0); return; }
  }
}
$('viewer-doc-prev').onclick = () => docStep(-1);
$('viewer-doc-next').onclick = () => docStep(1);
function closeViewer(fromHistory) {
  if ($('viewer').hidden) return;
  dialog($('viewer'), false); viewerState = null; $('viewer-sheet').innerHTML = '';
  // Closing by × or Escape removes the viewer's history entry without re-rendering the card.
  if (!fromHistory && history.state?.viewer) { skipPop = true; history.back(); }
}
$('viewer-close').onclick = () => closeViewer();
$('viewer-prev').onclick = () => showPage(viewerState.i - 1);
$('viewer-next').onclick = () => showPage(viewerState.i + 1);
// Moving and zooming the document: as the tree (panzoom.js), but from the first pixel and without taps.
const vstage = $('viewer-stage');
panZoom(vstage, {
  view: () => vv,
  pan(e, g) { vv.x = g.view.x + e.clientX - g.start.x; vv.y = g.view.y + e.clientY - g.start.y; vApply(); },
  pinch: (g, d, x, y) => vZoom(g.pinch.k * d / g.pinch.d, x, y),
});
function vZoom(k, cx, cy) {
  k = Math.max(.05, Math.min(6, k));
  vv.x = cx - (cx - vv.x) * k / vv.k; vv.y = cy - (cy - vv.y) * k / vv.k; vv.k = k; vApply();
  $('viewer-sheet').querySelectorAll('.box').forEach(el => el.style.borderWidth = (3 / vv.k) + 'px');
  $('viewer-sheet').querySelectorAll('.box span').forEach(el => el.style.transform = `scale(${1 / vv.k})`);
}
wheelZoom(vstage, {
  zoomBy: (f, x, y) => vZoom(vv.k * f, x, y),
  panBy(dx, dy) { vv.x -= dx; vv.y -= dy; vApply(); },
});
