// The ancestors of one person as a fan (the page «Веер предков», fan.js): ring k holds the 2^k places of the k-th
// generation, the father's side on the left, the mother's on the right; each known place has the weakest link of its
// chain from the centre. Pure; depends on core.js and family.js (scripts/test_app.cjs checks it on the real data).
'use strict';

const FAN_MOST = 8;
// One link up, as the tree draws it: a family-testimony link between people the family knows personally is green on
// the tree (lineClass, «Документ эпохи или знакомы лично»), and so it counts as a document of the time here too.
const fanLinkLevel = s => s.rec.status === 'family_testimony' && personalLine(s.line) ? 5 : level(s.rec.status);
// The parents of a card in their places: [the father's place, the mother's place], either may be null. The sex is
// read from the name: exactly one parent read as a woman goes right; two read alike (a pet name may read as a man's)
// keep the order of the data. More than two (never so far): the two of the strongest links.
function fanParents(id) {
  const ups = [];
  kinSteps(cid(id)).filter(s => s.move === 'U').forEach(s => {
    const at = ups.findIndex(u => u.to === s.to);
    if (at < 0) ups.push(s); else if (fanLinkLevel(s) > fanLinkLevel(ups[at])) ups[at] = s;
  });
  const two = ups.length > 2 ? ups.slice().sort((a, b) => fanLinkLevel(b) - fanLinkLevel(a)).slice(0, 2).sort((a, b) => ups.indexOf(a) - ups.indexOf(b)) : ups;
  if (!two.length) return [null, null];
  if (two.length === 1) return sexOf(two[0].to) === 'f' ? [null, two[0]] : [two[0], null];
  const women = two.filter(s => sexOf(s.to) === 'f');
  return women.length === 1 ? [two.find(s => s !== women[0]), women[0]] : two;
}
// fanOf(id) → {id, depth, rings, counts, found, max, missing}. rings[0] is the centre; rings[k] (k = 1…depth) holds a
// place {k, i, id, child, role, weak, link, weakLink} for each parent's place of a person known in ring k − 1: id is
// the ancestor or null (an empty place), i the place in the ring (the father of place i is 2i, the mother 2i + 1),
// role 'f' or 'm' (the father's or the mother's place), weak the level of the weakest link from the centre, weakLink
// that link {from, to, status}. Places above an empty one are not there at all. depth: the ring of the farthest
// known ancestor, at most FAN_MOST. counts: per ring, how many of its 2^k places are known.
// missing: the empty places nearest first, one entry per child — {k, child, roles: ['f'] | ['m'] | ['f', 'm']}.
function fanOf(id, most = FAN_MOST) {
  id = cid(id);
  const rings = [[{k: 0, i: 0, id, child: null, role: null, weak: 5, link: null, weakLink: null}]];
  for (let k = 1; k <= most; k++) {
    const ring = [];
    for (const c of rings[k - 1]) {
      if (!c.id) continue;
      fanParents(c.id).forEach((s, j) => {
        const place = {k, i: c.i * 2 + j, id: null, child: c.id, role: j ? 'm' : 'f', weak: null, link: null, weakLink: null};
        if (s) {
          const lv = fanLinkLevel(s), mine = {from: c.id, to: s.to, status: s.rec.status, level: lv};
          Object.assign(place, {id: s.to, link: s, weak: k === 1 ? lv : Math.min(c.weak, lv), weakLink: k === 1 || lv < c.weak ? mine : c.weakLink});
        }
        ring.push(place);
      });
    }
    if (!ring.some(x => x.id)) break;
    rings.push(ring);
  }
  const depth = rings.length - 1;
  const counts = rings.slice(1).map((ring, n) => ({k: n + 1, found: ring.filter(x => x.id).length, max: 2 ** (n + 1)}));
  const missing = [];
  rings.slice(1).forEach(ring => ring.filter(x => !x.id).forEach(x => {
    const last = missing[missing.length - 1];
    if (last && last.child === x.child && last.k === x.k && last.i === x.i - 1) last.roles.push(x.role);
    else missing.push({k: x.k, i: x.i, child: x.child, roles: [x.role]});
  }));
  return {id, depth, rings, counts, found: counts.reduce((n, c) => n + c.found, 0), max: counts.reduce((n, c) => n + c.max, 0), missing: missing.map(({k, child, roles}) => ({k, child, roles}))};
}
// Whether a fan can be drawn from the card: someone of the tree, not a child under 18, with at least one parent.
const fanCan = id => { id = cid(id); const p = P.get(id); return !!p && inTree.has(id) && !minorChild(p) && fanParents(id).some(Boolean); };
// The names of the generations: «родители», «деды и бабки», «прадеды», «прапрадеды», then «5-е колено»; in English
// parents, grandparents, great-grandparents, great-great-grandparents, then «5th generation» (at most FAN_MOST, 8).
const FAN_RINGS = L(['', 'родители', 'деды и бабки', 'прадеды', 'прапрадеды'], ['', 'parents', 'grandparents', 'great-grandparents', 'great-great-grandparents']);
const fanRingName = k => FAN_RINGS[k] || L(`${k}-е колено`, `${k}th generation`);
// An empty place in words, for «Кого не хватает ближе всего» and the subject of the message: «родители Марии
// Ивановны Петровой», «отец …», «мать …»; a name without a genitive form after a colon. In English «father of …».
function fanMissingText(roles, child) {
  const who = roles.length > 1 ? L('родители', 'parents') : roles[0] === 'f' ? L('отец', 'father') : L('мать', 'mother');
  if (EN) return `${who} of ${sayName(child)}`;
  const of = genName(child);
  return of ? `${who} ${of}` : `${who}: ${sayName(child)}`;
}
