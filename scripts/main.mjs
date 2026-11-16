import { MapCreatorApp } from "./app.mjs";

Hooks.on("renderSceneDirectory", (app, html) => {
  const actions = html.querySelector(".header-actions");
  if (!game.user.isGM || !actions || actions.querySelector(".mc-open")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mc-open";
  btn.innerHTML = `<i class="fa-solid fa-map"></i> ${game.i18n.localize("MC.open")}`;
  btn.addEventListener("click", () => new MapCreatorApp().render({ force: true }));
  actions.append(btn);
});
