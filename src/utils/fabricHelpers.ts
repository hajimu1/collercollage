import {
  Canvas,
  Circle,
  FabricImage,
  FabricObject,
  Group,
  Line,
  Path,
  Polygon,
  Rect,
  Shadow,
  Gradient,
  Control,
} from 'fabric';

import {
  BACKGROUND_LAYER_ID,
  DEFAULT_BACKGROUND,
  DEFAULT_CANVAS_SIZE,
  MAX_CUSTOM_CANVAS_SIZE,
  MAX_IMAGE_DIMENSION,
  MIN_CUSTOM_CANVAS_SIZE,
} from '../constants/canvas';
import type {
  ActiveCollage,
  AdjustmentGradientType,
  AdjustmentLayerKind,
  BackgroundLayerItem,
  BlendMode,
  CanvasBackground,
  CanvasSize,
  ClipSpec,
  ClipType,
  ElementLayerType,
  FabricLayerMetadata,
  ImageCrop,
  LayerItem,
  SelectionSnapshot,
  ShapeStyle,
  ShapeType,
  StrokeSettings,
  ShadowSettings,
  TextAlign,
  TextBackgroundBoxSettings,
  TextFontStyle,
  TextFontWeight,
} from '../types/layers';
import { createClipPath, createFrameAwareClipPath, createMaskedStrokeOutline } from './clipFactories';
import { CUSTOM_SVG_SHAPES } from './customSvgShapeData';
import { downloadDataUrl } from './image';
import {
  clampShapeStyleForType,
  getDecorativeStrokePaddingForShape,
} from './shapeStrokeProfiles';
export { applyFabricFiltersToImage } from './fabricImageFilters';

export type FabricLayerObject = FabricObject & {
  data?: FabricLayerMetadata;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: TextFontWeight;
  fontStyle?: TextFontStyle;
  underline?: boolean;
  linethrough?: boolean;
  fill?: string;
  textAlign?: TextAlign;
  charSpacing?: number;
  lineHeight?: number;
};

export type FabricOutlineObject = FabricObject & {
  data?: {
    outlineForLayerId: string;
  };
};

export type FabricTextBackgroundBoxObject = FabricObject & {
  data?: {
    backgroundBoxForTextLayerId: string;
  };
};

export type FabricCropHelperObject = FabricObject & {
  data?: {
    cropHelperForLayerId: string;
    cropHelperKind: 'box' | 'grid' | 'overlay';
  };
};

export type DecorativeShapePartObject = FabricObject & {
  data?: {
    decorativeShapePart?: 'fill' | 'outline' | 'padding';
    decorativeBaseLength?: number;
  };
};

export type FabricImageObject = FabricImage & {
  data?: FabricLayerMetadata;
  cropX?: number;
  cropY?: number;
  _element?: HTMLImageElement;
  getElement?: () => HTMLImageElement;
  getOriginalSize?: () => { width: number; height: number };
};

export type FabricPlaceholderObject = FabricObject & {
  data?: {
    placeholderForCollageId: string;
    placeholderCellIndex: number;
  };
};

export type CanvasWithUniformScaling = Canvas & {
  uniformScaling?: boolean;
};

export interface CropModeState {
  layerId: string;
  initialCrop?: ImageCrop;
  draft: ImageCrop;
  aspectRatio: number | null;
}

export const DEFAULT_SHAPE_STYLE: ShapeStyle = {
  fill: '#ffd43b',
  stroke: '#101820',
  strokeWidth: 6,
};

export const DEFAULT_IMAGE_CROP: ImageCrop = {
  enabled: false,
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  cropWidthRatio: 1,
  cropHeightRatio: 1,
};

export const DEFAULT_IMAGE_CLIP: ClipSpec = {
  type: 'none',
  radius: 48,
};

export const DEFAULT_IMAGE_STROKE: StrokeSettings = {
  enabled: false,
  color: '#101820',
  width: 0,
};

export const DEFAULT_TEXT_SHADOW: ShadowSettings = {
  enabled: false,
  color: '#000000',
  blur: 12,
  offsetX: 4,
  offsetY: 4,
};

export const DEFAULT_TEXT_BACKGROUND_BOX: TextBackgroundBoxSettings = {
  enabled: false,
  style: 'box',
  fill: '#ffffff',
  padding: 24,
  radius: 18,
};

export const clampCanvasSize = (value: number) =>
  Math.max(MIN_CUSTOM_CANVAS_SIZE, Math.min(MAX_CUSTOM_CANVAS_SIZE, Math.round(value || MIN_CUSTOM_CANVAS_SIZE)));

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const getColor = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);

export const createStarPoints = (outerRadius: number, innerRadius: number, points = 5) => {
  const result: Array<{ x: number; y: number }> = [];
  const step = Math.PI / points;

  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = index * step - Math.PI / 2;
    result.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  return result;
};

export const SPARKLE_ARM_LENGTH = 360;
export const SPARKLE_DIAGONAL_LENGTH = 250;
export const SPARKLE_CORE_THICKNESS = 2;

export const SPARKLE_BAR_SPECS = [
  { length: SPARKLE_ARM_LENGTH, angle: 0 },
  { length: SPARKLE_ARM_LENGTH, angle: 90 },
  { length: SPARKLE_DIAGONAL_LENGTH, angle: 45 },
  { length: SPARKLE_DIAGONAL_LENGTH, angle: -45 },
] as const;

export const getDecorativeShapePart = (object: FabricObject) =>
  (object as DecorativeShapePartObject).data?.decorativeShapePart;

export const isDecorativeShapeGroup = (object: FabricObject) =>
  object instanceof Group && object.getObjects().some((child) => Boolean(getDecorativeShapePart(child)));

export const applyStyleToGroupChildren = (object: FabricObject, style: ShapeStyle) => {
  if (!(object instanceof Group)) return;

  if (isDecorativeShapeGroup(object)) {
    const metadata = getMetadata(object);
    const safeStyle = clampShapeStyleForType(metadata?.shapeType, style);

    object.set({
      fill: safeStyle.fill,
      stroke: safeStyle.stroke,
      strokeWidth: safeStyle.strokeWidth,
    });

    object.getObjects().forEach((child) => {
      const part = getDecorativeShapePart(child);
      const decorativeChild = child as DecorativeShapePartObject;
      const baseLength = Math.max(
        1,
        Number(decorativeChild.data?.decorativeBaseLength ?? child.width ?? SPARKLE_ARM_LENGTH),
      );

      if (part === 'outline') {
        const outlineThickness = SPARKLE_CORE_THICKNESS + safeStyle.strokeWidth * 2;

        child.set({
          fill: safeStyle.stroke,
          stroke: undefined,
          strokeWidth: 0,
          width: baseLength + outlineThickness,
          height: Math.max(0.01, outlineThickness),
          rx: outlineThickness / 2,
          ry: outlineThickness / 2,
          visible: safeStyle.strokeWidth > 0,
        });
        child.setCoords();
        child.dirty = true;
        return;
      }

      if (part === 'fill') {
        child.set({
          fill: safeStyle.fill,
          stroke: undefined,
          strokeWidth: 0,
          width: baseLength,
          height: SPARKLE_CORE_THICKNESS,
          rx: SPARKLE_CORE_THICKNESS / 2,
          ry: SPARKLE_CORE_THICKNESS / 2,
          visible: true,
        });
        child.setCoords();
        child.dirty = true;
        return;
      }

      if (part === 'padding') {
        child.set({
          fill: 'rgba(0,0,0,0)',
          stroke: undefined,
          strokeWidth: 0,
          visible: true,
        });
      }
    });
    return;
  }

  object.getObjects().forEach((child) => {
    child.set({
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: Math.max(0, style.strokeWidth),
    });
  });
};

export const getShapeStyleFromObject = (object: FabricObject): ShapeStyle => {
  if (object instanceof Group) {
    if (isDecorativeShapeGroup(object)) {
      const fillChild = object.getObjects().find((child) => getDecorativeShapePart(child) === 'fill');
      const outlineChild = object.getObjects().find((child) => getDecorativeShapePart(child) === 'outline');
      const savedStrokeWidth = Number(object.strokeWidth ?? 0);

      return {
        fill: getColor(fillChild?.fill ?? object.fill, '#ffd43b'),
        stroke: getColor(outlineChild?.fill ?? outlineChild?.stroke ?? object.stroke, '#101820'),
        strokeWidth: Math.max(0, savedStrokeWidth),
      };
    }

    const firstChild = object.getObjects()[0];
    return {
      fill: getColor(firstChild?.fill ?? object.fill, '#ffd43b'),
      stroke: getColor(firstChild?.stroke ?? object.stroke, '#101820'),
      strokeWidth: Number(firstChild?.strokeWidth ?? object.strokeWidth ?? 0),
    };
  }

  return {
    fill: getColor(object.fill, '#ffd43b'),
    stroke: getColor(object.stroke, '#101820'),
    strokeWidth: Number(object.strokeWidth ?? 0),
  };
};

export const createLayerId = (type: ElementLayerType) =>
  `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const inferLayerType = (object: FabricLayerObject): ElementLayerType => {
  const metadata = getMetadata(object);
  if (metadata?.layerType) return metadata.layerType;
  if (object.type === 'image') return 'image';
  if (object.type === 'textbox' || object.type === 'text' || object.type === 'i-text') return 'text';
  return 'shape';
};

export const fabricCompositeOperationForBlendMode = (blendMode?: BlendMode) =>
  !blendMode || blendMode === 'normal' ? 'source-over' : blendMode;

export const applyObjectBlendMode = (object: FabricObject, blendMode: BlendMode = 'normal') => {
  object.set({
    globalCompositeOperation: fabricCompositeOperationForBlendMode(blendMode),
    ...(blendMode === 'normal' ? {} : { objectCaching: false }),
  });
  const metadata = getMetadata(object);
  if (metadata) metadata.blendMode = blendMode;
  object.dirty = true;
};

export const DEFAULT_ADJUSTMENT_COLOR = '#f4a7c8';
export const DEFAULT_ADJUSTMENT_GRADIENT_COLORS: [string, string] = ['#f4a7c8', '#fff2a8'];

export const applyAdjustmentFill = (object: FabricObject) => {
  const metadata = getMetadata(object);
  if (!metadata || metadata.layerType !== 'adjustment') return;

  const width = Math.max(1, Number(object.width ?? DEFAULT_CANVAS_SIZE.width));
  const height = Math.max(1, Number(object.height ?? DEFAULT_CANVAS_SIZE.height));
  const kind = metadata.adjustmentKind ?? 'solid-color';

  if (kind === 'gradient') {
    const gradientType = metadata.adjustmentGradientType ?? 'linear';
    const colors = metadata.adjustmentGradientColors ?? DEFAULT_ADJUSTMENT_GRADIENT_COLORS;
    const coords = gradientType === 'radial'
      ? {
          x1: width / 2,
          y1: height / 2,
          r1: 0,
          x2: width / 2,
          y2: height / 2,
          r2: Math.max(width, height) / 2,
        }
      : {
          x1: 0,
          y1: 0,
          x2: width,
          y2: height,
        };

    object.set({
      fill: new Gradient({
        type: gradientType,
        coords,
        colorStops: [
          { offset: 0, color: colors[0] },
          { offset: 1, color: colors[1] },
        ],
      }),
    });
  } else {
    object.set({ fill: metadata.adjustmentColor ?? DEFAULT_ADJUSTMENT_COLOR });
  }

  object.dirty = true;
};

export const createAdjustmentObject = (
  canvasSize: CanvasSize,
  kind: AdjustmentLayerKind,
  gradientType: AdjustmentGradientType = 'linear',
) => {
  const object = new Rect({
    left: canvasSize.width / 2,
    top: canvasSize.height / 2,
    width: canvasSize.width,
    height: canvasSize.height,
    originX: 'center',
    originY: 'center',
    fill: DEFAULT_ADJUSTMENT_COLOR,
    strokeWidth: 0,
    objectCaching: false,
  });

  const blendMode = kind === 'solid-color' ? 'screen' : 'overlay';
  setMetadata(object, {
    layerId: createLayerId('adjustment'),
    layerType: 'adjustment',
    layerName: kind === 'solid-color'
      ? 'Solid color adjustment'
      : `${gradientType === 'radial' ? 'Radial' : 'Linear'} gradient adjustment`,
    adjustmentKind: kind,
    adjustmentTarget: 'canvas',
    adjustmentColor: DEFAULT_ADJUSTMENT_COLOR,
    adjustmentGradientType: gradientType,
    adjustmentGradientColors: DEFAULT_ADJUSTMENT_GRADIENT_COLORS,
    blendMode,
  });
  applyAdjustmentFill(object);
  applyObjectBlendMode(object, blendMode);

  return object;
};

export const setMetadata = (object: FabricObject, metadata: FabricLayerMetadata) => {
  (object as FabricLayerObject).data = metadata;
};

export const getMetadata = (object: FabricObject) => (object as FabricLayerObject).data;

export const getImageChild = (object: FabricObject | null | undefined): FabricImageObject | null => {
  if (!object) return null;
  if (object instanceof Group) {
    return (object.getObjects().find(obj => obj.type === 'image') as FabricImageObject | null) ?? (object.getObjects()[0] as FabricImageObject | null);
  }
  if (object.type === 'image') {
    return object as FabricImageObject;
  }
  return null;
};

export const isOutlineObject = (object: FabricObject) =>
  Boolean((object as FabricOutlineObject).data?.outlineForLayerId);

export const getOutlineLayerId = (object: FabricObject) =>
  (object as FabricOutlineObject).data?.outlineForLayerId;

export const isTextBackgroundBoxObject = (object: FabricObject) =>
  Boolean((object as FabricTextBackgroundBoxObject).data?.backgroundBoxForTextLayerId);

export const getTextBackgroundBoxLayerId = (object: FabricObject) =>
  (object as FabricTextBackgroundBoxObject).data?.backgroundBoxForTextLayerId;

export const isCropHelperObject = (object: FabricObject) =>
  Boolean((object as FabricCropHelperObject).data?.cropHelperForLayerId);

export const getCropHelperLayerId = (object: FabricObject) =>
  (object as FabricCropHelperObject).data?.cropHelperForLayerId;

export const getCropHelperKind = (object: FabricObject) =>
  (object as FabricCropHelperObject).data?.cropHelperKind;

export const isPlaceholderObject = (object: FabricObject): object is FabricPlaceholderObject =>
  Boolean((object as FabricPlaceholderObject).data?.placeholderForCollageId);

export const getPlaceholderCellIndex = (object: FabricObject): number =>
  (object as FabricPlaceholderObject).data?.placeholderCellIndex ?? -1;

export const setObjectLocked = (object: FabricObject, locked: boolean) => {
  object.set({
    selectable: !locked,
    evented: !locked,
    hasControls: !locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
  });
};

export const isObjectLocked = (object: FabricObject) =>
  object.selectable === false ||
  object.lockMovementX ||
  object.lockMovementY ||
  object.lockScalingX ||
  object.lockScalingY ||
  object.lockRotation;

export const applyInteractiveDefaults = (object: FabricObject) => {
  const isTouch = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  object.set({
    cornerColor: '#176c72',
    cornerStrokeColor: '#ffffff',
    borderColor: '#176c72',
    cornerStyle: 'circle',
    cornerSize: isTouch ? 28 : 16,
    touchCornerSize: 42,
    padding: 4,
    transparentCorners: false,
    centeredRotation: true,
    strokeUniform: true,
  });
};

export const ensureMetadata = (object: FabricObject) => {
  const target = object as FabricLayerObject;

  if (target.data?.layerId) {
    return target.data;
  }

  const layerType = inferLayerType(target);
  const fallbackName = layerType === 'image' ? 'Image' : layerType === 'text' ? 'Text' : 'Shape';
  const metadata: FabricLayerMetadata = {
    layerId: createLayerId(layerType),
    layerType,
    layerName: fallbackName,
    blendMode: 'normal',
    crop: layerType === 'image' ? DEFAULT_IMAGE_CROP : undefined,
    clip: layerType === 'image' ? DEFAULT_IMAGE_CLIP : undefined,
  };
  setMetadata(object, metadata);
  return metadata;
};

export const makeBackgroundLayer = (background: CanvasBackground, locked: boolean): BackgroundLayerItem => ({
  id: BACKGROUND_LAYER_ID,
  type: 'background',
  name: 'Background',
  visible: background.mode !== 'transparent',
  locked,
  opacity: 1,
  zIndex: 0,
  color: background.color,
  background,
});

export const getObjectTransform = (object: FabricObject) => ({
  left: Number(object.left ?? 0),
  top: Number(object.top ?? 0),
  width: Number(object.width ?? 0),
  height: Number(object.height ?? 0),
  scaleX: Number(object.scaleX ?? 1),
  scaleY: Number(object.scaleY ?? 1),
  angle: Number(object.angle ?? 0),
});

export const getImageNaturalSize = (image: FabricImageObject) => {
  const originalSize = image.getOriginalSize?.();
  if (originalSize?.width && originalSize?.height) {
    return originalSize;
  }

  const element = image.getElement?.() ?? image._element;
  const naturalWidth = element instanceof HTMLImageElement ? element.naturalWidth : 0;
  const naturalHeight = element instanceof HTMLImageElement ? element.naturalHeight : 0;
  return {
    width: naturalWidth || Number(image.width || 1),
    height: naturalHeight || Number(image.height || 1),
  };
};

const withFontLoadTimeout = <T,>(promise: Promise<T>, timeoutMs = 1500): Promise<T | void> =>
  Promise.race([
    promise,
    new Promise<void>((resolve) => window.setTimeout(resolve, timeoutMs)),
  ]);

const toFontLoadSpec = (fontFamily: string) => {
  const trimmed = fontFamily.trim();
  if (!trimmed) return '16px sans-serif';
  if (trimmed.includes(',') || trimmed.includes('"') || trimmed.includes("'")) {
    return `16px ${trimmed}`;
  }
  return `16px "${trimmed.replace(/"/g, '\\"')}"`;
};

export const loadFontForCanvas = async (fontFamily: string) => {
  if (typeof document === 'undefined' || !('fonts' in document)) return;
  try {
    await withFontLoadTimeout(document.fonts.load(toFontLoadSpec(fontFamily)));
    await withFontLoadTimeout(document.fonts.ready);
  } catch {
    // Font loading should never block editing; browser fallback fonts remain active.
  }
};

export const waitForCanvasTextFonts = async (canvas: Canvas) => {
  const fontFamilies = new Set<string>();
  canvas.getObjects().forEach((object) => {
    const metadata = getMetadata(object);
    const fontFamily = metadata?.layerType === 'text'
      ? (metadata.fontFamily ?? (object as FabricLayerObject).fontFamily)
      : undefined;
    if (fontFamily) fontFamilies.add(fontFamily);
  });

  await Promise.all([...fontFamilies].map((fontFamily) => loadFontForCanvas(fontFamily)));
};

function createPolaroidOverlayPath(w: number, h: number) {
  const margin = 20;
  const iw = w - margin * 2;
  const ih = iw;
  const topY = -h/2 + margin;
  const bottomY = topY + ih;
  const leftX = -w/2 + margin;
  const rightX = leftX + iw;
  
  let d = `M ${-w/2} ${-h/2} L ${w/2} ${-h/2} L ${w/2} ${h/2} L ${-w/2} ${h/2} Z`;
  d += ` M ${leftX} ${topY} L ${leftX} ${bottomY} L ${rightX} ${bottomY} L ${rightX} ${topY} Z`;
  return d;
}

function createFilmStripOverlayPath(w: number, h: number) {
  let d = `M ${-w/2} ${-h/2} L ${w/2} ${-h/2} L ${w/2} ${h/2} L ${-w/2} ${h/2} Z`;
  
  const marginX = w * 0.08;
  const marginY = h * 0.14;
  const iw = w - marginX * 2;
  const ih = h - marginY * 2;
  d += ` M ${-iw/2} ${-ih/2} L ${-iw/2} ${ih/2} L ${iw/2} ${ih/2} L ${iw/2} ${-ih/2} Z`;
  
  const count = 8;
  const holeW = w / (count * 2 + 1);
  const holeH = h * 0.05;
  const topY = -h/2 + h * 0.04;
  const bottomY = h/2 - h * 0.04 - holeH;
  
  for (let i = 0; i < count; i++) {
    const x = -w/2 + holeW * (2 * i + 1);
    d += ` M ${x} ${topY} L ${x} ${topY + holeH} L ${x + holeW} ${topY + holeH} L ${x + holeW} ${topY} Z`;
    d += ` M ${x} ${bottomY} L ${x} ${bottomY + holeH} L ${x + holeW} ${bottomY + holeH} L ${x + holeW} ${bottomY} Z`;
  }
  return d;
}

function createDesktopWindowOverlayPath(w: number, h: number) {
  const rx = 8;
  const left = -w / 2;
  const top = -h / 2;
  const right = w / 2;
  const bottom = h / 2;
  let d = `M ${left + rx} ${top} L ${right - rx} ${top} Q ${right} ${top} ${right} ${top + rx} L ${right} ${bottom - rx} Q ${right} ${bottom} ${right - rx} ${bottom} L ${left + rx} ${bottom} Q ${left} ${bottom} ${left} ${bottom - rx} L ${left} ${top + rx} Q ${left} ${top} ${left + rx} ${top} Z`;
  
  const titleH = h * 0.12;
  const border = 4;
  const iw = w - border * 2;
  const ih = h - titleH - border * 2;
  const l = -w/2 + border;
  const r = w/2 - border;
  const t = -h/2 + titleH + border;
  const b = h/2 - border;
  d += ` M ${l} ${t} L ${l} ${b} L ${r} ${b} L ${r} ${t} Z`;
  
  const btnR = Math.min(w, h) * 0.02;
  const btnY = -h/2 + h * 0.06;
  const startX = -w/2 + w * 0.06;
  const step = w * 0.04;
  for (let i = 0; i < 3; i++) {
    const cx = startX + step * i;
    d += ` M ${cx} ${btnY - btnR} A ${btnR} ${btnR} 0 1 0 ${cx} ${btnY + btnR} A ${btnR} ${btnR} 0 1 0 ${cx} ${btnY - btnR} Z`;
  }
  return d;
}

function createFileFolderOverlayPath(w: number, h: number) {
  const rx = 8;
  const tabW = w * 0.35;
  const tabH = h * 0.12;
  const left = -w / 2;
  const right = w / 2;
  const top = -h / 2 + tabH;
  const bottom = h / 2;
  
  let d = [
    `M ${left + rx} ${top}`,
    `L ${left + tabW - rx} ${top}`,
    `Q ${left + tabW} ${top} ${left + tabW + rx} ${top - tabH}`,
    `L ${left + tabW * 1.3 - rx} ${top - tabH}`,
    `Q ${left + tabW * 1.3} ${top - tabH} ${left + tabW * 1.3 + rx} ${top}`,
    `L ${right - rx} ${top}`,
    `Q ${right} ${top} ${right} ${top + rx}`,
    `L ${right} ${bottom - rx}`,
    `Q ${right} ${bottom} ${right - rx} ${bottom}`,
    `L ${left + rx} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${bottom - rx}`,
    `L ${left} ${top + rx}`,
    `Q ${left} ${top} ${left + rx} ${top}`,
    `Z`
  ].join(' ');
  
  const border = 4;
  const l = -w/2 + border;
  const r = w/2 - border;
  const t = -h/2 + tabH + border;
  const b = h/2 - border;
  d += ` M ${l} ${t} L ${l} ${b} L ${r} ${b} L ${r} ${t} Z`;
  return d;
}

function createAirDropOverlayPath(w: number, h: number) {
  const rx = 16;
  const left = -w / 2;
  const top = -h / 2;
  const right = w / 2;
  const bottom = h / 2;
  let d = `M ${left + rx} ${top} L ${right - rx} ${top} Q ${right} ${top} ${right} ${top + rx} L ${right} ${bottom - rx} Q ${right} ${bottom} ${right - rx} ${bottom} L ${left + rx} ${bottom} Q ${left} ${bottom} ${left} ${bottom - rx} L ${left} ${top + rx} Q ${left} ${top} ${left + rx} ${top} Z`;
  
  const margin = 12;
  const iw = w - margin * 2;
  const ih = h - margin * 2;
  d += ` M ${-iw/2} ${-ih/2} L ${-iw/2} ${ih/2} L ${iw/2} ${ih/2} L ${iw/2} ${-ih/2} Z`;
  return d;
}

export const applyImageClip = (image: FabricObject) => {
  const metadata = ensureMetadata(image);
  // Collage cell framing is handled by applyCollageCellFrame.
  const clip = metadata.clip ?? DEFAULT_IMAGE_CLIP;
  const width = Number(image.width ?? 1);
  const height = Number(image.height ?? 1);

  if (image instanceof Group) {
    const existing = image.getObjects().find(o => (o as any).data?.isFrameOverlay);
    if (existing) {
      image.remove(existing);
    }

    let overlayD = '';
    let overlayFill = '#ffffff';

    if (clip.type === 'polaroid') {
      overlayD = createPolaroidOverlayPath(width, height);
      overlayFill = '#ffffff';
    } else if (clip.type === 'filmStrip') {
      overlayD = createFilmStripOverlayPath(width, height);
      overlayFill = '#111111';
    } else if (clip.type === 'desktopWindow') {
      overlayD = createDesktopWindowOverlayPath(width, height);
      overlayFill = '#f3f4f6';
    } else if (clip.type === 'fileFolder') {
      overlayD = createFileFolderOverlayPath(width, height);
      overlayFill = '#fcd34d';
    } else if (clip.type === 'airDropCard') {
      overlayD = createAirDropOverlayPath(width, height);
      overlayFill = '#e5e7eb';
    } else if (clip.type === 'image-preset' && clip.assetUrl) {
      const safeSrc = clip.assetUrl;
      FabricImage.fromURL(safeSrc).then((img) => {
        if (!image.getObjects) return;
        const existing = image.getObjects().find(o => (o as any).data?.isFrameOverlay);
        if (existing) {
          image.remove(existing);
        }
        img.set({
          scaleX: width / Number(img.width || 1),
          scaleY: height / Number(img.height || 1),
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
          left: 0,
          top: 0,
          objectCaching: false,
        });
        (img as any).data = { isFrameOverlay: true };
        image.add(img);
        image.dirty = true;
        image.canvas?.requestRenderAll();
      }).catch((err) => {
        console.error('Failed to load preset frame image:', err);
      });
    }

    if (overlayD) {
      const overlay = new Path(overlayD, {
        fill: overlayFill,
        strokeWidth: 0,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
        left: 0,
        top: 0,
        objectCaching: false,
      });
      (overlay as any).data = { isFrameOverlay: true };
      image.add(overlay);
    }
  }

  const clipPath = createFrameAwareClipPath(
    clip,
    width,
    height,
    Number(image.scaleX ?? 1),
    Number(image.scaleY ?? 1),
  );

  image.set({
    clipPath: undefined,
    objectCaching: false,
  });
  image.set('clipPath', clipPath);
  if (clipPath) {
    clipPath.dirty = true;
  }
  image.dirty = true;
};

export const clearImageClipForCrop = (image: FabricObject) => {
  image.set({
    clipPath: undefined,
    objectCaching: false,
  });
  image.dirty = true;
};

export const findOutlineForImage = (canvas: Canvas, layerId: string) =>
  canvas.getObjects().filter((object) => getOutlineLayerId(object) === layerId) as FabricOutlineObject[];

export const removeOutlineForImage = (canvas: Canvas, layerId: string) => {
  const outlines = findOutlineForImage(canvas, layerId);
  outlines.forEach((outline) => {
    canvas.remove(outline);
  });
};

export const applyCollageCellFrame = (
  image: FabricImageObject,
  rect: { left: number; top: number; width: number; height: number },
  radiusPx: number,
  clipType?: ClipType,
) => {
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const rx = Math.max(0, Math.min(radiusPx, w / 2, h / 2));
  const clipSpec: ClipSpec = clipType && clipType !== 'rect'
    ? { type: clipType, radius: rx }
    : { type: rx > 0 ? 'roundRect' : 'rect', radius: rx };
  const clipPath = createClipPath(clipSpec, w, h) ?? new Rect({
    width: w,
    height: h,
    originX: 'center',
    originY: 'center',
    objectCaching: false,
  });

  clipPath.set({
    left: rect.left + w / 2,
    top: rect.top + h / 2,
    absolutePositioned: true,
    objectCaching: false,
  });
  image.set({ clipPath, objectCaching: false });
  image.dirty = true;
};

export const applyCollageImageFocus = (
  image: FabricImageObject,
  rect: { left: number; top: number; width: number; height: number },
  focusX = 0.5,
  focusY = 0.5,
  absoluteZoom?: number,
) => {
  const natural = getImageNaturalSize(image);
  const naturalW = Math.max(1, natural.width);
  const naturalH = Math.max(1, natural.height);

  const minScale = Math.max(rect.width / naturalW, rect.height / naturalH);
  let scale = minScale;
  if (absoluteZoom !== undefined) {
    scale = Math.max(minScale, Math.min(Math.max(1.0, minScale * 3), absoluteZoom));
  }

  const scaledW = naturalW * scale;
  const scaledH = naturalH * scale;

  const minLeft = rect.left + rect.width - scaledW / 2;
  const maxLeft = rect.left + scaledW / 2;
  const minTop = rect.top + rect.height - scaledH / 2;
  const maxTop = rect.top + scaledH / 2;

  let targetLeft = maxLeft - focusX * (maxLeft - minLeft);
  let targetTop = maxTop - focusY * (maxTop - minTop);

  targetLeft = Math.max(minLeft, Math.min(maxLeft, targetLeft));
  targetTop = Math.max(minTop, Math.min(maxTop, targetTop));

  image.set({
    left: targetLeft,
    top: targetTop,
    scaleX: scale,
    scaleY: scale,
  });
};

export const createCollagePlaceholder = (
  collageId: string,
  cellIndex: number,
  rect: { left: number; top: number; width: number; height: number },
  radiusPx: number,
): FabricPlaceholderObject => {
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const rx = Math.max(0, Math.min(radiusPx, w / 2, h / 2));
  const placeholder = new Rect({
    left: rect.left + w / 2,
    top: rect.top + h / 2,
    width: w,
    height: h,
    rx,
    ry: rx,
    originX: 'center',
    originY: 'center',
    fill: 'rgba(160, 180, 200, 0.10)',
    stroke: 'rgba(100, 130, 160, 0.45)',
    strokeWidth: 1.5,
    strokeDashArray: [8, 5],
    strokeUniform: true,
    selectable: true,
    evented: true,
    hasControls: false,
    hasBorders: false,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
    lockRotation: true,
    objectCaching: false,
  }) as FabricPlaceholderObject;

  placeholder.data = {
    placeholderForCollageId: collageId,
    placeholderCellIndex: cellIndex,
  };

  return placeholder;
};

export const findTextBackgroundBox = (canvas: Canvas, layerId: string) =>
  canvas.getObjects().filter((object) => getTextBackgroundBoxLayerId(object) === layerId) as FabricTextBackgroundBoxObject[];

export const removeTextBackgroundBox = (canvas: Canvas, layerId: string) => {
  findTextBackgroundBox(canvas, layerId).forEach((box) => canvas.remove(box));
};

export const normalizeTextShadow = (shadow?: ShadowSettings): ShadowSettings => ({
  ...DEFAULT_TEXT_SHADOW,
  ...(shadow ?? {}),
  blur: Math.max(0, Number(shadow?.blur ?? DEFAULT_TEXT_SHADOW.blur)),
  offsetX: Number(shadow?.offsetX ?? DEFAULT_TEXT_SHADOW.offsetX),
  offsetY: Number(shadow?.offsetY ?? DEFAULT_TEXT_SHADOW.offsetY),
});

export const normalizeTextBackgroundBox = (backgroundBox?: TextBackgroundBoxSettings): TextBackgroundBoxSettings => ({
  ...DEFAULT_TEXT_BACKGROUND_BOX,
  ...(backgroundBox ?? {}),
  padding: Math.max(0, Number(backgroundBox?.padding ?? DEFAULT_TEXT_BACKGROUND_BOX.padding)),
  radius: Math.max(0, Number(backgroundBox?.radius ?? DEFAULT_TEXT_BACKGROUND_BOX.radius)),
});

export const applyTextShadow = (textbox: FabricLayerObject, shadow?: ShadowSettings) => {
  const safeShadow = normalizeTextShadow(shadow);

  textbox.set({
    shadow: safeShadow.enabled
      ? new Shadow({
          color: safeShadow.color,
          blur: safeShadow.blur,
          offsetX: safeShadow.offsetX,
          offsetY: safeShadow.offsetY,
        })
      : undefined,
  });
  textbox.dirty = true;
};

export const applyImageShadow = (object: FabricObject, shadow?: ShadowSettings) => {
  const safeShadow = normalizeTextShadow(shadow);

  object.set({
    shadow: safeShadow.enabled
      ? new Shadow({
          color: safeShadow.color,
          blur: Math.max(0, safeShadow.blur),
          offsetX: safeShadow.offsetX,
          offsetY: safeShadow.offsetY,
        })
      : undefined,
  });
  object.dirty = true;
};

export const applyShapeShadowAndGradient = (object: FabricObject) => {
  const metadata = getMetadata(object);
  if (!metadata || metadata.layerType !== 'shape') return;

  // 1. Apply Shadow
  const shadowSettings = metadata.shadow;
  if (shadowSettings && shadowSettings.enabled) {
    object.set({
      shadow: new Shadow({
        color: shadowSettings.color,
        blur: Math.max(0, shadowSettings.blur),
        offsetX: shadowSettings.offsetX,
        offsetY: shadowSettings.offsetY,
      })
    });
  } else {
    object.set({ shadow: undefined });
  }

  // 2. Apply Fill (Solid Color or Gradient)
  const isGradient = metadata.gradientEnabled && metadata.gradientColors;
  if (isGradient) {
    const gType = metadata.gradientType ?? 'linear';
    const colors = metadata.gradientColors ?? ['#ffd43b', '#ffd43b'];
    const angle = metadata.gradientAngle ?? 0;

    const w = object.width ?? 100;
    const h = object.height ?? 100;
    const cx = w / 2;
    const cy = h / 2;

    let coords: any;
    if (gType === 'linear') {
      const angleRad = (angle * Math.PI) / 180;
      const r = Math.sqrt(w * w + h * h) / 2;
      coords = {
        x1: cx - Math.cos(angleRad) * r,
        y1: cy - Math.sin(angleRad) * r,
        x2: cx + Math.cos(angleRad) * r,
        y2: cy + Math.sin(angleRad) * r,
      };
    } else {
      coords = {
        x1: cx,
        y1: cy,
        r1: 0,
        x2: cx,
        y2: cy,
        r2: Math.min(w, h) / 2,
      };
    }

    const grad = new Gradient({
      type: gType,
      coords,
      colorStops: [
        { offset: 0, color: colors[0] },
        { offset: 1, color: colors[1] },
      ],
    });

    object.set({ fill: grad });
    if (object instanceof Group) {
      object.getObjects().forEach((child) => {
        child.set({ fill: grad });
      });
    }
  } else {
    const solidFill = metadata.solidFill ?? (typeof object.fill === 'string' ? object.fill : '#ffd43b');
    object.set({ fill: solidFill });
    if (object instanceof Group) {
      object.getObjects().forEach((child) => {
        child.set({ fill: solidFill });
      });
    }
  }

  object.dirty = true;
};

export const syncTextBackgroundBox = (canvas: Canvas, textbox: FabricLayerObject) => {
  const metadata = ensureMetadata(textbox);
  const layerId = metadata.layerId;
  const backgroundBox = normalizeTextBackgroundBox(metadata.backgroundBox);

  removeTextBackgroundBox(canvas, layerId);

  if (!backgroundBox.enabled || textbox.visible === false) {
    return;
  }

  const scaledWidth = Math.max(1, textbox.getScaledWidth());
  const scaledHeight = Math.max(1, textbox.getScaledHeight());
  const padding = Math.max(0, backgroundBox.padding);
  const width = Math.max(1, scaledWidth + padding * 2);
  const height = Math.max(1, scaledHeight + padding * 2);
  const radius = Math.min(Math.max(0, backgroundBox.radius), Math.min(width, height) / 2);

  const box = new Rect({
    left: textbox.left,
    top: textbox.top,
    width,
    height,
    rx: radius,
    ry: radius,
    originX: textbox.originX,
    originY: textbox.originY,
    angle: textbox.angle,
    fill: backgroundBox.fill,
    strokeWidth: 0,
    opacity: textbox.opacity,
    visible: textbox.visible,
    scaleX: 1,
    scaleY: 1,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    globalCompositeOperation: fabricCompositeOperationForBlendMode(metadata.blendMode),
    objectCaching: false,
  }) as FabricTextBackgroundBoxObject;

  box.data = { backgroundBoxForTextLayerId: layerId };
  box.dirty = true;
  canvas.add(box);

  const objects = canvas.getObjects();
  const textIndex = objects.indexOf(textbox);
  const boxIndex = objects.indexOf(box);
  if (textIndex >= 0 && boxIndex >= 0 && boxIndex !== textIndex) {
    canvas.moveObjectTo(box, Math.max(0, textIndex));
  }
};

export const removeCropHelpersForImage = (canvas: Canvas, layerId: string) => {
  canvas
    .getObjects()
    .filter((object) => getCropHelperLayerId(object) === layerId)
    .forEach((object) => canvas.remove(object));
};

export const getCropBoxForImage = (canvas: Canvas, layerId: string) =>
  canvas
    .getObjects()
    .find((object) => getCropHelperLayerId(object) === layerId && getCropHelperKind(object) === 'box') as
    | FabricCropHelperObject
    | undefined;

export const getCropBoxScaledSize = (box: FabricObject) => ({
  width: Math.max(1, Number(box.width ?? 1) * Math.abs(Number(box.scaleX ?? 1))),
  height: Math.max(1, Number(box.height ?? 1) * Math.abs(Number(box.scaleY ?? 1))),
});

const CROP_HANDLE_VISIBLE_SIZE = 12;
const CROP_HANDLE_HIT_SIZE = 36;
const CROP_HANDLE_TOUCH_SIZE = 44;
const CROP_HANDLE_OFFSET = 8;

const drawCropCornerHandle = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
) => {
  const radius = CROP_HANDLE_VISIBLE_SIZE / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(left, top, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.stroke();
  ctx.restore();
};

const drawCropEdgeHandle = (
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  horizontal: boolean,
) => {
  const width = horizontal ? 22 : 8;
  const height = horizontal ? 8 : 22;
  const radius = 4;
  const x = left - width / 2;
  const y = top - height / 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 4;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.stroke();
  ctx.restore();
};

const configureCropBoxControls = (box: FabricObject) => {
  const controls = (box as FabricObject & { controls?: Record<string, Control> }).controls;
  if (!controls) return;

  const cornerOffsets: Record<string, [number, number]> = {
    tl: [-CROP_HANDLE_OFFSET, -CROP_HANDLE_OFFSET],
    tr: [CROP_HANDLE_OFFSET, -CROP_HANDLE_OFFSET],
    br: [CROP_HANDLE_OFFSET, CROP_HANDLE_OFFSET],
    bl: [-CROP_HANDLE_OFFSET, CROP_HANDLE_OFFSET],
  };

  Object.entries(cornerOffsets).forEach(([key, [offsetX, offsetY]]) => {
    const control = controls[key];
    if (!control) return;
    control.offsetX = offsetX;
    control.offsetY = offsetY;
    control.sizeX = CROP_HANDLE_HIT_SIZE;
    control.sizeY = CROP_HANDLE_HIT_SIZE;
    control.touchSizeX = CROP_HANDLE_TOUCH_SIZE;
    control.touchSizeY = CROP_HANDLE_TOUCH_SIZE;
    control.render = drawCropCornerHandle;
  });

  const edgeControls: Record<string, { offsetX: number; offsetY: number; horizontal: boolean }> = {
    mt: { offsetX: 0, offsetY: -CROP_HANDLE_OFFSET, horizontal: true },
    mb: { offsetX: 0, offsetY: CROP_HANDLE_OFFSET, horizontal: true },
    ml: { offsetX: -CROP_HANDLE_OFFSET, offsetY: 0, horizontal: false },
    mr: { offsetX: CROP_HANDLE_OFFSET, offsetY: 0, horizontal: false },
  };

  Object.entries(edgeControls).forEach(([key, config]) => {
    const control = controls[key];
    if (!control) return;
    control.offsetX = config.offsetX;
    control.offsetY = config.offsetY;
    control.sizeX = CROP_HANDLE_HIT_SIZE;
    control.sizeY = CROP_HANDLE_HIT_SIZE;
    control.touchSizeX = CROP_HANDLE_TOUCH_SIZE;
    control.touchSizeY = CROP_HANDLE_TOUCH_SIZE;
    control.render = (ctx, left, top) => drawCropEdgeHandle(ctx, left, top, config.horizontal);
  });
};

export const clampCropBoxPositionToImage = (image: FabricImageObject, box: FabricObject) => {
  const frameWidth = Math.max(1, image.getScaledWidth());
  const frameHeight = Math.max(1, image.getScaledHeight());
  const { width: boxWidth, height: boxHeight } = getCropBoxScaledSize(box);
  const imageLeft = Number(image.left ?? 0);
  const imageTop = Number(image.top ?? 0);
  const maxOffsetX = Math.max(0, (frameWidth - Math.min(boxWidth, frameWidth)) / 2);
  const maxOffsetY = Math.max(0, (frameHeight - Math.min(boxHeight, frameHeight)) / 2);
  const nextLeft = clamp(Number(box.left ?? imageLeft), imageLeft - maxOffsetX, imageLeft + maxOffsetX);
  const nextTop = clamp(Number(box.top ?? imageTop), imageTop - maxOffsetY, imageTop + maxOffsetY);

  if (nextLeft !== box.left || nextTop !== box.top) {
    box.set({ left: nextLeft, top: nextTop });
    box.setCoords();
  }
};

export const syncImageOutline = (
  canvas: Canvas,
  image: FabricObject,
  repositionFrameRect?: { left: number; top: number; width: number; height: number; angle?: number; radius?: number } | null
) => {
  const metadata = ensureMetadata(image);
  const layerId = metadata.layerId;
  const stroke = metadata.stroke ?? DEFAULT_IMAGE_STROKE;

  removeOutlineForImage(canvas, layerId);

  if (image.visible === false) {
    return;
  }

  if (repositionFrameRect) {
    const outlineWidth = repositionFrameRect.width;
    const outlineHeight = repositionFrameRect.height;
    const outlineLeft = repositionFrameRect.left + repositionFrameRect.width / 2;
    const outlineTop = repositionFrameRect.top + repositionFrameRect.height / 2;
    const outlineAngle = repositionFrameRect.angle ?? 0;

    const clipSpec = metadata.clip ?? DEFAULT_IMAGE_CLIP;
    let outline: FabricObject | undefined;

    if (repositionFrameRect.radius !== undefined) {
      const rx = Math.max(0, Math.min(repositionFrameRect.radius, outlineWidth / 2, outlineHeight / 2));
      outline = new Rect({
        width: outlineWidth - 2,
        height: outlineHeight - 2,
        fill: 'transparent',
        stroke: '#ff3b30',
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        strokeLineJoin: 'round',
        strokeLineCap: 'round',
        rx,
        ry: rx,
      });
    } else if (clipSpec && clipSpec.type !== 'none') {
      outline = createClipPath(clipSpec, outlineWidth, outlineHeight);
      if (outline) {
        outline.set({
          fill: 'transparent',
          stroke: '#ff3b30',
          strokeWidth: 2,
          strokeDashArray: [6, 4],
          strokeLineJoin: 'round',
          strokeLineCap: 'round',
        });
      }
    } else {
      outline = new Rect({
        width: outlineWidth - 2,
        height: outlineHeight - 2,
        fill: 'transparent',
        stroke: '#ff3b30',
        strokeWidth: 2,
        strokeDashArray: [6, 4],
        strokeLineJoin: 'round',
        strokeLineCap: 'round',
      });
    }

    if (!outline) return;

    (outline as any).data = { outlineForLayerId: layerId };
    outline.set({
      left: outlineLeft,
      top: outlineTop,
      scaleX: 1,
      scaleY: 1,
      angle: outlineAngle,
      opacity: 0.9,
      visible: true,
      originX: 'center',
      originY: 'center',
      objectCaching: false,
      selectable: false,
      evented: false,
      hasControls: false,
      hasBorders: false,
    });
    outline.dirty = true;

    canvas.add(outline);
    canvas.requestRenderAll();
    return;
  }

  if (!stroke.enabled || stroke.width <= 0) {
    return;
  }

  let outlineWidth = Math.max(1, image.getScaledWidth());
  let outlineHeight = Math.max(1, image.getScaledHeight());
  let outlineLeft = image.left;
  let outlineTop = image.top;
  let outlineAngle = image.angle;

  const outline = createMaskedStrokeOutline(
    metadata.clip ?? DEFAULT_IMAGE_CLIP,
    outlineWidth,
    outlineHeight,
    stroke.width,
    stroke.color,
  ) as FabricOutlineObject | undefined;

  if (!outline) return;

  outline.data = { outlineForLayerId: layerId };
  outline.set({
    left: outlineLeft,
    top: outlineTop,
    scaleX: 1,
    scaleY: 1,
    angle: outlineAngle,
    opacity: image.opacity,
    visible: image.visible,
    originX: image.originX,
    originY: image.originY,
    objectCaching: false,
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
  });
  outline.dirty = true;

  canvas.add(outline);

  const objects = canvas.getObjects();
  const imageIndex = objects.indexOf(image);
  const outlineIndex = objects.indexOf(outline);
  if (imageIndex >= 0 && outlineIndex >= 0 && outlineIndex !== imageIndex + 1) {
    canvas.moveObjectTo(outline, imageIndex + 1);
  }
};

export const cropToBoxGeometry = (image: FabricImageObject, crop: ImageCrop | undefined) => {
  const frameWidth = Math.max(1, image.getScaledWidth());
  const frameHeight = Math.max(1, image.getScaledHeight());
  const safeCrop = {
    ...DEFAULT_IMAGE_CROP,
    ...(crop ?? {}),
  };
  const scale = clamp(safeCrop.enabled ? safeCrop.scale || 1 : 1, 1, 4);
  const cropWidthRatio = clamp(safeCrop.cropWidthRatio ?? 1 / scale, 0.25, 1);
  const cropHeightRatio = clamp(safeCrop.cropHeightRatio ?? 1 / scale, 0.25, 1);
  const boxWidth = frameWidth * cropWidthRatio;
  const boxHeight = frameHeight * cropHeightRatio;
  const maxOffsetX = Math.max(0, (frameWidth - boxWidth) / 2);
  const maxOffsetY = Math.max(0, (frameHeight - boxHeight) / 2);
  const offsetX = clamp(safeCrop.offsetX ?? 0, -100, 100);
  const offsetY = clamp(safeCrop.offsetY ?? 0, -100, 100);

  return {
    left: Number(image.left ?? 0) + (maxOffsetX * offsetX) / 100,
    top: Number(image.top ?? 0) + (maxOffsetY * offsetY) / 100,
    width: boxWidth,
    height: boxHeight,
    angle: Number(image.angle ?? 0),
  };
};

export const boxGeometryToCrop = (image: FabricImageObject, box: FabricObject): ImageCrop => {
  const frameWidth = Math.max(1, image.getScaledWidth());
  const frameHeight = Math.max(1, image.getScaledHeight());
  const boxSize = getCropBoxScaledSize(box);
  const boxWidth = clamp(boxSize.width, frameWidth / 4, frameWidth);
  const boxHeight = clamp(boxSize.height, frameHeight / 4, frameHeight);
  const cropWidthRatio = clamp(boxWidth / frameWidth, 0.25, 1);
  const cropHeightRatio = clamp(boxHeight / frameHeight, 0.25, 1);
  const scale = clamp(Math.max(1 / cropWidthRatio, 1 / cropHeightRatio), 1, 4);
  const cropWidth = frameWidth * cropWidthRatio;
  const cropHeight = frameHeight * cropHeightRatio;
  const maxOffsetX = Math.max(0, (frameWidth - cropWidth) / 2);
  const maxOffsetY = Math.max(0, (frameHeight - cropHeight) / 2);
  const left = clamp(Number(box.left ?? image.left ?? 0), Number(image.left ?? 0) - maxOffsetX, Number(image.left ?? 0) + maxOffsetX);
  const top = clamp(Number(box.top ?? image.top ?? 0), Number(image.top ?? 0) - maxOffsetY, Number(image.top ?? 0) + maxOffsetY);

  return {
    enabled: scale > 1.001 || Math.abs(left - Number(image.left ?? 0)) > 0.5 || Math.abs(top - Number(image.top ?? 0)) > 0.5,
    offsetX: maxOffsetX > 0 ? Math.round(((left - Number(image.left ?? 0)) / maxOffsetX) * 100) : 0,
    offsetY: maxOffsetY > 0 ? Math.round(((top - Number(image.top ?? 0)) / maxOffsetY) * 100) : 0,
    scale: Number(scale.toFixed(2)),
    cropWidthRatio: Number(cropWidthRatio.toFixed(4)),
    cropHeightRatio: Number(cropHeightRatio.toFixed(4)),
    frameWidth,
    frameHeight,
  };
};

export const fitCropToAspectRatio = (crop: ImageCrop, aspectRatio: number): ImageCrop => {
  const frameWidth = Math.max(1, crop.frameWidth ?? 1);
  const frameHeight = Math.max(1, crop.frameHeight ?? 1);
  const frameRatio = frameWidth / frameHeight;
  let cropWidthRatio: number;
  let cropHeightRatio: number;

  if (aspectRatio > frameRatio) {
    cropWidthRatio = 1;
    cropHeightRatio = clamp(frameRatio / aspectRatio, 0.25, 1);
  } else {
    cropHeightRatio = 1;
    cropWidthRatio = clamp(aspectRatio / frameRatio, 0.25, 1);
  }

  return {
    ...crop,
    enabled: true,
    offsetX: 0,
    offsetY: 0,
    scale: Number(Math.max(1 / cropWidthRatio, 1 / cropHeightRatio).toFixed(2)),
    cropWidthRatio: Number(cropWidthRatio.toFixed(4)),
    cropHeightRatio: Number(cropHeightRatio.toFixed(4)),
    frameWidth,
    frameHeight,
  };
};

export const normalizeCropBoxToAspectRatio = (image: FabricImageObject, box: FabricObject, aspectRatio: number) => {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) return;

  const frameWidth = Math.max(1, image.getScaledWidth());
  const frameHeight = Math.max(1, image.getScaledHeight());
  const boxSize = getCropBoxScaledSize(box);
  let boxWidth = clamp(boxSize.width, frameWidth / 4, frameWidth);
  let boxHeight = clamp(boxSize.height, frameHeight / 4, frameHeight);

  if (boxWidth / boxHeight > aspectRatio) {
    boxHeight = boxWidth / aspectRatio;
    if (boxHeight > frameHeight) {
      boxHeight = frameHeight;
      boxWidth = boxHeight * aspectRatio;
    }
  } else {
    boxWidth = boxHeight * aspectRatio;
    if (boxWidth > frameWidth) {
      boxWidth = frameWidth;
      boxHeight = boxWidth / aspectRatio;
    }
  }

  boxWidth = clamp(boxWidth, frameWidth / 4, frameWidth);
  boxHeight = clamp(boxHeight, frameHeight / 4, frameHeight);

  const imageLeft = Number(image.left ?? 0);
  const imageTop = Number(image.top ?? 0);
  const maxOffsetX = Math.max(0, (frameWidth - boxWidth) / 2);
  const maxOffsetY = Math.max(0, (frameHeight - boxHeight) / 2);
  const left = clamp(Number(box.left ?? imageLeft), imageLeft - maxOffsetX, imageLeft + maxOffsetX);
  const top = clamp(Number(box.top ?? imageTop), imageTop - maxOffsetY, imageTop + maxOffsetY);

  box.set({
    left,
    top,
    width: boxWidth,
    height: boxHeight,
    scaleX: 1,
    scaleY: 1,
    angle: Number(image.angle ?? 0),
  });
  box.setCoords();
};

export const addCropGridLines = (canvas: Canvas, layerId: string, box: FabricObject) => {
  canvas
    .getObjects()
    .filter((object) => getCropHelperLayerId(object) === layerId && getCropHelperKind(object) === 'grid')
    .forEach((object) => canvas.remove(object));

  const { width, height } = getCropBoxScaledSize(box);
  const left = Number(box.left ?? 0);
  const top = Number(box.top ?? 0);
  const angle = Number(box.angle ?? 0);
  const lines: FabricCropHelperObject[] = [
    new Line([-width / 6, -height / 2, -width / 6, height / 2], {
      left,
      top,
      originX: 'center',
      originY: 'center',
      stroke: 'rgba(255,255,255,0.85)',
      strokeWidth: 1,
      angle,
      selectable: false,
      evented: false,
      objectCaching: false,
    }) as FabricCropHelperObject,
    new Line([width / 6, -height / 2, width / 6, height / 2], {
      left,
      top,
      originX: 'center',
      originY: 'center',
      stroke: 'rgba(255,255,255,0.85)',
      strokeWidth: 1,
      angle,
      selectable: false,
      evented: false,
      objectCaching: false,
    }) as FabricCropHelperObject,
    new Line([-width / 2, -height / 6, width / 2, -height / 6], {
      left,
      top,
      originX: 'center',
      originY: 'center',
      stroke: 'rgba(255,255,255,0.85)',
      strokeWidth: 1,
      angle,
      selectable: false,
      evented: false,
      objectCaching: false,
    }) as FabricCropHelperObject,
    new Line([-width / 2, height / 6, width / 2, height / 6], {
      left,
      top,
      originX: 'center',
      originY: 'center',
      stroke: 'rgba(255,255,255,0.85)',
      strokeWidth: 1,
      angle,
      selectable: false,
      evented: false,
      objectCaching: false,
    }) as FabricCropHelperObject,
  ];

  lines.forEach((line) => {
    line.data = { cropHelperForLayerId: layerId, cropHelperKind: 'grid' };
    canvas.add(line);
  });
};

export const syncCropOverlay = (canvas: Canvas, image: FabricImageObject, box: FabricObject) => {
  const metadata = ensureMetadata(image);
  const layerId = metadata.layerId;

  canvas
    .getObjects()
    .filter((object) => getCropHelperLayerId(object) === layerId && getCropHelperKind(object) === 'overlay')
    .forEach((object) => canvas.remove(object));

  const imgLeft = Number(image.left ?? 0);
  const imgTop = Number(image.top ?? 0);
  const imgW = Math.max(1, image.getScaledWidth());
  const imgH = Math.max(1, image.getScaledHeight());
  const boxLeft = Number(box.left ?? imgLeft);
  const boxTop = Number(box.top ?? imgTop);
  const boxSize = getCropBoxScaledSize(box);
  const boxW = boxSize.width;
  const boxH = boxSize.height;
  const angle = Number(image.angle ?? 0);

  const overlay = new Rect({
    left: imgLeft,
    top: imgTop,
    width: imgW,
    height: imgH,
    scaleX: 1,
    scaleY: 1,
    angle,
    originX: 'center',
    originY: 'center',
    fill: 'rgba(0,0,0,0.5)',
    selectable: false,
    evented: false,
    objectCaching: false,
    strokeWidth: 0,
  }) as FabricCropHelperObject;
  overlay.data = { cropHelperForLayerId: layerId, cropHelperKind: 'overlay' };

  const cutout = new Rect({
    left: boxLeft,
    top: boxTop,
    width: boxW,
    height: boxH,
    originX: 'center',
    originY: 'center',
    angle,
    fill: 'black',
    strokeWidth: 0,
    absolutePositioned: true,
    selectable: false,
    evented: false,
  });
  (cutout as FabricObject & { inverted?: boolean }).inverted = true;
  overlay.clipPath = cutout;
  (overlay.clipPath as FabricObject & { inverted?: boolean }).inverted = true;

  canvas.add(overlay);

  const objects = canvas.getObjects();
  const imageIndex = objects.indexOf(image);
  const overlayIndex = objects.indexOf(overlay);
  if (imageIndex >= 0 && overlayIndex >= 0) {
    canvas.moveObjectTo(overlay, imageIndex + 1);
  }
};

export const syncCropBoxDecorations = (canvas: Canvas, image: FabricImageObject, box: FabricObject) => {
  const metadata = ensureMetadata(image);

  box.setCoords();
  addCropGridLines(canvas, metadata.layerId, box);
  syncCropOverlay(canvas, image, box);

  const objects = canvas.getObjects();
  const boxIndex = objects.indexOf(box);
  const overlayObj = canvas.getObjects().find(
    (object) => getCropHelperLayerId(object) === metadata.layerId && getCropHelperKind(object) === 'overlay'
  );
  if (overlayObj) {
    const overlayIndex = objects.indexOf(overlayObj);
    if (overlayIndex > boxIndex) {
      canvas.moveObjectTo(box, overlayIndex + 1);
    }
  }

  canvas.setActiveObject(box);
};

export const syncCropBox = (canvas: Canvas, image: FabricImageObject, crop: ImageCrop | undefined, aspectRatio: number | null = null) => {
  const metadata = ensureMetadata(image);
  const geometry = cropToBoxGeometry(image, crop);
  const existingBox = getCropBoxForImage(canvas, metadata.layerId);

  const box = existingBox ?? new Rect({
    fill: 'rgba(255,255,255,0.0)',
    stroke: 'rgba(255,255,255,0.95)',
    strokeDashArray: undefined,
    strokeUniform: true,
    strokeWidth: 1.5,
    originX: 'center',
    originY: 'center',
    cornerColor: '#ffffff',
    cornerStrokeColor: 'rgba(0,0,0,0.35)',
    cornerStyle: 'circle',
    cornerSize: CROP_HANDLE_HIT_SIZE,
    touchCornerSize: CROP_HANDLE_TOUCH_SIZE,
    transparentCorners: false,
    centeredRotation: true,
    lockRotation: true,
    selectable: true,
    evented: true,
    objectCaching: false,
    borderColor: 'rgba(255,255,255,0.8)',
    borderScaleFactor: 1.5,
    padding: CROP_HANDLE_OFFSET,
  }) as FabricCropHelperObject;

  configureCropBoxControls(box);

  box.data = { cropHelperForLayerId: metadata.layerId, cropHelperKind: 'box' };
  box.set({
    left: geometry.left,
    top: geometry.top,
    width: geometry.width,
    height: geometry.height,
    scaleX: 1,
    scaleY: 1,
    angle: geometry.angle,
  });
  box.setControlsVisibility({
    mtr: false,
    mt: aspectRatio === null,
    mb: aspectRatio === null,
    ml: aspectRatio === null,
    mr: aspectRatio === null,
  });

  if (!existingBox) {
    canvas.add(box);
  }
  box.setCoords();
  addCropGridLines(canvas, metadata.layerId, box);

  syncCropOverlay(canvas, image, box);

  const objects = canvas.getObjects();
  const boxIndex = objects.indexOf(box);
  const overlayObj = canvas.getObjects().find(
    (o) => getCropHelperLayerId(o) === metadata.layerId && getCropHelperKind(o) === 'overlay'
  );
  if (overlayObj) {
    const overlayIndex = objects.indexOf(overlayObj);
    if (overlayIndex > boxIndex) {
      canvas.moveObjectTo(box, overlayIndex + 1);
    }
  }

  canvas.setActiveObject(box);
};

export const applyImageCrop = (image: FabricObject, crop: ImageCrop | undefined) => {
  const metadata = ensureMetadata(image);
  const safeCrop = crop ?? DEFAULT_IMAGE_CROP;

  if (image instanceof Group) {
    const childImage = getImageChild(image);
    if (childImage) {
      childImage.set({
        left: safeCrop.offsetX ?? 0,
        top: safeCrop.offsetY ?? 0,
        scaleX: safeCrop.scale ?? 1,
        scaleY: safeCrop.scale ?? 1,
        angle: safeCrop.angle ?? 0,
      });
      childImage.setCoords();
    }
    metadata.crop = {
      enabled: safeCrop.enabled ?? true,
      offsetX: safeCrop.offsetX ?? 0,
      offsetY: safeCrop.offsetY ?? 0,
      scale: safeCrop.scale ?? 1,
      angle: safeCrop.angle ?? 0,
      frameWidth: image.width ?? 100,
      frameHeight: image.height ?? 100,
      feather: safeCrop.feather,
    };
    applyImageClip(image);
    image.dirty = true;
    return;
  }

  const natural = getImageNaturalSize(image as FabricImageObject);
  const currentFrameWidth = Math.max(1, image.getScaledWidth());
  const currentFrameHeight = Math.max(1, image.getScaledHeight());
  const frameWidth = Math.max(24, safeCrop.frameWidth ?? currentFrameWidth);
  const frameHeight = Math.max(24, safeCrop.frameHeight ?? currentFrameHeight);

  if (!safeCrop.enabled) {
    (image as FabricImageObject).set({
      cropX: 0,
      cropY: 0,
      width: natural.width,
      height: natural.height,
      scaleX: currentFrameWidth / natural.width,
      scaleY: currentFrameHeight / natural.height,
    });
    metadata.crop = { ...DEFAULT_IMAGE_CROP };
    applyImageClip(image);
    return;
  }

  const scale = clamp(safeCrop.scale || 1, 1, 4);
  const cropWidthRatio = clamp(safeCrop.cropWidthRatio ?? 1 / scale, 0.25, 1);
  const cropHeightRatio = clamp(safeCrop.cropHeightRatio ?? 1 / scale, 0.25, 1);
  const cropWidth = natural.width * cropWidthRatio;
  const cropHeight = natural.height * cropHeightRatio;
  const maxX = Math.max(0, natural.width - cropWidth);
  const maxY = Math.max(0, natural.height - cropHeight);
  const offsetX = clamp(safeCrop.offsetX ?? 0, -100, 100);
  const offsetY = clamp(safeCrop.offsetY ?? 0, -100, 100);

  (image as FabricImageObject).set({
    cropX: maxX * ((offsetX + 100) / 200),
    cropY: maxY * ((offsetY + 100) / 200),
    width: cropWidth,
    height: cropHeight,
    scaleX: frameWidth / cropWidth,
    scaleY: frameHeight / cropHeight,
  });

  metadata.crop = {
    enabled: true,
    offsetX,
    offsetY,
    scale,
    cropWidthRatio,
    cropHeightRatio,
    frameWidth,
    frameHeight,
    angle: safeCrop.angle ?? 0,
    feather: safeCrop.feather,
  };
  applyImageClip(image);
};

export const createCustomSvgShapeObject = (
  shapeType: ShapeType,
  canvasSize: CanvasSize,
  baseSize: number,
  style: ShapeStyle,
) => {
  const definition = CUSTOM_SVG_SHAPES[shapeType as keyof typeof CUSTOM_SVG_SHAPES];
  if (!definition) return null;

  const safeStyle = clampShapeStyleForType(shapeType, style);
  const parts = definition.items.map((item) => {
    const part = item.kind === 'path'
      ? new Path(item.d, {
        fill: safeStyle.fill,
        stroke: safeStyle.stroke,
        strokeWidth: safeStyle.strokeWidth,
        strokeUniform: true,
        objectCaching: false,
      })
      : new Polygon(item.points.map((point) => ({ x: point.x, y: point.y })), {
        fill: safeStyle.fill,
        stroke: safeStyle.stroke,
        strokeWidth: safeStyle.strokeWidth,
        strokeUniform: true,
        objectCaching: false,
      });

    part.set({
      selectable: false,
      evented: false,
    });
    return part;
  });

  const group = new Group(parts, {
    left: canvasSize.width / 2,
    top: canvasSize.height / 2,
    originX: 'center',
    originY: 'center',
    fill: safeStyle.fill,
    stroke: safeStyle.stroke,
    strokeWidth: safeStyle.strokeWidth,
    strokeUniform: true,
    subTargetCheck: false,
    objectCaching: false,
  });
  const largestSide = Math.max(Number(group.width ?? 1), Number(group.height ?? 1), 1);
  group.scale(baseSize / largestSide);
  group.set({
    fill: safeStyle.fill,
    stroke: safeStyle.stroke,
    strokeWidth: safeStyle.strokeWidth,
  });
  applyStyleToGroupChildren(group, safeStyle);
  return group;
};

export const createShapeObject = (shapeType: ShapeType, canvasSize: CanvasSize, style: ShapeStyle) => {
  const baseSize = Math.min(canvasSize.width, canvasSize.height) * 0.26;
  const safeStyle = clampShapeStyleForType(shapeType, style);
  const common = {
    left: canvasSize.width / 2,
    top: canvasSize.height / 2,
    originX: 'center' as const,
    originY: 'center' as const,
    fill: safeStyle.fill,
    stroke: safeStyle.stroke,
    strokeWidth: safeStyle.strokeWidth,
    strokeUniform: true,
  };

  const customSvgShape = createCustomSvgShapeObject(shapeType, canvasSize, baseSize, safeStyle);
  if (customSvgShape) return customSvgShape;

  if (shapeType === 'circle') {
    return new Circle({
      ...common,
      radius: baseSize / 2,
    });
  }

  if (shapeType === 'rounded-rectangle') {
    return new Rect({
      ...common,
      width: baseSize * 1.18,
      height: baseSize * 0.82,
      rx: baseSize * 0.12,
      ry: baseSize * 0.12,
    });
  }

  if (shapeType === 'star') {
    return new Polygon(createStarPoints(baseSize / 2, baseSize / 4.6), common);
  }

  if (shapeType === 'heart') {
    return new Path(
      'M 0 -34 C -42 -78 -104 -20 -68 38 L 0 104 L 68 38 C 104 -20 42 -78 0 -34 Z',
      {
        ...common,
        scaleX: baseSize / 210,
        scaleY: baseSize / 210,
      },
    );
  }

  if (shapeType === 'sparkle') {
    const createSparkleBar = (
      spec: (typeof SPARKLE_BAR_SPECS)[number],
      decorativeShapePart: 'fill' | 'outline',
    ) => {
      const outlineThickness = SPARKLE_CORE_THICKNESS + safeStyle.strokeWidth * 2;
      const thickness = decorativeShapePart === 'outline'
        ? Math.max(0.01, outlineThickness)
        : SPARKLE_CORE_THICKNESS;
      const length = decorativeShapePart === 'outline'
        ? spec.length + outlineThickness
        : spec.length;

      return new Rect({
        left: 0,
        top: 0,
        originX: 'center',
        originY: 'center',
        width: length,
        height: thickness,
        rx: thickness / 2,
        ry: thickness / 2,
        angle: spec.angle,
        fill: decorativeShapePart === 'fill' ? safeStyle.fill : safeStyle.stroke,
        stroke: undefined,
        strokeWidth: 0,
        visible: decorativeShapePart === 'fill' || safeStyle.strokeWidth > 0,
        selectable: false,
        evented: false,
        objectCaching: false,
        data: {
          decorativeShapePart,
          decorativeBaseLength: spec.length,
        },
      });
    };

    const outlineBars = SPARKLE_BAR_SPECS.map((spec) => createSparkleBar(spec, 'outline'));
    const fillBars = SPARKLE_BAR_SPECS.map((spec) => createSparkleBar(spec, 'fill'));
    const largestSide = SPARKLE_ARM_LENGTH;
    const scale = baseSize / largestSide;
    const strokePadding = getDecorativeStrokePaddingForShape(shapeType, scale) + SPARKLE_CORE_THICKNESS;
    const paddingBox = new Rect({
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center',
      width: SPARKLE_ARM_LENGTH + strokePadding * 2,
      height: SPARKLE_ARM_LENGTH + strokePadding * 2,
      fill: 'rgba(0,0,0,0)',
      stroke: undefined,
      strokeWidth: 0,
      selectable: false,
      evented: false,
      objectCaching: false,
      data: { decorativeShapePart: 'padding' },
    });
    const group = new Group([paddingBox, ...outlineBars, ...fillBars], {
      ...common,
      stroke: safeStyle.stroke,
      strokeWidth: safeStyle.strokeWidth,
      subTargetCheck: false,
      objectCaching: false,
    });
    group.scale(scale);
    group.set({
      fill: safeStyle.fill,
      stroke: safeStyle.stroke,
      strokeWidth: safeStyle.strokeWidth,
    });
    applyStyleToGroupChildren(group, safeStyle);
    return group;
  }

  return new Rect({
    ...common,
    width: baseSize,
    height: baseSize,
  });
};

/**
 * Reconstructs or initializes a canvas-backed layer mask on a Fabric object (or its inner child).
 * If maskDataUrl is supplied, it loads it onto the mask canvas.
 * Otherwise, it creates a clean white mask canvas (fully visible).
 */
export const applyLayerMask = async (
  object: FabricObject,
  maskDataUrl?: string,
  maskLinked = true
): Promise<HTMLCanvasElement> => {
  // If it's a group, apply it to the inner image child
  const target = object instanceof Group ? (getImageChild(object) ?? object) : object;

  const width = target.width ?? 100;
  const height = target.height ?? 100;

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;

  const ctx = maskCanvas.getContext('2d');
  if (ctx) {
    if (maskDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          resolve();
        };
        img.onerror = () => {
          // Fallback to fully white
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          resolve();
        };
        img.src = maskDataUrl;
      });
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
    }
  }

  // Create a FabricImage wrapping this mask canvas
  const maskImage = new FabricImage(maskCanvas, {
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    objectCaching: false,
  });

  if (!maskLinked) {
    const center = target.getPointByOrigin('center', 'center');
    let absoluteAngle = target.angle ?? 0;
    let curr: any = target.group;
    while (curr) {
      absoluteAngle += curr.angle ?? 0;
      curr = curr.group;
    }
    maskImage.set({
      absolutePositioned: true,
      left: center.x,
      top: center.y,
      scaleX: (object.group ? object.group.scaleX : 1) * (target.scaleX ?? 1),
      scaleY: (object.group ? object.group.scaleY : 1) * (target.scaleY ?? 1),
      angle: absoluteAngle,
    });
  } else {
    maskImage.set({
      absolutePositioned: false,
      left: 0,
      top: 0,
    });
  }

  // Assign it as the clipPath of the target
  target.clipPath = maskImage;
  target.dirty = true;
  if (target.group) {
    target.group.dirty = true;
  }

  // Store the canvas reference directly in target's runtime data for easy editing access
  (target as any).__maskCanvas = maskCanvas;
  (target as any).__maskImage = maskImage;

  return maskCanvas;
};


