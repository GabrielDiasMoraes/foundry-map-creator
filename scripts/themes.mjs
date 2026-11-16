// A theme is plain data. Add one by adding an entry.
const P = (name, shape, w, h, color) => ({ name, shape, w, h, color });

export const THEMES = {
  dungeon: {
    name: "Dungeon", floor: "#6e6e78", wall: "#15151a", bg: "#0b0b0f", pattern: "tiles",
    props: [P("Pillar", "circle", 1, 1, "#4a4a52"), P("Crate", "rect", 1, 1, "#7a5a33"),
      P("Altar", "rect", 2, 1, "#8a8a94"), P("Brazier", "circle", 1, 1, "#b5532a")],
  },
  house: {
    name: "House", floor: "#b98a5a", wall: "#3a2a1c", bg: "#4f6b3a", pattern: "planks",
    props: [P("Table", "rect", 2, 1, "#8a5a2b"), P("Bed", "rect", 1, 2, "#c9b79c"),
      P("Chest", "rect", 1, 1, "#6b4423"), P("Rug", "circle", 2, 2, "#a33b3b")],
  },
  tavern: {
    name: "Tavern", floor: "#8a6540", wall: "#2a1c12", bg: "#1d1710", pattern: "planks",
    props: [P("Round table", "circle", 2, 2, "#6b4423"), P("Barrel", "circle", 1, 1, "#7a5230"),
      P("Bar", "rect", 3, 1, "#4d3220"), P("Hearth", "rect", 2, 1, "#9a4a2a")],
  },
};

export const styleOf = (t) => ({ floor: THEMES[t].floor, wall: THEMES[t].wall, bg: THEMES[t].bg, wallWidth: 0.12, noise: 0.08 });
