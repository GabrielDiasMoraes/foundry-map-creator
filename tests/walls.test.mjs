import test from "node:test";
import assert from "node:assert/strict";
import { planToWalls } from "../scripts/walls.mjs";
import { shapePoly } from "../scripts/shapes.mjs";

const plan = (areas, extra = {}) => ({ cols: 12, rows: 12, seed: 1, areas, lines: [], doors: [], windows: [], ...extra });
const rect = (x, y, w, h, extra = {}) => ({ shape: "rect", x, y, w, h, theme: "dungeon", ...extra });
const kinds = (w, k) => w.filter((s) => s[4] === k);
// Every endpoint is shared by exactly two pieces: a closed outline.
const closed = (w) => {
  const n = new Map();
  for (const s of w) for (const k of [`${s[0].toFixed(5)},${s[1].toFixed(5)}`, `${s[2].toFixed(5)},${s[3].toFixed(5)}`]) n.set(k, (n.get(k) || 0) + 1);
  return [...n.values()].every((v) => v === 2);
};

test("single room has 4 walls", () => {
  assert.equal(planToWalls(plan([rect(0, 0, 2, 2)])).length, 4);
});

test("adjacent rooms share one wall", () => {
  assert.equal(planToWalls(plan([rect(0, 0, 1, 1), rect(1, 0, 1, 1)])).length, 5);
});

test("overlapping rooms merge", () => {
  assert.equal(planToWalls(plan([rect(0, 0, 2, 1), rect(1, 0, 2, 1)])).length, 4);
});

test("nested rooms sharing an edge keep one wall", () => {
  const w = planToWalls(plan([rect(0, 0, 4, 4), rect(0, 0, 2, 2)]));
  assert.equal(w.length, 4);
  assert.ok(w.every((s) => Math.hypot(s[2] - s[0], s[3] - s[1]) === 4));
});

test("open areas have no walls but neighbors keep theirs", () => {
  assert.equal(planToWalls(plan([rect(0, 0, 3, 3, { open: true })])).length, 0);
  assert.equal(planToWalls(plan([rect(0, 0, 3, 3, { open: true }), rect(1, 1, 1, 1)])).length, 4);
});

test("door and window carve one cell", () => {
  const w = planToWalls(plan([rect(0, 0, 2, 1)], { doors: [{ x: 0.5, y: 0.1 }], windows: [{ x: 1.5, y: 0.9 }] }));
  assert.deepEqual(kinds(w, "door").map((s) => s.slice(0, 5)), [[0, 0, 1, 0, "door"]]);
  assert.deepEqual(kinds(w, "window").map((s) => s.slice(0, 5)), [[1, 1, 2, 1, "window"]]);
  assert.equal(w.length, 6);
});

test("door far from any wall is ignored", () => {
  assert.equal(kinds(planToWalls(plan([rect(0, 0, 4, 4)], { doors: [{ x: 2, y: 2 }] })), "door").length, 0);
});

test("irregular walls take no doors", () => {
  const w = planToWalls(plan([rect(2, 2, 4, 4, { rough: true })], { doors: [{ x: 4, y: 2 }] }));
  assert.equal(kinds(w, "door").length, 0);
  assert.ok(closed(w));
});

test("ellipse walls are short and closed", () => {
  const w = planToWalls(plan([{ shape: "ellipse", x: 1, y: 1, w: 6, h: 6, theme: "dungeon" }]));
  assert.ok(w.length >= 24 && w.every((s) => Math.hypot(s[2] - s[0], s[3] - s[1]) <= 0.8));
  assert.ok(closed(w));
});

test("cave cells with irregular walls make a closed outline", () => {
  const w = planToWalls(plan([{ shape: "cells", cells: [[2, 2], [3, 2], [2, 3]], rough: true, theme: "cave" }]));
  assert.ok(w.length > 4 && w.every((s) => s[6]));
  assert.ok(closed(w));
});

test("free lines pass through", () => {
  const w = planToWalls(plan([], { lines: [{ x1: 0, y1: 0, x2: 3, y2: 0 }] }));
  assert.deepEqual(w[0].slice(0, 5), [0, 0, 3, 0, "wall"]);
});

test("trapezoid rotates inside its box", () => {
  assert.deepEqual(shapePoly({ shape: "trapezoid", x: 0, y: 0, w: 4, h: 2, rot: 90 }), [[4, 0.5], [4, 1.5], [0, 2], [0, 0]]);
});
