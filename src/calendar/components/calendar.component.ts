import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  CalendarDay,
  CalendarEvent,
  CalendarMonthChangeEvent,
  CalendarMonthDirection,
  CalendarSelectionEvent,
  CalendarWeekday,
} from './calendar.types';
import {
  addDaysToDateKey,
  buildMonthGrid,
  formatDayLabel,
  formatMonthTitle,
  normalizeDateKey,
  normalizeYearMonth,
  parseDateKey,
  toDateKey,
  weekdayIndexOf,
  weekdayLabels,
} from './calendar.utils';

let nextCalendarInstance = 0;

/**
 * Controlled month-grid calendar.
 *
 * The host owns the rendered month, the selection and the event list. This
 * component only renders them and emits the requested changes, so persisting,
 * scheduling and navigation policy stay outside the library.
 *
 * Features: a fixed six-week month grid, single-date selection, event markers
 * per date, month navigation (previous, next and today) and keyboard day
 * navigation with roving tabindex.
 *
 * @example
 * ```html
 * <decaf-calendar
 *   [year]="year()"
 *   [month]="month()"
 *   [selectedDate]="selected()"
 *   [events]="events()"
 *   label="Delivery calendar"
 *   previousMonthLabel="Previous month"
 *   nextMonthLabel="Next month"
 *   todayLabel="Today"
 *   (dateSelected)="selected.set($event.date)"
 *   (monthChange)="year.set($event.year); month.set($event.month)"
 * />
 * ```
 *
 * @category Calendar
 */
@Component({
  selector: 'decaf-calendar',
  standalone: true,
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'dcf-calendar-host',
  },
})
export class CalendarComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly generatedInstanceId = `decaf-calendar-${++nextCalendarInstance}`;

  /** Calendar year to render. */
  readonly year = input<number>(new Date().getFullYear());

  /** Calendar month to render, `1`-based. Out-of-range values roll into adjacent years. */
  readonly month = input<number>(new Date().getMonth() + 1);

  /** Selected local date in `YYYY-MM-DD` form, or `null` when nothing is selected. */
  readonly selectedDate = input<string | null>(null);

  /** Events and markers projected onto dates. Invalid dates are ignored. */
  readonly events = input<readonly CalendarEvent[]>([]);

  /** Local date considered today, in `YYYY-MM-DD` form. Defaults to the host's clock. */
  readonly today = input<string | null>(null);

  /** BCP 47 locale used for month and weekday names. */
  readonly locale = input('en-GB');

  /** First column of the week grid (`0` Sunday, `1` Monday). */
  readonly firstDayOfWeek = input<CalendarWeekday>(1);

  /** Accessible name of the calendar region. */
  readonly label = input('Calendar');

  /** Accessible name of the previous-month button. */
  readonly previousMonthLabel = input('Previous month');

  /** Accessible name of the next-month button. */
  readonly nextMonthLabel = input('Next month');

  /** Label of the today button. */
  readonly todayLabel = input('Today');

  /** Optional accessible id prefix; a per-instance id is generated otherwise. */
  readonly instanceId = input('');

  /** Emitted when a date cell is activated. */
  readonly dateSelected = output<CalendarSelectionEvent>();

  /** Emitted when the user requests a different month. */
  readonly monthChange = output<CalendarMonthChangeEvent>();

  private readonly focusDate = signal<string | null>(null);

  /** Resolved instance id used for template ids. */
  readonly resolvedInstanceId = computed(
    () => this.instanceId() || this.generatedInstanceId,
  );

  /** Resolved "today" key, preferring the deterministic input override. */
  readonly todayKey = computed(() => normalizeDateKey(this.today()) ?? toDateKey(new Date()));

  /** Requested year/month, normalized so navigation never renders an invalid grid. */
  readonly view = computed(() => {
    const now = new Date();
    const year = Number.isFinite(this.year()) ? this.year() : now.getFullYear();
    const month = Number.isFinite(this.month()) ? this.month() : now.getMonth() + 1;
    return normalizeYearMonth(year, month);
  });

  /** Localized month and year heading. */
  readonly monthTitle = computed(() =>
    formatMonthTitle(this.view().year, this.view().month, this.locale()),
  );

  /** Localized weekday labels in grid order. */
  readonly weekdays = computed(() =>
    weekdayLabels(this.firstDayOfWeek(), this.locale()),
  );

  /** Six weeks of day cells for the rendered month. */
  readonly weeks = computed(() =>
    buildMonthGrid({
      year: this.view().year,
      month: this.view().month,
      firstDayOfWeek: this.firstDayOfWeek(),
      today: this.todayKey(),
      selected: normalizeDateKey(this.selectedDate()),
      events: this.events(),
    }),
  );

  private readonly gridDates = computed(
    () => new Set(this.weeks().flatMap((week) => week.days.map((day) => day.date))),
  );

  /** Date that participates in the tab order; every other day is `tabindex="-1"`. */
  readonly tabbableDate = computed(() => {
    const focus = this.focusDate();
    if (focus && this.gridDates().has(focus)) {
      return focus;
    }
    const selected = normalizeDateKey(this.selectedDate());
    if (selected && this.gridDates().has(selected)) {
      return selected;
    }
    const today = this.todayKey();
    if (this.gridDates().has(today)) {
      return today;
    }
    const firstInMonth = this.weeks()
      .flatMap((week) => week.days)
      .find((day) => day.inMonth);
    return firstInMonth?.date ?? null;
  });

  /**
   * Builds the accessible name of a day cell, including its projected events.
   *
   * @param day - Rendered day cell.
   * @returns Localized full date plus the titles of its events.
   */
  dayAriaLabel(day: CalendarDay): string {
    const label = formatDayLabel(day.date, this.locale());
    const titles = day.events
      .map((event) => event.title)
      .filter((title) => Boolean(title));
    return titles.length ? `${label}: ${titles.join(', ')}` : label;
  }

  /** Requests the previous month. Does not change the rendered month by itself. */
  previousMonth(): void {
    const view = this.view();
    this.emitMonthChange(view.year, view.month - 1, 'previous');
  }

  /** Requests the next month. Does not change the rendered month by itself. */
  nextMonth(): void {
    const view = this.view();
    this.emitMonthChange(view.year, view.month + 1, 'next');
  }

  /** Requests the month of the resolved today and selects today. */
  goToToday(): void {
    const today = this.todayKey();
    const date = parseDateKey(today);
    if (!date) {
      return;
    }
    this.focusDate.set(today);
    this.emitMonthChange(date.getFullYear(), date.getMonth() + 1, 'today');
    this.selectDate(today);
    this.focusAfterRender(today);
  }

  /** Selects a day cell and emits the selection event. */
  select(day: CalendarDay): void {
    this.focusDate.set(day.date);
    this.selectDate(day.date);
  }

  /**
   * Keyboard navigation over the grid: arrows move by day/week, Home and End
   * jump to the edges of the week. Moving into another month also requests it.
   */
  onDayKeydown(event: KeyboardEvent, day: CalendarDay): void {
    let offset: number | null = null;
    switch (event.key) {
      case 'ArrowLeft':
        offset = -1;
        break;
      case 'ArrowRight':
        offset = 1;
        break;
      case 'ArrowUp':
        offset = -7;
        break;
      case 'ArrowDown':
        offset = 7;
        break;
      case 'Home':
        offset = -weekdayIndexOf(day.date, this.firstDayOfWeek());
        break;
      case 'End':
        offset = 6 - weekdayIndexOf(day.date, this.firstDayOfWeek());
        break;
      default:
        return;
    }

    event.preventDefault();
    const target = addDaysToDateKey(day.date, offset);
    if (!target) {
      return;
    }

    this.focusDate.set(target);
    const targetDate = parseDateKey(target);
    const view = this.view();
    if (
      targetDate &&
      (targetDate.getFullYear() !== view.year ||
        targetDate.getMonth() + 1 !== view.month)
    ) {
      const direction: CalendarMonthDirection =
        targetDate.getFullYear() < view.year ||
        (targetDate.getFullYear() === view.year &&
          targetDate.getMonth() + 1 < view.month)
          ? 'previous'
          : 'next';
      this.emitMonthChange(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        direction,
      );
    }

    this.focusAfterRender(target);
  }

  private selectDate(key: string): void {
    const date = parseDateKey(key);
    if (!date) {
      return;
    }
    this.dateSelected.emit({
      date: key,
      previousDate: normalizeDateKey(this.selectedDate()),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    });
  }

  private emitMonthChange(
    year: number,
    month: number,
    direction: CalendarMonthDirection,
  ): void {
    const view = this.view();
    const target = normalizeYearMonth(year, month);
    this.monthChange.emit({
      year: target.year,
      month: target.month,
      previousYear: view.year,
      previousMonth: view.month,
      direction,
    });
  }

  private focusAfterRender(key: string): void {
    afterNextRender(() => this.focusDay(key), { injector: this.injector });
  }

  private focusDay(key: string): void {
    const button = this.host.nativeElement.querySelector<HTMLElement>(
      `[data-calendar-date="${key}"]`,
    );
    button?.focus();
  }
}
