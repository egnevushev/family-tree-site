// The card panel and everything shown in it: the legend «?», documents in a card, a person, a link, a fact,
// «Кем приходится», «Что нового», «Помогите заполнить» and the form for messages.
// Depends on the files above; go() and the rest of the routing are in app.js (used only after the page loads).
'use strict';

// ---------- Legend ----------
// A link between people the family knows personally is drawn like a document of the time, so the two share a row.
const LEGEND = LEVELS.map(([lv, name, text]) => lv === 5 ? [lv, L('Документ эпохи или знакомы лично', 'Document of the time or known personally'), L('Прочитано в метрике, ревизской сказке, формуляре или семейном документе — или семья знает этих людей сама (в базе — со слов семьи).', 'Read in a parish register, census, service record or family document — or the family knows these people itself (in the database: the family’s word).')] : [lv, name, text]);
$('legend-rows').innerHTML = LEGEND.map(([lv, name, text]) => `<div class="legend-row"><svg viewBox="0 0 46 12"><path class="edge lvl${lv}" d="M3,6 H43"/></svg><div>${esc(name)}<small>${esc(text)}</small></div></div>`).join('')
  // The row of the saints only when the data have a canonization; it names them.
  + (canonized.size ? `<div class="legend-row"><svg viewBox="0 0 46 22" class="legend-cross"><path d="M23 0V22M20 3.5H26M17 8H29M19.5 17L26.5 14"/></svg><div>${L('Прославлен Церковью', 'Glorified by the Church')}<small>${esc([...canonized.keys()].filter(id => P.has(id)).map(sayName).join('; '))}.</small></div></div>` : '')
  + `<div class="legend-row"><svg viewBox="0 0 46 22" class="legend-flag"><text x="23" y="16" text-anchor="middle">⚑</text></svg><div>${L('Записи расходятся', 'Records disagree')}<small>${L('Значок в углу карточки: о человеке есть противоречие, которое ещё не решено. Нажмите на него — карточка откроется на разделе «Расхождения».', 'The mark in the corner of a card: there is a disagreement about the person that is not settled yet. Click it to open the card at «Disagreements».')}</small></div></div>`;
// «?»: what the site is (its name and the text "about" of data/site.json), its main parts in a word each, then how
// to read the lines.
$('brand-text').textContent = $('about-title').textContent = SITE_NAME;
$('about-lead').textContent = loc(SITE.about) || '';
// The code of the site (data/site.json source_url), at the foot of «?»…
if (SITE.source_url) $('legend').insertAdjacentHTML('beforeend', `<p class="legend-source"><a href="${esc(SITE.source_url)}" target="_blank" rel="noopener">${L('Код сайта на GitHub', 'Source code on GitHub')} ↗</a></p>`);
// …and as a round button in the bottom right corner of the tree.
if (SITE.source_url) $('stage').insertAdjacentHTML('beforeend', `<a class="gh-float" href="${esc(SITE.source_url)}" target="_blank" rel="noopener" title="${L('Код сайта на GitHub', 'Source code on GitHub')}" aria-label="${L('Код сайта на GitHub', 'Source code on GitHub')}"><svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>`);
const tap = what => EN ? (touchScreen() ? 'Tap ' : 'Click ') + what[2] : touchScreen() ? `Коснитесь ${what[1]}` : `Нажмите на ${what[0]}`;
// The finds are a part loaded later (ui.js): data.js names them in find_hashes; a build without parts has D.finds.
const hasFinds = Object.keys(D.find_hashes || {}).length > 0 || !!D.finds?.length;
$('about-list').innerHTML = (EN ? [
  ['Person’s card', `${tap(['', '', 'a person'])}: life story, timeline, family and documents. A double ${touchScreen() ? 'tap' : 'click'} — only them and their ancestors.`],
  ['Line', `${tap(['', '', 'a line between people'])}: what the link rests on and what contradicts it.`],
  ...GROUPS.length ? [['Branches', `Buttons at the top: ${GROUPS.map(g => g.title).join(', ')} — only that side of the family.`]] : [],
  ['«This is me» and «How related…»', 'Press «This is me» on your own card and the site will say how each person is related to you. «How related…» — the kinship of any two.'],
  ['Tree · Map · Documents', 'The switch at the top (at the bottom on a phone): the family tree, the map of places where they lived, served and studied, and all documents by place and year.'],
  ...hasFinds ? [['Finds', 'The fourth button of the switch: the most surprising things from the archives, by year. Once you have pressed «This is me», every name says how the person is related to you, and the order «Closest to me» puts your nearest first.']] : [],
  ['New since your visit', `A dot marks ${hasFinds ? 'a find you have not read yet, ' : ''}a card whose life story is new or rewritten since your first visit, and «What’s new» while it holds something you have not seen.`],
  ['Time', `The ${hasFinds ? 'fifth' : 'fourth'} button of the switch: the lives of everyone in the tree on one scale of years, with the events of the time. Move the year to see who lived then and whose lives met.`],
  ['Ancestor fan', 'The «Ancestor fan» button in a card (and «My ancestor fan» in the «⋯» menu of the tree, once you have pressed «This is me»): all of a person’s ancestors in rings by generation, how many are found and who is missing nearest.'],
  ['The tree in a year', 'The clock button in the corner of the tree: whoever did not live in the chosen year turns pale, the others show their age.'],
  ['«On this day»', 'A quiet line under the tree: what happened to the ancestors today and this month.'],
  ['Print', 'The printer in the corner of the tree prints it on A3, the printer in the head of a card prints the card.'],
  ['«Help fill in»', INBOX ? 'What we do not know. At the foot of every card you can send a photo or a correction.' : 'What we do not know and how to reach us.'],
  ['Photos', 'All the pictures are in «Documents», the «Photos» view. The card of someone with no photo yet has a line «send».'],
] : [
  ['Карточка человека', `${tap(['человека', 'человека', 'a person'])}: история жизни, лента событий, семья и документы. Двойное ${touchScreen() ? 'касание' : 'нажатие'} — только он и его предки.`],
  ['Линия', `${tap(['линию между людьми', 'линии между людьми', 'a line between people'])}: на чём держится связь и что ей противоречит.`],
  ...GROUPS.length ? [['Ветки', `Кнопки вверху: ${GROUPS.map(g => g.title).join(', ')} — только эта сторона семьи.`]] : [],
  ['«Это я» и «Кем приходится…»', 'В своей карточке нажмите «Это я» — сайт будет писать, кем вам приходится каждый. «Кем приходится…» — родство любых двоих.'],
  ['Древо · Карта · Документы', 'Переключатель вверху (на телефоне — внизу): схема семьи, карта мест, где жили, служили и учились, и все документы по месту и году.'],
  ...hasFinds ? [['Находки', 'Четвёртая кнопка переключателя: самое неожиданное из архивов, по годам. Если вы нажали «Это я», у каждого имени написано, кем человек вам приходится, а порядок «Ближе ко мне» ставит первыми ваших самых близких.']] : [],
  ['Новое с вашего визита', `Точка отмечает ${hasFinds ? 'находку, которую вы ещё не читали, ' : ''}карточку, где история жизни появилась или дописана после вашего первого визита, и «Что нового», пока там есть невиденное.`],
  ['Время', `${hasFinds ? 'Пятая' : 'Четвёртая'} кнопка переключателя: линии жизни всех людей древа на одной шкале лет, с событиями эпохи. Передвиньте год — видно, кто тогда жил и кто кого застал.`],
  ['Веер предков', 'Кнопка «Веер предков» в карточке (и «Веер моих предков» в меню «⋯» схемы, если вы нажали «Это я»): все предки человека кольцами по коленам, сколько найдено и кого не хватает ближе всего.'],
  ['Древо в году', 'Кнопка с часами в углу схемы: кто не жил в выбранном году, становится бледным, у остальных — возраст.'],
  ['«В этот день»', 'Тихая строка внизу схемы: что было с предками сегодня и в этом месяце.'],
  ['Печать', 'Кнопка с принтером в углу схемы печатает схему на лист A3, значок принтера в шапке карточки — саму карточку.'],
  ['«Помочь дополнить»', INBOX ? 'Чего мы не знаем. Внизу каждой карточки можно прислать фото или уточнение.' : 'Чего мы не знаем и как с нами связаться.'],
  ['Фото', 'Все снимки — в «Документах», вид «Фото». У кого фотографии ещё нет, в карточке есть строка «прислать».'],
]).map(([t, d]) => `<li><strong>${esc(t)}</strong>${esc(d)}</li>`).join('');
$('legend-tail').textContent = `${tap(['линию', 'линии', 'a line'])}${L(', чтобы увидеть документы, на которых она держится, и то, что ей противоречит.', ' to see the documents it rests on and what contradicts it.')}`;
$('legend-close').onclick = () => { showLegend(false); $('legend-toggle').focus(); };
function showLegend(open) {
  $('legend').hidden = !open; $('legend-toggle').setAttribute('aria-expanded', String(open));
}
$('legend-toggle').onclick = () => {
  // On a phone a card open to full screen goes down to half, so the legend shows above it.
  if ($('legend').hidden && narrow() && panel.dataset.state === 'full') panel.dataset.state = 'peek';
  showLegend($('legend').hidden);
};

// ---------- Evidence helpers ----------
function viewsFor(src, citing) {
  let views = src.views || [];
  const pages = src.cite?.[citing];
  if (pages) views = views.filter(v => pages.includes(v.page));
  return views.map(v => ({...v, boxes: boxesFor(src, v.page, citing)}));
}
function boxesFor(src, page, citing) {
  const all = (src.boxes || []).filter(b => (b.page ?? null) === (page ?? null));
  const mine = all.filter(b => !b.for || !citing || b.for.includes(citing));
  return {mine, other: all.filter(b => !mine.includes(b))};
}
// The record box with a small margin, as a background crop of the page (thumbnails and the tiles of «Документы»).
function cropOf(b) {
  const m = .025, x0 = Math.max(0, b.box[0] - m), y0 = Math.max(0, b.box[1] - m), x1 = Math.min(1, b.box[2] + m), y1 = Math.min(1, b.box[3] + m);
  const rw = x1 - x0, rh = y1 - y0, px = rw < 1 ? x0 / (1 - rw) * 100 : 0, py = rh < 1 ? y0 / (1 - rh) * 100 : 0;
  return {rw, rh, size: `background-size:${(100 / rw).toFixed(2)}% auto`, at: `background-position:${px.toFixed(2)}% ${py.toFixed(2)}%`};
}
// A thumbnail cropped to the record box, or the top of the page when there is no box.
function thumb(v, small) {
  const b = v.boxes.mine[0];
  const img = v.mid || v.src;
  if (!b) return `<img src="${esc(img)}" alt="" loading="lazy">`;
  const {rw, rh, size, at} = cropOf(b);
  const ratio = Math.min(1.1, Math.max(.18, (rh * v.h) / (rw * v.w)));
  return `<span class="crop" style="aspect-ratio:1/${ratio.toFixed(3)};background-image:url('${esc(img)}');${size};${at}" role="img" aria-label="${esc(b.label || L('Запись на странице', 'Record on the page'))}"></span>`;
}
function docCard(sid, citing, opts = {}) {
  const src = S.get(sid);
  if (!src) return '';
  const views = viewsFor(src, citing);
  const box = views.find(v => v.boxes.mine.length)?.boxes.mine[0];
  const sub = [box?.label, views.length > 1 ? `${views.length} ${L('стр.', 'pp.')}` : views[0]?.page ? `${L('стр.', 'p.')} ${views[0].page}` : ''].filter(Boolean).join(' · ');
  if (views.length) return `<button class="doc" data-doc="${esc(sid)}" data-citing="${esc(citing || '')}">${thumb(views[0], opts.small)}<span class="meta"><strong>${esc(src.title)}</strong>${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
  if (src.text) return `<button class="doc textdoc" data-doc="${esc(sid)}" data-citing="${esc(citing || '')}"><span class="meta"><strong>📄 ${esc(src.title)}</strong><small>${isResearch(sid) ? L('Разбор: как читали и что проверили', 'Research note: how it was read and checked') : L('Текст: запись, выписка или отчёт', 'Text: a record, an extract or a report')}</small></span></button>`;
  return `<div class="doc textdoc"><span class="meta"><strong>${esc(src.title)}</strong><small>${src.url ? `<a href="${esc(src.url)}" target="_blank" rel="noopener">${L('Открыть на сайте источника', 'Open on the source’s site')}</a>` : L('Копии нет', 'No copy')}</small></span></div>`;
}

function docsHtml(ids, citing, cls = 'docs', opts = {}) {
  const docs = ids.filter(s => !isResearch(s)), notes = ids.filter(isResearch);
  return (docs.length ? `<div class="${cls}">${docs.map(s => docCard(s, citing, opts)).join('')}</div>` : '')
    + (notes.length ? `<p class="docs-group">${L('Разбор', 'Research notes')}</p><div class="${cls}">${notes.map(s => docCard(s, citing, opts)).join('')}</div>` : '');
}
// A status set by the family's decision rather than by a document; who decided stays in the database.
const decided = x => x?.decided_by ? `<p class="decided">${L('Решение семьи', 'The family’s decision')}, ${esc(fmtDate(x.decided_by.date))}${x.decided_by.note ? ': ' + esc(x.decided_by.note.replace(/[.\s]+$/, '')) : ''}. ${L('Документа нет.', 'There is no document.')}</p>` : '';
// Conflicts of a card or a link: the open ones, then the settled ones folded under «Решено».
function conflictItem(x, withDocs) {
  const docs = withDocs && x.source_ids?.length ? `<div style="margin-top:8px">${docsHtml(x.source_ids, x.id)}</div>` : '';
  const how = isOpen(x) ? (x.resolution ? `<br><span class="muted">${L('Проверить', 'To check')}: ${esc(x.resolution)}</span>` : '')
    : `<br><span class="muted">${L('Закрыто', 'Settled')} ${SOLVED[x.state] || ''}${x.resolution ? ': ' + esc(x.resolution) : ''}</span>`;
  // A person's card says only how a settled conflict was closed; the full resolution is in the conflict's own card.
  const short = isOpen(x) ? '' : `<br><span class="muted">${L('Закрыто', 'Settled')} ${SOLVED[x.state] || ''}</span>`;
  return `<div class="flag${isOpen(x) ? '' : ' solved'}"><strong>⚑ ${esc(x.title)}</strong>${esc(x.detail)}${withDocs ? how : short}${docs}</div>`;
}
function conflictsHtml(xs, title, withDocs) {
  const open = xs.filter(isOpen), solved = xs.filter(x => !isOpen(x));
  if (!xs.length) return '';
  return `<h3 class="conflicts">${esc(title)}</h3>${open.map(x => conflictItem(x, withDocs)).join('')}`
    + (solved.length ? `<details class="solved-group"><summary>${L('Решено', 'Settled')} · ${solved.length}</summary>${solved.map(x => conflictItem(x, withDocs)).join('')}</details>` : '');
}

// ---------- Panel views ----------
const panel = $('panel'), body = $('panel-body');
let current = null;
// The map beside an open card is drawn again in the part left free (on a computer).
const redrawPage = () => { const page = PAGES.get(pageOpen); if (page?.redraw) requestAnimationFrame(page.redraw); };
function openPanel(state) {
  redrawPage();
  panel.dataset.state = state || (narrow() ? (panel.dataset.state === 'full' ? 'full' : 'peek') : 'open');
  document.body.classList.add('panel-open');
  $('hint').hidden = true;
  // An opened card is what the reader looks at now; the legend does not stay over it.
  showLegend(false);
}
// A card opened from the keyboard (Enter or space) takes the focus, so Tab goes on inside it; a click leaves the
// focus where it is. The mark lives for the one keystroke.
let byKey = false;
const keyMark = e => { if (e.key === 'Enter' || e.key === ' ') { byKey = true; setTimeout(() => { byKey = false; }); } };
document.addEventListener('keydown', keyMark, true);
document.addEventListener('keyup', keyMark, true);
// The title of a card that opens or changes is said once by a screen reader, after what it is saying now.
function sayTitle() {
  const t = (body.querySelector('.card-title, h2')?.textContent || '').trim();
  if (t && t !== $('panel-say').textContent) $('panel-say').textContent = t;
}
function closePanel() {
  $('panel-say').textContent = '';
  // The keyboard's focus left in a closing card goes back to the tree, to the card it stood on (a click on × does not).
  const was = document.activeElement;
  if (panel.contains(was) && (was === panel || was.matches(':focus-visible')) && !pageOpen) document.querySelector('#nodes [data-person][tabindex="0"]')?.focus({preventScroll: true});
  PAGES.get(pageOpen)?.cardClosed?.();
  redrawPage();
  panel.dataset.state = 'closed'; document.body.classList.remove('panel-open'); current = null; pathPick = null; clearPath();
  document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
  document.querySelectorAll('.edge.selected').forEach(n => n.classList.remove('selected'));
}
function mark(personId, lineKey) {
  document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
  document.querySelectorAll('.edge.selected').forEach(n => n.classList.remove('selected'));
  if (personId) { document.querySelector(`[data-person="${CSS.escape(cid(personId))}"]`)?.classList.add('selected'); setRove(cid(personId)); }
  if (lineKey) document.querySelector(`[data-edge="${CSS.escape(lineKey)}"]`)?.classList.add('selected');
}


// What's new: data/changelog.md, one entry per release, newest first. An entry's heading is its id.
// The newest entry is always open; other entries the reader has not seen are open too, seen ones show their first
// line and «Подробнее»; past the five newest
// the rest wait under «Раньше». The dot on the button: the newest entry is not seen yet.
// data.js holds the newest entries and the headings of all (news_dates); the older entries are the part «news»
// (ui.js, loadPart), merged in as changelog_older. A data.js without parts holds them all in changelog.
const NEWS_SHOWN = 5;
const newsEntries = () => (D.changelog || []).concat(D.changelog_older || []);
const newsDates = () => D.news_dates || newsEntries().map(e => e.date);
function seenNews() {
  try {
    const list = localStorage.getItem('seenNewsEntries');
    if (list) return new Set(JSON.parse(list));
    // A reader from before the entries had ids had seen all of them, perhaps except the newest.
    if (localStorage.getItem('seenNews')) return new Set(newsDates().slice(1));
  } catch (_) {}
  return null;
}
function markNews(read) {
  const dates = newsDates();
  if (read) { try { localStorage.setItem('seenNewsEntries', JSON.stringify(dates)); } catch (_) {} }
  $('news-toggle').classList.toggle('unread', !!dates.length && !seenNews()?.has(dates[0]));
}
// Text with references [C…], [R…], [X…], [S:…] as numbered buttons, counted across one view; a name written
// [Имя](#p=id) opens that person's card.
function refsIn() {
  let n = 0;
  return text => bold(esc(text)).replace(/\[([^\]]+)\]\(#p=([A-Za-z0-9._-]+)\)/g, (all, name, id) =>
    P.has(id) ? `<button class="linklike" data-person-link="${id}">${name}</button>` : name).replace(REF_RE, (_, ref) => {
    const st = (C.get(ref) || R.get(ref))?.status;
    return `<button class="ref r${st ? level(st) : 4}" data-ref="${esc(ref)}" aria-label="${L('Источник', 'Source')} ${++n}">${n}</button>`;
  });
}
function newsView() {
  current = {news: 1};
  mark();
  const refs = refsIn();
  // A first visit opens only the newest entry: the older ones were never news to this reader.
  const seen = seenNews();
  const entry = (e, i) => {
    const open = i === 0 || (!!seen && !seen.has(e.date));
    return `<section class="news${open ? ' open' : ''}" data-news="${esc(e.date)}"><h3>${esc(e.date)}</h3>${e.lead ? `<p class="lead">${refs(e.lead)}</p>` : ''}
      <div class="news-more">${e.groups.map(g => `${g.title ? `<p class="eyebrow">${esc(g.title)}</p>` : ''}<ul>${g.items.map(i => `<li>${refs(i)}</li>`).join('')}</ul>`).join('')}</div>
      ${open ? '' : `<button class="news-open">${L('Подробнее', 'More')}</button>`}</section>`;
  };
  // «Раньше»: its entries are drawn once the part «news» is here — at once if it came before, else as it comes
  // (the list waits folded; an entry the reader has not seen is open in it, as before).
  const olderCount = Math.max(0, newsDates().length - NEWS_SHOWN), ready = partReady('news');
  const older = () => newsEntries().slice(NEWS_SHOWN).map((e, i) => entry(e, i + NEWS_SHOWN)).join('');
  body.innerHTML = `<p class="eyebrow">${L('Журнал изменений', 'Change log')}</p><h2 class="card-title">${L('Что нового', 'What’s new')}</h2>
    <p class="muted">${L('Что добавили и уточнили в древе и документах, по выпускам сайта. Цифры — ссылки на факты.', 'What was added and corrected in the tree and the documents, by release. Numbers link to the facts.')}</p>
    ${newsEntries().slice(0, NEWS_SHOWN).map(entry).join('') || `<p class="muted">${L('Пока пусто.', 'Nothing yet.')}</p>`}
    ${olderCount ? `<button class="news-older">${L('Раньше', 'Earlier')} · ${olderCount}</button><div class="news-older-list" hidden>${ready ? older() : `<p class="muted">${L('Загружаю…', 'Loading…')}</p>`}</div>` : ''}`;
  markNews(true);
  const list = body.querySelector('.news-older-list'), view = current;
  const fill = () => loadPart('news').then(() => { if (current === view && list.isConnected) list.innerHTML = older(); }, () => {
    if (current === view && list.isConnected) list.replaceChildren(partFail(() => { list.innerHTML = `<p class="muted">${L('Загружаю…', 'Loading…')}</p>`; fill(); }, L('Не удалось загрузить прежние записи. Проверьте связь и попробуйте ещё раз.', 'The earlier entries did not load. Check the connection and try again.')));
  });
  if (list && !ready) fill();
}
body.addEventListener('click', e => {
  const more = e.target.closest('.news-open'), older = e.target.closest('.news-older'), ll = e.target.closest('.ll-open');
  const to = e.target.closest('[data-section-to]');
  if (to) toSection(body.querySelector(`[data-section="${to.dataset.sectionTo}"]`));
  // The buttons under a life line: «Вся лента» opens the hidden facts, «События эпохи» the quiet rows of the time.
  const llOf = b => { let x = b.previousElementSibling; while (x && !x.matches('.lifeline')) x = x.previousElementSibling; return x; };
  if (ll) { llOf(ll)?.querySelectorAll('li[hidden]:not(.ll-epoch)').forEach(x => x.hidden = false); ll.remove(); }
  const epoch = e.target.closest('.ll-epoch-open');
  if (epoch) { llOf(epoch)?.querySelectorAll('li.ll-epoch[hidden]').forEach(x => x.hidden = false); epoch.remove(); }
  if (more) { more.closest('.news').classList.add('open'); more.remove(); }
  if (older) { older.nextElementSibling.hidden = false; older.remove(); }
});

// ---------- «Помогите заполнить» ----------
// Main questions from data/site-questions.md; people of the tree with no date or no full name, found by the site
// itself; conflicts the family may clear up (listed in the same file); a free message at the end.
// Every «Я знаю →» opens the one form for messages with its subject filled in.
const QUESTIONS = D.questions || {main: [], conflicts: []};
function unknownBits(id) {
  const p = P.get(id), n = nameParts(id), out = [];
  // Children under 18 are shown by name and year only: nothing is asked about them.
  if (!p.death && bornYear(p) > new Date().getFullYear() - 18) return out;
  if (!p.birth && !p.death) out.push(L('нет дат', 'no dates'));
  if (!n) out.push(L('нет полного имени', 'no full name'));
  else {
    if (!n.plain.split(' ').some(isPatronymic)) out.push(L('нет отчества', 'no patronymic'));
    if (!n.surname && !n.maiden) out.push(L('нет фамилии', 'no surname'));
  }
  return out;
}
const PHOTO_FIRST = 12;
// «1880–1942», «1880–?», «?–1915»: the years of a card for a list.
const lifeYears = p => { const b = bornYear(p), d = diedYear(p); return b && b === d ? String(b) : b || d ? `${b || "?"}–${d || "?"}` : ""; };
body.addEventListener('click', e => {
  const b = e.target.closest('[data-photo-more]');
  if (!b) return;
  body.querySelectorAll('.photo-wanted [hidden]').forEach(el => { el.hidden = false; });
  b.remove();
});
// The state of a request to an archive in words: «Ждём ответа с 26.10.2026», «Готовим запрос», «Пришёл ответ … — разбираем».
function reqState(r) {
  const day = String(r.date || '').split('-').reverse().join('.');
  if (r.state === 'prepared') return L('Готовим запрос', 'Preparing a request');
  if (r.state === 'answered') return L(`Пришёл ответ${day ? ' ' + day : ''} — разбираем`, `An answer came${day ? ' on ' + day : ''} — being studied`);
  return L(`Ждём ответа${day ? ' с ' + day : ''}`, `Waiting for an answer${day ? ' since ' + day : ''}`);
}
function helpView() {
  current = {help: 1};
  mark();
  const refs = refsIn(), status = ref => (C.get(ref) || R.get(ref))?.status;
  const main = QUESTIONS.main.map(q => `<section class="ask">
      <h4>${esc(q.title)}</h4>
      <p><span class="ask-key">${L('Знаем', 'We know')} ${status(q.status_ref) ? chip(status(q.status_ref)) : ''}</span>${refs(q.known)}</p>
      <p><span class="ask-key">${L('Не хватает', 'Missing')}</span>${refs(q.missing)}</p>
      <p><span class="ask-key">${L('Чем помочь', 'How to help')}</span>${refs(q.help)}</p>
      <div class="ask-actions"><button class="ask-btn" data-send="q:${esc(q.id)}">${L('Я знаю →', 'I know →')}</button>${q.people.filter(id => P.has(id)).map(id => `<button class="linklike" data-person-link="${esc(id)}">${esc(sayName(id))}</button>`).join('')}</div>
    </section>`).join('');
  const rows = [...inTree].filter(id => unknownBits(id).length).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'ru'));
  const branches = [...GROUPS.map(g => [g.title, rows.filter(id => homeOf.get(id) === g.id)]), [L('Другие', 'Others'), rows.filter(id => !GROUP.has(homeOf.get(id)))]].filter(([, ids]) => ids.length);
  const years = branches.map(([title, ids]) => `<details class="ask-group"><summary>${esc(title)} · ${ids.length}</summary><ul class="ask-list">${ids.map(id => `<li><button class="ask-name" data-person-link="${esc(id)}">${esc(nameOf(id))}<small>${esc(unknownBits(id).join(' · '))}</small></button><button class="ask-btn small" data-send="p:${esc(id)}" aria-label="${L('Я знаю', 'I know')}: ${esc(nameOf(id))}">${L('Я знаю →', 'I know →')}</button></li>`).join('')}</ul></details>`).join('');
  const xs = QUESTIONS.conflicts.filter(x => X.has(x.id) && isOpen(X.get(x.id))).map(x => `<div class="flag ask-x"><strong>${esc(X.get(x.id).title)}</strong>${esc(x.ask)}
      <div class="ask-actions"><button class="ask-btn" data-send="x:${esc(x.id)}">${L('Я знаю →', 'I know →')}</button><button class="linklike" data-ref="${esc(x.id)}">${L('Что известно', 'What is known')}</button></div></div>`).join('');
  // Requests to archives waiting for an answer (D.questions.requests); the request's id is not for the reader.
  const reqs = (QUESTIONS.requests || []).map(r => `<div class="req"><p class="req-state req-${esc(r.state)}">${esc(reqState(r))}</p><p>${esc(r.text)}</p>
      ${(r.people || []).filter(id => P.has(id)).length ? `<div class="ask-actions">${r.people.filter(id => P.has(id)).map(id => `<button class="linklike" data-person-link="${esc(cid(id))}">${esc(sayName(cid(id)))}</button>`).join('')}</div>` : ''}</div>`).join('');
  // «Нет ни одной фотографии»: by branch, the first PHOTO_FIRST at once, the rest under «Показать всех».
  const noPhoto = photoMissing();
  let shownPhotos = 0;
  const photoRows = [...GROUPS.map(g => [g.title, noPhoto.filter(id => homeOf.get(id) === g.id)]), [L('Другие', 'Others'), noPhoto.filter(id => !GROUP.has(homeOf.get(id)))]].filter(([, ids]) => ids.length)
    .map(([title, ids]) => `<p class="photo-branch"${shownPhotos >= PHOTO_FIRST ? ' hidden' : ''}>${esc(title)} · ${ids.length}</p><ul class="ask-list photo-list"${shownPhotos >= PHOTO_FIRST ? ' hidden' : ''}>${ids.map(id => `<li${shownPhotos++ >= PHOTO_FIRST ? ' hidden' : ''}><button class="ask-name" data-person-link="${esc(id)}">${esc(sayName(id))}<small>${esc(lifeYears(P.get(id)))}</small></button><button class="ask-btn small" data-send="pp:${esc(id)}" aria-label="${L('Прислать фото', 'Send a photo')}: ${esc(sayName(id))}">${L('Прислать фото', 'Send a photo')}</button></li>`).join('')}</ul>`).join('');
  body.innerHTML = `<p class="eyebrow">${L('Помогите заполнить', 'Help fill in')}</p><h2 class="card-title">${L('Что мы ещё не знаем', 'What we do not know yet')}</h2>
    <p class="muted">${L(`Многое о семье знают только сами родные. Помните ответ, рассказ или храните фото — нажмите «Я знаю» и напишите. Сообщение получит ${esc(RECIPIENT)}.`, `Much about a family is known only to the relatives themselves. If you remember an answer or a story, or keep a photo, press «I know» and write. The message goes to ${esc(RECIPIENT)}.`)}</p>
    ${main ? `<h3>${L('Главные вопросы', 'Main questions')}</h3>${main}` : ''}
    ${years ? `<h3>${L('Подскажите годы и имена', 'Tell us years and names')}</h3><p class="muted">${L('Люди в древе, у которых нет ни одной даты или полного имени', 'People in the tree with no date or no full name')}: ${rows.length}.</p>${years}` : ''}
    ${xs ? `<h3>${L('Где расходятся записи', 'Where the records disagree')}</h3><p class="muted">${L('Документы говорят разное — может быть, в семье помнят, как было.', 'The documents say different things — perhaps the family remembers how it was.')}</p>${xs}` : ''}
    ${photoRows ? `<h3>${L('Нет ни одной фотографии', 'No photo yet')}</h3><p class="muted">${L(`Люди древа, жившие уже во времена фотографии, — на сайте нет ни одного их снимка: ${noPhoto.length}. Может быть, фото есть в семейном альбоме?`, `People of the tree who lived in the age of photography, with not one picture of them on the site: ${noPhoto.length}. Perhaps there is one in a family album?`)}</p><div class="photo-wanted">${photoRows}</div>${noPhoto.length > PHOTO_FIRST ? `<button class="linklike" data-photo-more>${L('Показать всех', 'Show everyone')} (${noPhoto.length})</button>` : ''}` : ''}
    ${reqs ? `<h3>${L('Ждём ответа из архива', 'Waiting for the archives')}</h3><p class="muted">${L('Письма в архивы, на которые ещё нет ответа или ответ только пришёл.', 'Letters to archives with no answer yet, or with an answer just come.')}</p>${reqs}` : ''}
    <h3>${L('Напишите нам', 'Write to us')}</h3><p>${L('Если что-то знаете — напишите здесь.', 'If you know something, write here.')}</p>${formHtml('free')}`;
  bindForm(body.querySelector('form.send'));
  return L('Помогите заполнить', 'Help fill in');
}

// ---------- The one form for messages to the family ----------
// About whom (filled in), the text, up to five photos, PDFs or family trees in GEDCOM (.ged) of 15 MB each, the
// sender's name (from «Это я», else as typed last time). Each file goes on its own as POST <inbox_url>file, then the
// message as POST <inbox_url>send (see bindForm); the server answers JSON {ok, id} or {error}. No server is included:
// without inbox_url in data/site.json (INBOX, lang.js) the site shows the contact text from the same file instead.
const SEND_TITLE = L('Прислать фото или уточнение', 'Send a photo or a correction');
const MAX_FILES = 5, MAX_BYTES = 15 * 2 ** 20;
// What was typed stays while the tab is open, even through a new login; picked files only while the page is.
const drafts = new Map();
try { Object.entries(JSON.parse(sessionStorage.getItem('familyDrafts') || '{}')).forEach(([k, v]) => drafts.set(k, {...v, files: []})); } catch (_) {}
const saveDrafts = () => { try { sessionStorage.setItem('familyDrafts', JSON.stringify(Object.fromEntries([...drafts].map(([k, {about, text, name}]) => [k, {about, text, name}])))); } catch (_) {} };
const tell = (ref, question, label) => `<div class="tell"><p>${esc(question)}</p><button class="send-open" data-send="${esc(ref)}">${esc(label)}</button></div>`;
const senderName = () => { if (me) return sayName(me); try { return localStorage.getItem('familySender') || ''; } catch (_) { return ''; } };
function aboutOf(ref) {
  const kind = ref.slice(0, 2), id = ref.slice(2);
  if (kind === 'p:' && P.has(id)) return sayName(id);
  if (kind === 'l:') { const l = lines.find(x => x.key === id); return l ? lineTitle(l) : ''; }
  if (kind === 'q:') return QUESTIONS.main.find(q => q.id === id)?.title || '';
  if (kind === 'x:' && X.has(id)) return X.get(id).title;
  // An empty place of the fan of ancestors (fan.js): «fa:», «mo:», «pa:» — the father, the mother, both parents.
  const up = /^(fa|mo|pa):(.+)$/.exec(ref);
  if (up && P.has(up[2])) return fanSay(up[1] === 'pa' ? ['f', 'm'] : [up[1] === 'fa' ? 'f' : 'm'], up[2]);
  // Photos: «pp:» a photo of a person, «ph:» a snapshot of the album (who is on it, when it was taken).
  const ph = /^(pp|ph):(.+)$/.exec(ref);
  if (ph && ph[1] === 'pp' && P.has(ph[2])) return L('Фото: ', 'Photo: ') + sayName(ph[2]);
  if (ph && ph[1] === 'ph' && S.has(ph[2])) return L('Снимок: ', 'Picture: ') + S.get(ph[2]).title;
  return '';
}
function sendView(ref) {
  current = {send: ref};
  mark(/^pp?:/.test(ref) ? ref.replace(/^pp?:/, '') : null);
  const subject = aboutOf(ref);
  body.innerHTML = `<p class="eyebrow">${L('Сообщение семье', 'Message to the family')}</p><h2 class="card-title">${/^[pl]:/.test(ref) ? SEND_TITLE : /^pp:/.test(ref) ? L('Прислать фото', 'Send a photo') : L('Я знаю', 'I know')}</h2>${formHtml(ref)}`;
  bindForm(body.querySelector('form.send'));
  return subject || L('Сообщение', 'Message');
}
function formHtml(ref) {
  if (!INBOX) return `<p class="contact">${refsIn()(loc(SITE.contact) || L('Напишите составителю древа.', 'Write to the keeper of the tree.'))}</p>`;
  const d = drafts.get(ref) || {};
  return `<form class="send" data-form="${esc(ref)}" novalidate>
    <label>${L('О ком или о чём', 'About whom or what')}<input name="about" value="${esc(d.about ?? aboutOf(ref))}" placeholder="${L('Имя или тема', 'Name or subject')}" maxlength="300"></label>
    <label>${L('Что вы знаете', 'What you know')}<textarea name="text" rows="6" maxlength="20000" placeholder="${L('Годы, имена, места, от кого вы это знаете…', 'Years, names, places, who you know it from…')}">${esc(d.text || '')}</textarea></label>
    <div class="send-files"><label class="file-pick">＋ ${L('Фото, PDF или древо (.ged)', 'Photo, PDF or a tree (.ged)')}<input type="file" name="files" multiple accept="image/*,application/pdf,.ged,.gedcom"></label><small>${L('до 5 файлов, каждый до 15 МБ', 'up to 5 files, 15 MB each')}</small><ul class="file-list"></ul></div>
    <label>${L('Как вас зовут', 'Your name')}<input name="name" value="${esc(d.name ?? senderName())}" autocomplete="name" maxlength="300"></label>
    <p class="muted">${L(`Сообщение прочитает только ${esc(RECIPIENT)}. На сайте оно появится, когда его внесут в базу.`, `Only ${esc(RECIPIENT)} will read the message. It appears on the site once it is entered into the database.`)}</p>
    <button type="submit" class="send-btn">${L('Отправить', 'Send')}</button>
    <p class="send-status" role="status" aria-live="polite"></p>
  </form>`;
}
// One request to the inbox; it answers in JSON. Anything else is put in words: the login page (the password cookie
// expired), no inbox at all, no connection.
function inboxRequest(path, payload, headers, progress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', INBOX + path);
    Object.entries(headers).forEach(([k, v]) => x.setRequestHeader(k, v));
    if (progress) x.upload.onprogress = e => { if (e.lengthComputable) progress(e.loaded / e.total); };
    x.onload = () => {
      let answer = null;
      if (/json/.test(x.getResponseHeader('Content-Type') || '')) { try { answer = JSON.parse(x.responseText); } catch (_) {} }
      if (answer?.ok) resolve(answer);
      else if (answer?.error) reject(Error(answer.error));
      else if (/login\.html/.test(x.responseURL || '')) reject(Error(L('Вход на сайт устарел. Обновите страницу и войдите снова — написанный текст сохранится.', 'The sign-in has expired. Reload the page and sign in again — the text you wrote is kept.')));
      else reject(Error(L(`Не удалось отправить (${x.status}). Попробуйте позже.`, `Could not send (${x.status}). Please try later.`)));
    };
    x.onerror = () => reject(Error(L('Нет связи с сайтом. Проверьте интернет и отправьте ещё раз.', 'No connection to the site. Check the internet and send again.')));
    x.send(payload);
  });
}
function bindForm(form) {
  if (!form) return;
  const ref = form.dataset.form, d = drafts.get(ref) || {};
  d.files = d.files || [];
  drafts.set(ref, d);
  const field = name => form.elements.namedItem(name), list = form.querySelector('.file-list'), status = form.querySelector('.send-status');
  const say = (text, bad) => { status.textContent = text; status.classList.toggle('bad', !!bad); };
  const showFiles = () => { list.innerHTML = d.files.map((f, i) => `<li><span>${esc(f.name)}</span><small>${f.size < 2 ** 20 ? Math.max(1, Math.round(f.size / 1024)) + L(' КБ', ' KB') : (f.size / 2 ** 20).toFixed(1).replace('.', L(',', '.')) + L(' МБ', ' MB')}</small><button type="button" data-drop="${i}" aria-label="${L('Убрать', 'Remove')} ${esc(f.name)}">×</button></li>`).join(''); };
  showFiles();
  form.addEventListener('input', e => { if (['about', 'text', 'name'].includes(e.target.name)) { d[e.target.name] = e.target.value; saveDrafts(); } });
  field('files').addEventListener('change', e => {
    const picked = [...e.target.files];
    e.target.value = '';
    const bad = picked.filter(f => !/^(image\/|application\/pdf$)/.test(f.type) && !/\.(jpe?g|png|hei[cf]|webp|gif|tiff?|pdf|ged|gedcom)$/i.test(f.name));
    const big = picked.filter(f => !bad.includes(f) && f.size > MAX_BYTES);
    const ok = picked.filter(f => !bad.includes(f) && !big.includes(f)), room = MAX_FILES - d.files.length;
    d.files.push(...ok.slice(0, Math.max(0, room)));
    showFiles();
    say([bad.length && `${L('Можно присылать только фото, PDF и древо в GEDCOM (.ged)', 'Only photos, PDFs and trees in GEDCOM (.ged) can be sent')}: ${bad.map(f => f.name).join(', ')}.`, big.length && `${L('Больше 15 МБ', 'Over 15 MB')}: ${big.map(f => f.name).join(', ')}.`, ok.length > room && L('Не больше 5 файлов в одном сообщении.', 'No more than 5 files in one message.')].filter(Boolean).join(' '), true);
  });
  list.addEventListener('click', e => { const b = e.target.closest('[data-drop]'); if (b) { d.files.splice(+b.dataset.drop, 1); showFiles(); say(''); } });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = field('text').value.trim(), name = field('name').value.trim(), about = field('about').value.trim();
    if (!text && !d.files.length) { say(L('Напишите что-нибудь или приложите фото.', 'Write something or attach a photo.'), true); field('text').focus(); return; }
    const button = form.querySelector('.send-btn');
    button.disabled = true;
    try {
      const draft = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
      for (const [i, f] of d.files.entries()) {
        await inboxRequest('file', f, {'X-Draft': draft, 'X-File-Name': encodeURIComponent(f.name), 'Content-Type': 'application/octet-stream'},
          part => say(L(`Отправляю файл ${i + 1} из ${d.files.length}`, `Sending file ${i + 1} of ${d.files.length}`) + `: ${Math.round(part * 100)}%`));
      }
      say(L('Отправляю сообщение…', 'Sending the message…'));
      const answer = await inboxRequest('send', JSON.stringify({draft: d.files.length ? draft : '', name, about, ref, text}), {'Content-Type': 'application/json'});
      try { if (name && !me) localStorage.setItem('familySender', name); } catch (_) {}
      drafts.delete(ref); saveDrafts();
      form.outerHTML = `<div class="sent" role="status"><p class="sent-title">${L(`Спасибо! Сообщение получит ${esc(RECIPIENT)}.`, `Thank you! The message goes to ${esc(RECIPIENT)}.`)}</p><p class="muted">${L('Номер сообщения', 'Message number')}: ${esc(answer.id)}.</p><button class="linklike" data-send-more>${L('Написать ещё', 'Write another')}</button></div>`;
    } catch (error) {
      say(error.message, true);
      button.disabled = false;
    }
  });
}

// «1932–1953» as «1932–53» when the century is the same, so the year column stays narrow.
// A span («1882–1913») keeps the first year in the column like any other row; the end is written small under it.
const yearSpan = ys => esc(ys[0]) + (ys.length > 1 ? `<small>–${esc(ys[1])}</small>` : '');
const LL_LONG = 12;
// epochOf: the card whose background of the epoch (epochEvents, facts.js) goes into this line, or none.
function lifeLineHtml(rows, epochOf) {
  if (rows.length < 2) return '';
  const refButton = ref => { const st = (C.get(ref) || R.get(ref) || X.get(ref))?.status; return `<button class="ref r${st ? level(st) : 2}" data-ref="${esc(ref)}" aria-label="${L('Основание', 'Ground')}: ${esc(ref)}">↗</button>`; };
  // A year repeated by the next event is written once.
  const labels = rows.map(r => (r.rough ? '≈' : '') + yearSpan(r.years));
  // A long line keeps every turn of life (birth, ordination, marriage, award, death…) and the first two steps of
  // study and of service; the other steps wait under «Вся лента».
  const seen = {}, quiet = rows.map(r => rows.length > LL_LONG && ['education', 'service', 'event', 'residence', 'military_event'].includes(r.field) && (seen[r.field] = (seen[r.field] || 0) + 1) > 2);
  const hidden = quiet.filter(Boolean).length;
  const fact = (r, i) => `<li class="${r.field === 'birth' || r.field === 'death' ? 'edge-event' : ''}"${quiet[i] ? ' hidden' : ''}>
    <span class="ll-year${r.rough ? ' rough' : ''}"${r.rough ? ` title="${L('Дата неточная', 'The date is not exact')}"` : ''}>${i && labels[i] === labels[i - 1] && quiet[i] === quiet[i - 1] && items[at - 1]?.i === i - 1 ? '' : labels[i]}</span>
    <div class="ll-what"><span class="field">${esc(field(r.field))}</span>${esc(cut(r.text))} ${r.refs.map(refButton).join('')}</div></li>`;
  // The background of the epoch: quiet rows of the time among the facts,
  // by year, after the birth and before the death; no references, as it says nothing of the person. The major events
  // show at once, the others under «События эпохи».
  const span = epochOf ? lifeSpan(epochOf) : null, epoch = epochOf ? epochEvents(epochOf) : [];
  const items = rows.map((r, i) => ({i}));
  const ends = new Set(['death', 'burial', 'canonization', 'rehabilitation']);
  epoch.map(e => ({e, y: Math.max(e.year, span.from)})).sort((a, b) => a.y - b.y).forEach(({e, y}) => {
    let k = items.findIndex(it => it.i !== undefined && (rows[it.i].field !== 'birth' && (+rows[it.i].years[0] > y || ends.has(rows[it.i].field))));
    if (k < 0) k = items.length;
    items.splice(k, 0, {e});
  });
  const minor = epoch.filter(e => !e.major).length;
  let at = 0;
  const html = items.map((it, n) => {
    at = n;
    if (it.i !== undefined) return fact(rows[it.i], it.i);
    const e = it.e;
    return `<li class="ll-epoch${e.major ? ' major' : ''}"${e.major ? '' : ' hidden'}><span class="ll-year">${yearSpan(e.end ? [e.year, e.end] : [e.year])}</span>
      <div class="ll-what"><span class="sr-only">${L('Эпоха: ', 'The time: ')}</span>${esc(e.text)}</div></li>`;
  }).join('');
  return `<h3>${L('Лента жизни', 'Timeline')}</h3><ol class="lifeline">${html}</ol>
    ${hidden ? `<button class="ll-open">${L('Вся лента: ещё', 'Whole timeline:')} ${hidden} ${plural(hidden, ['событие', 'события', 'событий'], ['more event', 'more events'])} ${L('учёбы и службы', 'of education and service')}</button>` : ''}
    ${minor ? `<button class="ll-epoch-open" aria-label="${L('Показать события эпохи в ленте: ещё', 'Show the events of the time in the timeline:')} ${minor}${L('', ' more')}">${L('События эпохи', 'Events of the time')} (${minor})</button>` : ''}
    ${epoch.length ? `<p class="ll-note ll-epoch-note">${L('Курсивом — события эпохи: фон, а не факты о человеке.', 'In italics — events of the time: the background, not facts about the person.')}</p>` : ''}
    ${rows.some(r => r.rough) ? `<p class="ll-note">${L('≈ — дата неточная или есть разные версии.', '≈ — the date is not exact or there are several versions.')}</p>` : ''}`;
}


function storyHtml(p, lifeHtml = '', used = new Set()) {
  const story = D.stories[p.id];
  const refs = [];
  const refButton = ref => {
    refs.push(ref);
    const st = (C.get(ref) || R.get(ref))?.status;
    return `<button class="ref r${st ? level(st) : 4}" data-ref="${esc(ref)}" aria-label="${L('Источник', 'Source')} ${refs.length}">${refs.length}</button>`;
  };
  if (story) {
    return story.text.split(/\n\s*\n/).map(par => `<p>${bold(esc(par.trim())).replace(REF_RE, (_, ref) => refButton(ref))}</p>`).join('')
      + (story.written ? `<p class="muted">${L('Рассказ составлен по базе', 'Story written from the database on')} ${esc(fmtDate(story.written))}. ${L('Цифры — ссылки на факты и документы.', 'Numbers link to the facts and documents.')}</p>` : '');
  }
  // Without a story the life line comes first; the facts already in it are not listed twice.
  const all = D.claims.filter(c => c.person_id === p.id), cs = all.filter(c => !used.has(c.id)).sort((a, b) => (year(a.value) || '9999').localeCompare(year(b.value) || '9999'));
  if (!all.length) return `<p class="auto">${L('О жизни пока известны только имя и место в семье.', 'Of this life only the name and the place in the family are known so far.')}</p>`;
  const list = `<ul class="facts">${cs.map(c => `<li><span class="field">${esc(field(c.field))}</span>${esc(fmtDate(c.value))} ${refButton(c.id)}</li>`).join('')}</ul>`;
  if (!lifeHtml) return `<p class="auto">${L('Связный рассказ ещё не написан. Вот что известно, по порядку:', 'No story is written yet. Here is what is known, in order:')}</p>${list}`;
  return `<p class="auto">${L('Связный рассказ ещё не написан.', 'No story is written yet.')}</p>${lifeHtml}${cs.length ? `<h3>${L('Ещё известно', 'Also known')}</h3>${list}` : ''}`;
}

function personView(id) {
  id = cid(id);
  const p = P.get(id), m = MERGE_OF.get(id);
  current = {p: id};
  mark(id);
  storyRead(id);
  const tag = storyTag?.id === id ? ` <span class="story-new">${storyTag.text}</span>` : '';
  const dates = q => esc(([dateValue(q, 'birth'), dateValue(q, 'death')].filter(Boolean).join(' — ') || L('Даты неизвестны', 'Dates unknown')) + (ageText(q) ? ` (${ageText(q)})` : ''));
  const dateRefs = q => [...new Set(Object.values(q.date_display || {}).flatMap(d => d.refs))].map(ref => `<button class="ref r${C.has(ref) ? level(C.get(ref).status) : 2}" data-ref="${esc(ref)}" aria-label="${L('Основание даты', 'Ground of the date')} ${esc(ref)}">↗</button>`).join(' ');
  const portrait = [id, ...(m?.members || [])].map(x => portraitOf(P.get(x))).find(Boolean);
  const head = `
    <p class="eyebrow">${inTree.has(id) ? L('Человек в древе', 'Person in the tree') : L('Запись вне древа', 'Record outside the tree')}</p>
    <h2 class="card-title">${esc(nameOf(id))}</h2>
    <p class="life">${m ? esc(m.years || dates(p)) : `${dates(p)}
      ${dateRefs(p)}`}
    </p>
    ${youLine(id)}
    ${m ? chip('inference') : chip(p.status)}
    ${canonized.has(id) ? `<p class="saint-plate"><svg viewBox="0 0 14 22" aria-hidden="true"><path d="M7 0V22M4 3.5H10M1 8H13M3.5 17L10.5 14"/></svg><span>${/^(прославлен|glorified|canoni[sz]ed)/i.test(canonized.get(id).value) ? '' : L('Прославлен: ', 'Glorified: ')}${esc(canonized.get(id).value)} <button class="ref r${level(canonized.get(id).status)}" data-ref="${esc(canonized.get(id).id)}" aria-label="${L('Источник', 'Source')}">↗</button></span></p>` : ''}
    <div class="card-actions">
    ${living(id) && me !== id ? `<button class="focus-btn me-btn" data-me-set="${esc(id)}"><i aria-hidden="true"></i>${L('Это я', 'This is me')}</button>` : ''}
    ${pageOpen && inTree.has(id) ? `<button class="focus-btn" data-tree-show="${esc(id)}" title="${L('Перейти к схеме: человек будет выбран и в середине экрана', 'Go to the tree: the person is selected and in the middle of the screen')}"><svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M7 3.5h6v3.5H7zM3 13h5v3.5H3zM12 13h5v3.5h-5zM10 7v3M5.5 13v-3h9v3"/></svg>${L('Показать на схеме', 'Show on the tree')}</button>` : ''}
    ${!pageOpen && inTree.has(id) ? `<button class="focus-btn" data-path-from="${esc(id)}" title="${L('Найти, кем приходится другой человек; на компьютере — Shift и нажать на карточку', 'Find how another person is related; on a computer — Shift and click a card')}">⇄ ${L('Кем приходится…', 'How related…')}</button>` : ''}
    ${!pageOpen && shown.has(id) ? (focus === id ? `<button class="focus-btn" data-unfocus>${L('Показать всё древо', 'Show the whole tree')}</button>` : `<button class="focus-btn" data-focus="${esc(id)}" title="${L(`Фокус: на схеме только он и его предки. ${touchScreen() ? 'Двойное касание' : 'Двойной клик'} по карточке делает то же`, `Focus: only them and their ancestors on the tree. A double ${touchScreen() ? 'tap' : 'click'} on the card does the same`)}">◎ ${L('Только предки', 'Ancestors only')}</button>`) : ''}
    ${fanCan(id) && !(pageOpen === 'fan' && fanId === cid(id)) ? `<button class="focus-btn" data-fan-open="${esc(id)}" title="${L('Все предки кольцами по коленам: отец слева, мать справа', 'All the ancestors in rings by generation: the father on the left, the mother on the right')}"><svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M2.5 15A7.5 7.5 0 0 1 17.5 15M5.5 15a4.5 4.5 0 0 1 9 0M10 7.5V3M4.7 9.7 1.6 6.6M15.3 9.7l3.1-3.1"/></svg>${pageOpen === 'fan' ? L('Веер от этого человека', 'The fan from this person') : L('Веер предков', 'Ancestor fan')}</button>` : ''}
    </div>
    ${portrait ? `<button class="portrait" data-doc="${esc(portrait.src.id)}" data-citing="media:${esc(id)}" style="background:url('${esc(portrait.src.views[0].mid || portrait.src.views[0].src)}') center/contain no-repeat var(--soft);height:300px" aria-label="${esc(portrait.cap)}"></button><p class="portrait-cap">${esc(portrait.cap)}</p>` : ''}
    ${me === id && living(id) && !minorChild(p) ? `<p class="no-photo"><button class="linklike" data-send="pp:${esc(id)}">${L('Добавить своё фото', 'Add your own photo')}</button></p>` : !portrait && photoWanted(id) ? `<p class="no-photo">${L('Фотографии пока нет', 'No photo yet')} — <button class="linklike" data-send="pp:${esc(id)}">${L('прислать', 'send')}</button></p>` : ''}
    ${!inTree.has(id) ? `<p class="flag"><strong>${L('Не соединён с древом', 'Not joined to the tree')}</strong>${L('Родство этой записи с семьёй документами не установлено.', 'No document establishes how this record is related to the family.')}</p>` : ''}
    ${m ? `<div class="merge-plate"><strong>${L(`Одна карточка — ${m.members.length + 1} записи о человеке`, `One card — ${m.members.length + 1} records of the person`)}</strong><p>${esc(m.note)}</p><p class="muted">${L('Записи в базе хранятся раздельно; на схеме они объединены. Основания:', 'The records stay separate in the database; on the tree they are joined. Grounds:')} ${m.refs.map(ref => `<button class="ref r${(C.get(ref) || R.get(ref)) ? level((C.get(ref) || R.get(ref)).status) : 2}" data-ref="${esc(ref)}">${esc(ref)}</button>`).join(' ')}</p></div>` : ''}`;
  // The background of the epoch goes once, into the first life line of the card long enough for it.
  const epochRec = [id, ...(m?.members || [])].find(r => lifeLine(r).length >= 2);
  // One block per record: its story, note, conflicts, family and documents.
  const block = (rid, i) => {
    const q = P.get(rid);
    const rs = D.relationships.filter(r => r.from_id === rid || r.to_id === rid);
    const conflicts = D.conflicts.filter(x => x.people.includes(rid));
    const docIds = [...new Set([...D.claims.filter(c => c.person_id === rid).flatMap(c => c.source_ids), ...(q.media || [])])].filter(s => S.get(s)?.views);
    const order = {parent: 0, spouse: 1, sibling: 2};
    rs.sort((a, b) => (a.to_id === rid ? -1 : 1) - (b.to_id === rid ? -1 : 1) || order[a.kind] - order[b.kind]);
    const ll = lifeLine(rid), llHtml = lifeLineHtml(ll, rid === epochRec ? id : null), hasStory = !!D.stories[rid];
    return `
    ${m ? `<h3 class="record-title">${i ? L('Другая запись', 'Other record') : L('Основная запись', 'Main record')}: ${esc(q.name)}</h3><p class="life">${dates(q)} ${dateRefs(q)}</p>${chip(q.status)}` : `<h3>${L('История жизни', 'Life story')}${tag}</h3>`}
    <div class="story">${hasStory ? storyHtml(q) : storyHtml(q, llHtml, new Set(llHtml ? ll.flatMap(r => r.refs) : []))}</div>
    ${hasStory ? llHtml : ''}${i ? '' : placesLine(rid)}
    ${q.note ? `<p class="note">${esc(q.note)}</p>` : ''}
    ${conflictsHtml(conflicts, L('Расхождения', 'Disagreements'))}
    ${rs.length ? `<h3>${L('Семья', 'Family')}</h3><div class="kin">${rs.map(r => {
      const other = r.from_id === rid ? r.to_id : r.from_id;
      return `<button data-rel="${esc(r.id)}"><span><small>${relationName(r, rid)}</small>${esc(nameOf(other))}</span>${chip(r.status)}</button>`;
    }).join('')}</div>` : ''}
    ${docIds.length ? `<h3>${L('Документы', 'Documents')}</h3>${[docIds.filter(s => !isResearch(s)), docIds.filter(isResearch)].map((ids, i) => ids.length ? `${i ? `<p class="docs-group">${L('Разбор', 'Research notes')}</p>` : ''}<div class="doc-grid">${ids.map(s => docCard(s, D.claims.find(c => c.person_id === rid && c.source_ids.includes(s))?.id || 'media:' + rid, {small: true})).join('')}</div>` : '').join('')}` : ''}`;
  };
  const hyp = lines.filter(l => l.hypothesis && (l.a === id || l.b === id)).map(l => `<h3>${esc(l.hypothesis.label)}</h3><div class="kin"><button data-line-link="${esc(l.key)}"><span>${esc(nameOf(l.a === id ? l.b : l.a))}</span>${chip('inference')}</button></div>`).join('');
  body.innerHTML = head + [id, ...(m?.members || [])].map(block).join(m ? '<hr class="record-sep">' : '') + hyp
    + (inTree.has(id) && !minorChild(p) ? `<p class="print-line"><button class="linklike" data-book="p:${esc(id)}">${L('Книжка для печати', 'Book to print')}: ${esc(firstName(id))} ${L('и предки', 'and ancestors')}</button> · <button class="linklike" data-export="p:${esc(id)}">${L('Скачать файлом GEDCOM', 'Download as GEDCOM')}</button></p>` : '')
    + tell('p:' + id, L('Знаете больше или есть фото, письмо, документ?', 'Know more, or have a photo, a letter, a document?'), SEND_TITLE);
  cardContents();
  return nameOf(id);
}
// A long card (a long story, a long life line, many documents) gets a row of its sections under its
// buttons; a touch scrolls the card to the section. A short card has none.
function cardContents() {
  const hs = [...body.querySelectorAll(':scope > h3, :scope > .story > h3')];
  if (hs.length < 3 || body.textContent.length < 5000) return;
  const count = h => {
    let n = 0;
    for (let x = h.nextElementSibling; x && x.tagName !== 'H3' && !x.querySelector?.(':scope > h3'); x = x.nextElementSibling)
      n += x.matches('.flag') ? 1 : x.querySelectorAll('.doc, .kin > button, .lifeline > li:not(.ll-epoch), .facts > li, :scope > .flag').length;
    return n;
  };
  body.querySelector('.card-actions')?.insertAdjacentHTML('afterend', `<nav class="contents" aria-label="${L('Разделы карточки', 'Sections of the card')}">${hs.map((h, i) => {
    h.dataset.section = i; const n = /История|Life story/.test(h.textContent) ? 0 : count(h);
    const name = [...h.childNodes].filter(x => !x.classList?.contains('story-new')).map(x => x.textContent).join('').trim();
    return `<button data-section-to="${i}">${esc(name.replace(/:.*$/, ''))}${n ? ` <small>${n}</small>` : ''}</button>`;
  }).join('')}</nav>`);
  syncContents();
}
// The row of sections sticks under the card's buttons (their height differs on a phone); the section being read
// is marked and kept in view in the row.
function syncContents() {
  const nav = body.querySelector('.contents');
  panel.classList.remove('stuck');
  if (!nav) return;
  const top = panel.querySelector('.panel-top'), ptop = top.getBoundingClientRect().height;
  panel.style.setProperty('--ptop', ptop + 'px');
  const line = nav.getBoundingClientRect().bottom + 12;
  panel.classList.toggle('stuck', nav.getBoundingClientRect().top <= top.getBoundingClientRect().bottom + .5 && panel.scrollTop > 0);
  const hs = [...body.querySelectorAll('[data-section]')];
  let on = hs.filter(h => h.getBoundingClientRect().top <= line).pop();
  if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 2) on = hs[hs.length - 1];
  nav.querySelectorAll('button').forEach(b => {
    const mine = !!on && b.dataset.sectionTo === on.dataset.section && panel.classList.contains('stuck');
    if (mine && !b.classList.contains('on')) nav.scrollTo({left: b.offsetLeft - 22, behavior: 'smooth'});
    b.classList.toggle('on', mine);
  });
}
panel.addEventListener('scroll', syncContents, {passive: true});
window.addEventListener('resize', syncContents);

function lineView(key) {
  let l = lines.find(x => x.key === key);
  if (!l && R.has(key)) { const r = R.get(key); l = {key, kind: r.kind === 'parent' ? 'child' : r.kind, rs: [r], best: r, a: r.from_id, b: r.to_id, parents: [r.from_id]}; }
  if (!l) return;
  if (l.hypothesis) {
    const h = l.hypothesis;
    current = {l: key}; mark(null, key);
    body.innerHTML = `<p class="eyebrow">${esc(h.eyebrow)}</p><h2 class="card-title">${esc(lineTitle(l))}</h2>${chip('inference')}<p class="note">${esc(h.note)}</p>
      <h3>${L('Как получена эта линия', 'How this line was found')}</h3><p>${esc(h.how)}</p>
      <div class="kin">${h.refs.map(ref => `<button data-ref="${esc(ref)}"><span>${esc(h.ref_labels?.[ref] || ref)}</span></button>`).join('')}</div>
      <h3>${L('Записи о людях', 'Records of the people')}</h3><div class="kin">${[h.from_id, h.via_id, h.to_id].filter(Boolean).map(id => `<button data-person-link="${esc(id)}"><span>${esc(nameOf(id))}<small>${esc(life(P.get(id)))}</small></span></button>`).join('')}</div>`;
    return lineTitle(l);
  }
  const r0 = l.best;
  current = {l: key};
  mark(null, l.key);
  const title = lineTitle(l);
  const kindText = l.kind === 'child' ? (l.parents.length > 1 ? L('Родители и ребёнок', 'Parents and child') : L('Родитель и ребёнок', 'Parent and child')) : l.kind === 'spouse' ? L('Супруги', 'Spouses') : L('Братья и сёстры', 'Brothers and sisters');
  const lv = level(r0.status);
  const people = l.kind === 'child' ? [...l.parents, l.b] : [l.a, l.b];
  const against = D.conflicts.filter(x => (l.kind === 'child' ? x.people.includes(l.b) && l.parents.some(p => x.people.includes(p)) : people.every(id => x.people.includes(id))) || l.rs.some(r => (x.detail + x.title).includes(r.id)));
  const recordTitle = r => r.kind === 'parent' ? `${nameOf(r.from_id)} → ${nameOf(r.to_id)}` : `${nameOf(r.from_id)} ${L('и', 'and')} ${nameOf(r.to_id)}`;
  body.innerHTML = `
    <p class="eyebrow">${L('Связь', 'Link')} · ${esc(kindText)}</p>
    <h2 class="card-title">${esc(title)}</h2>
    <div class="scale s${lv}" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="scale-cap"><span>${L('только схема', 'only a chart')}</span><span>${L('документ эпохи', 'document of the time')}</span></div>
    <p class="verdict">${esc(VERDICT[r0.status] || label(r0.status))}</p>
    ${personalLine(l) ? `<p class="note">${L('Эту связь семья знает лично, поэтому на схеме она зелёная. В базе она остаётся семейным свидетельством: документа эпохи о ней пока нет.', 'The family knows this link personally, so it is green on the tree. In the database it stays the family’s word: there is no document of the time for it yet.')}</p>` : ''}
    ${new Set(l.rs.map(r => r.status)).size > 1 ? `<p class="muted">${L('У записей этой линии разная надёжность.', 'The records of this line differ in reliability.')} ${l.kind === 'child' && l.parents.length > 1 ? L('Линия нарисована по самой надёжной записи о каждом родителе, а из двух родителей — по более слабому.', 'The line is drawn by the most reliable record of each parent, and of the two parents by the weaker.') : L('Линия нарисована по самой надёжной записи.', 'The line is drawn by the most reliable record.')} ${L('Ниже — каждая запись отдельно.', 'Each record is below.')}</p>` : ''}
    ${chip(r0.status)}
    ${l.rs.length > 1 ? '' : decided(r0)}
    <p class="muted">${esc(LEVELS.find(x => x[0] === lv)[2])}</p>
    ${l.rs.map(r => `
      ${l.rs.length > 1 ? `<h3>${esc(recordTitle(r))}</h3>${chip(r.status)}${decided(r)}` : `<h3>${L('На чём держится', 'What it rests on')}</h3>`}
      ${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
      ${docsHtml(r.source_ids, r.id)}`).join('')}
    ${against.length ? conflictsHtml(against, L('Что противоречит или не сходится', 'What contradicts or does not fit'), true) : `<h3>${L('Что противоречит', 'What contradicts')}</h3><p class="muted">${L('Противоречий для этой пары в базе не записано.', 'No disagreements are recorded for this pair.')}</p>`}
    <h3>${L('Люди', 'People')}</h3><div class="kin">${people.map(id => `<button data-person-link="${esc(id)}"><span>${esc(nameOf(id))}<small>${esc(life(P.get(id)))}</small></span></button>`).join('')}</div>
    ${tell('l:' + key, L('Знаете больше об этой связи?', 'Know more about this link?'), SEND_TITLE)}`;
  return title;
}

function refView(ref) {
  current = {f: ref};
  if (ref.startsWith('S:')) {
    const sid = ref.slice(2);
    body.innerHTML = `<p class="eyebrow">${isResearch(sid) ? L('Разбор', 'Research note') : L('Источник', 'Source')}</p><h2 class="card-title">${esc(S.get(sid)?.title || sid)}</h2><div class="docs">${docCard(sid, null)}</div>`;
    return;
  }
  if (R.has(ref)) return lineView(pairKey(R.get(ref)));
  const x = X.get(ref);
  if (x) {
    body.innerHTML = `<p class="eyebrow">${isOpen(x) ? L('Противоречие', 'Disagreement') : L('Противоречие · закрыто ', 'Disagreement · settled ') + SOLVED[x.state]}</p><h2 class="card-title">${esc(x.title)}</h2><p>${esc(x.detail)}</p>
      ${isOpen(x) ? `<p class="muted">${L('Проверить', 'To check')}: ${esc(x.resolution || '')}</p>` : `<p class="decided">${L('Закрыто', 'Settled')} ${SOLVED[x.state]}${x.resolution ? ': ' + esc(x.resolution) : '.'}</p>`}${decided(x)}${docsHtml(x.source_ids || [], x.id)}
      ${isOpen(x) ? tell('x:' + x.id, L('Знаете, как было на самом деле?', 'Do you know how it really was?'), L('Я знаю →', 'I know →')) : ''}`;
    return;
  }
  const c = C.get(ref);
  if (!c) return;
  body.innerHTML = `
    <p class="eyebrow">${L('Факт', 'Fact')} · ${esc(nameOf(c.person_id))}</p>
    <div class="claim-card"><span class="eyebrow">${esc(field(c.field))}</span><p class="value">${esc(fmtDate(c.value))}</p>${chip(c.status)}${decided(c)}${c.locator ? `<p class="loc">${esc(c.locator)}</p>` : ''}</div>
    ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
    <h3>${L('Документы', 'Documents')}</h3>${docsHtml(c.source_ids, c.id)}`;
}

function youLine(id) {
  id = cid(id);
  if (!me || !inTree.has(id)) return '';
  if (id === me) return `<p class="you">${L('Это вы', 'This is you')}</p>`;
  const text = youText(id);
  return text ? `<p class="you">${L('Вам', 'To you')}: <button class="linklike" data-path-to="${esc(me)}~${esc(id)}">${esc(text)}</button></p>` : '';
}
let pathPick = null;
function pathView(key) {
  const [a, b] = key.split('~').map(cid);
  current = {path: key};
  if (!P.has(a) || !P.has(b)) { body.innerHTML = `<p class="muted">${L('Таких людей в древе нет.', 'There are no such people in the tree.')}</p>`; return; }
  // The same person at both ends (a link written by hand): no chain and no word for it.
  if (a === b) {
    markPath(null, a);
    body.innerHTML = `<p class="eyebrow">${L('Кем приходится', 'How they are related')}</p><h2 class="card-title">${esc(nameOf(a))}</h2>
      <p class="note">${L('Это один и тот же человек. Откройте', 'This is one and the same person. Open the')} <button class="linklike" data-person-link="${esc(a)}">${L('карточку', 'card')}</button> ${L('и выберите «Кем приходится» для другого человека.', 'and choose «How related…» for another person.')}</p>`;
    return nameOf(a);
  }
  // A blood chain comes first; a shorter chain through a marriage is shown below it.
  const kin = kinOf(a, b), steps = kin && kin.steps, alt = kin && kin.alt;
  // Everyone on the chain is put on the canvas: the focus ends, folded branches open.
  if (steps) {
    const ids = [a, ...steps.map(s => s.to)].filter(id => inTree.has(id));
    if (focus || ids.some(id => !shown.has(id))) {
      focus = null;
      ids.forEach(id => { if (!basePeople().has(id)) { const g = homeOf.get(id); if (activeGroup) openGroups.add(g); else hiddenGroups.delete(g); } });
      shown = basePeople(); renderTree(); syncGroups(); syncHash();
    }
  }
  markPath(steps, a);
  if (steps) setTimeout(() => fitPeople([a, ...steps.map(s => s.to)]), 0);
  const head = `<p class="eyebrow">${L('Кем приходится', 'How they are related')}</p><h2 class="card-title">${esc(nameOf(b))}</h2>
    <p class="life">${L('относительно', 'to')}: <button class="linklike" data-person-link="${esc(a)}">${esc(nameOf(a))}</button></p>
    <button class="focus-btn" data-path-swap="${esc(b)}~${esc(a)}">⇅ ${L('Наоборот', 'The other way')}</button>`;
  if (!steps) { body.innerHTML = head + `<p class="note">${L('Связь между ними в древе не найдена: кто-то из них — запись вне древа.', 'No link between them in the tree: one of them is a record outside the tree.')}</p>`; return nameOf(b); }
  const {weak, term} = kin;
  const kind = term || (steps.some(s => s.move === 'K') ? L('вероятное родство, степень неизвестна', 'probable kinship, degree unknown') : L('родство через брак', 'kinship by marriage'));
  const weakSteps = steps.filter(s => level(s.rec.status) <= 2), shownSteps = readableSteps(steps);
  body.innerHTML = head + `
    <p class="verdict">${esc((t => t[0].toUpperCase() + t.slice(1))(term ? (weak <= 2 ? L('вероятно, ', 'probably ') : '') + term : kind))}</p>
    <div class="scale s${weak}" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
    <div class="scale-cap"><span>${L('только схема', 'only a chart')}</span><span>${L('документ эпохи', 'document of the time')}</span></div>
    <p class="muted">${esc(PATH_VERDICT[weak])} ${L('Цепочка не надёжнее самого слабого звена.', 'A chain is no stronger than its weakest link.')}</p>
    ${weakSteps.length ? `<h3>${L('Слабые места', 'Weak links')}</h3>${weakSteps.map(s => `<div class="flag"><strong>${esc(nameOf(s.from))} ${ARROW[s.move]} ${esc(nameOf(s.to))}</strong>${esc(VERDICT[s.rec.status] || label(s.rec.status))} <button class="ref r${level(s.rec.status)}" data-line-link="${esc(s.line.key)}" aria-label="${L('Подробнее о связи', 'More about the link')}">↗</button></div>`).join('')}` : ''}
    <h3>${L('Цепочка', 'Chain')} · ${shownSteps.length} ${plural(shownSteps.length, ['шаг', 'шага', 'шагов'], ['step', 'steps'])}</h3>
    <ol class="chain">
      <li><button data-person-link="${esc(a)}"><span>${esc(nameOf(a))}</span></button></li>
      ${shownSteps.map(s => `<li><button class="chain-link" data-line-link="${esc(s.line.key)}"><small>${ARROW[s.move]} ${esc(roleWord(s.move, s.to))}${s.via ? `<span class="via">${s.via.length > 1 ? L('общие родители', 'common parents') : sexOf(s.via[0]) === 'f' ? L('общая мать', 'common mother') : L('общий отец', 'common father')}: ${esc(s.via.map(id => nameParts(id)?.plain || nameOf(id)).join(L(' и ', ' and ')))}</span>` : ''}</small>${chip(s.rec.status)}</button><button data-person-link="${esc(s.to)}"><span>${esc(nameOf(s.to))}<small>${esc(life(P.get(s.to)))}</small></span></button></li>`).join('')}
    </ol>
    <p class="muted">${L('Нажмите на звено — откроются документы, на которых держится связь.', 'Click a link for the documents it rests on.')}</p>
    ${alt ? `<h3>${L('Короче — через брак', 'Shorter — through a marriage')} · ${alt.length} ${plural(alt.length, ['шаг', 'шага', 'шагов'], ['step', 'steps'])}</h3>
      <ol class="chain short">${[{to: a}, ...alt].map((s, i) => `<li><button data-person-link="${esc(s.to)}"><span>${i ? `<small>${ARROW[s.move]} ${esc(roleWord(s.move, s.to))} · ${esc(label(s.rec.status))}</small>` : ''}${esc(nameOf(s.to))}</span></button></li>`).join('')}</ol>` : ''}`;
  return nameOf(b);
}
function startPathPick(id) {
  leavePage();
  pathPick = cid(id);
  body.querySelector('.path-pick')?.remove();
  body.insertAdjacentHTML('afterbegin', `<div class="note path-pick"><strong>${L('Кем приходится', 'How is')} ${esc(nameOf(pathPick))}${L('…', ' related to…')}</strong><br>${L('Выберите второго человека: нажмите на его карточку на схеме или найдите поиском.', 'Choose the second person: click their card on the tree or find them by search.')} <button class="linklike" data-path-cancel>${L('Отмена', 'Cancel')}</button></div>`);
  panel.scrollTop = 0;
  if (narrow()) panel.dataset.state = 'peek';
}
function pickSecond(id) {
  const a = pathPick; pathPick = null;
  go({path: `${a}~${cid(id)}`});
}

// The places of a person's card, under the life line: «На карте: Кашин · Тверь · Москва».
const placesLine = id => {
  const pls = (PLACES_OF.get(cid(id)) || []).slice().sort((a, b) => (yearsOf(a.cs.filter(c => cid(c.person_id) === cid(id)))?.[0] ?? 9999) - (yearsOf(b.cs.filter(c => cid(c.person_id) === cid(id)))?.[0] ?? 9999));
  return pls.length ? `<p class="places-line"><span>${L('На карте', 'On the map')}:</span> ${pls.map(pl => `<button class="linklike" data-place-link="${esc(pl.id)}">${esc(pl.name.replace(/ \(.*\)$/, ''))}</button>`).join(' · ')}</p>` : '';
};
