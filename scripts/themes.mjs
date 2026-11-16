// A theme is a preset for `style`. Every color stays editable in the UI. Props show per theme (see props.mjs `t`).
export const STYLE_COLORS = ["floor", "floor2", "outside", "wall", "door", "window", "wood", "metal", "cloth", "stone", "accent"];

const base = { door: "#8b5a2b", window: "#9fd3ee", wallWidth: 0.12, noise: 0.08 };
const T = (name, s) => ({ name, style: { ...base, ...s } });

export const THEMES = {
  dungeon: T("Dungeon", { bg: "#0b0b0f", floor: "#6e6e78", floor2: "#4a4a54", outside: "#2a2a30", wall: "#15151a", wood: "#7a5a33", metal: "#8a8a94", cloth: "#7a2e2e", stone: "#5a5a64", accent: "#b5532a", pattern: "tiles", outsidePattern: "dirt" }),
  cave: T("Cave", { bg: "#16120f", floor: "#5b5148", floor2: "#3f372f", outside: "#3a322b", wall: "#1c1611", wood: "#6b4a2b", metal: "#7d7d85", cloth: "#6b4a3a", stone: "#6b6258", accent: "#c8642a", pattern: "dirt", outsidePattern: "dirt", wallWidth: 0.1, noise: 0.14 }),
  house: T("House", { bg: "#4f6b3a", floor: "#b98a5a", floor2: "#7a5636", outside: "#6f8a4a", wall: "#3a2a1c", wood: "#8a5a2b", metal: "#8a8a94", cloth: "#9a3b3b", stone: "#8a8a82", accent: "#c9a14a", pattern: "planks", outsidePattern: "dirt" }),
  tavern: T("Tavern", { bg: "#1d1710", floor: "#8a6540", floor2: "#5a4026", outside: "#4a4032", wall: "#2a1c12", wood: "#6b4423", metal: "#8a8a94", cloth: "#7a3030", stone: "#7a7870", accent: "#d08a3a", pattern: "planks", outsidePattern: "flagstone" }),
  wasteland: T("Wasteland", { bg: "#2b2923", floor: "#7d7a72", floor2: "#55524b", outside: "#9a8560", wall: "#2c2a26", door: "#6b6f72", window: "#7a8a8f", wood: "#6b5a44", metal: "#6f7276", cloth: "#6b6a55", stone: "#8a857a", accent: "#a5532c", pattern: "concrete", outsidePattern: "dirt", wallWidth: 0.14, noise: 0.12 }),
  oriental: T("Oriental", { bg: "#2b3a2a", floor: "#c9b27c", floor2: "#8a7448", outside: "#8e9a86", wall: "#3b1f17", door: "#a3262a", window: "#efe3c2", wood: "#6b3f24", metal: "#7a7a80", cloth: "#a3262a", stone: "#8a8a84", accent: "#c8a24a", pattern: "tatami", outsidePattern: "flagstone" }),
  infernal: T("Infernal", { bg: "#120808", floor: "#3a2a2e", floor2: "#1e1417", outside: "#2a1b1b", wall: "#0d0708", door: "#5c3a2a", window: "#ff8a4a", wood: "#4a2f22", metal: "#5c5560", cloth: "#7a1f1f", stone: "#4a3a3a", accent: "#ff5a1f", pattern: "flagstone", outsidePattern: "dirt", noise: 0.12 }),
};

// Themes saved in the world: { key: { name?, from?, style?, props? } }. A custom theme has `from`, the preset it started as.
let WORLD = {};
export const loadWorld = (w) => { WORLD = w || {}; };
export const isCustomTheme = (k) => !!WORLD[k]?.from;
export const baseOf = (k) => WORLD[k]?.from || k;
export const themeName = (k) => WORLD[k]?.name || THEMES[k]?.name || k;
export const themeList = () => [...Object.keys(THEMES), ...Object.keys(WORLD).filter((k) => !THEMES[k])].map((key) => ({ key, name: themeName(key) }));

// Palette of a theme: the one saved in the world, else the preset (`preset` forces the preset).
export const styleOf = (t, preset = false) => ({ ...((!preset && WORLD[t]?.style) || THEMES[baseOf(t)].style) });

// Palette of a theme inside a plan, created on first use so every theme in a map stays editable.
export const styleFor = (plan, t) => (plan.styles[t || plan.base || plan.theme] ??= styleOf(t || plan.base || plan.theme));
