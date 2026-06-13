import { useCallback, useRef } from 'react';
import { Canvas, FabricImage, FabricObject, Group } from 'fabric';
import type { ActiveCollage, CanvasSize, ClipType, ImageCrop } from '../types/layers';
import { readImageLayerDataFromFabric } from '../utils/imageLayerRenderer';
import {
  applyCollageCellFrame,
  applyCollageImageFocus,
  applyImageClip,
  applyImageCrop,
  createCollagePlaceholder,
  createLayerId,
  DEFAULT_IMAGE_CLIP,
  DEFAULT_IMAGE_CROP,
  DEFAULT_IMAGE_STROKE,
  FabricImageObject,
  FabricPlaceholderObject,
  getImageNaturalSize,
  getMetadata,
  isObjectLocked,
  removeOutlineForImage,
  setMetadata,
  syncImageOutline,
  getImageChild,
  applyInteractiveDefaults,
} from '../utils/fabricHelpers';
import { computeCellRect, getCollageLayoutById, normalizeCollageGaps } from '../utils/collageLayouts';
import type { CollageLayout } from '../utils/collageLayouts';
import { resizeImageFile } from '../utils/image';
import { MAX_IMAGE_DIMENSION } from '../constants/canvas';

const clampCollageGap = (value: number) => Math.max(0, Math.min(80, Math.round(value)));
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

interface UseCollageLayerProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  canvasSize: CanvasSize;
  canvasSizeRef: React.MutableRefObject<CanvasSize>;
  activeCollage: ActiveCollage | null;
  setActiveCollage: React.Dispatch<React.SetStateAction<ActiveCollage | null>>;
  activeCollageRef: React.MutableRefObject<ActiveCollage | null>;
  setSelectedCollageCellIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setCropRepositionMode: React.Dispatch<React.SetStateAction<boolean>>;
  cropRepositionModeRef: React.MutableRefObject<boolean>;
  setCropZoom: React.Dispatch<React.SetStateAction<number>>;
  setCropZoomRef: React.MutableRefObject<React.Dispatch<React.SetStateAction<number>>>;
  setCropMinZoom: React.Dispatch<React.SetStateAction<number>>;
  setCropMaxZoom: React.Dispatch<React.SetStateAction<number>>;
  setCropAngle: React.Dispatch<React.SetStateAction<number>>;
  repositionFrameRectRef: React.MutableRefObject<{ left: number; top: number; width: number; height: number; angle?: number } | null>;
  finishCropRepositionRef: React.MutableRefObject<() => void>;
  nextLayerName: (type: 'image' | 'text' | 'shape', fileName?: string) => string;
  syncLayersFromCanvas: () => void;
  syncSelectionFromCanvas: () => void;
  triggerSaveHistory: () => void;
}

export function useCollageLayer({
  fabricCanvasRef,
  canvasSize,
  canvasSizeRef,
  activeCollage,
  setActiveCollage,
  activeCollageRef,
  setSelectedCollageCellIndex,
  setCropRepositionMode,
  cropRepositionModeRef,
  setCropZoom,
  setCropZoomRef,
  setCropMinZoom,
  setCropMaxZoom,
  setCropAngle,
  repositionFrameRectRef,
  finishCropRepositionRef,
  nextLayerName,
  syncLayersFromCanvas,
  syncSelectionFromCanvas,
  triggerSaveHistory,
}: UseCollageLayerProps) {
  const repositionImageRef = useRef<FabricObject | null>(null);
  const repositionOpacityRef = useRef<WeakMap<FabricObject, number>>(new WeakMap());
  const originalInteractionStatesRef = useRef<WeakMap<FabricObject, any>>(new WeakMap());

  /**
   * Reads the user-intended opacity from metadata (persistent) rather than from
   * obj.opacity which may already be the dimmed value if we're re-entering.
   * Falls back to obj.opacity only if metadata has nothing.
   */
  const rememberRepositionOpacity = useCallback((obj: FabricObject) => {
    const meta = getMetadata(obj);
    // Prefer the metadata-stored opacity (user-intended, never dimmed).
    // If not present, fall back to the current Fabric opacity.
    const originalOpacity = (meta as any)?.__userOpacity ?? (obj.opacity ?? 1.0);
    repositionOpacityRef.current.set(obj, originalOpacity);
    // Store in both WeakMap (fast) and metadata (survives across re-entry).
    if (meta) (meta as any).__userOpacity = originalOpacity;
    return originalOpacity;
  }, []);

  const restoreRepositionOpacity = useCallback((obj: FabricObject) => {
    const savedOpacity = repositionOpacityRef.current.get(obj);
    const meta = getMetadata(obj);
    const metaOpacity = (meta as any)?.__userOpacity as number | undefined;
    const originalOpacity = savedOpacity ?? metaOpacity;
    if (originalOpacity !== undefined) {
      obj.set({ opacity: originalOpacity });
    }
    repositionOpacityRef.current.delete(obj);
    // Clear the temporary stored key
    if (meta) (meta as any).__userOpacity = undefined;
  }, []);

  const clearCollageObjects = useCallback((canvas: Canvas, collageId: string) => {
    canvas.getObjects()
      .filter((obj) => {
        const meta = getMetadata(obj);
        if (meta?.collageCell?.collageId === collageId) return true;
        return (obj as FabricPlaceholderObject).data?.placeholderForCollageId === collageId;
      })
      .forEach((obj) => {
        const meta = getMetadata(obj);
        if (meta?.layerType === 'image') {
          removeOutlineForImage(canvas, meta.layerId);
        }
        canvas.remove(obj);
      });
  }, []);

  const beginCropReposition = useCallback(async (target?: FabricObject) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // ── Idempotency guard ───────────────────────────────────────────────────
    if (cropRepositionModeRef.current) return;
    // ───────────────────────────────────────────────────────────────────────
    
    const obj = target || canvas.getActiveObject();
    const meta = obj ? getMetadata(obj) : undefined;
    if (!obj || meta?.layerType !== 'image') return;
    
    setCropRepositionMode(true);

    // Save the original interaction state of obj
    originalInteractionStatesRef.current.set(obj, {
      selectable: obj.selectable,
      evented: obj.evented,
      hasControls: obj.hasControls,
      lockMovementX: obj.lockMovementX,
      lockMovementY: obj.lockMovementY,
      lockScalingX: obj.lockScalingX,
      lockScalingY: obj.lockScalingY,
      lockRotation: obj.lockRotation,
      subTargetCheck: (obj as any).subTargetCheck,
      clipPath: obj.clipPath,
    });

    obj.set({
      selectable: true,
      evented: true,
      hasControls: false,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });

    // Disable all other objects to prevent event hijacking during drag reposition
    canvas.getObjects().forEach((otherObj) => {
      if (otherObj !== obj) {
        (otherObj as any).__originalEvented = otherObj.evented;
        (otherObj as any).__originalSelectable = otherObj.selectable;
        otherObj.set({
          evented: false,
          selectable: false,
        });
      }
    });
    
    repositionImageRef.current = obj;

    const child = getImageChild(obj);
    if (obj instanceof Group && child) {
      // Remove temporary clipping mask from the group
      obj.set({
        clipPath: undefined,
        subTargetCheck: false,
      });

      const natural = getImageNaturalSize(child);
      const naturalW = Math.max(1, natural.width);
      const naturalH = Math.max(1, natural.height);
      const frameW = obj.getScaledWidth();
      const frameH = obj.getScaledHeight();
      const frameRect = {
        left: (obj.left ?? 0) - frameW / 2,
        top: (obj.top ?? 0) - frameH / 2,
        width: frameW,
        height: frameH,
        angle: obj.angle ?? 0,
      };
      repositionFrameRectRef.current = frameRect;

      const groupScaleX = obj.scaleX || 1;
      const minScale = Math.max(frameRect.width / naturalW, frameRect.height / naturalH) / groupScaleX;
      const maxScale = minScale * 5;
      const currentScale = clamp(child.scaleX ?? 1, minScale, maxScale);

      setCropMinZoom(minScale);
      setCropMaxZoom(maxScale);
      setCropZoom(currentScale);
      setCropAngle(child.angle ?? 0);

      syncImageOutline(canvas, obj, frameRect);
      child.setCoords();
      obj.setCoords();
      canvas.setActiveObject(obj);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionFromCanvas();
      return;
    }

    // Fallback: Old single image crop reposition (for collage cells or backwards compatibility)
    const natural = getImageNaturalSize(obj as FabricImageObject);
    const naturalW = Math.max(1, natural.width);
    const naturalH = Math.max(1, natural.height);

    if (meta.collageCell) {
      const layout = getCollageLayoutById(activeCollageRef.current?.layoutId ?? '');
      if (layout) {
        const cell = layout.cells[meta.collageCell.cellIndex];
        if (cell) {
          const cw = canvasSizeRef.current.width;
          const ch = canvasSizeRef.current.height;
          const rect = computeCellRect(cell, cw, ch, activeCollageRef.current!);
          const minScale = Math.max(rect.width / naturalW, rect.height / naturalH);
          setCropMinZoom(minScale);
          setCropMaxZoom(Math.max(1.0, minScale * 4));
          setCropZoom(obj.scaleX ?? minScale);

          const originalOpacity = rememberRepositionOpacity(obj);

          obj.set({
            clipPath: undefined,
            opacity: originalOpacity * 0.5,
            objectCaching: false,
          });

          syncImageOutline(canvas, obj as FabricImageObject, { ...rect, radius: activeCollageRef.current!.radiusPx });
          obj.setCoords();
        }
      }
    } else {
      const frameW = obj.getScaledWidth();
      const frameH = obj.getScaledHeight();
      const frameRect = {
        left: (obj.left ?? 0) - frameW / 2,
        top: (obj.top ?? 0) - frameH / 2,
        width: frameW,
        height: frameH,
        angle: obj.angle ?? 0,
      };
      repositionFrameRectRef.current = frameRect;

      const minScale = Math.max(frameRect.width / naturalW, frameRect.height / naturalH);
      setCropMinZoom(minScale);
      setCropMaxZoom(Math.max(1.0, minScale * 4));

      const crop = meta.crop ?? DEFAULT_IMAGE_CROP;
      const zoom = crop.enabled ? (crop.scale ?? 1) : 1;
      const currentScale = minScale * zoom;
      setCropZoom(currentScale);

      const focusX = crop.enabled ? (((crop.offsetX ?? 0) + 100) / 200) : 0.5;
      const focusY = crop.enabled ? (((crop.offsetY ?? 0) + 100) / 200) : 0.5;

      const originalOpacity = rememberRepositionOpacity(obj);

      obj.set({
        cropX: 0,
        cropY: 0,
        width: naturalW,
        height: naturalH,
        scaleX: currentScale,
        scaleY: currentScale,
        clipPath: undefined,
        opacity: originalOpacity * 0.5,
        objectCaching: false,
      });

      applyCollageImageFocus(obj as FabricImageObject, frameRect, focusX, focusY, currentScale);
      syncImageOutline(canvas, obj as FabricImageObject, frameRect);
      obj.setCoords();
    }

    canvas.setActiveObject(obj);
    canvas.requestRenderAll();
  }, [fabricCanvasRef, setCropRepositionMode, activeCollageRef, canvasSizeRef, setCropMinZoom, setCropMaxZoom, setCropZoom, setCropAngle, repositionFrameRectRef, rememberRepositionOpacity]);

  const finishCropReposition = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    triggerSaveHistory();

    setCropRepositionMode(false);
    
    const obj = repositionImageRef.current;
    repositionImageRef.current = null;

    if (obj) {
      const meta = getMetadata(obj);

      if (obj instanceof Group) {
        const child = getImageChild(obj);
        if (child) {
          const offsetX = Number(child.left ?? 0);
          const offsetY = Number(child.top ?? 0);
          const scale = Number(child.scaleX ?? 1);
          const angle = Number(child.angle ?? 0);

          if (meta) {
            meta.crop = {
              enabled: true,
              offsetX,
              offsetY,
              scale,
              angle,
              frameWidth: obj.width,
              frameHeight: obj.height,
              feather: meta.crop?.feather,
            };
            applyImageCrop(obj, meta.crop);
            applyImageClip(obj);

            // Dual-write: keep ImageLayerData.contentTransform in sync with the drag result.
            if (meta.imageLayerData) {
              meta.imageLayerData = readImageLayerDataFromFabric(obj as Group, meta.imageLayerData);
            }
          }

          if (meta) {
            removeOutlineForImage(canvas, meta.layerId);
          }
          // Redraw normal border outline
          syncImageOutline(canvas, obj);

          // Restore saved interaction states!
          const saved = originalInteractionStatesRef.current.get(obj);
          if (saved) {
            obj.set({
              selectable: saved.selectable,
              evented: saved.evented,
              hasControls: saved.hasControls,
              lockMovementX: saved.lockMovementX,
              lockMovementY: saved.lockMovementY,
              lockScalingX: saved.lockScalingX,
              lockScalingY: saved.lockScalingY,
              lockRotation: saved.lockRotation,
              subTargetCheck: saved.subTargetCheck,
            });
            if (saved.clipPath !== undefined) {
              obj.set({ clipPath: saved.clipPath });
            }
            originalInteractionStatesRef.current.delete(obj);
          }

          restoreRepositionOpacity(obj);

          // Restore other objects' interactiveness
          canvas.getObjects().forEach((otherObj) => {
            if (otherObj !== obj) {
              otherObj.set({
                evented: (otherObj as any).__originalEvented !== undefined ? (otherObj as any).__originalEvented : otherObj.evented,
                selectable: (otherObj as any).__originalSelectable !== undefined ? (otherObj as any).__originalSelectable : otherObj.selectable,
              });
              (otherObj as any).__originalEvented = undefined;
              (otherObj as any).__originalSelectable = undefined;
            }
          });

          canvas.setActiveObject(obj);
          obj.setCoords();
          canvas.requestRenderAll();
          syncLayersFromCanvas();
          syncSelectionFromCanvas();
          return;
        }
      }

      // Fallback: Old single image crop reposition
      if (meta?.collageCell) {
        const collage = activeCollageRef.current;
        if (collage) {
          const layout = getCollageLayoutById(collage.layoutId);
          if (layout) {
            const cell = layout.cells[meta.collageCell.cellIndex];
            if (cell) {
              const cw = canvasSizeRef.current.width;
              const ch = canvasSizeRef.current.height;
              const rect = computeCellRect(cell, cw, ch, collage);
              
              const imageObj = obj as FabricImageObject;
              const natural = getImageNaturalSize(imageObj);
              const naturalW = Math.max(1, natural.width);
              const naturalH = Math.max(1, natural.height);

              const scale = obj.scaleX ?? Math.max(rect.width / naturalW, rect.height / naturalH);
              const scaledW = naturalW * scale;
              const scaledH = naturalH * scale;

              const minLeft = rect.left + rect.width - scaledW / 2;
              const maxLeft = rect.left + scaledW / 2;
              const minTop = rect.top + rect.height - scaledH / 2;
              const maxTop = rect.top + scaledH / 2;

              let focusX = 0.5;
              if (maxLeft !== minLeft) {
                focusX = (maxLeft - (obj.left ?? 0)) / (maxLeft - minLeft);
              }
              
              let focusY = 0.5;
              if (maxTop !== minTop) {
                focusY = (maxTop - (obj.top ?? 0)) / (maxTop - minTop);
              }
              
              meta.collageCell.cropFocusX = Math.max(0, Math.min(1, focusX));
              meta.collageCell.cropFocusY = Math.max(0, Math.min(1, focusY));
              meta.collageCell.cropZoom = scale;
              
              applyCollageImageFocus(imageObj, rect, meta.collageCell.cropFocusX, meta.collageCell.cropFocusY, scale);
              applyCollageCellFrame(imageObj, rect, collage.radiusPx, meta.collageCell.clipType);
              removeOutlineForImage(canvas, meta.layerId);
              obj.setCoords();
            }
          }
        }
      } else if (meta?.layerType === 'image' && repositionFrameRectRef.current) {
        const frameRect = repositionFrameRectRef.current;
        const imageObj = obj as FabricImageObject;
        const natural = getImageNaturalSize(imageObj);
        const naturalW = Math.max(1, natural.width);
        const naturalH = Math.max(1, natural.height);

        const minScale = Math.max(frameRect.width / naturalW, frameRect.height / naturalH);
        const scale = obj.scaleX ?? minScale;
        const scaledW = naturalW * scale;
        const scaledH = naturalH * scale;

        const minLeft = frameRect.left + frameRect.width - scaledW / 2;
        const maxLeft = frameRect.left + scaledW / 2;
        const minTop = frameRect.top + frameRect.height - scaledH / 2;
        const maxTop = frameRect.top + scaledH / 2;

        let focusX = 0.5;
        if (maxLeft !== minLeft) {
          focusX = (maxLeft - (obj.left ?? 0)) / (maxLeft - minLeft);
        }
        let focusY = 0.5;
        if (maxTop !== minTop) {
          focusY = (maxTop - (obj.top ?? 0)) / (maxTop - minTop);
        }
        focusX = Math.max(0, Math.min(1, focusX));
        focusY = Math.max(0, Math.min(1, focusY));

        const zoom = scale / minScale;

        meta.crop = {
          enabled: true,
          offsetX: Math.round((focusX - 0.5) * 200),
          offsetY: Math.round((focusY - 0.5) * 200),
          scale: zoom,
          cropWidthRatio: 1 / zoom,
          cropHeightRatio: 1 / zoom,
          frameWidth: frameRect.width,
          frameHeight: frameRect.height,
        };

        obj.set({
          left: frameRect.left + frameRect.width / 2,
          top: frameRect.top + frameRect.height / 2,
          angle: frameRect.angle,
        });

        applyImageCrop(obj, meta.crop);
        applyImageClip(obj);
        syncImageOutline(canvas, obj);
      }
      
      restoreRepositionOpacity(obj);

      // Restore saved interaction states for fallback too!
      const saved = originalInteractionStatesRef.current.get(obj);
      if (saved) {
        obj.set({
          selectable: saved.selectable,
          evented: saved.evented,
          hasControls: saved.hasControls,
          lockMovementX: saved.lockMovementX,
          lockMovementY: saved.lockMovementY,
          lockScalingX: saved.lockScalingX,
          lockScalingY: saved.lockScalingY,
          lockRotation: saved.lockRotation,
          subTargetCheck: saved.subTargetCheck,
        });
        if (saved.clipPath !== undefined) {
          obj.set({ clipPath: saved.clipPath });
        }
        originalInteractionStatesRef.current.delete(obj);
      }

      // Restore other objects' interactiveness
      canvas.getObjects().forEach((otherObj) => {
        if (otherObj !== obj) {
          otherObj.set({
            evented: (otherObj as any).__originalEvented !== undefined ? (otherObj as any).__originalEvented : otherObj.evented,
            selectable: (otherObj as any).__originalSelectable !== undefined ? (otherObj as any).__originalSelectable : otherObj.selectable,
          });
          (otherObj as any).__originalEvented = undefined;
          (otherObj as any).__originalSelectable = undefined;
        }
      });

      canvas.setActiveObject(obj);
      obj.setCoords();
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionFromCanvas();
    }
    repositionFrameRectRef.current = null;
  }, [fabricCanvasRef, setCropRepositionMode, activeCollageRef, canvasSizeRef, repositionFrameRectRef, restoreRepositionOpacity, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const updateCropZoom = useCallback((newScale: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !cropRepositionModeRef.current) return;

    const activeObject = canvas.getActiveObject();
    const target = activeObject instanceof Group
      ? getImageChild(activeObject)
      : activeObject as FabricImageObject | null;
    if (!target) return;

    if (target.type === 'image' && target.group) {
      const group = target.group;
      const natural = getImageNaturalSize(target);
      const naturalW = Math.max(1, natural.width);
      const naturalH = Math.max(1, natural.height);
      const minScale = Math.max((group.width ?? 100) / naturalW, (group.height ?? 100) / naturalH);
      const clampedScale = clamp(newScale, minScale, minScale * 5);
      target.set({
        scaleX: clampedScale,
        scaleY: clampedScale,
      });
      target.setCoords();
      group.setCoords();
      canvas.setActiveObject(group);
      setCropZoomRef.current(clampedScale);
      canvas.requestRenderAll();
      return;
    }
    
    const meta = getMetadata(target);
    const natural = getImageNaturalSize(target);
    const naturalW = Math.max(1, natural.width);
    const naturalH = Math.max(1, natural.height);

    let rect = repositionFrameRectRef.current;

    if (meta?.collageCell) {
      const collage = activeCollageRef.current;
      if (collage) {
        const layout = getCollageLayoutById(collage.layoutId);
        if (layout) {
          const cell = layout.cells[meta.collageCell.cellIndex];
          if (cell) {
            const cw = canvasSizeRef.current.width;
            const ch = canvasSizeRef.current.height;
            rect = computeCellRect(cell, cw, ch, collage);
          }
        }
      }
    }

    if (!rect) return;
    
    const scaledW = naturalW * (target.scaleX ?? 1);
    const scaledH = naturalH * (target.scaleY ?? 1);
    const minLeft = rect.left + rect.width - scaledW / 2;
    const maxLeft = rect.left + scaledW / 2;
    const minTop = rect.top + rect.height - scaledH / 2;
    const maxTop = rect.top + scaledH / 2;

    let focusX = 0.5;
    if (maxLeft !== minLeft) focusX = (maxLeft - (target.left ?? 0)) / (maxLeft - minLeft);
    let focusY = 0.5;
    if (maxTop !== minTop) focusY = (maxTop - (target.top ?? 0)) / (maxTop - minTop);

    applyCollageImageFocus(target, rect, focusX, focusY, newScale);
    syncImageOutline(canvas, target, rect);
    target.setCoords();
    setCropZoomRef.current(newScale);
    canvas.requestRenderAll();
  }, [fabricCanvasRef, cropRepositionModeRef, repositionFrameRectRef, activeCollageRef, canvasSizeRef, setCropZoomRef]);

  const updateCropAngle = useCallback((newAngle: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !cropRepositionModeRef.current) return;

    const activeObject = canvas.getActiveObject();
    const target = activeObject instanceof Group
      ? getImageChild(activeObject)
      : activeObject;
    if (!target) return;

    if (target.type === 'image' && target.group) {
      target.set({ angle: newAngle });
      target.setCoords();
      setCropAngle(newAngle);
      canvas.requestRenderAll();
    }
  }, [fabricCanvasRef, cropRepositionModeRef, setCropAngle]);

  const fitImageToFrame = useCallback((mode: 'fit' | 'cover' | 'reset') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    const child = activeObject instanceof Group
      ? getImageChild(activeObject)
      : activeObject;
    if (!child || child.type !== 'image' || !child.group) return;

    const group = child.group;
    const natural = getImageNaturalSize(child as FabricImageObject);
    const naturalW = Math.max(1, natural.width);
    const naturalH = Math.max(1, natural.height);

    const frameW = group.width ?? 100;
    const frameH = group.height ?? 100;

    let targetScale = 1;
    let targetLeft = 0;
    let targetTop = 0;
    let targetAngle = 0;

    if (mode === 'fit') {
      targetScale = Math.min(frameW / naturalW, frameH / naturalH);
      child.set({
        scaleX: targetScale,
        scaleY: targetScale,
      });
    } else if (mode === 'cover') {
      targetScale = Math.max(frameW / naturalW, frameH / naturalH);
      child.set({
        scaleX: targetScale,
        scaleY: targetScale,
      });
    } else if (mode === 'reset') {
      targetScale = Math.max(frameW / naturalW, frameH / naturalH);
      child.set({
        left: targetLeft,
        top: targetTop,
        scaleX: targetScale,
        scaleY: targetScale,
        angle: targetAngle,
      });
    }

    child.setCoords();
    group.setCoords();
    canvas.setActiveObject(group);
    setCropZoom(targetScale);
    setCropAngle(targetAngle);
    if (repositionFrameRectRef.current) {
      syncImageOutline(canvas, group, repositionFrameRectRef.current);
    }
    canvas.requestRenderAll();
  }, [fabricCanvasRef, setCropZoom, setCropAngle, repositionFrameRectRef]);

  const resetCropFocus = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const obj = repositionImageRef.current || (canvas.getActiveObject() as FabricImageObject);
    if (obj) {
      const meta = getMetadata(obj);
      if (meta?.collageCell) {
        const collage = activeCollageRef.current;
        if (collage) {
          triggerSaveHistory();
          meta.collageCell.cropFocusX = 0.5;
          meta.collageCell.cropFocusY = 0.5;
          meta.collageCell.cropZoom = undefined;
          
          const layout = getCollageLayoutById(collage.layoutId);
          if (layout) {
            const cell = layout.cells[meta.collageCell.cellIndex];
            if (cell) {
              const cw = canvasSizeRef.current.width;
              const ch = canvasSizeRef.current.height;
              const rect = computeCellRect(cell, cw, ch, collage);
              applyCollageImageFocus(obj as FabricImageObject, rect, 0.5, 0.5);
              obj.setCoords();
              canvas.requestRenderAll();
            }
          }
        }
      } else if (meta?.layerType === 'image') {
        triggerSaveHistory();
        if (obj instanceof Group) {
          const child = getImageChild(obj);
          if (child) {
            child.set({
              left: 0,
              top: 0,
              angle: 0,
            });
            const natural = getImageNaturalSize(child);
            const naturalW = Math.max(1, natural.width);
            const naturalH = Math.max(1, natural.height);
            const coverScale = Math.max((obj.width ?? 100) / naturalW, (obj.height ?? 100) / naturalH);
            child.set({
              scaleX: coverScale,
              scaleY: coverScale,
            });
            child.setCoords();
            setCropZoom(coverScale);
            setCropAngle(0);
            if (repositionFrameRectRef.current) {
              syncImageOutline(canvas, obj, repositionFrameRectRef.current);
            }
            canvas.requestRenderAll();
          }
        } else {
          meta.crop = {
            ...DEFAULT_IMAGE_CROP,
            frameWidth: repositionFrameRectRef.current?.width ?? meta.crop?.frameWidth,
            frameHeight: repositionFrameRectRef.current?.height ?? meta.crop?.frameHeight,
          };
          if (repositionFrameRectRef.current) {
            applyCollageImageFocus(obj as FabricImageObject, repositionFrameRectRef.current, 0.5, 0.5);
            syncImageOutline(canvas, obj as FabricImageObject);
            obj.setCoords();
            canvas.requestRenderAll();
          }
        }
      }
      finishCropReposition();
    }
  }, [fabricCanvasRef, activeCollageRef, canvasSizeRef, repositionFrameRectRef, finishCropReposition, triggerSaveHistory, setCropZoom, setCropAngle]);

  const applyCollageLayout = useCallback(async (
    files: File[],
    layout: CollageLayout,
    gapX = 17,
    gapY = gapX,
    radiusPx = 0,
  ) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    triggerSaveHistory();

    if (activeCollageRef.current) {
      clearCollageObjects(canvas, activeCollageRef.current.collageId);
      setActiveCollage(null);
      activeCollageRef.current = null;
    }

    const collageId = `cg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    const safeGapX = clampCollageGap(gapX);
    const safeGapY = clampCollageGap(gapY);
    const gap = { gapX: safeGapX, gapY: safeGapY };
    const safeRadius = Math.max(0, Math.min(120, Math.round(radiusPx)));
    const cellCount = layout.cells.length;
    const cw = canvasSizeRef.current.width;
    const ch = canvasSizeRef.current.height;

    const newCells: ActiveCollage['cells'] = [];

    for (let i = 0; i < cellCount; i++) {
      const cell = layout.cells[i];
      const rect = computeCellRect(cell, cw, ch, gap);

      if (i < files.length) {
        const file = files[i];
        const src = await resizeImageFile(file, MAX_IMAGE_DIMENSION);
        const image = await FabricImage.fromURL(src) as FabricImageObject;
        const layerId = createLayerId('image');

        applyCollageImageFocus(image, rect, 0.5, 0.5);

        image.set({
          originX: 'center',
          originY: 'center',
          strokeWidth: 0,
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          objectCaching: false,
        });

        setMetadata(image, {
          layerId,
          layerType: 'image',
          layerName: nextLayerName('image', file.name),
          src,
          crop: { ...DEFAULT_IMAGE_CROP },
          clip: { ...DEFAULT_IMAGE_CLIP },
          stroke: { ...DEFAULT_IMAGE_STROKE },
          collageCell: { collageId, layoutId: layout.id, cellIndex: i },
        });

        applyCollageCellFrame(image, rect, safeRadius);
        canvas.add(image);
        image.setCoords();

        newCells.push({ cellIndex: i, layerId });
      } else {
        const placeholder = createCollagePlaceholder(collageId, i, rect, safeRadius);
        canvas.add(placeholder);
        newCells.push({ cellIndex: i, layerId: null });
      }
    }

    const newCollage: ActiveCollage = {
      collageId,
      layoutId: layout.id,
      gapPx: safeGapX,
      gapX: safeGapX,
      gapY: safeGapY,
      radiusPx: safeRadius,
      cells: newCells,
    };
    setActiveCollage(newCollage);
    activeCollageRef.current = newCollage;
    setSelectedCollageCellIndex(null);

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [
    fabricCanvasRef,
    activeCollageRef,
    canvasSizeRef,
    clearCollageObjects,
    setActiveCollage,
    setSelectedCollageCellIndex,
    nextLayerName,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    triggerSaveHistory,
  ]);

  const changeCollageLayout = useCallback((newLayout: CollageLayout) => {
    const canvas = fabricCanvasRef.current;
    const collage = activeCollageRef.current;
    if (!canvas || !collage) return;

    triggerSaveHistory();

    const { gapX, gapY } = normalizeCollageGaps(collage);
    const { radiusPx, collageId } = collage;
    const gap = { gapX, gapY };
    const cw = canvasSizeRef.current.width;
    const ch = canvasSizeRef.current.height;
    const newCellCount = newLayout.cells.length;

    const existingItems: Array<{ cellIndex: number; layerId: string; obj: FabricImageObject }> = [];
    canvas.getObjects().forEach((obj) => {
      const meta = getMetadata(obj);
      if (meta?.collageCell?.collageId === collageId) {
        existingItems.push({ cellIndex: meta.collageCell.cellIndex, layerId: meta.layerId, obj: obj as FabricImageObject });
      }
    });
    existingItems.sort((a, b) => a.cellIndex - b.cellIndex);

    canvas.getObjects()
      .filter((obj) => (obj as FabricPlaceholderObject).data?.placeholderForCollageId === collageId)
      .forEach((obj) => canvas.remove(obj));

    while (existingItems.length > newCellCount) {
      const item = existingItems.pop()!;
      removeOutlineForImage(canvas, item.layerId);
      canvas.remove(item.obj);
    }

    const newCells: ActiveCollage['cells'] = [];

    for (let i = 0; i < existingItems.length; i++) {
      const item = existingItems[i];
      const cell = newLayout.cells[i];
      const rect = computeCellRect(cell, cw, ch, gap);
      const meta = getMetadata(item.obj);
      applyCollageImageFocus(
        item.obj,
        rect,
        meta?.collageCell?.cropFocusX,
        meta?.collageCell?.cropFocusY,
        meta?.collageCell?.cropZoom,
      );
      if (meta?.collageCell) {
        meta.collageCell.cellIndex = i;
        meta.collageCell.layoutId = newLayout.id;
      }
      applyCollageCellFrame(item.obj, rect, radiusPx, meta?.collageCell?.clipType);
      item.obj.setCoords();
      newCells.push({ cellIndex: i, layerId: item.layerId, clipType: meta?.collageCell?.clipType });
    }

    for (let i = existingItems.length; i < newCellCount; i++) {
      const rect = computeCellRect(newLayout.cells[i], cw, ch, gap);
      canvas.add(createCollagePlaceholder(collageId, i, rect, radiusPx));
      newCells.push({ cellIndex: i, layerId: null });
    }

    const newCollage: ActiveCollage = {
      collageId,
      layoutId: newLayout.id,
      gapPx: gapX,
      gapX,
      gapY,
      radiusPx,
      cells: newCells,
    };
    setActiveCollage(newCollage);
    activeCollageRef.current = newCollage;
    setSelectedCollageCellIndex(null);

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [fabricCanvasRef, activeCollageRef, canvasSizeRef, setActiveCollage, setSelectedCollageCellIndex, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const updateCollageGap = useCallback((newGap: number, axis: 'x' | 'y' | 'both' = 'both') => {
    const canvas = fabricCanvasRef.current;
    const collage = activeCollageRef.current;
    if (!canvas || !collage) return;

    triggerSaveHistory();

    const safeGap = clampCollageGap(newGap);
    const currentGap = normalizeCollageGaps(collage);
    const nextGap = {
      gapX: axis === 'y' ? currentGap.gapX : safeGap,
      gapY: axis === 'x' ? currentGap.gapY : safeGap,
    };
    const layout = getCollageLayoutById(collage.layoutId);
    if (!layout) return;

    const cw = canvasSizeRef.current.width;
    const ch = canvasSizeRef.current.height;

    canvas.getObjects().forEach((obj) => {
      const meta = getMetadata(obj);
      if (meta?.collageCell?.collageId === collage.collageId) {
        const cell = layout.cells[meta.collageCell.cellIndex];
        if (!cell) return;
        const rect = computeCellRect(cell, cw, ch, nextGap);
        const image = obj as FabricImageObject;
        applyCollageImageFocus(image, rect, meta.collageCell.cropFocusX, meta.collageCell.cropFocusY, meta.collageCell.cropZoom);
        applyCollageCellFrame(image, rect, collage.radiusPx, meta.collageCell.clipType);
        image.setCoords();
        return;
      }
      const phData = (obj as FabricPlaceholderObject).data;
      if (phData?.placeholderForCollageId === collage.collageId) {
        const cell = layout.cells[phData.placeholderCellIndex];
        if (!cell) return;
        const rect = computeCellRect(cell, cw, ch, nextGap);
        const rx = Math.max(0, Math.min(collage.radiusPx, rect.width / 2, rect.height / 2));
        obj.set({
          left: rect.left + rect.width / 2,
          top: rect.top + rect.height / 2,
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height),
          rx,
          ry: rx,
        });
        obj.setCoords();
      }
    });

    const updated = { ...collage, gapPx: nextGap.gapX, ...nextGap };
    setActiveCollage(updated);
    activeCollageRef.current = updated;
    canvas.requestRenderAll();
  }, [fabricCanvasRef, activeCollageRef, canvasSizeRef, setActiveCollage, triggerSaveHistory]);

  const updateCollageRadius = useCallback((newRadius: number) => {
    const canvas = fabricCanvasRef.current;
    const collage = activeCollageRef.current;
    if (!canvas || !collage) return;

    triggerSaveHistory();

    const safeRadius = Math.max(0, Math.min(120, Math.round(newRadius)));
    const layout = getCollageLayoutById(collage.layoutId);
    if (!layout) return;

    const cw = canvasSizeRef.current.width;
    const ch = canvasSizeRef.current.height;

    canvas.getObjects().forEach((obj) => {
      const meta = getMetadata(obj);
      if (meta?.collageCell?.collageId === collage.collageId) {
        const cell = layout.cells[meta.collageCell.cellIndex];
        if (!cell) return;
        const rect = computeCellRect(cell, cw, ch, collage);
        applyCollageCellFrame(obj as FabricImageObject, rect, safeRadius, meta.collageCell.clipType);
        (obj as FabricImageObject).dirty = true;
        return;
      }
      const phData = (obj as FabricPlaceholderObject).data;
      if (phData?.placeholderForCollageId === collage.collageId) {
        const cell = layout.cells[phData.placeholderCellIndex];
        if (!cell) return;
        const rect = computeCellRect(cell, cw, ch, collage);
        const rx = Math.max(0, Math.min(safeRadius, rect.width / 2, rect.height / 2));
        obj.set({ rx, ry: rx });
        obj.dirty = true;
      }
    });

    const updated = { ...collage, radiusPx: safeRadius };
    setActiveCollage(updated);
    activeCollageRef.current = updated;
    canvas.requestRenderAll();
  }, [fabricCanvasRef, activeCollageRef, canvasSizeRef, setActiveCollage, triggerSaveHistory]);

  const updateCollageCellClip = useCallback((cellIndex: number, clipType?: ClipType) => {
    const canvas = fabricCanvasRef.current;
    const collage = activeCollageRef.current;
    if (!canvas || !collage) return;

    triggerSaveHistory();

    const layout = getCollageLayoutById(collage.layoutId);
    if (!layout) return;

    const cell = layout.cells[cellIndex];
    if (!cell) return;

    const cw = canvasSizeRef.current.width;
    const ch = canvasSizeRef.current.height;
    const rect = computeCellRect(cell, cw, ch, collage);
    const nextClipType = clipType === 'rect' ? undefined : clipType;

    canvas.getObjects().forEach((obj) => {
      const meta = getMetadata(obj);
      if (meta?.collageCell?.collageId === collage.collageId && meta.collageCell.cellIndex === cellIndex) {
        meta.collageCell.clipType = nextClipType;
        applyCollageCellFrame(obj as FabricImageObject, rect, collage.radiusPx, nextClipType);
        obj.setCoords();
      }
    });

    const updated: ActiveCollage = {
      ...collage,
      cells: collage.cells.map((cellInfo) =>
        cellInfo.cellIndex === cellIndex
          ? { ...cellInfo, clipType: nextClipType }
          : cellInfo,
      ),
    };
    setActiveCollage(updated);
    activeCollageRef.current = updated;
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [
    fabricCanvasRef,
    activeCollageRef,
    canvasSizeRef,
    setActiveCollage,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    triggerSaveHistory,
  ]);

  const fillCollageCells = useCallback(async (files: File[], startCellIndex?: number) => {
    const canvas = fabricCanvasRef.current;
    const collage = activeCollageRef.current;
    if (!canvas || !collage || files.length === 0) return;

    const layout = getCollageLayoutById(collage.layoutId);
    if (!layout) return;

    triggerSaveHistory();

    const { radiusPx, collageId } = collage;
    const cw = canvasSizeRef.current.width;
    const ch = canvasSizeRef.current.height;

    const emptyCellIndices = collage.cells
      .filter((c) => c.layerId === null)
      .map((c) => c.cellIndex)
      .sort((a, b) => a - b);

    let orderedEmpty = emptyCellIndices;
    if (startCellIndex !== undefined) {
      const startPos = emptyCellIndices.indexOf(startCellIndex);
      if (startPos >= 0) {
        orderedEmpty = [...emptyCellIndices.slice(startPos), ...emptyCellIndices.slice(0, startPos)];
      }
    }

    const newCells = collage.cells.map((c) => ({ ...c }));
    let fileIdx = 0;

    for (const cellIdx of orderedEmpty) {
      if (fileIdx >= files.length) break;
      const file = files[fileIdx++];
      const cell = layout.cells[cellIdx];
      const rect = computeCellRect(cell, cw, ch, collage);
      const cellInfo = newCells.find((c) => c.cellIndex === cellIdx);
      const clipType = cellInfo?.clipType;

      const placeholder = canvas.getObjects().find((obj) => {
        const ph = (obj as FabricPlaceholderObject).data;
        return ph?.placeholderForCollageId === collageId && ph.placeholderCellIndex === cellIdx;
      });
      if (placeholder) canvas.remove(placeholder);

      const src = await resizeImageFile(file, MAX_IMAGE_DIMENSION);
      const image = await FabricImage.fromURL(src) as FabricImageObject;
      const layerId = createLayerId('image');

      applyCollageImageFocus(image, rect, 0.5, 0.5);

      image.set({
        originX: 'center',
        originY: 'center',
        strokeWidth: 0,
        selectable: true,
        evented: true,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
        objectCaching: false,
      });

      setMetadata(image, {
        layerId,
        layerType: 'image',
        layerName: nextLayerName('image', file.name),
        src,
        crop: { ...DEFAULT_IMAGE_CROP },
          clip: { ...DEFAULT_IMAGE_CLIP },
          stroke: { ...DEFAULT_IMAGE_STROKE },
          collageCell: { collageId, layoutId: collage.layoutId, cellIndex: cellIdx, clipType },
        });

      applyCollageCellFrame(image, rect, radiusPx, clipType);
      canvas.add(image);
      image.setCoords();

      if (cellInfo) cellInfo.layerId = layerId;
    }

    const updated: ActiveCollage = { ...collage, cells: newCells };
    setActiveCollage(updated);
    activeCollageRef.current = updated;
    setSelectedCollageCellIndex(null);

    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [
    fabricCanvasRef,
    activeCollageRef,
    canvasSizeRef,
    setSelectedCollageCellIndex,
    nextLayerName,
    setActiveCollage,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    triggerSaveHistory,
  ]);

  return {
    beginCropReposition,
    finishCropReposition,
    updateCropZoom,
    updateCropAngle,
    fitImageToFrame,
    resetCropFocus,
    applyCollageLayout,
    changeCollageLayout,
    updateCollageGap,
    updateCollageRadius,
    updateCollageCellClip,
    fillCollageCells,
    clearCollageObjects,
  };
}
