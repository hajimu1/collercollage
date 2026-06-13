import { useEffect, useRef } from 'react';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import { FloatingActionBar } from './FloatingActionBar';
import { QuickToolbar } from './QuickToolbar';

interface CanvasEditorProps {
  editor: FabricEditorController;
}

export function CanvasEditor({ editor }: CanvasEditorProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const resize = () => editor.fitToContainer(stage);
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    window.addEventListener('orientationchange', resize);

    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
    };
  }, [editor.fitToContainer]);

  return (
    <main className="canvas-shell">
      <div className="canvas-stage" ref={stageRef}>
        <button
          className="canvas-guide-toggle"
          data-selected={editor.alignmentGuidesEnabled}
          onClick={() => editor.setAlignmentGuidesEnabled((enabled) => !enabled)}
          type="button"
        >
          스냅
        </button>
        <canvas ref={editor.canvasElementRef} />

        {(editor.cropMode || editor.cropRepositionMode) && (
          <FloatingActionBar editor={editor} />
        )}

        {editor.selectionCoords && !editor.cropMode && !editor.cropRepositionMode && (
          <QuickToolbar editor={editor} coords={editor.selectionCoords} />
        )}
      </div>
    </main>
  );
}
