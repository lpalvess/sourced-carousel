import { describe, expect, test } from "bun:test";
import { text } from "../src/layout/text";
import type { TextSlide } from "../src/types";
import { collectStrings, commonLayoutSuite, makeCtx, spans } from "./layout-helpers.test";

const base: TextSlide = { type: "text", title: "O que mudou", text: "A taxa caiu de forma consistente ao longo do ano." };

commonLayoutSuite({ name: "text", render: text, base, textFields: ["title", "text"], highlight: { field: "text", phrase: "caiu" } });

describe("text layout", () => {
  test("highlight in the title is used when it only appears there", () => {
    const node = text({ ...base, highlight: "mudou" }, makeCtx());
    expect(spans(node)).toHaveLength(1);
    expect(collectStrings(node)).toContain(base.text);
  });

  test("a phrase present in both title and body is highlighted once", () => {
    const node = text({ type: "text", title: "Taxa", text: "A taxa caiu", highlight: "axa" }, makeCtx());
    expect(spans(node)).toHaveLength(1);
  });
});
