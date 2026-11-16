import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const lang = JSON.parse(readFileSync("lang/en.json", "utf8")), keys = Object.keys(lang);
const sources = ["templates/editor.hbs", ...readdirSync("scripts").map((f) => `scripts/${f}`)].map((f) => readFileSync(f, "utf8")).join("\n");

// Foundry expands dotted keys into objects, so a key that is a prefix of another breaks the whole file.
test("no key is a prefix of another", () => {
  const bad = keys.flatMap((k) => keys.filter((o) => o.startsWith(`${k}.`)).map((o) => `${k} vs ${o}`));
  assert.deepEqual(bad, []);
});

test("every MC key used in code exists", () => {
  const fixed = [...sources.matchAll(/["'`](MC\.[A-Za-z0-9_.]+)["'`]/g)].map((m) => m[1]);
  assert.deepEqual(fixed.filter((k) => !(k in lang)), []);
  const prefixes = [...sources.matchAll(/["'`](MC\.[A-Za-z0-9_.]+\.)\$\{/g)].map((m) => m[1]);
  assert.ok(prefixes.length > 0);
  assert.deepEqual(prefixes.filter((p) => !keys.some((k) => k.startsWith(p))), []);
});
