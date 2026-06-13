import { useCallback } from 'react';
import { ActiveSelection, Canvas, FabricObject, Group } from 'fabric';
import { BACKGROUND_LAYER_ID } from '../constants/canvas';
import type {
  ActiveCollage,
  BlendMode,
  CanvasBackground,
  CanvasSize,
  LayerItem,
  SelectionSnapshot,
} from '../types/layers';
import {
  applyImageClip,
  applyInteractiveDefaults,
  applyObjectBlendMode,
  applyTextShadow,
  createCollagePlaceholder,
  createLayerId,
  ensureMetadata,
  FabricImageObject,
  FabricLayerObject,
  getMetadata,
  isObjectLocked,
  isPlaceholderObject,
  removeOutlineForImage,
  removeTextBackgroundBox,
  setMetadata,
  setObjectLocked,
  syncImageOutline,
  syncTextBackgroundBox,
} from '../utils/fabricHelpers';
import { computeCellRect, getCollageLayoutById } from '../utils/collageLayouts';

interface UseLayerManagementProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  cropMode: unknown; // cropModeState or similar
  selectedLayerId: string | null;
  setSelectedLayerId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedLayerIds: string[];
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  setIsMultiSelect: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedCount: React.Dispatch<React.SetStateAction<number>>;
  selection: SelectionSnapshot;
  setSelection: React.Dispatch<React.SetStateAction<SelectionSnapshot>>;
  findObjectByLayerId: (layerId: string) => FabricObject | null;
  objectToLayer: (object: FabricObject, index: number) => LayerItem;
  syncLayersFromCanvas: () => void;
  syncSelectionFromCanvas: () => void;
  setBackground: React.Dispatch<React.SetStateAction<CanvasBackground>>;
  setBackgroundLocked: React.Dispatch<React.SetStateAction<boolean>>;
  activeCollageRef: React.MutableRefObject<ActiveCollage | null>;
  setActiveCollage: React.Dispatch<React.SetStateAction<ActiveCollage | null>>;
  canvasSizeRef: React.MutableRefObject<CanvasSize>;
  triggerSaveHistory: () => void;
}

export function useLayerManagement({
  fabricCanvasRef,
  cropMode,
  selectedLayerId,
  setSelectedLayerId,
  selectedLayerIds,
  setSelectedLayerIds,
  setIsMultiSelect,
  setSelectedCount,
  selection,
  setSelection,
  findObjectByLayerId,
  objectToLayer,
  syncLayersFromCanvas,
  syncSelectionFromCanvas,
  setBackground,
  setBackgroundLocked,
  activeCollageRef,
  setActiveCollage,
  canvasSizeRef,
  triggerSaveHistory,
}: UseLayerManagementProps) {

  const setPanelSelection = useCallback((layerIds: string[]) => {
    const ids = layerIds.filter((id) => id !== BACKGROUND_LAYER_ID);
    setSelectedLayerIds(ids);
    setIsMultiSelect(ids.length > 1);
    setSelectedCount(ids.length);
    setSelectedLayerId(ids.length > 1 ? 'multi' : ids[0] ?? null);
  }, [setIsMultiSelect, setSelectedCount, setSelectedLayerId, setSelectedLayerIds]);

  const setCanvasSelectionForLayerIds = useCallback((layerIds: string[]) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = layerIds
      .map((id) => findObjectByLayerId(id))
      .filter((object): object is FabricObject => object !== null)
      .filter((object) => object.visible !== false && !isObjectLocked(object));

    canvas.discardActiveObject();
    if (objects.length === 1) {
      canvas.setActiveObject(objects[0]);
    } else if (objects.length > 1) {
      canvas.setActiveObject(new ActiveSelection(objects, { canvas }));
    }
    canvas.requestRenderAll();
  }, [fabricCanvasRef, findObjectByLayerId]);

  const selectLayer = useCallback((layerId: string, additive = false) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    if (additive && layerId !== BACKGROUND_LAYER_ID) {
      const nextIds = selectedLayerIds.includes(layerId)
        ? selectedLayerIds.filter((id) => id !== layerId)
        : [...selectedLayerIds.filter((id) => id !== BACKGROUND_LAYER_ID), layerId];
      setPanelSelection(nextIds);
      setCanvasSelectionForLayerIds(nextIds);
      if (nextIds.length === 1) {
        const onlyObject = findObjectByLayerId(nextIds[0]);
        if (onlyObject) {
          setSelection(objectToLayer(onlyObject, canvas.getObjects().indexOf(onlyObject)) as SelectionSnapshot);
        }
      } else {
        setSelection(nextIds.length > 1 ? ({ id: 'multi', type: 'shape', name: 'Multiple Selection', visible: true, locked: false, opacity: 1, zIndex: 0, shapeType: 'rectangle', fill: '', stroke: '', strokeWidth: 0 } as any) : null);
      }
      return;
    }

    if (layerId === BACKGROUND_LAYER_ID) {
      canvas.discardActiveObject();
      setSelectedLayerId(layerId);
      setSelectedLayerIds([]);
      setIsMultiSelect(false);
      setSelectedCount(0);
      setSelection(null);
      canvas.requestRenderAll();
      return;
    }

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    setPanelSelection([layerId]);
    if (object.visible === false || isObjectLocked(object)) {
      canvas.discardActiveObject();
      setSelection(objectToLayer(object, canvas.getObjects().indexOf(object)) as SelectionSnapshot);
      canvas.requestRenderAll();
      return;
    }

    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, objectToLayer, selectedLayerIds, setCanvasSelectionForLayerIds, setIsMultiSelect, setPanelSelection, setSelectedCount, setSelectedLayerId, setSelectedLayerIds, setSelection, fabricCanvasRef]);

  const updateLayerVisibility = useCallback((layerId: string, visible: boolean) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    triggerSaveHistory();

    const targetLayerIds = layerId === 'multi' ? selectedLayerIds : [layerId];
    if (targetLayerIds.length > 1) {
      targetLayerIds.forEach((targetLayerId) => {
        const object = findObjectByLayerId(targetLayerId);
        if (!object) return;
        object.set({ visible });
        const metadata = getMetadata(object);
        if (metadata?.layerType === 'image') syncImageOutline(canvas, object as FabricImageObject);
        if (metadata?.layerType === 'text') syncTextBackgroundBox(canvas, object as FabricLayerObject);
      });
      if (!visible) canvas.discardActiveObject();
      else setCanvasSelectionForLayerIds(targetLayerIds);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionFromCanvas();
      return;
    }

    if (layerId === BACKGROUND_LAYER_ID) {
      setBackground((current) => ({ ...current, mode: visible ? (current.imageSrc ? 'image' : 'solid') : 'transparent' }));
      return;
    }

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    object.set({ visible });
    const metadata = getMetadata(object);
    if (metadata?.layerType === 'image') {
      syncImageOutline(canvas, object as FabricImageObject);
    }
    if (metadata?.layerType === 'text') {
      syncTextBackgroundBox(canvas, object as FabricLayerObject);
    }
    if (!visible && canvas.getActiveObject() === object) {
      canvas.discardActiveObject();
    }
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, selectedLayerIds, setCanvasSelectionForLayerIds, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, setBackground, triggerSaveHistory]);

  const updateLayerLock = useCallback((layerId: string, locked: boolean) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    triggerSaveHistory();

    const targetLayerIds = layerId === 'multi' ? selectedLayerIds : [layerId];
    if (targetLayerIds.length > 1) {
      targetLayerIds.forEach((targetLayerId) => {
        const object = findObjectByLayerId(targetLayerId);
        if (!object) return;
        ensureMetadata(object).locked = locked;
        setObjectLocked(object, locked);
      });
      if (locked) canvas.discardActiveObject();
      else setCanvasSelectionForLayerIds(targetLayerIds);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionFromCanvas();
      return;
    }

    if (layerId === BACKGROUND_LAYER_ID) {
      setBackgroundLocked(locked);
      return;
    }

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    ensureMetadata(object).locked = locked;
    setObjectLocked(object, locked);
    if (locked && canvas.getActiveObject() === object) {
      canvas.discardActiveObject();
    }
    setPanelSelection([layerId]);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, selectedLayerIds, setCanvasSelectionForLayerIds, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, setBackgroundLocked, setPanelSelection, triggerSaveHistory]);

  const updateLayerBlendMode = useCallback((layerId: string, blendMode: BlendMode) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || layerId === BACKGROUND_LAYER_ID || cropMode) return;

    triggerSaveHistory();

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    applyObjectBlendMode(object, blendMode);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const updateLayerOpacity = useCallback((layerId: string, opacity: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || layerId === BACKGROUND_LAYER_ID || cropMode) return;

    triggerSaveHistory();

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    const safeOpacity = Math.max(0, Math.min(1, opacity));
    object.set({ opacity: safeOpacity });
    const metadata = getMetadata(object);
    if (metadata?.layerType === 'image') {
      syncImageOutline(canvas, object as FabricImageObject);
    }
    if (metadata?.layerType === 'text') {
      syncTextBackgroundBox(canvas, object as FabricLayerObject);
    }
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const updateSelectedScale = useCallback((scaleValue: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || isObjectLocked(activeObject)) return;

    triggerSaveHistory();

    const newScale = Math.max(0.01, scaleValue);
    activeObject.set({
      scaleX: newScale,
      scaleY: newScale,
    });
    activeObject.setCoords();

    const metadata = getMetadata(activeObject);
    if (metadata?.layerType === 'image') {
      syncImageOutline(canvas, activeObject as FabricImageObject);
    }
    if (metadata?.layerType === 'text') {
      syncTextBackgroundBox(canvas, activeObject as FabricLayerObject);
    }

    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const moveLayer = useCallback((layerId: string, direction: 'up' | 'down' | 'top' | 'bottom') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || layerId === BACKGROUND_LAYER_ID || cropMode) return;

    triggerSaveHistory();

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    const allObjects = canvas.getObjects();

    if (direction === 'top') {
      canvas.moveObjectTo(object, allObjects.length - 1);
    } else if (direction === 'bottom') {
      // Index 0 might be background, so if index 0 is background, move to index 1
      const hasBg = allObjects.some(obj => getMetadata(obj)?.layerId === BACKGROUND_LAYER_ID);
      canvas.moveObjectTo(object, hasBg ? 1 : 0);
    } else {
      const canvasAny = canvas as unknown as {
        bringObjectForward?: (target: FabricObject) => void;
        sendObjectBackwards?: (target: FabricObject) => void;
        bringForward?: (target: FabricObject) => void;
        sendBackwards?: (target: FabricObject) => void;
      };

      if (direction === 'up') {
        if (canvasAny.bringObjectForward) canvasAny.bringObjectForward(object);
        else canvasAny.bringForward?.(object);
      } else if (canvasAny.sendObjectBackwards) {
        canvasAny.sendObjectBackwards(object);
      } else {
        canvasAny.sendBackwards?.(object);
      }
    }

    const metadata = getMetadata(object);
    if (metadata?.layerType === 'image') {
      syncImageOutline(canvas, object as FabricImageObject);
    }
    if (metadata?.layerType === 'text') {
      syncTextBackgroundBox(canvas, object as FabricLayerObject);
    }
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const removeCollageSlotImage = useCallback((object: FabricObject) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const metadata = getMetadata(object);
    if (!metadata?.collageCell) return;

    const { collageId, cellIndex, layoutId } = metadata.collageCell;
    const collage = activeCollageRef.current;

    if (metadata.layerType === 'image') {
      removeOutlineForImage(canvas, metadata.layerId);
    }
    canvas.remove(object);

    if (collage && collage.collageId === collageId) {
      const newCells = [...collage.cells];
      const cellInfo = newCells.find((c) => c.cellIndex === cellIndex);
      if (cellInfo) cellInfo.layerId = null;

      const newCollage = { ...collage, cells: newCells };
      setActiveCollage(newCollage);
      activeCollageRef.current = newCollage;

      const layout = getCollageLayoutById(layoutId);
      if (layout) {
        const cw = canvasSizeRef.current.width;
        const ch = canvasSizeRef.current.height;
        const rect = computeCellRect(layout.cells[cellIndex], cw, ch, collage);
        canvas.add(createCollagePlaceholder(collageId, cellIndex, rect, collage.radiusPx));
      }
    }
  }, [fabricCanvasRef, activeCollageRef, setActiveCollage, canvasSizeRef]);

  const deleteLayer = useCallback((layerId: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || layerId === BACKGROUND_LAYER_ID || cropMode) return;

    triggerSaveHistory();

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    const metadata = getMetadata(object);
    if (metadata?.collageCell) {
      removeCollageSlotImage(object);
    } else {
      if (metadata?.layerType === 'image') {
        removeOutlineForImage(canvas, layerId);
      }
      if (metadata?.layerType === 'text') {
        removeTextBackgroundBox(canvas, layerId);
      }
      canvas.remove(object);
    }

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setSelectedLayerId(null);
    setSelection(null);
    syncLayersFromCanvas();
  }, [cropMode, findObjectByLayerId, syncLayersFromCanvas, removeCollageSlotImage, fabricCanvasRef, setSelectedLayerId, setSelection, triggerSaveHistory]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || cropMode) return;

    if (selectedLayerIds.length > 1) {
      triggerSaveHistory();
      selectedLayerIds.forEach((layerId) => {
        const target = findObjectByLayerId(layerId);
        if (!target) return;
        const metadata = getMetadata(target);
        if (metadata?.collageCell) {
          removeCollageSlotImage(target);
        } else {
          if (metadata?.layerType === 'image') removeOutlineForImage(canvas, metadata.layerId);
          if (metadata?.layerType === 'text') removeTextBackgroundBox(canvas, metadata.layerId);
          canvas.remove(target);
        }
      });
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      setSelectedLayerId(null);
      setSelectedLayerIds([]);
      setIsMultiSelect(false);
      setSelectedCount(0);
      setSelection(null);
      syncLayersFromCanvas();
      return;
    }

    if (!object) return;

    triggerSaveHistory();

    const metadata = getMetadata(object);
    if (metadata?.collageCell) {
      removeCollageSlotImage(object);
    } else {
      if (metadata?.layerType === 'image') {
        removeOutlineForImage(canvas, metadata.layerId);
      }
      if (metadata?.layerType === 'text') {
        removeTextBackgroundBox(canvas, metadata.layerId);
      }
      canvas.remove(object);
    }

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    setSelectedLayerId(null);
    setSelection(null);
    syncLayersFromCanvas();
  }, [cropMode, findObjectByLayerId, selectedLayerIds, syncLayersFromCanvas, removeCollageSlotImage, fabricCanvasRef, setIsMultiSelect, setSelectedCount, setSelectedLayerId, setSelectedLayerIds, setSelection, triggerSaveHistory]);

  const duplicateSelected = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object || cropMode) return;

    triggerSaveHistory();

    const clone = await object.clone() as FabricObject;
    const metadata = ensureMetadata(object);
    const layerId = createLayerId(metadata.layerType);

    applyInteractiveDefaults(clone);
    clone.set({
      left: Number(object.left ?? 0) + 32,
      top: Number(object.top ?? 0) + 32,
      visible: true,
      selectable: true,
      evented: true,
      hasControls: true,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
    });
    setMetadata(clone, {
      ...metadata,
      layerId,
      layerName: `${metadata.layerName} 복사본`,
      crop: metadata.crop ? { ...metadata.crop } : undefined,
      clip: metadata.clip ? { ...metadata.clip } : undefined,
      stroke: metadata.stroke ? { ...metadata.stroke } : undefined,
      shadow: metadata.shadow ? { ...metadata.shadow } : undefined,
      backgroundBox: metadata.backgroundBox ? { ...metadata.backgroundBox } : undefined,
    });
    if (metadata.layerType === 'image') {
      const imageClone = clone as FabricImageObject;
      imageClone.set({ strokeWidth: 0 });
      applyImageClip(imageClone);
    }
    if (metadata.layerType === 'text') {
      applyTextShadow(clone as FabricLayerObject, metadata.shadow);
    }

    canvas.add(clone);
    if (metadata.layerType === 'image') {
      syncImageOutline(canvas, clone as FabricImageObject);
    }
    if (metadata.layerType === 'text') {
      syncTextBackgroundBox(canvas, clone as FabricLayerObject);
    }
    canvas.setActiveObject(clone);
    clone.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const duplicateLayer = useCallback(async (layerId: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    triggerSaveHistory();

    const clone = await object.clone() as FabricObject;
    const metadata = ensureMetadata(object);
    const newLayerId = createLayerId(metadata.layerType);

    applyInteractiveDefaults(clone);
    clone.set({
      left: Number(object.left ?? 0) + 32,
      top: Number(object.top ?? 0) + 32,
      visible: true,
      selectable: true,
      evented: true,
      hasControls: true,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
    });
    setMetadata(clone, {
      ...metadata,
      layerId: newLayerId,
      layerName: `${metadata.layerName} 복사본`,
      crop: metadata.crop ? { ...metadata.crop } : undefined,
      clip: metadata.clip ? { ...metadata.clip } : undefined,
      stroke: metadata.stroke ? { ...metadata.stroke } : undefined,
      shadow: metadata.shadow ? { ...metadata.shadow } : undefined,
      backgroundBox: metadata.backgroundBox ? { ...metadata.backgroundBox } : undefined,
    });
    if (metadata.layerType === 'image') {
      const imageClone = clone as FabricImageObject;
      imageClone.set({ strokeWidth: 0 });
      applyImageClip(imageClone);
    }
    if (metadata.layerType === 'text') {
      applyTextShadow(clone as FabricLayerObject, metadata.shadow);
    }

    canvas.add(clone);
    if (metadata.layerType === 'image') {
      syncImageOutline(canvas, clone as FabricImageObject);
    }
    if (metadata.layerType === 'text') {
      syncTextBackgroundBox(canvas, clone as FabricLayerObject);
    }
    canvas.setActiveObject(clone);
    clone.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const lockSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object || cropMode) return;

    const layerId = ensureMetadata(object).layerId;
    updateLayerLock(layerId, true);
  }, [cropMode, updateLayerLock, fabricCanvasRef]);

  const renameLayer = useCallback((layerId: string, name: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || layerId === BACKGROUND_LAYER_ID || cropMode) return;

    triggerSaveHistory();

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    const metadata = getMetadata(object);
    if (metadata) {
      metadata.layerName = name;
    }
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const reorderLayer = useCallback((layerId: string, targetIndex: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || layerId === BACKGROUND_LAYER_ID || cropMode) return;

    triggerSaveHistory();

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    const isOutlineObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.outlineForLayerId);
    const isTextBackgroundBoxObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.backgroundBoxForTextLayerId);
    const isCropHelperObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.cropHelperForLayerId);
    const isAlignmentGuideObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.alignmentGuide);

    const allObjects = canvas.getObjects();
    const draggableObjects = allObjects.filter((obj) =>
      !isOutlineObjectLocal(obj) &&
      !isTextBackgroundBoxObjectLocal(obj) &&
      !isCropHelperObjectLocal(obj) &&
      !isPlaceholderObject(obj) &&
      getMetadata(obj)?.layerId !== BACKGROUND_LAYER_ID
    );

    const currentDraggableIndex = draggableObjects.indexOf(object);
    if (currentDraggableIndex === -1) return;

    let targetDraggableIndex = draggableObjects.length - 1 - targetIndex;
    targetDraggableIndex = Math.max(0, Math.min(draggableObjects.length - 1, targetDraggableIndex));

    if (currentDraggableIndex === targetDraggableIndex) return;

    const targetDraggableObject = draggableObjects[targetDraggableIndex];
    const targetFabricIndex = allObjects.indexOf(targetDraggableObject);

    canvas.moveObjectTo(object, targetFabricIndex);

    canvas.getObjects().forEach((obj) => {
      const meta = getMetadata(obj);
      if (meta?.layerType === 'image') {
        syncImageOutline(canvas, obj as FabricImageObject);
      } else if (meta?.layerType === 'text') {
        syncTextBackgroundBox(canvas, obj as FabricLayerObject);
      }
    });

    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, findObjectByLayerId, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const alignSelectedObjects = useCallback((alignment: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle' | 'distribute-h' | 'distribute-v') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    triggerSaveHistory();

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'activeSelection') return;

    const selectionObj = activeObject as any;
    const objects = selectionObj.getObjects();
    if (objects.length < 2) return;

    if (alignment === 'left') {
      let minLeft = Infinity;
      objects.forEach((obj: any) => {
        const leftEdge = obj.left - obj.getScaledWidth() / 2;
        if (leftEdge < minLeft) minLeft = leftEdge;
      });
      objects.forEach((obj: any) => {
        obj.set({ left: minLeft + obj.getScaledWidth() / 2 });
        obj.setCoords();
      });
    } else if (alignment === 'right') {
      let maxRight = -Infinity;
      objects.forEach((obj: any) => {
        const rightEdge = obj.left + obj.getScaledWidth() / 2;
        if (rightEdge > maxRight) maxRight = rightEdge;
      });
      objects.forEach((obj: any) => {
        obj.set({ left: maxRight - obj.getScaledWidth() / 2 });
        obj.setCoords();
      });
    } else if (alignment === 'center') {
      objects.forEach((obj: any) => {
        obj.set({ left: 0 });
        obj.setCoords();
      });
    } else if (alignment === 'top') {
      let minTop = Infinity;
      objects.forEach((obj: any) => {
        const topEdge = obj.top - obj.getScaledHeight() / 2;
        if (topEdge < minTop) minTop = topEdge;
      });
      objects.forEach((obj: any) => {
        obj.set({ top: minTop + obj.getScaledHeight() / 2 });
        obj.setCoords();
      });
    } else if (alignment === 'bottom') {
      let maxBottom = -Infinity;
      objects.forEach((obj: any) => {
        const bottomEdge = obj.top + obj.getScaledHeight() / 2;
        if (bottomEdge > maxBottom) maxBottom = bottomEdge;
      });
      objects.forEach((obj: any) => {
        obj.set({ top: maxBottom - obj.getScaledHeight() / 2 });
        obj.setCoords();
      });
    } else if (alignment === 'middle') {
      objects.forEach((obj: any) => {
        obj.set({ top: 0 });
        obj.setCoords();
      });
    } else if (alignment === 'distribute-h') {
      const sorted = [...objects].sort((a: any, b: any) => a.left - b.left);
      const first = sorted[0].left;
      const last = sorted[sorted.length - 1].left;
      const span = last - first;
      if (span !== 0) {
        const step = span / (sorted.length - 1);
        sorted.forEach((obj: any, idx: number) => {
          obj.set({ left: first + idx * step });
          obj.setCoords();
        });
      }
    } else if (alignment === 'distribute-v') {
      const sorted = [...objects].sort((a: any, b: any) => a.top - b.top);
      const first = sorted[0].top;
      const last = sorted[sorted.length - 1].top;
      const span = last - first;
      if (span !== 0) {
        const step = span / (sorted.length - 1);
        sorted.forEach((obj: any, idx: number) => {
          obj.set({ top: first + idx * step });
          obj.setCoords();
        });
      }
    }

    selectionObj.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
  }, [cropMode, fabricCanvasRef, triggerSaveHistory, syncLayersFromCanvas]);

  const groupSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    const activeObject = canvas.getActiveObject() as any;
    if (!activeObject || activeObject.type !== 'activeSelection') return;

    triggerSaveHistory();

    const group = activeObject.toGroup();
    const groupId = createLayerId('group');

    setMetadata(group, {
      layerId: groupId,
      layerType: 'group',
      layerName: `Group ${Date.now().toString().slice(-4)}`,
      locked: false,
    });

    group.getObjects().forEach((child: FabricObject) => {
      const meta = ensureMetadata(child);
      meta.groupId = groupId;
    });

    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const ungroupSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || cropMode) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || !(activeObject instanceof Group)) return;

    const metadata = getMetadata(activeObject);
    if (metadata?.layerType !== 'group') return;

    triggerSaveHistory();

    activeObject.getObjects().forEach((child: FabricObject) => {
      const meta = getMetadata(child);
      if (meta) {
        meta.groupId = undefined;
      }
    });

    const activeSelection = (activeObject as any).toActiveSelection();
    canvas.setActiveObject(activeSelection);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [cropMode, fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  return {
    selectLayer,
    updateLayerVisibility,
    updateLayerLock,
    updateLayerBlendMode,
    updateLayerOpacity,
    updateSelectedScale,
    moveLayer,
    deleteLayer,
    deleteSelected,
    duplicateSelected,
    duplicateLayer,
    lockSelected,
    renameLayer,
    reorderLayer,
    alignSelectedObjects,
    groupSelected,
    ungroupSelected,
  };
}
