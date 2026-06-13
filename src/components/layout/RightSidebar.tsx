import { useState } from 'react';
import { Layers, Plus, Settings2 } from 'lucide-react';
import { LayerPanel } from '../LayerPanel';
import { ExportPanel } from '../ExportPanel';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { SelectedLayerQuickActions } from '../SelectedLayerQuickActions';
import type { FabricEditorController } from '../../hooks/useFabricEditor';
import type { useProjectStorage } from '../../hooks/useProjectStorage';
import type { EditorTool, SidebarPanel } from '../../types/editor-ui';

interface RightSidebarProps {
  editor: FabricEditorController;
  projectStorage: ReturnType<typeof useProjectStorage>;
  activeTool: EditorTool;
  activePanel: SidebarPanel;
  onPanelChange: (panel: SidebarPanel) => void;
}

export function RightSidebar({
  editor,
  projectStorage,
  activeTool,
  activePanel,
  onPanelChange,
}: RightSidebarProps) {
  const [layersExpanded, setLayersExpanded] = useState(true);

  // Determine if we show tabs layout or two-pane layout
  // On narrow sidebar or when Export is active, use tabs
  const tabs: Array<{ id: SidebarPanel; label: string; icon: React.ElementType }> = [
    { id: 'properties', label: 'Properties', icon: Settings2 },
    { id: 'layers', label: 'Layers', icon: Layers },
  ];

  return (
    <aside className="right-sidebar">
      <SelectedLayerQuickActions editor={editor} variant="sidebar" />

      <div className="sidebar-tabs" role="tablist" style={{ gridTemplateColumns: '1fr 1fr auto' }}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="sidebar-tab-btn"
            data-selected={activePanel === id}
            onClick={() => onPanelChange(id)}
            role="tab"
            aria-selected={activePanel === id}
            type="button"
          >
            <Icon size={14} aria-hidden="true" />
            {label}
          </button>
        ))}
        <button
          className="sidebar-tab-btn"
          onClick={() => void projectStorage.createNewProject()}
          title="Create new project"
          type="button"
          style={{
            padding: '0 12px',
            color: 'var(--accent)',
            borderLeft: '1px solid var(--line)',
            background: 'transparent',
            minHeight: '38px',
          }}
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-panel-scroll">
        {activePanel === 'properties' && (
          <div className="sidebar-panel-content">
            <PropertiesPanel editor={editor} activeTool={activeTool} />
          </div>
        )}

        {activePanel === 'layers' && (
          <div className="sidebar-panel-content">
            <LayerPanel editor={editor} />
          </div>
        )}

        {activePanel === 'export' && (
          <div className="sidebar-panel-content">
            <ExportPanel editor={editor} projectStorage={projectStorage} />
          </div>
        )}
      </div>

      {activePanel === 'properties' && (
        <div className="sidebar-layers-section">
          <button
            className="sidebar-layers-toggle"
            onClick={() => setLayersExpanded((v) => !v)}
            type="button"
          >
            <Layers size={14} aria-hidden="true" />
            Layers            <span className="sidebar-layers-toggle-arrow">
              {layersExpanded ? '??' : '??'}
            </span>
          </button>
          {layersExpanded && (
            <div className="sidebar-layers-body">
              <LayerPanel editor={editor} />
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

