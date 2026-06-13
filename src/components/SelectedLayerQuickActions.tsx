import { ArrowDown, ArrowUp, Copy, Crop, Lock, Trash2 } from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';

interface SelectedLayerQuickActionsProps {
  editor: FabricEditorController;
  variant?: 'sidebar' | 'sheet';
}

export function SelectedLayerQuickActions({ editor, variant = 'sidebar' }: SelectedLayerQuickActionsProps) {
  if (!editor.selection || editor.cropMode) return null;

  return (
    <div className={`selected-layer-quick-actions selected-layer-quick-actions--${variant}`}>
      {editor.selection.type === 'image' && (
        <button className="sidebar-quick-btn" onClick={editor.beginCropMode} title="Crop" type="button">
          <Crop size={14} aria-hidden="true" />
          <span>Crop</span>
        </button>
      )}
      <button className="sidebar-quick-btn" onClick={() => void editor.duplicateSelected()} title="Duplicate" type="button">
        <Copy size={14} aria-hidden="true" />
        <span>Duplicate</span>
      </button>
      <button className="sidebar-quick-btn" onClick={() => editor.moveLayer(editor.selection!.id, 'up')} title="Move up" type="button">
        <ArrowUp size={14} aria-hidden="true" />
      </button>
      <button className="sidebar-quick-btn" onClick={() => editor.moveLayer(editor.selection!.id, 'down')} title="Move down" type="button">
        <ArrowDown size={14} aria-hidden="true" />
      </button>
      <button className="sidebar-quick-btn" onClick={editor.lockSelected} title="Lock" type="button">
        <Lock size={14} aria-hidden="true" />
      </button>
      <button className="sidebar-quick-btn sidebar-quick-btn--danger" onClick={editor.deleteSelected} title="Delete" type="button">
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
