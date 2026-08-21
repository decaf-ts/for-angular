import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormBuilder, FormControl } from '@angular/forms';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { I18nFakeLoader } from '../../../i18n';
import { CronBuilderComponent } from './cron-builder.component';

async function waitForScheduleValue(
  fixture: ComponentFixture<CronBuilderComponent>,
  component: CronBuilderComponent,
  expected: string
): Promise<void> {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    fixture.detectChanges();

    if (component.displayedSchedule() === expected) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  fixture.detectChanges();
}

describe('CronBuilderComponent', () => {
  let component: CronBuilderComponent;
  let fixture: ComponentFixture<CronBuilderComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CronBuilderComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: I18nFakeLoader,
          },
        }),
      ],
      providers: [FormBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(CronBuilderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse the initial value into the five raw cron fields', () => {
    expect(component.getFieldValue('minute')).toBe('0');
    expect(component.getFieldValue('hour')).toBe('9');
    expect(component.getFieldValue('day')).toBe('*');
    expect(component.getFieldValue('month')).toBe('*');
    expect(component.getFieldValue('weekday')).toBe('*');
    expect(component.value()).toBe('0 9 * * *');
  });

  it('should react to direct edits on the raw fields', () => {
    component.setFieldValue('minute', '15');
    component.setFieldValue('hour', '3');
    fixture.detectChanges();

    expect(component.value()).toBe('15 3 * * *');
  });

  it('should normalize an empty raw field back to *', () => {
    component.setFieldValue('day', '');
    fixture.detectChanges();

    expect(component.getFieldValue('day')).toBe('*');
    expect(component.value()).toBe('0 9 * * *');
  });

  it('should apply the every-minutes preset overwriting all fields', () => {
    component.applyEveryMinutes(5);
    fixture.detectChanges();

    expect(component.value()).toBe('*/5 * * * *');
  });

  it('should apply the every-hour preset overwriting all fields', () => {
    component.applyEveryHour(2);
    fixture.detectChanges();

    expect(component.value()).toBe('0 */2 * * *');
  });

  it('should accept 0 for the every-minutes and every-hour presets', () => {
    component.applyEveryMinutes(0);
    fixture.detectChanges();

    expect(component.value()).toBe('*/0 * * * *');
    expect(component.everyMinutesValue).toBe(0);

    component.applyEveryHour(0);
    fixture.detectChanges();

    expect(component.value()).toBe('0 */0 * * *');
    expect(component.everyHourValue).toBe(0);
  });

  it('should default the every-minutes and every-hour preset inputs from the default cron', () => {
    expect(component.everyMinutesValue).toBe(0);
    expect(component.everyHourValue).toBe(9);
    expect(component.dailyAtHourValue).toBe(9);
  });

  it('should apply the daily-at preset', () => {
    component.applyDailyAt(14);
    fixture.detectChanges();

    expect(component.value()).toBe('0 14 * * *');
  });

  it('should toggle weekdays and apply the weekdays preset', () => {
    component.togglePresetWeekday(1);
    component.togglePresetWeekday(3);
    fixture.detectChanges();

    expect(component.isPresetWeekdaySelected(1)).toBe(true);
    expect(component.value()).toBe('0 9 * * 1,3');

    component.togglePresetWeekday(1);
    fixture.detectChanges();

    expect(component.isPresetWeekdaySelected(1)).toBe(false);
    expect(component.value()).toBe('0 9 * * 3');
  });

  it('should treat all weekdays selected as *', () => {
    component.toggleAllWeekdays();
    fixture.detectChanges();

    expect(component.value()).toBe('0 9 * * *');
    expect(component.isPresetWeekdaySelected('all')).toBe(true);

    component.toggleAllWeekdays();
    fixture.detectChanges();

    expect(component.isPresetWeekdaySelected('all')).toBe(false);
  });

  it('should apply the monthly preset', () => {
    component.applyMonthly();
    fixture.detectChanges();

    expect(component.value()).toBe('0 0 1 * *');
  });

  it('should hide interval, daily and weekly presets independently', () => {
    fixture.componentRef.setInput('hideInterval', true);
    fixture.componentRef.setInput('hideDaily', true);
    fixture.componentRef.setInput('hideWeekly', true);
    fixture.detectChanges();

    expect(component.isPresetHidden('minutes')).toBe(true);
    expect(component.isPresetHidden('hour')).toBe(true);
    expect(component.isPresetHidden('daily')).toBe(true);
    expect(component.isPresetHidden('weekdays')).toBe(true);
    expect(component.isPresetHidden('monthly')).toBe(false);
  });

  it('should not change the value while disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();

    component.applyDailyAt(14);
    fixture.detectChanges();

    expect(component.value()).toBe('0 9 * * *');
  });

  it('should propagate changes to a bound formControl', () => {
    const formControl = new FormControl('');
    fixture.componentRef.instance.formControl = formControl;

    component.applyMonthly();
    fixture.detectChanges();

    expect(formControl.value).toBe('0 0 1 * *');
  });

  it('should emit changeEvent with the generated cron expression', () => {
    const emitted: string[] = [];
    component.changeEvent.subscribe((value: string) => emitted.push(value));

    component.applyEveryMinutes(10);
    fixture.detectChanges();

    expect(emitted).toContain('*/10 * * * *');
  });

  it('should render a human readable schedule when describeCron is enabled', async () => {
    await firstValueFrom(TestBed.inject(TranslateService).use('en'));
    fixture.componentRef.setInput('describeCron', true);
    component.applyDailyAt(9);
    fixture.detectChanges();

    await waitForScheduleValue(fixture, component, 'At 09:00');

    expect(component.value()).toBe('0 9 * * *');
  });

  it('should render the schedule in the active language when describeCron is enabled', async () => {
    const translateService = TestBed.inject(TranslateService);

    fixture.componentRef.setInput('describeCron', true);
    component.applyDailyAt(9);
    fixture.detectChanges();

    await waitForScheduleValue(fixture, component, 'At 09:00');

    await firstValueFrom(translateService.use('pt'));
    await waitForScheduleValue(fixture, component, 'Às 09:00');

    expect(component.displayedSchedule()).toBe('Às 09:00');
  });

  it('should not accumulate crons when multiple is disabled', () => {
    component.applyDailyAt(14);
    component.addAnother();
    fixture.detectChanges();

    expect(component.accumulatedCrons).toEqual([]);
    expect(component.value()).toBe('0 14 * * *');
  });

  it('should accumulate the current cron and reset to the default state when multiple is enabled', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    component.applyDailyAt(14);
    component.addAnother();
    fixture.detectChanges();

    expect(component.accumulatedCrons).toEqual(['0 14 * * *']);
    expect(component.getFieldValue('hour')).toBe('9');
    expect(component.value()).toBe('0 14 * * *;0 9 * * *');

    component.applyEveryMinutes(5);
    fixture.detectChanges();

    expect(component.value()).toBe('0 14 * * *;*/5 * * * *');

    component.addAnother();
    fixture.detectChanges();

    expect(component.accumulatedCrons).toEqual(['0 14 * * *', '*/5 * * * *']);
    expect(component.value()).toBe('0 14 * * *;*/5 * * * *;0 9 * * *');
  });

  it('should not add a duplicate cron when it already exists in the accumulated list', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    component.applyDailyAt(14);
    component.addAnother();
    fixture.detectChanges();

    expect(component.accumulatedCrons).toEqual(['0 14 * * *']);

    component.applyDailyAt(14);
    component.addAnother();
    fixture.detectChanges();

    expect(component.accumulatedCrons).toEqual(['0 14 * * *']);
    expect(component.value()).toBe('0 14 * * *');
  });

  it('should keep the current-cron display separate from the accumulated form value', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    component.applyDailyAt(14);
    component.addAnother();
    fixture.detectChanges();

    expect(component.currentCron()).toBe('0 9 * * *');
    expect(component.value()).toBe('0 14 * * *;0 9 * * *');

    component.applyEveryMinutes(5);
    fixture.detectChanges();

    expect(component.currentCron()).toBe('*/5 * * * *');
    expect(component.value()).toBe('0 14 * * *;*/5 * * * *');
  });

  it('should describe each accumulated cron with a readable label', async () => {
    await firstValueFrom(TestBed.inject(TranslateService).use('en'));
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    component.applyDailyAt(14);
    component.addAnother();
    fixture.detectChanges();

    expect(component.describeAccumulatedCron(component.accumulatedCrons[0])).toBe('At 14:00');
  });

  it('should remove an accumulated cron by index', () => {
    fixture.componentRef.setInput('multiple', true);
    fixture.detectChanges();

    component.applyDailyAt(14);
    component.addAnother();
    component.applyEveryMinutes(5);
    component.addAnother();
    fixture.detectChanges();

    expect(component.accumulatedCrons).toEqual(['0 14 * * *', '*/5 * * * *']);

    component.removeAccumulated(0);
    fixture.detectChanges();

    expect(component.accumulatedCrons).toEqual(['*/5 * * * *']);
    expect(component.value()).toBe('*/5 * * * *;0 9 * * *');
  });

  it('should parse a semicolon separated value into accumulated crons on init when multiple is enabled', () => {
    const freshFixture = TestBed.createComponent(CronBuilderComponent);
    freshFixture.componentRef.setInput('multiple', true);
    freshFixture.componentRef.setInput('value', '0 14 * * *;*/5 * * * *');
    freshFixture.detectChanges();

    const freshComponent = freshFixture.componentInstance;

    expect(freshComponent.accumulatedCrons).toEqual(['0 14 * * *']);
    expect(freshComponent.getFieldValue('minute')).toBe('*/5');
    expect(freshComponent.getFieldValue('hour')).toBe('*');
  });
});
