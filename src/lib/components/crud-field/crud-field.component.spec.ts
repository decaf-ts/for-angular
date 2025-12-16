import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrudFieldComponent } from './crud-field.component';
import { FormControl, FormGroup } from '@angular/forms';
import { AngularFieldDefinition } from '../../engine';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgxFormService } from '../../services/NgxFormService';
import { By } from '@angular/platform-browser';
import { I18nFakeLoader, MockedEnTranslations } from '../../i18n/FakeLoader';

const imports = [
  ForAngularCommonModule,
  CrudFieldComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: I18nFakeLoader,
    },
  }),
];

async function getErrorMessage(fixture: ComponentFixture<CrudFieldComponent>, selector: string = 'ion-input'): Promise<HTMLElement> {
  const ionInput = fixture.debugElement.query(By.css(selector)).componentInstance;
  await ionInput.getInputElement();
  const errorText = ionInput.errorText;
  const errorElement = fixture.nativeElement.querySelector('.error-text');
  fixture.detectChanges();
  return errorElement?.textContent || errorText;
}

function updateFieldValidators(fixture: ComponentFixture<CrudFieldComponent>, component: CrudFieldComponent): void {
    fixture.detectChanges();
    const validators = NgxFormService['validatorsFromProps'](component);
    component.formControl = new FormControl(component.value, validators);
    component.formGroup = new FormGroup({
      [component.name]: component.formControl,
    });
    component.formGroup.get(component.name)?.markAsTouched();
    component.formGroup.get(component.name)?.markAsDirty();

    fixture.detectChanges();

}

describe('CrudFieldComponent', () => {
  let component: CrudFieldComponent;
  let fixture: ComponentFixture<CrudFieldComponent>;
  // let formBuilder: FormBuilder;
  let translateService: TranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports,
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    fixture = TestBed.createComponent(CrudFieldComponent);
    component = fixture.componentInstance;
    translateService = component['translateService'];
    translateService.setFallbackLang('en');
    component.name = 'test_field';
    component.type = 'text';
    component.operation = OperationKeys.CREATE;
    component.formControl = new FormControl('value');
    component.formGroup = new FormGroup({
      [component.name]: component.formControl,
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const testCases: { type: string; selector: string, value: any }[] = [
    { type: 'textarea', selector: 'ion-textarea', value: 'textarea value' },
    { type: 'checkbox', selector: 'ion-checkbox', value: 'checkbox value' },
    { type: 'radio', selector: 'ion-radio-group', value: 'checkbox value' },
    { type: 'select', selector: 'ion-select', value: 'select value' },
    { type: 'text', selector: 'ion-input', value: 'text value' },
    { type: 'number', selector: 'ion-input', value: 100 },
    { type: 'email', selector: 'ion-input', value: 'mail@mail.com' },
    { type: 'password', selector: 'ion-input', value: 'P@ssw0rd' },
    { type: 'date', selector: 'ion-input', value: '2025-01-01' },
  ];

  testCases.forEach(({ type, selector, value }) => {
    it(`should render ${type} when type is ${type}`, () => {
      const props: AngularFieldDefinition = {
        name: `test_${type}`,
        type: type as string,
        label: `Test.${type}`,
      } as unknown as AngularFieldDefinition;
      if (type === 'radio' || type === 'select') {
        props['options'] = [
          { value: 'option1', text: 'Option 1' },
          { value: 'option2', text: 'Option 2' },
        ];
        fixture.detectChanges();
      }

      component.formControl = new FormControl(value);
      component.formGroup = new FormGroup({
        [props.name]: component.formControl,
      });
      component.translatable = false;

      Object.entries(props).forEach(([key, value]) => (component as any)[key] = value);
      // component.props = props;
      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector(selector);
      expect(element).toBeTruthy();
      if (type === 'radio') {
        const radioButtons =
          fixture.nativeElement.querySelectorAll('ion-radio');
        expect(radioButtons.length).toBe(2);
      } else if (type === 'select') {
        const options =
          fixture.nativeElement.querySelectorAll('ion-select-option');
        expect(options.length).toBe(2);
      }
    });
  });

  it('should show error message when required field is empty', async () => {
    component.label = 'Required Field';
    component.required = true;
    component.value = '';

    updateFieldValidators(fixture, component);

    const errorMessage = await getErrorMessage(fixture);
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toContain('required');
  });

  it('should show error message when minlength is not met', async () => {
    component.label = 'Minlength Field';
    component.minlength = 5;
    component.value = 'abc';

    updateFieldValidators(fixture, component);

    const errorMessage = await getErrorMessage(fixture);
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toContain('minlength');
  });

  it('should show error message when maxlength is exceeded', async () => {
    component.label = 'Maxlength Field';
    component.maxlength = 5;
    component.value = 'abcdef';

    updateFieldValidators(fixture, component);

    const errorMessage = await getErrorMessage(fixture);
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toContain('maxlength');
  });

  it('should show error message when pattern is not matched', async () => {

    component.label = 'Pattern Field';
    component.pattern = '^[A-Za-z]+$';
    component.value = '123';

    updateFieldValidators(fixture, component);

    const errorMessage = await getErrorMessage(fixture);
    expect(errorMessage).toBeTruthy();
    expect(errorMessage).toContain('pattern');
  });

  it('should show error message when min value is not met', async() => {
    component.type = 'number';
    component.label = 'Min Field';
    component.min = 5;
    component.value = 3;
    updateFieldValidators(fixture, component);
    const errorMessage = await getErrorMessage(fixture);
    expect(component.formControl.errors?.['min']).toBeTruthy();
    expect(errorMessage).toContain('min');
  });

  it('should show error message when max value is exceeded', async () => {
    component.type = 'number';
    component.label = 'Min Field';
    component.max = 5;
    component.value = 13;

    updateFieldValidators(fixture, component);
    const errorMessage = await getErrorMessage(fixture);
    expect(component.formControl.errors?.['max']).toBeTruthy();
    expect(errorMessage).toContain('max');

  });

  it('should not show error message when field is valid', async () => {
    component.label = 'Valid Field';
    component.value = 'Valid input';
    updateFieldValidators(fixture, component);

    const errorMessage = await getErrorMessage(fixture);
    expect(errorMessage).toBeFalsy();
    expect(component.formControl.errors).toBeNull();
  });

  it('should translate labels and placeholders', () => {
    // Mock translate service
    // spyOn(translateService, 'instant').mockImplementation((key) => {
    //   if (key === 'FIELD_LABEL') return 'Translated Label';
    //   if (key === 'FIELD_PLACEHOLDER') return 'Translated Placeholder';
    //   return key;
    // });


    fixture.detectChanges();
    component.label = MockedEnTranslations.FIELD_LABEL;
    component.placeholder = MockedEnTranslations.FIELD_PLACEHOLDER;
    component.value = '';
    component.translatable = true;
    fixture.detectChanges();

    jest.spyOn(component, 'ngOnInit');
    component.ngOnInit(); // Aciona manualmente o método
    expect(component.ngOnInit).toHaveBeenCalled(); // Testa se foi chamado
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(input.label).toBe('Translated Label');
    expect(input.placeholder).toBe('Translated Placeholder');
  });

  it('should handle readonly attribute correctly', () => {
    component.label = 'Readonly Field';
    component.value = '';
    component.readonly = true;

    updateFieldValidators(fixture, component);

    const input = fixture.nativeElement.querySelector('ion-input') || fixture.nativeElement.querySelector('ion-item');
    if(input.tagName.toLowerCase() === 'ion-input') {
      expect(input.readonly).toBeTruthy();
    } else {
      expect(input.classList.contains('dcf-item-readonly')).toBeTruthy();
    }
  });

  it('should handle disabled attribute correctly', () => {
    component.label = 'Disabled Field';
    component.value = '';
    fixture.detectChanges();

    if (!component.formGroup)
      component.formGroup = new FormGroup({});

    component.formGroup.disable();
    const input = fixture.nativeElement.querySelector('ion-input');
    expect(component.formGroup.disabled).toBeTruthy();
    expect(input.disabled).toBeTruthy();
  });
});
