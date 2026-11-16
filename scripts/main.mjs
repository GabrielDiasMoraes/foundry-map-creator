import { MapCreatorApp } from "./app.mjs";
import { initWorld } from "./worldstore.mjs";

// Last colors used in the color picker, per browser.
Hooks.once("init", () => {
  game.settings.register("foundry-map-creator", "recent", { scope: "client", config: false, type: Array, default: [] });
  // Themes saved in this world: palettes, custom themes and custom props.
  game.settings.register("foundry-map-creator", "themes", { scope: "world", config: false, type: Object, default: {} });
});

Hooks.on("renderSceneDirectory", (app, html) => {
  const actions = html.querySelector(".header-actions");
  if (!game.user.isGM || !actions || actions.querySelector(".mc-open")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mc-open";
  btn.innerHTML = `<i class="fa-solid fa-map"></i> ${game.i18n.localize("MC.open")}`;
  btn.addEventListener("click", () => { initWorld(); new MapCreatorApp().render({ force: true }); });
  actions.append(btn);
});
