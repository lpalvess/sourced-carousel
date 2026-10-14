import { describe, expect, test } from "bun:test";
import { resolveTheme } from "../src/theme";
import type { LayoutContext, SatoriChild, SatoriNode } from "../src/layout/node";

export function makeCtx(over: Partial<LayoutContext> = {}, meta?: Parameters<typeof resolveTheme>[0]): LayoutContext {
  const r = resolveTheme(meta);
  return { tokens: r.tokens, width: r.width, height: r.height, index: 1, total: 6, fontScale: 1, ...over };
}

export function children(node: SatoriNode): SatoriChild[] {
  const c = node.props.children;
  return c === undefined ? [] : Array.isArray(c) ? c : [c];
}

/** Every string in the tree, in document order. */
export function collectStrings(node: SatoriChild): string[] {
  if (typeof node === "string") return [node];
  return children(node).flatMap(collectStrings);
}

/** Every node in the tree (including the root). */
export function collectNodes(node: SatoriChild): SatoriNode[] {
  if (typeof node === "string") return [];
  return [node, ...children(node).flatMap(collectNodes)];
}

export const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  '" onmouseover="x',
  "javascript:alert(1)",
] as const;

/** Throws when the tree has a script/img node, or any prop that could carry markup. */
export function assertNoInjectedElements(node: SatoriChild): void {
  for (const n of collectNodes(node)) {
    expect(n.type).not.toBe("script");
    expect(n.type).not.toBe("img");
    expect("dangerouslySetInnerHTML" in n.props).toBe(false);
    expect(Object.keys(n.props).filter((k) => k !== "style" && k !== "children")).toEqual([]);
  }
}

describe("test helpers", () => {
  test("collectStrings walks nested children in order", () => {
    const tree: SatoriNode = { type: "div", props: { children: ["a", { type: "span", props: { children: "b" } }, "c"] } };
    expect(collectStrings(tree)).toEqual(["a", "b", "c"]);
    expect(collectNodes(tree).map((n) => n.type)).toEqual(["div", "span"]);
  });
});
