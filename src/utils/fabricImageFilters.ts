import type { ImageFilters } from '../types/layers';
import type { FabricImageObject } from './fabricHelpers';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const value = (input: number | undefined, fallback = 0) => Number.isFinite(input) ? Number(input) : fallback;

export const applyFabricFiltersToImage = async (image: any, filters: ImageFilters) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabric: Record<string, any> = await import('fabric/es');
  const fabricFilters = fabric.filters;
  if (!fabricFilters) return;

  let target: any = image;
  if (image && (image as any).type === 'group') {
    target = (image as any).getObjects?.().find((obj: any) => obj.type === 'image') || (image as any).getObjects?.()[0];
  }
  if (!target) return;

  const activeFilters: unknown[] = [];
  const brightness = value(filters.brightness);
  const contrast = value(filters.contrast);
  const saturation = value(filters.saturation);
  const temperature = value(filters.temperature);
  const tint = value(filters.tint);
  const exposure = value(filters.exposure);
  const highlights = value(filters.highlights);
  const shadows = value(filters.shadows);
  const fade = clamp(value(filters.fade), 0, 1);
  const grain = clamp(value(filters.grain), 0, 1);
  const blur = clamp(value(filters.blur), 0, 1);
  const sharpen = clamp(value(filters.sharpen), 0, 1);

  const brightnessValue = clamp(brightness + exposure * 0.45 + highlights * 0.08 + shadows * 0.12 + fade * 0.08, -1, 1);
  const contrastValue = clamp(contrast + exposure * 0.12 + highlights * 0.12 - shadows * 0.08 - fade * 0.35, -1, 1);
  const saturationValue = clamp(saturation - fade * 0.12, -1, 1);

  if (brightnessValue !== 0) {
    const Cls = fabricFilters.Brightness;
    if (Cls) activeFilters.push(new Cls({ brightness: brightnessValue }));
  }
  if (contrastValue !== 0) {
    const Cls = fabricFilters.Contrast;
    if (Cls) activeFilters.push(new Cls({ contrast: contrastValue }));
  }
  if (saturationValue !== 0) {
    const Cls = fabricFilters.Saturation;
    if (Cls) activeFilters.push(new Cls({ saturation: saturationValue }));
  }

  if (temperature !== 0 || tint !== 0 || fade !== 0) {
    const Cls = fabricFilters.ColorMatrix;
    if (Cls) {
      const red = clamp(1 + temperature * 0.13 + fade * 0.04, 0.6, 1.4);
      const green = clamp(1 + tint * 0.08 + fade * 0.04, 0.6, 1.4);
      const blue = clamp(1 - temperature * 0.13 - tint * 0.05 + fade * 0.04, 0.6, 1.4);
      activeFilters.push(new Cls({
        matrix: [
          red, 0, 0, 0, 0,
          0, green, 0, 0, 0,
          0, 0, blue, 0, 0,
          0, 0, 0, 1, 0,
        ],
      }));
    }
  }

  if (blur !== 0) {
    const Cls = fabricFilters.Blur;
    if (Cls) activeFilters.push(new Cls({ blur }));
  }
  if (sharpen !== 0) {
    const Cls = fabricFilters.Convolute;
    if (Cls) {
      const amount = sharpen * 0.65;
      activeFilters.push(new Cls({
        matrix: [
          0, -amount, 0,
          -amount, 1 + amount * 4, -amount,
          0, -amount, 0,
        ],
      }));
    }
  }
  if (grain !== 0) {
    const Cls = fabricFilters.Noise;
    if (Cls) activeFilters.push(new Cls({ noise: Math.round(grain * 80) }));
  }
  if (filters.grayscale) {
    const Cls = fabricFilters.Grayscale;
    if (Cls) activeFilters.push(new Cls());
  }
  if (filters.sepia) {
    const Cls = fabricFilters.Sepia;
    if (Cls) activeFilters.push(new Cls());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (target as any).filters = activeFilters;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (target as any).applyFilters?.();
};
