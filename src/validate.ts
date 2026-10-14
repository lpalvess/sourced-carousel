import { SLIDE_TYPES, type Deck } from "./types";
import { isRecord, ownProp, parseDeck, type Finding, type RawDeck } from "./schema";

export type { Finding, RawDeck } from "./schema";

export const MIN_SLIDES = 3;
export const MAX_SLIDES = 10;
export const MAX_LIST_ITEMS = 6;

/** Fields that must be a non-empty string, per slide type. */
const REQUIRED_STRINGS: Record<string, readonly string[]> = {
  hook: ["text"],
  text: ["title", "text"],
  number: ["value", "label"],
  list: ["title"],
  quote: ["text", "author"],
  cta: ["text", "handle"],
};

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.trim() === "";
}

function err(slide: number, rule: string, message: string): Finding {
  return { severity: "error", slide, rule, message };
}

function warn(slide: number, rule: string, message: string): Finding {
  return { severity: "warning", slide, rule, message };
}

function checkMeta(meta: unknown): Finding[] {
  if (meta === undefined || !isRecord(meta)) return [];
  const out: Finding[] = [];
  const theme = ownProp(meta, "theme");
  if (theme !== undefined && theme !== "dark" && theme !== "light") {
    out.push(err(0, "schema-invalid", '$.meta.theme: must be "dark" or "light"'));
  }
  const accent = ownProp(meta, "accent");
  if (accent !== undefined && !(typeof accent === "string" && /^#[0-9a-fA-F]{6}$/.test(accent))) {
    out.push(err(0, "schema-invalid", "$.meta.accent: must be a #RRGGBB hex string"));
  }
  const format = ownProp(meta, "format");
  if (format !== undefined && format !== "linkedin-square" && format !== "linkedin-portrait") {
    out.push(err(0, "schema-invalid", '$.meta.format: must be "linkedin-square" or "linkedin-portrait"'));
  }
  return out;
}

function checkRequired(n: number, slide: Record<string, unknown>, type: string): Finding[] {
  const out: Finding[] = [];
  for (const field of REQUIRED_STRINGS[type] ?? []) {
    if (isBlank(ownProp(slide, field))) {
      out.push(err(n, "field-missing", `slide ${n} (${type}) needs a non-empty "${field}"`));
    }
  }
  if (type === "list") {
    const items = ownProp(slide, "items");
    if (!Array.isArray(items) || items.length === 0) {
      out.push(err(n, "field-missing", `slide ${n} (list) needs "items" with 1 to ${MAX_LIST_ITEMS} entries`));
    } else if (items.length > MAX_LIST_ITEMS) {
      out.push(err(n, "field-missing", `slide ${n} (list) "items" has ${items.length} entries, the maximum is ${MAX_LIST_ITEMS}`));
    } else if (items.some(isBlank)) {
      out.push(err(n, "field-missing", `slide ${n} (list) "items" must be non-empty strings`));
    }
  }
  for (const optional of ["source", "highlight"]) {
    const v = ownProp(slide, optional);
    if (v !== undefined && typeof v !== "string") {
      out.push(err(n, "schema-invalid", `$.slides[${n - 1}].${optional}: must be a string`));
    }
  }
  return out;
}

export const MAX_TEXT_WORDS = 40;
export const MAX_HOOK_LINES = 3;
export const MAX_HIGHLIGHT_WORDS = 2;
export const MAX_SOURCE_CHARS = 80;

function countWords(s: string): number {
  const t = s.trim();
  return t === "" ? 0 : t.split(/\s+/).length;
}

/** Visible text a highlight may point into. */
function highlightHaystack(slide: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const key of ["title", "text", "value", "label", "author"]) {
    const v = ownProp(slide, key);
    if (typeof v === "string") out.push(v);
  }
  const items = ownProp(slide, "items");
  if (Array.isArray(items)) for (const it of items) if (typeof it === "string") out.push(it);
  return out;
}

function checkContent(n: number, slide: Record<string, unknown>, type: string): Finding[] {
  const out: Finding[] = [];
  const body = ownProp(slide, "text");
  if (type === "text" && typeof body === "string") {
    const words = countWords(body);
    if (words > MAX_TEXT_WORDS) {
      out.push(err(n, "too-many-words", `slide ${n} text has ${words} words, the maximum is ${MAX_TEXT_WORDS}`));
    }
  }
  if (type === "hook" && typeof body === "string") {
    const lines = body.replace(/(\r?\n)+$/, "").split(/\r?\n/).length;
    if (lines > MAX_HOOK_LINES) {
      out.push(err(n, "hook-too-long", `slide ${n} hook has ${lines} lines, the maximum is ${MAX_HOOK_LINES}`));
    }
  }
  const highlight = ownProp(slide, "highlight");
  if (typeof highlight === "string") {
    const words = countWords(highlight);
    if (words === 0 || words > MAX_HIGHLIGHT_WORDS) {
      out.push(err(n, "highlight-invalid", `slide ${n} highlight has ${words} words, it must have 1 to ${MAX_HIGHLIGHT_WORDS}`));
    } else if (!highlightHaystack(slide).some((t) => t.includes(highlight))) {
      out.push(err(n, "highlight-invalid", `slide ${n} highlight "${highlight}" does not appear in the slide text`));
    }
  }
  const source = ownProp(slide, "source");
  if (typeof source === "string") {
    const chars = [...source].length;
    if (chars > MAX_SOURCE_CHARS) {
      out.push(err(n, "source-too-long", `slide ${n} source has ${chars} characters, the maximum is ${MAX_SOURCE_CHARS}`));
    }
  }
  return out;
}

/** Characters and sequences that must never appear, written as escapes. */
export const FORBIDDEN: readonly string[] = ["\u2014", "\u2013", "\u2192", "\u21D2", "\u002D\u003E"];

/** Every visible string of a slide, including list items and source. */
function allTexts(slide: Record<string, unknown>): string[] {
  const out: string[] = [];
  for (const key of ["text", "title", "value", "label", "author", "handle", "highlight", "source"]) {
    const v = ownProp(slide, key);
    if (typeof v === "string") out.push(v);
  }
  const items = ownProp(slide, "items");
  if (Array.isArray(items)) for (const it of items) if (typeof it === "string") out.push(it);
  return out;
}

function describeForbidden(seq: string): string {
  if (seq.length === 2) return `"${seq}"`;
  const cp = (seq.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, "0");
  return `"${seq}" (U+${cp})`;
}

function checkForbidden(n: number, slide: Record<string, unknown>): Finding[] {
  const texts = allTexts(slide);
  const out: Finding[] = [];
  for (const seq of FORBIDDEN) {
    if (texts.some((t) => t.includes(seq))) {
      out.push(err(n, "forbidden-char", `slide ${n} contains the forbidden character ${describeForbidden(seq)}`));
    }
  }
  return out;
}

/** Numbers with optional separators and a unit, as written in the slide. */
const NUMBER_RE = /\d+(?:[.,]\d+)*(?:\s?(?:%|x|\u00D7|k|M))?/g;

/** Distinct numbers in the checked text of a slide. source and highlight are left out. */
function numbersIn(slide: Record<string, unknown>): string[] {
  const texts: string[] = [];
  for (const key of ["text", "title", "value", "label", "author", "handle"]) {
    const v = ownProp(slide, key);
    if (typeof v === "string") texts.push(v);
  }
  const items = ownProp(slide, "items");
  if (Array.isArray(items)) for (const it of items) if (typeof it === "string") texts.push(it);
  const found = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(NUMBER_RE)) found.add(m[0]);
  return [...found];
}

/** Runs every rule over a parsed deck. Findings come back ordered by slide. */
export function validate(deck: RawDeck, opts?: { facts?: string }): Finding[] {
  const findings: Finding[] = [];
  findings.push(...checkMeta(deck.meta));

  const count = deck.slides.length;
  if (count < MIN_SLIDES || count > MAX_SLIDES) {
    findings.push(err(0, "slide-count", `deck has ${count} slides, it must have ${MIN_SLIDES} to ${MAX_SLIDES}`));
  }

  const types: (string | undefined)[] = [];
  deck.slides.forEach((raw, i) => {
    const n = i + 1;
    if (!isRecord(raw)) {
      types.push(undefined);
      findings.push(err(n, "type-unknown", `slide ${n} must be an object with a "type"`));
      return;
    }
    const type = ownProp(raw, "type");
    const known = typeof type === "string" && (SLIDE_TYPES as readonly string[]).includes(type);
    if (!known) {
      types.push(undefined);
      const shown = typeof type === "string" ? `"${type}"` : "missing";
      findings.push(err(n, "type-unknown", `slide ${n} has type ${shown}, expected one of ${SLIDE_TYPES.join(", ")}`));
      findings.push(...checkForbidden(n, raw));
      return;
    }
    types.push(type);
    findings.push(...checkRequired(n, raw, type));
    findings.push(...checkContent(n, raw, type));
    findings.push(...checkForbidden(n, raw));
  });

  if (count > 0) {
    if (types[0] !== "hook") {
      findings.push(warn(1, "structure", "the first slide should be a hook"));
    }
    if (types[count - 1] !== "cta") {
      findings.push(warn(count, "structure", "the last slide should be a cta"));
    }
  }

  const facts = opts?.facts;
  let skippedReported = false;
  deck.slides.forEach((raw, i) => {
    const n = i + 1;
    if (!isRecord(raw)) return;
    const type = ownProp(raw, "type");
    if (typeof type !== "string" || !(SLIDE_TYPES as readonly string[]).includes(type)) return;
    const numbers = numbersIn(raw);
    if (numbers.length === 0) return;
    if (facts === undefined) {
      if (!skippedReported) {
        skippedReported = true;
        findings.push(warn(n, "facts-skipped", "numbers were not checked because no facts file was given"));
      }
      return;
    }
    for (const num of numbers) {
      if (!facts.includes(num)) {
        findings.push(err(n, "number-not-in-facts", `slide ${n} has the number "${num}" which is not in the facts file`));
      }
    }
  });

  return findings.sort((a, b) => a.slide - b.slide);
}

/** Parses and validates in one step. deck is returned only when there is no error finding. */
export function parseAndValidate(text: string, facts?: string): { findings: Finding[]; deck?: Deck } {
  const parsed = parseDeck(text);
  if ("findings" in parsed) return { findings: parsed.findings };
  const findings = validate(parsed.deck, facts === undefined ? undefined : { facts });
  if (findings.some((f) => f.severity === "error")) return { findings };
  return { findings, deck: parsed.deck as unknown as Deck };
}
