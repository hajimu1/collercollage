import { useEffect, useState } from 'react';
import { CanvasEditor } from '../CanvasEditor';
import { TopBar } from './TopBar';
import { LeftToolBar } from './LeftToolBar';
import { RightSidebar } from './RightSidebar';
import { StatusBar } from './StatusBar';
import { BottomSheet } from './BottomSheet';
import { MobileToolBar } from './MobileToolBar';
import type { FabricEditorController } from '../../hooks/useFabricEditor';
import type { useProjectStorage } from '../../hooks/useProjectStorage';
import type { BottomSheetPanel, EditorTool, SidebarPanel } from '../../types/editor-ui';
import { BACKGROUND_LAYER_ID } from '../../constants/canvas';
import { getClipboardImageFile } from '../../utils/clipboardImage';

interface EditorShellProps {
  editor: FabricEditorController;
  projectStorage: ReturnType<typeof useProjectStorage>;
}

/**
 * Maps selected object type ??best EditorTool to activate.
 * This drives the LeftToolBar highlight only; it does NOT switch panels.
 */
const SELECTION_TYPE_TO_TOOL: Partial<Record<string, EditorTool>> = {
  image: 'image',
  text: 'text',
  shape: 'shape',
};

export function EditorShell({ editor, projectStorage }: EditorShellProps) {
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [activePanel, setActivePanel] = useState<SidebarPanel>('properties');
  const [bottomSheetPanel, setBottomSheetPanel] = useState<BottomSheetPanel>(null);

  // When an object is selected on canvas, highlight the corresponding tool
  // but do NOT force a panel/tab switch
  useEffect(() => {
    if (!editor.selection) return;
    const tool = SELECTION_TYPE_TO_TOOL[editor.selection.type];
    if (tool) setActiveTool(tool);
  }, [editor.selection?.id]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTextEntry = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable;
      if (isTextEntry) return;

      const file = getClipboardImageFile(event.clipboardData);
      if (!file) return;

      event.preventDefault();
      void editor.addImageFromFile(file);
      setActiveTool('image');
      setActivePanel('properties');
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editor]);

  // When user clicks a tool that adds content (image, text, etc.)
  // show properties automatically so the tool's panel appears
  const handleToolChange = (tool: EditorTool) => {
    setActiveTool(tool);
    if (tool !== 'select') {
      setActivePanel('properties');
      // Deselect canvas selection if user switches to a content creation tool
      // EXCEPT when the tool matches the currently selected object's type.
      // This allows users to tap "?띿뒪?? to edit an already selected text object on mobile.
      if (editor.selection) {
        const matchesSelection = SELECTION_TYPE_TO_TOOL[editor.selection.type] === tool;
        if (!matchesSelection) {
          editor.selectLayer(BACKGROUND_LAYER_ID, false);
        }
      }
    }
  };

  // Export shortcut: open export panel in sidebar
  const handleExportClick = () => {
    setActivePanel('export');
  };

  return (
    <div className="editor-shell">
      <TopBar
        editor={editor}
        projectStorage={projectStorage}
        onExportClick={handleExportClick}
      />

      <div className="editor-body">
        {/* Left Tool Bar (desktop/tablet) */}
        <LeftToolBar activeTool={activeTool} onToolChange={handleToolChange} />

        {/* Canvas Area */}
        <div className="editor-canvas-area">
          <CanvasEditor editor={editor} />
        </div>

        {/* Right Sidebar (desktop/tablet) */}
        <RightSidebar
          editor={editor}
          projectStorage={projectStorage}
          activeTool={activeTool}
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />
      </div>

      <StatusBar editor={editor} />

      <BottomSheet
        editor={editor}
        projectStorage={projectStorage}
        activeTool={activeTool}
        activePanel={bottomSheetPanel}
        onClose={() => setBottomSheetPanel(null)}
      />

      <MobileToolBar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        activeSheet={bottomSheetPanel}
        onSheetChange={setBottomSheetPanel}
      />
    </div>
  );
}

