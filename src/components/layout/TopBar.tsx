import { Undo2, Redo2, Download } from 'lucide-react';
import type { FabricEditorController } from '../../hooks/useFabricEditor';
import type { useProjectStorage } from '../../hooks/useProjectStorage';

interface TopBarProps {
  editor: FabricEditorController;
  projectStorage: ReturnType<typeof useProjectStorage>;
  onExportClick: () => void;
}

export function TopBar({ editor, projectStorage, onExportClick }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="topbar-logo">Layer Collage</span>
        <span className="topbar-canvas-size">
          {editor.canvasSize.width} × {editor.canvasSize.height}
        </span>
        {projectStorage.statusText && (
          <span className="topbar-save-status">
            {projectStorage.statusText}
          </span>
        )}
      </div>

      <div className="topbar-actions">
        <button
          className="topbar-action-btn"
          disabled={!editor.canUndo}
          onClick={() => void editor.undo()}
          title="Undo (Ctrl+Z)"
          type="button"
        >
          <Undo2 size={16} />
          <span className="topbar-action-label">Undo</span>
        </button>
        <button
          className="topbar-action-btn"
          disabled={!editor.canRedo}
          onClick={() => void editor.redo()}
          title="Redo (Ctrl+Shift+Z)"
          type="button"
        >
          <Redo2 size={16} />
          <span className="topbar-action-label">Redo</span>
        </button>

        <div className="topbar-divider" />

        <button
          className="topbar-action-btn topbar-export-btn"
          onClick={onExportClick}
          title="Export"
          type="button"
        >
          <Download size={16} />
          <span className="topbar-action-label">Export</span>
        </button>
      </div>
    </header>
  );
}

