import { useState } from 'react';
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Link2, Link2Off, Lock, Plus, Trash2, Unlock } from 'lucide-react';
import { BACKGROUND_LAYER_ID } from '../constants/canvas';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import type { BlendMode, LayerItem } from '../types/layers';

interface LayerPanelProps {
  editor: FabricEditorController;
}

const layerTypeLabel: Partial<Record<LayerItem['type'], string>> = {
  background: 'Background',
  image: 'Image',
  text: 'Text',
  shape: 'Shape',
  overlay: 'Overlay',
  adjustment: 'Adjustment',
  group: 'Group',
};

const BLEND_MODE_OPTIONS: Array<{ value: BlendMode; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'difference', label: 'Difference' },
  { value: 'exclusion', label: 'Exclusion' },
];

export function LayerPanel({ editor }: LayerPanelProps) {
  const displayLayers = [...editor.layers].sort((a, b) => b.zIndex - a.zIndex);
  const selectedLayerIds = editor.selectedLayerIds ?? [];
  const hasMultiSelection = selectedLayerIds.length > 1;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const startEditing = (layerId: string, name: string) => {
    setEditingLayerId(layerId);
    setEditingName(name);
  };

  const finishEditing = (layerId: string) => {
    if (editingName.trim()) editor.renameLayer(layerId, editingName.trim());
    setEditingLayerId(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent, layerId: string) => {
    if (event.key === 'Enter') finishEditing(layerId);
    if (event.key === 'Escape') setEditingLayerId(null);
  };

  const handleDragStart = (event: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDrop = (event: React.DragEvent, targetIndex: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const layerToMove = displayLayers[draggedIndex];
    editor.reorderLayer(layerToMove.id, targetIndex);
    setDraggedIndex(null);
  };

  return (
    <div className="layer-list">
      {hasMultiSelection && (
        <div className="layer-batch-actions">
          <span>{selectedLayerIds.length} selected</span>
          <button type="button" onClick={() => editor.updateLayerVisibility('multi', true)} title="Show selected layers"><Eye size={16} /></button>
          <button type="button" onClick={() => editor.updateLayerVisibility('multi', false)} title="Hide selected layers"><EyeOff size={16} /></button>
          <button type="button" onClick={() => editor.updateLayerLock('multi', true)} title="Lock selected layers"><Lock size={16} /></button>
          <button type="button" onClick={() => editor.updateLayerLock('multi', false)} title="Unlock selected layers"><Unlock size={16} /></button>
          <button type="button" onClick={editor.deleteSelected} title="Delete selected layers"><Trash2 size={16} /></button>
        </div>
      )}

      {displayLayers.map((layer, index) => {
        const isBackground = layer.id === BACKGROUND_LAYER_ID;
        const selected = selectedLayerIds.includes(layer.id) || editor.selectedLayerId === layer.id;
        return (
          <article
            className="layer-row"
            data-selected={selected}
            data-dragging={draggedIndex === index}
            draggable={!isBackground && activeDragId === layer.id}
            key={layer.id}
            onClick={(event) => {
              editor.selectLayer(layer.id, event.ctrlKey || event.metaKey);
              if (layer.type !== 'image' || !editor.maskEditMode) {
                editor.finishMaskEdit();
              }
            }}
            onDragEnd={() => setDraggedIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={(event) => handleDragStart(event, index)}
            onDrop={(event) => handleDrop(event, index)}
            style={layer.groupId ? { paddingLeft: '28px' } : undefined}
          >
            {!isBackground && (
              <div className="layer-drag-handle" onMouseEnter={() => setActiveDragId(layer.id)} onMouseLeave={() => setActiveDragId(null)} title="Drag to reorder">
                <GripVertical size={16} />
              </div>
            )}
            
            <div className={`layer-main ${isBackground ? 'is-background' : ''}`}>
              {/* Photoshop style thumbnails for Image layers */}
              {layer.type === 'image' && (
                <div className="layer-row-thumbnails">
                  {/* Image Thumbnail */}
                  <div
                    className={`layer-thumbnail-wrapper ${selected && !editor.maskEditMode ? 'active-thumbnail' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.selectLayer(layer.id);
                      editor.finishMaskEdit();
                    }}
                    title="Select Image Content"
                  >
                    {layer.src ? (
                      <img className="layer-thumbnail-img" src={layer.src} alt="" />
                    ) : (
                      <div className="layer-thumbnail-placeholder">Img</div>
                    )}
                  </div>

                  {/* Link Chain Button (only if mask exists) */}
                  {layer.maskDataUrl && (
                    <button
                      className="layer-link-chain-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        editor.toggleMaskLink(layer.id);
                      }}
                      title={layer.maskLinked !== false ? 'Unlink layer mask' : 'Link layer mask'}
                      type="button"
                    >
                      {layer.maskLinked !== false ? <Link2 size={14} /> : <Link2Off size={14} />}
                    </button>
                  )}

                  {/* Mask Thumbnail */}
                  <div
                    className={`layer-thumbnail-wrapper layer-mask-thumbnail ${layer.maskDataUrl ? 'has-mask' : ''} ${selected && editor.maskEditMode && layer.maskDataUrl ? 'active-thumbnail' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      editor.selectLayer(layer.id);
                      void editor.beginMaskEdit();
                    }}
                    title={layer.maskDataUrl ? 'Select Layer Mask (Brush Edit)' : 'Add Layer Mask'}
                  >
                    {layer.maskDataUrl ? (
                      <img className="layer-thumbnail-img" src={layer.maskDataUrl} alt="Mask" />
                    ) : (
                      <button className="layer-mask-add-btn" type="button">
                        <Plus size={10} />
                        <span>Mask</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="layer-info">
                <span className="layer-type">{layerTypeLabel[layer.type] ?? layer.type}</span>
                {editingLayerId === layer.id ? (
                  <input
                    autoFocus
                    className="layer-name-input"
                    onBlur={() => finishEditing(layer.id)}
                    onChange={(event) => setEditingName(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => handleKeyDown(event, layer.id)}
                    type="text"
                    value={editingName}
                  />
                ) : (
                  <span
                    className="layer-name"
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (!isBackground) startEditing(layer.id, layer.name);
                    }}
                    title={isBackground ? undefined : 'Double-click to rename; drag handle to reorder'}
                  >
                    {layer.groupId && <span className="layer-indent-char" style={{ color: 'var(--muted-light)', marginRight: '6px', fontSize: '12px' }}>└─</span>}
                    {layer.type === 'image' && !(layer as any).collageCell ? `Frame [${layer.name}]` : layer.name}
                  </span>
                )}
              </div>
            </div>
            <div className="layer-actions">
              <button aria-label={layer.visible ? 'Hide' : 'Show'} onClick={(event) => { event.stopPropagation(); editor.updateLayerVisibility(layer.id, !layer.visible); }} type="button">
                {layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button aria-label={layer.locked ? 'Unlock' : 'Lock'} onClick={(event) => { event.stopPropagation(); editor.updateLayerLock(layer.id, !layer.locked); }} type="button">
                {layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
              </button>
              <button aria-label="Duplicate" disabled={isBackground} onClick={(event) => { event.stopPropagation(); void editor.duplicateLayer(layer.id); }} type="button" title="Duplicate Layer">
                <Copy size={16} />
              </button>
              <button aria-label="Move up" disabled={isBackground} onClick={(event) => { event.stopPropagation(); editor.moveLayer(layer.id, 'up'); }} type="button">
                <ArrowUp size={16} />
              </button>
              <button aria-label="Move down" disabled={isBackground} onClick={(event) => { event.stopPropagation(); editor.moveLayer(layer.id, 'down'); }} type="button">
                <ArrowDown size={16} />
              </button>
              <button aria-label="Delete" disabled={isBackground} onClick={(event) => { event.stopPropagation(); editor.deleteLayer(layer.id); }} type="button">
                <Trash2 size={16} />
              </button>
            </div>
            {selected && !isBackground && (
              <div className="layer-inline-controls" onClick={(event) => event.stopPropagation()} onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
                <label>
                  Blend
                  <select onChange={(event) => editor.updateLayerBlendMode(layer.id, event.target.value as BlendMode)} value={layer.blendMode ?? 'normal'}>
                    {BLEND_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  Opacity
                  <span className="range-value">{Math.round((layer.opacity ?? 1) * 100)}%</span>
                  <input max={100} min={0} onChange={(event) => editor.updateLayerOpacity(layer.id, Number(event.target.value) / 100)} type="range" value={Math.round((layer.opacity ?? 1) * 100)} />
                </label>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
