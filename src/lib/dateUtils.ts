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
