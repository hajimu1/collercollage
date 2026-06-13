import { useState } from 'react';
import { BackgroundPanel } from '../BackgroundPanel';
import { CollageLayoutPanel } from '../CollageLayoutPanel';
import { CropPanel } from '../CropPanel';
import { ImagePanel } from '../ImagePanel';
import { ShapePanel } from '../ShapePanel';
import { TextPanel } from '../TextPanel';
import { AdjustmentPanel } from '../AdjustmentPanel';
import type { FabricEditorController } from '../../hooks/useFabricEditor';
import type { EditorTool } from '../../types/editor-ui';

interface PropertiesPanelProps {
  editor: FabricEditorController;
  activeTool: EditorTool;
}

// Module-level variable to persist the tab state across remounts
let persistedImageTab: 'edit' | 'clip' | 'assets' = 'edit';

export function PropertiesPanel({ editor, activeTool }: PropertiesPanelProps) {
  const [activeImageTab, setActiveImageTab] = useState<'edit' | 'clip' | 'assets'>(persistedImageTab);

  const handleActiveTabChange = (tab: 'edit' | 'clip' | 'assets') => {
    persistedImageTab = tab;
    setActiveImageTab(tab);
  };

  // Crop mode overrides everything — show the crop panel
  if (editor.cropMode) {
    return <CropPanel editor={editor} />;
  }

  // If there is an active selection, we show properties of the selected element
  if (editor.selection) {
    switch (editor.selection.type) {
      case 'image':
      case 'overlay':
        return <ImagePanel editor={editor} activeTab={activeImageTab} setActiveTab={handleActiveTabChange} />;
      case 'text':
        return <TextPanel editor={editor} />;
      case 'shape':
        return <ShapePanel editor={editor} />;
      case 'adjustment':
        return <AdjustmentPanel editor={editor} />;
      default:
        return <BackgroundPanel editor={editor} />;
    }
  }

  // If nothing is selected, we show panels based on the active left sidebar tool
  if (activeTool === 'text') {
    return <TextPanel editor={editor} />;
  }

  if (activeTool === 'shape') {
    return <ShapePanel editor={editor} />;
  }

  if (activeTool === 'image') {
    return <ImagePanel editor={editor} activeTab={activeImageTab} setActiveTab={handleActiveTabChange} />;
  }

  if (activeTool === 'collage' || editor.activeCollage) {
    return <CollageLayoutPanel editor={editor} />;
  }

  // Default to background panel
  return <BackgroundPanel editor={editor} />;
}
