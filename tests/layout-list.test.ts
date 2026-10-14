import { describe, expect, test } from "bun:test";
import { list } from "../src/layout/list";
import type { ListSlide } from "../src/types";
import { assertNoInjectedElements, collectStrings, commonLayoutSuite, makeCtx, PAYLOADS } from "./layout-helpers.test";

const base: ListSlide = { type: "list", title: "Três passos", items: ["Reunir os fatos", "Escrever os slides", "Gerar o PDF"] };

// The common suite expects each text field to be a string, so check items separately.
commonLayoutSuite<ListSlide>({
  name: "list",
  render: list,
  base: { ...base, items: ["Reunir os fatos"] },
  textFields: ["title"],
  extraStrings: ["1.", "Reunir os fatos"],
  highlight: { field: "title", phrase: "passos" },
});

describe("list layout", () => {
  test("shows every item exactly, numbered in order", () => {
    const strings = collectStrings(list(base, makeCtx()));
    for (const item of base.items) expect(strings).toContain(item);
    expect(strings.filter((s) => /^\d\.$/.test(s))).toEqual(["1.", "2.", "3."]);
    expect(strings.indexOf("Reunir os fatos")).toBeLessThan(strings.indexOf("Gerar o PDF"));
  });

  test("works with 1 and with 6 items", () => {
    for (const n of [1, 6]) {
      const items = Array.from({ length: n }, (_, i) => `item ${i + 1}`);
      const strings = collectStrings(list({ ...base, items }, makeCtx()));
      for (const it of items) expect(strings).toContain(it);
      expect(strings.filter((s) => /^\d\.$/.test(s))).toHaveLength(n);
    }
  });

  test("highlight inside an item is applied and the item text is preserved", () => {
    const strings = collectStrings(list({ ...base, highlight: "slides" }, makeCtx()));
    expect(strings.join("")).toContain("Escrever os slides");
  });

  test("payloads in items stay strings", () => {
    for (const p of PAYLOADS) {
      const node = list({ ...base, items: [p, `x ${p}`] }, makeCtx());
      assertNoInjectedElements(node);
      expect(collectStrings(node)).toContain(p);
    }
  });
});
