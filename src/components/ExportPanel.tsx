import { ChangeEvent, useRef, useState } from 'react';
import { Download, FileDown, FileUp, Copy, Plus, Share2 } from 'lucide-react';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import { downloadProjectFile, readProjectFile } from '../utils/projectFile';
import type { useProjectStorage } from '../hooks/useProjectStorage';

interface ExportPanelProps {
  editor: FabricEditorController;
  projectStorage: ReturnType<typeof useProjectStorage>;
}

function ProjectItem({
  project,
  isActive,
  onOpen,
  onRename,
  onDelete,
  canDelete,
}: {
  project: any;
  isActive: boolean;
  onOpen: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [tempName, setTempName] = useState(project.name);

  const handleBlur = () => {
    setEditing(false);
    if (tempName.trim() && tempName !== project.name) {
      onRename(tempName);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        background: isActive ? 'rgba(23, 108, 114, 0.08)' : 'var(--surface)',
        border: isActive ? '1px solid var(--accent)' : '1px solid var(--line)',
        borderRadius: '6px',
        marginBottom: '6px',
        gap: '8px',
      }}
    >
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
        {editing ? (
          <input
            autoFocus
            className="layer-name-input"
            onBlur={handleBlur}
            onChange={(e) => setTempName(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              width: '100%',
              padding: '4px 8px',
              fontSize: '13px',
              borderRadius: '4px',
              border: '1px solid var(--accent)',
              background: 'var(--surface-strong)',
              color: 'var(--ink)',
            }}
            type="text"
            value={tempName}
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            style={{
              fontSize: '13px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--accent)' : 'var(--ink)',
              cursor: 'pointer',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title="더블 클릭해서 이름 변경"
          >
            {project.name}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {!isActive && (
          <button
            onClick={onOpen}
            style={{
              padding: '4px 8px',
              fontSize: '11px',
              borderRadius: '4px',
              background: 'var(--surface-strong)',
              border: '1px solid var(--line)',
              color: 'var(--ink)',
              cursor: 'pointer',
            }}
            type="button"
          >
            열기
          </button>
        )}
        {isActive && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--accent)',
              padding: '4px 8px',
              background: 'rgba(23, 108, 114, 0.12)',
              borderRadius: '4px',
            }}
          >
            편집 중
          </span>
        )}
        <button
          disabled={!canDelete}
          onClick={onDelete}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            borderRadius: '4px',
            background: 'var(--surface-strong)',
            border: '1px solid var(--line)',
            color: '#e03131',
            cursor: canDelete ? 'pointer' : 'not-allowed',
            opacity: canDelete ? 1 : 0.4,
          }}
          type="button"
        >
          삭제
        </button>
      </div>
    </div>
  );
}

export function ExportPanel({ editor, projectStorage }: ExportPanelProps) {
  const projectInputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState<number>(0.85);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [copying, setCopying] = useState<boolean>(false);
  const [sharing, setSharing] = useState<boolean>(false);

  const saveProject = () => {
    downloadProjectFile(editor.createProject());
    setMessage('프로젝트 파일을 저장했습니다.');
  };

  const loadProject = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const project = await readProjectFile(file);
      await editor.loadProject(project);
      
      // Auto-save the imported project into the storage
      if (projectStorage.activeProjectId) {
        await projectStorage.renameProject(projectStorage.activeProjectId, file.name.replace(/\.collage\.json$/i, ''));
      }
      
      setMessage('프로젝트를 불러왔습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '프로젝트 파일을 불러오지 못했습니다.');
    } finally {
      event.target.value = '';
    }
  };

  const handleDownload = async () => {
    try {
      setMessage('이미지를 생성하는 중...');
      await editor.exportImage({
        format,
        quality,
        multiplier,
      });
      setMessage('다운로드를 완료했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '다운로드에 실패했습니다.');
    }
  };

  const handleCopyClipboard = async () => {
    setCopying(true);
    setMessage('클립보드에 복사하는 중...');
    try {
      await editor.exportImage({
        format,
        quality,
        multiplier,
        copyToClipboard: true,
      });
      setMessage('클립보드에 이미지가 복사되었습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '클립보드 복사에 실패했습니다.');
    } finally {
      setCopying(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    setMessage('공유 이미지를 준비하는 중...');
    try {
      await editor.exportImage({
        format,
        quality,
        multiplier,
        share: true,
      });
      setMessage('share' in navigator ? '공유를 완료했습니다.' : '공유를 지원하지 않아 다운로드했습니다.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '공유에 실패했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const isClipboardSupported = typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write;

  return (
    <div className="panel-stack">
      {/* ─── 내보내기 설정 ─── */}
      <section className="panel-section">
        <div className="section-title">내보내기 옵션</div>
        
        <label>포맷</label>
        <div className="segmented-control" style={{ marginBottom: '8px' }}>
          <button
            data-selected={format === 'png'}
            onClick={() => setFormat('png')}
            type="button"
          >
            PNG
          </button>
          <button
            data-selected={format === 'jpeg'}
            onClick={() => setFormat('jpeg')}
            type="button"
          >
            JPEG
          </button>
        </div>

        <label>해상도 배율</label>
        <div className="segmented-control" style={{ marginBottom: '8px' }}>
          <button
            data-selected={multiplier === 1}
            onClick={() => setMultiplier(1)}
            type="button"
          >
            1x (기본)
          </button>
          <button
            data-selected={multiplier === 2}
            onClick={() => setMultiplier(2)}
            type="button"
          >
            2x (고화질)
          </button>
          <button
            data-selected={multiplier === 3}
            onClick={() => setMultiplier(3)}
            type="button"
          >
            3x (초고화질)
          </button>
        </div>

        {format === 'jpeg' && (
          <label style={{ display: 'block', marginBottom: '8px' }}>
            품질
            <span className="range-value">{Math.round(quality * 100)}%</span>
            <input
              max={1}
              min={0.1}
              step={0.05}
              onChange={(e) => setQuality(Number(e.target.value))}
              type="range"
              value={quality}
            />
          </label>
        )}

        <div className="export-size" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--muted)', textAlign: 'center', margin: '8px 0' }}>
          출력 크기: {editor.canvasSize.width * multiplier} × {editor.canvasSize.height * multiplier}px
        </div>

        <div style={{ display: 'grid', gap: '8px' }}>
          <button className="wide-command" onClick={() => void handleDownload()} type="button">
            <Download size={20} aria-hidden="true" />
            이미지 다운로드
          </button>
          <button
            className="secondary-button"
            disabled={sharing}
            onClick={() => void handleShare()}
            style={{ width: '100%' }}
            type="button"
          >
            <Share2 size={18} aria-hidden="true" />
            {sharing ? '공유 준비 중...' : '공유'}
          </button>
          {isClipboardSupported && (
            <button
              className="secondary-button"
              disabled={copying}
              onClick={() => void handleCopyClipboard()}
              style={{ width: '100%' }}
              type="button"
            >
              <Copy size={18} aria-hidden="true" />
              {copying ? '복사 중...' : '클립보드 복사'}
            </button>
          )}
        </div>
      </section>

      {/* ─── 다중 프로젝트 목록 관리 ─── */}
      <section className="panel-section">
        <div className="section-title">기기 내 프로젝트 목록</div>
        <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '12px', paddingRight: '4px' }}>
          {projectStorage.projects.map((proj) => (
            <ProjectItem
              key={proj.id}
              project={proj}
              isActive={proj.id === projectStorage.activeProjectId}
              onOpen={() => void projectStorage.switchProject(proj.id)}
              onRename={(newName) => void projectStorage.renameProject(proj.id, newName)}
              onDelete={() => void projectStorage.deleteProject(proj.id)}
              canDelete={projectStorage.projects.length > 1}
            />
          ))}
        </div>
        <button
          className="wide-command"
          onClick={() => void projectStorage.createNewProject()}
          style={{ background: 'var(--accent)', color: 'white', border: 'none', marginBottom: '8px' }}
          type="button"
        >
          <Plus size={18} aria-hidden="true" />
          새 프로젝트 만들기
        </button>
      </section>

      {/* ─── 파일 저장 및 백업 ─── */}
      <section className="panel-section">
        <div className="section-title">파일 백업 및 복원</div>
        <button className="secondary-button" onClick={saveProject} type="button" style={{ width: '100%', marginBottom: '6px' }}>
          <FileDown size={18} aria-hidden="true" />
          백업 파일 다운로드 (.json)
        </button>
        <button className="secondary-button" onClick={() => projectInputRef.current?.click()} type="button" style={{ width: '100%' }}>
          <FileUp size={18} aria-hidden="true" />
          백업 파일 불러오기 (.json)
        </button>
        <input
          accept=".collage.json,application/json"
          hidden
          onChange={(event) => void loadProject(event)}
          ref={projectInputRef}
          type="file"
        />
        {(message || projectStorage.storageMessage) && (
          <div className="empty-hint" style={{ marginTop: '8px', color: 'var(--accent)' }}>
            {message || projectStorage.storageMessage}
          </div>
        )}
      </section>
    </div>
  );
}
