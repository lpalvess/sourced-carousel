import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import satori from "satori";
import { TextOverflowError } from "../src/fit";
import { renderDeck, renderSlideSvg, type RenderedSlide } from "../src/render";
import { FONTS, resolveTheme } from "../src/theme";
import type { Deck, Meta, Slide } from "../src/types";

const ROOT = join(import.meta.dirname, "..");

const words = (n: number) => Array.from({ length: n }, (_, i) => `palavra${i % 7}`).join(" ");

/** One slide of every type, written close to the limits the validator allows. */
const FULL: Slide[] = [
  { type: "hook", text: "Primeira linha do gancho\nsegunda linha do gancho\nterceira linha", highlight: "gancho" },
  { type: "number", value: "1.234.567", label: "um rótulo de tamanho razoável para o número", source: "Fonte: exemplo" },
  { type: "text", title: "Um título de tamanho médio para o slide", text: words(40), highlight: "palavra3", source: "Fonte: exemplo" },
  {
    type: "list",
    title: "Lista longa",
    items: ["primeiro item da lista com bastante texto", "segundo item", "terceiro item", "quarto item", "quinto item", "sexto item da lista"],
  },
  { type: "quote", text: words(24), author: "Autor do exemplo" },
  { type: "cta", text: "Chamada final com tamanho razoável para testar", handle: "@exemplo", source: "Fonte: exemplo" },
];

const deckOf = (slides: Slide[], meta?: Meta): Deck => (meta === undefined ? { slides } : { meta, slides });

function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/** True when every pixel of the band is the background color (within a tiny tolerance). */
function bandIsBackground(
  s: RenderedSlide,
  bg: [number, number, number],
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): boolean {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * s.width + x) * 4;
      for (let c = 0; c < 3; c++) {
        if (Math.abs((s.rgba[i + c] as number) - bg[c]!) > 2) return false;
      }
    }
  }
  return true;
}

describe("RND-02 PNG per slide with the exact format size", () => {
  test("square format gives 1080x1080 PNGs with the PNG signature", async () => {
    const slides = await renderDeck(deckOf(FULL));
    expect(slides.length).toBe(FULL.length);
    for (const s of slides) {
      expect(Array.from(s.png.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(pngSize(s.png)).toEqual({ width: 1080, height: 1080 });
      expect(s.width).toBe(1080);
      expect(s.rgba.length).toBe(1080 * 1080 * 4);
    }
  });

  test("portrait format gives 1080x1350 PNGs", async () => {
    const slides = await renderDeck(deckOf(FULL, { format: "linkedin-portrait" }));
    for (const s of slides) expect(pngSize(s.png)).toEqual({ width: 1080, height: 1350 });
  });

  test("slides are numbered from 1 and keep their type", async () => {
    const slides = await renderDeck(deckOf(FULL));
    expect(slides.map((s) => s.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(slides.map((s) => s.type)).toEqual(["hook", "number", "text", "list", "quote", "cta"]);
  });
});

describe("RND-09 reproducible output", () => {
  test("rendering the same deck twice gives identical PNG bytes", async () => {
    const a = await renderDeck(deckOf(FULL));
    const b = await renderDeck(deckOf(FULL));
    for (let i = 0; i < a.length; i++) {
      expect(Buffer.from((a[i] as RenderedSlide).png).equals(Buffer.from((b[i] as RenderedSlide).png))).toBe(true);
    }
  });
});

describe("RND-11 themes", () => {
  for (const theme of ["dark", "light"] as const) {
    test(`${theme} theme paints its own background color`, async () => {
      const slides = await renderDeck(deckOf(FULL, { theme }));
      const bg = hexToRgb(resolveTheme({ theme }).tokens.background);
      const s = slides[0] as RenderedSlide;
      expect(bandIsBackground(s, bg, 0, 20, 0, 20)).toBe(true);
    });
  }
});

describe("nothing leaks into the margins (text is never cut at the edge)", () => {
  for (const format of ["linkedin-square", "linkedin-portrait"] as const) {
    for (const theme of ["dark", "light"] as const) {
      test(`${theme} ${format}: the four margin bands stay background`, async () => {
        const slides = await renderDeck(deckOf(FULL, { theme, format }));
        const { tokens } = resolveTheme({ theme, format });
        const bg = hexToRgb(tokens.background);
        const pad = tokens.padding - 4;
        for (const s of slides) {
          expect(bandIsBackground(s, bg, 0, pad, 0, s.height)).toBe(true);
          expect(bandIsBackground(s, bg, s.width - pad, s.width, 0, s.height)).toBe(true);
          expect(bandIsBackground(s, bg, 0, s.width, 0, pad)).toBe(true);
          expect(bandIsBackground(s, bg, 0, s.width, s.height - pad, s.height)).toBe(true);
        }
      });
    }
  }
});

describe("RND-06 input text never becomes markup", () => {
  const PAYLOADS = [
    "<script>alert(1)</script>",
    "<img src=x onerror=alert(1)>",
    '" onmouseover="alert(1)',
    "javascript:alert(1)",
  ];

  test("payloads in every text field produce an SVG without script, img or handlers", async () => {
    const p = PAYLOADS.join(" ");
    const slides: Slide[] = [
      { type: "hook", text: p },
      { type: "text", title: p, text: p, source: p },
      // The big figure is a single short token, so it gets a short payload.
      { type: "number", value: "<script>", label: p },
      { type: "list", title: p, items: [p] },
      { type: "quote", text: p, author: p },
      { type: "cta", text: p, handle: p },
    ];
    for (let i = 0; i < slides.length; i++) {
      const { svg } = await renderSlideSvg(deckOf(slides), i);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).not.toContain("<script");
      expect(svg).not.toContain("<img");
      expect(svg).not.toContain("<foreignObject");
      expect(svg).not.toContain("onerror");
      expect(svg).not.toContain("onmouseover");
    }
  });
});

describe("RND-04 source footer", () => {
  test("a slide with source differs from the same slide without it", async () => {
    const without = await renderDeck(deckOf([{ type: "hook", text: "Texto" }, ...FULL.slice(1)]));
    const withSource = await renderDeck(deckOf([{ type: "hook", text: "Texto", source: "Fonte: exemplo" }, ...FULL.slice(1)]));
    expect(Buffer.from((without[0] as RenderedSlide).png).equals(Buffer.from((withSource[0] as RenderedSlide).png))).toBe(false);
  });
});

describe("static font weights are really different", () => {
  test("Inter 500, 700 and 800 give three different outlines for the same text", async () => {
    const svgs: string[] = [];
    for (const f of FONTS) {
      const data = await readFile(join(ROOT, f.file));
      svgs.push(
        await satori({ type: "div", props: { style: { display: "flex", fontFamily: "Inter", fontWeight: f.weight, fontSize: 80 }, children: "Weight test" } } as unknown as Parameters<typeof satori>[0], {
          width: 600,
          height: 160,
          fonts: [{ name: "Inter", data, weight: f.weight, style: "normal" }],
        }),
      );
    }
    expect(new Set(svgs).size).toBe(3);
  });
});

describe("text that cannot fit fails with text-overflow", () => {
  test("a giant word fails naming the slide", async () => {
    const slides: Slide[] = [
      { type: "hook", text: "ok" },
      { type: "text", title: "Título", text: "a".repeat(300) },
      { type: "cta", text: "fim", handle: "@x" },
    ];
    let error: unknown;
    try {
      await renderDeck(deckOf(slides));
    } catch (err) {
      error = err;
    }
    expect(error instanceof TextOverflowError).toBe(true);
    expect((error as Error).message).toContain("slide 2");
  });
});

describe("RND-10 progress", () => {
  test("the callback is called once per slide with i and n", async () => {
    const calls: [number, number][] = [];
    await renderDeck(deckOf(FULL), (i, n) => calls.push([i, n]));
    expect(calls).toEqual([[1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]]);
  });
});

describe("hook text is fitted and keeps its line breaks", () => {
  test("a hook that cannot fit fails with text-overflow naming slide 1", async () => {
    const slides: Slide[] = [{ type: "hook", text: "a".repeat(200) }, FULL[2] as Slide, FULL[5] as Slide];
    let error: unknown;
    try {
      await renderDeck(deckOf(slides));
    } catch (err) {
      error = err;
    }
    expect(error instanceof TextOverflowError).toBe(true);
    expect((error as Error).message).toContain("slide 1");
  });

  test("a line break in the hook changes the picture (it is kept, not collapsed)", async () => {
    const rest = FULL.slice(1, 3);
    const broken = await renderDeck(deckOf([{ type: "hook", text: "AAA\nBBB" }, ...rest]));
    const flat = await renderDeck(deckOf([{ type: "hook", text: "AAA BBB" }, ...rest]));
    expect(Buffer.from((broken[0] as RenderedSlide).png).equals(Buffer.from((flat[0] as RenderedSlide).png))).toBe(false);
  });
});
