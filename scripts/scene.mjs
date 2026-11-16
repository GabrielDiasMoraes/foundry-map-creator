import { planToWalls } from "./walls.mjs";
import { render } from "./render.mjs";

const PX = 100; // pixels per grid cell in the final image

export async function createScene(plan) {
  const cv = document.createElement("canvas");
  cv.width = plan.cols * PX; cv.height = plan.rows * PX;
  render(plan, cv.getContext("2d"), PX);
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));

  const slug = plan.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "map";
  const FP = foundry.applications.apps.FilePicker.implementation;
  const dir = `worlds/${game.world.id}/map-creator`;
  try { await FP.createDirectory("data", dir); } catch { /* already exists; upload fails loudly if not */ }
  const res = await FP.upload("data", dir, new File([blob], `${slug}-${plan.seed}.png`, { type: "image/png" }), {});
  if (!res?.path) throw new Error("Map Creator: image upload failed");

  const S = CONST.WALL_SENSE_TYPES;
  const walls = planToWalls(plan).map(([a, b, c, d, k]) => ({
    c: [a, b, c, d].map((v) => v * PX),
    move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
    sight: k === "window" ? S.NONE : S.NORMAL,
    light: k === "window" ? S.NONE : S.NORMAL,
    sound: k === "window" ? S.NONE : S.NORMAL,
    door: k === "door" ? CONST.WALL_DOOR_TYPES.DOOR : CONST.WALL_DOOR_TYPES.NONE,
  }));

  const folder = game.folders.find((f) => f.type === "Scene" && f.name === "Map Creator")
    ?? (await Folder.create({ name: "Map Creator", type: "Scene" }));
  return Scene.create({
    name: plan.name, folder: folder.id, background: { src: res.path },
    width: plan.cols * PX, height: plan.rows * PX, padding: 0, grid: { size: PX }, walls,
  });
}
