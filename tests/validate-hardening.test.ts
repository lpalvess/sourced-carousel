import { describe, expect, test } from "bun:test";
import { parseDeck } from "../src/schema";
import { parseAndValidate, validate } from "../src/validate";
import type { RawDeck } from "../src/validate";

/** A clean deck, with one slide replaced by `slide`. */
function deckWith(slide: Record<string, unknown>, at = 1): RawDeck {
  const base: Record<string, unknown>[] = [
    { type: "hook", text: "Abertura" },
    { type: "text", title: "Titulo", text: "Corpo" },
    { type: "cta", text: "Fim", handle: "@x" },
  ];
  base[at] = slide;
  return { slides: base };
}

const errors = (deck: RawDeck, facts?: string) =>
  validate(deck, facts === undefined ? {} : { facts }).filter((f) => f.severity === "error");
const rulesOf = (deck: RawDeck, facts?: string) => errors(deck, facts).map((f) => f.rule);

describe("VAL-12 a number must match whole, as written", () => {
  test("42% does not match 142% in the facts", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Caiu 42%" }), "A alta foi de 142%")).toEqual(["number-not-in-facts"]);
  });

  test("30.000 does not match 130.000 or 30.0001", () => {
    const d = deckWith({ type: "text", title: "T", text: "Foram 30.000" });
    expect(rulesOf(d, "130.000")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(d, "30.0001")).toEqual(["number-not-in-facts"]);
  });

  test("5 does not match the decimal 1.5 or 1,5", () => {
    const d = deckWith({ type: "text", title: "T", text: "Nota 5" });
    expect(rulesOf(d, "nota 1.5")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(d, "nota 1,5")).toEqual(["number-not-in-facts"]);
  });

  test("a number at the end of a sentence still matches (42. and 42,)", () => {
    const d = deckWith({ type: "text", title: "T", text: "Foram 42" });
    expect(rulesOf(d, "Foram 42. Depois 7")).toEqual([]);
    expect(rulesOf(d, "42, 43 e 44")).toEqual([]);
  });

  test("the unit is part of the number: 42 does not match 42% and 42% does not match 42", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Foram 42" }), "42%")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Foram 42%" }), "42")).toEqual(["number-not-in-facts"]);
  });

  test("the sign is part of the number: -3% does not match 3%", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Variacao de -3%" }), "subiu 3%")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Variacao de -3%" }), "caiu -3%")).toEqual([]);
  });

  test("a range like 2020-2021 is two plain numbers, not 2020 and a signed 2021", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Entre 2020-2021" }), "de 2020-2021")).toEqual([]);
  });

  test("magnitude suffixes are part of the number: 5K does not match '5 mil' or 5", () => {
    const d = deckWith({ type: "text", title: "T", text: "Foram 5K" });
    expect(rulesOf(d, "foram 5 mil")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(d, "foram 5")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(d, "foram 5K")).toEqual([]);
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Foram 3.5B" }), "foram 3.5")).toEqual(["number-not-in-facts"]);
  });

  test("a suffix that is only the start of a word does not count (5 minutos is just 5)", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Em 5 minutos" }), "em 5 minutos")).toEqual([]);
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Em 5 minutos" }), "demorou 5")).toEqual([]);
  });

  test("full-width digits are read as numbers and compared normalized", () => {
    const d = deckWith({ type: "text", title: "T", text: "Foram \uFF14\uFF12" });
    expect(rulesOf(d, "nada")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(d, "foram 42")).toEqual([]);
  });

  test("a non breaking space inside a number does not let a different number through", () => {
    const d = deckWith({ type: "text", title: "T", text: "Foram 1\u00A0000" });
    const rules = rulesOf(d, "foram 1000");
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every((r) => r === "number-not-in-facts")).toBe(true);
    expect(rulesOf(d, "foram 1 000")).toEqual([]);
  });
});

describe("VAL-12 every visible field is checked", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["cta handle", { type: "cta", text: "Fim", handle: "@conta 77" }],
    ["cta text", { type: "cta", text: "Fim 77", handle: "@x" }],
    ["quote author", { type: "quote", text: "Frase", author: "Autor 77" }],
    ["quote text", { type: "quote", text: "Frase 77", author: "Autor" }],
    ["number label", { type: "number", value: "5", label: "de 77 casos" }],
    ["number value", { type: "number", value: "77", label: "casos" }],
    ["list item", { type: "list", title: "T", items: ["um", "dois 77"] }],
    ["list title", { type: "list", title: "T 77", items: ["um"] }],
    ["text title", { type: "text", title: "T 77", text: "Corpo" }],
    ["hook text", { type: "hook", text: "Gancho 77" }],
  ];
  for (const [name, slide] of cases) {
    test(`${name}: a number missing from the facts is reported`, () => {
      const deck = deckWith(slide, slide.type === "cta" ? 2 : slide.type === "hook" ? 0 : 1);
      const facts = slide.type === "number" && name === "number label" ? "5" : "nada aqui";
      expect(rulesOf(deck, facts)).toContain("number-not-in-facts");
    });
  }
});

describe("VAL-12 non ASCII digits that cannot be compared are rejected", () => {
  test("Arabic-Indic digits are an error", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Foram \u0664\u0662" }), "foram 42")).toContain("non-ascii-digit");
  });

  test("plain ASCII and full-width digits are not flagged by that rule", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "Foram 42 e \uFF14\uFF12" }), "42")).not.toContain("non-ascii-digit");
  });
});

describe("VAL-08 dashes and arrows beyond the first list", () => {
  const bad: [string, string][] = [
    ["U+2012 figure dash", "a \u2012 b"],
    ["U+2015 horizontal bar", "a \u2015 b"],
    ["U+FE58 small em dash", "a \uFE58 b"],
    ["U+FF0D fullwidth hyphen-minus", "a \uFF0D b"],
    ["U+2794 heavy arrow", "a \u2794 b"],
    ["U+27F6 long arrow", "a \u27F6 b"],
    ["U+2B62 arrow", "a \u2B62 b"],
    ["U+2190 left arrow", "a \u2190 b"],
    ["=> sequence", "a => b"],
    ["<- sequence", "a <- b"],
  ];
  for (const [name, text] of bad) {
    test(`${name} is rejected`, () => {
      expect(rulesOf(deckWith({ type: "text", title: "T", text }))).toContain("forbidden-char");
    });
  }

  test("a plain hyphen, a hyphen between words and a minus sign are allowed", () => {
    expect(rulesOf(deckWith({ type: "text", title: "T", text: "guarda-chuva e \u22123 graus - ok" }))).toEqual([]);
  });
});

describe("blank detection", () => {
  test("a list item with only a zero width space counts as blank", () => {
    expect(rulesOf(deckWith({ type: "list", title: "T", items: ["ok", "\u200B"] }))).toContain("field-missing");
  });

  test("a title with only a zero width space counts as missing", () => {
    expect(rulesOf(deckWith({ type: "text", title: "\u200B\uFEFF", text: "Corpo" }))).toContain("field-missing");
  });
});

describe("VAL-07 the highlight must be in text that is actually drawn", () => {
  test("a highlight that only exists in the quote author is rejected", () => {
    expect(rulesOf(deckWith({ type: "quote", text: "Frase", author: "Maria", highlight: "Maria" }))).toEqual(["highlight-invalid"]);
  });

  test("a highlight that only exists in the cta handle is rejected", () => {
    expect(rulesOf(deckWith({ type: "cta", text: "Fim", handle: "@maria", highlight: "@maria" }), undefined)).toContain("highlight-invalid");
  });

  test("a highlight in the quote text, a number label and a list item is accepted", () => {
    expect(rulesOf(deckWith({ type: "quote", text: "Frase boa", author: "A", highlight: "boa" }))).toEqual([]);
    expect(rulesOf(deckWith({ type: "number", value: "5", label: "casos graves", highlight: "graves" }), "5")).toEqual([]);
    expect(rulesOf(deckWith({ type: "list", title: "T", items: ["alfa", "beta"], highlight: "beta" }))).toEqual([]);
  });
});

describe("schema: a JSON byte order mark is tolerated", () => {
  test("a leading BOM does not make a valid file invalid", () => {
    const text = `\uFEFF${JSON.stringify({ slides: [{ type: "hook", text: "a" }] })}`;
    expect("deck" in parseDeck(text)).toBe(true);
  });
});

describe("findings come back ordered by slide", () => {
  test("slide numbers never decrease", () => {
    const deck: RawDeck = {
      slides: [
        { type: "hook", text: "a -> b" },
        { type: "text", title: "T", text: "tem 99 aqui" },
        { type: "text", title: "T", text: "tem 98 aqui e -> tambem" },
        { type: "cta", text: "Fim", handle: "@x" },
      ],
    };
    const slideNumbers = validate(deck, { facts: "nada" }).map((f) => f.slide);
    expect(slideNumbers).toEqual([...slideNumbers].sort((a, b) => a - b));
    expect(slideNumbers.length).toBeGreaterThan(2);
  });
});

describe("parseAndValidate only returns a deck when there is no error", () => {
  test("a deck with a number outside the facts returns no deck", () => {
    const text = JSON.stringify(deckWith({ type: "text", title: "T", text: "Foram 42%" }));
    expect(parseAndValidate(text, "142%").deck).toBeUndefined();
    expect(parseAndValidate(text, "42%").deck).toBeDefined();
  });
});

describe("round 2 findings: units, signs, versions and capitals", () => {
  const with_ = (text: string) => deckWith({ type: "text", title: "T", text });

  test("a unit that is the start of a longer word is a different unit", () => {
    expect(rulesOf(with_("Ganho de 10 mi"), "Ganho de 10 mil")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(with_("Levou 10 mi"), "Levou 10 minutos")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(with_("Peso 5 k"), "Peso 5 kg")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(with_("Ganho de 10 mil"), "Ganho de 10 mil")).toEqual([]);
  });

  test("a minus sign in the facts does not match a plain number on the slide", () => {
    expect(rulesOf(with_("Caiu 5%"), "caiu -5%")).toEqual(["number-not-in-facts"]);
    expect(rulesOf(with_("Caiu -5%"), "caiu -5%")).toEqual([]);
    expect(rulesOf(with_("Caiu -5%"), "subiu 5%")).toEqual(["number-not-in-facts"]);
  });

  test("a plus sign on the slide is the same claim as a plain number", () => {
    expect(rulesOf(with_("Subiu +5%"), "subiu 5%")).toEqual([]);
  });

  test("a version string is not a number, so it is not checked", () => {
    expect(rulesOf(with_("Versão v3.0 e v2.1.3"), "versão v3.0 e v2.1.3")).toEqual([]);
  });

  test("a capitalized unit matches the same unit in lower case in the facts", () => {
    expect(rulesOf(with_("Cerca de 4 Milhões de pessoas"), "4 milhões de pessoas")).toEqual([]);
    expect(rulesOf(with_("Cerca de 4 Milhões de pessoas"), "4 mil pessoas")).toEqual(["number-not-in-facts"]);
  });
});
