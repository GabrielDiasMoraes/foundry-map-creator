import test from "node:test";
import assert from "node:assert/strict";
import { planToWalls } from "../scripts/walls.mjs";

const plan = (rooms, extra = {}) => ({ cols: 10, rows: 10, rooms, doors: [], windows: [], ...extra });

test("single room has 4 merged walls", () => {
  const w = planToWalls(plan([{ x: 0, y: 0, w: 2, h: 2 }]));
  assert.equal(w.length, 4);
  assert.ok(w.every((s) => s[4] === "wall"));
});

test("adjacent rooms keep a shared wall", () => {
  const w = planToWalls(plan([{ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 0, w: 1, h: 1 }]));
  assert.equal(w.length, 5);
});

test("overlapping rooms merge", () => {
  const w = planToWalls(plan([{ x: 0, y: 0, w: 2, h: 1 }, { x: 1, y: 0, w: 2, h: 1 }]));
  assert.equal(w.length, 4);
});

test("door and window replace a wall piece", () => {
  const w = planToWalls(plan([{ x: 0, y: 0, w: 2, h: 1 }], {
    doors: [{ x: 0, y: 0, side: "n" }],
    windows: [{ x: 1, y: 0, side: "s" }],
  }));
  assert.deepEqual(w.filter((s) => s[4] === "door"), [[0, 0, 1, 0, "door"]]);
  assert.deepEqual(w.filter((s) => s[4] === "window"), [[1, 1, 2, 1, "window"]]);
});
