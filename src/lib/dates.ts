import { addDays, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Calendar day ("yyyy-MM-dd") of an instant in the user's timezone. Day columns
 * (logged_on, measured_on) are always computed this way at logging time, never from UTC.
 */
export function localDate(timezone: string, at: Date = new Date()): string {
  return formatInTimeZone(at, timezone, 'yyyy-MM-dd');
}

/** Wall-clock time of an instant in the user's timezone, e.g. "14:05". */
export function localTime(timezone: string, at: Date | string): string {
  return formatInTimeZone(at, timezone, 'HH:mm');
}

/** Hour of day (0-23) right now in the user's timezone. */
export function localHour(timezone: string, at: Date = new Date()): number {
  return Number(formatInTimeZone(at, timezone, 'H'));
}

// Calendar-day strings are plain dates, so the math below never touches a timezone:
// parseISO reads "yyyy-MM-dd" as local midnight and format writes it back unchanged.

/** "2026-09-26" shifted by whole days, e.g. shiftDate("2026-03-01", -1) === "2026-02-28". */
export function shiftDate(date: string, days: number): string {
  return format(addDays(parseISO(date), days), 'yyyy-MM-dd');
}

/** "Today", "Yesterday", or e.g. "Wed, Sep 24". */
export function formatDayLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === shiftDate(today, -1)) return 'Yesterday';
  return format(parseISO(date), 'EEE, MMM d');
}

export function isValidDate(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !isNaN(parseISO(value).getTime())
  );
}
