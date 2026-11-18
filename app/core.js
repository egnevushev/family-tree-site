// The data and what every other file reads from it: indexes by id, merged cards, names as shown, reliability
// levels, dates and ages, text helpers. Pure: no page needed (scripts/test_app.cjs loads it in Node).
// Depends on data.js (window.FAMILY_DATA); nameOf calls nameParts from family.js when first used.
'use strict';
// Without data.js (a dropped connection, a blocked file) nothing below can work: say so and stop, instead of
// leaving an empty page. The page is touched only then, so with the data this file also loads without a page.
if (!globalThis.FAMILY_DATA) {
  const fail = document.getElementById('load-fail');
  if (fail) { fail.hidden = false; document.getElementById('load-retry').addEventListener('click', () => location.reload()); }
  throw Error('data.js did not load');
}
const D = globalThis.FAMILY_DATA;
// The settings of this site: its title, the text under «?», the branches, contacts (data/site.json).
const SITE = D.site || {};
// ---------- Language ----------
// The interface speaks Russian or English: the reader's choice (the RU/EN switch in the header, kept in this
// browser), else "lang" of data/site.json, else English. L(ru, en) picks the text of the interface. Any text of the
// data may be {"ru": …, "en": …}: localize puts the reader's language in its place (or the other, if it is missing);
// a plain string is the same in every language.
const LANGS = (SITE.languages || ['en', 'ru']).filter(l => ['ru', 'en'].includes(l));
const LANG = (() => { try { const l = globalThis.localStorage?.getItem('familyLang'); if (LANGS.includes(l)) return l; } catch (_) {} return LANGS.includes(SITE.lang) ? SITE.lang : LANGS[0] || 'en'; })();
const EN = LANG === 'en';
const L = (ru, en) => EN ? en : ru;
const isLangText = v => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0 && Object.keys(v).every(k => k === 'ru' || k === 'en');
const loc = v => isLangText(v) ? v[LANG] ?? v.ru ?? v.en : v;
const localize = v => isLangText(v) ? loc(v) : Array.isArray(v) ? v.map(localize) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, localize(x)])) : v;
// The texts in the site's own language ("lang"), kept before localizing: what is new to a reader is measured on
// them, so switching the language never makes every story and find look rewritten.
const baseText = v => isLangText(v) ? v[SITE.lang || 'en'] ?? v.en ?? v.ru : v;
const BASE = {stories: D.stories || {}, finds: baseText(D.finds) || []};
Object.assign(D, localize({...D, site: undefined}), {site: SITE});
// A part of the data loaded later (finds, news, the map; ui.js) is localized the same way as it comes; the finds
// keep their texts in the site's own language for the reader's marks.
const localizePart = part => { if (part.finds) BASE.finds = baseText(part.finds); return localize(part); };
const LOCALE = L('ru-RU', 'en-GB');
// Plural: Russian has three forms (1 год, 2 года, 5 лет), English two.
const plural = (n, ru, en) => EN ? (n === 1 ? en[0] : en[1]) : ru[n % 10 === 1 && n % 100 !== 11 ? 0 : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 1 : 2];
if (globalThis.document) document.documentElement.lang = LANG;
const SITE_NAME = loc(SITE.title) || L('Семейное древо', 'Family tree');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const P = new Map(D.people.map(p => [p.id, p]));
const S = new Map(D.sources.map(s => [s.id, s]));
const C = new Map(D.claims.map(c => [c.id, c]));
const R = new Map(D.relationships.map(r => [r.id, r]));
const X = new Map(D.conflicts.map(x => [x.id, x]));
const ROOT = D.root_person_id;
// Visual merges: several records of one person share one card on the tree (data/site-merges.json).
// The records stay separate in the database; the card lists each of them.
const MERGES = D.merges || [];
const ALIAS = new Map(MERGES.flatMap(m => m.members.map(x => [x, m.main])));
const MERGE_OF = new Map(MERGES.map(m => [m.main, m]));
const cid = id => ALIAS.get(id) || id;
// The name as recorded (the data mix «Фамилия Имя» and «Имя Отчество Фамилия»); nameOf shows it in one order.
const rawName = id => MERGE_OF.get(cid(id))?.name || P.get(id).name;
const shownNames = new Map();
// «Фамилия (девичья) Имя Отчество» everywhere a name labels a person: card titles, lists, search, chains (decision of
// the site's rule). A name that does not split into parts («Пётр — дьячок…») stays as written.
const nameOf = id => {
  if (!shownNames.has(id)) { const n = nameParts(id); shownNames.set(id, n ? [n.surname + (n.maiden ? `${n.surname ? ' ' : ''}(${n.maiden})` : ''), n.given].filter(Boolean).join(' ') : rawName(id)); }
  return shownNames.get(id);
};
// Conflicts: an open one puts a quiet ⚑ on the card; settled ones, by a document or by the family's decision,
// stay in the cards under «Решено».
const isOpen = x => (x.state || 'open') === 'open';
const SOLVED = L({resolved_by_document: 'документом', resolved_by_decision: 'решением семьи'}, {resolved_by_document: 'by a document', resolved_by_decision: "by the family's decision"});
const FLAGGED = new Set(D.conflicts.filter(isOpen).flatMap(x => x.people.filter(id => P.has(id)).map(cid)));

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
  // One date with its style named is its year too, unless the two calendars put the day in different years.
  const one = /^(\d{4})-\d{2}-\d{2} \((?:ст|н)\. ст\.\)$/.exec(text);
  if (one) return new Date(dateSpan(text)[0]).getUTCFullYear() === +one[1] ? one[1] : text;
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
// Age at death, only from dates written as ISO (year, year-month or a full date, with or without its style
// named) and never for the living. A year or month known only roughly gives a range; before the 1918 calendar change a date may
// be in either style, 13 days apart, so a birthday that close to the death date also gives a range.
const SHIFT_END = Date.UTC(1918, 1, 14), DAY = 864e5;
function dateSpan(v) {
  const text = String(v || '').trim();
  // A date written in both styles («1858-09-06 (ст. ст.) / 1858-09-18 (н. ст.)») spans the two.
  const both = /^(\d{4})-(\d{2})-(\d{2}) \(ст\. ст\.\) \/ (\d{4})-(\d{2})-(\d{2}) \(н\. ст\.\)$/.exec(text);
  if (both) return [Date.UTC(+both[1], both[2] - 1, +both[3]), Date.UTC(+both[4], both[5] - 1, +both[6])];
  // One date with its style named: «(ст. ст.)» is the day 11–13 days later by today's calendar, «(н. ст.)» is itself.
  const one = /^(\d{4})-(\d{2})-(\d{2}) \((ст|н)\. ст\.\)$/.exec(text);
  if (one) {
    const century = Math.floor((+one[2] > 2 ? +one[1] : one[1] - 1) / 100);
    const t = Date.UTC(+one[1], one[2] - 1, +one[3]) + (one[4] === 'ст' ? century - Math.floor(century / 4) - 2 : 0) * DAY;
    return [t, t];
  }
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
// A reference in a text: [C123], [R011], [X01], [S:source-id]. Global, so for .replace only (never .test or .exec,
// which would keep lastIndex between calls).
const REF_RE = /\[(C\d+|R\d+|X\d+|S:[A-Za-z0-9._-]+)\]/g;
const bold = html => html.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
const fmtDate = v => String(v || '').replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, '$3.$2.$1');
// The year of birth as a number, 0 when none is written.
const bornYear = p => +(/\b(1[5-9]\d\d|20\d\d)\b/.exec(p?.birth || '') || [])[1] || 0;

// ---------- Dates written in a text (life lines, the days of memory, GEDCOM) ----------
// A date said roughly («около», «?», «или», «не позднее», two versions) is ROUGH.
const MONTH_NO = {январ: 1, феврал: 2, март: 3, апрел: 4, ма: 5, июн: 6, июл: 7, август: 8, сентябр: 9, октябр: 10, ноябр: 11, декабр: 12,
  januar: 1, februar: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, septem: 9, octob: 10, novem: 11, decem: 12};
const ROMAN_NO = {I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12};
// «ок.» and «или» count only as whole words (\b knows Latin letters alone, so the letters are named here).
const ROUGH = /около|(?:^|[^а-яё])ок\.|примерно|приблиз|вероятно|возможно|\?|не позднее|не ранее|(?:^|[^а-яё])или(?![а-яё])|верси|не установлен|спорн|\b(about|around|circa|c\.|approximately|probably|possibly|not later|not before|or|version|disputed)\b/i;
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
  // (No lookbehind: Safari before 16.4 does not know it and would not load the file at all.)
  for (const m of text.matchAll(/(^|\D)(1[5-9]\d\d|20\d\d)(?!\d)(?!\s*(?:руб|коп))/g)) {
    const at = m.index + m[1].length;
    if (!/№\s?$/.test(text.slice(0, at))) add({index: at, 0: m[2]}, +m[2]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}
// Copies of old documents sometimes lose spaces between words and numbers («16июля1882», «обоим22»).
const spaced = t => t.replace(/(\d)(?=[а-яё])/gi, '$1 ').replace(/([а-яё])(?=\d)/gi, '$1 ');
// A long fact (a whole service list) is cut at a word in the line; its reference opens it in full.
const cut = (t, n = 220) => t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n)).replace(/[;,.:\s—–-]+$/, '') + ' …';
const plain = t => t.toLocaleLowerCase('ru').replace(/ё/g, 'е');

// Research write-ups (how a book was read, what was checked) come after the documents of the time, as «Разбор».
const isResearch = sid => S.get(sid)?.kind === 'research_note';
// Saints are marked only where the database records a canonization, with its source.
const canonized = new Map(D.claims.filter(c => c.field === 'canonization').map(c => [c.person_id, c]));
// A short hash of a text, to notice that it changed (new stories, rewritten finds).
const textHash = s => { let h = 5381; for (const ch of s) h = (h * 33 ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
// A find's text as the reader's marks keep it (finds.js); data.js names each find's hash as find_hashes, so the dot
// «есть непрочитанные находки» needs no finds themselves (scripts/site_data.py, find_hash).
const findHash = f => textHash(f.title + f.lead + f.text + (f.weak || ''));
