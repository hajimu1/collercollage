# Instagram Story / Photo Dump Asset Set v01

This pack contains original assets for a React + Vite + TypeScript + Fabric.js photo collage editor.

## Contents

- Overlay PNG assets: grain, dust, scratch, light leak, haze, paper/scan textures
- Editable SVG assets: hand-drawn doodles, frames, masks, generic UI overlays
- JSON presets: tone, typography, style
- `manifest.json` files for app integration
- Preview PNGs for asset picker UI

## Counts

- Total items: 92
- PNG: 21
- SVG: 60
- JSON: 11

## Usage

Copy the `public/assets/` folder into the collage app project.
The root manifest is located at:

```txt
public/assets/manifest.json
```

Each asset family also includes its own `manifest.json`.

## Notes

- No brand logos or exact app UI copies are included.
- SVG stickers use `currentColor` where possible, so the app can recolor them.
- Most overlays include recommended blend mode and opacity in the manifests.
- Default canvas size is 1080x1920.
