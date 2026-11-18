// Where every card stands and how every line runs: dagre places the blocks, then rows are reordered and lines
// routed. Pure; depends on core.js, family.js and the global dagre (vendor/dagre.min.js).
'use strict';
const W = 200, H = 72, SG = 34, SV = 34, KIDS_MIN = 4;
let kidBlocks = new Map();
const pos = new Map();
// Spouses form one block, so couples always stand side by side; dagre then places the
// blocks in generations with as few crossings as it can.
function layout(shown, lines) {
  const spouses = new Map([...shown].map(i => [i, []]));
  const link = (a, b) => { if (!spouses.get(a).includes(b)) { spouses.get(a).push(b); spouses.get(b).push(a); } };
  lines.filter(l => l.kind === 'spouse').forEach(l => link(l.a, l.b));
  // Parents of a common child stand together even when no marriage record exists.
  lines.filter(l => l.kind === 'child' && l.parents.length === 2).forEach(l => link(...l.parents));
  // A family's children with no family of their own on the tree (see leafKids) stand in one block under their
  // parents, two or three to a row, so a large family no longer stretches its generation sideways. The lower
  // rows of a block take their line down a spine beside it (see routeLines).
  const gridCols = n => n <= 4 ? 2 : 3;
  const groupOf = new Map(), groups = [], vertical = new Set(), colsOf = new Map();
  kidBlocks.forEach(items => {
    colsOf.set(groups.length, gridCols(items.length));
    vertical.add(groups.length); items.forEach(id => groupOf.set(id, groups.length)); groups.push(items);
  });
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
  groups.forEach((m, i) => g.setNode('g' + i, vertical.has(i)
    ? {width: colsOf.get(i) * W + (colsOf.get(i) - 1) * SG, height: Math.ceil(m.length / colsOf.get(i)) * (H + SV) - SV}
    : {width: m.length * W + (m.length - 1) * SG, height: H}));
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
  // Dagre centres every block on its generation's middle; all of them stand on the generation's top
  // instead, so a column hangs down from the row and the cards beside it stay in line.
  const rowTop = new Map();
  groups.forEach((_, i) => { const n = g.node('g' + i); rowTop.set(n.y, Math.min(rowTop.get(n.y) ?? Infinity, n.y - n.height / 2)); });
  const put = i => {
    const n = g.node('g' + i), left = centers[i] - n.width / 2, row = rowTop.get(n.y);
    const cols = colsOf.get(i), grid = {x0: left, x1: left + n.width};
    groups[i].forEach((id, j) => pos.set(id, vertical.has(i) ? {x: left + j % cols * (W + SG), y: row + Math.floor(j / cols) * (H + SV), row, stack: i, grid}
      : {x: left + j * (W + SG), y: row, row}));
  };
  groups.forEach((_, i) => put(i));
  // A couple stands with each spouse on the side of their own parents, so the two lines don't cross.
  const parentX = id => {
    const xs = parentsOf(id, lines, ['child']).filter(x => pos.has(x)).map(x => pos.get(x).x);
    return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
  };
  groups.map((m, i) => i).sort((a, b) => g.node('g' + a).y - g.node('g' + b).y).forEach(i => {
    const m = groups[i];
    if (m.length < 2 || vertical.has(i)) return;
    const first = parentX(m[0]), last = parentX(m[m.length - 1]);
    if (first !== null && last !== null && first > last) { m.reverse(); put(i); }
  });
  const minX = Math.min(...[...pos.values()].map(p => p.x)), minY = Math.min(...[...pos.values()].map(p => p.y));
  pos.forEach(p => { p.x -= minX; p.y -= minY; p.row -= minY; });
  new Set([...pos.values()].map(p => p.grid).filter(Boolean)).forEach(b => { b.x0 -= minX; b.x1 -= minX; });
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
  // The lower rows of a block of children take their line down a spine just beside the block, on the side
  // of the parents, then along the gap above their row.
  const lower = c => c.stack !== undefined && c.y > c.row;
  const spineOf = (f, c) => {
    const own = f.anchors.reduce((s, a) => s + a.x, 0) / f.anchors.length;
    return own < (c.grid.x0 + c.grid.x1) / 2 ? c.grid.x0 - 16 : c.grid.x1 + 16;
  };
  families.forEach(f => f.children.forEach(l => {
    const c = pos.get(l.b), cx = c.x + W / 2;
    if (lower(c)) return dropX.set(l, spineOf(f, c));
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
      if (lower(c) && !f.anchors.some(a => a.y >= barY))
        l.d = f.joint + f.anchors.map(a => `M${a.x},${a.y} V${barY} H${cx}`).join(' ') + ` M${cx},${barY} V${c.y - SV / 2} H${c.x + W / 2} V${c.y}`;
      else if (f.anchors.some(a => a.y >= barY)) {
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
// Children with no family of their own on the tree: no spouse, no children, no other line, nobody out of view
// (such a card carries a branch pill or a «+N»). From KIDS_MIN of them in one family they stand in a block (layout),
// eldest first.
function leafKids(set, ls) {
  const kids = new Map();
  ls.filter(l => l.kind === 'child').forEach(l => {
    if (ls.filter(m => m.kind === 'child' && m.b === l.b).length !== 1 || !relativesOf(l.b).every(x => set.has(x) && l.parents.includes(x))) return;
    const key = l.parents.slice().sort().join('+');
    if (!kids.has(key)) kids.set(key, []);
    kids.get(key).push(l.b);
  });
  return new Map([...kids].filter(([, ks]) => ks.length >= KIDS_MIN)
    .map(([key, ks]) => [key, ks.map((id, k) => [bornYear(P.get(id)) || 9999, k, id]).sort((a, b) => a[0] - b[0] || a[1] - b[1]).map(e => e[2])]));
}
// The picture of the given people: the lines among them, a place for every card (pos) and the route of every line
// (its d). Returns those lines and the size of the picture; drawing them is tree.js's part (renderTree).
function layoutTree(set) {
  const ls = visibleLines(set);
  kidBlocks = leafKids(set, ls);
  pos.clear();
  if (set.size) layout(set, ls);
  const xs = [...pos.values()];
  const bounds = {w: Math.max(...xs.map(p => p.x + W)), h: Math.max(...xs.map(p => p.y + H))};
  routeLines(ls); jumpCrossings(ls);
  return {ls, bounds};
}
