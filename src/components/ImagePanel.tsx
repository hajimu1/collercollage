import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Crop, ImagePlus, Slash, Upload, Move, FlipHorizontal, FlipVertical, RefreshCw, Palette, Eraser } from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import type { ClipSpec, ImageFilters, ImageLayerItem, OverlayLayerItem } from '../types/layers';
import type { BuiltInAsset } from '../utils/assetRegistry';
import { loadBuiltInAssets } from '../utils/assetRegistry';
import { CLIP_SHAPE_REGISTRY } from '../utils/clipRegistry';
import { readClipboardImageFile } from '../utils/clipboardImage';
import { DEFAULT_IMAGE_FILTERS, ImageAssetsSection, ImageFilterSection } from './ImagePanelSections';

interface ImagePanelProps {
  editor: FabricEditorController;
  activeTab?: 'edit' | 'clip' | 'assets';
  setActiveTab?: (tab: 'edit' | 'clip' | 'assets') => void;
}

// Module-level variable to persist the local tab state across remounts if props are omitted
let persistedImagePanelTab: 'edit' | 'clip' | 'assets' = 'edit';

export function ImagePanel({ editor, activeTab: propsActiveTab, setActiveTab: propsSetActiveTab }: ImagePanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const overlayFileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement | null>(null);
  const selectedImage: ImageLayerItem | null = editor.selection?.type === 'image' ? editor.selection : null;
  const selectedOverlay: OverlayLayerItem | null = editor.selection?.type === 'overlay' ? editor.selection : null;
  const selectedImageOrOverlay = selectedImage ?? selectedOverlay;
  const strokeColor = selectedImage?.stroke?.color ?? '#101820';
  const strokeWidth = selectedImage?.stroke?.width ?? 0;
  const clip = selectedImage?.clip ?? { type: 'none', radius: 48 };
  const opacityPct = Math.round((selectedImageOrOverlay?.opacity ?? 1) * 100);
  const scalePct = selectedImageOrOverlay ? Math.round((selectedImageOrOverlay.scaleX ?? 1) * 100) : 100;

  // Set default tab based on the active clip type when selectedImage changes
  const [activeCategory, setActiveCategory] = useState<'basic' | 'soft' | 'decorative'>('basic');
  const [localActiveTab, setLocalActiveTab] = useState<'edit' | 'clip' | 'assets'>(persistedImagePanelTab);
  
  const activeTab = propsActiveTab ?? localActiveTab;
  const setActiveTab = (tab: 'edit' | 'clip' | 'assets') => {
    persistedImagePanelTab = tab;
    if (propsSetActiveTab) {
      propsSetActiveTab(tab);
    } else {
      setLocalActiveTab(tab);
    }
  };
  const [builtInAssets, setBuiltInAssets] = useState<BuiltInAsset[]>([]);
  const [assetLoadError, setAssetLoadError] = useState<string | null>(null);
  const [overlayAssetType, setOverlayAssetType] = useState('all');
  const [stickerAssetType, setStickerAssetType] = useState('all');
  const [frameAssetType, setFrameAssetType] = useState('all');
  const lastSelectedImageIdRef = useRef<string | null>(null);
  const currentImageId = selectedImage?.id ?? null;

  useEffect(() => {
    let mounted = true;
    loadBuiltInAssets()
      .then((assets) => {
        if (!mounted) return;
        setBuiltInAssets(assets);
        setAssetLoadError(null);
      })
      .catch(() => {
        if (mounted) setAssetLoadError('Built-in assets could not be loaded.');
      });
    return () => {
      mounted = false;
    };
  }, []);

  const overlayAssets = useMemo(
    () => builtInAssets.filter((asset) => asset.category === 'overlays'),
    [builtInAssets],
  );
  const stickerAssets = useMemo(
    () => builtInAssets.filter((asset) => asset.category === 'stickers' || asset.category === 'ui-overlays'),
    [builtInAssets],
  );
  const frameAssets = useMemo(
    () => builtInAssets.filter((asset) => asset.category === 'frames'),
    [builtInAssets],
  );
  const overlayTypes = useMemo(
    () => ['all', ...Array.from(new Set(overlayAssets.map((asset) => asset.type))).sort()],
    [overlayAssets],
  );
  const stickerTypes = useMemo(
    () => ['all', ...Array.from(new Set(stickerAssets.map((asset) => `${asset.category}/${asset.type}`))).sort()],
    [stickerAssets],
  );
  const frameTypes = useMemo(
    () => ['all', ...Array.from(new Set(frameAssets.map((asset) => asset.type))).sort()],
    [frameAssets],
  );
  const visibleOverlayAssets = useMemo(
    () => overlayAssets.filter((asset) => overlayAssetType === 'all' || asset.type === overlayAssetType).slice(0, 48),
    [overlayAssets, overlayAssetType],
  );
  const visibleStickerAssets = useMemo(
    () => stickerAssets.filter((asset) => stickerAssetType === 'all' || `${asset.category}/${asset.type}` === stickerAssetType).slice(0, 48),
    [stickerAssets, stickerAssetType],
  );
  const visibleFrameAssets = useMemo(
    () => frameAssets.filter((asset) => frameAssetType === 'all' || asset.type === frameAssetType).slice(0, 100),
    [frameAssets, frameAssetType],
  );

  if (currentImageId !== lastSelectedImageIdRef.current) {
    lastSelectedImageIdRef.current = currentImageId;
    if (selectedImage) {
      const activeClipType = selectedImage.clip?.type ?? 'none';
      if (activeClipType !== 'none') {
        const found = CLIP_SHAPE_REGISTRY.find(s => s.id === activeClipType);
        if (found) {
          setActiveCategory(found.category);
        }
      }
    }
  }

  const handleReplaceFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await editor.replaceSelectedImage(file);
    }
    event.target.value = '';
  };

  const updateFilter = (patch: Partial<ImageFilters>) => {
    if (!selectedImage) return;
    const currentFilters = selectedImage.filters ?? {};
    editor.updateSelectedImageFilters({
      ...currentFilters,
      ...patch,
    });
  };

  const resetFilters = () => {
    editor.updateSelectedImageFilters({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0,
      grayscale: false,
      sepia: false,
    });
  };

  if (editor.maskEditMode) {
    return (
      <div className="panel-stack">
        <section className="panel-section">
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Eraser size={18} />
            Eraser Mask Brush
          </div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px', lineHeight: '1.4' }}>
            Use the brush to erase or restore unwanted areas of the image. (Non-destructive edit)
          </p>

          {/* Draw Mode Selector (Brush vs Rectangle vs Circle) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Drawing Tool</span>
            <div className="segmented-control" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <button
                data-selected={editor.maskDrawTool === 'brush'}
                onClick={() => editor.setMaskDrawTool('brush')}
                type="button"
                style={{ minHeight: '32px', fontSize: '11.5px', padding: '0 4px' }}
              >
                Brush
              </button>
              <button
                data-selected={editor.maskDrawTool === 'rectangle'}
                onClick={() => editor.setMaskDrawTool('rectangle')}
                type="button"
                style={{ minHeight: '32px', fontSize: '11.5px', padding: '0 4px' }}
              >
                Rectangle
              </button>
              <button
                data-selected={editor.maskDrawTool === 'circle'}
                onClick={() => editor.setMaskDrawTool('circle')}
                type="button"
                style={{ minHeight: '32px', fontSize: '11.5px', padding: '0 4px' }}
              >
                Circle
              </button>
            </div>
          </div>

          {/* Brush Tool Selector (Segmented control) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Operation Mode</span>
            <div className="segmented-control" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <button
                data-selected={editor.maskBrushTool === 'erase'}
                onClick={() => editor.setMaskBrushTool('erase')}
                type="button"
                style={{ minHeight: '34px', fontSize: '12px' }}
              >
                Erase
              </button>
              <button
                data-selected={editor.maskBrushTool === 'restore'}
                onClick={() => editor.setMaskBrushTool('restore')}
                type="button"
                style={{ minHeight: '34px', fontSize: '12px' }}
              >
                Restore
              </button>
            </div>
          </div>

          {/* Brush Size Slider (only shown for brush tool) */}
          {editor.maskDrawTool === 'brush' && (
            <label style={{ display: 'block', marginBottom: '20px' }}>
              <div className="collage-slider-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)' }}>Brush Size</span>
                <span className="range-value" style={{ fontSize: '12px', fontWeight: 600 }}>
                  {editor.maskBrushSize}px
                </span>
              </div>
              <input
                max={150}
                min={5}
                onChange={(e) => editor.setMaskBrushSize(Number(e.target.value))}
                step={1}
                style={{ width: '100%' }}
                type="range"
                value={editor.maskBrushSize}
              />
            </label>
          )}

          {/* Rectangle Mode Guide */}
          {editor.maskDrawTool === 'rectangle' && (
            <p style={{ fontSize: '11px', color: 'var(--muted-light)', marginBottom: '20px', fontStyle: 'italic', lineHeight: '1.4' }}>
              Draw a rectangle on the canvas to {editor.maskBrushTool === 'erase' ? 'erase' : 'restore'} the mask.
            </p>
          )}

          {/* Circle Mode Guide */}
          {editor.maskDrawTool === 'circle' && (
            <p style={{ fontSize: '11px', color: 'var(--muted-light)', marginBottom: '20px', fontStyle: 'italic', lineHeight: '1.4' }}>
              Draw a circle on the canvas to {editor.maskBrushTool === 'erase' ? 'erase' : 'restore'} the mask.
            </p>
          )}

          {/* Done button */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="wide-command"
              onClick={() => editor.finishMaskEdit()}
              style={{ background: 'var(--accent)', color: 'white', border: 'none', flex: 1 }}
              type="button"
            >
              Done
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (editor.cropRepositionMode && selectedImage) {
    return (
      <div className="panel-stack">
        <section className="panel-section">
          <div className="section-title">Edit Inside</div>
          <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', lineHeight: '1.4' }}>
            Drag on the canvas to translate, scale, and rotate the image inside the frame.
          </p>
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <div className="collage-slider-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)' }}>Zoom</span>
              <span className="range-value" style={{ fontSize: '12px', fontWeight: 600 }}>
                {Math.round((editor.cropZoom / editor.cropMinZoom) * 100)}%
              </span>
            </div>
            <input
              max={editor.cropMaxZoom}
              min={editor.cropMinZoom}
              onChange={(e) => editor.updateCropZoom(Number(e.target.value))}
              step={(editor.cropMaxZoom - editor.cropMinZoom) / 100 || 0.01}
              style={{ width: '100%' }}
              type="range"
              value={editor.cropZoom}
            />
          </label>
          <label style={{ display: 'block', marginBottom: '16px' }}>
            <div className="collage-slider-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--muted)' }}>Rotation</span>
              <span className="range-value" style={{ fontSize: '12px', fontWeight: 600 }}>
                {Math.round(editor.cropAngle ?? 0)}째
              </span>
            </div>
            <input
              max={180}
              min={-180}
              onChange={(e) => editor.updateCropAngle(Number(e.target.value))}
              step={1}
              style={{ width: '100%' }}
              type="range"
              value={editor.cropAngle ?? 0}
            />
          </label>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }}>
            <button
              className="secondary-button"
              onClick={() => editor.fitImageToFrame('fit')}
              type="button"
              style={{ fontSize: '11px', padding: '6px' }}
            >
              Fit
            </button>
            <button
              className="secondary-button"
              onClick={() => editor.fitImageToFrame('cover')}
              type="button"
              style={{ fontSize: '11px', padding: '6px' }}
            >
              Fill
            </button>
            <button
              className="secondary-button"
              onClick={() => editor.fitImageToFrame('reset')}
              type="button"
              style={{ fontSize: '11px', padding: '6px' }}
            >
              Reset
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="wide-command"
              onClick={() => editor.finishCropReposition()}
              style={{ background: 'var(--accent)', color: 'white', border: 'none', flex: 1 }}
              type="button"
            >
              Done
            </button>
          </div>
        </section>
      </div>
    );
  }

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    for (const file of files) {
      await editor.addImageFromFile(file);
    }
    event.target.value = '';
  };

  const handlePasteImage = async () => {
    try {
      const file = await readClipboardImageFile();
      if (file) {
        await editor.addImageFromFile(file);
        return;
      }
    } catch {
      // Fall back to the existing file picker when clipboard image access is unavailable.
    }

    fileInputRef.current?.click();
  };

  const handleOverlayFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    for (const file of files) {
      await editor.addOverlayFromFile(file);
    }
    event.target.value = '';
  };

  const updateClip = (patch: Partial<ClipSpec>) => {
    editor.updateSelectedImageClip({
      ...clip,
      ...patch,
    });
  };

  const basicShapes = [
    { id: 'none', label: 'None', category: 'basic' } as const,
    ...CLIP_SHAPE_REGISTRY.filter(s => s.category === 'basic'),
  ];
  const softShapes = CLIP_SHAPE_REGISTRY.filter(s => s.category === 'soft');
  const decorativeShapes = CLIP_SHAPE_REGISTRY.filter(s => s.category === 'decorative');

  const activeShapes = {
    basic: basicShapes,
    soft: softShapes,
    decorative: decorativeShapes,
  }[activeCategory];
  return (
    <div className="panel-stack">
      <div className="segmented-control" style={{ marginBottom: '12px', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <button
          data-selected={activeTab === 'edit'}
          onClick={() => setActiveTab('edit')}
          type="button"
          style={{ minHeight: '34px', fontSize: '11.5px' }}
        >
          Edit
        </button>
        <button
          data-selected={activeTab === 'clip'}
          onClick={() => setActiveTab('clip')}
          type="button"
          style={{ minHeight: '34px', fontSize: '11.5px' }}
        >
          Clip & Border
        </button>
        <button
          data-selected={activeTab === 'assets'}
          onClick={() => setActiveTab('assets')}
          type="button"
          style={{ minHeight: '34px', fontSize: '11.5px' }}
        >
          Assets
        </button>
      </div>

      {/* 1. Edit */}
      {activeTab === 'edit' && (
        <>
          <section className="panel-section">
            <div className="image-import-actions">
              <button className="wide-command" onClick={() => fileInputRef.current?.click()} type="button">
                <ImagePlus size={20} aria-hidden="true" />
                Upload Image
              </button>
              <button className="wide-command" onClick={() => void handlePasteImage()} type="button">
                <ClipboardPaste size={20} aria-hidden="true" />
                Paste Image
              </button>
            </div>
            <input
              accept="image/*"
              hidden
              multiple
              onChange={(event) => void handleFiles(event)}
              ref={fileInputRef}
              type="file"
            />
          </section>

          <section className="panel-section">
            <div className="adjustment-button-grid">
              <button className="secondary-button" onClick={() => editor.addAdjustmentLayer('solid-color')} type="button">
                <Palette size={18} aria-hidden="true" />
                Solid
              </button>
              <button className="secondary-button" onClick={() => editor.addAdjustmentLayer('gradient', 'linear')} type="button">
                <Palette size={18} aria-hidden="true" />
                Linear
              </button>
              <button className="secondary-button" onClick={() => editor.addAdjustmentLayer('gradient', 'radial')} type="button">
                <Palette size={18} aria-hidden="true" />
                Radial
              </button>
            </div>
          </section>

          <section className="panel-section">
            <div className="section-title">Image Edit</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                className="secondary-button"
                disabled={!selectedImage}
                onClick={editor.beginCropMode}
                style={{ flex: 1 }}
                type="button"
              >
                <Crop size={18} aria-hidden="true" />
                Crop
              </button>
              <button
                className="secondary-button"
                disabled={!selectedImage}
                onClick={() => editor.beginCropReposition()}
                style={{ flex: 1 }}
                type="button"
              >
                <Move size={18} aria-hidden="true" />
                Edit Inside
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                id="btn-toggle-mask-mode"
                className="secondary-button"
                disabled={!selectedImage}
                onClick={() => editor.beginMaskEdit()}
                style={{ flex: 1 }}
                type="button"
              >
                <Eraser size={18} aria-hidden="true" />
                Eraser Mask
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                className="secondary-button"
                disabled={!selectedImage}
                onClick={() => editor.flipSelectedImage('horizontal')}
                style={{ flex: 1 }}
                type="button"
              >
                <FlipHorizontal size={18} aria-hidden="true" />
                Flip Horizontal
              </button>
              <button
                className="secondary-button"
                disabled={!selectedImage}
                onClick={() => editor.flipSelectedImage('vertical')}
                style={{ flex: 1 }}
                type="button"
              >
                <FlipVertical size={18} aria-hidden="true" />
                Flip Vertical
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                className="secondary-button"
                disabled={!selectedImage}
                onClick={() => replaceFileInputRef.current?.click()}
                style={{ flex: 1 }}
                type="button"
              >
                <RefreshCw size={18} aria-hidden="true" />
                Replace Image
              </button>
              <button
                className="secondary-button"
                disabled={!selectedImage}
                onClick={() => editor.createBackgroundBlur()}
                style={{ flex: 1 }}
                type="button"
              >
                <Palette size={18} aria-hidden="true" />
                Background Blur
              </button>
              <input
                accept="image/*"
                hidden
                onChange={(event) => void handleReplaceFile(event)}
                ref={replaceFileInputRef}
                type="file"
              />
            </div>

            <label>
              Opacity
              <span className="range-value">{opacityPct}%</span>
              <input
                disabled={!selectedImageOrOverlay}
                max={100}
                min={0}
                onChange={(e) => editor.updateSelectedOpacity(Number(e.target.value) / 100)}
                type="range"
                value={opacityPct}
              />
            </label>
            <label>
              Scale
              <span className="range-value">{scalePct}%</span>
              <input
                disabled={!selectedImageOrOverlay}
                max={400}
                min={5}
                onChange={(e) => editor.updateSelectedScale(Number(e.target.value) / 100)}
                type="range"
                value={scalePct}
              />
            </label>
          </section>

          <ImageFilterSection
            selectedImage={selectedImage}
            updateFilter={updateFilter}
            resetFilters={resetFilters}
            updateShadow={editor.updateSelectedImageShadow}
            updateStroke={editor.updateSelectedImageStroke}
          />
        </>
      )}

      {/* 2. Clip & Border??*/}
      {activeTab === 'clip' && (
        <>
          <section className="panel-section">
            <div className="section-title">Clip</div>
            
            <div className="segmented-control" style={{ marginBottom: '4px' }}>
              <button
                data-selected={activeCategory === 'basic'}
                onClick={() => setActiveCategory('basic')}
                type="button"
              >
                Basic
              </button>
              <button
                data-selected={activeCategory === 'soft'}
                onClick={() => setActiveCategory('soft')}
                type="button"
              >
                Soft
              </button>
              <button
                data-selected={activeCategory === 'decorative'}
                onClick={() => setActiveCategory('decorative')}
                type="button"
              >
                Decorative
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {activeShapes.map((shape) => {
                const isSelected = clip.type === shape.id;
                return (
                  <button
                    className="shape-button"
                    data-selected={isSelected}
                    disabled={!selectedImage}
                    key={shape.id}
                    onClick={() => updateClip({ type: shape.id as any })}
                    style={{ fontSize: '11px', minHeight: '62px', padding: '6px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                    type="button"
                  >
                    {shape.id === 'none' ? (
                      <svg
                        width="24"
                        height="24"
                        viewBox="-16 -16 32 32"
                        stroke={isSelected ? 'var(--accent)' : 'var(--muted-light)'}
                        strokeWidth="2.2"
                        fill="none"
                        style={{ display: 'block', margin: '0 auto' }}
                      >
                        <circle cx="0" cy="0" r="10" />
                        <line x1="-7" y1="7" x2="7" y2="-7" />
                      </svg>
                    ) : (
                      <svg
                        width="24"
                        height="24"
                        viewBox="-16 -16 32 32"
                        style={{
                          display: 'block',
                          margin: '0 auto',
                        }}
                      >
                        <path
                          d={(shape as any).getPath(28, 28)}
                          fill={isSelected ? 'var(--accent)' : 'var(--muted-light)'}
                          stroke="none"
                        />
                      </svg>
                    )}
                    <span style={{ marginTop: '4px', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', width: '100%', textAlign: 'center' }}>
                      {shape.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {clip.type === 'roundRect' && (
              <label style={{ marginTop: '8px' }}>
                radius
                <span className="range-value">{clip.radius ?? 48}px</span>
                <input
                  disabled={!selectedImage}
                  max={240}
                  min={0}
                  onChange={(event) => updateClip({ radius: Number(event.target.value) })}
                  type="range"
                  value={clip.radius ?? 48}
                />
              </label>
            )}

            {selectedImage && (
              <label style={{ marginTop: '8px', display: 'block' }}>
                Feather
                <span className="range-value">{selectedImage.crop?.feather ?? 0}px</span>
                <input
                  disabled={!selectedImage}
                  max={100}
                  min={0}
                  onChange={(event) => {
                    editor.updateSelectedImageCrop({
                      ...(selectedImage.crop ?? { enabled: false, offsetX: 0, offsetY: 0, scale: 1 }),
                      feather: Number(event.target.value),
                    });
                  }}
                  type="range"
                  value={selectedImage.crop?.feather ?? 0}
                />
              </label>
            )}
          </section>

          <section className="panel-section">
            <div className="section-title">Image Border</div>
            <div className="control-grid">
              <label className="color-input-line">
                Color
                <input
                  disabled={!selectedImage}
                  onChange={(event) => editor.updateSelectedImageStroke(event.target.value, strokeWidth)}
                  type="color"
                  value={strokeColor}
                />
              </label>
              <label style={{ marginTop: '12px', display: 'block' }}>
                Width
                <span className="range-value">{strokeWidth}px</span>
                <input
                  disabled={!selectedImage}
                  max={80}
                  min={0}
                  onChange={(event) => editor.updateSelectedImageStroke(strokeColor, Number(event.target.value))}
                  type="range"
                  value={strokeWidth}
                />
              </label>
            </div>
            <button
              className="secondary-button"
              disabled={!selectedImage}
              onClick={() => editor.updateSelectedImageStroke(strokeColor, 0)}
              type="button"
              style={{ width: '100%', marginTop: '12px' }}
            >
              <Slash size={18} aria-hidden="true" />
              ??None 0px
            </button>
            {!selectedImage && (
              <div className="empty-hint" style={{ marginTop: '12px' }}>
                <ImagePlus size={18} aria-hidden="true" />
                Select an image layer
              </div>
            )}
          </section>
        </>
      )}

      {/* 3. Assets ??*/}
      {activeTab === 'assets' && (
        <ImageAssetsSection
          editor={editor}
          overlayAssets={overlayAssets}
          stickerAssets={stickerAssets}
          frameAssets={frameAssets}
          overlayTypes={overlayTypes}
          stickerTypes={stickerTypes}
          frameTypes={frameTypes}
          overlayAssetType={overlayAssetType}
          stickerAssetType={stickerAssetType}
          frameAssetType={frameAssetType}
          setOverlayAssetType={setOverlayAssetType}
          setStickerAssetType={setStickerAssetType}
          setFrameAssetType={setFrameAssetType}
          visibleOverlayAssets={visibleOverlayAssets}
          visibleStickerAssets={visibleStickerAssets}
          visibleFrameAssets={visibleFrameAssets}
          assetLoadError={assetLoadError}
        />
      )}
    </div>
  );
}



