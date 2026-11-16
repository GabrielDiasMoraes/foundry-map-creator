const { DialogV2 } = foundry.applications.api;
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// A cancelled dialog gives null / false and changes nothing.
export async function askName(title, value = "") {
  try {
    const r = await DialogV2.input({ window: { title }, content: `<label>${game.i18n.localize("MC.name")} <input name="name" type="text" value="${esc(value)}" autofocus></label>`, ok: { label: game.i18n.localize("MC.save") }, rejectClose: false });
    return r?.name?.trim() || null;
  } catch { return null; }
}

export async function confirm(text) {
  try { return !!(await DialogV2.confirm({ window: { title: game.i18n.localize("MC.title") }, content: `<p>${esc(text)}</p>`, rejectClose: false })); } catch { return false; }
}
