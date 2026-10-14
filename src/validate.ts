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

/** Runs every rule over a parsed deck. Findings come back ordered by slide. */
export function validate(deck: RawDeck, opts?: { facts?: string }): Finding[] {
  void opts;
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
      return;
    }
    types.push(type);
    findings.push(...checkRequired(n, raw, type));
  });

  if (count > 0) {
    if (types[0] !== "hook") {
      findings.push(warn(1, "structure", "the first slide should be a hook"));
    }
    if (types[count - 1] !== "cta") {
      findings.push(warn(count, "structure", "the last slide should be a cta"));
    }
  }

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
