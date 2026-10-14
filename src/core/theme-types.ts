import type { LayoutSettings } from './types';

/** A choice the theme author lets people make; rendered as classes on the theme root. */
export interface ThemeSetting {
  id: string;
  label: string;
  type: 'select' | 'toggle';
  options?: Array<{ value: string; label: string }>;
  default: string | boolean;
}

/** A colour and font pairing the theme author designed. */
export interface ThemePreset {
  id: string;
  name: string;
  accentColor: string;
  fontFamily?: string;
  settings?: Record<string, string | boolean>;
}

/** Everything about a theme except its stylesheet: what manifest.json holds. */
export interface ThemeManifest {
  id: string;
  name: string;
  description: string;
  version: string;
  /** Version of the skeleton contract (class names, CSS variables) the stylesheet targets. */
  engine: 1;
  skeleton: 'single';
  author?: string;
  license?: string;
  tags: string[];
  traits: { photo: boolean; atsFriendly: boolean };
  defaults: Pick<LayoutSettings, 'pageMarginMm' | 'baseFontPt' | 'lineHeight' | 'sectionSpacingPt' | 'photoEnabled'>;
  presets: ThemePreset[];
  settings: ThemeSetting[];
}
