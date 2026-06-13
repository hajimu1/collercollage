/**
 * imageLayerRenderer.ts
 *
 * Hybrid Smart Layer / Recipe Model — renderer layer.
 *
 * Rule: Fabric objects are render targets, not the source of truth.
 *
 * This module exposes three functions:
 *
 *   buildImageLayerData  — construct a fresh ImageLayerData from raw ingredients
 *   syncFabricFromImageLayer — apply ImageLayerData → Fabric Group (the renderer)
 *   readImageLayerDataFromFabric — read Fabric Group state back into ImageLayerData
 *                                  (used only when finishing a user drag)
 *   legacyMetaToImageLayerData   — migration adapter from old metadata shape
 */

import { Canvas, FabricImage, Group } from 'fabric';
import type { ImageLayerData, ImageSourceData, ImageFrameData, ImageContentTransformData, ImageClipData, ImageEffectsData } from '../types/imageLayer';
import {
  DEFAULT_IMAGE_CLIP_DATA,
  DEFAULT_IMAGE_CONTENT_TRANSFORM,
  DEFAULT_IMAGE_EFFECTS,
} from '../types/imageLayer';
import type { FabricLayerMetadata } from '../types/layers';
import type { FabricImageObject } from './fabricHelpers';
import {
  applyImageClip,
  applyImageShadow,
  applyObjectBlendMode,
  getImageChild,
  getImageNaturalSize,
  getMetadata,
  syncImageOutline,
} from './fabricHelpers';
import { applyFabricFiltersToImage } from './fabricImageFilters';

// ─── Build ───────────────────────────────────────────────────────────────────

/**
 * Construct a fresh ImageLayerData given all the pieces.
 * Call this when adding a new image layer (addImageFromFile, addCollageCell, …).
 */
export function buildImageLayerData(
  source: ImageSourceData,
  frame: ImageFrameData,
  contentTransform: ImageContentTransformData,
  clip: ImageClipData,
  effects: ImageEffectsData,
): ImageLayerData {
  return {
    kind: 'imageLayerData',
    version: 1,
    source,
    frame,
    contentTransform,
    clip,
    effects,
  };
}

// ─── Renderer ────────────────────────────────────────────────────────────────

/**
 * Apply `data` → `group` + its child FabricImage.
 *
 * This is the single authoritative renderer. Call it whenever layer data
 * changes programmatically (not after a live user drag — for that, call
 * `readImageLayerDataFromFabric` first to capture the new state, update the
 * data, then call this to finalise).
 *
 * Does NOT call `canvas.requestRenderAll()` — the caller must do that.
 */
export function syncFabricFromImageLayer(
  canvas: Canvas,
  group: Group,
  data: ImageLayerData,
): void {
  const { frame, contentTransform, clip, effects } = data;

  // 1. Frame transform → Group
  group.set({
    left: frame.left,
    top: frame.top,
    scaleX: frame.scaleX,
    scaleY: frame.scaleY,
    angle: frame.angle,
    opacity: effects.opacity,
  });

  // Flip is stored on the child image for Group-based layers
  const child = getImageChild(group);
  if (child) {
    // 2. Content transform → child FabricImage
    child.set({
      left: contentTransform.offsetX,
      top: contentTransform.offsetY,
      scaleX: contentTransform.scale,
      scaleY: contentTransform.scale,
      angle: contentTransform.angle,
      flipX: frame.flipX,
      flipY: frame.flipY,
    });
    child.setCoords();
  }

  // 3. Blend mode
  applyObjectBlendMode(group, effects.blendMode);

  // 4. Clip mask — applyImageClip reads from metadata.clip, so sync that first
  const meta = getMetadata(group);
  if (meta) {
    meta.clip = clip;
  }
  applyImageClip(group);

  // 5. Shadow
  if (effects.shadow) {
    applyImageShadow(group, effects.shadow);
  }

  // 6. Filters (async — fire and forget; caller should await if needed)
  if (child instanceof FabricImage && effects.filters) {
    applyFabricFiltersToImage(child as FabricImageObject, effects.filters).catch(() => {
      // filter errors are non-fatal
    });
  }

  // 7. Stroke outline — syncImageOutline reads metadata.stroke, sync that first
  if (meta && effects.stroke) {
    meta.stroke = effects.stroke;
  }
  syncImageOutline(canvas, group);

  group.setCoords();
  group.dirty = true;
}

// ─── Read-back ───────────────────────────────────────────────────────────────

/**
 * Read the current Fabric Group state back into a new ImageLayerData.
 *
 * Used exclusively at the END of a user-drag reposition, where the drag has
 * already moved child Fabric objects in-place. This captures the new transform
 * into the data model so it becomes the new source of truth.
 */
export function readImageLayerDataFromFabric(
  group: Group,
  existing: ImageLayerData,
): ImageLayerData {
  const child = getImageChild(group);

  const frame: ImageFrameData = {
    left: group.left ?? existing.frame.left,
    top: group.top ?? existing.frame.top,
    width: group.width ?? existing.frame.width,
    height: group.height ?? existing.frame.height,
    scaleX: group.scaleX ?? existing.frame.scaleX,
    scaleY: group.scaleY ?? existing.frame.scaleY,
    angle: group.angle ?? existing.frame.angle,
    flipX: child?.flipX ?? existing.frame.flipX,
    flipY: child?.flipY ?? existing.frame.flipY,
  };

  const contentTransform: ImageContentTransformData = child
    ? {
        offsetX: child.left ?? existing.contentTransform.offsetX,
        offsetY: child.top ?? existing.contentTransform.offsetY,
        scale: child.scaleX ?? existing.contentTransform.scale,
        angle: child.angle ?? existing.contentTransform.angle,
      }
    : existing.contentTransform;

  return {
    ...existing,
    frame,
    contentTransform,
  };
}

// ─── Migration adapter ───────────────────────────────────────────────────────

/**
 * Construct an ImageLayerData from the legacy FabricLayerMetadata shape.
 * Used during the dual-write migration phase to upgrade metadata that was
 * written before ImageLayerData existed.
 *
 * The `group` argument is needed to read current Fabric transform values
 * (which are the authoritative frame data for pre-existing objects).
 */
export function legacyMetaToImageLayerData(
  group: Group,
  meta: FabricLayerMetadata,
): ImageLayerData {
  const child = getImageChild(group);
  const natural = child ? getImageNaturalSize(child as FabricImageObject) : { width: 1, height: 1 };

  const source: ImageSourceData = {
    src: meta.src ?? '',
    naturalWidth: natural.width,
    naturalHeight: natural.height,
  };

  const frame: ImageFrameData = {
    left: group.left ?? 0,
    top: group.top ?? 0,
    width: group.width ?? 100,
    height: group.height ?? 100,
    scaleX: group.scaleX ?? 1,
    scaleY: group.scaleY ?? 1,
    angle: group.angle ?? 0,
    flipX: child?.flipX ?? false,
    flipY: child?.flipY ?? false,
  };

  const contentTransform: ImageContentTransformData = child
    ? {
        offsetX: child.left ?? meta.crop?.offsetX ?? 0,
        offsetY: child.top ?? meta.crop?.offsetY ?? 0,
        scale: child.scaleX ?? meta.crop?.scale ?? 1,
        angle: child.angle ?? meta.crop?.angle ?? 0,
      }
    : {
        offsetX: meta.crop?.offsetX ?? DEFAULT_IMAGE_CONTENT_TRANSFORM.offsetX,
        offsetY: meta.crop?.offsetY ?? DEFAULT_IMAGE_CONTENT_TRANSFORM.offsetY,
        scale: meta.crop?.scale ?? DEFAULT_IMAGE_CONTENT_TRANSFORM.scale,
        angle: meta.crop?.angle ?? DEFAULT_IMAGE_CONTENT_TRANSFORM.angle,
      };

  const clip: ImageClipData = meta.clip
    ? { type: meta.clip.type, radius: meta.clip.radius, assetUrl: meta.clip.assetUrl }
    : { ...DEFAULT_IMAGE_CLIP_DATA };

  const effects: ImageEffectsData = {
    opacity: group.opacity ?? DEFAULT_IMAGE_EFFECTS.opacity,
    blendMode: meta.blendMode ?? DEFAULT_IMAGE_EFFECTS.blendMode,
    filters: meta.filters ?? {},
    shadow: meta.shadow ?? DEFAULT_IMAGE_EFFECTS.shadow,
    stroke: meta.stroke ?? DEFAULT_IMAGE_EFFECTS.stroke,
  };

  return {
    kind: 'imageLayerData',
    version: 1,
    source,
    frame,
    contentTransform,
    clip,
    effects,
    collageCell: meta.collageCell,
  };
}

// ─── Type re-exports ─────────────────────────────────────────────────────────

export type { ImageLayerData, ImageSourceData, ImageFrameData, ImageContentTransformData, ImageClipData, ImageEffectsData };
