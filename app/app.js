'use strict';
const D = window.FAMILY_DATA;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const SVG = 'http://www.w3.org/2000/svg';
// The settings of this site: its title, the text under «?», the branches, contacts (data/site.json).
const SITE = D.site || {};
// ---------- Language ----------
// The interface speaks Russian or English: the reader's choice (the RU/EN switch in the header, kept in this
// browser), else "lang" of data/site.json, else English. L(ru, en) picks the text of the interface. Any text of the
// data may be {"ru": …, "en": …}: localize puts the reader's language in its place (or the other, if it is missing);
// a plain string is the same in every language.
const LANGS = (SITE.languages || ['en', 'ru']).filter(l => ['ru', 'en'].includes(l));
const LANG = (() => { try { const l = localStorage.getItem('familyLang'); if (LANGS.includes(l)) return l; } catch (_) {} return LANGS.includes(SITE.lang) ? SITE.lang : LANGS[0] || 'en'; })();
const EN = LANG === 'en';
const L = (ru, en) => EN ? en : ru;
const isLangText = v => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every(k => k === 'ru' || k === 'en');
const loc = v => isLangText(v) ? v[LANG] ?? v.ru ?? v.en : v;
const localize = v => isLangText(v) ? loc(v) : Array.isArray(v) ? v.map(localize) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, localize(x)])) : v;
Object.assign(D, localize({...D, site: undefined}), {site: SITE});
const P = new Map(D.people.map(p => [p.id, p]));
const S = new Map(D.sources.map(s => [s.id, s]));
const C = new Map(D.claims.map(c => [c.id, c]));
const R = new Map(D.relationships.map(r => [r.id, r]));
const X = new Map(D.conflicts.map(x => [x.id, x]));
const ROOT = D.root_person_id;
const LOCALE = L('ru-RU', 'en-GB');
// Plural: Russian has three forms (1 год, 2 года, 5 лет), English two.
const plural = (n, ru, en) => EN ? (n === 1 ? en[0] : en[1]) : ru[n % 10 === 1 && n % 100 !== 11 ? 0 : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 1 : 2];
document.documentElement.lang = LANG;
// The fixed texts of index.html, translated in place.
const STATIC_EN = {
  'Семейное древо': 'Family tree', 'Семейное древо: к началу': 'Family tree: back to the start', 'К началу': 'Back to the start',
  'Ветки семьи': 'Branches of the family', 'Найти человека…': 'Find a person…', 'Найти человека': 'Find a person', 'Режим': 'Mode',
  'Древо': 'Tree', 'Карта': 'Map', 'Документы': 'Documents', 'Помочь дополнить': 'Help fill in', 'Помочь': 'Help',
  'Что нового': "What's new", 'Новое': 'New', 'Что здесь есть и как читать линии': "What's here and how to read the lines",
  'Скрыть': 'Hide', 'Нет': 'No', 'Да': 'Yes',
  'Семейное древо. Перетаскивайте для перемещения, колесо или щипок — масштаб. Нажмите на человека или линию.': 'Family tree. Drag to move, wheel or pinch to zoom. Click a person or a line.',
  'Масштаб': 'Zoom', 'Приблизить': 'Zoom in', 'Отдалить': 'Zoom out', 'Вписать всё древо в экран': 'Fit the whole tree on the screen',
  'Вписать древо в экран': 'Fit the tree on the screen', 'Напечатать схему на лист A3': 'Print the tree on an A3 sheet', 'Напечатать схему': 'Print the tree',
  'Закрыть': 'Close', 'Насколько надёжна связь': 'How reliable a link is',
  'Фокус:': 'Focus:', 'и его предки': 'and their ancestors', 'Всё древо': 'Whole tree', 'Карта мест': 'Map of places', '← Вся карта': '← Whole map',
  'Закрыть карту, вернуться к древу': 'Close the map, back to the tree', 'К древу ×': 'To the tree ×',
  'Карта мест семьи. Перетаскивайте, колесо или щипок — масштаб.': "Map of the family's places. Drag, wheel or pinch to zoom.",
  'Приблизить карту': 'Zoom the map in', 'Отдалить карту': 'Zoom the map out', 'Как листать': 'How to browse', 'По месту': 'By place', 'По годам': 'By year',
  'Закрыть документы, вернуться к древу': 'Close the documents, back to the tree', 'Разделы': 'Sections', 'Книжка историй': 'Book of stories',
  'Чья книжка': 'Whose book', 'Напечатать книжку': 'Print the book', 'Закрыть книжку, вернуться к древу': 'Close the book, back to the tree',
  'В этот день': 'On this day', 'Закрыть, вернуться к древу': 'Close, back to the tree',
  'Нажмите на человека — откроется его история, двойной клик — только его предки. Нажмите на линию — документы, на которых держится связь.': 'Click a person to open their story, double-click for their ancestors only. Click a line for the documents the link rests on.',
  'Ширина карточки: потяните; двойной клик — обычная ширина': 'Width of the card: drag; double-click for the usual width',
  'Потяните, чтобы сделать карточку шире или уже. Двойной клик — обычная ширина': 'Drag to make the card wider or narrower. Double-click for the usual width',
  'Карточка': 'Card', 'Развернуть или свернуть карточку': 'Expand or collapse the card', '← Назад': '← Back',
  'Развернуть карточку на весь экран': 'Expand the card to the full screen', '⤢ Развернуть': '⤢ Expand', 'Напечатать карточку': 'Print the card',
  'Закрыть карточку': 'Close the card', 'Документ': 'Document', 'Предыдущая страница': 'Previous page', 'Следующая страница': 'Next page',
  'Закрыть документ': 'Close the document', 'Предыдущий документ': 'Previous document', 'Следующий документ': 'Next document',
};
if (EN) {
  const tr = t => { const k = t.trim(); return STATIC_EN[k] ? t.replace(k, STATIC_EN[k]) : t; };
  for (const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); walk.nextNode();) walk.currentNode.nodeValue = tr(walk.currentNode.nodeValue);
  document.querySelectorAll('[aria-label],[title],[placeholder],[alt]').forEach(el => ['aria-label', 'title', 'placeholder', 'alt'].forEach(a => { if (el.hasAttribute(a)) el.setAttribute(a, tr(el.getAttribute(a))); }));
}
const SITE_NAME = loc(SITE.title) || L('Семейное древо', 'Family tree');
// Where messages from the site go (data/site.json inbox_url, recipient); see the form further down.
const INBOX = SITE.inbox_url ? new URL(SITE.inbox_url, location.href).href : '';
const RECIPIENT = loc(SITE.recipient) || L('составитель древа', 'the keeper of the tree');
// Visual merges: several records of one person share one card on the tree (data/site-merges.json).
// The records stay separate in the database; the card lists each of them.
const MERGES = D.merges || [];
const ALIAS = new Map(MERGES.flatMap(m => m.members.map(x => [x, m.main])));
const MERGE_OF = new Map(MERGES.map(m => [m.main, m]));
const cid = id => ALIAS.get(id) || id;
// The name as recorded (the data mix «Фамилия Имя» and «Имя Отчество Фамилия»); nameOf shows it in one order.
const rawName = id => MERGE_OF.get(cid(id))?.name || P.get(id).name;
const shownNames = new Map();
// «Фамилия (девичья) Имя Отчество» everywhere a name labels a person: card titles, lists, search, chains.
// A name that does not split into parts («Пётр — дьячок…») stays as written.
const nameOf = id => {
  if (!shownNames.has(id)) { const n = nameParts(id); shownNames.set(id, n ? [n.surname + (n.maiden ? `${n.surname ? ' ' : ''}(${n.maiden})` : ''), n.given].filter(Boolean).join(' ') : rawName(id)); }
  return shownNames.get(id);
};
// Conflicts: an open one puts a quiet ⚑ on the card; settled ones, by a document or by the family's decision,
// stay in the cards under «Решено».
const isOpen = x => (x.state || 'open') === 'open';
const SOLVED = L({resolved_by_document: 'документом', resolved_by_decision: 'решением семьи'}, {resolved_by_document: 'by a document', resolved_by_decision: "by the family's decision"});
const FLAGGED = new Set(D.conflicts.filter(isOpen).flatMap(x => x.people.filter(id => P.has(id)).map(cid)));
const narrow = () => matchMedia('(max-width: 760px)').matches;
// A phone or tablet: the hints speak of touches, not clicks.
const touchScreen = () => matchMedia('(hover: none) and (pointer: coarse)').matches;

// ---------- Reliability: the evidence status, never an invented percentage ----------
const LEVEL = {primary_document: 5, publication: 4, index_record: 4, family_testimony: 3, inference: 2, archive_lead: 2, chart_only: 1, unverified_tree: 1, unknown: 1};
const LEVELS = L([
  [5, 'Документ эпохи', 'Прочитано в метрике, ревизской сказке, формуляре или семейном документе.'],
  [4, 'Публикация или указатель', 'Напечатано в ведомостях, книге или архивном указателе; сам подлинник не прочитан.'],
  [3, 'Со слов семьи', 'Семейный рассказ или документ, которого пока нет в архивной копии.'],
  [2, 'Вероятно — нужна проверка', 'Вывод по совокупности совпадений или архивная зацепка; прямой записи нет.'],
  [1, 'Только схема или чужое дерево', 'Держится на семейной схеме или чужом дереве, документами не проверено.'],
], [
  [5, 'Document of the time', 'Read in a parish register, census, service record or family document.'],
  [4, 'Publication or index', 'Printed in a list, a book or an archive index; the original itself has not been read.'],
  [3, 'In the family’s words', 'A family account, or a document with no archive copy yet.'],
  [2, 'Probable — needs checking', 'A conclusion from several matches, or an archive lead; there is no direct record.'],
  [1, 'Only a chart or another tree', 'Rests on a family chart or someone else’s tree, not checked against documents.'],
]);
const VERDICT = EN ? {
  primary_document: 'The link is written in a document of the time.',
  publication: 'The link is printed in a publication; the original has not been read.',
  index_record: 'The link is seen in an archive index.',
  family_testimony: 'The link is known from the family.',
  inference: 'The link is probable, but there is no direct document.',
  archive_lead: 'There is only an archive lead.',
  chart_only: 'The link is only on a family chart.',
  unverified_tree: 'The link comes from someone else’s tree and is not checked.',
  unknown: 'The ground of the link is unknown.',
} : {
  primary_document: 'Связь записана в документе эпохи.',
  publication: 'Связь напечатана в публикации; подлинник не прочитан.',
  index_record: 'Связь видна по архивному указателю.',
  family_testimony: 'Связь известна со слов семьи.',
  inference: 'Связь вероятна, но прямого документа нет.',
  archive_lead: 'Есть только архивная зацепка.',
  chart_only: 'Связь есть только на семейной схеме.',
  unverified_tree: 'Связь взята из чужого дерева и не проверена.',
  unknown: 'Основание связи неизвестно.',
};
const level = s => LEVEL[s] || 1;
const STATUS_EN = {primary_document: 'Document of the time', publication: 'In a publication', index_record: 'In an index', family_testimony: 'In the family’s words',
  inference: 'Probable identification — to check', archive_lead: 'Archive lead', chart_only: 'Only a chart', unverified_tree: 'Another tree — to check', unknown: 'Unknown'};
const label = s => (EN && STATUS_EN[s]) || D.status_labels[s] || s;
const chip = s => `<span class="chip c${level(s)}"><i></i>${esc(label(s))}</span>`;
const FIELDS = {birth_record: 'Запись рождения', family: 'Семья', award: 'Награда', retirement: 'Увольнение за штат', mention: 'Упоминание', name: 'Имя', identity: 'Кто это', identification: 'Кто это', siblings: 'Братья и сёстры', family_history: 'Семейная память', birth: 'Рождение', death: 'Смерть', birth_place: 'Место рождения', birth_surname: 'Девичья фамилия', maiden_name: 'Девичья фамилия', occupation: 'Занятие', archive_reference: 'Архивный ориентир', archive: 'Архивный ориентир', education: 'Учёба', service: 'Служба', ordination: 'Рукоположение', marriage: 'Брак', age_at_marriage: 'Возраст при браке', age_in_record: 'Возраст в документе', repression: 'Репрессии', parish_lead: 'Поиск прихода', pedigree: 'Родословная', arrest: 'Арест', sentence: 'Приговор', rehabilitation: 'Реабилитация', canonization: 'Канонизация', kinship: 'Родство', event: 'Событие', birthplace: 'Место рождения', parents: 'Родители', father: 'Отец', mother: 'Мать', spouse: 'Супруг(а)', origin: 'Происхождение', godparents: 'Восприемники', military_event: 'На фронте', tonsure: 'Постриг', baptism: 'Крещение', burial: 'Погребение', residence: 'Где жил'};
const FIELDS_EN = {birth_record: 'Birth record', family: 'Family', award: 'Award', retirement: 'Retirement', mention: 'Mention', name: 'Name', identity: 'Who this is', identification: 'Who this is', siblings: 'Brothers and sisters', family_history: 'Family memory', birth: 'Birth', death: 'Death', birth_place: 'Place of birth', birth_surname: 'Maiden name', maiden_name: 'Maiden name', occupation: 'Occupation', archive_reference: 'Archive reference', archive: 'Archive reference', education: 'Education', service: 'Service', ordination: 'Ordination', marriage: 'Marriage', age_at_marriage: 'Age at marriage', age_in_record: 'Age in the record', repression: 'Repression', parish_lead: 'Parish search', pedigree: 'Pedigree', arrest: 'Arrest', sentence: 'Sentence', rehabilitation: 'Rehabilitation', canonization: 'Canonization', kinship: 'Kinship', event: 'Event', birthplace: 'Place of birth', parents: 'Parents', father: 'Father', mother: 'Mother', spouse: 'Spouse', origin: 'Origin', godparents: 'Godparents', military_event: 'At the front', tonsure: 'Tonsure', baptism: 'Baptism', burial: 'Burial', residence: 'Where they lived'};
const field = f => (EN ? FIELDS_EN[f] : FIELDS[f]) || f.replace(/_/g, ' ');
const year = v => {
  const text = String(v || '').trim();
  if (/^\d{4}(?:-\d{2}){0,2}$/.test(text)) return text.slice(0, 4);
  const years = [...text.matchAll(/\b(1[5-9]\d\d|20\d\d)\b/g)].map(m => m[1]);
  // Two calendar styles can describe one date; preserve all other qualifiers.
  if (text.includes('ст. ст.') && text.includes('н. ст.') && new Set(years).size === 1) return years[0];
  return text;
};
const dateValue = (p, kind, short = false) => p.date_display?.[kind]?.[short ? 'short' : 'text'] ?? (short ? year(p[kind]) : fmtDate(p[kind]));
const life = p => {
  const b = dateValue(p, 'birth', true), d = dateValue(p, 'death', true);
  return b || d ? `${b || '?'}${d ? ' – ' + d : ''}` : '';
};
// Age at death, only from dates written as ISO (year, year-month or a full date) and never for the
// living. A year or month known only roughly gives a range; before the 1918 calendar change a date may
// be in either style, 13 days apart, so a birthday that close to the death date also gives a range.
const SHIFT_END = Date.UTC(1918, 1, 14), DAY = 864e5;
function dateSpan(v) {
  const text = String(v || '').trim();
  // A date written in both styles («1858-09-06 (ст. ст.) / 1858-09-18 (н. ст.)») spans the two.
  const both = /^(\d{4})-(\d{2})-(\d{2}) \(ст\. ст\.\) \/ (\d{4})-(\d{2})-(\d{2}) \(н\. ст\.\)$/.exec(text);
  if (both) return [Date.UTC(+both[1], both[2] - 1, +both[3]), Date.UTC(+both[4], both[5] - 1, +both[6])];
  // Two documents giving two dates («1926-07-15 / 1926-06-15») span both of them.
  if (/ \/ /.test(text)) {
    const spans = text.split(' / ').map(dateSpan);
    return spans.every(Boolean) ? [Math.min(...spans.map(x => x[0])), Math.max(...spans.map(x => x[1]))] : null;
  }
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(text);
  if (!m) return null;
  const y = +m[1], mo = m[2] ? +m[2] - 1 : null, d = m[3] ? +m[3] : null;
  let lo = Date.UTC(y, mo ?? 0, d ?? 1), hi = d ? lo : Date.UTC(mo === null ? y + 1 : y, mo === null ? 0 : mo + 1, 1) - DAY;
  // A full date before the calendar change may be in either style.
  if (d && lo < SHIFT_END) { lo -= 13 * DAY; hi += 13 * DAY; }
  return [lo, hi];
}
const fullYears = (from, to) => {
  const a = new Date(from), b = new Date(to);
  return b.getUTCFullYear() - a.getUTCFullYear() - (b.getUTCMonth() < a.getUTCMonth() || (b.getUTCMonth() === a.getUTCMonth() && b.getUTCDate() < a.getUTCDate()) ? 1 : 0);
};
const yearsWord = n => plural(n, ['год', 'года', 'лет'], ['year', 'years']);
// Without an exact birth date, the age written in the death record itself («81 год на 27.11.1995»),
// joined with the age by a probable birth record when there is one (80–81).
const DEATH_AGE = new Map(D.claims.filter(c => c.field === 'age_in_record').map(c => [c, /^(\d+) (год|года|лет|years?) (?:на|on) (\d{2})\.(\d{2})\.(\d{4})$/.exec(c.value.trim())])
  .filter(([c, m]) => m && P.get(c.person_id)?.death === `${m[5]}-${m[4]}-${m[3]}`).map(([c, m]) => [c.person_id, +m[1]]));
// The death fact itself may end with the age: «9 июня 1979, город Углич, 79 лет».
D.claims.filter(c => c.field === 'death' && !DEATH_AGE.has(c.person_id)).forEach(c => {
  const m = /,\s*(\d+) (?:год|года|лет|years?)$/.exec(c.value.trim());
  if (m) DEATH_AGE.set(c.person_id, +m[1]);
});
const BIRTH_FACT = new Map(D.claims.filter(c => c.field === 'birth' && dateSpan(c.value)).map(c => [c.person_id, dateSpan(c.value)]));
function ageText(p) {
  let b = dateSpan(p.birth);
  const d = p.death && dateSpan(p.death), told = DEATH_AGE.get(p.id);
  if (!b && told !== undefined) b = BIRTH_FACT.get(p.id);
  if (!d || (!b && told === undefined)) return '';
  let lo = b ? Math.max(0, fullYears(b[1], d[0])) : told, hi = b ? fullYears(b[0], d[1]) : told;
  if (!dateSpan(p.birth) && told !== undefined) { lo = Math.min(lo, told); hi = Math.max(hi, told); }
  if (hi < 0 || hi - lo > 1) return '';
  if (hi === 0) return L('меньше года', 'under a year');
  return lo === hi ? `${hi} ${yearsWord(hi)}` : `${lo}–${hi} ${yearsWord(hi)}`;
}
// **text** in stories and «Что нового» is bold; applied after escaping, so it never makes other markup.
const bold = html => html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
const fmtDate = v => String(v || '').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3.$2.$1');

// ---------- Main family component, plus optional disconnected records ----------
// A chain through a possible identity is no longer needed once that identity is a merged card.
// The texts of a hypothesis may be {ru, en}, like the settings.
const HYPOTHESES = (D.hypotheses || []).filter(h => !(h.via_id && cid(h.via_id) === cid(h.from_id)))
  .map(h => ({...h, ...Object.fromEntries(['title', 'label', 'caption', 'eyebrow', 'how', 'note'].map(k => [k, loc(h[k])])),
    ref_labels: Object.fromEntries(Object.entries(h.ref_labels || {}).map(([k, v]) => [k, loc(v)]))}));
const adjacency = new Map(D.people.map(p => [p.id, []]));
// Records marked off_tree (a disproved reading) stay in the database and cards, but not on the canvas.
const OFF_TREE = new Set(D.people.filter(p => p.off_tree).map(p => p.id));
const onCanvas = r => !OFF_TREE.has(r.from_id) && !OFF_TREE.has(r.to_id);
// On the canvas a merged record's links belong to the shared card.
const CANVAS_RELS = D.relationships.filter(onCanvas)
  .map(r => ALIAS.has(r.from_id) || ALIAS.has(r.to_id) ? {...r, from_id: cid(r.from_id), to_id: cid(r.to_id)} : r)
  .filter(r => r.from_id !== r.to_id);
CANVAS_RELS.forEach(r => { adjacency.get(r.from_id).push(r.to_id); adjacency.get(r.to_id).push(r.from_id); });
// A probable kinship (degree unknown) joins a branch to the tree without claiming parentage.
HYPOTHESES.filter(h => h.kind === 'possible_kin').forEach(h => { adjacency.get(h.from_id).push(h.to_id); adjacency.get(h.to_id).push(h.from_id); });
const inTree = new Set([ROOT]);
for (const queue = [ROOT]; queue.length;) for (const n of adjacency.get(queue.pop())) if (!inTree.has(n)) { inTree.add(n); queue.push(n); }
// Lines on the canvas: a spouse line per couple, one line per child that carries every
// parent record of that child, and the rare sibling-only links.
const bestOf = rs => rs.slice().sort((a, b) => level(b.status) - level(a.status))[0];
const weakestOf = rs => rs.slice().sort((a, b) => level(a.status) - level(b.status))[0];
const treeRels = CANVAS_RELS;
const lines = [], lineOfRel = new Map();
function addLine(key, kind, rs, a, b) {
  let l = lines.find(x => x.key === key);
  if (!l) { l = {key, kind, rs: [], a, b}; lines.push(l); }
  l.rs.push(...rs);
  rs.forEach(r => lineOfRel.set(r.id, key));
}
treeRels.forEach(r => {
  if (r.kind === 'parent') addLine('c:' + r.to_id, 'child', [r], null, r.to_id);
  else addLine([r.from_id, r.to_id].sort().join('~') + '~' + r.kind, r.kind, [r], r.from_id, r.to_id);
});
// A child line is only as strong as its weakest parent, each parent by its strongest record
// (a merged card may carry a chart reading and a document for the same parent); the card shows each one.
lines.forEach(l => {
  if (l.kind === 'child') l.parents = [...new Set(l.rs.map(r => r.from_id))];
  l.best = l.kind === 'child' ? weakestOf(l.parents.map(x => bestOf(l.rs.filter(r => r.from_id === x)))) : bestOf(l.rs);
});
// The parents of a person on the given lines (all of them by default); a possible parent counts
// unless only real parent lines are asked for.
const parentsOf = (id, ls = lines, kinds = ['child', 'possible_parent']) => ls.filter(l => kinds.includes(l.kind) && l.b === id).flatMap(l => l.parents);
// A brother-or-sister line is drawn only while no common parent shows them as siblings already;
// the sibling record itself stays on both cards.
for (let i = lines.length - 1; i >= 0; i--) {
  const l = lines[i];
  if (l.kind === 'sibling' && parentsOf(l.a).some(x => parentsOf(l.b).includes(x))) lines.splice(i, 1);
}
// These lines explain a chain through a possible identity, or a probable kinship of unknown
// degree; they are not new canon relationships. The upper person is always from_id.
for (const h of HYPOTHESES) lines.push({key: 'h:' + h.id, kind: h.kind, a: h.from_id, b: h.to_id, parents: [h.from_id], rs: [], best: {status: 'inference'}, hypothesis: h});
const pairKey = r => lineOfRel.get(r.id) || r.id;
// People the family knows itself (data/site-personal.json). Their family-testimony
// links are drawn green as "known personally"; the status in the database stays family_testimony.
const PERSONAL = new Set(D.personal || []);
const LIVING_EXTRA = new Set(D.living_extra || []);
// Between people the family knows, its own word decides the colour, even where a weaker chart
// reading of the same link also exists; the statuses in the database stay as they are.
const personalLine = l => l.rs.some(r => r.status === 'family_testimony') && (l.kind === 'child' ? [...l.parents, l.b] : [l.a, l.b]).every(id => PERSONAL.has(id));
const lineClass = l => personalLine(l) ? 'lvlp' : 'lvl' + level(l.best.status);

// ---------- «Это я» ----------
// A living reader may say which card is theirs; the choice stays in this browser only. Living, as the build counts
// it: no date of death, and born in 1930 or later or known personally («Знакомы лично»). Recently departed people
// of that list have a date of death and get no button.
const bornYear = p => +(/\b(1[5-9]\d\d|20\d\d)\b/.exec(p?.birth || '') || [])[1] || 0;
const living = id => { id = cid(id); const p = P.get(id); return !!p && inTree.has(id) && !p.death && (bornYear(p) >= 1930 || PERSONAL.has(id) || LIVING_EXTRA.has(id)); };
const ME_KEY = 'familyMe';
let me = null;
try { const id = localStorage.getItem(ME_KEY); if (id && P.has(id) && living(id)) me = cid(id); } catch (_) {}
// Where the tree opens and the logo returns: the reader's own card once they said «Это я», else the root person's.
const home = () => me && shown.has(me) ? me : ROOT;

// ---------- Family branches: the sides of the family, each from one person (usually a grandparent of the root) ----------
// A branch holds its head's ancestors, everyone descended from those ancestors, and the
// husbands and wives who married in; anyone else joins the branch of the relative they hang on.
// The root's own family belongs to every branch. This only arranges the picture; the database has no
// such field. The branches come from data/site.json; their colours, --g-1 … --g-6, follow their order.
const GROUPS = (SITE.branches || []).filter(g => inTree.has(g.head)).map((g, i) => ({...g, title: loc(g.title), c: i % 6 + 1}));
const GROUP = new Map(GROUPS.map(g => [g.id, g]));
// memberOf: every branch a person belongs to by blood or marriage; homeOf: the one branch whose colour they wear
// (an ancestor takes the nearest branch head below them, anyone else the first branch in order).
const memberOf = new Map(), homeOf = new Map(), shownIn = new Map();
{
  const up = new Map(), down = new Map(), side = new Map(), wed = new Map();
  const add = (m, a, b) => { if (!m.has(a)) m.set(a, new Set()); m.get(a).add(b); };
  lines.forEach(l => {
    if (l.kind === 'child' || l.kind === 'possible_parent') {
      l.parents.forEach(p => { add(up, l.b, p); add(down, p, l.b); });
      if (l.parents.length === 2) { add(wed, l.parents[0], l.parents[1]); add(wed, l.parents[1], l.parents[0]); }
    } else if (l.kind === 'spouse') { add(wed, l.a, l.b); add(wed, l.b, l.a); }
    else { add(side, l.a, l.b); add(side, l.b, l.a); }
  });
  const of = (m, x) => [...(m.get(x) || [])];
  GROUPS.forEach(g => {
    g.depth = new Map([[g.head, 0]]);
    for (const q = [g.head]; q.length;) { const x = q.shift(); of(up, x).forEach(p => { if (!g.depth.has(p)) { g.depth.set(p, g.depth.get(x) + 1); q.push(p); } }); }
    g.blood = new Set(g.depth.keys());
    for (const q = [...g.blood]; q.length;) { const x = q.pop(); [...of(down, x), ...of(side, x)].forEach(y => { if (!g.blood.has(y)) { g.blood.add(y); q.push(y); } }); }
  });
  inTree.forEach(x => {
    const bs = GROUPS.filter(g => g.blood.has(x));
    if (!bs.length) return;
    memberOf.set(x, new Set(bs.map(g => g.id)));
    homeOf.set(x, (bs.filter(g => g.depth.has(x)).sort((a, b) => a.depth.get(x) - b.depth.get(x))[0] || bs[0]).id);
  });
  const blood = [...memberOf].map(([x, s]) => [x, [...s]]);
  blood.forEach(([x, gs]) => of(wed, x).forEach(y => {
    if (!inTree.has(y)) return;
    if (!memberOf.has(y)) memberOf.set(y, new Set());
    gs.forEach(g => memberOf.get(y).add(g));
    if (!homeOf.has(y)) homeOf.set(y, homeOf.get(x));
  }));
  for (const q = [...memberOf.keys()]; q.length;) {
    const x = q.shift();
    [...adjacency.get(x), ...of(wed, x)].forEach(y => {
      if (inTree.has(y) && !memberOf.has(y)) { memberOf.set(y, new Set(memberOf.get(x))); homeOf.set(y, homeOf.get(x)); q.push(y); }
    });
  }
  // What a branch shows on its own: its people (by colour), their husbands and wives and their
  // children. The children's own families (grandchildren through a daughter of the branch)
  // fold into a pill under them; a partner known only through those grandchildren would hang loose.
  GROUPS.forEach(g => {
    const home = [...inTree].filter(x => homeOf.get(x) === g.id);
    const kids = home.flatMap(x => of(down, x));
    [...home, ...home.flatMap(x => of(wed, x)), ...kids].forEach(x => {
      if (!inTree.has(x)) return;
      if (!shownIn.has(x)) shownIn.set(x, new Set());
      shownIn.get(x).add(g.id);
    });
  });
}
// The branch picked on the switcher and branches opened from it by a pill on a card; on the whole
// tree («Все»), the branches folded by their name.
let activeGroup = null;
const openGroups = new Set(), hiddenGroups = new Set();
const visibleGroups = () => new Set(activeGroup ? [activeGroup, ...openGroups] : GROUPS.map(g => g.id).filter(id => !hiddenGroups.has(id)));
const allGroupsShown = () => visibleGroups().size === GROUPS.length;
const groupOfToken = t => { try { t = decodeURIComponent(t || ''); } catch (_) {} t = t.toLocaleLowerCase('ru'); return GROUPS.find(g => g.id === t || g.title.toLocaleLowerCase('ru') === t)?.id; };

const W = 200, H = 72, SG = 34;
const pos = new Map();
// Spouses form one block, so couples always stand side by side; dagre then places the
// blocks in generations with as few crossings as it can.
function layout(shown, lines) {
  const spouses = new Map([...shown].map(i => [i, []]));
  const link = (a, b) => { if (!spouses.get(a).includes(b)) { spouses.get(a).push(b); spouses.get(b).push(a); } };
  lines.filter(l => l.kind === 'spouse').forEach(l => link(l.a, l.b));
  // Parents of a common child stand together even when no marriage record exists.
  lines.filter(l => l.kind === 'child' && l.parents.length === 2).forEach(l => link(...l.parents));
  const groupOf = new Map(), groups = [];
  for (const id of shown) {
    if (groupOf.has(id)) continue;
    const comp = [], queue = [id];
    groupOf.set(id, groups.length);
    while (queue.length) { const x = queue.shift(); comp.push(x); for (const y of spouses.get(x)) if (!groupOf.has(y)) { groupOf.set(y, groups.length); queue.push(y); } }
    const order = [], seen = new Set();
    const walk = x => { order.push(x); seen.add(x); spouses.get(x).forEach(y => { if (!seen.has(y)) walk(y); }); };
    walk(comp.find(x => spouses.get(x).length <= 1) || comp[0]);
    groups.push(order);
  }
  const g = new dagre.graphlib.Graph();
  g.setGraph({rankdir: 'TB', nodesep: 44, ranksep: 170, marginx: 0, marginy: 0});
  g.setDefaultEdgeLabel(() => ({}));
  groups.forEach((m, i) => g.setNode('g' + i, {width: m.length * W + (m.length - 1) * SG, height: H}));
  lines.filter(l => l.kind === 'child').forEach(l => {
    const gc = groupOf.get(l.b);
    new Set(l.parents.map(p => groupOf.get(p))).forEach(gp => { if (gp !== gc) g.setEdge('g' + gp, 'g' + gc); });
  });
  // A sibling known only as a sibling stands in the same generation: for layout only it
  // hangs under the other sibling's parents (or a shared invisible point).
  lines.filter(l => l.kind === 'sibling').forEach(l => {
    const ga = groupOf.get(l.a), gb = groupOf.get(l.b);
    const above = [...new Set([l.a, l.b].flatMap(id => parentsOf(id, lines, ['child'])).map(p => 'g' + groupOf.get(p)))];
    if (above.length) above.forEach(gp => [ga, gb].forEach(gx => { if (gp !== 'g' + gx) g.setEdge(gp, 'g' + gx); }));
    else { const d = 'd:' + l.key; g.setNode(d, {width: 1, height: 1}); g.setEdge(d, 'g' + ga); g.setEdge(d, 'g' + gb); }
  });
  // A probable kinship places the older person one generation above, like a parent would.
  lines.filter(l => l.kind === 'possible_kin').forEach(l => { if (groupOf.get(l.a) !== groupOf.get(l.b)) g.setEdge('g' + groupOf.get(l.a), 'g' + groupOf.get(l.b)); });
  dagre.layout(g);
  const centers = reorderRows(g, groups);
  const put = i => {
    const n = g.node('g' + i), left = centers[i] - n.width / 2;
    groups[i].forEach((id, j) => pos.set(id, {x: left + j * (W + SG), y: n.y - H / 2}));
  };
  groups.forEach((_, i) => put(i));
  // A couple stands with each spouse on the side of their own parents, so the two lines don't cross.
  const parentX = id => {
    const xs = parentsOf(id, lines, ['child']).filter(x => pos.has(x)).map(x => pos.get(x).x);
    return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
  };
  groups.map((m, i) => i).sort((a, b) => g.node('g' + a).y - g.node('g' + b).y).forEach(i => {
    const m = groups[i];
    if (m.length < 2) return;
    const first = parentX(m[0]), last = parentX(m[m.length - 1]);
    if (first !== null && last !== null && first > last) { m.reverse(); put(i); }
  });
  const minX = Math.min(...[...pos.values()].map(p => p.x)), minY = Math.min(...[...pos.values()].map(p => p.y));
  pos.forEach(p => { p.x -= minX; p.y -= minY; });
}

// Dagre sometimes interleaves the children of neighbouring families (the children of three
// sisters ended up mixed). Barycenter sweeps reorder the blocks of each row by where their
// parents (going down) or children (going up) stand; the result is kept only when fewer
// parent-child lines cross than in dagre's own layout.
function reorderRows(g, groups) {
  const ids = groups.map((_, i) => 'g' + i);
  const width = i => g.node(ids[i]).width;
  const up = groups.map(() => []), down = groups.map(() => []);
  g.edges().forEach(e => {
    const a = ids.indexOf(e.v), b = ids.indexOf(e.w);
    if (a >= 0 && b >= 0) { up[b].push(a); down[a].push(b); }
  });
  const rows = new Map();
  groups.forEach((_, i) => { const y = g.node(ids[i]).y; if (!rows.has(y)) rows.set(y, []); rows.get(y).push(i); });
  const order = [...rows.keys()].sort((a, b) => a - b).map(y => rows.get(y));
  const dagreX = groups.map((_, i) => g.node(ids[i]).x);
  const crossings = x => {
    let n = 0;
    const edges = [];
    down.forEach((cs, a) => cs.forEach(b => edges.push([x[a], x[b], g.node(ids[a]).y])));
    for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
      const [a1, b1, y1] = edges[i], [a2, b2, y2] = edges[j];
      if (y1 === y2 && (a1 - a2) * (b1 - b2) < 0) n++;
    }
    return n;
  };
  // Place a row in the given order as close to the wanted centres as possible, without overlap.
  const place = (row, want, x) => {
    row.sort((a, b) => want[a] - want[b]);
    let right = -Infinity;
    row.forEach(i => { x[i] = Math.max(want[i], right + 44 + width(i) / 2); right = x[i] + width(i) / 2; });
    const shift = row.reduce((s, i) => s + want[i] - x[i], 0) / row.length;
    row.forEach(i => { x[i] += shift; });
  };
  const mean = (list, x) => list.reduce((s, i) => s + x[i], 0) / list.length;
  const downSweep = x => order.slice(1).forEach(row => place(row, row.map(i => up[i].length ? mean(up[i], x) : x[i]).reduce((w, v, k) => (w[row[k]] = v, w), []), x));
  const upSweep = x => order.slice(0, -1).reverse().forEach(row => place(row, row.map(i => down[i].length ? mean(down[i], x) : x[i]).reduce((w, v, k) => (w[row[k]] = v, w), []), x));
  // Keep the layout with the fewest crossings seen; every candidate ends with a downward pass
  // so children stand under their parents.
  // Sweeps can settle in a local optimum, so they also start from the mirrored dagre order.
  let best = dagreX, bestN = crossings(dagreX);
  const span = Math.max(...dagreX);
  for (const start of [dagreX, dagreX.map(v => span - v)]) {
    const x = start.slice();
    for (let sweep = 0; sweep < 8; sweep++) {
      downSweep(x);
      const n = crossings(x);
      if (n < bestN) { best = x.slice(); bestN = n; }
      upSweep(x);
    }
  }
  // Then neighbouring blocks of a row trade places when that, after re-placing the rows
  // below under their parents, leaves fewer crossings.
  for (let pass = 0; pass < 2; pass++) for (const row of order) {
    const sorted = row.slice().sort((a, b) => best[a] - best[b]);
    for (let k = 0; k + 1 < sorted.length; k++) {
      const [l, r] = [sorted[k], sorted[k + 1]];
      const x = best.slice();
      x[l] = best[r] + (width(r) - width(l)) / 2; x[r] = best[l] - (width(l) - width(r)) / 2;
      place(row, row.reduce((w, i) => (w[i] = x[i], w), []), x);
      downSweep(x);
      const n = crossings(x);
      if (n < bestN) { best = x; bestN = n; sorted[k] = r; sorted[k + 1] = l; }
    }
  }
  // Finally, with the order fixed, blocks slide toward their parents and children, but only
  // into free room: nothing is pushed. Blocks standing shoulder to shoulder move as one group,
  // so a whole family can travel to its relatives instead of stopping at its first neighbour.
  const x = best.slice();
  const gapOf = (a, b) => x[b] - x[a] - (width(a) + width(b)) / 2 - 44;
  const median = v => { const s = v.slice().sort((a, b) => a - b), m = (s.length - 1) / 2; return (s[Math.floor(m)] + s[Math.ceil(m)]) / 2; };
  for (let pass = 0; pass < 16; pass++) for (const row of (pass % 2 ? order.slice().reverse() : order)) {
    const ordered = row.slice().sort((a, b) => x[a] - x[b]);
    const groups2 = [];
    ordered.forEach((i, k) => { if (k && gapOf(ordered[k - 1], i) < .5) groups2[groups2.length - 1].push(i); else groups2.push([i]); });
    groups2.forEach((grp, gi) => {
      const pulls = grp.flatMap(i => [...up[i], ...down[i]].map(j => x[j] - x[i]));
      if (!pulls.length) return;
      const first = grp[0], last = grp[grp.length - 1];
      const prev = gi ? groups2[gi - 1][groups2[gi - 1].length - 1] : null, next = gi < groups2.length - 1 ? groups2[gi + 1][0] : null;
      const lo = prev === null ? -Infinity : -gapOf(prev, first), hi = next === null ? Infinity : gapOf(last, next);
      const d = Math.min(hi, Math.max(lo, median(pulls)));
      grp.forEach(i => { x[i] += d; });
    });
  }
  // A branch hanging on the rest of the tree by a single parent-child line (a mother's whole
  // family, say) moves as one piece toward that line, as far as the free room in every one of
  // its rows allows. Nothing it passes is moved, so the order and the crossings stay the same.
  const rowOf = groups.map((_, i) => g.node(ids[i]).y);
  const sideOf = (from, cutA, cutB) => {
    const seen = new Set([from]);
    for (const queue = [from]; queue.length;) {
      const v = queue.pop();
      for (const w of [...up[v], ...down[v]]) {
        if ((v === cutA && w === cutB) || (v === cutB && w === cutA) || seen.has(w)) continue;
        seen.add(w); queue.push(w);
      }
    }
    return seen;
  };
  for (let pass = 0; pass < 3; pass++) {
    const edges = down.flatMap((cs, a) => cs.map(b => [a, b])).sort((e, f) => Math.abs(x[f[0]] - x[f[1]]) - Math.abs(x[e[0]] - x[e[1]]));
    for (const [a, b] of edges) {
      const span = x[a] - x[b];
      if (Math.abs(span) < 60) continue;
      const sideB = sideOf(b, a, b);
      if (sideB.has(a)) continue;
      const sideA = sideOf(a, a, b);
      // Move the smaller side; the child side moves by +span, the parent side by -span.
      const [part, want] = sideB.size <= sideA.size ? [sideB, span] : [sideA, -span];
      let room = Math.abs(want);
      for (const i of part) for (let j = 0; j < groups.length; j++) {
        if (part.has(j) || rowOf[j] !== rowOf[i]) continue;
        const gap = want < 0 ? x[i] - x[j] : x[j] - x[i];
        if (gap > 0) room = Math.min(room, gap - (width(i) + width(j)) / 2 - 44);
      }
      if (room > 1) part.forEach(i => { x[i] += Math.sign(want) * room; });
    }
  }
  const out = crossings(x) <= bestN ? x : best;
  // Empty vertical stretches (no card in any row) shrink to one ordinary gap; everything to
  // their right moves left together, so no family changes shape.
  const spans = out.map((v, i) => [v - width(i) / 2, v + width(i) / 2]).sort((a, b) => a[0] - b[0]);
  const cuts = [];
  let reach = -Infinity;
  for (const [l, r] of spans) { if (reach > -Infinity && l - reach > 120) cuts.push([reach, l - reach - 120]); reach = Math.max(reach, r); }
  return out.map(v => v - cuts.filter(([at]) => at < v).reduce((s, [, d]) => s + d, 0));
}

// Orthogonal family lines: from the middle of the parents' spouse line (or a single
// parent's card) down to a bar above the children, then down to each child.
// Where a line of one family runs across another family's horizontal line, the horizontal one
// hops over it with a small arc, so a crossing never reads as the two families joining.
// Only straight (H/V) paths are cut; curves stay as they are.
function jumpCrossings(lines) {
  const GAP = 6, family = l => l.kind === 'child' ? 'f:' + l.parents.slice().sort().join('+') : l.key;
  const segs = lines.map(l => {
    if (!l.d || /[^MHV0-9.,\s-]/.test(l.d)) return null;
    const out = [];
    let x = 0, y = 0;
    for (const [, op, args] of l.d.matchAll(/([MHV])\s*([-\d.,]+)/g)) {
      const v = args.split(',').map(Number);
      if (op === 'M') { [x, y] = v; continue; }
      const nx = op === 'H' ? v[0] : x, ny = op === 'V' ? v[0] : y;
      out.push({x1: x, y1: y, x2: nx, y2: ny, h: op === 'H'});
      x = nx; y = ny;
    }
    return out;
  });
  const verticals = lines.flatMap((l, i) => (segs[i] || []).filter(s => !s.h).map(s => ({...s, fam: family(l)})));
  lines.forEach((l, i) => {
    if (!segs[i]) return;
    let hop = false;
    const d = segs[i].map(s => {
      if (!s.h) return `M${s.x1},${s.y1} V${s.y2}`;
      const lo = Math.min(s.x1, s.x2), hi = Math.max(s.x1, s.x2), dir = Math.sign(s.x2 - s.x1);
      const xs = verticals.filter(v => v.fam !== family(l) && v.x1 > lo + GAP && v.x1 < hi - GAP && Math.min(v.y1, v.y2) < s.y1 - 2 && Math.max(v.y1, v.y2) > s.y1 + 2)
        .map(v => v.x1).sort((a, b) => (a - b) * dir).filter((x, k, all) => !k || Math.abs(x - all[k - 1]) > GAP * 2);
      if (!xs.length) return `M${s.x1},${s.y1} H${s.x2}`;
      hop = true;
      // A small half circle over the other line, always bulging upward whichever way the line runs.
      return `M${s.x1},${s.y1} ` + xs.map(x => `H${x - GAP * dir} A${GAP},${GAP} 0 0 ${dir > 0 ? 1 : 0} ${x + GAP * dir},${s.y1}`).join(' ') + ` H${s.x2}`;
    }).join(' ');
    if (hop) l.d = d;
  });
}
function routeLines(lines) {
  const tone = l => lineClass(l).replace('lvlp', 'lvl5');
  const families = new Map();
  lines.filter(l => l.kind === 'child').forEach(l => {
    const key = l.parents.slice().sort().join('+');
    if (!families.has(key)) families.set(key, {parents: l.parents, children: []});
    families.get(key).children.push(l);
  });
  families.forEach(f => {
    const ps = f.parents.map(p => pos.get(p)).sort((a, b) => a.x - b.x);
    f.joint = '';
    if (ps.length === 2 && ps[0].y === ps[1].y && Math.abs(ps[1].x - ps[0].x - W - SG) < 1) {
      f.anchors = [{x: ps[0].x + W + SG / 2, y: ps[0].y + H / 2}];
      // Without a marriage record the two parent lines simply meet between the cards.
      const married = lines.some(l => l.kind === 'spouse' && f.parents.includes(l.a) && f.parents.includes(l.b));
      if (!married) f.joint = `M${ps[0].x + W},${ps[0].y + H / 2} H${ps[1].x} `;
    }
    else f.anchors = ps.map(p => ({x: p.x + W / 2, y: p.y + H}));
    f.top = Math.min(...f.children.map(l => pos.get(l.b).y));
    // Children whose lines differ in colour (a son known personally and one known from the family's
    // word) get one bar per colour, the strongest nearest the children, so the colours never share a stretch.
    f.tones = [...new Set(f.children.map(tone))].sort((a, b) => b.localeCompare(a));
  });
  // A child standing right under the line that comes down from another couple (a father's son known
  // without his mother, under the father and his wife) takes its own line a little to the side of it,
  // toward its own parents, so that couple's line never runs on into the child.
  const trunks = [...families.values()].flatMap(f => f.anchors.map(a => ({...a, f})));
  const dropX = new Map();
  families.forEach(f => f.children.forEach(l => {
    const c = pos.get(l.b), cx = c.x + W / 2;
    if (!trunks.some(t => t.f !== f && Math.round(t.f.top) === Math.round(f.top) && Math.abs(t.x - cx) < 8)) return dropX.set(l, cx);
    const own = f.anchors.reduce((s, a) => s + a.x, 0) / f.anchors.length;
    dropX.set(l, cx + (own < cx ? -16 : 16));
  }));
  // Six bar heights per row, reused in turn; one family's bars stay together and in order. A height
  // already taken by a bar it would run along (another family over the same stretch) is skipped.
  const bars = new Map(), taken = new Map();
  families.forEach(f => {
    const row = Math.round(f.top), k = f.tones.length;
    const n = bars.get(row) || 0; bars.set(row, n + k);
    const xs = [...f.anchors.map(a => a.x), ...f.children.map(l => dropX.get(l))], lo = Math.min(...xs) - 10, hi = Math.max(...xs) + 10;
    if (!taken.has(row)) taken.set(row, []);
    const free = s => taken.get(row).every(b => b.hi < lo || b.lo > hi || b.slot + b.k <= s || s + k <= b.slot);
    const last = Math.max(0, 6 - k), start = Math.min(n % 6, last);
    const tries = [...Array(last + 1).keys()].map(i => (start + i) % (last + 1)).concat([last + 1, last + 2, last + 3]);
    const slot = tries.find(free) ?? start;
    taken.get(row).push({lo, hi, slot, k});
    f.children.forEach(l => {
      const barY = f.top - 34 - (slot + f.tones.indexOf(tone(l))) * 14;
      const c = pos.get(l.b), cx = dropX.get(l);
      if (f.anchors.some(a => a.y >= barY)) {
        const a = f.anchors[0], dy = (c.y - a.y) * .5;
        l.d = `M${a.x},${a.y} C${a.x},${a.y + dy} ${cx},${c.y - dy} ${cx},${c.y}`;
      } else l.d = f.joint + f.anchors.map(a => `M${a.x},${a.y} V${barY} H${cx}`).join(' ') + ` M${cx},${barY} V${c.y}`;
    });
  });
  lines.filter(l => l.kind !== 'child').forEach(l => {
    const a = pos.get(l.a), b = pos.get(l.b);
    if (l.hypothesis) {
      // A possible parent lands beside the real parent lines; a kinship line goes to the card's middle.
      // It leaves its own card a little off the middle, toward the other card, so it never runs down
      // the line to that card's own children.
      const bx = b.x + (l.kind === 'possible_kin' ? W / 2 : W / 4), ax = a.x + W / 2 + (Math.sign(bx - a.x - W / 2) || 1) * 24, y = b.y - 20;
      l.d = `M${ax},${a.y + H} V${y} H${bx} V${b.y}`;
      l.caption = {x: (ax + bx) / 2, y: y - 8};
    } else if (l.kind === 'spouse' && a.y === b.y) {
      const [L, Rr] = a.x < b.x ? [a, b] : [b, a];
      l.d = `M${L.x + W},${L.y + H / 2} H${Rr.x}`;
    } else {
      // A brother or sister line leaves each card a little off its middle, toward the other one, so it
      // never runs down the line from that card's parents.
      const y = Math.min(a.y, b.y) - 18, s = Math.sign(b.x - a.x) || 1;
      l.d = `M${a.x + W / 2 + s * 24},${a.y} V${y} H${b.x + W / 2 - s * 24} V${b.y}`;
    }
  });
}

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
// Saints are marked only where the database records a canonization, with its source.
const canonized = new Map(D.claims.filter(c => c.field === 'canonization').map(c => [c.person_id, c]));
// A round badge on the card's top-right corner, clear of the name.
const CROSS = '<g class="cross" transform="translate(%X,0)" aria-hidden="true"><circle r="15"/><path transform="translate(-5.6,-9) scale(.8)" d="M7 0V22M4 3.5H10M1 8H13M3.5 17L10.5 14"/></g>';
const lineTitle = l => l.hypothesis ? `${l.hypothesis.label}: ${l.hypothesis.title}` : l.kind === 'child' ? `${l.parents.map(nameOf).join(L(' и ', ' and '))} → ${nameOf(l.b)}` : `${nameOf(l.a)} — ${nameOf(l.b)}`;
// Card text: the surname with the maiden name (paler) on the first line, the given name and
// patronymic on the second. The maiden name comes from brackets in the name («Иванова (Петрова)»,
// «(урожд. Петрова)») or from a one-word maiden-name fact. Names that do not split this way
// («Пётр — дьячок, отец…») wrap as before.
// Names may be written in Cyrillic or in Latin letters (a transliteration: «Sokolova (Belova) Zinaida Petrovna»).
const MAIDEN_FACT = new Map(D.claims.filter(c => ['birth_surname', 'maiden_name'].includes(c.field) && /^[А-ЯЁA-Z][а-яёa-z-]+$/.test(c.value.trim())).map(c => [c.person_id, c.value.trim()]));
const isPatronymic = t => /^[А-ЯЁ][а-яё]+(вич|вна|ична|чна|ич)$/.test(t) || /^[A-Z][a-z]+(vich|vna|ichna|chna|ich)$/.test(t);
const isSurname = t => /^[А-ЯЁ][а-яё]+(ов|ова|ев|ева|ёв|ёва|ин|ина|ын|ына|ский|ская|цкий|цкая|ко|ук|юк|ых|их)$/.test(t) || /^[A-Z][a-z]+(ov|ova|ev|eva|in|ina|yn|yna|sky|skiy|skaya|tsky|tskaya|ko|uk|yuk|ykh|ikh)$/.test(t);
function nameParts(id) {
  let name = rawName(id).trim(), maiden = '';
  const extra = [];
  name = name.replace(/\s*\(([^)]*)\)/g, (all, inner) => {
    const t = inner.replace(/^(урожд|née|nee)\.?\s*/, '').trim();
    if ((/^[А-ЯЁ][а-яё]+(ова|ева|ёва|ина|ына|ская|цкая|ая)$/.test(t) || /^[A-Z][a-z]+(ova|eva|ina|yna|skaya|tskaya|aya)$/.test(t)) && !maiden) { maiden = t; return ''; }
    extra.push(all.trim()); return ` ${all.trim()}`;
  }).replace(/\s+/g, ' ').trim();
  const words = name.split(' ').filter(w => !w.startsWith('('));
  if (words.some(w => !/^([А-ЯЁ][а-яё-]+|[A-Z][a-z-]+)$/.test(w))) return null;
  const pi = words.findIndex(isPatronymic);
  let surname = [], given = [];
  if (pi > 0) { given = [words[pi - 1], words[pi]]; surname = [...words.slice(0, pi - 1), ...words.slice(pi + 1)]; }
  else if (words.length === 2) { const si = isSurname(words[0]) ? 0 : isSurname(words[1]) ? 1 : -1; if (si < 0) return null; surname = [words[si]]; given = [words[1 - si]]; }
  else if (words.length === 1) given = words;
  else return null;
  if (surname.length > 1) return null;
  // «Иванова (Петрова)» of an Ivanov father is a married name in brackets: the surname outside
  // is the birth one. The two swap places so the card shows the current surname with the maiden one.
  const stem = t => (t || '').replace(/(ская|цкая)$/, 'ск').replace(/(ский|цкий)$/, 'ск').replace(/а$/, '').replace(/(skaya|tskaya)$/, 'sk').replace(/(sky|skiy|tsky)$/, 'sk').replace(/a$/, '');
  const parentSurnames = parentsOf(id).map(x => nameParts.raw(x)).filter(Boolean);
  if (maiden && surname[0] && parentSurnames.some(t => stem(t) === stem(surname[0])) && !parentSurnames.some(t => stem(t) === stem(maiden))) [surname[0], maiden] = [maiden, surname[0]];
  // Alternative names in brackets stay with the given name: «Иоанн (Иван)», «(Серафим)» — a monastic name.
  const givenText = [...given, ...extra].join(' ');
  if (!maiden && MAIDEN_FACT.has(id) && MAIDEN_FACT.get(id) !== surname[0]) maiden = MAIDEN_FACT.get(id);
  return {surname: surname[0] || '', maiden, given: givenText, plain: given.join(' ')};
}
// A parent's surname as written, without any brackets, for the check above.
nameParts.raw = id => { const w = rawName(id).replace(/\([^)]*\)/g, ' ').trim().split(/\s+/), pi = w.findIndex(isPatronymic); return pi > 0 ? [...w.slice(0, pi - 1), ...w.slice(pi + 1)][0] : w.length === 2 ? w.find(isSurname) : null; };
// The name as people say it, «Иван Петрович Сидоров»; the data keep the surname first.
const sayName = id => { const n = nameParts(id); return n ? [n.plain, n.surname].filter(Boolean).join(' ') + (n.maiden ? ` (${n.maiden})` : '') : rawName(id); };
const firstName = id => (nameParts(id)?.plain || rawName(id)).split(' ')[0];
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
function draw(shown, lines) {
  // Weaker lines first so a shared stretch shows the stronger style on top.
  const order = lines.slice().sort((a, b) => level(a.best.status) - level(b.best.status));
  $('edges').innerHTML = order.map(l => `<path class="hit" data-line="${esc(l.key)}" d="${l.d}"><title>${esc(lineTitle(l))}: ${esc(label(l.best.status))}</title></path><path class="edge ${lineClass(l)}" data-edge="${esc(l.key)}" d="${l.d}"/>`).join('');
  $('edges').innerHTML += order.filter(l => l.hypothesis).map(l => `<text class="hypothesis-label" x="${l.caption.x}" y="${l.caption.y}" text-anchor="middle">${esc(l.hypothesis.caption)}</text>`).join('');
  $('nodes').innerHTML = [...shown].map(id => {
    const p = P.get(id), {x, y} = pos.get(id);
    const age = MERGE_OF.has(id) ? '' : ageText(p);
    const lifeText = (MERGE_OF.has(id) ? (MERGE_OF.get(id).years || life(p)) : life(p)) + (age ? ' · ' + age : '');
    const saint = canonized.has(id), badge = hiddenBadge(id, shown);
    return `<g class="node${id === ROOT ? ' root' : ''}${saint ? ' saint' : ''}" data-person="${esc(id)}" transform="translate(${x},${y})" tabindex="0" role="button" aria-label="${esc(nameOf(id))} ${esc(lifeText)}${saint ? L(', прославлен Церковью', ', glorified by the Church') : ''}">
      <rect class="card" width="${W}" height="${H}" rx="10"/>
      ${cardText(id, lifeText)}
      ${saint ? CROSS.replace('%X', W - 8) : ''}
      ${conflictFlag(id, badge)}${badge}${groupPills(id, shown)}
    </g>`;
  }).join('');
}

// ---------- Kinship path: the shortest chain between two people, each link with its reliability ----------
// Sex is read from the name (patronymic, surname or first name); the database has no such field.
const FEMALE_NAMES = /^(Анна|Мария|Марья|Агния|Ксения|Вера|Ольга|Наталья|Наталия|Татьяна|Ирина|Елизавета|Клавдия|Светлана|Оксана|Алла|Галина|Надежда|Лидия|Любовь|Антонина|Валентина|Евдокия|Александра|Екатерина|Виктория|Анастасия|Елена|Евгения|Нина|Зинаида|Тамара|Людмила|Раиса|Марина|Юлия|Дарья|Софья|Полина|Пелагея|Прасковья|Аграфена|Акулина|Матрёна|Фёкла|Агафья|Варвара|Ульяна|Василиса|Зоя)$/;
function sexOf(id) {
  const words = rawName(id).replace(/\([^)]*\)/g, ' ').split(/[\s—,]+/).filter(Boolean);
  if (P.get(id)?.sex === 'f' || P.get(id)?.sex === 'm') return P.get(id).sex;
  if (words.some(w => /(вна|чна|ична|vna|chna|ichna)$/.test(w))) return 'f';
  if (words.some(w => /(вич|ьич|ич|vich|ich)$/.test(w) && w.length > 4)) return 'm';
  if (words.some(w => FEMALE_NAMES.test(w))) return 'f';
  if (words.some(w => /^[А-ЯЁ][а-яё]+(ова|ева|ёва|ина|ына|ская|цкая)$/.test(w) || /^[A-Z][a-z]+(ova|eva|ina|yna|skaya|tskaya)$/.test(w))) return 'f';
  if (words.some(w => /^[А-ЯЁ][а-яё]+(ов|ев|ёв|ин|ын|ский|цкий)$/.test(w) || /^[A-Z][a-z]+(ov|ev|in|yn|sky|skiy|tsky)$/.test(w))) return 'm';
  return /^([А-ЯЁ][а-яё]+[ая]|[A-Z][a-z]+a)$/.test(words[0] || '') ? 'f' : 'm';
}
// One step of a path: from a person to a relative along one line of the tree.
function kinSteps(id) {
  const out = [];
  lines.forEach(l => {
    if (l.kind === 'child' || l.kind === 'possible_parent') {
      const rec = p => (l.rs.length ? bestOf(l.rs.filter(r => r.from_id === p)) : null) || l.best;
      if (l.b === id) l.parents.forEach(p => out.push({to: p, move: 'U', line: l, rec: rec(p)}));
      else if (l.parents.includes(id)) out.push({to: l.b, move: 'D', line: l, rec: rec(id)});
    } else if (l.a === id || l.b === id) {
      const move = l.kind === 'spouse' ? 'S' : l.kind === 'sibling' ? 'B' : 'K';
      out.push({to: l.a === id ? l.b : l.a, move, line: l, rec: l.best});
    }
  });
  return out;
}
// Fewest steps; among equally short chains, the one whose weakest link is strongest.
// blood: only parents, children, brothers and sisters (and probable kin), no marriages. strict: nor a step up right
// after a step down — down to a child and up to its other parent is a marriage too. So in a strict chain a person is
// reached in two ways at most: by a step down (no way up from there) and otherwise.
function kinPath(from, to, blood = false, strict = blood) {
  from = cid(from); to = cid(to);
  if (from === to) return [];
  const key = (id, move) => strict && move === 'D' ? id + '↓' : id;
  const best = new Map([[from, {id: from, steps: [], len: 0, weak: 6, sum: 0}]]);
  const better = (a, b) => a.len !== b.len ? a.len < b.len : a.weak !== b.weak ? a.weak > b.weak : a.sum > b.sum;
  for (let frontier = [from]; frontier.length;) {
    const next = new Set();
    for (const k of frontier) {
      const cur = best.get(k), down = cur.steps.at(-1)?.move === 'D';
      for (const s of kinSteps(cur.id)) {
        if (blood && s.move === 'S' || strict && down && s.move === 'U') continue;
        const lv = level(s.rec.status);
        const cand = {id: s.to, steps: [...cur.steps, {...s, from: cur.id}], len: cur.len + 1, weak: Math.min(cur.weak, lv), sum: cur.sum + lv};
        const nk = key(s.to, s.move), old = best.get(nk);
        if (!old || (old.len === cand.len && better(cand, old))) { best.set(nk, cand); next.add(nk); }
      }
    }
    const hits = [best.get(to), best.get(key(to, 'D'))].filter(Boolean);
    if (hits.length) return hits.reduce((a, b) => better(b, a) ? b : a).steps;
    frontier = [...next];
  }
  return null;
}
const DEGREE = ['', '', 'двоюродн', 'троюродн', 'четвероюродн', 'пятиюродн', 'шестиюродн', 'семиюродн', 'восьмиюродн'];
const degreeWord = (n, f) => n < 2 ? '' : (DEGREE[n] ? DEGREE[n] + (f ? 'ая ' : 'ый ') : `${n}-юродн${f ? 'ая' : 'ый'} `);
// Who the second person is to the first, for a chain of only parents and children (and siblings).
function kinTerm(steps, target) {
  if (steps.some(s => s.move === 'S' || s.move === 'K')) return '';
  const moves = steps.map(s => s.move === 'B' ? 'UD' : s.move).join('');
  if (!/^U*D*$/.test(moves)) return '';
  const a = (moves.match(/U/g) || []).length, b = moves.length - a, f = sexOf(target) === 'f', pra = n => 'пра'.repeat(Math.max(0, n));
  if (EN) return kinWordEn(a, b, f);
  if (!b) return a === 1 ? (f ? 'мать' : 'отец') : pra(a - 2) + (f ? 'бабушка' : 'дед');
  if (!a) return b === 1 ? (f ? 'дочь' : 'сын') : pra(b - 2) + (f ? 'внучка' : 'внук');
  if (a === b) return a === 1 ? (f ? 'сестра' : 'брат') : degreeWord(a, f) + (f ? 'сестра' : 'брат');
  if (a > b) return a - b === 1 ? degreeWord(b, f) + (f ? 'тётя' : 'дядя') : degreeWord(b + 1, f) + pra(a - b - 2) + (f ? 'бабушка' : 'дед');
  return b - a === 1 ? degreeWord(a, f) + (f ? 'племянница' : 'племянник') : degreeWord(a, f) + pra(b - a - 2) + (f ? 'внучатая племянница' : 'внучатый племянник');
}
// The same in English: a ups and b downs. Parent's sibling is an uncle, grandparent's a great-uncle; cousins
// count from the nearer side and are «removed» by the difference of generations.
const ORDINAL = ['', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];
function kinWordEn(a, b, f) {
  const w = (m, fe) => f ? fe : m, greats = n => 'great-'.repeat(Math.max(0, n));
  if (!b) return a === 1 ? w('father', 'mother') : greats(a - 2) + w('grandfather', 'grandmother');
  if (!a) return b === 1 ? w('son', 'daughter') : greats(b - 2) + w('grandson', 'granddaughter');
  if (a === 1 && b === 1) return w('brother', 'sister');
  if (b === 1) return greats(a - 2) + w('uncle', 'aunt');
  if (a === 1) return greats(b - 2) + w('nephew', 'niece');
  const d = Math.min(a, b) - 1, r = Math.abs(a - b);
  return `${ORDINAL[d] || d + 'th'} cousin${r === 1 ? ' once removed' : r === 2 ? ' twice removed' : r ? ` ${r} times removed` : ''}`;
}

const roleWord = (move, id) => {
  const f = sexOf(id) === 'f';
  return EN ? {U: f ? 'mother' : 'father', D: f ? 'daughter' : 'son', S: f ? 'wife' : 'husband', B: f ? 'sister' : 'brother', K: 'probable relative'}[move]
    : {U: f ? 'мать' : 'отец', D: f ? 'дочь' : 'сын', S: f ? 'жена' : 'муж', B: f ? 'сестра' : 'брат', K: 'вероятный родственник'}[move];
};
const ARROW = {U: '↑', D: '↓', S: '↔', B: '↔', K: '⋯'};
const PATH_VERDICT = EN ? {
  5: 'Every link of the chain is written in documents of the time.',
  4: 'The chain rests on documents; the weakest link is a publication or an index, the original not read.',
  3: 'The chain is as reliable as the family’s word: the weakest link is known only from the family.',
  2: 'Not certain: a link of the chain is probable — there is no direct document for it.',
  1: 'Not certain: one of the links is only on a family chart or in someone else’s tree.',
} : {
  5: 'Каждое звено цепочки записано в документах эпохи.',
  4: 'Цепочка держится на документах; самое слабое звено — публикация или указатель, подлинник не прочитан.',
  3: 'Цепочка надёжна настолько, насколько надёжны слова семьи: самое слабое звено известно только с её слов.',
  2: 'Не факт: в цепочке есть вероятное звено — прямого документа о нём нет.',
  1: 'Не факт: одно из звеньев есть только на семейной схеме или в чужом дереве.',
};
// One marriage in the chain, at its end or its start: «невестка», «зять», «тёща», «свекровь», «жена племянника»,
// «брат мужа». The blood part is named by kinTerm; a marriage in the middle has no word here.
const GEN = {отец: 'отца', мать: 'матери', сын: 'сына', дочь: 'дочери', брат: 'брата', сестра: 'сестры', дед: 'деда', бабушка: 'бабушки', внук: 'внука', внучка: 'внучки', дядя: 'дяди', тётя: 'тёти', племянник: 'племянника', племянница: 'племянницы'};
const genitive = t => t.split(' ').map(w => /ый$/.test(w) ? w.slice(0, -2) + 'ого' : /ая$/.test(w) ? w.slice(0, -2) + 'ой' : w.replace(/^((?:пра)*)(.+)$/, (_, pra, r) => pra + (GEN[r] || r))).join(' ');
function inLawTerm(chain, from, to) {
  // Husband and wife are often joined only by a common child: down to the child and up to its other parent is a marriage.
  const steps = [];
  for (let k = 0; k < chain.length; k++) {
    if (chain[k].move === 'D' && chain[k + 1]?.move === 'U') { steps.push({...chain[k + 1], move: 'S', from: chain[k].from}); k++; } else steps.push(chain[k]);
  }
  const i = steps.findIndex(x => x.move === 'S');
  if (i < 0 || steps.slice(i + 1).some(x => x.move === 'S')) return '';
  const f = sexOf(to) === 'f';
  if (steps.length === 1) return EN ? (f ? 'wife' : 'husband') : f ? 'жена' : 'муж';
  if (i === steps.length - 1) {
    const t = kinTerm(steps.slice(0, i), steps[i].from);
    if (!t) return '';
    if (EN) return {son: f && 'daughter-in-law', brother: f && 'sister-in-law', daughter: !f && 'son-in-law', sister: !f && 'brother-in-law'}[t] || `${t}’s ${f ? 'wife' : 'husband'}`;
    return {сын: f && 'невестка', брат: f && 'невестка', дочь: !f && 'зять', сестра: !f && 'зять'}[t] || (f ? 'жена ' : 'муж ') + genitive(t);
  }
  if (i === 0) {
    const t = kinTerm(steps.slice(1), to), wife = sexOf(from) === 'f';
    if (!t) return '';
    if (EN) return {mother: 'mother-in-law', father: 'father-in-law'}[t] || `${wife ? 'husband' : 'wife'}’s ${t}`;
    return {мать: wife ? 'свекровь' : 'тёща', отец: wife ? 'свёкор' : 'тесть'}[t] || t + (wife ? ' мужа' : ' жены');
  }
  return '';
}
// Down to a child and up to its other parent, drawn as the marriage of the two when one is recorded.
function asMarriages(chain) {
  if (!chain) return null;
  const out = [];
  for (let k = 0; k < chain.length; k++) {
    const s = chain[k], n = chain[k + 1];
    const wed = s.move === 'D' && n?.move === 'U' && kinSteps(s.from).find(x => x.move === 'S' && x.to === n.to);
    if (wed) { out.push({...wed, from: s.from}); k++; } else out.push(s);
  }
  return out;
}
// Who b is to a: the chain «Кем приходится» shows (a blood chain first; a shorter one through a marriage beside it),
// its weakest link and the word for it. The line «Вам: …» on a card reads the same. With no blood chain, the one
// through children and their other parents comes first: it can still be named («жена двоюродного прадеда»).
function kinOf(a, b) {
  const any = kinPath(a, b), steps = kinPath(a, b, true) || asMarriages(kinPath(a, b, true, false)) || any;
  if (!steps) return null;
  return {steps, alt: steps !== any && any && any.length < steps.length ? any : null, weak: Math.min(...steps.map(s => level(s.rec.status))), term: kinTerm(steps, b) || inLawTerm(steps, a, b)};
}
// «Вам: двоюродный дед»; «Вам: вероятно, прадед» when a link of the chain is only probable. Opens the whole chain.
function youLine(id) {
  id = cid(id);
  if (!me || !inTree.has(id)) return '';
  if (id === me) return `<p class="you">${L('Это вы', 'This is you')}</p>`;
  const kin = kinOf(me, id);
  if (!kin) return '';
  const {steps, weak, term} = kin, f = sexOf(id) === 'f', maybe = weak <= 2 ? L('вероятно, ', 'probably ') : '';
  const text = term ? maybe + term : steps.some(s => s.move === 'K') ? L((f ? 'вероятная родственница' : 'вероятный родственник') + ', степень неизвестна', 'probable relative, degree unknown') : EN ? 'relative by marriage' : f ? 'родственница через брак' : 'родственник через брак';
  return `<p class="you">${L('Вам', 'To you')}: <button class="linklike" data-path-to="${esc(me)}~${esc(id)}">${esc(text)}</button></p>`;
}
let pathPick = null;
function pathView(key) {
  const [a, b] = key.split('~').map(cid);
  current = {path: key};
  if (!P.has(a) || !P.has(b)) { body.innerHTML = `<p class="muted">${L('Таких людей в древе нет.', 'There are no such people in the tree.')}</p>`; return; }
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
// For reading, «up to a parent, down to another child» is one step: a brother or sister through the
// common parent, as reliable as the weaker of the two links. The canvas still shows both lines.
function readableSteps(steps) {
  const out = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i], n = steps[i + 1];
    if (s.move === 'U' && n?.move === 'D') {
      const rec = level(n.rec.status) < level(s.rec.status) ? n.rec : s.rec;
      const both = parentsOf(s.from).filter(x => parentsOf(n.to).includes(x));
      out.push({...n, from: s.from, move: 'B', via: both.length ? both : [s.to], rec, pair: [s.line, n.line]}); i++;
    } else out.push(s);
  }
  return out;
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

// ---------- Focus: one person and their ancestors; hidden branches open by a badge ----------
// The canvas shows the main tree only; records not joined to it open from search as cards.
// With a branch picked, the tree keeps only the people of the visible branches.
const basePeople = () => {
  const vg = visibleGroups();
  return new Set(allGroupsShown() ? inTree : [...inTree].filter(id => [...shownIn.get(id)].some(g => vg.has(g))));
};
let shown = basePeople(), focus = null, bounds = {w: 1, h: 1};
function relativesOf(id) {
  const out = new Set();
  lines.forEach(l => {
    if (l.kind === 'child') {
      if (l.b === id) l.parents.forEach(x => out.add(x));
      if (l.parents.includes(id)) out.add(l.b);
    } else if (l.a === id) out.add(l.b); else if (l.b === id) out.add(l.a);
  });
  return [...out];
}
// A quiet ⚑ in the bottom right corner (the top right holds the cross of a saint) for a person with an open
// conflict; a tap opens the card on «Расхождения». It moves left of a focus badge «+N», which takes the corner.
function conflictFlag(id, badge) {
  if (!FLAGGED.has(id)) return '';
  return `<g class="xflag" data-flag="${esc(id)}" transform="translate(${badge ? W - 42 : W - 13},${H - 12})" role="button" aria-label="${L('Записи расходятся — открыть раздел «Расхождения»', 'Records disagree — open «Disagreements»')}"><title>${L('Записи о человеке расходятся', 'Records about this person disagree')}</title><rect x="-13" y="-13" width="26" height="26" rx="6"/><text x="0" y="5" text-anchor="middle">⚑</text></g>`;
}
function hiddenBadge(id, set) {
  if (!focus) return '';
  const n = relativesOf(id).filter(x => !set.has(x)).length;
  return n ? `<g class="expand" data-expand="${esc(id)}" transform="translate(${W - 4},${H - 4})" role="button" aria-label="${L('Показать скрытых родственников', 'Show hidden relatives')}: ${n}"><title>${L('Показать скрытых родственников', 'Show hidden relatives')} (${n})</title><rect x="-22" y="-11" width="40" height="22" rx="11"/><text x="-2" y="4" text-anchor="middle">+${n}</text></g>` : '';
}
// With one branch picked, a card whose parents (or brothers, children) are in a folded branch
// carries a pill with that branch's name just above (or below) it; the pill opens the whole branch.
// Each pill names the folded branch that holds most of the remaining relatives, the first in order on a tie.
function groupPills(id, set) {
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
    return `<g class="group-pill" data-group-open="${esc(g.id)}" style="--pill:var(--g-${g.c}-ink)" transform="translate(${x},${above ? -17 : H + 17})" tabindex="0" role="button" aria-label="${L('Показать ветку', 'Show the branch')} «${esc(g.title)}»: ${L('ещё', 'more')} ${n}">
      <title>${L('Показать ветку', 'Show the branch')} «${esc(g.title)}» (${L('ещё', 'more')} ${n})</title>${above ? '<path d="M0,-12 V-50"/>' : ''}
      <rect x="${-w / 2}" y="-12" width="${w}" height="24" rx="12"/><text y="4" text-anchor="middle">${esc(text)}</text></g>`;
  }).join('');
}
// Branch colours behind the cards: a soft area over each run of neighbouring cards of one branch
// in a generation, so the sides of the family read as regions. A region's name stands over its top.
function groupAreas() {
  const rows = new Map();
  pos.forEach((p, id) => { if (homeOf.has(id)) { if (!rows.has(p.y)) rows.set(p.y, []); rows.get(p.y).push({id, x: p.x, g: homeOf.get(id)}); } });
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
  const areas = runs.map(r => `<rect x="${r.x0 - PX}" y="${r.y - PY}" width="${r.x1 - r.x0 + PX * 2}" height="${H + PY * 2}" rx="22" style="fill:var(--g-${GROUP.get(r.g).c})"/>`).join('');
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
    const tw = measureTitle(g.title), title = `<text class="group-title" y="-10" style="fill:var(--g-${g.c}-ink)">${esc(g.title)}</text>`;
    let name = title, full = tw;
    if (foldable) {
      full = tw + 44;
      name = `<g class="group-fold" data-group-fold="${esc(g.id)}" style="--pill:var(--g-${g.c}-ink)" tabindex="0" role="button" aria-label="${L('Свернуть ветку', 'Fold the branch')} «${esc(g.title)}»"><title>${L('Свернуть ветку', 'Fold the branch')} «${esc(g.title)}»</title>
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
// Lines among the shown people; a child line keeps only the parents that are shown.
function visibleLines(set) {
  return lines.flatMap(l => {
    if (l.kind !== 'child') return set.has(l.a) && set.has(l.b) ? [l] : [];
    if (!set.has(l.b)) return [];
    const parents = l.parents.filter(x => set.has(x));
    if (!parents.length) return [];
    if (parents.length === l.parents.length) return [l];
    const rs = l.rs.filter(r => set.has(r.from_id));
    return [{...l, parents, rs, best: weakestOf(rs)}];
  });
}
function renderTree() {
  const ls = visibleLines(shown);
  pos.clear();
  if (shown.size) layout(shown, ls);
  const xs = [...pos.values()];
  bounds = {w: Math.max(...xs.map(p => p.x + W)), h: Math.max(...xs.map(p => p.y + H))};
  routeLines(ls); jumpCrossings(ls);
  draw(shown, ls);
  // Names go above the lines: a fold button under a line would not take the click.
  [$('group-areas').innerHTML, $('group-names').innerHTML] = groupAreas(); scaleLabels();
  if (current?.p) mark(current.p); else if (current?.l) mark(null, current.l);
  else if (current?.path) { const [a, b] = current.path.split('~'); markPath(kinOf(a, b)?.steps, cid(a)); }
  $('focusbar').hidden = !focus;
  if (focus) $('focus-name').textContent = nameOf(focus);
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
  relativesOf(id).forEach(x => shown.add(x));
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
const pointers = new Map();
// lastUp: the last finger tap anywhere on the canvas, for "double tap, then drag" zoom.
let gesture = null, lastTap = {}, lastUp = {}, tappedOnCanvas = false;
stage.addEventListener('pointerdown', e => {
  stage.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  const target = e.target.closest('[data-flag],[data-expand],[data-group-open],[data-group-fold],[data-person],[data-line]');
  gesture = {moved: false, target, start: {x: e.clientX, y: e.clientY}, view: {...view}, pinch: null};
  // A finger that lands again where it just tapped holds a zoom: drag down to zoom in, up to zoom out.
  if (e.pointerType !== 'mouse' && pointers.size === 1 && Date.now() - lastUp.t < 350 && Math.hypot(e.clientX - lastUp.x, e.clientY - lastUp.y) < 40) {
    const r = stage.getBoundingClientRect();
    gesture.tapZoom = {k: view.k, x: e.clientX - r.left, y: e.clientY - r.top};
  }
  if (pointers.size === 2) {
    const [p1, p2] = [...pointers.values()];
    gesture.pinch = {d: Math.hypot(p1.x - p2.x, p1.y - p2.y), k: view.k};
    gesture.moved = true;
  }
});
stage.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
  const r = stage.getBoundingClientRect();
  if (pointers.size >= 2 && gesture.pinch) {
    const [p1, p2] = [...pointers.values()];
    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
    zoomAt(gesture.pinch.k * d / gesture.pinch.d, (p1.x + p2.x) / 2 - r.left, (p1.y + p2.y) / 2 - r.top);
    return;
  }
  const dx = e.clientX - gesture.start.x, dy = e.clientY - gesture.start.y;
  if (!gesture.moved && Math.hypot(dx, dy) < 6) return;
  gesture.moved = true;
  if (gesture.tapZoom) { const z = gesture.tapZoom; zoomAt(z.k * Math.exp(dy * .008), z.x, z.y); return; }
  stage.classList.add('dragging');
  view.x = gesture.view.x + dx; view.y = gesture.view.y + dy; handMoved = true; apply();
});
function release(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  stage.classList.remove('dragging');
  // Only a still single tap can start the next double tap; the second tap of a pair cannot.
  if (gesture && pointers.size === 0) lastUp = e.pointerType !== 'mouse' && !gesture.moved && !gesture.pinch && !gesture.tapZoom ? {t: Date.now(), x: e.clientX, y: e.clientY} : {};
  if (gesture && !gesture.moved && pointers.size === 0 && gesture.tapZoom && !gesture.target) {
    // A plain double tap on empty space zooms in there, as on maps.
    zoomAt(view.k * 1.6, gesture.tapZoom.x, gesture.tapZoom.y);
  }
  if (gesture && !gesture.moved && pointers.size === 0 && gesture.target) {
    const t = gesture.target, now = Date.now();
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
  }
  if (pointers.size === 0) gesture = null;
  else if (gesture) { const [p] = [...pointers.values()]; gesture.start = p; gesture.view = {...view}; gesture.pinch = null; }
}
stage.addEventListener('pointerup', release);
stage.addEventListener('pointercancel', release);
stage.addEventListener('wheel', e => {
  e.preventDefault();
  const r = stage.getBoundingClientRect();
  if (e.ctrlKey || e.deltaMode === 1 || Math.abs(e.deltaY) >= 40 && !e.deltaX) zoomAt(view.k * Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0025)), e.clientX - r.left, e.clientY - r.top);
  else { view.x -= e.deltaX; view.y -= e.deltaY; handMoved = true; apply(); }
}, {passive: false});
// Safari trackpad pinch.
let gestureK = null;
stage.addEventListener('gesturestart', e => { e.preventDefault(); gestureK = view.k; });
stage.addEventListener('gesturechange', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomAt(gestureK * e.scale, e.clientX - r.left, e.clientY - r.top); });
stage.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const pill = e.target.closest?.('[data-group-open]'), node = e.target.closest?.('[data-person]'), fold = e.target.closest?.('[data-group-fold]');
  if (fold) { e.preventDefault(); foldGroup(fold.dataset.groupFold); }
  else if (pill) { e.preventDefault(); openGroup(pill.dataset.groupOpen, node?.dataset.person); }
  else if (node) { e.preventDefault(); go({p: node.dataset.person}); }
});
const zoomCenter = f => { const r = stageBox(); zoomAt(view.k * f, r.width / 2, r.height / 2); };
$('zoom-in').onclick = () => zoomCenter(1.3);
$('zoom-out').onclick = () => zoomCenter(1 / 1.3);
$('zoom-fit').onclick = fit;

// ---------- Legend ----------
// A link between people the family knows personally is drawn like a document of the time, so the two share a row.
const LEGEND = LEVELS.map(([lv, name, text]) => lv === 5 ? [lv, L('Документ эпохи или знакомы лично', 'Document of the time or known personally'), L('Прочитано в метрике, ревизской сказке, формуляре или семейном документе — или семья знает этих людей сама (в базе — со слов семьи).', 'Read in a parish register, census, service record or family document — or the family knows these people itself (in the database: the family’s word).')] : [lv, name, text]);
$('legend-rows').innerHTML = LEGEND.map(([lv, name, text]) => `<div class="legend-row"><svg viewBox="0 0 46 12"><path class="edge lvl${lv}" d="M3,6 H43"/></svg><div>${esc(name)}<small>${esc(text)}</small></div></div>`).join('')
  + (canonized.size ? `<div class="legend-row"><svg viewBox="0 0 46 22" class="legend-cross"><path d="M23 0V22M20 3.5H26M17 8H29M19.5 17L26.5 14"/></svg><div>${L('Прославлен Церковью', 'Glorified by the Church')}<small>${esc([...canonized.keys()].filter(id => P.has(id)).map(sayName).join('; '))}.</small></div></div>` : '')
  + `<div class="legend-row"><svg viewBox="0 0 46 22" class="legend-flag"><text x="23" y="16" text-anchor="middle">⚑</text></svg><div>${L('Записи расходятся', 'Records disagree')}<small>${L('Значок в углу карточки: о человеке есть противоречие, которое ещё не решено. Нажмите на него — карточка откроется на разделе «Расхождения».', 'The mark in the corner of a card: there is a disagreement about the person that is not settled yet. Click it to open the card at «Disagreements».')}</small></div></div>`;
// «?»: what the site is, its main parts in a word each, then how to read the lines.
$('about-lead').textContent = loc(SITE.about) || '';
// The code of the site (data/site.json source_url), at the foot of «?».
if (SITE.source_url) $('legend').insertAdjacentHTML('beforeend', `<p class="legend-source"><a href="${esc(SITE.source_url)}" target="_blank" rel="noopener">${L('Код сайта на GitHub', 'Source code on GitHub')} ↗</a></p>`);
// …and as a round button in the bottom right corner of the tree.
if (SITE.source_url) $('stage').insertAdjacentHTML('beforeend', `<a class="gh-float" href="${esc(SITE.source_url)}" target="_blank" rel="noopener" title="${L('Код сайта на GitHub', 'Source code on GitHub')}" aria-label="${L('Код сайта на GitHub', 'Source code on GitHub')}"><svg viewBox="0 0 16 16" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>`);
$('brand-text').textContent = $('about-title').textContent = SITE_NAME;
const tap = what => EN ? (touchScreen() ? 'Tap ' : 'Click ') + what[2] : touchScreen() ? `Коснитесь ${what[1]}` : `Нажмите на ${what[0]}`;
$('about-list').innerHTML = (EN ? [
  ['Person’s card', `${tap(['', '', 'a person'])}: life story, timeline, family and documents. A double ${touchScreen() ? 'tap' : 'click'} — only them and their ancestors.`],
  ['Line', `${tap(['', '', 'a line between people'])}: what the link rests on and what contradicts it.`],
  ...GROUPS.length ? [['Branches', `Buttons at the top: ${GROUPS.map(g => g.title).join(', ')} — only that side of the family.`]] : [],
  ['«This is me» and «How related…»', 'Press «This is me» on your own card and the site will say how each person is related to you. «How related…» — the kinship of any two.'],
  ['Tree · Map · Documents', 'The switch at the top (at the bottom on a phone): the family tree, the map of places where they lived, served and studied, and all documents by place and year.'],
  ['«On this day»', 'A quiet line under the tree: what happened to the ancestors today and this month.'],
  ['Print', 'The printer in the corner of the tree prints it on A3, the printer in the head of a card prints the card.'],
  ['«Help fill in»', INBOX ? 'What we do not know. At the foot of every card you can send a photo or a correction.' : 'What we do not know and how to reach us.'],
] : [
  ['Карточка человека', `${tap(['человека', 'человека', 'a person'])}: история жизни, лента событий, семья и документы. Двойное ${touchScreen() ? 'касание' : 'нажатие'} — только он и его предки.`],
  ['Линия', `${tap(['линию между людьми', 'линии между людьми', 'a line between people'])}: на чём держится связь и что ей противоречит.`],
  ...GROUPS.length ? [['Ветки', `Кнопки вверху: ${GROUPS.map(g => g.title).join(', ')} — только эта сторона семьи.`]] : [],
  ['«Это я» и «Кем приходится…»', 'В своей карточке нажмите «Это я» — сайт будет писать, кем вам приходится каждый. «Кем приходится…» — родство любых двоих.'],
  ['Древо · Карта · Документы', 'Переключатель вверху (на телефоне — внизу): схема семьи, карта мест, где жили, служили и учились, и все документы по месту и году.'],
  ['«В этот день»', 'Тихая строка внизу схемы: что было с предками сегодня и в этом месяце.'],
  ['Печать', 'Кнопка с принтером в углу схемы печатает схему на лист A3, значок принтера в шапке карточки — саму карточку.'],
  ['«Помочь дополнить»', INBOX ? 'Чего мы не знаем. Внизу каждой карточки можно прислать фото или уточнение.' : 'Чего мы не знаем и как с нами связаться.'],
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
// A thumbnail cropped to the record box, or the top of the page when there is no box.
function thumb(v, small) {
  const b = v.boxes.mine[0];
  const img = v.mid || v.src;
  if (!b) return `<img src="${esc(img)}" alt="" loading="lazy">`;
  const m = .025, x0 = Math.max(0, b.box[0] - m), y0 = Math.max(0, b.box[1] - m), x1 = Math.min(1, b.box[2] + m), y1 = Math.min(1, b.box[3] + m);
  const rw = x1 - x0, rh = y1 - y0, ratio = Math.min(1.1, Math.max(.18, (rh * v.h) / (rw * v.w)));
  const px = rw < 1 ? x0 / (1 - rw) * 100 : 0, py = rh < 1 ? y0 / (1 - rh) * 100 : 0;
  return `<span class="crop" style="aspect-ratio:1/${ratio.toFixed(3)};background-image:url('${esc(img)}');background-size:${(100 / rw).toFixed(2)}% auto;background-position:${px.toFixed(2)}% ${py.toFixed(2)}%" role="img" aria-label="${esc(b.label || L('Запись на странице', 'Record on the page'))}"></span>`;
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

// Research write-ups (how a book was read, what was checked) come after the documents of the time, as «Разбор».
const isResearch = sid => S.get(sid)?.kind === 'research_note';
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
const redrawPage = () => { if (pageOpen === 'map') requestAnimationFrame(drawMap); };
function openPanel(state) {
  redrawPage();
  panel.dataset.state = state || (narrow() ? (panel.dataset.state === 'full' ? 'full' : 'peek') : 'open');
  document.body.classList.add('panel-open');
  $('hint').hidden = true;
  // An opened card is what the reader looks at now; the legend does not stay over it.
  showLegend(false);
}
function closePanel() {
  if (pageOpen === 'map') { mapFocus = null; if (mapViews[mapViews.length - 1]?.auto) mapViews.pop(); }
  redrawPage();
  panel.dataset.state = 'closed'; document.body.classList.remove('panel-open'); current = null; pathPick = null; clearPath();
  document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
  document.querySelectorAll('.edge.selected').forEach(n => n.classList.remove('selected'));
}
function mark(personId, lineKey) {
  document.querySelectorAll('.node.selected').forEach(n => n.classList.remove('selected'));
  document.querySelectorAll('.edge.selected').forEach(n => n.classList.remove('selected'));
  if (personId) document.querySelector(`[data-person="${CSS.escape(cid(personId))}"]`)?.classList.add('selected');
  if (lineKey) document.querySelector(`[data-edge="${CSS.escape(lineKey)}"]`)?.classList.add('selected');
}
function relationName(r, me) {
  if (r.kind === 'spouse') return L('Супруг(а)', 'Spouse');
  if (r.kind === 'sibling') return L('Брат или сестра', 'Brother or sister');
  return r.to_id === me ? L('Родитель', 'Parent') : L('Ребёнок', 'Child');
}

// What's new: data/changelog.md, one entry per release, newest first. An entry's heading is its id.
// Entries the reader has not seen are open; seen ones show their first line and «Подробнее»; past the five newest
// the rest wait under «Раньше». The dot on the button: the newest entry is not seen yet.
const NEWS = D.changelog || [];
const NEWS_SHOWN = 5;
function seenNews() {
  try {
    const list = localStorage.getItem('seenNewsEntries');
    if (list) return new Set(JSON.parse(list));
    // A reader from before the entries had ids had seen all of them, perhaps except the newest.
    if (localStorage.getItem('seenNews')) return new Set(NEWS.slice(1).map(e => e.date));
  } catch (_) {}
  return null;
}
function markNews(read) {
  if (read) { try { localStorage.setItem('seenNewsEntries', JSON.stringify(NEWS.map(e => e.date))); } catch (_) {} }
  $('news-toggle').classList.toggle('unread', !!NEWS.length && !seenNews()?.has(NEWS[0].date));
}
// Text with references [C…], [R…], [X…], [S:…] as numbered buttons, counted across one view.
function refsIn() {
  let n = 0;
  return text => bold(esc(text)).replace(/\[(C\d+|R\d+|X\d+|S:[A-Za-z0-9._-]+)\]/g, (_, ref) => {
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
    const open = seen ? !seen.has(e.date) : i === 0;
    return `<section class="news${open ? ' open' : ''}" data-news="${esc(e.date)}"><h3>${esc(e.date)}</h3>${e.lead ? `<p class="lead">${refs(e.lead)}</p>` : ''}
      <div class="news-more">${e.groups.map(g => `${g.title ? `<p class="eyebrow">${esc(g.title)}</p>` : ''}<ul>${g.items.map(i => `<li>${refs(i)}</li>`).join('')}</ul>`).join('')}</div>
      ${open ? '' : `<button class="news-open">${L('Подробнее', 'More')}</button>`}</section>`;
  };
  const older = NEWS.slice(NEWS_SHOWN);
  body.innerHTML = `<p class="eyebrow">${L('Журнал изменений', 'Change log')}</p><h2 class="card-title">${L('Что нового', 'What’s new')}</h2>
    <p class="muted">${L('Что добавили и уточнили в древе и документах, по выпускам сайта. Цифры — ссылки на факты.', 'What was added and corrected in the tree and the documents, by release. Numbers link to the facts.')}</p>
    ${NEWS.slice(0, NEWS_SHOWN).map(entry).join('') || `<p class="muted">${L('Пока пусто.', 'Nothing yet.')}</p>`}
    ${older.length ? `<button class="news-older">${L('Раньше', 'Earlier')} · ${older.length}</button><div class="news-older-list" hidden>${older.map((e, i) => entry(e, i + NEWS_SHOWN)).join('')}</div>` : ''}`;
  markNews(true);
}
body.addEventListener('click', e => {
  const more = e.target.closest('.news-open'), older = e.target.closest('.news-older'), ll = e.target.closest('.ll-open');
  const to = e.target.closest('[data-section-to]');
  if (to) toSection(body.querySelector(`[data-section="${to.dataset.sectionTo}"]`));
  if (ll) { ll.previousElementSibling.querySelectorAll('li[hidden]').forEach(x => x.hidden = false); ll.remove(); }
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
  body.innerHTML = `<p class="eyebrow">${L('Помогите заполнить', 'Help fill in')}</p><h2 class="card-title">${L('Что мы ещё не знаем', 'What we do not know yet')}</h2>
    <p class="muted">${L(`Многое о семье знают только сами родные. Помните ответ, рассказ или храните фото — нажмите «Я знаю» и напишите. Сообщение получит ${esc(RECIPIENT)}.`, `Much about a family is known only to the relatives themselves. If you remember an answer or a story, or keep a photo, press «I know» and write. The message goes to ${esc(RECIPIENT)}.`)}</p>
    ${main ? `<h3>${L('Главные вопросы', 'Main questions')}</h3>${main}` : ''}
    ${years ? `<h3>${L('Подскажите годы и имена', 'Tell us years and names')}</h3><p class="muted">${L('Люди в древе, у которых нет ни одной даты или полного имени', 'People in the tree with no date or no full name')}: ${rows.length}.</p>${years}` : ''}
    ${xs ? `<h3>${L('Где расходятся записи', 'Where the records disagree')}</h3><p class="muted">${L('Документы говорят разное — может быть, в семье помнят, как было.', 'The documents say different things — perhaps the family remembers how it was.')}</p>${xs}` : ''}
    <h3>${L('Напишите нам', 'Write to us')}</h3><p>${L('Если что-то знаете — напишите здесь.', 'If you know something, write here.')}</p>${formHtml('free')}`;
  bindForm(body.querySelector('form.send'));
  return L('Помогите заполнить', 'Help fill in');
}

// ---------- The one form for messages to the family ----------
// About whom (filled in), the text, up to five photos or PDFs of 15 MB each, the sender's name (from «Это я», else as
// typed last time). Each file goes on its own as POST <inbox_url>file, then the message as POST <inbox_url>send
// (see bindForm); the server answers JSON {ok, id} or {error}. No server is included: without inbox_url in
// data/site.json the site shows the contact text from the same file instead of the form.
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
  return '';
}
function sendView(ref) {
  current = {send: ref};
  mark(ref.startsWith('p:') ? ref.slice(2) : null);
  const subject = aboutOf(ref);
  body.innerHTML = `<p class="eyebrow">${L('Сообщение семье', 'Message to the family')}</p><h2 class="card-title">${/^[pl]:/.test(ref) ? SEND_TITLE : L('Я знаю', 'I know')}</h2>${formHtml(ref)}`;
  bindForm(body.querySelector('form.send'));
  return subject || L('Сообщение', 'Message');
}
function formHtml(ref) {
  if (!INBOX) return `<p class="contact">${refsIn()(loc(SITE.contact) || L('Напишите составителю древа.', 'Write to the keeper of the tree.'))}</p>`;
  const d = drafts.get(ref) || {};
  return `<form class="send" data-form="${esc(ref)}" novalidate>
    <label>${L('О ком или о чём', 'About whom or what')}<input name="about" value="${esc(d.about ?? aboutOf(ref))}" placeholder="${L('Имя или тема', 'Name or subject')}" maxlength="300"></label>
    <label>${L('Что вы знаете', 'What you know')}<textarea name="text" rows="6" maxlength="20000" placeholder="${L('Годы, имена, места, от кого вы это знаете…', 'Years, names, places, who you know it from…')}">${esc(d.text || '')}</textarea></label>
    <div class="send-files"><label class="file-pick">＋ ${L('Фото или PDF', 'Photo or PDF')}<input type="file" name="files" multiple accept="image/*,application/pdf"></label><small>${L('до 5 файлов, каждый до 15 МБ', 'up to 5 files, 15 MB each')}</small><ul class="file-list"></ul></div>
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
    const bad = picked.filter(f => !/^(image\/|application\/pdf$)/.test(f.type) && !/\.(jpe?g|png|hei[cf]|webp|gif|tiff?|pdf)$/i.test(f.name));
    const big = picked.filter(f => !bad.includes(f) && f.size > MAX_BYTES);
    const ok = picked.filter(f => !bad.includes(f) && !big.includes(f)), room = MAX_FILES - d.files.length;
    d.files.push(...ok.slice(0, Math.max(0, room)));
    showFiles();
    say([bad.length && `${L('Можно присылать только фото и PDF', 'Only photos and PDFs can be sent')}: ${bad.map(f => f.name).join(', ')}.`, big.length && `${L('Больше 15 МБ', 'Over 15 MB')}: ${big.map(f => f.name).join(', ')}.`, ok.length > room && L('Не больше 5 файлов в одном сообщении.', 'No more than 5 files in one message.')].filter(Boolean).join(' '), true);
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

// ---------- Life line: year, event, the facts behind it ----------
// Built from the record's own facts: birth and death as the card's header gives them (date_display), the rest
// from dated facts of the fields below; an undated fact stays out. Several facts of one event (one field, the
// same day, or the same year when neither has a day) make one row with all their references. A date said
// roughly («около», «?», «или», «не позднее», two versions) is marked ≈. Children under 18: no life line.
const LIFE_EVENTS = ['birth', 'baptism', 'education', 'service', 'ordination', 'tonsure', 'marriage', 'award', 'military_event', 'event', 'residence', 'retirement', 'arrest', 'sentence', 'repression', 'rehabilitation', 'death', 'burial', 'canonization'];
const MONTH_NO = {январ: 1, феврал: 2, март: 3, апрел: 4, ма: 5, июн: 6, июл: 7, август: 8, сентябр: 9, октябр: 10, ноябр: 11, декабр: 12,
  januar: 1, februar: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, septem: 9, octob: 10, novem: 11, decem: 12};
const ROMAN_NO = {I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12};
const ROUGH = /около|\bок\.|примерно|приблиз|вероятно|возможно|\?|не позднее|не ранее|\bили\b|верси|не установлен|спорн|\b(about|around|circa|c\.|approximately|probably|possibly|not later|not before|or|version|disputed)\b/i;
const minorChild = p => !p.death && bornYear(p) > new Date().getFullYear() - 18;
// Every date written in a text, as [time, year, has a day]: 1882-07-16, 16.07.1882, 14.IV.1910, «16 июля 1882»
// (also glued, «16июля1882»), «октябрь 1882», a bare year.
function datesIn(text) {
  const out = [], taken = [];
  const add = (m, y, mo, d) => {
    if (taken.some(([a, b]) => m.index < b && a < m.index + m[0].length)) return;
    taken.push([m.index, m.index + m[0].length]);
    if (y >= 1500 && y <= 2100) out.push([Date.UTC(y, (mo || 1) - 1, d || 1), y, !!d]);
  };
  const month = w => { w = w.toLowerCase(); const k = Object.keys(MONTH_NO).sort((a, b) => b.length - a.length).find(k => w.startsWith(k)); return k && MONTH_NO[k]; };
  for (const m of text.matchAll(/(\d{4})-(\d{2})(?:-(\d{2}))?/g)) add(m, +m[1], +m[2], m[3] && +m[3]);
  for (const m of text.matchAll(/(\d{1,2})\.(\d{1,2})\.(\d{4})/g)) add(m, +m[3], +m[2], +m[1]);
  for (const m of text.matchAll(/(\d{1,2})\.([IVX]+)\.(\d{4})/g)) if (ROMAN_NO[m[2]]) add(m, +m[3], ROMAN_NO[m[2]], +m[1]);
  for (const m of text.matchAll(/(?:(\d{1,2})\s*)?([А-Яа-яёA-Za-z]+)\s*(1[5-9]\d\d|20\d\d)/g)) { const mo = month(m[2]); if (mo && (m[1] || /^[а-яёa-z]/i.test(m[2]))) add(m, +m[3], mo, m[1] && +m[1]); }
  // A number is not a year after «№» («грамота № 1732») or before a sum («на 2000 руб.»).
  for (const m of text.matchAll(/(?<!№\s?)(?<!\d)(1[5-9]\d\d|20\d\d)(?!\d)(?!\s*(?:руб|коп))/g)) add(m, +m[1]);
  return out.sort((a, b) => a[0] - b[0]);
}
// Copies of old documents sometimes lose spaces between words and numbers («16июля1882», «обоим22»).
const spaced = t => t.replace(/(\d)(?=[а-яё])/gi, '$1 ').replace(/([а-яё])(?=\d)/gi, '$1 ');
// «1932–1953» as «1932–53» when the century is the same, so the year column stays narrow.
// A span («1882–1913») keeps the first year in the column like any other row; the end is written small under it.
const yearSpan = ys => esc(ys[0]) + (ys.length > 1 ? `<small>–${esc(ys[1])}</small>` : '');
// A long fact (a whole service list) is cut at a word in the line; its reference opens it in full.
const cut = (t, n = 220) => t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n)).replace(/[;,.:\s—–-]+$/, '') + ' …';
const LL_LONG = 12;
function lifeLine(rid) {
  const p = P.get(rid);
  if (!p || minorChild(p)) return [];
  const cs = D.claims.filter(c => c.person_id === rid && LIFE_EVENTS.includes(c.field));
  const rows = [];
  // Birth and death: as the header of the card says them, with every fact behind them.
  for (const kind of ['birth', 'death']) {
    const text = dateValue(p, kind);
    const ds = datesIn(String(p.date_display?.[kind]?.text || p[kind] || ''));
    const own = cs.filter(c => c.field === kind);
    if (!text || !ds.length) continue;
    const place = kind === 'birth' ? D.claims.find(c => c.person_id === rid && ['birth_place', 'birthplace'].includes(c.field)) : null;
    const refs = [...new Set([...(p.date_display?.[kind]?.refs || own.map(c => c.id)), ...(place ? [place.id] : [])])];
    rows.push({field: kind, t: ds[0][0], years: [ds[0][1]], rough: ROUGH.test(text) || new Set(ds.map(d => /ст\. ?ст\./.test(text) ? d[1] : d[0])).size > 1, text: text + (place ? ', ' + place.value : ''), refs});
  }
  const groups = new Map();
  for (const c of cs) {
    if (c.field === 'birth' || c.field === 'death') continue;
    const ds = datesIn(c.value);
    if (!ds.length) continue;
    const first = ds.find(d => d[2]) || ds[0];
    const key = `${c.field}|${first[2] ? first[0] : 'y' + first[1]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({c, ds, first});
  }
  for (const g of groups.values()) {
    // The row speaks with its most reliable fact, the shortest of them; the others are its references too.
    const best = g.slice().sort((a, b) => level(b.c.status) - level(a.c.status) || a.c.value.length - b.c.value.length)[0];
    const years = [...new Set(best.ds.map(d => d[1]))].sort();
    rows.push({field: best.c.field, t: Math.min(best.first[0], best.ds[0][0]), years: [years[0], years[years.length - 1]].filter((y, i, a) => a.indexOf(y) === i), rough: ROUGH.test(best.c.value), text: spaced(fmtDate(best.c.value)), refs: g.map(x => x.c.id)});
  }
  const order = f => f === 'birth' ? -1 : f === 'death' ? 1 : f === 'burial' ? 2 : f === 'canonization' ? 3 : 0;
  return rows.sort((a, b) => order(a.field) > 0 && order(b.field) > 0 ? order(a.field) - order(b.field) || a.t - b.t : a.t - b.t || order(a.field) - order(b.field));
}
function lifeLineHtml(rows) {
  if (rows.length < 2) return '';
  const refButton = ref => { const st = (C.get(ref) || R.get(ref) || X.get(ref))?.status; return `<button class="ref r${st ? level(st) : 2}" data-ref="${esc(ref)}" aria-label="${L('Основание', 'Ground')}: ${esc(ref)}">↗</button>`; };
  // A year repeated by the next event is written once.
  const labels = rows.map(r => (r.rough ? '≈' : '') + yearSpan(r.years));
  // A long line keeps every turn of life (birth, ordination, marriage, award, death…) and the first two steps of
  // study and of service; the other steps wait under «Вся лента».
  const seen = {}, quiet = rows.map(r => rows.length > LL_LONG && ['education', 'service', 'event', 'residence', 'military_event'].includes(r.field) && (seen[r.field] = (seen[r.field] || 0) + 1) > 2);
  const hidden = quiet.filter(Boolean).length;
  return `<h3>${L('Лента жизни', 'Timeline')}</h3><ol class="lifeline">${rows.map((r, i) => `<li class="${r.field === 'birth' || r.field === 'death' ? 'edge-event' : ''}"${quiet[i] ? ' hidden' : ''}>
    <span class="ll-year${r.rough ? ' rough' : ''}"${r.rough ? ` title="${L('Дата неточная', 'The date is not exact')}"` : ''}>${i && labels[i] === labels[i - 1] && quiet[i] === quiet[i - 1] ? '' : labels[i]}</span>
    <div class="ll-what"><span class="field">${esc(field(r.field))}</span>${esc(cut(r.text))} ${r.refs.map(refButton).join('')}</div></li>`).join('')}</ol>
    ${hidden ? `<button class="ll-open">${L('Вся лента: ещё', 'Whole timeline:')} ${hidden} ${plural(hidden, ['событие', 'события', 'событий'], ['more event', 'more events'])} ${L('учёбы и службы', 'of education and service')}</button>` : ''}
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
    return story.text.split(/\n\s*\n/).map(par => `<p>${bold(esc(par.trim())).replace(/\[(C\d+|R\d+|X\d+|S:[A-Za-z0-9._-]+)\]/g, (_, ref) => refButton(ref))}</p>`).join('')
      + (story.written ? `<p class="muted">${L('Рассказ составлен по базе', 'Story written from the database on')} ${esc(fmtDate(story.written))}. ${L('Цифры — ссылки на факты и документы.', 'Numbers link to the facts and documents.')}</p>` : '');
  }
  // Without a story the life line comes first; the facts already in it are not listed twice.
  const all = D.claims.filter(c => c.person_id === p.id), cs = all.filter(c => !used.has(c.id)).sort((a, b) => (year(a.value) || '9999').localeCompare(year(b.value) || '9999'));
  if (!all.length) return `<p class="auto">${L('О жизни пока известны только имя и место в семье.', 'Of this life only the name and the place in the family are known so far.')}</p>`;
  const list = `<ul class="facts">${cs.map(c => `<li><span class="field">${esc(field(c.field))}</span>${esc(fmtDate(c.value))} ${refButton(c.id)}</li>`).join('')}</ul>`;
  if (!lifeHtml) return `<p class="auto">${L('Связный рассказ ещё не написан. Вот что известно, по порядку:', 'No story is written yet. Here is what is known, in order:')}</p>${list}`;
  return `<p class="auto">${L('Связный рассказ ещё не написан.', 'No story is written yet.')}</p>${lifeHtml}${cs.length ? `<h3>${L('Ещё известно', 'Also known')}</h3>${list}` : ''}`;
}

function portraitOf(p) {
  const ids = p.media || [];
  const photo = ids.map(id => S.get(id)).find(s => s?.views && /photo|illustration|portrait/.test(s.kind));
  return photo ? {src: photo, cap: photo.title} : null;
}

function personView(id) {
  id = cid(id);
  const p = P.get(id), m = MERGE_OF.get(id);
  current = {p: id};
  mark(id);
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
    ${canonized.has(id) ? `<p class="saint-plate"><svg viewBox="0 0 14 22" aria-hidden="true"><path d="M7 0V22M4 3.5H10M1 8H13M3.5 17L10.5 14"/></svg><span>${/^прославлен/i.test(canonized.get(id).value) ? '' : L('Прославлен: ', 'Glorified: ')}${esc(canonized.get(id).value)} <button class="ref r${level(canonized.get(id).status)}" data-ref="${esc(canonized.get(id).id)}" aria-label="${L('Источник', 'Source')}">↗</button></span></p>` : ''}
    <div class="card-actions">
    ${living(id) && me !== id ? `<button class="focus-btn me-btn" data-me-set="${esc(id)}"><i aria-hidden="true"></i>${L('Это я', 'This is me')}</button>` : ''}
    ${pageOpen && inTree.has(id) ? `<button class="focus-btn" data-tree-show="${esc(id)}" title="${L('Перейти к схеме: человек будет выбран и в середине экрана', 'Go to the tree: the person is selected and in the middle of the screen')}"><svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M7 3.5h6v3.5H7zM3 13h5v3.5H3zM12 13h5v3.5h-5zM10 7v3M5.5 13v-3h9v3"/></svg>${L('Показать на схеме', 'Show on the tree')}</button>` : ''}
    ${!pageOpen && inTree.has(id) ? `<button class="focus-btn" data-path-from="${esc(id)}" title="${L('Найти, кем приходится другой человек; на компьютере — Shift и нажать на карточку', 'Find how another person is related; on a computer — Shift and click a card')}">⇄ ${L('Кем приходится…', 'How related…')}</button>` : ''}
    ${!pageOpen && shown.has(id) ? (focus === id ? `<button class="focus-btn" data-unfocus>${L('Показать всё древо', 'Show the whole tree')}</button>` : `<button class="focus-btn" data-focus="${esc(id)}" title="${L(`Фокус: на схеме только он и его предки. ${touchScreen() ? 'Двойное касание' : 'Двойной клик'} по карточке делает то же`, `Focus: only them and their ancestors on the tree. A double ${touchScreen() ? 'tap' : 'click'} on the card does the same`)}">◎ ${L('Только предки', 'Ancestors only')}</button>`) : ''}
    </div>
    ${portrait ? `<button class="portrait" data-doc="${esc(portrait.src.id)}" data-citing="media:${esc(id)}" style="background:url('${esc(portrait.src.views[0].mid || portrait.src.views[0].src)}') center/contain no-repeat var(--soft);height:300px" aria-label="${esc(portrait.cap)}"></button><p class="portrait-cap">${esc(portrait.cap)}</p>` : ''}
    ${!inTree.has(id) ? `<p class="flag"><strong>${L('Не соединён с древом', 'Not joined to the tree')}</strong>${L('Родство этой записи с семьёй документами не установлено.', 'No document establishes how this record is related to the family.')}</p>` : ''}
    ${m ? `<div class="merge-plate"><strong>${L(`Одна карточка — ${m.members.length + 1} записи о человеке`, `One card — ${m.members.length + 1} records of the person`)}</strong><p>${esc(m.note)}</p><p class="muted">${L('Записи в базе хранятся раздельно; на схеме они объединены. Основания:', 'The records stay separate in the database; on the tree they are joined. Grounds:')} ${m.refs.map(ref => `<button class="ref r${(C.get(ref) || R.get(ref)) ? level((C.get(ref) || R.get(ref)).status) : 2}" data-ref="${esc(ref)}">${esc(ref)}</button>`).join(' ')}</p></div>` : ''}`;
  // One block per record: its story, note, conflicts, family and documents.
  const block = (rid, i) => {
    const q = P.get(rid);
    const rs = D.relationships.filter(r => r.from_id === rid || r.to_id === rid);
    const conflicts = D.conflicts.filter(x => x.people.includes(rid));
    const docIds = [...new Set([...D.claims.filter(c => c.person_id === rid).flatMap(c => c.source_ids), ...(q.media || [])])].filter(s => S.get(s)?.views);
    const order = {parent: 0, spouse: 1, sibling: 2};
    rs.sort((a, b) => (a.to_id === rid ? -1 : 1) - (b.to_id === rid ? -1 : 1) || order[a.kind] - order[b.kind]);
    const ll = lifeLine(rid), llHtml = lifeLineHtml(ll), hasStory = !!D.stories[rid];
    return `
    ${m ? `<h3 class="record-title">${i ? L('Другая запись', 'Other record') : L('Основная запись', 'Main record')}: ${esc(q.name)}</h3><p class="life">${dates(q)} ${dateRefs(q)}</p>${chip(q.status)}` : `<h3>${L('История жизни', 'Life story')}</h3>`}
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
    + (inTree.has(id) && !minorChild(p) ? `<p class="print-line"><button class="linklike" data-book="p:${esc(id)}">${L('Книжка для печати', 'Book to print')}: ${esc(firstName(id))} ${L('и предки', 'and ancestors')}</button></p>` : '')
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
      n += x.matches('.flag') ? 1 : x.querySelectorAll('.doc, .kin > button, .lifeline > li, .facts > li, :scope > .flag').length;
    return n;
  };
  body.querySelector('.card-actions')?.insertAdjacentHTML('afterend', `<nav class="contents" aria-label="${L('Разделы карточки', 'Sections of the card')}">${hs.map((h, i) => {
    h.dataset.section = i; const n = /История|Life story/.test(h.textContent) ? 0 : count(h);
    return `<button data-section-to="${i}">${esc(h.textContent.replace(/:.*$/, ''))}${n ? ` <small>${n}</small>` : ''}</button>`;
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

// ---------- Pages over the tree: the map of places ----------
// A page covers the tree; cards open over it on the right (on a phone, as the sheet) and close back to it.
let pageOpen = null;
const PAGES = {map: 'map-page', docs: 'docs-page', book: 'book-page', days: 'days-page'};
function setPage(name) {
  name = name === 'map' && D.places?.length || ['docs', 'book', 'days'].includes(name) ? name : null;
  if (name === pageOpen) { if (name === 'book') bookView(); return; }
  pageOpen = name;
  Object.entries(PAGES).forEach(([k, el]) => { $(el).hidden = k !== name; });
  document.body.classList.toggle('page-open', !!name);
  if (name === 'map') { if (!mapFocus) { mapViews.length = 0; mapHand = false; } drawMap(); }
  else mapFocus = null;
  if (name === 'docs') docsView();
  if (name === 'book') bookView();
  if (name === 'days') { daysMonth = null; daysView(); }
  syncModes(); syncTodayLine();
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
  const mode = pageOpen === 'map' || pageOpen === 'docs' ? pageOpen : pageOpen ? '' : 'tree';
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
}
// The header holds the switch on a computer; on a phone the same switch is a bar at the foot, outside the header.
const onMode = e => {
  const b = e.target.closest('[data-mode]'); if (!b) return;
  if (b.dataset.mode === 'tree') { if (pageOpen) { stack.length = 0; go({}); } }
  else if (b.dataset.mode === 'map') { if (pageOpen !== 'map') { mapViews.length = 0; mapFocus = null; mapHand = false; } go({page: 'map'}); }
  else go({page: b.dataset.mode});
};
$('modes').addEventListener('click', onMode);
$('modes-foot').addEventListener('click', onMode);
$('map-close').onclick = () => { stack.length = 0; go({}); };

// Places: coordinates from free sources (data/site-places.json), the facts of the people who were there.
// The map projects x = lon · cos 55°, y = −lat, as the base made by scripts/site_map_base.py.
const PLACES = (D.places || []).map(pl => {
  const cs = pl.claims.map(id => C.get(id)).filter(Boolean);
  return {...pl, cs, people: [...new Set(cs.map(c => cid(c.person_id)))]};
});
const PLACE = new Map(PLACES.map(pl => [pl.id, pl]));
const PLACES_OF = new Map();
PLACES.forEach(pl => pl.people.forEach(id => { if (!PLACES_OF.has(id)) PLACES_OF.set(id, []); PLACES_OF.get(id).push(pl); }));
const MAPK = D.map_base?.projection?.k || Math.cos(55 * Math.PI / 180);
const onMap = pl => pl.kind !== 'far' && typeof pl.lat === 'number';
const proj = pl => [pl.lon * MAPK, -pl.lat];
const mapViews = [];  // the stack of zoomed views, each a list of place ids
let mapView = {k: 1, tx: 0, ty: 0}, mapHand = false;  // the drawn view; mapHand: the reader moved or zoomed it
let mapFocus = null;  // a place to show and mark (from a card)
// The years a fact speaks of, as one span.
// A place of birth without a date in it takes the year of birth.
const yearsOf = cs => { const ys = cs.flatMap(c => { const ds = datesIn(c.value).map(d => d[1]); return ds.length ? ds : /^birth_?place$/.test(c.field) && bornYear(P.get(c.person_id)) ? [bornYear(P.get(c.person_id))] : []; }); return ys.length ? [Math.min(...ys), Math.max(...ys)] : null; };
const span = ys => !ys ? '' : ys[0] === ys[1] ? String(ys[0]) : `${ys[0]}–${ys[1]}`;
const measureLabel = (() => {
  const ctx = document.createElement('canvas').getContext('2d');
  return (t, size, weight) => { ctx.font = `${weight} ${size}px ${getComputedStyle(document.body).fontFamily}`; return ctx.measureText(t).width; };
})();
// A circle of several places is named by the province most of them were in («Тверская губерния»), else by
// its place with the most people: «Тверь и ещё 1».
const province = pl => { const m = /([А-ЯЁ][а-яё-]+)(ской|цкой) губернии/.exec(pl.historic || ''); return m ? `${m[1]}${m[2] === 'ской' ? 'ская' : 'цкая'} губерния` : ''; };
function clusterName(members) {
  const count = new Map();
  members.forEach(m => { const p = province(m); if (p) count.set(p, (count.get(p) || 0) + 1); });
  const [best, n] = [...count].sort((a, b) => b[1] - a[1])[0] || [];
  return drawMap.overview && best && n / members.length >= .6 && members.length > 2 ? best : `${members[0].name.replace(/ \(.*\)$/, '')} ${L('и ещё', 'and')} ${members.length - 1}${L('', ' more')}`;
}
function drawMap() {
  const svg = $('map-svg'), wrap = $('map-wrap');
  const W = wrap.clientWidth, full = wrap.clientHeight;
  if (!W || !full) return;
  svg.setAttribute('viewBox', `0 0 ${W} ${full}`);
  // On a phone the half-open card covers the lower part of the map: the view is fitted to the part above it.
  let Hh = full;
  if (narrow() && document.body.classList.contains('panel-open') && panel.dataset.state === 'peek') {
    const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar')) || 94;
    Hh = Math.max(140, Math.min(full, innerHeight - (innerHeight - bar) * .48 - wrap.getBoundingClientRect().top - 8));
  }
  const all = PLACES.filter(onMap);
  const ids = mapViews[mapViews.length - 1];
  // The box of a view: its places with a margin; a zoomed view at least ~25 km tall, a focused one ~250 km.
  const fitTo = (pls, least) => {
    const xs = pls.map(pl => proj(pl)[0]), ys = pls.map(pl => proj(pl)[1]);
    let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const grow = (a, b, n) => { const m = (a + b) / 2, h = Math.max(b - a, n) / 2; return [m - h, m + h]; };
    [y0, y1] = grow(y0, y1, least); [x0, x1] = grow(x0, x1, least * W / Hh);
    const padX = (x1 - x0) * .12 + 1e-3, padY = (y1 - y0) * .14 + 1e-3;
    x0 -= padX; x1 += padX; y0 -= padY; y1 += padY;
    const k = Math.min(W / (x1 - x0), Hh / (y1 - y0));
    return {k, tx: W / 2 - (x0 + x1) / 2 * k, ty: Hh / 2 - (y0 + y1) / 2 * k};
  };
  const kAll = fitTo(all, 0).k;
  // A view set by the site (the whole map, a circle opened, a card's place) or moved by the reader's hand.
  if (!mapHand) mapView = fitTo(ids ? all.filter(pl => ids.includes(pl.id)) : all, mapFocus && ids?.length === 1 ? 2.2 : ids ? .22 : 0);
  const {k, tx, ty} = mapView;
  mapView.W = W; mapView.H = full;
  // The places on the screen; a view of a circle shows only its places, until the reader moves it.
  let inView = ids && !ids.auto && !mapHand ? all.filter(pl => ids.includes(pl.id)) : all.filter(pl => { const x = proj(pl)[0] * k + tx, y = proj(pl)[1] * k + ty; return x >= 8 && x <= W - 8 && y >= 8 && y <= Hh - 8; });
  const overview = drawMap.overview = k < kAll * 1.8;
  const at = pl => { const [x, y] = proj(pl); return [x * k + tx, y * k + ty]; };
  const base = D.map_base;
  // Rivers by the scale: the big ones far out, the small ones close in.
  const ranks = k > 400 ? 10 : k > 150 ? 9 : k > 60 ? 8 : 6;
  const rivers = (base?.rivers || []).filter(r => r.rank <= ranks).map(r => `<path class="river r${Math.round(r.rank)}" d="${r.d}"/>`).join('');
  // Points close on the screen go into one circle with their number; it opens a closer view of them.
  const R = overview ? 30 : 22, groups = [];
  for (const pl of inView.slice().sort((a, b) => b.people.length - a.people.length || b.cs.length - a.cs.length)) {
    const [x, y] = at(pl);
    // On the whole map the places of one province near each other also go into one circle.
    const g = groups.find(g => Math.hypot(g.x - x, g.y - y) < R) || (overview && province(pl) && groups.find(g => province(g.members[0]) === province(pl) && Math.hypot(g.x - x, g.y - y) < 4 * R));
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
  const scaleAt = [[14, 0, Hh - 30, scaleW + 14, Hh], [W - scaleW - 14, W - scaleW - 14, Hh - 30, W, Hh]].find(([, x0, y0, x1, y1]) => !groupBoxes.some(o => hit(o, [x0, y0, x1, y1])));
  if (scaleAt) taken.push(scaleAt.slice(1));
  const labels = [];
  for (const g of groups) {
    const big = g.members.length > 1, head = g.members[0];
    const text = big ? clusterName(g.members) : head.name.replace(/ \(.*\)$/, '');
    const size = big || head.kind === 'city' ? 13 : 12, w = measureLabel(text, size, 600) + 2, h = size + 3, r = big ? 15 : 8;
    const spots = [[r, -h / 2], [-r - w, -h / 2], [-w / 2, -r - h], [-w / 2, r], [r - 2, -r - h + 4], [-r - w + 2, -r - h + 4], [r - 2, r - 4], [-r - w + 2, r - 4]];
    const spot = spots.map(([dx, dy]) => [g.x + dx, g.y + dy, g.x + dx + w, g.y + dy + h]).find(b => b[0] >= 2 && b[1] >= 2 && b[2] <= W - 2 && b[3] <= Hh - 2 && !taken.some(t => hit(t, b)));
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
    if (x < 8 || y < 8 || x > W - 8 || y > Hh - 8 || ours.has(plain(t.n)) || groups.some(g => Math.hypot(g.x - x, g.y - y) < 16)) continue;
    const w = measureLabel(t.n, 10.5, 400) + 2, h = 13;
    const spot = [[6, -h / 2], [-6 - w, -h / 2], [-w / 2, -5 - h], [-w / 2, 5]].map(([dx, dy]) => [x + dx, y + dy, x + dx + w, y + dy + h])
      .find(b => b[0] >= 2 && b[1] >= 2 && b[2] <= W - 2 && b[3] <= Hh - 2 && !taken.some(o => hit(o, b)));
    if (!spot) continue;
    taken.push(spot, [x - 3, y - 3, x + 3, y + 3]);
    towns.push({t, x, y, box: spot});
  }
  svg.innerHTML = `<defs><radialGradient id="map-zone"><stop offset="0" stop-color="#2f5d47" stop-opacity=".16"/><stop offset=".6" stop-color="#2f5d47" stop-opacity=".07"/><stop offset="1" stop-color="#2f5d47" stop-opacity="0"/></radialGradient></defs><g id="map-all"><g class="map-base" transform="translate(${tx.toFixed(1)},${ty.toFixed(1)}) scale(${k.toFixed(3)})">
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
// again for the new view.
let mapDragged = false;
const mapPointers = new Map();
let mapGesture = null, mapSettle = 0;
const mapMove = () => { const {k, tx, ty} = mapView, g = mapGesture; $('map-svg').classList.add('moving');
  $('map-all')?.setAttribute('transform', `translate(${g.tx - tx * g.k / k},${g.ty - ty * g.k / k}) scale(${g.k / k})`); };
function mapZoomAt(f, cx, cy) {
  const g = mapGesture || {...mapView};
  const k = Math.max(4, Math.min(6000, g.k * f)), r = k / g.k;
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
mapSvg.addEventListener('wheel', e => {
  e.preventDefault();
  const r = mapSvg.getBoundingClientRect();
  if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) mapZoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0022)), e.clientX - r.left, e.clientY - r.top);
  else { const g = mapGesture || {...mapView}; mapGesture = {k: g.k, tx: g.tx - e.deltaX, ty: g.ty - e.deltaY}; mapMove(); }
  clearTimeout(mapSettle); mapSettle = setTimeout(mapCommit, 160);
}, {passive: false});
document.querySelectorAll('[data-map-zoom]').forEach(b => b.onclick = () => {
  const r = mapSvg.getBoundingClientRect();
  mapZoomAt(b.dataset.mapZoom === 'in' ? 1.6 : 1 / 1.6, r.width / 2, r.height / 2); mapCommit();
});
window.addEventListener('resize', () => { if (pageOpen === 'map') drawMap(); });
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
    const seen = drawMap.groups?.find(g => g.members.some(m => m.id === id));
    if (narrow() || !seen || seen.members.length > 1) { mapViews.push(Object.assign([id], {auto: true})); mapHand = false; }
  }
  return pl.name;
}
body.addEventListener('click', e => {
  const b = e.target.closest('[data-map-show],[data-place-link]'); if (!b) return;
  const id = b.dataset.mapShow || b.dataset.placeLink;
  if (b.dataset.mapShow) { mapViews.length = 0; mapViews.push([id]); mapFocus = id; go({page: 'map', pl: id}, true); }
  else go({pl: id});
});
// The places of a person's card, under the life line: «На карте: Кашин · Тверь · Москва».
const placesLine = id => {
  const pls = (PLACES_OF.get(cid(id)) || []).slice().sort((a, b) => (yearsOf(a.cs.filter(c => cid(c.person_id) === cid(id)))?.[0] ?? 9999) - (yearsOf(b.cs.filter(c => cid(c.person_id) === cid(id)))?.[0] ?? 9999));
  return pls.length ? `<p class="places-line"><span>${L('На карте', 'On the map')}:</span> ${pls.map(pl => `<button class="linklike" data-place-link="${esc(pl.id)}">${esc(pl.name.replace(/ \(.*\)$/, ''))}</button>`).join(' · ')}</p>` : '';
};

// ---------- Documents: every cited scan, by place or by year, opened in the viewer with its box ----------
// A document's year: the first year standing alone in its title (not inside a date or a span of years), else the
// latest full date in the title, else the latest year in the facts its record boxes are for (a record is written
// after what it tells); none of them — «Год не указан». Its places: see below. A document cited only about a child
// under 18 is left out.
const minorId = id => { const p = P.get(id); return !!p && minorChild(p); };
const CITING = new Map();
const cites = (sid, rec) => { if (!CITING.has(sid)) CITING.set(sid, []); CITING.get(sid).push(rec); };
D.claims.forEach(c => c.source_ids.forEach(sid => cites(sid, {c})));
D.relationships.forEach(r => (r.source_ids || []).forEach(sid => cites(sid, {r})));
D.conflicts.forEach(x => (x.source_ids || []).forEach(sid => cites(sid, {x})));
const plain = t => t.toLocaleLowerCase('ru').replace(/ё/g, 'е');
let DOCS = null;
function docsData() {
  if (DOCS) return DOCS;
  const placeOfClaim = new Map();
  PLACES.forEach(pl => pl.claims.forEach(id => { if (!placeOfClaim.has(id)) placeOfClaim.set(id, []); placeOfClaim.get(id).push(pl); }));
  DOCS = D.sources.filter(s => s.views?.length && !isResearch(s.id) && !/photo|illustration|portrait/.test(s.kind)).map(s => {
    const recs = CITING.get(s.id) || [];
    const childOnly = recs.length && recs.every(({c, r, x}) => c ? minorId(c.person_id) : r ? minorId(r.from_id) || minorId(r.to_id) : false);
    if (!recs.length || childOnly) return null;
    // The view with the record's box first, and the fact the box is for, so the viewer opens on it.
    const box = (s.boxes || []).find(b => b.for?.length) || (s.boxes || [])[0];
    const boxed = new Set((s.boxes || []).flatMap(b => b.for || []));
    const t = s.title.replace(/\b\d{1,2}\.(\d{1,2}|[IVX]+)\.\d{4}\b/g, ' ').replace(/\b(1[5-9]\d\d|20\d\d)\s*[–-]\s*(1[5-9]\d\d|20\d\d)\b/g, ' ');
    let year = +(/(?<!\d)(1[5-9]\d\d|20\d\d)(?!\d)/.exec(t) || [])[1] || 0;
    if (!year) { const ys = datesIn(s.title).filter(d => d[2]).map(d => d[1]); if (ys.length) year = Math.max(...ys); }
    if (!year) { const ys = recs.flatMap(({c}) => c && boxed.has(c.id) ? datesIn(c.value).map(d => d[1]) : []); year = ys.length ? Math.max(...ys) : 0; }
    // A place named in the title («Кашин 1859», «Ильинское, клировая ведомость») decides; else the places of
    // the facts its boxes are for, else of all the facts citing it.
    const ofClaims = cs => [...new Set(cs.flatMap(c => placeOfClaim.get(c.id) || []))];
    let places = PLACES.filter(pl => (pl.forms || []).some(f => f.length > 3 && new RegExp('(^|[^А-Яа-яЁё])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![А-Яа-яЁё])').test(s.title)));
    if (!places.length) places = ofClaims(recs.filter(({c}) => c && boxed.has(c.id)).map(({c}) => c));
    if (!places.length) places = ofClaims(recs.filter(({c}) => c).map(({c}) => c));
    const citing = box?.for?.find(id => C.has(id) || R.has(id)) || recs.find(({c}) => c)?.c.id || '';
    const people = [...new Set(recs.flatMap(({c, r}) => c ? [cid(c.person_id)] : r ? [cid(r.from_id), cid(r.to_id)] : []))].filter(id => !minorId(id));
    return {s, year, places, citing, people};
  }).filter(Boolean);
  return DOCS;
}
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
  if (b) {
    const m = .025, x0 = Math.max(0, b.box[0] - m), y0 = Math.max(0, b.box[1] - m), x1 = Math.min(1, b.box[2] + m), y1 = Math.min(1, b.box[3] + m);
    const rw = x1 - x0, rh = y1 - y0;
    style = `background-size:${(100 / rw).toFixed(2)}% auto;background-position:${(rw < 1 ? x0 / (1 - rw) * 100 : 0).toFixed(2)}% ${(rh < 1 ? y0 / (1 - rh) * 100 : 0).toFixed(2)}%`;
  }
  const where = [d.places.map(pl => pl.name.replace(/ \(.*\)$/, '')).join(', '), d.year || ''].filter(Boolean).join(' · ');
  return `<button class="doc-tile" data-doc="${esc(d.s.id)}" data-citing="${esc(d.citing)}"><span class="tile-img${b ? ' boxed' : ''}" data-bg="${esc(img)}" style="${style}" role="img" aria-label="${esc(b?.label || d.s.title)}"></span>
    <span class="tile-meta"><strong>${esc(d.s.title)}</strong><small>${esc(where)}</small>${d.people.length ? `<small class="tile-who">${esc(d.people.slice(0, 2).map(sayName).join(', '))}${d.people.length > 2 ? ` ${L('и ещё', 'and')} ${d.people.length - 2}${L('', ' more')}` : ''}</small>` : ''}</span></button>`;
}
function docsView() {
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
  document.querySelectorAll('[data-docs-by]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.docsBy === docsBy)));
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
  const b = e.target.closest('[data-doc]'); if (!b) return;
  // A document under two places is stepped through once, where it first stands.
  const tiles = [...$('docs-body').querySelectorAll('.doc-tile')].filter((t, k, all) => all.findIndex(x => x.dataset.doc === t.dataset.doc) === k);
  openViewer(b.dataset.doc, b.dataset.citing, {items: tiles.map(t => ({sid: t.dataset.doc, citing: t.dataset.citing})), i: tiles.findIndex(t => t.dataset.doc === b.dataset.doc)});
});
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
$('docs-close').onclick = () => { stack.length = 0; go({}); };

// ---------- Print: the tree on an A3 sheet; a booklet of the stories of a branch or of a person ----------
// The tree prints as it is on the screen (a branch, the focus or all of it), fitted to the sheet, without the
// header, the card or the buttons; its lines keep their own thin width. The booklet prints on A4.
let bookScope = 'g:';
const printStyle = document.createElement('style');
document.head.appendChild(printStyle);
let printing = null;
function treeTitle() {
  if (current?.path) { const [a, b] = current.path.split('~'); if (P.has(a) && P.has(b)) return `${L('Кем приходится', 'How related')} ${sayName(cid(a))} — ${sayName(cid(b))}`; }
  return focus ? `${sayName(focus)} ${L('и его предки', 'and their ancestors')}` : activeGroup ? `${L('Ветка', 'Branch')} ${GROUP.get(activeGroup).title}` : L('Всё древо', 'Whole tree');
}
// What a print is of: the card (its «Печать» button), the booklet (its page) or else the tree.
let printWhat = null;
window.addEventListener('beforeprint', () => {
  if (printWhat === 'card' && panel.dataset.state !== 'closed') {
    printStyle.textContent = '@page{size:A4 portrait;margin:16mm 16mm 18mm}'; printing = 'card'; document.body.classList.add('printing-card');
    body.insertAdjacentHTML('afterbegin', `<p class="print-card-head">${esc(SITE_NAME)} · ${L('напечатано', 'printed')} ${esc(new Date().toLocaleDateString(LOCALE))}</p>`);
    return;
  }
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
  document.body.classList.remove('printing-tree', 'printing-book', 'printing-card');
  body.querySelector('.print-card-head')?.remove();
  printWhat = null;
  if (printing && printing !== 'book' && printing !== 'card') { $('tree').removeAttribute('viewBox'); $('tree').removeAttribute('preserveAspectRatio'); apply(); }
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
    const refIn = text => esc(text).replace(/\[(C\d+|R\d+|X\d+|S:[A-Za-z0-9._-]+)\]/g, (_, ref) => { let n = notes.indexOf(ref); if (n < 0) { notes.push(ref); n = notes.length - 1; } return `<sup>${n + 1}</sup>`; });
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
$('book-close').onclick = () => { stack.length = 0; go({}); };
body.addEventListener('click', e => { const b = e.target.closest('[data-book]'); if (b) go({page: 'book', book: b.dataset.book}); });

// ---------- «В этот день»  ----------
// What happened in the family on this day and in this month: births, deaths, marriages, service, awards, the
// kolkhoz's heifer and reprimands — every fact with its day (or its month) of the people who are gone, never of
// the living (the site's rule «living», as for «Это я») or of children. A date before 14.02.1918 is as in the
// document; the documents of that time kept the old style, so it also counts on its new-style day. The Church's
// memory comes from the canonization fact itself («память 22 августа»). Nothing is marked on the tree.
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_NOM = L(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], MONTHS_EN);
const MONTHS_PREP = L(['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'], MONTHS_EN);
const dayText = (m, d) => `${d} ${(EN ? MONTHS_EN : MONTHS_GEN)[m - 1]}`;
const julianShift = y => y < 1700 ? 10 : y < 1800 ? 11 : y < 1900 ? 12 : 13;
const DAY_FIELDS = new Set([...LIFE_EVENTS, 'occupation']);
// A fact of a departed person that names a living person's birthday (a father registering his son's birth) stays
// out: the page says nothing of the living.
// Someone without a date of death born in 1930 or later by any birth fact may be alive: treated as living here,
// even where the card's own date is empty (a death year known from a record).
const birthFrom = p => { const d = datesIn(p.birth || '')[0] || D.claims.filter(c => c.person_id === p.id && c.field === 'birth').map(c => datesIn(c.value)[0]).find(Boolean); return d ? new Date(d[0]) : null; };
const mayLive = id => { const p = P.get(id); if (!p) return false; if (living(id)) return true; const b = birthFrom(p); return !p.death && !!b && b.getUTCFullYear() >= 1930; };
const LIVING_BIRTHDAYS = D.people.filter(p => mayLive(p.id)).flatMap(p => {
  const ds = [p.birth, ...D.claims.filter(c => c.person_id === p.id && c.field === 'birth').map(c => c.value)].flatMap(t => datesIn(t || '').filter(d => d[2]));
  return ds.flatMap(([t]) => { const x = new Date(t), y = x.getUTCFullYear(), m = x.getUTCMonth() + 1, d = x.getUTCDate();
    return [`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`, `${d}.${String(m).padStart(2, '0')}.${y}`, `${d} ${MONTHS_GEN[m - 1]} ${y}`]; });
});
function memoryDays() {
  const out = [], seen = new Set();
  const departed = id => { const p = P.get(id); return !!p && inTree.has(cid(id)) && !mayLive(id) && !minorChild(p); };
  const add = e => { const k = `${e.id}|${e.field}|${e.y}-${e.m}-${e.d}`; if (seen.has(k)) return; seen.add(k); out.push(e); };
  for (const p of D.people) {
    const id = cid(p.id);
    if (id !== p.id || !departed(id)) continue;
    for (const kind of ['birth', 'death']) {
      const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(p[kind] || '');
      if (m) add({id, field: kind, y: +m[1], m: +m[2], d: +(m[3] || 0), text: '', refs: p.date_display?.[kind]?.refs || D.claims.filter(c => c.person_id === p.id && c.field === kind).map(c => c.id)});
    }
  }
  for (const c of D.claims) {
    const id = cid(c.person_id);
    if (!DAY_FIELDS.has(c.field) || c.field === 'birth' || c.field === 'death' || !departed(c.person_id) || LIVING_BIRTHDAYS.some(t => c.value.includes(t))) continue;
    if (c.field === 'canonization') {
      const m = /память\s+(\d{1,2})\s+([а-яё]+)(\s+нового стиля)?/i.exec(c.value);
      const mo = m && MONTHS_GEN.indexOf(m[2].toLowerCase()) + 1;
      if (mo) add({id, field: 'church', y: 0, m: mo, d: +m[1], newStyle: !!m[3], text: c.value, refs: [c.id], status: c.status});
    }
    // Each date in the fact, by the day or the month («в сентябре 1883»); a bare year says nothing of a day.
    const ds = datesIn(c.value).filter(d => d[2] || /([а-яё]+)\s*(1[5-9]\d\d|20\d\d)/i.test(c.value));
    for (const [t, y, hasDay] of ds) {
      const dt = new Date(t), mo = dt.getUTCMonth() + 1, d = hasDay ? dt.getUTCDate() : 0;
      if (!hasDay && !new RegExp(`(${MONTHS_GEN.join('|')}|${MONTHS_NOM.join('|')}|${MONTHS_PREP.join('|')})\\s*${y}`, 'i').test(c.value)) continue;
      add({id, field: c.field, y, m: mo, d, text: c.value, refs: [c.id], status: c.status});
    }
  }
  out.forEach(e => {
    const old = e.y && e.d && Date.UTC(e.y, e.m - 1, e.d) < SHIFT_END;
    if (old) { const ns = new Date(Date.UTC(e.y, e.m - 1, e.d) + julianShift(e.y) * DAY); e.ns = {m: ns.getUTCMonth() + 1, d: ns.getUTCDate()}; }
  });
  return out;
}
const MEMORY = memoryDays();
const daysOf = e => [[e.m, e.d], ...(e.ns ? [[e.ns.m, e.ns.d]] : [])];
const EVENT_WORD = EN ? {birth: 'Born', death: 'Died', marriage: 'Marriage', ordination: 'Ordination', tonsure: 'Tonsure', award: 'Award', education: 'Education', service: 'Service', event: 'Event', military_event: 'At the front', arrest: 'Arrest', sentence: 'Sentence', rehabilitation: 'Rehabilitation', repression: 'Repression', retirement: 'Retirement', baptism: 'Baptism', burial: 'Burial', residence: 'Where they lived', occupation: 'Occupation', family: 'Family', mention: 'Mention'} : {birth: 'Родился', death: 'Умер', marriage: 'Брак', ordination: 'Рукоположение', tonsure: 'Постриг', award: 'Награда', education: 'Учёба', service: 'Служба', event: 'Событие', military_event: 'На фронте', arrest: 'Арест', sentence: 'Приговор', rehabilitation: 'Реабилитация', repression: 'Репрессии', retirement: 'Увольнение за штат', baptism: 'Крещение', burial: 'Погребение', residence: 'Где жил', occupation: 'Занятие', family: 'Семья', mention: 'Упоминание'};
const femaleOf = id => sexOf(id) === 'f';
// A fact with many dates (a watchman's years in the minutes) shows the clause of this date, not its beginning.
function clauseOf(e) {
  const parts = e.text.split(/;\s+/);
  if (parts.length < 2 || !e.d) return e.text;
  const dd = String(e.d), mm = String(e.m).padStart(2, '0');
  const marks = [`${dd.padStart(2, '0')}.${mm}.${e.y}`, `${dd}.${mm}.${e.y}`, `${e.y}-${mm}-${dd.padStart(2, '0')}`, `${dd} ${MONTHS_GEN[e.m - 1]} ${e.y}`, `${dd} ${MONTHS_GEN[e.m - 1]}`];
  const hit = parts.find(t => marks.some(m => t.includes(m)));
  return hit && hit !== parts[0] ? '… ' + hit : e.text;
}
function memoryItem(e, year) {
  const ref = id => { const st = (C.get(id) || X.get(id))?.status; return `<button class="ref r${st ? level(st) : 2}" data-ref="${esc(id)}" aria-label="${L('Основание', 'Ground')}">↗</button>`; };
  const who = `<button class="linklike" data-person-link="${esc(e.id)}">${esc(sayName(e.id))}</button>`;
  if (e.field === 'church') return `<li class="mem church"><span class="mem-day">${dayText(e.m, e.d)}</span><span class="mem-what"><em>${L('Церковная память', 'Church commemoration')}</em> ${who}${/праведн/i.test(e.text) ? L(', праведный', ', righteous') : /священномученик/i.test(e.text) ? L(', священномученик', ', hieromartyr') : ''}${e.newStyle ? L(' (по новому стилю)', ' (new style)') : ''} ${e.refs.map(ref).join('')}</span></li>`;
  const when = `${e.d ? dayText(e.m, e.d) + ' ' : MONTHS_NOM[e.m - 1].toLowerCase() + ' '}${e.y}`;
  const word = e.field === 'birth' ? (EN ? 'Born' : femaleOf(e.id) ? 'Родилась' : 'Родился') : e.field === 'death' ? (EN ? 'Died' : femaleOf(e.id) ? 'Умерла' : 'Умер') : EVENT_WORD[e.field] || field(e.field);
  const ago = year - e.y;
  return `<li class="mem${e.field === 'birth' || e.field === 'death' ? ' life' : ''}"><span class="mem-day">${esc(when)}<small>${ago > 0 ? `${ago} ${yearsWord(ago)} ${L('назад', 'ago')}` : ''}</small></span>
    <span class="mem-what"><em>${esc(word)}</em> ${who}${e.text ? `: ${esc(cut(spaced(fmtDate(clauseOf(e))), 220))}` : ''}${e.ns ? ` <small class="muted">(${L('дата по старому стилю; по новому', 'old style date; new style')} — ${dayText(e.ns.m, e.ns.d)})</small>` : ''} ${e.refs.map(ref).join('')}</span></li>`;
}
const memoryOn = date => MEMORY.filter(e => daysOf(e).some(([mm, dd]) => dd && mm === date.getMonth() + 1 && dd === date.getDate()));
// The month's list goes by the date as written; the new-style day counts only for «Сегодня».
const memoryIn = m => MEMORY.filter(e => e.m === m);
let daysMonth = null;
function daysView() {
  const today = new Date(), year = today.getFullYear(), tm = today.getMonth() + 1;
  const month = daysMonth || tm;
  const now = memoryOn(today);
  const byDay = (a, b) => (a.d || 99) - (b.d || 99) || a.y - b.y;
  const inMonth = memoryIn(month).filter(e => !(month === tm && now.includes(e))).sort(byDay);
  $('days-body').innerHTML = `<div class="days">
    <p class="muted">${L('Что было в этот день и в этот месяц с родными, которых уже нет: рождения, браки, служба, награды, события, смерти — по фактам базы. О живых здесь ничего нет.', 'What happened on this day and in this month to relatives who are gone: births, marriages, service, awards, events, deaths — from the facts of the database. Nothing about the living.')}</p>
    <h3>${L('Сегодня в истории семьи', 'Today in the family’s history')} <small>${dayText(tm, today.getDate())}</small></h3>
    ${now.length ? `<ul class="mem-list">${now.sort((a, b) => a.y - b.y).map(e => memoryItem(e, year)).join('')}</ul>` : `<p class="muted">${L('Сегодня ничего не записано — посмотрите, что было в этом месяце.', 'Nothing is recorded for today — see what happened this month.')}</p>`}
    <div class="days-month"><button data-month="${month === 1 ? 12 : month - 1}" aria-label="${L('Предыдущий месяц', 'Previous month')}">‹ ${MONTHS_NOM[(month + 10) % 12]}</button><h3>${month === tm ? L('В этом месяце', 'This month') : L('В ', 'In ') + MONTHS_PREP[month - 1]} <small>${EN ? MONTHS_NOM[month - 1] : MONTHS_NOM[month - 1].toLowerCase()} · ${inMonth.length}</small></h3><button data-month="${month === 12 ? 1 : month + 1}" aria-label="${L('Следующий месяц', 'Next month')}">${MONTHS_NOM[month % 12]} ›</button></div>
    ${inMonth.length ? `<ul class="mem-list">${inMonth.map(e => memoryItem(e, year)).join('')}</ul>` : `<p class="muted">${L('В этом месяце ничего не записано.', 'Nothing is recorded for this month.')}</p>`}
  </div>`;
}
$('days-body').addEventListener('click', e => {
  const mb = e.target.closest('[data-month]'); if (mb) { daysMonth = +mb.dataset.month; daysView(); return; }
  const t = e.target.closest('[data-person-link],[data-ref]'); if (!t) return;
  if (t.dataset.personLink) go({p: t.dataset.personLink}); else go({f: t.dataset.ref});
});
$('days-close').onclick = () => { stack.length = 0; daysMonth = null; go({}); };
// At the foot of the tree, quietly, when something is written: today's first entry, else how much this month holds.
function syncTodayLine() {
  const line = $('today-line'), today = new Date(), now = memoryOn(today).sort((a, b) => a.y - b.y);
  const month = memoryIn(today.getMonth() + 1).length;
  line.hidden = !!pageOpen || (!now.length && !month);
  if (line.hidden) return;
  const e = now[0];
  const word = e && (e.field === 'birth' ? (EN ? 'born' : femaleOf(e.id) ? 'родилась' : 'родился') : e.field === 'death' ? (EN ? 'died' : femaleOf(e.id) ? 'умерла' : 'умер') : '');
  const what = !e ? '' : e.field === 'church' ? `${L('церковная память', 'church commemoration')} — ${sayName(e.id)}` : word ? (EN ? `${e.y} — ${sayName(e.id)} ${word}` : `${e.y} — ${word} ${sayName(e.id)}`) : `${e.y} — ${sayName(e.id)}: ${cut(spaced(fmtDate(clauseOf(e))).replace(/^…\s*/, ''), 70)}`;
  const n = now.length ? 0 : month, words = plural(n, ['запись', 'записи', 'записей'], ['record', 'records']);
  line.innerHTML = e ? `<span>${L('Сегодня в истории семьи', 'Today in the family’s history')}:</span> ${esc(what)}${now.length > 1 ? ` <small>${L('и ещё', 'and')} ${now.length - 1}${L('', ' more')}</small>` : ''} →`
    : `<span>${L('В', 'In')} ${MONTHS_PREP[today.getMonth()]} ${L('в истории семьи', 'in the family’s history')} —</span> ${month} ${words} →`;
}
$('today-line').onclick = () => go({page: 'days'});
syncTodayLine();

// ---------- Navigation: hash routes so the back button closes and returns ----------
const stack = [];
function go(route, replace) {
  // An open page (the map) stays behind the cards opened from it; page: null leaves it.
  if (route.page === undefined && pageOpen && (route.p || route.l || route.f || route.pl)) route = {...route, page: pageOpen};
  if (!route.page && 'page' in route) { route = {...route}; delete route.page; }
  const hash = hashOf(route);
  if (replace) history.replaceState(route, '', hash); else history.pushState(route, '', hash);
  render(route, !replace);
}
// The link carries the picked branch, the open card and, if on, the focus person:
// #sokolovy&p=ivan, #p=ivan&focus=ivan
function hashOf(route) {
  const parts = activeGroup ? [activeGroup] : [];
  if (route.page === 'book') parts.push(`book=${encodeURIComponent(route.book || 'g:')}`);
  else if (route.page) parts.push(route.page);
  if (route.news) parts.push('news');
  else if (route.help) parts.push('help');
  else if (route.send) parts.push(`send=${encodeURIComponent(route.send)}`);
  else for (const k of ['p', 'l', 'f', 'path', 'pl']) if (route[k]) { parts.push(`${k}=${encodeURIComponent(route[k])}`); break; }
  if (focus) parts.push(`focus=${encodeURIComponent(focus)}`);
  return '#' + parts.join('&');
}
function syncHash() { history.replaceState(history.state, '', hashOf(history.state || {})); }
function parseHash() {
  const out = {};
  location.hash.replace(/^#/, '').split('&').forEach(part => {
    const [k, v] = part.split('=');
    if (v && ['p', 'l', 'f', 'focus', 'path', 'send', 'pl'].includes(k)) out[k] = decodeURIComponent(v);
    if (k === 'news') out.news = 1;
    if (k === 'map' || k === 'docs' || k === 'days') out.page = k;
    if (k === 'book') { out.page = 'book'; out.book = v ? decodeURIComponent(v) : 'g:'; }
    if (k === 'help') out.help = 1;
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
  if (route.page === 'book') bookScope = route.book || 'g:';
  setPage(route.page);
  if (!route.p && !route.l && !route.f && !route.news && !route.path && !route.help && !route.send && !route.pl) { closePanel(); return; }
  if (!route.path) clearPath();
  if (push && current) stack.push(current);
  // Going to someone outside the focus adds them to it; the focus itself stays on.
  // A shared link opens the card as is, even if that person is not on the focused tree.
  if (push && focus && route.p && inTree.has(cid(route.p)) && !shown.has(cid(route.p))) { shown.add(cid(route.p)); renderTree(); }
  // Going to someone in a folded branch opens that branch.
  if (!focus && route.p && inTree.has(cid(route.p)) && !shown.has(cid(route.p))) {
    const g = homeOf.get(cid(route.p));
    if (activeGroup) openGroups.add(g); else hiddenGroups.delete(g);
    shown = basePeople(); renderTree(); syncGroups();
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
  $('back').hidden = history.state == null || stack.length === 0;
  // «Печать» only where there is something to print: not on the form, «Помочь дополнить» and «Что нового».
  $('print-card').hidden = !!(route.send || route.help || route.news);
  openPanel();
  panel.scrollTop = 0;
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
$('close').onclick = () => { stack.length = 0; go(pageOpen ? {page: pageOpen} : {}, false); };
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
  else if (t.dataset.doc) openViewer(t.dataset.doc, t.dataset.citing);
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

// ---------- Search ----------
// Case and «ё»/«е» do not matter. Each word of the query matches the start of a word in the text; a longer
// word also matches with another ending, so «Углич» finds «в Угличе». Besides the name, dates and note, a person
// is found by the place and year of their life facts («Углич 1937»); research leads are left out.
const searchWords = t => String(t || '').toLocaleLowerCase('ru').replace(/ё/g, 'е').split(/[^0-9a-zа-я]+/).filter(Boolean);
const searchStem = w => w.length > 3 && w.endsWith('ь') ? w.slice(0, -1) : w.length > 5 && /[аеиоуыэюяй]$/.test(w) ? w.slice(0, -1) : w;
const LIFE_FACTS = new Set(['birth', 'birth_place', 'birthplace', 'baptism', 'marriage', 'residence', 'origin', 'occupation', 'service', 'education', 'event', 'death', 'burial']);
const factsOf = new Map();
D.claims.filter(c => LIFE_FACTS.has(c.field)).forEach(c => factsOf.set(c.person_id, (factsOf.get(c.person_id) || '') + ' ' + c.value));
const searchIndex = D.people.map(p => {
  const name = ' ' + searchWords(p.name + ' ' + dateValue(p, 'birth') + ' ' + dateValue(p, 'death')).join(' ');
  return {id: p.id, name, all: name + ' ' + searchWords((p.note || '') + ' ' + (factsOf.get(p.id) || '')).join(' ')};
});
let hits = [], active = -1;
function showResults() {
  const words = searchWords($('search').value), q = words.map(searchStem);
  document.querySelectorAll('.node.match').forEach(n => n.classList.remove('match'));
  if (!q.length) { $('results').hidden = true; return; }
  // People whose name and dates hold the words as typed come first («Иванова» before the Ivanov men),
  // then those found with other endings, then those found by a note or a fact.
  const found = (ws, text) => ws.every(w => text.includes(' ' + w));
  const order = [...searchIndex.filter(x => found(words, x.name)), ...searchIndex.filter(x => found(q, x.name)), ...searchIndex.filter(x => found(q, x.all))];
  hits = [...new Set(order.map(x => cid(x.id)))].map(id => P.get(id)).slice(0, 30);
  active = -1;
  hits.forEach(p => document.querySelector(`[data-person="${CSS.escape(p.id)}"]`)?.classList.add('match'));
  $('results').innerHTML = hits.length ? hits.map((p, i) => `<button role="option" data-hit="${i}" aria-selected="false">${esc(nameOf(p.id))}<small>${esc((MERGE_OF.get(p.id)?.years || life(p)) || L('даты неизвестны', 'dates unknown'))}${inTree.has(p.id) ? '' : L(' · вне древа', ' · outside the tree')}</small></button>`).join('') : `<div class="empty">${L('Никого не нашлось', 'Nobody found')}</div>`;
  $('results').hidden = false;
}
function choose(i) {
  const p = hits[i]; if (!p) return;
  $('results').hidden = true; $('search').blur();
  if (pathPick && cid(p.id) !== pathPick) pickSecond(p.id); else go({p: p.id, page: null});
}
$('search').addEventListener('input', showResults);
$('search').addEventListener('focus', showResults);
$('search').addEventListener('keydown', e => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); active = Math.max(0, Math.min(hits.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
    $('results').querySelectorAll('[data-hit]').forEach((b, i) => b.setAttribute('aria-selected', String(i === active)));
  }
  if (e.key === 'Enter') choose(active < 0 ? 0 : active);
  if (e.key === 'Escape') { $('search').value = ''; showResults(); }
});
$('results').addEventListener('click', e => { const b = e.target.closest('[data-hit]'); if (b) choose(+b.dataset.hit); });
document.addEventListener('pointerdown', e => { if (!e.target.closest('.search')) $('results').hidden = true; });

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
// From «Документы» the viewer also steps to the previous and the next document of the page (the side arrows,
// ← → past the first or the last page), in the order of the page; the history keeps one entry for the viewer.
function openViewer(sid, citing, list) {
  const src = S.get(sid); if (!src) return;
  if (!viewerLoad(sid, citing, list)) { if (src.url) window.open(src.url, '_blank', 'noopener'); return; }
  $('viewer').hidden = false;
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
  $('viewer').hidden = true; viewerState = null; $('viewer-sheet').innerHTML = '';
  // Closing by × or Escape removes the viewer's history entry without re-rendering the card.
  if (!fromHistory && history.state?.viewer) { skipPop = true; history.back(); }
}
$('viewer-close').onclick = () => closeViewer();
$('viewer-prev').onclick = () => showPage(viewerState.i - 1);
$('viewer-next').onclick = () => showPage(viewerState.i + 1);
document.addEventListener('keydown', e => {
  // Escape closes the question «Забыть…?»; in the form it only leaves the field, so nothing typed is lost.
  if (e.key === 'Escape' && !$('me-ask').hidden) { $('me-ask').hidden = true; $('me-forget')?.focus(); return; }
  if (e.key === 'Escape' && e.target.closest?.('form.send')) { e.target.blur(); return; }
  // Escape closes the document first, then the legend, then the card.
  if ($('viewer').hidden) {
    if (e.key === 'Escape' && !$('legend').hidden) showLegend(false);
    else if (e.key === 'Escape' && panel.dataset.state !== 'closed') $('close').click();
    else if (e.key === 'Escape' && !$('book-scope-list').hidden) showScopes(false);
    else if (e.key === 'Escape' && pageOpen) go({});
    return;
  }
  if (e.key === 'Escape') closeViewer();
  // ← → turn the pages, and past the first or the last page — the documents of «Документы».
  if (e.key === 'ArrowLeft') { if (!$('viewer-prev').disabled && !$('viewer-prev').hidden) showPage(viewerState.i - 1); else docStep(-1); }
  if (e.key === 'ArrowRight') { if (!$('viewer-next').disabled && !$('viewer-next').hidden) showPage(viewerState.i + 1); else docStep(1); }
});
const vp = new Map();
let vg = null;
const vstage = $('viewer-stage');
vstage.addEventListener('pointerdown', e => {
  vstage.setPointerCapture(e.pointerId); vp.set(e.pointerId, {x: e.clientX, y: e.clientY});
  vg = {start: {x: e.clientX, y: e.clientY}, view: {...vv}};
  if (vp.size === 2) { const [a, b] = [...vp.values()]; vg.pinch = {d: Math.hypot(a.x - b.x, a.y - b.y), k: vv.k}; }
});
vstage.addEventListener('pointermove', e => {
  if (!vp.has(e.pointerId) || !vg) return;
  vp.set(e.pointerId, {x: e.clientX, y: e.clientY});
  const r = vstage.getBoundingClientRect();
  if (vp.size >= 2 && vg.pinch) { const [a, b] = [...vp.values()]; vZoom(vg.pinch.k * Math.hypot(a.x - b.x, a.y - b.y) / vg.pinch.d, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top); return; }
  vv.x = vg.view.x + e.clientX - vg.start.x; vv.y = vg.view.y + e.clientY - vg.start.y; vApply();
});
const vEnd = e => { vp.delete(e.pointerId); if (!vp.size) vg = null; else { const [p] = [...vp.values()]; vg = {start: p, view: {...vv}}; } };
vstage.addEventListener('pointerup', vEnd); vstage.addEventListener('pointercancel', vEnd);
function vZoom(k, cx, cy) {
  k = Math.max(.05, Math.min(6, k));
  vv.x = cx - (cx - vv.x) * k / vv.k; vv.y = cy - (cy - vv.y) * k / vv.k; vv.k = k; vApply();
  $('viewer-sheet').querySelectorAll('.box').forEach(el => el.style.borderWidth = (3 / vv.k) + 'px');
  $('viewer-sheet').querySelectorAll('.box span').forEach(el => el.style.transform = `scale(${1 / vv.k})`);
}
vstage.addEventListener('wheel', e => {
  e.preventDefault();
  const r = vstage.getBoundingClientRect();
  if (e.ctrlKey || e.deltaMode === 1 || Math.abs(e.deltaY) >= 40 && !e.deltaX) vZoom(vv.k * Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0025)), e.clientX - r.left, e.clientY - r.top);
  else { vv.x -= e.deltaX; vv.y -= e.deltaY; vApply(); }
}, {passive: false});

// ---------- Start ----------
// A phone's header leaves the search little room until it is tapped: the short word fits.
const syncSearchHint = () => { $('search').placeholder = narrow() ? L('Найти', 'Find') : L('Найти человека…', 'Find a person…'); };
syncSearchHint();
window.addEventListener('resize', syncSearchHint);
if (touchScreen()) $('hint').textContent = L('Коснитесь человека — откроется его история, двойное касание — только его предки. Коснитесь линии — документы, на которых держится связь.', 'Tap a person to open their story, double-tap for their ancestors only. Tap a line for the documents the link rests on.');
$('groups').innerHTML = `<button data-group="" title="${L('Всё древо', 'Whole tree')}">${L('Все', 'All')}</button>` + GROUPS.map(g => `<button data-group="${esc(g.id)}" title="${esc(g.title)}: ${L('только эта ветка, остальные свёрнуты', 'only this branch, the others folded')}"><i style="background:var(--g-${g.c}-ink)"></i>${esc(g.title)}</button>`).join('');
$('groups').addEventListener('click', e => { const b = e.target.closest('[data-group]'); if (b) setGroup(b.dataset.group); });
// The reader's plate «● Имя ×», first in the row of branches: the name opens their card, × asks to forget them.
function syncMe() {
  $('me-pill')?.remove();
  $('me-ask').hidden = true;
  if (!me) return;
  $('groups').insertAdjacentHTML('afterbegin', `<span class="me-pill" id="me-pill"><button class="me-name" id="me-open" title="${esc(sayName(me))} — ${L('ваша карточка', 'your card')}"><i aria-hidden="true"></i><span class="long">${esc(sayName(me))}</span><span class="short">${esc(firstName(me))}</span></button><button class="me-x" id="me-forget" aria-label="${L('Забыть, что вы —', 'Forget that you are')} ${esc(sayName(me))}" title="${L('Забыть', 'Forget')}">×</button></span>`);
}
function setMe(id) {
  me = id ? cid(id) : null;
  try { if (me) localStorage.setItem(ME_KEY, me); else localStorage.removeItem(ME_KEY); } catch (_) {}
  syncMe();
  if (current?.p) personView(current.p);
}
$('groups').addEventListener('click', e => {
  if (e.target.closest('#me-open')) go({p: me});
  else if (e.target.closest('#me-forget')) { $('me-ask-text').textContent = `${L('Забыть, что вы —', 'Forget that you are')} ${sayName(me)}?`; $('me-ask').hidden = false; $('me-yes').focus(); }
});
$('me-yes').onclick = () => setMe(null);
$('me-no').onclick = () => { $('me-ask').hidden = true; $('me-forget')?.focus(); };
syncMe();
$('help-toggle').onclick = () => go({help: 1});
const startRoute = parseHash();
const startFocus = startRoute.startFocus, startGroup = startRoute.g; delete startRoute.startFocus; delete startRoute.g;
if (startGroup) { activeGroup = startGroup; shown = basePeople(); }
renderTree(); syncGroups();
$('focus-exit').onclick = () => exitFocus();
$('news-toggle').onclick = () => go({news: 1});
markNews(false);
{
  const other = LANGS.find(l => l !== LANG), b = $('lang-toggle');
  b.hidden = !other;
  if (other) {
    b.textContent = other.toUpperCase();
    b.title = b.ariaLabel = other === 'en' ? 'English' : 'Русский';
    b.onclick = () => { try { localStorage.setItem('familyLang', other); } catch (_) {} location.reload(); };
  }
}
history.replaceState(startRoute, '', location.hash || '#');
if (startFocus && shown.has(startFocus)) focusOn(startFocus);
if (startRoute.p || startRoute.l || startRoute.f || startRoute.path || startRoute.help || startRoute.send || startRoute.page || startRoute.pl) { render(startRoute, false); } else centerOn(home(), 1);
// A branch link shows the whole branch; otherwise the tree opens on the reader («Это я») or on the root person.
if (!startRoute.p && !startRoute.path && !focus) setTimeout(() => activeGroup ? viewGroup() : centerOn(home(), narrow() ? .8 : 1), 0);
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
