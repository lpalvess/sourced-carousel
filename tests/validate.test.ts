import { describe, expect, test } from "bun:test";
import { parseAndValidate, validate, type Finding, type RawDeck } from "../src/validate";

type S = Record<string, unknown>;

const hook = (extra: S = {}): S => ({ type: "hook", text: "Why decks fail", ...extra });
const text = (extra: S = {}): S => ({ type: "text", title: "The idea", text: "A short body", ...extra });
const num = (extra: S = {}): S => ({ type: "number", value: "200x", label: "faster", ...extra });
const list = (extra: S = {}): S => ({ type: "list", title: "Steps", items: ["one", "two"], ...extra });
const quote = (extra: S = {}): S => ({ type: "quote", text: "Say less", author: "Someone", ...extra });
const cta = (extra: S = {}): S => ({ type: "cta", text: "Follow for more", handle: "@someone", ...extra });

const deck = (slides: unknown[], meta?: unknown): RawDeck =>
  meta === undefined ? { slides } : { meta, slides };

/** A clean 3 slide deck: hook, text, cta. No numbers anywhere. */
const base = (): S[] => [hook(), text(), cta()];

const errors = (f: Finding[]) => f.filter((x) => x.severity === "error");
const rules = (f: Finding[]) => f.map((x) => x.rule);
const byRule = (f: Finding[], rule: string) => f.filter((x) => x.rule === rule);

describe("baseline", () => {
  test("a clean deck has no findings", () => {
    expect(validate(deck(base()))).toEqual([]);
  });

  test("a deck using all six types is clean", () => {
    expect(validate(deck([hook(), text(), num({ value: "x", label: "y" }), list(), quote(), cta()]))).toEqual([]);
  });
});

describe("field-missing (VAL-04)", () => {
  const cases: [string, S, string][] = [
    ["hook", { type: "hook" }, "text"],
    ["text without title", { type: "text", text: "body" }, "title"],
    ["text without text", { type: "text", title: "t" }, "text"],
    ["number without value", { type: "number", label: "l" }, "value"],
    ["number without label", { type: "number", value: "v" }, "label"],
    ["list without title", { type: "list", items: ["a"] }, "title"],
    ["list without items", { type: "list", title: "t" }, "items"],
    ["quote without text", { type: "quote", author: "a" }, "text"],
    ["quote without author", { type: "quote", text: "t" }, "author"],
    ["cta without text", { type: "cta", handle: "@h" }, "text"],
    ["cta without handle", { type: "cta", text: "t" }, "handle"],
  ];
  for (const [name, slide, field] of cases) {
    test(`${name} reports field-missing naming "${field}"`, () => {
      const f = byRule(validate(deck([hook(), slide, cta()])), "field-missing");
      expect(f).toHaveLength(1);
      expect(f[0]).toMatchObject({ severity: "error", slide: 2 });
      expect(f[0]?.message).toContain(`"${field}"`);
    });
  }

  test("each of the six types is covered with an empty slide", () => {
    for (const type of ["hook", "text", "number", "list", "quote", "cta"]) {
      const f = validate(deck([hook(), { type }, cta()]));
      expect(byRule(f, "field-missing").length).toBeGreaterThan(0);
    }
  });

  test("an empty string counts as missing", () => {
    expect(byRule(validate(deck([hook({ text: "" }), text(), cta()])), "field-missing")).toHaveLength(1);
  });

  test("a whitespace only string counts as missing", () => {
    expect(byRule(validate(deck([hook({ text: " \n\t " }), text(), cta()])), "field-missing")).toHaveLength(1);
  });

  test("a non-string required field counts as missing", () => {
    expect(byRule(validate(deck([hook({ text: 5 }), text(), cta()])), "field-missing")).toHaveLength(1);
  });

  test("list with an empty items array is missing", () => {
    expect(byRule(validate(deck([hook(), list({ items: [] }), cta()])), "field-missing")).toHaveLength(1);
  });

  test("list with 1 item passes, with 6 passes, with 7 fails", () => {
    for (const n of [1, 6]) {
      const items = Array.from({ length: n }, (_, i) => `item ${i}`);
      expect(byRule(validate(deck([hook(), list({ items }), cta()])), "field-missing")).toHaveLength(0);
    }
    const seven = Array.from({ length: 7 }, (_, i) => `item ${i}`);
    expect(byRule(validate(deck([hook(), list({ items: seven }), cta()])), "field-missing")).toHaveLength(1);
  });

  test("list items must be non-empty strings", () => {
    for (const items of [[""], ["ok", "  "], ["ok", 3], "not a list"]) {
      expect(byRule(validate(deck([hook(), list({ items }), cta()])), "field-missing")).toHaveLength(1);
    }
  });

  test("two missing fields give two findings on the same slide", () => {
    const f = byRule(validate(deck([hook(), { type: "text" }, cta()])), "field-missing");
    expect(f).toHaveLength(2);
    expect(f.every((x) => x.slide === 2)).toBe(true);
  });
});

describe("type-unknown", () => {
  test("a type outside the six is an error on that slide", () => {
    const f = byRule(validate(deck([hook(), { type: "video", text: "x" }, cta()])), "type-unknown");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", slide: 2 });
    expect(f[0]?.message).toContain("video");
  });

  test("a missing type is type-unknown", () => {
    expect(byRule(validate(deck([hook(), { text: "x" }, cta()])), "type-unknown")).toHaveLength(1);
  });

  test("a non-string type is type-unknown", () => {
    expect(byRule(validate(deck([hook(), { type: 3 }, cta()])), "type-unknown")).toHaveLength(1);
  });

  test("a slide that is not an object is type-unknown", () => {
    for (const bad of [null, 5, "hook", [1]]) {
      expect(byRule(validate(deck([hook(), bad, cta()])), "type-unknown")).toHaveLength(1);
    }
  });

  test("type names are case sensitive", () => {
    expect(byRule(validate(deck([hook(), { type: "Text", title: "a", text: "b" }, cta()])), "type-unknown")).toHaveLength(1);
  });

  test("an inherited name such as constructor is not a known type", () => {
    expect(byRule(validate(deck([hook(), { type: "constructor" }, cta()])), "type-unknown")).toHaveLength(1);
  });
});

describe("slide-count (VAL-09)", () => {
  const make = (n: number): S[] => {
    const middle = Array.from({ length: Math.max(0, n - 2) }, () => text());
    return n >= 2 ? [hook(), ...middle, cta()] : n === 1 ? [hook()] : [];
  };

  test("2 slides fail with slide 0", () => {
    const f = byRule(validate(deck(make(2))), "slide-count");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", slide: 0 });
  });

  test("3 slides pass", () => {
    expect(byRule(validate(deck(make(3))), "slide-count")).toHaveLength(0);
  });

  test("10 slides pass", () => {
    expect(byRule(validate(deck(make(10))), "slide-count")).toHaveLength(0);
  });

  test("11 slides fail", () => {
    expect(byRule(validate(deck(make(11))), "slide-count")).toHaveLength(1);
  });

  test("0 and 1 slides fail", () => {
    expect(byRule(validate(deck(make(0))), "slide-count")).toHaveLength(1);
    expect(byRule(validate(deck(make(1))), "slide-count")).toHaveLength(1);
  });
});

describe("structure warning (VAL-10)", () => {
  test("first slide not a hook warns on slide 1", () => {
    const f = byRule(validate(deck([text(), text(), cta()])), "structure");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "warning", slide: 1 });
  });

  test("last slide not a cta warns on slide N", () => {
    const f = byRule(validate(deck([hook(), text(), text()])), "structure");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "warning", slide: 3 });
  });

  test("both wrong gives two warnings", () => {
    const f = byRule(validate(deck([text(), text(), text()])), "structure");
    expect(f.map((x) => x.slide)).toEqual([1, 3]);
  });

  test("structure alone produces no error, so parseAndValidate still returns the deck", () => {
    const r = parseAndValidate(JSON.stringify(deck([text(), text(), text()])));
    expect(errors(r.findings)).toHaveLength(0);
    expect(r.deck).toBeDefined();
  });

  test("a hook first and a cta last gives no structure warning", () => {
    expect(byRule(validate(deck(base())), "structure")).toHaveLength(0);
  });
});

describe("meta values", () => {
  test("valid meta passes", () => {
    expect(validate(deck(base(), { theme: "light", accent: "#aabbcc", format: "linkedin-portrait" }))).toEqual([]);
  });

  test("unknown meta fields are ignored", () => {
    expect(validate(deck(base(), { extra: 1 }))).toEqual([]);
  });

  test("bad theme, accent and format are schema-invalid", () => {
    const f = byRule(validate(deck(base(), { theme: "blue", accent: "red", format: "a4" })), "schema-invalid");
    expect(f).toHaveLength(3);
    expect(f.every((x) => x.severity === "error" && x.slide === 0)).toBe(true);
  });
});

describe("parseAndValidate", () => {
  test("returns the typed deck when clean", () => {
    const r = parseAndValidate(JSON.stringify(deck(base())));
    expect(r.findings).toEqual([]);
    expect(r.deck?.slides).toHaveLength(3);
  });

  test("withholds the deck when there is an error", () => {
    const r = parseAndValidate(JSON.stringify(deck([hook(), text()])));
    expect(rules(r.findings)).toContain("slide-count");
    expect(r.deck).toBeUndefined();
  });

  test("schema failures come back as findings without a deck", () => {
    const r = parseAndValidate("nope");
    expect(r.findings[0]?.rule).toBe("schema-invalid");
    expect(r.deck).toBeUndefined();
  });
});

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${String.fromCharCode(97 + (i % 26))}`).join(" ");
const mid = (slide: S) => deck([hook(), slide, cta()]);

describe("too-many-words (VAL-05)", () => {
  test("40 words pass", () => {
    expect(byRule(validate(mid(text({ text: words(40) }))), "too-many-words")).toHaveLength(0);
  });

  test("41 words fail on that slide", () => {
    const f = byRule(validate(mid(text({ text: words(41) }))), "too-many-words");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", slide: 2 });
  });

  test("words are separated by any whitespace, including newlines and tabs", () => {
    const t = Array.from({ length: 41 }, () => "a").join("\n\t ");
    expect(byRule(validate(mid(text({ text: t }))), "too-many-words")).toHaveLength(1);
  });

  test("extra spaces and edges do not add words", () => {
    const t = `  ${words(40).split(" ").join("   ")}  \n`;
    expect(byRule(validate(mid(text({ text: t }))), "too-many-words")).toHaveLength(0);
  });

  test("the limit applies to text slides only", () => {
    expect(byRule(validate(mid(quote({ text: words(60) }))), "too-many-words")).toHaveLength(0);
  });
});

describe("hook-too-long (VAL-06)", () => {
  test("3 lines pass", () => {
    expect(byRule(validate(deck([hook({ text: "a\nb\nc" }), text(), cta()])), "hook-too-long")).toHaveLength(0);
  });

  test("4 lines fail on slide 1", () => {
    const f = byRule(validate(deck([hook({ text: "a\nb\nc\nd" }), text(), cta()])), "hook-too-long");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", slide: 1 });
  });

  test("a trailing line break does not count", () => {
    expect(byRule(validate(deck([hook({ text: "a\nb\nc\n" }), text(), cta()])), "hook-too-long")).toHaveLength(0);
  });

  test("CRLF line breaks are counted as one break each", () => {
    expect(byRule(validate(deck([hook({ text: "a\r\nb\r\nc" }), text(), cta()])), "hook-too-long")).toHaveLength(0);
    expect(byRule(validate(deck([hook({ text: "a\r\nb\r\nc\r\nd" }), text(), cta()])), "hook-too-long")).toHaveLength(1);
  });

  test("the limit applies to hooks only", () => {
    expect(byRule(validate(mid(text({ text: "a\nb\nc\nd\ne" }))), "hook-too-long")).toHaveLength(0);
  });
});

describe("highlight-invalid (VAL-07)", () => {
  test("1 and 2 words present in the text pass", () => {
    expect(byRule(validate(mid(text({ text: "alpha beta gamma", highlight: "alpha" }))), "highlight-invalid")).toHaveLength(0);
    expect(byRule(validate(mid(text({ text: "alpha beta gamma", highlight: "alpha beta" }))), "highlight-invalid")).toHaveLength(0);
  });

  test("3 words fail even when present", () => {
    const f = byRule(validate(mid(text({ text: "alpha beta gamma", highlight: "alpha beta gamma" }))), "highlight-invalid");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", slide: 2 });
  });

  test("a highlight that is not in the slide fails", () => {
    expect(byRule(validate(mid(text({ highlight: "absent" }))), "highlight-invalid")).toHaveLength(1);
  });

  test("a highlight found in the title passes", () => {
    expect(byRule(validate(mid(text({ title: "Big claim", highlight: "claim" }))), "highlight-invalid")).toHaveLength(0);
  });

  test("works on hook, number, list and quote slides", () => {
    expect(byRule(validate(deck([hook({ text: "Hello world", highlight: "world" }), text(), cta()])), "highlight-invalid")).toHaveLength(0);
    expect(byRule(validate(deck([hook({ text: "Hello world", highlight: "nope" }), text(), cta()])), "highlight-invalid")).toHaveLength(1);
    expect(byRule(validate(mid(num({ label: "times faster", highlight: "faster" }))), "highlight-invalid")).toHaveLength(0);
    expect(byRule(validate(mid(list({ items: ["red apple", "green pear"], highlight: "pear" }))), "highlight-invalid")).toHaveLength(0);
    expect(byRule(validate(mid(quote({ text: "Say less", highlight: "less" }))), "highlight-invalid")).toHaveLength(0);
  });

  test("an empty highlight is invalid", () => {
    expect(byRule(validate(mid(text({ highlight: "" }))), "highlight-invalid")).toHaveLength(1);
  });

  test("a non-string highlight is a schema error", () => {
    expect(byRule(validate(mid(text({ highlight: 5 }))), "schema-invalid")).toHaveLength(1);
  });
});

describe("source-too-long (VAL-11)", () => {
  test("80 characters pass", () => {
    expect(byRule(validate(mid(text({ source: "a".repeat(80) }))), "source-too-long")).toHaveLength(0);
  });

  test("81 characters fail on that slide", () => {
    const f = byRule(validate(mid(text({ source: "a".repeat(81) }))), "source-too-long");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", slide: 2 });
  });

  test("80 emoji pass (code points, not UTF-16 units)", () => {
    const s = "\u{1F600}".repeat(80);
    expect(s.length).toBe(160);
    expect(byRule(validate(mid(text({ source: s }))), "source-too-long")).toHaveLength(0);
  });

  test("81 emoji fail", () => {
    expect(byRule(validate(mid(text({ source: "\u{1F600}".repeat(81) }))), "source-too-long")).toHaveLength(1);
  });

  test("a non-string source is a schema error", () => {
    expect(byRule(validate(mid(text({ source: 5 }))), "schema-invalid")).toHaveLength(1);
  });
});
