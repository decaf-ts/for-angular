/**
 * @module for-angular/app/pages/calendar/calendar.page.spec
 * @summary SAA-1484 `/calendar` demo page contract.
 * @description Proves the page owns the controlled calendar state: month-change
 * and selection round-trips, the add/remove event playground, derived counts,
 * reset, locale resolution and the last-event status signal. Rendered/grid
 * behaviour is covered by the component spec and the Playwright suite.
 */
import type { Signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import type {
  CalendarEvent,
  CalendarMonthChangeEvent,
  CalendarSelectionEvent,
} from '@decaf-ts/for-angular/calendar';
import { CalendarPage } from './calendar.page';

interface CalendarPageInternals {
  todayKey: string;
  locale: WritableSignal<string>;
  year: WritableSignal<number>;
  month: WritableSignal<number>;
  selectedDate: WritableSignal<string>;
  events: WritableSignal<CalendarEvent[]>;
  newEventTitle: WritableSignal<string>;
  newEventColor: WritableSignal<string>;
  lastEventKey: WritableSignal<string>;
  lastEventParams: Signal<Record<string, unknown>>;
  selectedEvents: Signal<CalendarEvent[]>;
  selectedEventCount: Signal<number>;
  canAddEvent: Signal<boolean>;
  onMonthChange(event: CalendarMonthChangeEvent): void;
  onDateSelected(event: CalendarSelectionEvent): void;
  onEventTitleInput(event: Event): void;
  onEventColorChange(event: Event): void;
  onAddEvent(event: Event): void;
  onRemoveEvent(event: CalendarEvent): void;
  reset(): void;
}

const translate = {
  getCurrentLang: () => 'en',
  instant: (key: string) => key,
  onLangChange: {
    subscribe: () => ({ unsubscribe: () => undefined }),
  },
};

function createPage(language = 'en'): CalendarPageInternals {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: TranslateService,
        useValue: { ...translate, getCurrentLang: () => language },
      },
    ],
  });
  return TestBed.runInInjectionContext(
    () => new CalendarPage()
  ) as unknown as CalendarPageInternals;
}

function valueEvent(value: string): Event {
  return { target: { value } } as unknown as Event;
}

function submitEvent(): Event {
  return { preventDefault: () => undefined } as unknown as Event;
}

function selection(date: string, previousDate: string | null = null): CalendarSelectionEvent {
  const [year, month, day] = date.split('-').map(Number);
  return { date, previousDate, year, month, day };
}

describe('CalendarPage — controlled state and event playground (SAA-1484)', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('seeds the current month, today selection and the four demo events', () => {
    const page = createPage();

    expect(page.year()).toBeGreaterThan(2000);
    expect(page.month()).toBeGreaterThanOrEqual(1);
    expect(page.month()).toBeLessThanOrEqual(12);
    expect(page.selectedDate()).toBe(page.todayKey);
    expect(page.events()).toHaveLength(4);
    expect(page.selectedEvents()).toHaveLength(1);
    expect(page.selectedEvents()[0].title).toBe('Design review');
    expect(page.selectedEventCount()).toBe(1);
    expect(page.canAddEvent()).toBe(false);
    expect(page.lastEventKey()).toBe('calendar.status.none');
    expect(page.locale()).toBe('en-GB');
  });

  it('maps the locale to pt-PT for Portuguese hosts', () => {
    const page = createPage('pt-BR');

    expect(page.locale()).toBe('pt-PT');
  });

  it('applies a month change to the controlled view and records the status', () => {
    const page = createPage();

    page.onMonthChange({
      year: 2024,
      month: 4,
      previousYear: 2024,
      previousMonth: 3,
      direction: 'next',
    });

    expect(page.year()).toBe(2024);
    expect(page.month()).toBe(4);
    expect(page.lastEventKey()).toBe('calendar.status.month');
    expect(page.lastEventParams()).toEqual({
      month: 'April 2024',
      direction: 'calendar.direction.next',
    });
  });

  it('selects a date and derives the events of that date', () => {
    const page = createPage();

    page.onDateSelected(selection('2024-04-20', page.todayKey));

    expect(page.selectedDate()).toBe('2024-04-20');
    expect(page.selectedEvents()).toEqual([]);
    expect(page.selectedEventCount()).toBe(0);
    expect(page.lastEventKey()).toBe('calendar.status.selected');
    expect(page.lastEventParams()).toEqual({ date: '2024-04-20' });
  });

  it('adds an event to the selected date with the chosen colour', () => {
    const page = createPage();
    page.onDateSelected(selection('2024-04-20'));

    page.onEventTitleInput(valueEvent('  Sprint review  '));
    expect(page.canAddEvent()).toBe(true);
    page.onEventColorChange(valueEvent('#16a34a'));
    page.onAddEvent(submitEvent());

    expect(page.events()).toHaveLength(5);
    expect(page.selectedEvents()).toEqual([
      {
        id: 'demo-event-5',
        date: '2024-04-20',
        title: 'Sprint review',
        color: '#16a34a',
      },
    ]);
    expect(page.selectedEventCount()).toBe(1);
    expect(page.newEventTitle()).toBe('');
    expect(page.canAddEvent()).toBe(false);
    expect(page.lastEventKey()).toBe('calendar.status.event_added');
    expect(page.lastEventParams()).toEqual({ title: 'Sprint review' });
  });

  it('does not add an event for a blank title', () => {
    const page = createPage();

    page.onEventTitleInput(valueEvent('   '));
    expect(page.canAddEvent()).toBe(false);
    page.onAddEvent(submitEvent());

    expect(page.events()).toHaveLength(4);
    expect(page.lastEventKey()).toBe('calendar.status.none');
  });

  it('removes an event by id and records the removal', () => {
    const page = createPage();
    const target = page.selectedEvents()[0];

    page.onRemoveEvent(target);

    expect(page.events()).toHaveLength(3);
    expect(page.events().some((event) => event.id === target.id)).toBe(false);
    expect(page.selectedEvents()).toEqual([]);
    expect(page.lastEventKey()).toBe('calendar.status.event_removed');
    expect(page.lastEventParams()).toEqual({ title: 'Design review' });
  });

  it('reset restores the seeded month, selection, events and status', () => {
    const page = createPage();
    page.onMonthChange({
      year: 2023,
      month: 12,
      previousYear: 2024,
      previousMonth: 1,
      direction: 'previous',
    });
    page.onDateSelected(selection('2023-12-24'));
    page.onEventTitleInput(valueEvent('Temporary'));
    page.onAddEvent(submitEvent());

    page.reset();

    expect(page.year()).toBe(Number(page.todayKey.slice(0, 4)));
    expect(page.month()).toBe(Number(page.todayKey.slice(5, 7)));
    expect(page.selectedDate()).toBe(page.todayKey);
    expect(page.events()).toHaveLength(4);
    expect(page.newEventTitle()).toBe('');
    expect(page.newEventColor()).toBe('#2563eb');
    expect(page.canAddEvent()).toBe(false);
    expect(page.lastEventKey()).toBe('calendar.status.none');
    expect(page.lastEventParams()).toEqual({});
  });
});
