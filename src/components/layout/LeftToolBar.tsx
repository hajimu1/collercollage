import { ImagePlus, LayoutGrid, MousePointer2, PaintBucket, Shapes, Type } from 'lucide-react';
import type { EditorTool } from '../../types/editor-ui';

interface LeftToolBarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
}

const tools: Array<{ id: EditorTool; label: string; icon: React.ElementType; title: string }> = [
  { id: 'select', label: 'Select', icon: MousePointer2, title: 'Select (V)' },
  { id: 'image', label: 'Image', icon: ImagePlus, title: 'Add Image' },
  { id: 'text', label: 'Text', icon: Type, title: 'Add Text (T)' },
  { id: 'shape', label: 'Shape', icon: Shapes, title: 'Add Shape' },
  { id: 'collage', label: 'Collage', icon: LayoutGrid, title: 'Collage Layout' },
  { id: 'background', label: 'Background', icon: PaintBucket, title: 'Background Settings' },
];

export function LeftToolBar({ activeTool, onToolChange }: LeftToolBarProps) {
  return (
    <aside className="left-toolbar" aria-label="Toolbar">
      <div className="left-toolbar-tools">
        {tools.map(({ id, label, icon: Icon, title }) => (
          <button key={id} className="left-tool-btn" data-selected={activeTool === id} onClick={() => onToolChange(id)} title={title} type="button">
            <Icon size={20} aria-hidden="true" />
            <span className="left-tool-label">{label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
