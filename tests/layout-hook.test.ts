import { describe, expect, test } from "bun:test";
import { hook } from "../src/layout/hook";
import type { HookSlide } from "../src/types";
import { assertNoInjectedElements, assertRoot, collectStrings, holderOf, makeCtx, PAYLOADS, spans } from "./layout-helpers.test";

const base: HookSlide = { type: "hook", text: "Ninguém te conta isso sobre carrosséis" };

describe("hook layout", () => {
  test("root is a themed Inter div of the format size", () => {
    for (const meta of [undefined, { theme: "light" as const, format: "linkedin-portrait" as const }]) {
      const ctx = makeCtx({}, meta);
      assertRoot(hook(base, ctx), ctx);
    }
  });

  test("contains the exact text plus the index/total counter", () => {
    const strings = collectStrings(hook(base, makeCtx({ index: 1, total: 6 })));
    expect(strings).toContain(base.text);
    expect(strings).toContain("1/6");
  });

  test("footer shows the source only when given (RND-04)", () => {
    const ctx = makeCtx();
    expect(collectStrings(hook({ ...base, source: "Relatório X, 2025" }, ctx))).toContain("Relatório X, 2025");
    const without = collectStrings(hook(base, ctx));
    expect(without).toEqual([base.text, "1/6"]);
    expect(collectStrings(hook({ ...base, source: "" }, ctx))).toEqual([base.text, "1/6"]);
  });

  test("highlight: before, accent span, after, joined equals the text (RND-05)", () => {
    const ctx = makeCtx();
    const node = hook({ ...base, highlight: "te conta" }, ctx);
    const found = spans(node);
    expect(found).toHaveLength(1);
    expect(found[0]!.props.style?.color).toBe(ctx.tokens.accent);
    expect(collectStrings(node).slice(0, 3).join("")).toBe(base.text);
    expect(collectStrings(found[0]!)).toEqual(["te conta"]);
  });

  test("only the first occurrence is highlighted", () => {
    const node = hook({ type: "hook", text: "um e um de novo", highlight: "um" }, makeCtx());
    expect(spans(node)).toHaveLength(1);
    expect(collectStrings(node).slice(0, 2).join("")).toBe("um e um de novo");
  });

  test("a highlight at the very start or end leaves no empty strings", () => {
    const start = collectStrings(hook({ type: "hook", text: "abc def", highlight: "abc" }, makeCtx()));
    expect(start.slice(0, 2)).toEqual(["abc", " def"]);
    const end = collectStrings(hook({ type: "hook", text: "abc def", highlight: "def" }, makeCtx()));
    expect(end.slice(0, 2)).toEqual(["abc ", "def"]);
  });

  test("a highlight that is absent does not create a span", () => {
    expect(spans(hook({ ...base, highlight: "inexistente" }, makeCtx()))).toHaveLength(0);
  });

  test("fontScale multiplies the base size", () => {
    const big = hook(base, makeCtx({ fontScale: 1 }));
    const small = hook(base, makeCtx({ fontScale: 0.5 }));
    const size = (n: typeof big) => holderOf(n, base.text).props.style!.fontSize as number;
    expect(size(small)).toBe(Math.round(size(big) / 2));
  });

  test.each(PAYLOADS)("payload %p stays text (RND-06)", (payload) => {
    for (const slide of [{ ...base, text: payload }, { ...base, text: `a ${payload} b`, highlight: payload }, { ...base, source: payload }]) {
      const node = hook(slide, makeCtx());
      assertNoInjectedElements(node);
      expect(collectStrings(node).join("")).toContain(payload);
    }
  });
});
