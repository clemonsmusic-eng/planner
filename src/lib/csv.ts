/**
 * CSV, written and read.
 *
 * Small enough to hand-write and worth it: the format's whole difficulty is
 * quoting, and a spreadsheet that mangles a note containing a comma is worse
 * than no export at all.
 */

/** Quote a field only when it needs it, doubling any quotes inside. */
function escapeField(value: string): string {
  const text = String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: string[][]): string {
  // CRLF and a BOM: Excel opens a plain UTF-8 CSV as the local codepage and
  // turns every accented name into mojibake without them.
  return `﻿${rows.map((row) => row.map(escapeField).join(',')).join('\r\n')}\r\n`;
}

/**
 * Parse a CSV into rows.
 *
 * A single pass over the characters rather than a split on commas, because a
 * quoted field may hold commas, quotes and newlines of its own — which is
 * exactly what a Notes column tends to hold.
 */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (clean[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\r') {
      // Swallowed; the \n that follows ends the row.
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // A trailing newline leaves one empty row behind; so does a blank line in
  // the middle of a file someone edited by hand.
  return rows.filter((r) => r.some((f) => f.trim() !== ''));
}
