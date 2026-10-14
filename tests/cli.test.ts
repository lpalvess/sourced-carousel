import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runValidate } from "../src/cli";

let dir: string;
const file = (name: string) => join(dir, name);

const good = {
  slides: [
    { type: "hook", text: "Why decks fail" },
    { type: "text", title: "The idea", text: "A short body" },
    { type: "cta", text: "Follow", handle: "@someone" },
  ],
};
const withNumber = {
  slides: [
    { type: "hook", text: "Why decks fail" },
    { type: "text", title: "The idea", text: "Grew 47 percent" },
    { type: "cta", text: "Follow", handle: "@someone" },
  ],
};
const bad = {
  slides: [
    { type: "hook", text: "Why decks fail" },
    { type: "text", title: "The idea", text: "wait \u2014 here" },
    { type: "cta", text: "Follow", handle: "@someone" },
  ],
};
const warnOnly = {
  slides: [
    { type: "text", title: "a", text: "b" },
    { type: "text", title: "a", text: "b" },
    { type: "text", title: "a", text: "b" },
  ],
};

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "sc-cli-"));
  await writeFile(file("good.json"), JSON.stringify(good));
  await writeFile(file("number.json"), JSON.stringify(withNumber));
  await writeFile(file("bad.json"), JSON.stringify(bad));
  await writeFile(file("warn.json"), JSON.stringify(warnOnly));
  await writeFile(file("broken.json"), "{oops");
  await writeFile(file("facts.md"), "Grew 47 percent last year.");
  await writeFile(file("empty-facts.md"), "");
});

afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("runValidate (VAL-01)", () => {
  test("a clean deck exits 0 with no lines", async () => {
    expect(await runValidate([file("good.json")])).toEqual({ code: 0, lines: [] });
  });

  test("an error exits 1 and prints '<severity> slide <N> <rule-id>: <message>'", async () => {
    const r = await runValidate([file("bad.json")]);
    expect(r.code).toBe(1);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatch(/^error slide 2 forbidden-char: .+/);
  });

  test("warnings alone exit 0 and are printed in the same format", async () => {
    const r = await runValidate([file("warn.json")]);
    expect(r.code).toBe(0);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toMatch(/^warning slide 1 structure: .+/);
    expect(r.lines[1]).toMatch(/^warning slide 3 structure: .+/);
  });

  test("the numbers warning is printed once and does not fail", async () => {
    const r = await runValidate([file("number.json")]);
    expect(r.code).toBe(0);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]).toMatch(/^warning slide 2 facts-skipped: /);
  });
});

describe("--facts (VAL-12, VAL-13)", () => {
  test("a number present in the facts file exits 0 with no lines", async () => {
    expect(await runValidate([file("number.json"), "--facts", file("facts.md")])).toEqual({ code: 0, lines: [] });
  });

  test("--facts may come before the slides file", async () => {
    expect((await runValidate(["--facts", file("facts.md"), file("number.json")])).code).toBe(0);
  });

  test("an empty facts file fails the number", async () => {
    const r = await runValidate([file("number.json"), "--facts", file("empty-facts.md")]);
    expect(r.code).toBe(1);
    expect(r.lines[0]).toMatch(/^error slide 2 number-not-in-facts: .*47/);
  });
});

describe("schema errors (VAL-02)", () => {
  test("invalid JSON exits 1 with schema-invalid", async () => {
    const r = await runValidate([file("broken.json")]);
    expect(r.code).toBe(1);
    expect(r.lines[0]).toMatch(/^error slide 0 schema-invalid: /);
  });
});

describe("unreadable files (VAL-03)", () => {
  test("a missing slides file exits 2 and names the path", async () => {
    const p = file("missing.json");
    const r = await runValidate([p]);
    expect(r.code).toBe(2);
    expect(r.lines.join("\n")).toContain(p);
  });

  test("a missing facts file exits 2 and names the path", async () => {
    const p = file("missing-facts.md");
    const r = await runValidate([file("good.json"), "--facts", p]);
    expect(r.code).toBe(2);
    expect(r.lines.join("\n")).toContain(p);
  });

  test("a directory instead of a file exits 2", async () => {
    expect((await runValidate([dir])).code).toBe(2);
  });
});

describe("argument errors", () => {
  test("no arguments exit 2 with a usage line", async () => {
    const r = await runValidate([]);
    expect(r.code).toBe(2);
    expect(r.lines[0]).toContain("usage");
  });

  test("--facts without a value exits 2", async () => {
    expect((await runValidate([file("good.json"), "--facts"])).code).toBe(2);
  });

  test("an unknown flag exits 2", async () => {
    expect((await runValidate([file("good.json"), "--nope"])).code).toBe(2);
  });
});

describe("real execution", () => {
  const run = async (args: string[]) => {
    const proc = Bun.spawn([process.execPath, join(import.meta.dir, "..", "src", "cli.ts"), ...args], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const out = await new Response(proc.stdout).text();
    const code = await proc.exited;
    return { out, code };
  };

  test("bun src/cli.ts validate prints the lines and exits with the code", async () => {
    const r = await run(["validate", file("bad.json")]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/^error slide 2 forbidden-char: /m);
  });

  test("a clean run exits 0", async () => {
    expect((await run(["validate", file("good.json")])).code).toBe(0);
  });

  test("an unreadable file exits 2", async () => {
    expect((await run(["validate", file("missing.json")])).code).toBe(2);
  });
});
