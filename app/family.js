// The family as a graph: the lines of the tree, the branches, names read from the records, «Это я» and kinship
// («Кем приходится»), and which people the tree shows. Pure, like core.js; depends on core.js.
'use strict';

// ---------- Main family component, plus optional disconnected records ----------
// A chain through a possible identity is no longer needed once that identity is a merged card.
const HYPOTHESES = (D.hypotheses || []).filter(h => !(h.via_id && cid(h.via_id) === cid(h.from_id)));
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
const living = id => { id = cid(id); const p = P.get(id); return !!p && inTree.has(id) && !p.death && (bornYear(p) >= 1930 || PERSONAL.has(id) || LIVING_EXTRA.has(id)); };
const ME_KEY = 'familyMe';
// The reader's card; read from the browser in ui.js.
let me = null;
// Where the tree opens and the logo returns: the reader's own card once they said «Это я», else the root person's.
const home = () => me && shown.has(me) ? me : ROOT;


// ---------- Family branches: the sides of the family, each from one person (usually a grandparent of the root) ----------
// A branch holds its head's ancestors, everyone descended from those ancestors, and the
// husbands and wives who married in; anyone else joins the branch of the relative they hang on.
// The root's own family belongs to every branch. This only arranges the picture; the database has no
// such field. The branches come from data/site.json; their colours, --g-1 … --g-6 of style.css, follow their order.
const GROUPS = (SITE.branches || []).filter(g => inTree.has(g.head)).map((g, i) => ({...g, title: loc(g.title), c: i % 6 + 1}));
// Each branch's colour is also named by its id, so the pages write var(--g-<id>) and var(--g-<id>-ink).
if (globalThis.document) document.documentElement.style.cssText += GROUPS.map(g => `--g-${g.id}:var(--g-${g.c});--g-${g.id}-ink:var(--g-${g.c}-ink);`).join('');
// The colour of anyone outside every branch: the first branch's.
const FIRST_GROUP = GROUPS[0]?.id || '';
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
  // children. The children's own families (a daughter's grandchildren of another surname, in her husband's branch)
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
// The name as said after «отец», «мать», «родители»: «Марии Ивановны Петровой», «Николая Петровича Сидорова».
// Words of the usual endings change; a surname that does not (Шевченко, Черных) stays as written. A name that does not
// split into parts has no such form: null, and the caller says it another way. Russian only: English needs no
// case of a name (null in English too).
const GEN_GIVEN = {Пётр: 'Петра', Павел: 'Павла', Лев: 'Льва'};
function genName(id) {
  const n = nameParts(id);
  if (EN || !n || !n.plain || !/^[А-ЯЁ]/.test(n.plain)) return null;
  const f = sexOf(id) === 'f', soft = w => /[гкхжчшщ]$/.test(w);
  const given = w => {
    if (GEN_GIVEN[w]) return GEN_GIVEN[w];
    if (f) return /ия$/.test(w) ? w.slice(0, -1) + 'и' : /[ья]$/.test(w) ? w.slice(0, -1) + 'и' : /а$/.test(w) ? w.slice(0, -1) + (soft(w.slice(0, -1)) ? 'и' : 'ы') : w;
    return /[йь]$/.test(w) ? w.slice(0, -1) + 'я' : /я$/.test(w) ? w.slice(0, -1) + 'и' : /а$/.test(w) ? w.slice(0, -1) + (soft(w.slice(0, -1)) ? 'и' : 'ы') : /[бвгджзклмнпрстфхцчшщ]$/.test(w) ? w + 'а' : w;
  };
  const patronymic = w => /(вна|чна)$/.test(w) ? w.slice(0, -1) + 'ы' : /ич$/.test(w) ? w + 'а' : w;
  const surname = (w, woman) => !w ? w : woman
    ? (/(ова|ева|ёва|ина|ына)$/.test(w) ? w.slice(0, -1) + 'ой' : /ая$/.test(w) ? w.slice(0, -2) + 'ой' : w)
    : /(ский|цкий)$/.test(w) ? w.slice(0, -2) + 'ого' : /[ыо]й$/.test(w) ? w.slice(0, -2) + 'ого' : /(их|ых)$/.test(w) ? w : /ь$/.test(w) ? w.slice(0, -1) + 'я' : /[бвгджзклмнпрстфхцчшщ]$/.test(w) ? w + 'а' : w;
  const words = n.plain.split(' ');
  const said = [given(words[0]), ...words.slice(1).map(patronymic)].join(' ');
  return [said, surname(n.surname, f)].filter(Boolean).join(' ') + (n.maiden ? ` (${surname(n.maiden, true)})` : '');
}


// ---------- Kinship path: the shortest chain between two people, each link with its reliability ----------
// Sex is read from the name (patronymic, surname or first name); the database has no such field.
// A record may also say it outright (sex: "f" or "m"); then the name is not read.
const FEMALE_NAMES = /^(Анна|Мария|Марья|Агния|Ксения|Вера|Ольга|Наталья|Наталия|Татьяна|Ирина|Елизавета|Клавдия|Светлана|Оксана|Алла|Галина|Надежда|Лидия|Любовь|Антонина|Валентина|Евдокия|Александра|Екатерина|Виктория|Анастасия|Елена|Евгения|Нина|Зинаида|Тамара|Людмила|Раиса|Марина|Юлия|Дарья|Софья|Полина|Пелагея|Прасковья|Аграфена|Акулина|Матрёна|Фёкла|Агафья|Варвара|Ульяна|Василиса|Зоя|Лиза|Паня|Рая|Зульфия|Магдалина|Ангелина|Евлампия|Параска|Алёна)$/;
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
      const cur = best.get(k), down = cur.steps[cur.steps.length - 1]?.move === 'D';
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
  if (!steps.length || steps.some(s => s.move === 'S' || s.move === 'K')) return '';
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
// The words alone, for the line in a card and for the people of «Finds».
function youText(id) {
  id = cid(id);
  if (!me || !inTree.has(id) || id === me) return '';
  const kin = kinOf(me, id);
  if (!kin) return '';
  const {steps, weak, term} = kin, f = sexOf(id) === 'f', maybe = weak <= 2 ? L('вероятно, ', 'probably ') : '';
  return term ? maybe + term : steps.some(s => s.move === 'K') ? L((f ? 'вероятная родственница' : 'вероятный родственник') + ', степень неизвестна', 'probable relative, degree unknown') : EN ? 'relative by marriage' : f ? 'родственница через брак' : 'родственник через брак';
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


// ---------- Focus: one person and their ancestors; hidden branches open by a badge ----------
// The canvas shows the main tree only; records not joined to it open from search as cards.
// With a branch picked, the tree keeps only the people of the visible branches.
const branchPeople = () => {
  const vg = visibleGroups();
  return new Set(allGroupsShown() ? inTree : [...inTree].filter(id => [...shownIn.get(id)].some(g => vg.has(g))));
};
// Side branches start folded. The tree opens on the direct line (the root, all their ancestors and descendants;
// the same for the reader who said «Это я», so their own branch never folds away),
// the brothers and sisters of every ancestor, and whoever stands beside them: husbands and wives, the other parent
// of a half-brother, people linked only as a brother, sister or probable kin. The families of the brothers and
// sisters wait behind a «+N» on their cards (hiddenBadge, expand).
const lineOf = from => {
  const set = new Set(from);
  for (const q = [...from]; q.length;) parentsOf(q.pop()).forEach(x => { if (!set.has(x)) { set.add(x); q.push(x); } });
  for (const q = [...from]; q.length;) lines.filter(l => l.kind === 'child' && l.parents.includes(q.pop())).forEach(l => { if (!set.has(l.b)) { set.add(l.b); q.push(l.b); } });
  return set;
};
function sideFolded(pool) {
  const line = lineOf(me && me !== ROOT ? [ROOT, me] : [ROOT]);
  const core = new Set([...line].filter(x => pool.has(x)));
  lines.forEach(l => { if (l.kind === 'child' && pool.has(l.b) && l.parents.some(x => line.has(x))) core.add(l.b); });
  const vis = new Set(core);
  for (let grew = true; grew;) {
    grew = false;
    const add = x => { if (pool.has(x) && !vis.has(x)) { vis.add(x); grew = true; } };
    lines.forEach(l => {
      if (l.kind === 'child' || l.kind === 'possible_parent') { if (core.has(l.b)) l.parents.forEach(add); }
      else if (vis.has(l.a)) add(l.b); else if (vis.has(l.b)) add(l.a);
    });
  }
  return vis;
}
// Cards opened one step from the start, as if their «+N» had been tapped: "open_at_start" of data/site.json (ids).
const OPEN_AT_START = SITE.open_at_start || [];
// Opening a card shows its relatives, each with their husband or wife beside them; their children wait behind a «+N».
const openStep = (id, set, pool) => relativesOf(id).filter(x => !set.has(x) && (!pool || pool.has(x))).forEach(x => {
  set.add(x);
  lines.forEach(l => { if (l.kind === 'spouse' && (l.a === x || l.b === x)) { const y = l.a === x ? l.b : l.a; if (!pool || pool.has(y)) set.add(y); } });
});
// Two ways to see the tree: everyone at once (the default) or side branches folded; the reader's choice is kept
// in the browser (read in ui.js).
let sideAll = true;
// Someone found or opened in a folded side branch comes onto the tree with the way up to the shown people.
function reveal(id) {
  const pool = branchPeople();
  for (const q = [id]; q.length;) {
    const x = q.pop();
    if (shown.has(x) || !pool.has(x)) continue;
    openStep(x, shown, pool); shown.add(x);
    parentsOf(x).forEach(y => q.push(y));
  }
}
const basePeople = () => {
  const pool = branchPeople();
  if (sideAll) return pool;
  const set = sideFolded(pool);
  OPEN_AT_START.filter(id => set.has(id)).forEach(id => openStep(id, set, pool));
  return set;
};
// What the tree shows now and, if on, the person in focus with their ancestors. ui.js fills shown at the start,
// once the reader's saved choices («Это я», side branches) are read.
let shown = new Set(), focus = null;
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
function relationName(r, me) {
  if (r.kind === 'spouse') return L('Супруг(а)', 'Spouse');
  if (r.kind === 'sibling') return L('Брат или сестра', 'Brother or sister');
  return r.to_id === me ? L('Родитель', 'Parent') : L('Ребёнок', 'Child');
}
