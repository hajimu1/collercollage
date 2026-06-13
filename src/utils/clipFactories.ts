import { Circle, Ellipse, FabricObject, Path, Rect } from 'fabric';
import type { ClipSpec } from '../types/layers';
import { getClipDefinition, roundRectPath } from './clipRegistry';

const TRANSPARENT_FILL = 'rgba(255,255,255,0)';
const MIN_SCALE = 0.0001;

function safeScale(value: number | undefined) {
  const scale = Math.abs(Number(value ?? 1));
  return scale > MIN_SCALE ? scale : 1;
}

function baseDefaults() {
  return {
    originX: 'center' as const,
    originY: 'center' as const,
    left: 0,
    top: 0,
    selectable: false,
    evented: false,
    objectCaching: false,
  };
}

function normalizeClip(clip: ClipSpec | undefined): ClipSpec {
  return !clip || clip.type === 'none' ? { type: 'rect' } : clip;
}

function createShapeFromClip(
  clip: ClipSpec,
  width: number,
  height: number,
  options: Record<string, unknown>,
): FabricObject {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const common = {
    ...baseDefaults(),
    ...options,
  };

  if (clip.type === 'circle') {
    return new Circle({
      ...common,
      radius: Math.min(safeWidth, safeHeight) / 2,
    });
  }

  if (clip.type === 'ellipse') {
    return new Ellipse({
      ...common,
      rx: safeWidth / 2,
      ry: safeHeight / 2,
    });
  }

  if (clip.type === 'roundRect') {
    const radius = Math.max(0, Math.min(clip.radius ?? 48, Math.min(safeWidth, safeHeight) / 2));
    return new Path(roundRectPath(safeWidth, safeHeight, radius), common);
  }

  if (clip.type === 'image-preset') {
    const radius = 12;
    const r = Math.max(0, Math.min(radius, Math.min(safeWidth, safeHeight) / 2));
    return new Path(roundRectPath(safeWidth, safeHeight, r), common);
  }

  const def = getClipDefinition(clip.type);
  if (def) {
    return new Path(def.getPath(safeWidth, safeHeight), common);
  }

  return new Rect({
    ...common,
    width: safeWidth,
    height: safeHeight,
  });
}

function createFrameAwareShapeFromClip(
  clip: ClipSpec,
  localWidth: number,
  localHeight: number,
  scaleX: number,
  scaleY: number,
  options: Record<string, unknown>,
): FabricObject {
  const sx = safeScale(scaleX);
  const sy = safeScale(scaleY);
  const safeLocalWidth = Math.max(1, localWidth);
  const safeLocalHeight = Math.max(1, localHeight);
  const frameWidth = safeLocalWidth * sx;
  const frameHeight = safeLocalHeight * sy;
  const common = {
    ...baseDefaults(),
    ...options,
  };

  if (clip.type === 'circle') {
    const frameRadius = Math.min(frameWidth, frameHeight) / 2;
    return new Ellipse({
      ...common,
      rx: frameRadius / sx,
      ry: frameRadius / sy,
    });
  }

  if (clip.type === 'ellipse') {
    return new Ellipse({
      ...common,
      rx: safeLocalWidth / 2,
      ry: safeLocalHeight / 2,
    });
  }

  if (clip.type === 'roundRect') {
    const frameRadius = Math.max(0, Math.min(clip.radius ?? 48, Math.min(frameWidth, frameHeight) / 2));
    return new Path(
      roundRectPath(
        safeLocalWidth,
        safeLocalHeight,
        frameRadius / sx,
        frameRadius / sy,
      ),
      common,
    );
  }

  if (clip.type === 'image-preset') {
    const radius = 12;
    const frameRadius = Math.max(0, Math.min(radius, Math.min(frameWidth, frameHeight) / 2));
    return new Path(
      roundRectPath(
        safeLocalWidth,
        safeLocalHeight,
        frameRadius / sx,
        frameRadius / sy,
      ),
      common,
    );
  }

  const def = getClipDefinition(clip.type);
  if (def) {
    return new Path(def.getPath(frameWidth, frameHeight), {
      ...common,
      scaleX: 1 / sx,
      scaleY: 1 / sy,
    });
  }

  return new Rect({
    ...common,
    width: safeLocalWidth,
    height: safeLocalHeight,
  });
}

export function createClipPath(clip: ClipSpec | undefined, width: number, height: number): FabricObject | undefined {
  if (!clip || clip.type === 'none') return undefined;

  const clipPath = createShapeFromClip(clip, width, height, {
    fill: '#000000',
    strokeWidth: 0,
  });
  clipPath.set({
    objectCaching: false,
    absolutePositioned: false,
  });
  return clipPath;
}

export function createFrameAwareClipPath(
  clip: ClipSpec | undefined,
  localWidth: number,
  localHeight: number,
  scaleX: number,
  scaleY: number,
): FabricObject | undefined {
  if (!clip || clip.type === 'none') return undefined;

  const clipPath = createFrameAwareShapeFromClip(clip, localWidth, localHeight, scaleX, scaleY, {
    fill: '#000000',
    strokeWidth: 0,
  });
  clipPath.set({
    objectCaching: false,
    absolutePositioned: false,
  });
  return clipPath;
}

export function createMaskedStrokeOutline(
  clip: ClipSpec | undefined,
  width: number,
  height: number,
  strokeWidth: number,
  strokeColor: string,
): FabricObject | undefined {
  if (strokeWidth <= 0 || !strokeColor) return undefined;

  const outlineClip = normalizeClip(clip);
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const visibleStrokeWidth = Math.min(strokeWidth, Math.max(1, Math.min(safeWidth, safeHeight)));
  const outline = createShapeFromClip(outlineClip, safeWidth, safeHeight, {
    fill: TRANSPARENT_FILL,
    stroke: strokeColor,
    strokeWidth: visibleStrokeWidth * 2,
    strokeLineJoin: 'round',
    strokeLineCap: 'round',
    strokeUniform: false,
  });
  const mask = createShapeFromClip(outlineClip, safeWidth, safeHeight, {
    fill: '#000000',
    stroke: '#000000',
    strokeWidth: 1,
  });

  outline.set({
    clipPath: mask,
    objectCaching: false,
  });
  outline.dirty = true;
  mask.dirty = true;

  return outline;
}
