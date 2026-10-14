import type { NumberSlide } from "../types";
import { column, frame, highlightFirst, px, textBlock } from "./common";
import type { LayoutContext, SatoriChild, SatoriNode } from "./node";

/** A giant figure in the accent color with a label under it. */
export function number(slide: NumberSlide, ctx: LayoutContext): SatoriNode {
  const { tokens } = ctx;
  const [value, label] = highlightFirst([slide.value, slide.label], slide.highlight, ctx) as [SatoriChild[], SatoriChild[]];
  return frame(
    slide,
    ctx,
    column(
      [
        textBlock({ fontSize: px(ctx, "value"), fontWeight: tokens.weight.value, lineHeight: 1, color: tokens.accent }, value),
        textBlock({ fontSize: px(ctx, "label"), fontWeight: tokens.weight.title, lineHeight: 1.2, color: tokens.text }, label),
      ],
      Math.round(24 * ctx.fontScale),
    ),
  );
}
