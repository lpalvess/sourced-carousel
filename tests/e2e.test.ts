import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const DECK = {
  slides: [
    { type: "hook", text: "Gancho de exemplo", highlight: "exemplo" },
    { type: "number", value: "30.000", label: "mudanças por dia", source: "Fonte: exemplo" },
    { type: "text", title: "Título", text: "Corpo do slide de exemplo, com texto suficiente para quebrar linha." },
    { type: "list", title: "Lista", items: ["um", "dois", "três"] },
    { type: "quote", text: "Uma citação curta.", author: "Autor" },
    { type: "cta", text: "Fim", handle: "@exemplo" },
  ],
};

/** Runs the real entry point as a separate process, the way the container script does. */
async function run(args: string[]): Promise<{ code: number; stdout: string }> {
  const proc = Bun.spawn([process.execPath, "src/cli.ts", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  const [stdout, code] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
  return { code, stdout };
}

async function setup(deck: object): Promise<{ dir: string; slides: string }> {
  const dir = await mkdtemp(join(tmpdir(), "sourced-carousel-e2e-"));
  const slides = join(dir, "slides.json");
  await writeFile(slides, JSON.stringify(deck));
  return { dir, slides };
}

function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

describe("RND-02 and RND-03 through the real CLI", () => {
  test("6 PNGs of 1080x1080 and a 6 page PDF", async () => {
    const { dir, slides } = await setup(DECK);
    const out = join(dir, "out");
    const r = await run(["render", slides, "--out", out]);
    expect(r.code).toBe(0);
    const files = (await readdir(out)).sort();
    expect(files.filter((f) => f.endsWith(".png")).length).toBe(6);
    for (const f of files.filter((n) => n.endsWith(".png"))) {
      expect(pngSize(await readFile(join(out, f)))).toEqual({ width: 1080, height: 1080 });
    }
    const pdf = (await readFile(join(out, "carousel.pdf"))).toString("latin1");
    expect((pdf.match(/\/Type \/Page(?![s])/g) ?? []).length).toBe(6);
  });

  test("the portrait format gives 1080x1350 PNGs and a matching page size", async () => {
    const { dir, slides } = await setup({ meta: { format: "linkedin-portrait" }, slides: DECK.slides });
    const out = join(dir, "out");
    expect((await run(["render", slides, "--out", out])).code).toBe(0);
    expect(pngSize(await readFile(join(out, "01-hook.png")))).toEqual({ width: 1080, height: 1350 });
    expect((await readFile(join(out, "carousel.pdf"))).toString("latin1")).toContain("/MediaBox [0 0 1080 1350]");
  });
});

describe("RND-09 reproducible", () => {
  test("two separate runs give identical PNGs and an identical PDF", async () => {
    const { dir, slides } = await setup(DECK);
    const a = join(dir, "a");
    const b = join(dir, "b");
    expect((await run(["render", slides, "--out", a])).code).toBe(0);
    expect((await run(["render", slides, "--out", b])).code).toBe(0);
    for (const f of await readdir(a)) {
      expect((await readFile(join(a, f))).equals(await readFile(join(b, f)))).toBe(true);
    }
  });
});

describe("RND-11 themes through the real CLI (pixel checks of each background are in render.test.ts)", () => {
  test("dark and light decks produce different images", async () => {
    const dark = await setup({ meta: { theme: "dark" }, slides: DECK.slides });
    const light = await setup({ meta: { theme: "light" }, slides: DECK.slides });
    const d = join(dark.dir, "out");
    const l = join(light.dir, "out");
    await run(["render", dark.slides, "--out", d]);
    await run(["render", light.slides, "--out", l]);
    expect((await readFile(join(d, "01-hook.png"))).equals(await readFile(join(l, "01-hook.png")))).toBe(false);
  });
});

describe("exit codes through the real process", () => {
  test("validate: 0 for a clean deck, 1 for a forbidden character", async () => {
    const ok = await setup(DECK);
    expect((await run(["validate", ok.slides])).code).toBe(0);
    const bad = await setup({ slides: [...DECK.slides.slice(0, 2), { type: "text", title: "T", text: "tem \u2014 aqui" }, ...DECK.slides.slice(2)] });
    const r = await run(["validate", bad.slides]);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain("forbidden-char");
  });

  test("render prints slide i/n lines on stdout", async () => {
    const { dir, slides } = await setup(DECK);
    const r = await run(["render", slides, "--out", join(dir, "out")]);
    expect(r.stdout).toContain("slide 6/6");
  });

  test("no command prints the usage and exits 2", async () => {
    expect((await run([])).code).toBe(2);
  });
});
