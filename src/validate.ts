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

/** Whitespace and zero width characters, which show nothing. */
const INVISIBLE = /[\s\u200B-\u200D\u2060\uFEFF]/gu;

function isBlank(value: unknown): boolean {
  return typeof value !== "string" || value.replace(INVISIBLE, "") === "";
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

/**
 * Fields the layout of each type actually draws the highlight in. A highlight that
 * only exists in another field (the quote author, the cta handle) would be accepted
 * but never drawn, so it is not searched.
 */
const HIGHLIGHT_FIELDS: Record<string, readonly string[]> = {
  hook: ["text"],
  text: ["title", "text"],
  number: ["value", "label"],
  list: ["title"],
  quote: ["text"],
  cta: ["text"],
};

function highlightHaystack(slide: Record<string, unknown>, type: string): string[] {
  const out: string[] = [];
  for (const key of HIGHLIGHT_FIELDS[type] ?? []) {
    const v = ownProp(slide, key);
    if (typeof v === "string") out.push(v);
  }
  if (type === "list") {
    const items = ownProp(slide, "items");
    if (Array.isArray(items)) for (const it of items) if (typeof it === "string") out.push(it);
  }
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
    } else if (!highlightHaystack(slide, type).some((t) => t.includes(highlight))) {
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

/** Dashes and arrow sequences that must never appear, written as escapes. */
export const FORBIDDEN: readonly string[] = [
  "\u2012", // figure dash
  "\u2013", // en dash
  "\u2014", // em dash
  "\u2015", // horizontal bar
  "\uFE58", // small em dash
  "\uFF0D", // fullwidth hyphen-minus
  "\u2192", // rightwards arrow
  "\u21D2", // rightwards double arrow
  "\u002D\u003E", // hyphen and greater-than
  "\u003D\u003E", // equals and greater-than
  "\u003C\u002D", // less-than and hyphen
];

/** Arrow blocks: arrows, dingbat arrows, long arrows, supplemental arrows and misc symbols arrows. */
const ARROW_CHARS = /[\u2190-\u21FF\u2794-\u27BF\u27F0-\u27FF\u2900-\u297F\u2B00-\u2B11\u2B30-\u2B4F\u2B60-\u2BAF]/gu;

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
  const reported = new Set<string>();
  for (const seq of FORBIDDEN) {
    if (texts.some((t) => t.includes(seq))) {
      reported.add(seq);
      out.push(err(n, "forbidden-char", `slide ${n} contains the forbidden character ${describeForbidden(seq)}`));
    }
  }
  for (const t of texts) {
    for (const m of t.matchAll(ARROW_CHARS)) {
      if (reported.has(m[0])) continue;
      reported.add(m[0]);
      out.push(err(n, "forbidden-char", `slide ${n} contains the forbidden character ${describeForbidden(m[0])}`));
    }
  }
  return out;
}

/**
 * A unit or magnitude written right after a number. It is part of the number:
 * 42 and 42% are different claims, and so are 5K and "5 mil". The boundary at the
 * end keeps "5 minutos" from being read as 5 "mi".
 */
const UNIT = String.raw`(?:%|x|\u00D7|k|K|M|B|milh(?:\u00E3o|\u00F5es)|bilh(?:\u00E3o|\u00F5es)|thousand|million|billion|mil|mi|bi)(?![\p{L}\p{N}])`;

/**
 * A number as written: optional sign, digits with . or , separators, optional unit.
 * A sign only counts when it is not glued to a letter or digit, so 2020-2021 is two
 * plain numbers and -3% is one signed number.
 */
const NUMBER_RE = new RegExp(
  String.raw`(?<![\p{L}\p{N}])(?<![\p{L}\p{N}][.,])[-+]?\d+(?:[.,]\d+)*(?:\s?${UNIT})?`,
  "giu",
);

/** Compatibility forms (full-width digits, no-break spaces) read as their plain equivalents. */
function normalizeText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/\u2212/gu, "-")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/gu, "");
}

/** Decimal digits other than 0-9 that survive normalization, such as Arabic-Indic digits. */
const FOREIGN_DIGIT = /(?![0-9])\p{Nd}/u;

/** The text fields whose numbers are claims. source and highlight are left out. */
function numberFields(slide: Record<string, unknown>): string[] {
  const texts: string[] = [];
  for (const key of ["text", "title", "value", "label", "author", "handle"]) {
    const v = ownProp(slide, key);
    if (typeof v === "string") texts.push(v);
  }
  const items = ownProp(slide, "items");
  if (Array.isArray(items)) for (const it of items) if (typeof it === "string") texts.push(it);
  return texts.map(normalizeText);
}

/** Distinct numbers in the checked text of a slide. */
function numbersIn(slide: Record<string, unknown>): string[] {
  const found = new Set<string>();
  for (const t of numberFields(slide)) for (const m of t.matchAll(NUMBER_RE)) found.add(m[0]);
  return [...found];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * True when the facts contain the number as a whole: not glued to more digits or to a
 * decimal part before or after, and with the same unit. 42% is not in "142%" or "42".
 */
function factsContain(facts: string, token: string): boolean {
  // A leading + is the same claim as no sign. A leading - must match a minus in the facts,
  // and a plain number must not be a negative one in the facts.
  const signed = token.startsWith("-");
  const body = token.startsWith("+") ? token.slice(1) : token;
  const before = signed ? "(?<!\\d|\\d[.,])" : "(?<!\\d|\\d[.,])(?<!(?<![\\p{L}\\p{N}])-)";
  const after = "(?![\\p{L}\\p{N}]|[.,]\\p{N}|\\s?" + UNIT + ")";
  const re = new RegExp(before + escapeRegExp(signed ? token : body) + after, "giu");
  return re.test(facts);
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
    if (numberFields(raw).some((t) => FOREIGN_DIGIT.test(t))) {
      findings.push(err(n, "non-ascii-digit", `slide ${n} has digits that are not 0-9, which cannot be compared with the facts file`));
    }
    const numbers = numbersIn(raw);
    if (numbers.length === 0) return;
    if (facts === undefined) {
      if (!skippedReported) {
        skippedReported = true;
        findings.push(warn(n, "facts-skipped", "numbers were not checked because no facts file was given"));
      }
      return;
    }
    const normalizedFacts = normalizeText(facts);
    for (const num of numbers) {
      if (!factsContain(normalizedFacts, num)) {
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
