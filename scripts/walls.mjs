// Pure helpers, no Foundry globals, so they can be tested with node.

// Normalizes {x,y,side} to a unique cell edge key: h = horizontal edge at row y, v = vertical edge at column x.
export const edgeKey = ({ x, y, side }) =>
  side === "n" ? `h,${x},${y}` : side === "s" ? `h,${x},${y + 1}` : side === "w" ? `v,${x},${y}` : `v,${x + 1},${y}`;

// Returns [x1, y1, x2, y2, kind] in cell units. kind: wall | door | window.
export function planToWalls(plan) {
  const { cols, rows } = plan;
  const id = new Map();
  plan.rooms.forEach((r, i) => {
    const n = i + 1, merged = new Set();
    for (let x = r.x; x < r.x + r.w; x++) for (let y = r.y; y < r.y + r.h; y++) {
      const old = id.get(`${x},${y}`);
      if (old) merged.add(old);
      id.set(`${x},${y}`, n);
    }
    // Overlapping rooms become one room.
    if (merged.size) for (const [k, v] of id) if (merged.has(v)) id.set(k, n);
  });
  const at = (x, y) => id.get(`${x},${y}`) || 0;
  const kinds = new Map();
  (plan.doors || []).forEach((d) => kinds.set(edgeKey(d), "door"));
  (plan.windows || []).forEach((d) => kinds.set(edgeKey(d), "window"));

  const segs = [];
  for (let y = 0; y <= rows; y++) for (let x = 0; x < cols; x++) {
    if (at(x, y - 1) === at(x, y)) continue;
    const kind = kinds.get(`h,${x},${y}`) || "wall", last = segs.at(-1);
    if (kind === "wall" && last?.[4] === "wall" && last[1] === y && last[3] === y && last[2] === x) last[2] = x + 1;
    else segs.push([x, y, x + 1, y, kind]);
  }
  for (let x = 0; x <= cols; x++) for (let y = 0; y < rows; y++) {
    if (at(x - 1, y) === at(x, y)) continue;
    const kind = kinds.get(`v,${x},${y}`) || "wall", last = segs.at(-1);
    if (kind === "wall" && last?.[4] === "wall" && last[0] === x && last[2] === x && last[3] === y) last[3] = y + 1;
    else segs.push([x, y, x, y + 1, kind]);
  }
  return segs;
}
