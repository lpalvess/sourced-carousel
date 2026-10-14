import type { ListSlide } from "../types";
import { column, frame, highlightFirst, px, textBlock } from "./common";
import { el, type LayoutContext, type SatoriChild, type SatoriNode } from "./node";

/** Title followed by numbered items. The numerals are separate nodes, so item text stays exact. */
export function list(slide: ListSlide, ctx: LayoutContext): SatoriNode {
  const { tokens } = ctx;
  const parts = highlightFirst([slide.title, ...slide.items], slide.highlight, ctx);
  const title = parts[0] as SatoriChild[];
  const size = px(ctx, "item");
  const rows = slide.items.map((_, i) =>
    el("div", { display: "flex", flexDirection: "row", alignItems: "flex-start", columnGap: Math.round(28 * ctx.fontScale) }, [
      el(
        "div",
        { display: "flex", width: Math.round(size * 1.6), fontSize: size, fontWeight: tokens.weight.highlight, color: tokens.accent, lineHeight: 1.3 },
        `${i + 1}.`,
      ),
      textBlock(
        { flex: 1, fontSize: size, fontWeight: tokens.weight.body, lineHeight: 1.3, color: tokens.text },
        parts[i + 1] as SatoriChild[],
      ),
    ]),
  );
  return frame(
    slide,
    ctx,
    column(
      [
        textBlock({ fontSize: px(ctx, "title"), fontWeight: tokens.weight.title, lineHeight: 1.15, color: tokens.text }, title),
        el("div", { display: "flex", flexDirection: "column", rowGap: Math.round(24 * ctx.fontScale) }, rows),
      ],
      Math.round(44 * ctx.fontScale),
    ),
  );
}
