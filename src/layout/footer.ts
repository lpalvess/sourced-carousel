import { el, type LayoutContext, type SatoriNode } from "./node";

/**
 * One small line with the slide source, or null when there is no source.
 * The text is inserted exactly as given, as a string child.
 */
export function footer(slide: { source?: string }, ctx: LayoutContext): SatoriNode | null {
  const source = slide.source;
  if (source === undefined || source === "") return null;
  const { tokens } = ctx;
  return el(
    "div",
    {
      display: "flex",
      flex: 1,
      fontSize: tokens.size.footer,
      fontWeight: tokens.weight.footer,
      color: tokens.textMuted,
      lineHeight: tokens.lineHeight,
    },
    source,
  );
}
