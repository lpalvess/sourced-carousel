/**
 * Minimal deterministic PDF 1.4 writer: one full-page RGB image per page.
 * No /Info, no dates, no /ID, so the same input always yields the same bytes.
 * 1 pixel = 1 point.
 */
import { deflateSync } from "node:zlib";

export interface PdfPage {
  width: number;
  height: number;
  /** RGBA pixels, 4 bytes per pixel, length must be width * height * 4. */
  rgba: Uint8Array;
}

/** Drops the alpha channel by compositing over white. */
function rgbaToRgbOverWhite(rgba: Uint8Array, pixels: number): Uint8Array {
  const rgb = new Uint8Array(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    const a = rgba[i * 4 + 3] ?? 255;
    for (let c = 0; c < 3; c++) {
      const v = rgba[i * 4 + c] ?? 0;
      // Integer math with round-half-up keeps the result deterministic.
      rgb[i * 3 + c] = Math.floor((v * a + 255 * (255 - a) + 127) / 255);
    }
  }
  return rgb;
}

function checkPage(page: PdfPage, index: number): void {
  const { width, height, rgba } = page;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error(`pdf: page ${index + 1} has invalid dimensions ${width}x${height}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new Error(
      `pdf: page ${index + 1} has ${rgba.length} bytes, expected ${width * height * 4} (${width}x${height} RGBA)`,
    );
  }
}

export function buildPdf(pages: readonly PdfPage[]): Uint8Array {
  if (pages.length === 0) throw new Error("pdf: at least one page is required");
  pages.forEach(checkPage);

  const chunks: Uint8Array[] = [];
  const offsets: number[] = []; // offsets[n - 1] is the byte offset of object n
  let length = 0;
  const push = (data: Uint8Array | string): void => {
    const bytes = typeof data === "string" ? Buffer.from(data, "latin1") : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, dict: string, stream?: Uint8Array): void => {
    offsets[n - 1] = length;
    if (stream === undefined) {
      push(`${n} 0 obj\n${dict}\nendobj\n`);
    } else {
      push(`${n} 0 obj\n${dict}\nstream\n`);
      push(stream);
      push("\nendstream\nendobj\n");
    }
  };

  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const kids = pages.map((_, i) => `${3 + 3 * i} 0 R`).join(" ");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);

  pages.forEach((page, i) => {
    const pageNum = 3 + 3 * i;
    const { width, height } = page;
    object(
      pageNum,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
        `/Resources << /XObject << /Im0 ${pageNum + 2} 0 R >> >> /Contents ${pageNum + 1} 0 R >>`,
    );
    const content = Buffer.from(`q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`, "latin1");
    object(pageNum + 1, `<< /Length ${content.length} >>`, content);
    const data = deflateSync(rgbaToRgbOverWhite(page.rgba, width * height), { level: 9 });
    object(
      pageNum + 2,
      `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${data.length} >>`,
      data,
    );
  });

  const count = offsets.length + 1;
  const xrefOffset = length;
  let xref = `xref\n0 ${count}\n0000000000 65535 f \n`;
  for (const off of offsets) xref += `${String(off).padStart(10, "0")} 00000 n \n`;
  push(xref);
  push(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const out = new Uint8Array(length);
  let pos = 0;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  return out;
}
