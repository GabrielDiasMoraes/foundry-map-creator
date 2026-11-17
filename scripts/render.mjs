import { geometry } from "./walls.mjs";
import { inPoly } from "./shapes.mjs";
import { paintCell } from "./patterns.mjs";
import { drawProp, PROPS } from "./props.mjs";
import { styleFor } from "./themes.mjs";

const trace = (ctx, loops, px) => {
  ctx.beginPath();
  for (const l of loops) { l.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * px, y * px)); ctx.closePath(); }
};
const SAMPLES = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.5, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]];

// Open areas first, then closed ones, each in drawing order.
const drawOrder = (g) => [...g.areas.filter((o) => o.a.open), ...g.areas.filter((o) => !o.a.open)];

// Style of the topmost area under a point, else the base theme.
function styleAt(plan, g, x, y) {
  const o = drawOrder(g).findLast((q) => inPoly(q.fine, x, y));
  return styleFor(plan, o?.a.theme);
}

// Draws the plan on a 2D context. Same function for the preview and the final PNG, only px (pixels per cell) differs.
export function render(plan, ctx, px, { guides = false } = {}) {
  const { cols, rows, seed } = plan, g = geometry(plan);
  ctx.fillStyle = plan.bg;
  ctx.fillRect(0, 0, cols * px, rows * px);
  if (guides) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= cols; x++) { ctx.moveTo(x * px, 0); ctx.lineTo(x * px, rows * px); }
    for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * px); ctx.lineTo(cols * px, y * px); }
    ctx.stroke();
  }

  // Floors: each area is clipped to its outline and painted with its own theme.
  for (const { a, fine, box } of drawOrder(g)) {
    const s = styleFor(plan, a.theme);
    // Cave areas: the outline stays within a cell of the brush cells, so test cells by lookup instead of by polygon.
    const near = a.cells && new Set(a.cells.flatMap(([cx, cy]) => [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => `${cx + dx},${cy + dy}`))));
    ctx.save(); trace(ctx, fine, px); ctx.clip("evenodd");
    for (let x = Math.max(0, Math.floor(box[0]) - 1); x < Math.min(cols, Math.ceil(box[2]) + 1); x++) {
      for (let y = Math.max(0, Math.floor(box[1]) - 1); y < Math.min(rows, Math.ceil(box[3]) + 1); y++) {
        if (near ? near.has(`${x},${y}`) : SAMPLES.some(([u, v]) => inPoly(fine, x + u, y + v))) paintCell(ctx, x, y, px, seed, s, a.open ? s.outside : s.floor, a.open ? s.outsidePattern : s.pattern);
      }
    }
    if (a.rough && !a.open) { trace(ctx, fine, px); ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = px * 0.5; ctx.lineJoin = "round"; ctx.stroke(); } // inner shade
    ctx.restore();
  }

  // One path per theme, so overlapping alpha strokes do not darken the joints.
  const byTheme = (pred) => {
    const m = new Map();
    for (const p of g.pieces) if (pred(p)) m.set(p[5], [...(m.get(p[5]) || []), p]);
    return m;
  };
  const stroke = (ps, color, w, cap) => {
    ctx.beginPath();
    for (const p of ps) { ctx.moveTo(p[0] * px, p[1] * px); ctx.lineTo(p[2] * px, p[3] * px); }
    ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = cap; ctx.lineJoin = "round"; ctx.stroke();
  };
  const roughWalls = byTheme((p) => p[4] === "wall" && p[6]), straight = byTheme((p) => p[4] === "wall" && !p[6]);
  for (const [t, ps] of roughWalls) stroke(ps, "rgba(0,0,0,0.3)", styleFor(plan, t).wallWidth * px * 3.5, "round"); // halo

  const props = plan.props.filter((p) => PROPS[p.id]).sort((a, b) => (PROPS[a.id].z ?? 1) - (PROPS[b.id].z ?? 1));
  for (const p of props) drawProp(ctx, p, px, styleAt(plan, g, p.x + 0.5, p.y + 0.5));

  for (const [t, ps] of roughWalls) { const s = styleFor(plan, t); stroke(ps, s.wall, s.wallWidth * px * 1.6, "round"); }
  for (const [t, ps] of straight) { const s = styleFor(plan, t); stroke(ps, s.wall, s.wallWidth * px, "square"); }

  for (const p of g.pieces) {
    if (p[4] === "wall") continue;
    const s = styleFor(plan, p[5]), L = Math.hypot(p[2] - p[0], p[3] - p[1]) * px, t = s.wallWidth * px * (p[4] === "door" ? 1.6 : 1);
    ctx.save();
    ctx.translate(((p[0] + p[2]) / 2) * px, ((p[1] + p[3]) / 2) * px);
    ctx.rotate(Math.atan2(p[3] - p[1], p[2] - p[0]));
    if (p[4] === "door") { ctx.fillStyle = s.door; ctx.fillRect(-L * 0.4, -t / 2, L * 0.8, t); }
    else { ctx.fillStyle = s.wall; ctx.fillRect(-L / 2, -t / 2, L, t); ctx.fillStyle = s.window; ctx.fillRect(-L / 2, -t * 0.25, L, t * 0.5); }
    ctx.restore();
  }
}
