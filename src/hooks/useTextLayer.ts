import { useCallback } from 'react';
import { Canvas, Textbox } from 'fabric';
import type {
  CanvasSize,
  SelectionSnapshot,
  ShadowSettings,
  TextAlign,
  TextBackgroundBoxSettings,
  TextFontStyle,
  TextFontWeight,
} from '../types/layers';
import {
  applyInteractiveDefaults,
  applyTextShadow,
  createLayerId,
  DEFAULT_TEXT_BACKGROUND_BOX,
  DEFAULT_TEXT_SHADOW,
  FabricLayerObject,
  getMetadata,
  normalizeTextBackgroundBox,
  normalizeTextShadow,
  setMetadata,
  syncTextBackgroundBox,
} from '../utils/fabricHelpers';

interface UseTextLayerProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  canvasSize: CanvasSize;
  selectedLayerId: string | null;
  selection: SelectionSnapshot;
  findObjectByLayerId: (layerId: string) => any;
  nextLayerName: (type: 'image' | 'text' | 'shape', fileName?: string) => string;
  syncLayersFromCanvas: () => void;
  syncSelectionFromCanvas: () => void;
  triggerSaveHistory: () => void;
}

export function useTextLayer({
  fabricCanvasRef,
  canvasSize,
  selectedLayerId,
  selection,
  findObjectByLayerId,
  nextLayerName,
  syncLayersFromCanvas,
  syncSelectionFromCanvas,
  triggerSaveHistory,
}: UseTextLayerProps) {
  const addText = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    triggerSaveHistory();

    const layerId = createLayerId('text');
    const fontSize = Math.max(36, Math.round(Math.min(canvasSize.width, canvasSize.height) * 0.07));
    const text = new Textbox('Text', {
      left: canvasSize.width / 2,
      top: canvasSize.height / 2,
      width: canvasSize.width * 0.58,
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize,
      fill: '#101820',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      splitByGrapheme: true,
    });

    applyInteractiveDefaults(text);
    setMetadata(text, {
      layerId,
      layerType: 'text',
      layerName: nextLayerName('text'),
      shadow: { ...DEFAULT_TEXT_SHADOW },
      backgroundBox: { ...DEFAULT_TEXT_BACKGROUND_BOX },
    });
    applyTextShadow(text as FabricLayerObject, DEFAULT_TEXT_SHADOW);

    canvas.add(text);
    canvas.setActiveObject(text);
    text.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [canvasSize.height, canvasSize.width, nextLayerName, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const updateSelectedText = useCallback((patch: Partial<{
    text: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: TextFontWeight;
    fontStyle: TextFontStyle;
    underline: boolean;
    linethrough: boolean;
    fill: string;
    textAlign: TextAlign;
    shadow: ShadowSettings;
    backgroundBox: TextBackgroundBoxSettings;
    charSpacing: number;
    lineHeight: number;
    strokeEnabled: boolean;
    strokeColor: string;
    strokeWidth: number;
  }>) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject() as FabricLayerObject | undefined;
    const activeMetadata = activeObject ? getMetadata(activeObject) : undefined;
    const fallbackLayerId = selectedLayerId ?? (selection?.type === 'text' ? selection.id : null);
    const fallbackObject = fallbackLayerId ? findObjectByLayerId(fallbackLayerId) as FabricLayerObject | null : null;
    const object = activeMetadata?.layerType === 'text'
      ? activeObject
      : fallbackObject ?? undefined;
    const metadata = object ? getMetadata(object) : undefined;

    if (!object || metadata?.layerType !== 'text') return;

    triggerSaveHistory();

    if (patch.shadow) {
      metadata.shadow = normalizeTextShadow(patch.shadow);
      applyTextShadow(object, metadata.shadow);
    }

    if (patch.backgroundBox) {
      metadata.backgroundBox = normalizeTextBackgroundBox(patch.backgroundBox);
    }

    if (patch.fontFamily !== undefined) metadata.fontFamily = patch.fontFamily;
    if (patch.fontWeight !== undefined) metadata.fontWeight = patch.fontWeight;
    if (patch.fontStyle !== undefined) metadata.fontStyle = patch.fontStyle;
    if (patch.underline !== undefined) metadata.underline = patch.underline;
    if (patch.linethrough !== undefined) metadata.linethrough = patch.linethrough;
    if (patch.charSpacing !== undefined) metadata.charSpacing = patch.charSpacing;
    if (patch.lineHeight !== undefined) metadata.lineHeight = patch.lineHeight;
    if (patch.strokeEnabled !== undefined) metadata.strokeEnabled = patch.strokeEnabled;
    if (patch.strokeColor !== undefined) metadata.strokeColor = patch.strokeColor;
    if (patch.strokeWidth !== undefined) metadata.strokeWidth = patch.strokeWidth;

    const strokeEnabled = patch.strokeEnabled !== undefined ? patch.strokeEnabled : (metadata.strokeEnabled ?? false);
    const strokeColor = patch.strokeColor !== undefined ? patch.strokeColor : (metadata.strokeColor ?? '#101820');
    const strokeWidth = patch.strokeWidth !== undefined ? patch.strokeWidth : (metadata.strokeWidth ?? 0);

    object.set({
      text: patch.text ?? object.text,
      fontSize: patch.fontSize !== undefined ? Math.max(8, patch.fontSize) : object.fontSize,
      fontFamily: patch.fontFamily ?? object.fontFamily,
      fontWeight: patch.fontWeight ?? object.fontWeight,
      fontStyle: patch.fontStyle ?? object.fontStyle,
      underline: patch.underline ?? object.underline,
      linethrough: patch.linethrough ?? object.linethrough,
      fill: patch.fill ?? object.fill,
      textAlign: patch.textAlign ?? object.textAlign,
      charSpacing: patch.charSpacing !== undefined ? patch.charSpacing : object.charSpacing,
      lineHeight: patch.lineHeight !== undefined ? patch.lineHeight : object.lineHeight,
      stroke: strokeEnabled ? strokeColor : undefined,
      strokeWidth: strokeEnabled ? strokeWidth : 0,
    });
    syncTextBackgroundBox(canvas, object);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [findObjectByLayerId, selectedLayerId, selection, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  return {
    addText,
    updateSelectedText,
  };
}
