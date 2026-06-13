import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Trash2, Sparkles } from 'lucide-react';
import {
  CANVAS_PRESETS,
  DEFAULT_COLOR_CHIPS,
  MAX_CUSTOM_CANVAS_SIZE,
  MIN_CUSTOM_CANVAS_SIZE,
} from '../constants/canvas';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import type { BackgroundFit, BackgroundMode } from '../types/layers';

interface BackgroundPanelProps {
  editor: FabricEditorController;
}

const backgroundModes: Array<{ mode: BackgroundMode; label: string }> = [
  { mode: 'solid', label: 'Solid' },
  { mode: 'image', label: 'Image' },
  { mode: 'transparent', label: 'Transparent' },
];

const fitOptions: Array<{ fit: BackgroundFit; label: string }> = [
  { fit: 'cover', label: 'Cover' },
  { fit: 'contain', label: 'Contain' },
  { fit: 'stretch', label: 'Stretch' },
];

export function BackgroundPanel({ editor }: BackgroundPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [customWidth, setCustomWidth] = useState(editor.canvasSize.width);
  const [customHeight, setCustomHeight] = useState(editor.canvasSize.height);
  const [ratioW, setRatioW] = useState(2);
  const [ratioH, setRatioH] = useState(3);

  useEffect(() => {
    setCustomWidth(editor.canvasSize.width);
    setCustomHeight(editor.canvasSize.height);
  }, [editor.canvasSize.height, editor.canvasSize.width]);

  const applyCustomSize = () => {
    editor.setCanvasDimensions({ width: customWidth, height: customHeight });
  };

  const applyCustomRatio = () => {
    const w = Math.max(1, ratioW || 1);
    const h = Math.max(1, ratioH || 1);
    let nextWidth = 1080;
    let nextHeight = 1080;

    if (w >= h) {
      nextHeight = 1080;
      nextWidth = Math.round(1080 * (w / h));
    } else {
      nextWidth = 1080;
      nextHeight = Math.round(1080 * (h / w));
    }

    editor.setCanvasDimensions({
      width: Math.max(MIN_CUSTOM_CANVAS_SIZE, Math.min(MAX_CUSTOM_CANVAS_SIZE, nextWidth)),
      height: Math.max(MIN_CUSTOM_CANVAS_SIZE, Math.min(MAX_CUSTOM_CANVAS_SIZE, nextHeight)),
    });
  };

  const handleBackgroundImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await editor.setBackgroundImageFromFile(file);
    event.target.value = '';
  };

  const uploadPhotoLayer = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (event) => {
      const files = Array.from((event.target as HTMLInputElement).files ?? []);
      for (const file of files) await editor.addImageFromFile(file);
    };
    input.click();
  };

  return (
    <div className="panel-stack">
      <section className="panel-section">
        <div className="section-title">Canvas Size</div>
        <div className="preset-grid">
          {CANVAS_PRESETS.map((preset) => (
            <button className="chip-button" key={preset.id} onClick={() => editor.setCanvasDimensions(preset)} type="button">
              {preset.label}
            </button>
          ))}
        </div>
        <div className="custom-size-row" style={{ marginTop: '4px' }}>
          <label>
            Ratio Width
            <input min={1} onChange={(event) => setRatioW(Math.max(1, Number(event.target.value)))} type="number" value={ratioW} />
          </label>
          <label>
            Ratio Height
            <input min={1} onChange={(event) => setRatioH(Math.max(1, Number(event.target.value)))} type="number" value={ratioH} />
          </label>
          <button className="secondary-button" onClick={applyCustomRatio} style={{ alignSelf: 'end' }} type="button">
            Apply Ratio
          </button>
        </div>
        <div className="custom-size-row">
          <label>
            W
            <input inputMode="numeric" max={MAX_CUSTOM_CANVAS_SIZE} min={MIN_CUSTOM_CANVAS_SIZE} onChange={(event) => setCustomWidth(Number(event.target.value))} type="number" value={customWidth} />
          </label>
          <label>
            H
            <input inputMode="numeric" max={MAX_CUSTOM_CANVAS_SIZE} min={MIN_CUSTOM_CANVAS_SIZE} onChange={(event) => setCustomHeight(Number(event.target.value))} type="number" value={customHeight} />
          </label>
          <button className="primary-button" onClick={applyCustomSize} style={{ alignSelf: 'end' }} type="button">
            <Check size={18} aria-hidden="true" />
            Apply
          </button>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-title">Background Type</div>
        <div className="segmented-control">
          {backgroundModes.map((mode) => (
            <button data-selected={editor.background.mode === mode.mode} disabled={mode.mode === 'image' && !editor.background.imageSrc} key={mode.mode} onClick={() => editor.setBackgroundMode(mode.mode)} type="button">
              {mode.label}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-title">Background Color</div>
        <div className="color-chip-grid">
          {DEFAULT_COLOR_CHIPS.map((color) => (
            <button aria-label={color} className="color-chip" data-selected={editor.background.color.toLowerCase() === color.toLowerCase()} key={color} onClick={() => editor.setBackgroundColor(color)} style={{ backgroundColor: color }} title={color} type="button" />
          ))}
        </div>
        <label className="color-input-line">
          Custom Color
          <input onChange={(event) => editor.setBackgroundColor(event.target.value)} type="color" value={editor.background.color} />
        </label>
      </section>

      <section className="panel-section">
        <div className="section-title">Background Presets</div>
        <div className="asset-picker-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {[
            { name: 'Cream Paper', file: 'cream_paper_bg_02.png' },
            { name: 'Green Noise', file: 'green_noise_bg_08.png' },
            { name: 'Kraft Fleck', file: 'kraft_fleck_bg_04.png' },
            { name: 'Mint Grid', file: 'mint_grid_bg_01.png' },
            { name: 'Notebook', file: 'notebook_bg_06.png' },
            { name: 'Gray Concrete', file: 'soft_gray_concrete_bg_05.png' },
            { name: 'Terrazzo', file: 'terrazzo_bg_03.png' },
            { name: 'Wrinkled Paper', file: 'wrinkled_paper_bg_07.png' },
          ].map((preset) => {
            const base = `${import.meta.env.BASE_URL || ''}assets/backgrounds/pack`.replace(/\/+$/, '');
            const url = `${base}/${preset.file}`;
            const isSelected = editor.background.imageSrc === url && editor.background.mode === 'image';
            return (
              <button
                key={preset.file}
                className="asset-picker-button"
                data-selected={isSelected}
                onClick={() => void editor.setBackgroundImageFromUrl(url)}
                title={preset.name}
                type="button"
                style={{ padding: '4px', border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)' }}
              >
                <img alt={preset.name} src={url} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '4px' }} />
                <span style={{ fontSize: '9px', marginTop: '2px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{preset.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-section">
        <div className="section-title">Background Image</div>
        <button className="wide-command" onClick={() => fileInputRef.current?.click()} type="button">
          <ImagePlus size={20} aria-hidden="true" />
          Upload Background Image
        </button>
        <input accept="image/*" hidden onChange={(event) => void handleBackgroundImage(event)} ref={fileInputRef} type="file" />

        <button className="wide-command" onClick={uploadPhotoLayer} style={{ marginTop: '8px', border: '1.5px dashed #0076f6', background: '#ffffff', color: '#0076f6', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} type="button">
          <ImagePlus size={20} color="#0076f6" aria-hidden="true" />
          Upload Photo Layer
        </button>

        <div className="segmented-control" style={{ marginTop: '12px' }}>
          {fitOptions.map((option) => (
            <button data-selected={editor.background.fit === option.fit} disabled={!editor.background.imageSrc} key={option.fit} onClick={() => editor.setBackgroundFit(option.fit)} type="button">
              {option.label}
            </button>
          ))}
        </div>
        <button className="secondary-button" disabled={!editor.background.imageSrc} onClick={editor.removeBackgroundImage} type="button">
          <Trash2 size={18} aria-hidden="true" />
          Remove Background Image
        </button>
      </section>

      <section className="panel-section">
        <div className="section-title">Mood Filter Overlay</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <button
            className="secondary-button"
            onClick={() => editor.addAdjustmentLayer('solid-color')}
            type="button"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <Sparkles size={16} />
            + Solid Filter
          </button>
          <button
            className="secondary-button"
            onClick={() => editor.addAdjustmentLayer('gradient', 'linear')}
            type="button"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
          >
            <Sparkles size={16} />
            + Gradient Filter
          </button>
        </div>
        <div className="helper-text" style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Adds a canvas-wide color overlay filter. Adjust blend modes and opacity in the properties panel to create a moody tone.
        </div>
      </section>
    </div>
  );
}

