import { Check, FlipHorizontal, RefreshCw, X } from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';

interface FloatingActionBarProps {
  editor: FabricEditorController;
}

export function FloatingActionBar({ editor }: FloatingActionBarProps) {
  if (editor.cropRepositionMode) {
    return (
      <div className="floating-action-bar">
        <div className="floating-action-bar-slider">
          <label>
            <span className="label-text">
              확대/축소: {Math.round((editor.cropZoom / editor.cropMinZoom) * 100)}%
            </span>
            <input
              max={editor.cropMaxZoom}
              min={editor.cropMinZoom}
              onChange={(e) => editor.updateCropZoom(Number(e.target.value))}
              step={(editor.cropMaxZoom - editor.cropMinZoom) / 100 || 0.01}
              type="range"
              value={editor.cropZoom}
            />
          </label>
        </div>
        <div className="floating-action-bar-actions">
          <button className="secondary-button" onClick={() => editor.resetCropFocus()} type="button">
            <RefreshCw size={16} />
            리셋
          </button>
          <button className="primary-button" onClick={() => editor.finishCropReposition()} type="button">
            <Check size={16} />
            완료
          </button>
        </div>
      </div>
    );
  }

  if (editor.cropMode) {
    return (
      <div className="floating-action-bar">
        <div className="floating-action-bar-actions">
          <button className="secondary-button" onClick={editor.cancelCropMode} type="button">
            <X size={16} />
            취소
          </button>
          <button className="secondary-button" onClick={editor.resetCropMode} type="button">
            <FlipHorizontal size={16} />
            초기화
          </button>
          <button className="primary-button" onClick={editor.finishCropMode} type="button">
            <Check size={16} />
            적용
          </button>
        </div>
      </div>
    );
  }

  return null;
}
