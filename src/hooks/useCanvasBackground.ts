import { useCallback } from 'react';
import { Canvas, FabricImage } from 'fabric';
import type { CanvasBackground, CanvasSize } from '../types/layers';
import { resizeImageFile, ensureSvgSizing } from '../utils/image';
import { MAX_IMAGE_DIMENSION } from '../constants/canvas';

interface UseCanvasBackgroundProps {
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  setBackground: React.Dispatch<React.SetStateAction<CanvasBackground>>;
  background: CanvasBackground;
  canvasSize: CanvasSize;
  triggerSaveHistory: () => void;
}

export function useCanvasBackground({
  fabricCanvasRef,
  setBackground,
  background,
  canvasSize,
  triggerSaveHistory,
}: UseCanvasBackgroundProps) {
  const applyBackground = useCallback(async (
    nextBackground: CanvasBackground = background,
    targetSize: CanvasSize = canvasSize,
  ) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.backgroundImage = undefined;
    canvas.backgroundColor = nextBackground.mode === 'solid'
      ? nextBackground.color
      : 'rgba(255,255,255,0)';

    if (nextBackground.mode === 'image' && nextBackground.imageSrc) {
      const safeSrc = await ensureSvgSizing(nextBackground.imageSrc);
      const image = await FabricImage.fromURL(safeSrc);
      const scaleX = targetSize.width / Number(image.width || targetSize.width);
      const scaleY = targetSize.height / Number(image.height || targetSize.height);
      const fitScale = nextBackground.fit === 'cover'
        ? Math.max(scaleX, scaleY)
        : Math.min(scaleX, scaleY);

      image.set({
        originX: 'center',
        originY: 'center',
        left: targetSize.width / 2,
        top: targetSize.height / 2,
        selectable: false,
        evented: false,
      });

      if (nextBackground.fit === 'stretch') {
        image.set({ scaleX, scaleY });
      } else {
        image.scale(fitScale);
      }

      canvas.backgroundImage = image;
    }

    canvas.requestRenderAll();
  }, [background, canvasSize, fabricCanvasRef]);

  const setBackgroundColor = useCallback((color: string) => {
    triggerSaveHistory();
    setBackground((current) => ({
      ...current,
      mode: 'solid',
      color,
    }));
  }, [setBackground, triggerSaveHistory]);

  const setBackgroundMode = useCallback((mode: CanvasBackground['mode']) => {
    triggerSaveHistory();
    setBackground((current) => ({
      ...current,
      mode,
    }));
  }, [setBackground, triggerSaveHistory]);

  const setBackgroundFit = useCallback((fit: CanvasBackground['fit']) => {
    triggerSaveHistory();
    setBackground((current) => ({
      ...current,
      mode: current.imageSrc ? 'image' : current.mode,
      fit,
    }));
  }, [setBackground, triggerSaveHistory]);

  const setBackgroundImageFromFile = useCallback(async (file: File) => {
    triggerSaveHistory();
    const imageSrc = await resizeImageFile(file, MAX_IMAGE_DIMENSION);
    setBackground((current) => ({
      ...current,
      mode: 'image',
      imageSrc,
    }));
  }, [setBackground, triggerSaveHistory]);

  const setBackgroundImageFromUrl = useCallback(async (imageSrc: string) => {
    triggerSaveHistory();
    setBackground((current) => ({
      ...current,
      mode: 'image',
      imageSrc,
    }));
  }, [setBackground, triggerSaveHistory]);

  const removeBackgroundImage = useCallback(() => {
    triggerSaveHistory();
    setBackground((current) => ({
      ...current,
      mode: 'solid',
      imageSrc: undefined,
    }));
  }, [setBackground, triggerSaveHistory]);

  return {
    applyBackground,
    setBackgroundColor,
    setBackgroundMode,
    setBackgroundFit,
    setBackgroundImageFromFile,
    setBackgroundImageFromUrl,
    removeBackgroundImage,
  };
}
