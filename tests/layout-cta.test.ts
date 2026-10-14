import { describe, expect, test } from "bun:test";
import { cta } from "../src/layout/cta";
import type { CtaSlide } from "../src/types";
import { collectStrings, commonLayoutSuite, holderOf, makeCtx } from "./layout-helpers.test";

const base: CtaSlide = { type: "cta", text: "Gostou? Siga para ver mais.", handle: "@lucas" };

commonLayoutSuite({ name: "cta", render: cta, base, textFields: ["text", "handle"], highlight: { field: "text", phrase: "Siga" } });

describe("cta layout", () => {
  test("handle is shown exactly, in the accent color", () => {
    const ctx = makeCtx();
    const node = cta(base, ctx);
    expect(collectStrings(node)).toContain("@lucas");
    expect(holderOf(node, "@lucas").props.style!.color).toBe(ctx.tokens.accent);
  });
});
