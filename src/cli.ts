import { readFile } from "node:fs/promises";
import { parseAndValidate } from "./validate";
import type { Finding } from "./schema";

const USAGE = "usage: validate <slides-file> [--facts <facts-file>]";

export function formatFinding(f: Finding): string {
  return `${f.severity} slide ${f.slide} ${f.rule}: ${f.message}`;
}

async function readText(path: string): Promise<{ text: string } | { line: string }> {
  try {
    return { text: await readFile(path, "utf8") };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown error";
    return { line: `error: cannot read ${path} (${detail})` };
  }
}

/**
 * validate <slides-file> [--facts <facts-file>]
 * Exit code: 0 no errors (warnings do not count), 1 at least one error,
 * 2 a file could not be read or the arguments are wrong.
 */
export async function runValidate(args: string[]): Promise<{ code: number; lines: string[] }> {
  let slidesPath: string | undefined;
  let factsPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--facts") {
      factsPath = args[i + 1];
      if (factsPath === undefined) return { code: 2, lines: [USAGE] };
      i++;
    } else if (arg !== undefined && slidesPath === undefined && !arg.startsWith("--")) {
      slidesPath = arg;
    } else {
      return { code: 2, lines: [USAGE] };
    }
  }
  if (slidesPath === undefined) return { code: 2, lines: [USAGE] };

  const slides = await readText(slidesPath);
  if ("line" in slides) return { code: 2, lines: [slides.line] };

  let facts: string | undefined;
  if (factsPath !== undefined) {
    const f = await readText(factsPath);
    if ("line" in f) return { code: 2, lines: [f.line] };
    facts = f.text;
  }

  const { findings } = parseAndValidate(slides.text, facts);
  const failed = findings.some((f) => f.severity === "error");
  return { code: failed ? 1 : 0, lines: findings.map(formatFinding) };
}

// The render subcommand will be added here later.
if (import.meta.main) {
  const [command, ...rest] = Bun.argv.slice(2);
  if (command === "validate") {
    const r = await runValidate(rest);
    for (const line of r.lines) console.log(line);
    process.exit(r.code);
  }
  console.error("usage: cli.ts validate <slides-file> [--facts <facts-file>]");
  process.exit(2);
}
