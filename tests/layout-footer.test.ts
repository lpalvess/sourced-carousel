import { describe, expect, test } from "bun:test";
import { footer } from "../src/layout/footer";
import { el } from "../src/layout/node";
import { assertNoInjectedElements, collectStrings, makeCtx, PAYLOADS } from "./layout-helpers.test";

describe("footer (RND-04)", () => {
  test("returns null without source", () => {
    expect(footer({}, makeCtx())).toBeNull();
  });

  test("returns null for an empty source", () => {
    expect(footer({ source: "" }, makeCtx())).toBeNull();
  });

  test("shows the exact source text as a string", () => {
    const node = footer({ source: "Fonte: Relatório 2025, p. 4" }, makeCtx());
    expect(node).not.toBeNull();
    expect(collectStrings(node!)).toEqual(["Fonte: Relatório 2025, p. 4"]);
  });

  test("uses the muted text color", () => {
    const ctx = makeCtx();
    expect(footer({ source: "x" }, ctx)!.props.style?.color).toBe(ctx.tokens.textMuted);
  });

  test.each(PAYLOADS)("payload %p stays a plain string", (payload) => {
    const node = footer({ source: payload }, makeCtx())!;
    expect(collectStrings(node)).toEqual([payload]);
    assertNoInjectedElements(node);
  });
});

describe("el", () => {
  test("omits children when not given and keeps them when given", () => {
    expect("children" in el("div", {}).props).toBe(false);
    expect(el("div", { display: "flex" }, "t").props.children).toBe("t");
  });
});
