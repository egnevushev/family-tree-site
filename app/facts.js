// Indexes built from the facts: the life line of a card, places, documents, the days of memory and the search.
// Pure; depends on core.js and family.js.
'use strict';

// ---------- Life line: year, event, the facts behind it ----------
// Built from the record's own facts: birth and death as the card's header gives them (date_display), the rest
// from dated facts of the fields below; an undated fact stays out. Several facts of one event (one field, the
// same day, or the same year when neither has a day) make one row with all their references. A date said
// roughly («около», «?», «или», «не позднее», two versions) is marked ≈. Children under 18: no life line.
const LIFE_EVENTS = ['birth', 'baptism', 'education', 'service', 'ordination', 'tonsure', 'marriage', 'award', 'military_event', 'event', 'residence', 'retirement', 'arrest', 'sentence', 'repression', 'rehabilitation', 'death', 'burial', 'canonization'];
const minorChild = p => !p.death && bornYear(p) > new Date().getFullYear() - 18;
// A date said in the old style (Julian): «ст. ст.» in Russian, «O.S.» or «old style» in English.
const OLD_STYLE = /ст\. ?ст\.|\bO\. ?S\.|old style/i;
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
    // The row stands at the year the header gives (its short date, else the record's own date), not at the earliest
    // year of the text: «1 февраля 1860 года …; прежние версии — 1857 и 1861» is 1860.
    const said = +(/\b(1[5-9]\d\d|20\d\d)\b/.exec(String(dateValue(p, kind, true) || '')) || [])[1];
    const at = datesIn(String(p[kind] || '')).find(d => d[1] === said) || ds.find(d => d[1] === said) || ds[0];
    rows.push({field: kind, t: at[0], years: [at[1]], rough: ROUGH.test(text) || new Set(ds.map(d => OLD_STYLE.test(text) ? d[1] : d[0])).size > 1, text: text + (place ? ', ' + place.value : ''), refs});
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

// ---------- The years of a life: the page «Время», the tree in a year, the background of an epoch ----------
// lifeSpan(id) → {from, to, fromKnown, toKnown, fromRough, toRough, living} for a card (a merged card is one span),
// or null when not a single year of the life is written. from is the year of birth; without it, the earliest year of
// the life line (fromKnown false). to is the year of death; else, for someone who may be alive, this year; else the
// latest year of the life line (toKnown false). Facts after a death (canonization, rehabilitation) never stretch a life
// whose death is unknown. A year said roughly («ок. 1842–1843», «1901/1902») is its first year, marked rough.
// Lived in the year y: from ≤ y ≤ to.
const AFTER_LIFE = new Set(['canonization', 'rehabilitation']);
const spanYears = t => { const m = /\b(1[5-9]\d\d|20\d\d)\b/.exec(t); return m ? +m[1] : 0; };
const spanRough = t => ROUGH.test(t) || (!OLD_STYLE.test(t) && new Set(datesIn(t).map(d => d[1])).size > 1);
// The years of a birth or a death of the records of a card: the record's own date, else its facts of that field.
function spanEnd(recs, kind) {
  const ys = [], rough = [];
  for (const p of recs) {
    const texts = p[kind] ? [String(p[kind])] : D.claims.filter(c => c.person_id === p.id && c.field === kind).map(c => c.value);
    const t = texts.find(spanYears);
    // The card's header may say more than the date: «прежние версии — 1857 и 1861».
    if (t) { ys.push(spanYears(t)); rough.push(spanRough(t) || ROUGH.test(p.date_display?.[kind]?.text || '')); }
  }
  if (!ys.length) return null;
  return {year: kind === 'birth' ? Math.min(...ys) : Math.max(...ys), rough: rough.some(Boolean) || new Set(ys).size > 1};
}
const LIFE_SPANS = new Map();
function lifeSpan(id) {
  id = cid(id);
  if (LIFE_SPANS.has(id)) return LIFE_SPANS.get(id);
  const recs = [id, ...(MERGE_OF.get(id)?.members || [])].map(x => P.get(x)).filter(Boolean);
  let out = null;
  if (recs.length) {
    const born = spanEnd(recs, 'birth'), died = spanEnd(recs, 'death');
    const living = !died && recs.some(p => mayLive(p.id));
    const ys = recs.flatMap(p => lifeLine(p.id).filter(r => !AFTER_LIFE.has(r.field)).flatMap(r => r.years.map(Number)));
    let from = born ? born.year : ys.length ? Math.min(...ys) : 0;
    let to = died ? died.year : living ? new Date().getFullYear() : ys.length ? Math.max(...ys) : 0;
    if (!from && to && (died || !living)) from = to;
    if (!to && from) to = from;
    if (from) {
      out = {from: Math.min(from, to), to: Math.max(from, to), fromKnown: !!born, toKnown: !!died, fromRough: !!born?.rough, toRough: !!died?.rough, living};
    }
  }
  LIFE_SPANS.set(id, out);
  return out;
}
const livedIn = (s, y) => !!s && s.from <= y && y <= s.to;
// The age in the year y, only with a year of birth and never of the living: a whole number (perhaps a year too many),
// null otherwise.
const ageIn = (s, y) => s && s.fromKnown && !s.living && livedIn(s, y) ? y - s.from : null;
// The background of an epoch in a card's life line (D.history, data/site-history.json): the events whose years meet
// the years of the life, an event of some branches only for people of those branches. None for the living and for
// children; the card itself also leaves it out of a life line shorter than two rows, and the booklet never has it.
function epochEvents(id) {
  id = cid(id);
  const p = P.get(id), s = lifeSpan(id);
  if (!p || !s || s.living || minorChild(p)) return [];
  const mine = memberOf.get(id) || new Set();
  return (D.history || []).filter(e => e.year <= s.to && (e.end || e.year) >= s.from && (!e.branches || e.branches.some(b => mine.has(b))));
}

// Places: coordinates from free sources (data/site-places.json), the facts of the people who were there.
const PLACES = (D.places || []).map(pl => {
  const cs = pl.claims.map(id => C.get(id)).filter(Boolean);
  return {...pl, cs, people: [...new Set(cs.map(c => cid(c.person_id)))]};
});
const PLACE = new Map(PLACES.map(pl => [pl.id, pl]));
const PLACES_OF = new Map();
PLACES.forEach(pl => pl.people.forEach(id => { if (!PLACES_OF.has(id)) PLACES_OF.set(id, []); PLACES_OF.get(id).push(pl); }));
const onMap = pl => pl.kind !== 'far' && typeof pl.lat === 'number';
// The years a fact speaks of, as one span.
// A place of birth without a date in it takes the year of birth.
const yearsOf = cs => { const ys = cs.flatMap(c => { const ds = datesIn(c.value).map(d => d[1]); return ds.length ? ds : /^birth_?place$/.test(c.field) && bornYear(P.get(c.person_id)) ? [bornYear(P.get(c.person_id))] : []; }); return ys.length ? [Math.min(...ys), Math.max(...ys)] : null; };
const span = ys => !ys ? '' : ys[0] === ys[1] ? String(ys[0]) : `${ys[0]}–${ys[1]}`;

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
    let year = +(/(?:^|\D)(1[5-9]\d\d|20\d\d)(?!\d)/.exec(t) || [])[1] || 0;
    if (!year) { const ys = datesIn(s.title).filter(d => d[2]).map(d => d[1]); if (ys.length) year = Math.max(...ys); }
    if (!year) { const ys = recs.flatMap(({c}) => c && boxed.has(c.id) ? datesIn(c.value).map(d => d[1]) : []); year = ys.length ? Math.max(...ys) : 0; }
    // A place named in the title («Кашин 1859», «Ильинское, клировая ведомость») decides; else the places of
    // the facts its boxes are for, else of all the facts citing it.
    const ofClaims = cs => [...new Set(cs.flatMap(c => placeOfClaim.get(c.id) || []))];
    let places = PLACES.filter(pl => (pl.forms || []).some(f => f.length > 3 && new RegExp('(^|[^А-Яа-яЁёA-Za-z])' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![А-Яа-яЁёA-Za-z])').test(s.title)));
    if (!places.length) places = ofClaims(recs.filter(({c}) => c && boxed.has(c.id)).map(({c}) => c));
    if (!places.length) places = ofClaims(recs.filter(({c}) => c).map(({c}) => c));
    const citing = box?.for?.find(id => C.has(id) || R.has(id)) || recs.find(({c}) => c)?.c.id || '';
    const people = [...new Set(recs.flatMap(({c, r}) => c ? [cid(c.person_id)] : r ? [cid(r.from_id), cid(r.to_id)] : []))].filter(id => !minorId(id));
    return {s, year, places, citing, people};
  }).filter(Boolean);
  return DOCS;
}

// ---------- Photos: the album of «Документы» and the people still without a photo ----------
const isPhotoSource = s => !!s?.views?.length && /photo|illustration|portrait/.test(s.kind || '');
function portraitOf(p) {
  const photo = (p.media || []).map(id => S.get(id)).find(isPhotoSource);
  return photo ? {src: photo, cap: photo.title} : null;
}
// Every photo source with the people it is tied to: the cards holding it in media and the facts and links citing it.
// A photo whose people are all children under 18 is left out; children are never named under a photo.
let PHOTOS = null;
function photosData() {
  if (PHOTOS) return PHOTOS;
  PHOTOS = D.sources.filter(isPhotoSource).map(s => {
    const held = D.people.filter(p => (p.media || []).includes(s.id)).map(p => p.id);
    const cited = (CITING.get(s.id) || []).flatMap(({c, r}) => c ? [c.person_id] : r ? [r.from_id, r.to_id] : []);
    const all = [...held, ...cited];
    if (!all.length || all.every(minorId)) return null;
    const people = [...new Set(all.filter(id => !minorId(id)).map(cid))].filter(id => P.has(id));
    return {s, people, citing: held.length ? 'media:' + cid(held[0]) : (CITING.get(s.id) || []).map(({c, r}) => c?.id || r?.id).find(Boolean) || ''};
  }).filter(Boolean);
  return PHOTOS;
}
// A year of death as bornYear gives a year of birth.
const diedYear = p => +(/\b(1[5-9]\d\d|20\d\d)\b/.exec(p?.death || '') || [])[1] || 0;
// A card of the tree whose photo the family is asked for: gone (not living by the site's rule, not a child), born
// in 1860 or later (or, the birth unknown, dead after 1900), who lived to ten years at least, with no portrait on
// any of its records.
function photoWanted(id) {
  id = cid(id);
  const p = P.get(id);
  if (!p || !inTree.has(id) || mayLive(id) || minorChild(p)) return false;
  const b = bornYear(p);
  if (b ? b < 1860 : diedYear(p) <= 1900) return false;
  // A child who died small was hardly ever photographed: the family is not asked for that.
  if (b && diedYear(p) && diedYear(p) - b < 10) return false;
  return ![id, ...(MERGE_OF.get(id)?.members || [])].some(x => P.get(x) && portraitOf(P.get(x)));
}
// All of them, by name; the page groups them by branch.
const photoMissing = () => [...new Set([...inTree].map(cid))].filter(photoWanted).sort((a, b) => nameOf(a).localeCompare(nameOf(b), LOCALE));

// ---------- «В этот день» ----------
// What happened in the family on this day and in this month: births, deaths, marriages, service, awards, the
// kolkhoz's heifer and reprimands — every fact with its day (or its month) of the people who are gone, never of
// the living (the site's rule «living», as for «Это я») or of children. A date before 14.02.1918 is as in the
// document; the documents of that time kept the old style, so it also counts on its new-style day. The Church's
// memory comes from the canonization fact itself («память 22 августа», «commemorated on 22 August»). Nothing is
// marked on the tree. MONTHS_NOM and MONTHS_PREP are for the page (English has one form); a date in a text is
// recognised by any of the forms, MONTH_WORDS.
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_NOM = L(['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'], MONTHS_EN);
const MONTHS_PREP = L(['январе', 'феврале', 'марте', 'апреле', 'мае', 'июне', 'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'], MONTHS_EN);
const MONTH_WORDS = [...new Set([...MONTHS_GEN, ...MONTHS_NOM, ...MONTHS_PREP, ...MONTHS_EN])].join('|');
const julianShift = y => y < 1700 ? 10 : y < 1800 ? 11 : y < 1900 ? 12 : 13;
const DAY_FIELDS = new Set([...LIFE_EVENTS, 'occupation']);
// A fact of a departed person that names a living person's birthday (a father registering his son's birth) stays
// out: the page says nothing of the living.
// Someone without a date of death born in 1930 or later by any birth fact may be alive: treated as living here,
// even where the card's own date is empty (a year of birth known only from a fact).
const birthFrom = p => { const d = datesIn(p.birth || '')[0] || D.claims.filter(c => c.person_id === p.id && c.field === 'birth').map(c => datesIn(c.value)[0]).find(Boolean); return d ? new Date(d[0]) : null; };
const mayLive = id => { const p = P.get(id); if (!p) return false; if (living(id)) return true; const b = birthFrom(p); return !p.death && !!b && b.getUTCFullYear() >= 1930; };
const LIVING_BIRTHDAYS = D.people.filter(p => mayLive(p.id)).flatMap(p => {
  const ds = [p.birth, ...D.claims.filter(c => c.person_id === p.id && c.field === 'birth').map(c => c.value)].flatMap(t => datesIn(t || '').filter(d => d[2]));
  return ds.flatMap(([t]) => { const x = new Date(t), y = x.getUTCFullYear(), m = x.getUTCMonth() + 1, d = x.getUTCDate();
    return [`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, `${String(d).padStart(2, '0')}.${String(m).padStart(2, '0')}.${y}`, `${d}.${String(m).padStart(2, '0')}.${y}`, `${d} ${MONTHS_GEN[m - 1]} ${y}`, `${d} ${MONTHS_EN[m - 1]} ${y}`, `${MONTHS_EN[m - 1]} ${d}, ${y}`]; });
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
      const m = /(?:память|commemorated(?:\s+on)?|commemoration|feast day)\s+(\d{1,2})\s+([a-zа-яё]+)(\s+(?:нового стиля|\(?new style))?/i.exec(c.value);
      const mo = m && (MONTHS_GEN.indexOf(m[2].toLowerCase()) + 1 || MONTHS_EN.findIndex(x => x.toLowerCase() === m[2].toLowerCase()) + 1);
      if (mo) add({id, field: 'church', y: 0, m: mo, d: +m[1], newStyle: !!m[3], text: c.value, refs: [c.id], status: c.status});
    }
    // Each date in the fact, by the day or the month («в сентябре 1883»); a bare year says nothing of a day.
    const ds = datesIn(c.value).filter(d => d[2] || /([а-яёa-z]+)\s*(1[5-9]\d\d|20\d\d)/i.test(c.value));
    for (const [t, y, hasDay] of ds) {
      const dt = new Date(t), mo = dt.getUTCMonth() + 1, d = hasDay ? dt.getUTCDate() : 0;
      if (!hasDay && !new RegExp(`(${MONTH_WORDS})\\s*${y}`, 'i').test(c.value)) continue;
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
// A fact with many dates (a watchman's years in the minutes) shows the clause of this date, not its beginning.
function clauseOf(e) {
  const parts = e.text.split(/;\s+/);
  if (parts.length < 2 || !e.d) return e.text;
  const dd = String(e.d), mm = String(e.m).padStart(2, '0');
  const marks = [`${dd.padStart(2, '0')}.${mm}.${e.y}`, `${dd}.${mm}.${e.y}`, `${e.y}-${mm}-${dd.padStart(2, '0')}`, `${dd} ${MONTHS_GEN[e.m - 1]} ${e.y}`, `${dd} ${MONTHS_GEN[e.m - 1]}`, `${dd} ${MONTHS_EN[e.m - 1]} ${e.y}`, `${MONTHS_EN[e.m - 1]} ${dd}, ${e.y}`];
  const hit = parts.find(t => marks.some(m => t.includes(m)));
  return hit && hit !== parts[0] ? '… ' + hit : e.text;
}
const memoryOn = date => MEMORY.filter(e => daysOf(e).some(([mm, dd]) => dd && mm === date.getMonth() + 1 && dd === date.getDate()));
// The month's list goes by the date as written; the new-style day counts only for «Сегодня».
const memoryIn = m => MEMORY.filter(e => e.m === m);

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
// The people a query finds, at most 30: those whose name and dates hold the words as typed come first («Иванова»
// before the Ivanov men), then those found with other endings, then those found by a note or a fact. No words, nobody.
function searchPeople(text) {
  const words = searchWords(text), q = words.map(searchStem);
  if (!q.length) return [];
  const found = (ws, t) => ws.every(w => t.includes(' ' + w));
  const order = [...searchIndex.filter(x => found(words, x.name)), ...searchIndex.filter(x => found(q, x.name)), ...searchIndex.filter(x => found(q, x.all))];
  return [...new Set(order.map(x => cid(x.id)))].map(id => P.get(id)).slice(0, 30);
}
