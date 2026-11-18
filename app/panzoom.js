// Moving and zooming a surface with a mouse, a trackpad and fingers: the part the tree (tree.js) and the document
// viewer (docs.js) share; the map (map.js) takes the wheel only. Depends on nothing above; touches the page only
// when a surface is attached.
'use strict';

// The wheel and the trackpad. A pinch on the trackpad (Ctrl) and the notches of a mouse wheel (lines, or big steps
// with nothing sideways) zoom at the pointer; a swipe of two fingers moves. The surface says
//   zoomBy(f, x, y)  zoom by the factor f at the point x, y of el;   panBy(dx, dy)  move against the swipe;
//   after()          run after either (the map lays itself out again once the wheel stops);
//   zooms(e), rate   what zooms and how fast, if not as on the tree.
function wheelZoom(el, o) {
  const zooms = o.zooms || (e => e.ctrlKey || e.deltaMode === 1 || Math.abs(e.deltaY) >= 40 && !e.deltaX);
  el.addEventListener('wheel', e => {
    e.preventDefault();
    const r = el.getBoundingClientRect();
    if (zooms(e)) o.zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? .012 : o.rate || .0025)), e.clientX - r.left, e.clientY - r.top);
    else o.panBy(e.deltaX, e.deltaY);
    o.after?.();
  }, {passive: false});
}

// Dragging and pinching, measured from where the gesture started, so nothing drifts. Every pointer down starts a
// gesture g = {start, view, moved, pinch}: the pointer's place, the surface's view {x, y, k} then; the second finger
// down makes it a pinch from the fingers' distance and the zoom then (g.pinch = {d, k}). When a finger lifts and
// another stays, the gesture goes on from where that one is, with the view as it is now. The surface says
//   view()             its view now;   slop  pixels a pointer moves before it counts as a drag (none: at once);
//   down(e, g, n)      a pointer went down, n are down now (the surface may note in g what was under it);
//   pan(e, g, dx, dy)  the pointer moved dx, dy from g.start;   pinch(g, d, x, y)  two fingers d apart, middle x, y;
//   up(e, g, n)        a pointer lifted, n are left (a tap is a gesture that never moved).
function panZoom(el, o) {
  const pointers = new Map();
  let g = null;
  el.addEventListener('pointerdown', e => {
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    g = {moved: false, start: {x: e.clientX, y: e.clientY}, view: {...o.view()}, pinch: null};
    o.down?.(e, g, pointers.size);
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      g.pinch = {d: Math.hypot(p1.x - p2.x, p1.y - p2.y), k: o.view().k};
      g.moved = true;
    }
  });
  el.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId) || !g) return;
    pointers.set(e.pointerId, {x: e.clientX, y: e.clientY});
    const r = el.getBoundingClientRect();
    if (pointers.size >= 2 && g.pinch) {
      const [p1, p2] = [...pointers.values()];
      o.pinch(g, Math.hypot(p1.x - p2.x, p1.y - p2.y), (p1.x + p2.x) / 2 - r.left, (p1.y + p2.y) / 2 - r.top);
      return;
    }
    const dx = e.clientX - g.start.x, dy = e.clientY - g.start.y;
    if (!g.moved && Math.hypot(dx, dy) < (o.slop || 0)) return;
    g.moved = true;
    o.pan(e, g, dx, dy);
  });
  const release = e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    o.up?.(e, g, pointers.size);
    if (pointers.size === 0) g = null;
    else if (g) { const [p] = [...pointers.values()]; g.start = p; g.view = {...o.view()}; g.pinch = null; }
  };
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
}
