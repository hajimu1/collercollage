import { useCallback } from 'react';
import { Canvas, FabricImage, Group } from 'fabric';
import type { CanvasSize, ClipSpec, ElementLayerType, ImageCrop, ImageFilters, ShadowSettings } from '../types/layers';
import type { BuiltInAsset } from '../utils/assetRegistry';
import {
  applyImageClip,
  applyImageCrop,
  applyImageShadow,
  applyInteractiveDefaults,
  applyObjectBlendMode,
  createLayerId,
  DEFAULT_IMAGE_CLIP,
  DEFAULT_IMAGE_CROP,
  DEFAULT_IMAGE_STROKE,
  ensureMetadata,
  FabricImageObject,
  getMetadata,
  setMetadata,
  syncImageOutline,
  applyFabricFiltersToImage,
  getImageChild,
} from '../utils/fabricHelpers';
import { buildImageLayerData } from '../utils/imageLayerRenderer';
import { DEFAULT_IMAGE_CLIP_DATA, DEFAULT_IMAGE_EFFECTS } from '../types/imageLayer';
import { resizeImageFile, ensureSvgSizing } from '../utils/image';
import { MAX_IMAGE_DIMENSION } from '../constants/canvas';

interface UseImageLayerProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  canvasSize: CanvasSize;
  syncLayersFromCanvas: () => void;
  syncSelectionFromCanvas: () => void;
  nextLayerName: (type: ElementLayerType, fileName?: string) => string;
  triggerSaveHistory: () => void;
}

export function useImageLayer({
  fabricCanvasRef,
  canvasSize,
  syncLayersFromCanvas,
  syncSelectionFromCanvas,
  nextLayerName,
  triggerSaveHistory,
}: UseImageLayerProps) {
  const addImageFromFile = useCallback(async (file: File) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    triggerSaveHistory();

    const src = await resizeImageFile(file, MAX_IMAGE_DIMENSION);
    const image = await FabricImage.fromURL(src) as FabricImageObject;
    const layerId = createLayerId('image');

    image.set({
      left: 0,
      top: 0,
      originX: 'center',
      originY: 'center',
      strokeWidth: 0,
      selectable: false,
      evented: false,
    });

    const maxWidth = canvasSize.width * 0.62;
    const maxHeight = canvasSize.height * 0.62;
    const imageWidth = Number(image.width || maxWidth);
    const imageHeight = Number(image.height || maxHeight);
    const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);

    const frameWidth = imageWidth;
    const frameHeight = imageHeight;

    const group = new Group([image], {
      left: canvasSize.width / 2,
      top: canvasSize.height / 2,
      originX: 'center',
      originY: 'center',
      width: frameWidth,
      height: frameHeight,
      strokeWidth: 0,
      objectCaching: false,
    });

    group.scale(scale);
    applyInteractiveDefaults(group);

    // Build authoritative ImageLayerData (Hybrid Smart Layer model)
    const imageLayerData = buildImageLayerData(
      { src, naturalWidth: imageWidth, naturalHeight: imageHeight },
      {
        left: canvasSize.width / 2,
        top: canvasSize.height / 2,
        width: frameWidth,
        height: frameHeight,
        scaleX: scale,
        scaleY: scale,
        angle: 0,
        flipX: false,
        flipY: false,
      },
      { offsetX: 0, offsetY: 0, scale: 1, angle: 0 },
      { ...DEFAULT_IMAGE_CLIP_DATA },
      { ...DEFAULT_IMAGE_EFFECTS },
    );

    setMetadata(group, {
      layerId,
      layerType: 'image',
      layerName: nextLayerName('image', file.name),
      blendMode: 'normal',
      src,
      crop: { ...DEFAULT_IMAGE_CROP, frameWidth, frameHeight },
      clip: { ...DEFAULT_IMAGE_CLIP },
      stroke: { ...DEFAULT_IMAGE_STROKE },
      filters: {},
      shadow: { enabled: false, color: '#000000', blur: 12, offsetX: 4, offsetY: 4 },
      imageLayerData,
    });

    applyImageClip(group);
    canvas.add(group);
    canvas.setActiveObject(group);
    syncImageOutline(canvas, group);
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [canvasSize, nextLayerName, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const addOverlayFromFile = useCallback(async (file: File) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    triggerSaveHistory();

    const source = await resizeImageFile(file, MAX_IMAGE_DIMENSION);
    const overlay = await FabricImage.fromURL(source) as FabricImageObject;
    const layerId = createLayerId('overlay');

    applyInteractiveDefaults(overlay);
    overlay.set({
      left: canvasSize.width / 2,
      top: canvasSize.height / 2,
      originX: 'center',
      originY: 'center',
      strokeWidth: 0,
      opacity: 0.7,
    });

    const maxWidth = canvasSize.width;
    const maxHeight = canvasSize.height;
    const imageWidth = Number(overlay.width || maxWidth);
    const imageHeight = Number(overlay.height || maxHeight);
    overlay.scale(Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1));

    setMetadata(overlay, {
      layerId,
      layerType: 'overlay',
      layerName: file.name.replace(/\.[^.]+$/, '') || 'Overlay',
      source,
      sourceType: 'uploaded',
      filename: file.name,
      blendMode: 'screen',
    });
    applyObjectBlendMode(overlay, 'screen');

    canvas.add(overlay);
    canvas.setActiveObject(overlay);
    overlay.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [canvasSize, nextLayerName, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const addBuiltInAsset = useCallback(async (asset: BuiltInAsset) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    if (asset.category === 'frames') {
      const activeObject = canvas.getActiveObject();
      const meta = activeObject ? getMetadata(activeObject) : undefined;
      if (activeObject && meta?.layerType === 'image') {
        triggerSaveHistory();
        
        let targetGroup = activeObject;
        if (!(activeObject instanceof Group)) {
          const imgObj = activeObject as FabricImageObject;
          const left = imgObj.left ?? 0;
          const top = imgObj.top ?? 0;
          const scaleX = imgObj.scaleX ?? 1;
          const scaleY = imgObj.scaleY ?? 1;
          const angle = imgObj.angle ?? 0;
          
          imgObj.set({ left: 0, top: 0, scaleX: 1, scaleY: 1, angle: 0 });
          
          const group = new Group([imgObj], {
            left,
            top,
            scaleX,
            scaleY,
            angle,
            originX: 'center',
            originY: 'center',
          });
          
          setMetadata(group, {
            ...meta,
          });
          
          canvas.remove(imgObj);
          canvas.add(group);
          canvas.setActiveObject(group);
          targetGroup = group;
        }

        const targetMeta = getMetadata(targetGroup)!;
        targetMeta.clip = {
          type: 'image-preset',
          assetUrl: asset.src,
        };
        applyImageClip(targetGroup);
        syncImageOutline(canvas, targetGroup);
        canvas.requestRenderAll();
        syncLayersFromCanvas();
        syncSelectionFromCanvas();
        return;
      }
    }

    triggerSaveHistory();

    const safeSrc = await ensureSvgSizing(asset.src);
    const object = await FabricImage.fromURL(safeSrc) as FabricImageObject;
    const layerId = createLayerId('overlay');
    const opacity = Math.max(0, Math.min(1, asset.recommendedOpacity ?? (asset.category === 'overlays' ? 0.7 : 1)));
    const blendMode = asset.recommendedBlendMode ?? (asset.category === 'overlays' ? 'screen' : 'normal');

    applyInteractiveDefaults(object);
    object.set({
      left: canvasSize.width / 2,
      top: canvasSize.height / 2,
      originX: 'center',
      originY: 'center',
      strokeWidth: 0,
      opacity,
    });

    const maxWidth = asset.category === 'overlays' ? canvasSize.width : canvasSize.width * 0.36;
    const maxHeight = asset.category === 'overlays' ? canvasSize.height : canvasSize.height * 0.36;
    const imageWidth = Number(object.width || maxWidth);
    const imageHeight = Number(object.height || maxHeight);
    object.scale(Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1));

    setMetadata(object, {
      layerId,
      layerType: 'overlay',
      layerName: asset.name,
      source: asset.src,
      sourceType: 'builtin',
      assetId: asset.id,
      assetCategory: asset.category,
      assetType: asset.type,
      filename: asset.src.split('/').pop(),
      blendMode,
    });
    applyObjectBlendMode(object, blendMode);

    canvas.add(object);
    canvas.setActiveObject(object);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [canvasSize, syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const updateSelectedImageStroke = useCallback((color: string, width: number) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    metadata.stroke = {
      enabled: width > 0,
      color,
      width: Math.max(0, width),
    };
    object.set({
      strokeWidth: 0,
    });
    syncImageOutline(canvas, object);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const updateSelectedImageClip = useCallback((clip: ClipSpec) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    metadata.clip = clip;
    applyImageClip(object);
    syncImageOutline(canvas, object);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const updateSelectedImageCrop = useCallback((crop: ImageCrop) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    applyImageCrop(object, crop);
    syncImageOutline(canvas, object);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const flipSelectedImage = useCallback((direction: 'horizontal' | 'vertical') => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    const targetImage = getImageChild(object) ?? object;
    if (direction === 'horizontal') {
      targetImage.set({ flipX: !targetImage.flipX });
    } else {
      targetImage.set({ flipY: !targetImage.flipY });
    }
    syncImageOutline(canvas, object);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const replaceSelectedImage = useCallback(async (file: File) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    const src = await resizeImageFile(file, MAX_IMAGE_DIMENSION);
    const newImage = await FabricImage.fromURL(src) as FabricImageObject;

    const frameW = object.getScaledWidth();
    const frameH = object.getScaledHeight();
    const naturalW = Math.max(1, newImage.width ?? 1);
    const naturalH = Math.max(1, newImage.height ?? 1);
    const newScale = Math.min(frameW / naturalW, frameH / naturalH);

    const childImage = getImageChild(object);

    if (childImage && object instanceof Group) {
      childImage.setElement(newImage.getElement?.() ?? newImage._element ?? newImage.getElement?.());
      childImage.set({
        width: naturalW,
        height: naturalH,
        flipX: false,
        flipY: false,
      });
      metadata.src = src;
      // Reset inner transform to center it and set scale
      metadata.crop = {
        enabled: true,
        offsetX: 0,
        offsetY: 0,
        scale: Math.min((object.width ?? 100) / naturalW, (object.height ?? 100) / naturalH),
        angle: 0,
        frameWidth: object.width,
        frameHeight: object.height,
      };
      applyImageCrop(object, metadata.crop);
    } else {
      const targetImage = childImage ?? object;
      targetImage.setElement(newImage.getElement?.() ?? newImage._element ?? newImage.getElement?.());
      metadata.src = src;
      
      if (metadata.collageCell) {
        metadata.collageCell.cropFocusX = 0.5;
        metadata.collageCell.cropFocusY = 0.5;
        metadata.collageCell.cropZoom = newScale;
      } else {
        metadata.crop = { ...DEFAULT_IMAGE_CROP };
        targetImage.set({
          cropX: 0,
          cropY: 0,
          width: naturalW,
          height: naturalH,
          scaleX: frameW / naturalW,
          scaleY: frameH / naturalH,
          flipX: false,
          flipY: false,
        });
        applyImageClip(targetImage);
      }
    }
    syncImageOutline(canvas, object);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);



  const updateSelectedImageFilters = useCallback(async (filters: ImageFilters) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    await applyFabricFiltersToImage(object, filters);

    metadata.filters = filters;
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const updateSelectedImageShadow = useCallback((shadow: ShadowSettings) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject() as FabricImageObject | undefined;
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    metadata.shadow = shadow;
    applyImageShadow(object, shadow);
    object.setCoords();
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const updateSelectedOpacity = useCallback((opacity: number) => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject();
    if (!canvas || !object) return;

    const metadata = getMetadata(object);
    if (!metadata || (metadata.layerType !== 'image' && metadata.layerType !== 'shape' && metadata.layerType !== 'text' && metadata.layerType !== 'overlay' && metadata.layerType !== 'adjustment')) return;

    triggerSaveHistory();

    const safeOpacity = Math.max(0, Math.min(1, opacity));
    object.set({ opacity: safeOpacity });
    object.setCoords();

    if (metadata.layerType === 'image') {
      syncImageOutline(canvas, object as FabricImageObject);
    }
    canvas.requestRenderAll();
    syncLayersFromCanvas();
    syncSelectionFromCanvas();
  }, [syncLayersFromCanvas, syncSelectionFromCanvas, fabricCanvasRef, triggerSaveHistory]);

  const createBackgroundBlur = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const object = canvas?.getActiveObject();
    const metadata = object ? getMetadata(object) : undefined;
    if (!canvas || !object || metadata?.layerType !== 'image') return;

    triggerSaveHistory();

    object.clone().then((clonedGroup: any) => {
      const layerId = createLayerId('image');
      setMetadata(clonedGroup, {
        layerId,
        layerType: 'image',
        layerName: `Blur Background - ${metadata.layerName}`,
        src: metadata.src,
        crop: clonedGroup.data?.crop ? { ...clonedGroup.data.crop } : undefined,
        clip: clonedGroup.data?.clip ? { ...clonedGroup.data.clip } : undefined,
        stroke: { enabled: false, color: '#000000', width: 0 },
        filters: {
          ...clonedGroup.data?.filters,
          blur: 0.8,
          brightness: -0.2,
        },
        shadow: { enabled: false, color: '#000000', blur: 0, offsetX: 0, offsetY: 0 },
      });

      clonedGroup.set({
        scaleX: (object.scaleX ?? 1) * 1.5,
        scaleY: (object.scaleY ?? 1) * 1.5,
        opacity: 0.6,
      });

      applyFabricFiltersToImage(clonedGroup, clonedGroup.data!.filters!);

      canvas.add(clonedGroup);
      
      const index = canvas.getObjects().indexOf(object);
      canvas.moveObjectTo(clonedGroup, Math.max(0, index));
      
      canvas.requestRenderAll();
      syncLayersFromCanvas();
      syncSelectionFromCanvas();
    });
  }, [fabricCanvasRef, syncLayersFromCanvas, syncSelectionFromCanvas, triggerSaveHistory]);

  return {
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
  };
}


