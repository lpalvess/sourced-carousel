import { describe, expect, test } from "bun:test";
import { inflateSync } from "node:zlib";
import { buildPdf, type PdfPage } from "../src/pdf";

function solid(width: number, height: number, rgba: [number, number, number, number]): PdfPage {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set(rgba, i * 4);
  return { width, height, rgba: data };
}

const pages = [solid(4, 4, [255, 0, 0, 255]), solid(8, 6, [0, 0, 255, 255])];
const latin1 = (b: Uint8Array): string => Buffer.from(b).toString("latin1");

describe("buildPdf", () => {
  const pdf = buildPdf(pages);
  const text = latin1(pdf);

  test("header and trailer markers", () => {
    expect(text.startsWith("%PDF-1.4\n")).toBe(true);
    expect(text.split("\n")[1]?.charCodeAt(1)).toBeGreaterThan(127);
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });

  test("Pages /Count equals N and there are N Page objects", () => {
    expect(text).toContain(`/Count ${pages.length}`);
    expect(text.match(/\/Type \/Page(?![s\w])/g)?.length).toBe(pages.length);
  });

  test("MediaBox matches width and height", () => {
    expect(text).toContain("/MediaBox [0 0 4 4]");
    expect(text).toContain("/MediaBox [0 0 8 6]");
  });

  test("no Info, dates or ID", () => {
    expect(text).not.toContain("/Info");
    expect(text).not.toContain("/CreationDate");
    expect(text).not.toContain("/ID");
  });

  test("startxref points to the xref keyword", () => {
    const m = /startxref\n(\d+)\n%%EOF/.exec(text);
    expect(m).not.toBeNull();
    const off = Number(m?.[1]);
    expect(text.slice(off, off + 5)).toBe("xref\n");
  });

  test("every xref entry points to the start of 'N 0 obj'", () => {
    const xrefAt = Number(/startxref\n(\d+)/.exec(text)?.[1]);
    const lines = text.slice(xrefAt).split("\n");
    expect(lines[0]).toBe("xref");
    const [first, count] = (lines[1] ?? "").split(" ").map(Number);
    expect(first).toBe(0);
    expect(count).toBe(1 + 3 * pages.length + 2);
    expect(text).toContain(`/Size ${count}`);
    expect(lines[2]).toBe("0000000000 65535 f ");
    for (let n = 1; n < (count ?? 0); n++) {
      const entry = lines[2 + n] ?? "";
      expect(entry).toMatch(/^\d{10} 00000 n $/);
      const off = Number(entry.slice(0, 10));
      expect(text.slice(off, off + `${n} 0 obj`.length)).toBe(`${n} 0 obj`);
    }
  });

  test("content stream draws the image at page size", () => {
    expect(text).toContain("q 4 0 0 4 0 0 cm /Im0 Do Q");
    expect(text).toContain("q 8 0 0 6 0 0 cm /Im0 Do Q");
  });

  function imageStreams(): Uint8Array[] {
    const out: Uint8Array[] = [];
    const re = /\/Subtype \/Image[^>]*\/Length (\d+) >>\nstream\n/g;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const start = m.index + m[0].length;
      out.push(inflateSync(pdf.subarray(start, start + Number(m[1]))));
    }
    return out;
  }

  test("image streams inflate to exactly width*height*3 bytes", () => {
    const streams = imageStreams();
    expect(streams.length).toBe(2);
    expect(streams[0]?.length).toBe(4 * 4 * 3);
    expect(streams[1]?.length).toBe(8 * 6 * 3);
    expect(Array.from(streams[0]?.subarray(0, 3) ?? [])).toEqual([255, 0, 0]);
    expect(text).toContain("/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode");
  });

  test("alpha is composited over white", () => {
    const px = new Uint8Array([10, 20, 30, 0, 10, 20, 30, 255, 0, 0, 0, 128, 255, 255, 255, 128]);
    const out = buildPdf([{ width: 4, height: 1, rgba: px }]);
    const t = latin1(out);
    const m = /\/Subtype \/Image[^>]*\/Length (\d+) >>\nstream\n/.exec(t);
    const start = (m?.index ?? 0) + (m?.[0].length ?? 0);
    const rgb = [...inflateSync(out.subarray(start, start + Number(m?.[1])))];
    expect(rgb.slice(0, 3)).toEqual([255, 255, 255]);
    expect(rgb.slice(3, 6)).toEqual([10, 20, 30]);
    expect(rgb.slice(6, 9)).toEqual([127, 127, 127]);
    expect(rgb.slice(9, 12)).toEqual([255, 255, 255]);
  });

  test("same input gives identical bytes", () => {
    expect(Buffer.from(buildPdf(pages)).equals(Buffer.from(buildPdf(pages)))).toBe(true);
  });
});

describe("buildPdf errors", () => {
  test("mismatched rgba length throws", () => {
    expect(() => buildPdf([{ width: 4, height: 4, rgba: new Uint8Array(10) }])).toThrow(/expected 64/);
  });
  test("invalid dimensions throw", () => {
    expect(() => buildPdf([{ width: 0, height: 4, rgba: new Uint8Array(0) }])).toThrow(/dimensions/);
  });
  test("zero pages throws", () => {
    expect(() => buildPdf([])).toThrow(/at least one page/);
  });
});
