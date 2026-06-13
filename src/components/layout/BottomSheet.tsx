import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { LayerPanel } from '../LayerPanel';
import { ExportPanel } from '../ExportPanel';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { SelectedLayerQuickActions } from '../SelectedLayerQuickActions';
import type { FabricEditorController } from '../../hooks/useFabricEditor';
import type { useProjectStorage } from '../../hooks/useProjectStorage';
import type { BottomSheetPanel, EditorTool } from '../../types/editor-ui';

interface BottomSheetProps {
  editor: FabricEditorController;
  projectStorage: ReturnType<typeof useProjectStorage>;
  activeTool: EditorTool;
  activePanel: BottomSheetPanel;
  onClose: () => void;
}

export function BottomSheet({
  editor,
  projectStorage,
  activeTool,
  activePanel,
  onClose,
}: BottomSheetProps) {
  const isOpen = activePanel !== null;
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const titleMap: Record<Exclude<BottomSheetPanel, null>, string> = {
    properties: 'Properties',
    layers: 'Layers',
    export: 'Export',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="bottom-sheet-backdrop"
        data-open={isOpen}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="bottom-sheet"
        data-open={isOpen}
        role="dialog"
        aria-modal="true"
        aria-label={activePanel ? titleMap[activePanel] : undefined}
      >
        {/* Handle bar */}
        <div className="bottom-sheet-handle" />

        {/* Header */}
        <div className="bottom-sheet-header">
          <span className="bottom-sheet-title">
            {activePanel ? titleMap[activePanel] : ''}
          </span>
          <button
            className="bottom-sheet-close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="bottom-sheet-body">
          <SelectedLayerQuickActions editor={editor} variant="sheet" />
          {activePanel === 'properties' && (
            <PropertiesPanel editor={editor} activeTool={activeTool} />
          )}
          {activePanel === 'layers' && (
            <LayerPanel editor={editor} />
          )}
          {activePanel === 'export' && (
            <ExportPanel editor={editor} projectStorage={projectStorage} />
          )}
        </div>
      </div>
    </>
  );
}

