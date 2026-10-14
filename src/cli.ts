import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildPdf } from "./pdf";
import { renderDeck } from "./render";
import type { Finding } from "./schema";
import { parseAndValidate } from "./validate";

const VALIDATE_USAGE = "usage: validate <slides-file> [--facts <facts-file>]";
const RENDER_USAGE = "usage: render <slides-file> [--facts <facts-file>] [--out <directory>]";

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

interface ParsedArgs {
  slidesPath: string;
  factsPath?: string;
  outDir?: string;
}

/** Positional slides file plus the listed value flags. Returns undefined on any misuse. */
function parseArgs(args: string[], flags: readonly ("--facts" | "--out")[]): ParsedArgs | undefined {
  let slidesPath: string | undefined;
  let factsPath: string | undefined;
  let outDir: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--facts" && flags.includes("--facts")) {
      factsPath = args[i + 1];
      if (factsPath === undefined) return undefined;
      i++;
    } else if (arg === "--out" && flags.includes("--out")) {
      outDir = args[i + 1];
      if (outDir === undefined) return undefined;
      i++;
    } else if (arg !== undefined && slidesPath === undefined && !arg.startsWith("--")) {
      slidesPath = arg;
    } else {
      return undefined;
    }
  }
  if (slidesPath === undefined) return undefined;
  const parsed: ParsedArgs = { slidesPath };
  if (factsPath !== undefined) parsed.factsPath = factsPath;
  if (outDir !== undefined) parsed.outDir = outDir;
  return parsed;
}

/**
 * validate <slides-file> [--facts <facts-file>]
 * Exit code: 0 no errors (warnings do not count), 1 at least one error,
 * 2 a file could not be read or the arguments are wrong.
 */
export async function runValidate(args: string[]): Promise<{ code: number; lines: string[] }> {
  const parsed = parseArgs(args, ["--facts"]);
  if (parsed === undefined) return { code: 2, lines: [VALIDATE_USAGE] };

  const slides = await readText(parsed.slidesPath);
  if ("line" in slides) return { code: 2, lines: [slides.line] };

  let facts: string | undefined;
  if (parsed.factsPath !== undefined) {
    const f = await readText(parsed.factsPath);
    if ("line" in f) return { code: 2, lines: [f.line] };
    facts = f.text;
  }

  const { findings } = parseAndValidate(slides.text, facts);
  const failed = findings.some((f) => f.severity === "error");
  return { code: failed ? 1 : 0, lines: findings.map(formatFinding) };
}

/** The step a render failure happened in, named in the error line. */
type Step = "render" | "pdf" | "write";

function failure(step: Step, err: unknown): string {
  const detail = err instanceof Error ? err.message : "unknown error";
  return `error: ${step} failed: ${detail}`;
}

/**
 * render <slides-file> [--facts <facts-file>] [--out <directory>]
 * Validates first and stops with the validator's code on any error. Then writes one
 * PNG per slide (NN-<type>.png) and carousel.pdf into the output directory (default out).
 * Exit code: 0 done, 1 validation errors, 2 unreadable file or wrong arguments,
 * 3 a render, pdf or write step failed. A failed run never leaves carousel.pdf behind.
 * onLine receives each output line as it is produced, so progress shows while rendering.
 */
export async function runRender(
  args: string[],
  onLine?: (line: string) => void,
): Promise<{ code: number; lines: string[] }> {
  const lines: string[] = [];
  const emit = (line: string) => {
    lines.push(line);
    onLine?.(line);
  };
  const done = (code: number) => ({ code, lines });

  const parsed = parseArgs(args, ["--facts", "--out"]);
  if (parsed === undefined) {
    emit(RENDER_USAGE);
    return done(2);
  }
  const outDir = parsed.outDir ?? "out";
  const pdfPath = join(outDir, "carousel.pdf");

  // A PDF from an earlier run must never be mistaken for the output of this one.
  // If it cannot be removed (for example the output path is a file), the write step
  // reports the real problem later, so the error is deliberately not handled here.
  await rm(pdfPath, { force: true }).catch(() => undefined);

  const slides = await readText(parsed.slidesPath);
  if ("line" in slides) {
    emit(slides.line);
    return done(2);
  }
  let facts: string | undefined;
  if (parsed.factsPath !== undefined) {
    const f = await readText(parsed.factsPath);
    if ("line" in f) {
      emit(f.line);
      return done(2);
    }
    facts = f.text;
  }

  const { findings, deck } = parseAndValidate(slides.text, facts);
  for (const finding of findings) emit(formatFinding(finding));
  if (deck === undefined) return done(1);

  let rendered;
  try {
    rendered = await renderDeck(deck, (i, n) => emit(`slide ${i}/${n}`));
  } catch (err) {
    emit(failure("render", err));
    return done(3);
  }

  let pdf: Uint8Array;
  try {
    pdf = buildPdf(rendered.map((s) => ({ width: s.width, height: s.height, rgba: s.rgba })));
  } catch (err) {
    emit(failure("pdf", err));
    return done(3);
  }

  const tmpPath = `${pdfPath}.tmp`;
  try {
    await mkdir(outDir, { recursive: true });
    for (const s of rendered) {
      const name = `${String(s.index).padStart(2, "0")}-${s.type}.png`;
      await writeFile(join(outDir, name), s.png);
    }
    await writeFile(tmpPath, pdf);
    await rename(tmpPath, pdfPath);
  } catch (err) {
    // Cleanup is best effort: the original error is the one worth reporting.
    await rm(tmpPath, { force: true }).catch(() => undefined);
    await rm(pdfPath, { force: true }).catch(() => undefined);
    emit(failure("write", err));
    return done(3);
  }
  return done(0);
}

if (import.meta.main) {
  const [command, ...rest] = Bun.argv.slice(2);
  if (command === "validate") {
    const r = await runValidate(rest);
    for (const line of r.lines) console.log(line);
    process.exit(r.code);
  }
  if (command === "render") {
    const r = await runRender(rest, (line) => console.log(line));
    process.exit(r.code);
  }
  console.error("usage: cli.ts <validate|render> <slides-file> [--facts <facts-file>] [--out <directory>]");
  process.exit(2);
}
