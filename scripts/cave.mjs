// Pure helpers for organic cave outlines. Cells are [x, y] in grid units.
import { hashRnd } from "./rng.mjs";

const key = (x, y) => `${x},${y}`;

// Closed loops (outer edges and holes) along the cell borders.
export function contours(cells) {
  const S = new Set(cells.map(([x, y]) => key(x, y)));
  const out = new Map(); // start vertex -> [[endX, endY]]
  const add = (x1, y1, x2, y2) => {
    const k = key(x1, y1);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push([x2, y2]);
  };
  for (const [x, y] of cells) {
    if (!S.has(key(x, y - 1))) add(x, y, x + 1, y);
    if (!S.has(key(x + 1, y))) add(x + 1, y, x + 1, y + 1);
    if (!S.has(key(x, y + 1))) add(x + 1, y + 1, x, y + 1);
    if (!S.has(key(x - 1, y))) add(x, y + 1, x, y);
  }
  const loops = [];
  for (const [startKey, ends] of out) {
    while (ends.length) {
      const [sx, sy] = startKey.split(",").map(Number);
      const loop = [[sx, sy]];
      let [cx, cy] = ends.pop();
      let dx = cx - sx, dy = cy - sy;
      while (cx !== sx || cy !== sy) {
        loop.push([cx, cy]);
        const opts = out.get(key(cx, cy));
        // At a diagonal touch, turn right so the two cells stay separate loops.
        const i = Math.max(0, opts.findIndex(([ex, ey]) => ex - cx === -dy && ey - cy === dx));
        const [nx, ny] = opts.splice(i, 1)[0];
        dx = nx - cx; dy = ny - cy; cx = nx; cy = ny;
      }
      loops.push(loop);
    }
  }
  return loops;
}

// Jitter each vertex, then round with 2 Chaikin passes. Seeded per vertex, so edits elsewhere do not change this shape.
export function smooth(loop, seed) {
  let pts = loop.map(([x, y]) => {
    const r = hashRnd(seed, Math.round(x * 4), Math.round(y * 4));
    return [x + (r() - 0.5) * 0.5, y + (r() - 0.5) * 0.5];
  });
  for (let pass = 0; pass < 2; pass++) {
    pts = pts.flatMap((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return [[p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]];
    });
  }
  return pts;
}

// Irregular walls for any loop: subdivide to about 0.5 cell, then jitter and round.
export function rough(loop, seed) {
  const pts = loop.flatMap((p, i) => {
    const q = loop[(i + 1) % loop.length], n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 0.5));
    return Array.from({ length: n }, (_, k) => [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
  });
  return smooth(pts, seed);
}

// Roughens the edge: random erosion and growth, then one smoothing pass. Deterministic per seed.
export function grow(cells, seed) {
  if (!cells.length) return cells;
  const S = new Set(cells.map(([x, y]) => key(x, y)));
  const n8 = (set, x, y) => { let c = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && set.has(key(x + dx, y + dy))) c++; return c; };
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const next = new Set();
  for (let x = Math.min(...xs) - 1; x <= Math.max(...xs) + 1; x++) for (let y = Math.min(...ys) - 1; y <= Math.max(...ys) + 1; y++) {
    const c = n8(S, x, y), r = hashRnd(seed, x, y)();
    if (S.has(key(x, y)) ? !(c < 7 && r < 0.35) : c >= 3 && r < 0.35) next.add(key(x, y));
  }
  return [...next].filter((k) => { const [x, y] = k.split(",").map(Number); return n8(next, x, y) >= 3; }).map((k) => k.split(",").map(Number));
}
