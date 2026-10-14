import type { ThemeTokens } from "../theme";

/** A child is plain text or another node. Input text only ever travels as a string child. */
export type SatoriChild = string | SatoriNode;

/** Plain object accepted by Satori, shaped like a React element without React. */
export interface SatoriNode {
  type: string;
  props: {
    style?: Record<string, string | number>;
    children?: SatoriChild | SatoriChild[];
    [k: string]: unknown;
  };
}

export interface LayoutContext {
  tokens: ThemeTokens;
  width: number;
  height: number;
  /** Position of the slide in the deck, starting at 1. */
  index: number;
  /** Number of slides in the deck. */
  total: number;
  /** Multiplier applied to the base font sizes (1 by default). */
  fontScale: number;
}

/** Builds a node. `children` is left out of props when not given. */
export function el(
  type: string,
  style: Record<string, string | number>,
  children?: SatoriChild | SatoriChild[],
): SatoriNode {
  const props: SatoriNode["props"] = { style };
  if (children !== undefined) props.children = children;
  return { type, props };
}
