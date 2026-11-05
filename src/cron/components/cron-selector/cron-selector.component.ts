import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Input,
  input,
  model,
  OnInit,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { InternalError } from '@decaf-ts/db-decorators';
import { Primitives } from '@decaf-ts/decorator-validation';
import { LoggedClass } from '@decaf-ts/logging';
import {
  IonButton,
  IonCheckbox,
  IonDatetimeButton,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import cronstrue from 'cronstrue/i18n';
import { shareReplay } from 'rxjs';
import { IconComponent } from '@decaf-ts/for-angular';

/**
 * @module for-angular/cron/components/cron-selector
 * @summary Standalone cron-expression selector (`ngx-decaf-cron-selector`).
 * @description Authors a five-field cron expression from simplified
 * daily/hourly/weekly schedules. The component keeps its schedule state in a
 * reactive form, serializes it to a cron string through the bound
 * `FormControl`/`value` model, and renders a human-readable description of the
 * expression via `cronstrue/i18n` in the active `@ngx-translate` locale.
 * @memberOf module:for-angular/cron/components/cron-selector
 */

/** Schedule abstraction offered by the selector's segment control. */
type ScheduleMode = 'daily' | 'hourly' | 'weekly';

/** One selectable weekday, identified by its cron day-of-week number (0 = Sunday). */
interface WeekdayOption {
  /** i18n key rendered on the weekday toggle. */
  label: string;
  /** Cron day-of-week number passed through to the expression. */
  value: number;
}

/**
 * Standalone cron-expression selector. Keeps the authored schedule in a reactive
 * form, serializes every form change into a cron string, and publishes it through
 * both the {@link CronSelectorComponent.value} model and the bound
 * `FormControl`. When {@link CronSelectorComponent.describeCron} is enabled the
 * current expression is described in the active locale through `cronstrue/i18n`.
 */
@Component({
  selector: 'ngx-decaf-cron-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    IonButton,
    IonCheckbox,
    IonDatetimeButton,
    IonItem,
    IonLabel,
    IonList,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
  ],
  templateUrl: './cron-selector.component.html',
  styleUrls: ['./cron-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Cron-expression selector component.
 *
 * @description Authors a cron expression from one of three simplified schedule
 * modes (daily times, hourly interval, weekly times on selected weekdays) and
 * keeps the surrounding form field synchronized. Editing is disabled while the
 * {@link CronSelectorComponent.disabled} input is set. Human-readable schedule
 * descriptions are rendered in the active `@ngx-translate` locale.
 * @class CronSelectorComponent
 * @memberOf module:for-angular/cron/components/cron-selector
 */
export class CronSelectorComponent extends LoggedClass implements OnInit {
  /** Optional `FormControl` kept in sync with the authored cron expression. */
  @Input()
  formControl!: FormControl;

  /** When false, renders the raw cron expression instead of its localized description. */
  readonly describeCron = input<boolean>(true);

  /** Two-way bound cron expression authored by the selector. */
  value = model<string>('0 9 * * *');

  /** Hides the daily-schedule mode. */
  readonly hideDaily = input<boolean>(false);
  /** Hides the hourly-interval mode. */
  readonly hideInterval = input<boolean>(false);
  /** Hides the weekly-schedule mode. */
  readonly hideWeekly = input<boolean>(false);
  /** Disables editing; the last published expression is kept. */
  readonly disabled = input<boolean>(false);

  /** Weekday toggles offered in the weekly mode (cron day-of-week numbering). */
  readonly weekdays: WeekdayOption[] = [
    { label: 'component.cron_selector.weekdays.sunday', value: 0 },
    { label: 'component.cron_selector.weekdays.monday', value: 1 },
    { label: 'component.cron_selector.weekdays.tuesday', value: 2 },
    { label: 'component.cron_selector.weekdays.wednesday', value: 3 },
    { label: 'component.cron_selector.weekdays.thursday', value: 4 },
    { label: 'component.cron_selector.weekdays.friday', value: 5 },
    { label: 'component.cron_selector.weekdays.saturday', value: 6 },
  ];

  /** Hour steps offered by the hourly-interval mode. */
  readonly hourlyIntervals = [2, 4, 6, 8, 12];

  private readonly formBuilder = inject(FormBuilder);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Reactive form holding the currently edited schedule (mode, times, interval, weekdays). */
  readonly form = this.formBuilder.group({
    mode: 'daily' as ScheduleMode,
    time: '09:00',
    times: this.formBuilder.nonNullable.control<string[]>(['09:00']),
    everyHours: 8,
    weekdays: this.formBuilder.nonNullable.control<number[]>([1, 2, 3, 4, 5]),
  });

  /** Schedule modes still visible after applying the hide-* inputs. */
  readonly modes = computed(() =>
    (['daily', 'hourly', 'weekly'] as ScheduleMode[]).filter((mode) => !this.isModeHidden(mode))
  );

  private internalCron = '0 9 * * *';
  /** Last authored cron expression, or its localized description while describing is enabled. */
  displayedSchedule = model<string>(this.internalCron);
  private crontrueLocalePromises = new Map<string, Promise<unknown>>();
  private scheduleRequestId = 0;

  constructor() {
    super();
    // effect(() => {
    //   const value = this.value();
    //   untracked(() => this.loadCron(value));
    // });

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), shareReplay({ bufferSize: 1, refCount: true }))
      .subscribe(() => {
        this.setValue();
      });

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef), shareReplay({ bufferSize: 1, refCount: true }))
      .subscribe(() => {
        void this.refresh();
      });
  }

  /** Initializes the disabled state and publishes the initial schedule description. */
  async ngOnInit(): Promise<void> {
    this.setDisabledState(this.disabled());
    // this.ensureVisibleMode();
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    const requestId = ++this.scheduleRequestId;
    const cron = this.internalCron;

    if (!this.describeCron()) {
      return this.displayedSchedule.set(cron);
    }

    let translated = cron;
    try {
      if (requestId === this.scheduleRequestId) {
        translated = await this.describeCronExpression(cron);
      }
    } catch (error: unknown) {
      this.log.for(this.refresh).error((error as Error)?.message || String(error));
    } finally {
      this.displayedSchedule.set(translated);
    }
  }

  /** Sets one schedule-form control value (triggers re-serialization on change). */
  setControlValue(name: string, value: unknown) {
    const control = this.form.get(name);
    if (control) {
      control.setValue(value);
    }
  }

  /** Reads one schedule-form control value. */
  getControlValue(name: string): string | unknown[] | undefined {
    const control = this.form.get(name);
    if (control) {
      return control.value;
    }
    return undefined;
  }

  /** Adds one default time slot to the daily/weekly schedule. */
  addTime(): void {
    this.setControlValue('times', [...(this.form.controls.times.value || []), '12:00']);
  }

  /** Removes the time slot at the given index. */
  removeTime(index: number): void {
    const value = ((this.getControlValue('times') as []) || []).filter((_, currentIndex) => currentIndex !== index);
    if (value.length) {
      this.setControlValue('times', value);
    }
  }

  /** Replaces the time slot at the given index with the time parsed from a datetime value. */
  updateTime(index: number, value: string | string[] | null): void {
    if (typeof value === Primitives.STRING) {
      const time = this.extractTime(value as string);
      const times = [...(this.getControlValue('times') || [])];
      times[index] = time;
      this.setControlValue('times', times);
    }
  }

  /** Adds or removes one weekday from the weekly-mode selection. */
  toggleWeekday(day: number, checked: boolean): void {
    const value = this.getControlValue('weekdays') as number[];
    const set = new Set(value || []);
    if (checked) {
      set.add(day);
    } else {
      set.delete(day);
    }
    this.setControlValue(
      'weekdays',
      [...set].sort((a, b) => a - b)
    );
  }

  /** Whether the given weekday is currently selected in the weekly mode. */
  isWeekdaySelected(day: number): boolean {
    const value = this.getControlValue('weekdays') as number[];
    return value.includes(day);
  }

  private setValue(): void {
    if (!this.disabled()) {
      this.internalCron = this.createCron();
      this.value.set(this.internalCron);
      if (this.formControl) {
        this.formControl.setValue(this.internalCron, { emitEvent: true });
      }
      void this.refresh();
    }
  }

  private setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable({ emitEvent: false });
      return;
    }
    this.form.enable({ emitEvent: false });
  }

  private createCron(): string {
    const value = this.form.getRawValue();
    switch (value.mode) {
      case 'hourly':
        return `0 */${value.everyHours} * * *`;

      case 'weekly': {
        const days = value.weekdays.length ? value.weekdays.join(',') : '*';
        return this.createTimedCron(value.times, days);
      }
      case 'daily':
      default:
        return this.createTimedCron(value.times);
    }
  }

  private createTimedCron(times: string[], dayOfWeek: string = '*'): string {
    const normalized = times
      .map((time) => this.splitTime(time))
      .sort(([hourA, minuteA], [hourB, minuteB]) => hourA - hourB || minuteA - minuteB);

    const minutes = new Set(normalized.map(([, minute]) => minute));

    if (minutes.size === 1) {
      const minute = normalized[0][1];
      const hours = normalized.map(([hour]) => hour).join(',');
      return `${minute} ${hours} * * ${dayOfWeek}`;
    }
    return normalized.map(([hour, minute]) => `${minute} ${hour} * * ${dayOfWeek}`).join(';');
  }

  // private loadCron(cron: string): void {
  //   if (!cron?.trim()) {
  //     // this.ensureVisibleMode();
  //     void this.refresh();
  //     return;
  //   }

  //   const expressions = cron
  //     .split(';')
  //     .map((item) => item.trim())
  //     .filter(Boolean);

  //   if (expressions.length > 1) {
  //     const dailyTimes = expressions
  //       .map((expression) => this.parseDailyExpression(expression))
  //       .filter((value): value is string => value !== null);
  //     if (dailyTimes.length === expressions.length) {
  //       this.form.patchValue(
  //         {
  //           mode: 'daily',
  //           times: dailyTimes,
  //         },
  //         { emitEvent: false }
  //       );
  //       this.internalCron = this.createCron();
  //       // this.ensureVisibleMode();
  //       void this.refresh();
  //       return;
  //     }

  //     const weeklySchedules = expressions
  //       .map((expression) => this.parseWeeklyExpression(expression))
  //       .filter((value): value is { times: string[]; weekdays: number[] } => value !== null);
  //     if (weeklySchedules.length === expressions.length) {
  //       const [firstSchedule] = weeklySchedules;
  //       const hasMatchingWeekdays = weeklySchedules.every((schedule) => {
  //         const weekdays = schedule.weekdays;
  //         return (
  //           weekdays.length === firstSchedule.weekdays.length &&
  //           weekdays.every((day, index) => day === firstSchedule.weekdays[index])
  //         );
  //       });

  //       if (hasMatchingWeekdays) {
  //         const times = weeklySchedules.flatMap((schedule) => schedule.times);
  //         this.form.patchValue(
  //           {
  //             mode: 'weekly',
  //             times,
  //             weekdays: firstSchedule.weekdays,
  //           },
  //           { emitEvent: false }
  //         );
  //         this.internalCron = this.createCron();
  //         // this.ensureVisibleMode();
  //         void this.refresh();
  //       }
  //     }

  //     return;
  //   }

  //   const fields = cron.trim().split(/\s+/);

  //   if (fields.length !== 5) {
  //     return;
  //   }

  //   const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  //   if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
  //     this.form.patchValue(
  //       {
  //         mode: 'hourly',
  //         everyHours: Number(hour.slice(2)),
  //       },
  //       { emitEvent: false }
  //     );
  //     this.internalCron = this.createCron();
  //     // this.ensureVisibleMode();
  //     void this.refresh();
  //     return;
  //   }

  //   if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
  //     const weeklySchedule = this.parseWeeklyExpression(cron);
  //     if (weeklySchedule) {
  //       this.form.patchValue(
  //         {
  //           mode: 'weekly',
  //           times: weeklySchedule.times,
  //           weekdays: weeklySchedule.weekdays,
  //         },
  //         { emitEvent: false }
  //       );
  //       this.internalCron = this.createCron();
  //       // this.ensureVisibleMode();
  //       void this.refresh();
  //     }
  //     return;
  //   }

  //   if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
  //     const hours = hour.split(',').map(Number);
  //     this.form.patchValue(
  //       {
  //         mode: 'daily',
  //         times: hours.map((item) => this.formatTime(item, Number(minute))),
  //       },
  //       { emitEvent: false }
  //     );
  //     this.internalCron = this.createCron();
  //     // this.ensureVisibleMode();
  //     void this.refresh();
  //   }
  // }

  // private parseDailyExpression(expression: string): string | null {
  //   const fields = expression.split(/\s+/);

  //   if (fields.length !== 5) {
  //     return null;
  //   }

  //   const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  //   if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*' || hour.includes(',') || minute.includes(',')) {
  //     return null;
  //   }

  //   return this.formatTime(Number(hour), Number(minute));
  // }

  // private parseWeeklyExpression(expression: string): { times: string[]; weekdays: number[] } | null {
  //   const fields = expression.split(/\s+/);

  //   if (fields.length !== 5) {
  //     return null;
  //   }

  //   const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

  //   if (dayOfMonth !== '*' || month !== '*' || dayOfWeek === '*' || minute.includes(',')) {
  //     return null;
  //   }

  //   const weekdays = this.parseWeekdays(dayOfWeek);

  //   if (!weekdays) {
  //     return null;
  //   }

  //   if (hour.includes(',')) {
  //     const hours = hour.split(',').map(Number);

  //     if (hours.some((item) => Number.isNaN(item))) {
  //       return null;
  //     }

  //     return {
  //       times: hours.map((item) => this.formatTime(item, Number(minute))),
  //       weekdays,
  //     };
  //   }

  //   const hourValue = Number(hour);
  //   const minuteValue = Number(minute);

  //   if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
  //     return null;
  //   }

  //   return {
  //     times: [this.formatTime(hourValue, minuteValue)],
  //     weekdays,
  //   };
  // }

  // private parseWeekdays(value: string): number[] | null {
  //   const weekdays = value.split(',').map(Number);

  //   if (weekdays.some((day) => Number.isNaN(day))) {
  //     return null;
  //   }

  //   return [...new Set(weekdays)].sort((a, b) => a - b);
  // }

  private splitTime(time: string): [number, number] {
    const normalized = this.extractTime(time);
    const [hour, minute] = normalized.split(':').map(Number);

    if (Number.isNaN(hour) || Number.isNaN(minute)) {
      throw new InternalError(`Invalid time value: ${time}`);
    }

    return [hour, minute];
  }

  private extractTime(value: string): string {
    const match = value.match(/(\d{2}):(\d{2})/);
    if (!match) {
      throw new InternalError(`Invalid time value: ${value}`);
    }
    return `${match[1]}:${match[2]}`;
  }

  // private formatTime(hour: number, minute: number): string {
  //   return [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':');
  // }

  // private ensureVisibleMode(): void {
  //   const mode = this.getControlValue('mode');
  //   if (this.isModeHidden(mode as ScheduleMode)) {
  //     const fallbackMode = this.modes()[0];
  //     if (fallbackMode) {
  //       this.setControlValue('mode', fallbackMode);
  //     }
  //   }
  // }

  private isModeHidden(mode: ScheduleMode): boolean {
    if (mode === 'daily') return this.hideDaily();
    if (mode === 'hourly') return this.hideInterval();
    return this.hideWeekly();
  }

  private async describeCronExpression(cron: string): Promise<string> {
    const locale = await this.getLocale();
    return cron
      .split(';')
      .map((expression) => expression.trim())
      .filter(Boolean)
      .map((expression) =>
        cronstrue.toString(expression, {
          locale,
          throwExceptionOnParseError: false,
          use24HourTimeFormat: true,
        })
      )
      .join('; ');
  }

  private async getLocale(): Promise<string> {
    const locale = this.translateService.getCurrentLang().toLowerCase();
    if (locale.startsWith('pt')) {
      return 'pt_BR';
    }
    if (locale.startsWith('en')) {
      return 'en';
    }
    return locale.replace('-', '_');
  }

  // private async loadCrontrue(): Promise<CrontrueModule> {
  //   if (!this.valuetrueModulePromise) {
  //     const mod = 'cronstrue';
  //     this.valuetrueModulePromise = import(/* webpackIgnore: true */ mod) as Promise<CrontrueModule>;
  //   }

  //   return this.valuetrueModulePromise;
  // }

  // private async loadCrontrueLocale(locale: string): Promise<unknown> {
  //   if (!this.valuetrueLocalePromises.has(locale)) {
  //     const localePromise = this.loadCrontrueLocaleModule(locale);
  //     this.valuetrueLocalePromises.set(locale, localePromise);
  //   }

  //   return this.valuetrueLocalePromises.get(locale) as Promise<unknown>;
  // }

  // private async loadCrontrueLocaleModule(locale: string): Promise<unknown> {
  //   const locales: Record<string, string> = {
  //     pt_BR: './cronstrue/pt_BR.js',
  //     en: './cronstrue/en.js',
  //   };
  //   const mod = locales[locale] ?? locales['en'];
  //   console.log(mod);
  //   return import(/* webpackIgnore: true */ mod);
  // }
}
