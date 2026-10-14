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

/** Checks every layout must satisfy for its root node. */
export function assertRoot(node: SatoriNode, ctx: LayoutContext): void {
  expect(node.type).toBe("div");
  const s = node.props.style ?? {};
  expect(s.width).toBe(ctx.width);
  expect(s.height).toBe(ctx.height);
  expect(s.display).toBe("flex");
  expect(s.backgroundColor).toBe(ctx.tokens.background);
  expect(s.padding).toBe(ctx.tokens.padding);
  expect(s.fontFamily).toBe("Inter");
}

/** Nodes of type span (the only element a layout may create from highlight logic). */
export function spans(node: SatoriNode): SatoriNode[] {
  return collectNodes(node).filter((n) => n.type === "span");
}

/** The node that directly holds `text` as one of its string children. */
export function holderOf(root: SatoriNode, text: string): SatoriNode {
  const found = collectNodes(root).find((n) => children(n).includes(text));
  if (!found) throw new Error(`no node holds ${JSON.stringify(text)}`);
  return found;
}

/**
 * Checks shared by the layouts that follow the same contract: themed root,
 * exact texts, counter, footer only with source (RND-04), highlight (RND-05) and
 * text as plain strings (RND-06).
 */
export function commonLayoutSuite<S extends { source?: string; highlight?: string }>(opts: {
  name: string;
  render: (slide: S, ctx: LayoutContext) => SatoriNode;
  base: S;
  /** Fields holding free text, each must appear exactly as given. */
  textFields: readonly (keyof S & string)[];
  /** Field where the highlight is applied and the phrase to highlight, when the layout supports it. */
  highlight: { field: keyof S & string; phrase: string };
  /** Other strings the layout always draws (for example list numerals and items). */
  extraStrings?: readonly string[];
}): void {
  const { name, render, base, textFields, highlight } = opts;
  const extra = opts.extraStrings ?? [];
  const texts = (s: S): string[] => textFields.map((f) => s[f] as unknown as string);

  describe(`${name} layout (common contract)`, () => {
    test("root is a themed Inter div of the format size", () => {
      for (const meta of [undefined, { theme: "light" as const, format: "linkedin-portrait" as const }]) {
        const ctx = makeCtx({}, meta);
        assertRoot(render(base, ctx), ctx);
      }
    });

    test("shows each text exactly and the index/total counter", () => {
      const strings = collectStrings(render(base, makeCtx({ index: 3, total: 7 })));
      for (const t of texts(base)) expect(strings).toContain(t);
      expect(strings).toContain("3/7");
    });

    test("footer shows the exact source only when given (RND-04)", () => {
      const ctx = makeCtx();
      expect(collectStrings(render({ ...base, source: "Fonte: Relatório 2025, p. 4" }, ctx))).toContain("Fonte: Relatório 2025, p. 4");
      const noSource = collectStrings(render(base, ctx));
      const emptySource = collectStrings(render({ ...base, source: "" }, ctx));
      expect(noSource).toEqual(emptySource);
      expect(noSource.sort()).toEqual([...texts(base), ...extra, "1/6"].sort());
    });

    test("highlight becomes an accent span and the text still concatenates back (RND-05)", () => {
      const ctx = makeCtx();
      const field = base[highlight.field] as unknown as string;
      expect(field).toContain(highlight.phrase);
      const node = render({ ...base, highlight: highlight.phrase }, ctx);
      const found = spans(node);
      expect(found).toHaveLength(1);
      expect(found[0]!.props.style?.color).toBe(ctx.tokens.accent);
      expect(collectStrings(found[0]!)).toEqual([highlight.phrase]);
      const at = field.indexOf(highlight.phrase);
      const holder = collectNodes(node).find((n) => children(n).includes(found[0]!))!;
      const parts = children(holder).flatMap((c) => collectStrings(c));
      expect(parts.join("")).toBe(field);
      expect(parts.join("").slice(at, at + highlight.phrase.length)).toBe(highlight.phrase);
    });

    test("no span without highlight, nor when the phrase is absent", () => {
      expect(spans(render(base, makeCtx()))).toHaveLength(0);
      expect(spans(render({ ...base, highlight: "frase-inexistente" }, makeCtx()))).toHaveLength(0);
    });

    test("fontScale scales font sizes", () => {
      const first = texts(base)[0]!;
      const full = holderOf(render(base, makeCtx({ fontScale: 1 })), first).props.style!.fontSize as number;
      const half = holderOf(render(base, makeCtx({ fontScale: 0.5 })), first).props.style!.fontSize as number;
      expect(half).toBeLessThan(full);
    });

    test.each(PAYLOADS)("payload %p stays plain text in every field (RND-06)", (payload) => {
      for (const field of [...textFields, "source" as const]) {
        const slide = { ...base, [field]: payload } as S;
        const node = render(slide, makeCtx());
        assertNoInjectedElements(node);
        expect(collectStrings(node)).toContain(payload);
      }
      const hl = { ...base, [highlight.field]: `a ${payload} b`, highlight: payload } as S;
      const node = render(hl, makeCtx());
      assertNoInjectedElements(node);
      expect(collectStrings(node).join("")).toContain(`a ${payload} b`);
    });
  });
}
