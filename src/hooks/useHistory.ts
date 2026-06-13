import { useCallback, useRef, useState } from 'react';
import type { CollageProjectFile } from '../types/layers';

export function useHistory(
  createProject: () => CollageProjectFile,
  loadProject: (project: CollageProjectFile) => Promise<void>
) {
  const undoStack = useRef<CollageProjectFile[]>([]);
  const redoStack = useRef<CollageProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateStates = useCallback(() => {
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(redoStack.current.length > 0);
  }, []);

  const saveHistory = useCallback(() => {
    if (loading) return;
    const project = createProject();
    
    const last = undoStack.current[undoStack.current.length - 1];
    if (last && JSON.stringify(last.layers) === JSON.stringify(project.layers) &&
        JSON.stringify(last.background) === JSON.stringify(project.background) &&
        last.canvas.width === project.canvas.width &&
        last.canvas.height === project.canvas.height) {
      return;
    }

    undoStack.current.push(project);
    if (undoStack.current.length > 50) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    updateStates();
  }, [createProject, loading, updateStates]);

  const undo = useCallback(async () => {
    if (loading || undoStack.current.length === 0) return;
    setLoading(true);
    try {
      const current = createProject();
      redoStack.current.push(current);
      if (redoStack.current.length > 50) {
        redoStack.current.shift();
      }
      
      const previous = undoStack.current.pop()!;
      await loadProject(previous);
    } finally {
      setLoading(false);
      updateStates();
    }
  }, [createProject, loadProject, loading, updateStates]);

  const redo = useCallback(async () => {
    if (loading || redoStack.current.length === 0) return;
    setLoading(true);
    try {
      const current = createProject();
      undoStack.current.push(current);
      if (undoStack.current.length > 50) {
        undoStack.current.shift();
      }
      
      const next = redoStack.current.pop()!;
      await loadProject(next);
    } finally {
      setLoading(false);
      updateStates();
    }
  }, [createProject, loadProject, loading, updateStates]);

  const clearHistory = useCallback(() => {
    undoStack.current = [];
    redoStack.current = [];
    updateStates();
  }, [updateStates]);

  return {
    saveHistory,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    loadingHistory: loading,
  };
}
