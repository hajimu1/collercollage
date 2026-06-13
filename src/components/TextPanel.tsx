import { AlignCenter, AlignLeft, AlignRight, Type } from 'lucide-react';
import { useState } from 'react';
import type { FabricEditorController } from '../hooks/useFabricEditor';
import { loadFontForCanvas } from '../utils/fabricHelpers';
import type {
  ShadowSettings,
  TextAlign,
  TextBackgroundBoxSettings,
  TextBackgroundBoxStyle,
} from '../types/layers';

interface TextPanelProps {
  editor: FabricEditorController;
}

const alignmentButtons: Array<{ align: TextAlign; label: string; icon: typeof AlignLeft }> = [
  { align: 'left', label: 'Left', icon: AlignLeft },
  { align: 'center', label: 'Center', icon: AlignCenter },
  { align: 'right', label: 'Right', icon: AlignRight },
];

interface FontOption {
  label: string;
  value: string;
}

interface FontOptionGroup {
  label: string;
  options: FontOption[];
}

type FontLanguage = 'ko' | 'en' | 'ja' | 'zh';

interface FontLanguageTab {
  id: FontLanguage;
  label: string;
  groups: FontOptionGroup[];
}

const FONT_LANGUAGE_TABS: FontLanguageTab[] = [
  {
    id: 'ko',
    label: 'Korean',
    groups: [
      {
        label: 'Gothic / Sans',
        options: [
          { label: 'System Default', value: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
          { label: 'Pretendard', value: 'Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
          { label: 'Noto Sans KR', value: '"Noto Sans KR", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
          { label: 'Nanum Gothic', value: '"Nanum Gothic", "Malgun Gothic", system-ui, sans-serif' },
          { label: 'Malgun Gothic', value: '"Malgun Gothic", system-ui, sans-serif' },
          { label: 'Apple SD Gothic Neo', value: '"Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif' },
          { label: 'Gothic A1', value: '"Gothic A1", "Noto Sans KR", system-ui, sans-serif' },
          { label: 'SUIT Variable', value: '"SUIT Variable", system-ui, sans-serif' },
          { label: 'AtoZ', value: '"AtoZ", system-ui, sans-serif' },
          { label: 'Spoka Han Sans Neo', value: '"SpokaHanSansNeo", "SUIT Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
          { label: 'Joseon Gulim', value: '"JoseonGulim", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
        ],
      },
      {
        label: 'Myungjo / Serif',
        options: [
          { label: 'Gungsuh', value: 'Gungsuh, "궁서", serif' },
          { label: 'SunBatang', value: '"SunBatang", serif' },
          { label: 'GounBatang', value: '"GounBatang", "SunBatang", "AppleMyungjo", "Batang", serif' },
          { label: 'BookkMyungjo', value: '"BookkMyungjo", "SunBatang", "AppleMyungjo", "Batang", serif' },
          { label: 'MapodaCapo', value: '"MapodaCapo", "SunBatang", "AppleMyungjo", "Batang", serif' },
        ],
      },
      {
        label: 'Rounded / Casual',
        options: [
          { label: 'SchoolSafetyRoundedSmile', value: '"SchoolSafetyRoundedSmile", "SUIT Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
          { label: 'MangoBoardTtobaks', value: '"MangoBoardTtobaks", "SUIT Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
          { label: 'Cafe24 Anemone Air', value: '"Cafe24AnemoneAir", "SUIT Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
        ],
      },
      {
        label: 'Handwriting',
        options: [
          { label: 'Kyobo Handwriting 2019', value: '"KyoboHandwriting2019", "Apple SD Gothic Neo", "Malgun Gothic", cursive' },
        ],
      },
      {
        label: 'Poster / Display',
        options: [
          { label: 'Aggravo', value: '"Aggravo", "SUIT Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
          { label: 'PartialSans', value: '"PartialSans", "SUIT Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
          { label: 'Cafe24 PROUP', value: '"Cafe24PROUP", sans-serif' },
          { label: 'BM Kkubulim', value: '"BM Kkubulim", sans-serif' },
        ],
      },
      {
        label: 'Retro / Pixel',
        options: [
          { label: 'DungGeunMo', value: '"DungGeunMo", monospace' },
          { label: 'HbiosSys', value: '"HbiosSys", "DungGeunMo", monospace' },
          { label: 'MonaS 8x12', value: '"MonaS 8x12", monospace' },
          { label: 'MonaS 10', value: '"MonaS 10", monospace' },
          { label: 'MonaS 10x12', value: '"MonaS 10x12", monospace' },
          { label: 'MonaS 12', value: '"MonaS 12", monospace' },
          { label: 'MaruMinya 12px', value: '"MaruMinya 12px", monospace' },
        ],
      },
    ],
  },
  {
    id: 'en',
    label: 'English',
    groups: [
      {
        label: 'Sans / UI',
        options: [
          { label: 'IBM Plex Sans', value: '"IBM Plex Sans", "SUIT Variable", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif' },
          { label: 'Archivo Black', value: '"Archivo Black", sans-serif' },
        ],
      },
      {
        label: 'Serif / Editorial',
        options: [
          { label: 'Georgia / Serif', value: 'Georgia, "Times New Roman", "Noto Serif KR", serif' },
          { label: 'Cormorant Garamond', value: '"Cormorant Garamond", Georgia, serif' },
          { label: 'Libre Baskerville', value: '"Libre Baskerville", Georgia, serif' },
          { label: 'Sedan', value: '"Sedan", Georgia, serif' },
          { label: 'Instrument Serif', value: '"Instrument Serif", Georgia, serif' },
          { label: 'Bodoni 72', value: '"Bodoni 72", Georgia, serif' },
          { label: 'ITC Galliard', value: '"ITC Galliard", Georgia, serif' },
          { label: 'Ogg Roman', value: '"Ogg Roman", Georgia, serif' },
          { label: 'American Typewriter', value: '"American Typewriter", Georgia, serif' },
        ],
      },
      {
        label: 'Display / Poster',
        options: [
          { label: 'Bebas Neue', value: '"Bebas Neue", sans-serif' },
          { label: 'Domaine Sans Fine', value: '"Domaine Sans Fine", sans-serif' },
          { label: 'Museo 900', value: '"Museo 900", sans-serif' },
          { label: 'Sequel Wide', value: '"Sequel Wide", sans-serif' },
          { label: 'Felipa', value: '"Felipa", cursive' },
          { label: 'Italianno', value: '"Italianno", cursive' },
          { label: 'Jacquard 24', value: '"Jacquard 24", cursive' },
          { label: 'Special Elite', value: '"Special Elite", cursive' },
        ],
      },
      {
        label: 'Mono / Typewriter',
        options: [
          { label: 'Mono', value: '"SFMono-Regular", Consolas, "Liberation Mono", monospace' },
          { label: 'IBM Plex Mono', value: '"IBM Plex Mono", monospace' },
          { label: 'Doto', value: '"Doto", monospace' },
          { label: 'Pixelify Sans', value: '"Pixelify Sans", monospace' },
          { label: 'Coral Pixels', value: '"Coral Pixels", monospace' },
        ],
      },
    ],
  },
  {
    id: 'ja',
    label: 'Japanese',
    groups: [
      {
        label: 'Gothic / Sans',
        options: [
          { label: 'Dela Gothic One', value: '"Dela Gothic One", sans-serif' },
          { label: 'Hachi Maru Pop', value: '"Hachi Maru Pop", sans-serif' },
          { label: 'Klee One', value: '"Klee One", sans-serif' },
          { label: 'M PLUS 1p', value: '"M PLUS 1p", sans-serif' },
        ],
      },
      {
        label: 'Mincho / Serif',
        options: [
          { label: 'Kiwi Maru', value: '"Kiwi Maru", serif' },
          { label: 'Shippori Mincho B1', value: '"Shippori Mincho B1", serif' },
          { label: 'Yuji Mai', value: '"Yuji Mai", serif' },
          { label: 'Yuji Syuku', value: '"Yuji Syuku", serif' },
          { label: 'Zen Antique', value: '"Zen Antique", serif' },
        ],
      },
      {
        label: 'Display / Decorative',
        options: [
          { label: 'DotGothic16', value: '"DotGothic16", monospace' },
        ],
      },
    ],
  },
  {
    id: 'zh',
    label: 'Chinese',
    groups: [
      {
        label: 'Simplified',
        options: [
          { label: 'Ma Shan Zheng (马山正)', value: '"Ma Shan Zheng", cursive' },
          { label: 'Noto Serif SC', value: '"Noto Serif SC", serif' },
          { label: 'Zhi Mang Xing (智芒星)', value: '"Zhi Mang Xing", cursive' },
        ],
      },
      {
        label: 'Traditional',
        options: [
          { label: 'Cactus Classical Serif', value: '"Cactus Classical Serif", serif' },
          { label: 'Noto Serif TC', value: '"Noto Serif TC", serif' },
        ],
      },
    ],
  },
];

// Flat list of all font options for validation / save-load matching
const fontOptions = FONT_LANGUAGE_TABS.flatMap((tab) => tab.groups.flatMap((g) => g.options));

const backgroundStyleOptions: Array<{
  style: TextBackgroundBoxStyle;
  label: string;
  description: string;
}> = [
  {
    style: 'box',
    label: 'Box',
    description: 'Background filling the entire text box',
  },
  {
    style: 'highlight',
    label: 'Highlight',
    description: 'Bottom half underline style',
  },
];

const defaultShadow: ShadowSettings = {
  enabled: false,
  color: '#000000',
  blur: 12,
  offsetX: 4,
  offsetY: 4,
};

const defaultBackgroundBox: TextBackgroundBoxSettings = {
  enabled: false,
  style: 'box',
  fill: '#ffffff',
  padding: 24,
  radius: 18,
};

const shadowOn = (shadow?: ShadowSettings): ShadowSettings => ({
  ...defaultShadow,
  ...(shadow ?? {}),
  enabled: true,
});

const backgroundBoxOn = (backgroundBox?: TextBackgroundBoxSettings): TextBackgroundBoxSettings => ({
  ...defaultBackgroundBox,
  ...(backgroundBox ?? {}),
  enabled: true,
});

const getSelectedFontValue = (fontFamily?: string) => {
  if (!fontFamily) return fontOptions[0].value;
  return fontOptions.some((option) => option.value === fontFamily)
    ? fontFamily
    : fontOptions[0].value;
};

// Detect which language tab a given font value belongs to
const detectFontLang = (fontValue: string): FontLanguage => {
  for (const tab of FONT_LANGUAGE_TABS) {
    for (const group of tab.groups) {
      if (group.options.some((o) => o.value === fontValue)) return tab.id;
    }
  }
  return 'ko';
};

export function TextPanel({ editor }: TextPanelProps) {
  const selectedText = editor.selection?.type === 'text' ? editor.selection : null;
  const shadow = selectedText?.shadow ?? defaultShadow;
  const backgroundBox = selectedText?.backgroundBox ?? defaultBackgroundBox;
  const activeBackgroundStyle = backgroundBox.style === 'highlight' ? 'highlight' : 'box';

  const isBold = selectedText?.fontWeight === 'bold';
  const isItalic = selectedText?.fontStyle === 'italic';
  const isUnderline = Boolean(selectedText?.underline);
  const isLinethrough = Boolean(selectedText?.linethrough);
  const opacityPct = Math.round((selectedText?.opacity ?? 1) * 100);

  const currentFontValue = getSelectedFontValue(selectedText?.fontFamily);
  const [fontLang, setFontLang] = useState<FontLanguage>(() => detectFontLang(currentFontValue));
  const activeLangTab = FONT_LANGUAGE_TABS.find((t) => t.id === fontLang) ?? FONT_LANGUAGE_TABS[0];

  const applyFontFamily = (fontFamily: string) => {
    if (!selectedText) return;

    editor.updateSelectedText({ fontFamily });

    void loadFontForCanvas(fontFamily).then(() => {
      editor.updateSelectedText({ fontFamily });
    });
  };

  const updateShadow = (patch: Partial<ShadowSettings>) => {
    if (!selectedText) return;
    editor.updateSelectedText({
      shadow: {
        ...shadowOn(shadow),
        ...patch,
      },
    });
  };

  const updateBackgroundBox = (patch: Partial<TextBackgroundBoxSettings>) => {
    if (!selectedText) return;
    editor.updateSelectedText({
      backgroundBox: {
        ...backgroundBoxOn(backgroundBox),
        ...patch,
      },
    });
  };

  const applyBackgroundStyle = (style: TextBackgroundBoxStyle) => {
    if (!selectedText) return;

    if (style === 'box') {
      editor.updateSelectedText({
        backgroundBox: {
          ...backgroundBoxOn(backgroundBox),
          style: 'box',
          fill: backgroundBox.fill || '#ffffff',
          padding: Math.max(backgroundBox.padding || 0, 20),
          radius: Math.max(backgroundBox.radius || 0, 16),
        },
      });
      return;
    }

    editor.updateSelectedText({
      shadow: { ...shadow, enabled: false },
      backgroundBox: {
        ...backgroundBoxOn(backgroundBox),
        style: 'highlight',
        fill: '#fff06a',
        padding: 8,
        radius: 2,
      },
    });
  };

  const applyPlainPreset = () => {
    if (!selectedText) return;
    editor.updateSelectedText({
      shadow: { ...shadow, enabled: false },
      backgroundBox: { ...backgroundBox, enabled: false },
    });
  };

  const applyShadowPreset = () => {
    if (!selectedText) return;
    editor.updateSelectedText({
      shadow: {
        enabled: true,
        color: '#000000',
        blur: 14,
        offsetX: 5,
        offsetY: 5,
      },
    });
  };

  const applyHighlightPreset = () => {
    if (!selectedText) return;
    editor.updateSelectedText({
      shadow: { ...shadow, enabled: false },
      backgroundBox: {
        enabled: true,
        style: 'highlight',
        fill: '#fff06a',
        padding: 8,
        radius: 2,
      },
    });
  };

  const applyBoxPreset = () => {
    if (!selectedText) return;
    editor.updateSelectedText({
      backgroundBox: {
        enabled: true,
        style: 'box',
        fill: '#ffffff',
        padding: 24,
        radius: 18,
      },
    });
  };

  return (
    <div className="panel-stack">
      <section className="panel-section">
        <button className="wide-command" onClick={editor.addText} type="button">
          <Type size={20} aria-hidden="true" />
          Add Text
        </button>
      </section>

      <section className="panel-section">
        <div className="section-title">Text</div>
        <textarea
          disabled={!selectedText}
          onChange={(event) => editor.updateSelectedText({ text: event.target.value })}
          rows={3}
          value={selectedText?.text ?? ''}
        />
        <div className="control-grid">
          <div className="font-lang-tabs">
            {FONT_LANGUAGE_TABS.map((tab) => (
              <button
                className="font-lang-tab"
                data-selected={fontLang === tab.id}
                key={tab.id}
                onClick={() => setFontLang(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label>
            Font
            <select
              disabled={!selectedText}
              onBlur={(event) => applyFontFamily(event.currentTarget.value)}
              onChange={(event) => applyFontFamily(event.currentTarget.value)}
              onInput={(event) => applyFontFamily(event.currentTarget.value)}
              value={fontOptions.some((o) => o.value === currentFontValue && activeLangTab.groups.some((g) => g.options.some((opt) => opt.value === currentFontValue))) ? currentFontValue : activeLangTab.groups[0]?.options[0]?.value ?? currentFontValue}
            >
              {activeLangTab.groups.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((font) => (
                    <option key={font.label} value={font.value}>
                      {font.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            Size
            <input
              disabled={!selectedText}
              max={220}
              min={8}
              onChange={(event) => editor.updateSelectedText({ fontSize: Number(event.target.value) })}
              type="range"
              value={selectedText?.fontSize ?? 64}
            />
          </label>
          <label className="color-input-line">
            Color
            <input
              disabled={!selectedText}
              onChange={(event) => editor.updateSelectedText({ fill: event.target.value })}
              type="color"
              value={selectedText?.fill ?? '#101820'}
            />
          </label>
          <label>
            Opacity
            <span className="range-value">{opacityPct}%</span>
            <input
              disabled={!selectedText}
              max={100}
              min={0}
              onChange={(e) => editor.updateSelectedOpacity(Number(e.target.value) / 100)}
              type="range"
              value={opacityPct}
            />
          </label>
        </div>

        <div className="segmented-control">
          {alignmentButtons.map((button) => {
            const Icon = button.icon;
            return (
              <button
                data-selected={selectedText?.textAlign === button.align}
                disabled={!selectedText}
                key={button.align}
                onClick={() => editor.updateSelectedText({ textAlign: button.align })}
                title={button.label}
                type="button"
              >
                <Icon size={19} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className="text-style-toolbar" aria-label="Text Style">
          <button
            data-selected={isBold}
            disabled={!selectedText}
            onClick={() => editor.updateSelectedText({ fontWeight: isBold ? 'normal' : 'bold' })}
            title="Bold"
            type="button"
          >
            <strong>B</strong>
            <span>Bold</span>
          </button>
          <button
            data-selected={isItalic}
            disabled={!selectedText}
            onClick={() => editor.updateSelectedText({ fontStyle: isItalic ? 'normal' : 'italic' })}
            title="Italic"
            type="button"
          >
            <em>I</em>
            <span>Italic</span>
          </button>
          <button
            data-selected={isUnderline}
            disabled={!selectedText}
            onClick={() => editor.updateSelectedText({ underline: !isUnderline })}
            title="Underline"
            type="button"
          >
            <span className="text-style-sample underline">U</span>
            <span>Underline</span>
          </button>
          <button
            data-selected={isLinethrough}
            disabled={!selectedText}
            onClick={() => editor.updateSelectedText({ linethrough: !isLinethrough })}
            title="Strikethrough"
            type="button"
          >
            <span className="text-style-sample strike">S</span>
            <span>Strikethrough</span>
          </button>
        </div>
      </section>

      <section className="panel-section">
        <div className="section-title">Text Presets</div>
        <div className="text-preset-grid">
          <button disabled={!selectedText} onClick={applyPlainPreset} type="button">Plain</button>
          <button disabled={!selectedText} onClick={applyShadowPreset} type="button">Shadow</button>
          <button disabled={!selectedText} onClick={applyHighlightPreset} type="button">Highlight</button>
          <button disabled={!selectedText} onClick={applyBoxPreset} type="button">Box</button>
        </div>
      </section>

      <section className="panel-section text-effect-card">
        <div className="effect-header">
          <div>
            <div className="section-title">Shadow</div>
            <p>Add a blur shadow behind the text.</p>
          </div>
          <button
            className="toggle-button"
            data-selected={shadow.enabled}
            disabled={!selectedText}
            onClick={() => updateShadow({ enabled: !shadow.enabled })}
            type="button"
          >
            {shadow.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="control-grid">
          <label className="color-input-line">
            Color
            <input
              disabled={!selectedText || !shadow.enabled}
              onChange={(event) => updateShadow({ color: event.target.value })}
              type="color"
              value={shadow.color}
            />
          </label>
          <label>
            Blur <span className="range-value">{shadow.blur}px</span>
            <input
              disabled={!selectedText || !shadow.enabled}
              max={60}
              min={0}
              onChange={(event) => updateShadow({ blur: Number(event.target.value) })}
              type="range"
              value={shadow.blur}
            />
          </label>
          <label>
            X <span className="range-value">{shadow.offsetX}px</span>
            <input
              disabled={!selectedText || !shadow.enabled}
              max={80}
              min={-80}
              onChange={(event) => updateShadow({ offsetX: Number(event.target.value) })}
              type="range"
              value={shadow.offsetX}
            />
          </label>
          <label>
            Y <span className="range-value">{shadow.offsetY}px</span>
            <input
              disabled={!selectedText || !shadow.enabled}
              max={80}
              min={-80}
              onChange={(event) => updateShadow({ offsetY: Number(event.target.value) })}
              type="range"
              value={shadow.offsetY}
            />
          </label>
        </div>
      </section>

      <section className="panel-section text-effect-card">
        <div className="effect-header">
          <div>
            <div className="section-title">Text Background</div>
            <p>Box fills entire background, Highlight underlines the bottom half.</p>
          </div>
          <button
            className="toggle-button"
            data-selected={backgroundBox.enabled}
            disabled={!selectedText}
            onClick={() => updateBackgroundBox({ enabled: !backgroundBox.enabled })}
            type="button"
          >
            {backgroundBox.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="background-style-grid two-items">
          {backgroundStyleOptions.map((option) => (
            <button
              data-selected={activeBackgroundStyle === option.style}
              disabled={!selectedText}
              key={option.style}
              onClick={() => applyBackgroundStyle(option.style)}
              type="button"
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>

        <div className="control-grid">
          <label className="color-input-line">
            Bg Color
            <input
              disabled={!selectedText || !backgroundBox.enabled}
              onChange={(event) => updateBackgroundBox({ fill: event.target.value })}
              type="color"
              value={backgroundBox.fill}
            />
          </label>
          <label>
            Padding <span className="range-value">{backgroundBox.padding}px</span>
            <input
              disabled={!selectedText || !backgroundBox.enabled}
              max={120}
              min={0}
              onChange={(event) => updateBackgroundBox({ padding: Number(event.target.value) })}
              type="range"
              value={backgroundBox.padding}
            />
          </label>
          <label className="span-2">
            Radius <span className="range-value">{backgroundBox.radius}px</span>
            <input
              disabled={!selectedText || !backgroundBox.enabled}
              max={120}
              min={0}
              onChange={(event) => updateBackgroundBox({ radius: Number(event.target.value) })}
              type="range"
              value={backgroundBox.radius}
            />
          </label>
        </div>
      </section>

      <section className="panel-section text-effect-card">
        <div className="section-title">Spacing</div>
        <div className="control-grid">
          <label>
            Letter Spacing <span className="range-value">{selectedText?.charSpacing ?? 0}</span>
            <input
              disabled={!selectedText}
              max={800}
              min={-200}
              step={10}
              onChange={(event) => editor.updateSelectedText({ charSpacing: Number(event.target.value) })}
              type="range"
              value={selectedText?.charSpacing ?? 0}
            />
          </label>
          <label>
            Line Height <span className="range-value">{Number(selectedText?.lineHeight ?? 1.16).toFixed(2)}</span>
            <input
              disabled={!selectedText}
              max={2.5}
              min={0.5}
              step={0.05}
              onChange={(event) => editor.updateSelectedText({ lineHeight: Number(event.target.value) })}
              type="range"
              value={selectedText?.lineHeight ?? 1.16}
            />
          </label>
        </div>
      </section>

      <section className="panel-section text-effect-card">
        <div className="effect-header">
          <div>
            <div className="section-title">Stroke</div>
            <p>Draw an outline around the text.</p>
          </div>
          <button
            className="toggle-button"
            data-selected={selectedText?.strokeEnabled ?? false}
            disabled={!selectedText}
            onClick={() => editor.updateSelectedText({ strokeEnabled: !(selectedText?.strokeEnabled ?? false) })}
            type="button"
          >
            {(selectedText?.strokeEnabled ?? false) ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="control-grid">
          <label className="color-input-line">
            Color
            <input
              disabled={!selectedText || !(selectedText?.strokeEnabled ?? false)}
              onChange={(event) => editor.updateSelectedText({ strokeColor: event.target.value })}
              type="color"
              value={selectedText?.strokeColor ?? '#101820'}
            />
          </label>
          <label>
            Width <span className="range-value">{selectedText?.strokeWidth ?? 0}px</span>
            <input
              disabled={!selectedText || !(selectedText?.strokeEnabled ?? false)}
              max={20}
              min={0}
              step={0.5}
              onChange={(event) => editor.updateSelectedText({ strokeWidth: Number(event.target.value) })}
              type="range"
              value={selectedText?.strokeWidth ?? 0}
            />
          </label>
        </div>
      </section>
    </div>
  );
}
