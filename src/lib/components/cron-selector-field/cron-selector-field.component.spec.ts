import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { I18nFakeLoader } from '../../i18n';
import { CrudFormComponent } from '../crud-form/crud-form.component';
import { CronSelectorComponent } from '../cron-selector/cron-selector.component';
import { CronSelectorFieldComponent } from './cron-selector-field.component';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

describe('CronSelectorFieldComponent', () => {
  let component: CronSelectorFieldComponent;
  let fixture: ComponentFixture<CronSelectorFieldComponent>;
  let formGroup: FormGroup;

  async function setup(overrides: Partial<CronSelectorFieldComponent> = {}): Promise<void> {
    formGroup = new FormGroup({
      cronExpression: new FormControl<string | undefined>(undefined, {
        validators: [Validators.required],
      }),
    });

    fixture = TestBed.createComponent(CronSelectorFieldComponent);
    component = fixture.componentInstance;
    component.operation = OperationKeys.CREATE;
    component.allowEmpty = true;
    component.name = 'cronExpression';
    component.path = 'cronExpression';
    component.label = 'medication_schedule.cron_expression.label';
    component.type = 'text';
    component.required = true;
    component.formGroup = formGroup;
    component.formControl = formGroup.get('cronExpression') as FormControl<string | undefined>;
    Object.assign(component, overrides);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  }

  function toggle(): void {
    component.toggleVisibility();
    (component as unknown as { changeDetectorRef: { markForCheck(): void } }).changeDetectorRef.markForCheck();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        ForAngularCommonModule,
        CronSelectorFieldComponent,
        CrudFormComponent,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: I18nFakeLoader,
          },
        }),
      ],
      providers: [provideRouter([]), { provide: NavController, useValue: navControllerMock }],
    }).compileComponents();

    await setup();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty checkbox and hide the cron selector when no value is set', () => {
    expect(fixture.nativeElement.querySelector('ion-checkbox')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ngx-decaf-cron-selector')).toBeNull();
    expect(component.checked).toBe(false);
  });

  it('should force checked and hide the toggle checkbox when required and not allowEmpty', async () => {
    await setup({ allowEmpty: false, required: true });

    expect(component.checked).toBe(true);
    expect(fixture.nativeElement.querySelector('ion-checkbox')).toBeNull();
    expect(fixture.nativeElement.querySelector('ngx-decaf-cron-selector')).toBeTruthy();
  });

  it('should reveal the cron selector and set the default cron when the checkbox is toggled on', () => {
    toggle();

    expect(component.checked).toBe(true);
    expect(fixture.nativeElement.querySelector('ngx-decaf-cron-selector')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ion-button.dcf-cron-selector-close')).toBeTruthy();
  });

  it('should hide the cron selector but keep the cron value when toggled off on a required field', () => {
    toggle();
    expect(component.checked).toBe(true);

    toggle();

    expect(component.checked).toBe(false);
    expect(fixture.nativeElement.querySelector('ngx-decaf-cron-selector')).toBeNull();
    expect(component.formControl.value).toBe(component.defaultCron);
  });

  it('should clear the value when toggled off on a non-required field', async () => {
    await setup({ required: false });

    toggle();
    component.handleCronChange('0 9 * * *');
    expect(component.formControl.value).toBe('0 9 * * *');

    toggle();

    expect(component.checked).toBe(false);
    expect(component.formControl.value).toBe('');
  });

  it('should pass describeCron, hideDaily, hideInterval and hideWeekly through to the cron selector component', () => {
    component.describeCron = true;
    component.hideDaily = true;
    component.hideInterval = true;
    component.hideWeekly = true;
    toggle();

    const cronSelector = fixture.debugElement.query(By.directive(CronSelectorComponent));
    expect(cronSelector).toBeTruthy();
    expect(cronSelector.componentInstance.describeCron()).toBe(true);
    expect(cronSelector.componentInstance.hideDaily()).toBe(true);
    expect(cronSelector.componentInstance.hideInterval()).toBe(true);
    expect(cronSelector.componentInstance.hideWeekly()).toBe(true);
  });

  it('should update the form control value through handleCronChange', () => {
    toggle();

    component.handleCronChange('0 8 * * *');

    expect(component.formControl.value).toBe('0 8 * * *');
  });

  it('should not update the value through handleCronChange when read-only', () => {
    component.operation = OperationKeys.READ;
    toggle();
    component.formControl.setValue('0 7 * * *');

    component.handleCronChange('0 8 * * *');

    expect(component.formControl.value).toBe('0 7 * * *');
  });

  it('should fall back to defaultCron via cronValue when no value is set', async () => {
    await setup({ required: false });

    expect(component.hasCronValue).toBe(false);
    expect(component.cronValue).toBe(component.defaultCron);
  });

  it('should expose the current value through cronValue once set', () => {
    component.handleCronChange('0 6 * * *');
    expect(component.hasCronValue).toBe(true);
    expect(component.cronValue).toBe('0 6 * * *');
  });

  it('should compute showSelector based on allowEmpty and hasCronValue', async () => {
    await setup({ required: false });

    component.allowEmpty = false;
    expect(component.showSelector).toBe(true);

    component.allowEmpty = true;
    expect(component.showSelector).toBe(false);

    component.handleCronChange('0 5 * * *');
    expect(component.showSelector).toBe(true);
  });

  it('should keep required validation visible when the empty checkbox is unchecked on a non-required field', async () => {
    await setup({ required: false });

    toggle();
    toggle();
    component.formControl.markAsTouched();
    fixture.detectChanges();

    const error = component.getErrors(fixture.nativeElement as HTMLElement);
    expect(error || '').toMatch(/required/i);
    expect(component.errorMessage || '').toMatch(/required/i);
    expect(component.formControl.errors).toHaveProperty('required');
  });

  it('should set a default cron when the checkbox is checked and allow submission', async () => {
    toggle();

    expect(component.formControl.value).toBe(component.defaultCron);
    expect(fixture.nativeElement.querySelector('ngx-decaf-cron-selector')).toBeTruthy();

    component.handleCronChange('0 8 * * *');
    fixture.detectChanges();

    const form = TestBed.createComponent(CrudFormComponent).componentInstance;
    form.operation = OperationKeys.CREATE;
    form.formGroup = formGroup;
    const emitted: unknown[] = [];
    form.submitEvent.subscribe((event) => emitted.push(event));

    await form.ngOnInit();

    const result = await form.submit({
      preventDefault: () => undefined,
      stopImmediatePropagation: () => undefined,
    } as SubmitEvent);

    expect(result).toBeUndefined();
    expect(emitted).toHaveLength(1);
    expect((emitted[0] as { data: { cronExpression: string } }).data.cronExpression).toBe('0 8 * * *');
  });

  it('should block submission when the empty checkbox is unchecked on a non-required field', async () => {
    await setup({ required: false });

    toggle();
    toggle();

    const form = TestBed.createComponent(CrudFormComponent).componentInstance;
    form.operation = OperationKeys.CREATE;
    form.formGroup = formGroup;
    const emitted: unknown[] = [];
    form.submitEvent.subscribe((event) => emitted.push(event));

    await form.ngOnInit();

    const result = await form.submit({
      preventDefault: () => undefined,
      stopImmediatePropagation: () => undefined,
    } as SubmitEvent);

    expect(result).toBe(false);
    expect(emitted).toHaveLength(0);
    expect(component.formControl.errors).toHaveProperty('required');
  });
});
