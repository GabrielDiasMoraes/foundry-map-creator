# Map Creator

Foundry VTT v13 module. Draw a simple top-down map, tweak it with a live preview, and create a Scene with walls in one click.

## Use

1. Open the Scenes tab and click **Map Creator** (GM only).
2. Pick a theme, then draw rooms, doors, windows and props on the grid.
3. Adjust colors, texture, wall width and seed. **Auto furnish** fills rooms with theme props.
4. Click **Create scene**. The map is saved as a PNG in `worlds/<world>/map-creator/` and the Scene is created in the "Map Creator" folder, with walls, doors and windows set up.

Works with any game system.

## Install

Use this manifest URL in Foundry's module installer:

```
https://github.com/GabrielDiasMoraes/foundry-map-creator/releases/latest/download/module.json
```

## Development

```
node --test tests/
```

## License

MIT
