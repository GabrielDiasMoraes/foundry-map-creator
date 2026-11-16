import { THEMES, styleOf } from "./themes.mjs";
import { render, mulberry32 } from "./render.mjs";
import { edgeKey } from "./walls.mjs";
import { createScene } from "./scene.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const PX = 32; // preview pixels per cell
const TOOLS = ["room", "door", "window", "prop", "erase"];
const MAX = 80; // 80 cells * 100px = 8000px, under the 8192px texture limit

const newPlan = (theme = "dungeon") => ({
  name: `${THEMES[theme].name} map`, cols: 30, rows: 20, theme, seed: Math.floor(Math.random() * 1e9),
  style: styleOf(theme), rooms: [], doors: [], windows: [], props: [],
});

const inside = (p, x, y) => x >= p.x && x < p.x + (p.w ?? 1) && y >= p.y && y < p.y + (p.h ?? 1);

export class MapCreatorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mc-app", classes: ["mc"], window: { title: "MC.title", resizable: true }, position: { width: 1000, height: 720 },
    actions: {
      reroll() { this.plan.seed = Math.floor(Math.random() * 1e9); this.render(); },
      clear() { this.plan = newPlan(this.plan.theme); this.render(); },
      furnish() { this.#furnish(); this.draw(); },
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
  preset = 0;

  async _prepareContext() {
    return {
      plan: this.plan,
      themes: Object.fromEntries(Object.entries(THEMES).map(([k, t]) => [k, t.name])),
      props: THEMES[this.plan.theme].props.map((p, i) => ({ i, name: p.name, sel: i === this.preset })),
      tools: TOOLS.map((id) => ({ id, label: game.i18n.localize(`MC.tool.${id}`), checked: id === this.tool })),
    };
  }

  _onRender() {
    const el = this.element;
    this.cv = el.querySelector("canvas");
    el.querySelectorAll("[data-k]").forEach((i) => i.addEventListener("input", () => this.#set(i)));
    el.querySelectorAll("[name=tool]").forEach((r) => r.addEventListener("change", () => (this.tool = r.value)));
    el.querySelector("[data-preset]").addEventListener("change", (e) => (this.preset = Number(e.target.value)));
    this.cv.addEventListener("pointerdown", (e) => this.#down(e));
    this.cv.addEventListener("pointermove", (e) => this.#move(e));
    this.cv.addEventListener("pointerup", (e) => this.#up(e));
    this.draw();
  }

  draw() {
    const { cols, rows } = this.plan;
    this.cv.width = cols * PX; this.cv.height = rows * PX;
    const ctx = this.cv.getContext("2d");
    render(this.plan, ctx, PX, { guides: true });
    if (this.drag) {
      const d = this.drag;
      ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(d.x * PX, d.y * PX, d.w * PX, d.h * PX);
    }
  }

  #set(i) {
    const v = i.type === "checkbox" ? i.checked : ["number", "range"].includes(i.type) ? Number(i.value) : i.value;
    const path = i.dataset.k.split("."), key = path.pop();
    path.reduce((a, k) => a[k], this.plan)[key] = v;
    if (key === "theme") { this.plan.style = styleOf(v); this.preset = 0; return this.render(); }
    if (key === "cols" || key === "rows") { this.plan[key] = Math.min(MAX, Math.max(5, Math.round(v) || 5)); this.#fit(); }
    this.draw();
  }

  // Drops or trims everything that no longer fits after the grid shrinks.
  #fit() {
    const { cols, rows } = this.plan, p = this.plan;
    p.rooms = p.rooms.filter((r) => r.x < cols && r.y < rows).map((r) => ({ ...r, w: Math.min(r.w, cols - r.x), h: Math.min(r.h, rows - r.y) }));
    p.props = p.props.filter((r) => r.x + r.w <= cols && r.y + r.h <= rows);
    for (const k of ["doors", "windows"]) p[k] = p[k].filter((r) => r.x < cols && r.y < rows);
  }

  #cell(e) {
    const b = this.cv.getBoundingClientRect(), { cols, rows } = this.plan;
    const fx = ((e.clientX - b.left) / b.width) * cols, fy = ((e.clientY - b.top) / b.height) * rows;
    return { fx, fy, x: Math.min(cols - 1, Math.max(0, Math.floor(fx))), y: Math.min(rows - 1, Math.max(0, Math.floor(fy))) };
  }

  #side(c) {
    const dx = c.fx - c.x, dy = c.fy - c.y, d = { n: dy, s: 1 - dy, w: dx, e: 1 - dx };
    return Object.keys(d).sort((a, b) => d[a] - d[b])[0];
  }

  #down(e) {
    const c = this.#cell(e), p = this.plan;
    if (this.tool === "room") { this.start = c; this.cv.setPointerCapture(e.pointerId); this.drag = { x: c.x, y: c.y, w: 1, h: 1 }; }
    else if (this.tool === "door" || this.tool === "window") {
      const item = { x: c.x, y: c.y, side: this.#side(c) }, k = edgeKey(item);
      p.doors = p.doors.filter((d) => edgeKey(d) !== k);
      p.windows = p.windows.filter((d) => edgeKey(d) !== k);
      (this.tool === "door" ? p.doors : p.windows).push(item);
    } else if (this.tool === "prop") {
      const t = THEMES[p.theme].props[this.preset];
      p.props.push({ ...t, x: Math.min(c.x, p.cols - t.w), y: Math.min(c.y, p.rows - t.h) });
    } else {
      const hit = p.props.findLast((o) => inside(o, c.x, c.y));
      if (hit) p.props = p.props.filter((o) => o !== hit);
      else {
        const side = this.#side(c), k = edgeKey({ x: c.x, y: c.y, side });
        const had = [...p.doors, ...p.windows].some((d) => edgeKey(d) === k);
        p.doors = p.doors.filter((d) => edgeKey(d) !== k);
        p.windows = p.windows.filter((d) => edgeKey(d) !== k);
        if (!had) { const r = p.rooms.findLast((o) => inside(o, c.x, c.y)); if (r) p.rooms = p.rooms.filter((o) => o !== r); }
      }
    }
    this.draw();
  }

  #move(e) {
    if (!this.start) return;
    const c = this.#cell(e), s = this.start;
    this.drag = { x: Math.min(s.x, c.x), y: Math.min(s.y, c.y), w: Math.abs(c.x - s.x) + 1, h: Math.abs(c.y - s.y) + 1 };
    this.draw();
  }

  #up() {
    if (!this.start) return;
    this.plan.rooms.push(this.drag);
    this.start = this.drag = null;
    this.draw();
  }

  // shortcut: random props can land on a doorway, reroll or erase them; upgrade if it bothers anyone.
  #furnish() {
    const p = this.plan, props = THEMES[p.theme].props, rnd = mulberry32(p.seed + 1);
    p.props = p.props.filter((o) => !o.auto);
    const free = (x, y, w, h) => !p.props.some((o) => x < o.x + o.w && o.x < x + w && y < o.y + o.h && o.y < y + h);
    for (const r of p.rooms) {
      let n = Math.floor((r.w * r.h) / 10);
      for (let t = 0; t < 50 && n > 0; t++) {
        const o = props[Math.floor(rnd() * props.length)];
        if (r.w < o.w || r.h < o.h) continue;
        const x = r.x + Math.floor(rnd() * (r.w - o.w + 1)), y = r.y + Math.floor(rnd() * (r.h - o.h + 1));
        if (free(x, y, o.w, o.h)) { p.props.push({ ...o, x, y, auto: true }); n--; }
      }
    }
  }
}
