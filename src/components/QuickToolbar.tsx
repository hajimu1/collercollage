import { useEffect, useState } from 'react';
import {
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Crop,
  Eraser,
  Unlock,
  Lock,
  Link,
  Unlink,
} from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';

interface QuickToolbarProps {
  editor: FabricEditorController;
  coords: { left: number; top: number; width: number; height: number };
}

export function QuickToolbar({ editor, coords }: QuickToolbarProps) {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    const container = document.querySelector('.canvas-container') as HTMLElement;
    if (!container) return;

    const stage = document.querySelector('.canvas-stage') as HTMLElement;
    const stageHeight = stage ? stage.clientHeight : window.innerHeight;

    // Center of the object bounding rect
    const left = container.offsetLeft + coords.left + coords.width / 2;
    
    // Position exactly 8px below the selection bounding rect (right underneath the image)
    let top = container.offsetTop + coords.top + coords.height + 8;
    
    // Height of the quick toolbar is about 40px. Let's use 48px to be safe.
    const toolbarHeight = 48;
    
    // Flip to the top of the selection if there is no room at the bottom of the stage
    if (stageHeight && top + toolbarHeight > stageHeight) {
      const topPosition = container.offsetTop + coords.top - toolbarHeight - 8;
      top = Math.max(10, topPosition);
    }

    setPosition({ left, top });
  }, [coords]);

  const { selection, selectedLayerId, moveLayer, deleteSelected, duplicateSelected, lockSelected, updateLayerLock } = editor;

  if (!selection || selectedLayerId === 'background') return null;

  const isLocked = selection.locked;
  const isImage = selection.type === 'image';
  const isMulti = selectedLayerId === 'multi';
  const isGroup = selection.type === 'group';

  return (
    <div
      className="quick-toolbar fade-in"
      style={{
        position: 'absolute',
        left: `${position.left}px`,
        top: `${position.top}px`,
        transform: 'translateX(-50%)',
        zIndex: 1000,
      }}
    >
      <div className="quick-toolbar-content">
        {/* Group Selection */}
        {isMulti && (
          <button
            onClick={() => editor.groupSelected()}
            title="洹몃９?쇰줈 臾띔린"
            type="button"
            className="quick-toolbar-btn accent-btn"
          >
            <Link size={14} />
            <span className="btn-text">Group</span>
          </button>
        )}

        {/* Ungroup Selection */}
        {isGroup && !isMulti && (
          <button
            onClick={() => editor.ungroupSelected()}
            title="洹몃９ ?댁젣"
            type="button"
            className="quick-toolbar-btn accent-btn"
          >
            <Unlink size={14} />
            <span className="btn-text">Ungroup</span>
          </button>
        )}

        {/* Lock / Unlock */}
        <button
          onClick={() => {
            if (isMulti) {
              editor.selectedLayerIds.forEach(id => updateLayerLock(id, !isLocked));
            } else if (selectedLayerId) {
              updateLayerLock(selectedLayerId, !isLocked);
            }
          }}
          title={isLocked ? 'Unlock Layer' : 'Lock Layer'}
          type="button"
          className="quick-toolbar-btn"
        >
          {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
        </button>

        {!isLocked && (
          <>
            {/* Image Crop */}
            {isImage && !isMulti && (
              <button
                onClick={() => editor.beginCropMode()}
                title="Crop"
                type="button"
                className="quick-toolbar-btn accent-btn"
              >
                <Crop size={14} />
                <span className="btn-text">Crop</span>
              </button>
            )}

            {/* Eraser Mask (Brush) - Only for single image layer */}
            {isImage && !isMulti && (
              <button
                onClick={() => {
                  // Toggle eraser mask edit mode
                  const maskBtn = document.getElementById('btn-toggle-mask-mode');
                  if (maskBtn) {
                    maskBtn.click();
                  }
                }}
                title="Eraser Mask Brush"
                type="button"
                className="quick-toolbar-btn mask-btn"
              >
                <Eraser size={14} />
                <span className="btn-text">Eraser Mask</span>
              </button>
            )}

            <div className="quick-toolbar-divider" />

            {/* Stacking Order Actions */}
            {!isMulti && selectedLayerId && (
              <>
                <button
                  onClick={() => moveLayer(selectedLayerId, 'top')}
                  title="Bring to Front"
                  type="button"
                  className="quick-toolbar-btn"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveLayer(selectedLayerId, 'up')}
                  title="Bring Forward"
                  type="button"
                  className="quick-toolbar-btn"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  onClick={() => moveLayer(selectedLayerId, 'down')}
                  title="Send Backward"
                  type="button"
                  className="quick-toolbar-btn"
                >
                  <ArrowDown size={14} />
                </button>
                <button
                  onClick={() => moveLayer(selectedLayerId, 'bottom')}
                  title="Send to Back"
                  type="button"
                  className="quick-toolbar-btn"
                >
                  <ChevronDown size={14} />
                </button>
                <div className="quick-toolbar-divider" />
              </>
            )}

            {/* Duplicate */}
            <button
              onClick={() => void duplicateSelected()}
              title="蹂듭젣"
              type="button"
              className="quick-toolbar-btn"
            >
              <Copy size={14} />
            </button>
          </>
        )}

        {/* Delete */}
        <button
          onClick={() => deleteSelected()}
          title="??젣"
          type="button"
          className="quick-toolbar-btn danger-btn"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
