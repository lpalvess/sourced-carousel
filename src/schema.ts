/** A validation finding. slide is 1-based, 0 means the deck as a whole. */
export interface Finding {
  severity: "error" | "warning";
  slide: number;
  rule: string;
  message: string;
}

/** Parsed JSON with the outer shape checked. Contents are still untrusted. */
export interface RawDeck {
  meta?: unknown;
  slides: unknown[];
}

/** True for plain JSON objects (not null, not arrays). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads an own property only, so inherited names such as constructor never leak in. */
export function ownProp(obj: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

function invalid(message: string): { findings: Finding[] } {
  return { findings: [{ severity: "error", slide: 0, rule: "schema-invalid", message }] };
}

/**
 * Parses slides.json text. Uses only JSON.parse and hand written type checks,
 * so nothing from the input is ever executed. JSON.parse creates keys such as
 * __proto__ as plain own properties, and the result is never merged or copied
 * into another object, so prototypes cannot be polluted.
 */
export function parseDeck(text: string): { deck: RawDeck } | { findings: Finding[] } {
  let data: unknown;
  try {
    // Editors on Windows often save a byte order mark, which JSON.parse rejects.
    data = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (err) {
    const detail = err instanceof Error ? err.message : "unknown parse error";
    return invalid(`$: not valid JSON (${detail})`);
  }
  if (!isRecord(data)) {
    return invalid("$: root must be an object");
  }
  const slides = ownProp(data, "slides");
  if (!Array.isArray(slides)) {
    return invalid("$.slides: must be a list");
  }
  const deck: RawDeck = { slides };
  if (Object.hasOwn(data, "meta")) {
    const meta = ownProp(data, "meta");
    if (!isRecord(meta)) {
      return invalid("$.meta: must be an object");
    }
    deck.meta = meta;
  }
  return { deck };
}
