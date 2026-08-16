import { toISODate } from './dateUtils';
import type { RoleType } from '../types';

/**
 * Reading a schedule out of a file someone else made.
 *
 * Two sources, one model. A .ics carries structured events and is read almost
 * exactly; a PDF carries a page of text and has to be scanned for anything that
 * looks like a date, which is guesswork. Both land in the same shape so the
 * review screen — and it is always reviewed before anything is written — has
 * one thing to render, and so every guess arrives labelled as one.
 */

export type ShiftSlot = 'AM' | 'PM' | 'Full Day';

/** A name read off the file, with the role its label gave it. */
export interface ImportedCrew {
  name: string;
  role: RoleType;
}

export interface ImportedShift {
  id: string;
  /** ISO date. Always present: a row without a date is never emitted. */
  date: string;
  shift: ShiftSlot;
  /** What the shift is — a phase name, an event summary, a line of a table. */
  title: string;
  /** Hours per person. Defaulted rather than guessed when the file is silent. */
  hours: number;
  crew: ImportedCrew[];
  note: string;
  /**
   * Whether the reader is sure. A .ics event is 'high'; a line scraped out of a
   * PDF is 'low' unless it carried an unambiguous date and a time.
   */
  confidence: 'high' | 'low';
  /** The text this came from, so the review screen can show its working. */
  source: string;
}

export interface ImportResult {
  kind: 'ics' | 'pdf';
  shifts: ImportedShift[];
  /** A project name, if the file offered one. */
  suggestedName: string | null;
  /** Things the reader could not do, shown above the review list. */
  warnings: string[];
}

export const DEFAULT_SHIFT_HOURS = 4;

let seq = 0;
export const newImportId = () => `imp-${Date.now().toString(36)}-${seq++}`;

// ── Dates ────────────────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Two-digit years: 70-99 are 1900s, everything else this century. */
function fullYear(n: number): number {
  if (n >= 1000) return n;
  return n >= 70 ? 1900 + n : 2000 + n;
}

function makeDate(y: number, m: number, d: number): string | null {
  if (m < 0 || m > 11 || d < 1 || d > 31) return null;
  const date = new Date(y, m, d, 12);
  // Rejects the 31st of a 30-day month rather than rolling into the next one.
  if (date.getFullYear() !== y || date.getMonth() !== m || date.getDate() !== d) return null;
  return toISODate(date);
}

/**
 * The first date in a line of text, and what it read.
 *
 * Handles the forms a schedule actually turns up in: ISO, US slashes, and a
 * month name in either order. Deliberately not the exhaustive set — a format
 * this doesn't know shows up as an unrecognised line in the review screen,
 * which is better than a confident misreading.
 */
export function findDate(text: string, defaultYear: number): { iso: string; matched: string } | null {
  const patterns: [RegExp, (m: RegExpMatchArray) => string | null][] = [
    // 2026-09-18
    [/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/, (m) => makeDate(+m[1], +m[2] - 1, +m[3])],
    // 9/18/2026, 09-18-26
    [
      /\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\b/,
      (m) => makeDate(fullYear(+m[3]), +m[1] - 1, +m[2]),
    ],
    // Sep 18, 2026 / September 18 2026 / Sep 18
    [
      /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*|\s+)?(\d{4})?\b/,
      (m) => {
        const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
        return month === undefined ? null : makeDate(m[3] ? +m[3] : defaultYear, month, +m[2]);
      },
    ],
    // 18 Sep 2026
    [
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?\s*(\d{4})?\b/,
      (m) => {
        const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
        return month === undefined ? null : makeDate(m[3] ? +m[3] : defaultYear, month, +m[1]);
      },
    ],
  ];

  for (const [pattern, build] of patterns) {
    // Every match of the pattern, not just the first. "Sort & Pack Day 1 —
    // Mon, Aug 31" matches the month-name pattern at "Day 1" first, which
    // builds nothing; stopping there would lose the date that follows it.
    for (const m of text.matchAll(new RegExp(pattern.source, `${pattern.flags}g`))) {
      const iso = build(m);
      if (iso) return { iso, matched: m[0] };
    }
  }
  return null;
}

// ── Times, shifts and hours ──────────────────────────────────────────────────

/** The first clock time in a line, as minutes past midnight. */
export function findTime(text: string): number | null {
  const m = text.match(/\b(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]\.?\b/) ?? text.match(/\b(\d{1,2}):(\d{2})\b/);
  if (!m) return null;
  let h = +m[1];
  const min = +m[2];
  if (h > 23 || min > 59) return null;
  if (m[3]) {
    const pm = m[3].toLowerCase() === 'p';
    h = h % 12 + (pm ? 12 : 0);
  }
  return h * 60 + min;
}

/**
 * Which half of the day a shift falls in.
 *
 * An explicit "AM"/"PM"/"Full Day" wins; otherwise a start time decides, with
 * noon as the boundary. A shift long enough to cross lunch is a full day
 * whatever it started as.
 */
export function inferShift(text: string, startMins: number | null, hours: number): ShiftSlot {
  if (/\bfull[\s-]?day\b/i.test(text) || /\ball[\s-]?day\b/i.test(text)) return 'Full Day';
  if (hours >= 7) return 'Full Day';
  // Word-boundary AM/PM only, so "PM: Gabe" (the role) doesn't read as a slot.
  if (/(^|[^A-Za-z])AM\b(?!\s*[:.])/i.test(` ${text}`) && !/\bPM\b/i.test(text)) return 'AM';
  if (startMins !== null) return startMins < 12 * 60 ? 'AM' : 'PM';
  if (/\bafternoon\b/i.test(text)) return 'PM';
  if (/\bmorning\b/i.test(text)) return 'AM';
  return 'AM';
}

/**
 * How long the shift runs.
 *
 * An explicit count wins — "4h", "4.5 hrs" — and otherwise a start-to-end time
 * range is measured, because a printed schedule far more often states its
 * hours as "9:00 AM–1:00 PM" than as a number.
 */
export function findHours(text: string): number | null {
  const stated = text.match(/\b(\d{1,2}(?:\.\d)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
  if (stated) {
    const n = parseFloat(stated[1]);
    if (Number.isFinite(n) && n > 0 && n <= 24) return n;
  }

  const range = text.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*([AaPp]\.?[Mm]\.?)?\s*(?:[-–—]|\bto\b)\s*(\d{1,2})(?::(\d{2}))?\s*([AaPp]\.?[Mm]\.?)?/
  );
  if (!range) return null;
  const at = (h: string, m: string | undefined, mer: string | undefined): number | null => {
    let hour = +h;
    if (hour > 23) return null;
    if (mer) hour = (hour % 12) + (/p/i.test(mer) ? 12 : 0);
    return hour * 60 + (m ? +m : 0);
  };
  const start = at(range[1], range[2], range[3]);
  let end = at(range[4], range[5], range[6]);
  if (start === null || end === null) return null;
  // "9:00–1:00" with no meridiem on the end means the afternoon, not yesterday.
  if (end <= start) end += 12 * 60;
  const hours = (end - start) / 60;
  return hours > 0 && hours <= 14 ? Math.round(hours * 2) / 2 : null;
}

const ROLE_LABEL = String.raw`(?:Assist(?:ant)? PM|PM|Lead|Crew|Team|Movers?|Specialists?|Staff|Assigned(?: to)?)`;

/**
 * A role label and the names after it, stopping at the next label.
 *
 * The tempered `(?!…)` is the point: "PM: Gabe, Crew: Ann" has two lists on one
 * line, and a plain `[^|;]+` swallows the second into the first, leaving a
 * crew member called "Crew: Ann".
 */
const LABELLED_LIST = new RegExp(
  // Newlines end a list too: a .ics description puts the crew on one line and
  // the gate code on the next, and they are not the same field.
  String.raw`\b${ROLE_LABEL}\s*[:\-]\s*((?:(?!\b${ROLE_LABEL}\s*[:\-])[^|;\r\n])+)`,
  'gi'
);

/** A title made only of column headings, which means the row was one. */
const HEADER_ONLY =
  /^(?:(?:date|dates|day|days|shift|shifts|time|times|note|notes|milestone|hours|hrs|crew|team|total|page|of|schedule|plan)[\s·|,:-]*)+$/i;

/**
 * Labels from a document's own metadata rather than its schedule.
 *
 * "Target Move Date: Tue, Sep 15" reads exactly like a shift row — a label and
 * a date — but it states when the move is meant to happen, not that anyone is
 * working that day.
 */
const METADATA_LABEL =
  /^(?:target\s+move\s+date|move\s+date|earliest\s+start|hard\s+deadline|created|printed|generated|prepared|exported|updated|as\s+of)\b/i;

/** Weekday names, which prefix a date without being part of the match. */
const WEEKDAY = /\b(?:Mon|Tue|Tues|Wed|Thur?|Thurs|Fri|Sat|Sun)(?:day|sday|nesday|rsday|urday)?\.?,?\s*/gi;

/**
 * Names listed against a labelled role — "PM: Gabe", "Crew: Ann, Bo".
 *
 * Only labelled lists are read. Picking capitalised words out of free text
 * finds "Sort And Pack" as readily as a person, and a wrong name on a shift is
 * worse than no name.
 */
export function findCrew(text: string): ImportedCrew[] {
  const found: ImportedCrew[] = [];
  for (const m of text.matchAll(LABELLED_LIST)) {
    const role = roleOfLabel(m[0]);
    for (const part of m[1].split(/,| and | & |\//)) {
      const name = part.trim().replace(/[.;]+$/, '');
      // Three words at most: a longer run is a sentence that followed the list.
      if (name && name.length <= 40 && name.split(/\s+/).length <= 3 && /[A-Za-z]/.test(name)) {
        if (!found.some((c) => c.name.toLowerCase() === name.toLowerCase())) found.push({ name, role });
      }
    }
  }
  return found;
}

/** Which role a list was labelled with — "PM: …" really does mean the PM. */
function roleOfLabel(match: string): RoleType {
  const label = match.slice(0, match.indexOf(':') >= 0 ? match.indexOf(':') : match.length).toLowerCase();
  if (/assist/.test(label)) return 'Assist PM';
  if (/\bpm\b/.test(label)) return 'PM';
  if (/lead/.test(label)) return 'Lead';
  if (/specialist/.test(label)) return 'Specialist';
  if (/mover|crew|team/.test(label)) return 'Mover';
  return 'Specialist';
}

/**
 * Turn one line of text into a shift, or nothing if it carries no date.
 *
 * `defaultYear` fills in a bare "Sep 18". Schedules are usually printed for a
 * season, so the year of the surrounding document is a better guess than the
 * current one — the caller works it out from the dates that did carry a year.
 */
export function shiftFromLine(line: string, defaultYear: number, confidence: 'high' | 'low' = 'low'): ImportedShift | null {
  const found = findDate(line, defaultYear);
  if (!found) return null;

  const startMins = findTime(line);
  const hours = findHours(line) ?? DEFAULT_SHIFT_HOURS;
  const crew = findCrew(line);

  // The title is what is left once the date, time and crew list are taken out.
  // Column separators are then dropped rather than left as a row of empty
  // pipes where the fields that were understood used to be.
  const title =
    line
      .replace(found.matched, ' ')
      .replace(WEEKDAY, ' ')
      .replace(/\b\d{1,2}:\d{2}\s*(?:[AaPp]\.?[Mm]\.?)?/g, ' ')
      .replace(LABELLED_LIST, ' ')
      .replace(/\b\d{1,2}(?:\.\d)?\s*(?:h|hr|hrs|hour|hours)\b/gi, ' ')
      .split('|')
      .map((part) => part.replace(/^[\s,;·:.\-—–]+|[\s,;·:.\-—–]+$/g, '').replace(/\s{2,}/g, ' ').trim())
      .filter(Boolean)
      .join(' · ') || 'Imported shift';

  // A table's own header row carries the word "Date", and so does a document
  // subtitle — neither is a shift. Rejected here rather than left for the
  // reviewer to untick on every import.
  if (HEADER_ONLY.test(title) || METADATA_LABEL.test(title)) return null;

  return {
    id: newImportId(),
    date: found.iso,
    shift: inferShift(line, startMins, hours),
    title: title.slice(0, 80),
    hours,
    crew,
    note: '',
    // A line that gave both a date and a clock time is a schedule row, not
    // prose that happened to mention a month.
    confidence: confidence === 'high' || startMins !== null ? 'high' : 'low',
    source: line.trim().slice(0, 200),
  };
}

/**
 * The year the document is about.
 *
 * Taken from the dates that stated one, so bare "Sep 18" rows join them rather
 * than jumping to whatever year the import happens to run in.
 */
export function dominantYear(lines: string[]): number {
  const counts = new Map<number, number>();
  for (const line of lines) {
    for (const m of line.matchAll(/\b(19|20)\d{2}\b/g)) {
      const y = +m[0];
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
  }
  let best = new Date().getFullYear();
  let bestCount = 0;
  for (const [year, count] of counts) {
    if (count > bestCount) {
      best = year;
      bestCount = count;
    }
  }
  return best;
}

/** Drop rows that landed on the same date and title, keeping the surer one. */
export function dedupe(shifts: ImportedShift[]): ImportedShift[] {
  const seen = new Map<string, ImportedShift>();
  for (const s of shifts) {
    const key = `${s.date}|${s.shift}|${s.title.toLowerCase()}`;
    const prior = seen.get(key);
    if (!prior || (prior.confidence === 'low' && s.confidence === 'high')) seen.set(key, s);
  }
  return [...seen.values()].sort((a, b) => a.date.localeCompare(b.date) || a.shift.localeCompare(b.shift));
}
