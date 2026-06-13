# Integrated Asset Pack Report
This pack merges asset sets v01, v02, v03, and v04 into a single unified `public/assets/` structure.
## Summary
- Total manifest-registered assets: **444**
- Total preview files: **433**
- Total files inside `public/assets`: **966**

## Duplicate handling
For conflicting IDs/paths, the newest pack version keeps the original ID and filename. Older conflicting versions are preserved as legacy variants with renamed IDs/files.

| Original ID | Kept from | Legacy preserved from | Legacy ID |
|---|---|---|---|
| `preset-style-black-magazine-v01` | v04 | v01 | `preset-style-black-magazine-legacy-v01-v01` |
| `preset-typography-small-white-caption-v01` | v04 | v01 | `preset-typography-small-white-caption-legacy-v01-v01` |
| `preset-typography-typewriter-note-v01` | v04 | v01 | `preset-typography-typewriter-note-legacy-v01-v01` |
| `frame-film-strip-black-vertical-9x16-v01` | v02 | v01 | `frame-film-strip-black-vertical-9x16-legacy-v01-v01` |
| `preset-tone-old-phone-flash-v01` | v04 | v03 | `preset-tone-old-phone-flash-legacy-v03-v01` |
| `preset-tone-low-contrast-gray-v01` | v04 | v03 | `preset-tone-low-contrast-gray-legacy-v03-v01` |
| `preset-typography-timestamp-mono-v01` | v04 | v03 | `preset-typography-timestamp-mono-legacy-v03-v01` |
| `bg-checker-soft-cream-tile512-v01` | v04 | v03 | `bg-checker-soft-cream-tile512-legacy-v03-v01` |

## Filename normalization
- Invalid Windows filename characters were normalized where needed (for example `:` was replaced with `-`).
- Example fixed asset ID: `sticker-date-timestamp-11-27-pm-512-v01`.

## Validation
- All checked template/style references resolved successfully.

## Notes
- `public/assets/manifest.json` is the unified root manifest to use in the app.
- v01 had an extra top-level wrapper folder in its original ZIP; that has been flattened in this integrated pack.
