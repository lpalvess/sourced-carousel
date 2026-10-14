import { describe, expect, test } from "bun:test";
import { quote } from "../src/layout/quote";
import type { QuoteSlide } from "../src/types";
import { collectStrings, commonLayoutSuite, holderOf, makeCtx } from "./layout-helpers.test";

const base: QuoteSlide = { type: "quote", text: "Medir é o primeiro passo para melhorar.", author: "Ana Souza" };

commonLayoutSuite({ name: "quote", render: quote, base, textFields: ["text", "author"], highlight: { field: "text", phrase: "primeiro passo" } });

describe("quote layout", () => {
  test("author is shown muted, apart from the quote text", () => {
    const ctx = makeCtx();
    const node = quote(base, ctx);
    expect(collectStrings(node)).toContain("Ana Souza");
    expect(holderOf(node, "Ana Souza").props.style!.color).toBe(ctx.tokens.textMuted);
  });

  test("the layout adds no quotation marks of its own around the text", () => {
    const strings = collectStrings(quote(base, makeCtx()));
    expect(strings).toContain(base.text);
    expect(strings.filter((s) => /["“”]/.test(s))).toEqual([]);
  });
});
