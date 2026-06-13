import { useEffect } from 'react';
import { Canvas, Point } from 'fabric';

interface UseCanvasTouchGesturesOptions {
  canvasElementRef: React.MutableRefObject<HTMLCanvasElement | null>;
  fabricCanvasRef: React.MutableRefObject<Canvas | null>;
  lastContainerRef: React.MutableRefObject<HTMLElement | null>;
  fitToContainerRef: React.MutableRefObject<(container: HTMLElement | null) => void>;
  cropRepositionModeRef: React.MutableRefObject<boolean>;
  scheduleCanvasRender: (canvas: Canvas) => void;
}

export function useCanvasTouchGestures({
  canvasElementRef,
  fabricCanvasRef,
  lastContainerRef,
  fitToContainerRef,
  cropRepositionModeRef,
  scheduleCanvasRender,
}: UseCanvasTouchGesturesOptions) {
  useEffect(() => {
    const canvasElement = canvasElementRef.current;
    const canvas = fabricCanvasRef.current;
    if (!canvasElement || !canvas) return;

    let isPinching = false;
    let initialDist = 0;
    let initialZoom = 1;
    let initialViewportTransform: number[] = [];
    let pinchCenterX = 0;
    let pinchCenterY = 0;
    let lastTouchTime = 0;

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const now = Date.now();
        if (now - lastTouchTime < 300) {
          event.preventDefault();
          fitToContainerRef.current(lastContainerRef.current);
        }
        lastTouchTime = now;
      }

      if (event.touches.length === 2 && !cropRepositionModeRef.current) {
        event.preventDefault();
        isPinching = true;

        const t1 = event.touches[0];
        const t2 = event.touches[1];
        initialDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        initialZoom = canvas.getZoom();
        initialViewportTransform = [...(canvas.viewportTransform || [1, 0, 0, 1, 0, 0])];

        const rect = canvasElement.getBoundingClientRect();
        pinchCenterX = (t1.clientX + t2.clientX) / 2 - rect.left;
        pinchCenterY = (t1.clientY + t2.clientY) / 2 - rect.top;
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (isPinching && event.touches.length === 2 && !cropRepositionModeRef.current) {
        event.preventDefault();

        const t1 = event.touches[0];
        const t2 = event.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (initialDist > 0) {
          const factor = dist / initialDist;
          let newZoom = initialZoom * factor;

          const defaultScale = initialViewportTransform[0] || 1;
          const minZoom = defaultScale * 0.5;
          const maxZoom = defaultScale * 8;
          newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

          canvas.zoomToPoint(new Point(pinchCenterX, pinchCenterY), newZoom);
          scheduleCanvasRender(canvas);
        }
      }
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) {
        isPinching = false;
      }
    };

    canvasElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      canvasElement.removeEventListener('touchstart', handleTouchStart);
      canvasElement.removeEventListener('touchmove', handleTouchMove);
      canvasElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canvasElementRef, cropRepositionModeRef, fabricCanvasRef, fitToContainerRef, lastContainerRef, scheduleCanvasRender]);
}
