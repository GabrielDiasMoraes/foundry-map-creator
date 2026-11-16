// Area shapes as polygon loops in grid units. Pure, no Foundry globals.
import { contours, rough } from "./cave.mjs";

const UNIT = {
  rect: [[0, 0], [1, 0], [1, 1], [0, 1]],
  trapezoid: [[0.25, 0], [0.75, 0], [1, 1], [0, 1]],
  triangle: [[0.5, 0], [1, 1], [0, 1]],
  hexagon: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  octagon: [[0.3, 0], [0.7, 0], [1, 0.3], [1, 0.7], [0.7, 1], [0.3, 1], [0, 0.7], [0, 0.3]],
};
export const SHAPES = ["rect", "ellipse", ...Object.keys(UNIT).slice(1)];

const turn = ([u, v], r) => (r === 90 ? [1 - v, u] : r === 180 ? [1 - u, 1 - v] : r === 270 ? [v, 1 - u] : [u, v]);

// Polygon of a box shape. Ellipses use about 0.7 cell per segment for walls (a door is one segment) and 0.3 for drawing.
export function shapePoly(a, fine = false) {
  if (a.shape === "ellipse") {
    const rx = a.w / 2, ry = a.h / 2, n = Math.max(8, Math.round((2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2)) / (fine ? 0.3 : 0.7)));
    return Array.from({ length: n }, (_, i) => { const t = (i / n) * 2 * Math.PI; return [a.x + rx + Math.cos(t) * rx, a.y + ry + Math.sin(t) * ry]; });
  }
  return UNIT[a.shape].map((p) => turn(p, a.rot || 0)).map(([u, v]) => [a.x + u * a.w, a.y + v * a.h]);
}

// Drops points closer than `min` to the previous kept one.
const decimate = (loop, min) => {
  const out = [loop[0]];
  for (const p of loop.slice(1)) if (Math.hypot(p[0] - out.at(-1)[0], p[1] - out.at(-1)[1]) >= min) out.push(p);
  return out.length < 3 ? loop : out;
};

// Closed loops (outer and holes). fine = for drawing; coarse = for walls.
export function areaLoops(a, seed, fine = false) {
  const loops = a.shape === "cells" ? contours(a.cells) : [shapePoly(a, fine)];
  return a.rough ? loops.map((l) => rough(l, seed)).map((l) => (fine ? l : decimate(l, 0.4))) : loops;
}

// Even-odd, so holes work.
export function inPoly(loops, x, y) {
  let c = false;
  for (const l of loops) for (let i = 0, j = l.length - 1; i < l.length; j = i++) {
    const [xi, yi] = l[i], [xj, yj] = l[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export const bbox = (loops) => {
  const pts = loops.flat();
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
};
