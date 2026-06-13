import { Download, ImagePlus, Layers, LayoutGrid, PaintBucket, Settings2, Shapes, Type } from 'lucide-react';
import type { BottomSheetPanel, EditorTool } from '../../types/editor-ui';

interface MobileToolBarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  activeSheet: BottomSheetPanel;
  onSheetChange: (panel: BottomSheetPanel) => void;
}

const toolItems = [
  { id: 'image' as EditorTool, label: 'Image', icon: ImagePlus },
  { id: 'text' as EditorTool, label: 'Text', icon: Type },
  { id: 'shape' as EditorTool, label: 'Shape', icon: Shapes },
  { id: 'collage' as EditorTool, label: 'Collage', icon: LayoutGrid },
  { id: 'background' as EditorTool, label: 'Background', icon: PaintBucket },
];

export function MobileToolBar({ activeTool, onToolChange, activeSheet, onSheetChange }: MobileToolBarProps) {
  const toggleSheet = (panel: BottomSheetPanel) => {
    onSheetChange(activeSheet === panel ? null : panel);
  };

  return (
    <nav className="mobile-toolbar" aria-label="Mobile tools">
      <div className="mobile-tools-scroll">
        {toolItems.map(({ id, label, icon: Icon }) => (
          <button key={id} className="mobile-tool-btn" data-selected={activeTool === id && activeSheet === null} onClick={() => { onToolChange(id); onSheetChange('properties'); }} type="button">
            <Icon size={20} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="mobile-toolbar-divider" />
      <div className="mobile-actions-fixed">
        <button className="mobile-tool-btn" data-selected={activeSheet === 'properties'} onClick={() => toggleSheet('properties')} type="button">
          <Settings2 size={20} aria-hidden="true" />
          <span>Properties</span>
        </button>
        <button className="mobile-tool-btn" data-selected={activeSheet === 'layers'} onClick={() => toggleSheet('layers')} type="button">
          <Layers size={20} aria-hidden="true" />
          <span>Layers</span>
        </button>
        <button className="mobile-tool-btn" data-selected={activeSheet === 'export'} onClick={() => toggleSheet('export')} type="button">
          <Download size={20} aria-hidden="true" />
          <span>Export</span>
        </button>
      </div>
    </nav>
  );
}
