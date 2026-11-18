// The page itself: element lookup, the screen, the reader's saved choices, dialogs and the registry of pages over
// the tree. Depends on core.js and family.js; the first file that touches the page.
'use strict';
const $ = id => document.getElementById(id);
const narrow = () => matchMedia('(max-width: 760px)').matches;
// A phone or tablet: the hints speak of touches, not clicks.
const touchScreen = () => matchMedia('(hover: none) and (pointer: coarse)').matches;

// ---------- The reader's choices kept in this browser ----------
try { const id = localStorage.getItem(ME_KEY); if (id && P.has(id) && living(id)) me = cid(id); } catch (_) {}
try { sideAll = localStorage.getItem('familySideAll') !== '0'; } catch (_) {}
shown = basePeople();


// ---------- Dialogs ----------
// While a dialog is open (the document, the video, «Забыть…?») the rest of the page is inert, so Tab and a screen
// reader stay in it; closing gives the focus back to where it was opened from. All in one go, so that a focus
// given back right after is not refused by a part of the page still inert.
const dialogs = [];
function dialog(el, open) {
  const at = dialogs.findIndex(d => d.el === el);
  let back = null;
  el.hidden = !open;
  if (open && at < 0) dialogs.push({el, back: document.activeElement});
  if (!open && at >= 0) back = dialogs.splice(at, 1)[0].back;
  const top = dialogs[dialogs.length - 1]?.el;
  for (const c of document.body.children) if (c.tagName !== 'SCRIPT') c.inert = !!top && c !== top;
  if (back?.isConnected && back !== document.body) back.focus({preventScroll: true});
}

// ---------- Parts of the data loaded later ----------
// Sections the first screen does not need (the base of the map, the older entries of «Что нового», the finds) come
// in files of their own, app/data-<part>.js, named in data.js with the hash of each (scripts/site_data.py, PARTS).
// loadPart(name) loads one once and merges it into D; a failed load is forgotten, so it can be tried again.
// A data.js with every section in it (a build without parts) has nothing to load: every part is ready at once.
const partReady = name => !D.parts?.[name] || D.parts[name].keys.every(k => k in D);
const partLoads = new Map();
function loadPart(name) {
  if (partReady(name)) return Promise.resolve();
  if (!partLoads.has(name)) {
    const part = D.parts[name];
    const load = new Promise((done, failed) => {
      // A new element for every try: the same src set again on an element would not load again.
      const s = document.createElement('script');
      s.src = `${part.file}?v=${part.v}`;
      s.onload = () => { s.remove(); const got = window['FAMILY_DATA_' + name]; if (got) { Object.assign(D, localizePart(got)); done(); } else failed(Error(part.file + ' is empty')); };
      s.onerror = () => { s.remove(); failed(Error(part.file + ' did not load')); };
      document.head.appendChild(s);
    });
    partLoads.set(name, load.catch(e => { partLoads.delete(name); throw e; }));
  }
  return partLoads.get(name);
}
// Once the tree is drawn, the parts load ahead in the quiet moment after, so the pages open at once.
function preloadParts() {
  const all = () => Object.keys(D.parts || {}).forEach(name => loadPart(name).catch(() => {}));
  if (window.requestIdleCallback) requestIdleCallback(all, {timeout: 3000}); else setTimeout(all, 300);
}
// A part that did not come (a dropped connection): a short word in place of what was to be drawn, and «Повторить».
function partFail(retry, text = L('Не удалось загрузить эту часть сайта. Проверьте связь и попробуйте ещё раз.', 'This part of the site did not load. Check the connection and try again.')) {
  const box = document.createElement('div');
  box.className = 'part-fail';
  box.setAttribute('role', 'alert');
  box.innerHTML = `<div class="load-fail-box"><p>${esc(text)}</p><button>${L('Повторить', 'Try again')}</button></div>`;
  box.querySelector('button').onclick = retry;
  return box;
}

// ---------- Pages over the tree: the map, documents, the booklet, «В этот день», «Находки» ----------
// A page covers the tree; cards open over it on the right (on a phone, as the sheet) and close back to it.
// Each page registers itself in its own file: registerPage(name, {…}), with
//   el          the id of its <section class="page"> in index.html;
//   show(route) draw it for a route {page: name, …} when it opens;
//   again       a route to the page while it is open shows it again (its scope or open item may have changed);
//   mode        it has a button in the switch of modes, [data-mode="name"] in index.html;
//   available() whether it can open at all (no places, no finds: no page);
//   parse(value, route)  read what follows «#name=» in a link into the route;
//   hash(route) its part of the link (default: the name alone);
//   state()     what of the route it shows now ({book: 'g:ivanovy'}): a card opened over it, or closed, keeps it;
//   leave()     it closes;  sync()  any page opened or closed (for what lives outside the page);
//   redraw()    the card beside it opened or closed: draw it again for the room left;
//   cardClosed() a card opened over it was closed;
//   part        the part of the data it draws from (loadPart): show waits for it, and says so if it fails.
// A new page: its file with registerPage, its section in index.html and, if wanted, a mode button; the links
// (#name, #name=…), the switch of modes, «К древу ×» and Escape then work without other changes.
const PAGES = new Map();
let pageOpen = null;
function registerPage(name, page) { PAGES.set(name, {...page, el: $(page.el)}); }
function setPage(name, route = {}) {
  const page = PAGES.get(name);
  if (!page || page.available && !page.available()) name = null;
  if (name === pageOpen) { if (name && page.again) openPageView(name, route); return; }
  const left = PAGES.get(pageOpen);
  pageOpen = name;
  PAGES.forEach((p, k) => { p.el.hidden = k !== name; });
  document.body.classList.toggle('page-open', !!name);
  left?.leave?.();
  if (name) openPageView(name, route);
  syncModes();
  PAGES.forEach(p => p.sync?.());
}
// A page draws at once when its part is here; else once the part comes, if the page is still open then and no
// later route asked for it again. A part that fails leaves the page's head and a word with «Повторить».
function openPageView(name, route) {
  const page = PAGES.get(name), ticket = page.ticket = {};
  page.el.querySelector(':scope > .part-fail')?.remove();
  page.el.classList.remove('part-wait');
  if (!page.part || partReady(page.part)) { page.show(route); return; }
  loadPart(page.part).then(() => { if (pageOpen === name && page.ticket === ticket) page.show(route); }, () => {
    if (pageOpen !== name || page.ticket !== ticket) return;
    page.el.classList.add('part-wait');
    page.el.appendChild(partFail(() => openPageView(name, route)));
  });
}
// Leaving the page for the tree (a branch, the focus, «Кем приходится»): the link loses the page.
function leavePage() {
  if (!pageOpen) return;
  setPage(null);
  const st = {...(history.state || {})}; delete st.page;
  history.replaceState(st, '', hashOf(st));
}
// The switch of modes: Древо, Карта, Документы; on a phone it is the bar at
// the foot of the screen. «В этот день» is no mode: a quiet line at the foot of the tree opens it.
function syncModes() {
  const mode = PAGES.get(pageOpen)?.mode ? pageOpen : pageOpen ? '' : 'tree';
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
}
// The header holds the switch on a computer; on a phone the same switch is a bar at the foot, outside the header.
const onMode = e => {
  const b = e.target.closest('[data-mode]'); if (!b) return;
  if (b.dataset.mode === 'tree') { if (pageOpen) { stack.length = 0; go({}); } }
  else go({page: b.dataset.mode});
};
$('modes').addEventListener('click', onMode);
$('modes-foot').addEventListener('click', onMode);
// «К древу ×» of every page closes it, with the cards opened over it.
document.querySelectorAll('.page .page-close').forEach(b => { b.onclick = () => { stack.length = 0; go({}); }; });
