import test from "node:test";
import assert from "node:assert/strict";
import { normHex, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from "../scripts/color.mjs";

test("normHex accepts common forms and rejects junk", () => {
  assert.equal(normHex("#ABC"), "#aabbcc");
  assert.equal(normHex("ff6400"), "#ff6400");
  assert.equal(normHex(" #FF6400 "), "#ff6400");
  assert.equal(normHex("#ff64"), null);
  assert.equal(normHex("zzzzzz"), null);
});

test("hex and rgb convert exactly", () => {
  assert.deepEqual(hexToRgb("#ff6400"), [255, 100, 0]);
  assert.equal(rgbToHex(255, 100, 0), "#ff6400");
  assert.equal(rgbToHex(300, -5, 7.4), "#ff0007");
});

test("hex to hsv and back is lossless for every channel step", () => {
  for (const hex of ["#000000", "#ffffff", "#808080", "#ff0000", "#00ff00", "#0000ff", "#6e6e78", "#b5532a", "#123456", "#fedcba"]) {
    const [h, s, v] = rgbToHsv(...hexToRgb(hex));
    assert.equal(rgbToHex(...hsvToRgb(h, s, v)), hex);
  }
  for (let i = 0; i < 256; i += 5) {
    const hex = rgbToHex(i, 255 - i, (i * 7) % 256);
    assert.equal(rgbToHex(...hsvToRgb(...rgbToHsv(...hexToRgb(hex)))), hex);
  }
});
