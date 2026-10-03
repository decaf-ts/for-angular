import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FormControl, FormGroup } from '@angular/forms';
import { NavController } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { CrudFieldComponent } from './crud-field.component';
import { AngularFieldDefinition } from '../../engine/types';
import { NgxTranslateService } from '../../services/NgxTranslateService';
import { ForAngularCommonModule } from '../../for-angular-common.module';
import { NgxFormService } from '../../services/NgxFormService';
import { I18nFakeLoader, MockedEnTranslations } from '../../i18n/FakeLoader';

const navControllerMock = {
  navigateRoot: jest.fn(),
  navigateForward: jest.fn(),
  navigateBack: jest.fn(),
};

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

async function getErrorMessage(
  fixture: ComponentFixture<CrudFieldComponent>,
  selector: string = 'ion-input',
): Promise<HTMLElement> {
  const ionInput = fixture.debugElement.query(By.css(selector)).componentInstance;
  await ionInput.getInputElement();
  const errorText = ionInput.errorText;
  const errorElement = fixture.nativeElement.querySelector('.error-text');
  fixture.detectChanges();
  return errorElement?.textContent || errorText;
}

function updateFieldValidators(
  fixture: ComponentFixture<CrudFieldComponent>,
  component: CrudFieldComponent,
): void {
  (component as any).initialized = true;
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
  let translateService: NgxTranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports,
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        provideRouter([]),
        { provide: NavController, useValue: navControllerMock },
      ],
    }).compileComponents();

    translateService = TestBed.inject(NgxTranslateService);
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

  it('baseline groups and error element', () => {
    // 1. Checkbox group (3 options)
    component.type = 'checkbox';
    component.label = 'Checkboxes';
    component.options = [
      { value: 'opt1', text: 'Option 1' },
      { value: 'opt2', text: 'Option 2' },
      { value: 'opt3', text: 'Option 3' },
    ];
    component.required = true;
    component.value = [];
    updateFieldValidators(fixture, component);

    const checkboxes = fixture.nativeElement.querySelectorAll('.dcf-checkbox-group ion-checkbox');
    expect(checkboxes.length).toBe(3);
    const checkboxGroup = fixture.nativeElement.querySelector('.dcf-checkbox-group');
    expect(checkboxGroup.getAttribute('role')).toBe('group');
    const checkboxError = fixture.nativeElement.querySelector('.dcf-checkbox-group .dcf-input-error');
    expect(checkboxError).toBeTruthy();

    // 2. Radio group (3 options)
    component.type = 'radio';
    component.label = 'Radios';
    component.options = [
      { value: 'opt1', text: 'Option 1' },
      { value: 'opt2', text: 'Option 2' },
      { value: 'opt3', text: 'Option 3' },
    ];
    component.required = true;
    component.value = '';
    updateFieldValidators(fixture, component);

    const radios = fixture.nativeElement.querySelectorAll('ion-radio-group ion-radio');
    expect(radios.length).toBe(3);
    const radioError = fixture.nativeElement.querySelector('.dcf-input-error');
    expect(radioError).toBeTruthy();

    // 3. Select (3 options)
    component.type = 'select';
    component.label = 'Select Field';
    (component as any).initialized = false;
    component.options = [
      { value: 'opt1', text: 'Option 1' },
      { value: 'opt2', text: 'Option 2' },
      { value: 'opt3', text: 'Option 3' },
    ];
    component.required = true;
    component.value = '';
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dcf-input-error')).toBeNull();
    const uninitializedSelect = fixture.nativeElement.querySelector('ion-select');
    expect(uninitializedSelect.getAttribute('aria-describedby')).toBeNull();

    (component as any).initialized = true;
    updateFieldValidators(fixture, component);

    const select = fixture.nativeElement.querySelector('ion-select');
    expect(select).toBeTruthy();
    const selectOptions = fixture.nativeElement.querySelectorAll('ion-select-option');
    expect(selectOptions.length).toBe(3);
    const selectError = fixture.nativeElement.querySelector('.dcf-input-error');
    expect(selectError).toBeTruthy();
    expect(select.getAttribute('aria-describedby')).toBe(selectError.id);
  });

  it('regression option ids unique', () => {
    component.type = 'checkbox';
    component.label = 'Checkboxes';
    component.options = [
      { value: 'opt1', text: 'Option 1' },
      { value: 'opt2', text: 'Option 2' },
      { value: 'opt3', text: 'Option 3' },
    ];
    updateFieldValidators(fixture, component);

    const checkboxes = Array.from(
      fixture.nativeElement.querySelectorAll('.dcf-checkbox-group ion-checkbox')
    ) as HTMLElement[];
    expect(checkboxes.length).toBe(3);
    const ids = checkboxes.map((cb) => cb.getAttribute('id') || cb.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
    expect(ids).not.toContain(component.path);
  });

  it('error is announced and described', () => {
    const cases = [
      {
        type: 'checkbox',
        selector: '.dcf-checkbox-group',
        value: [],
        options: [
          { value: 'opt1', text: 'Option 1' },
          { value: 'opt2', text: 'Option 2' },
          { value: 'opt3', text: 'Option 3' },
        ],
      },
      {
        type: 'radio',
        selector: 'ion-radio-group',
        value: '',
        options: [
          { value: 'opt1', text: 'Option 1' },
          { value: 'opt2', text: 'Option 2' },
          { value: 'opt3', text: 'Option 3' },
        ],
      },
      {
        type: 'select',
        selector: 'ion-select',
        value: '',
        options: [
          { value: 'opt1', text: 'Option 1' },
          { value: 'opt2', text: 'Option 2' },
          { value: 'opt3', text: 'Option 3' },
        ],
      },
    ];

    for (const c of cases) {
      component.type = c.type;
      component.label = `${c.type} label`;
      component.options = c.options;
      component.required = true;
      component.value = c.value;
      updateFieldValidators(fixture, component);

      const errorEl = fixture.nativeElement.querySelector('.dcf-input-error');
      expect(errorEl).not.toBeNull();
      expect(errorEl.getAttribute('id')).toBe(`${component.path}-error`);
      expect(errorEl.getAttribute('role')).toBe('alert');

      const control = fixture.nativeElement.querySelector(c.selector);
      expect(control).not.toBeNull();
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(control.getAttribute('aria-describedby')).toBe(`${component.path}-error`);
    }
  });

  it('no error no aria', () => {
    const cases = [
      {
        type: 'checkbox',
        selector: '.dcf-checkbox-group',
        value: ['opt1'],
        options: [
          { value: 'opt1', text: 'Option 1' },
          { value: 'opt2', text: 'Option 2' },
          { value: 'opt3', text: 'Option 3' },
        ],
      },
      {
        type: 'radio',
        selector: 'ion-radio-group',
        value: 'opt1',
        options: [
          { value: 'opt1', text: 'Option 1' },
          { value: 'opt2', text: 'Option 2' },
          { value: 'opt3', text: 'Option 3' },
        ],
      },
      {
        type: 'select',
        selector: 'ion-select',
        value: 'opt1',
        options: [
          { value: 'opt1', text: 'Option 1' },
          { value: 'opt2', text: 'Option 2' },
          { value: 'opt3', text: 'Option 3' },
        ],
      },
    ];

    for (const c of cases) {
      component.type = c.type;
      component.label = `${c.type} label`;
      component.options = c.options;
      component.required = true;
      component.value = c.value;
      updateFieldValidators(fixture, component);

      const control = fixture.nativeElement.querySelector(c.selector);
      expect(control).not.toBeNull();
      expect(control.getAttribute('aria-invalid')).toBeNull();
      expect(control.getAttribute('aria-describedby')).toBeNull();
    }
  });

  it('option ids and group label', () => {
    const cases = [
      {
        type: 'checkbox',
        groupSelector: '.dcf-checkbox-group',
        itemSelector: '.dcf-checkbox-group ion-checkbox',
        labelSelector: '.dcf-label',
      },
      {
        type: 'radio',
        groupSelector: 'ion-radio-group',
        itemSelector: 'ion-radio-group ion-radio',
        labelSelector: '.dcf-radio-group-label',
      },
    ];

    const options = [
      { value: 'opt1', text: 'Option 1' },
      { value: 'opt2', text: 'Option 2' },
      { value: 'opt3', text: 'Option 3' },
    ];

    for (const c of cases) {
      component.type = c.type;
      component.label = `${c.type} label`;
      component.options = options;
      component.required = false;
      component.value = '';
      updateFieldValidators(fixture, component);

      const group = fixture.nativeElement.querySelector(c.groupSelector);
      expect(group).not.toBeNull();
      expect(group.getAttribute('aria-labelledby')).toBe(`${component.path}-label`);
      if (c.type === 'checkbox') {
        expect(group.getAttribute('role')).toBe('group');
      }

      const label = fixture.nativeElement.querySelector(c.labelSelector);
      expect(label).not.toBeNull();
      expect(label.getAttribute('id')).toBe(`${component.path}-label`);

      const items = Array.from(fixture.nativeElement.querySelectorAll(c.itemSelector)) as HTMLElement[];
      expect(items.length).toBe(3);
      items.forEach((item, index) => {
        expect(item.getAttribute('id')).toBe(`${component.path}.${index}`);
      });
    }
  });

  it('text input keeps error text', () => {
    component.type = 'text';
    component.label = 'Text Field';
    component.required = true;
    component.value = '';
    updateFieldValidators(fixture, component);

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(input).not.toBeNull();
    expect(typeof (input as any).errorText).toBe('string');
    expect(((input as any).errorText as string).trim().length).toBeGreaterThan(0);

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeNull();
  });

  const testCases: { type: string; selector: string; value: any }[] = [
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

      Object.entries(props).forEach(([key, value]) => ((component as any)[key] = value));
      // component.props = props;
      fixture.detectChanges();

      const element = fixture.nativeElement.querySelector(selector);
      expect(element).toBeTruthy();
      if (type === 'radio') {
        const radioButtons = fixture.nativeElement.querySelectorAll('ion-radio');
        expect(radioButtons.length).toBe(2);
      } else if (type === 'select') {
        const options = fixture.nativeElement.querySelectorAll('ion-select-option');
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

  it('should show error message when min value is not met', async () => {
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

    const input =
      fixture.nativeElement.querySelector('ion-input') ||
      fixture.nativeElement.querySelector('ion-item');
    if (input.tagName.toLowerCase() === 'ion-input') {
      expect(input.readonly).toBeTruthy();
    } else {
      expect(input.classList.contains('dcf-item-readonly')).toBeTruthy();
    }
  });

  it('should handle disabled attribute correctly', () => {
    component.label = 'Disabled Field';
    component.value = '';
    fixture.detectChanges();

    if (!component.formGroup) component.formGroup = new FormGroup({});

    component.formGroup.disable();
    const input = fixture.nativeElement.querySelector('ion-input');
    expect(component.formGroup.disabled).toBeTruthy();
    expect(input.disabled).toBeTruthy();
  });
});
