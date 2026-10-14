import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Resvg, initWasm } from "@resvg/resvg-wasm";
import satori from "satori";
import { TextOverflowError, fitFontSize } from "./fit";
import { cta } from "./layout/cta";
import { hook } from "./layout/hook";
import { list } from "./layout/list";
import type { LayoutContext, SatoriNode } from "./layout/node";
import { number } from "./layout/number";
import { quote } from "./layout/quote";
import { text } from "./layout/text";
import { FONTS, resolveTheme, type ThemeTokens } from "./theme";
import type { Deck, Slide } from "./types";

/** Repository root. Fonts and the wasm file are read from here, never from the network. */
const ROOT = join(import.meta.dirname, "..");
const WASM_FILE = join(ROOT, "node_modules", "@resvg", "resvg-wasm", "index_bg.wasm");

/** Candidate font scales, largest first. The smallest is the floor before text-overflow. */
const SCALE_LADDER = [1, 0.9, 0.8, 0.7, 0.6, 0.5] as const;

/** Space under the content taken by the footer row, in px. */
const BOTTOM_ROW = 64;

export interface RenderedSlide {
  /** 1-based position in the deck. */
  index: number;
  type: Slide["type"];
  width: number;
  height: number;
  png: Uint8Array;
  /** Raw RGBA pixels, used by the PDF writer. */
  rgba: Uint8Array;
}

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 500 | 700 | 800; style: "normal" }[]> | undefined;
let wasmPromise: Promise<void> | undefined;

function loadFonts() {
  fontsPromise ??= Promise.all(
    FONTS.map(async (f) => ({
      name: f.name,
      data: await readFile(join(ROOT, f.file)),
      weight: f.weight,
      style: "normal" as const,
    })),
  );
  return fontsPromise;
}

function loadWasm() {
  wasmPromise ??= readFile(WASM_FILE).then((bytes) => initWasm(bytes));
  return wasmPromise;
}

interface Field {
  text: string;
  base: number;
  lineHeight: number;
  /** Share of the available height this field may use. */
  share: number;
  /** Width taken away from the available width, in px. */
  indent?: number;
}

/** The text fields of a slide and the box each one is allowed to fill. */
function fieldsOf(slide: Slide, tokens: ThemeTokens): Field[] {
  const s = tokens.size;
  switch (slide.type) {
    case "hook":
      return [{ text: slide.text, base: s.hook, lineHeight: 1.1, share: 1 }];
    case "text":
      return [
        { text: slide.title, base: s.title, lineHeight: 1.15, share: 0.3 },
        { text: slide.text, base: s.body, lineHeight: 1.35, share: 0.65 },
      ];
    case "number":
      return [
        { text: slide.value, base: s.value, lineHeight: 1, share: 0.6 },
        { text: slide.label, base: s.label, lineHeight: 1.2, share: 0.3 },
      ];
    case "list":
      return [
        { text: slide.title, base: s.title, lineHeight: 1.15, share: 0.25 },
        { text: slide.items.join("\n"), base: s.item, lineHeight: 1.6, share: 0.7, indent: 72 },
      ];
    case "quote":
      return [
        { text: slide.text, base: s.quote, lineHeight: 1.25, share: 0.7 },
        { text: slide.author, base: s.label, lineHeight: 1.2, share: 0.15 },
      ];
    case "cta":
      return [
        { text: slide.text, base: Math.round(s.hook * 0.75), lineHeight: 1.15, share: 0.6 },
        { text: slide.handle, base: s.label, lineHeight: 1.2, share: 0.2 },
      ];
  }
}

/**
 * Largest font scale at which every field fits its box. Throws TextOverflowError
 * naming the slide when even the smallest scale does not fit.
 */
export function fontScaleFor(slide: Slide, index: number, tokens: ThemeTokens, width: number, height: number): number {
  const boxWidth = width - 2 * tokens.padding;
  const boxHeight = height - 2 * tokens.padding - BOTTOM_ROW;
  let scale = 1;
  for (const f of fieldsOf(slide, tokens)) {
    try {
      const size = fitFontSize(f.text, {
        boxWidth: boxWidth - (f.indent ?? 0),
        boxHeight: boxHeight * f.share,
        sizes: SCALE_LADDER.map((k) => f.base * k),
        lineHeight: f.lineHeight,
      });
      scale = Math.min(scale, size / f.base);
    } catch (err) {
      if (err instanceof TextOverflowError) {
        throw new TextOverflowError(`slide ${index}: ${err.message}`);
      }
      throw err;
    }
  }
  return scale;
}

function layoutFor(slide: Slide, ctx: LayoutContext): SatoriNode {
  switch (slide.type) {
    case "hook":
      return hook(slide, ctx);
    case "text":
      return text(slide, ctx);
    case "number":
      return number(slide, ctx);
    case "list":
      return list(slide, ctx);
    case "quote":
      return quote(slide, ctx);
    case "cta":
      return cta(slide, ctx);
  }
}

/** Slide to SVG string (text becomes paths, so no input text is ever interpreted as markup). */
export async function renderSlideSvg(deck: Deck, slideIndex: number): Promise<{ svg: string; width: number; height: number }> {
  const slide = deck.slides[slideIndex];
  if (slide === undefined) throw new Error(`slide ${slideIndex + 1} does not exist`);
  const { tokens, width, height } = resolveTheme(deck.meta);
  const fontScale = fontScaleFor(slide, slideIndex + 1, tokens, width, height);
  const ctx: LayoutContext = { tokens, width, height, index: slideIndex + 1, total: deck.slides.length, fontScale };
  const fonts = await loadFonts();
  const svg = await satori(layoutFor(slide, ctx) as unknown as Parameters<typeof satori>[0], {
    width,
    height,
    fonts,
  });
  return { svg, width, height };
}

/** Renders every slide of a deck to PNG and raw pixels. Stops at the first failing slide. */
export async function renderDeck(
  deck: Deck,
  onProgress?: (index: number, total: number) => void,
): Promise<RenderedSlide[]> {
  await loadWasm();
  const out: RenderedSlide[] = [];
  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i] as Slide;
    const { svg, width, height } = await renderSlideSvg(deck, i);
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: width } });
    const image = resvg.render();
    try {
      out.push({
        index: i + 1,
        type: slide.type,
        width: image.width,
        height: image.height,
        png: image.asPng().slice(),
        rgba: image.pixels.slice(),
      });
    } finally {
      image.free();
      resvg.free();
    }
    onProgress?.(i + 1, deck.slides.length);
  }
  return out;
}
