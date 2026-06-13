import type { FabricEditorController } from '../../hooks/useFabricEditor';

interface StatusBarProps {
  editor: FabricEditorController;
}

function getSelectionLabel(editor: FabricEditorController): string {
  if (editor.cropMode) return 'Crop Mode';
  if (!editor.selection) return 'No selection';
  if (editor.isMultiSelect) return `${editor.selectedCount} selected`;

  const typeLabel: Record<string, string> = {
    image: 'Image',
    text: 'Text',
    shape: 'Shape',
    overlay: 'Overlay',
    adjustment: 'Adjustment Layer',
  };

  const type = typeLabel[editor.selection.type] ?? editor.selection.type;
  return `${type}: ${editor.selection.name}`;
}

export function StatusBar({ editor }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <span className="statusbar-selection">
        {getSelectionLabel(editor)}
      </span>

      <div className="statusbar-actions">
        <button
          className="statusbar-snap-btn"
          data-selected={editor.alignmentGuidesEnabled}
          onClick={() => editor.setAlignmentGuidesEnabled((v) => !v)}
          title="Toggle Snap Guides"
          type="button"
        >
          Snap {editor.alignmentGuidesEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </footer>
  );
}
