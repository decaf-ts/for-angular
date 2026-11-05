/**
 * @module for-angular/calendar/calendar.utils.spec
 * @summary SAA-1484 unit contract for the in-house month-grid calendar helpers.
 * @description Proves local date-key formatting/parsing without UTC drift, the
 * year/month rolling rules, week/grid geometry, event grouping and the
 * localized labels used by `CalendarComponent`.
 */
import type { CalendarEvent } from './calendar.types';
import {
  addDaysToDateKey,
  buildMonthGrid,
  formatDayLabel,
  formatMonthTitle,
  groupEventsByDate,
  normalizeDateKey,
  normalizeYearMonth,
  parseDateKey,
  toDateKey,
  weekdayIndexOf,
  weekdayLabels,
} from './calendar.utils';

function event(id: string, date: string, title = `event ${id}`): CalendarEvent {
  return { id, date, title };
}

describe('calendar.utils', () => {
  describe('toDateKey', () => {
    it('zero-pads the local calendar date', () => {
      expect(toDateKey(new Date(2024, 0, 5))).toBe('2024-01-05');
      expect(toDateKey(new Date(2024, 11, 31))).toBe('2024-12-31');
    });

    it('reads local fields so a late-evening date does not shift', () => {
      expect(toDateKey(new Date(2024, 2, 1, 23, 30))).toBe('2024-03-01');
      expect(toDateKey(new Date(2024, 2, 1, 0, 30))).toBe('2024-03-01');
    });
  });

  describe('parseDateKey', () => {
    it('parses a real local date key at midnight', () => {
      const parsed = parseDateKey('2024-02-29');

      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2024);
      expect(parsed?.getMonth()).toBe(1);
      expect(parsed?.getDate()).toBe(29);
      expect(parsed?.getHours()).toBe(0);
    });

    it('trims surrounding whitespace', () => {
      expect(toDateKey(parseDateKey(' 2024-01-05 ') as Date)).toBe('2024-01-05');
    });

    it('rejects empty, malformed and impossible dates', () => {
      for (const value of [
        null,
        undefined,
        '',
        '2024-1-05',
        '05/01/2024',
        '2024-00-10',
        '2024-13-01',
        '2023-02-29',
        '2024-04-31',
      ]) {
        expect(parseDateKey(value)).toBeNull();
      }
    });
  });

  describe('normalizeDateKey', () => {
    it('normalizes a Date and a valid key to the same value', () => {
      expect(normalizeDateKey(new Date(2024, 4, 9))).toBe('2024-05-09');
      expect(normalizeDateKey('2024-05-09')).toBe('2024-05-09');
    });

    it('returns null for invalid or empty input', () => {
      expect(normalizeDateKey(new Date('not a date'))).toBeNull();
      expect(normalizeDateKey('2024-02-30')).toBeNull();
      expect(normalizeDateKey('   ')).toBeNull();
      expect(normalizeDateKey(null)).toBeNull();
      expect(normalizeDateKey(undefined)).toBeNull();
    });
  });

  describe('normalizeYearMonth', () => {
    it('keeps an in-range month unchanged', () => {
      expect(normalizeYearMonth(2024, 1)).toEqual({ year: 2024, month: 1 });
      expect(normalizeYearMonth(2024, 12)).toEqual({ year: 2024, month: 12 });
    });

    it('rolls across year boundaries in both directions', () => {
      expect(normalizeYearMonth(2024, 0)).toEqual({ year: 2023, month: 12 });
      expect(normalizeYearMonth(2024, 13)).toEqual({ year: 2025, month: 1 });
      expect(normalizeYearMonth(2024, -1)).toEqual({ year: 2023, month: 11 });
      expect(normalizeYearMonth(2024, 25)).toEqual({ year: 2026, month: 1 });
      expect(normalizeYearMonth(0, -1)).toEqual({ year: -1, month: 11 });
    });

    it('truncates fractions and falls back for non-finite values', () => {
      expect(normalizeYearMonth(2024.9, 3.7)).toEqual({ year: 2024, month: 3 });
      expect(normalizeYearMonth(Number.NaN, 5)).toEqual({ year: 1, month: 5 });
      expect(normalizeYearMonth(2024, Number.POSITIVE_INFINITY)).toEqual({
        year: 2024,
        month: 1,
      });
    });
  });

  describe('addDaysToDateKey', () => {
    it('moves forward and backward across month and year boundaries', () => {
      expect(addDaysToDateKey('2024-02-28', 1)).toBe('2024-02-29');
      expect(addDaysToDateKey('2024-02-29', 1)).toBe('2024-03-01');
      expect(addDaysToDateKey('2024-12-31', 1)).toBe('2025-01-01');
      expect(addDaysToDateKey('2024-01-01', -1)).toBe('2023-12-31');
      expect(addDaysToDateKey('2024-03-31', 7)).toBe('2024-04-07');
    });

    it('returns null for an invalid key', () => {
      expect(addDaysToDateKey('2024-02-30', 1)).toBeNull();
      expect(addDaysToDateKey('not-a-date', 1)).toBeNull();
    });
  });

  describe('weekdayIndexOf', () => {
    it('positions days according to the first column', () => {
      expect(weekdayIndexOf('2024-01-01', 1)).toBe(0);
      expect(weekdayIndexOf('2024-01-01', 0)).toBe(1);
      expect(weekdayIndexOf('2024-01-07', 1)).toBe(6);
      expect(weekdayIndexOf('2024-01-07', 0)).toBe(0);
    });

    it('returns -1 for an invalid key', () => {
      expect(weekdayIndexOf('2024-13-01', 1)).toBe(-1);
    });
  });

  describe('buildMonthGrid', () => {
    const march2024 = {
      year: 2024,
      month: 3,
      firstDayOfWeek: 1 as const,
      today: '2024-03-15',
      selected: '2024-03-20',
      events: [
        event('a', '2024-03-05'),
        event('b', '2024-03-05'),
        event('c', '2024-03-20'),
        event('invalid', '2024-02-30'),
      ],
    };

    it('always builds a fixed six-week grid of seven cells', () => {
      const weeks = buildMonthGrid(march2024);

      expect(weeks).toHaveLength(6);
      for (const week of weeks) {
        expect(week.days).toHaveLength(7);
        expect(week.key).toBe(week.days[0].date);
      }
      expect(weeks.flatMap((week) => week.days)).toHaveLength(42);
    });

    it('starts on the configured weekday and marks outside-month cells', () => {
      const weeks = buildMonthGrid(march2024);
      const cells = weeks.flatMap((week) => week.days);

      // 1 March 2024 is a Friday, so a Monday-first grid starts on 26 February.
      expect(cells[0].date).toBe('2024-02-26');
      expect(cells[0].inMonth).toBe(false);
      expect(cells[4].date).toBe('2024-03-01');
      expect(cells[4].inMonth).toBe(true);
      expect(cells[34].date).toBe('2024-03-31');
      expect(cells[34].inMonth).toBe(true);
      expect(cells[35].date).toBe('2024-04-01');
      expect(cells[35].inMonth).toBe(false);
    });

    it('honours a Sunday-first grid', () => {
      const weeks = buildMonthGrid({ ...march2024, firstDayOfWeek: 0 });

      expect(weeks[0].days[0].date).toBe('2024-02-25');
    });

    it('projects today, selection and grouped events onto the cells', () => {
      const cells = buildMonthGrid(march2024).flatMap((week) => week.days);
      const today = cells.find((day) => day.date === '2024-03-15');
      const selected = cells.find((day) => day.date === '2024-03-20');
      const dual = cells.find((day) => day.date === '2024-03-05');

      expect(today?.isToday).toBe(true);
      expect(selected?.isSelected).toBe(true);
      expect(dual?.events.map((item) => item.id)).toEqual(['a', 'b']);
      expect(cells.some((day) => day.events.some((item) => item.id === 'invalid'))).toBe(
        false
      );
    });
  });

  describe('groupEventsByDate', () => {
    it('preserves host order within a date and ignores invalid dates', () => {
      const grouped = groupEventsByDate([
        event('one', '2024-06-01'),
        event('bad', '2024-06-31'),
        event('two', '2024-06-01'),
        event('three', toDateKey(new Date(2024, 5, 2))),
      ]);

      expect(grouped.get('2024-06-01')?.map((item) => item.id)).toEqual([
        'one',
        'two',
      ]);
      expect(grouped.get('2024-06-02')?.map((item) => item.id)).toEqual(['three']);
      expect(grouped.has('invalid')).toBe(false);
      expect([...grouped.keys()]).toEqual(['2024-06-01', '2024-06-02']);
    });
  });

  describe('localized labels', () => {
    it('formats the month heading and falls back for an invalid locale', () => {
      expect(formatMonthTitle(2024, 3, 'en-GB')).toBe('March 2024');
      expect(formatMonthTitle(2024, 3, '!!')).toBe('2024-03');
    });

    it('formats a full accessible day label and falls back to the raw key', () => {
      expect(formatDayLabel('2024-03-05', 'en-GB')).toContain('5 March 2024');
      expect(formatDayLabel('not-a-date', 'en-GB')).toBe('not-a-date');
    });

    it('returns seven short/long weekday pairs in grid order', () => {
      const mondayFirst = weekdayLabels(1, 'en-GB');

      expect(mondayFirst).toHaveLength(7);
      expect(mondayFirst[0]).toEqual({ short: 'Mon', long: 'Monday' });
      expect(mondayFirst[6]).toEqual({ short: 'Sun', long: 'Sunday' });
      expect(weekdayLabels(0, 'en-GB')[0]).toEqual({
        short: 'Sun',
        long: 'Sunday',
      });
    });
  });
});
