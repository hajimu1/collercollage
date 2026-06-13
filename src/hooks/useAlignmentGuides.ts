import { useCallback, useRef } from 'react';
import { Canvas, FabricObject, Line } from 'fabric';

import type { CanvasSize } from '../types/layers';
import {
  getMetadata,
  isCropHelperObject,
  isPlaceholderObject,
} from '../utils/fabricHelpers';

type Guide = { orientation: 'vertical' | 'horizontal'; value: number };

interface UseAlignmentGuidesOptions {
  canvasSizeRef: React.MutableRefObject<CanvasSize>;
  cropRepositionModeRef: React.MutableRefObject<boolean>;
  alignmentGuidesEnabledRef: React.MutableRefObject<boolean>;
  scheduleCanvasRender: (canvas: Canvas) => void;
}

export function useAlignmentGuides({
  canvasSizeRef,
  cropRepositionModeRef,
  alignmentGuidesEnabledRef,
  scheduleCanvasRender,
}: UseAlignmentGuidesOptions) {
  const alignmentGuideObjectsRef = useRef<FabricObject[]>([]);
  const isSyncingAlignmentGuidesRef = useRef(false);

  const isAlignmentGuideObject = useCallback((obj: FabricObject) =>
    Boolean((obj as any).data?.alignmentGuide), []);

  const clearAlignmentGuides = useCallback((canvas: Canvas) => {
    if (alignmentGuideObjectsRef.current.length === 0) return;
    isSyncingAlignmentGuidesRef.current = true;
    alignmentGuideObjectsRef.current.forEach((guide) => {
      if (canvas.getObjects().includes(guide)) {
        canvas.remove(guide);
      }
    });
    alignmentGuideObjectsRef.current = [];
    isSyncingAlignmentGuidesRef.current = false;
    scheduleCanvasRender(canvas);
  }, [scheduleCanvasRender]);

  const showAlignmentGuides = useCallback((canvas: Canvas, guides: Guide[]) => {
    isSyncingAlignmentGuidesRef.current = true;
    alignmentGuideObjectsRef.current.forEach((guide) => {
      if (canvas.getObjects().includes(guide)) canvas.remove(guide);
    });
    alignmentGuideObjectsRef.current = guides.map((guide) => {
      const line = guide.orientation === 'vertical'
        ? new Line([guide.value, 0, guide.value, canvasSizeRef.current.height], {
            stroke: '#228be6',
            strokeWidth: 1,
            strokeDashArray: [6, 5],
            selectable: false,
            evented: false,
            excludeFromExport: true,
            objectCaching: false,
          })
        : new Line([0, guide.value, canvasSizeRef.current.width, guide.value], {
            stroke: '#228be6',
            strokeWidth: 1,
            strokeDashArray: [6, 5],
            selectable: false,
            evented: false,
            excludeFromExport: true,
            objectCaching: false,
          });
      (line as any).data = { alignmentGuide: true };
      canvas.add(line);
      canvas.bringObjectToFront?.(line);
      return line;
    });
    isSyncingAlignmentGuidesRef.current = false;
    scheduleCanvasRender(canvas);
  }, [canvasSizeRef, scheduleCanvasRender]);

  const applyAlignmentGuidesAndSnap = useCallback((canvas: Canvas, target: FabricObject) => {
    if (!alignmentGuidesEnabledRef.current || cropRepositionModeRef.current || isAlignmentGuideObject(target)) return;
    if (target.type === 'activeSelection') return;

    const metadata = getMetadata(target);
    if (metadata?.collageCell || isPlaceholderObject(target) || isCropHelperObject(target)) return;

    const threshold = 6;
    const targetBounds = target.getBoundingRect();
    const targetPoints = {
      left: targetBounds.left,
      right: targetBounds.left + targetBounds.width,
      centerX: targetBounds.left + targetBounds.width / 2,
      top: targetBounds.top,
      bottom: targetBounds.top + targetBounds.height,
      centerY: targetBounds.top + targetBounds.height / 2,
    };

    let bestX: { delta: number; value: number; distance: number } | null = null;
    let bestY: { delta: number; value: number; distance: number } | null = null;

    const considerX = (targetValue: number, snapValue: number) => {
      const distance = Math.abs(snapValue - targetValue);
      if (distance <= threshold && (!bestX || distance < bestX.distance)) {
        bestX = { delta: snapValue - targetValue, value: snapValue, distance };
      }
    };
    const considerY = (targetValue: number, snapValue: number) => {
      const distance = Math.abs(snapValue - targetValue);
      if (distance <= threshold && (!bestY || distance < bestY.distance)) {
        bestY = { delta: snapValue - targetValue, value: snapValue, distance };
      }
    };

    considerX(targetPoints.centerX, canvasSizeRef.current.width / 2);
    considerY(targetPoints.centerY, canvasSizeRef.current.height / 2);

    canvas.getObjects().forEach((obj) => {
      if (obj === target || obj.visible === false || isAlignmentGuideObject(obj) || isPlaceholderObject(obj) || isCropHelperObject(obj)) return;
      if ((obj as any).data?.outlineForLayerId || (obj as any).data?.backgroundBoxForTextLayerId) return;
      const objMeta = getMetadata(obj);
      if (!objMeta?.layerType || objMeta.collageCell) return;

      const bounds = obj.getBoundingRect();
      const xValues = [bounds.left, bounds.left + bounds.width, bounds.left + bounds.width / 2];
      const yValues = [bounds.top, bounds.top + bounds.height, bounds.top + bounds.height / 2];
      xValues.forEach((snapValue) => {
        considerX(targetPoints.left, snapValue);
        considerX(targetPoints.right, snapValue);
        considerX(targetPoints.centerX, snapValue);
      });
      yValues.forEach((snapValue) => {
        considerY(targetPoints.top, snapValue);
        considerY(targetPoints.bottom, snapValue);
        considerY(targetPoints.centerY, snapValue);
      });
    });

    const guides: Guide[] = [];
    const snapX = bestX as { delta: number; value: number; distance: number } | null;
    const snapY = bestY as { delta: number; value: number; distance: number } | null;
    if (snapX) {
      target.set({ left: Number(target.left ?? 0) + snapX.delta });
      guides.push({ orientation: 'vertical', value: snapX.value });
    }
    if (snapY) {
      target.set({ top: Number(target.top ?? 0) + snapY.delta });
      guides.push({ orientation: 'horizontal', value: snapY.value });
    }

    if (guides.length > 0) {
      target.setCoords();
      showAlignmentGuides(canvas, guides);
    } else {
      clearAlignmentGuides(canvas);
    }
  }, [alignmentGuidesEnabledRef, canvasSizeRef, clearAlignmentGuides, cropRepositionModeRef, isAlignmentGuideObject, showAlignmentGuides]);

  return {
    applyAlignmentGuidesAndSnap,
    clearAlignmentGuides,
    isSyncingAlignmentGuidesRef,
  };
}
