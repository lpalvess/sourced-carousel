import { footer } from "./footer";
import { el, type LayoutContext, type SatoriChild, type SatoriNode } from "./node";

export type Role = keyof LayoutContext["tokens"]["size"];

/** Base font size of a role scaled by ctx.fontScale, rounded to whole pixels. */
export function px(ctx: LayoutContext, role: Role): number {
  return Math.max(1, Math.round(ctx.tokens.size[role] * ctx.fontScale));
}

/**
 * Splits text around the first occurrence of `highlight`: before, the
 * highlighted span (accent color, heavier weight) and after. Joining the
 * string parts and the span text always gives back the original text.
 * Without a highlight (or when it is not found) the text stays one string.
 */
export function highlightSegments(text: string, highlight: string | undefined, ctx: LayoutContext): SatoriChild[] {
  if (highlight === undefined || highlight === "") return [text];
  const at = text.indexOf(highlight);
  if (at < 0) return [text];
  const out: SatoriChild[] = [];
  if (at > 0) out.push(text.slice(0, at));
  out.push(el("span", { color: ctx.tokens.accent, fontWeight: ctx.tokens.weight.highlight }, highlight));
  const rest = text.slice(at + highlight.length);
  if (rest !== "") out.push(rest);
  return out;
}

/**
 * Highlights only the first text that contains the phrase, so a slide with
 * several text fields never shows the highlight twice.
 */
export function highlightFirst(texts: readonly string[], highlight: string | undefined, ctx: LayoutContext): SatoriChild[][] {
  let used = false;
  return texts.map((t) => {
    if (!used && highlight !== undefined && highlight !== "" && t.includes(highlight)) {
      used = true;
      return highlightSegments(t, highlight, ctx);
    }
    return [t];
  });
}

/**
 * A block of text. display is "block" (not "flex") on purpose: Satori turns the
 * children of a flex container into separate flex items, which breaks line
 * flow around a highlighted span. Block keeps the text and span inline.
 */
export function textBlock(style: Record<string, string | number>, parts: SatoriChild[]): SatoriNode {
  return el("div", { display: "block", ...style }, parts);
}

/** Root node of a slide: theme background and padding, content on top, footer row at the bottom. */
export function frame(slide: { source?: string }, ctx: LayoutContext, content: SatoriNode): SatoriNode {
  const { tokens } = ctx;
  const source = footer(slide, ctx);
  const bottom = el(
    "div",
    { display: "flex", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", columnGap: 24 },
    [
      source ?? el("div", { display: "flex", flex: 1 }),
      el(
        "div",
        {
          display: "flex",
          fontSize: tokens.size.footer,
          fontWeight: tokens.weight.footer,
          color: tokens.textMuted,
          lineHeight: tokens.lineHeight,
        },
        `${ctx.index}/${ctx.total}`,
      ),
    ],
  );
  return el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      width: ctx.width,
      height: ctx.height,
      padding: tokens.padding,
      backgroundColor: tokens.background,
      color: tokens.text,
      fontFamily: "Inter",
      fontWeight: tokens.weight.body,
    },
    [content, bottom],
  );
}

/** Vertical stack that fills the space above the footer row. */
export function column(children: SatoriNode[], gap: number): SatoriNode {
  return el(
    "div",
    { display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", rowGap: gap },
    children,
  );
}
