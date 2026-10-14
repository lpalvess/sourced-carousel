import type { QuoteSlide } from "../types";
import { column, frame, highlightSegments, px, textBlock } from "./common";
import { el, type LayoutContext, type SatoriNode } from "./node";

/** Quote text with an accent bar on the left and the author under it. */
export function quote(slide: QuoteSlide, ctx: LayoutContext): SatoriNode {
  const { tokens } = ctx;
  const body = el("div", { display: "flex", flexDirection: "row", columnGap: 40 }, [
    el("div", { display: "flex", width: 10, flexShrink: 0, backgroundColor: tokens.accent }),
    el("div", { display: "flex", flexDirection: "column", flex: 1, rowGap: Math.round(32 * ctx.fontScale) }, [
      textBlock(
        { fontSize: px(ctx, "quote"), fontWeight: tokens.weight.title, lineHeight: 1.25, color: tokens.text },
        highlightSegments(slide.text, slide.highlight, ctx),
      ),
      textBlock({ fontSize: px(ctx, "label"), fontWeight: tokens.weight.body, lineHeight: 1.2, color: tokens.textMuted }, [slide.author]),
    ]),
  ]);
  return frame(slide, ctx, column([body], 0));
}
