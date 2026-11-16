import { pickColor } from "./colorpicker.mjs";
import { PROPS, drawProp, loadImage } from "./props.mjs";
import { saveProp } from "./worldstore.mjs";
import { askName } from "./dialogs.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const TOKENS = ["wood", "metal", "cloth", "stone", "accent", "floor", "wall"];
const KIND = { r: "rect", e: "ellipse", p: "poly", l: "line" };
const snap = (v) => Math.round(v * 8) / 8; // shapes snap to 1/8 cell
const uid = () => `c-${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
const tokenOf = (q) => (q[0] === "l" ? q[5] : q.at(-1));

// Builds a custom prop from shapes (each shape uses a color slot) or from an image, and saves it in the world.
export class PropEditorApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "mc-prop-editor", classes: ["mc", "mc-pe"], window: { title: "MC.pe.title", resizable: true }, position: { width: 900, height: 680 },
    actions: {
      tool(e, t) { this.tool = t.dataset.id; this.pts = []; this.element.querySelectorAll("[data-action=tool]").forEach((b) => b.classList.toggle("on", b === t)); this.draw(); },
      undo() { if (this.pts.length) this.pts.pop(); else this.def.shapes.pop(); this.render(); },
      closePoly() { this.#closePoly(); },
      addSlot() {
        const n = Object.keys(this.def.slots).length;
        if (n >= 6) return;
        let i = 1; while (`c${i}` in this.def.slots) i++;
        this.def.slots[`c${i}`] = "accent"; this.def.names[`c${i}`] = `Color ${i}`;
        this.render();
      },
      removeSlot(e, t) { delete this.def.slots[t.dataset.id]; delete this.def.names[t.dataset.id]; this.#fixSlot(); this.render(); },
      moveShape(e, t) {
        const i = Number(t.dataset.i), j = i + Number(t.dataset.d), a = this.def.shapes;
        if (j >= 0 && j < a.length) [a[i], a[j]] = [a[j], a[i]];
        this.render();
      },
      delShape(e, t) { this.def.shapes.splice(Number(t.dataset.i), 1); this.render(); },
      browse() {
        new foundry.applications.apps.FilePicker.implementation({ type: "image", current: this.def.image || "", callback: (path) => { this.def.image = path; this.render(); } }).render({ force: true });
      },
      save() { return this.#save(false); },
      saveCopy() { return this.#save(true); },
      cancel() { this.close(); },
    },
  };
  static PARTS = { main: { template: "modules/foundry-map-creator/templates/prop-editor.hbs" } };

  constructor({ theme, def, style, onSave }) {
    super();
    this.theme = theme; this.style = style; this.onSave = onSave;
    this.def = def ? JSON.parse(JSON.stringify(def)) : { name: "", w: 2, h: 2, shapes: [] };
    this.def.slots ??= { c1: "wood", c2: "metal", c3: "accent" };
    this.def.names ??= Object.fromEntries(Object.keys(this.def.slots).map((k, i) => [k, `Color ${i + 1}`]));
    this.mode = this.def.image ? "image" : "shapes";
    this.tool = "rect"; this.lw = 0.06; this.pts = [];
    this.slot = Object.keys(this.def.slots)[0];
  }

  // Editor pixels per cell: small props are drawn big.
  get px() { return Math.floor(Math.min(200, 520 / Math.max(this.def.w, this.def.h))); }

  #fixSlot() { if (!(this.slot in this.def.slots)) this.slot = Object.keys(this.def.slots)[0]; }
  #resolve(tok) { return tok[0] === "#" ? tok : this.style[tok.replace(/[+-]\d+$/, "")] ?? "#888888"; }

  async _prepareContext() {
    const loc = (k) => game.i18n.localize(k), d = this.def, used = new Set(d.shapes.map(tokenOf));
    this.#fixSlot();
    const slotNames = Object.fromEntries(Object.keys(d.slots).map((id) => [id, d.names[id] ?? id]));
    return {
      def: d, isShapes: this.mode === "shapes", lw: this.lw, canCopy: !!d.id, slotNames, slot: this.slot,
      tools: Object.values(KIND).map((id) => ({ id, label: loc(`MC.pe.tool.${id}`), on: id === this.tool })),
      palette: Object.fromEntries([...TOKENS.map((t) => [t, loc(`MC.c.${t}`)]), ["custom", loc("MC.pe.custom")]]),
      slots: Object.entries(d.slots).map(([id, tok]) => ({ id, name: d.names[id] ?? id, token: tok[0] === "#" ? "custom" : tok, hex: this.#resolve(tok), canRemove: !used.has(id) && Object.keys(d.slots).length > 1 })),
      shapes: d.shapes.map((q, i) => ({ i, label: loc(`MC.pe.tool.${KIND[q[0]]}`), slot: tokenOf(q) })),
    };
  }

  _onRender() {
    const el = this.element;
    this.cv = el.querySelector(".mc-pe-cv");
    el.querySelectorAll("[data-pe]").forEach((i) => i.addEventListener("input", () => {
      const k = i.dataset.pe;
      if (k === "name") this.def.name = i.value;
      else { this.def[k] = Math.min(6, Math.max(1, Math.round(Number(i.value)) || 1)); }
      this.draw();
    }));
    el.querySelector("[data-pe-mode]").addEventListener("change", (e) => { this.mode = e.target.checked ? "image" : "shapes"; this.render(); });
    el.querySelector("[data-pe-lw]")?.addEventListener("input", (e) => { this.lw = Number(e.target.value); });
    el.querySelector("[data-pe-slot]")?.addEventListener("input", (e) => { this.slot = e.target.value; });
    el.querySelectorAll("[data-pe-name]").forEach((i) => i.addEventListener("input", () => { this.def.names[i.dataset.peName] = i.value; }));
    el.querySelectorAll("[data-pe-token]").forEach((s) => s.addEventListener("input", () => {
      const id = s.dataset.peToken;
      this.def.slots[id] = s.value === "custom" ? this.#resolve(this.def.slots[id]) : s.value;
      this.render();
    }));
    el.querySelectorAll("[data-pe-swatch]").forEach((b) => b.addEventListener("click", () => {
      const id = b.dataset.peSwatch;
      pickColor(b, this.#resolve(this.def.slots[id]), (hex) => { this.def.slots[id] = hex; b.style.setProperty("--c", hex); this.draw(); });
    }));
    el.querySelectorAll("[data-pe-shape]").forEach((s) => s.addEventListener("input", () => {
      const q = this.def.shapes[Number(s.dataset.peShape)];
      q[q[0] === "l" ? 5 : q.length - 1] = s.value;
      this.render();
    }));
    if (this.cv) {
      this.cv.addEventListener("pointerdown", (e) => this.#down(e));
      this.cv.addEventListener("pointermove", (e) => { if (this.start || this.pts.length) { this.cur = this.#pt(e); this.draw(); } });
      this.cv.addEventListener("pointerup", (e) => this.#up(e));
    }
    if (!this._key) {
      this._key = (e) => { if (e.key === "Enter" && this.tool === "poly" && !["INPUT", "SELECT"].includes(document.activeElement?.tagName)) this.#closePoly(); };
      document.addEventListener("keydown", this._key);
    }
    if (this.def.image) loadImage(this.def.image).then(() => this.draw());
    this.draw();
  }

  _onClose() { document.removeEventListener("keydown", this._key); delete PROPS.__edit; }

  #pt(e) {
    const r = this.cv.getBoundingClientRect(), c = (v, m) => snap(Math.min(m, Math.max(0, v)));
    return [c(((e.clientX - r.left) / r.width) * this.def.w, this.def.w), c(((e.clientY - r.top) / r.height) * this.def.h, this.def.h)];
  }

  #down(e) {
    const p = this.#pt(e);
    if (this.mode !== "shapes") return;
    if (this.tool === "poly") {
      const f = this.pts[0];
      if (f && this.pts.length >= 3 && Math.hypot(p[0] - f[0], p[1] - f[1]) < 0.2) return this.#closePoly();
      this.pts.push(p); this.cur = p; this.draw();
    } else { this.cv.setPointerCapture(e.pointerId); this.start = p; this.cur = p; }
  }

  #up(e) {
    if (!this.start) return;
    const [x1, y1] = this.start, [x2, y2] = this.#pt(e), s = this.slot, q = this.def.shapes;
    this.start = null;
    const w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    if (this.tool === "rect" && w && h) q.push(["r", Math.min(x1, x2), Math.min(y1, y2), w, h, s]);
    else if (this.tool === "ellipse" && w && h) q.push(["e", (x1 + x2) / 2, (y1 + y2) / 2, w / 2, h / 2, s]);
    else if (this.tool === "line" && (w || h)) q.push(["l", x1, y1, x2, y2, s, this.lw]);
    else return this.draw();
    this.render();
  }

  #closePoly() {
    if (this.pts.length >= 3) this.def.shapes.push(["p", this.pts, this.slot]);
    this.pts = [];
    this.render();
  }

  draw() {
    if (!this.cv) return;
    const d = this.def, ctx = this.cv.getContext("2d"), PX_ = this.px;
    this.cv.width = d.w * PX_; this.cv.height = d.h * PX_;
    ctx.fillStyle = "#101014"; ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= d.w; x++) { ctx.moveTo(x * PX_, 0); ctx.lineTo(x * PX_, d.h * PX_); }
    for (let y = 0; y <= d.h; y++) { ctx.moveTo(0, y * PX_); ctx.lineTo(d.w * PX_, y * PX_); }
    ctx.stroke();
    // The preview uses the same drawing code as the map, through a temporary registry entry hidden from the picker.
    PROPS.__edit = { ...d, id: "__edit", custom: true, t: ["__edit"] };
    drawProp(ctx, { id: "__edit", x: 0, y: 0, rot: 0 }, PX_, this.style);
    ctx.strokeStyle = "#fff"; ctx.fillStyle = "#fff"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
    const c = this.cur, s = this.start;
    if (s && c) {
      if (this.tool === "line") { ctx.beginPath(); ctx.moveTo(s[0] * PX_, s[1] * PX_); ctx.lineTo(c[0] * PX_, c[1] * PX_); ctx.stroke(); }
      else ctx.strokeRect(Math.min(s[0], c[0]) * PX_, Math.min(s[1], c[1]) * PX_, Math.abs(c[0] - s[0]) * PX_, Math.abs(c[1] - s[1]) * PX_);
    }
    ctx.setLineDash([]);
    if (this.pts.length) {
      ctx.beginPath(); this.pts.forEach(([x, y], i) => ctx[i ? "lineTo" : "moveTo"](x * PX_, y * PX_)); if (c) ctx.lineTo(c[0] * PX_, c[1] * PX_); ctx.stroke();
      this.pts.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x * PX_, y * PX_, 4, 0, Math.PI * 2); ctx.fill(); });
    }
  }

  async #save(copy) {
    const d = this.def, loc = (k) => game.i18n.localize(k);
    if (this.mode === "shapes" && !d.shapes.length) return ui.notifications.warn(loc("MC.pe.empty"));
    if (this.mode === "image" && !d.image) return ui.notifications.warn(loc("MC.pe.noImage"));
    let name = d.name.trim() || loc("MC.pe.title");
    if (copy) { name = await askName(loc("MC.pe.saveCopy"), `${name} copy`); if (!name) return; }
    const out = { id: copy || !d.id ? uid() : d.id, name, w: d.w, h: d.h };
    if (this.mode === "image") out.image = d.image;
    else Object.assign(out, JSON.parse(JSON.stringify({ shapes: d.shapes, slots: d.slots, names: d.names })));
    await saveProp(this.theme, out);
    ui.notifications.info(loc("MC.pe.saved"));
    this.onSave(out);
    this.close();
  }
}
