import { shiftsOf } from './scheduleDocument';
import type { Project, ScheduleResult, ShiftTimeSettings } from '../types';

/**
 * The schedule as a calendar file.
 *
 * One event per shift, so a crew's calendar shows what they are doing and when
 * rather than one all-day blob per project. Times are written as local
 * date-times with no zone: the app records when a crew turns up by the clock
 * on the wall, and stamping a zone onto that would move every shift for anyone
 * whose calendar is set elsewhere.
 */

/** RFC 5545 escapes commas, semicolons, backslashes and newlines in TEXT. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

/**
 * Lines longer than 75 octets must be folded, and a reader that hits an
 * unfolded long line drops the property — which would silently lose exactly
 * the long descriptions worth exporting.
 */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [line.slice(0, 73)];
  for (let i = 73; i < line.length; i += 72) parts.push(` ${line.slice(i, i + 72)}`);
  return parts.join('\r\n');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "20260918T090000" — a local date-time, deliberately without a zone. */
function stamp(date: string, minutes: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const at = new Date(y, m - 1, d, 0, minutes);
  return (
    `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}` +
    `T${pad(at.getHours())}${pad(at.getMinutes())}00`
  );
}

/** UTC stamp, for the fields that are genuinely absolute. */
function utcStamp(at: Date): string {
  return (
    `${at.getUTCFullYear()}${pad(at.getUTCMonth() + 1)}${pad(at.getUTCDate())}` +
    `T${pad(at.getUTCHours())}${pad(at.getUTCMinutes())}${pad(at.getUTCSeconds())}Z`
  );
}

const startMinutes = (shift: 'AM' | 'PM' | 'Full Day', times: ShiftTimeSettings): number => {
  const [h, m] = (shift === 'PM' ? times.pm : times.am).split(':').map(Number);
  return (Number.isFinite(h) ? h : 9) * 60 + (Number.isFinite(m) ? m : 0);
};

export function buildScheduleIcs(
  project: Project,
  schedule: ScheduleResult,
  shiftTimes: ShiftTimeSettings
): Blob {
  const client = project.inputs.clientName || 'Project';
  const rows = shiftsOf(schedule.days, project);
  const now = utcStamp(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smooth Transitions//Move Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`${client} — Schedule`)}`,
  ];

  for (const row of rows) {
    const start = startMinutes(row.shift, shiftTimes);
    const end = start + Math.round(row.hoursEach * 60);
    // The crew and the note are what someone reads off a calendar entry when
    // they are already on their way, so both go in the description.
    const description = [
      row.crew.length > 0
        ? row.crew.map((c) => `${c.role}: ${c.name}`).join('\n')
        : 'Nobody assigned yet',
      row.note.trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    // A move day ends at the destination; every other shift is at the origin.
    const moveDay = row.phaseId === 'phase-5-1' || row.phaseId === 'phase-5-2';
    const location =
      (moveDay ? project.inputs.destinationAddress : project.inputs.originAddress) ||
      project.inputs.originAddress ||
      '';

    lines.push(
      'BEGIN:VEVENT',
      // Stable per project, date and phase, so re-importing an updated file
      // replaces the event rather than adding a second copy of the shift.
      `UID:${project.id}-${row.date}-${row.phaseId}@smooth-transitions`,
      `DTSTAMP:${now}`,
      `DTSTART:${stamp(row.date, start)}`,
      `DTEND:${stamp(row.date, end)}`,
      fold(`SUMMARY:${escapeText(`${client} — ${row.phaseName}`)}`),
      fold(`DESCRIPTION:${escapeText(description)}`),
      ...(location ? [fold(`LOCATION:${escapeText(location)}`)] : []),
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  // CRLF throughout, which the spec requires and some readers enforce.
  return new Blob([`${lines.join('\r\n')}\r\n`], { type: 'text/calendar;charset=utf-8' });
}
