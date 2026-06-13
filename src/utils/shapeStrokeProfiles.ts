import type { ShapeStyle, ShapeType } from '../types/layers';

export type ShapeStrokeProfileId = 'basic' | 'solidIcon' | 'thinIcon' | 'fillOnly';

export interface ShapeStrokeProfileRule {
  maxStrokeWidth: number;
  paddingMultiplier: number;
}

export const SHAPE_STROKE_PROFILE_RULES: Record<ShapeStrokeProfileId, ShapeStrokeProfileRule> = {
  basic: {
    maxStrokeWidth: 80,
    paddingMultiplier: 1,
  },
  solidIcon: {
    maxStrokeWidth: 64,
    paddingMultiplier: 1.25,
  },
  thinIcon: {
    maxStrokeWidth: 10,
    paddingMultiplier: 1.4,
  },
  fillOnly: {
    maxStrokeWidth: 0,
    paddingMultiplier: 0,
  },
};

const SOLID_ICON_SHAPES = new Set<ShapeType>([
  'asteriskSparkle',
  'petalBurst',
  'bubbleCluster',
  'tiltedStar',
  'layeredHeart',
  'dropletCluster',
  'pinwheel',
  'diamondSparkle',
  'outlinedStar',
  'shootingStar',
  'sunburst',
  'tornado',
  'blockArrow',
]);

export const getShapeStrokeProfile = (shapeType?: ShapeType): ShapeStrokeProfileId => {
  if (shapeType === 'sparkle') return 'thinIcon';
  if (shapeType && SOLID_ICON_SHAPES.has(shapeType)) return 'solidIcon';
  return 'basic';
};

export const getShapeStrokeRule = (shapeType?: ShapeType): ShapeStrokeProfileRule =>
  SHAPE_STROKE_PROFILE_RULES[getShapeStrokeProfile(shapeType)];

export const getMaxStrokeWidthForShape = (shapeType?: ShapeType) =>
  getShapeStrokeRule(shapeType).maxStrokeWidth;

export const clampStrokeWidthForShape = (shapeType: ShapeType | undefined, strokeWidth: number) => {
  const maxStrokeWidth = getMaxStrokeWidthForShape(shapeType);
  return Math.max(0, Math.min(maxStrokeWidth, Number.isFinite(strokeWidth) ? strokeWidth : 0));
};

export const clampShapeStyleForType = (shapeType: ShapeType | undefined, style: ShapeStyle): ShapeStyle => ({
  ...style,
  strokeWidth: clampStrokeWidthForShape(shapeType, style.strokeWidth),
});

export const getDecorativeStrokePaddingForShape = (shapeType: ShapeType | undefined, scale = 1) => {
  const rule = getShapeStrokeRule(shapeType);
  if (rule.maxStrokeWidth <= 0) return 0;
  const safeScale = Math.max(0.0001, Math.abs(scale));
  return (rule.maxStrokeWidth * rule.paddingMultiplier) / safeScale;
};
