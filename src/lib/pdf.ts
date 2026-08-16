/**
 * Minimal PDF writer for paginated tables.
 *
 * Uses the two standard fonts every reader has built in (Helvetica and
 * Helvetica-Bold), so nothing has to be embedded and the file stays a few KB.
 * Deliberately narrow: text, lines and rectangles are all this draws.
 */

import type { DocumentModel } from './docModel';

export interface PdfTableColumn {
  header: string;
  /** Share of the printable width, relative to the other columns. */
  weight: number;
  align?: 'left' | 'center';
}

export interface PdfTableOptions {
  title: string;
  subtitle?: string;
  columns: PdfTableColumn[];
  rows: string[][];
  /** Landscape Letter by default, matching the printed inventory sheet. */
  landscape?: boolean;
}

const FONT = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

// Advance widths for Helvetica, in 1/1000 em, indexed by char code from 32.
// Close enough to wrap and truncate text without embedding real font metrics.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

function charWidth(code: number, bold: boolean): number {
  const w = code >= 32 && code - 32 < HELVETICA_WIDTHS.length ? HELVETICA_WIDTHS[code - 32] : 556;
  // Bold Helvetica runs a little wider; a flat factor is plenty for layout.
  return bold ? w * 1.06 : w;
}

function textWidth(text: string, size: number, bold: boolean): number {
  let total = 0;
  for (let i = 0; i < text.length; i++) total += charWidth(text.charCodeAt(i), bold);
  return (total / 1000) * size;
}

/**
 * Typographic characters that a phone keyboard produces freely but the base
 * Helvetica encoding has no glyph for. Mapped rather than dropped — silently
 * deleting an em dash leaves "delicate  do not tape" with a gap in it.
 */
const TRANSLITERATE: [RegExp, string][] = [
  [/[\u2018\u2019\u201A\u2039\u203A]/g, "'"],
  [/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"'],
  [/[\u2013\u2014\u2212]/g, '-'],
  [/[\u2026]/g, '...'],
  [/[\u00A0\u2007\u202F]/g, ' '],
  [/[\u2022]/g, '*'],
  [/[\u00B7]/g, '-'],
  [/[\u2122]/g, '(TM)'],
  [/[\u00D7]/g, 'x'],
];

/** PDF text strings escape backslash and both parens; drop what WinAnsi can't show. */
function pdfString(text: string): string {
  let out = text;
  for (const [pattern, replacement] of TRANSLITERATE) out = out.replace(pattern, replacement);
  return out
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/** Break text to fit a column, hard-truncating a final overlong line. */
function wrap(text: string, width: number, size: number, bold: boolean, maxLines: number): string[] {
  if (!text) return [''];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (textWidth(candidate, size, bold) <= width || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);

  return lines.slice(0, maxLines).map((l, i) => {
    const isLast = i === Math.min(lines.length, maxLines) - 1;
    const overflowed = isLast && lines.length >= maxLines && textWidth(l, size, bold) > width;
    if (!overflowed && textWidth(l, size, bold) <= width) return l;
    let cut = l;
    // '...' rather than '…': the ellipsis has no Helvetica glyph and is
    // transliterated on the way out, so measuring the single char would
    // under-price what actually gets drawn.
    while (cut.length > 1 && textWidth(`${cut}...`, size, bold) > width) cut = cut.slice(0, -1);
    return `${cut}...`;
  });
}

export function buildTablePdf(options: PdfTableOptions): Blob {
  const landscape = options.landscape ?? true;
  const pageW = landscape ? 792 : 612;
  const pageH = landscape ? 612 : 792;
  const margin = 36;
  const printable = pageW - margin * 2;

  const fontSize = 8.5;
  const headerSize = 8.5;
  const lineHeight = 10;
  const cellPad = 4;
  const maxLinesPerCell = 3;

  const totalWeight = options.columns.reduce((n, c) => n + c.weight, 0);
  const widths = options.columns.map((c) => (c.weight / totalWeight) * printable);
  const xs: number[] = [];
  let x = margin;
  for (const w of widths) {
    xs.push(x);
    x += w;
  }

  // Lay the rows out first so we know where the page breaks fall.
  const laidOut = options.rows.map((row) =>
    row.map((value, i) =>
      wrap(String(value ?? ''), widths[i] - cellPad * 2, fontSize, false, maxLinesPerCell)
    )
  );
  const rowHeights = laidOut.map((cells) => {
    const lines = Math.max(...cells.map((c) => c.length), 1);
    return lines * lineHeight + cellPad * 2;
  });

  const titleBlock = options.subtitle ? 44 : 30;
  const headerRowHeight = headerSize + cellPad * 2;
  const bottomLimit = margin + 16; // leaves room for the page footer

  interface Page { start: number; end: number }
  const pages: Page[] = [];
  {
    let i = 0;
    while (i < laidOut.length) {
      let y = pageH - margin - titleBlock - headerRowHeight;
      const start = i;
      while (i < laidOut.length && y - rowHeights[i] >= bottomLimit) {
        y -= rowHeights[i];
        i++;
      }
      // A row taller than a whole page would loop forever; force progress.
      if (i === start) i++;
      pages.push({ start, end: i });
    }
    if (pages.length === 0) pages.push({ start: 0, end: 0 });
  }

  const contents: string[] = pages.map((page, pageIndex) => {
    const ops: string[] = [];
    let y = pageH - margin;

    // Title
    ops.push('BT /F2 15 Tf 0.07 0.28 0.25 rg');
    ops.push(`1 0 0 1 ${margin} ${y - 12} Tm (${pdfString(options.title)}) Tj`);
    ops.push('ET');
    y -= options.subtitle ? 28 : 30;

    if (options.subtitle) {
      ops.push('BT /F1 9 Tf 0.35 0.35 0.35 rg');
      ops.push(`1 0 0 1 ${margin} ${y} Tm (${pdfString(options.subtitle)}) Tj`);
      ops.push('ET');
      y -= 16;
    }

    // Header band
    const headerTop = y;
    ops.push('0.82 0.94 0.91 rg');
    ops.push(`${margin} ${headerTop - headerRowHeight} ${printable} ${headerRowHeight} re f`);
    ops.push('BT /F2 ' + headerSize + ' Tf 0.05 0.30 0.26 rg');
    options.columns.forEach((col, i) => {
      const cx =
        col.align === 'center'
          ? xs[i] + widths[i] / 2 - textWidth(col.header, headerSize, true) / 2
          : xs[i] + cellPad;
      ops.push(`1 0 0 1 ${cx.toFixed(2)} ${(headerTop - headerRowHeight + cellPad + 1).toFixed(2)} Tm (${pdfString(col.header)}) Tj`);
    });
    ops.push('ET');
    y = headerTop - headerRowHeight;

    // Body
    ops.push('0.5 w 0.80 0.80 0.80 RG');
    const tableTop = headerTop;
    for (let r = page.start; r < page.end; r++) {
      const h = rowHeights[r];
      ops.push('BT /F1 ' + fontSize + ' Tf 0 0 0 rg');
      laidOut[r].forEach((lines, i) => {
        lines.forEach((line, li) => {
          if (!line) return;
          const cx =
            options.columns[i].align === 'center'
              ? xs[i] + widths[i] / 2 - textWidth(line, fontSize, false) / 2
              : xs[i] + cellPad;
          const cy = y - cellPad - (li + 1) * lineHeight + 2.5;
          ops.push(`1 0 0 1 ${cx.toFixed(2)} ${cy.toFixed(2)} Tm (${pdfString(line)}) Tj`);
        });
      });
      ops.push('ET');
      y -= h;
      ops.push(`${margin} ${y.toFixed(2)} m ${(margin + printable).toFixed(2)} ${y.toFixed(2)} l S`);
    }

    // Column rules and the outer frame
    const tableBottom = y;
    for (let i = 1; i < xs.length; i++) {
      ops.push(`${xs[i].toFixed(2)} ${tableTop.toFixed(2)} m ${xs[i].toFixed(2)} ${tableBottom.toFixed(2)} l S`);
    }
    ops.push(
      `${margin} ${tableBottom.toFixed(2)} ${printable} ${(tableTop - tableBottom).toFixed(2)} re S`
    );

    // Footer
    const footer = `Page ${pageIndex + 1} of ${pages.length}`;
    ops.push('BT /F1 8 Tf 0.45 0.45 0.45 rg');
    ops.push(
      `1 0 0 1 ${(pageW - margin - textWidth(footer, 8, false)).toFixed(2)} ${(margin - 12).toFixed(2)} Tm (${pdfString(footer)}) Tj`
    );
    ops.push('ET');

    return ops.join('\n');
  });

  return assemblePdf(contents, pageW, pageH);
}

/**
 * Wrap page content streams in the PDF container.
 *
 * Objects: 1 catalog, 2 pages, 3 font, 4 bold font, then a page/content pair
 * per page. Shared by both builders so there is one xref table to get right.
 */
function assemblePdf(contents: string[], pageW: number, pageH: number): Blob {
  const pages = contents;
  const pageObjStart = 5;
  const objects: string[] = [];

  const kids = pages.map((_, i) => `${pageObjStart + i * 2} 0 R`).join(' ');
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${kids}] >>`;
  objects[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /${FONT} /Encoding /WinAnsiEncoding >>`;
  objects[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /${FONT_BOLD} /Encoding /WinAnsiEncoding >>`;

  contents.forEach((content, i) => {
    const pageObj = pageObjStart + i * 2;
    const contentObj = pageObj + 1;
    objects[pageObj] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObj} 0 R >>`;
    objects[contentObj] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
  });

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  // Latin-1: every byte written above is ASCII, so this round-trips exactly and
  // keeps the byte offsets in the xref table honest.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: 'application/pdf' });
}

// ── Flowed documents ─────────────────────────────────────────────────────────

/**
 * One indivisible piece of a document — a heading, a wrapped line, a table row.
 *
 * A block can't be positioned until it is known which page it lands on, so
 * layout produces these instead of drawing: each knows its own height and can
 * draw itself once the page break decisions are made.
 */
interface FlowLine {
  height: number;
  draw: (top: number) => string[];
  /**
   * A table header, re-drawn at the top of any page the table continues onto.
   * Without it a table that breaks leaves its later rows unlabelled.
   */
  repeat?: FlowLine;
  /** Don't leave this line as the last thing on a page (headings). */
  keepWithNext?: boolean;
}

const DOC = {
  pageW: 612,
  pageH: 792,
  margin: 54,
  body: 9.5,
  table: 9,
  lineHeight: 12,
} as const;

/** `BT … ET` around a single run of text at an absolute position. */
function drawText(
  text: string,
  x: number,
  baseline: number,
  size: number,
  bold: boolean,
  color: string
): string {
  if (!text) return '';
  return (
    `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color} rg ` +
    `1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${pdfString(text)}) Tj ET`
  );
}

const INK = '0.10 0.28 0.25';
const MUTED = '0.42 0.45 0.44';
const BODY = '0.13 0.13 0.13';

/**
 * Render a document model to a portrait Letter PDF.
 *
 * Tables are drawn with a tinted header band and a hairline under each row
 * rather than a full grid: a table here may break across pages, and rules that
 * have to close at a page boundary are the part of a grid that goes wrong.
 */
export function buildDocumentPdf(doc: DocumentModel): Blob {
  const { pageW, pageH, margin, body, table, lineHeight } = DOC;
  const printable = pageW - margin * 2;
  const lines: FlowLine[] = [];

  for (const block of doc.blocks) {
    switch (block.kind) {
      case 'heading': {
        lines.push({
          height: 30,
          keepWithNext: true,
          draw: (top) => [
            drawText(block.text, margin, top - 19, 12, true, INK),
            `0.6 w 0.72 0.85 0.82 RG ${margin} ${(top - 25).toFixed(2)} m ` +
              `${(margin + printable).toFixed(2)} ${(top - 25).toFixed(2)} l S`,
          ],
        });
        break;
      }

      case 'paragraph': {
        const wrapped = wrap(block.text, printable, body, false, 40);
        wrapped.forEach((line, i) => {
          lines.push({
            height: lineHeight + (i === wrapped.length - 1 ? 6 : 0),
            draw: (top) => [drawText(line, margin, top - body, body, false, block.muted ? MUTED : BODY)],
          });
        });
        break;
      }

      case 'fields': {
        // A fixed label column: these are short names, and a ragged left edge
        // on the values makes the pairs much harder to scan down.
        const labelW = 130;
        for (const [label, value] of block.rows) {
          const valueLines = wrap(value, printable - labelW, body, false, 4);
          lines.push({
            height: Math.max(valueLines.length, 1) * lineHeight + 3,
            draw: (top) => [
              drawText(label, margin, top - body, body, true, INK),
              ...valueLines.map((l, i) =>
                drawText(l, margin + labelW, top - body - i * lineHeight, body, false, BODY)
              ),
            ],
          });
        }
        lines.push({ height: 6, draw: () => [] });
        break;
      }

      case 'bullets': {
        for (const group of block.groups) {
          if (group.label) {
            lines.push({
              height: 16,
              keepWithNext: true,
              draw: (top) => [drawText(group.label!.toUpperCase(), margin, top - 9, 8, true, MUTED)],
            });
          }
          for (const item of group.items) {
            const wrapped = wrap(item, printable - 14, body, false, 3);
            lines.push({
              height: wrapped.length * lineHeight + 1,
              draw: (top) => [
                drawText('-', margin + 3, top - body, body, false, INK),
                ...wrapped.map((l, i) =>
                  drawText(l, margin + 14, top - body - i * lineHeight, body, false, BODY)
                ),
              ],
            });
          }
          lines.push({ height: 8, draw: () => [] });
        }
        break;
      }

      case 'table': {
        const pad = 5;
        const total = block.columns.reduce((n, c) => n + c.weight, 0);
        const widths = block.columns.map((c) => (c.weight / total) * printable);
        const xs: number[] = [];
        let x = margin;
        for (const w of widths) {
          xs.push(x);
          x += w;
        }
        const cellX = (i: number, text: string, size: number, bold: boolean) =>
          block.columns[i].align === 'center'
            ? xs[i] + widths[i] / 2 - textWidth(text, size, bold) / 2
            : xs[i] + pad;

        const headerHeight = table + pad * 2;
        const header: FlowLine = {
          height: headerHeight,
          keepWithNext: true,
          draw: (top) => [
            `0.85 0.94 0.92 rg ${margin} ${(top - headerHeight).toFixed(2)} ` +
              `${printable.toFixed(2)} ${headerHeight.toFixed(2)} re f`,
            ...block.columns.map((c, i) =>
              drawText(c.header, cellX(i, c.header, table, true), top - headerHeight + pad + 1, table, true, INK)
            ),
          ],
        };
        // Points at itself so a break landing on the header doesn't draw two.
        header.repeat = header;
        lines.push(header);

        for (const row of block.rows) {
          const cells = row.map((v, i) => wrap(String(v ?? ''), widths[i] - pad * 2, table, false, 6));
          const height = Math.max(...cells.map((c) => c.length), 1) * lineHeight + pad * 2;
          lines.push({
            height,
            repeat: header,
            draw: (top) => [
              ...cells.flatMap((cellLines, i) =>
                cellLines.map((line, li) =>
                  drawText(
                    line,
                    cellX(i, line, table, false),
                    top - pad - (li + 1) * lineHeight + 2.5,
                    table,
                    false,
                    BODY
                  )
                )
              ),
              `0.5 w 0.86 0.87 0.86 RG ${margin} ${(top - height).toFixed(2)} m ` +
                `${(margin + printable).toFixed(2)} ${(top - height).toFixed(2)} l S`,
            ],
          });
        }
        lines.push({ height: 10, draw: () => [] });
        break;
      }
    }
  }

  // ── Flow the lines onto pages ──────────────────────────────────────────────
  const titleBlock = 52;
  const bottom = margin + 18; // leaves room for the footer
  const pages: string[][] = [];
  let ops: string[] = [];
  let y = pageH - margin - titleBlock;

  /**
   * Break, then reinstate the incoming line's table header if it has one — the
   * header is carried by the rows themselves rather than tracked as page state,
   * so it only ever reappears above a row that actually needs it.
   */
  const startPage = (next: FlowLine) => {
    pages.push(ops);
    ops = [];
    y = pageH - margin;
    if (next.repeat && next.repeat !== next) {
      ops.push(...next.repeat.draw(y));
      y -= next.repeat.height;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // A heading at the very foot of a page belongs at the top of the next one.
    const needed = line.height + (line.keepWithNext ? lines[i + 1]?.height ?? 0 : 0);
    if (y - needed < bottom && ops.length > 0) startPage(line);
    ops.push(...line.draw(y));
    y -= line.height;
  }
  pages.push(ops);

  const contents = pages.map((pageOps, i) => {
    const head: string[] = [];
    if (i === 0) {
      head.push(drawText(doc.title, margin, pageH - margin - 20, 18, true, INK));
      if (doc.subtitle) head.push(drawText(doc.subtitle, margin, pageH - margin - 36, 9.5, false, MUTED));
    }
    const footer = `Page ${i + 1} of ${pages.length}`;
    head.push(
      drawText(footer, pageW - margin - textWidth(footer, 8, false), margin - 14, 8, false, MUTED)
    );
    return [...head, ...pageOps].filter(Boolean).join('\n');
  });

  return assemblePdf(contents, pageW, pageH);
}
