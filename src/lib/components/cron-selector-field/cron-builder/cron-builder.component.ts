import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  input,
  model,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { LoggedClass } from '@decaf-ts/logging';
import { IonButton, IonItem, IonLabel, IonList, IonSelect, IonSelectOption } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import cronstrue from 'cronstrue/i18n';
import { shareReplay } from 'rxjs';
import { IconComponent } from '../../icon/icon.component';

type CronFieldKey = 'minute' | 'hour' | 'day' | 'month' | 'weekday';

interface WeekdayOption {
  label: string;
  value: number;
}

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
    IonSelect,
    IonSelectOption,
    TranslatePipe,
  ],
  templateUrl: './cron-builder.component.html',
  styleUrls: ['./cron-builder.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CronBuilderComponent extends LoggedClass implements OnInit {
  @Input()
  formControl!: FormControl;

  @Output()
  changeEvent = new EventEmitter<string>();

  readonly describeCron = input<boolean>(true);
  readonly disabled = input<boolean>(false);
  readonly hideDaily = input<boolean>(false);
  readonly hideInterval = input<boolean>(false);
  readonly hideWeekly = input<boolean>(false);
  readonly multiple = input<boolean>(false);

  value = model<string>(DEFAULT_CRON);
  displayedSchedule = model<string>('');

  readonly weekdays: WeekdayOption[] = [
    { label: 'component.cron_selector.weekdays.sunday', value: 0 },
    { label: 'component.cron_selector.weekdays.monday', value: 1 },
    { label: 'component.cron_selector.weekdays.tuesday', value: 2 },
    { label: 'component.cron_selector.weekdays.wednesday', value: 3 },
    { label: 'component.cron_selector.weekdays.thursday', value: 4 },
    { label: 'component.cron_selector.weekdays.friday', value: 5 },
    { label: 'component.cron_selector.weekdays.saturday', value: 6 },
  ];

  readonly hourOptions: number[] = Array.from({ length: 24 }, (_, index) => index);

  everyMinutesValue = parseIntervalValue(DEFAULT_FIELD_VALUES.minute);
  everyHourValue = parseIntervalValue(DEFAULT_FIELD_VALUES.hour);
  dailyAtHourValue = parseIntervalValue(DEFAULT_FIELD_VALUES.hour);
  presetWeekdays: number[] = [];
  accumulatedCrons: string[] = [];

  private readonly formBuilder = inject(FormBuilder);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fieldsForm: FormGroup<Record<CronFieldKey, FormControl<string>>> =
    this.formBuilder.nonNullable.group(DEFAULT_FIELD_VALUES);

  private scheduleRequestId = 0;

  constructor() {
    super();
    this.fieldsForm.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef), shareReplay({ bufferSize: 1, refCount: true }))
      .subscribe(() => this.setValue());

    this.translateService.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef), shareReplay({ bufferSize: 1, refCount: true }))
      .subscribe(() => void this.refresh());
  }

  async ngOnInit(): Promise<void> {
    this.parseInitialValue();
    this.setDisabledState(this.disabled());
    await this.refresh();
  }

  getFieldValue(key: CronFieldKey): string {
    return this.fieldsForm.controls[key].value;
  }

  setFieldValue(key: CronFieldKey, value: string): void {
    this.fieldsForm.controls[key].setValue(value.trim() || '*');
  }

  applyEveryMinutes(minutes: number): void {
    const value = Number.isNaN(minutes) ? 0 : minutes;
    this.everyMinutesValue = value;
    this.patchFields({ minute: `*/${value}`, hour: '*', day: '*', month: '*', weekday: '*' });
  }

  applyEveryHour(hours: number): void {
    const value = Number.isNaN(hours) ? 0 : hours;
    this.everyHourValue = value;
    this.patchFields({ minute: '0', hour: `*/${value}`, day: '*', month: '*', weekday: '*' });
  }

  applyDailyAt(hour: number): void {
    this.dailyAtHourValue = hour;
    this.patchFields({ minute: '0', hour: `${hour}`, day: '*', month: '*', weekday: '*' });
  }

  togglePresetWeekday(day: number): void {
    const set = new Set(this.presetWeekdays);
    if (set.has(day)) {
      set.delete(day);
    } else {
      set.add(day);
    }
    this.presetWeekdays = [...set].sort((a, b) => a - b);
    this.applyPresetWeekdays();
  }

  toggleAllWeekdays(): void {
    this.presetWeekdays = this.isPresetWeekdaySelected('all') ? [] : this.weekdays.map((day) => day.value);
    this.applyPresetWeekdays();
  }

  isPresetWeekdaySelected(day: number | 'all'): boolean {
    if (day === 'all') {
      return this.presetWeekdays.length === this.weekdays.length;
    }
    return this.presetWeekdays.includes(day);
  }

  weekdaySelectValue(): (number | 'all')[] {
    return this.isPresetWeekdaySelected('all') ? [...this.presetWeekdays, 'all'] : this.presetWeekdays;
  }

  onWeekdaysSelectChange(value: (number | 'all')[]): void {
    const values = value || [];
    const wasAllSelected = this.isPresetWeekdaySelected('all');
    const allJustChecked = values.includes('all') && !wasAllSelected;

    if (allJustChecked) {
      this.presetWeekdays = this.weekdays.map((day) => day.value);
      this.closeOpenSelectPopover();
    } else {
      this.presetWeekdays = values.filter((day): day is number => typeof day === 'number').sort((a, b) => a - b);
    }
    this.applyPresetWeekdays();
  }

  private closeOpenSelectPopover(): void {
    const popover = document.querySelector('ion-popover') as (Element & { dismiss(): Promise<boolean> }) | null;
    void popover?.dismiss();
  }

  applyMonthly(): void {
    this.patchFields({ minute: '0', hour: '0', day: '1', month: '*', weekday: '*' });
  }

  addAnother(): void {
    if (!this.multiple() || this.disabled()) return;

    const cron = this.createCron();
    if (this.accumulatedCrons.includes(cron)) return;

    this.accumulatedCrons = [...this.accumulatedCrons, cron];
    this.resetFieldsToDefault();
    this.setValue();
  }

  removeAccumulated(index: number): void {
    this.accumulatedCrons = this.accumulatedCrons.filter((_, current) => current !== index);
    this.setValue();
  }

  currentCron(): string {
    return this.createCron();
  }

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

  isPresetHidden(preset: 'minutes' | 'hour' | 'daily' | 'weekdays' | 'monthly'): boolean {
    if (preset === 'minutes' || preset === 'hour') return this.hideInterval();
    if (preset === 'daily') return this.hideDaily();
    if (preset === 'weekdays') return this.hideWeekly();
    return false;
  }

  readonly copied = signal(false);

  async copyToClipboard(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.currentCron());
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 1500);
    } catch (error: unknown) {
      this.log.for(this.copyToClipboard).error((error as Error)?.message || String(error));
    }
  }

  private applyPresetWeekdays(): void {
    const weekday = this.presetWeekdays.length && this.presetWeekdays.length < this.weekdays.length
      ? this.presetWeekdays.join(',')
      : '*';
    this.patchFields({ minute: '0', hour: '9', day: '*', month: '*', weekday });
  }

  private patchFields(values: Record<CronFieldKey, string>): void {
    this.fieldsForm.patchValue(values);
  }

  private resetFieldsToDefault(): void {
    this.fieldsForm.patchValue(DEFAULT_FIELD_VALUES, { emitEvent: false });
    this.everyMinutesValue = parseIntervalValue(DEFAULT_FIELD_VALUES.minute);
    this.everyHourValue = parseIntervalValue(DEFAULT_FIELD_VALUES.hour);
    this.dailyAtHourValue = parseIntervalValue(DEFAULT_FIELD_VALUES.hour);
    this.presetWeekdays = [];
  }

  private parseInitialValue(): void {
    const raw = (this.value() || DEFAULT_CRON).trim();
    const segments = this.multiple() ? raw.split(';').map((segment) => segment.trim()).filter(Boolean) : [raw];
    const last = segments.pop() || DEFAULT_CRON;
    this.accumulatedCrons = segments;

    const parts = last.split(/\s+/);
    if (parts.length !== 5) return;

    const values = CRON_FIELD_KEYS.reduce(
      (acc, key, index) => ({ ...acc, [key]: parts[index] || '*' }),
      {} as Record<CronFieldKey, string>
    );
    this.fieldsForm.patchValue(values, { emitEvent: false });
  }

  private setValue(): void {
    if (this.disabled()) return;

    const currentCron = this.createCron();
    const cron =
      this.multiple() && this.accumulatedCrons.length
        ? (this.accumulatedCrons.includes(currentCron) ? this.accumulatedCrons : [...this.accumulatedCrons, currentCron]).join(';')
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
      this.fieldsForm.disable({ emitEvent: false });
      return;
    }
    this.fieldsForm.enable({ emitEvent: false });
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
