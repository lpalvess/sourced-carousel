import type { HookSlide } from "../types";
import { column, frame, highlightSegments, px, textBlock } from "./common";
import type { LayoutContext, SatoriNode } from "./node";

/** Big opening text, up to 3 lines, with the optional highlight in the accent color. */
export function hook(slide: HookSlide, ctx: LayoutContext): SatoriNode {
  const { tokens } = ctx;
  const body = textBlock(
    { fontSize: px(ctx, "hook"), fontWeight: tokens.weight.hook, lineHeight: 1.1, color: tokens.text },
    highlightSegments(slide.text, slide.highlight, ctx),
  );
  return frame(slide, ctx, column([body], 0));
}
