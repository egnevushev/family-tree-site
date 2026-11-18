// Print: the tree on A3 and a card on A4; the page «Книжка историй» (Book of stories); the view «Скачать древо»
// (Download the tree: GEDCOM, gedcom.js).
// Depends on facts.js, gedcom.js, ui.js and panel.js.
'use strict';

// ---------- Print: the tree on an A3 sheet; a booklet of the stories of a branch or of a person ----------
// The tree prints as it is on the screen (a branch, the focus or all of it), fitted to the sheet, without the
// header, the card or the buttons; its lines keep their own thin width. The booklet prints on A4.
let bookScope = 'g:';
const printStyle = document.createElement('style');
document.head.appendChild(printStyle);
let printing = null;
function treeTitle() {
  if (current?.path) { const [a, b] = current.path.split('~'); if (P.has(a) && P.has(b)) return `${L('Кем приходится', 'How related')} ${sayName(cid(a))} — ${sayName(cid(b))}`; }
  return (focus ? `${sayName(focus)} ${L('и его предки', 'and their ancestors')}` : activeGroup ? `${L('Ветка', 'Branch')} ${GROUP.get(activeGroup).title}` : L('Всё древо', 'Whole tree')) + (sliceYear ? L(` · в ${sliceYear} году`, ` · in ${sliceYear}`) : '');
}
// What a print is of: the card (its «Печать» button), the booklet (its page) or else the tree.
let printWhat = null;
window.addEventListener('beforeprint', () => {
  if (printWhat === 'card' && panel.dataset.state !== 'closed') {
    printStyle.textContent = '@page{size:A4 portrait;margin:16mm 16mm 18mm}'; printing = 'card'; document.body.classList.add('printing-card');
    body.insertAdjacentHTML('afterbegin', `<p class="print-card-head">${esc(SITE_NAME)} · ${L('напечатано', 'printed')} ${esc(new Date().toLocaleDateString(LOCALE))}</p>`);
    return;
  }
  if (pageOpen === 'fan') { printStyle.textContent = '@page{size:A4 landscape;margin:10mm}'; printing = 'fan'; fanPrintStart(); return; }
  if (pageOpen === 'book') { printStyle.textContent = '@page{size:A4 portrait;margin:16mm 16mm 18mm}'; printing = 'book'; document.body.classList.add('printing-book'); return; }
  const world = $('world'), svg = $('tree');
  printing = {transform: world.getAttribute('transform')};
  world.removeAttribute('transform');
  const b = world.getBBox(), pad = 24;
  svg.setAttribute('viewBox', `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  printStyle.textContent = '@page{size:A3 landscape;margin:10mm}';
  // The title on top of the sheet, the legend of the lines at its foot.
  $('print-head').innerHTML = `<strong>${esc(SITE_NAME)} · ${esc(treeTitle())}</strong><span>${L('Напечатано', 'Printed')} ${esc(new Date().toLocaleDateString(LOCALE))}</span>`;
  $('print-legend').innerHTML = LEGEND.map(([lv, name]) => `<i><svg viewBox="0 0 30 8"><path class="edge lvl${lv}" d="M2,4 H28"/></svg>${esc(name)}</i>`).join('');
  document.body.classList.add('printing-tree');
});
window.addEventListener('afterprint', () => {
  if (printing === 'fan') fanPrintEnd();
  document.body.classList.remove('printing-tree', 'printing-book', 'printing-card');
  body.querySelector('.print-card-head')?.remove();
  printWhat = null;
  if (printing && typeof printing === 'object') { $('tree').removeAttribute('viewBox'); $('tree').removeAttribute('preserveAspectRatio'); apply(); }
  printing = null; printStyle.textContent = '';
});
// Whose booklet: a branch («g:sokolovy», all of the tree «g:») or a person with their ancestors («p:ivan»).
function bookPeople(scope) {
  let ids;
  if (scope.startsWith('p:')) {
    const id = cid(scope.slice(2)); ids = new Set([id]);
    for (const queue = [id]; queue.length;) parentsOf(queue.pop()).forEach(x => { if (!ids.has(x)) { ids.add(x); queue.push(x); } });
  } else {
    const g = scope.slice(2);
    ids = new Set([...inTree].filter(id => !g || homeOf.get(id) === g));
  }
  // Only who has a story or a life line; in order of time, the unknown at the end.
  const first = id => bornYear(P.get(id)) || lifeLine(id).find(r => r.years[0])?.years[0] || 9999;
  return [...ids].map(cid).filter((id, i, a) => a.indexOf(id) === i && P.has(id) && !minorChild(P.get(id)) && (D.stories[id] || lifeLine(id).length >= 2))
    .sort((a, b) => first(a) - first(b) || nameOf(a).localeCompare(nameOf(b), 'ru'));
}
// A reference of the booklet as an endnote: the fact, the link or the conflict, and its documents.
function noteOf(ref) {
  const docs = ids => [...new Set(ids || [])].map(sid => S.get(sid)?.title).filter(Boolean);
  if (ref.startsWith('S:')) return {text: S.get(ref.slice(2))?.title || ref.slice(2), docs: []};
  const c = C.get(ref); if (c) return {text: `${field(c.field)}: ${cut(fmtDate(c.value), 160)} (${label(c.status).toLowerCase()})`, docs: docs(c.source_ids)};
  const r = R.get(ref); if (r) return {text: `${nameOf(r.from_id)} — ${nameOf(r.to_id)}: ${relationName(r, r.from_id).toLowerCase()} (${label(r.status).toLowerCase()})`, docs: docs(r.source_ids)};
  const x = X.get(ref); if (x) return {text: `${L('Расхождение', 'Disagreement')}: ${x.title}`, docs: docs(x.source_ids)};
  return {text: ref, docs: []};
}
function bookView() {
  const scope = bookScope;
  // Whose booklet: a list of our own that always opens downwards (the system list of macOS opens over the button).
  const scopes = [['g:', L('Всё древо', 'Whole tree')], ...GROUPS.map(g => ['g:' + g.id, g.title]), ...(scope.startsWith('p:') && P.has(scope.slice(2)) ? [[scope, `${sayName(cid(scope.slice(2)))} ${L('и предки', 'and ancestors')}`]] : [])];
  $('book-scope-list').innerHTML = scopes.map(([v, t]) => `<button role="option" data-scope="${esc(v)}" aria-selected="${v === scope}">${esc(t)}</button>`).join('');
  $('book-scope-label').textContent = (scopes.find(([v]) => v === scope) || scopes[0])[1];
  const people = bookPeople(scope);
  const title = scope.startsWith('p:') ? `${sayName(cid(scope.slice(2)))} ${L('и его предки', 'and their ancestors')}` : scope === 'g:' ? L('Всё древо', 'Whole tree') : GROUP.get(scope.slice(2))?.title || '';
  const person = id => {
    const story = D.stories[id], notes = [];
    const refIn = text => esc(text).replace(REF_RE, (_, ref) => { let n = notes.indexOf(ref); if (n < 0) { notes.push(ref); n = notes.length - 1; } return `<sup>${n + 1}</sup>`; });
    const ll = lifeLine(id);
    const sups = html => html.replace(/<\/sup><sup>/g, ',</sup><sup>');
    return sups(`<article class="book-person">
      <h2>${esc(nameOf(id))}</h2><p class="book-life">${esc([dateValue(P.get(id), 'birth'), dateValue(P.get(id), 'death')].filter(Boolean).join(' — ') || L('Даты неизвестны', 'Dates unknown'))}</p>
      ${story ? story.text.split(/\n\s*\n/).map(par => `<p>${bold(refIn(par.trim()))}</p>`).join('') : ''}
      ${ll.length >= 2 ? `<h3>${L('Лента жизни', 'Timeline')}</h3><table class="book-ll">${ll.map(r => `<tr><td>${r.rough ? '≈' : ''}${esc(r.years.join('–'))}</td><td><em>${esc(field(r.field))}.</em> ${esc(cut(r.text, 200))}${r.refs.map(ref => refIn(`[${ref}]`)).join('')}</td></tr>`).join('')}</table>` : ''}
      ${notes.length ? `<h3>${L('Источники', 'Sources')}</h3><ol class="book-notes">${notes.map(ref => { const n = noteOf(ref); return `<li>${esc(n.text)}${n.docs.length ? `. <span>${esc(n.docs.join('; '))}</span>` : ''}</li>`; }).join('')}</ol>` : ''}
    </article>`);
  };
  $('book-body').innerHTML = `<div class="book">
    <header class="book-cover"><p class="eyebrow">${esc(SITE_NAME)}</p><h1>${esc(title)}</h1>
      <p>${L(`Истории ${people.length} ${people.length % 10 === 1 && people.length % 100 !== 11 ? 'человека' : 'человек'} по базе семейного архива`, `Stories of ${people.length} ${people.length === 1 ? 'person' : 'people'} from the family archive’s database`)}, ${esc(new Date().toLocaleDateString(LOCALE))}. ${L('Цифры — ссылки на факты и документы, они перечислены после каждой истории. ≈ — дата неточная.', 'Numbers link to the facts and documents listed after each story. ≈ — the date is not exact.')}</p></header>
    ${people.map(person).join('') || `<p class="muted">${L('Историй пока нет.', 'No stories yet.')}</p>`}</div>`;
  $('book-body').scrollTop = 0;
}
const showScopes = open => { $('book-scope-list').hidden = !open; $('book-scope').setAttribute('aria-expanded', String(open)); };
$('book-scope').onclick = () => showScopes($('book-scope-list').hidden);
$('book-scope-list').addEventListener('click', e => { const b = e.target.closest('[data-scope]'); if (!b) return; showScopes(false); go({page: 'book', book: b.dataset.scope}, true); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('#book-pick')) showScopes(false); });
$('book-print').onclick = () => window.print();
// The printer in the corner of the tree prints the tree as it is on the screen, on A3.
$('print-toggle').onclick = () => { printWhat = 'tree'; window.print(); };
// The card's own «Печать»: what is in the card now, on A4.
$('print-card').onclick = () => { printWhat = 'card'; window.print(); };
body.addEventListener('click', e => { const b = e.target.closest('[data-book]'); if (b) go({page: 'book', book: b.dataset.book}); });
// The link says whose booklet it is: #book=g: (all of the tree), #book=g:sokolovy, #book=p:ivan.
registerPage('book', {
  el: 'book-page', again: true,
  show(route) { bookScope = route.book || 'g:'; bookView(); },
  state: () => ({book: bookScope}),
  parse(v, route) { route.book = v ? decodeURIComponent(v) : 'g:'; },
  hash: route => `book=${encodeURIComponent(route.book || 'g:')}`,
});

function exportView(scope) {
  current = {exp: scope};
  const pid = scope.startsWith('p:') && P.has(cid(scope.slice(2))) ? cid(scope.slice(2)) : null;
  mark(pid);
  const scopes = [['g:', L('Всё древо', 'Whole tree')], ...GROUPS.map(g => ['g:' + g.id, `${L('Ветка', 'Branch')} ${g.title}`]), ...(pid ? [['p:' + pid, `${sayName(pid)} ${L('и предки', 'and ancestors')}`]] : [])];
  const picked = scopes.some(([v]) => v === scope) ? scope : 'g:';
  body.innerHTML = `<p class="eyebrow">${L('Скачать древо', 'Download the tree')}</p><h2 class="card-title">${L('Файл для программ родословных', 'A file for family-tree programs')}</h2>
    <p>${L('Файл GEDCOM откроют MyHeritage, Gramps, FamilySearch, Ancestry, Geni и другие программы. В нём люди и семьи, даты, места и истории; у каждого факта и связи — насколько он надёжен и на каких документах держится.',
      'MyHeritage, Gramps, FamilySearch, Ancestry, Geni and other programs open a GEDCOM file. It holds the people and families, dates, places and stories; every fact and link says how reliable it is and which documents it rests on.')}</p>
    <form class="gedcom-form">
      <fieldset><legend>${L('Что выгрузить', 'What to export')}</legend>${scopes.map(([v, t]) => `<label><input type="radio" name="scope" value="${esc(v)}"${v === picked ? ' checked' : ''}>${esc(t)}</label>`).join('')}</fieldset>
      <fieldset><legend>${L('Живые', 'The living')}</legend><label><input type="checkbox" name="living">${L('Даты, места и рассказы о живых', 'Dates, places and stories of the living')}</label>
        <p class="muted">${L('Без отметки у живых в файле только имя и родство: файл могут загрузить на чужой сайт. У детей младше 18 лет дат нет в любом случае.', 'Unticked, the living have only their names and kinship in the file: it may end up on someone else\'s site. Children under 18 never get dates.')}</p></fieldset>
      <button type="submit" class="send-btn">${L('Скачать GEDCOM', 'Download GEDCOM')}</button>
      <p class="send-status" role="status" aria-live="polite"></p>
    </form>
    ${INBOX ? `<div class="tell"><p>${L('Ведёте своё древо в MyHeritage, Gramps или другой программе? Выгрузите его в GEDCOM и пришлите файлом — мы сверим его с базой.', 'Keep your own tree in MyHeritage, Gramps or another program? Export it as GEDCOM and send the file — we will check it against ours.')}</p><button class="send-open" data-send="free">${L('Прислать файл →', 'Send the file →')}</button></div>` : ''}`;
  const form = body.querySelector('.gedcom-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const file = gedcom(form.elements.scope.value, form.elements.living.checked, location.href.split('#')[0]);
    const url = URL.createObjectURL(new Blob([file.text], {type: 'application/octet-stream'}));
    const a = Object.assign(document.createElement('a'), {href: url, download: file.name});
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    form.querySelector('.send-status').textContent = L(`Готово: ${file.name} — ${file.people} чел., ${file.families} семей.`, `Done: ${file.name} — ${file.people} people, ${file.families} families.`);
  });
  return L('Скачать древо', 'Download the tree');
}
// The arrow under the zoom buttons exports what the tree shows: the focus person and ancestors, the branch or all.
$('export-toggle').onclick = () => go({exp: focus ? 'p:' + focus : activeGroup ? 'g:' + activeGroup : 'g:'});
body.addEventListener('click', e => { const b = e.target.closest('[data-export]'); if (b) go({exp: b.dataset.export}); });
