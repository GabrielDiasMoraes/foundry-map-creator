import test from "node:test";
import assert from "node:assert/strict";
import { contours, smooth, rough, grow } from "../scripts/cave.mjs";

test("one cell is one loop of 4 points", () => {
  const l = contours([[0, 0]]);
  assert.equal(l.length, 1);
  assert.equal(l[0].length, 4);
});

test("two adjacent cells are one loop", () => {
  assert.equal(contours([[0, 0], [1, 0]]).length, 1);
});

test("diagonal cells stay separate", () => {
  assert.equal(contours([[0, 0], [1, 1]]).length, 2);
});

test("a ring gives an outer loop and a hole", () => {
  const ring = [];
  for (let x = 0; x < 3; x++) for (let y = 0; y < 3; y++) if (x !== 1 || y !== 1) ring.push([x, y]);
  assert.equal(contours(ring).length, 2);
});

test("smooth and rough stay close to the border", () => {
  const loop = contours([[0, 0]])[0];
  for (const l of [smooth(loop, 7), rough(loop, 7)]) for (const [x, y] of l) assert.ok(x > -0.3 && x < 1.3 && y > -0.3 && y < 1.3);
  assert.ok(rough(loop, 7).length > smooth(loop, 7).length);
});

test("grow is deterministic and stays near the cave", () => {
  const cells = [];
  for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) cells.push([x, y]);
  const a = grow(cells, 3);
  assert.deepEqual(a, grow(cells, 3));
  assert.ok(a.length > 0 && a.every(([x, y]) => x >= -1 && x <= 6 && y >= -1 && y <= 6));
});
