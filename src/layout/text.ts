import type { TextSlide } from "../types";
import { column, frame, highlightFirst, px, textBlock } from "./common";
import type { LayoutContext, SatoriChild, SatoriNode } from "./node";

/** Title, body text and the optional highlight (in the title or the body, first match only). */
export function text(slide: TextSlide, ctx: LayoutContext): SatoriNode {
  const { tokens } = ctx;
  const [title, body] = highlightFirst([slide.title, slide.text], slide.highlight, ctx) as [
    SatoriChild[],
    SatoriChild[],
  ];
  return frame(
    slide,
    ctx,
    column(
      [
        textBlock({ fontSize: px(ctx, "title"), fontWeight: tokens.weight.title, lineHeight: 1.15, color: tokens.text }, title),
        textBlock({ fontSize: px(ctx, "body"), fontWeight: tokens.weight.body, lineHeight: 1.35, color: tokens.text }, body),
      ],
      Math.round(36 * ctx.fontScale),
    ),
  );
}
