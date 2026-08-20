import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { InternalError } from '@decaf-ts/db-decorators';
import { LoggedClass } from '@decaf-ts/logging';
import {
  IonButton,
  IonCheckbox,
  IonDatetime,
  IonDatetimeButton,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import cronstrue from 'cronstrue/i18n';
import { IconComponent } from '../icon/icon.component';

type ScheduleMode = 'daily' | 'hourly' | 'weekly';

interface WeekdayOption {
  label: string;
  value: number;
}

@Component({
  selector: 'ngx-decaf-cron-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    IonButton,
    IonCheckbox,
    IonDatetime,
    IonDatetimeButton,
    IonItem,
    IonLabel,
    IonList,
    IonModal,
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
export class CronSelectorComponent extends LoggedClass implements OnInit {
  readonly cron = model<string>('0 9 * * *');
  readonly hideDaily = input<boolean>(false);
  readonly hideInterval = input<boolean>(false);
  readonly hideWeekly = input<boolean>(false);
  readonly describeCron = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  readonly weekdays: WeekdayOption[] = [
    { label: 'component.cron_selector.weekdays.sunday', value: 0 },
    { label: 'component.cron_selector.weekdays.monday', value: 1 },
    { label: 'component.cron_selector.weekdays.tuesday', value: 2 },
    { label: 'component.cron_selector.weekdays.wednesday', value: 3 },
    { label: 'component.cron_selector.weekdays.thursday', value: 4 },
    { label: 'component.cron_selector.weekdays.friday', value: 5 },
    { label: 'component.cron_selector.weekdays.saturday', value: 6 },
  ];

  readonly hourlyIntervals = [2, 4, 6, 8, 12];

  private readonly formBuilder = inject(FormBuilder);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.formBuilder.nonNullable.group({
    mode: 'daily' as ScheduleMode,
    time: '09:00',
    times: this.formBuilder.nonNullable.control<string[]>(['09:00']),
    everyHours: 8,
    weekdays: this.formBuilder.nonNullable.control<number[]>([1, 2, 3, 4, 5]),
  });

  readonly visibleModes = computed(() =>
    (['daily', 'hourly', 'weekly'] as ScheduleMode[]).filter((mode) => !this.isModeHidden(mode))
  );

  private internalCron = '0 9 * * *';
  private readonly displayedSchedule = signal(this.internalCron);
  private crontrueModulePromise?: Promise<CrontrueModule>;
  private crontrueLocalePromises = new Map<string, Promise<unknown>>();
  private scheduleRequestId = 0;

  constructor() {
    super();
    effect(() => {
      const value = this.cron();
      untracked(() => this.loadCron(value));
    });

    effect(() => {
      const isDisabled = this.disabled();
      untracked(() => this.setDisabledState(isDisabled));
    });

    effect(() => {
      this.hideDaily();
      this.hideInterval();
      this.hideWeekly();
      untracked(() => {
        this.ensureVisibleMode();
        void this.refreshDisplayedSchedule();
      });
    });

    effect(() => {
      this.describeCron();
      untracked(() => void this.refreshDisplayedSchedule());
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.emitCron();
    });

    this.translateService.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      void this.refreshDisplayedSchedule();
    });
  }

  get generatedCron(): string {
    return this.internalCron;
  }

  get generatedSchedule(): string {
    return this.displayedSchedule();
  }

  async ngOnInit(): Promise<void> {
    await this.refreshDisplayedSchedule();
  }

  addTime(): void {
    const times = this.form.controls.times.value;
    this.form.controls.times.setValue([...times, '12:00']);
  }

  removeTime(index: number): void {
    const times = this.form.controls.times.value.filter((_, currentIndex) => currentIndex !== index);

    if (!times.length) {
      return;
    }

    this.form.controls.times.setValue(times);
  }

  updateTime(index: number, value: string | string[] | null): void {
    if (typeof value !== 'string') {
      return;
    }

    const time = this.extractTime(value);
    const times = [...this.form.controls.times.value];
    times[index] = time;
    this.form.controls.times.setValue(times);
  }

  toggleWeekday(day: number, checked: boolean): void {
    const current = new Set(this.form.controls.weekdays.value);

    if (checked) {
      current.add(day);
    } else {
      current.delete(day);
    }

    this.form.controls.weekdays.setValue([...current].sort((a, b) => a - b));
  }

  isWeekdaySelected(day: number): boolean {
    return this.form.controls.weekdays.value.includes(day);
  }

  private emitCron(): void {
    if (this.disabled()) {
      return;
    }

    const cron = this.createCron();
    this.internalCron = cron;
    this.cron.set(cron);
    void this.refreshDisplayedSchedule();
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

  private loadCron(cron: string): void {
    if (!cron?.trim()) {
      this.ensureVisibleMode();
      void this.refreshDisplayedSchedule();
      return;
    }

    const expressions = cron
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);

    if (expressions.length > 1) {
      const dailyTimes = expressions
        .map((expression) => this.parseDailyExpression(expression))
        .filter((value): value is string => value !== null);
      if (dailyTimes.length === expressions.length) {
        this.form.patchValue(
          {
            mode: 'daily',
            times: dailyTimes,
          },
          { emitEvent: false }
        );
        this.internalCron = this.createCron();
        this.ensureVisibleMode();
        void this.refreshDisplayedSchedule();
        return;
      }

      const weeklySchedules = expressions
        .map((expression) => this.parseWeeklyExpression(expression))
        .filter((value): value is { times: string[]; weekdays: number[] } => value !== null);
      if (weeklySchedules.length === expressions.length) {
        const [firstSchedule] = weeklySchedules;
        const hasMatchingWeekdays = weeklySchedules.every((schedule) => {
          const weekdays = schedule.weekdays;
          return (
            weekdays.length === firstSchedule.weekdays.length &&
            weekdays.every((day, index) => day === firstSchedule.weekdays[index])
          );
        });

        if (hasMatchingWeekdays) {
          const times = weeklySchedules.flatMap((schedule) => schedule.times);
          this.form.patchValue(
            {
              mode: 'weekly',
              times,
              weekdays: firstSchedule.weekdays,
            },
            { emitEvent: false }
          );
          this.internalCron = this.createCron();
          this.ensureVisibleMode();
          void this.refreshDisplayedSchedule();
        }
      }

      return;
    }

    const fields = cron.trim().split(/\s+/);

    if (fields.length !== 5) {
      return;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

    if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      this.form.patchValue(
        {
          mode: 'hourly',
          everyHours: Number(hour.slice(2)),
        },
        { emitEvent: false }
      );
      this.internalCron = this.createCron();
      this.ensureVisibleMode();
      void this.refreshDisplayedSchedule();
      return;
    }

    if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      const weeklySchedule = this.parseWeeklyExpression(cron);
      if (weeklySchedule) {
        this.form.patchValue(
          {
            mode: 'weekly',
            times: weeklySchedule.times,
            weekdays: weeklySchedule.weekdays,
          },
          { emitEvent: false }
        );
        this.internalCron = this.createCron();
        this.ensureVisibleMode();
        void this.refreshDisplayedSchedule();
      }
      return;
    }

    if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      const hours = hour.split(',').map(Number);
      this.form.patchValue(
        {
          mode: 'daily',
          times: hours.map((item) => this.formatTime(item, Number(minute))),
        },
        { emitEvent: false }
      );
      this.internalCron = this.createCron();
      this.ensureVisibleMode();
      void this.refreshDisplayedSchedule();
    }
  }

  private parseDailyExpression(expression: string): string | null {
    const fields = expression.split(/\s+/);

    if (fields.length !== 5) {
      return null;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

    if (dayOfMonth !== '*' || month !== '*' || dayOfWeek !== '*' || hour.includes(',') || minute.includes(',')) {
      return null;
    }

    return this.formatTime(Number(hour), Number(minute));
  }

  private parseWeeklyExpression(expression: string): { times: string[]; weekdays: number[] } | null {
    const fields = expression.split(/\s+/);

    if (fields.length !== 5) {
      return null;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = fields;

    if (dayOfMonth !== '*' || month !== '*' || dayOfWeek === '*' || minute.includes(',')) {
      return null;
    }

    const weekdays = this.parseWeekdays(dayOfWeek);

    if (!weekdays) {
      return null;
    }

    if (hour.includes(',')) {
      const hours = hour.split(',').map(Number);

      if (hours.some((item) => Number.isNaN(item))) {
        return null;
      }

      return {
        times: hours.map((item) => this.formatTime(item, Number(minute))),
        weekdays,
      };
    }

    const hourValue = Number(hour);
    const minuteValue = Number(minute);

    if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
      return null;
    }

    return {
      times: [this.formatTime(hourValue, minuteValue)],
      weekdays,
    };
  }

  private parseWeekdays(value: string): number[] | null {
    const weekdays = value.split(',').map(Number);

    if (weekdays.some((day) => Number.isNaN(day))) {
      return null;
    }

    return [...new Set(weekdays)].sort((a, b) => a - b);
  }

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

  private formatTime(hour: number, minute: number): string {
    return [String(hour).padStart(2, '0'), String(minute).padStart(2, '0')].join(':');
  }

  private ensureVisibleMode(): void {
    const currentMode = this.form.controls.mode.value;

    if (!this.isModeHidden(currentMode)) {
      return;
    }

    const fallbackMode = this.visibleModes()[0];
    if (!fallbackMode) {
      return;
    }

    this.form.controls.mode.setValue(fallbackMode, { emitEvent: false });
  }

  private isModeHidden(mode: ScheduleMode): boolean {
    if (mode === 'daily') return this.hideDaily();
    if (mode === 'hourly') return this.hideInterval();
    return this.hideWeekly();
  }

  private async refreshDisplayedSchedule(): Promise<void> {
    const requestId = ++this.scheduleRequestId;

    if (!this.describeCron()) {
      this.displayedSchedule.set(this.internalCron);
      return;
    }

    const cron = this.internalCron;

    try {
      const description = await this.describeCronExpression(cron);

      if (requestId !== this.scheduleRequestId) {
        return;
      }

      this.displayedSchedule.set(description);
    } catch (error: unknown) {
      this.log.for(this.refreshDisplayedSchedule).error((error as Error)?.message || String(error));
      if (requestId !== this.scheduleRequestId) {
        return;
      }

      this.displayedSchedule.set(cron);
    }
  }

  private async describeCronExpression(cron: string): Promise<string> {
    const locale = this.getCrontrueLocale();

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

  private getLocale(): string {
    return (this.translateService.getCurrentLang() || this.translateService.defaultLang || 'en').toLowerCase();
  }

  private getCrontrueLocale(): string {
    const locale = this.getLocale();

    if (locale.startsWith('pt')) {
      return 'pt_BR';
    }

    if (locale.startsWith('en')) {
      return 'en';
    }

    return locale.replace('-', '_');
  }

  // private async loadCrontrue(): Promise<CrontrueModule> {
  //   if (!this.crontrueModulePromise) {
  //     const mod = 'cronstrue';
  //     this.crontrueModulePromise = import(/* webpackIgnore: true */ mod) as Promise<CrontrueModule>;
  //   }

  //   return this.crontrueModulePromise;
  // }

  // private async loadCrontrueLocale(locale: string): Promise<unknown> {
  //   if (!this.crontrueLocalePromises.has(locale)) {
  //     const localePromise = this.loadCrontrueLocaleModule(locale);
  //     this.crontrueLocalePromises.set(locale, localePromise);
  //   }

  //   return this.crontrueLocalePromises.get(locale) as Promise<unknown>;
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

interface CrontrueModule {
  toString(expression: string, options?: CrontrueOptions): string;
}

interface CrontrueOptions {
  locale?: string;
  throwExceptionOnParseError?: boolean;
  use24HourTimeFormat?: boolean;
}
