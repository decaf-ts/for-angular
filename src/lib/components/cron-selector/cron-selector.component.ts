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
import { shareReplay } from 'rxjs';
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
  @Input()
  formControl!: FormControl;

  readonly describeCron = input<boolean>(true);

  value = model<string>('0 9 * * *');

  readonly hideDaily = input<boolean>(false);
  readonly hideInterval = input<boolean>(false);
  readonly hideWeekly = input<boolean>(false);
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

  readonly form = this.formBuilder.group({
    mode: 'daily' as ScheduleMode,
    time: '09:00',
    times: this.formBuilder.nonNullable.control<string[]>(['09:00']),
    everyHours: 8,
    weekdays: this.formBuilder.nonNullable.control<number[]>([1, 2, 3, 4, 5]),
  });

  readonly modes = computed(() =>
    (['daily', 'hourly', 'weekly'] as ScheduleMode[]).filter((mode) => !this.isModeHidden(mode))
  );

  private internalCron = '0 9 * * *';
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

  setControlValue(name: string, value: unknown) {
    const control = this.form.get(name);
    if (control) {
      control.setValue(value);
    }
  }

  getControlValue(name: string): string | unknown[] | undefined {
    const control = this.form.get(name);
    if (control) {
      return control.value;
    }
    return undefined;
  }

  addTime(): void {
    this.setControlValue('times', [...(this.form.controls.times.value || []), '12:00']);
  }

  removeTime(index: number): void {
    const value = ((this.getControlValue('times') as []) || []).filter((_, currentIndex) => currentIndex !== index);
    if (value.length) {
      this.setControlValue('times', value);
    }
  }

  updateTime(index: number, value: string | string[] | null): void {
    if (typeof value === Primitives.STRING) {
      const time = this.extractTime(value as string);
      const times = [...(this.getControlValue('times') || [])];
      times[index] = time;
      this.setControlValue('times', times);
    }
  }

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
