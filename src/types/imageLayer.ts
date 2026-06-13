/**
 * ImageLayerData — Single Source of Truth for every image layer.
 *
 * Design principles:
 *   - Fabric objects are render targets; this data is the authority.
 *   - All sub-types are plain serialisable objects (no class instances).
 *   - Destructive operations (rasterize, apply crop) replace `source` and
 *     fill `rasterCache`; they are never triggered automatically.
 *   - The `version` field allows field-level evolution without breaking changes.
 */

import type { BlendMode, ClipType, CollageCellMeta } from './layers';
import type { ImageFilters, ShadowSettings, StrokeSettings } from './layers';

// ─── Sub-types ───────────────────────────────────────────────────────────────

/**
 * The original, unmodified image provenance.
 * After a destructive "Apply Crop" the rasterized result replaces `src` and
 * the original is preserved only in `ImageRasterCacheData`.
 */
export type ImageSourceData = {
  src: string;          // data-url or remote URL
  naturalWidth: number;
  naturalHeight: number;
};

/**
 * The visible frame (window) on the canvas — this is what the user sizes/moves.
 * Corresponds to the Fabric `Group` transform properties.
 */
export type ImageFrameData = {
  left: number;         // canvas px, origin = center
  top: number;
  width: number;        // intrinsic group width in canvas-px (pre-scale)
  height: number;
  scaleX: number;
  scaleY: number;
  angle: number;        // degrees
  flipX: boolean;
  flipY: boolean;
};

/**
 * How the image content sits inside the frame.
 * Corresponds to the child `FabricImage` transform inside the Group.
 *
 * - `offsetX/Y`: child.left / child.top in group-local px (origin = frame center)
 * - `scale`: child.scaleX = child.scaleY (uniform)
 * - `angle`: child.angle in degrees (independent inner rotation)
 */
export type ImageContentTransformData = {
  offsetX: number;
  offsetY: number;
  scale: number;
  angle: number;
};

/**
 * Clip / shape mask applied to the group as a Fabric `clipPath`.
 */
export type ImageClipData = {
  type: ClipType;
  radius?: number;
  assetUrl?: string;    // for 'image-preset' clips
};

/**
 * Non-destructive layer mask (Phase 5 — not yet implemented).
 * Included here so that project files can carry the field once implemented.
 */
export type ImageMaskData = {
  enabled: boolean;
  inverted: boolean;
  feather: number;                    // px blur on mask edge
  shapeMask?: ImageClipData;          // clip-shape based mask
  bitmapMask?: string;               // data-url of a grayscale mask image
};

/**
 * All rendering-level effects that sit above the image content.
 */
export type ImageEffectsData = {
  opacity: number;
  blendMode: BlendMode;
  filters: ImageFilters;
  shadow?: ShadowSettings;
  stroke?: StrokeSettings;
};

/**
 * Written after an explicit "Apply Crop" / "Rasterize" destructive command.
 * The rasterised result is stored in `source.src`; the pre-rasterise src is
 * preserved here for potential future "revert" functionality.
 */
export type ImageRasterCacheData = {
  originalSrc: string;
  originalNaturalWidth: number;
  originalNaturalHeight: number;
  appliedAt: string;                  // ISO timestamp
};

// ─── Root type ───────────────────────────────────────────────────────────────

export type ImageLayerData = {
  kind: 'imageLayerData';
  version: 1;

  source: ImageSourceData;
  frame: ImageFrameData;
  contentTransform: ImageContentTransformData;
  clip: ImageClipData;
  mask?: ImageMaskData;
  effects: ImageEffectsData;
  rasterCache?: ImageRasterCacheData;

  /**
   * Preserved for collage cell images.
   * When present, the frame is managed by the collage layout engine rather
   * than free user dragging.
   */
  collageCell?: CollageCellMeta;
};

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_IMAGE_CONTENT_TRANSFORM: ImageContentTransformData = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  angle: 0,
};

export const DEFAULT_IMAGE_CLIP_DATA: ImageClipData = {
  type: 'none',
  radius: 48,
};

export const DEFAULT_IMAGE_EFFECTS: ImageEffectsData = {
  opacity: 1,
  blendMode: 'normal',
  filters: {},
  shadow: { enabled: false, color: '#000000', blur: 12, offsetX: 4, offsetY: 4 },
  stroke: { enabled: false, color: '#101820', width: 0 },
};
