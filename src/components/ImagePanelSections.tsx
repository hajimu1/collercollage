import { useState } from 'react';
import { ImagePlus, ChevronDown, ChevronRight } from 'lucide-react';

import type { FabricEditorController } from '../hooks/useFabricEditor';
import type { ImageFilters, ImageLayerItem, ShadowSettings } from '../types/layers';
import type { BuiltInAsset } from '../utils/assetRegistry';

export const DEFAULT_IMAGE_FILTERS: ImageFilters = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  temperature: 0,
  tint: 0,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  fade: 0,
  grain: 0,
  blur: 0,
  sharpen: 0,
  grayscale: false,
  sepia: false,
};

const IMAGE_ADJUSTMENT_PRESETS: Array<{ name: string; filters: ImageFilters }> = [
  { name: 'Clean', filters: { ...DEFAULT_IMAGE_FILTERS } },
  { name: 'Soft', filters: { ...DEFAULT_IMAGE_FILTERS, brightness: 0.06, contrast: -0.08, saturation: -0.04, fade: 0.08 } },
  { name: 'Warm Diary', filters: { ...DEFAULT_IMAGE_FILTERS, temperature: 0.34, exposure: 0.08, saturation: 0.08, fade: 0.06 } },
  { name: 'Cool Water', filters: { ...DEFAULT_IMAGE_FILTERS, temperature: -0.28, tint: -0.08, contrast: -0.04, saturation: 0.06 } },
  { name: 'Muted', filters: { ...DEFAULT_IMAGE_FILTERS, saturation: -0.28, contrast: -0.12, fade: 0.18 } },
  { name: 'Film Fade', filters: { ...DEFAULT_IMAGE_FILTERS, contrast: -0.22, saturation: -0.12, temperature: 0.12, fade: 0.32, grain: 0.18 } },
  { name: 'Bright Cafe', filters: { ...DEFAULT_IMAGE_FILTERS, brightness: 0.12, exposure: 0.16, temperature: 0.18, saturation: 0.1 } },
  { name: 'Black & White', filters: { ...DEFAULT_IMAGE_FILTERS, grayscale: true, contrast: 0.08, fade: 0.04 } },
  { name: 'Retro Green', filters: { ...DEFAULT_IMAGE_FILTERS, temperature: -0.1, tint: 0.2, contrast: -0.06, grain: 0.12, fade: 0.12 } },
  { name: 'Low Contrast Story', filters: { ...DEFAULT_IMAGE_FILTERS, contrast: -0.28, highlights: -0.16, shadows: 0.12, fade: 0.18 } },
];

const QUICK_TONE_PRESETS: Array<{ name: string; filters: ImageFilters }> = [
  { name: 'Match Soft', filters: { ...DEFAULT_IMAGE_FILTERS, brightness: 0.04, contrast: -0.1, fade: 0.08 } },
  { name: 'Match Cool', filters: { ...DEFAULT_IMAGE_FILTERS, temperature: -0.24, tint: -0.04, saturation: 0.04 } },
  { name: 'Match Warm', filters: { ...DEFAULT_IMAGE_FILTERS, temperature: 0.28, exposure: 0.08, saturation: 0.06 } },
  { name: 'Match Film', filters: { ...DEFAULT_IMAGE_FILTERS, contrast: -0.18, fade: 0.26, grain: 0.16 } },
  { name: 'Match Muted', filters: { ...DEFAULT_IMAGE_FILTERS, saturation: -0.24, contrast: -0.12, fade: 0.14 } },
];

const defaultShadow: ShadowSettings = {
  enabled: false,
  color: 'rgba(0,0,0,0.25)',
  blur: 12,
  offsetX: 4,
  offsetY: 4,
};

const percent = (value: number | undefined) => `${Math.round((value ?? 0) * 100)}%`;
const alphaToColor = (alpha: number) => `rgba(0,0,0,${Math.max(0, Math.min(1, alpha)).toFixed(2)})`;

function shadowAlpha(color: string | undefined) {
  if (!color) return 0.25;
  const match = color.match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/i);
  if (match) return Math.max(0, Math.min(1, Number(match[1])));
  return 0.25;
}

interface SliderDef {
  key: keyof ImageFilters;
  label: string;
  min: number;
  max: number;
  step: number;
}

const SLIDERS: SliderDef[] = [
  { key: 'brightness', label: 'Brightness', min: -1, max: 1, step: 0.05 },
  { key: 'contrast', label: 'Contrast', min: -1, max: 1, step: 0.05 },
  { key: 'saturation', label: 'Saturation', min: -1, max: 1, step: 0.05 },
  { key: 'temperature', label: 'Temperature', min: -1, max: 1, step: 0.05 },
  { key: 'tint', label: 'Tint', min: -1, max: 1, step: 0.05 },
  { key: 'exposure', label: 'Exposure', min: -1, max: 1, step: 0.05 },
  { key: 'highlights', label: 'Highlights', min: -1, max: 1, step: 0.05 },
  { key: 'shadows', label: 'Shadows', min: -1, max: 1, step: 0.05 },
  { key: 'fade', label: 'Fade', min: 0, max: 1, step: 0.05 },
  { key: 'grain', label: 'Grain', min: 0, max: 1, step: 0.05 },
  { key: 'blur', label: 'Blur', min: 0, max: 1, step: 0.05 },
  { key: 'sharpen', label: 'Sharpen', min: 0, max: 1, step: 0.05 },
];

interface ImageFilterSectionProps {
  selectedImage: ImageLayerItem | null;
  updateFilter: (patch: Partial<ImageFilters>) => void;
  resetFilters: () => void;
  updateShadow: (shadow: ShadowSettings) => void;
  updateStroke: (color: string, width: number) => void;
}

export function ImageFilterSection({
  selectedImage,
  updateFilter,
  resetFilters,
  updateShadow,
  updateStroke,
}: ImageFilterSectionProps) {
  const filters = selectedImage?.filters ?? DEFAULT_IMAGE_FILTERS;
  const shadow = selectedImage?.shadow ?? defaultShadow;
  const borderColor = selectedImage?.stroke?.color ?? '#101820';
  const borderWidth = selectedImage?.stroke?.width ?? 0;
  const strength = shadow.enabled ? shadowAlpha(shadow.color) : 0;

  const setPreset = (preset: ImageFilters) => updateFilter({ ...DEFAULT_IMAGE_FILTERS, ...preset });
  const setShadow = (patch: Partial<ShadowSettings>) => updateShadow({ ...defaultShadow, ...shadow, ...patch });

  return (
    <section className="panel-section">
      <div className="section-title">Image tone</div>
      {selectedImage ? (
        <div className="control-grid" style={{ display: 'grid', gap: '12px' }}>
          <div className="preset-grid span-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {IMAGE_ADJUSTMENT_PRESETS.map((preset) => (
              <button key={preset.name} className="secondary-button" onClick={() => setPreset(preset.filters)} type="button" style={{ padding: '0 8px', fontSize: '12px' }}>
                {preset.name}
              </button>
            ))}
          </div>

          <div className="segmented-control span-2" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            {QUICK_TONE_PRESETS.map((preset) => (
              <button key={preset.name} onClick={() => setPreset(preset.filters)} type="button" style={{ padding: '0 4px', fontSize: '11px' }}>
                {preset.name.replace('Match ', '')}
              </button>
            ))}
          </div>

          {SLIDERS.map((slider) => (
            <label key={slider.key}>
              {slider.label}
              <span className="range-value">{percent(filters[slider.key] as number | undefined)}</span>
              <input
                max={slider.max}
                min={slider.min}
                step={slider.step}
                onChange={(event) => updateFilter({ [slider.key]: Number(event.target.value) })}
                type="range"
                value={Number(filters[slider.key] ?? 0)}
              />
            </label>
          ))}

          <div className="span-2" style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                checked={Boolean(filters.grayscale)}
                onChange={(e) => updateFilter({ grayscale: e.target.checked })}
                type="checkbox"
              />
              Grayscale
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
              <input
                checked={Boolean(filters.sepia)}
                onChange={(e) => updateFilter({ sepia: e.target.checked })}
                type="checkbox"
              />
              Sepia
            </label>
          </div>

          <button className="secondary-button span-2" onClick={resetFilters} style={{ width: '100%', marginTop: '6px' }} type="button">
            Reset adjustments
          </button>

          <div className="section-title span-2" style={{ marginTop: '8px' }}>Shadow & border</div>
          <div className="preset-grid span-2" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <button className="secondary-button" onClick={() => setShadow({ enabled: true, color: 'rgba(0,0,0,0.18)', blur: 18, offsetX: 0, offsetY: 10 })} type="button" style={{ padding: '0 8px', fontSize: '12px' }}>
              Soft Shadow
            </button>
            <button className="secondary-button" onClick={() => setShadow({ enabled: true, color: 'rgba(0,0,0,0.28)', blur: 10, offsetX: 3, offsetY: 5 })} type="button" style={{ padding: '0 8px', fontSize: '12px' }}>
              Paper Shadow
            </button>
            <button className="secondary-button" onClick={() => updateStroke('#ffffff', 10)} type="button" style={{ padding: '0 8px', fontSize: '12px' }}>
              Sticker Border
            </button>
            <button className="secondary-button" onClick={() => setShadow({ enabled: false })} type="button" style={{ padding: '0 8px', fontSize: '12px' }}>
              No Shadow
            </button>
            <button className="secondary-button span-2" onClick={() => updateStroke(borderColor, 0)} type="button" style={{ padding: '0 8px', fontSize: '12px' }}>
              No Border
            </button>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
            <input
              checked={shadow.enabled}
              onChange={(event) => setShadow({ enabled: event.target.checked })}
              type="checkbox"
            />
            Shadow
          </label>
          <label>
            Shadow strength
            <span className="range-value">{Math.round(strength * 100)}%</span>
            <input
              max={1}
              min={0}
              step={0.05}
              onChange={(event) => setShadow({ enabled: Number(event.target.value) > 0, color: alphaToColor(Number(event.target.value)) })}
              type="range"
              value={strength}
            />
          </label>
          <label>
            Shadow blur
            <span className="range-value">{shadow.blur}px</span>
            <input
              disabled={!shadow.enabled}
              max={60}
              min={0}
              onChange={(event) => setShadow({ blur: Number(event.target.value) })}
              type="range"
              value={shadow.blur}
            />
          </label>
          <label>
            Shadow offset
            <span className="range-value">{shadow.offsetY}px</span>
            <input
              disabled={!shadow.enabled}
              max={40}
              min={-40}
              onChange={(event) => setShadow({ offsetY: Number(event.target.value) })}
              type="range"
              value={shadow.offsetY}
            />
          </label>

          <label className="color-input-line">
            Border color
            <input onChange={(event) => updateStroke(event.target.value, borderWidth)} type="color" value={borderColor} />
          </label>
          <label>
            Border width
            <span className="range-value">{borderWidth}px</span>
            <input
              max={80}
              min={0}
              onChange={(event) => updateStroke(borderColor, Number(event.target.value))}
              type="range"
              value={borderWidth}
            />
          </label>
        </div>
      ) : (
        <div className="empty-hint">
          <ImagePlus size={18} aria-hidden="true" />
          Select an image layer to adjust tone, shadow, and border.
        </div>
      )}
    </section>
  );
}

interface ImageAssetsSectionProps {
  editor: FabricEditorController;
  overlayAssets: BuiltInAsset[];
  stickerAssets: BuiltInAsset[];
  frameAssets: BuiltInAsset[];
  overlayTypes: string[];
  stickerTypes: string[];
  frameTypes: string[];
  overlayAssetType: string;
  stickerAssetType: string;
  frameAssetType: string;
  setOverlayAssetType: (type: string) => void;
  setStickerAssetType: (type: string) => void;
  setFrameAssetType: (type: string) => void;
  visibleOverlayAssets: BuiltInAsset[];
  visibleStickerAssets: BuiltInAsset[];
  visibleFrameAssets: BuiltInAsset[];
  assetLoadError: string | null;
}

export function ImageAssetsSection({
  editor,
  overlayAssets,
  stickerAssets,
  frameAssets,
  overlayTypes,
  stickerTypes,
  frameTypes,
  overlayAssetType,
  stickerAssetType,
  frameAssetType,
  setOverlayAssetType,
  setStickerAssetType,
  setFrameAssetType,
  visibleOverlayAssets,
  visibleStickerAssets,
  visibleFrameAssets,
  assetLoadError,
}: ImageAssetsSectionProps) {
  const [framesOpen, setFramesOpen] = useState(false);
  const [overlaysOpen, setOverlaysOpen] = useState(false);
  const [stickersOpen, setStickersOpen] = useState(false);

  return (
    <>
      {frameAssets.length > 0 && (
        <section className="panel-section">
          <div
            className="section-title"
            onClick={() => setFramesOpen(!framesOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <span>Built-in frames</span>
            {framesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          {framesOpen && (
            <div style={{ marginTop: '10px' }}>
              <select
                className="asset-type-select"
                onChange={(event) => setFrameAssetType(event.target.value)}
                value={frameAssetType}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                {frameTypes.map((type) => (
                  <option key={type} value={type}>{type === 'all' ? 'All frames' : type}</option>
                ))}
              </select>
              <div className="asset-picker-grid">
                {visibleFrameAssets.map((asset) => (
                  <button
                    className="asset-picker-button"
                    key={asset.id}
                    onClick={() => void editor.addBuiltInAsset(asset)}
                    title={asset.name}
                    type="button"
                  >
                    <img alt="" src={asset.previewSrc} />
                    <span>{asset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {overlayAssets.length > 0 && (
        <section className="panel-section">
          <div
            className="section-title"
            onClick={() => setOverlaysOpen(!overlaysOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <span>Built-in overlays</span>
            {overlaysOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          {overlaysOpen && (
            <div style={{ marginTop: '10px' }}>
              <select
                className="asset-type-select"
                onChange={(event) => setOverlayAssetType(event.target.value)}
                value={overlayAssetType}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                {overlayTypes.map((type) => (
                  <option key={type} value={type}>{type === 'all' ? 'All overlays' : type}</option>
                ))}
              </select>
              <div className="asset-picker-grid">
                {visibleOverlayAssets.map((asset) => (
                  <button
                    className="asset-picker-button"
                    key={asset.id}
                    onClick={() => void editor.addBuiltInAsset(asset)}
                    title={asset.name}
                    type="button"
                  >
                    <img alt="" src={asset.previewSrc} />
                    <span>{asset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {stickerAssets.length > 0 && (
        <section className="panel-section">
          <div
            className="section-title"
            onClick={() => setStickersOpen(!stickersOpen)}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          >
            <span>Built-in stickers</span>
            {stickersOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
          {stickersOpen && (
            <div style={{ marginTop: '10px' }}>
              <select
                className="asset-type-select"
                onChange={(event) => setStickerAssetType(event.target.value)}
                value={stickerAssetType}
                style={{ width: '100%', marginBottom: '8px' }}
              >
                {stickerTypes.map((type) => (
                  <option key={type} value={type}>{type === 'all' ? 'All stickers' : type}</option>
                ))}
              </select>
              <div className="asset-picker-grid">
                {visibleStickerAssets.map((asset) => (
                  <button
                    className="asset-picker-button"
                    key={asset.id}
                    onClick={() => void editor.addBuiltInAsset(asset)}
                    title={asset.name}
                    type="button"
                  >
                    <img alt="" src={asset.previewSrc} />
                    <span>{asset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {assetLoadError && (
        <section className="panel-section">
          <div className="empty-hint">{assetLoadError}</div>
        </section>
      )}
    </>
  );
}
