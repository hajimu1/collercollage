import { Check } from 'lucide-react';
import { DEFAULT_COLOR_CHIPS } from '../constants/canvas';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import type {
  AdjustmentLayerItem,
  BlendMode,
  AdjustmentLayerKind,
  AdjustmentGradientType,
} from '../types/layers';

interface AdjustmentPanelProps {
  editor: FabricEditorController;
}

const adjustmentKinds: Array<{ kind: AdjustmentLayerKind; label: string }> = [
  { kind: 'solid-color', label: 'Solid Color' },
  { kind: 'gradient', label: 'Gradient' },
];

const gradientTypes: Array<{ type: AdjustmentGradientType; label: string }> = [
  { type: 'linear', label: 'Linear' },
  { type: 'radial', label: 'Radial' },
];

const blendModes: Array<{ mode: BlendMode; label: string }> = [
  { mode: 'normal', label: 'Normal' },
  { mode: 'multiply', label: 'Multiply' },
  { mode: 'screen', label: 'Screen' },
  { mode: 'overlay', label: 'Overlay' },
  { mode: 'soft-light', label: 'Soft Light' },
  { mode: 'difference', label: 'Difference' },
  { mode: 'exclusion', label: 'Exclusion' },
];

const PRESET_GRADIENTS: Array<[string, string]> = [
  ['#ff7e5f', '#feb47b'], // Sunset Glow
  ['#2b5876', '#4e4376'], // Cool Ocean
  ['#ff9a9e', '#fecfef'], // Sweet Peach
  ['#a1c4fd', '#c2e9fb'], // Sky Blue
  ['#fbc2eb', '#a6c1ee'], // Lavender Dream
  ['#f83600', '#f9d423'], // Retro Warmth
  ['#e0c3fc', '#8ec5fc'], // Soft Purple
  ['#f5f7fa', '#c3cfe2'], // Morning Dew
  ['#d4fc79', '#96e6a1'], // Fresh Lime
  ['#ff9a00', '#ff5a00'], // Orange Juice
];

export function AdjustmentPanel({ editor }: AdjustmentPanelProps) {
  const layer = editor.selection?.type === 'adjustment'
    ? (editor.selection as AdjustmentLayerItem)
    : null;

  if (!layer) {
    return (
      <div className="panel-stack">
        <div className="helper-text">No adjustment layer selected.</div>
      </div>
    );
  }

  const opacityPct = Math.round((layer.opacity ?? 1) * 100);
  const color = layer.color ?? '#f4a7c8';
  const gradientColors = layer.gradientColors ?? ['#f4a7c8', '#fff2a8'];

  const handleUpdate = (patch: Partial<{
    kind: AdjustmentLayerKind;
    color: string;
    gradientType: AdjustmentGradientType;
    gradientColors: [string, string];
    blendMode: BlendMode;
  }>) => {
    editor.updateSelectedAdjustment(patch);
  };

  const handleOpacityChange = (value: number) => {
    editor.updateSelectedOpacity(value / 100);
  };

  return (
    <div className="panel-stack">
      {/* Opacity / Strength control */}
      <section className="panel-section">
        <div className="section-title">Filter Intensity (Opacity)</div>
        <label>
          Opacity
          <span className="range-value">{opacityPct}%</span>
          <input
            max={100}
            min={0}
            onChange={(e) => handleOpacityChange(Number(e.target.value))}
            type="range"
            value={opacityPct}
          />
        </label>
      </section>

      {/* Blend Mode selector */}
      <section className="panel-section">
        <div className="section-title">Blend Mode</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
          {blendModes.map((option) => (
            <button
              key={option.mode}
              className="chip-button"
              style={{
                borderColor: layer.blendMode === option.mode ? 'var(--accent)' : 'var(--border)',
                backgroundColor: layer.blendMode === option.mode ? 'rgba(0, 118, 246, 0.08)' : 'transparent',
                color: layer.blendMode === option.mode ? 'var(--accent)' : 'inherit',
                fontWeight: layer.blendMode === option.mode ? 'bold' : 'normal',
                padding: '8px',
                fontSize: '12px',
              }}
              onClick={() => handleUpdate({ blendMode: option.mode })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Adjustment Kind selector (Solid vs Gradient) */}
      <section className="panel-section">
        <div className="section-title">Overlay Type</div>
        <div className="segmented-control">
          {adjustmentKinds.map((option) => (
            <button
              key={option.kind}
              data-selected={layer.kind === option.kind}
              onClick={() => handleUpdate({ kind: option.kind })}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Solid Color Customization */}
      {layer.kind === 'solid-color' && (
        <section className="panel-section">
          <div className="section-title">Solid Color</div>
          <div className="color-chip-grid">
            {DEFAULT_COLOR_CHIPS.map((chipColor) => (
              <button
                aria-label={chipColor}
                className="color-chip"
                data-selected={color.toLowerCase() === chipColor.toLowerCase()}
                key={chipColor}
                onClick={() => handleUpdate({ color: chipColor })}
                style={{ backgroundColor: chipColor }}
                title={chipColor}
                type="button"
              />
            ))}
          </div>
          <label className="color-input-line" style={{ marginTop: '12px' }}>
            Custom Color
            <input
              onChange={(e) => handleUpdate({ color: e.target.value })}
              type="color"
              value={color}
            />
          </label>
        </section>
      )}

      {/* Gradient Customization */}
      {layer.kind === 'gradient' && (
        <>
          <section className="panel-section">
            <div className="section-title">Gradient Direction</div>
            <div className="segmented-control">
              {gradientTypes.map((option) => (
                <button
                  key={option.type}
                  data-selected={layer.gradientType === option.type}
                  onClick={() => handleUpdate({ gradientType: option.type })}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title">Gradient Colors</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <label className="color-input-line">
                Start
                <input
                  onChange={(e) =>
                    handleUpdate({
                      gradientColors: [e.target.value, gradientColors[1]],
                    })
                  }
                  type="color"
                  value={gradientColors[0]}
                />
              </label>
              <label className="color-input-line">
                End
                <input
                  onChange={(e) =>
                    handleUpdate({
                      gradientColors: [gradientColors[0], e.target.value],
                    })
                  }
                  type="color"
                  value={gradientColors[1]}
                />
              </label>
            </div>

            <div className="color-chip-grid" style={{ marginTop: '16px' }}>
              {PRESET_GRADIENTS.map((colorsArr, idx) => {
                const isSelected =
                  gradientColors[0].toLowerCase() === colorsArr[0].toLowerCase() &&
                  gradientColors[1].toLowerCase() === colorsArr[1].toLowerCase();
                return (
                  <button
                    aria-label={`Gradient preset ${idx}`}
                    className="color-chip"
                    key={idx}
                    onClick={() => handleUpdate({ gradientColors: colorsArr })}
                    style={{
                      background: `linear-gradient(135deg, ${colorsArr[0]}, ${colorsArr[1]})`,
                      border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
                    }}
                    type="button"
                  />
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Delete / Remove Layer */}
      <section className="panel-section" style={{ marginTop: '12px' }}>
        <button
          className="secondary-button"
          onClick={() => editor.deleteLayer(layer.id)}
          style={{ width: '100%', borderColor: '#ff4d4f', color: '#ff4d4f' }}
          type="button"
        >
          Remove Filter Layer
        </button>
      </section>
    </div>
  );
}
