# Integration Note

Recommended load order inside the app:

1. Load `public/assets/manifest.json`.
2. Group items by `format`, `category`, and `tags`.
3. For PNG overlays, apply `recommendedBlendMode` and `recommendedOpacity` by default.
4. For SVG stickers/masks/frames, import as editable Fabric SVG where possible.
5. For presets, resolve referenced `assetId` values against the root manifest.

Suggested first smoke test:

- Place a photo.
- Add `overlay-grain-fine-mono-neutral-1080x1920-v01.png` with overlay blend at 0.22.
- Add `overlay-light-leak-corner-warm-screen-1080x1920-v01.png` with screen blend at 0.32.
- Add `sticker-doodle-star-handdrawn-white-512-v01.svg` as a recolorable sticker.
