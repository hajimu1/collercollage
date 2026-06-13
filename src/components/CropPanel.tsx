import { Check, FlipHorizontal, X } from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';

interface CropPanelProps {
  editor: FabricEditorController;
}

const RATIO_PRESETS = [
  { label: 'Free', value: null },
  { label: '1:1', value: [1, 1] },
  { label: '4:3', value: [4, 3] },
  { label: '3:4', value: [3, 4] },
  { label: '16:9', value: [16, 9] },
  { label: '9:16', value: [9, 16] },
] as const;

export function CropPanel({ editor }: CropPanelProps) {
  const crop = editor.cropMode?.draft;
  if (!crop) return null;

  const frameW = crop.frameWidth ?? 100;
  const frameH = crop.frameHeight ?? 100;
  const cropW = Math.round(frameW * (crop.cropWidthRatio ?? 1));
  const cropH = Math.round(frameH * (crop.cropHeightRatio ?? 1));

  const applyRatio = (ratio: readonly [number, number] | null) => {
    if (!ratio) {
      editor.setCropAspectRatio(null);
      return;
    }

    const [rw, rh] = ratio;
    editor.setCropAspectRatio(rw / rh);
  };

  const getCurrentRatioLabel = () => {
    const activeAspectRatio = editor.cropMode?.aspectRatio ?? null;
    if (activeAspectRatio === null) return 'Free';

    for (const preset of RATIO_PRESETS) {
      if (!preset.value) continue;
      const [rw, rh] = preset.value;
      if (Math.abs(activeAspectRatio - rw / rh) < 0.02) return preset.label;
    }

    return 'Free';
  };

  return (
    <section className="panel-stack" aria-label="Crop mode">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderBottom: '1px solid var(--line-soft)', paddingBottom: '6px' }}>
        <span className="crop-title">Crop</span>
        <span className="range-value" style={{ color: 'var(--muted)' }}>{cropW} x {cropH} px</span>
      </div>

      <div className="panel-section">
        <div className="section-title">Ratio</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
          {RATIO_PRESETS.map((preset) => (
            <button
              className="chip-button"
              data-selected={getCurrentRatioLabel() === preset.label}
              key={preset.label}
              onClick={() => applyRatio(preset.value)}
              style={{ fontSize: '12.5px', minHeight: '36px' }}
              type="button"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="collage-layout-hint">
        Drag the crop box on the canvas, or pull its corners to adjust the selected image area.
      </div>

      <div className="crop-actions">
        <button
          className="secondary-button"
          onClick={editor.resetCropMode}
          style={{ minHeight: '38px', gap: '6px', fontSize: '13px' }}
          title="Reset crop"
          type="button"
        >
          <FlipHorizontal size={15} />
          Reset
        </button>
        <button
          className="secondary-button"
          onClick={editor.cancelCropMode}
          style={{ minHeight: '38px', gap: '6px', fontSize: '13px' }}
          title="Cancel"
          type="button"
        >
          <X size={15} />
          Cancel
        </button>
        <button
          className="primary-button"
          onClick={editor.finishCropMode}
          style={{ minHeight: '38px', gap: '6px', fontSize: '13px' }}
          title="Apply crop"
          type="button"
        >
          <Check size={15} />
          Apply
        </button>
      </div>
    </section>
  );
}
