import test from "node:test";
import assert from "node:assert/strict";
import { THEMES, loadWorld, styleOf, themeList, baseOf, isCustomTheme } from "../scripts/themes.mjs";
import { PROPS, propsFor, reloadCustom } from "../scripts/props.mjs";

const world = {
  wasteland: { style: { ...THEMES.wasteland.style, floor: "#123456" } },
  bunker: {
    name: "Bunker", from: "wasteland", style: { ...THEMES.wasteland.style, floor: "#654321" },
    props: [{ id: "c-1", name: "Thing", w: 1, h: 1, shapes: [["r", 0, 0, 1, 1, "c1"]], slots: { c1: "wood" } }],
  },
};

test("saved palette overrides the preset and the preset can be forced", () => {
  loadWorld(world);
  assert.equal(styleOf("wasteland").floor, "#123456");
  assert.equal(styleOf("wasteland", true).floor, THEMES.wasteland.style.floor);
  assert.equal(styleOf("bunker").floor, "#654321");
  assert.equal(styleOf("dungeon").floor, THEMES.dungeon.style.floor);
  loadWorld({});
  assert.equal(styleOf("wasteland").floor, THEMES.wasteland.style.floor);
});

test("custom themes are listed, named and based on a preset", () => {
  loadWorld(world);
  assert.ok(themeList().some((t) => t.key === "bunker" && t.name === "Bunker"));
  assert.equal(baseOf("bunker"), "wasteland");
  assert.ok(isCustomTheme("bunker") && !isCustomTheme("wasteland"));
  loadWorld({});
});

test("custom props show only in their theme, built-ins follow the base preset", () => {
  loadWorld(world); reloadCustom(world);
  const ids = (t) => propsFor(t).map((d) => d.id);
  assert.ok(ids("bunker").includes("c-1") && ids("bunker").includes("car"));
  assert.ok(!ids("wasteland").includes("c-1") && !ids("dungeon").includes("c-1"));
  loadWorld({}); reloadCustom({});
  assert.ok(!("c-1" in PROPS));
});
