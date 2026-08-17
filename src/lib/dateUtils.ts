import { addDays, isWeekend, format, parseISO, isBefore, isAfter } from 'date-fns';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

/**
 * Check if a date is a workday (Mon-Fri, not a holiday).
 * We do not handle holidays for now.
 */
export function isWorkday(date: Date): boolean {
  return !isWeekend(date);
}

/**
 * Add N workdays to a date.
 */
export function addWorkdays(date: Date, n: number): Date {
  let d = new Date(date);
  let count = 0;
  const direction = n >= 0 ? 1 : -1;
  const steps = Math.abs(n);
  while (count < steps) {
    d = addDays(d, direction);
    if (isWorkday(d)) count++;
  }
  return d;
}

/**
 * Parse an ISO date string (YYYY-MM-DD) into a Date object at noon UTC
 * to avoid timezone-related off-by-one errors.
 */
export function parseDate(iso: string): Date {
  // parseISO returns the date at midnight UTC; we use it directly
  return parseISO(iso);
}

/**
 * Format a Date to YYYY-MM-DD ISO string.
 */
export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Format a Date to a human-readable label, e.g. "Mon, Apr 28"
 */
export function formatDateLabel(iso: string): string {
  const d = parseISO(iso);
  return format(d, 'EEE, MMM d');
}

/**
 * Get the day-of-week key for the availability map.
 */
export function getDayOfWeekKey(date: Date): DayOfWeek {
  const keys: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return keys[date.getDay()];
}

/**
 * Get N workdays starting from (but not including) a start date,
 * spaced every other workday.
 */
export function getEveryOtherWorkday(startDate: Date, count: number): Date[] {
  const result: Date[] = [];
  let current = addWorkdays(startDate, 1); // first one is 1 workday after start
  for (let i = 0; i < count; i++) {
    result.push(new Date(current));
    current = addWorkdays(current, 2); // every other workday
  }
  return result;
}

/**
 * Find the next Monday on or after a given date.
 */
export function nextMonday(date: Date): Date {
  let d = new Date(date);
  while (d.getDay() !== 1) {
    d = addDays(d, 1);
  }
  return d;
}

/**
 * Check if date a is before date b (ISO strings).
 */
export function isBeforeDate(a: string, b: string): boolean {
  return isBefore(parseISO(a), parseISO(b));
}

/**
 * Check if date a is after date b (ISO strings).
 */
export function isAfterDate(a: string, b: string): boolean {
  return isAfter(parseISO(a), parseISO(b));
}

/**
 * Get a range of dates between start and end (inclusive), as ISO strings.
 */
export function getDateRange(start: string, end: string): string[] {
  const result: string[] = [];
  let d = parseISO(start);
  const endD = parseISO(end);
  while (!isAfter(d, endD)) {
    result.push(toISODate(d));
    d = addDays(d, 1);
  }
  return result;
}

/**
 * Week number helper for tracking weekly hours.
 * Returns a string like "2026-W17".
 */
export function getWeekKey(iso: string): string {
  return format(parseISO(iso), 'yyyy-ww');
}

/**
 * Clock window for a shift: its configured start, plus its own hours.
 *
 * Taking the end from the hours rather than a second setting means a 4-hour AM
 * and a 6-hour AM don't both claim to finish at noon.
 */
export function shiftTimeRange(
  shift: 'AM' | 'PM' | 'Full Day',
  hours: number,
  times: { am: string; pm: string },
  /** A start set on this shift, which beats the default for its slot. */
  startOverride?: string
): string {
  // A Full Day runs from the morning start, however long it turns out to be.
  const start = startOverride || (shift === 'PM' ? times.pm : times.am);
  const [h, m] = start.split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  const startMins = h * 60 + m;
  const endMins = startMins + Math.round((hours || 0) * 60);
  return hours > 0 ? `${clockLabel(startMins)}–${clockLabel(endMins)}` : clockLabel(startMins);
}

/** Minutes past midnight as "8:00 AM"; past midnight wraps rather than reading 25:00. */
function clockLabel(totalMins: number): string {
  const mins = ((totalMins % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 < 12 ? 'AM' : 'PM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}
