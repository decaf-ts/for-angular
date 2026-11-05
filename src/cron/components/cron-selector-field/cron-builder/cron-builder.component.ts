/**
 * @module for-angular/cron/components/cron-builder
 * @summary Standalone five-field cron-expression builder (`ngx-decaf-cron-builder`).
 * @description Edits each cron field (minute, hour, day, month, weekday) as an
 * individual form control with "every N" interval support, preset schedules,
 * and an accumulation list that joins several expressions with `;` when the
 * `multiple` input is set. Optionally describes the resulting expression in the
 * active locale through `cronstrue/i18n`.
 * @memberOf module:for-angular/cron/components/cron-builder
 */

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input, input, model, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LoggedClass } from '@decaf-ts/logging';
import { UIFunctionLike } from '@decaf-ts/ui-decorators';
import { IonButton, IonItem, IonLabel, IonList, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import cronstrue from 'cronstrue/i18n';
import { shareReplay } from 'rxjs';
import { DecafTooltipDirective, IconComponent, SelectOption, copyToClipboard, isNumber } from '@decaf-ts/for-angular';

/** Identifiable cron field of the builder's form. */
type CronFieldKey = 'minute' | 'hour' | 'day' | 'month' | 'weekday';

/** One builder form control, extended with the "every N" interval flag. */
type CronFormControl = FormControl<CronFieldKey> & {
  every: boolean;
};

const DEFAULT_CRON = '0 9 * * *';
const CRON_FIELD_KEYS: CronFieldKey[] = ['minute', 'hour', 'day', 'month', 'weekday'];
const DEFAULT_FIELD_VALUES: Record<CronFieldKey, string> = CRON_FIELD_KEYS.reduce(
  (acc, key, index) => ({ ...acc, [key]: DEFAULT_CRON.split(' ')[index] }),
  {} as Record<CronFieldKey, string>
);

// '*' has no numeric equivalent, so preset inputs fall back to 0 for it.
function parseIntervalValue(field: string): number {
  const numeric = Number(field.replace('*/', ''));
  return Number.isNaN(numeric) ? 0 : numeric;
}

/**
 * Five-field cron-expression builder component.
 *
 * @description Renders one input per cron field with "every N" toggles,
 * preset schedules (every N minutes, daily at hour, weekdays, monthly) and a
 * copy-to-clipboard action. With the {@link CronBuilderComponent.multiple}
 * input the built expressions accumulate into a semicolon-separated list.
 * Emits every change through {@link CronBuilderComponent.changeEvent} and keeps
 * the bound `FormControl` synchronized.
 * @class CronBuilderComponent
 * @memberOf module:for-angular/cron/components/cron-builder
 */
@Component({
  selector: 'ngx-decaf-cron-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IconComponent,
    IonButton,
    IonItem,
    IonLabel,
    IonList,
    DecafTooltipDirective,
    IonSelect,
    IonSelectOption,
    TranslatePipe,
  ],
  templateUrl: './cron-builder.component.html',
  styleUrls: ['./cron-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronBuilderComponent extends LoggedClass implements OnInit {
  /** Reactive form with one control per editable cron field. */
  readonly form!: FormGroup;

  /** Optional `FormControl` kept in sync with the built cron expression. */
  @Input()
  formControl!: FormControl;

  /** Emits the built (possibly accumulated) cron expression after every change. */
  changeEvent = output<string>();

  /** Initial cron expression used to seed the field controls. */
  cron = input<string>(DEFAULT_CRON);
  /** i18n label rendered above the builder. */
  label = input<string>('');
  /** Whether the surrounding CRUD operation is read-only (disables editing). */
  isReadOnlyOperation = input<boolean>(false);

  /** Which cron fields the form exposes, in expression order. */
  fields = input<CronFieldKey[]>(CRON_FIELD_KEYS);
  /** Two-way bound built cron expression. */
  value = model<string>(DEFAULT_CRON);
  /** Internal "every" flags per field control. */
  presets!: Record<CronFieldKey, { every: boolean }>;

  /** When true, renders the localized description of the expression. */
  readonly describeCron = input<boolean>(true);
  /** Disables editing; the last built expression is kept. */
  readonly disabled = input<boolean>(false);
  /** Hides the daily-at-hour preset. */
  readonly hideDaily = input<boolean>(false);
  /** Hides the "every N minutes"/"every N hours" interval presets. */
  readonly hideInterval = input<boolean>(false);
  /** Hides the weekday preset. */
  readonly hideWeekly = input<boolean>(false);
  /** Enables accumulating several `;`-separated expressions. */
  readonly multiple = input<boolean>(false);

  /** Rendered schedule: the built expression or its localized description. */
  displayedSchedule = model<string>('');

  /** Weekday options for the weekday field select (cron day-of-week numbering). */
  readonly weekdays: SelectOption[] = [
    { text: 'date.weekdays.sunday', value: '0' },
    { text: 'date.weekdays.monday', value: '1' },
    { text: 'date.weekdays.tuesday', value: '2' },
    { text: 'date.weekdays.wednesday', value: '3' },
    { text: 'date.weekdays.thursday', value: '4' },
    { text: 'date.weekdays.friday', value: '5' },
    { text: 'date.weekdays.saturday', value: '6' },
  ];

  /** Month options for the month field select (1–12). */
  readonly months: SelectOption[] = [
    { text: 'date.months.january', value: '1' },
    { text: 'date.months.february', value: '2' },
    { text: 'date.months.march', value: '3' },
    { text: 'date.months.april', value: '4' },
    { text: 'date.months.may', value: '5' },
    { text: 'date.months.june', value: '6' },
    { text: 'date.months.july', value: '7' },
    { text: 'date.months.august', value: '8' },
    { text: 'date.months.september', value: '9' },
    { text: 'date.months.october', value: '10' },
    { text: 'date.months.november', value: '11' },
    { text: 'date.months.december', value: '12' },
  ];

  /** Hour values (0–23) offered by the "daily at hour" preset. */
  readonly hourOptions: string[] = Array.from({ length: 24 }, (_, index) => String(index));

  /** Minute value of the "every N minutes" preset. */
  everyMinutesValue = parseIntervalValue(DEFAULT_FIELD_VALUES.minute);
  /** Hour value of the "daily at hour" preset. */
  dailyAtHourValue = parseIntervalValue(DEFAULT_FIELD_VALUES.hour);
  /** Weekdays currently selected by the weekday preset. */
  presetWeekdays: string[] = [];
  /** Expressions accumulated in multiple mode, joined into the final value. */
  accumulatedCrons: string[] = [];

  private readonly formBuilder = inject(FormBuilder);
  private readonly translateService = inject(TranslateService);

  private scheduleRequestId = 0;

  constructor() {
    super();
    const controls = this.fields().reduce(
      (acc, key, index) => {
        const value = this.cron().split(' ')[index];
        const control = this.formBuilder.control(value) as CronFormControl;
        control.every = false;
        return {
          ...acc,
          [key]: control,
        };
      },
      {} as Record<CronFieldKey, CronFormControl>
    );
    this.form = this.formBuilder.group(controls);
    this.form.valueChanges
      .pipe(takeUntilDestroyed(), shareReplay({ bufferSize: 1, refCount: true }))
      .subscribe(() => this.setValue());

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(), shareReplay({ bufferSize: 1, refCount: true }))
      .subscribe(() => void this.refresh());
  }

  /** Seeds the field controls from {@link CronBuilderComponent.value} and applies the disabled state. */
  async ngOnInit(): Promise<void> {
    this.parseInitialValue();
    this.setDisabledState(this.disabled());
    await this.refresh();
  }

  /** Current raw value of one cron field. */
  getFieldValue(key: CronFieldKey): string {
    return String(this.form.controls[key].value);
  }

  /** Sets one cron field value; empty input resets the field to `*`. */
  setFieldValue(key: CronFieldKey, value: string): void {
    this.form.controls[key].setValue(value.trim() || '*');
  }

  /** Reserved extension point for mapping preset selections to a field value (no-op). */
  parseToValue(key: string, hours: number | string, value: string): void {
    // let value = typeof hours === 'string' ? parseIntervalValue(hours) : hours;
    // if (value < 0) {
    //   value = '*';
    // }
    // this.patchFields({ hour: `*/${this.everyHourValue}` });
    // value = value === "*" ?
  }

  /** Whether the given field is currently in "every N" interval mode. */
  isEvery(key: CronFieldKey): boolean {
    return (this.form.get(key) as CronFormControl).every ?? false;
  }

  /** Toggles the "every N" interval mode of one field (numeric values only). */
  toggleEvery(key: CronFieldKey) {
    const control = this.form.get(key) as CronFormControl;
    const validNumber = isNumber(control.value);
    let every = !control.every;
    if (!validNumber || Number(control.value) < 1) {
      every = false;
    }
    control.every = every;
    this.patchValue(key, every, control.value);
  }

  /** Keyboard-activation helper: invokes a handler on Enter or Space. */
  handleKeydown(event: KeyboardEvent, handler: UIFunctionLike, ...args: unknown[]) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler(...args);
    }
  }

  /** Writes one field value, switching to the interval `slash N` form when "every" mode is active. */
  patchValue(key: CronFieldKey, every: boolean = false, value: string) {
    if (!every && value !== '*') {
      value = value.replace(/\D/g, '');
    }
    value = !['*', '0', 0].includes(value) && every ? `*/${value}` : String(value);
    this.form.patchValue({ [key]: value });
  }

  // digits-only base: '*' or '*/N' or '' all parse to -1 (the slot just below 0, i.e. '*')
  private toBase(current: string): number {
    const digits = current.replace(/\D/g, '');
    return digits === '' ? -1 : Number(digits);
  }

  private fromBase(value: number): string {
    return value < 0 ? '*' : String(value);
  }

  /** Increments the hour/minute field (capped at its numeric maximum). */
  incrementTime(key: 'hour' | 'minute', every = false): void {
    const max = key === 'hour' ? 23 : 59;
    const base = this.toBase(this.getFieldValue(key));
    const next = Math.min(max, base + 1);
    this.patchValue(key, every, this.fromBase(next));
  }

  /** Decrements the hour/minute field (`*` is one step below 0). */
  decrementTime(key: 'hour' | 'minute', every = false): void {
    const base = this.toBase(this.getFieldValue(key));
    const next = Math.max(-1, base - 1);
    this.patchValue(key, every, this.fromBase(next));
  }

  /** Applies a weekday/month multi-select value, collapsing the "all" marker to `*`. */
  handleSelectionPreset(value: string[], key: 'weekday' | 'month', element: IonSelect): void {
    if (value.length === 1) {
      if (value.includes('all')) {
        element.value = '';
      }
      value = [...value.map((v) => (['', 'all'].includes(v) ? '*' : String(value)))];
    }
    this.setFieldValue(key, value.join(','));
  }

  /** Applies the "every N minutes" preset. */
  applyEveryMinutes(minutes: number): void {
    const value = Number.isNaN(minutes) ? 0 : minutes;
    this.everyMinutesValue = value;
    this.patchFields({ minute: `*/${value}`, hour: '*', day: '*', month: '*', weekday: '*' });
  }

  /** Applies the "daily at hour" preset. */
  applyDailyAt(hour: number): void {
    this.dailyAtHourValue = hour;
    this.patchFields({ minute: '0', hour: `${hour}`, day: '*', month: '*', weekday: '*' });
  }

  /** Adds one weekday to the weekday preset and re-applies the preset schedule. */
  togglePresetWeekday(day: number): void {
    const set = new Set(this.presetWeekdays);
    // if (set.has(day)) {
    //   set.delete(day);
    // } else {
    //   set.add(day);
    // }
    this.presetWeekdays = [...set].sort((a, b) => Number(a) - Number(b));
    this.applyPresetWeekdays();
  }

  /** Re-applies the weekday preset schedule. */
  toggleAllWeekdays(): void {
    // this.presetWeekdays = this.isPresetWeekdaySelected('all') ? [] : this.weekdays.map((day) => day.value);
    this.applyPresetWeekdays();
  }

  /** Whether the weekday preset covers the given day (or all days). */
  isPresetWeekdaySelected(day: string | 'all'): boolean {
    if (day === 'all') {
      return this.presetWeekdays.length === this.weekdays.length;
    }
    return this.presetWeekdays.includes(day);
  }

  /** Current select value for the weekday preset (with the "all" marker when fully selected). */
  weekdaySelectValue(): (string | 'all')[] {
    return this.isPresetWeekdaySelected('all') ? [...this.presetWeekdays, 'all'] : this.presetWeekdays;
  }

  private closeOpenSelectPopover(): void {
    const popover = document.querySelector('ion-popover') as (Element & { dismiss(): Promise<boolean> }) | null;
    void popover?.dismiss();
  }

  /** Applies the monthly preset (first day of every month at 00:00). */
  applyMonthly(): void {
    this.patchFields({ minute: '0', hour: '0', day: '1', month: '*', weekday: '*' });
  }

  /** Accumulates the current expression (multiple mode only) and resets the fields. */
  addAnother(): void {
    if (!this.multiple() || this.disabled()) return;

    const cron = this.createCron();
    if (this.accumulatedCrons.includes(cron)) return;

    this.accumulatedCrons = [...this.accumulatedCrons, cron];
    this.resetFields();
    this.setValue();
  }

  /** Removes one accumulated expression from the multiple-mode list. */
  removeAccumulated(index: number): void {
    this.accumulatedCrons = this.accumulatedCrons.filter((_, current) => current !== index);
    this.setValue();
  }

  /** The cron expression currently described by the field controls. */
  currentCron(): string {
    return this.createCron();
  }

  /** Describes one (possibly accumulated) expression in the active locale, falling back to the raw expression. */
  describeAccumulatedCron(cron: string): string {
    try {
      return cronstrue.toString(cron, {
        locale: this.resolveLocale(),
        throwExceptionOnParseError: false,
        use24HourTimeFormat: true,
      });
    } catch {
      return cron;
    }
  }

  /** Whether a preset panel is hidden by the hide-* inputs. */
  isPresetHidden(preset: 'minutes' | 'hour' | 'daily' | 'weekdays' | 'monthly'): boolean {
    if (preset === 'minutes' || preset === 'hour') return this.hideInterval();
    if (preset === 'daily') return this.hideDaily();
    if (preset === 'weekdays') return this.hideWeekly();
    return false;
  }

  /** Transient copy-confirmation flag for the clipboard action. */
  readonly copied = signal(false);

  /** Copies the current expression to the clipboard and flashes the copied state. */
  async handleCopyToClipBoard(): Promise<void> {
    try {
      await copyToClipboard(this.currentCron());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch (error: unknown) {
      this.log.for(copyToClipboard).error((error as Error)?.message || String(error));
    }
  }

  private applyPresetWeekdays(): void {
    const weekday =
      this.presetWeekdays.length && this.presetWeekdays.length < this.weekdays.length
        ? this.presetWeekdays.join(',')
        : '*';
    this.patchFields({ minute: '0', hour: '9', day: '*', month: '*', weekday });
  }

  private patchFields(values: Record<string, string>): void {
    this.form.patchValue(values);
  }

  private resetFields(): void {
    this.form.patchValue(DEFAULT_FIELD_VALUES, { emitEvent: false });
    this.everyMinutesValue = parseIntervalValue(DEFAULT_FIELD_VALUES.minute);
    this.form.patchValue({ hour: DEFAULT_FIELD_VALUES.hour });
    // this.everyHourValue = parseIntervalValue(DEFAULT_FIELD_VALUES.hour);
    this.dailyAtHourValue = parseIntervalValue(DEFAULT_FIELD_VALUES.hour);
    this.presetWeekdays = [];
  }

  private parseInitialValue(): void {
    const raw = (this.value() || DEFAULT_CRON).trim();
    const segments = this.multiple()
      ? raw
          .split(';')
          .map((segment) => segment.trim())
          .filter(Boolean)
      : [raw];
    const last = segments.pop() || DEFAULT_CRON;
    this.accumulatedCrons = segments;

    const parts = last.split(/\s+/);
    if (parts.length !== 5) return;

    const values = CRON_FIELD_KEYS.reduce(
      (acc, key, index) => ({ ...acc, [key]: parts[index] || '*' }),
      {} as Record<CronFieldKey, string>
    );
    this.form.patchValue(values, { emitEvent: false });
  }

  private setValue(): void {
    if (this.disabled()) return;

    const currentCron = this.createCron();
    const cron =
      this.multiple() && this.accumulatedCrons.length
        ? (this.accumulatedCrons.includes(currentCron)
            ? this.accumulatedCrons
            : [...this.accumulatedCrons, currentCron]
          ).join(';')
        : currentCron;

    this.value.set(cron);
    if (this.formControl) {
      this.formControl.setValue(cron, { emitEvent: true });
    }
    this.changeEvent.emit(cron);
    void this.refresh();
  }

  private setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.form.disable({ emitEvent: false });
      return;
    }
    this.form.enable({ emitEvent: false });
  }

  private createCron(): string {
    return CRON_FIELD_KEYS.map((key) => this.getFieldValue(key) || '*').join(' ');
  }

  private async refresh(): Promise<void> {
    const requestId = ++this.scheduleRequestId;
    const cron = this.createCron();

    if (!this.describeCron()) {
      this.displayedSchedule.set(cron);
      return;
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

  private async describeCronExpression(cron: string): Promise<string> {
    const locale = this.resolveLocale();
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

  private resolveLocale(): string {
    const locale = this.translateService.getCurrentLang().toLowerCase();
    if (locale.startsWith('pt')) {
      return 'pt_BR';
    }
    if (locale.startsWith('en')) {
      return 'en';
    }
    return locale.replace('-', '_');
  }
}
