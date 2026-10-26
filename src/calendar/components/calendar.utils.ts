import type {
  CalendarEvent,
  CalendarMonthGridOptions,
  CalendarWeek,
  CalendarWeekday,
  CalendarWeekdayLabel,
} from './calendar.types';

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const REFERENCE_SUNDAY = new Date(2021, 7, 1);
const DAYS_PER_WEEK = 7;
const WEEKS_PER_GRID = 6;

/**
 * Formats a `Date` as a local calendar date key (`YYYY-MM-DD`).
 *
 * Local field access is intentional: `toISOString()` would shift the date for
 * hosts east or west of UTC.
 *
 * @param date - Date to format.
 * @returns The local calendar date in `YYYY-MM-DD` form.
 *
 * @category Calendar
 */
export function toDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a local calendar date key (`YYYY-MM-DD`) without UTC conversion.
 *
 * @param value - Candidate `YYYY-MM-DD` value.
 * @returns A local `Date` at midnight, or `null` when the value is not a real date.
 *
 * @category Calendar
 */
export function parseDateKey(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const match = DATE_KEY_PATTERN.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Normalizes a date key or `Date` to a local `YYYY-MM-DD` key.
 *
 * @param value - Date, date key or empty value.
 * @returns The normalized key, or `null` for empty or invalid input.
 *
 * @category Calendar
 */
export function normalizeDateKey(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toDateKey(value);
  }
  const parsed = parseDateKey(value);
  return parsed ? toDateKey(parsed) : null;
}

/**
 * Rolls a year/month pair into the valid `1`-based month range.
 *
 * @param year - Calendar year, which may be any integer.
 * @param month - Calendar month, `1`-based; values outside `1..12` roll into adjacent years.
 * @returns The normalized year and month.
 *
 * @category Calendar
 */
export function normalizeYearMonth(
  year: number,
  month: number,
): { year: number; month: number } {
  const safeMonth = Number.isFinite(month) ? Math.trunc(month) : 1;
  const safeYear = Number.isFinite(year) ? Math.trunc(year) : 1;
  const totalMonths = safeYear * 12 + (safeMonth - 1);
  const normalizedYear = Math.floor(totalMonths / 12);
  const normalizedMonth = ((totalMonths % 12) + 12) % 12 + 1;
  return { year: normalizedYear, month: normalizedMonth };
}

/**
 * Adds a number of days to a local date key.
 *
 * @param key - Starting `YYYY-MM-DD` key.
 * @param days - Number of days to add; negative values move backwards.
 * @returns The resulting local date key, or `null` when the input is invalid.
 *
 * @category Calendar
 */
export function addDaysToDateKey(key: string, days: number): string | null {
  const date = parseDateKey(key);
  if (!date) {
    return null;
  }
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

/**
 * Position of a date inside its week for the configured first column.
 *
 * @param key - Local date key.
 * @param firstDayOfWeek - First column of the grid (`0` Sunday, `1` Monday).
 * @returns Index in the range `0..6`, or `-1` when the key is invalid.
 *
 * @category Calendar
 */
export function weekdayIndexOf(key: string, firstDayOfWeek: CalendarWeekday): number {
  const date = parseDateKey(key);
  if (!date) {
    return -1;
  }
  return (date.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;
}

/**
 * Builds the fixed six-week month grid.
 *
 * The grid always has 42 cells so month navigation does not change the rendered
 * height. Leading and trailing cells come from adjacent months and are marked
 * with `inMonth: false`. Invalid event dates are ignored.
 *
 * @param options - Month, selection, today and host events to project.
 * @returns Six rows of seven {@link CalendarWeek} cells.
 *
 * @category Calendar
 */
export function buildMonthGrid(options: CalendarMonthGridOptions): CalendarWeek[] {
  const { year, month, firstDayOfWeek, today, selected, events } = options;
  const firstOfMonth = new Date(year, month - 1, 1);
  const offset = (firstOfMonth.getDay() - firstDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  const eventsByDate = groupEventsByDate(events);
  const weeks: CalendarWeek[] = [];

  for (let week = 0; week < WEEKS_PER_GRID; week += 1) {
    const days = [];
    for (let column = 0; column < DAYS_PER_WEEK; column += 1) {
      const dayOffset = week * DAYS_PER_WEEK + column - offset;
      const date = new Date(year, month - 1, 1 + dayOffset);
      const key = toDateKey(date);
      days.push({
        date: key,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        inMonth: date.getFullYear() === year && date.getMonth() === month - 1,
        isToday: key === today,
        isSelected: key === selected,
        events: eventsByDate.get(key) ?? [],
      });
    }
    weeks.push({ key: days[0].date, days });
  }

  return weeks;
}

/**
 * Groups host events by their local date key, preserving host order.
 *
 * @param events - Events to group.
 * @returns A map keyed by `YYYY-MM-DD`.
 *
 * @category Calendar
 */
export function groupEventsByDate(
  events: readonly CalendarEvent[],
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = normalizeDateKey(event.date);
    if (!key) {
      continue;
    }
    const bucket = grouped.get(key);
    if (bucket) {
      bucket.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }
  return grouped;
}

/**
 * Formats a month heading with the host locale.
 *
 * @param year - Calendar year.
 * @param month - Calendar month, `1`-based.
 * @param locale - BCP 47 locale used for the month name.
 * @returns The localized month and year heading.
 *
 * @category Calendar
 */
export function formatMonthTitle(year: number, month: number, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    }).format(new Date(year, month - 1, 1));
  } catch {
    return `${year}-${String(month).padStart(2, '0')}`;
  }
}

/**
 * Formats a date key as a full localized date for accessible labels.
 *
 * @param key - Local date key.
 * @param locale - BCP 47 locale used for the labels.
 * @returns The localized full date, or the raw key when it cannot be parsed.
 *
 * @category Calendar
 */
export function formatDayLabel(key: string, locale: string): string {
  const date = parseDateKey(key);
  if (!date) {
    return key;
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date);
  } catch {
    return key;
  }
}

/**
 * Resolves the seven weekday labels for the configured first column.
 *
 * @param firstDayOfWeek - First column of the grid (`0` Sunday, `1` Monday).
 * @param locale - BCP 47 locale used for the labels.
 * @returns Short and full labels in grid order.
 *
 * @category Calendar
 */
export function weekdayLabels(
  firstDayOfWeek: CalendarWeekday,
  locale: string,
): CalendarWeekdayLabel[] {
  const labels: CalendarWeekdayLabel[] = [];
  for (let index = 0; index < DAYS_PER_WEEK; index += 1) {
    const date = new Date(
      REFERENCE_SUNDAY.getFullYear(),
      REFERENCE_SUNDAY.getMonth(),
      REFERENCE_SUNDAY.getDate() + ((firstDayOfWeek + index) % DAYS_PER_WEEK),
    );
    labels.push({
      short: formatWeekday(date, locale, 'short'),
      long: formatWeekday(date, locale, 'long'),
    });
  }
  return labels;
}

function formatWeekday(date: Date, locale: string, style: 'short' | 'long'): string {
  try {
    return new Intl.DateTimeFormat(locale, { weekday: style }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', { weekday: style }).format(date);
  }
}
