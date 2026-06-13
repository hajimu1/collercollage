import { useCallback } from 'react';
import { Canvas, FabricImage, FabricObject, Textbox, Group } from 'fabric';
import type {
  ActiveCollage,
  AdjustmentLayerItem,
  CanvasBackground,
  CanvasSize,
  CollageProjectFile,
  ImageLayerItem,
  LayerItem,
  OverlayLayerItem,
  TextLayerItem,
  ImageFilters,
  GroupLayerItem,
} from '../types/layers';
import {
  applyCollageCellFrame,
  applyAdjustmentFill,
  applyObjectBlendMode,
  applyImageClip,
  applyImageCrop,
  applyImageShadow,
  applyInteractiveDefaults,
  applyTextShadow,
  clampCanvasSize,
  createCollagePlaceholder,
  createAdjustmentObject,
  createLayerId,
  createShapeObject,
  DEFAULT_IMAGE_CLIP,
  DEFAULT_IMAGE_CROP,
  DEFAULT_IMAGE_STROKE,
  FabricImageObject,
  FabricLayerObject,
  getMetadata,
  isPlaceholderObject,
  loadFontForCanvas,
  waitForCanvasTextFonts,
  makeBackgroundLayer,
  normalizeTextBackgroundBox,
  normalizeTextShadow,
  setMetadata,
  setObjectLocked,
  syncImageOutline,
  syncTextBackgroundBox,
  CropModeState,
  applyFabricFiltersToImage,
  applyShapeShadowAndGradient,
  applyLayerMask,
} from '../utils/fabricHelpers';
import { computeCellRect, getCollageLayoutById, normalizeCollageGaps } from '../utils/collageLayouts';
import { downloadDataUrl, ensureSvgSizing } from '../utils/image';

interface UseExportProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  canvasSize: CanvasSize;
  setCanvasSizeState: React.Dispatch<React.SetStateAction<CanvasSize>>;
  background: CanvasBackground;
  setBackground: React.Dispatch<React.SetStateAction<CanvasBackground>>;
  backgroundLocked: boolean;
  setBackgroundLocked: React.Dispatch<React.SetStateAction<boolean>>;
  layers: LayerItem[];
  activeCollage: ActiveCollage | null;
  setActiveCollage: React.Dispatch<React.SetStateAction<ActiveCollage | null>>;
  activeCollageRef: React.MutableRefObject<ActiveCollage | null>;
  setSelectedCollageCellIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setCropMode: React.Dispatch<React.SetStateAction<CropModeState | null>>;
  objectToLayer: (object: FabricObject, index: number) => LayerItem;
  syncLayersFromCanvas: () => void;
  syncSelectionFromCanvas: () => void;
  applyBackground: (background?: CanvasBackground, size?: CanvasSize) => Promise<void>;
}

export function useExport({
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
}: UseExportProps) {

  const createProject = useCallback((): CollageProjectFile => {
    const canvas = fabricCanvasRef.current;
    
    // Canvas background or layers can be resolved
    const isOutlineObject = (obj: FabricObject) =>
      Boolean((obj as any).data?.outlineForLayerId);
    const isTextBackgroundBoxObject = (obj: FabricObject) =>
      Boolean((obj as any).data?.backgroundBoxForTextLayerId);
    const isCropHelperObject = (obj: FabricObject) =>
      Boolean((obj as any).data?.cropHelperForLayerId);
    const isAlignmentGuideObject = (obj: FabricObject) =>
      Boolean((obj as any).data?.alignmentGuide);

    const projectLayers = canvas
      ? [
          makeBackgroundLayer(background, backgroundLocked),
          ...canvas
            .getObjects()
            .filter((object) =>
              !isOutlineObject(object) &&
              !isTextBackgroundBoxObject(object) &&
              !isCropHelperObject(object) &&
              !isAlignmentGuideObject(object) &&
              !isPlaceholderObject(object),
            )
            .map((object, index) => objectToLayer(object, index)),
        ]
      : layers;

    return {
      app: 'collage-editor',
      version: 6,
      savedAt: new Date().toISOString(),
      canvas: {
        ...canvasSize,
      },
      background,
      layers: projectLayers,
      collage: activeCollage ?? undefined,
    };
  }, [activeCollage, background, backgroundLocked, canvasSize, layers, objectToLayer, fabricCanvasRef]);

  const loadProject = useCallback(async (project: CollageProjectFile) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.discardActiveObject();
    canvas.clear();
    
    setActiveCollage(null);
    activeCollageRef.current = null;
    setSelectedCollageCellIndex(null);
    setCanvasSizeState({
      width: clampCanvasSize(project.canvas.width),
      height: clampCanvasSize(project.canvas.height),
    });
    setBackground(project.background);
    setBackgroundLocked(true);
    setCropMode(null);

    const groupLayersToCreate: GroupLayerItem[] = [];

    for (const layer of project.layers.filter((item) => item.type !== 'background').sort((a, b) => a.zIndex - b.zIndex)) {
      if (layer.type === 'group') {
        groupLayersToCreate.push(layer as GroupLayerItem);
        continue;
      }

      let object: FabricObject | null = null;

      if (layer.type === 'image') {
        const imageLayer = layer as ImageLayerItem;
        const safeSrc = await ensureSvgSizing(imageLayer.src);
        const image = await FabricImage.fromURL(safeSrc) as FabricImageObject;
        image.set({
          left: 0,
          top: 0,
          originX: 'center',
          originY: 'center',
          strokeWidth: 0,
          flipX: !!imageLayer.flipX,
          flipY: !!imageLayer.flipY,
        });

        if (imageLayer.collageCell) {
          object = image;
           setMetadata(object, {
            layerId: imageLayer.id,
            layerType: 'image',
            layerName: imageLayer.name,
            locked: imageLayer.locked,
            src: imageLayer.src,
            blendMode: imageLayer.blendMode ?? 'normal',
            crop: imageLayer.crop ?? DEFAULT_IMAGE_CROP,
            clip: imageLayer.clip ?? DEFAULT_IMAGE_CLIP,
            stroke: imageLayer.stroke ?? DEFAULT_IMAGE_STROKE,
            collageCell: imageLayer.collageCell,
            filters: imageLayer.filters,
            shadow: imageLayer.shadow,
            flipX: imageLayer.flipX,
            flipY: imageLayer.flipY,
            maskDataUrl: imageLayer.maskDataUrl,
            maskLinked: imageLayer.maskLinked !== false,
          });
          object.set({
            left: layer.left,
            top: layer.top,
            originX: 'center',
            originY: 'center',
          });
          object.scaleX = layer.scaleX ?? object.scaleX;
          object.scaleY = layer.scaleY ?? object.scaleY;
          if (imageLayer.filters) {
            await applyFabricFiltersToImage(image, imageLayer.filters);
          }
          applyImageShadow(image, imageLayer.shadow);
          
          if (imageLayer.maskDataUrl) {
            await applyLayerMask(object, imageLayer.maskDataUrl, imageLayer.maskLinked !== false);
          }
        } else {
          const frameWidth = imageLayer.crop?.frameWidth ?? image.width ?? 100;
          const frameHeight = imageLayer.crop?.frameHeight ?? image.height ?? 100;

          const group = new Group([image], {
            left: layer.left ?? 0,
            top: layer.top ?? 0,
            originX: 'center',
            originY: 'center',
            width: frameWidth,
            height: frameHeight,
            scaleX: layer.scaleX ?? 1,
            scaleY: layer.scaleY ?? 1,
            angle: layer.angle ?? 0,
            strokeWidth: 0,
            objectCaching: false,
          });

          setMetadata(group, {
            layerId: imageLayer.id,
            layerType: 'image',
            layerName: imageLayer.name,
            locked: imageLayer.locked,
            src: imageLayer.src,
            blendMode: imageLayer.blendMode ?? 'normal',
            crop: imageLayer.crop ?? { ...DEFAULT_IMAGE_CROP, frameWidth, frameHeight },
            clip: imageLayer.clip ?? DEFAULT_IMAGE_CLIP,
            stroke: imageLayer.stroke ?? DEFAULT_IMAGE_STROKE,
            filters: imageLayer.filters,
            shadow: imageLayer.shadow,
            maskDataUrl: imageLayer.maskDataUrl,
            maskLinked: imageLayer.maskLinked !== false,
          });

          object = group;

          if (imageLayer.filters) {
            await applyFabricFiltersToImage(group, imageLayer.filters);
          }
          applyImageShadow(group, imageLayer.shadow);
          applyImageCrop(group, imageLayer.crop);
          applyImageClip(group);
          
          if (imageLayer.maskDataUrl) {
            await applyLayerMask(group, imageLayer.maskDataUrl, imageLayer.maskLinked !== false);
          }
        }
      } else if (layer.type === 'overlay') {
        const overlayLayer = layer as OverlayLayerItem;
        const safeSource = await ensureSvgSizing(overlayLayer.source);
        const overlay = await FabricImage.fromURL(safeSource) as FabricImageObject;
        object = overlay;
        object.set({
          strokeWidth: 0,
        });
        setMetadata(object, {
          layerId: overlayLayer.id,
          layerType: 'overlay',
          layerName: overlayLayer.name,
          locked: overlayLayer.locked,
          source: overlayLayer.source,
          sourceType: overlayLayer.sourceType,
          assetId: overlayLayer.assetId,
          assetCategory: overlayLayer.assetCategory,
          assetType: overlayLayer.assetType,
          filename: overlayLayer.filename,
          blendMode: overlayLayer.blendMode ?? 'normal',
        });
      } else if (layer.type === 'adjustment') {
        const adjustmentLayer = layer as AdjustmentLayerItem;
        object = createAdjustmentObject(project.canvas, adjustmentLayer.kind ?? 'solid-color', adjustmentLayer.gradientType ?? 'linear');
        setMetadata(object, {
          layerId: adjustmentLayer.id,
          layerType: 'adjustment',
          layerName: adjustmentLayer.name,
          locked: adjustmentLayer.locked,
          blendMode: adjustmentLayer.blendMode ?? 'normal',
          adjustmentKind: adjustmentLayer.kind ?? 'solid-color',
          adjustmentTarget: adjustmentLayer.target ?? 'canvas',
          adjustmentColor: adjustmentLayer.color,
          adjustmentGradientType: adjustmentLayer.gradientType,
          adjustmentGradientColors: adjustmentLayer.gradientColors,
        });
      } else if (layer.type === 'text') {
        const textLayer = layer as TextLayerItem;
        object = new Textbox(textLayer.text, {
          width: textLayer.width || project.canvas.width * 0.58,
          fontFamily: textLayer.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: textLayer.fontSize,
          fontWeight: textLayer.fontWeight || 'normal',
          fontStyle: textLayer.fontStyle || 'normal',
          underline: Boolean(textLayer.underline),
          linethrough: Boolean(textLayer.linethrough),
          fill: textLayer.fill,
          textAlign: textLayer.textAlign,
          originX: 'center',
          originY: 'center',
          splitByGrapheme: true,
          charSpacing: textLayer.charSpacing ?? 0,
          lineHeight: textLayer.lineHeight ?? 1.16,
          stroke: textLayer.strokeEnabled ? (textLayer.strokeColor || '#101820') : undefined,
          strokeWidth: textLayer.strokeEnabled ? (textLayer.strokeWidth ?? 0) : 0,
        });
        setMetadata(object, {
          layerId: textLayer.id,
          layerType: 'text',
          layerName: textLayer.name,
          locked: textLayer.locked,
          blendMode: textLayer.blendMode ?? 'normal',
          shadow: normalizeTextShadow(textLayer.shadow),
          backgroundBox: normalizeTextBackgroundBox(textLayer.backgroundBox),
          charSpacing: textLayer.charSpacing ?? 0,
          lineHeight: textLayer.lineHeight ?? 1.16,
          strokeEnabled: textLayer.strokeEnabled,
          strokeColor: textLayer.strokeColor,
          strokeWidth: textLayer.strokeWidth,
        });
        applyTextShadow(object as FabricLayerObject, textLayer.shadow);
        
        if (textLayer.fontFamily) {
          void loadFontForCanvas(textLayer.fontFamily).then(() => {
            canvas.requestRenderAll();
          }).catch(() => {});
        }
      } else if (layer.type === 'shape') {
        const shapeLayer = layer as any;
        object = createShapeObject(shapeLayer.shapeType, project.canvas, {
          fill: shapeLayer.fill,
          stroke: shapeLayer.stroke,
          strokeWidth: shapeLayer.strokeWidth,
        });
        if (object) {
          setMetadata(object, {
            layerId: shapeLayer.id,
            layerType: 'shape',
            layerName: shapeLayer.name,
            locked: shapeLayer.locked,
            blendMode: shapeLayer.blendMode ?? 'normal',
            shapeType: shapeLayer.shapeType,
            shadow: shapeLayer.shadow,
            gradientEnabled: shapeLayer.gradientEnabled,
            gradientType: shapeLayer.gradientType,
            gradientColors: shapeLayer.gradientColors,
            gradientAngle: shapeLayer.gradientAngle,
            solidFill: shapeLayer.fill,
          });
          applyShapeShadowAndGradient(object);
        }
      }

      if (!object) continue;

      const isCollageImage = !!(layer.type === 'image' && (layer as ImageLayerItem).collageCell);
      if (isCollageImage) {
        object.set({
          left: layer.left,
          top: layer.top,
          scaleX: layer.scaleX ?? object.scaleX,
          scaleY: layer.scaleY ?? object.scaleY,
          angle: layer.angle ?? 0,
          visible: layer.visible,
          opacity: layer.opacity,
          originX: 'center',
          originY: 'center',
          selectable: false,
          evented: false,
          hasControls: false,
          hasBorders: false,
          lockMovementX: true,
          lockMovementY: true,
          lockScalingX: true,
          lockScalingY: true,
          lockRotation: true,
          objectCaching: false,
          strokeWidth: 0,
        });
      } else {
        applyInteractiveDefaults(object);
        object.set({
          left: layer.left,
          top: layer.top,
          width: layer.width || object.width,
          height: layer.height || object.height,
          scaleX: layer.scaleX ?? object.scaleX,
          scaleY: layer.scaleY ?? object.scaleY,
          angle: layer.angle ?? 0,
          visible: layer.visible,
          opacity: layer.opacity,
          originX: 'center',
          originY: 'center',
        });
        applyObjectBlendMode(object, layer.blendMode ?? 'normal');
        if (layer.type === 'adjustment') {
          applyAdjustmentFill(object);
        }
        setObjectLocked(object, layer.locked);
      }

      applyObjectBlendMode(object, layer.blendMode ?? 'normal');
      if (layer.type === 'adjustment') {
        applyAdjustmentFill(object);
      }

      const meta = getMetadata(object);
      if (meta && layer.groupId) {
        meta.groupId = layer.groupId;
      }

      canvas.add(object);
      if (layer.type === 'image' && !isCollageImage) {
        applyImageClip(object as FabricImageObject);
        syncImageOutline(canvas, object as FabricImageObject);
      }
      if (layer.type === 'text') {
        syncTextBackgroundBox(canvas, object as FabricLayerObject);
      }
    }

    // Post-process: Reconstruct Fabric groups
    for (const groupLayer of groupLayersToCreate) {
      const members = canvas.getObjects().filter((obj) => {
        const meta = getMetadata(obj);
        return meta?.groupId === groupLayer.id;
      });

      if (members.length === 0) continue;

      members.forEach((member) => canvas.remove(member));

      const groupObj = new Group(members, {
        left: groupLayer.left,
        top: groupLayer.top,
        width: groupLayer.width,
        height: groupLayer.height,
        scaleX: groupLayer.scaleX ?? 1,
        scaleY: groupLayer.scaleY ?? 1,
        angle: groupLayer.angle ?? 0,
        visible: groupLayer.visible !== false,
        opacity: groupLayer.opacity ?? 1,
        strokeWidth: 0,
        objectCaching: false,
      });

      setMetadata(groupObj, {
        layerId: groupLayer.id,
        layerType: 'group',
        layerName: groupLayer.name,
        locked: groupLayer.locked,
        blendMode: groupLayer.blendMode ?? 'normal',
      });

      groupObj.getObjects().forEach((child) => {
        const childMeta = getMetadata(child);
        if (childMeta) {
          childMeta.groupId = groupLayer.id;
        }
      });

      applyInteractiveDefaults(groupObj);
      applyObjectBlendMode(groupObj, groupLayer.blendMode ?? 'normal');
      setObjectLocked(groupObj, groupLayer.locked);

      canvas.add(groupObj);
    }

    const savedCollage = project.collage;
    if (savedCollage) {
      const layout = getCollageLayoutById(savedCollage.layoutId);
      if (layout) {
        const cw = project.canvas.width;
        const ch = project.canvas.height;
        const { gapX, gapY } = normalizeCollageGaps(savedCollage);
        const { radiusPx, collageId } = savedCollage;
        const restoredCollage: ActiveCollage = { ...savedCollage, gapX, gapY, gapPx: savedCollage.gapPx ?? gapX };

        canvas.getObjects().forEach((obj) => {
          const meta = getMetadata(obj);
          if (meta?.collageCell?.collageId === collageId) {
            const cell = layout.cells[meta.collageCell.cellIndex];
            if (cell) {
              applyCollageCellFrame(
                obj as FabricImageObject,
                computeCellRect(cell, cw, ch, restoredCollage),
                radiusPx,
                meta.collageCell.clipType,
              );
            }
          }
        });

        for (const cellInfo of savedCollage.cells.filter((c) => c.layerId === null)) {
          const cell = layout.cells[cellInfo.cellIndex];
          if (cell) {
            const rect = computeCellRect(cell, cw, ch, restoredCollage);
            canvas.add(createCollagePlaceholder(collageId, cellInfo.cellIndex, rect, radiusPx));
          }
        }

        setActiveCollage(restoredCollage);
        activeCollageRef.current = restoredCollage;
      }
    }

    canvas.requestRenderAll();
    void applyBackground(project.background, project.canvas);
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [applyBackground, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, setActiveCollage, activeCollageRef, setSelectedCollageCellIndex, setCanvasSizeState, setBackground, setBackgroundLocked, setCropMode]);

  const exportPng = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const placeholders = canvas.getObjects().filter(isPlaceholderObject);
    placeholders.forEach((ph) => ph.set({ visible: false }));

    const activeObject = canvas.getActiveObject();
    const previousWidth = canvas.getWidth();
    const previousHeight = canvas.getHeight();
    const previousTransform = canvas.viewportTransform
      ? ([...canvas.viewportTransform] as [number, number, number, number, number, number])
      : undefined;

    const isObjectLockedLocal = (obj: FabricObject) =>
      obj.selectable === false ||
      obj.lockMovementX ||
      obj.lockMovementY ||
      obj.lockScalingX ||
      obj.lockScalingY ||
      obj.lockRotation;

    canvas.discardActiveObject();
    canvas.setDimensions({ width: canvasSize.width, height: canvasSize.height });
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    const dataUrl = canvas.toDataURL({
      format: 'png',
      multiplier: 1,
      enableRetinaScaling: false,
    });

    placeholders.forEach((ph) => ph.set({ visible: true }));

    canvas.setDimensions({ width: previousWidth, height: previousHeight });
    if (previousTransform) {
      canvas.setViewportTransform(previousTransform);
    }
    if (activeObject && activeObject.visible !== false && !isObjectLockedLocal(activeObject)) {
      canvas.setActiveObject(activeObject);
    }
    canvas.requestRenderAll();

    downloadDataUrl(dataUrl, `collage-${canvasSize.width}x${canvasSize.height}.png`);
  }, [canvasSize.height, canvasSize.width, fabricCanvasRef]);

  const exportImage = useCallback(async (options: {
    format: 'png' | 'jpeg';
    quality?: number;
    multiplier?: number;
    copyToClipboard?: boolean;
  share?: boolean;
  }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const placeholders = canvas.getObjects().filter(isPlaceholderObject);
    placeholders.forEach((ph) => ph.set({ visible: false }));

    const activeObject = canvas.getActiveObject();
    const previousWidth = canvas.getWidth();
    const previousHeight = canvas.getHeight();
    const previousTransform = canvas.viewportTransform
      ? ([...canvas.viewportTransform] as [number, number, number, number, number, number])
      : undefined;

    const isObjectLockedLocal = (obj: FabricObject) =>
      obj.selectable === false ||
      obj.lockMovementX ||
      obj.lockMovementY ||
      obj.lockScalingX ||
      obj.lockScalingY ||
      obj.lockRotation;

    canvas.discardActiveObject();
    canvas.setDimensions({ width: canvasSize.width, height: canvasSize.height });
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    await waitForCanvasTextFonts(canvas);
    canvas.renderAll();

    const format = options.format;
    const quality = format === 'jpeg' ? (options.quality ?? 0.85) : undefined;
    const multiplier = options.multiplier ?? 1;

    const dataUrl = canvas.toDataURL({
      format,
      quality,
      multiplier,
      enableRetinaScaling: false,
    });

    placeholders.forEach((ph) => ph.set({ visible: true }));

    canvas.setDimensions({ width: previousWidth, height: previousHeight });
    if (previousTransform) {
      canvas.setViewportTransform(previousTransform);
    }
    if (activeObject && activeObject.visible !== false && !isObjectLockedLocal(activeObject)) {
      canvas.setActiveObject(activeObject);
    }
    canvas.requestRenderAll();

    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const fileName = `collage-${canvasSize.width * multiplier}x${canvasSize.height * multiplier}.${ext}`;

    if (options.share) {
      if (navigator.share && typeof File !== 'undefined') {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });
        const shareData = { files: [file], title: 'Collage image' };
        if (!navigator.canShare || navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return;
        }
      }
      downloadDataUrl(dataUrl, fileName);
      return;
    }

    if (options.copyToClipboard) {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
      } else {
        throw new Error('This layer type does not support cloning.');
      }
    } else {
      downloadDataUrl(dataUrl, fileName);
    }
  }, [canvasSize.height, canvasSize.width, fabricCanvasRef]);

  return {
    createProject,
    loadProject,
    exportPng,
    exportImage,
  };
}

