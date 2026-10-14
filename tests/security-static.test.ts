import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Static guard (VAL-14, SEC-07): src/ must contain no dynamic code execution,
 * no process spawning, no network API and no environment access.
 * The forbidden snippets below are assembled from pieces so that this file
 * never contains them whole. Only src/ is scanned, never tests/.
 */

interface Rule {
  name: string;
  pattern: RegExp;
  /** A snippet that must be detected, built by concatenation. */
  sample: string;
}

const j = (...parts: string[]) => parts.join("");

const RULES: Rule[] = [
  { name: "eval", pattern: new RegExp(j("\\bev", "al\\s*\\(")), sample: j("ev", "al(", '"1")') },
  { name: "new Function", pattern: new RegExp(j("\\bnew\\s+Func", "tion\\b")), sample: j("new Func", "tion('return 1')") },
  { name: "dynamic import", pattern: new RegExp(j("\\bimp", "ort\\s*\\(")), sample: j("await imp", "ort('node:fs')") },
  { name: "child_process", pattern: new RegExp(j("child", "_process")), sample: j("import 'node:child", "_process'") },
  { name: "fetch", pattern: new RegExp(j("\\bfet", "ch\\s*\\(")), sample: j("fet", "ch('https://example.invalid')") },
  { name: "XMLHttpRequest", pattern: new RegExp(j("XMLHttp", "Request")), sample: j("new XMLHttp", "Request()") },
  { name: "WebSocket", pattern: new RegExp(j("Web", "Socket")), sample: j("new Web", "Socket('wss://example.invalid')") },
  { name: "node:http", pattern: new RegExp(j("node:ht", "tp\\b")), sample: j("import 'node:ht", "tp'") },
  { name: "node:https", pattern: new RegExp(j("node:ht", "tps\\b")), sample: j("import 'node:ht", "tps'") },
  { name: "node:net", pattern: new RegExp(j("node:", "net\\b")), sample: j("import 'node:", "net'") },
  { name: "node:dgram", pattern: new RegExp(j("node:dg", "ram\\b")), sample: j("import 'node:dg", "ram'") },
  { name: "node:dns", pattern: new RegExp(j("node:", "dns\\b")), sample: j("import 'node:", "dns'") },
  { name: "process env", pattern: new RegExp(j("\\bproc", "ess\\.env\\b")), sample: j("const v = proc", "ess.env.HOME") },
  { name: "Bun env", pattern: new RegExp(j("\\bBu", "n\\.env\\b")), sample: j("const v = Bu", "n.env.HOME") },
  { name: "Bun spawn", pattern: new RegExp(j("\\bBun\\.sp", "awn")), sample: j("Bun.sp", "awn(['ls'])") },
  { name: "Bun connect", pattern: new RegExp(j("\\bBun\\.con", "nect")), sample: j("await Bun.con", "nect({})") },
  { name: "Bun listen", pattern: new RegExp(j("\\bBun\\.lis", "ten")), sample: j("Bun.lis", "ten({})") },
  { name: "Bun serve", pattern: new RegExp(j("\\bBun\\.ser", "ve")), sample: j("Bun.ser", "ve({})") },
  { name: "node:tls", pattern: new RegExp(j("node:t", "ls\\b")), sample: j("import 'node:t", "ls'") },
  { name: "node:http2", pattern: new RegExp(j("node:ht", "tp2\\b")), sample: j("import 'node:ht", "tp2'") },
  { name: "node:vm", pattern: new RegExp(j("node:", "vm\\b")), sample: j("import 'node:", "vm'") },
  { name: "worker threads", pattern: new RegExp(j("worker", "_threads")), sample: j("import 'node:worker", "_threads'") },
  { name: "Function call without new", pattern: new RegExp(j("(?<![\\w.])Func", "tion\\s*\\(")), sample: j("Func", "tion('return 1')()") },
  { name: "globalThis indexing", pattern: new RegExp(j("global", "This\\s*\\[")), sample: j("global", "This['x']") },
];

async function listTs(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listTs(full)));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Scans every .ts file under root and returns "<file>: <rule>" for each hit. */
async function scan(root: string): Promise<string[]> {
  const hits: string[] = [];
  for (const file of await listTs(root)) {
    const text = await readFile(file, "utf8");
    for (const rule of RULES) {
      if (rule.pattern.test(text)) hits.push(`${file}: ${rule.name}`);
    }
  }
  return hits;
}

let tmp: string;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), "sc-static-"));
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe("src/ is free of dynamic code and network APIs", () => {
  test("the real src tree has no forbidden pattern", async () => {
    const src = join(import.meta.dir, "..", "src");
    expect((await listTs(src)).length).toBeGreaterThan(0);
    expect(await scan(src)).toEqual([]);
  });
});

describe("the scanner detects every forbidden pattern", () => {
  for (const rule of RULES) {
    test(`detects ${rule.name} in a temporary copy`, async () => {
      const dir = await mkdtemp(join(tmp, "case-"));
      const nested = join(dir, "deep", "er");
      await mkdir(nested, { recursive: true });
      await writeFile(join(nested, "bad.ts"), `export const x = 1;\n${rule.sample}\n`);
      const hits = await scan(dir);
      expect(hits.some((h) => h.endsWith(`: ${rule.name}`))).toBe(true);
    });
  }

  test("a clean file produces no hits", async () => {
    const dir = await mkdtemp(join(tmp, "clean-"));
    await writeFile(join(dir, "ok.ts"), "export const add = (a: number, b: number) => a + b;\n");
    expect(await scan(dir)).toEqual([]);
  });

  test("the samples themselves are not present whole in this test file", async () => {
    const self = await readFile(join(import.meta.dir, "security-static.test.ts"), "utf8");
    for (const rule of RULES) {
      expect(self.includes(rule.sample)).toBe(false);
    }
  });
});
