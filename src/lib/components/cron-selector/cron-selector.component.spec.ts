import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { I18nFakeLoader } from '../../i18n';
import { CronSelectorComponent } from './cron-selector.component';

async function waitForScheduleValue(
  fixture: ComponentFixture<CronSelectorComponent>,
  component: CronSelectorComponent,
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
    component.setControlValue('times', ['09:00', '21:00']);
    fixture.detectChanges();

    expect(component.form.controls.mode.value).toBe('daily');
    expect(component.value()).toBe('0 9,21 * * *');
  });

  it('should serialize daily times with different minutes into multiple expressions', () => {
    component.setControlValue('times', ['08:00', '20:30']);
    fixture.detectChanges();

    expect(component.form.controls.mode.value).toBe('daily');
    expect(component.value()).toBe('0 8 * * *;30 20 * * *');
  });

  it('should serialize hourly schedules', () => {
    component.setControlValue('mode', 'hourly');
    component.setControlValue('everyHours', 6);
    fixture.detectChanges();

    expect(component.value()).toBe('0 */6 * * *');
  });

  it('should hide configured schedule modes', () => {
    fixture.componentRef.setInput('hideDaily', true);
    fixture.componentRef.setInput('hideWeekly', true);
    fixture.detectChanges();

    expect(component.modes()).toEqual(['hourly']);
  });

  it('should serialize weekly schedules with selected weekdays', () => {
    component.setControlValue('mode', 'weekly');
    component.setControlValue('times', ['08:30']);
    component.setControlValue('weekdays', [1, 3, 5]);
    fixture.detectChanges();

    expect(component.value()).toBe('30 8 * * 1,3,5');
  });

  it('should serialize weekly schedules with multiple hours into one cron expression when the minute matches', () => {
    component.setControlValue('mode', 'weekly');
    component.setControlValue('times', ['08:30', '20:30']);
    component.setControlValue('weekdays', [1, 3, 5]);
    fixture.detectChanges();

    expect(component.value()).toBe('30 8,20 * * 1,3,5');
  });

  it('should serialize weekly schedules with different minutes into multiple expressions', () => {
    component.setControlValue('mode', 'weekly');
    component.setControlValue('times', ['08:30', '10:45']);
    component.setControlValue('weekdays', [1, 3, 5]);
    fixture.detectChanges();

    expect(component.value()).toBe('30 8 * * 1,3,5;45 10 * * 1,3,5');
  });

  it('should toggle weekdays on and off', () => {
    component.setControlValue('mode', 'weekly');
    component.toggleWeekday(6, true);

    expect(component.isWeekdaySelected(6)).toBe(true);

    component.toggleWeekday(1, false);

    expect(component.isWeekdaySelected(1)).toBe(false);
  });

  it('should update the value signal when the form updates', () => {
    component.form.controls.mode.setValue('hourly');
    component.form.controls.everyHours.setValue(12);

    expect(component.value()).toBe('0 */12 * * *');
  });

  it('should render a human readable schedule when describeCron is enabled', async () => {
    await firstValueFrom(TestBed.inject(TranslateService).use('en'));
    fixture.componentRef.setInput('describeCron', true);
    component.setControlValue('times', ['09:00']);
    fixture.detectChanges();

    await waitForScheduleValue(fixture, component, 'At 09:00');

    expect(component.value()).toBe('0 9 * * *');
    expect(component.displayedSchedule()).toBe('At 09:00');
  });

  it('should render the schedule in the active language when describeCron is enabled', async () => {
    const translateService = TestBed.inject(TranslateService);

    fixture.componentRef.setInput('describeCron', true);
    component.setControlValue('times', ['09:00']);
    fixture.detectChanges();

    await waitForScheduleValue(fixture, component, 'At 09:00');

    await firstValueFrom(translateService.use('pt'));
    await waitForScheduleValue(fixture, component, 'Às 09:00');

    expect(component.displayedSchedule()).toBe('Às 09:00');
  });
});
