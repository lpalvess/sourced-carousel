import type { CtaSlide } from "../types";
import { column, frame, highlightSegments, px, textBlock } from "./common";
import type { LayoutContext, SatoriNode } from "./node";

/** Closing call to action with the handle in the accent color. */
export function cta(slide: CtaSlide, ctx: LayoutContext): SatoriNode {
  const { tokens } = ctx;
  return frame(
    slide,
    ctx,
    column(
      [
        textBlock(
          { fontSize: Math.round(px(ctx, "hook") * 0.75), fontWeight: tokens.weight.hook, lineHeight: 1.15, color: tokens.text },
          highlightSegments(slide.text, slide.highlight, ctx),
        ),
        textBlock({ fontSize: px(ctx, "label"), fontWeight: tokens.weight.title, lineHeight: 1.2, color: tokens.accent }, [slide.handle]),
      ],
      Math.round(48 * ctx.fontScale),
    ),
  );
}
