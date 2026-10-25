/**
 * Day of the week used as the first column of the month grid.
 *
 * `0` is Sunday and `1` is Monday, matching `Date.prototype.getDay()`.
 *
 * @category Calendar
 */
export type CalendarWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Direction of a requested month change.
 *
 * @category Calendar
 */
export type CalendarMonthDirection = 'previous' | 'next' | 'today';

/**
 * Host-owned event or marker projected onto a calendar date.
 *
 * The calendar is presentation only: it renders the supplied events and never
 * creates, edits, persists or schedules them.
 *
 * @property id - Stable unique identifier of the event within the host list.
 * @property date - Local calendar date in `YYYY-MM-DD` form.
 * @property title - Human-readable event title used for markers and accessible labels.
 * @property color - Optional CSS colour applied to the day marker.
 * @property data - Optional host payload carried through untouched.
 *
 * @typeParam T - Host payload type carried in {@link CalendarEvent.data}.
 * @category Calendar
 */
export interface CalendarEvent<T = unknown> {
  readonly id: string;
  readonly date: string;
  readonly title: string;
  readonly color?: string;
  readonly data?: T;
}

/**
 * One rendered cell of the month grid.
 *
 * @property date - Local calendar date in `YYYY-MM-DD` form.
 * @property year - Calendar year of the cell.
 * @property month - Calendar month of the cell, `1`-based.
 * @property day - Day of the month of the cell.
 * @property inMonth - Whether the cell belongs to the rendered month or is a
 * leading/trailing day from an adjacent month.
 * @property isToday - Whether the cell matches the resolved today.
 * @property isSelected - Whether the cell matches {@link CalendarComponent.selectedDate}.
 * @property events - Events projected onto the cell, in host order.
 *
 * @category Calendar
 */
export interface CalendarDay {
  readonly date: string;
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly isSelected: boolean;
  readonly events: readonly CalendarEvent[];
}

/**
 * One row of the month grid.
 *
 * @property key - Stable key for template tracking (`YYYY-MM-DD` of the first cell).
 * @property days - The seven cells of the row.
 *
 * @category Calendar
 */
export interface CalendarWeek {
  readonly key: string;
  readonly days: readonly CalendarDay[];
}

/**
 * Emitted when a date cell is activated.
 *
 * @property date - Newly selected local date in `YYYY-MM-DD` form.
 * @property previousDate - Previously selected date, or `null` when nothing was selected.
 * @property year - Calendar year of the selected date.
 * @property month - Calendar month of the selected date, `1`-based.
 * @property day - Day of the month of the selected date.
 *
 * @category Calendar
 */
export interface CalendarSelectionEvent {
  readonly date: string;
  readonly previousDate: string | null;
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * Emitted when the user requests a different month.
 *
 * The component is controlled: it does not change the rendered month itself.
 * The host updates `year` and `month` after accepting the request.
 *
 * @property year - Requested calendar year.
 * @property month - Requested calendar month, `1`-based.
 * @property previousYear - Calendar year rendered before the request.
 * @property previousMonth - Calendar month rendered before the request, `1`-based.
 * @property direction - How the request was triggered.
 *
 * @category Calendar
 */
export interface CalendarMonthChangeEvent {
  readonly year: number;
  readonly month: number;
  readonly previousYear: number;
  readonly previousMonth: number;
  readonly direction: CalendarMonthDirection;
}

/**
 * Options accepted by {@link buildMonthGrid}.
 *
 * @property year - Calendar year to render.
 * @property month - Calendar month to render, `1`-based.
 * @property firstDayOfWeek - First column of the grid.
 * @property today - Local date considered today, in `YYYY-MM-DD` form.
 * @property selected - Selected local date, in `YYYY-MM-DD` form, or `null`.
 * @property events - Host events projected onto the grid.
 *
 * @category Calendar
 */
export interface CalendarMonthGridOptions {
  readonly year: number;
  readonly month: number;
  readonly firstDayOfWeek: CalendarWeekday;
  readonly today: string;
  readonly selected: string | null;
  readonly events: readonly CalendarEvent[];
}

/**
 * Short and full label pair of one weekday column.
 *
 * @property short - Abbreviated label rendered in the column header.
 * @property long - Full label used as the column header accessible name.
 *
 * @category Calendar
 */
export interface CalendarWeekdayLabel {
  readonly short: string;
  readonly long: string;
}
