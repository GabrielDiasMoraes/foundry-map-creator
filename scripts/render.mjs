import { planToWalls } from "./walls.mjs";
import { THEMES } from "./themes.mjs";

export const mulberry32 = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Draws the plan on a 2D context. Same function for the preview and the final PNG, only px (pixels per cell) differs.
export function render(plan, ctx, px, { guides = false } = {}) {
  const { cols, rows, style: s } = plan;
  const th = THEMES[plan.theme];
  const rnd = mulberry32(plan.seed);
  const line = Math.max(1, px / 40);

  ctx.fillStyle = s.bg;
  ctx.fillRect(0, 0, cols * px, rows * px);
  if (guides) {
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1; ctx.beginPath();
    for (let x = 0; x <= cols; x++) { ctx.moveTo(x * px, 0); ctx.lineTo(x * px, rows * px); }
    for (let y = 0; y <= rows; y++) { ctx.moveTo(0, y * px); ctx.lineTo(cols * px, y * px); }
    ctx.stroke();
  }

  // Floor: one pass per room cell, seeded noise and pattern.
  const done = new Set();
  for (const r of plan.rooms) for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) {
    if (done.has(`${x},${y}`)) continue;
    done.add(`${x},${y}`);
    const X = x * px, Y = y * px, n = rnd() * s.noise;
    ctx.fillStyle = s.floor; ctx.fillRect(X, Y, px, px);
    ctx.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${n})` : `rgba(255,255,255,${n / 2})`; ctx.fillRect(X, Y, px, px);
    ctx.strokeStyle = "rgba(0,0,0,0.25)"; ctx.lineWidth = line; ctx.beginPath();
    if (th.pattern === "tiles") ctx.rect(X, Y, px, px);
    else {
      for (let k = 0; k < 3; k++) { ctx.moveTo(X, Y + (k * px) / 3); ctx.lineTo(X + px, Y + (k * px) / 3); }
      for (let k = 0; k < 3; k++) { const j = X + rnd() * px, yy = Y + (k * px) / 3; ctx.moveTo(j, yy); ctx.lineTo(j, yy + px / 3); }
    }
    ctx.stroke();
  }

  for (const p of plan.props) {
    const X = p.x * px, Y = p.y * px, w = p.w * px, h = p.h * px;
    ctx.fillStyle = p.color; ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = line * 1.5; ctx.beginPath();
    if (p.shape === "circle") ctx.ellipse(X + w / 2, Y + h / 2, w * 0.45, h * 0.45, 0, 0, Math.PI * 2);
    else ctx.roundRect(X + px * 0.08, Y + px * 0.08, w - px * 0.16, h - px * 0.16, px * 0.08);
    ctx.fill(); ctx.stroke();
  }

  const t = s.wallWidth * px, segs = planToWalls(plan);
  ctx.lineCap = "square"; ctx.strokeStyle = s.wall; ctx.lineWidth = t;
  for (const [a, b, c, d, k] of segs) if (k === "wall") { ctx.beginPath(); ctx.moveTo(a * px, b * px); ctx.lineTo(c * px, d * px); ctx.stroke(); }
  for (const [a, b, c, d, k] of segs) {
    if (k === "wall") continue;
    const cx = ((a + c) / 2) * px, cy = ((b + d) / 2) * px, horiz = b === d;
    const w = horiz ? px : t * (k === "door" ? 1.6 : 1), h = horiz ? t * (k === "door" ? 1.6 : 1) : px;
    ctx.fillStyle = k === "door" ? "#8b5a2b" : "#9fd3ee";
    if (k === "door") { ctx.fillRect(cx - (horiz ? px * 0.4 : w / 2), cy - (horiz ? h / 2 : px * 0.4), horiz ? px * 0.8 : w, horiz ? h : px * 0.8); }
    else { ctx.fillStyle = s.wall; ctx.fillRect(cx - w / 2, cy - h / 2, w, h); ctx.fillStyle = "#9fd3ee"; ctx.fillRect(cx - (horiz ? w / 2 : t * 0.25), cy - (horiz ? t * 0.25 : h / 2), horiz ? w : t * 0.5, horiz ? t * 0.5 : h); }
  }
}
