// «Скачать древо» / «Download the tree»: the text of a GEDCOM 5.5.1 file for a scope (the whole tree, a branch, a person and ancestors).
// Pure; depends on core.js, family.js and facts.js. The download itself is in book.js.
'use strict';

// ---------- «Скачать древо» / «Download the tree»: a GEDCOM 5.5.1 file ----------
// The format other family-tree programs read (MyHeritage, Gramps, FamilySearch, Ancestry). One person per card (a
// merged card with all its records), families from the parent and spouse links; disproved readings stay out, a
// probable kinship is only a note. The evidence goes with the file: every fact and link keeps its status in words and
// its documents as citations with QUAY (5 → 3 a document of the time, 4–3 → 2, 2 → 1, 1 → 0). Whoever may be alive gets
// only a name, sex and family links unless the reader ticks the living in; children under 18 never get more.
// The notes are in the reader's language (L).
const GED_MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const GED_QUAY = {5: 3, 4: 2, 3: 2, 2: 1, 1: 0};
const GED_TAG = {baptism: 'BAPM', burial: 'BURI', occupation: 'OCCU', education: 'EDUC', ordination: 'ORDN', residence: 'RESI', retirement: 'RETI'};
const GED_TYPE = {career: L('Служба', 'Service'), legitimation: L('Узаконение', 'Legitimation')};
const GED_EVEN = new Set(['service', 'career', 'award', 'marriage', 'military_event', 'event', 'arrest', 'sentence', 'repression', 'rehabilitation', 'canonization', 'tonsure', 'legitimation']);
// Facts that are no event but say something of the person; research fields (identification, archive leads, ages in
// records) stay in the database.
const GED_NOTE = new Set(['family', 'family_history', 'origin', 'kinship', 'mention', 'godparents', 'godparent', 'social_status', 'marital_status', 'children']);
const PLACE_OF_CLAIM = new Map(PLACES.flatMap(pl => pl.claims.map(c => [c, [pl.name, pl.historic].filter(Boolean).join(', ')])));
const gedDay = (y, m, d) => [d || '', m ? GED_MONTHS[m - 1] : '', y].filter(Boolean).join(' ');
// A date of the record: exact where it is written exactly; «(ст. ст.)» is a Julian date; both styles give the new one
// and the text goes to a note (exact: false); «ок. 1868» / «about 1868» is ABT; anything else is a date phrase, never
// a made-up precision.
function gedDate(text) {
  const t = String(text || '').trim();
  let m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/.exec(t);
  if (!t) return null;
  if (m) return {date: gedDay(+m[1], +m[2] || 0, +m[3] || 0), exact: true};
  if ((m = /^(\d{4})-(\d{2})-(\d{2}) \(ст\. ст\.\)$/.exec(t))) return {date: '@#DJULIAN@ ' + gedDay(+m[1], +m[2], +m[3]), exact: true};
  if ((m = /(\d{4})-(\d{2})-(\d{2}) \(н\. ст\.\)/.exec(t))) return {date: gedDay(+m[1], +m[2], +m[3]), exact: false};
  if ((m = /^(\d{4})\/(\d{4})$/.exec(t))) return {date: `BET ${m[1]} AND ${m[2]}`, exact: true};
  if ((m = /^(?:ок\.?|about|abt\.?|c\.|circa)\s*(\d{4})/i.exec(t))) return {date: 'ABT ' + m[1], exact: false};
  const ys = [...new Set([...t.matchAll(/\b(1[5-9]\d\d|20\d\d)\b/g)].map(x => x[1]))], phrase = t.replace(/\(/g, '[').replace(/\)/g, ']');
  return {date: ys.length === 1 ? `INT ${ys[0]} (${phrase})` : `(${phrase})`, exact: false};
}
// The date of a fact, only when its text has one date: by the day, the month or the year as written; «около» → ABT.
// The old style is «ст. ст.» (Russian) or «O.S.» / «old style» (English), the new «н. ст.» or «N.S.» / «new style».
function gedFactDate(text) {
  const ds = datesIn(text);
  if (ds.length !== 1) return '';
  const [t, y, hasDay] = ds[0], x = new Date(t);
  const monthSaid = hasDay || new RegExp(`\\d{4}-\\d{2}|(${MONTH_WORDS})\\s*${y}`, 'i').test(text);
  const julian = hasDay && /ст\.\s*ст\.|\bO\.\s*S\.|old style/i.test(text) && !/н\.\s*ст\.|\bN\.\s*S\.|new style/i.test(text);
  return (ROUGH.test(text) ? 'ABT ' : '') + (julian ? '@#DJULIAN@ ' : '') + gedDay(y, monthSaid ? x.getUTCMonth() + 1 : 0, hasDay ? x.getUTCDate() : 0);
}
// Who of the tree may be alive: the site's rule (as for «Это я» and «В этот день»), children, and anyone without any
// date who is of the family's own generations or next to someone who may be alive.
function gedMayLive() {
  const ids = [...new Set([...inTree].map(cid))];
  const may = new Set(ids.filter(id => mayLive(id) || minorChild(P.get(id))));
  ids.filter(id => { const p = P.get(id); return !may.has(id) && !p.death && !bornYear(p) && !birthFrom(p) && (p.group === 'family' || adjacency.get(id).some(x => may.has(cid(x)))); }).forEach(id => may.add(id));
  return may;
}
// Who goes into the file: the whole tree, a branch with everyone who belongs to it by blood or marriage, or a person
// with their ancestors (by parent links only; a probable parent is not an ancestor here).
function gedPeople(scope) {
  const all = [...new Set([...inTree].map(cid))].filter(id => P.has(id) && !OFF_TREE.has(id));
  if (scope.startsWith('p:')) {
    const id = cid(scope.slice(2)), ids = new Set([id]);
    for (const queue = [id]; queue.length;) parentsOf(queue.pop(), lines, ['child']).forEach(x => { if (!ids.has(x)) { ids.add(x); queue.push(x); } });
    return all.filter(x => ids.has(x));
  }
  const g = scope.slice(2);
  return all.filter(id => !g || memberOf.get(id)?.has(g));
}
// GEDCOM lines: a value of more than about 200 bytes goes on in CONC lines, a line break in CONT; a split never falls
// inside a letter or next to a space (programs drop spaces at the ends of lines); every @ in a text is doubled.
function gedWriter() {
  const out = [], size = ch => { const c = ch.codePointAt(0); return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4; };
  const pieces = text => {
    const chars = [...text], parts = [];
    while (chars.reduce((n, ch) => n + size(ch), 0) > 200) {
      let n = 0;
      for (let b = 0; n < chars.length && b + size(chars[n]) <= 200; n++) b += size(chars[n]);
      while (n > 1 && (chars[n - 1] === ' ' || chars[n] === ' ')) n--;
      parts.push(chars.splice(0, n).join(''));
    }
    return [...parts, chars.join('')];
  };
  // A date keeps its calendar escape, @#DJULIAN@.
  const put = (lvl, tag, value = '') => String(value).replace(/\r\n?/g, '\n').replace(/\t/g, ' ').replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '').replace(/@/g, tag === 'DATE' ? '@' : '@@')
    .split('\n').forEach((para, i) => pieces(para).forEach((piece, j) => out.push(`${i || j ? lvl + 1 : lvl} ${j ? 'CONC' : i ? 'CONT' : tag}${piece ? ' ' + piece : ''}`)));
  const ptr = (lvl, tag, xref) => out.push(`${lvl} ${tag} ${xref}`);
  return {out, put, ptr};
}
const gedShort = (t, n) => t.length <= n ? t : t.slice(0, t.lastIndexOf(' ', n - 1) > n / 2 ? t.lastIndexOf(' ', n - 1) : n - 1) + '…';
// site: the address of the site without its #…, for the links back to the cards.
function gedcom(scope, withLiving, site) {
  const ids = gedPeople(scope), inFile = new Set(ids), may = gedMayLive();
  const quiet = id => may.has(id) && (!withLiving || minorChild(P.get(id)));
  const {out, put, ptr} = gedWriter();
  const I = new Map(ids.map((id, i) => [id, `@I${i + 1}@`])), SRC = new Map();
  const src = sid => { if (!SRC.has(sid)) SRC.set(sid, `@S${SRC.size + 1}@`); return SRC.get(sid); };
  const records = id => [id, ...(MERGE_OF.get(id)?.members || [])];
  // Facts of departed people that give a living person's birthday stay out, as in «В этот день».
  const shownClaim = c => withLiving || !LIVING_BIRTHDAYS.some(t => c.value.includes(t));
  const cite = (lvl, sids, status, page, why) => [...new Set(sids || [])].filter(s => S.has(s)).forEach(s => {
    ptr(lvl, 'SOUR', src(s));
    if (page) put(lvl + 1, 'PAGE', gedShort(page, 240));
    put(lvl + 1, 'QUAY', GED_QUAY[level(status)]);
    if (why) put(lvl + 1, 'NOTE', why);
  });
  const said = c => `${label(c.status)}: ${fmtDate(c.value)}`;
  // Families: one per pair of parents (or one parent), with the couple's spouse records; a child with more than two
  // parent records (none so far) keeps the two strongest.
  const fams = new Map(), famOf = key => { if (!fams.has(key)) fams.set(key, {key, parents: key.split('~'), kids: [], marr: []}); return fams.get(key); };
  const parentRels = new Map();
  D.relationships.filter(r => r.kind === 'parent' && onCanvas(r)).forEach(r => {
    const kid = cid(r.to_id), par = cid(r.from_id);
    if (kid === par || !inFile.has(kid) || !inFile.has(par)) return;
    if (!parentRels.has(kid)) parentRels.set(kid, new Map());
    const m = parentRels.get(kid); if (!m.has(par)) m.set(par, []); m.get(par).push(r);
  });
  const childOf = new Map();
  parentRels.forEach((m, kid) => {
    const pars = [...m.keys()].sort((a, b) => level(bestOf(m.get(b)).status) - level(bestOf(m.get(a)).status)).slice(0, 2).sort();
    const f = famOf(pars.join('~')); f.kids.push(kid); childOf.set(kid, f);
  });
  D.relationships.filter(r => r.kind === 'spouse' && onCanvas(r)).forEach(r => {
    const a = cid(r.from_id), b = cid(r.to_id);
    if (a !== b && inFile.has(a) && inFile.has(b)) famOf([a, b].sort().join('~')).marr.push(r);
  });
  const F = new Map([...fams.values()].map((f, i) => [f.key, `@F${i + 1}@`]));
  // Sex by the name; of a couple read alike (a wife written by a pet name, a husband with a patronymic) the one with a
  // patronymic keeps theirs.
  const sex = new Map(ids.map(id => [id, sexOf(id)]));
  const sure = id => rawName(id).replace(/\([^)]*\)/g, ' ').split(/[\s—,]+/).some(w => /(вна|чна|vna|chna)$/.test(w) || (/(ич|ich)$/.test(w) && w.length > 4));
  fams.forEach(f => { const [a, b] = f.parents; if (b && sex.get(a) === sex.get(b) && sure(a) !== sure(b)) { const loose = sure(a) ? b : a; sex.set(loose, sex.get(loose) === 'm' ? 'f' : 'm'); } });
  const head = new Date(), stamp = head.toISOString().slice(0, 10);
  const slug = scope.startsWith('p:') ? cid(scope.slice(2)) : scope.slice(2) || 'all';
  const name = `family-tree-${slug}-${stamp}.ged`;
  put(0, 'HEAD');
  put(1, 'SOUR', 'FamilyTreeSite'); put(2, 'NAME', SITE_NAME); put(2, 'VERS', D.updated);
  put(1, 'DEST', 'ANY');
  put(1, 'DATE', gedDay(head.getFullYear(), head.getMonth() + 1, head.getDate())); put(2, 'TIME', head.toTimeString().slice(0, 8));
  ptr(1, 'SUBM', '@U1@');
  put(1, 'FILE', name);
  put(1, 'GEDC'); put(2, 'VERS', '5.5.1'); put(2, 'FORM', 'LINEAGE-LINKED');
  put(1, 'CHAR', 'UTF-8');
  put(1, 'LANG', L('Russian', 'English'));
  put(1, 'NOTE', `${SITE_NAME}: ${scope.startsWith('p:') ? sayName(cid(scope.slice(2))) + L(' и предки', ' and ancestors') : scope === 'g:' ? L('всё древо', 'whole tree') : L('ветка ', 'branch ') + GROUP.get(scope.slice(2))?.title}, ${L('выгружено с сайта', 'exported from the site')} ${stamp}.\n`
    + L('У каждого факта и связи — насколько он надёжен (в заметке) и документы, на которых он держится (источники; QUAY 3 — документ эпохи, 2 — публикация, указатель или слова семьи, 1 — вывод или зацепка, 0 — только схема или чужое дерево). ',
      'Every fact and link says how reliable it is (in a note) and which documents it rests on (sources; QUAY 3 — a document of the time, 2 — a publication, an index or the family\'s word, 1 — an inference or a lead, 0 — only a chart or someone else\'s tree). ')
    + (withLiving ? L('Живые выгружены с датами и подробностями, кроме детей младше 18 лет.', 'The living are exported with dates and details, except children under 18.') : L('У живых только имя и родство.', 'The living have only their names and kinship.')));
  ptr(0, '@U1@', 'SUBM'); put(1, 'NAME', SITE_NAME);
  for (const id of ids) {
    const p = P.get(id), n = nameParts(id), m = MERGE_OF.get(id);
    ptr(0, I.get(id), 'INDI');
    const given = (n ? n.given : '').replace(/\//g, ' '), surname = (n?.surname || '').replace(/\//g, ' ');
    put(1, 'NAME', n ? gedShort(`${given} /${surname}/`, 120) : gedShort(rawName(id).replace(/\//g, ' '), 120));
    if (given) put(2, 'GIVN', gedShort(given, 120));
    if (surname) put(2, 'SURN', surname);
    if (n?.maiden) { put(2, 'TYPE', 'married'); put(1, 'NAME', `${given} /${n.maiden}/`); put(2, 'GIVN', gedShort(given, 120)); put(2, 'SURN', n.maiden); put(2, 'TYPE', 'maiden'); }
    put(1, 'SEX', {m: 'M', f: 'F'}[sex.get(id)] || 'U');
    if (quiet(id)) put(1, 'RESN', 'privacy');
    else {
      const claims = D.claims.filter(c => cid(c.person_id) === id && shownClaim(c));
      const of = (...fs) => claims.filter(c => fs.includes(c.field));
      // Birth and death: the date of the card, the places and documents of every record's facts; other values in a note.
      const lifeEvent = (tag, kind, placeFields) => {
        const cs = of(kind), places = of(...placeFields), g = gedDate(p[kind]);
        if (!g && !cs.length && !places.length) return false;
        put(1, tag);
        const fd = !g && cs.map(c => gedFactDate(c.value)).find(Boolean);
        if (g) put(2, 'DATE', g.date); else if (fd) put(2, 'DATE', fd);
        const plac = places.map(c => PLACE_OF_CLAIM.get(c.id) || gedShort(c.value, 120))[0];
        if (plac) put(2, 'PLAC', plac);
        const notes = [...(g && !g.exact ? [`${L('Дата в записи', 'Date in the record')}: ${p[kind]}`] : []), ...[...cs, ...places].map(said)];
        if (notes.length) put(2, 'NOTE', [...new Set(notes)].join('\n'));
        [...cs, ...places].forEach(c => cite(2, c.source_ids, c.status, c.locator));
        return true;
      };
      lifeEvent('BIRT', 'birth', ['birth_place', 'birthplace']);
      // A departed person of the 19th century or earlier with no date of death is marked dead, so that programs do not hide them as living.
      if (!lifeEvent('DEAT', 'death', []) && !may.has(id) && (bornYear(p) || 0) < 1900) { put(1, 'DEAT', 'Y'); put(2, 'NOTE', L('Дата смерти неизвестна.', 'Date of death unknown.')); }
      for (const c of claims) {
        const tag = GED_TAG[c.field] || (GED_EVEN.has(c.field) ? 'EVEN' : null);
        if (!tag) continue;
        const text = fmtDate(c.value), short = ['OCCU', 'EDUC'].includes(tag);
        put(1, tag, short ? gedShort(text, 90) : '');
        if (tag === 'EVEN') put(2, 'TYPE', GED_TYPE[c.field] || field(c.field));
        const date = gedFactDate(c.value), plac = PLACE_OF_CLAIM.get(c.id);
        if (date) put(2, 'DATE', date);
        if (plac) put(2, 'PLAC', plac);
        put(2, 'NOTE', short && text.length <= 90 ? `${L('Надёжность', 'Reliability')}: ${label(c.status)}` : `${text}\n${L('Надёжность', 'Reliability')}: ${label(c.status)}`);
        cite(2, c.source_ids, c.status, c.locator);
      }
      const story = records(id).map(r => D.stories[r]?.text).filter(Boolean)
        .map(t => t.replace(/\s*\[(?:C\d+|R\d+|X\d+|S:[A-Za-z0-9._-]+)\]/g, '').replace(/\*\*/g, '').trim());
      if (story.length) put(1, 'NOTE', L('История жизни', 'Life story') + '\n\n' + story.join('\n\n'));
      const notes = [m?.note && L(`Одна карточка — ${records(id).length} записи о человеке: ${m.note}`, `One card — ${records(id).length} records of the person: ${m.note}`), ...records(id).map(r => P.get(r).note)].filter(Boolean);
      notes.forEach(t => put(1, 'NOTE', t));
      const facts = claims.filter(c => GED_NOTE.has(c.field)).map(c => `${field(c.field)}. ${said(c)}`);
      if (facts.length) put(1, 'NOTE', L('Другие факты', 'Other facts') + '\n' + facts.join('\n'));
      D.conflicts.filter(x => isOpen(x) && x.people.some(r => cid(r) === id)).forEach(x => put(1, 'NOTE', `${L('Расхождение в записях', 'Disagreement in the records')}: ${x.title}. ${x.detail || ''}`.trim()));
      HYPOTHESES.filter(h => [h.from_id, h.to_id].some(r => cid(r) === id)).forEach(h => put(1, 'NOTE', `${L('Вероятная связь, документом не подтверждена', 'Probable link, not proven by a document')}: ${h.title}`));
      lines.filter(l => l.kind === 'sibling' && (l.a === id || l.b === id) && inFile.has(l.a === id ? l.b : l.a))
        .forEach(l => put(1, 'NOTE', `${L('Брат или сестра', 'Brother or sister')}: ${sayName(l.a === id ? l.b : l.a)} (${label(l.best.status).toLowerCase()}).`));
    }
    put(1, 'NOTE', `${L('Карточка на сайте семейного древа', 'Card on the family tree site')}: ${site}#p=${encodeURIComponent(id)}`);
    // The child's link to each parent: its status in words, its documents as citations of the person.
    const f = childOf.get(id);
    if (f) {
      ptr(1, 'FAMC', F.get(f.key));
      put(2, 'NOTE', f.parents.map(par => `${sayName(par)} — ${label(bestOf(parentRels.get(id).get(par)).status).toLowerCase()}`).join('; '));
      f.parents.forEach(par => parentRels.get(id).get(par).forEach(r => cite(1, r.source_ids, r.status, '', `${L('Связь с родителем', 'Link to the parent')}: ${sayName(par)}`)));
    }
    fams.forEach(fam => { if (fam.parents.includes(id)) ptr(1, 'FAMS', F.get(fam.key)); });
  }
  const birthKey = id => quiet(id) ? 9999 : bornYear(P.get(id)) || 9999;
  fams.forEach(f => {
    ptr(0, F.get(f.key), 'FAM');
    const [a, b] = f.parents.slice().sort((x, y) => (sex.get(x) === 'f') - (sex.get(y) === 'f'));
    if (b) { ptr(1, 'HUSB', I.get(a)); ptr(1, 'WIFE', I.get(b)); }
    else ptr(1, sex.get(a) === 'f' ? 'WIFE' : 'HUSB', I.get(a));
    if (f.marr.length) {
      put(1, 'MARR');
      put(2, 'NOTE', `${L('Брак', 'Marriage')}: ${label(bestOf(f.marr).status).toLowerCase()}`);
      f.marr.forEach(r => cite(2, r.source_ids, r.status, ''));
    }
    f.kids.sort((x, y) => birthKey(x) - birthKey(y)).forEach(k => ptr(1, 'CHIL', I.get(k)));
  });
  SRC.forEach((xref, sid) => {
    const s = S.get(sid);
    ptr(0, xref, 'SOUR');
    put(1, 'TITL', s.title);
    put(1, 'ABBR', gedShort(sid, 60));
    if (s.url) put(1, 'PUBL', s.url);
    put(1, 'NOTE', `${L('На сайте семейного древа', 'On the family tree site')}: ${site}#f=${encodeURIComponent('S:' + sid)}`);
  });
  put(0, 'TRLR');
  return {text: '﻿' + out.join('\r\n') + '\r\n', name, people: ids.length, families: fams.size};
}
