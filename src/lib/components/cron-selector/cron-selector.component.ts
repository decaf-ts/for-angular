import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  forwardRef,
  Input,
  OnChanges,
  OnDestroy,
  Output,
} from '@angular/core';
import { ControlValueAccessor, FormBuilder, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
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
import { TranslatePipe } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { InternalError } from '@decaf-ts/db-decorators';

type ScheduleMode = 'daily' | 'hourly' | 'weekly';

interface WeekdayOption {
  label: string;
  value: number;
}

@Component({
  selector: 'app-cron-selector',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CronSelectorComponent),
      multi: true,
    },
  ],
})
export class CronSelectorComponent implements ControlValueAccessor, OnChanges, OnDestroy {
  @Input()
  set cron(value: string) {
    this.loadCron(value);
  }

  get cron(): string {
    return this.internalCron;
  }

  @Input()
  hideDaily = false;

  @Input()
  hideInterval = false;

  @Input()
  hideWeekly = false;

  @Input()
  set disabled(value: boolean) {
    this.setDisabledState(value);
  }

  @Output()
  readonly cronChange = new EventEmitter<string>();

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

  readonly form = this.formBuilder.nonNullable.group({
    mode: 'daily' as ScheduleMode,
    time: '09:00',
    times: this.formBuilder.nonNullable.control<string[]>(['09:00']),
    everyHours: 8,
    startAt: this.formBuilder.nonNullable.control<string>(this.formatDateTime(new Date())),
    weekdays: this.formBuilder.nonNullable.control<number[]>([1, 2, 3, 4, 5]),
  });

  private readonly subscriptions = new Subscription();

  private internalCron = '0 9 * * *';

  private isDisabled = false;

  private onChange: (value: string) => void = () => undefined;

  private onTouched: () => void = () => undefined;

  constructor() {
    this.subscriptions.add(
      this.form.valueChanges.subscribe(() => {
        this.emitCron();
      })
    );
  }

  ngOnChanges(): void {
    this.ensureVisibleMode();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  get visibleModes(): ScheduleMode[] {
    return (['daily', 'hourly', 'weekly'] as ScheduleMode[]).filter((mode) => !this.isModeHidden(mode));
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

  get generatedCron(): string {
    return this.createCron();
  }

  writeValue(value: string | null): void {
    this.loadCron(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;

    if (isDisabled) {
      this.form.disable({ emitEvent: false });
      return;
    }

    this.form.enable({ emitEvent: false });
  }

  markTouched(): void {
    this.onTouched();
  }

  private emitCron(): void {
    if (this.isDisabled) {
      return;
    }

    const cron = this.createCron();
    this.internalCron = cron;
    this.cronChange.emit(cron);
    this.onChange(cron);
  }

  private createCron(): string {
    const value = this.form.getRawValue();

    switch (value.mode) {
      case 'hourly':
        return `0 */${value.everyHours} * * *`;

      case 'weekly': {
        const [hour, minute] = this.splitTime(value.time);
        const days = value.weekdays.length ? value.weekdays.join(',') : '*';
        return `${minute} ${hour} * * ${days}`;
      }

      case 'daily':
      default:
        return this.createDailyCron(value.times);
    }
  }

  private createDailyCron(times: string[]): string {
    const normalized = times
      .map((time) => this.splitTime(time))
      .sort(([hourA, minuteA], [hourB, minuteB]) => hourA - hourB || minuteA - minuteB);

    const minutes = new Set(normalized.map(([, minute]) => minute));

    if (minutes.size === 1) {
      const minute = normalized[0][1];
      const hours = normalized.map(([hour]) => hour).join(',');
      return `${minute} ${hours} * * *`;
    }

    return normalized.map(([hour, minute]) => `${minute} ${hour} * * *`).join(';');
  }

  private loadCron(cron: string): void {
    if (!cron?.trim()) {
      this.ensureVisibleMode();
      return;
    }

    const expressions = cron
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean);

    if (expressions.length > 1) {
      const times = expressions.map((expression) => this.parseDailyExpression(expression));
      if (times.every((value): value is string => value !== null)) {
        this.form.patchValue(
          {
            mode: 'daily',
            times,
          },
          { emitEvent: false }
        );
        this.internalCron = this.createCron();
        this.ensureVisibleMode();
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
      return;
    }

    if (dayOfMonth === '*' && month === '*' && dayOfWeek !== '*') {
      this.form.patchValue(
        {
          mode: 'weekly',
          time: this.formatTime(Number(hour), Number(minute)),
          weekdays: dayOfWeek.split(',').map(Number),
        },
        { emitEvent: false }
      );
      this.internalCron = this.createCron();
      this.ensureVisibleMode();
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

  private formatDateTime(date: Date): string {
    const year = String(date.getFullYear()).padStart(4, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private ensureVisibleMode(): void {
    const currentMode = this.form.controls.mode.value;

    if (!this.isModeHidden(currentMode)) {
      return;
    }

    const fallbackMode = this.visibleModes[0];
    if (!fallbackMode) {
      return;
    }

    this.form.controls.mode.setValue(fallbackMode, { emitEvent: false });
  }

  private isModeHidden(mode: ScheduleMode): boolean {
    if (mode === 'daily') return this.hideDaily;
    if (mode === 'hourly') return this.hideInterval;
    return this.hideWeekly;
  }
}
