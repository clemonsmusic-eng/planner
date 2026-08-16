import {
  dedupe,
  dominantYear,
  shiftFromLine,
  type ImportResult,
  type ImportedShift,
} from './scheduleImport';

/**
 * Reading a schedule out of a PDF.
 *
 * A PDF has no rows — it has glyphs at coordinates — so this rebuilds lines
 * from the positions pdf.js reports, then scans each for a date. That is
 * genuinely guesswork on someone else's layout, which is why nothing here
 * writes to a project: every shift it finds goes to the review screen first,
 * carrying the text it was read from so a wrong guess is obvious.
 *
 * pdf.js is loaded on demand. It is much larger than the rest of the app put
 * together, and only someone importing a PDF should ever pay for it.
 */

/** One visual line of the page, rebuilt from positioned text runs. */
interface PageLine {
  y: number;
  text: string;
}

type PdfTextItem = { str?: string; transform?: number[] };

async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist');
  // The worker is bundled as a separate chunk and addressed through Vite so it
  // resolves under the app's base path on GitHub Pages as well as locally.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return pdfjs;
}

/**
 * Group positioned runs into lines.
 *
 * Runs on the same baseline belong to one line, but a table's cells arrive as
 * separate runs with a gap between them, and joining them with a plain space
 * would let a date in one column run into a note in the next. A wide gap
 * becomes a pipe, which the line scanner treats as a field boundary.
 */
function itemsToLines(items: PdfTextItem[]): PageLine[] {
  const runs = items
    .filter((i) => typeof i.str === 'string' && i.str.trim().length > 0 && Array.isArray(i.transform))
    .map((i) => ({ x: i.transform![4], y: i.transform![5], text: i.str! }));
  if (runs.length === 0) return [];

  const lines: { y: number; runs: { x: number; text: string }[] }[] = [];
  for (const run of runs) {
    // 2.5pt of drift still counts as the same baseline — subscripts and
    // slightly different font sizes in one row shift it by about that much.
    const line = lines.find((l) => Math.abs(l.y - run.y) <= 2.5);
    if (line) line.runs.push(run);
    else lines.push({ y: run.y, runs: [run] });
  }

  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const sorted = [...line.runs].sort((a, b) => a.x - b.x);
      let text = '';
      let prevEnd = -Infinity;
      for (const run of sorted) {
        if (text) text += run.x - prevEnd > 12 ? ' | ' : run.text.startsWith(' ') ? '' : ' ';
        text += run.text.trim();
        // No per-glyph widths here, so the run's own length approximates where
        // it ends — enough to tell a column gap from a word space.
        prevEnd = run.x + run.text.length * 5;
      }
      return { y: line.y, text: text.replace(/\s{2,}/g, ' ').trim() };
    })
    .filter((l) => l.text.length > 0);
}

/**
 * A project name for the import.
 *
 * The first substantial line of page one, which on almost every schedule is
 * its title. Skipped when that line is itself a date row.
 */
function guessName(lines: string[]): string | null {
  for (const line of lines.slice(0, 6)) {
    const cleaned = line.replace(/\s*\|\s*/g, ' ').trim();
    if (cleaned.length >= 4 && cleaned.length <= 70 && !/\d{1,2}[/:-]\d/.test(cleaned)) {
      return cleaned.replace(/\s*[—–-]\s*(Plan|Schedule)$/i, '').trim();
    }
  }
  return null;
}

export async function parsePdfSchedule(file: File | Blob): Promise<ImportResult> {
  const warnings: string[] = [];
  let pdfjs;
  try {
    pdfjs = await loadPdfjs();
  } catch {
    return {
      kind: 'pdf',
      shifts: [],
      suggestedName: null,
      warnings: ['Could not load the PDF reader. Check your connection and try again.'],
    };
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  const allLines: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    allLines.push(...itemsToLines(content.items as PdfTextItem[]).map((l) => l.text));
  }
  await doc.destroy();

  if (allLines.length === 0) {
    return {
      kind: 'pdf',
      shifts: [],
      suggestedName: null,
      warnings: [
        'No text was found in this PDF. Scanned or photographed documents are images rather than text, and cannot be read here.',
      ],
    };
  }

  const year = dominantYear(allLines);
  const suggestedName = guessName(allLines);
  const shifts: ImportedShift[] = [];
  for (const [i, line] of allLines.entries()) {
    // The title block — a heading and its subtitle — often names a date
    // ("Move Fri, Sep 18") and would otherwise import as a shift named after
    // the whole project. Skipped only when there was a title to take a name
    // from, so a bare table that starts on line one keeps its first rows.
    if (suggestedName && i < 2) continue;
    const shift = shiftFromLine(line, year);
    if (shift) shifts.push(shift);
  }

  const found = dedupe(shifts);
  if (found.length === 0) {
    warnings.push(
      `Read ${allLines.length} lines of text but found no dates. If the schedule is laid out as a picture rather than text, it cannot be read here.`
    );
  } else if (found.some((s) => s.confidence === 'low')) {
    warnings.push('Rows without a time on them are best guesses — check each one before importing.');
  }

  return { kind: 'pdf', shifts: found, suggestedName, warnings };
}
