/**
 * @module for-angular/calendar/calendar.component.spec
 * @summary SAA-1484 component contract for the controlled month-grid calendar.
 * @description Proves the grid/day rendering, selection and month-change output
 * emission, host-controlled view, event markers, roving-tabindex keyboard
 * navigation and the accessible day labels of `CalendarComponent`.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type {
  CalendarEvent,
  CalendarMonthChangeEvent,
  CalendarSelectionEvent,
} from './calendar.types';
import { CalendarComponent } from './calendar.component';

interface CalendarInputs {
  year?: number;
  month?: number;
  selectedDate?: string | null;
  events?: readonly CalendarEvent[];
  today?: string | null;
  locale?: string;
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function render(inputs: CalendarInputs = {}): ComponentFixture<CalendarComponent> {
  TestBed.configureTestingModule({});
  const fixture = TestBed.createComponent(CalendarComponent);
  const defaults: CalendarInputs = {
    year: 2024,
    month: 3,
    selectedDate: null,
    events: [],
    today: '2024-03-15',
    locale: 'en-GB',
    firstDayOfWeek: 1,
  };
  for (const [name, value] of Object.entries({ ...defaults, ...inputs })) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

function dayButton(
  fixture: ComponentFixture<CalendarComponent>,
  key: string
): HTMLButtonElement {
  const button = fixture.nativeElement.querySelector(
    `[data-calendar-date="${key}"]`
  ) as HTMLButtonElement | null;
  if (!button) {
    throw new Error(`No day button rendered for ${key}`);
  }
  return button;
}

function press(
  fixture: ComponentFixture<CalendarComponent>,
  key: string,
  button: HTMLButtonElement
): void {
  button.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  );
  fixture.detectChanges();
}

describe('CalendarComponent — month grid (SAA-1484)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders seven weekday headers and a fixed forty-two-cell grid', () => {
    const fixture = render();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
    expect(host.querySelectorAll('[role="gridcell"]')).toHaveLength(42);
    expect(host.querySelectorAll('.dcf-calendar__week')).toHaveLength(6);
    expect(host.querySelector('.dcf-calendar__title')?.textContent).toContain(
      'March 2024'
    );
    expect(
      host.querySelector('.dcf-calendar__title')?.getAttribute('aria-live')
    ).toBe('polite');
    expect(
      host.querySelector('.dcf-calendar__grid')?.getAttribute('role')
    ).toBe('grid');
  });

  it('normalizes an out-of-range month into the adjacent year', () => {
    const fixture = render({ year: 2024, month: 13, today: '2025-01-10' });

    expect(fixture.componentInstance.view()).toEqual({ year: 2025, month: 1 });
    expect(fixture.componentInstance.monthTitle()).toContain('January 2025');
    expect(fixture.nativeElement.querySelector('[role="gridcell"]')).not.toBeNull();
  });

  it('emits the selection with the previous date and marks the selected day', () => {
    const fixture = render({ selectedDate: '2024-03-01' });
    const emitted: CalendarSelectionEvent[] = [];
    fixture.componentInstance.dateSelected.subscribe((event) =>
      emitted.push(event)
    );

    expect(dayButton(fixture, '2024-03-01').getAttribute('aria-selected')).toBe(
      'true'
    );

    dayButton(fixture, '2024-03-05').click();

    expect(emitted).toEqual([
      {
        date: '2024-03-05',
        previousDate: '2024-03-01',
        year: 2024,
        month: 3,
        day: 5,
      },
    ]);
  });

  it('emits normalized month changes without changing the controlled view', () => {
    const fixture = render({ year: 2024, month: 1 });
    const emitted: CalendarMonthChangeEvent[] = [];
    fixture.componentInstance.monthChange.subscribe((event) => emitted.push(event));
    const host: HTMLElement = fixture.nativeElement;

    (
      host.querySelector('[data-calendar-nav="previous"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(emitted.at(-1)).toEqual({
      year: 2023,
      month: 12,
      previousYear: 2024,
      previousMonth: 1,
      direction: 'previous',
    });
    expect(fixture.componentInstance.view()).toEqual({ year: 2024, month: 1 });
    expect(host.querySelector('.dcf-calendar__title')?.textContent).toContain(
      'January 2024'
    );

    (
      host.querySelector('[data-calendar-nav="next"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(emitted.at(-1)).toEqual({
      year: 2024,
      month: 2,
      previousYear: 2024,
      previousMonth: 1,
      direction: 'next',
    });
  });

  it('today requests the today month and selects the today date', () => {
    const fixture = render({ year: 2024, month: 1, today: '2024-03-15' });
    const monthEvents: CalendarMonthChangeEvent[] = [];
    const selectionEvents: CalendarSelectionEvent[] = [];
    fixture.componentInstance.monthChange.subscribe((event) =>
      monthEvents.push(event)
    );
    fixture.componentInstance.dateSelected.subscribe((event) =>
      selectionEvents.push(event)
    );

    (
      fixture.nativeElement.querySelector(
        '[data-calendar-nav="today"]'
      ) as HTMLButtonElement
    ).click();

    expect(monthEvents.at(-1)).toEqual({
      year: 2024,
      month: 3,
      previousYear: 2024,
      previousMonth: 1,
      direction: 'today',
    });
    expect(selectionEvents.at(-1)?.date).toBe('2024-03-15');
    // The component is controlled: the host must apply the emitted month.
    expect(fixture.componentInstance.view()).toEqual({ year: 2024, month: 1 });
  });

  it('marks the today cell with aria-current', () => {
    const fixture = render({ year: 2024, month: 3, today: '2024-03-15' });

    expect(dayButton(fixture, '2024-03-15').getAttribute('aria-current')).toBe(
      'date'
    );
    expect(
      fixture.nativeElement.querySelectorAll(
        '[role="gridcell"][aria-current="date"]'
      )
    ).toHaveLength(1);
  });

  it('renders at most three event markers plus an overflow count', () => {
    const events: CalendarEvent[] = [
      { id: 'one', date: '2024-03-10', title: 'One' },
      { id: 'two', date: '2024-03-10', title: 'Two' },
      { id: 'three', date: '2024-03-10', title: 'Three' },
      { id: 'four', date: '2024-03-10', title: 'Four' },
      { id: 'invalid', date: '2024-02-30', title: 'Invalid' },
    ];
    const fixture = render({ events });
    const cell = dayButton(fixture, '2024-03-10');

    expect(cell.querySelectorAll('.dcf-calendar__marker')).toHaveLength(3);
    expect(cell.querySelector('.dcf-calendar__marker-more')?.textContent).toContain(
      '+1'
    );
    expect(cell.getAttribute('aria-label')).toContain(
      'One, Two, Three, Four'
    );
    expect(fixture.nativeElement.querySelectorAll('.dcf-calendar__marker')).toHaveLength(
      3
    );
  });

  it('keeps exactly one day in the tab order using the selected date', () => {
    const fixture = render({ selectedDate: '2024-03-12' });

    const tabbable = fixture.nativeElement.querySelectorAll(
      '[role="gridcell"][tabindex="0"]'
    );
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].getAttribute('data-calendar-date')).toBe('2024-03-12');
    expect(
      fixture.nativeElement.querySelectorAll('[role="gridcell"][tabindex="-1"]')
    ).toHaveLength(41);
  });

  it('falls back to today, then the first in-month day, for the tab stop', () => {
    const withToday = render({ today: '2024-03-15' });
    expect(
      withToday.nativeElement
        .querySelector('[role="gridcell"][tabindex="0"]')
        ?.getAttribute('data-calendar-date')
    ).toBe('2024-03-15');

    withToday.componentRef.setInput('today', '2024-01-01');
    withToday.detectChanges();
    expect(
      withToday.nativeElement
        .querySelector('[role="gridcell"][tabindex="0"]')
        ?.getAttribute('data-calendar-date')
    ).toBe('2024-03-01');
  });

  it('moves the roving tab stop with arrow, Home and End keys', () => {
    const fixture = render({ selectedDate: '2024-03-13' });

    press(fixture, 'ArrowRight', dayButton(fixture, '2024-03-13'));
    expect(
      fixture.nativeElement
        .querySelector('[role="gridcell"][tabindex="0"]')
        ?.getAttribute('data-calendar-date')
    ).toBe('2024-03-14');

    press(fixture, 'ArrowDown', dayButton(fixture, '2024-03-14'));
    expect(fixture.componentInstance.tabbableDate()).toBe('2024-03-21');

    press(fixture, 'Home', dayButton(fixture, '2024-03-21'));
    expect(fixture.componentInstance.tabbableDate()).toBe('2024-03-18');

    press(fixture, 'End', dayButton(fixture, '2024-03-18'));
    expect(fixture.componentInstance.tabbableDate()).toBe('2024-03-24');

    press(fixture, 'ArrowUp', dayButton(fixture, '2024-03-24'));
    expect(fixture.componentInstance.tabbableDate()).toBe('2024-03-17');

    press(fixture, 'ArrowLeft', dayButton(fixture, '2024-03-17'));
    expect(fixture.componentInstance.tabbableDate()).toBe('2024-03-16');
  });

  it('requests the adjacent month when keyboard navigation crosses a boundary', () => {
    const fixture = render({ selectedDate: '2024-03-31' });
    const emitted: CalendarMonthChangeEvent[] = [];
    fixture.componentInstance.monthChange.subscribe((event) => emitted.push(event));

    press(fixture, 'ArrowRight', dayButton(fixture, '2024-03-31'));
    expect(emitted.at(-1)).toEqual({
      year: 2024,
      month: 4,
      previousYear: 2024,
      previousMonth: 3,
      direction: 'next',
    });

    fixture.componentRef.setInput('selectedDate', '2024-03-01');
    fixture.detectChanges();
    press(fixture, 'ArrowLeft', dayButton(fixture, '2024-03-01'));
    expect(emitted.at(-1)).toEqual({
      year: 2024,
      month: 2,
      previousYear: 2024,
      previousMonth: 3,
      direction: 'previous',
    });
  });

  it('builds the accessible day label from the date and event titles', () => {
    const fixture = render({
      events: [{ id: 'e', date: '2024-03-10', title: 'Design review' }],
    });
    const day = fixture.componentInstance
      .weeks()
      .flatMap((week) => week.days)
      .find((candidate) => candidate.date === '2024-03-10');

    expect(day).toBeDefined();
    expect(fixture.componentInstance.dayAriaLabel(day!)).toContain(
      '10 March 2024'
    );
    expect(fixture.componentInstance.dayAriaLabel(day!)).toContain(
      'Design review'
    );
  });
});
