import { useEffect, useState, useCallback, useRef } from 'react';
import type { FabricEditorController } from './useFabricEditor';
import {
  loadAutoProject,
  saveAutoProject,
  saveProject,
  loadProjectById,
  deleteProjectById,
  listProjects,
  getActiveProjectId,
  setActiveProjectId,
  StoredProject,
} from '../utils/indexedDbStorage';
import { validateProjectFile } from '../utils/projectFile';
import type { CollageProjectFile } from '../types/layers';

export function useProjectStorage(editor: FabricEditorController) {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState<string>('Project 1');
  const [storageMessage, setStorageMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [statusText, setStatusText] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Load project list and active project on mount
  const refreshProjectsList = useCallback(async () => {
    try {
      const list = await listProjects();
      setProjects(list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));
      return list;
    } catch {
      setStorageMessage('Failed to load project list.');
      return [];
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const list = await refreshProjectsList();
        let activeId = await getActiveProjectId();

        // 1. If projects list is empty, we must create/migrate the first project
        if (list.length === 0) {
          const autoSaveJson = await loadAutoProject();
          let initialData: CollageProjectFile;

          if (autoSaveJson) {
            try {
              initialData = validateProjectFile(JSON.parse(autoSaveJson));
            } catch {
              initialData = editor.createProject();
            }
          } else {
            initialData = editor.createProject();
          }

          const defaultProject: StoredProject = {
            id: 'project-1',
            name: 'Project 1',
            savedAt: new Date().toISOString(),
            data: JSON.stringify(initialData),
          };

          await saveProject(defaultProject);
          await setActiveProjectId('project-1');
          activeId = 'project-1';

          if (mounted) {
            setProjects([defaultProject]);
          }
        }

        // 2. Load the active project
        const targetId = activeId || list[0]?.id || 'project-1';
        const project = await loadProjectById(targetId);

        if (project && mounted) {
          setActiveProjectIdState(targetId);
          setActiveProjectName(project.name);
          try {
            const parsedData = validateProjectFile(JSON.parse(project.data));
            await editor.loadProject(parsedData);
          } catch {
            setStorageMessage('Failed to restore project data.');
          }
        }
      } catch (err) {
        if (mounted) {
          setStorageMessage('Error initializing storage.');
        }
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [refreshProjectsList]);

  // Periodic Auto-save hook for the active project
  useEffect(() => {
    if (isInitializing || !activeProjectId) return;

    setSaveStatus('saving');

    const timeoutId = window.setTimeout(async () => {
      try {
        const currentData = editor.createProject();
        const json = JSON.stringify(currentData);
        
        // Also save to standard autosave for safety
        await saveAutoProject(json);

        // Update the active project entry in DB
        const updatedProject: StoredProject = {
          id: activeProjectId,
          name: activeProjectName,
          savedAt: new Date().toISOString(),
          data: json,
        };

        await saveProject(updatedProject);
        
        // Update local list state
        setProjects((prev) =>
          prev
            .map((p) => (p.id === activeProjectId ? updatedProject : p))
            .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
        );

        setSaveStatus('saved');
        setSavedAt(new Date());
      } catch {
        setSaveStatus('error');
        setStorageMessage('Auto-save failed.');
      }
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [
    editor.background,
    editor.canvasSize,
    editor.createProject,
    editor.layers,
    editor.activeCollage,
    activeProjectId,
    activeProjectName,
    isInitializing,
  ]);

  // Relative save time indicator
  useEffect(() => {
    if (saveStatus === 'saving') {
      setStatusText('Saving...');
      return;
    }
    if (saveStatus === 'error') {
      setStatusText('Save failed');
      return;
    }
    if (saveStatus === 'idle' || !savedAt) {
      setStatusText('');
      return;
    }

    const updateRelativeTime = () => {
      const diffMs = Date.now() - savedAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) {
        setStatusText('Just saved');
      } else {
        setStatusText(`Saved ${diffMins}m ago`);
      }
    };

    updateRelativeTime();
    const intervalId = window.setInterval(updateRelativeTime, 30000);

    return () => window.clearInterval(intervalId);
  }, [saveStatus, savedAt]);

  // Project Switcher
  const switchProject = useCallback(async (id: string) => {
    try {
      setSaveStatus('saving');
      const project = await loadProjectById(id);
      if (!project) {
        setStorageMessage('Project not found.');
        return;
      }

      const parsedData = validateProjectFile(JSON.parse(project.data));
      await editor.loadProject(parsedData);
      
      await setActiveProjectId(id);
      setActiveProjectIdState(id);
      setActiveProjectName(project.name);
      setSaveStatus('saved');
      setSavedAt(new Date());
      setStorageMessage(`Opened project '${project.name}'.`);
    } catch {
      setStorageMessage('Failed to switch project.');
    }
  }, [editor.loadProject]);

  // Project Creator
  const createNewProject = useCallback(async (name?: string) => {
    try {
      const newId = `project-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const newName = name || `New Project ${projects.length + 1}`;
      
      // Load empty state
      const defaultData: CollageProjectFile = {
        app: 'collage-editor',
        version: 6,
        savedAt: new Date().toISOString(),
        canvas: { width: 800, height: 800 },
        background: { mode: 'solid', color: '#ffffff', fit: 'cover' },
        layers: [],
      };

      const newProject: StoredProject = {
        id: newId,
        name: newName,
        savedAt: new Date().toISOString(),
        data: JSON.stringify(defaultData),
      };

      await saveProject(newProject);
      await setActiveProjectId(newId);
      
      setActiveProjectIdState(newId);
      setActiveProjectName(newName);
      
      await editor.loadProject(defaultData);
      
      const list = await refreshProjectsList();
      setProjects(list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()));

      setSaveStatus('saved');
      setSavedAt(new Date());
      setStorageMessage(`Created project '${newName}'.`);
    } catch {
      setStorageMessage('Failed to create new project.');
    }
  }, [editor.loadProject, projects.length, refreshProjectsList]);

  // Project Renamer
  const renameProject = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const project = await loadProjectById(id);
      if (!project) return;

      project.name = newName;
      project.savedAt = new Date().toISOString();
      await saveProject(project);

      if (id === activeProjectId) {
        setActiveProjectName(newName);
      }

      await refreshProjectsList();
    } catch {
      setStorageMessage('Failed to rename project.');
    }
  }, [activeProjectId, refreshProjectsList]);

  // Project Deleter
  const deleteProject = useCallback(async (id: string) => {
    // Cannot delete the only remaining project
    if (projects.length <= 1) {
      setStorageMessage('At least one project must remain.');
      return;
    }

    try {
      await deleteProjectById(id);

      // If we deleted the active project, switch to another one
      if (id === activeProjectId) {
        const remaining = projects.filter((p) => p.id !== id);
        const nextProject = remaining[0];
        if (nextProject) {
          await switchProject(nextProject.id);
        }
      }

      await refreshProjectsList();
      setStorageMessage('Project deleted.');
    } catch {
      setStorageMessage('Failed to delete project.');
    }
  }, [activeProjectId, projects, switchProject, refreshProjectsList]);

  return {
    projects,
    activeProjectId,
    activeProjectName,
    storageMessage,
    saveStatus,
    statusText,
    createNewProject,
    renameProject,
    deleteProject,
    switchProject,
    setStorageMessage,
  };
}
