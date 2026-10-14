import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runRender } from "../src/cli";

async function workdir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "sourced-carousel-"));
}

const GOOD_DECK = {
  meta: { theme: "dark" },
  slides: [
    { type: "hook", text: "Gancho de exemplo" },
    { type: "number", value: "30.000", label: "mudanças por dia", source: "Fonte: exemplo" },
    { type: "text", title: "Título", text: "Corpo do slide de exemplo." },
    { type: "list", title: "Lista", items: ["um", "dois", "três"] },
    { type: "quote", text: "Uma citação curta.", author: "Autor" },
    { type: "cta", text: "Fim", handle: "@exemplo" },
  ],
};

async function write(dir: string, name: string, content: string): Promise<string> {
  const p = join(dir, name);
  await writeFile(p, content);
  return p;
}

const ls = async (dir: string) => (await readdir(dir)).sort();

describe("RND-01 validation runs first", () => {
  test("a validation error stops with code 1 and writes nothing", async () => {
    const dir = await workdir();
    const bad = { slides: [...GOOD_DECK.slides.slice(0, 2), { type: "text", title: "T", text: "tem \u2014 travessão" }, ...GOOD_DECK.slides.slice(2)] };
    const slides = await write(dir, "slides.json", JSON.stringify(bad));
    const out = join(dir, "out");
    const r = await runRender([slides, "--out", out]);
    expect(r.code).toBe(1);
    expect(r.lines.some((l) => l.startsWith("error slide 3 forbidden-char"))).toBe(true);
    await expect(readdir(out)).rejects.toThrow();
  });

  test("a number outside the facts file stops the render", async () => {
    const dir = await workdir();
    const slides = await write(dir, "slides.json", JSON.stringify(GOOD_DECK));
    const facts = await write(dir, "facts.md", "nenhum numero aqui");
    const out = join(dir, "out");
    const r = await runRender([slides, "--facts", facts, "--out", out]);
    expect(r.code).toBe(1);
    expect(r.lines.some((l) => l.includes("number-not-in-facts"))).toBe(true);
    await expect(readdir(out)).rejects.toThrow();
  });
});

describe("RND-02 and RND-03 outputs", () => {
  test("a good deck writes one PNG per slide and a PDF with one page per slide", async () => {
    const dir = await workdir();
    const slides = await write(dir, "slides.json", JSON.stringify(GOOD_DECK));
    const facts = await write(dir, "facts.md", "30.000 mudanças por dia, 2026");
    const out = join(dir, "out");
    const r = await runRender([slides, "--facts", facts, "--out", out]);
    expect(r.code).toBe(0);
    expect(await ls(out)).toEqual([
      "01-hook.png",
      "02-number.png",
      "03-text.png",
      "04-list.png",
      "05-quote.png",
      "06-cta.png",
      "carousel.pdf",
    ]);
    const pdf = (await readFile(join(out, "carousel.pdf"))).toString("latin1");
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect((pdf.match(/\/Type \/Page(?![s])/g) ?? []).length).toBe(6);
    expect(pdf).toContain("/MediaBox [0 0 1080 1080]");
  });
});

describe("RND-10 progress", () => {
  test("prints slide i/n for every slide, as it renders", async () => {
    const dir = await workdir();
    const slides = await write(dir, "slides.json", JSON.stringify(GOOD_DECK));
    const seen: string[] = [];
    const r = await runRender([slides, "--out", join(dir, "out")], (l) => seen.push(l));
    expect(r.code).toBe(0);
    expect(seen.filter((l) => l.startsWith("slide "))).toEqual(["slide 1/6", "slide 2/6", "slide 3/6", "slide 4/6", "slide 5/6", "slide 6/6"]);
    expect(seen).toEqual(r.lines);
  });
});

describe("RND-08 a failed run never leaves a PDF", () => {
  test("a stale PDF from an earlier run is removed when validation fails", async () => {
    const dir = await workdir();
    const out = join(dir, "out");
    await mkdir(out);
    await write(out, "carousel.pdf", "old");
    const slides = await write(dir, "slides.json", "{ not json");
    const r = await runRender([slides, "--out", out]);
    expect(r.code).toBe(1);
    expect(await ls(out)).toEqual([]);
  });

  test("text that cannot fit fails at the render step naming the slide, and leaves no PDF", async () => {
    const dir = await workdir();
    const out = join(dir, "out");
    await mkdir(out);
    await write(out, "carousel.pdf", "old");
    const deck = { slides: [GOOD_DECK.slides[0], { type: "text", title: "T", text: "a".repeat(300) }, GOOD_DECK.slides[5]] };
    const slides = await write(dir, "slides.json", JSON.stringify(deck));
    const r = await runRender([slides, "--out", out]);
    expect(r.code).toBe(3);
    const last = r.lines[r.lines.length - 1] as string;
    expect(last.startsWith("error: render failed:")).toBe(true);
    expect(last).toContain("slide 2");
    expect(await ls(out)).toEqual([]);
  });

  test("an output path that is a file fails at the write step with no PDF", async () => {
    const dir = await workdir();
    const slides = await write(dir, "slides.json", JSON.stringify(GOOD_DECK));
    const notADir = await write(dir, "blocker", "x");
    const r = await runRender([slides, "--out", notADir]);
    expect(r.code).toBe(3);
    expect((r.lines[r.lines.length - 1] as string).startsWith("error: write failed:")).toBe(true);
  });
});

describe("edge cases", () => {
  test("existing files with other names in out/ are kept, same names are overwritten", async () => {
    const dir = await workdir();
    const out = join(dir, "out");
    await mkdir(out);
    await write(out, "notes.txt", "keep me");
    await write(out, "01-hook.png", "old");
    const slides = await write(dir, "slides.json", JSON.stringify(GOOD_DECK));
    const r = await runRender([slides, "--out", out]);
    expect(r.code).toBe(0);
    expect(await readFile(join(out, "notes.txt"), "utf8")).toBe("keep me");
    expect((await readFile(join(out, "01-hook.png"))).subarray(1, 4).toString("latin1")).toBe("PNG");
  });

  test("wrong arguments print the usage and exit 2", async () => {
    expect((await runRender([])).code).toBe(2);
    expect((await runRender(["a.json", "--out"])).code).toBe(2);
    expect((await runRender(["a.json", "--nope"])).code).toBe(2);
  });

  test("an unreadable slides file exits 2 naming the path", async () => {
    const dir = await workdir();
    const missing = join(dir, "missing.json");
    const r = await runRender([missing, "--out", join(dir, "out")]);
    expect(r.code).toBe(2);
    expect((r.lines[0] as string).includes(missing)).toBe(true);
  });
});

describe("RND-04 the source footer is in the PDF too", () => {
  test("the PDF changes when a slide gets a source", async () => {
    const withSource = JSON.stringify({
      slides: GOOD_DECK.slides.map((x, i) => (i === 0 ? { ...x, source: "Fonte: exemplo" } : x)),
    });
    const without = JSON.stringify(GOOD_DECK);
    const dir = await workdir();
    const a = join(dir, "a");
    const b = join(dir, "b");
    expect((await runRender([await write(dir, "with.json", withSource), "--out", a])).code).toBe(0);
    expect((await runRender([await write(dir, "without.json", without), "--out", b])).code).toBe(0);
    const pdfA = await readFile(join(a, "carousel.pdf"));
    const pdfB = await readFile(join(b, "carousel.pdf"));
    expect(pdfA.equals(pdfB)).toBe(false);
  });
});

describe("RND-08 injected step failures", () => {
  test("a failing pdf step exits 3, names the step and writes nothing", async () => {
    const dir = await workdir();
    const slides = await write(dir, "slides.json", JSON.stringify(GOOD_DECK));
    const out = join(dir, "out");
    const r = await runRender([slides, "--out", out], undefined, {
      buildPdf: () => {
        throw new Error("boom");
      },
    });
    expect(r.code).toBe(3);
    expect(r.lines[r.lines.length - 1]).toBe("error: pdf failed: boom");
    await expect(readdir(out)).rejects.toThrow();
  });

  test("a failing render step exits 3 and names the step", async () => {
    const dir = await workdir();
    const slides = await write(dir, "slides.json", JSON.stringify(GOOD_DECK));
    const r = await runRender([slides, "--out", join(dir, "out")], undefined, {
      renderDeck: async () => {
        throw new Error("kaput");
      },
    });
    expect(r.code).toBe(3);
    expect(r.lines[r.lines.length - 1]).toBe("error: render failed: kaput");
  });
});
