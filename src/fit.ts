/**
 * Text fitting. Satori does not expose text measurement, so the width of a
 * line is estimated from the character count with a deliberately pessimistic
 * average glyph width.
 */

/**
 * Average glyph width of Inter as a fraction of the font size.
 * This is a CONSERVATIVE ESTIMATE, not a measured value: real Inter text
 * averages narrower, so the estimate errs toward smaller font sizes.
 */
export const INTER_CHAR_WIDTH_EM = 0.6;

export class TextOverflowError extends Error {
  readonly rule = "text-overflow" as const;

  constructor(message: string) {
    super(message);
    this.name = "TextOverflowError";
  }
}

export interface FitOptions {
  boxWidth: number;
  boxHeight: number;
  /** Candidate font sizes in px, in descending order. */
  sizes: readonly number[];
  /** Line height as a multiple of the font size. */
  lineHeight: number;
  /** Estimated glyph width as a fraction of the font size. */
  charWidthEm?: number;
}

/** Greedy word wrap. Returns the line count, or null if a word is wider than a line. */
function countLines(text: string, maxChars: number): number | null {
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    const words = paragraph.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      lines += 1;
      continue;
    }
    let current = 0;
    let used = 0;
    for (const word of words) {
      const len = [...word].length;
      if (len > maxChars) return null;
      if (current === 0) {
        current = len;
      } else if (current + 1 + len <= maxChars) {
        current += 1 + len;
      } else {
        used += 1;
        current = len;
      }
    }
    lines += used + 1;
  }
  return lines;
}

/** Returns the largest size in `sizes` at which `text` fits the box, or throws TextOverflowError. */
export function fitFontSize(text: string, opts: FitOptions): number {
  const charWidthEm = opts.charWidthEm ?? INTER_CHAR_WIDTH_EM;
  if (opts.sizes.length === 0) {
    throw new TextOverflowError("text-overflow: no font sizes to try");
  }
  for (const size of opts.sizes) {
    const maxChars = Math.floor(opts.boxWidth / (size * charWidthEm));
    if (maxChars < 1) continue;
    const lines = countLines(text, maxChars);
    if (lines === null) continue;
    if (lines * size * opts.lineHeight <= opts.boxHeight) return size;
  }
  const min = Math.min(...opts.sizes);
  throw new TextOverflowError(
    `text-overflow: text does not fit a ${opts.boxWidth}x${opts.boxHeight} box even at the minimum size of ${min}px`,
  );
}
