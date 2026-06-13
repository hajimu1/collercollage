// src/utils/collageLayouts.ts

export interface CollageCell {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface CollageLayout {
  id: string;
  label: string;
  cells: CollageCell[];
  category?: 'basic' | 'grid' | 'asymmetric';
}

export type CollageGapInput = number | { gapX?: number; gapY?: number; gapPx?: number };

export function normalizeCollageGaps(gap: CollageGapInput = 0): { gapX: number; gapY: number } {
  if (typeof gap === 'number') {
    const safeGap = Math.max(0, gap);
    return { gapX: safeGap, gapY: safeGap };
  }

  const fallback = Math.max(0, gap.gapPx ?? 0);
  return {
    gapX: Math.max(0, gap.gapX ?? fallback),
    gapY: Math.max(0, gap.gapY ?? fallback),
  };
}

export function createGridLayout(cols: number, rows: number): CollageCell[] {
  const cells: CollageCell[] = [];
  const width = 1 / cols;
  const height = 1 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({
        left: c * width,
        top: r * height,
        width,
        height,
      });
    }
  }
  return cells;
}

export function getCollageLayoutById(layoutId: string): CollageLayout | undefined {
  const preset = COLLAGE_LAYOUTS.find((l) => l.id === layoutId);
  if (preset) return preset;

  if (layoutId.startsWith('custom-')) {
    const parts = layoutId.split('-');
    if (parts.length === 3) {
      const cols = parseInt(parts[1], 10);
      const rows = parseInt(parts[2], 10);
      if (!isNaN(cols) && !isNaN(rows)) {
        return {
          id: layoutId,
          label: `${cols}횞${rows}`,
          cells: createGridLayout(cols, rows),
        };
      }
    }
  }
  return undefined;
}

export const COLLAGE_LAYOUTS: CollageLayout[] = [
  {
    id: '1x1',
    label: '1',
    cells: [{ left: 0, top: 0, width: 1, height: 1 }],
    category: 'basic',
  },

  {
    id: '2h',
    label: '2 Horizontal',
    cells: [
      { left: 0,   top: 0, width: 0.5, height: 1 },
      { left: 0.5, top: 0, width: 0.5, height: 1 },
    ],
    category: 'basic',
  },
  {
    id: '2v',
    label: '2 Vertical',
    cells: [
      { left: 0, top: 0,   width: 1, height: 0.5 },
      { left: 0, top: 0.5, width: 1, height: 0.5 },
    ],
    category: 'basic',
  },

  {
    id: '3h',
    label: '3 Horizontal',
    cells: [
      { left: 0,       top: 0, width: 1 / 3, height: 1 },
      { left: 1 / 3,   top: 0, width: 1 / 3, height: 1 },
      { left: 2 / 3,   top: 0, width: 1 / 3, height: 1 },
    ],
    category: 'basic',
  },
  {
    id: '3v',
    label: '3 Vertical',
    cells: [
      { left: 0, top: 0,       width: 1, height: 1 / 3 },
      { left: 0, top: 1 / 3,   width: 1, height: 1 / 3 },
      { left: 0, top: 2 / 3,   width: 1, height: 1 / 3 },
    ],
    category: 'basic',
  },
  {
    id: '3-left',
    label: '3 Left Large',
    cells: [
      { left: 0,   top: 0,   width: 0.5, height: 1   },
      { left: 0.5, top: 0,   width: 0.5, height: 0.5 },
      { left: 0.5, top: 0.5, width: 0.5, height: 0.5 },
    ],
    category: 'asymmetric',
  },
  {
    id: '3-right',
    label: '3 Right Large',
    cells: [
      { left: 0,   top: 0,   width: 0.5, height: 0.5 },
      { left: 0,   top: 0.5, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0,   width: 0.5, height: 1   },
    ],
    category: 'asymmetric',
  },
  {
    id: '3-top',
    label: '3 Top Large',
    cells: [
      { left: 0,   top: 0,   width: 1,   height: 0.5 },
      { left: 0,   top: 0.5, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0.5, width: 0.5, height: 0.5 },
    ],
    category: 'asymmetric',
  },
  {
    id: '3-bottom',
    label: '3 Bottom Large',
    cells: [
      { left: 0,   top: 0,   width: 0.5, height: 0.5 },
      { left: 0.5, top: 0,   width: 0.5, height: 0.5 },
      { left: 0,   top: 0.5, width: 1,   height: 0.5 },
    ],
    category: 'asymmetric',
  },

  {
    id: '2x2',
    label: '2x2',
    cells: [
      { left: 0,   top: 0,   width: 0.5, height: 0.5 },
      { left: 0.5, top: 0,   width: 0.5, height: 0.5 },
      { left: 0,   top: 0.5, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0.5, width: 0.5, height: 0.5 },
    ],
    category: 'grid',
  },
  {
    id: '4h',
    label: '4 Horizontal',
    cells: Array.from({ length: 4 }, (_, i) => ({
      left: i * 0.25,
      top: 0,
      width: 0.25,
      height: 1,
    })),
    category: 'basic',
  },
  {
    id: '4-big-left',
    label: '4 Left Large',
    cells: [
      { left: 0,   top: 0,       width: 0.5, height: 1       },
      { left: 0.5, top: 0,       width: 0.5, height: 1 / 3   },
      { left: 0.5, top: 1 / 3,   width: 0.5, height: 1 / 3   },
      { left: 0.5, top: 2 / 3,   width: 0.5, height: 1 / 3   },
    ],
    category: 'asymmetric',
  },
  {
    id: '4-big-right',
    label: '4 Right Large',
    cells: [
      { left: 0,   top: 0,       width: 0.5, height: 1 / 3   },
      { left: 0,   top: 1 / 3,   width: 0.5, height: 1 / 3   },
      { left: 0,   top: 2 / 3,   width: 0.5, height: 1 / 3   },
      { left: 0.5, top: 0,       width: 0.5, height: 1       },
    ],
    category: 'asymmetric',
  },

  {
    id: '2x3',
    label: '2x3',
    cells: createGridLayout(2, 3),
    category: 'grid',
  },
  {
    id: '3x2',
    label: '3x2',
    cells: createGridLayout(3, 2),
    category: 'grid',
  },

  {
    id: '2x4',
    label: '2x4',
    cells: createGridLayout(2, 4),
    category: 'grid',
  },
  {
    id: '4x2',
    label: '4x2',
    cells: createGridLayout(4, 2),
    category: 'grid',
  },
  {
    id: '3x3',
    label: '3x3',
    cells: createGridLayout(3, 3),
    category: 'grid',
  },
  {
    id: '3x4',
    label: '3x4',
    cells: createGridLayout(3, 4),
    category: 'grid',
  },
  {
    id: '4x3',
    label: '4x3',
    cells: createGridLayout(4, 3),
    category: 'grid',
  },
  {
    id: '4x4',
    label: '4x4',
    cells: createGridLayout(4, 4),
    category: 'grid',
  },

  {
    id: 'asym-left-2',
    label: 'Left Large 2',
    cells: [
      { left: 0, top: 0, width: 0.6, height: 1 },
      { left: 0.6, top: 0, width: 0.4, height: 0.5 },
      { left: 0.6, top: 0.5, width: 0.4, height: 0.5 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-right-2',
    label: 'Right Large 2',
    cells: [
      { left: 0, top: 0, width: 0.4, height: 0.5 },
      { left: 0, top: 0.5, width: 0.4, height: 0.5 },
      { left: 0.4, top: 0, width: 0.6, height: 1 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-top-2',
    label: 'Top Large 2',
    cells: [
      { left: 0, top: 0, width: 1, height: 0.6 },
      { left: 0, top: 0.6, width: 0.5, height: 0.4 },
      { left: 0.5, top: 0.6, width: 0.5, height: 0.4 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-bottom-2',
    label: 'Bottom Large 2',
    cells: [
      { left: 0, top: 0, width: 0.5, height: 0.4 },
      { left: 0.5, top: 0, width: 0.5, height: 0.4 },
      { left: 0, top: 0.4, width: 1, height: 0.6 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-left-3',
    label: 'Left Large 3',
    cells: [
      { left: 0, top: 0, width: 0.6, height: 1 },
      { left: 0.6, top: 0, width: 0.4, height: 1 / 3 },
      { left: 0.6, top: 1 / 3, width: 0.4, height: 1 / 3 },
      { left: 0.6, top: 2 / 3, width: 0.4, height: 1 / 3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-right-3',
    label: 'Right Large 3',
    cells: [
      { left: 0, top: 0, width: 0.4, height: 1 / 3 },
      { left: 0, top: 1 / 3, width: 0.4, height: 1 / 3 },
      { left: 0, top: 2 / 3, width: 0.4, height: 1 / 3 },
      { left: 0.4, top: 0, width: 0.6, height: 1 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-top-3',
    label: 'Top Large 3',
    cells: [
      { left: 0, top: 0, width: 1, height: 0.6 },
      { left: 0, top: 0.6, width: 1 / 3, height: 0.4 },
      { left: 1 / 3, top: 0.6, width: 1 / 3, height: 0.4 },
      { left: 2 / 3, top: 0.6, width: 1 / 3, height: 0.4 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-bottom-3',
    label: 'Bottom Large 3',
    cells: [
      { left: 0, top: 0, width: 1 / 3, height: 0.4 },
      { left: 1 / 3, top: 0, width: 1 / 3, height: 0.4 },
      { left: 2 / 3, top: 0, width: 1 / 3, height: 0.4 },
      { left: 0, top: 0.4, width: 1, height: 0.6 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-left-4',
    label: 'Left Large 4',
    cells: [
      { left: 0, top: 0, width: 0.6, height: 1 },
      { left: 0.6, top: 0, width: 0.4, height: 0.25 },
      { left: 0.6, top: 0.25, width: 0.4, height: 0.25 },
      { left: 0.6, top: 0.5, width: 0.4, height: 0.25 },
      { left: 0.6, top: 0.75, width: 0.4, height: 0.25 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-right-4',
    label: 'Right Large 4',
    cells: [
      { left: 0, top: 0, width: 0.4, height: 0.25 },
      { left: 0, top: 0.25, width: 0.4, height: 0.25 },
      { left: 0, top: 0.5, width: 0.4, height: 0.25 },
      { left: 0, top: 0.75, width: 0.4, height: 0.25 },
      { left: 0.4, top: 0, width: 0.6, height: 1 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-l-topleft',
    label: 'L Top Left',
    cells: [
      { left: 0, top: 0, width: 2 / 3, height: 2 / 3 },
      { left: 2 / 3, top: 0, width: 1 / 3, height: 2 / 3 },
      { left: 0, top: 2 / 3, width: 0.5, height: 1 / 3 },
      { left: 0.5, top: 2 / 3, width: 0.5, height: 1 / 3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-l-topright',
    label: 'L Top Right',
    cells: [
      { left: 0, top: 0, width: 1 / 3, height: 2 / 3 },
      { left: 1 / 3, top: 0, width: 2 / 3, height: 2 / 3 },
      { left: 0, top: 2 / 3, width: 0.5, height: 1 / 3 },
      { left: 0.5, top: 2 / 3, width: 0.5, height: 1 / 3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-l-bottomleft',
    label: 'L Bottom Left',
    cells: [
      { left: 0, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0.5, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0, top: 1 / 3, width: 2 / 3, height: 2 / 3 },
      { left: 2 / 3, top: 1 / 3, width: 1 / 3, height: 2 / 3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-l-bottomright',
    label: 'L Bottom Right',
    cells: [
      { left: 0, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0.5, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0, top: 1 / 3, width: 1 / 3, height: 2 / 3 },
      { left: 1 / 3, top: 1 / 3, width: 2 / 3, height: 2 / 3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-center-5',
    label: 'Center Large 5',
    cells: [
      { left: 0.25, top: 0.25, width: 0.5, height: 0.5 },
      { left: 0, top: 0, width: 0.25, height: 1 },
      { left: 0.75, top: 0, width: 0.25, height: 1 },
      { left: 0.25, top: 0, width: 0.5, height: 0.25 },
      { left: 0.25, top: 0.75, width: 0.5, height: 0.25 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-center-9',
    label: 'Center Large 9',
    cells: [
      { left: 0.3, top: 0.3, width: 0.4, height: 0.4 },
      { left: 0, top: 0, width: 0.3, height: 0.3 },
      { left: 0.3, top: 0, width: 0.4, height: 0.3 },
      { left: 0.7, top: 0, width: 0.3, height: 0.3 },
      { left: 0, top: 0.3, width: 0.3, height: 0.4 },
      { left: 0.7, top: 0.3, width: 0.3, height: 0.4 },
      { left: 0, top: 0.7, width: 0.3, height: 0.3 },
      { left: 0.3, top: 0.7, width: 0.4, height: 0.3 },
      { left: 0.7, top: 0.7, width: 0.3, height: 0.3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-row-1-2-1',
    label: '',
    cells: [
      { left: 0, top: 0, width: 1, height: 0.25 },
      { left: 0, top: 0.25, width: 0.5, height: 0.5 },
      { left: 0.5, top: 0.25, width: 0.5, height: 0.5 },
      { left: 0, top: 0.75, width: 1, height: 0.25 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-row-1-3',
    label: '',
    cells: [
      { left: 0, top: 0, width: 1, height: 0.5 },
      { left: 0, top: 0.5, width: 1 / 3, height: 0.5 },
      { left: 1 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
      { left: 2 / 3, top: 0.5, width: 1 / 3, height: 0.5 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-row-3-1',
    label: '',
    cells: [
      { left: 0, top: 0, width: 1 / 3, height: 0.5 },
      { left: 1 / 3, top: 0, width: 1 / 3, height: 0.5 },
      { left: 2 / 3, top: 0, width: 1 / 3, height: 0.5 },
      { left: 0, top: 0.5, width: 1, height: 0.5 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-row-2-1-3',
    label: '',
    cells: [
      { left: 0, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0.5, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0, top: 1 / 3, width: 1, height: 1 / 3 },
      { left: 0, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 1 / 3, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 2 / 3, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-row-3-1-3',
    label: '',
    cells: [
      { left: 0, top: 0, width: 1 / 3, height: 1 / 3 },
      { left: 1 / 3, top: 0, width: 1 / 3, height: 1 / 3 },
      { left: 2 / 3, top: 0, width: 1 / 3, height: 1 / 3 },
      { left: 0, top: 1 / 3, width: 1, height: 1 / 3 },
      { left: 0, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 1 / 3, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 2 / 3, top: 2 / 3, width: 1 / 3, height: 1 / 3 },
    ],
    category: 'asymmetric',
  },
  {
    id: 'asym-row-2-3-2',
    label: '',
    cells: [
      { left: 0, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0.5, top: 0, width: 0.5, height: 1 / 3 },
      { left: 0, top: 1 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 1 / 3, top: 1 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 2 / 3, top: 1 / 3, width: 1 / 3, height: 1 / 3 },
      { left: 0, top: 2 / 3, width: 0.5, height: 1 / 3 },
      { left: 0.5, top: 2 / 3, width: 0.5, height: 1 / 3 },
    ],
    category: 'asymmetric',
  },
];

/**
 * Resolve a normalized collage cell into canvas pixels, applying outer gaps
 * at canvas edges and half gaps between neighboring cells.
 */
export function computeCellRect(
  cell: CollageCell,
  canvasW: number,
  canvasH: number,
  gap: CollageGapInput,
): { left: number; top: number; width: number; height: number } {
  const { gapX, gapY } = normalizeCollageGaps(gap);
  const EPSILON = 0.0002;

  const edgeL = cell.left;
  const edgeT = cell.top;
  const edgeR = cell.left + cell.width;
  const edgeB = cell.top + cell.height;

  const pixelL = edgeL < EPSILON ? gapX : edgeL * canvasW + gapX / 2;
  const pixelT = edgeT < EPSILON ? gapY : edgeT * canvasH + gapY / 2;
  const pixelR = edgeR > 1 - EPSILON ? canvasW - gapX : edgeR * canvasW - gapX / 2;
  const pixelB = edgeB > 1 - EPSILON ? canvasH - gapY : edgeB * canvasH - gapY / 2;

  return {
    left:   pixelL,
    top:    pixelT,
    width:  Math.max(1, pixelR - pixelL),
    height: Math.max(1, pixelB - pixelT),
  };
}

/**
 */
export function resolveCellRect(
  cell: CollageCell,
  canvasWidth: number,
  canvasHeight: number,
): { left: number; top: number; width: number; height: number } {
  return computeCellRect(cell, canvasWidth, canvasHeight, 0);
}
