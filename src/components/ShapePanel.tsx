import { useEffect, useState } from 'react';
import {
  Slash,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Grid,
} from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import type { ShapeStyle, ShapeType } from '../types/layers';
import { clampStrokeWidthForShape, getMaxStrokeWidthForShape } from '../utils/shapeStrokeProfiles';
import { SHAPE_PREVIEW_DEFS } from '../utils/shapePreviewData';
import type { ShapePreviewDef, ShapePreviewItem } from '../utils/shapePreviewData';

interface ShapePanelProps {
  editor: FabricEditorController;
}

// ─── ShapePreview ─────────────────────────────────────────────────────────────
// Renders an inline SVG that mirrors the exact geometry used in canvas insertion.

interface ShapePreviewProps {
  def: ShapePreviewDef;
  fill: string;
  stroke: string;
  strokeWidth: number;
  size?: number;
}

function renderItem(item: ShapePreviewItem, fill: string, stroke: string, sw: number, key: number) {
  const svgSw = sw > 0 ? sw * 0.08 : 0; // 0.08 — tuned to look close to Fabric strokeUniform

  switch (item.kind) {
    case 'circle':
      return (
        <circle key={key} cx={item.cx} cy={item.cy} r={item.r}
          fill={fill} stroke={sw > 0 ? stroke : 'none'} strokeWidth={svgSw} />
      );
    case 'rect':
      return (
        <rect key={key} x={item.x} y={item.y} width={item.width} height={item.height}
          rx={item.rx ?? 0} ry={item.rx ?? 0}
          fill={fill} stroke={sw > 0 ? stroke : 'none'} strokeWidth={svgSw} />
      );
    case 'polygon':
      return (
        <polygon key={key} points={item.points}
          fill={fill} stroke={sw > 0 ? stroke : 'none'} strokeWidth={svgSw} />
      );
    case 'path':
      return (
        <path key={key} d={item.d}
          fill={fill} stroke={sw > 0 ? stroke : 'none'} strokeWidth={svgSw} />
      );
    case 'rect-bar': {
      return (
        <rect
          key={key}
          x={item.x} y={item.y}
          width={item.width} height={item.height}
          rx={item.rx} ry={item.rx}
          fill={fill}
          stroke={'none'}
          strokeWidth={0}
          transform={`rotate(${item.angle}, ${item.cx}, ${item.cy})`}
        />
      );
    }
    default:
      return null;
  }
}

function ShapePreview({ def, fill, stroke, strokeWidth, size = 32 }: ShapePreviewProps) {
  return (
    <svg
      viewBox={def.viewBox}
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {def.items.map((item, i) => renderItem(item, fill, stroke, strokeWidth, i))}
    </svg>
  );
}

// ─── ShapePanel ───────────────────────────────────────────────────────────────

export function ShapePanel({ editor }: ShapePanelProps) {
  const selectedShape = editor.selection?.type === 'shape' ? editor.selection : null;
  const activeStrokeShapeType = selectedShape?.shapeType;
  const maxStrokeWidth = getMaxStrokeWidthForShape(activeStrokeShapeType);
  const strokeControlsEnabled = maxStrokeWidth > 0;
  const opacityPct = Math.round((selectedShape?.opacity ?? 1) * 100);

  const [style, setStyle] = useState<ShapeStyle>({
    fill: '#ffd43b',
    stroke: '#101820',
    strokeWidth: 6,
  });

  // Shadow states
  const [shadowEnabled, setShadowEnabled] = useState(false);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [shadowBlur, setShadowBlur] = useState(12);
  const [shadowOffsetX, setShadowOffsetX] = useState(6);
  const [shadowOffsetY, setShadowOffsetY] = useState(6);

  // Gradient states
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientType, setGradientType] = useState<'linear' | 'radial'>('linear');
  const [gradientColors, setGradientColors] = useState<[string, string]>(['#ffd43b', '#ff9233']);
  const [gradientAngle, setGradientAngle] = useState(0);

  useEffect(() => {
    if (!selectedShape) return;
    setStyle({
      fill: selectedShape.solidFill || (typeof selectedShape.fill === 'string' ? selectedShape.fill : '#ffd43b'),
      stroke: selectedShape.stroke,
      strokeWidth: clampStrokeWidthForShape(selectedShape.shapeType, selectedShape.strokeWidth),
    });

    const sh = selectedShape.shadow;
    setShadowEnabled(sh?.enabled ?? false);
    setShadowColor(sh?.color ?? '#000000');
    setShadowBlur(sh?.blur ?? 12);
    setShadowOffsetX(sh?.offsetX ?? 6);
    setShadowOffsetY(sh?.offsetY ?? 6);

    setGradientEnabled(selectedShape.gradientEnabled ?? false);
    setGradientType(selectedShape.gradientType ?? 'linear');
    setGradientColors(selectedShape.gradientColors ?? ['#ffd43b', '#ff9233']);
    setGradientAngle(selectedShape.gradientAngle ?? 0);
  }, [selectedShape]);

  const updateStyle = (patch: Partial<ShapeStyle>) => {
    const targetShapeType = selectedShape?.shapeType;
    const nextPatch = patch.strokeWidth === undefined
      ? patch
      : { ...patch, strokeWidth: clampStrokeWidthForShape(targetShapeType, patch.strokeWidth) };
    const nextStyle = { ...style, ...nextPatch };
    setStyle(nextStyle);
    if (selectedShape) {
      editor.updateSelectedShape(nextPatch);
    }
  };

  const updateShadow = (patch: any) => {
    if (!selectedShape) return;
    const nextShadow = {
      enabled: shadowEnabled,
      color: shadowColor,
      blur: shadowBlur,
      offsetX: shadowOffsetX,
      offsetY: shadowOffsetY,
      ...patch,
    };
    setShadowEnabled(nextShadow.enabled);
    setShadowColor(nextShadow.color);
    setShadowBlur(nextShadow.blur);
    setShadowOffsetX(nextShadow.offsetX);
    setShadowOffsetY(nextShadow.offsetY);
    editor.updateSelectedShape({ shadow: nextShadow });
  };

  const updateGradient = (patch: any) => {
    if (!selectedShape) return;
    const nextGrad = {
      gradientEnabled,
      gradientType,
      gradientColors,
      gradientAngle,
      ...patch,
    };
    setGradientEnabled(nextGrad.gradientEnabled);
    setGradientType(nextGrad.gradientType);
    setGradientColors(nextGrad.gradientColors);
    setGradientAngle(nextGrad.gradientAngle);
    editor.updateSelectedShape(nextGrad);
  };

  // Determine which stroke to show in the preview — only when stroke is meaningful
  const previewStroke = strokeControlsEnabled ? style.stroke : style.fill;
  const previewStrokeWidth = strokeControlsEnabled ? style.strokeWidth : 0;

  return (
    <div className="panel-stack">
      {/* ─── 다중 선택 정렬 패널 ─── */}
      {editor.isMultiSelect && (
        <section className="panel-section">
          <div className="section-title">정렬 및 분포 ({editor.selectedCount}개 선택됨)</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('left')} type="button" title="왼쪽 정렬">
              <AlignLeft size={16} />
              왼쪽
            </button>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('center')} type="button" title="가운데 정렬">
              <AlignCenter size={16} />
              가운데
            </button>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('right')} type="button" title="오른쪽 정렬">
              <AlignRight size={16} />
              오른쪽
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '8px' }}>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('top')} type="button" title="위쪽 정렬">
              <AlignStartVertical size={16} />
              위쪽
            </button>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('middle')} type="button" title="중간 정렬">
              <AlignCenterVertical size={16} />
              중간
            </button>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('bottom')} type="button" title="아래쪽 정렬">
              <AlignEndVertical size={16} />
              아래쪽
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('distribute-h')} type="button" title="가로 간격 동일하게">
              <Grid size={16} />
              가로 분포
            </button>
            <button className="secondary-button" onClick={() => editor.alignSelectedObjects('distribute-v')} type="button" title="세로 간격 동일하게">
              <Grid size={16} />
              세로 분포
            </button>
          </div>
        </section>
      )}

      {/* ─── 도형 목록 ─── */}
      {!editor.isMultiSelect && (
        <section className="panel-section">
          <div className="shape-grid">
            {SHAPE_PREVIEW_DEFS.map((def) => {
              const sw = getMaxStrokeWidthForShape(def.type as ShapeType) > 0 ? previewStrokeWidth : 0;
              const sk = getMaxStrokeWidthForShape(def.type as ShapeType) > 0 ? previewStroke : style.fill;
              return (
                <button
                  className="shape-button"
                  key={def.type}
                  onClick={() => editor.addShape(def.type as ShapeType, style)}
                  type="button"
                >
                  <ShapePreview
                    def={def}
                    fill={style.fill}
                    stroke={sk}
                    strokeWidth={sw}
                    size={30}
                  />
                  <span>{def.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── 도형 스타일 설정 ─── */}
      {!editor.isMultiSelect && (
        <section className="panel-section">
          <div className="section-title">Shape Style</div>
          <div className="control-grid">
            <label className="color-input-line">
              Fill
              <input
                onChange={(event) => updateStyle({ fill: event.target.value })}
                type="color"
                value={style.fill}
              />
            </label>

            {/* 그라디언트 설정 */}
            {selectedShape && (
              <div className="span-2" style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Gradient Fill</span>
                  <input
                    checked={gradientEnabled}
                    onChange={(e) => updateGradient({ gradientEnabled: e.target.checked })}
                    type="checkbox"
                    style={{ width: '18px', height: '18px' }}
                  />
                </div>

                {gradientEnabled && (
                  <div style={{ display: 'grid', gap: '8px', paddingLeft: '8px' }}>
                    <div className="segmented-control">
                      <button
                        data-selected={gradientType === 'linear'}
                        onClick={() => updateGradient({ gradientType: 'linear' })}
                        type="button"
                      >
                        Linear
                      </button>
                      <button
                        data-selected={gradientType === 'radial'}
                        onClick={() => updateGradient({ gradientType: 'radial' })}
                        type="button"
                      >
                        Radial
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <label className="color-input-line" style={{ flex: 1 }}>
                        Color 1
                        <input
                          onChange={(e) => {
                            const nextColors: [string, string] = [e.target.value, gradientColors[1]];
                            updateGradient({ gradientColors: nextColors });
                          }}
                          type="color"
                          value={gradientColors[0]}
                        />
                      </label>
                      <label className="color-input-line" style={{ flex: 1 }}>
                        Color 2
                        <input
                          onChange={(e) => {
                            const nextColors: [string, string] = [gradientColors[0], e.target.value];
                            updateGradient({ gradientColors: nextColors });
                          }}
                          type="color"
                          value={gradientColors[1]}
                        />
                      </label>
                    </div>

                    {gradientType === 'linear' && (
                      <label>
                        Angle
                        <span className="range-value">{gradientAngle}°</span>
                        <input
                          max={360}
                          min={0}
                          onChange={(e) => updateGradient({ gradientAngle: Number(e.target.value) })}
                          type="range"
                          value={gradientAngle}
                        />
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 스트로크 설정 */}
            {strokeControlsEnabled ? (
              <>
                <label className="color-input-line">
                  Stroke
                  <input
                    onChange={(event) => updateStyle({ stroke: event.target.value })}
                    type="color"
                    value={style.stroke}
                  />
                </label>
                <label className="span-2">
                  Width
                  <span className="range-value">{style.strokeWidth}px</span>
                  <input
                    max={maxStrokeWidth}
                    min={0}
                    onChange={(event) => updateStyle({ strokeWidth: Number(event.target.value) })}
                    type="range"
                    value={clampStrokeWidthForShape(activeStrokeShapeType, style.strokeWidth)}
                  />
                </label>
              </>
            ) : (
              <div className="span-2 helper-text">This decorative shape does not use stroke to maintain its original SVG form.</div>
            )}

            {/* 그림자 설정 */}
            {selectedShape && (
              <div className="span-2" style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', marginTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Shadow Effect</span>
                  <input
                    checked={shadowEnabled}
                    onChange={(e) => updateShadow({ enabled: e.target.checked })}
                    type="checkbox"
                    style={{ width: '18px', height: '18px' }}
                  />
                </div>

                {shadowEnabled && (
                  <div style={{ display: 'grid', gap: '8px', paddingLeft: '8px' }}>
                    <label className="color-input-line">
                      Shadow Color
                      <input
                        onChange={(e) => updateShadow({ color: e.target.value })}
                        type="color"
                        value={shadowColor}
                      />
                    </label>
                    <label>
                      Blur
                      <span className="range-value">{shadowBlur}px</span>
                      <input
                        max={50}
                        min={0}
                        onChange={(e) => updateShadow({ blur: Number(e.target.value) })}
                        type="range"
                        value={shadowBlur}
                      />
                    </label>
                    <label>
                      Offset X
                      <span className="range-value">{shadowOffsetX}px</span>
                      <input
                        max={50}
                        min={-50}
                        onChange={(e) => updateShadow({ offsetX: Number(e.target.value) })}
                        type="range"
                        value={shadowOffsetX}
                      />
                    </label>
                    <label>
                      Offset Y
                      <span className="range-value">{shadowOffsetY}px</span>
                      <input
                        max={50}
                        min={-50}
                        onChange={(e) => updateShadow({ offsetY: Number(e.target.value) })}
                        type="range"
                        value={shadowOffsetY}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {strokeControlsEnabled && (
            <button
              className="secondary-button"
              onClick={() => updateStyle({ strokeWidth: 0 })}
              type="button"
              style={{ marginTop: '8px', width: '100%' }}
            >
              <Slash size={18} aria-hidden="true" />
              선 없음 0px
            </button>
          )}

          <label className="span-2" style={{ marginTop: '12px', display: 'block' }}>
            불투명도
            <span className="range-value">{opacityPct}%</span>
            <input
              disabled={!selectedShape}
              max={100}
              min={0}
              onChange={(e) => editor.updateSelectedOpacity(Number(e.target.value) / 100)}
              type="range"
              value={opacityPct}
            />
          </label>
        </section>
      )}
    </div>
  );
}
