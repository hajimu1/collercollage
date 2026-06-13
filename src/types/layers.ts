import type { ImageLayerData } from './imageLayer';
export type { ImageLayerData } from './imageLayer';

export type CanvasRatioId = '1:1' | '4:5' | '3:4' | '2:3' | '5:7' | '9:16' | '16:9' | 'custom';

export type LayerType = 'background' | 'image' | 'text' | 'shape' | 'overlay' | 'adjustment' | 'group';

export type ElementLayerType = Exclude<LayerType, 'background'>;

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export type AdjustmentLayerKind = 'solid-color' | 'gradient';

export type AdjustmentGradientType = 'linear' | 'radial';

export type AdjustmentLayerTarget = 'canvas' | 'selected-object' | 'collage-cell';

export type ShapeType =
  | 'circle'
  | 'rectangle'
  | 'rounded-rectangle'
  | 'star'
  | 'heart'
  | 'sparkle'
  | 'asteriskSparkle'
  | 'petalBurst'
  | 'bubbleCluster'
  | 'tiltedStar'
  | 'layeredHeart'
  | 'dropletCluster'
  | 'pinwheel'
  | 'diamondSparkle'
  | 'outlinedStar'
  | 'shootingStar'
  | 'sunburst'
  | 'tornado'
  | 'blockArrow';

export type BackgroundMode = 'solid' | 'image' | 'transparent';

export type BackgroundFit = 'cover' | 'contain' | 'stretch';

export type ClipType =
  | 'none'
  | 'rect'
  | 'roundRect'
  | 'circle'
  | 'ellipse'
  | 'star'
  | 'heart'          // Modern Heart (Default)
  | 'heartClassic'   // Classic Heart (Old design)
  | 'heartSoft'      // Puffy Heart
  | 'heartLong'      // Elongated Heart
  | 'squircle'       // iOS-style Squircle
  | 'capsuleH'       // Horizontal Capsule
  | 'capsuleV'       // Vertical Capsule
  | 'arch'           // Half-circle Arch
  | 'droplet'        // Teardrop Droplet
  | 'blob1'          // Organic stable blob
  | 'blob2'          // Organic playful blob
  | 'ticket'         // Ticket cutout shape
  | 'speechBubble'  // Speech Bubble
  | 'polaroid'      // Polaroid Frame
  | 'filmStrip'     // Film Strip
  | 'desktopWindow' // Desktop Window
  | 'fileFolder'    // File Folder
  | 'airDropCard'   // AirDrop Card
  | 'image-preset'; // Image-based Frame Preset

export type TextAlign = 'left' | 'center' | 'right';

export type TextBackgroundBoxStyle = 'box' | 'highlight';

export type TextFontWeight = 'normal' | 'bold';

export type TextFontStyle = 'normal' | 'italic';

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasPreset {
  id: CanvasRatioId;
  label: string;
  width: number;
  height: number;
}

export interface CanvasBackground {
  mode: BackgroundMode;
  color: string;
  imageSrc?: string;
  fit: BackgroundFit;
}

export interface ImageCrop {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  scale: number;
  cropWidthRatio?: number;
  cropHeightRatio?: number;
  frameWidth?: number;
  frameHeight?: number;
  angle?: number; // Relative rotation angle of the inner image
  feather?: number; // Mask feather amount (px)
}

export interface ClipSpec {
  type: ClipType;
  radius?: number;
  assetUrl?: string; // URL of the image-based frame preset overlay
}

export interface StrokeSettings {
  enabled: boolean;
  color: string;
  width: number;
}

export interface ShadowSettings {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface TextBackgroundBoxSettings {
  enabled: boolean;
  style: TextBackgroundBoxStyle;
  fill: string;
  padding: number;
  radius: number;
}

export interface BaseLayerItem {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode?: BlendMode;
  zIndex: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  groupId?: string; // Group association
}

export interface BackgroundLayerItem extends BaseLayerItem {
  type: 'background';
  color: string;
  background: CanvasBackground;
}

export interface CollageCellMeta {
  collageId: string;
  layoutId: string;
  cellIndex: number;
  cropFocusX?: number; // 0 to 1, default 0.5
  cropFocusY?: number; // 0 to 1, default 0.5
  cropZoom?: number; // absolute scale factor, default minScale
  clipType?: ClipType;
}

export interface ActiveCollage {
  collageId: string;
  layoutId: string;
  gapPx?: number;
  gapX: number;
  gapY: number;
  radiusPx: number;
  cells: Array<{ cellIndex: number; layerId: string | null; clipType?: ClipType }>;
}

export interface ImageFilters {
  brightness?: number;    // -1 ~ 1, default 0
  contrast?: number;      // -1 ~ 1, default 0
  saturation?: number;    // -1 ~ 1, default 0
  temperature?: number;   // -1 ~ 1, default 0
  tint?: number;          // -1 ~ 1, default 0
  exposure?: number;      // -1 ~ 1, default 0
  highlights?: number;    // -1 ~ 1, default 0
  shadows?: number;       // -1 ~ 1, default 0
  fade?: number;          // 0 ~ 1, default 0
  grain?: number;         // 0 ~ 1, default 0
  blur?: number;          // 0 ~ 1, default 0
  sharpen?: number;       // 0 ~ 1, default 0
  grayscale?: boolean;
  sepia?: boolean;
}

export interface ImageLayerItem extends BaseLayerItem {
  type: 'image';
  src: string;
  crop?: ImageCrop;
  clip?: ClipSpec;
  stroke: StrokeSettings;
  collageCell?: CollageCellMeta;
  filters?: ImageFilters;
  shadow?: ShadowSettings;
  flipX?: boolean;
  flipY?: boolean;
  maskDataUrl?: string; // Layer mask canvas 백업 데이터 (PNG dataURL)
  maskLinked?: boolean; // Whether the mask moves with the image
}


export interface TextLayerItem extends BaseLayerItem {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: TextFontWeight;
  fontStyle: TextFontStyle;
  underline: boolean;
  linethrough: boolean;
  fill: string;
  textAlign: TextAlign;
  shadow?: ShadowSettings;
  backgroundBox?: TextBackgroundBoxSettings;
  charSpacing?: number;
  lineHeight?: number;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface ShapeLayerItem extends BaseLayerItem {
  type: 'shape';
  shapeType: ShapeType;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadow?: ShadowSettings;
  gradientEnabled?: boolean;
  gradientType?: 'linear' | 'radial';
  gradientColors?: [string, string];
  gradientAngle?: number;
  solidFill?: string;
}

export interface OverlayLayerItem extends BaseLayerItem {
  type: 'overlay';
  source: string;
  sourceType: 'builtin' | 'uploaded';
  assetId?: string;
  assetCategory?: string;
  assetType?: string;
  filename?: string;
}

export interface AdjustmentLayerItem extends BaseLayerItem {
  type: 'adjustment';
  kind: AdjustmentLayerKind;
  target: AdjustmentLayerTarget;
  color?: string;
  gradientType?: AdjustmentGradientType;
  gradientColors?: [string, string];
}

export interface GroupLayerItem extends BaseLayerItem {
  type: 'group';
}

export type LayerItem =
  | BackgroundLayerItem
  | ImageLayerItem
  | TextLayerItem
  | ShapeLayerItem
  | OverlayLayerItem
  | AdjustmentLayerItem
  | GroupLayerItem;

export interface FabricLayerMetadata {
  layerId: string;
  layerType: ElementLayerType;
  layerName: string;
  blendMode?: BlendMode;
  locked?: boolean;
  src?: string;
  source?: string;
  sourceType?: 'builtin' | 'uploaded';
  assetId?: string;
  assetCategory?: string;
  assetType?: string;
  filename?: string;
  adjustmentKind?: AdjustmentLayerKind;
  adjustmentTarget?: AdjustmentLayerTarget;
  adjustmentColor?: string;
  adjustmentGradientType?: AdjustmentGradientType;
  adjustmentGradientColors?: [string, string];
  shapeType?: ShapeType;
  fontFamily?: string;
  fontWeight?: TextFontWeight;
  fontStyle?: TextFontStyle;
  underline?: boolean;
  linethrough?: boolean;
  crop?: ImageCrop;
  clip?: ClipSpec;
  stroke?: StrokeSettings;
  shadow?: ShadowSettings;
  backgroundBox?: TextBackgroundBoxSettings;
  collageCell?: CollageCellMeta;
  filters?: ImageFilters;
  flipX?: boolean;
  flipY?: boolean;
  charSpacing?: number;
  lineHeight?: number;
  strokeEnabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  gradientEnabled?: boolean;
  gradientType?: 'linear' | 'radial';
  gradientColors?: [string, string];
  gradientAngle?: number;
  solidFill?: string;
  /**
   * Hybrid Smart Layer data — the authoritative source of truth for image layers.
   * Written in parallel with the legacy crop/clip/filters/shadow/stroke fields
   * during the dual-write migration phase. Renderers read this first, fall back
   * to legacy fields when absent.
   */
  imageLayerData?: ImageLayerData;
  maskDataUrl?: string;
  groupId?: string;
  maskLinked?: boolean;
}


export type SelectionSnapshot =
  | ImageLayerItem
  | TextLayerItem
  | ShapeLayerItem
  | OverlayLayerItem
  | AdjustmentLayerItem
  | GroupLayerItem
  | null;

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export interface CollageProjectFile {
  app: 'collage-editor';
  version: 6;
  savedAt: string;
  canvas: CanvasSize & {
    ratio?: CanvasRatioId;
  };
  background: CanvasBackground;
  layers: LayerItem[];
  collage?: ActiveCollage;
}




