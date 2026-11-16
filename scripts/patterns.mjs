import { hashRnd } from "./rng.mjs";

// Floor patterns draw inside one cell (origin at its corner). Colors come from the style, so any pattern fits any palette.
const seg = (ctx, a, b, c, d) => { ctx.moveTo(a, b); ctx.lineTo(c, d); };

export const PATTERNS = {
  plain() {},
  tiles(ctx, px) { ctx.strokeRect(0, 0, px, px); },
  planks(ctx, px, rnd) {
    ctx.beginPath();
    for (let k = 0; k < 3; k++) { const y = (k * px) / 3, j = rnd() * px; seg(ctx, 0, y, px, y); seg(ctx, j, y, j, y + px / 3); }
    ctx.stroke();
  },
  flagstone(ctx, px, rnd) {
    const c = [px * (0.3 + rnd() * 0.4), px * (0.3 + rnd() * 0.4)];
    ctx.beginPath();
    seg(ctx, px * (0.2 + rnd() * 0.6), 0, ...c); seg(ctx, px, px * (0.2 + rnd() * 0.6), ...c);
    seg(ctx, px * (0.2 + rnd() * 0.6), px, ...c); seg(ctx, 0, px * (0.2 + rnd() * 0.6), ...c);
    ctx.stroke();
  },
  concrete(ctx, px, rnd, s) {
    ctx.globalAlpha = 0.4; ctx.strokeRect(0, 0, px, px); ctx.globalAlpha = 1;
    if (rnd() < 0.3) {
      ctx.beginPath(); ctx.moveTo(rnd() * px, 0);
      ctx.lineTo(rnd() * px, px * 0.5); ctx.lineTo(rnd() * px, px); ctx.stroke();
    }
    ctx.fillStyle = s.floor2; ctx.globalAlpha = 0.35;
    for (let i = 0; i < 4; i++) ctx.fillRect(rnd() * px, rnd() * px, px * 0.04, px * 0.04);
  },
  tatami(ctx, px, rnd, s, x, y) {
    ctx.strokeRect(px * 0.03, px * 0.03, px * 0.94, px * 0.94);
    ctx.globalAlpha = 0.35; ctx.beginPath();
    for (let i = 1; i < 6; i++) { const v = (i * px) / 6; if ((x + y) & 1) seg(ctx, 0, v, px, v); else seg(ctx, v, 0, v, px); }
    ctx.stroke();
  },
  grating(ctx, px) {
    ctx.strokeRect(0, 0, px, px); ctx.beginPath();
    for (let i = 1; i < 4; i++) { seg(ctx, (i * px) / 4, 0, (i * px) / 4, px); seg(ctx, 0, (i * px) / 4, px, (i * px) / 4); }
    ctx.stroke();
  },
  dirt(ctx, px, rnd, s) {
    ctx.fillStyle = s.floor2; ctx.globalAlpha = 0.35;
    for (let i = 0; i < 7; i++) ctx.fillRect(rnd() * px, rnd() * px, px * (0.03 + rnd() * 0.05), px * (0.03 + rnd() * 0.05));
  },
};

export function paintCell(ctx, x, y, px, seed, s, floor, pattern) {
  const rnd = hashRnd(seed, x, y), X = x * px, Y = y * px, n = rnd() * s.noise;
  ctx.fillStyle = floor; ctx.fillRect(X, Y, px, px);
  ctx.fillStyle = rnd() < 0.5 ? `rgba(0,0,0,${n})` : `rgba(255,255,255,${n / 2})`; ctx.fillRect(X, Y, px, px);
  ctx.save(); ctx.translate(X, Y);
  ctx.strokeStyle = s.floor2; ctx.lineWidth = Math.max(1, px / 40);
  (PATTERNS[pattern] || PATTERNS.plain)(ctx, px, rnd, s, x, y);
  ctx.restore();
}
