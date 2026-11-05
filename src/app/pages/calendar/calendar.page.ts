import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  ViewChild,
  afterNextRender,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IonContent } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  CalendarComponent,
  addDaysToDateKey,
  formatMonthTitle,
  toDateKey,
  type CalendarEvent,
  type CalendarMonthChangeEvent,
  type CalendarSelectionEvent,
} from '@decaf-ts/for-angular/calendar';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { ContainerComponent } from 'src/lib/components';

interface EventColor {
  readonly id: string;
  readonly value: string;
  readonly labelKey: string;
}

const EVENT_COLORS: EventColor[] = [
  { id: 'blue', value: '#2563eb', labelKey: 'calendar.colors.blue' },
  { id: 'green', value: '#16a34a', labelKey: 'calendar.colors.green' },
  { id: 'amber', value: '#d97706', labelKey: 'calendar.colors.amber' },
  { id: 'red', value: '#dc2626', labelKey: 'calendar.colors.red' },
];

const SEED_EVENTS = [
  { title: 'Design review', offset: 0, color: EVENT_COLORS[0].value },
  { title: 'Release window', offset: 2, color: EVENT_COLORS[1].value },
  { title: 'Team sync', offset: 5, color: EVENT_COLORS[2].value },
  { title: 'Retrospective', offset: -3, color: EVENT_COLORS[3].value },
];

function createInitialEvents(todayKey: string): CalendarEvent[] {
  return SEED_EVENTS.flatMap((seed, index) => {
    const date = addDaysToDateKey(todayKey, seed.offset);
    return date
      ? [
          {
            id: `demo-event-${index + 1}`,
            date,
            title: seed.title,
            color: seed.color,
          },
        ]
      : [];
  });
}

/**
 * `/calendar` demo page: drives `CalendarComponent` with host-owned year, month,
 * selection and events, and adds an in-page event playground (colour, add and
 * remove) so the controlled-view contract can be exercised end to end.
 *
 * @category Demo Pages
 */
@Component({
  selector: 'app-calendar-page',
  imports: [
    IonContent,
    HeaderComponent,
    ContainerComponent,
    TranslatePipe,
    CalendarComponent,
  ],
  templateUrl: './calendar.page.html',
  styleUrl: './calendar.page.scss',
})
export class CalendarPage {
  @ViewChild('eventTitleInput')
  private eventTitleInput?: ElementRef<HTMLInputElement>;

  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly today = new Date();

  protected readonly todayKey = toDateKey(this.today);

  protected readonly locale = signal(
    this.resolveLocale(String(this.translate.getCurrentLang())),
  );

  protected readonly year = signal(this.today.getFullYear());

  protected readonly month = signal(this.today.getMonth() + 1);

  protected readonly selectedDate = signal(this.todayKey);

  protected readonly events = signal<CalendarEvent[]>(
    createInitialEvents(this.todayKey),
  );

  protected readonly newEventTitle = signal('');

  protected readonly newEventColor = signal(EVENT_COLORS[0].value);

  protected readonly colors = EVENT_COLORS;

  protected readonly lastEventKey = signal('calendar.status.none');

  protected readonly lastEventParams = signal<Record<string, unknown>>({});

  private nextEventId = SEED_EVENTS.length + 1;

  protected readonly selectedEvents = computed(() =>
    this.events().filter((event) => event.date === this.selectedDate()),
  );

  protected readonly selectedEventCount = computed(
    () => this.selectedEvents().length,
  );

  protected readonly canAddEvent = computed(
    () => this.newEventTitle().trim().length > 0,
  );

  constructor() {
    const subscription = this.translate.onLangChange.subscribe((change) => {
      this.locale.set(this.resolveLocale(String(change.lang)));
    });
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  protected onMonthChange(event: CalendarMonthChangeEvent): void {
    this.year.set(event.year);
    this.month.set(event.month);
    this.setLastEvent('calendar.status.month', {
      month: formatMonthTitle(event.year, event.month, this.locale()),
      direction: this.translate.instant(`calendar.direction.${event.direction}`),
    });
  }

  protected onDateSelected(event: CalendarSelectionEvent): void {
    this.selectedDate.set(event.date);
    this.setLastEvent('calendar.status.selected', { date: event.date });
  }

  protected onEventTitleInput(event: Event): void {
    this.newEventTitle.set((event.target as HTMLInputElement).value);
  }

  protected onEventColorChange(event: Event): void {
    this.newEventColor.set((event.target as HTMLSelectElement).value);
  }

  protected onAddEvent(event: Event): void {
    event.preventDefault();
    const title = this.newEventTitle().trim();
    if (!title) {
      return;
    }
    const created: CalendarEvent = {
      id: `demo-event-${this.nextEventId++}`,
      date: this.selectedDate(),
      title,
      color: this.newEventColor(),
    };
    this.events.update((events) => [...events, created]);
    this.newEventTitle.set('');
    this.setLastEvent('calendar.status.event_added', { title });
    afterNextRender(() => this.eventTitleInput?.nativeElement.focus(), {
      injector: this.injector,
    });
  }

  protected onRemoveEvent(event: CalendarEvent): void {
    this.events.update((events) =>
      events.filter((candidate) => candidate.id !== event.id),
    );
    this.setLastEvent('calendar.status.event_removed', { title: event.title });
  }

  protected reset(): void {
    this.year.set(this.today.getFullYear());
    this.month.set(this.today.getMonth() + 1);
    this.selectedDate.set(this.todayKey);
    this.events.set(createInitialEvents(this.todayKey));
    this.newEventTitle.set('');
    this.newEventColor.set(EVENT_COLORS[0].value);
    this.nextEventId = SEED_EVENTS.length + 1;
    this.setLastEvent('calendar.status.none');
  }

  private setLastEvent(key: string, params: Record<string, unknown> = {}): void {
    this.lastEventKey.set(key);
    this.lastEventParams.set(params);
  }

  private resolveLocale(language: string): string {
    return language.toLowerCase().startsWith('pt') ? 'pt-PT' : 'en-GB';
  }
}
