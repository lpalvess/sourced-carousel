import { describe, expect, test } from "bun:test";
import { number } from "../src/layout/number";
import type { NumberSlide } from "../src/types";
import { collectStrings, commonLayoutSuite, holderOf, makeCtx } from "./layout-helpers.test";

const base: NumberSlide = { type: "number", value: "30.000", label: "pessoas atendidas por mês" };

commonLayoutSuite({ name: "number", render: number, base, textFields: ["value", "label"], highlight: { field: "label", phrase: "atendidas" } });

describe("number layout", () => {
  test("the value is the largest text and keeps its exact formatting", () => {
    const ctx = makeCtx();
    const node = number(base, ctx);
    expect(collectStrings(node)).toContain("30.000");
    const value = holderOf(node, "30.000").props.style!;
    const label = holderOf(node, base.label).props.style!;
    expect(value.fontSize as number).toBeGreaterThan(label.fontSize as number);
    expect(value.color).toBe(ctx.tokens.accent);
  });

  test("values with symbols stay untouched", () => {
    for (const v of ["200x", "2,5", "R$ 1.200", "-3%"]) {
      expect(collectStrings(number({ ...base, value: v }, makeCtx()))).toContain(v);
    }
  });
});
