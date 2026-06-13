import { useCallback } from 'react';
import { Canvas } from 'fabric';
import type { CanvasSize, ShapeStyle, ShapeType } from '../types/layers';
import {
  applyInteractiveDefaults,
  applyStyleToGroupChildren,
  createLayerId,
  createShapeObject,
  DEFAULT_SHAPE_STYLE,
  getMetadata,
  getShapeStyleFromObject,
  setMetadata,
  applyShapeShadowAndGradient,
} from '../utils/fabricHelpers';
import { clampShapeStyleForType, clampStrokeWidthForShape } from '../utils/shapeStrokeProfiles';

interface UseShapeLayerProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  canvasSize: CanvasSize;
  nextLayerName: (type: 'image' | 'text' | 'shape', fileName?: string) => string;
  syncLayersFromCanvas: () => void;
  syncSelectionFromCanvas: () => void;
  triggerSaveHistory: () => void;
}

export function useShapeLayer({
  fabricCanvasRef,
  canvasSize,
  nextLayerName,
  syncLayersFromCanvas,
  syncSelectionFromCanvas,
  triggerSaveHistory,
}: UseShapeLayerProps) {
  const addShape = useCallback((shapeType: ShapeType, style: ShapeStyle = DEFAULT_SHAPE_STYLE) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    triggerSaveHistory();

    const layerId = createLayerId('shape');
    const shape = createShapeObject(shapeType, canvasSize, style);
    if (!shape) return;

    applyInteractiveDefaults(shape);
    setMetadata(shape, {
      layerId,
      layerType: 'shape',
      layerName: `${nextLayerName('shape')} · ${shapeType}`,
      shapeType,
    });

    canvas.add(shape);
    canvas.setActiveObject(shape);
    shape.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [canvasSize, nextLayerName, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const updateSelectedShape = useCallback((patch: any) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object || getMetadata(object)?.layerType !== 'shape') return;

    triggerSaveHistory();

    const metadata = getMetadata(object);
    if (!metadata) return;

    // Apply shadow/gradient properties to metadata
    if (patch.fill !== undefined) {
      metadata.solidFill = patch.fill;
    }
    if (patch.shadow !== undefined) {
      metadata.shadow = patch.shadow;
    }
    if (patch.gradientEnabled !== undefined) {
      metadata.gradientEnabled = patch.gradientEnabled;
    }
    if (patch.gradientType !== undefined) {
      metadata.gradientType = patch.gradientType;
    }
    if (patch.gradientColors !== undefined) {
      metadata.gradientColors = patch.gradientColors;
    }
    if (patch.gradientAngle !== undefined) {
      metadata.gradientAngle = patch.gradientAngle;
    }

    const currentStyle = getShapeStyleFromObject(object);
    const nextStyle = clampShapeStyleForType(metadata?.shapeType, {
      ...currentStyle,
      ...patch,
      strokeWidth: patch.strokeWidth === undefined
        ? currentStyle.strokeWidth
        : clampStrokeWidthForShape(metadata?.shapeType, patch.strokeWidth),
    });

    object.set({
      stroke: nextStyle.stroke,
      strokeWidth: nextStyle.strokeWidth,
    });

    applyStyleToGroupChildren(object, nextStyle);
    applyShapeShadowAndGradient(object);

    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  return {
    addShape,
    updateSelectedShape,
  };
}
