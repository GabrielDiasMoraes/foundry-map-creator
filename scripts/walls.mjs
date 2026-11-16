// Pure geometry, no Foundry globals, so it can be tested with node.
import { areaLoops, inPoly, bbox } from "./shapes.mjs";

const EPS = 1e-9;
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const segDist = (x, y, [x1, y1, x2, y2]) => {
  const dx = x2 - x1, dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - x1 - t * dx, y - y1 - t * dy);
};
const onBoundary = (loops, m) => loops.some((l) => l.some((p, i) => segDist(m[0], m[1], [...p, ...l[(i + 1) % l.length]]) < 1e-6));

// Parameters t in (0,1) where edge p->q crosses or touches the loops (collinear overlaps add the other endpoints).
function cuts(p, q, loops, out) {
  const d = [q[0] - p[0], q[1] - p[1]];
  for (const l of loops) for (let i = 0; i < l.length; i++) {
    const r = l[i], s = l[(i + 1) % l.length], e = [s[0] - r[0], s[1] - r[1]], rp = [r[0] - p[0], r[1] - p[1]];
    const den = d[0] * e[1] - d[1] * e[0];
    if (Math.abs(den) < EPS) {
      if (Math.abs(rp[0] * d[1] - rp[1] * d[0]) < EPS) {
        for (const o of [r, s]) { const t = ((o[0] - p[0]) * d[0] + (o[1] - p[1]) * d[1]) / (d[0] * d[0] + d[1] * d[1]); if (t > EPS && t < 1 - EPS) out.push(t); }
      }
      continue;
    }
    const t = (rp[0] * e[1] - rp[1] * e[0]) / den, u = (rp[0] * d[1] - rp[1] * d[0]) / den;
    if (t > EPS && t < 1 - EPS && u >= -EPS && u <= 1 + EPS) out.push(t);
  }
}

// Straight pieces point from the smaller to the larger corner, so touching pieces can be merged.
const norm = (p) => (p[0] > p[2] + EPS || (Math.abs(p[0] - p[2]) < EPS && p[1] > p[3] + EPS) ? [p[2], p[3], p[0], p[1], ...p.slice(4)] : p);

function mergeStraight(list) {
  const out = list.map(norm);
  for (let again = true; again;) {
    again = false;
    for (let i = 0; i < out.length && !again; i++) for (let j = i + 1; j < out.length && !again; j++) {
      const a = out[i], b = out[j];
      if (a[5] !== b[5]) continue;
      const da = [a[2] - a[0], a[3] - a[1]], db = [b[2] - b[0], b[3] - b[1]], la = Math.hypot(...da), lb = Math.hypot(...db);
      if (Math.abs(da[0] * db[1] - da[1] * db[0]) / (la * lb) > 1e-7) continue;
      if (Math.abs(da[0] * (b[1] - a[1]) - da[1] * (b[0] - a[0])) / la > 1e-7) continue;
      const near = (x1, y1, x2, y2) => Math.hypot(x1 - x2, y1 - y2) < 1e-7;
      if (near(a[2], a[3], b[0], b[1])) out[i] = [a[0], a[1], b[2], b[3], "wall", a[5], false];
      else if (near(b[2], b[3], a[0], a[1])) out[i] = [b[0], b[1], a[2], a[3], "wall", a[5], false];
      else continue;
      out.splice(j, 1); again = true;
    }
  }
  return out;
}

// Replaces up to 1 cell of the nearest straight wall near the point with a door or window.
function carve(list, pt, kind) {
  let best = -1, bd = 0.6;
  list.forEach((p, i) => { if (p[4] === "wall" && !p[6]) { const d = segDist(pt.x, pt.y, p); if (d < bd) { bd = d; best = i; } } });
  if (best < 0) return;
  const [x1, y1, x2, y2, , theme, rough] = list[best], L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  let c = (pt.x - x1) * ux + (pt.y - y1) * uy;
  if (Math.abs(uy) < EPS) c = (Math.floor(x1 + ux * c) + 0.5 - x1) / ux; // snap to cell centers on axis-aligned walls
  else if (Math.abs(ux) < EPS) c = (Math.floor(y1 + uy * c) + 0.5 - y1) / uy;
  const w = Math.min(1, L);
  c = Math.min(L - w / 2, Math.max(w / 2, c));
  const at = (s) => [x1 + ux * s, y1 + uy * s];
  list.splice(best, 1, ...[[0, c - w / 2, "wall"], [c - w / 2, c + w / 2, kind], [c + w / 2, L, "wall"]]
    .filter(([a, b]) => b - a > 1e-6).map(([a, b, k]) => [...at(a), ...at(b), k, theme, rough]));
}

let memo = { key: "", value: null };

// Loops and wall pieces [x1,y1,x2,y2,kind,theme,rough]. Closed areas that overlap are one space: edges inside
// another closed area are dropped, and an edge shared with a later area is kept once, from the later one.
export function geometry(plan) {
  const key = JSON.stringify([plan.seed, plan.cols, plan.rows, plan.areas, plan.lines, plan.doors, plan.windows]);
  if (memo.key === key) return memo.value;
  const areas = plan.areas.map((a, i) => {
    const coarse = areaLoops(a, plan.seed);
    return { a, i, coarse, fine: areaLoops(a, plan.seed, true), box: bbox(coarse) };
  });
  const closed = areas.filter((o) => !o.a.open);
  const near = (P, Q) => P.box[0] <= Q.box[2] + 1e-6 && Q.box[0] <= P.box[2] + 1e-6 && P.box[1] <= Q.box[3] + 1e-6 && Q.box[1] <= P.box[3] + 1e-6;
  const dropped = (P, m) => closed.some((Q) => {
    if (Q === P || m[0] < Q.box[0] - 1e-6 || m[0] > Q.box[2] + 1e-6 || m[1] < Q.box[1] - 1e-6 || m[1] > Q.box[3] + 1e-6) return false;
    return onBoundary(Q.coarse, m) ? Q.i > P.i : inPoly(Q.coarse, m[0], m[1]);
  });

  const walls = [];
  for (const P of closed) for (const loop of P.coarse) for (let i = 0; i < loop.length; i++) {
    const p = loop[i], q = loop[(i + 1) % loop.length], ts = [0, 1];
    for (const Q of closed) if (Q !== P && near(P, Q)) cuts(p, q, Q.coarse, ts);
    ts.sort((x, y) => x - y);
    for (let j = 0; j < ts.length - 1; j++) {
      if (ts[j + 1] - ts[j] < EPS || dropped(P, lerp(p, q, (ts[j] + ts[j + 1]) / 2))) continue;
      const a = lerp(p, q, ts[j]), b = lerp(p, q, ts[j + 1]);
      walls.push([a[0], a[1], b[0], b[1], "wall", P.a.theme, !!P.a.rough]);
    }
  }
  (plan.lines || []).forEach((l) => walls.push([l.x1, l.y1, l.x2, l.y2, "wall", null, false]));
  const pieces = [...mergeStraight(walls.filter((w) => !w[6])), ...walls.filter((w) => w[6])];
  (plan.doors || []).forEach((d) => carve(pieces, d, "door"));
  (plan.windows || []).forEach((d) => carve(pieces, d, "window"));
  return (memo = { key, value: { areas, pieces } }).value;
}

export const planToWalls = (plan) => geometry(plan).pieces;

export const hasStraightWall = (plan, x, y) => geometry(plan).pieces.some((p) => p[4] === "wall" && !p[6] && segDist(x, y, p) < 0.6);
