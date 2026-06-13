import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, FabricImage, FabricObject, Group, Textbox, Rect, Ellipse, util } from 'fabric';

import {
  DEFAULT_BACKGROUND,
  DEFAULT_CANVAS_SIZE,
} from '../constants/canvas';
import type {
  ActiveCollage,
  CanvasBackground,
  CanvasSize,
  ClipSpec,
  ElementLayerType,
  ImageCrop,
  LayerItem,
  SelectionSnapshot,
  ShapeStyle,
  ShapeType,
  TextFontStyle,
  TextFontWeight,
  CollageProjectFile,
} from '../types/layers';
import {
  applyImageClip,
  applyImageCrop,
  boxGeometryToCrop,
  clamp,
  clampCanvasSize,
  createLayerId,
  DEFAULT_IMAGE_CLIP,
  DEFAULT_IMAGE_CROP,
  DEFAULT_IMAGE_STROKE,
  DEFAULT_TEXT_BACKGROUND_BOX,
  DEFAULT_TEXT_SHADOW,
  ensureMetadata,
  FabricImageObject,
  FabricLayerObject,
  FabricPlaceholderObject,
  fitCropToAspectRatio,
  getCropBoxForImage,
  getMetadata,
  isCropHelperObject,
  isPlaceholderObject,
  makeBackgroundLayer,
  normalizeCropBoxToAspectRatio,
  normalizeTextBackgroundBox,
  normalizeTextShadow,
  removeCropHelpersForImage,
  removeOutlineForImage,
  removeTextBackgroundBox,
  setMetadata,
  syncImageOutline,
  syncTextBackgroundBox,
  CanvasWithUniformScaling,
  CropModeState,
  isObjectLocked,
  syncCropBox,
  clampCropBoxPositionToImage,
  syncCropBoxDecorations,
  getImageNaturalSize,
  getImageChild,
  applyFabricFiltersToImage,
  setObjectLocked,
  applyInteractiveDefaults,
  applyTextShadow,
  createCollagePlaceholder,
  applyCollageCellFrame,
  applyCollageImageFocus,
  clearImageClipForCrop,
} from '../utils/fabricHelpers';
import { computeCellRect, getCollageLayoutById } from '../utils/collageLayouts';

// Sub-hooks
import { useCanvasBackground } from './useCanvasBackground';
import { useImageLayer } from './useImageLayer';
import { useAdjustmentLayer } from './useAdjustmentLayer';
import { useCollageLayer } from './useCollageLayer';
import { useTextLayer } from './useTextLayer';
import { useShapeLayer } from './useShapeLayer';
import { useLayerManagement } from './useLayerManagement';
import { useExport } from './useExport';
import { useHistory } from './useHistory';
import { useAlignmentGuides } from './useAlignmentGuides';
import { useCanvasTouchGestures } from './useCanvasTouchGestures';

export function useFabricEditor() {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const lastContainerRef = useRef<HTMLElement | null>(null);
  const layerCountersRef = useRef<Record<ElementLayerType, number>>({ image: 0, text: 0, shape: 0, overlay: 0, adjustment: 0, group: 0 });
  const syncLayersRef = useRef<() => void>(() => undefined);
  const syncSelectionRef = useRef<() => void>(() => undefined);
  const cropModeRef = useRef<CropModeState | null>(null);
  const isSyncingCropHelpersRef = useRef(false);
  const syncCropFromBoxRef = useRef<(target: FabricObject, interaction?: 'moving' | 'scaling' | 'modified') => void>(() => undefined);
  const cropCanvasUniformScalingRef = useRef<boolean | undefined>(undefined);
  const cropViewportTransformRef = useRef<[number, number, number, number, number, number] | null>(null);
  const fitToContainerRef = useRef<(container: HTMLElement | null) => void>(() => undefined);
  const alignmentGuidesEnabledRef = useRef(true);
  const renderFrameRef = useRef<number | null>(null);

  const [canvasSize, setCanvasSizeState] = useState<CanvasSize>(DEFAULT_CANVAS_SIZE);
  const [background, setBackground] = useState<CanvasBackground>(DEFAULT_BACKGROUND);
  const [backgroundLocked, setBackgroundLocked] = useState(true);
  const [layers, setLayers] = useState<LayerItem[]>([
    makeBackgroundLayer(DEFAULT_BACKGROUND, true),
  ]);
  const [selection, setSelection] = useState<SelectionSnapshot>(null);
  const [selectionCoords, setSelectionCoords] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [isMultiSelect, setIsMultiSelect] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [cropMode, setCropMode] = useState<CropModeState | null>(null);
  const [activeCollage, setActiveCollage] = useState<ActiveCollage | null>(null);
  const [selectedCollageCellIndex, setSelectedCollageCellIndex] = useState<number | null>(null);
  const [cropRepositionMode, setCropRepositionMode] = useState(false);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropMinZoom, setCropMinZoom] = useState(1);
  const [cropMaxZoom, setCropMaxZoom] = useState(1);
  const [cropAngle, setCropAngle] = useState(0);
  const [alignmentGuidesEnabled, setAlignmentGuidesEnabled] = useState(true);

  // Layer Mask states
  const [maskEditMode, setMaskEditMode] = useState(false);
  const [maskBrushSize, setMaskBrushSize] = useState(30);
  const [maskBrushTool, setMaskBrushTool] = useState<'erase' | 'restore'>('erase');
  const [maskDrawTool, setMaskDrawTool] = useState<'brush' | 'rectangle' | 'circle'>('brush');

  const maskEditModeRef = useRef(false);
  const maskBrushSizeRef = useRef(30);
  const maskBrushToolRef = useRef<'erase' | 'restore'>('erase');
  const maskDrawToolRef = useRef<'brush' | 'rectangle' | 'circle'>('brush');
  const maskStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const maskDragRectRef = useRef<any | null>(null);
  const isDrawingMaskRef = useRef(false);
  const lastMaskPointRef = useRef<{ x: number; y: number } | null>(null);
  const maskEditImageRef = useRef<FabricObject | null>(null);

  useEffect(() => {
    maskEditModeRef.current = maskEditMode;
    maskBrushSizeRef.current = maskBrushSize;
    maskBrushToolRef.current = maskBrushTool;
    maskDrawToolRef.current = maskDrawTool;
  }, [maskEditMode, maskBrushSize, maskBrushTool, maskDrawTool]);

  const activeCollageRef = useRef<ActiveCollage | null>(null);
  const cropRepositionModeRef = useRef(false);
  const repositionChildStartPosRef = useRef<{ left: number; top: number } | null>(null);
  const canvasSizeRef = useRef<CanvasSize>(DEFAULT_CANVAS_SIZE);

  const cropZoomRef = useRef(cropZoom);
  const setCropZoomRef = useRef(setCropZoom);
  const cropAngleRef = useRef(cropAngle);
  const setCropAngleRef = useRef(setCropAngle);
  const repositionFrameRectRef = useRef<{ left: number; top: number; width: number; height: number; angle?: number } | null>(null);
  const finishCropRepositionRef = useRef<() => void>(() => undefined);
  const beginCropRepositionRef = useRef<(target?: FabricObject) => void>(() => undefined);

  // History system stable reference
  const saveHistoryRef = useRef<() => void>(() => undefined);
  const triggerSaveHistory = useCallback(() => {
    saveHistoryRef.current();
  }, []);

  const isNudgingRef = useRef(false);

  useEffect(() => {
    cropRepositionModeRef.current = cropRepositionMode;
    cropZoomRef.current = cropZoom;
    cropAngleRef.current = cropAngle;
    if (!cropRepositionMode) {
      repositionChildStartPosRef.current = null;
    }
  }, [cropRepositionMode, cropZoom, cropAngle]);

  useEffect(() => {
    canvasSizeRef.current = canvasSize;
  }, [canvasSize]);

  useEffect(() => {
    cropModeRef.current = cropMode;
  }, [cropMode]);

  const nextLayerName = useCallback((type: ElementLayerType, fileName?: string) => {
    if (type === 'image' && fileName) {
      return fileName.replace(/\.[^.]+$/, '') || 'Image';
    }

    layerCountersRef.current[type] += 1;
    const label = type === 'image' ? 'Image' : type === 'text' ? 'Text' : 'Shape';
    return `${label} ${layerCountersRef.current[type]}`;
  }, []);

  const findObjectByLayerId = useCallback((layerId: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return null;
    return canvas.getObjects().find((object) => getMetadata(object)?.layerId === layerId) ?? null;
  }, []);

  const syncCropBoxSafely = useCallback((canvas: Canvas, image: FabricImageObject, crop: ImageCrop | undefined, aspectRatio: number | null = null) => {
    isSyncingCropHelpersRef.current = true;
    try {
      syncCropBox(canvas, image, crop, aspectRatio);
    } finally {
      isSyncingCropHelpersRef.current = false;
    }
  }, []);

  useEffect(() => {
    syncCropFromBoxRef.current = (target: FabricObject, interaction = 'modified') => {
      const canvas = fabricCanvasRef.current;
      const mode = cropModeRef.current;
      const layerId = (target as any).data?.cropHelperForLayerId;
      if (!canvas || !mode || !layerId || layerId !== mode.layerId || (target as any).data?.cropHelperKind !== 'box') return;

      const image = findObjectByLayerId(layerId) as FabricImageObject | null;
      if (!image) return;

      const shouldFinalizeBox = interaction === 'modified';

      if (interaction === 'moving') {
        clampCropBoxPositionToImage(image, target);
      } else if (shouldFinalizeBox && mode.aspectRatio !== null) {
        normalizeCropBoxToAspectRatio(image, target, mode.aspectRatio);
      }

      const nextCrop = boxGeometryToCrop(image, target);
      setCropMode((current) => current ? { ...current, draft: nextCrop } : current);
      isSyncingCropHelpersRef.current = true;
      try {
        if (shouldFinalizeBox) {
          syncCropBox(canvas, image, nextCrop, mode.aspectRatio);
        } else {
          syncCropBoxDecorations(canvas, image, target);
        }
      } finally {
        isSyncingCropHelpersRef.current = false;
      }
      canvas.requestRenderAll();
    };
  }, [findObjectByLayerId]);

  const objectToLayer = useCallback((object: FabricObject, index: number): LayerItem => {
    const metadata = ensureMetadata(object);
    const transform = {
      left: Number(object.left ?? 0),
      top: Number(object.top ?? 0),
      width: Number(object.width ?? 0),
      height: Number(object.height ?? 0),
      scaleX: Number(object.scaleX ?? 1),
      scaleY: Number(object.scaleY ?? 1),
      angle: Number(object.angle ?? 0),
    };
    const base = {
      id: metadata.layerId,
      type: metadata.layerType,
      name: metadata.layerName,
      visible: object.visible !== false,
      locked: Boolean(metadata.locked ?? ((cropModeRef.current || cropRepositionModeRef.current) ? false : isObjectLocked(object))),
      opacity: Number((metadata as any).__userOpacity ?? object.opacity ?? 1),
      blendMode: metadata.blendMode ?? 'normal',
      zIndex: index + 1,
      ...transform,
    };

    if (metadata.layerType === 'group') {
      return {
        ...base,
        type: 'group',
      };
    }

    if (metadata.layerType === 'image') {
      const stroke = metadata.stroke ?? DEFAULT_IMAGE_STROKE;
      const target = object instanceof Group ? (getImageChild(object) ?? object) : object;
      const maskCanvas = (target as any).__maskCanvas as HTMLCanvasElement | undefined;
      const maskDataUrl = maskCanvas ? maskCanvas.toDataURL('image/png') : metadata.maskDataUrl;

      return {
        ...base,
        type: 'image',
        src: metadata.src ?? '',
        crop: metadata.crop ?? DEFAULT_IMAGE_CROP,
        clip: metadata.clip ?? DEFAULT_IMAGE_CLIP,
        stroke: {
          enabled: stroke.width > 0,
          color: stroke.color,
          width: stroke.width,
        },
        collageCell: metadata.collageCell,
        filters: metadata.filters,
        shadow: metadata.shadow,
        flipX: Boolean(object.flipX),
        flipY: Boolean(object.flipY),
        maskDataUrl,
        maskLinked: metadata.maskLinked !== false,
      };
    }

    if (metadata.layerType === 'overlay') {
      return {
        ...base,
        type: 'overlay',
        source: metadata.source ?? metadata.src ?? '',
        sourceType: metadata.sourceType ?? 'uploaded',
        assetId: metadata.assetId,
        assetCategory: metadata.assetCategory,
        assetType: metadata.assetType,
        filename: metadata.filename,
      };
    }

    if (metadata.layerType === 'adjustment') {
      return {
        ...base,
        type: 'adjustment',
        kind: metadata.adjustmentKind ?? 'solid-color',
        target: metadata.adjustmentTarget ?? 'canvas',
        color: metadata.adjustmentColor,
        gradientType: metadata.adjustmentGradientType,
        gradientColors: metadata.adjustmentGradientColors,
      };
    }

    if (metadata.layerType === 'text') {
      const textObject = object as FabricLayerObject;
      const getColorLocal = (value: unknown, fallback: string) => (typeof value === 'string' ? value : fallback);
      return {
        ...base,
        type: 'text',
        text: textObject.text ?? '',
        fontSize: Number(textObject.fontSize ?? 64),
        fontFamily: textObject.fontFamily ?? metadata.fontFamily ?? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontWeight: textObject.fontWeight ?? metadata.fontWeight ?? 'normal',
        fontStyle: textObject.fontStyle ?? metadata.fontStyle ?? 'normal',
        underline: Boolean(textObject.underline ?? metadata.underline ?? false),
        linethrough: Boolean(textObject.linethrough ?? metadata.linethrough ?? false),
        fill: getColorLocal(textObject.fill, '#101820'),
        textAlign: textObject.textAlign ?? 'center',
        shadow: normalizeTextShadow(metadata.shadow),
        backgroundBox: normalizeTextBackgroundBox(metadata.backgroundBox),
        charSpacing: textObject.charSpacing ?? metadata.charSpacing ?? 0,
        lineHeight: textObject.lineHeight ?? metadata.lineHeight ?? 1.16,
        strokeEnabled: metadata.strokeEnabled ?? (Number(textObject.strokeWidth ?? 0) > 0),
        strokeColor: typeof textObject.stroke === 'string' ? textObject.stroke : (metadata.strokeColor ?? '#101820'),
        strokeWidth: textObject.strokeWidth ?? metadata.strokeWidth ?? 0,
      };
    }

    const shapeStyle = {
      fill: typeof object.fill === 'string' ? object.fill : (metadata.solidFill ?? '#ffd43b'),
      stroke: typeof object.stroke === 'string' ? object.stroke : '#101820',
      strokeWidth: Number(object.strokeWidth ?? 0),
    };

    return {
      ...base,
      type: 'shape',
      shapeType: metadata.shapeType ?? 'rectangle',
      fill: shapeStyle.fill,
      stroke: shapeStyle.stroke,
      strokeWidth: shapeStyle.strokeWidth,
      shadow: metadata.shadow,
      gradientEnabled: metadata.gradientEnabled,
      gradientType: metadata.gradientType,
      gradientColors: metadata.gradientColors,
      gradientAngle: metadata.gradientAngle,
      solidFill: metadata.solidFill,
    };
  }, []);

  const syncLayersFromCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const isOutlineObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.outlineForLayerId);
    const isTextBackgroundBoxObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.backgroundBoxForTextLayerId);
    const isCropHelperObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.cropHelperForLayerId);
    const isAlignmentGuideObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.alignmentGuide);

    const objectLayers: LayerItem[] = [];

    const traverse = (objects: FabricObject[], parentGroupId?: string) => {
      objects.forEach((object) => {
        if (
          isOutlineObjectLocal(object) ||
          isTextBackgroundBoxObjectLocal(object) ||
          isCropHelperObjectLocal(object) ||
          isAlignmentGuideObjectLocal(object) ||
          isPlaceholderObject(object)
        ) {
          return;
        }

        const metadata = getMetadata(object);
        const layerItem = objectToLayer(object, objectLayers.length);
        if (parentGroupId) {
          layerItem.groupId = parentGroupId;
        }
        objectLayers.push(layerItem);

        if (metadata?.layerType === 'group' && object instanceof Group) {
          traverse(object.getObjects(), metadata.layerId);
        }
      });
    };

    traverse(canvas.getObjects());

    setLayers([
      makeBackgroundLayer(background, backgroundLocked),
      ...objectLayers,
    ]);
  }, [background, backgroundLocked, objectToLayer]);

  const syncSelectionFromCanvas = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    const activeLayerObject = activeObject && activeObject.type === 'image' && activeObject.group
      ? activeObject.group as FabricObject
      : activeObject;
    const isTextBackgroundBoxObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.backgroundBoxForTextLayerId);
    const isCropHelperObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.cropHelperForLayerId);
    const isAlignmentGuideObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.alignmentGuide);
    
    if (cropRepositionModeRef.current) {
      const activeMeta = activeLayerObject ? getMetadata(activeLayerObject) : null;
      const isCollageCell = activeMeta?.collageCell !== undefined;
      if (!activeObject || (!isCollageCell && activeMeta?.layerId !== selectedLayerId)) {
        finishCropRepositionRef.current();
        return;
      }
    }

    if (!activeObject || isCropHelperObjectLocal(activeObject) || isTextBackgroundBoxObjectLocal(activeObject)) {
      setSelection(null);
      setSelectedLayerId(null);
      setSelectedLayerIds([]);
      setSelectedCollageCellIndex(null);
      setCropRepositionMode(false);
      setIsMultiSelect(false);
      setSelectedCount(0);
      setSelectionCoords(null);
      return;
    }

    if (activeObject.type === 'activeSelection') {
      const selectedIds = (activeObject as any).getObjects()
        .map((obj: FabricObject) => getMetadata(obj)?.layerId)
        .filter((id: string | undefined): id is string => Boolean(id));
      setSelectedLayerIds(selectedIds);
      setIsMultiSelect(true);
      setSelectedCount(selectedIds.length);
      setSelection({
        id: 'multi',
        type: 'shape',
        name: 'Multi selection',
        visible: true,
        locked: false,
        opacity: 1,
        zIndex: 0,
        shapeType: 'rectangle',
        fill: '',
        stroke: '',
        strokeWidth: 0,
      } as any);
      setSelectedLayerId('multi');
      setSelectedCollageCellIndex(null);
      
      const rect = activeObject.getBoundingRect();
      const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
      setSelectionCoords({
        left: rect.left * vpt[0] + vpt[4],
        top: rect.top * vpt[3] + vpt[5],
        width: rect.width * vpt[0],
        height: rect.height * vpt[3],
      });
      return;
    } else {
      setIsMultiSelect(false);
      setSelectedCount(1);
    }

    if (isPlaceholderObject(activeObject)) {
      const getPlaceholderCellIndexLocal = (obj: FabricObject): number =>
        (obj as any).data?.placeholderCellIndex ?? -1;
      setSelectedCollageCellIndex(getPlaceholderCellIndexLocal(activeObject));
      setSelection(null);
      setSelectedLayerId(null);
      setSelectedLayerIds([]);
      setCropRepositionMode(false);
      return;
    }

    const metadata = ensureMetadata(activeObject);

    if (metadata.collageCell) {
      setSelectedCollageCellIndex(metadata.collageCell.cellIndex);
      if (!cropRepositionModeRef.current) {
        setSelection(null);
        setSelectedLayerId(null);
        setSelectedLayerIds([]);
      }
      return;
    }

    setSelectedCollageCellIndex(null);
    setSelection(objectToLayer(activeObject, canvas.getObjects().indexOf(activeObject)) as SelectionSnapshot);
    setSelectedLayerId(metadata.layerId);
    setSelectedLayerIds([metadata.layerId]);

    const rect = activeObject.getBoundingRect();
    const vpt = canvas.viewportTransform || [1, 0, 0, 1, 0, 0];
    setSelectionCoords({
      left: rect.left * vpt[0] + vpt[4],
      top: rect.top * vpt[3] + vpt[5],
      width: rect.width * vpt[0],
      height: rect.height * vpt[3],
    });
  }, [selectedLayerId, objectToLayer]);

  useEffect(() => {
    syncLayersRef.current = syncLayersFromCanvas;
  }, [syncLayersFromCanvas]);

  useEffect(() => {
    syncSelectionRef.current = syncSelectionFromCanvas;
  }, [syncSelectionFromCanvas]);

  const fitToContainer = useCallback((container: HTMLElement | null) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !container) return;

    lastContainerRef.current = container;

    const availableWidth = Math.max(260, container.clientWidth - 24);
    const availableHeight = Math.max(260, container.clientHeight - 24);
    const scale = Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height, 1);
    const displayWidth = Math.max(1, Math.round(canvasSize.width * scale));
    const displayHeight = Math.max(1, Math.round(canvasSize.height * scale));

    canvas.setDimensions({ width: displayWidth, height: displayHeight });
    canvas.setViewportTransform([scale, 0, 0, scale, 0, 0]);
    canvas.calcOffset();
    canvas.requestRenderAll();
    syncSelectionFromCanvas();
  }, [canvasSize.height, canvasSize.width, syncSelectionFromCanvas]);

  useEffect(() => {
    fitToContainerRef.current = fitToContainer;
  }, [fitToContainer]);

  // Hook Delegations
  const {
    applyBackground,
    setBackgroundColor,
    setBackgroundMode,
    setBackgroundFit,
    setBackgroundImageFromFile,
    setBackgroundImageFromUrl,
    removeBackgroundImage,
  } = useCanvasBackground({
    fabricCanvasRef,
    setBackground,
    background,
    canvasSize,
    triggerSaveHistory,
  });

  const {
    addImageFromFile,
    addOverlayFromFile,
    addBuiltInAsset,
    updateSelectedImageStroke,
    updateSelectedImageClip,
    updateSelectedImageCrop,
    flipSelectedImage,
    replaceSelectedImage,
    updateSelectedImageFilters,
    updateSelectedImageShadow,
    updateSelectedOpacity,
    createBackgroundBlur,
  } = useImageLayer({
    fabricCanvasRef,
    canvasSize,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    nextLayerName,
    triggerSaveHistory,
  });

  const {
    addAdjustmentLayer,
    updateSelectedAdjustment,
  } = useAdjustmentLayer({
    fabricCanvasRef,
    canvasSize,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    triggerSaveHistory,
  });

  const {
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
  } = useCollageLayer({
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
  });

  const {
    addText,
    updateSelectedText,
  } = useTextLayer({
    fabricCanvasRef,
    canvasSize,
    selectedLayerId,
    selection,
    findObjectByLayerId,
    nextLayerName,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    triggerSaveHistory,
  });

  const {
    addShape,
    updateSelectedShape,
  } = useShapeLayer({
    fabricCanvasRef,
    canvasSize,
    nextLayerName,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    triggerSaveHistory,
  });

  const {
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
  } = useLayerManagement({
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
  });

  const {
    createProject,
    loadProject,
    exportPng,
    exportImage,
  } = useExport({
    fabricCanvasRef,
    canvasSize,
    setCanvasSizeState,
    background,
    setBackground,
    backgroundLocked,
    setBackgroundLocked,
    layers,
    activeCollage,
    setActiveCollage,
    activeCollageRef,
    setSelectedCollageCellIndex,
    setCropMode,
    objectToLayer,
    syncLayersFromCanvas,
    syncSelectionFromCanvas,
    applyBackground,
  });

  // History Hook Integration
  const {
    saveHistory,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
  } = useHistory(createProject, loadProject);

  useEffect(() => {
    saveHistoryRef.current = saveHistory;
  }, [saveHistory]);

  const applyCropWorkspacePadding = useCallback((canvas: Canvas, object: FabricImageObject) => {
    const viewportTransform = canvas.viewportTransform ?? [1, 0, 0, 1, 0, 0];
    const currentZoom = Math.max(0.05, Number(viewportTransform[0] ?? 1));
    const viewportWidth = Math.max(1, canvas.getWidth());
    const viewportHeight = Math.max(1, canvas.getHeight());
    const maxPadding = Math.max(32, Math.min(120, Math.min(viewportWidth, viewportHeight) / 3));
    const targetPadding = clamp(96, 64, maxPadding);
    const objectWidth = Math.max(1, object.getScaledWidth());
    const objectHeight = Math.max(1, object.getScaledHeight());
    const availableWidth = Math.max(1, viewportWidth - targetPadding * 2);
    const availableHeight = Math.max(1, viewportHeight - targetPadding * 2);
    const paddedZoom = Math.min(currentZoom, availableWidth / objectWidth, availableHeight / objectHeight);
    const zoom = Math.max(0.05, paddedZoom);
    const objectCenterX = Number(object.left ?? 0);
    const objectCenterY = Number(object.top ?? 0);

    canvas.setViewportTransform([
      zoom,
      0,
      0,
      zoom,
      viewportWidth / 2 - objectCenterX * zoom,
      viewportHeight / 2 - objectCenterY * zoom,
    ]);
    canvas.calcOffset();
  }, []);

  // (Old keyboard shortcuts removed - moved to the end of the hook to access scope variables)

  const applyRasterCropToImage = useCallback(async (object: FabricImageObject, crop: ImageCrop) => {
    const childImage = getImageChild(object);
    const metadata = ensureMetadata(object);
    const sourceElement = childImage?.getElement?.() ?? childImage?._element;
    const contextAvailable = typeof document !== 'undefined';

    if (!childImage || !sourceElement || !contextAvailable) {
      return false;
    }

    const natural = getImageNaturalSize(childImage);
    const scale = clamp(crop.scale || 1, 1, 4);
    const cropWidthRatio = clamp(crop.cropWidthRatio ?? 1 / scale, 0.01, 1);
    const cropHeightRatio = clamp(crop.cropHeightRatio ?? 1 / scale, 0.01, 1);
    const sourceWidth = Math.max(1, natural.width * cropWidthRatio);
    const sourceHeight = Math.max(1, natural.height * cropHeightRatio);
    const maxX = Math.max(0, natural.width - sourceWidth);
    const maxY = Math.max(0, natural.height - sourceHeight);
    const offsetX = clamp(crop.offsetX ?? 0, -100, 100);
    const offsetY = clamp(crop.offsetY ?? 0, -100, 100);
    const sourceX = maxX * ((offsetX + 100) / 200);
    const sourceY = maxY * ((offsetY + 100) / 200);
    const outputWidth = Math.max(1, Math.round(sourceWidth));
    const outputHeight = Math.max(1, Math.round(sourceHeight));
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = outputWidth;
    cropCanvas.height = outputHeight;

    const context = cropCanvas.getContext('2d');
    if (!context) return false;

    let croppedSrc: string;
    try {
      context.drawImage(
        sourceElement as CanvasImageSource,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        outputWidth,
        outputHeight,
      );
      croppedSrc = cropCanvas.toDataURL('image/png');
      await childImage.setSrc(croppedSrc);
    } catch {
      return false;
    }
    childImage.set({
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center',
      width: outputWidth,
      height: outputHeight,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      cropX: 0,
      cropY: 0,
      selectable: false,
      evented: false,
    });
    childImage.setCoords();

    if (object instanceof Group) {
      object.set({
        width: outputWidth,
        height: outputHeight,
        subTargetCheck: false,
        selectable: true,
        evented: true,
        hasControls: true,
      });
    } else if (object instanceof FabricImage) {
      object.set({
        width: outputWidth,
        height: outputHeight,
        cropX: 0,
        cropY: 0,
      });
    }

    metadata.src = croppedSrc;
    metadata.crop = {
      ...DEFAULT_IMAGE_CROP,
      enabled: false,
      frameWidth: outputWidth,
      frameHeight: outputHeight,
    };

    if (metadata.filters) {
      await applyFabricFiltersToImage(object, metadata.filters);
    }

    applyImageClip(object);
    childImage.setCoords();
    if (object instanceof Group) {
      object.getObjects().forEach((child) => {
        child.setCoords();
        child.dirty = true;
      });
    }
    object.dirty = true;
    childImage.dirty = true;
    object.setCoords();
    return true;
  }, []);
  const beginCropMode = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();
    cropViewportTransformRef.current = canvas.viewportTransform
      ? ([...canvas.viewportTransform] as [number, number, number, number, number, number])
      : null;

    const frameWidth = object.getScaledWidth();
    const frameHeight = object.getScaledHeight();
    const currentCrop = {
      ...DEFAULT_IMAGE_CROP,
      ...(metadata.crop ?? {}),
      frameWidth,
      frameHeight,
    };
    const normalizedCrop = {
      ...currentCrop,
      cropWidthRatio: currentCrop.cropWidthRatio ?? 1 / clamp(currentCrop.scale || 1, 1, 4),
      cropHeightRatio: currentCrop.cropHeightRatio ?? 1 / clamp(currentCrop.scale || 1, 1, 4),
    };
    setCropMode({
      layerId: metadata.layerId,
      initialCrop: { ...normalizedCrop },
      draft: { ...normalizedCrop, enabled: true },
      aspectRatio: null,
    });
    removeCropHelpersForImage(canvas, metadata.layerId);
    cropCanvasUniformScalingRef.current = (canvas as CanvasWithUniformScaling).uniformScaling;
    (canvas as CanvasWithUniformScaling).uniformScaling = false;
    applyImageCrop(object, { ...DEFAULT_IMAGE_CROP, enabled: false });
    clearImageClipForCrop(object);
    removeOutlineForImage(canvas, metadata.layerId);
    object.set({ hasControls: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true });
    syncCropBoxSafely(canvas, object, { ...normalizedCrop, enabled: true }, null);
    applyCropWorkspacePadding(canvas, object);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
  }, [applyCropWorkspacePadding, syncCropBoxSafely, syncLayersFromCanvas, triggerSaveHistory]);

  const updateCropModeDraft = useCallback((patch: Partial<ImageCrop>) => {
    if (!cropMode) return;
    const ratioPatch = patch.scale !== undefined && patch.cropWidthRatio === undefined && patch.cropHeightRatio === undefined
      ? {
          cropWidthRatio: 1 / clamp(patch.scale, 1, 4),
          cropHeightRatio: 1 / clamp(patch.scale, 1, 4),
        }
      : {};
    const nextCrop = {
      ...cropMode.draft,
      ...patch,
      ...ratioPatch,
      enabled: patch.enabled ?? true,
    };
    setCropMode((current) => current ? { ...current, draft: nextCrop } : current);
    const object = findObjectByLayerId(cropMode.layerId) as FabricImageObject | null;
    const canvas = fabricCanvasRef.current;
    if (!object || !canvas) return;
    syncCropBoxSafely(canvas, object, nextCrop, cropMode.aspectRatio);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
  }, [cropMode, findObjectByLayerId, syncCropBoxSafely, syncLayersFromCanvas]);

  const endCropMode = useCallback(async (commit: boolean) => {
    if (!cropMode) return;
    const canvas = fabricCanvasRef.current;
    const object = findObjectByLayerId(cropMode.layerId) as FabricImageObject | null;

    if (canvas && object) {
      if (commit) {
        triggerSaveHistory();
      }
      const cropBox = getCropBoxForImage(canvas, cropMode.layerId);
      if (commit && cropBox && cropMode.aspectRatio !== null) {
        normalizeCropBoxToAspectRatio(object, cropBox, cropMode.aspectRatio);
      }
      const finalCrop = commit && cropBox ? boxGeometryToCrop(object, cropBox) : cropMode.draft;
      removeCropHelpersForImage(canvas, cropMode.layerId);
      if (commit) {
        const didApplyRasterCrop = await applyRasterCropToImage(object, finalCrop);
        if (!didApplyRasterCrop) {
          applyImageCrop(object, cropMode.initialCrop);
        }
      } else {
        applyImageCrop(object, cropMode.initialCrop);
      }
      syncImageOutline(canvas, object);
      object.set({ hasControls: true, lockMovementX: false, lockMovementY: false, lockScalingX: false, lockScalingY: false, lockRotation: false });
      object.setCoords();
      if (commit) {
        canvas.discardActiveObject();
      }
      canvas.setActiveObject(object);
      canvas.calcOffset();
      canvas.requestRenderAll();
    }

    if (canvas && cropCanvasUniformScalingRef.current !== undefined) {
      (canvas as CanvasWithUniformScaling).uniformScaling = cropCanvasUniformScalingRef.current;
    }
    cropCanvasUniformScalingRef.current = undefined;

    if (canvas && cropViewportTransformRef.current) {
      canvas.setViewportTransform(cropViewportTransformRef.current);
      canvas.calcOffset();
      canvas.requestRenderAll();
    }
    cropViewportTransformRef.current = null;

    setCropMode(null);
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [applyRasterCropToImage, cropMode, findObjectByLayerId, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const resetCropMode = useCallback(() => {
    if (!cropMode) return;
    setCropMode((current) => current ? { ...current, aspectRatio: null } : current);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      (canvas as CanvasWithUniformScaling).uniformScaling = false;
    }
    updateCropModeDraft({
      ...DEFAULT_IMAGE_CROP,
      enabled: false,
      frameWidth: cropMode.draft.frameWidth,
      frameHeight: cropMode.draft.frameHeight,
    });
  }, [cropMode, updateCropModeDraft]);

  const setCropAspectRatio = useCallback((aspectRatio: number | null) => {
    if (!cropMode) return;

    const canvas = fabricCanvasRef.current;
    const object = findObjectByLayerId(cropMode.layerId) as FabricImageObject | null;
    const nextCrop = aspectRatio === null
      ? cropMode.draft
      : fitCropToAspectRatio(cropMode.draft, aspectRatio);

    if (canvas) {
      (canvas as CanvasWithUniformScaling).uniformScaling = aspectRatio !== null;
    }

    setCropMode((current) => current ? { ...current, aspectRatio, draft: nextCrop } : current);

    if (canvas && object) {
      syncCropBoxSafely(canvas, object, nextCrop, aspectRatio);
      canvas.requestRenderAll();
      syncLayersFromCanvas();
    }
  }, [cropMode, findObjectByLayerId, syncCropBoxSafely, syncLayersFromCanvas]);

  const setCanvasDimensions = useCallback((size: CanvasSize) => {
    triggerSaveHistory();
    setCanvasSizeState({
      width: clampCanvasSize(size.width),
      height: clampCanvasSize(size.height),
    });
  }, [triggerSaveHistory]);

  const scheduleCanvasRender = useCallback((canvas: Canvas) => {
    if (typeof window === 'undefined') {
      canvas.requestRenderAll();
      return;
    }
    if (renderFrameRef.current !== null) return;
    renderFrameRef.current = window.requestAnimationFrame(() => {
      renderFrameRef.current = null;
      canvas.requestRenderAll();
    });
  }, []);

  const {
    applyAlignmentGuidesAndSnap,
    clearAlignmentGuides,
    isSyncingAlignmentGuidesRef,
  } = useAlignmentGuides({
    canvasSizeRef,
    cropRepositionModeRef,
    alignmentGuidesEnabledRef,
    scheduleCanvasRender,
  });
  // Initialization & Event Handling
  useEffect(() => {
    beginCropRepositionRef.current = beginCropReposition;
  }, [beginCropReposition]);

  useEffect(() => {
    finishCropRepositionRef.current = finishCropReposition;
  }, [finishCropReposition]);

  const drawMaskBrush = useCallback((pointer: { x: number; y: number }) => {
    const canvas = fabricCanvasRef.current;
    const object = maskEditImageRef.current;
    if (!canvas || !object) return;

    const target = object instanceof Group ? (getImageChild(object) ?? object) : object;
    const maskCanvas = (target as any).__maskCanvas as HTMLCanvasElement | undefined;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    const invertMatrix = util.invertTransform(target.calcTransformMatrix());
    const localPoint = util.transformPoint(pointer, invertMatrix);
    const maskX = localPoint.x + (target.width ?? 0) / 2;
    const maskY = localPoint.y + (target.height ?? 0) / 2;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (maskBrushToolRef.current === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = '#ffffff';
    }

    ctx.lineWidth = maskBrushSizeRef.current;

    ctx.beginPath();
    if (lastMaskPointRef.current) {
      ctx.moveTo(lastMaskPointRef.current.x, lastMaskPointRef.current.y);
      ctx.lineTo(maskX, maskY);
      ctx.stroke();
    } else {
      ctx.arc(maskX, maskY, maskBrushSizeRef.current / 2, 0, Math.PI * 2);
      ctx.fillStyle = maskBrushToolRef.current === 'erase' ? 'rgba(0,0,0,1)' : '#ffffff';
      ctx.fill();
    }
    ctx.restore();

    lastMaskPointRef.current = { x: maskX, y: maskY };

    if (target.clipPath) {
      target.clipPath.dirty = true;
    }
    target.dirty = true;
    if (target.group) {
      target.group.dirty = true;
    }
    canvas.requestRenderAll();
  }, [fabricCanvasRef]);

  const beginMaskEdit = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const object = canvas.getActiveObject();
    const metadata = object ? getMetadata(object) : null;
    if (!object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    const target = object instanceof Group ? (getImageChild(object) ?? object) : object;
    let maskCanvas = (target as any).__maskCanvas;
    if (!maskCanvas) {
      const { applyLayerMask } = await import('../utils/fabricHelpers');
      maskCanvas = await applyLayerMask(object, metadata.maskDataUrl);
    }

    maskEditImageRef.current = object;

    // Disable all other objects
    canvas.getObjects().forEach((o) => {
      if (o !== object) {
        (o as any).__originalEvented = o.evented;
        (o as any).__originalSelectable = o.selectable;
        o.set({ evented: false, selectable: false });
      }
    });

    // Disable the active object selection/movement
    (object as any).__originalSelectable = object.selectable;
    (object as any).__originalEvented = object.evented;
    (object as any).__originalHasControls = object.hasControls;

    object.set({
      selectable: false,
      evented: false,
      objectCaching: false,
    });

    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.requestRenderAll();
    setMaskEditMode(true);
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  const finishMaskEdit = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const object = maskEditImageRef.current;
    if (object) {
      // Restore active object properties
      object.set({
        selectable: (object as any).__originalSelectable !== undefined ? (object as any).__originalSelectable : true,
        evented: (object as any).__originalEvented !== undefined ? (object as any).__originalEvented : true,
        hasControls: (object as any).__originalHasControls !== undefined ? (object as any).__originalHasControls : true,
        objectCaching: true,
      });

      // Save maskDataUrl in metadata so it is persisted
      const target = object instanceof Group ? (getImageChild(object) ?? object) : object;
      const maskCanvas = (target as any).__maskCanvas as HTMLCanvasElement | undefined;
      const metadata = getMetadata(object);
      if (maskCanvas && metadata) {
        metadata.maskDataUrl = maskCanvas.toDataURL('image/png');
      }

      // Restore other objects
      canvas.getObjects().forEach((o) => {
        if (o !== object) {
          o.set({
            evented: (o as any).__originalEvented !== undefined ? (o as any).__originalEvented : o.evented,
            selectable: (o as any).__originalSelectable !== undefined ? (o as any).__originalSelectable : o.selectable,
          });
        }
      });

      canvas.setActiveObject(object);
    }

    canvas.selection = true;
    maskEditImageRef.current = null;
    setMaskEditMode(false);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas]);

  const toggleMaskLink = useCallback((layerId: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const object = findObjectByLayerId(layerId);
    if (!object) return;

    const metadata = getMetadata(object);
    if (!metadata || metadata.layerType !== 'image') return;

    triggerSaveHistory();

    const nextLinked = metadata.maskLinked === false;
    metadata.maskLinked = nextLinked;

    const target = object instanceof Group ? (getImageChild(object) ?? object) : object;
    const clipPath = target.clipPath;
    if (clipPath) {
      if (!nextLinked) {
        const center = target.getPointByOrigin('center', 'center');
        let absoluteAngle = target.angle ?? 0;
        let curr: any = target.group;
        while (curr) {
          absoluteAngle += curr.angle ?? 0;
          curr = curr.group;
        }
        clipPath.set({
          absolutePositioned: true,
          left: center.x,
          top: center.y,
          scaleX: (object.group ? object.group.scaleX : 1) * (target.scaleX ?? 1),
          scaleY: (object.group ? object.group.scaleY : 1) * (target.scaleY ?? 1),
          angle: absoluteAngle,
        });
      } else {
        clipPath.set({
          absolutePositioned: false,
          left: 0,
          top: 0,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
        });
      }
      clipPath.dirty = true;
    }

    target.dirty = true;
    if (target.group) {
      target.group.dirty = true;
    }

    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [findObjectByLayerId, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  useEffect(() => {
    const canvasElement = canvasElementRef.current;
    if (!canvasElement || fabricCanvasRef.current) return;

    const canvas = new Canvas(canvasElement, {
      backgroundColor: background.color,
      preserveObjectStacking: true,
      selection: true,
      controlsAboveOverlay: true,
      enableRetinaScaling: true,
      allowTouchScrolling: false,
    });

    fabricCanvasRef.current = canvas;
    canvas.setDimensions({ width: canvasSize.width, height: canvasSize.height });

    const handleBeforeTransform = () => {
      triggerSaveHistory();
      repositionChildStartPosRef.current = null;
    };

    const handleObjectChange = (event?: { target?: FabricObject }, cropInteraction: 'moving' | 'scaling' | 'rotating' | 'modified' = 'modified') => {
      const target = event?.target;

      if (target && target.type === 'image' && target.group && cropRepositionModeRef.current) {
        setCropZoom(target.scaleX ?? 1);
        setCropAngle(target.angle ?? 0);
      } else if (target instanceof Group && cropRepositionModeRef.current) {
        const child = getImageChild(target);
        if (child) {
          setCropZoom(child.scaleX ?? 1);
          setCropAngle(child.angle ?? 0);
        }
      }

      const isCropHelperObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.cropHelperForLayerId);
      const isAlignmentGuideObjectLocal = (obj: FabricObject) => Boolean((obj as any).data?.alignmentGuide);

      if (target && isAlignmentGuideObjectLocal(target)) {
        return;
      }

      if (isSyncingAlignmentGuidesRef.current) {
        return;
      }

      if (target && isCropHelperObjectLocal(target)) {
        if (isSyncingCropHelpersRef.current) {
          return;
        }
        if (canvas.getObjects().includes(target)) {
          syncCropFromBoxRef.current(target, cropInteraction === 'rotating' ? 'modified' : cropInteraction);
        }
        syncLayersRef.current();
        return;
      }

      if (target && isPlaceholderObject(target)) {
        syncLayersRef.current();
        return;
      }

      const metadata = target ? getMetadata(target) : undefined;

      if (target && metadata?.layerType === 'image') {
        if (canvas.getObjects().includes(target)) {
          if (!metadata.collageCell) {
            applyImageClip(target as FabricImageObject);
            syncImageOutline(canvas, target as FabricImageObject, repositionFrameRectRef.current);
          }
        } else {
          removeOutlineForImage(canvas, metadata.layerId);
        }
      }

      if (target && metadata?.layerType === 'text') {
        if (canvas.getObjects().includes(target)) {
          syncTextBackgroundBox(canvas, target as FabricLayerObject);
        } else {
          removeTextBackgroundBox(canvas, metadata.layerId);
        }
      }
      syncLayersRef.current();
      syncSelectionRef.current();
    };

    const handleSelection = () => {
      syncSelectionRef.current();
    };
    const handleSelectionCleared = () => {
      setSelection(null);
      setSelectedLayerId(null);
      setSelectedCollageCellIndex(null);
      setSelectionCoords(null);
    };
    const handleObjectModified = (event?: { target?: FabricObject }) => {
      repositionChildStartPosRef.current = null;
      clearAlignmentGuides(canvas);
      handleObjectChange(event, 'modified');
    };
    const getRepositionMoveDamping = (event?: Event) => {
      const pointerType = event instanceof PointerEvent ? event.pointerType : '';
      const isTouchLike = pointerType === 'touch' || pointerType === 'pen' ||
        (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
      return isTouchLike ? 0.1 : 0.15;
    };
    const handleObjectMoving = (event?: { target?: FabricObject; e?: Event }) => {
      setSelectionCoords(null);
      const target = event?.target;
      if (target && cropRepositionModeRef.current) {
        if (target instanceof Group && repositionFrameRectRef.current) {
          const metadata = getMetadata(target);
          const child = metadata?.layerType === 'image' ? getImageChild(target) : null;
          if (child) {
            const frameRect = repositionFrameRectRef.current;
            const frameCenterX = frameRect.left + frameRect.width / 2;
            const frameCenterY = frameRect.top + frameRect.height / 2;
            const dx = Number(target.left ?? frameCenterX) - frameCenterX;
            const dy = Number(target.top ?? frameCenterY) - frameCenterY;
            const angle = -((target.angle ?? 0) * Math.PI) / 180;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const scaleX = target.scaleX || 1;
            const scaleY = target.scaleY || 1;
            const damping = getRepositionMoveDamping(event.e);
            const localDx = ((dx * cos - dy * sin) / scaleX) * damping;
            const localDy = ((dx * sin + dy * cos) / scaleY) * damping;

            if (!repositionChildStartPosRef.current) {
              repositionChildStartPosRef.current = {
                left: child.left ?? 0,
                top: child.top ?? 0,
              };
            }
            const childStart = repositionChildStartPosRef.current;

            child.set({
              left: childStart.left + localDx,
              top: childStart.top + localDy,
            });
            target.set({
              left: frameCenterX,
              top: frameCenterY,
            });
            child.setCoords();
            target.setCoords();
            canvas.setActiveObject(target);
            setCropZoomRef.current(child.scaleX ?? 1);
            setCropAngleRef.current(child.angle ?? 0);
            syncImageOutline(canvas, target, frameRect);
            scheduleCanvasRender(canvas);
            return;
          }
        }
        // In reposition mode the image must be able to slide freely under
        // the clipping mask (Photopea-style).  We do NOT hard-clamp position
        // here ??finishCropReposition will capture whatever position the user
        // chose and convert it back to cropFocusX/Y.
        // (Previously this block clamped to minLeft/maxLeft which made the
        // image feel locked to the visible clip area.)
      }
      if (target && !cropRepositionModeRef.current) {
        applyAlignmentGuidesAndSnap(canvas, target);
      }
      handleObjectChange(event, 'moving');
    };
    const handleCanvasMouseDown = (options: any) => {
      if (maskEditModeRef.current) {
        const pointer = canvas.getPointer(options.e);
        isDrawingMaskRef.current = true;
        lastMaskPointRef.current = null;
        if (maskDrawToolRef.current === 'brush') {
          drawMaskBrush(pointer);
        } else if (maskDrawToolRef.current === 'rectangle' || maskDrawToolRef.current === 'circle') {
          maskStartPointRef.current = pointer;
        }
      }
    };

    const handleCanvasMouseMove = (options: any) => {
      if (maskEditModeRef.current && isDrawingMaskRef.current) {
        const pointer = canvas.getPointer(options.e);
        if (maskDrawToolRef.current === 'brush') {
          drawMaskBrush(pointer);
        } else if (maskDrawToolRef.current === 'rectangle' && maskStartPointRef.current) {
          const start = maskStartPointRef.current;
          const left = Math.min(start.x, pointer.x);
          const top = Math.min(start.y, pointer.y);
          const width = Math.abs(start.x - pointer.x);
          const height = Math.abs(start.y - pointer.y);

          if (!maskDragRectRef.current) {
            const dragRect = new Rect({
              left,
              top,
              width,
              height,
              fill: maskBrushToolRef.current === 'erase' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
              stroke: maskBrushToolRef.current === 'erase' ? '#ef4444' : '#10b981',
              strokeWidth: 1.5,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
            });
            canvas.add(dragRect);
            maskDragRectRef.current = dragRect;
          } else {
            maskDragRectRef.current.set({ left, top, width, height });
          }
          canvas.requestRenderAll();
        } else if (maskDrawToolRef.current === 'circle' && maskStartPointRef.current) {
          const start = maskStartPointRef.current;
          const left = Math.min(start.x, pointer.x);
          const top = Math.min(start.y, pointer.y);
          const width = Math.abs(start.x - pointer.x);
          const height = Math.abs(start.y - pointer.y);

          if (!maskDragRectRef.current) {
            const dragEllipse = new Ellipse({
              left,
              top,
              rx: width / 2,
              ry: height / 2,
              fill: maskBrushToolRef.current === 'erase' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
              stroke: maskBrushToolRef.current === 'erase' ? '#ef4444' : '#10b981',
              strokeWidth: 1.5,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
            });
            canvas.add(dragEllipse);
            maskDragRectRef.current = dragEllipse;
          } else {
            maskDragRectRef.current.set({
              left,
              top,
              rx: width / 2,
              ry: height / 2,
            });
          }
          canvas.requestRenderAll();
        }
      }
    };

    const handleMouseUp = (options: any) => {
      isDrawingMaskRef.current = false;
      lastMaskPointRef.current = null;
      clearAlignmentGuides(canvas);

      if (maskEditModeRef.current && (maskDrawToolRef.current === 'rectangle' || maskDrawToolRef.current === 'circle') && maskStartPointRef.current) {
        const object = maskEditImageRef.current;
        if (object) {
          const pointer = canvas.getPointer(options.e);
          const start = maskStartPointRef.current;

          if (maskDragRectRef.current) {
            canvas.remove(maskDragRectRef.current);
            maskDragRectRef.current = null;
          }

          const target = object instanceof Group ? (getImageChild(object) ?? object) : object;
          const maskCanvas = (target as any).__maskCanvas as HTMLCanvasElement | undefined;
          if (maskCanvas) {
            const ctx = maskCanvas.getContext('2d');
            if (ctx) {
              const invertMatrix = util.invertTransform(target.calcTransformMatrix());
              const w = target.width ?? 100;
              const h = target.height ?? 100;
              const m = util.multiplyTransformMatrices([1, 0, 0, 1, w / 2, h / 2], invertMatrix);

              ctx.save();
              ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

              if (maskBrushToolRef.current === 'erase') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = 'rgba(0,0,0,1)';
              } else {
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#ffffff';
              }

              if (maskDrawToolRef.current === 'rectangle') {
                const x = Math.min(start.x, pointer.x);
                const y = Math.min(start.y, pointer.y);
                const width = Math.abs(start.x - pointer.x);
                const height = Math.abs(start.y - pointer.y);
                ctx.fillRect(x, y, width, height);
              } else if (maskDrawToolRef.current === 'circle') {
                const cx = (start.x + pointer.x) / 2;
                const cy = (start.y + pointer.y) / 2;
                const rx = Math.abs(start.x - pointer.x) / 2;
                const ry = Math.abs(start.y - pointer.y) / 2;
                ctx.beginPath();
                ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                ctx.fill();
              }

              ctx.restore();

              if (target.clipPath) {
                target.clipPath.dirty = true;
              }
              target.dirty = true;
              if (target.group) {
                target.group.dirty = true;
              }
            }
          }
        }
        maskStartPointRef.current = null;
        canvas.requestRenderAll();
      }
    };

    const handleObjectScaling = (event?: { target?: FabricObject }) => {
      setSelectionCoords(null);
      handleObjectChange(event, 'scaling');
    };

    const handleObjectRotating = (event?: { target?: FabricObject }) => {
      setSelectionCoords(null);
      handleObjectChange(event, 'rotating');
    };

    const handleMouseWheel = (event: any) => {
      if (cropRepositionModeRef.current) {
        event.e.preventDefault();
        event.e.stopPropagation();
        
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        
        const activeObject = canvas.getActiveObject();
        const target = activeObject instanceof Group
          ? getImageChild(activeObject)
          : activeObject as FabricImageObject | null;
        if (!target) return;

        if (target.type === 'image' && target.group && repositionFrameRectRef.current) {
          const group = target.group;
          const natural = getImageNaturalSize(target);
          const naturalW = Math.max(1, natural.width);
          const naturalH = Math.max(1, natural.height);
          const minScale = Math.max((group.width ?? 100) / naturalW, (group.height ?? 100) / naturalH);
          const maxScale = minScale * 5;
          const delta = event.e.deltaY;
          const zoomFactor = 0.999 ** delta;
          const newScale = Math.max(minScale, Math.min(maxScale, (target.scaleX ?? minScale) * zoomFactor));

          target.set({
            scaleX: newScale,
            scaleY: newScale,
          });
          target.setCoords();
          group.setCoords();
          canvas.setActiveObject(group);
          setCropZoomRef.current(newScale);
          syncImageOutline(canvas, group, repositionFrameRectRef.current);
          scheduleCanvasRender(canvas);
          return;
        }
        
        const meta = getMetadata(target);
        if (!meta) return;
        
        if (meta.collageCell) {
          const collage = activeCollageRef.current;
          if (!collage) return;
          const layout = getCollageLayoutById(collage.layoutId);
          if (!layout) return;
          
          const cell = layout.cells[meta.collageCell.cellIndex];
          if (!cell) return;
          
          const cw = canvasSizeRef.current.width;
          const ch = canvasSizeRef.current.height;
          const rect = computeCellRect(cell, cw, ch, collage);
          
          const natural = getImageNaturalSize(target);
          const naturalW = Math.max(1, natural.width);
          const naturalH = Math.max(1, natural.height);
          
          const minScale = Math.max(rect.width / naturalW, rect.height / naturalH);
          const maxScale = Math.max(1.0, minScale * 4);
          
          const delta = event.e.deltaY;
          const zoomFactor = 0.999 ** delta;
          let newScale = (target.scaleX ?? 1) * zoomFactor;
          newScale = Math.max(minScale, Math.min(maxScale, newScale));
          
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
          target.setCoords();
          setCropZoomRef.current(newScale);
          scheduleCanvasRender(canvas);
        } else if (meta.layerType === 'image' && repositionFrameRectRef.current) {
          const frameRect = repositionFrameRectRef.current;
          const natural = getImageNaturalSize(target);
          const naturalW = Math.max(1, natural.width);
          const naturalH = Math.max(1, natural.height);
          
          const minScale = Math.max(frameRect.width / naturalW, frameRect.height / naturalH);
          const maxScale = Math.max(1.0, minScale * 4);
          
          const delta = event.e.deltaY;
          const zoomFactor = 0.999 ** delta;
          let newScale = (target.scaleX ?? 1) * zoomFactor;
          newScale = Math.max(minScale, Math.min(maxScale, newScale));
          
          const scaledW = naturalW * (target.scaleX ?? 1);
          const scaledH = naturalH * (target.scaleY ?? 1);
          const minLeft = frameRect.left + frameRect.width - scaledW / 2;
          const maxLeft = frameRect.left + scaledW / 2;
          const minTop = frameRect.top + frameRect.height - scaledH / 2;
          const maxTop = frameRect.top + scaledH / 2;

          let focusX = 0.5;
          if (maxLeft !== minLeft) focusX = (maxLeft - (target.left ?? 0)) / (maxLeft - minLeft);
          let focusY = 0.5;
          if (maxTop !== minTop) focusY = (maxTop - (target.top ?? 0)) / (maxTop - minTop);

          applyCollageImageFocus(target, frameRect, focusX, focusY, newScale);
          target.setCoords();
          setCropZoomRef.current(newScale);
          syncImageOutline(canvas, target, frameRect);
          scheduleCanvasRender(canvas);
        }
      }
    };

    canvas.on('before:transform', handleBeforeTransform);
    canvas.on('object:added', handleObjectChange);
    canvas.on('object:removed', handleObjectChange);
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:moving', handleObjectMoving);
    canvas.on('object:scaling', handleObjectScaling);
    canvas.on('object:rotating', handleObjectRotating);
    canvas.on('text:changed', handleObjectChange);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('mouse:wheel', handleMouseWheel);
    canvas.on('mouse:up', handleMouseUp);
    canvas.on('mouse:down', handleCanvasMouseDown);
    canvas.on('mouse:move', handleCanvasMouseMove);

    void applyBackground(background);
    syncLayersRef.current();

    return () => {
      canvas.off('before:transform', handleBeforeTransform);
      canvas.off('object:added', handleObjectChange);
      canvas.off('object:removed', handleObjectChange);
      canvas.off('object:modified', handleObjectModified);
      canvas.off('object:moving', handleObjectMoving);
      canvas.off('object:scaling', handleObjectScaling);
      canvas.off('object:rotating', handleObjectRotating);
      canvas.off('text:changed', handleObjectChange);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('mouse:wheel', handleMouseWheel);
      canvas.off('mouse:up', handleMouseUp);
      canvas.off('mouse:down', handleCanvasMouseDown);
      canvas.off('mouse:move', handleCanvasMouseMove);
      clearAlignmentGuides(canvas);
      if (renderFrameRef.current !== null) {
        window.cancelAnimationFrame(renderFrameRef.current);
        renderFrameRef.current = null;
      }
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  useCanvasTouchGestures({
    canvasElementRef,
    fabricCanvasRef,
    lastContainerRef,
    fitToContainerRef,
    cropRepositionModeRef,
    scheduleCanvasRender,
  });

  // Dynamic cursor style based on brush size, image scale, and canvas zoom
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !maskEditMode) {
      if (canvas) {
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      }
      return;
    }

    if (maskDrawTool === 'rectangle' || maskDrawTool === 'circle') {
      canvas.defaultCursor = 'crosshair';
      canvas.hoverCursor = 'crosshair';
      if (canvas.upperCanvasEl) {
        canvas.upperCanvasEl.style.cursor = 'crosshair';
      }
      return;
    }

    const object = maskEditImageRef.current;
    if (!object) return;

    const target = object instanceof Group ? (getImageChild(object) ?? object) : object;
    const zoom = canvas.getZoom();
    const scaleX = (object.group ? object.group.scaleX : 1) * (target.scaleX ?? 1);
    
    // Calculate actual screen size of the brush
    const screenBrushSize = Math.max(4, Math.round(maskBrushSize * scaleX * zoom));
    
    // Cap cursor size to avoid browser limits (typically 128px)
    const cursorSize = Math.min(128, screenBrushSize);
    const radius = cursorSize / 2;
    
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${cursorSize + 4}" height="${cursorSize + 4}" viewBox="0 0 ${cursorSize + 4} ${cursorSize + 4}">
        <circle cx="${cursorSize / 2 + 2}" cy="${cursorSize / 2 + 2}" r="${radius}" fill="none" stroke="#ffffff" stroke-width="1.5" />
        <circle cx="${cursorSize / 2 + 2}" cy="${cursorSize / 2 + 2}" r="${radius}" fill="none" stroke="#000000" stroke-width="0.5" />
      </svg>
    `;
    const encoded = btoa(svg);
    const url = `data:image/svg+xml;base64,${encoded}`;
    const hotspot = cursorSize / 2 + 2;
    
    canvas.defaultCursor = `url(${url}) ${hotspot} ${hotspot}, crosshair`;
    canvas.hoverCursor = `url(${url}) ${hotspot} ${hotspot}, crosshair`;
    
    // Force CSS cursor update on the upper canvas element
    if (canvas.upperCanvasEl) {
      canvas.upperCanvasEl.style.cursor = `url(${url}) ${hotspot} ${hotspot}, crosshair`;
    }
  }, [maskEditMode, maskBrushSize, maskDrawTool, layers]);

  useEffect(() => {
    void applyBackground(background);
    syncLayersFromCanvas();
  }, [applyBackground, background, syncLayersFromCanvas]);

  useEffect(() => {
    fitToContainer(lastContainerRef.current);
    void applyBackground(background);
  }, [applyBackground, background, canvasSize, fitToContainer]);

  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const collage = activeCollageRef.current;
    if (!canvas || !collage) return;

    const layout = getCollageLayoutById(collage.layoutId);
    if (!layout) return;

    const { radiusPx, collageId } = collage;
    const cw = canvasSize.width;
    const ch = canvasSize.height;

    canvas.getObjects().forEach((obj) => {
      const meta = getMetadata(obj);
      if (meta?.collageCell?.collageId === collageId) {
        const cell = layout.cells[meta.collageCell.cellIndex];
        if (!cell) return;
          const rect = computeCellRect(cell, cw, ch, collage);
          const image = obj as FabricImageObject;
        applyCollageImageFocus(image, rect, meta.collageCell.cropFocusX, meta.collageCell.cropFocusY, meta.collageCell.cropZoom);
        applyCollageCellFrame(image, rect, radiusPx, meta.collageCell.clipType);
        image.setCoords();
        return;
      }

      const phData = (obj as FabricPlaceholderObject).data;
      if (phData?.placeholderForCollageId === collageId) {
        const cell = layout.cells[phData.placeholderCellIndex];
        if (!cell) return;
        const rect = computeCellRect(cell, cw, ch, collage);
        const rx = Math.max(0, Math.min(radiusPx, rect.width / 2, rect.height / 2));
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

    canvas.requestRenderAll();
    syncLayersFromCanvas();
  }, [canvasSize.width, canvasSize.height, syncLayersFromCanvas]);

  // Keyboard Shortcuts (Nudge, Delete, Undo/Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // 1. Undo / Redo
      if (ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          void redo();
        } else {
          void undo();
        }
        return;
      } else if (ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        void redo();
        return;
      }

      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObject = canvas.getActiveObject();
      if (!activeObject) return;

      // 2. Delete / Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeObject instanceof Textbox && (activeObject as any).isEditing) {
          return;
        }
        e.preventDefault();
        deleteSelected();
        return;
      }

      // 3. Arrow Keys Nudge
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (isObjectLocked(activeObject)) return;

        e.preventDefault();

        if (!isNudgingRef.current) {
          triggerSaveHistory();
          isNudgingRef.current = true;
        }

        const step = e.shiftKey ? 10 : 1;
        if (e.key === 'ArrowUp') {
          activeObject.set('top', (activeObject.top ?? 0) - step);
        } else if (e.key === 'ArrowDown') {
          activeObject.set('top', (activeObject.top ?? 0) + step);
        } else if (e.key === 'ArrowLeft') {
          activeObject.set('left', (activeObject.left ?? 0) - step);
        } else if (e.key === 'ArrowRight') {
          activeObject.set('left', (activeObject.left ?? 0) + step);
        }

        activeObject.setCoords();
        canvas.requestRenderAll();
        // Hide selection coords during nudge to avoid quick toolbar jitter
        setSelectionCoords(null);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (isNudgingRef.current) {
          isNudgingRef.current = false;
          const canvas = fabricCanvasRef.current;
          if (canvas) {
            const activeObject = canvas.getActiveObject();
            if (activeObject) {
              activeObject.setCoords();
              canvas.fire('object:modified', { target: activeObject });
            }
          }
          syncSelectionFromCanvas();
          syncLayersFromCanvas();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [undo, redo, deleteSelected, syncSelectionFromCanvas, syncLayersFromCanvas, triggerSaveHistory]);

  const loadProjectWrapped = useCallback(async (project: CollageProjectFile) => {
    await loadProject(project);
    clearHistory();
  }, [loadProject, clearHistory]);

  return useMemo(() => ({
    canvasElementRef,
    canvasSize,
    background,
    cropMode,
    layers,
    selection,
    selectionCoords,
    selectedLayerId,
    selectedLayerIds,
    activeCollage,
    selectedCollageCellIndex,
    cropRepositionMode,
    maskEditMode,
    setMaskEditMode,
    maskBrushSize,
    setMaskBrushSize,
    maskBrushTool,
    setMaskBrushTool,
    maskDrawTool,
    setMaskDrawTool,
    beginMaskEdit,
    finishMaskEdit,
    toggleMaskLink,
    cropZoom,
    cropMinZoom,
    cropMaxZoom,
    cropAngle,
    alignmentGuidesEnabled,
    setAlignmentGuidesEnabled,
    setCanvasDimensions,
    setBackgroundColor,
    setBackgroundMode,
    setBackgroundFit,
    setBackgroundImageFromFile,
    removeBackgroundImage,
    addImageFromFile,
    addOverlayFromFile,
    addBuiltInAsset,
    addAdjustmentLayer,
    updateSelectedAdjustment,
    applyCollageLayout,
    changeCollageLayout,
    updateCollageGap,
    updateCollageRadius,
    updateCollageCellClip,
    fillCollageCells,
    beginCropReposition,
    finishCropReposition,
    updateCropAngle,
    fitImageToFrame,
    resetCropFocus,
    updateCropZoom,
    setCropZoom,
    addText,
    addShape,
    updateSelectedImageStroke,
    updateSelectedImageClip,
    updateSelectedImageCrop,
    flipSelectedImage,
    replaceSelectedImage,
    updateSelectedImageFilters,
    updateSelectedImageShadow,
    updateSelectedOpacity,
    createBackgroundBlur,

    beginCropMode,
    updateCropModeDraft,
    setCropAspectRatio,
    finishCropMode: () => endCropMode(true),
    cancelCropMode: () => endCropMode(false),
    resetCropMode,
    updateSelectedText,
    updateSelectedShape,
    selectLayer,
    updateLayerVisibility,
    updateLayerLock,
    updateLayerBlendMode,
    updateLayerOpacity,
    updateSelectedScale,
    moveLayer,
    deleteLayer,
    deleteSelected,
    removeSelectedCollageSlotImage: deleteSelected,
    duplicateSelected,
    duplicateLayer,
    lockSelected,
    setBackgroundImageFromUrl,
    renameLayer,
    reorderLayer,
    createProject,
    loadProject: loadProjectWrapped,
    clearHistory,
    exportPng,
    exportImage,
    fitToContainer,
    undo,
    redo,
    canUndo,
    canRedo,
    alignSelectedObjects,
    isMultiSelect,
    selectedCount,
    groupSelected,
    ungroupSelected,

  }), [
    activeCollage,
    alignmentGuidesEnabled,
    selectedCollageCellIndex,
    cropRepositionMode,
    maskEditMode,
    maskBrushSize,
    maskBrushTool,
    maskDrawTool,
    setMaskDrawTool,
    beginMaskEdit,
    finishMaskEdit,
    toggleMaskLink,
    cropZoom,
    cropMinZoom,
    cropMaxZoom,
    cropAngle,
    addImageFromFile,
    addOverlayFromFile,
    addBuiltInAsset,
    addAdjustmentLayer,
    updateSelectedAdjustment,
    applyCollageLayout,
    changeCollageLayout,
    updateCollageGap,
    updateCollageRadius,
    updateCollageCellClip,
    fillCollageCells,
    beginCropReposition,
    finishCropReposition,
    updateCropAngle,
    fitImageToFrame,
    resetCropFocus,
    updateCropZoom,
    setCropZoom,
    addShape,
    addText,
    background,
    beginCropMode,
    canvasSize,
    createProject,
    cropMode,
    deleteLayer,
    deleteSelected,
    duplicateSelected,
    duplicateLayer,
    endCropMode,
    exportPng,
    exportImage,
    fitToContainer,
    layers,
    loadProjectWrapped,
    clearHistory,
    lockSelected,
    moveLayer,
    removeBackgroundImage,
    resetCropMode,
    selectLayer,
    selectedLayerId,
    selectedLayerIds,
    selection,
    selectionCoords,
    setBackgroundColor,
    setBackgroundFit,
    setBackgroundImageFromFile,
    setBackgroundImageFromUrl,
    setBackgroundMode,
    setCanvasDimensions,
    setCropAspectRatio,
    updateCropModeDraft,
    updateLayerLock,
    updateLayerVisibility,
    updateLayerBlendMode,
    updateLayerOpacity,
    updateSelectedScale,
    updateSelectedImageClip,
    updateSelectedImageCrop,
    updateSelectedImageStroke,
    flipSelectedImage,
    replaceSelectedImage,
    updateSelectedImageFilters,
    updateSelectedImageShadow,
    updateSelectedOpacity,
    createBackgroundBlur,
    updateSelectedShape,
    updateSelectedText,
    renameLayer,
    reorderLayer,
    undo,
    redo,
    canUndo,
    canRedo,
    alignSelectedObjects,
    isMultiSelect,
    selectedCount,
    groupSelected,
    ungroupSelected,
  ]);
}

export type FabricEditorController = ReturnType<typeof useFabricEditor>;





