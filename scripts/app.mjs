import { STYLE_COLORS, styleFor, styleOf, themeList, themeName, isCustomTheme, baseOf } from "./themes.mjs";
import { render } from "./render.mjs";
import { mulberry32 } from "./rng.mjs";
import { geometry, hasStraightWall } from "./walls.mjs";
import { grow } from "./cave.mjs";
import { SHAPES, shapePoly, inPoly } from "./shapes.mjs";
import { PATTERNS } from "./patterns.mjs";
import { PROPS, propsFor, propSize, drawProp, slotEntries, colorOf, variantOf, setOnImage } from "./props.mjs";
import { saveTheme, deleteTheme, newThemeKey, saveProp, deleteProp } from "./worldstore.mjs";
import { PropEditorApp } from "./propeditor.mjs";
import { askName, confirm } from "./dialogs.mjs";
import { createScene } from "./scene.mjs";
import { pickColor } from "./colorpicker.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const PX = 32; // preview pixels per cell
const TOOLS = { room: "vector-square", open: "tree", cave: "mountain", line: "slash", door: "door-open", window: "table-cells-large", prop: "chair", apply: "fill-drip", erase: "eraser" };
const TABS = ["props", "colors", "map"];
const MAX = 80; // 80 cells * 100px = 8000px, under the 8192px texture limit

const newPlan = (theme = "dungeon") => ({
  name: `${themeName(theme)} map`, cols: 30, rows: 20, theme, base: theme, seed: Math.floor(Math.random() * 1e9),
  bg: styleOf(theme).bg, styles: {}, areas: [], lines: [], doors: [], windows: [], props: [],
});

const inside = (o, x, y) => { const [w, h] = propSize(o); return x >= o.x && x < o.x + w && y >= o.y && y < o.y + h; };
const dist = (px, py, l) => {
  const dx = l.x2 - l.x1, dy = l.y2 - l.y1;
  const t = Math.max(0, Math.min(1, ((px - l.x1) * dx + (py - l.y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - l.x1 - t * dx, py - l.y1 - t * dy);
};

export class MapCreatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mc-app", classes: ["mc"], window: { title: "MC.title", resizable: true }, position: { width: 1100, height: 760 },
    actions: {
      reroll() { this.plan.seed = Math.floor(Math.random() * 1e9); this.render(); },
      furnish() { this.#furnish(); this.draw(); },
      rotate() { this.rot = (this.rot + 90) % 360; this.draw(); },
      roughen() {
        for (const a of this.plan.areas) if (a.shape === "cells") a.cells = grow(a.cells, this.plan.seed);
        this.#fit(); this.draw();
      },
      resetStyle() { delete this.plan.styles[this.plan.theme]; this.render(); },
      presetStyle() { this.plan.styles[this.plan.theme] = styleOf(this.plan.theme, true); this.render(); },
      async saveTheme() {
        await saveTheme(this.plan.theme, { style: { ...this.style } });
        ui.notifications.info(game.i18n.localize("MC.themeSaved"));
      },
      async saveThemeAs() {
        const name = await askName(game.i18n.localize("MC.saveThemeAs"), `${themeName(this.plan.theme)} copy`);
        if (!name) return;
        const key = newThemeKey(name);
        await saveTheme(key, { name, from: baseOf(this.plan.theme), style: { ...this.style } });
        this.plan.styles[key] = { ...this.style }; this.plan.theme = key; this.prop = propsFor(key)[0].id;
        this.render();
      },
      async deleteTheme() {
        const key = this.plan.theme;
        if (!await confirm(game.i18n.format("MC.confirmDeleteTheme", { name: themeName(key) }))) return;
        await deleteTheme(key);
        for (const a of this.plan.areas) if (a.theme === key) a.theme = baseOf(key);
        this.plan.theme = baseOf(key); delete this.plan.styles[key]; this.prop = propsFor(this.plan.theme)[0].id;
        this.render();
      },
      async clearAll() { if (await confirm(game.i18n.localize("MC.confirmClear"))) this.#wipe("areas", "lines", "doors", "windows", "props"); },
      async clearAreas() { if (await confirm(game.i18n.localize("MC.confirmClearAreas"))) this.#wipe("areas"); },
      clearLines() { this.#wipe("lines"); },
      clearDoors() { this.#wipe("doors"); },
      clearWindows() { this.#wipe("windows"); },
      clearProps() { this.#wipe("props"); },
      resetColors() { this.#colors(true); this.#slots(); this.#curProp(); this.draw(); },
      newProp() { this.#editor(null); },
      editProp() { if (PROPS[this.prop]?.custom) this.#editor(PROPS[this.prop]); },
      async deleteProp() {
        const d = PROPS[this.prop];
        if (!d?.custom || !await confirm(game.i18n.format("MC.confirmDelete", { name: d.name }))) return;
        await deleteProp(this.plan.theme, d.id);
        this.prop = propsFor(this.plan.theme)[0].id; this.sel = null; this.draft = {};
        this.render();
      },
      async saveVariant() {
        const d = PROPS[this.prop], name = await askName(game.i18n.localize("MC.saveVariant"), `${d.name} copy`);
        if (!name) return;
        const v = variantOf(d, { ...this.#colors() }, name, this.plan.theme);
        await saveProp(this.plan.theme, v);
        this.prop = v.id; this.sel = null; this.draft = {};
        this.render();
      },
      async create() {
        try {
          const scene = await createScene(this.plan);
          ui.notifications.info(game.i18n.format("MC.created", { name: scene.name }));
          this.close();
        } catch (e) { console.error(e); ui.notifications.error(e.message); }
      },
    },
  };
  static PARTS = { main: { template: "modules/foundry-map-creator/templates/editor.hbs" } };

  plan = newPlan();
  tool = "room";
  rot = 0;
  brush = 2;
  shape = "rect";
  wallStyle = "straight";
  tab = "colors";
  draft = {}; // slot colors for the next placed prop
  sel = null; // placed prop being edited with the Apply tool
  prop = propsFor(this.plan.theme)[0].id;

  // Palette of the active theme, so the color pickers can bind to "style.<key>".
  get style() { return styleFor(this.plan, this.plan.theme); }

  async _prepareContext() {
    const loc = (k) => game.i18n.localize(k), p = this.plan;
    return {
      plan: p, brush: this.brush, style: this.style,
      themes: Object.fromEntries(themeList().map((t) => [t.key, t.name])),
      customTheme: isCustomTheme(p.theme),
      shapes: Object.fromEntries(SHAPES.map((k) => [k, loc(`MC.shape.${k}`)])),
      wallStyles: { straight: loc("MC.wall.straight"), rough: loc("MC.wall.rough") },
      shape: this.shape, wallStyle: this.wallStyle,
      patterns: Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, loc(`MC.pattern.${k}`)])),
      colors: STYLE_COLORS.map((k) => ({ k, label: loc(`MC.c.${k}`) })),
      tools: Object.entries(TOOLS).map(([id, icon]) => ({ id, icon, label: loc(`MC.tool.${id}`), hint: loc(`MC.hint.${id}`) })),
      tabs: TABS.map((id) => ({ id, label: loc(`MC.tab.${id}`) })),
    };
  }

  _onRender() {
    const el = this.element;
    this.cv = el.querySelector(".mc-view canvas");
    setOnImage(() => { this.baseKey = null; this.#thumbs(); this.draw(); });
    el.querySelectorAll("[data-k]:not(.mc-swatch)").forEach((i) => i.addEventListener("input", () => this.#set(i)));
    el.querySelectorAll(".mc-swatch").forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.k;
      pickColor(b, this.#get(k), (hex) => this.#assign(k, hex));
    }));
    el.querySelectorAll("[data-tool]").forEach((b) => b.addEventListener("click", () => this.#pickTool(b.dataset.tool)));
    el.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => this.#pickTab(b.dataset.tab)));
    this.cv.addEventListener("pointerdown", (e) => this.#down(e));
    this.cv.addEventListener("pointermove", (e) => this.#move(e));
    this.cv.addEventListener("pointerup", () => this.#up());
    this.cv.addEventListener("pointerleave", () => { this.hover = null; this.draw(); });
    if (!this._key) {
      this._key = (e) => {
        if (e.key.toLowerCase() !== "r" || ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
        this.rot = (this.rot + 90) % 360; this.draw();
      };
      document.addEventListener("keydown", this._key);
    }
    el.dataset.tool = this.tool; el.dataset.tab = this.tab;
    el.querySelectorAll(".mc-tool").forEach((b) => b.classList.toggle("on", b.dataset.tool === this.tool));
    el.querySelectorAll(".mc-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === this.tab));
    this.#thumbs(); this.#paintSwatches(); this.#curProp(); this.#slots();
    this.draw();
  }

  _onClose() { document.removeEventListener("keydown", this._key); }

  // Prop picker: small canvases drawn with the same code as the map.
  #thumbs() {
    const grid = this.element.querySelector(".mc-props");
    grid.replaceChildren(...propsFor(this.plan.theme).map((d) => {
      const b = document.createElement("button"), c = document.createElement("canvas"), px = 40 / Math.max(d.w, d.h);
      b.type = "button"; b.title = d.name; b.className = "mc-prop" + (d.id === this.prop ? " on" : "");
      c.width = c.height = 44;
      drawProp(c.getContext("2d"), { id: d.id, x: (44 / px - d.w) / 2, y: (44 / px - d.h) / 2, rot: 0 }, px, this.style);
      b.append(c);
      b.addEventListener("click", () => {
        this.prop = d.id; this.draft = {}; this.sel = null; this.#curProp(); this.#slots(); this.#pickTool("prop");
        grid.querySelectorAll(".mc-prop").forEach((x) => x.classList.toggle("on", x === b));
      });
      return b;
    }));
  }

  draw() {
    const p = this.plan, { cols, rows } = p, key = JSON.stringify(p);
    if (key !== this.baseKey) { // hover redraws reuse the rendered map
      this.off ??= document.createElement("canvas");
      this.off.width = cols * PX; this.off.height = rows * PX;
      render(p, this.off.getContext("2d"), PX, { guides: true });
      this.baseKey = key;
    }
    this.cv.width = cols * PX; this.cv.height = rows * PX;
    const ctx = this.cv.getContext("2d");
    ctx.drawImage(this.off, 0, 0);
    const sel = this.#target();
    if (sel) {
      const [w, h] = propSize(sel);
      ctx.strokeStyle = "#ff6400"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(sel.x * PX + 1, sel.y * PX + 1, w * PX - 2, h * PX - 2); ctx.setLineDash([]);
    }
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    if (this.drag) {
      ctx.beginPath();
      shapePoly({ ...this.drag, shape: this.shape, rot: this.rot }).forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * PX, y * PX));
      ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    }
    if (this.dragLine) {
      const [a, b, c, d] = this.dragLine;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a * PX, b * PX); ctx.lineTo(c * PX, d * PX); ctx.stroke();
    }
    if (this.hover && (this.tool === "cave" || (this.tool === "erase" && this.painting))) for (const [x, y] of this.#brushCells(this.hover)) ctx.fillRect(x * PX, y * PX, PX, PX);
    if (this.hover && this.tool === "prop") {
      const g = { id: this.prop, rot: this.rot, colors: this.draft }, [w, h] = propSize(g);
      ctx.globalAlpha = 0.6;
      drawProp(ctx, { ...g, x: Math.min(this.hover.x, cols - w), y: Math.min(this.hover.y, rows - h) }, PX, this.style);
      ctx.globalAlpha = 1;
    }
  }

  #get(k) { return k.split(".").reduce((a, s) => a[s], this); }

  #pickTool(id) {
    this.tool = id; this.element.dataset.tool = id;
    this.element.querySelectorAll(".mc-tool").forEach((b) => b.classList.toggle("on", b.dataset.tool === id));
    if (id === "prop") this.#pickTab("props");
    if (id !== "apply") this.sel = null;
    this.#slots();
    this.draw();
  }

  #wipe(...keys) {
    for (const k of keys) this.plan[k] = [];
    this.sel = null; this.#slots(); this.draw();
  }

  // Colors being edited: the selected placed prop, else the draft for the next placement.
  #target() { return this.sel && this.plan.props.includes(this.sel) ? this.sel : null; }

  #colors(reset) {
    const t = this.#target();
    if (reset) { if (t) delete t.colors; else this.draft = {}; return null; }
    return t ? (t.colors ??= {}) : this.draft;
  }

  // One swatch per recolorable part of the prop being placed or edited.
  #slots() {
    const box = this.element.querySelector(".mc-slots");
    if (!box) return;
    const t = this.#target(), d = PROPS[t ? t.id : this.prop];
    if (!d) return;
    this.element.querySelector(".mc-slots-title").textContent = game.i18n.format(t ? "MC.colorsEditing" : "MC.colorsFor", { name: d.name });
    this.element.querySelector(".mc-custom-btns").classList.toggle("custom", !!PROPS[this.prop]?.custom);
    if (d.image) { box.replaceChildren(Object.assign(document.createElement("p"), { className: "mc-note", textContent: game.i18n.localize("MC.imageNoColors") })); return; }
    const now = (sid) => this.#colors()[sid] ?? colorOf(sid, this.style, d);
    box.replaceChildren(...slotEntries(d).map(({ id: sid, name }) => {
      const wrap = document.createElement("div"), b = document.createElement("button");
      wrap.className = "mc-color"; b.type = "button"; b.className = "mc-swatch"; b.title = name;
      b.style.setProperty("--c", now(sid));
      b.addEventListener("click", () => pickColor(b, now(sid), (hex) => {
        this.#colors()[sid] = hex; b.style.setProperty("--c", hex); this.#curProp(); this.draw();
      }));
      wrap.append(Object.assign(document.createElement("span"), { textContent: name }), b);
      return wrap;
    }));
  }

  #editor(def) {
    new PropEditorApp({ theme: this.plan.theme, def, style: this.style, onSave: (d) => { this.prop = d.id; this.draft = {}; this.sel = null; this.render(); } }).render({ force: true });
  }

  #pickTab(id) {
    this.tab = id; this.element.dataset.tab = id;
    this.element.querySelectorAll(".mc-tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === id));
  }

  // Swatch colors and hex labels follow the plan.
  #paintSwatches() {
    this.element.querySelectorAll(".mc-swatch").forEach((b) => {
      const v = this.#get(b.dataset.k);
      b.style.setProperty("--c", v);
      const hex = this.element.querySelector(`[data-hex="${b.dataset.k}"]`);
      if (hex) hex.textContent = v;
    });
  }

  // Current prop shown in the context bar.
  #curProp() {
    const c = this.element.querySelector(".mc-cur"), d = propsFor(this.plan.theme).find((o) => o.id === this.prop);
    if (!c || !d) return;
    const px = 32 / Math.max(d.w, d.h), ctx = c.getContext("2d");
    ctx.clearRect(0, 0, 36, 36);
    drawProp(ctx, { id: d.id, x: (36 / px - d.w) / 2, y: (36 / px - d.h) / 2, rot: 0, colors: this.draft }, px, this.style);
    this.element.querySelector(".mc-curname").textContent = d.name;
  }

  #set(i) {
    const v = i.type === "checkbox" ? i.checked : ["number", "range"].includes(i.type) ? Number(i.value) : i.value;
    this.#assign(i.dataset.k, v);
  }

  #assign(k, v) {
    const p = this.plan, path = k.split("."), key = path.pop();
    path.reduce((a, s) => a[s], this)[key] = v;
    if (k === "plan.theme") { this.prop = propsFor(v)[0].id; return this.render(); }
    if (k === "plan.cols" || k === "plan.rows") { p[key] = Math.min(MAX, Math.max(5, Math.round(v) || 5)); this.#fit(); }
    if (["brush", "shape", "wallStyle"].includes(k)) return;
    if (k.startsWith("style.")) { this.#thumbs(); this.#curProp(); }
    this.#paintSwatches();
    this.draw();
  }

  // Drops or trims everything that no longer fits after the grid shrinks.
  #fit() {
    const p = this.plan, { cols, rows } = p;
    for (const a of p.areas) {
      if (a.shape === "cells") a.cells = a.cells.filter(([x, y]) => x < cols && y < rows);
      else { a.w = Math.min(a.w, cols - a.x); a.h = Math.min(a.h, rows - a.y); }
    }
    p.areas = p.areas.filter((a) => (a.shape === "cells" ? a.cells.length : a.x < cols && a.y < rows && a.w > 0 && a.h > 0));
    p.props = p.props.filter((o) => { const [w, h] = propSize(o); return o.x + w <= cols && o.y + h <= rows; });
    p.lines = p.lines.filter((l) => Math.max(l.x1, l.x2) <= cols && Math.max(l.y1, l.y2) <= rows);
    for (const k of ["doors", "windows"]) p[k] = p[k].filter((r) => r.x < cols && r.y < rows);
  }

  #cell(e) {
    const b = this.cv.getBoundingClientRect(), { cols, rows } = this.plan;
    const fx = ((e.clientX - b.left) / b.width) * cols, fy = ((e.clientY - b.top) / b.height) * rows;
    return { fx, fy, x: Math.min(cols - 1, Math.max(0, Math.floor(fx))), y: Math.min(rows - 1, Math.max(0, Math.floor(fy))) };
  }

  #brushCells(c) {
    const n = this.brush, r = (n - 0.5) ** 2, out = [], { cols, rows } = this.plan;
    for (let dy = -n; dy <= n; dy++) for (let dx = -n; dx <= n; dx++) {
      const x = c.x + dx, y = c.y + dy;
      if (dx * dx + dy * dy <= r && x >= 0 && y >= 0 && x < cols && y < rows) out.push([x, y]);
    }
    return out;
  }

  // Cave brush: adds to the cave next to the cursor or starts a new one; erase removes from every cave.
  #cave(c, add) {
    const p = this.plan, cells = this.#brushCells(c);
    if (add) {
      this.curCave ??= p.areas.find((o) => o.shape === "cells" && cells.some(([x, y]) => o.cells.some(([ox, oy]) => Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1)));
      if (!this.curCave) { this.curCave = { shape: "cells", cells: [], theme: p.theme, rough: true }; p.areas.push(this.curCave); }
      const m = new Map(this.curCave.cells.map((q) => [q.join(), q]));
      for (const q of cells) m.set(q.join(), q);
      this.curCave.cells = [...m.values()];
    } else {
      const gone = new Set(cells.map((q) => q.join()));
      for (const a of p.areas) if (a.shape === "cells") a.cells = a.cells.filter((q) => !gone.has(q.join()));
      p.areas = p.areas.filter((a) => a.shape !== "cells" || a.cells.length);
    }
  }

  // Topmost area under a point (open areas sit below closed ones).
  #areaAt(x, y) {
    const g = geometry(this.plan), order = [...g.areas.filter((o) => o.a.open), ...g.areas.filter((o) => !o.a.open)];
    return order.findLast((o) => inPoly(o.fine, x, y))?.a;
  }

  #down(e) {
    const c = this.#cell(e), p = this.plan, t = this.tool;
    const grab = () => this.cv.setPointerCapture(e.pointerId);
    if (t === "room" || t === "open") { grab(); this.start = c; this.drag = { x: c.x, y: c.y, w: 1, h: 1 }; }
    else if (t === "line") {
      grab();
      const v = { x: Math.round(c.fx), y: Math.round(c.fy) };
      this.start = v; this.dragLine = [v.x, v.y, v.x, v.y];
    } else if (t === "cave") { grab(); this.painting = "add"; this.#cave(c, true); }
    else if (t === "door" || t === "window") {
      if (hasStraightWall(p, c.fx, c.fy)) {
        for (const k of ["doors", "windows"]) p[k] = p[k].filter((d) => Math.hypot(d.x - c.fx, d.y - c.fy) > 0.5);
        p[t === "door" ? "doors" : "windows"].push({ x: c.fx, y: c.fy });
      }
    } else if (t === "prop") {
      const [w, h] = propSize({ id: this.prop, rot: this.rot });
      p.props.push({ id: this.prop, rot: this.rot, x: Math.min(c.x, p.cols - w), y: Math.min(c.y, p.rows - h), ...(Object.keys(this.draft).length && { colors: { ...this.draft } }) });
    } else if (t === "apply") {
      const hit = p.props.findLast((o) => inside(o, c.x, c.y));
      if (hit) { this.sel = hit; this.#pickTab("props"); }
      else {
        this.sel = null;
        const a = this.#areaAt(c.fx, c.fy);
        if (a) Object.assign(a, { theme: p.theme, rough: this.wallStyle === "rough" });
      }
    } else this.#erase(c, grab);
    this.#slots();
    this.draw();
  }

  // Erase order: prop, door or window, free line, area (cave cells are erased with the brush, drag to keep going).
  #erase(c, grab) {
    const p = this.plan;
    const prop = p.props.findLast((o) => inside(o, c.x, c.y));
    if (prop) return (p.props = p.props.filter((o) => o !== prop));
    for (const k of ["doors", "windows"]) {
      const d = p[k].find((o) => Math.hypot(o.x - c.fx, o.y - c.fy) < 0.6);
      if (d) return (p[k] = p[k].filter((o) => o !== d));
    }
    const line = p.lines.find((l) => dist(c.fx, c.fy, l) < 0.3);
    if (line) return (p.lines = p.lines.filter((l) => l !== line));
    const area = this.#areaAt(c.fx, c.fy);
    if (!area) return;
    if (area.shape !== "cells") return (p.areas = p.areas.filter((a) => a !== area));
    grab(); this.painting = "erase"; this.#cave(c, false);
  }

  #move(e) {
    const c = this.#cell(e);
    this.hover = c;
    if (this.drag) {
      const s = this.start;
      this.drag = { x: Math.min(s.x, c.x), y: Math.min(s.y, c.y), w: Math.abs(c.x - s.x) + 1, h: Math.abs(c.y - s.y) + 1 };
    } else if (this.dragLine) {
      this.dragLine[2] = Math.round(c.fx); this.dragLine[3] = Math.round(c.fy);
    } else if (this.painting) this.#cave(c, this.painting === "add");
    this.draw();
  }

  #up() {
    const p = this.plan;
    if (this.drag) p.areas.push({ shape: this.shape, ...this.drag, rot: this.rot, theme: p.theme, rough: this.wallStyle === "rough", open: this.tool === "open" });
    if (this.dragLine) {
      const [x1, y1, x2, y2] = this.dragLine;
      if (x1 !== x2 || y1 !== y2) p.lines.push({ x1, y1, x2, y2 });
    }
    this.start = this.drag = this.dragLine = this.painting = this.curCave = null;
    this.draw();
  }

  // shortcut: random props can land on a doorway, reroll or erase them; upgrade if it bothers anyone.
  #furnish() {
    const p = this.plan, rnd = mulberry32(p.seed + 1), g = geometry(p);
    p.props = p.props.filter((o) => !o.auto);
    const free = (x, y, w, h) => !p.props.some((o) => { const [ow, oh] = propSize(o); return x < o.x + ow && o.x < x + w && y < o.y + oh && o.y < y + h; });
    g.areas.forEach(({ a, coarse, box }) => {
      const pool = propsFor(a.theme).filter((d) => d.f);
      if (a.open || !pool.length) return;
      const bw = box[2] - box[0], bh = box[3] - box[1];
      let n = Math.floor((bw * bh) / 12);
      for (let t = 0; t < 60 && n > 0; t++) {
        const d = pool[Math.floor(rnd() * pool.length)];
        if (bw < d.w || bh < d.h) continue;
        const x = Math.round(box[0] + rnd() * (bw - d.w)), y = Math.round(box[1] + rnd() * (bh - d.h));
        const fits = [[0.1, 0.1], [d.w - 0.1, 0.1], [0.1, d.h - 0.1], [d.w - 0.1, d.h - 0.1]].every(([u, v]) => inPoly(coarse, x + u, y + v));
        if (fits && x >= 0 && y >= 0 && x + d.w <= p.cols && y + d.h <= p.rows && free(x, y, d.w, d.h)) { p.props.push({ id: d.id, rot: 0, x, y, auto: true }); n--; }
      }
    });
  }
}
