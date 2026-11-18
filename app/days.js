// The page «В этот день» (On this day) and the quiet line about today at the foot of the tree. The days themselves are counted in
// facts.js (MEMORY). Depends on facts.js, ui.js and panel.js.
'use strict';

// ---------- «В этот день» (On this day) ----------
// The names of the months: MONTHS_GEN/NOM/PREP of facts.js in Russian (they also read the data), the English ones
// from the browser.
const monthEn = m => new Date(Date.UTC(2000, m - 1, 1)).toLocaleDateString('en-GB', {month: 'long', timeZone: 'UTC'});
const monthName = m => EN ? monthEn(m) : MONTHS_NOM[m - 1];
const monthIn = m => EN ? monthEn(m) : MONTHS_PREP[m - 1];
const dayText = (m, d) => EN ? `${d} ${monthEn(m)}` : `${d} ${MONTHS_GEN[m - 1]}`;
const EVENT_WORD = EN ? {birth: 'Born', death: 'Died', marriage: 'Marriage', ordination: 'Ordination', tonsure: 'Tonsure', award: 'Award', education: 'Education', service: 'Service', event: 'Event', military_event: 'At the front', arrest: 'Arrest', sentence: 'Sentence', rehabilitation: 'Rehabilitation', repression: 'Repression', retirement: 'Retirement', baptism: 'Baptism', burial: 'Burial', residence: 'Where they lived', occupation: 'Occupation', family: 'Family', mention: 'Mention'} : {birth: 'Родился', death: 'Умер', marriage: 'Брак', ordination: 'Рукоположение', tonsure: 'Постриг', award: 'Награда', education: 'Учёба', service: 'Служба', event: 'Событие', military_event: 'На фронте', arrest: 'Арест', sentence: 'Приговор', rehabilitation: 'Реабилитация', repression: 'Репрессии', retirement: 'Увольнение за штат', baptism: 'Крещение', burial: 'Погребение', residence: 'Где жил', occupation: 'Занятие', family: 'Семья', mention: 'Упоминание'};
const femaleOf = id => sexOf(id) === 'f';
function memoryItem(e, year) {
  const ref = id => { const st = (C.get(id) || X.get(id))?.status; return `<button class="ref r${st ? level(st) : 2}" data-ref="${esc(id)}" aria-label="${L('Основание', 'Ground')}">↗</button>`; };
  const who = `<button class="linklike" data-person-link="${esc(e.id)}">${esc(sayName(e.id))}</button>`;
  if (e.field === 'church') return `<li class="mem church"><span class="mem-day">${dayText(e.m, e.d)}</span><span class="mem-what"><em>${L('Церковная память', 'Church commemoration')}</em> ${who}${/праведн|righteous/i.test(e.text) ? L(', праведный', ', righteous') : /священномученик|hieromartyr/i.test(e.text) ? L(', священномученик', ', hieromartyr') : ''}${e.newStyle ? L(' (по новому стилю)', ' (new style)') : ''} ${e.refs.map(ref).join('')}</span></li>`;
  const when = `${e.d ? dayText(e.m, e.d) + ' ' : (EN ? monthName(e.m) : monthName(e.m).toLowerCase()) + ' '}${e.y}`;
  const word = e.field === 'birth' ? (EN ? 'Born' : femaleOf(e.id) ? 'Родилась' : 'Родился') : e.field === 'death' ? (EN ? 'Died' : femaleOf(e.id) ? 'Умерла' : 'Умер') : EVENT_WORD[e.field] || field(e.field);
  const ago = year - e.y;
  return `<li class="mem${e.field === 'birth' || e.field === 'death' ? ' life' : ''}"><span class="mem-day">${esc(when)}<small>${ago > 0 ? `${ago} ${yearsWord(ago)} ${L('назад', 'ago')}` : ''}</small></span>
    <span class="mem-what"><em>${esc(word)}</em> ${who}${e.text ? `: ${esc(cut(spaced(fmtDate(clauseOf(e))), 220))}` : ''}${e.ns ? ` <small class="muted">(${L('дата по старому стилю; по новому', 'old style date; new style')} — ${dayText(e.ns.m, e.ns.d)})</small>` : ''} ${e.refs.map(ref).join('')}</span></li>`;
}
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
    <div class="days-month"><button data-month="${month === 1 ? 12 : month - 1}" aria-label="${L('Предыдущий месяц', 'Previous month')}">‹ ${monthName((month + 10) % 12 + 1)}</button><h3>${month === tm ? L('В этом месяце', 'This month') : L('В ', 'In ') + monthIn(month)} <small>${EN ? monthName(month) : monthName(month).toLowerCase()} · ${inMonth.length}</small></h3><button data-month="${month === 12 ? 1 : month + 1}" aria-label="${L('Следующий месяц', 'Next month')}">${monthName(month % 12 + 1)} ›</button></div>
    ${inMonth.length ? `<ul class="mem-list">${inMonth.map(e => memoryItem(e, year)).join('')}</ul>` : `<p class="muted">${L('В этом месяце ничего не записано.', 'Nothing is recorded for this month.')}</p>`}
  </div>`;
}
$('days-body').addEventListener('click', e => {
  const mb = e.target.closest('[data-month]'); if (mb) { daysMonth = +mb.dataset.month; daysView(); return; }
  const t = e.target.closest('[data-person-link],[data-ref]'); if (!t) return;
  if (t.dataset.personLink) go({p: t.dataset.personLink}); else go({f: t.dataset.ref});
});
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
    : `<span>${L('В', 'In')} ${monthIn(today.getMonth() + 1)} ${L('в истории семьи', 'in the family’s history')} —</span> ${month} ${words} →`;
}
$('today-line').onclick = () => go({page: 'days'});
// It opens on this month; the quiet line on the tree shows only while no page is open.
registerPage('days', {el: 'days-page', show() { daysMonth = null; daysView(); }, sync: syncTodayLine});
syncTodayLine();
