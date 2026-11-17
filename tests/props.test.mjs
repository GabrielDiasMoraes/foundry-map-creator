import test from "node:test";
import assert from "node:assert/strict";
import { PROPS, colorOf, slotEntries, variantOf } from "../scripts/props.mjs";
import { THEMES } from "../scripts/themes.mjs";

const style = THEMES.dungeon.style;

test("declared slots come first, palette colors become implicit slots", () => {
  assert.deepEqual(slotEntries(PROPS.chest).map((s) => s.id), ["body", "lid", "metal"]);
  assert.deepEqual(slotEntries(PROPS.stairs).map((s) => s.id), ["stone"]);
});

test("slot default follows the palette, override wins, shade stays on top", () => {
  assert.equal(colorOf("lid", style, PROPS.chest), colorOf("wood-20", style));
  assert.equal(colorOf("lid", style, PROPS.chest, { lid: "#ff0000" }), "#ff0000");
  assert.equal(colorOf("metal+20", style, PROPS.chest, { metal: "#000000" }), "#333333");
});

test("recoloring one slot leaves the others alone", () => {
  const over = { lid: "#c00000" };
  for (const t of ["body", "metal", "metal+20"]) assert.equal(colorOf(t, style, PROPS.chest, over), colorOf(t, style, PROPS.chest));
});

test("every built-in prop color resolves to a color", () => {
  for (const d of Object.values(PROPS)) for (const q of d.shapes) {
    const tok = q[0] === "l" ? q[5] : q.at(-1);
    assert.match(colorOf(tok, style, d), /^#[0-9a-f]{6,8}$/, `${d.id} ${tok}`);
  }
});

test("a variant keeps the shapes, takes the colors and leaves the original alone", () => {
  const v = variantOf(PROPS.chest, { lid: "#c00000" }, "Red chest", "dungeon");
  assert.equal(v.name, "Red chest");
  assert.deepEqual([v.slots.lid, v.slots.body, v.slots.metal], ["#c00000", "wood", "metal"]);
  assert.match(v.id, /^c-/);
  assert.equal(PROPS.chest.slots.lid, "wood-20");
});

test("see-through slot colors keep their alpha and a copy keeps the flat list", () => {
  assert.equal(colorOf("wash", style, PROPS.pond).length, 9);
  assert.equal(colorOf("water-12", style, { slots: { water: "#3a7ca580" } }).length, 9);
  assert.deepEqual(variantOf(PROPS.campfire, {}, "Copy", "cave").flat, PROPS.campfire.flat);
  assert.ok(variantOf(PROPS.pond, {}, "Copy", "oriental").slots.wash, "copies keep every slot");
});
