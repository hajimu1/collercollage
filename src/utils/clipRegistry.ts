import type { ClipType } from '../types/layers';

export interface ClipShapeDefinition {
  id: ClipType;
  label: string;
  category: 'basic' | 'soft' | 'decorative';
  getPath: (width: number, height: number) => string;
}

// Helper: Convert array of points to an SVG path string
function pointsToPath(points: Array<{ x: number; y: number }>) {
  if (points.length === 0) return '';
  return `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') + ' Z';
}

// Existing star points generator
function starPoints(width: number, height: number) {
  const outerRadius = Math.min(width, height) / 2;
  const innerRadius = outerRadius * 0.46;
  const points: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = index * (Math.PI / 5) - Math.PI / 2;
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return points;
}

// Existing classic heart points generator
function classicHeartPoints(width: number, height: number) {
  const rawPoints: Array<{ x: number; y: number }> = [];

  for (let index = 0; index < 96; index += 1) {
    const t = (index / 96) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = -(
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t)
    );
    rawPoints.push({ x, y });
  }

  const minX = Math.min(...rawPoints.map((p) => p.x));
  const maxX = Math.max(...rawPoints.map((p) => p.x));
  const minY = Math.min(...rawPoints.map((p) => p.y));
  const maxY = Math.max(...rawPoints.map((p) => p.y));
  const rawWidth = Math.max(1, maxX - minX);
  const rawHeight = Math.max(1, maxY - minY);

  return rawPoints.map((p) => ({
    x: ((p.x - minX) / rawWidth - 0.5) * width,
    y: ((p.y - minY) / rawHeight - 0.5) * height,
  }));
}

// Existing rounded rectangle generator
export function roundRectPath(width: number, height: number, radiusX: number, radiusY = radiusX) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const rx = Math.max(0, Math.min(radiusX, safeWidth / 2));
  const ry = Math.max(0, Math.min(radiusY, safeHeight / 2));
  const left = -safeWidth / 2;
  const top = -safeHeight / 2;
  const right = safeWidth / 2;
  const bottom = safeHeight / 2;

  if (rx <= 0 || ry <= 0) {
    return `M ${left} ${top} L ${right} ${top} L ${right} ${bottom} L ${left} ${bottom} Z`;
  }

  return [
    `M ${left + rx} ${top}`,
    `L ${right - rx} ${top}`,
    `Q ${right} ${top} ${right} ${top + ry}`,
    `L ${right} ${bottom - ry}`,
    `Q ${right} ${bottom} ${right - rx} ${bottom}`,
    `L ${left + rx} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${bottom - ry}`,
    `L ${left} ${top + ry}`,
    `Q ${left} ${top} ${left + rx} ${top}`,
    'Z',
  ].join(' ');
}

// Existing speech bubble generator
function speechBubblePath(width: number, height: number) {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const bubbleWidth = safeWidth;
  const bubbleHeight = safeHeight * 0.82;
  const radius = Math.min(safeWidth, safeHeight) * 0.12;

  return [
    `M ${-bubbleWidth / 2 + radius} ${-safeHeight / 2}`,
    `L ${bubbleWidth / 2 - radius} ${-safeHeight / 2}`,
    `Q ${bubbleWidth / 2} ${-safeHeight / 2} ${bubbleWidth / 2} ${-safeHeight / 2 + radius}`,
    `L ${bubbleWidth / 2} ${-safeHeight / 2 + bubbleHeight - radius}`,
    `Q ${bubbleWidth / 2} ${-safeHeight / 2 + bubbleHeight} ${bubbleWidth / 2 - radius} ${-safeHeight / 2 + bubbleHeight}`,
    `L ${safeWidth * 0.12} ${-safeHeight / 2 + bubbleHeight}`,
    `L ${safeWidth * 0.02} ${safeHeight / 2}`,
    `L ${-safeWidth * 0.16} ${-safeHeight / 2 + bubbleHeight}`,
    `L ${-bubbleWidth / 2 + radius} ${-safeHeight / 2 + bubbleHeight}`,
    `Q ${-bubbleWidth / 2} ${-safeHeight / 2 + bubbleHeight} ${-bubbleWidth / 2} ${-safeHeight / 2 + bubbleHeight - radius}`,
    `L ${-bubbleWidth / 2} ${-safeHeight / 2 + radius}`,
    `Q ${-bubbleWidth / 2} ${-safeHeight / 2} ${-bubbleWidth / 2 + radius} ${-safeHeight / 2}`,
    'Z',
  ].join(' ');
}

// New squircle generator
function squirclePath(width: number, height: number) {
  const w = width / 2;
  const h = height / 2;
  const cx = w * 0.88;
  const cy = h * 0.88;
  return [
    `M ${-w} 0`,
    `C ${-w} ${-cy} ${-cx} ${-h} 0 ${-h}`,
    `C ${cx} ${-h} ${w} ${-cy} ${w} 0`,
    `C ${w} ${cy} ${cx} ${h} 0 ${h}`,
    `C ${-cx} ${h} ${-w} ${cy} ${-w} 0`,
    `Z`
  ].join(' ');
}

// New Modern Heart generator
function modernHeartPath(width: number, height: number) {
  const w = width / 100;
  const h = height / 100;
  return [
    `M 0 ${46 * h}`,
    `C ${-15 * w} ${26 * h} ${-42 * w} ${12 * h} ${-42 * w} ${-12 * h}`,
    `C ${-42 * w} ${-32 * h} ${-33 * w} ${-46 * h} ${-20 * w} ${-46 * h}`,
    `C ${-9 * w} ${-46 * h} ${-4 * w} ${-28 * h} 0 ${-18 * h}`,
    `C ${4 * w} ${-28 * h} ${9 * w} ${-46 * h} ${20 * w} ${-46 * h}`,
    `C ${33 * w} ${-46 * h} ${42 * w} ${-32 * h} ${42 * w} ${-12 * h}`,
    `C ${42 * w} ${12 * h} ${15 * w} ${26 * h} 0 ${46 * h}`,
    `Z`
  ].join(' ');
}

// New Soft Heart generator
function softHeartPath(width: number, height: number) {
  const w = width / 100;
  const h = height / 100;
  return [
    `M 0 ${42 * h}`,
    `C ${-15 * w} ${28 * h} ${-48 * w} ${18 * h} ${-48 * w} ${-10 * h}`,
    `C ${-48 * w} ${-34 * h} ${-35 * w} ${-45 * h} ${-22 * w} ${-45 * h}`,
    `C ${-10 * w} ${-45 * h} ${-4 * w} ${-26 * h} 0 ${-18 * h}`,
    `C ${4 * w} ${-26 * h} ${10 * w} ${-45 * h} ${22 * w} ${-45 * h}`,
    `C ${35 * w} ${-45 * h} ${48 * w} ${-34 * h} ${48 * w} ${-10 * h}`,
    `C ${48 * w} ${18 * h} ${15 * w} ${28 * h} 0 ${42 * h}`,
    `Z`
  ].join(' ');
}

// New Long Heart generator
function longHeartPath(width: number, height: number) {
  const w = width / 100;
  const h = height / 100;
  return [
    `M 0 ${48 * h}`,
    `C ${-12 * w} ${24 * h} ${-32 * w} ${10 * h} ${-32 * w} ${-18 * h}`,
    `C ${-32 * w} ${-36 * h} ${-25 * w} ${-48 * h} ${-14 * w} ${-48 * h}`,
    `C ${-6 * w} ${-48 * h} ${-3 * w} ${-32 * h} 0 ${-22 * h}`,
    `C ${3 * w} ${-32 * h} ${6 * w} ${-48 * h} ${14 * w} ${-48 * h}`,
    `C ${25 * w} ${-48 * h} ${32 * w} ${-36 * h} ${32 * w} ${-18 * h}`,
    `C ${32 * w} ${10 * h} ${12 * w} ${24 * h} 0 ${48 * h}`,
    `Z`
  ].join(' ');
}

// New Arch generator
function archPath(width: number, height: number) {
  const w = width / 2;
  const h = height / 2;
  const r = w;
  return [
    `M ${-w} ${h}`,
    `L ${w} ${h}`,
    `L ${w} ${-h + r}`,
    `A ${r} ${r} 0 0 0 ${-w} ${-h + r}`,
    `Z`
  ].join(' ');
}

// New Droplet generator
function dropletPath(width: number, height: number) {
  const w = width / 2;
  const h = height / 2;
  return [
    `M 0 ${-h}`,
    `C ${w * 0.1} ${-h * 0.4} ${w * 0.9} ${0} ${w} ${h * 0.2}`,
    `C ${w} ${h * 0.65} ${w * 0.55} ${h} 0 ${h}`,
    `C ${-w * 0.55} ${h} ${-w} ${h * 0.65} ${-w} ${h * 0.2}`,
    `C ${-w} ${0} ${-w * 0.1} ${-h * 0.4} 0 ${-h}`,
    `Z`
  ].join(' ');
}

// New Blob 1 generator
function blob1Path(width: number, height: number) {
  const w = width / 2;
  const h = height / 2;
  return [
    `M ${0} ${-h * 0.8}`,
    `C ${w * 0.6} ${-h * 0.8} ${w} ${-h * 0.3} ${w * 0.9} ${h * 0.2}`,
    `C ${w * 0.8} ${h * 0.7} ${w * 0.3} ${h * 0.9} ${-w * 0.1} ${h * 0.9}`,
    `C ${-w * 0.6} ${h * 0.9} ${-w * 0.9} ${h * 0.5} ${-w * 0.9} ${-h * 0.1}`,
    `C ${-w * 0.9} ${-h * 0.6} ${-w * 0.5} ${-h * 0.8} ${0} ${-h * 0.8}`,
    `Z`
  ].join(' ');
}

// New Blob 2 generator
function blob2Path(width: number, height: number) {
  const w = width / 2;
  const h = height / 2;
  return [
    `M ${-w * 0.2} ${-h * 0.9}`,
    `C ${w * 0.5} ${-h * 0.9} ${w * 0.9} ${-h * 0.5} ${w * 0.8} ${0}`,
    `C ${w * 0.7} ${h * 0.5} ${w * 0.9} ${h * 0.8} ${w * 0.3} ${h * 0.9}`,
    `C ${-w * 0.3} ${h * 1.0} ${-w * 0.9} ${h * 0.7} ${-w * 0.8} ${h * 0.1}`,
    `C ${-w * 0.7} ${-h * 0.4} ${-w * 0.8} ${-h * 0.9} ${-w * 0.2} ${-h * 0.9}`,
    `Z`
  ].join(' ');
}

// New Ticket generator
function ticketPath(width: number, height: number) {
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(w, h) * 0.16;
  return [
    `M ${-w + r} ${-h}`,
    `L ${w - r} ${-h}`,
    `A ${r} ${r} 0 0 0 ${w} ${-h + r}`,
    `L ${w} ${h - r}`,
    `A ${r} ${r} 0 0 0 ${w - r} ${h}`,
    `L ${-w + r} ${h}`,
    `A ${r} ${r} 0 0 0 ${-w} ${h - r}`,
    `L ${-w} ${-h + r}`,
    `A ${r} ${r} 0 0 0 ${-w + r} ${-h}`,
    `Z`
  ].join(' ');
}

function filmStripPath(w: number, h: number) {
  let path = `M ${-w/2} ${-h/2} L ${w/2} ${-h/2} L ${w/2} ${h/2} L ${-w/2} ${h/2} Z`;
  
  const count = 8;
  const holeW = w / (count * 2 + 1);
  const holeH = h * 0.06;
  const topY = -h/2 + h * 0.03;
  const bottomY = h/2 - h * 0.03 - holeH;
  
  for (let i = 0; i < count; i++) {
    const x = -w/2 + holeW * (2 * i + 1);
    path += ` M ${x} ${topY} L ${x} ${topY + holeH} L ${x + holeW} ${topY + holeH} L ${x + holeW} ${topY} Z`;
    path += ` M ${x} ${bottomY} L ${x} ${bottomY + holeH} L ${x + holeW} ${bottomY + holeH} L ${x + holeW} ${bottomY} Z`;
  }
  return path;
}

function desktopWindowPath(w: number, h: number) {
  let path = roundRectPath(w, h, 8);
  const r = Math.min(w, h) * 0.02;
  const y = -h/2 + h * 0.06;
  const startX = -w/2 + w * 0.06;
  const step = w * 0.04;
  for (let i = 0; i < 3; i++) {
    const cx = startX + step * i;
    path += ` M ${cx} ${y - r} A ${r} ${r} 0 1 0 ${cx} ${y + r} A ${r} ${r} 0 1 0 ${cx} ${y - r} Z`;
  }
  return path;
}

function fileFolderPath(w: number, h: number) {
  const r = 8;
  const tabW = w * 0.35;
  const tabH = h * 0.12;
  const left = -w / 2;
  const right = w / 2;
  const top = -h / 2 + tabH;
  const bottom = h / 2;
  
  return [
    `M ${left + r} ${top}`,
    `L ${left + tabW - r} ${top}`,
    `Q ${left + tabW} ${top} ${left + tabW + r} ${top - tabH}`,
    `L ${left + tabW * 1.3 - r} ${top - tabH}`,
    `Q ${left + tabW * 1.3} ${top - tabH} ${left + tabW * 1.3 + r} ${top}`,
    `L ${right - r} ${top}`,
    `Q ${right} ${top} ${right} ${top + r}`,
    `L ${right} ${bottom - r}`,
    `Q ${right} ${bottom} ${right - r} ${bottom}`,
    `L ${left + r} ${bottom}`,
    `Q ${left} ${bottom} ${left} ${bottom - r}`,
    `L ${left} ${top + r}`,
    `Q ${left} ${top} ${left + r} ${top}`,
    `Z`
  ].join(' ');
}

function airDropCardPath(w: number, h: number) {
  let path = roundRectPath(w, h, 16);
  const cx = 0;
  const cy = h * 0.18;
  const r1 = Math.min(w, h) * 0.05;
  const r2 = Math.min(w, h) * 0.10;
  const r3 = Math.min(w, h) * 0.15;
  
  path += ` M ${cx} ${cy - r1} A ${r1} ${r1} 0 1 0 ${cx} ${cy + r1} A ${r1} ${r1} 0 1 0 ${cx} ${cy - r1} Z`;
  path += ` M ${cx} ${cy - r2} A ${r2} ${r2} 0 1 0 ${cx} ${cy + r2} A ${r2} ${r2} 0 1 0 ${cx} ${cy - r2} Z`;
  path += ` M ${cx} ${cy - r3} A ${r3} ${r3} 0 1 0 ${cx} ${cy + r3} A ${r3} ${r3} 0 1 0 ${cx} ${cy - r3} Z`;
  return path;
}

export const CLIP_SHAPE_REGISTRY: ClipShapeDefinition[] = [
  // Basic
  {
    id: 'rect',
    label: 'Rectangle',
    category: 'basic',
    getPath: (w, h) => `M ${-w/2} ${-h/2} L ${w/2} ${-h/2} L ${w/2} ${h/2} L ${-w/2} ${h/2} Z`,
  },
  {
    id: 'roundRect',
    label: 'Rounded Rectangle',
    category: 'basic',
    getPath: (w, h) => roundRectPath(w, h, Math.min(w, h) * 0.16),
  },
  {
    id: 'circle',
    label: 'Circle',
    category: 'basic',
    getPath: (w, h) => {
      const r = Math.min(w, h) / 2;
      return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
    },
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    category: 'basic',
    getPath: (w, h) => {
      const rx = w / 2;
      const ry = h / 2;
      return `M 0 ${-ry} A ${rx} ${ry} 0 1 1 0 ${ry} A ${rx} ${ry} 0 1 1 0 ${-ry} Z`;
    },
  },
  {
    id: 'squircle',
    label: 'Squircle',
    category: 'basic',
    getPath: squirclePath,
  },
  {
    id: 'capsuleH',
    label: 'Horizontal Capsule',
    category: 'basic',
    getPath: (w, h) => roundRectPath(w, h, h / 2),
  },
  {
    id: 'capsuleV',
    label: 'Vertical Capsule',
    category: 'basic',
    getPath: (w, h) => roundRectPath(w, h, w / 2),
  },

  // Soft (媛먯꽦)
  {
    id: 'heart',
    label: 'Modern Heart',
    category: 'soft',
    getPath: modernHeartPath,
  },
  {
    id: 'heartSoft',
    label: 'Soft Heart',
    category: 'soft',
    getPath: softHeartPath,
  },
  {
    id: 'heartLong',
    label: 'Long Heart',
    category: 'soft',
    getPath: longHeartPath,
  },
  {
    id: 'arch',
    label: 'Arch',
    category: 'soft',
    getPath: archPath,
  },
  {
    id: 'droplet',
    label: 'Droplet',
    category: 'soft',
    getPath: dropletPath,
  },
  {
    id: 'blob1',
    label: 'Blob 1',
    category: 'soft',
    getPath: blob1Path,
  },
  {
    id: 'blob2',
    label: 'Blob 2',
    category: 'soft',
    getPath: blob2Path,
  },

  // Decorative (?μ떇)
  {
    id: 'star',
    label: 'Star',
    category: 'decorative',
    getPath: (w, h) => pointsToPath(starPoints(w, h)),
  },
  {
    id: 'ticket',
    label: 'Ticket',
    category: 'decorative',
    getPath: ticketPath,
  },
  {
    id: 'speechBubble',
    label: 'Speech Bubble',
    category: 'decorative',
    getPath: speechBubblePath,
  },
  {
    id: 'heartClassic',
    label: 'Classic Heart',
    category: 'decorative',
    getPath: (w, h) => pointsToPath(classicHeartPoints(w, h)),
  },
  {
    id: 'polaroid',
    label: 'Polaroid',
    category: 'decorative',
    getPath: (w, h) => roundRectPath(w, h, 6),
  },
  {
    id: 'filmStrip',
    label: 'Film Strip',
    category: 'decorative',
    getPath: filmStripPath,
  },
  {
    id: 'desktopWindow',
    label: 'Desktop Window',
    category: 'decorative',
    getPath: desktopWindowPath,
  },
  {
    id: 'fileFolder',
    label: 'File Folder',
    category: 'decorative',
    getPath: fileFolderPath,
  },
  {
    id: 'airDropCard',
    label: 'AirDrop Card',
    category: 'decorative',
    getPath: airDropCardPath,
  },
];

export function getClipDefinition(type: ClipType): ClipShapeDefinition | undefined {
  return CLIP_SHAPE_REGISTRY.find(d => d.id === type);
}


