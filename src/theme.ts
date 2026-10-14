import type { FormatId, Meta, Theme } from "./types";

/** Font files bundled in the repository. Nothing is fetched at run time. */
export const FONTS: readonly { name: "Inter"; weight: 500 | 700 | 800; file: string }[] = [
  { name: "Inter", weight: 500, file: "src/fonts/inter-latin-500-normal.woff2" },
  { name: "Inter", weight: 700, file: "src/fonts/inter-latin-700-normal.woff2" },
  { name: "Inter", weight: 800, file: "src/fonts/inter-latin-800-normal.woff2" },
];

export const FORMATS: Record<FormatId, { width: number; height: number }> = {
  "linkedin-square": { width: 1080, height: 1080 },
  "linkedin-portrait": { width: 1080, height: 1350 },
};

export interface ThemeTokens {
  background: string;
  text: string;
  textMuted: string;
  accent: string;
  /** Padding around the slide, in px. */
  padding: number;
  /** Base font sizes per role, in px, before fontScale is applied. */
  size: {
    hook: number;
    title: number;
    body: number;
    value: number;
    label: number;
    quote: number;
    item: number;
    footer: number;
  };
  /** Font weights per role. Only 500, 700 and 800 are bundled. */
  weight: {
    body: 500 | 700 | 800;
    title: 500 | 700 | 800;
    hook: 500 | 700 | 800;
    value: 500 | 700 | 800;
    highlight: 500 | 700 | 800;
    footer: 500 | 700 | 800;
  };
  lineHeight: number;
}

export const DEFAULT_THEME: Theme = "dark";
export const DEFAULT_FORMAT: FormatId = "linkedin-square";

const BASE = {
  padding: 88,
  size: { hook: 104, title: 64, body: 44, value: 260, label: 52, quote: 60, item: 40, footer: 24 },
  weight: { body: 500, title: 700, hook: 800, value: 800, highlight: 800, footer: 500 },
  lineHeight: 1.25,
} as const;

/**
 * Default accent is chosen per theme so the highlight stays readable on both
 * backgrounds (a single yellow would be too faint on a light background).
 */
const PALETTES: Record<Theme, Pick<ThemeTokens, "background" | "text" | "textMuted" | "accent">> = {
  dark: { background: "#0B0F14", text: "#F5F7FA", textMuted: "#9AA4B2", accent: "#FFC83D" },
  light: { background: "#FAFAF7", text: "#11151A", textMuted: "#4B5563", accent: "#B45309" },
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export function resolveTheme(meta: Meta | undefined): {
  tokens: ThemeTokens;
  width: number;
  height: number;
  theme: Theme;
  format: FormatId;
} {
  const theme: Theme = meta?.theme === "light" ? "light" : DEFAULT_THEME;
  const format: FormatId = meta?.format === "linkedin-portrait" ? "linkedin-portrait" : DEFAULT_FORMAT;
  const palette = PALETTES[theme];
  const accent = typeof meta?.accent === "string" && HEX_COLOR.test(meta.accent) ? meta.accent : palette.accent;
  const { width, height } = FORMATS[format];
  return {
    tokens: {
      ...palette,
      accent,
      padding: BASE.padding,
      size: { ...BASE.size },
      weight: { ...BASE.weight },
      lineHeight: BASE.lineHeight,
    },
    width,
    height,
    theme,
    format,
  };
}
