import { toISODate } from './dateUtils';
import {
  DEFAULT_SHIFT_HOURS,
  dedupe,
  findCrew,
  inferShift,
  newImportId,
  type ImportResult,
  type ImportedShift,
} from './scheduleImport';

/**
 * iCalendar (.ics) reader.
 *
 * A calendar file states its events rather than implying them, so unlike the
 * PDF reader this is parsing, not guessing: every shift it produces comes from
 * a VEVENT with a real start. Written by hand because RFC 5545's grammar is
 * small — folded lines, escaped text, and three date-time forms.
 */

/** Undo RFC 5545 line folding: a leading space or tab continues the line before. */
function unfold(text: string): string[] {
  const raw = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const lines: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

interface Prop {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parseProp(line: string): Prop | null {
  const colon = line.indexOf(':');
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...paramParts] = head.split(';');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eq = part.indexOf('=');
    if (eq > 0) params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

/** TEXT values escape commas, semicolons, backslashes and newlines. */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim();
}

interface Stamp {
  iso: string;
  /** Minutes past midnight, or null for an all-day event. */
  minutes: number | null;
}

/**
 * A DTSTART/DTEND value.
 *
 * Three forms matter. A bare DATE is all-day. A local date-time — floating or
 * with a TZID — is taken at face value: the wall clock is what a crew turns up
 * by, and rewriting 9am into another zone would be worse than ignoring the
 * zone. Only a trailing Z, which is genuinely UTC, is converted.
 */
function parseStamp(prop: Prop): Stamp | null {
  const v = prop.value.trim();
  const dateOnly = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (dateOnly || prop.params.VALUE === 'DATE') {
    const m = dateOnly ?? v.match(/^(\d{4})(\d{2})(\d{2})/);
    if (!m) return null;
    return { iso: `${m[1]}-${m[2]}-${m[3]}`, minutes: null };
  }

  const dt = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!dt) return null;
  const [, y, mo, d, h, mi, s, utc] = dt;
  if (utc) {
    const local = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    return { iso: toISODate(local), minutes: local.getHours() * 60 + local.getMinutes() };
  }
  return { iso: `${y}-${mo}-${d}`, minutes: +h * 60 + +mi };
}

export function parseIcs(text: string): ImportResult {
  const lines = unfold(text);
  const warnings: string[] = [];
  const shifts: ImportedShift[] = [];
  let calendarName: string | null = null;

  let current: Record<string, Prop> | null = null;
  let depth = 0; // VALARM and friends nest inside VEVENT; ignore their props

  for (const line of lines) {
    const prop = parseProp(line);
    if (!prop) continue;

    if (prop.name === 'BEGIN' && prop.value.toUpperCase() === 'VEVENT') {
      current = {};
      depth = 0;
      continue;
    }
    if (current && prop.name === 'BEGIN') {
      depth++;
      continue;
    }
    if (current && prop.name === 'END' && depth > 0) {
      depth--;
      continue;
    }
    if (prop.name === 'END' && prop.value.toUpperCase() === 'VEVENT' && current) {
      const event = current;
      current = null;

      const start = event.DTSTART ? parseStamp(event.DTSTART) : null;
      if (!start) {
        warnings.push(`Skipped an event with no readable start date.`);
        continue;
      }
      const end = event.DTEND ? parseStamp(event.DTEND) : null;

      const summary = event.SUMMARY ? unescapeText(event.SUMMARY.value) : '';
      const description = event.DESCRIPTION ? unescapeText(event.DESCRIPTION.value) : '';
      const location = event.LOCATION ? unescapeText(event.LOCATION.value) : '';

      // Hours from the event's own length where it has one, capped at a day.
      let hours = DEFAULT_SHIFT_HOURS;
      if (start.minutes !== null && end && end.minutes !== null) {
        const days =
          (Date.parse(`${end.iso}T00:00:00`) - Date.parse(`${start.iso}T00:00:00`)) / 86_400_000;
        const span = days * 1440 + end.minutes - start.minutes;
        if (span > 0) hours = Math.min(Math.round((span / 60) * 2) / 2, 12);
      } else if (start.minutes === null) {
        hours = 8; // an all-day event is a full day of work
      }

      const haystack = [summary, description].filter(Boolean).join(' — ');
      shifts.push({
        id: newImportId(),
        date: start.iso,
        shift: inferShift(haystack, start.minutes, hours),
        title: (summary || 'Imported shift').slice(0, 80),
        hours,
        crew: findCrew(haystack),
        note: [description, location && `Location: ${location}`].filter(Boolean).join('\n').slice(0, 500),
        // The event said when it was; nothing here was inferred from prose.
        confidence: 'high',
        source: [summary, start.iso].filter(Boolean).join(' · '),
      });
      continue;
    }

    if (current && depth === 0) {
      current[prop.name] = prop;
      continue;
    }
    if (!current && prop.name === 'X-WR-CALNAME') calendarName = unescapeText(prop.value);
  }

  if (shifts.length === 0 && warnings.length === 0) {
    warnings.push('No calendar events were found in this file.');
  }

  return { kind: 'ics', shifts: dedupe(shifts), suggestedName: calendarName, warnings };
}
