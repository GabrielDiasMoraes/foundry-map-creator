import { normHex, hexToRgb, rgbToHex, rgbToHsv, hsvToRgb } from "./color.mjs";

const ID = "foundry-map-creator";
const recent = () => { try { return game.settings.get(ID, "recent") || []; } catch { return []; } };
const remember = (hex) => { try { game.settings.set(ID, "recent", [hex, ...recent().filter((c) => c !== hex)].slice(0, 8)); } catch { /* picker works without storage */ } };

let current = null;

// Popover with a saturation/value square, hue slider, hex and RGB fields and recent colors. onChange fires live.
export function pickColor(anchor, value, onChange) {
  current?.close();
  const pop = document.createElement("div");
  pop.className = "mc-pop";
  pop.innerHTML = `<canvas class="sv" width="220" height="150"></canvas>
    <input class="hue" type="range" min="0" max="360" step="1">
    <div class="row"><span class="prev"></span><input class="hex" maxlength="7" spellcheck="false"></div>
    <div class="row rgb"><label>R<input type="number" min="0" max="255"></label><label>G<input type="number" min="0" max="255"></label><label>B<input type="number" min="0" max="255"></label></div>
    <div class="recent"></div>`;
  document.body.append(pop);

  const sv = pop.querySelector(".sv"), ctx = sv.getContext("2d"), hue = pop.querySelector(".hue"), hexIn = pop.querySelector(".hex");
  const rgbIn = [...pop.querySelectorAll(".rgb input")], prev = pop.querySelector(".prev");
  let hsv = rgbToHsv(...hexToRgb(value)), start = normHex(value);

  const hexNow = () => rgbToHex(...hsvToRgb(...hsv));
  const paint = (skipHex) => {
    const [h, s, v] = hsv, W = sv.width, H = sv.height;
    ctx.fillStyle = `hsl(${h} 100% 50%)`; ctx.fillRect(0, 0, W, H);
    let g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, "#fff"); g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "#000");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.beginPath(); ctx.arc(s * W, (1 - v) * H, 7, 0, Math.PI * 2); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(s * W, (1 - v) * H, 8.5, 0, Math.PI * 2); ctx.strokeStyle = "#000"; ctx.lineWidth = 1; ctx.stroke();
    hue.value = h; prev.style.background = hexNow();
    if (!skipHex) hexIn.value = hexNow();
    hsvToRgb(...hsv).forEach((c, i) => { if (document.activeElement !== rgbIn[i]) rgbIn[i].value = c; });
  };
  const apply = (skipHex) => { paint(skipHex); onChange(hexNow()); };
  // Grays and blacks carry no hue, so keep the one the user had.
  const setHex = (hex, skipHex) => { const n = rgbToHsv(...hexToRgb(hex)); hsv = [n[1] && n[2] ? n[0] : hsv[0], n[1], n[2]]; apply(skipHex); };

  const drag = (e) => {
    const r = sv.getBoundingClientRect();
    hsv = [hsv[0], Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), 1 - Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))];
    apply();
  };
  sv.addEventListener("pointerdown", (e) => { sv.setPointerCapture(e.pointerId); drag(e); sv.onpointermove = drag; });
  sv.addEventListener("pointerup", () => (sv.onpointermove = null));
  hue.addEventListener("input", () => { hsv = [Number(hue.value), hsv[1], hsv[2]]; apply(); });
  hexIn.addEventListener("input", () => { const h = normHex(hexIn.value); hexIn.classList.toggle("bad", !h); if (h) setHex(h, true); });
  rgbIn.forEach((i) => i.addEventListener("input", () => setHex(rgbToHex(...rgbIn.map((x) => Number(x.value) || 0)), false)));
  pop.querySelector(".recent").replaceChildren(...recent().map((c) => {
    const b = document.createElement("button");
    b.type = "button"; b.style.background = c; b.title = c;
    b.addEventListener("click", () => setHex(c, false));
    return b;
  }));

  const r = anchor.getBoundingClientRect(), w = 240, h = 330;
  pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  pop.style.top = `${r.bottom + 6 + h > innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;

  const out = (e) => { if (!pop.contains(e.target) && e.target !== anchor) current?.close(); };
  const esc = (e) => { if (e.key === "Escape") { e.stopPropagation(); current?.close(); } };
  current = {
    close() {
      document.removeEventListener("pointerdown", out, true); document.removeEventListener("keydown", esc, true);
      if (hexNow() !== start) remember(hexNow());
      pop.remove(); current = null;
    },
  };
  document.addEventListener("pointerdown", out, true);
  document.addEventListener("keydown", esc, true);
  paint();
}
