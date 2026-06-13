export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to load image.'));
    image.src = src;
  });
}

export async function resizeImageFile(file: File, maxDimension: number): Promise<string> {
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    try {
      const svgText = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgText, 'image/svg+xml');
      const parserError = doc.querySelector('parsererror');
      if (!parserError) {
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          const viewBox = svgEl.getAttribute('viewBox');
          const hasWidth = svgEl.hasAttribute('width');
          const hasHeight = svgEl.hasAttribute('height');

          if (viewBox && (!hasWidth || !hasHeight || svgEl.getAttribute('width')?.includes('%'))) {
            const parts = viewBox.trim().split(/\s+/).filter(Boolean);
            if (parts.length === 4) {
              const w = parseFloat(parts[2]);
              const h = parseFloat(parts[3]);
              if (!isNaN(w) && !isNaN(h)) {
                svgEl.setAttribute('width', w.toString());
                svgEl.setAttribute('height', h.toString());
                const serializer = new XMLSerializer();
                const newSvgText = serializer.serializeToString(doc);
                const blob = new Blob([newSvgText], { type: 'image/svg+xml' });
                return URL.createObjectURL(blob);
              }
            }
          }
        }
      }
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Error preprocessing uploaded SVG:', error);
    }
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);

  if (longestSide <= maxDimension) {
    return originalDataUrl;
  }

  const scale = maxDimension / longestSide;
  const width = Math.round(image.naturalWidth * scale);
  const height = Math.round(image.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    return originalDataUrl;
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const keepsAlpha = file.type === 'image/png' || file.type === 'image/webp';
  return canvas.toDataURL(keepsAlpha ? 'image/png' : 'image/jpeg', 0.9);
}

export function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export async function ensureSvgSizing(url: string): Promise<string> {
  const isSvgDataUrl = url.startsWith('data:image/svg+xml');
  const isSvgUrl = url.toLowerCase().split(/[?#]/)[0].endsWith('.svg');

  if (!isSvgDataUrl && !isSvgUrl) {
    return url;
  }

  try {
    let svgText = '';
    if (isSvgDataUrl) {
      const parts = url.split(',');
      const header = parts[0];
      const content = parts[1];
      if (header.includes('base64')) {
        const binaryString = atob(content);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        svgText = new TextDecoder('utf-8').decode(bytes);
      } else {
        svgText = decodeURIComponent(content);
      }
    } else {
      const response = await fetch(url);
      if (!response.ok) return url;
      svgText = await response.text();
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      return url;
    }

    const svgEl = doc.querySelector('svg');
    if (svgEl) {
      const viewBox = svgEl.getAttribute('viewBox');
      const hasWidth = svgEl.hasAttribute('width');
      const hasHeight = svgEl.hasAttribute('height');

      if (viewBox && (!hasWidth || !hasHeight || svgEl.getAttribute('width')?.includes('%'))) {
        const parts = viewBox.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 4) {
          const w = parseFloat(parts[2]);
          const h = parseFloat(parts[3]);
          if (!isNaN(w) && !isNaN(h)) {
            svgEl.setAttribute('width', w.toString());
            svgEl.setAttribute('height', h.toString());
            const serializer = new XMLSerializer();
            const newSvgText = serializer.serializeToString(doc);
            const blob = new Blob([newSvgText], { type: 'image/svg+xml' });
            return URL.createObjectURL(blob);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error processing SVG sizing:', error);
  }

  return url;
}
