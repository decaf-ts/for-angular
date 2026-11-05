# `@decaf-ts/for-angular/calendar`

A small, in-house month-grid calendar for embedding in Decaf Angular screens. It
renders a fixed six-week grid, a single date selection, host-owned event markers
and month navigation. The entry point adds **no runtime dependency** of its own:
it imports only `@angular/*` and uses the platform `Intl` API for month and
weekday names.

The calendar is presentation only. It does not schedule, persist, load or
validate events, and it owns no month or selection state. Sprint/backlog
semantics live in [`/scrum`](../scrum) and timeline scheduling lives in
[`/gantt`](../gantt); `/calendar` only shows what the host supplies.

## Install

```bash
npm install @decaf-ts/for-angular
```

No extra peer is required for this entry point.

### Compatibility

| Package | Tested range |
| --- | --- |
| `@angular/*` | `21.2.17` – `21.2.25` |
| `@decaf-ts/for-angular` | `0.11.x` |

## Controlled-view contract

The host owns:

- the rendered `year` and `month`;
- the single `selectedDate`;
- the `events` projected onto dates;
- what happens after a selection or month request.

`dateSelected` and `monthChange` are requests/notifications, never internal
mutations. Advancing the month in the UI requires the host to apply the emitted
`year`/`month` back to the component. This keeps URL state, data loading and
permission policy in the application.

## Usage

```ts
import { Component, signal } from '@angular/core';
import {
  CalendarComponent,
  type CalendarEvent,
  type CalendarMonthChangeEvent,
  type CalendarSelectionEvent,
} from '@decaf-ts/for-angular/calendar';

interface Booking {
  reference: string;
}

@Component({
  standalone: true,
  imports: [CalendarComponent],
  template: `
    <decaf-calendar
      [year]="year()"
      [month]="month()"
      [selectedDate]="selectedDate()"
      [events]="events"
      [locale]="'en-GB'"
      label="Bookings"
      previousMonthLabel="Previous month"
      nextMonthLabel="Next month"
      todayLabel="Today"
      (dateSelected)="onSelected($event)"
      (monthChange)="onMonthChange($event)"
    />
  `,
})
export class BookingsCalendarComponent {
  readonly today = new Date();
  readonly year = signal(this.today.getFullYear());
  readonly month = signal(this.today.getMonth() + 1);
  readonly selectedDate = signal<string | null>(null);

  readonly events: CalendarEvent<Booking>[] = [
    {
      id: 'booking-1',
      date: '2026-10-25',
      title: 'Site visit',
      color: '#2563eb',
      data: { reference: 'B-1042' },
    },
  ];

  onSelected(event: CalendarSelectionEvent): void {
    this.selectedDate.set(event.date);
  }

  onMonthChange(event: CalendarMonthChangeEvent): void {
    this.year.set(event.year);
    this.month.set(event.month);
  }
}
```

## API summary

### Inputs

| Input | Default | Purpose |
| --- | --- | --- |
| `year` | current year | Calendar year to render. |
| `month` | current month | Calendar month to render, `1`-based; out-of-range values roll into adjacent years. |
| `selectedDate` | `null` | Selected local date in `YYYY-MM-DD` form. |
| `events` | `[]` | Events/markers projected onto dates. Invalid dates are ignored. |
| `today` | host clock | Override for the date marked as today. Use in deterministic hosts/tests. |
| `locale` | `en-GB` | BCP 47 locale for month, weekday and accessible date labels. |
| `firstDayOfWeek` | `1` (Monday) | First grid column (`0` Sunday). |
| `label` | `Calendar` | Accessible name of the calendar region. |
| `previousMonthLabel` | `Previous month` | Accessible name of the previous-month button. |
| `nextMonthLabel` | `Next month` | Accessible name of the next-month button. |
| `todayLabel` | `Today` | Visible label of the today button. |
| `instanceId` | generated | Optional prefix for template ids. |

Every label input is a plain string so the application can resolve it through
its own i18n (`@ngx-translate`). The library itself ships no visible hardcoded
copy beyond the English fallback of those inputs.

### Outputs

| Output | Payload |
| --- | --- |
| `dateSelected` | `{ date, previousDate, year, month, day }` |
| `monthChange` | `{ year, month, previousYear, previousMonth, direction }` where `direction` is `previous`, `next` or `today` |

`goToToday()` requests the current month and selects the resolved today.

## Dates and events

- Date keys are **local** calendar dates (`YYYY-MM-DD`). They are never parsed
  as UTC instants, so `2026-10-05` stays 5 October in every timezone.
- Invalid keys and `Date` values are rejected; invalid event dates are skipped
  without breaking the grid.
- Event order is preserved. A day shows up to three colour dots plus a `+N`
  overflow counter.
- The grid always has 42 cells (six weeks), including leading/trailing days from
  adjacent months. Those cells are marked `inMonth: false` and remain selectable.
- `CalendarEvent.id` must be unique within the supplied list; it is used as the
  template tracking key.

## Pure helpers

The date math is exported for hosts and tests:

| Helper | Purpose |
| --- | --- |
| `toDateKey` / `normalizeDateKey` | Convert a `Date` or value to a local `YYYY-MM-DD` key. |
| `parseDateKey` | Parse a strict local date key; returns `null` when invalid. |
| `normalizeYearMonth` | Roll any year/month pair into the valid `1..12` range. |
| `addDaysToDateKey` | Add/subtract days while staying in local time. |
| `weekdayIndexOf` | Position of a date in its week for a configured first column. |
| `buildMonthGrid` | Build the six-week `CalendarWeek[]` projection. |
| `groupEventsByDate` | Group host events by local date key. |
| `formatMonthTitle` / `formatDayLabel` / `weekdayLabels` | `Intl`-backed labels. |

## Accessibility

- The grid exposes `role="grid"` with rows, column headers and `gridcell` day
  buttons. The selected cell carries `aria-selected`; today carries
  `aria-current="date"`.
- Roving tabindex: one cell is tabbable, the rest are reachable with arrow keys.
  `ArrowLeft`/`ArrowRight` move by a day, `ArrowUp`/`ArrowDown` by a week, `Home`
  and `End` jump to the week edges. Moving past the grid requests the target
  month.
- Day accessible names include the full localized date plus event titles.
- Visible focus rings, `prefers-reduced-motion` and `forced-colors` handling are
  included, and interactive targets stay at least `2.25rem` high.
- The component is renderer-only: no import-time code touches `window` or
  `document`, so it is safe to render on the server.

## Licensing

`/calendar` introduces **no new runtime dependency, stylesheet, font or asset**.
It uses only the Angular framework and the standard `Intl` API, so there is no
additional SPDX entry for this entry point.
