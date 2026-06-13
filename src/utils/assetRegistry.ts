import type { BlendMode } from '../types/layers';

export type BuiltInAssetCategory = 'overlays' | 'stickers' | 'ui-overlays' | 'frames';

export interface BuiltInAsset {
  id: string;
  name: string;
  category: BuiltInAssetCategory;
  type: string;
  src: string;
  previewSrc: string;
  format?: string;
  tags: string[];
  recommendedBlendMode?: BlendMode;
  recommendedOpacity?: number;
}

interface RootAssetManifest {
  manifests?: Array<{
    category?: string;
    type?: string;
    manifest?: string;
  }>;
}

interface CategoryAssetManifest {
  category?: string;
  type?: string;
  items?: Array<{
    id?: string;
    name?: string;
    file?: string;
    preview?: string;
    format?: string;
    tags?: string[];
    recommendedBlendMode?: BlendMode;
    recommendedOpacity?: number;
  }>;
}

const ASSET_BASE_PATH = `${import.meta.env.BASE_URL}assets`.replace(/\/+$/, '');
const INTEGRATED_CATEGORIES = new Set(['overlays', 'stickers', 'ui-overlays']);
const SUPPORTED_FORMATS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg']);

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '');

const dirname = (path: string) => {
  const clean = trimSlashes(path);
  const index = clean.lastIndexOf('/');
  return index >= 0 ? clean.slice(0, index) : '';
};

const resolveAssetPath = (baseDir: string, path: string) => {
  if (path.startsWith('/')) return path;
  const parts = [...baseDir.split('/'), ...path.split('/')].filter(Boolean);
  const resolved: string[] = [];
  parts.forEach((part) => {
    if (part === '.') return;
    if (part === '..') {
      resolved.pop();
      return;
    }
    resolved.push(part);
  });
  return `${ASSET_BASE_PATH}/${resolved.join('/')}`;
};

export async function loadBuiltInAssets(): Promise<BuiltInAsset[]> {
  const rootResponse = await fetch(`${ASSET_BASE_PATH}/manifest.json`);
  if (!rootResponse.ok) return [];

  const root = await rootResponse.json() as RootAssetManifest;
  const manifestRefs = (root.manifests ?? []).filter((ref) =>
    ref.category &&
    ref.type &&
    ref.manifest &&
    INTEGRATED_CATEGORIES.has(ref.category),
  );

  const assets = await Promise.all(manifestRefs.map(async (ref) => {
    try {
      const manifestPath = trimSlashes(ref.manifest ?? '');
      const response = await fetch(`${ASSET_BASE_PATH}/${manifestPath}`);
      if (!response.ok) return [];

      const manifest = await response.json() as CategoryAssetManifest;
      const category = manifest.category ?? ref.category;
      const type = manifest.type ?? ref.type ?? 'asset';
      const baseDir = dirname(manifestPath);

      return (manifest.items ?? [])
        .filter((item) => item.id && item.file)
        .map((item): BuiltInAsset | null => {
          const format = item.format ?? item.file?.split('.').pop()?.toLowerCase();
          if (!format || !SUPPORTED_FORMATS.has(format)) return null;
          return {
            id: item.id ?? item.file ?? '',
            name: item.name ?? item.id ?? item.file ?? 'Asset',
            category: category as BuiltInAssetCategory,
            type,
            src: resolveAssetPath(baseDir, item.file ?? ''),
            previewSrc: (category === 'stickers' || category === 'ui-overlays')
              ? resolveAssetPath(baseDir, item.file ?? '')
              : (item.preview ? resolveAssetPath(baseDir, item.preview) : resolveAssetPath(baseDir, item.file ?? '')),
            format,
            tags: item.tags ?? [],
            recommendedBlendMode: item.recommendedBlendMode,
            recommendedOpacity: item.recommendedOpacity,
          };
        })
        .filter((asset): asset is BuiltInAsset => Boolean(asset));
    } catch {
      return [];
    }
  }));

    const fetched = assets.flat();
  
  // Map relative paths using ASSET_BASE_PATH
  const mappedStatic = STATIC_NEW_ASSETS.map(asset => ({
    ...asset,
    src: `${ASSET_BASE_PATH}/${asset.src}`,
    previewSrc: `${ASSET_BASE_PATH}/${asset.previewSrc}`
  }));
  
  return [...fetched, ...mappedStatic];
}


export const STATIC_NEW_ASSETS: BuiltInAsset[] = [
  {
    "id": "sticker_cursor_arrow_01.png",
    "name": "Cursor Arrow 01",
    "category": "stickers",
    "type": "cursor",
    "src": "stickers/pack/cursor_arrow_01.png",
    "previewSrc": "stickers/pack/cursor_arrow_01.png",
    "format": "png",
    "tags": [
      "cursor",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_cursor_hand_02.png",
    "name": "Cursor Hand 02",
    "category": "stickers",
    "type": "cursor",
    "src": "stickers/pack/cursor_hand_02.png",
    "previewSrc": "stickers/pack/cursor_hand_02.png",
    "format": "png",
    "tags": [
      "cursor",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_cursor_move_04.png",
    "name": "Cursor Move 04",
    "category": "stickers",
    "type": "cursor",
    "src": "stickers/pack/cursor_move_04.png",
    "previewSrc": "stickers/pack/cursor_move_04.png",
    "format": "png",
    "tags": [
      "cursor",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_flower_daisy_01.png",
    "name": "Flower Daisy 01",
    "category": "stickers",
    "type": "flower",
    "src": "stickers/pack/flower_daisy_01.png",
    "previewSrc": "stickers/pack/flower_daisy_01.png",
    "format": "png",
    "tags": [
      "flower",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_flower_green_branch_03.png",
    "name": "Flower Green Branch 03",
    "category": "stickers",
    "type": "flower",
    "src": "stickers/pack/flower_green_branch_03.png",
    "previewSrc": "stickers/pack/flower_green_branch_03.png",
    "format": "png",
    "tags": [
      "flower",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_flower_leaf_02.png",
    "name": "Flower Leaf 02",
    "category": "stickers",
    "type": "flower",
    "src": "stickers/pack/flower_leaf_02.png",
    "previewSrc": "stickers/pack/flower_leaf_02.png",
    "format": "png",
    "tags": [
      "flower",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_flower_pressed_leaf_05.png",
    "name": "Flower Pressed Leaf 05",
    "category": "stickers",
    "type": "flower",
    "src": "stickers/pack/flower_pressed_leaf_05.png",
    "previewSrc": "stickers/pack/flower_pressed_leaf_05.png",
    "format": "png",
    "tags": [
      "flower",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_flower_small_bouquet_04.png",
    "name": "Flower Small Bouquet 04",
    "category": "stickers",
    "type": "flower",
    "src": "stickers/pack/flower_small_bouquet_04.png",
    "previewSrc": "stickers/pack/flower_small_bouquet_04.png",
    "format": "png",
    "tags": [
      "flower",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_label_mint_tag_03.png",
    "name": "Label Mint Tag 03",
    "category": "stickers",
    "type": "label",
    "src": "stickers/pack/label_mint_tag_03.png",
    "previewSrc": "stickers/pack/label_mint_tag_03.png",
    "format": "png",
    "tags": [
      "label",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_label_round_01.png",
    "name": "Label Round 01",
    "category": "stickers",
    "type": "label",
    "src": "stickers/pack/label_round_01.png",
    "previewSrc": "stickers/pack/label_round_01.png",
    "format": "png",
    "tags": [
      "label",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_label_type_02.png",
    "name": "Label Type 02",
    "category": "stickers",
    "type": "label",
    "src": "stickers/pack/label_type_02.png",
    "previewSrc": "stickers/pack/label_type_02.png",
    "format": "png",
    "tags": [
      "label",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_memo_index_card_03.png",
    "name": "Memo Index Card 03",
    "category": "stickers",
    "type": "memo",
    "src": "stickers/pack/memo_index_card_03.png",
    "previewSrc": "stickers/pack/memo_index_card_03.png",
    "format": "png",
    "tags": [
      "memo",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_memo_paper_square_01.png",
    "name": "Memo Paper Square 01",
    "category": "stickers",
    "type": "memo",
    "src": "stickers/pack/memo_paper_square_01.png",
    "previewSrc": "stickers/pack/memo_paper_square_01.png",
    "format": "png",
    "tags": [
      "memo",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_memo_paper_torn_02.png",
    "name": "Memo Paper Torn 02",
    "category": "stickers",
    "type": "memo",
    "src": "stickers/pack/memo_paper_torn_02.png",
    "previewSrc": "stickers/pack/memo_paper_torn_02.png",
    "format": "png",
    "tags": [
      "memo",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_sparkle_cluster_02.png",
    "name": "Sparkle Cluster 02",
    "category": "stickers",
    "type": "sparkle",
    "src": "stickers/pack/sparkle_cluster_02.png",
    "previewSrc": "stickers/pack/sparkle_cluster_02.png",
    "format": "png",
    "tags": [
      "sparkle",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_sparkle_star_01.png",
    "name": "Sparkle Star 01",
    "category": "stickers",
    "type": "sparkle",
    "src": "stickers/pack/sparkle_star_01.png",
    "previewSrc": "stickers/pack/sparkle_star_01.png",
    "format": "png",
    "tags": [
      "sparkle",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_sparkle_twinkle_03.png",
    "name": "Sparkle Twinkle 03",
    "category": "stickers",
    "type": "sparkle",
    "src": "stickers/pack/sparkle_twinkle_03.png",
    "previewSrc": "stickers/pack/sparkle_twinkle_03.png",
    "format": "png",
    "tags": [
      "sparkle",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_tape_grid_02.png",
    "name": "Tape Grid 02",
    "category": "stickers",
    "type": "tape",
    "src": "stickers/pack/tape_grid_02.png",
    "previewSrc": "stickers/pack/tape_grid_02.png",
    "format": "png",
    "tags": [
      "tape",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_tape_masking_01.png",
    "name": "Tape Masking 01",
    "category": "stickers",
    "type": "tape",
    "src": "stickers/pack/tape_masking_01.png",
    "previewSrc": "stickers/pack/tape_masking_01.png",
    "format": "png",
    "tags": [
      "tape",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "sticker_tape_washi_04.png",
    "name": "Tape Washi 04",
    "category": "stickers",
    "type": "tape",
    "src": "stickers/pack/tape_washi_04.png",
    "previewSrc": "stickers/pack/tape_washi_04.png",
    "format": "png",
    "tags": [
      "tape",
      "sticker",
      "pack"
    ]
  },
  {
    "id": "frame_app_window_dark_sidebar_02.png",
    "name": "App Window Dark Sidebar 02",
    "category": "frames",
    "type": "app",
    "src": "frames/pack/app_window_dark_sidebar_02.png",
    "previewSrc": "frames/pack/app_window_dark_sidebar_02.png",
    "format": "png",
    "tags": [
      "app",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_app_window_light_sidebar_01.png",
    "name": "App Window Light Sidebar 01",
    "category": "frames",
    "type": "app",
    "src": "frames/pack/app_window_light_sidebar_01.png",
    "previewSrc": "frames/pack/app_window_light_sidebar_01.png",
    "format": "png",
    "tags": [
      "app",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_aqua_photo_grid_15.png",
    "name": "Aqua Photo Grid 15",
    "category": "frames",
    "type": "aqua",
    "src": "frames/pack/aqua_photo_grid_15.png",
    "previewSrc": "frames/pack/aqua_photo_grid_15.png",
    "format": "png",
    "tags": [
      "aqua",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_aqua_quicklook_14.png",
    "name": "Aqua Quicklook 14",
    "category": "frames",
    "type": "aqua",
    "src": "frames/pack/aqua_quicklook_14.png",
    "previewSrc": "frames/pack/aqua_quicklook_14.png",
    "format": "png",
    "tags": [
      "aqua",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_aqua_sidebar_05.png",
    "name": "Aqua Sidebar 05",
    "category": "frames",
    "type": "aqua",
    "src": "frames/pack/aqua_sidebar_05.png",
    "previewSrc": "frames/pack/aqua_sidebar_05.png",
    "format": "png",
    "tags": [
      "aqua",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_aqua_utility_08.png",
    "name": "Aqua Utility 08",
    "category": "frames",
    "type": "aqua",
    "src": "frames/pack/aqua_utility_08.png",
    "previewSrc": "frames/pack/aqua_utility_08.png",
    "format": "png",
    "tags": [
      "aqua",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_binder_note_frame_01.png",
    "name": "Binder Note Frame 01",
    "category": "frames",
    "type": "binder",
    "src": "frames/pack/binder_note_frame_01.png",
    "previewSrc": "frames/pack/binder_note_frame_01.png",
    "format": "png",
    "tags": [
      "binder",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_black_clickwheel_player_frame.png",
    "name": "Black Clickwheel Player Frame",
    "category": "frames",
    "type": "black",
    "src": "frames/pack/black_clickwheel_player_frame.png",
    "previewSrc": "frames/pack/black_clickwheel_player_frame.png",
    "format": "png",
    "tags": [
      "black",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_browser_chrome_dark_02.png",
    "name": "Browser Chrome Dark 02",
    "category": "frames",
    "type": "browser",
    "src": "frames/pack/browser_chrome_dark_02.png",
    "previewSrc": "frames/pack/browser_chrome_dark_02.png",
    "format": "png",
    "tags": [
      "browser",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_browser_chrome_light_01.png",
    "name": "Browser Chrome Light 01",
    "category": "frames",
    "type": "browser",
    "src": "frames/pack/browser_chrome_light_01.png",
    "previewSrc": "frames/pack/browser_chrome_light_01.png",
    "format": "png",
    "tags": [
      "browser",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_browser_window_classic_03.png",
    "name": "Browser Window Classic 03",
    "category": "frames",
    "type": "browser",
    "src": "frames/pack/browser_window_classic_03.png",
    "previewSrc": "frames/pack/browser_window_classic_03.png",
    "format": "png",
    "tags": [
      "browser",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_browser_window_mint_04.png",
    "name": "Browser Window Mint 04",
    "category": "frames",
    "type": "browser",
    "src": "frames/pack/browser_window_mint_04.png",
    "previewSrc": "frames/pack/browser_window_mint_04.png",
    "format": "png",
    "tags": [
      "browser",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_chatgpt_frame_01.png",
    "name": "Chatgpt Frame 01",
    "category": "frames",
    "type": "chatgpt",
    "src": "frames/pack/chatgpt_frame_01.png",
    "previewSrc": "frames/pack/chatgpt_frame_01.png",
    "format": "png",
    "tags": [
      "chatgpt",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_chatgpt_frame_02.png",
    "name": "Chatgpt Frame 02",
    "category": "frames",
    "type": "chatgpt",
    "src": "frames/pack/chatgpt_frame_02.png",
    "previewSrc": "frames/pack/chatgpt_frame_02.png",
    "format": "png",
    "tags": [
      "chatgpt",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_chatgpt_frame_03.png",
    "name": "Chatgpt Frame 03",
    "category": "frames",
    "type": "chatgpt",
    "src": "frames/pack/chatgpt_frame_03.png",
    "previewSrc": "frames/pack/chatgpt_frame_03.png",
    "format": "png",
    "tags": [
      "chatgpt",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_chatgpt_frame_04.png",
    "name": "Chatgpt Frame 04",
    "category": "frames",
    "type": "chatgpt",
    "src": "frames/pack/chatgpt_frame_04.png",
    "previewSrc": "frames/pack/chatgpt_frame_04.png",
    "format": "png",
    "tags": [
      "chatgpt",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_chatgpt_frame_05.png",
    "name": "Chatgpt Frame 05",
    "category": "frames",
    "type": "chatgpt",
    "src": "frames/pack/chatgpt_frame_05.png",
    "previewSrc": "frames/pack/chatgpt_frame_05.png",
    "format": "png",
    "tags": [
      "chatgpt",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_chatgpt_frame_06.png",
    "name": "Chatgpt Frame 06",
    "category": "frames",
    "type": "chatgpt",
    "src": "frames/pack/chatgpt_frame_06.png",
    "previewSrc": "frames/pack/chatgpt_frame_06.png",
    "format": "png",
    "tags": [
      "chatgpt",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_chatgpt_frame_07.png",
    "name": "Chatgpt Frame 07",
    "category": "frames",
    "type": "chatgpt",
    "src": "frames/pack/chatgpt_frame_07.png",
    "previewSrc": "frames/pack/chatgpt_frame_07.png",
    "format": "png",
    "tags": [
      "chatgpt",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_classic_gray_window_01.png",
    "name": "Classic Gray Window 01",
    "category": "frames",
    "type": "classic",
    "src": "frames/pack/classic_gray_window_01.png",
    "previewSrc": "frames/pack/classic_gray_window_01.png",
    "format": "png",
    "tags": [
      "classic",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_classic_messenger_window_frame.png",
    "name": "Classic Messenger Window Frame",
    "category": "frames",
    "type": "classic",
    "src": "frames/pack/classic_messenger_window_frame.png",
    "previewSrc": "frames/pack/classic_messenger_window_frame.png",
    "format": "png",
    "tags": [
      "classic",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_clipboard_note_frame_01.png",
    "name": "Clipboard Note Frame 01",
    "category": "frames",
    "type": "clipboard",
    "src": "frames/pack/clipboard_note_frame_01.png",
    "previewSrc": "frames/pack/clipboard_note_frame_01.png",
    "format": "png",
    "tags": [
      "clipboard",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_contact_border_frame_01.png",
    "name": "Contact Border Frame 01",
    "category": "frames",
    "type": "contact",
    "src": "frames/pack/contact_border_frame_01.png",
    "previewSrc": "frames/pack/contact_border_frame_01.png",
    "format": "png",
    "tags": [
      "contact",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_corner_stamp_frame_01.png",
    "name": "Corner Stamp Frame 01",
    "category": "frames",
    "type": "corner",
    "src": "frames/pack/corner_stamp_frame_01.png",
    "previewSrc": "frames/pack/corner_stamp_frame_01.png",
    "format": "png",
    "tags": [
      "corner",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_deckle_square_frame_01.png",
    "name": "Deckle Square Frame 01",
    "category": "frames",
    "type": "deckle",
    "src": "frames/pack/deckle_square_frame_01.png",
    "previewSrc": "frames/pack/deckle_square_frame_01.png",
    "format": "png",
    "tags": [
      "deckle",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_desktop_monitor_beige_01.png",
    "name": "Desktop Monitor Beige 01",
    "category": "frames",
    "type": "desktop",
    "src": "frames/pack/desktop_monitor_beige_01.png",
    "previewSrc": "frames/pack/desktop_monitor_beige_01.png",
    "format": "png",
    "tags": [
      "desktop",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_desktop_monitor_black_02.png",
    "name": "Desktop Monitor Black 02",
    "category": "frames",
    "type": "desktop",
    "src": "frames/pack/desktop_monitor_black_02.png",
    "previewSrc": "frames/pack/desktop_monitor_black_02.png",
    "format": "png",
    "tags": [
      "desktop",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_desktop_window_dark_02.png",
    "name": "Desktop Window Dark 02",
    "category": "frames",
    "type": "desktop",
    "src": "frames/pack/desktop_window_dark_02.png",
    "previewSrc": "frames/pack/desktop_window_dark_02.png",
    "format": "png",
    "tags": [
      "desktop",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_desktop_window_light_01.png",
    "name": "Desktop Window Light 01",
    "category": "frames",
    "type": "desktop",
    "src": "frames/pack/desktop_window_light_01.png",
    "previewSrc": "frames/pack/desktop_window_light_01.png",
    "format": "png",
    "tags": [
      "desktop",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_error_dialog_02.png",
    "name": "Error Dialog 02",
    "category": "frames",
    "type": "error",
    "src": "frames/pack/error_dialog_02.png",
    "previewSrc": "frames/pack/error_dialog_02.png",
    "format": "png",
    "tags": [
      "error",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_file_card_stamp_02.png",
    "name": "File Card Stamp 02",
    "category": "frames",
    "type": "file",
    "src": "frames/pack/file_card_stamp_02.png",
    "previewSrc": "frames/pack/file_card_stamp_02.png",
    "format": "png",
    "tags": [
      "file",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_file_explorer_gray_02.png",
    "name": "File Explorer Gray 02",
    "category": "frames",
    "type": "file",
    "src": "frames/pack/file_explorer_gray_02.png",
    "previewSrc": "frames/pack/file_explorer_gray_02.png",
    "format": "png",
    "tags": [
      "file",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_film_strip_horizontal_04.png",
    "name": "Film Strip Horizontal 04",
    "category": "frames",
    "type": "film",
    "src": "frames/pack/film_strip_horizontal_04.png",
    "previewSrc": "frames/pack/film_strip_horizontal_04.png",
    "format": "png",
    "tags": [
      "film",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_film_strip_vertical_03.png",
    "name": "Film Strip Vertical 03",
    "category": "frames",
    "type": "film",
    "src": "frames/pack/film_strip_vertical_03.png",
    "previewSrc": "frames/pack/film_strip_vertical_03.png",
    "format": "png",
    "tags": [
      "film",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_floppy_label_card_01.png",
    "name": "Floppy Label Card 01",
    "category": "frames",
    "type": "floppy",
    "src": "frames/pack/floppy_label_card_01.png",
    "previewSrc": "frames/pack/floppy_label_card_01.png",
    "format": "png",
    "tags": [
      "floppy",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_folder_card_tab_01.png",
    "name": "Folder Card Tab 01",
    "category": "frames",
    "type": "folder",
    "src": "frames/pack/folder_card_tab_01.png",
    "previewSrc": "frames/pack/folder_card_tab_01.png",
    "format": "png",
    "tags": [
      "folder",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_folder_label_frame_02.png",
    "name": "Folder Label Frame 02",
    "category": "frames",
    "type": "folder",
    "src": "frames/pack/folder_label_frame_02.png",
    "previewSrc": "frames/pack/folder_label_frame_02.png",
    "format": "png",
    "tags": [
      "folder",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_instant_square_shadow_03.png",
    "name": "Instant Square Shadow 03",
    "category": "frames",
    "type": "instant",
    "src": "frames/pack/instant_square_shadow_03.png",
    "previewSrc": "frames/pack/instant_square_shadow_03.png",
    "format": "png",
    "tags": [
      "instant",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_instant_tall_caption_04.png",
    "name": "Instant Tall Caption 04",
    "category": "frames",
    "type": "instant",
    "src": "frames/pack/instant_tall_caption_04.png",
    "previewSrc": "frames/pack/instant_tall_caption_04.png",
    "format": "png",
    "tags": [
      "instant",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_laptop_midnight_02.png",
    "name": "Laptop Midnight 02",
    "category": "frames",
    "type": "laptop",
    "src": "frames/pack/laptop_midnight_02.png",
    "previewSrc": "frames/pack/laptop_midnight_02.png",
    "format": "png",
    "tags": [
      "laptop",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_laptop_silver_01.png",
    "name": "Laptop Silver 01",
    "category": "frames",
    "type": "laptop",
    "src": "frames/pack/laptop_silver_01.png",
    "previewSrc": "frames/pack/laptop_silver_01.png",
    "format": "png",
    "tags": [
      "laptop",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_login_dialog_01.png",
    "name": "Login Dialog 01",
    "category": "frames",
    "type": "login",
    "src": "frames/pack/login_dialog_01.png",
    "previewSrc": "frames/pack/login_dialog_01.png",
    "format": "png",
    "tags": [
      "login",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_mac_radical_loupe_quicklook_11.png",
    "name": "Mac Radical Loupe Quicklook 11",
    "category": "frames",
    "type": "mac",
    "src": "frames/pack/mac_radical_loupe_quicklook_11.png",
    "previewSrc": "frames/pack/mac_radical_loupe_quicklook_11.png",
    "format": "png",
    "tags": [
      "mac",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_mac_radical_pinstripe_panel_04.png",
    "name": "Mac Radical Pinstripe Panel 04",
    "category": "frames",
    "type": "mac",
    "src": "frames/pack/mac_radical_pinstripe_panel_04.png",
    "previewSrc": "frames/pack/mac_radical_pinstripe_panel_04.png",
    "format": "png",
    "tags": [
      "mac",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_old_browser_window_03.png",
    "name": "Old Browser Window 03",
    "category": "frames",
    "type": "old",
    "src": "frames/pack/old_browser_window_03.png",
    "previewSrc": "frames/pack/old_browser_window_03.png",
    "format": "png",
    "tags": [
      "old",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_paper_card_clean_01.png",
    "name": "Paper Card Clean 01",
    "category": "frames",
    "type": "paper",
    "src": "frames/pack/paper_card_clean_01.png",
    "previewSrc": "frames/pack/paper_card_clean_01.png",
    "format": "png",
    "tags": [
      "paper",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_paper_card_torn_02.png",
    "name": "Paper Card Torn 02",
    "category": "frames",
    "type": "paper",
    "src": "frames/pack/paper_card_torn_02.png",
    "previewSrc": "frames/pack/paper_card_torn_02.png",
    "format": "png",
    "tags": [
      "paper",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_phone_frame_black_02.png",
    "name": "Phone Frame Black 02",
    "category": "frames",
    "type": "phone",
    "src": "frames/pack/phone_frame_black_02.png",
    "previewSrc": "frames/pack/phone_frame_black_02.png",
    "format": "png",
    "tags": [
      "phone",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_phone_frame_white_01.png",
    "name": "Phone Frame White 01",
    "category": "frames",
    "type": "phone",
    "src": "frames/pack/phone_frame_white_01.png",
    "previewSrc": "frames/pack/phone_frame_white_01.png",
    "format": "png",
    "tags": [
      "phone",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_photo_booth_window_frame.png",
    "name": "Photo Booth Window Frame",
    "category": "frames",
    "type": "photo",
    "src": "frames/pack/photo_booth_window_frame.png",
    "previewSrc": "frames/pack/photo_booth_window_frame.png",
    "format": "png",
    "tags": [
      "photo",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_pixel_desktop_01.png",
    "name": "Pixel Desktop 01",
    "category": "frames",
    "type": "pixel",
    "src": "frames/pack/pixel_desktop_01.png",
    "previewSrc": "frames/pack/pixel_desktop_01.png",
    "format": "png",
    "tags": [
      "pixel",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_polaroid_classic_01.png",
    "name": "Polaroid Classic 01",
    "category": "frames",
    "type": "polaroid",
    "src": "frames/pack/polaroid_classic_01.png",
    "previewSrc": "frames/pack/polaroid_classic_01.png",
    "format": "png",
    "tags": [
      "polaroid",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_polaroid_wide_02.png",
    "name": "Polaroid Wide 02",
    "category": "frames",
    "type": "polaroid",
    "src": "frames/pack/polaroid_wide_02.png",
    "previewSrc": "frames/pack/polaroid_wide_02.png",
    "format": "png",
    "tags": [
      "polaroid",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_qwerty_slider_phone_frame.png",
    "name": "Qwerty Slider Phone Frame",
    "category": "frames",
    "type": "qwerty",
    "src": "frames/pack/qwerty_slider_phone_frame.png",
    "previewSrc": "frames/pack/qwerty_slider_phone_frame.png",
    "format": "png",
    "tags": [
      "qwerty",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_retro_music_player_window_frame.png",
    "name": "Retro Music Player Window Frame",
    "category": "frames",
    "type": "retro",
    "src": "frames/pack/retro_music_player_window_frame.png",
    "previewSrc": "frames/pack/retro_music_player_window_frame.png",
    "format": "png",
    "tags": [
      "retro",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_retro_window_beige_01.png",
    "name": "Retro Window Beige 01",
    "category": "frames",
    "type": "retro",
    "src": "frames/pack/retro_window_beige_01.png",
    "previewSrc": "frames/pack/retro_window_beige_01.png",
    "format": "png",
    "tags": [
      "retro",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_silver_pocket_pc_frame.png",
    "name": "Silver Pocket Pc Frame",
    "category": "frames",
    "type": "silver",
    "src": "frames/pack/silver_pocket_pc_frame.png",
    "previewSrc": "frames/pack/silver_pocket_pc_frame.png",
    "format": "png",
    "tags": [
      "silver",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_stamp_border_classic_03.png",
    "name": "Stamp Border Classic 03",
    "category": "frames",
    "type": "stamp",
    "src": "frames/pack/stamp_border_classic_03.png",
    "previewSrc": "frames/pack/stamp_border_classic_03.png",
    "format": "png",
    "tags": [
      "stamp",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_ticket_stub_frame_01.png",
    "name": "Ticket Stub Frame 01",
    "category": "frames",
    "type": "ticket",
    "src": "frames/pack/ticket_stub_frame_01.png",
    "previewSrc": "frames/pack/ticket_stub_frame_01.png",
    "format": "png",
    "tags": [
      "ticket",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_verification_popup_frame.png",
    "name": "Verification Popup Frame",
    "category": "frames",
    "type": "verification",
    "src": "frames/pack/verification_popup_frame.png",
    "previewSrc": "frames/pack/verification_popup_frame.png",
    "format": "png",
    "tags": [
      "verification",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_virtual_pc_window_frame.png",
    "name": "Virtual Pc Window Frame",
    "category": "frames",
    "type": "virtual",
    "src": "frames/pack/virtual_pc_window_frame.png",
    "previewSrc": "frames/pack/virtual_pc_window_frame.png",
    "format": "png",
    "tags": [
      "virtual",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_washi_corner_frame_01.png",
    "name": "Washi Corner Frame 01",
    "category": "frames",
    "type": "washi",
    "src": "frames/pack/washi_corner_frame_01.png",
    "previewSrc": "frames/pack/washi_corner_frame_01.png",
    "format": "png",
    "tags": [
      "washi",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_white_clickwheel_player_frame.png",
    "name": "White Clickwheel Player Frame",
    "category": "frames",
    "type": "white",
    "src": "frames/pack/white_clickwheel_player_frame.png",
    "previewSrc": "frames/pack/white_clickwheel_player_frame.png",
    "format": "png",
    "tags": [
      "white",
      "frame",
      "pack"
    ]
  },
  {
    "id": "frame_xp_blue_window_02.png",
    "name": "Xp Blue Window 02",
    "category": "frames",
    "type": "xp",
    "src": "frames/pack/xp_blue_window_02.png",
    "previewSrc": "frames/pack/xp_blue_window_02.png",
    "format": "png",
    "tags": [
      "xp",
      "frame",
      "pack"
    ]
  },
  {
    "id": "overlay_color_wash_blue_03.png",
    "name": "Color Wash Blue 03",
    "category": "overlays",
    "type": "color_wash",
    "src": "overlays/color_wash/color_wash_blue_03.png",
    "previewSrc": "overlays/color_wash/color_wash_blue_03.png",
    "format": "png",
    "tags": [
      "color_wash",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.85
  },
  {
    "id": "overlay_color_wash_faded_05.png",
    "name": "Color Wash Faded 05",
    "category": "overlays",
    "type": "color_wash",
    "src": "overlays/color_wash/color_wash_faded_05.png",
    "previewSrc": "overlays/color_wash/color_wash_faded_05.png",
    "format": "png",
    "tags": [
      "color_wash",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.85
  },
  {
    "id": "overlay_color_wash_mint_01.png",
    "name": "Color Wash Mint 01",
    "category": "overlays",
    "type": "color_wash",
    "src": "overlays/color_wash/color_wash_mint_01.png",
    "previewSrc": "overlays/color_wash/color_wash_mint_01.png",
    "format": "png",
    "tags": [
      "color_wash",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.85
  },
  {
    "id": "overlay_color_wash_peach_02.png",
    "name": "Color Wash Peach 02",
    "category": "overlays",
    "type": "color_wash",
    "src": "overlays/color_wash/color_wash_peach_02.png",
    "previewSrc": "overlays/color_wash/color_wash_peach_02.png",
    "format": "png",
    "tags": [
      "color_wash",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.85
  },
  {
    "id": "overlay_color_wash_warm_04.png",
    "name": "Color Wash Warm 04",
    "category": "overlays",
    "type": "color_wash",
    "src": "overlays/color_wash/color_wash_warm_04.png",
    "previewSrc": "overlays/color_wash/color_wash_warm_04.png",
    "format": "png",
    "tags": [
      "color_wash",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.85
  },
  {
    "id": "overlay_paper_cream_02.png",
    "name": "Paper Cream 02",
    "category": "overlays",
    "type": "paper_texture",
    "src": "overlays/paper_texture/paper_cream_02.png",
    "previewSrc": "overlays/paper_texture/paper_cream_02.png",
    "format": "png",
    "tags": [
      "paper_texture",
      "overlay"
    ],
    "recommendedBlendMode": "multiply",
    "recommendedOpacity": 0.8
  },
  {
    "id": "overlay_paper_fibers_01.png",
    "name": "Paper Fibers 01",
    "category": "overlays",
    "type": "paper_texture",
    "src": "overlays/paper_texture/paper_fibers_01.png",
    "previewSrc": "overlays/paper_texture/paper_fibers_01.png",
    "format": "png",
    "tags": [
      "paper_texture",
      "overlay"
    ],
    "recommendedBlendMode": "multiply",
    "recommendedOpacity": 0.8
  },
  {
    "id": "overlay_paper_folded_03.png",
    "name": "Paper Folded 03",
    "category": "overlays",
    "type": "paper_texture",
    "src": "overlays/paper_texture/paper_folded_03.png",
    "previewSrc": "overlays/paper_texture/paper_folded_03.png",
    "format": "png",
    "tags": [
      "paper_texture",
      "overlay"
    ],
    "recommendedBlendMode": "multiply",
    "recommendedOpacity": 0.8
  },
  {
    "id": "overlay_paper_grid_05.png",
    "name": "Paper Grid 05",
    "category": "overlays",
    "type": "paper_texture",
    "src": "overlays/paper_texture/paper_grid_05.png",
    "previewSrc": "overlays/paper_texture/paper_grid_05.png",
    "format": "png",
    "tags": [
      "paper_texture",
      "overlay"
    ],
    "recommendedBlendMode": "multiply",
    "recommendedOpacity": 0.8
  },
  {
    "id": "overlay_paper_recycled_04.png",
    "name": "Paper Recycled 04",
    "category": "overlays",
    "type": "paper_texture",
    "src": "overlays/paper_texture/paper_recycled_04.png",
    "previewSrc": "overlays/paper_texture/paper_recycled_04.png",
    "format": "png",
    "tags": [
      "paper_texture",
      "overlay"
    ],
    "recommendedBlendMode": "multiply",
    "recommendedOpacity": 0.8
  },
  {
    "id": "overlay_grain_dust_04.png",
    "name": "Grain Dust 04",
    "category": "overlays",
    "type": "grain",
    "src": "overlays/grain/grain_dust_04.png",
    "previewSrc": "overlays/grain/grain_dust_04.png",
    "format": "png",
    "tags": [
      "grain",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.5
  },
  {
    "id": "overlay_grain_film_05.png",
    "name": "Grain Film 05",
    "category": "overlays",
    "type": "grain",
    "src": "overlays/grain/grain_film_05.png",
    "previewSrc": "overlays/grain/grain_film_05.png",
    "format": "png",
    "tags": [
      "grain",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.5
  },
  {
    "id": "overlay_grain_medium_02.png",
    "name": "Grain Medium 02",
    "category": "overlays",
    "type": "grain",
    "src": "overlays/grain/grain_medium_02.png",
    "previewSrc": "overlays/grain/grain_medium_02.png",
    "format": "png",
    "tags": [
      "grain",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.5
  },
  {
    "id": "overlay_grain_rough_03.png",
    "name": "Grain Rough 03",
    "category": "overlays",
    "type": "grain",
    "src": "overlays/grain/grain_rough_03.png",
    "previewSrc": "overlays/grain/grain_rough_03.png",
    "format": "png",
    "tags": [
      "grain",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.5
  },
  {
    "id": "overlay_grain_soft_01.png",
    "name": "Grain Soft 01",
    "category": "overlays",
    "type": "grain",
    "src": "overlays/grain/grain_soft_01.png",
    "previewSrc": "overlays/grain/grain_soft_01.png",
    "format": "png",
    "tags": [
      "grain",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.5
  },
  {
    "id": "overlay_light_leak_coral_01.png",
    "name": "Light Leak Coral 01",
    "category": "overlays",
    "type": "light-leak",
    "src": "overlays/light-leak/light_leak_coral_01.png",
    "previewSrc": "overlays/light-leak/light_leak_coral_01.png",
    "format": "png",
    "tags": [
      "light-leak",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.7
  },
  {
    "id": "overlay_light_leak_edge_04.png",
    "name": "Light Leak Edge 04",
    "category": "overlays",
    "type": "light-leak",
    "src": "overlays/light-leak/light_leak_edge_04.png",
    "previewSrc": "overlays/light-leak/light_leak_edge_04.png",
    "format": "png",
    "tags": [
      "light-leak",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.7
  },
  {
    "id": "overlay_light_leak_gold_02.png",
    "name": "Light Leak Gold 02",
    "category": "overlays",
    "type": "light-leak",
    "src": "overlays/light-leak/light_leak_gold_02.png",
    "previewSrc": "overlays/light-leak/light_leak_gold_02.png",
    "format": "png",
    "tags": [
      "light-leak",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.7
  },
  {
    "id": "overlay_light_leak_haze_05.png",
    "name": "Light Leak Haze 05",
    "category": "overlays",
    "type": "light-leak",
    "src": "overlays/light-leak/light_leak_haze_05.png",
    "previewSrc": "overlays/light-leak/light_leak_haze_05.png",
    "format": "png",
    "tags": [
      "light-leak",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.7
  },
  {
    "id": "overlay_light_leak_rainbow_03.png",
    "name": "Light Leak Rainbow 03",
    "category": "overlays",
    "type": "light-leak",
    "src": "overlays/light-leak/light_leak_rainbow_03.png",
    "previewSrc": "overlays/light-leak/light_leak_rainbow_03.png",
    "format": "png",
    "tags": [
      "light-leak",
      "overlay"
    ],
    "recommendedBlendMode": "screen",
    "recommendedOpacity": 0.7
  }
];
