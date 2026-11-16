// Themes and custom props saved in the world setting. GM only. Every write reloads the registries.
import { loadWorld, THEMES } from "./themes.mjs";
import { reloadCustom } from "./props.mjs";

const ID = "foundry-map-creator";
export const readWorld = () => foundry.utils.deepClone(game.settings.get(ID, "themes") || {});
const apply = (w) => { loadWorld(w); reloadCustom(w); };
export const initWorld = () => apply(readWorld());
const write = async (w) => { await game.settings.set(ID, "themes", w); apply(w); };

export async function saveTheme(key, { style, name, from }) {
  const w = readWorld();
  w[key] = { props: [], ...w[key], style, ...(name && { name }), ...(from && { from }) };
  await write(w);
}

export async function deleteTheme(key) {
  const w = readWorld();
  delete w[key];
  await write(w);
}

// Key for a new custom theme made from a name; never a built-in key or an existing one.
export function newThemeKey(name) {
  const w = readWorld(), base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "theme";
  let key = base, i = 2;
  while (THEMES[key] || w[key]) key = `${base}-${i++}`;
  return key;
}

export async function saveProp(theme, def) {
  const w = readWorld();
  w[theme] ??= { props: [] };
  w[theme].props ??= [];
  const i = w[theme].props.findIndex((d) => d.id === def.id);
  if (i < 0) w[theme].props.push(def); else w[theme].props[i] = def;
  await write(w);
}

export async function deleteProp(theme, id) {
  const w = readWorld();
  if (w[theme]?.props) w[theme].props = w[theme].props.filter((d) => d.id !== id);
  await write(w);
}
