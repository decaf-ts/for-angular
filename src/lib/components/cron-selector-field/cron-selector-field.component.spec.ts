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
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

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
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show the empty checkbox and hide the cron selector when no value is set', () => {
    expect(fixture.nativeElement.querySelector('ion-checkbox')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('ngx-decaf-cron-selector')).toBeNull();
  });

  it('should pass describeCron through to the cron selector component', () => {
    component.describeCron = true;
    component.toggleEmpty(true);
    fixture.detectChanges();

    const cronSelector = fixture.debugElement.query(By.directive(CronSelectorComponent));
    expect(cronSelector).toBeTruthy();
    expect(cronSelector.componentInstance.describeCron()).toBe(true);
  });

  it('should keep required validation visible when the empty checkbox is unchecked', () => {
    component.toggleEmpty(true);
    component.toggleEmpty(false);
    component.formControl.markAsTouched();
    fixture.detectChanges();

    const error = component.getErrors(fixture.nativeElement as HTMLElement);
    expect(error || '').toMatch(/required/i);
    expect(component.errorMessage || '').toMatch(/required/i);
    expect(component.formControl.errors).toHaveProperty('required');
  });

  it('should set a default cron when the checkbox is checked and allow submission', async () => {
    component.toggleEmpty(true);
    fixture.detectChanges();

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

    const result = await form.submit(
      {
        preventDefault: () => undefined,
        stopImmediatePropagation: () => undefined,
      } as SubmitEvent
    );

    expect(result).toBeUndefined();
    expect(emitted).toHaveLength(1);
    expect((emitted[0] as { data: { cronExpression: string } }).data.cronExpression).toBe('0 8 * * *');
  });

  it('should block submission when the empty checkbox is unchecked', async () => {
    component.toggleEmpty(true);
    component.toggleEmpty(false);
    fixture.detectChanges();

    const form = TestBed.createComponent(CrudFormComponent).componentInstance;
    form.operation = OperationKeys.CREATE;
    form.formGroup = formGroup;
    const emitted: unknown[] = [];
    form.submitEvent.subscribe((event) => emitted.push(event));

    await form.ngOnInit();

    const result = await form.submit(
      {
        preventDefault: () => undefined,
        stopImmediatePropagation: () => undefined,
      } as SubmitEvent
    );

    expect(result).toBe(false);
    expect(emitted).toHaveLength(0);
    expect(component.formControl.errors).toHaveProperty('required');
  });
});
