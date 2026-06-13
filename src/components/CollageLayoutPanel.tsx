import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { ImagePlus, Upload } from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import type { ClipType } from '../types/layers';
import { COLLAGE_LAYOUTS, createGridLayout, getCollageLayoutById, normalizeCollageGaps } from '../utils/collageLayouts';
import type { CollageLayout } from '../utils/collageLayouts';

interface CollageLayoutPanelProps {
  editor: FabricEditorController;
}

const CELL_CLIP_OPTIONS: Array<{ label: string; value: ClipType }> = [
  { label: 'Rect', value: 'rect' },
  { label: 'Round', value: 'roundRect' },
  { label: 'Circle', value: 'circle' },
  { label: 'Heart', value: 'heart' },
];

// ── 레이아웃 미리보기 SVG ─────────────────────────────────────────────────
function LayoutPreview({ layout, size = 44 }: { layout: CollageLayout; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      height={size}
      viewBox="0 0 1 1"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {layout.cells.map((cell, idx) => (
        <rect
          fill="currentColor"
          height={cell.height - 0.02}
          key={idx}
          rx={0.015}
          ry={0.015}
          width={cell.width - 0.02}
          x={cell.left + 0.01}
          y={cell.top + 0.01}
        />
      ))}
    </svg>
  );
}

// ── 패널 본체 ─────────────────────────────────────────────────────────────
export function CollageLayoutPanel({ editor }: CollageLayoutPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fillFileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedLayout, setSelectedLayout] = useState<CollageLayout>(
    () => COLLAGE_LAYOUTS.find((l) => l.id === '2h') ?? COLLAGE_LAYOUTS[0],
  );
  const [gapX, setGapX] = useState(17);
  const [gapY, setGapY] = useState(17);
  const [radius, setRadius] = useState(0);
  const [pending, setPending] = useState(false);

  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);
  const [activeCategory, setActiveCategory] = useState<'all' | 'basic' | 'grid' | 'asymmetric'>('all');
  const [templatesExpanded, setTemplatesExpanded] = useState(false);
  const [customExpanded, setCustomExpanded] = useState(false);

  const MIN_GRID_ROWS = 1;
  const MAX_GRID_ROWS = 5;
  const MIN_GRID_COLS = 1;
  const MAX_GRID_COLS = 5;

  const incrementRows = () => setCustomRows((prev) => Math.min(MAX_GRID_ROWS, prev + 1));
  const decrementRows = () => setCustomRows((prev) => Math.max(MIN_GRID_ROWS, prev - 1));
  const incrementCols = () => setCustomCols((prev) => Math.min(MAX_GRID_COLS, prev + 1));
  const decrementCols = () => setCustomCols((prev) => Math.max(MIN_GRID_COLS, prev - 1));

  const {
    activeCollage,
    selectedCollageCellIndex,
    cropRepositionMode,
    cropZoom,
    cropMinZoom,
    cropMaxZoom,
    beginCropReposition,
    finishCropReposition,
    resetCropFocus,
    updateCropZoom,
  } = editor;

  // 외부에서 activeCollage가 바뀌면 로컬 슬라이더 값도 동기화
  useEffect(() => {
    if (activeCollage) {
      const gaps = normalizeCollageGaps(activeCollage);
      setGapX(gaps.gapX);
      setGapY(gaps.gapY);
      setRadius(activeCollage.radiusPx);
      const layout = getCollageLayoutById(activeCollage.layoutId);
      if (layout) setSelectedLayout(layout);
    }
  }, [activeCollage?.gapPx, activeCollage?.gapX, activeCollage?.gapY, activeCollage?.radiusPx, activeCollage?.layoutId]);

  const handleLayoutSelect = (layout: CollageLayout) => {
    setSelectedLayout(layout);
    if (activeCollage) {
      editor.changeCollageLayout(layout);
    }
  };

  const handleGapXChange = (value: number) => {
    setGapX(value);
    editor.updateCollageGap(value, 'x');
  };

  const handleGapYChange = (value: number) => {
    setGapY(value);
    editor.updateCollageGap(value, 'y');
  };

  const handleRadiusChange = (value: number) => {
    setRadius(value);
    editor.updateCollageRadius(value);
  };

  const handleNewCollageFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setPending(true);
    try {
      await editor.applyCollageLayout(files, selectedLayout, gapX, gapY, radius);
    } finally {
      setPending(false);
    }
  };

  const handleFillFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setPending(true);
    try {
      await editor.fillCollageCells(files, selectedCollageCellIndex ?? undefined);
    } finally {
      setPending(false);
    }
  };

  const filteredLayouts = COLLAGE_LAYOUTS.filter(
    (l) => activeCategory === 'all' || l.category === activeCategory
  );

  const cellCount = selectedLayout.cells.length;
  const filledCount = activeCollage?.cells.filter((c) => c.layerId !== null).length ?? 0;
  const emptyCount = activeCollage ? activeCollage.cells.length - filledCount : 0;
  const hasEmpty = emptyCount > 0;
  const selectedCellInfo = selectedCollageCellIndex !== null
    ? activeCollage?.cells.find((cell) => cell.cellIndex === selectedCollageCellIndex)
    : undefined;
  const selectedClipType = selectedCellInfo?.clipType ?? 'rect';

  return (
    <div className="panel-stack">
      {/* 1. 액션 버튼 (새 콜라주 / 빈칸 채우기) */}
      <section className="panel-section">
        <button
          className="wide-command"
          disabled={pending}
          id="collage-new-button"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload aria-hidden="true" size={20} />
          {pending ? '배치 중…' : `새 콜라주 만들기 (${cellCount}칸)`}
        </button>

        {hasEmpty && activeCollage && (
          <button
            className="wide-command collage-fill-button"
            disabled={pending}
            id="collage-fill-button"
            onClick={() => fillFileInputRef.current?.click()}
            type="button"
            style={{ marginTop: '8px' }}
          >
            <ImagePlus aria-hidden="true" size={20} />
            {selectedCollageCellIndex !== null && !activeCollage.cells[selectedCollageCellIndex]?.layerId
              ? `${selectedCollageCellIndex + 1}번 셀부터 빈칸 채우기`
              : `빈칸 채우기 (${emptyCount}칸)`}
          </button>
        )}

        <input
          accept="image/*"
          hidden
          id="collage-new-file-input"
          multiple
          onChange={(e) => void handleNewCollageFiles(e)}
          ref={fileInputRef}
          type="file"
        />
        <input
          accept="image/*"
          hidden
          id="collage-fill-file-input"
          multiple
          onChange={(e) => void handleFillFiles(e)}
          ref={fillFileInputRef}
          type="file"
        />

        <p className="collage-layout-hint" style={{ marginTop: '8px', marginBottom: 0 }}>
          {activeCollage
            ? (selectedCollageCellIndex !== null
              ? '빈칸을 탭하면 해당 셀부터 채울 수 있습니다. 이미지를 탭하면 크롭을 조정할 수 있습니다.'
              : '빈칸을 탭해 시작 위치를 지정할 수 있습니다. 이미지를 탭하면 크롭을 조정할 수 있습니다.')
            : `파일이 부족하면 빈칸으로 남고, 레이아웃 칸 수를 줄이면 뒤쪽 사진부터 자동 제거됩니다.`}
        </p>
      </section>

      {/* 2. 간격 / 모서리 슬라이더 */}
      <section className="panel-section">
        <label>
          <div className="collage-slider-header">
            <span>간격</span>
            <span className="range-value">{gapX}px</span>
          </div>
          <input
            id="collage-gap-x-slider"
            max={80}
            min={0}
            onChange={(e) => handleGapXChange(Number(e.target.value))}
            type="range"
            value={gapX}
          />
        </label>
        <label style={{ marginTop: '12px', display: 'block' }}>
          <div className="collage-slider-header">
            <span>Gap Y</span>
            <span className="range-value">{gapY}px</span>
          </div>
          <input
            id="collage-gap-y-slider"
            max={80}
            min={0}
            onChange={(e) => handleGapYChange(Number(e.target.value))}
            type="range"
            value={gapY}
          />
        </label>
        <label style={{ marginTop: '12px', display: 'block' }}>
          <div className="collage-slider-header">
            <span>둥근 모서리</span>
            <span className="range-value">{radius}px</span>
          </div>
          <input
            id="collage-radius-slider"
            max={120}
            min={0}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            type="range"
            value={radius}
          />
        </label>
      </section>

      {/* 3. 셀 선택 정보 (선택했을 때만 조건부) */}
      {activeCollage && selectedCollageCellIndex !== null && (
        <section className="panel-section">
          <div className="collage-status-bar" style={{ marginBottom: '12px' }}>
            <span className="collage-status-layout">{selectedLayout.label}</span>
            <span className="collage-status-count">이미지 {filledCount}/{activeCollage.cells.length}장</span>
            {hasEmpty && (
              <span className="collage-status-empty">빈칸 {emptyCount}</span>
            )}
          </div>

          <div className="collage-selection-info" style={{ padding: '10px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
              선택된 셀: {selectedCollageCellIndex + 1}번
            </div>
            <div style={{ marginBottom: '10px' }}>
              <div className="collage-slider-header" style={{ marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Cell clip</span>
                <span className="range-value" style={{ fontSize: '12px' }}>{selectedClipType}</span>
              </div>
              <div className="segmented-control" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                {CELL_CLIP_OPTIONS.map((option) => (
                  <button
                    data-selected={selectedClipType === option.value}
                    key={option.value}
                    onClick={() => editor.updateCollageCellClip(selectedCollageCellIndex, option.value)}
                    style={{ fontSize: '10.5px', minHeight: '30px' }}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {activeCollage.cells[selectedCollageCellIndex]?.layerId ? (
              cropRepositionMode ? (
                <>
                  <label style={{ display: 'block', marginBottom: '12px' }}>
                    <div className="collage-slider-header" style={{ marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>확대/축소</span>
                      <span className="range-value" style={{ fontSize: '12px' }}>{Math.round((cropZoom / cropMinZoom) * 100)}%</span>
                    </div>
                    <input
                      max={cropMaxZoom}
                      min={cropMinZoom}
                      onChange={(e) => updateCropZoom(Number(e.target.value))}
                      step={(cropMaxZoom - cropMinZoom) / 100 || 0.01}
                      style={{ width: '100%' }}
                      type="range"
                      value={cropZoom}
                    />
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="wide-command"
                      onClick={() => finishCropReposition()}
                      style={{ background: 'var(--accent)', color: 'white', border: 'none' }}
                      type="button"
                    >
                      조정 완료
                    </button>
                    <button
                      className="wide-command"
                      onClick={() => resetCropFocus()}
                      style={{ background: 'var(--surface-strong)', color: 'var(--ink)', border: '1px solid var(--line)' }}
                      type="button"
                    >
                      중앙 리셋
                    </button>
                    <button
                      className="wide-command"
                      onClick={() => editor.removeSelectedCollageSlotImage()}
                      style={{ background: 'var(--danger-soft)', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className="wide-command"
                  onClick={() => beginCropReposition()}
                  type="button"
                >
                  크롭 위치 조정
                </button>
              )
            ) : (
              <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                이미지가 없어 조정할 수 없습니다.
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. [접힘] 레이아웃 템플릿 */}
      <section className="panel-section">
        <button
          className="section-toggle-button"
          onClick={() => setTemplatesExpanded(v => !v)}
          type="button"
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div className="section-title" style={{ margin: 0 }}>레이아웃 템플릿</div>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {templatesExpanded ? '접기 ▲' : '펼치기 ▼'}
          </span>
        </button>
        
        {templatesExpanded && (
          <div style={{ marginTop: '12px' }}>
            {/* 카테고리 탭 */}
            <div className="segmented-control" style={{ marginBottom: '8px', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
              <button
                data-selected={activeCategory === 'all'}
                onClick={() => setActiveCategory('all')}
                type="button"
                style={{ fontSize: '10.5px', minHeight: '32px' }}
              >
                전체
              </button>
              <button
                data-selected={activeCategory === 'basic'}
                onClick={() => setActiveCategory('basic')}
                type="button"
                style={{ fontSize: '10.5px', minHeight: '32px' }}
              >
                기본
              </button>
              <button
                data-selected={activeCategory === 'grid'}
                onClick={() => setActiveCategory('grid')}
                type="button"
                style={{ fontSize: '10.5px', minHeight: '32px' }}
              >
                그리드
              </button>
              <button
                data-selected={activeCategory === 'asymmetric'}
                onClick={() => setActiveCategory('asymmetric')}
                type="button"
                style={{ fontSize: '10.5px', minHeight: '32px' }}
              >
                비정형
              </button>
            </div>

            {/* 템플릿 목록 내부 스크롤 */}
            <div className="collage-layout-scroll-container">
              <div className="collage-layout-grid">
                {filteredLayouts.map((layout) => (
                  <button
                    className="collage-layout-button"
                    data-selected={selectedLayout.id === layout.id}
                    key={layout.id}
                    onClick={() => handleLayoutSelect(layout)}
                    title={layout.label}
                    type="button"
                  >
                    <LayoutPreview layout={layout} size={40} />
                    <span className="collage-layout-label">{layout.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 5. [접힘] 커스텀 그리드 */}
      <section className="panel-section text-effect-card">
        <button
          className="section-toggle-button"
          onClick={() => setCustomExpanded(v => !v)}
          type="button"
          style={{
            display: 'flex',
            width: '100%',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div className="section-title" style={{ margin: 0 }}>커스텀 그리드</div>
          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
            {customExpanded ? '접기 ▲' : '펼치기 ▼'}
          </span>
        </button>

        {customExpanded && (
          <div style={{ marginTop: '12px' }}>
            <p className="collage-layout-hint" style={{ marginBottom: '12px' }}>
              행과 열을 직접 설정하여 원하는 규격의 그리드 콜라주를 만들 수 있습니다.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
              {/* 조작 패널 */}
              <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>행 (Rows)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="secondary-button"
                      onClick={decrementRows}
                      style={{ minWidth: '36px', height: '36px', minHeight: '36px', padding: 0 }}
                      type="button"
                    >
                      -
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{customRows}</span>
                    <button
                      className="secondary-button"
                      onClick={incrementRows}
                      style={{ minWidth: '36px', height: '36px', minHeight: '36px', padding: 0 }}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>열 (Columns)</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="secondary-button"
                      onClick={decrementCols}
                      style={{ minWidth: '36px', height: '36px', minHeight: '36px', padding: 0 }}
                      type="button"
                    >
                      -
                    </button>
                    <span style={{ fontSize: '14px', fontWeight: 600, minWidth: '20px', textAlign: 'center' }}>{customCols}</span>
                    <button
                      className="secondary-button"
                      onClick={incrementCols}
                      style={{ minWidth: '36px', height: '36px', minHeight: '36px', padding: 0 }}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* 미리보기 영역 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '90px',
                height: '90px',
                background: 'var(--panel-bg)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '8px',
                color: 'var(--accent)'
              }}>
                <LayoutPreview layout={{
                  id: 'temp',
                  label: 'temp',
                  cells: createGridLayout(customCols, customRows)
                }} size={74} />
              </div>
            </div>

            <button
              className="wide-command"
              onClick={() => {
                const customLayout = {
                  id: `custom-${customCols}-${customRows}`,
                  label: `${customCols}×${customRows}`,
                  cells: createGridLayout(customCols, customRows)
                };
                setSelectedLayout(customLayout);
                if (activeCollage) {
                  editor.changeCollageLayout(customLayout);
                } else {
                  fileInputRef.current?.click();
                }
              }}
              style={{ marginTop: '12px' }}
              type="button"
            >
              이 레이아웃 적용
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
