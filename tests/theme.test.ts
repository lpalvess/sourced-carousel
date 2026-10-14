import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { FONTS, FORMATS, resolveTheme } from "../src/theme";

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG 2.x contrast ratio between two #RRGGBB colors. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("resolveTheme", () => {
  test("defaults to dark and linkedin-square", () => {
    const r = resolveTheme(undefined);
    expect(r.theme).toBe("dark");
    expect(r.format).toBe("linkedin-square");
    expect([r.width, r.height]).toEqual([1080, 1080]);
  });

  test("dark has a dark background and light text (RND-11)", () => {
    const { tokens } = resolveTheme({ theme: "dark" });
    expect(luminance(tokens.background)).toBeLessThan(0.1);
    expect(luminance(tokens.text)).toBeGreaterThan(0.8);
  });

  test("light has a light background and dark text (RND-11)", () => {
    const { tokens } = resolveTheme({ theme: "light" });
    expect(luminance(tokens.background)).toBeGreaterThan(0.8);
    expect(luminance(tokens.text)).toBeLessThan(0.1);
  });

  test("formats have the exact dimensions (RND-02)", () => {
    expect(FORMATS["linkedin-square"]).toEqual({ width: 1080, height: 1080 });
    expect(FORMATS["linkedin-portrait"]).toEqual({ width: 1080, height: 1350 });
    const r = resolveTheme({ format: "linkedin-portrait" });
    expect([r.width, r.height]).toEqual([1080, 1350]);
    expect(r.format).toBe("linkedin-portrait");
  });

  test("a valid accent is used (RND-05)", () => {
    expect(resolveTheme({ accent: "#12ab9F" }).tokens.accent).toBe("#12ab9F");
  });

  test.each(["red", "#fff", "#12345", "#1234567", "12ab9f", "#gggggg", "", "#12ab9f; x"])(
    "an invalid accent %p falls back to the default",
    (bad) => {
      const fallback = resolveTheme({ theme: "dark" }).tokens.accent;
      expect(resolveTheme({ theme: "dark", accent: bad }).tokens.accent).toBe(fallback);
    },
  );

  test.each(["dark", "light"] as const)("contrast of %s theme is at least 4.5:1", (theme) => {
    const { tokens } = resolveTheme({ theme });
    expect(contrast(tokens.text, tokens.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens.textMuted, tokens.background)).toBeGreaterThanOrEqual(4.5);
    // The default accent is large highlighted text, so 3:1 is the floor.
    expect(contrast(tokens.accent, tokens.background)).toBeGreaterThanOrEqual(3);
  });

  test("tokens carry sizes and weights the layouts need", () => {
    const { tokens } = resolveTheme(undefined);
    expect(tokens.padding).toBeGreaterThan(0);
    for (const v of Object.values(tokens.size)) expect(v).toBeGreaterThan(0);
  });
});

describe("FONTS", () => {
  test("lists Inter 500, 700 and 800 and every file exists as WOFF2", () => {
    expect(FONTS.map((f) => f.weight)).toEqual([500, 700, 800]);
    for (const f of FONTS) {
      expect(f.name).toBe("Inter");
      expect(existsSync(f.file)).toBe(true);
      expect(readFileSync(f.file).subarray(0, 4).toString("latin1")).toBe("wOF2");
    }
  });
});
