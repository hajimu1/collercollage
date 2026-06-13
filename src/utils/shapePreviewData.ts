/**
 * shapePreviewData.ts
 *
 * Single source of truth for shape preview data.
 * ShapePanel uses this to render SVG previews that exactly match the actual
 * canvas shapes created in useFabricEditor.ts.
 *
 * Each entry describes what the shape looks like in SVG terms so the preview
 * is geometrically identical to the real Fabric object.
 */

import { CUSTOM_SVG_SHAPES } from './customSvgShapeData';
import type { ShapeType } from '../types/layers';

export type ShapePreviewItem =
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { kind: 'polygon'; points: string }    // SVG points attr string
  | { kind: 'path'; d: string }
  | { kind: 'rect-bar'; x: number; y: number; width: number; height: number; rx: number; angle: number; cx: number; cy: number }; // for sparkle bars

export interface ShapePreviewDef {
  type: ShapeType;
  label: string;
  /** SVG viewBox "minX minY width height" */
  viewBox: string;
  items: ShapePreviewItem[];
}


/** Generate polygon points string for a star with given outer/inner radii */
const makeStarPoints = (cx: number, cy: number, outerR: number, innerR: number, numPoints = 5): string => {
  const pts: string[] = [];
  const step = Math.PI / numPoints;
  for (let i = 0; i < numPoints * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    pts.push(`${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`);
  }
  return pts.join(' ');
};

const makeCustomPreview = (key: keyof typeof CUSTOM_SVG_SHAPES): ShapePreviewItem[] =>
  CUSTOM_SVG_SHAPES[key].items.map((item) => {
    if (item.kind === 'path') {
      return { kind: 'path', d: item.d } as const;
    }
    // polygon
    const pts = item.points.map((p) => `${p.x},${p.y}`).join(' ');
    return { kind: 'polygon', points: pts } as const;
  });

/**
 * Compute a tight bounding box over all polygon/path items in a custom shape
 * so we can set the correct viewBox.
 * For custom shapes we just use well-known viewBoxes derived from the source coords.
 */
const CUSTOM_VIEW_BOXES: Record<keyof typeof CUSTOM_SVG_SHAPES, string> = {
  // asteriskSparkle: x from ~82 to ~482, y from ~202 to ~570
  asteriskSparkle:  '82 202 400 368',
  // petalBurst: bounding coords roughly 100??88, y 176??78
  petalBurst:       '100 176 490 502',
  // bubbleCluster: 0 0 to ~150, 158
  bubbleCluster:    '-2 -2 155 162',
  // tiltedStar polygon: x 39??57, y 27??59
  tiltedStar:       '36 24 124 138',
  // layeredHeart: x 60??62, y 249??80
  layeredHeart:     '60 249 504 435',
  // dropletCluster: x 50??50, y 164??60
  dropletCluster:   '50 164 508 500',
  // pinwheel: x 0??56, y 0??90
  pinwheel:         '-2 -2 262 296',
  // shootingStar polygon: x 18??38, y 154??23
  shootingStar:     '15 150 228 80',
  // diamondSparkle: x 8??52, y 20??55
  diamondSparkle:   '8 20 148 138',
  // outlinedStar: x 17??43, y 24??42
  outlinedStar:     '15 22 132 122',
  // sunburst: x 58??92, y 112??36
  sunburst:         '56 110 138 130',
  // tornado: x 60??50, y 185??50
  tornado:          '58 183 498 472',
  // blockArrow polygon: x 55??95, y 99??02
  blockArrow:       '50 94 150 112',
};


const SPARKLE_ARM = 360;
const SPARKLE_DIAG = 250;
const SPARKLE_THICK = 2;

const SPARKLE_BARS = [
  { length: SPARKLE_ARM,  angle: 0 },
  { length: SPARKLE_ARM,  angle: 90 },
  { length: SPARKLE_DIAG, angle: 45 },
  { length: SPARKLE_DIAG, angle: -45 },
];

const makeSparkleItems = (): ShapePreviewItem[] =>
  SPARKLE_BARS.map((bar) => ({
    kind: 'rect-bar' as const,
    x: -bar.length / 2,
    y: -SPARKLE_THICK / 2,
    width: bar.length,
    height: SPARKLE_THICK,
    rx: SPARKLE_THICK / 2,
    angle: bar.angle,
    cx: 0,
    cy: 0,
  }));


export const SHAPE_PREVIEW_DEFS: ShapePreviewDef[] = [
  {
    type: 'circle',
    label: 'Circle',
    viewBox: '0 0 100 100',
    items: [{ kind: 'circle', cx: 50, cy: 50, r: 46 }],
  },
  {
    type: 'rectangle',
    label: 'Rectangle',
    viewBox: '0 0 100 100',
    items: [{ kind: 'rect', x: 4, y: 4, width: 92, height: 92 }],
  },
  {
    type: 'rounded-rectangle',
    label: 'Rounded Rectangle',
    viewBox: '0 0 118 82',
    items: [{ kind: 'rect', x: 4, y: 4, width: 110, height: 74, rx: 12 }],
  },
  {
    type: 'star',
    label: 'Star',
    viewBox: '-50 -50 100 100',
    items: [{ kind: 'polygon', points: makeStarPoints(0, 0, 46, 46 / 4.6) }],
  },
  {
    type: 'heart',
    label: 'Heart',
    // Matches the path used in useFabricEditor: M 0 -34 C -42 -78 -104 -20 -68 38 L 0 104 L 68 38 C 104 -20 42 -78 0 -34 Z
    viewBox: '-108 -82 216 192',
    items: [{ kind: 'path', d: 'M 0 -34 C -42 -78 -104 -20 -68 38 L 0 104 L 68 38 C 104 -20 42 -78 0 -34 Z' }],
  },
  {
    type: 'sparkle',
    label: 'Sparkle',
    viewBox: `${-SPARKLE_ARM / 2 - 10} ${-SPARKLE_ARM / 2 - 10} ${SPARKLE_ARM + 20} ${SPARKLE_ARM + 20}`,
    items: makeSparkleItems(),
  },
  {
    type: 'asteriskSparkle',
    label: 'Rounded Sparkle',
    viewBox: CUSTOM_VIEW_BOXES.asteriskSparkle,
    items: makeCustomPreview('asteriskSparkle'),
  },
  {
    type: 'petalBurst',
    label: 'Petal Burst',
    viewBox: CUSTOM_VIEW_BOXES.petalBurst,
    items: makeCustomPreview('petalBurst'),
  },
  {
    type: 'bubbleCluster',
    label: 'Bubble Cluster',
    viewBox: CUSTOM_VIEW_BOXES.bubbleCluster,
    items: makeCustomPreview('bubbleCluster'),
  },
  {
    type: 'tiltedStar',
    label: 'Tilted Star',
    viewBox: CUSTOM_VIEW_BOXES.tiltedStar,
    items: makeCustomPreview('tiltedStar'),
  },
  {
    type: 'layeredHeart',
    label: 'Layered Heart',
    viewBox: CUSTOM_VIEW_BOXES.layeredHeart,
    items: makeCustomPreview('layeredHeart'),
  },
  {
    type: 'dropletCluster',
    label: 'Droplet Cluster',
    viewBox: CUSTOM_VIEW_BOXES.dropletCluster,
    items: makeCustomPreview('dropletCluster'),
  },
  {
    type: 'pinwheel',
    label: 'Pinwheel',
    viewBox: CUSTOM_VIEW_BOXES.pinwheel,
    items: makeCustomPreview('pinwheel'),
  },
  {
    type: 'diamondSparkle',
    label: 'Diamond Sparkle',
    viewBox: CUSTOM_VIEW_BOXES.diamondSparkle,
    items: makeCustomPreview('diamondSparkle'),
  },
  {
    type: 'outlinedStar',
    label: 'Outlined Star',
    viewBox: CUSTOM_VIEW_BOXES.outlinedStar,
    items: makeCustomPreview('outlinedStar'),
  },
  {
    type: 'shootingStar',
    label: 'Shooting Star',
    viewBox: CUSTOM_VIEW_BOXES.shootingStar,
    items: makeCustomPreview('shootingStar'),
  },
  {
    type: 'sunburst',
    label: 'Sunburst',
    viewBox: CUSTOM_VIEW_BOXES.sunburst,
    items: makeCustomPreview('sunburst'),
  },
  {
    type: 'tornado',
    label: 'Tornado',
    viewBox: CUSTOM_VIEW_BOXES.tornado,
    items: makeCustomPreview('tornado'),
  },
  {
    type: 'blockArrow',
    label: 'Block Arrow',
    viewBox: CUSTOM_VIEW_BOXES.blockArrow,
    items: makeCustomPreview('blockArrow'),
  },
];

