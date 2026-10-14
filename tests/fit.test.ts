import { describe, expect, test } from "bun:test";
import { fitFontSize, INTER_CHAR_WIDTH_EM, TextOverflowError } from "../src/fit";

// charWidthEm 0.5 keeps the arithmetic exact: size 20 gives 10 chars per 100px line.
const small = { boxWidth: 100, boxHeight: 25, sizes: [20, 10], lineHeight: 1, charWidthEm: 0.5 };
const real = { boxWidth: 920, boxHeight: 700, sizes: [64, 56, 48, 40, 32], lineHeight: 1.25 };

describe("fitFontSize", () => {
  test("short text uses the largest size", () => {
    expect(fitFontSize("Hello", real)).toBe(64);
  });

  test("text exactly at the line limit fits", () => {
    expect(fitFontSize("aaaa bbbbb", small)).toBe(20);
  });

  test("one extra character overflows and drops a step", () => {
    expect(fitFontSize("aaaa bbbbbb", small)).toBe(10);
  });

  test("40 words fit the smallest size of a realistic box", () => {
    const text = Array.from({ length: 40 }, (_, i) => `palavra${i % 10}`).join(" ");
    const size = fitFontSize(text, real);
    expect(real.sizes).toContain(size);
    expect(fitFontSize(text, { ...real, sizes: [32] })).toBe(32);
  });

  test("text beyond the smallest size throws text-overflow", () => {
    const text = Array.from({ length: 400 }, () => "palavra").join(" ");
    expect(() => fitFontSize(text, real)).toThrow(TextOverflowError);
    try {
      fitFontSize(text, real);
    } catch (e) {
      expect((e as TextOverflowError).rule).toBe("text-overflow");
      expect((e as Error).message).toContain("text-overflow");
    }
  });

  test("a word longer than the line throws", () => {
    expect(() => fitFontSize("x".repeat(200), real)).toThrow(TextOverflowError);
  });

  test("newlines are respected", () => {
    const opts = { boxWidth: 1000, boxHeight: 30, sizes: [20, 10], lineHeight: 1, charWidthEm: 0.5 };
    expect(fitFontSize("a b", opts)).toBe(20);
    expect(fitFontSize("a\nb", opts)).toBe(10);
  });

  test("empty sizes list throws", () => {
    expect(() => fitFontSize("a", { ...real, sizes: [] })).toThrow(TextOverflowError);
  });

  test("default estimate is 0.6 em", () => {
    expect(INTER_CHAR_WIDTH_EM).toBe(0.6);
  });
});
