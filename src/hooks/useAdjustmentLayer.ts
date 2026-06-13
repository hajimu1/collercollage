import { useCallback } from 'react';
import { Canvas } from 'fabric';
import type { AdjustmentGradientType, AdjustmentLayerKind, CanvasSize, BlendMode } from '../types/layers';
import {
  applyInteractiveDefaults,
  createAdjustmentObject,
  getMetadata,
  applyAdjustmentFill,
  applyObjectBlendMode,
} from '../utils/fabricHelpers';

interface UseAdjustmentLayerProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  canvasSize: CanvasSize;
  syncLayersFromCanvas: () => void;
  syncSelectionFromCanvas: () => void;
  triggerSaveHistory: () => void;
}

export function useAdjustmentLayer({
  fabricCanvasRef,
  canvasSize,
  syncLayersFromCanvas,
  syncSelectionFromCanvas,
  triggerSaveHistory,
}: UseAdjustmentLayerProps) {
  const addAdjustmentLayer = useCallback((
    kind: AdjustmentLayerKind,
    gradientType: AdjustmentGradientType = 'linear',
  ) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    triggerSaveHistory();

    const adjustment = createAdjustmentObject(canvasSize, kind, gradientType);
    applyInteractiveDefaults(adjustment);

    canvas.add(adjustment);
    canvas.setActiveObject(adjustment);
    adjustment.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [canvasSize, fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const updateSelectedAdjustment = useCallback((patch: Partial<{
    kind: AdjustmentLayerKind;
    color: string;
    gradientType: AdjustmentGradientType;
    gradientColors: [string, string];
    blendMode: BlendMode;
  }>) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object) return;

    const metadata = getMetadata(object);
    if (!metadata || metadata.layerType !== 'adjustment') return;

    triggerSaveHistory();

    if (patch.kind !== undefined) {
      metadata.adjustmentKind = patch.kind;
      const layerName = patch.kind === 'solid-color'
        ? 'Solid color adjustment'
        : `${metadata.adjustmentGradientType === 'radial' ? 'Radial' : 'Linear'} gradient adjustment`;
      metadata.layerName = layerName;
    }
    if (patch.color !== undefined) {
      metadata.adjustmentColor = patch.color;
    }
    if (patch.gradientType !== undefined) {
      metadata.adjustmentGradientType = patch.gradientType;
      const layerName = (metadata.adjustmentKind ?? 'solid-color') === 'solid-color'
        ? 'Solid color adjustment'
        : `${patch.gradientType === 'radial' ? 'Radial' : 'Linear'} gradient adjustment`;
      metadata.layerName = layerName;
    }
    if (patch.gradientColors !== undefined) {
      metadata.adjustmentGradientColors = patch.gradientColors;
    }
    if (patch.blendMode !== undefined) {
      metadata.blendMode = patch.blendMode;
      applyObjectBlendMode(object, patch.blendMode);
    }

    applyAdjustmentFill(object);

    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  return {
    addAdjustmentLayer,
    updateSelectedAdjustment,
  };
}

