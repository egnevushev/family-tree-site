// The page «Находки» (Finds): the most surprising finds, with a ribbon of years and who each person is to the reader.
// Depends on family.js (kinship), ui.js, panel.js and docs.js (the viewer).
'use strict';

// ---------- «Находки» (Finds): the most surprising finds ----------
// Written by hand in data/site-finds.md (and its translation) for the whole family, with full names; who each person
// is to the reader the site counts itself, once the reader said «This is me». A ribbon of years above; a find opens in
// place, its scan beside it.
// The finds themselves are the part «finds» (ui.js, loadPart): FINDS is filled when the page has it; till then
// find_hashes of data.js tells which finds there are and whether any is new.
let FINDS = D.finds || [];
let findsBranch = '', findOpen = null, findsNear = false;
// New for this reader: the browser keeps a hash of each find's text when the reader opens it (findsRead) and when the
// page lists it (findsSeen). A find not opened, or rewritten since, has a dot; the «Finds» button has one, like
// «What's new», while the page holds a find new or rewritten since the last visit. The hash is of the site's own
// language (BASE.finds, as find_hashes of data.js), so switching the language never makes every find look new.
const baseFindHash = f => findHash((BASE.finds || []).find(b => b.id === f.id) || f);
const findHashes = () => D.find_hashes || Object.fromEntries(FINDS.map(f => [f.id, baseFindHash(f)]));
const findsStore = key => { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (_) { return {}; } };
function findsKeep(key, list) {
  try { const m = findsStore(key); for (const f of list) m[f.id] = baseFindHash(f); localStorage.setItem(key, JSON.stringify(m)); } catch (_) {}
}
function markFinds() {
  const seen = findsStore('findsSeen'), on = Object.entries(findHashes()).some(([id, h]) => seen[id] !== h);
  document.querySelectorAll('[data-mode="finds"]').forEach(b => { b.classList.toggle('unread', on); b.setAttribute('aria-label', on ? L('Находки — есть новое', 'Finds — something new') : L('Находки', 'Finds')); });
}
let findsRead = {};
// How close a find is to the reader: the shortest chain from «This is me» to any of its people (for «Closest to me»).
const findDistance = f => Math.min(...f.people.map(cid).map(id => id === me ? 0 : kinPath(me, id)?.length ?? 99));
const findSpan = f => { const ys = (f.years.match(/\d{4}/g) || []).map(Number); return [ys[0] || 0, ys[ys.length - 1] || ys[0] || 0]; };
const findBranches = f => new Set(f.people.map(cid).flatMap(id => [...(memberOf.get(id) || [])]));
const findInk = f => `var(--g-${homeOf.get(cid(f.people[0])) || FIRST_GROUP}-ink)`;
function findDoc(f) {
  const claim = C.get(f.doc), sid = claim?.source_ids.find(s => S.get(s)?.views?.length);
  if (!sid) return '';
  const v = viewsFor(S.get(sid), f.doc)[0];
  return v ? `<button class="find-doc" data-doc="${esc(sid)}" data-citing="${esc(f.doc)}" aria-label="${L('Документ', 'Document')}: ${esc(S.get(sid).title)}">${thumb(v)}<small>${esc(S.get(sid).title)}</small></button>` : '';
}
function findPerson(id) {
  id = cid(id);
  if (!P.has(id)) return '';
  const g = homeOf.get(id), kin = youText(id), you = id === me ? L('Вам: это вы', 'This is you') : kin ? `${L('Вам', 'To you')}: ${kin}` : '';
  return `<button class="find-person" data-person-link="${esc(id)}"><i style="background:var(--g-${g || FIRST_GROUP}-ink)" aria-hidden="true"></i><span>${esc(sayName(id))}${you ? `<small>${esc(you)}</small>` : ''}</span></button>`;
}
function findHtml(f) {
  const [a, b] = findSpan(f), open = findOpen === f.id;
  const text = refsIn(), was = findsRead[f.id], fresh = was !== baseFindHash(f);
  const dot = !fresh ? '' : was ? `<span class="find-new" title="${L('Дополнено после вашего чтения', 'Updated since you read it')}">${L('дополнено', 'updated')}</span>` : `<span class="find-new" title="${L('Вы ещё не читали', 'Not read yet')}"></span>`;
  // The dot holds on to the title's last word, so a title that wraps never leaves it alone on a line of its own.
  const words = f.title.split(' '), last = words.pop();
  const title = dot ? `${esc(words.join(' '))}${words.length ? ' ' : ''}<span class="find-last">${esc(last)}${dot}</span>` : esc(f.title);
  return `<article class="find${open ? ' open' : ''}${fresh ? ' unread' : ''}" id="find-${esc(f.id)}" data-find="${esc(f.id)}" style="--find-ink:${findInk(f)}">
    <div class="find-years" aria-hidden="true"><b>${a}</b>${b !== a ? `<span>${b}</span>` : ''}</div>
    <div class="find-main">
      <p class="find-where">${esc(f.years)} · ${esc(f.where.split(/\s*,\s*/).join(' · '))}</p>
      <h3><button class="find-title" data-find-toggle="${esc(f.id)}" aria-expanded="${open}">${title}</button></h3>
      <p class="find-lead">${esc(f.lead)}</p>
      <div class="find-foot"><button class="find-more" data-find-toggle="${esc(f.id)}" aria-expanded="${open}">${open ? L('Свернуть', 'Show less') : L('Читать находку', 'Read the find')}</button><button class="find-link" data-find-copy="${esc(f.id)}">${L('Поделиться', 'Share')}</button></div>
      <div class="find-full"${open ? '' : ' hidden'}>
        ${f.text.split(/\n\s*\n/).map(par => `<p>${text(par.trim())}</p>`).join('')}
        ${f.weak ? `<p class="find-weak"><b>${L('На чём держится.', 'What it rests on.')}</b> ${text(f.weak)}</p>` : ''}
      </div>
      <div class="find-people">${f.people.map(findPerson).join('')}</div>
    </div>
    ${findDoc(f)}
  </article>`;
}
// The ribbon: each find a bar over its years, in lanes so bars never overlap; ticks every fifty years.
function findsRibbon(list) {
  const spans = list.map(findSpan), lo = Math.floor(Math.min(...spans.map(s => s[0])) / 50) * 50, hi = Math.ceil((Math.max(...spans.map(s => s[1])) + 1) / 50) * 50;
  const x = y => ((y - lo) / (hi - lo) * 100).toFixed(2) + '%';
  const lanes = [], bars = list.map((f, i) => {
    const [a, b] = spans[i], end = Math.max(b, a + (hi - lo) / 40);
    let lane = lanes.findIndex(e => e < a - (hi - lo) / 80); if (lane < 0) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = end;
    return `<button class="ribbon-bar${findOpen === f.id ? ' on' : ''}" data-find-go="${esc(f.id)}" style="left:${x(a)};width:calc(${x(end)} - ${x(a)});top:${lane * 14 + 4}px;background:${findInk(f)}" title="${esc(f.years)} — ${esc(f.title)}" aria-label="${esc(f.years)}: ${esc(f.title)}"></button>`;
  });
  const ticks = []; for (let y = lo; y <= hi; y += 50) ticks.push(`<span style="left:${x(y)}">${y}</span>`);
  return `<div class="ribbon" style="height:${lanes.length * 14 + 26}px">${bars.join('')}<div class="ribbon-ticks">${ticks.join('')}</div></div>`;
}
function findsView() {
  if (!D.finds) return;  // the part is still coming: the page draws once it is here
  FINDS = D.finds;
  const branches = GROUPS.filter(g => FINDS.some(f => findBranches(f).has(g.id)));
  if (findsBranch && !branches.some(g => g.id === findsBranch)) findsBranch = '';
  const list = FINDS.filter(f => !findsBranch || findBranches(f).has(findsBranch));
  if (me && findsNear) { const d = new Map(list.map(f => [f, findDistance(f)])); list.sort((a, b) => d.get(a) - d.get(b)); }
  // The open find counts as read; the dots of the others stay until they are opened.
  if (findOpen) findsKeep('findsRead', FINDS.filter(f => f.id === findOpen));
  findsRead = findsStore('findsRead');
  $('finds-filter').innerHTML = [['', L('Все', 'All'), FINDS.length], ...branches.map(g => [g.id, g.title, FINDS.filter(f => findBranches(f).has(g.id)).length])]
    .map(([id, t, n]) => `<button data-finds-branch="${esc(id)}" aria-pressed="${id === findsBranch}">${id ? `<i style="background:var(--g-${id}-ink)" aria-hidden="true"></i>` : ''}${esc(t)} <small>${n}</small></button>`).join('');
  const meNote = me ? `<p class="finds-me">${L(`У каждого имени написано, кем человек приходится вам, ${esc(sayName(me))}. «Вероятно» — где в цепочке есть неподтверждённое звено.`, `Every name says how the person is related to you, ${esc(sayName(me))}. «Probably» means a link of the chain is not confirmed.`)}</p>`
    : `<p class="finds-me">${L('Кем вам приходятся эти люди? Откройте на древе свою карточку и нажмите «Это я» — здесь у каждого имени появится родство.', 'How are these people related to you? Open your own card on the tree and press «This is me», and every name here will show the kinship.')}</p>`;
  $('finds-body').innerHTML = `<div class="finds">
    <header class="finds-cover"><p class="eyebrow">${esc(SITE_NAME)}</p><h1>${L('Находки', 'Finds')}</h1>
      <p>${L('Самое неожиданное, что нашлось в архивах. Всё — по документам: цифры в тексте ведут к фактам, имена — к карточкам людей, картинка рядом — к скану.', 'The most surprising things the archives turned up. Everything rests on documents: the numbers in the text lead to the facts, the names to the people’s cards, the picture beside a find to its scan.')}</p>${meNote}</header>
    ${me ? `<div class="finds-order" role="group" aria-label="${L('Порядок', 'Order')}"><button data-finds-near="" aria-pressed="${!findsNear}">${L('По времени', 'By time')}</button><button data-finds-near="1" aria-pressed="${findsNear}">${L('Ближе ко мне', 'Closest to me')}</button></div>` : ''}
    ${list.length ? findsRibbon(list) : ''}
    ${list.map(findHtml).join('') || `<p class="muted">${L('В этой ветке находок пока нет.', 'No finds in this branch yet.')}</p>`}
  </div>`;
  if (findOpen) requestAnimationFrame(() => { const el = $('find-' + findOpen); if (el) $('finds-body').scrollTop += el.getBoundingClientRect().top - $('finds-body').getBoundingClientRect().top - 8; });
  findsKeep('findsSeen', list);
  markFinds();
}
function toggleFind(id, only) {
  findOpen = only || findOpen !== id ? id : null;
  // The open find is in the link, so it can be sent; the list itself stays where it is.
  const st = {...(history.state || {}), page: 'finds'}; if (findOpen) st.find = findOpen; else delete st.find;
  history.replaceState(st, '', hashOf(st));
  const top = $('finds-body').scrollTop;
  findsView();
  if (!only) $('finds-body').scrollTop = top;
}
$('finds-filter').addEventListener('click', e => { const b = e.target.closest('[data-finds-branch]'); if (!b) return; findsBranch = b.dataset.findsBranch; findsView(); $('finds-body').scrollTop = 0; });
$('finds-body').addEventListener('click', e => {
  const t = e.target.closest('[data-find-toggle],[data-find-go],[data-find-copy],[data-finds-near],[data-person-link],[data-ref],[data-doc]'); if (!t) return;
  if (t.dataset.findsNear !== undefined) { findsNear = !!t.dataset.findsNear; findsView(); }
  else if (t.dataset.findToggle) toggleFind(t.dataset.findToggle);
  else if (t.dataset.findGo) toggleFind(t.dataset.findGo, t.dataset.findGo);
  else if (t.dataset.findCopy) {
    const url = location.href.split('#')[0] + '#finds=' + encodeURIComponent(t.dataset.findCopy);
    // A phone opens its share sheet (messengers, mail); elsewhere the link is copied.
    const f = FINDS.find(x => x.id === t.dataset.findCopy);
    const done = () => { t.textContent = L('Ссылка скопирована', 'Link copied'); setTimeout(() => { t.textContent = L('Поделиться', 'Share'); }, 1600); };
    const ask = () => prompt(L('Ссылка на находку:', 'Link to the find:'), url);
    const copy = () => navigator.clipboard?.writeText(url).then(done, ask) ?? ask();
    if (navigator.share && matchMedia('(pointer: coarse)').matches) navigator.share({title: f?.title, text: f?.lead, url}).catch(e => { if (e.name !== 'AbortError') copy(); });
    else copy();
  }
  else if (t.dataset.personLink) go({p: t.dataset.personLink});
  else if (t.dataset.ref) go({f: t.dataset.ref});
  else if (t.dataset.doc) openViewerFrom(t, t.closest('[data-find]') || $('finds-body'));
});
markFinds();
// The open find is in the link, #finds=<id>, so it can be sent.
registerPage('finds', {
  el: 'finds-page', mode: true, again: true, part: 'finds',
  available: () => Object.keys(findHashes()).length > 0,
  show(route) { findOpen = route.find || findOpen; findsView(); },
  parse(v, route) { if (v) route.find = decodeURIComponent(v); },
  hash: route => route.find ? `finds=${encodeURIComponent(route.find)}` : 'finds',
});
