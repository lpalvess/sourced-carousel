import { describe, expect, test } from "bun:test";
import { parseDeck } from "../src/schema";

function findings(text: string) {
  const r = parseDeck(text);
  if (!("findings" in r)) throw new Error("expected findings");
  return r.findings;
}

describe("parseDeck (VAL-02)", () => {
  test("accepts a minimal deck", () => {
    const r = parseDeck('{"slides":[]}');
    expect("deck" in r).toBe(true);
    if ("deck" in r) expect(r.deck.slides).toEqual([]);
  });

  test("accepts meta as an object and ignores unknown meta fields", () => {
    const r = parseDeck('{"meta":{"theme":"dark","whatever":1},"slides":[]}');
    expect("deck" in r).toBe(true);
  });

  test("invalid JSON gives schema-invalid at slide 0 with the root path", () => {
    const f = findings("{not json");
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ severity: "error", slide: 0, rule: "schema-invalid" });
    expect(f[0]?.message).toContain("$");
  });

  test("empty input is invalid JSON", () => {
    expect(findings("")[0]?.rule).toBe("schema-invalid");
  });

  for (const root of ["[]", "null", "42", '"text"', "true"]) {
    test(`root ${root} is not an object`, () => {
      const f = findings(root);
      expect(f[0]).toMatchObject({ severity: "error", slide: 0, rule: "schema-invalid" });
      expect(f[0]?.message).toContain("root");
    });
  }

  test("missing slides names the field path", () => {
    const f = findings("{}");
    expect(f[0]?.rule).toBe("schema-invalid");
    expect(f[0]?.message).toContain("slides");
  });

  for (const slides of ['"x"', "{}", "null", "3"]) {
    test(`slides = ${slides} is not a list`, () => {
      const f = findings(`{"slides":${slides}}`);
      expect(f[0]?.rule).toBe("schema-invalid");
      expect(f[0]?.message).toContain("slides");
    });
  }

  for (const meta of ["[]", '"x"', "null", "7"]) {
    test(`meta = ${meta} is not an object`, () => {
      const f = findings(`{"meta":${meta},"slides":[]}`);
      expect(f[0]?.rule).toBe("schema-invalid");
      expect(f[0]?.message).toContain("meta");
    });
  }
});

describe("prototype safety (VAL-14)", () => {
  test("__proto__ key in the input does not pollute Object.prototype", () => {
    const r = parseDeck('{"__proto__":{"polluted":"yes"},"slides":[{"__proto__":{"polluted2":"yes"}}]}');
    expect("deck" in r).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted2).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
  });

  test("constructor.prototype payload does not pollute anything", () => {
    parseDeck('{"constructor":{"prototype":{"polluted3":"yes"}},"slides":[]}');
    expect(({} as Record<string, unknown>).polluted3).toBeUndefined();
    expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted3")).toBe(false);
  });

  test("a root with only a constructor key still fails on slides", () => {
    const f = findings('{"constructor":{"slides":[]}}');
    expect(f[0]?.rule).toBe("schema-invalid");
  });

  test("slides coming from the prototype chain are not accepted", () => {
    const f = findings('{"__proto__":{"slides":[]}}');
    expect(f[0]?.rule).toBe("schema-invalid");
  });
});
