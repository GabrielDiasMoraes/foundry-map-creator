import { baseOf } from "./themes.mjs";

// Props are small lists of shapes in cell units. Colors are style tokens (wood, metal, cloth, stone, accent,
// floor...) with an optional lighten/darken percent ("wood-20", "stone+10"), or a literal "#hex".
// Fields: w,h size in cells; t themes where it shows (default all); f eligible for auto furnish; z 0 = drawn under others.
const R = (x, y, w, h, c) => ["r", x, y, w, h, c];
const E = (x, y, rx, ry, c) => ["e", x, y, rx, ry, c];
const C = (x, y, r, c) => E(x, y, r, r, c);
const P = (pts, c) => ["p", pts, c];
const L = (x1, y1, x2, y2, c, w = 0.05) => ["l", x1, y1, x2, y2, c, w];
const sh = (t, n) => (n < 0 ? `${t}${n}` : `${t}+${n}`);
const ring = (n, cx, cy, rad, f) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return f(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, a); });
// Rotated rectangle, star and lumpy blob as polygons.
const rr = (cx, cy, w, h, a, c) => P([[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [cx + (x * Math.cos(a) - y * Math.sin(a)) / 2, cy + (x * Math.sin(a) + y * Math.cos(a)) / 2]), c);
const star = (cx, cy, n, r1, r2, a0, c) => P(Array.from({ length: n * 2 }, (_, i) => { const a = a0 + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? r2 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; }), c);
const blob = (cx, cy, r, c, n = 9, k = 0) => P(Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, q = r * (0.9 + 0.1 * Math.sin(i * 2.7 + k * 1.3) + 0.05 * Math.cos(i * 4.1 + k)); return [cx + Math.cos(a) * q, cy + Math.sin(a) * q]; }), c);
const D = (id, name, w, h, shapes, o = {}) => ({ id, name, w, h, shapes, ...o });
const BONE = "#e8e0cc", FLAME = "#ffd27a";

const LIST = [
  // Common
  D("stairs", "Stairs", 2, 2, [...Array.from({ length: 8 }, (_, i) => R(0, i * 0.25, 2, 0.25, sh("stone", 14 - i * 4))),
    L(0, 0, 0, 2, "stone-45", 0.06), L(2, 0, 2, 2, "stone-45", 0.06), P([[0.8, 1.55], [1.2, 1.55], [1, 1.85]], "stone-50")]),
  D("spiral", "Spiral stairs", 2, 2, [C(1, 1, 1, "stone-30"),
    ...Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, b = ((i + 1) / 12) * Math.PI * 2;
      return P([[1, 1], [1 + Math.cos(a) * 0.97, 1 + Math.sin(a) * 0.97], [1 + Math.cos(b) * 0.97, 1 + Math.sin(b) * 0.97]], sh("stone", i % 2 ? 10 : -4)); }),
    C(1, 1, 0.18, "metal")]),
  D("ladder", "Ladder", 1, 1, [R(0.18, 0, 0.09, 1, "wood-20"), R(0.73, 0, 0.09, 1, "wood-20"), ...[0.12, 0.3, 0.5, 0.7, 0.88].map((y) => L(0.2, y, 0.8, y, "wood", 0.06))]),
  D("trapdoor", "Trapdoor", 1, 1, [R(0.08, 0.08, 0.84, 0.84, "wood-10"), L(0.08, 0.36, 0.92, 0.36, "wood-35", 0.03), L(0.08, 0.64, 0.92, 0.64, "wood-35", 0.03), C(0.5, 0.5, 0.09, "metal"), C(0.5, 0.5, 0.045, "metal-40")]),
  D("crate", "Crate", 1, 1, [R(0.08, 0.08, 0.84, 0.84, "frame"), R(0.16, 0.16, 0.68, 0.68, "panel"), L(0.16, 0.16, 0.84, 0.84, "cross"), L(0.84, 0.16, 0.16, 0.84, "cross")], { f: 1, slots: { frame: "wood", panel: "wood-12", cross: "wood-30" } }),
  D("barrel", "Barrel", 1, 1, [C(0.5, 0.5, 0.47, "ring"), C(0.5, 0.5, 0.41, "top"), ...[-0.24, -0.12, 0, 0.12, 0.24].map((o) => { const h = Math.sqrt(0.38 * 0.38 - o * o); return L(0.5 + o, 0.5 - h, 0.5 + o, 0.5 + h, "top-24", 0.025); }), C(0.62, 0.4, 0.05, "top-45")], { f: 1, slots: { top: "wood", ring: "metal-10" } }),
  D("chest", "Chest", 1, 1, [R(0.1, 0.2, 0.8, 0.6, "body"), R(0.1, 0.2, 0.8, 0.14, "lid"), R(0.2, 0.2, 0.08, 0.6, "metal"), R(0.72, 0.2, 0.08, 0.6, "metal"), C(0.5, 0.5, 0.06, "metal+20")], { f: 1, slots: { body: "wood", lid: "wood-20", metal: "metal" } }),
  D("table", "Table", 2, 2, [R(0.2, 0.45, 1.6, 1.1, "top"), L(0.2, 1, 1.8, 1, "top-25", 0.03), R(0.3, 0.05, 0.45, 0.32, "chairs"), R(1.25, 0.05, 0.45, 0.32, "chairs"), R(0.3, 1.63, 0.45, 0.32, "chairs"), R(1.25, 1.63, 0.45, 0.32, "chairs")], { f: 1, slots: { top: "wood", chairs: "wood-18" } }),
  D("rug", "Rug", 2, 2, [R(0, 0, 2, 2, "rug"), R(0.1, 0.1, 1.8, 1.8, "trim"), R(0.2, 0.2, 1.6, 1.6, "rug"), C(1, 1, 0.4, "trim")], { z: 0, slots: { rug: "cloth", trim: "accent" } }),
  D("brazier", "Brazier", 1, 1, [...[0.5, 2.6, 4.7].map((a) => rr(0.5 + Math.cos(a) * 0.41, 0.5 + Math.sin(a) * 0.41, 0.2, 0.09, a, "bowl-30")), C(0.5, 0.5, 0.38, "bowl"), C(0.5, 0.5, 0.31, "inner"), C(0.5, 0.5, 0.26, "coal"), star(0.5, 0.5, 7, 0.25, 0.13, 0.3, "fire"), star(0.5, 0.5, 7, 0.14, 0.07, 0.9, "core")], { f: 1, slots: { bowl: "metal-20", inner: "metal-45", coal: "#3a1a12", fire: "accent", core: FLAME } }),
  // Dungeon, house, tavern
  D("pillar", "Pillar", 1, 1, [R(0.06, 0.06, 0.88, 0.88, "stone-30"), R(0.12, 0.12, 0.76, 0.76, "stone-14"), C(0.5, 0.5, 0.36, "stone+4"), C(0.5, 0.5, 0.29, "stone"), C(0.5, 0.5, 0.12, "stone-14")], { f: 1, t: ["dungeon", "infernal", "oriental"] }),
  D("altar", "Altar", 2, 1, [R(0.05, 0.1, 1.9, 0.8, "stone-10"), R(0.12, 0.17, 1.76, 0.66, "stone+8"), C(1, 0.5, 0.16, "accent"), L(0.3, 0.5, 0.7, 0.5, "stone-30", 0.04), L(1.3, 0.5, 1.7, 0.5, "stone-30", 0.04)], { f: 1, t: ["dungeon", "infernal", "oriental"] }),
  D("statue", "Statue", 1, 1, [R(0.08, 0.08, 0.84, 0.84, "stone-30"), R(0.14, 0.14, 0.72, 0.72, "stone-14"), rr(0.24, 0.63, 0.24, 0.11, 0.6, "stone-6"), rr(0.76, 0.63, 0.24, 0.11, -0.6, "stone-6"), E(0.5, 0.55, 0.3, 0.17, "stone"), C(0.5, 0.48, 0.13, "stone+14")], { f: 1, t: ["dungeon", "oriental", "infernal"] }),
  D("bed", "Bed", 1, 2, [R(0.04, 0.04, 0.92, 1.92, "frame"), R(0.1, 0.3, 0.8, 1.6, "blanket"), R(0.1, 0.9, 0.8, 0.1, "blanket-20"), R(0.16, 0.1, 0.68, 0.34, "pillow")], { f: 1, t: ["house", "tavern", "wasteland", "oriental"], slots: { frame: "wood", blanket: "cloth", pillow: "cloth+35" } }),
  D("roundtable", "Round table", 2, 2, [...ring(5, 1, 1, 0.93, (x, y, a) => rr(x, y, 0.36, 0.34, a, "chairs")), ...ring(5, 1, 1, 1.1, (x, y, a) => rr(x, y, 0.08, 0.36, a, "chairs-25")), C(1, 1, 0.72, "top-14"), C(1, 1, 0.66, "top"), ...[-0.4, -0.2, 0, 0.2, 0.4].map((o) => { const h = Math.sqrt(0.64 * 0.64 - o * o); return L(1 - h, 1 + o, 1 + h, 1 + o, "top-22", 0.02); }), C(1, 1, 0.1, "top-35")], { f: 1, t: ["tavern", "house"], slots: { top: "wood", chairs: "wood-18" } }),
  D("hearth", "Hearth", 2, 1, [R(0, 0, 2, 1, "stone-10"), R(0.2, 0.2, 1.6, 0.6, "stone-45"), C(0.7, 0.5, 0.18, "accent"), C(1.3, 0.5, 0.18, "accent"), C(1, 0.5, 0.12, "flame")], { t: ["house", "tavern"], slots: { flame: FLAME } }),
  D("bar", "Bar", 3, 1, [R(0, 0.1, 3, 0.8, "counter"), R(0.05, 0.18, 2.9, 0.64, "top"), C(0.5, 0.5, 0.1, "mugs"), C(1.2, 0.5, 0.1, "mugs"), C(2, 0.45, 0.1, "mugs"), C(2.6, 0.55, 0.1, "mugs")], { t: ["tavern"], slots: { counter: "wood-25", top: "wood", mugs: "metal+10" } }),
  D("bookshelf", "Bookshelf", 2, 1, [R(0, 0.15, 2, 0.7, "wood-25"), ...Array.from({ length: 12 }, (_, i) => R(0.07 + i * 0.155, 0.24, 0.12, 0.52, ["cloth", "accent", "metal", "stone"][i % 4]))], { f: 1, t: ["house", "dungeon"] }),
  D("tree", "Tree", 2, 2, [...ring(9, 1, 1, 0.58, (x, y, a) => C(x, y, 0.4 + 0.03 * Math.sin(a * 2), "leaf-12")), C(1, 1, 0.78, "leaf"), ...ring(5, 1, 1, 0.38, (x, y) => C(x - 0.06, y - 0.06, 0.3, "leaf+9")), C(0.8, 0.8, 0.2, "leaf+20"), C(1.1, 1.05, 0.08, "leaf-30")], { f: 1, t: ["oriental", "house"], slots: { leaf: "#2f5d2a" } }),
  // Cave
  D("stalagmite", "Stalagmite", 1, 1, [blob(0.5, 0.5, 0.45, "stone-32", 11, 4), blob(0.5, 0.5, 0.35, "stone-14", 10, 5), blob(0.48, 0.47, 0.24, "stone", 9, 6), blob(0.45, 0.43, 0.11, "stone+18", 7, 7)], { f: 1, t: ["cave"] }),
  D("mushrooms", "Mushrooms", 1, 1, [E(0.5, 0.6, 0.31, 0.29, "cap-25"), E(0.5, 0.58, 0.27, 0.25, "cap"), E(0.42, 0.5, 0.13, 0.09, "cap+16"), C(0.58, 0.52, 0.055, "spots"), C(0.44, 0.68, 0.05, "spots"), C(0.66, 0.67, 0.042, "spots"), C(0.35, 0.58, 0.035, "spots"), C(0.55, 0.43, 0.03, "spots"),
    C(0.2, 0.24, 0.17, "cap-25"), C(0.2, 0.23, 0.145, "cap"), C(0.15, 0.18, 0.05, "cap+16"), C(0.25, 0.27, 0.03, "spots"), C(0.14, 0.27, 0.025, "spots"),
    C(0.8, 0.2, 0.14, "cap-25"), C(0.8, 0.19, 0.115, "cap"), C(0.77, 0.16, 0.04, "cap+16"), C(0.83, 0.22, 0.025, "spots")], { f: 1, t: ["cave"], slots: { cap: "#c0392b", spots: "#f6efe0" } }),
  D("campfire", "Campfire", 1, 1, [C(0.5, 0.5, 0.47, "ash"), ...[0.3, 2.4, 4.5].map((a) => rr(0.5 + Math.cos(a) * 0.2, 0.5 + Math.sin(a) * 0.2, 0.48, 0.13, a, "wood-12")), ...ring(8, 0.5, 0.5, 0.4, (x, y, a) => C(x, y, 0.085 + 0.02 * Math.sin(a * 3), "stone-8")), star(0.5, 0.5, 8, 0.29, 0.14, 0, "accent"), star(0.5, 0.5, 8, 0.17, 0.08, 0.4, "flame")], { f: 1, t: ["cave", "wasteland", "oriental"], slots: { flame: FLAME, ash: "#3b342d" } }),
  D("rubble", "Rubble", 2, 1, [P([[0.1, 0.8], [0.4, 0.2], [0.7, 0.75]], "stone-10"), P([[0.6, 0.9], [0.95, 0.3], [1.3, 0.85]], "stone"), P([[1.2, 0.7], [1.5, 0.15], [1.9, 0.8]], "stone-18"), P([[0.45, 0.85], [0.8, 0.6], [0.9, 0.9]], "stone+12")], { f: 1, t: ["wasteland", "cave", "dungeon"] }),
  D("bones", "Bones", 2, 1, [L(0.2, 0.3, 1, 0.5, "bone", 0.09), L(0.4, 0.7, 1.3, 0.35, "bone", 0.09), L(1.1, 0.8, 1.8, 0.6, "bone", 0.09), C(0.2, 0.3, 0.07, "bone"), C(1.8, 0.6, 0.07, "bone"), C(1.5, 0.28, 0.2, "bone"), C(1.44, 0.26, 0.04, "eye"), C(1.56, 0.26, 0.04, "eye")], { f: 1, t: ["infernal", "cave", "dungeon"], slots: { bone: BONE, eye: "#222222" } }),
  // Wasteland
  D("car", "Wrecked car", 2, 4, [R(0.1, 0.1, 1.8, 3.8, "body"), R(0.2, 0.9, 1.6, 1.5, "body-25"), R(0.28, 1, 1.44, 0.55, "glass"), R(0.28, 1.75, 1.44, 0.55, "glass"), R(0.2, 0.2, 1.6, 0.6, "rust"), R(0.2, 2.6, 1.6, 1.1, "rust-10"),
    R(-0.02, 0.45, 0.18, 0.55, "tire"), R(1.84, 0.45, 0.18, 0.55, "tire"), R(-0.02, 2.9, 0.18, 0.55, "tire"), R(1.84, 2.9, 0.18, 0.55, "tire")], { t: ["wasteland"], slots: { body: "metal-10", glass: "#2b3a42", rust: "accent", tire: "#1a1a1a" } }),
  D("sandbags", "Sandbags", 2, 1, [...[0.32, 0.98, 1.64].flatMap((x, i) => [R(x - 0.3, 0.13, 0.6, 0.34, i % 2 ? "bag-8" : "bag"), L(x - 0.17, 0.3, x + 0.17, 0.3, "bag-30", 0.02)]), ...[0.65, 1.31].flatMap((x, i) => [R(x - 0.3, 0.53, 0.6, 0.34, i % 2 ? "bag" : "bag-8"), L(x - 0.17, 0.7, x + 0.17, 0.7, "bag-30", 0.02)])], { f: 1, t: ["wasteland"], slots: { bag: "#b59f6b" } }),
  D("terminal", "Terminal", 1, 1, [R(0.08, 0.12, 0.84, 0.76, "case"), R(0.16, 0.18, 0.68, 0.4, "screen"), L(0.22, 0.28, 0.7, 0.28, "glow", 0.04), L(0.22, 0.4, 0.55, 0.4, "glow", 0.04), R(0.2, 0.65, 0.6, 0.16, "keys")], { f: 1, t: ["wasteland"], slots: { case: "metal-25", screen: "#17301f", glow: "#3ddc84", keys: "metal" } }),
  D("drum", "Oil drum", 1, 1, [C(0.5, 0.5, 0.46, "accent-30"), C(0.5, 0.5, 0.4, "accent"), C(0.5, 0.5, 0.31, "accent-14"), C(0.5, 0.5, 0.25, "accent+6"), C(0.38, 0.38, 0.055, "metal"), C(0.6, 0.62, 0.045, "metal-35")], { f: 1, t: ["wasteland"] }),
  D("vaultdoor", "Round door", 3, 3, [C(1.5, 1.5, 1.45, "metal-30"), C(1.5, 1.5, 1.25, "metal"), ...ring(10, 1.5, 1.5, 1.05, (x, y) => C(x, y, 0.09, "metal+25")), C(1.5, 1.5, 0.5, "metal-15"), L(1.5, 1, 1.5, 2, "metal+20", 0.1), L(1, 1.5, 2, 1.5, "metal+20", 0.1), C(1.5, 1.5, 0.18, "accent")], { t: ["wasteland"] }),
  // Oriental
  D("teatable", "Tea table", 2, 2, [R(0.5, 0.5, 1, 1, "wood-10"), R(0.58, 0.58, 0.84, 0.84, "wood+8"), C(1, 1, 0.14, "cup"), C(1, 1, 0.08, "wood-20"), ...[[1, 0.2], [1, 1.8], [0.2, 1], [1.8, 1]].flatMap(([x, y]) => [R(x - 0.21, y - 0.21, 0.42, 0.42, "cloth"), R(x - 0.13, y - 0.13, 0.26, 0.26, "cloth-18")])], { f: 1, t: ["oriental"], slots: { cup: BONE } }),
  D("shrine", "Shrine", 2, 2, [R(0.05, 0.05, 1.9, 1.9, "wood-25"), P([[0.1, 0.1], [1.9, 0.1], [1, 1]], "cloth+5"), P([[1.9, 0.1], [1.9, 1.9], [1, 1]], "cloth-12"), P([[1.9, 1.9], [0.1, 1.9], [1, 1]], "cloth-5"), P([[0.1, 1.9], [0.1, 0.1], [1, 1]], "cloth+14"), C(1, 1, 0.15, "accent")], { t: ["oriental"] }),
  D("screen", "Paper screen", 2, 1, [R(0, 0.35, 2, 0.3, "wood-20"), ...Array.from({ length: 4 }, (_, i) => R(0.05 + i * 0.49, 0.4, 0.45, 0.2, "paper"))], { f: 1, t: ["oriental"], slots: { paper: "#efe3c2" } }),
  D("lantern", "Lantern", 1, 1, [C(0.5, 0.5, 0.48, "flame-45"), R(0.14, 0.14, 0.72, 0.72, "stone-35"), P(ring(8, 0.5, 0.5, 0.4, (x, y) => [x, y]), "stone"), ...ring(8, 0.5, 0.5, 0.4, (x, y) => L(0.5, 0.5, x, y, "stone-28", 0.02)), C(0.5, 0.5, 0.09, "stone+18")], { f: 1, t: ["oriental"], slots: { flame: FLAME } }),
  D("pond", "Koi pond", 3, 2, [E(1.5, 1, 1.45, 0.95, "stone-10"), E(1.5, 1, 1.3, 0.8, "water"), E(1.1, 0.8, 0.35, 0.15, "fish"), P([[1.4, 0.8], [1.7, 0.7], [1.7, 0.9]], "fish"), E(1.9, 1.2, 0.3, 0.13, "fish2"), P([[1.6, 1.2], [1.35, 1.1], [1.35, 1.3]], "fish2"), C(0.8, 1.35, 0.22, "lily")], { z: 0, t: ["oriental"], slots: { water: "#3a7ca5", fish: "#ff8a3d", fish2: "#f2f2f2", lily: "#2f6b3a" } }),
  D("bridge", "Bridge", 1, 3, [R(0.05, 0, 0.9, 3, "wood"), ...[0.5, 1, 1.5, 2, 2.5].map((y) => L(0.05, y, 0.95, y, "wood-25", 0.03)), R(0, 0, 0.1, 3, "accent"), R(0.9, 0, 0.1, 3, "accent")], { t: ["oriental"] }),
  // Infernal
  D("lava", "Lava pool", 3, 2, [E(1.5, 1, 1.45, 0.95, "stone-45"), E(1.5, 1, 1.3, 0.82, "accent"), E(1.4, 0.95, 0.9, 0.5, "accent+25"), E(1.3, 0.9, 0.4, 0.22, "flame")], { z: 0, t: ["infernal", "cave"], slots: { flame: FLAME } }),
  D("spikes", "Spikes", 1, 1, [R(0.05, 0.05, 0.9, 0.9, "stone-35"), ...[0.2, 0.5, 0.8].flatMap((x) => [0.2, 0.5, 0.8].map((y) => P([[x - 0.1, y + 0.1], [x + 0.1, y + 0.1], [x, y - 0.12]], "metal+15")))], { f: 1, t: ["infernal", "dungeon"] }),
  D("cage", "Cage", 2, 2, [R(0.05, 0.05, 1.9, 1.9, "#00000055"), ...Array.from({ length: 8 }, (_, i) => L(0.25 + i * 0.2, 0.05, 0.25 + i * 0.2, 1.95, "metal")), L(0.05, 0.7, 1.95, 0.7, "metal"), L(0.05, 1.3, 1.95, 1.3, "metal"),
    L(0.05, 0.05, 1.95, 0.05, "metal-10", 0.08), L(0.05, 1.95, 1.95, 1.95, "metal-10", 0.08), L(0.05, 0.05, 0.05, 1.95, "metal-10", 0.08), L(1.95, 0.05, 1.95, 1.95, "metal-10", 0.08)], { t: ["infernal", "dungeon"] }),
  D("demon", "Winged statue", 2, 2, [E(1, 1, 0.95, 0.8, "stone-30"), P([[1, 1], [0.05, 0.35], [0.5, 1.4]], "stone-12"), P([[1, 1], [1.95, 0.35], [1.5, 1.4]], "stone-12"), E(1, 1.1, 0.4, 0.5, "stone"), C(1, 0.7, 0.22, "stone+10"), P([[0.82, 0.6], [0.7, 0.2], [0.92, 0.52]], "accent"), P([[1.18, 0.6], [1.3, 0.2], [1.08, 0.52]], "accent")], { t: ["infernal"] }),
];

export const PROPS = Object.fromEntries(LIST.map((d) => [d.id, d]));
export const propSize = (p) => {
  const d = PROPS[p.id];
  return !d ? [1, 1] : (p.rot || 0) % 180 ? [d.h, d.w] : [d.w, d.h];
};

// Built-in props show for their theme (or the preset a custom theme was made from); custom props only in their own theme.
export const propsFor = (theme) => Object.values(PROPS).filter((d) => (d.custom ? d.t[0] === theme : !d.t || d.t.includes(baseOf(theme))));

// Replaces the custom props with the ones saved in the world: { themeKey: { props: [def] } }.
export function reloadCustom(world) {
  for (const id of Object.keys(PROPS)) if (PROPS[id].custom) delete PROPS[id];
  for (const [theme, data] of Object.entries(world || {})) for (const d of data.props || []) PROPS[d.id] = { ...d, custom: true, t: [theme] };
}

const shade = (hex, n) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return "#" + c.map((v) => Math.round(v + (n > 0 ? 255 - v : v) * (n / 100)).toString(16).padStart(2, "0")).join("");
};
const TOKEN = /^([a-z0-9]+?)([+-]\d+)?$/;
const palette = (tok, s) => { if (tok[0] === "#") return tok; const m = TOKEN.exec(tok); return m[2] ? shade(s[m[1]], Number(m[2])) : s[m[1]]; };

// Resolves a shape color: the placed prop's override, else the slot default, else the theme palette; the shade suffix is applied last.
export function colorOf(tok, s, d, over) {
  if (tok[0] === "#") return tok;
  const [, base, n] = TOKEN.exec(tok);
  const c = over?.[base] ?? (d?.slots?.[base] ? palette(d.slots[base], s) : s[base]);
  return n ? shade(c, Number(n)) : c;
}

const tokenOf = (q) => (q[0] === "l" ? q[5] : q.at(-1));

// Recolorable parts: the declared slots first, then every palette color the shapes use. [{ id, def, name }]
export function slotEntries(d) {
  const out = { ...(d.slots || {}) };
  for (const q of d.shapes || []) {
    const tok = tokenOf(q);
    if (tok[0] === "#") continue;
    const base = TOKEN.exec(tok)[1];
    if (!(base in out)) out[base] = base;
  }
  return Object.entries(out).map(([id, def]) => ({ id, def, name: d.names?.[id] ?? id[0].toUpperCase() + id.slice(1) }));
}

// Copy of a prop as a new custom prop. `colors` become the new slot defaults.
export function variantOf(d, colors, name, theme) {
  const slots = {};
  for (const { id, def } of slotEntries(d)) slots[id] = colors?.[id] ?? def;
  const copy = JSON.parse(JSON.stringify({ name, w: d.w, h: d.h, shapes: d.shapes, slots, names: d.names, image: d.image, z: d.z, f: d.f }));
  return { ...copy, id: `c-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, theme };
}

// Images load once and are cached; onImage fires when one arrives so the caller can redraw.
const IMG = new Map();
let onImage = () => {};
export const setOnImage = (f) => { onImage = f; };
function entry(src) {
  let e = IMG.get(src);
  if (!e) { e = { img: new Image(), ok: false, done: false }; e.img.onload = () => { e.ok = e.done = true; onImage(); }; e.img.onerror = () => { e.done = true; }; e.img.src = src; IMG.set(src, e); }
  return e;
}
export const loadImage = (src) => new Promise((res) => { const e = entry(src); if (e.done) return res(); e.img.addEventListener("load", res); e.img.addEventListener("error", res); });
export const preload = (props) => Promise.all([...new Set(props.map((p) => PROPS[p.id]?.image).filter(Boolean))].map(loadImage));

// Draws a prop with its top-left cell at p.x, p.y. Rotation is around the center; the light direction stays fixed.
export function drawProp(ctx, p, px, s) {
  const d = PROPS[p.id];
  if (!d) return;
  const [w, h] = propSize(p);
  ctx.save();
  ctx.translate((p.x + w / 2) * px, (p.y + h / 2) * px);
  ctx.rotate(((p.rot || 0) * Math.PI) / 180);
  ctx.scale(px, px);
  ctx.translate(-d.w / 2, -d.h / 2);
  ctx.lineJoin = ctx.lineCap = "round";
  if (d.image) {
    const img = entry(d.image).ok ? entry(d.image).img : null;
    ctx.shadowColor = "rgba(0,0,0,0.4)"; ctx.shadowBlur = px * 0.12; ctx.shadowOffsetX = ctx.shadowOffsetY = px * 0.05;
    if (img) ctx.drawImage(img, 0, 0, d.w, d.h);
    else { ctx.setLineDash([0.1, 0.1]); ctx.strokeStyle = "#888"; ctx.lineWidth = 0.04; ctx.strokeRect(0.05, 0.05, d.w - 0.1, d.h - 0.1); }
    ctx.restore();
    return;
  }
  d.shapes.forEach((q, i) => {
    ctx.shadowColor = i ? "transparent" : "rgba(0,0,0,0.4)";
    ctx.shadowBlur = px * 0.12; ctx.shadowOffsetX = ctx.shadowOffsetY = px * 0.05;
    ctx.beginPath();
    if (q[0] === "l") {
      ctx.moveTo(q[1], q[2]); ctx.lineTo(q[3], q[4]);
      ctx.strokeStyle = colorOf(q[5], s, d, p.colors); ctx.lineWidth = q[6]; ctx.stroke();
      return;
    }
    if (q[0] === "r") ctx.roundRect(q[1], q[2], q[3], q[4], 0.04);
    else if (q[0] === "e") ctx.ellipse(q[1], q[2], q[3], q[4], 0, 0, Math.PI * 2);
    else { q[1].forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
    ctx.fillStyle = colorOf(q.at(-1), s, d, p.colors); ctx.fill();
    ctx.shadowColor = "transparent"; ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 0.03; ctx.stroke();
  });
  ctx.restore();
}
