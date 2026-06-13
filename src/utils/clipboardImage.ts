const IMAGE_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/avif': 'avif',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
};

export function getClipboardImageFile(data: DataTransfer | null): File | null {
  if (!data) return null;

  const files = Array.from(data.files ?? []);
  const directFile = files.find((file) => isImageFile(file));
  if (directFile) return normalizeClipboardImageFile(directFile);

  const items = Array.from(data.items ?? []);
  for (const item of items) {
    if (item.kind !== 'file') continue;

    const file = item.getAsFile();
    if (file && isImageFile(file, item.type)) {
      return normalizeClipboardImageFile(file, item.type || file.type);
    }
  }

  return null;
}

export async function readClipboardImageFile(): Promise<File | null> {
  if (!navigator.clipboard?.read) return null;

  const items = await navigator.clipboard.read();
  for (const item of items) {
    const imageType = item.types.find((type) => type.startsWith('image/'));
    if (!imageType) continue;

    const blob = await item.getType(imageType);
    return normalizeClipboardImageBlob(blob, imageType);
  }

  return null;
}

function isImageFile(file: File, preferredType = file.type): boolean {
  return preferredType.startsWith('image/') || file.type.startsWith('image/') || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(file.name);
}

function normalizeClipboardImageFile(file: File, preferredType = file.type): File {
  const type = preferredType || file.type || 'image/png';
  const hasName = file.name && /\.[a-z0-9]+$/i.test(file.name);
  if (hasName && file.type) return file;

  const extension = IMAGE_EXTENSION_BY_TYPE[type] ?? 'png';
  return new File([file], file.name || `pasted-image.${extension}`, {
    type,
    lastModified: file.lastModified,
  });
}

function normalizeClipboardImageBlob(blob: Blob, type: string): File {
  const extension = IMAGE_EXTENSION_BY_TYPE[type] ?? 'png';
  return new File([blob], `pasted-image.${extension}`, {
    type,
    lastModified: Date.now(),
  });
}
