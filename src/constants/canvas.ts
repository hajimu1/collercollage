import type { CanvasPreset } from '../types/layers';
import type { CanvasBackground } from '../types/layers';

export const BACKGROUND_LAYER_ID = 'background-layer';

export const DEFAULT_CANVAS_SIZE = {
  width: 1080,
  height: 1080,
};

export const DEFAULT_BACKGROUND: CanvasBackground = {
  mode: 'solid',
  color: '#ffffff',
  fit: 'cover',
};

export const CANVAS_PRESETS: CanvasPreset[] = [
  { id: '1:1', label: '1:1', width: 1080, height: 1080 },
  { id: '4:5', label: '4:5', width: 1080, height: 1350 },
  { id: '3:4', label: '3:4', width: 1080, height: 1440 },
  { id: '2:3', label: '2:3', width: 1080, height: 1620 },
  { id: '5:7', label: '5:7', width: 1080, height: 1512 },
  { id: '9:16', label: '9:16', width: 1080, height: 1920 },
  { id: '16:9', label: '16:9', width: 1600, height: 900 },
];

export const DEFAULT_COLOR_CHIPS = [
  '#ffffff',
  '#f6f7fb',
  '#101820',
  '#ffd43b',
  '#ff6b6b',
  '#4dabf7',
  '#20c997',
  '#845ef7',
  '#f06595',
  '#adb5bd',
];

export const MAX_IMAGE_DIMENSION = 4096;

export const MIN_CUSTOM_CANVAS_SIZE = 320;

export const MAX_CUSTOM_CANVAS_SIZE = 4096;
