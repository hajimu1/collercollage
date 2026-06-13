import type { CollageProjectFile } from '../types/layers';
import { downloadDataUrl } from './image';

export function migrate(data: any): CollageProjectFile {
  if (!data) return data;

  if (!data.version) {
    data.version = 1;
  }

  if (data.version === 1) {
    // Migrate from version 1 to version 2
    if (Array.isArray(data.layers)) {
      data.layers = data.layers.map((layer: any) => {
        if (layer.type === 'image') {
          return {
            ...layer,
            filters: layer.filters ?? {},
            flipX: layer.flipX ?? false,
            flipY: layer.flipY ?? false,
          };
        }
        if (layer.type === 'text') {
          return {
            ...layer,
            charSpacing: layer.charSpacing ?? 0,
            lineHeight: layer.lineHeight ?? 1.16,
            strokeEnabled: layer.strokeEnabled ?? false,
            strokeColor: layer.strokeColor ?? '#101820',
            strokeWidth: layer.strokeWidth ?? 0,
          };
        }
        if (layer.type === 'shape') {
          return {
            ...layer,
            gradientEnabled: layer.gradientEnabled ?? false,
            gradientType: layer.gradientType ?? 'linear',
            gradientColors: layer.gradientColors ?? [layer.fill || '#ffd43b', layer.fill || '#ffd43b'],
            gradientAngle: layer.gradientAngle ?? 0,
            solidFill: layer.fill || '#ffd43b',
          };
        }
        return layer;
      });
    }
    data.version = 2;
  }

  if (data.version === 2) {
    const collageClipByLayerId = new Map<string, string>();
    if (Array.isArray(data.layers)) {
      data.layers.forEach((layer: any) => {
        if (layer.type === 'image' && layer.collageCell?.clipType && layer.id) {
          collageClipByLayerId.set(layer.id, layer.collageCell.clipType);
        }
      });
    }

    if (data.collage) {
      const fallbackGap = data.collage.gapPx ?? 17;
      data.collage = {
        ...data.collage,
        gapX: data.collage.gapX ?? fallbackGap,
        gapY: data.collage.gapY ?? fallbackGap,
        cells: Array.isArray(data.collage.cells)
          ? data.collage.cells.map((cell: any) => ({
              ...cell,
              clipType: cell.clipType ?? (cell.layerId ? collageClipByLayerId.get(cell.layerId) : undefined),
            }))
          : [],
      };
    }

    if (Array.isArray(data.layers)) {
      data.layers = data.layers.map((layer: any) => {
        if (layer.type === 'image' && layer.collageCell) {
          return {
            ...layer,
            collageCell: {
              ...layer.collageCell,
              clipType: layer.collageCell.clipType,
            },
          };
        }
        return layer;
      });
    }

    data.version = 3;
  }

  if (data.version === 3) {
    if (Array.isArray(data.layers)) {
      data.layers = data.layers.map((layer: any) => ({
        ...layer,
        blendMode: layer.type === 'background' ? undefined : (layer.blendMode ?? 'normal'),
      }));
    }
    data.version = 4;
  }

  if (data.version === 4) {
    if (Array.isArray(data.layers)) {
      data.layers = data.layers.map((layer: any) => {
        if (layer.type !== 'adjustment') return layer;
        return {
          ...layer,
          kind: layer.kind ?? 'solid-color',
          target: layer.target ?? 'canvas',
          color: layer.color ?? '#f4a7c8',
          gradientType: layer.gradientType ?? 'linear',
          gradientColors: layer.gradientColors ?? ['#f4a7c8', '#fff2a8'],
          blendMode: layer.blendMode ?? 'screen',
        };
      });
    }
    data.version = 5;
  }

  if (data.version === 5) {
    // v5 → v6: introduced imageLayerData (Hybrid Smart Layer model).
    // imageLayerData is built at runtime from the legacy crop/clip/filters fields,
    // so no data migration is needed here. The version bump signals that all new
    // saves will carry imageLayerData on layers that have been touched since the upgrade.
    data.version = 6;
  }

  return data as CollageProjectFile;
}

export function validateProjectFile(value: unknown): CollageProjectFile {
  let project = value as any;

  if (!project || project.app !== 'collage-editor') {
    throw new Error('Unsupported project file.');
  }

  // Perform migration on-the-fly
  project = migrate(project);

  if (project.version !== 6) {
    throw new Error('Unsupported project version.');
  }

  if (!project.canvas?.width || !project.canvas?.height || !project.background || !Array.isArray(project.layers)) {
    throw new Error('Missing required project info.');
  }

  return project as CollageProjectFile;
}

export function downloadProjectFile(project: CollageProjectFile) {
  const stamp = new Date()
    .toISOString()
    .slice(0, 16)
    .replace(/[-:T]/g, '');
  const json = JSON.stringify(project, null, 2);
  const dataUrl = `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;
  downloadDataUrl(dataUrl, `collage-project-${stamp}.collage.json`);
}

export function readProjectFile(file: File): Promise<CollageProjectFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(validateProjectFile(JSON.parse(String(reader.result))));
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
