import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { I18nFakeLoader } from '../../i18n';
import { CronSelectorComponent } from './cron-selector.component';
import { firstValueFrom } from 'rxjs';

async function waitForScheduleValue(
  fixture: ComponentFixture<CronSelectorComponent>,
  component: CronSelectorComponent,
  expected: string
): Promise<void> {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    fixture.detectChanges();

    if (component.generatedSchedule === expected) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  fixture.detectChanges();
}

describe('CronSelectorComponent', () => {
  let component: CronSelectorComponent;
  let fixture: ComponentFixture<CronSelectorComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        CronSelectorComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: I18nFakeLoader,
          },
        }),
      ],
      providers: [FormBuilder],
    }).compileComponents();

    fixture = TestBed.createComponent(CronSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should serialize daily times with a shared minute into one cron expression', () => {
    component.writeValue('0 9,21 * * *');

    expect(component.form.controls.mode.value).toBe('daily');
    expect(component.form.controls.times.value).toEqual(['09:00', '21:00']);
    expect(component.generatedCron).toBe('0 9,21 * * *');
  });

  it('should serialize daily times with different minutes into multiple expressions', () => {
    component.writeValue('0 8 * * *;30 20 * * *');

    expect(component.form.controls.mode.value).toBe('daily');
    expect(component.form.controls.times.value).toEqual(['08:00', '20:30']);
    expect(component.generatedCron).toBe('0 8 * * *;30 20 * * *');
  });

  it('should serialize hourly schedules', () => {
    component.writeValue('0 */6 * * *');

    expect(component.form.controls.mode.value).toBe('hourly');
    expect(component.form.controls.everyHours.value).toBe(6);
    expect(component.generatedCron).toBe('0 */6 * * *');
  });

  it('should hide configured schedule modes and fall back to the first visible one', () => {
    component.hideDaily = true;
    component.hideWeekly = true;
    component.ngOnChanges();
    fixture.detectChanges();

    expect(component.visibleModes).toEqual(['hourly']);
    expect(component.form.controls.mode.value).toBe('hourly');
  });

  it('should serialize weekly schedules with selected weekdays', () => {
    component.writeValue('30 8 * * 1,3,5');

    expect(component.form.controls.mode.value).toBe('weekly');
    expect(component.form.controls.times.value).toEqual(['08:30']);
    expect(component.form.controls.weekdays.value).toEqual([1, 3, 5]);
    expect(component.generatedCron).toBe('30 8 * * 1,3,5');
  });

  it('should serialize weekly schedules with multiple hours into one cron expression when the minute matches', () => {
    component.writeValue('30 8,20 * * 1,3,5');

    expect(component.form.controls.mode.value).toBe('weekly');
    expect(component.form.controls.times.value).toEqual(['08:30', '20:30']);
    expect(component.form.controls.weekdays.value).toEqual([1, 3, 5]);
    expect(component.generatedCron).toBe('30 8,20 * * 1,3,5');
  });

  it('should serialize weekly schedules with different minutes into multiple expressions', () => {
    component.writeValue('30 8 * * 1,3,5;45 10 * * 1,3,5');

    expect(component.form.controls.mode.value).toBe('weekly');
    expect(component.form.controls.times.value).toEqual(['08:30', '10:45']);
    expect(component.form.controls.weekdays.value).toEqual([1, 3, 5]);
    expect(component.generatedCron).toBe('30 8 * * 1,3,5;45 10 * * 1,3,5');
  });

  it('should emit cron changes when the form updates', () => {
    const emitted: string[] = [];
    component.cronChange.subscribe((value) => emitted.push(value));

    component.form.controls.mode.setValue('hourly');
    component.form.controls.everyHours.setValue(12);

    expect(emitted.at(-1)).toBe('0 */12 * * *');
  });

  it('should render a human readable schedule when describeCron is enabled', async () => {
    component.describeCron = true;
    component.writeValue('0 9 * * *');

    await waitForScheduleValue(fixture, component, 'At 09:00');

    expect(component.generatedCron).toBe('0 9 * * *');
    expect(component.generatedSchedule).toBe('At 09:00');
  });

  it('should render the schedule in the active language when describeCron is enabled', async () => {
    const translateService = TestBed.inject(TranslateService);

    component.describeCron = true;
    component.writeValue('0 9 * * *');

    await waitForScheduleValue(fixture, component, 'At 09:00');

    await firstValueFrom(translateService.use('pt'));
    await waitForScheduleValue(fixture, component, 'Às 09:00');

    expect(component.generatedSchedule).toBe('Às 09:00');
  });
});
