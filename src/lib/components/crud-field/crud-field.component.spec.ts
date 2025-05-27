import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CrudFieldComponent } from './crud-field.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AngularFieldDefinition } from '../../engine';
import { TranslateFakeLoader, TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgxRenderingEngine2 } from 'src/lib/engine';
import { Model, ModelBuilderFunction } from '@decaf-ts/decorator-validation';
import { consoleWarn } from 'src/lib/helpers';

const imports = [
  ForAngularModule,
  CrudFieldComponent,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useClass: TranslateFakeLoader
    }
  })
];

describe('FieldComponent', () => {
  let component: CrudFieldComponent;
  let fixture: ComponentFixture<CrudFieldComponent>;
  // let formBuilder: FormBuilder;
  let translateService: TranslateService;

  let engine;

  beforeAll(() => {
    try {
      engine = new NgxRenderingEngine2();
      Model.setBuilder(Model.fromModel as ModelBuilderFunction);
    } catch (e: unknown) {
      consoleWarn(this, `Engine already loaded`);
    }
  });
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports,
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    fixture = TestBed.createComponent(CrudFieldComponent);
    component = fixture.componentInstance;
    component.name = 'test_field';
    component.type = 'text';
    component.operation = OperationKeys.CREATE;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const testCases: { type: string; selector: string }[] = [
    { type: 'textarea', selector: 'ion-textarea' },
    { type: 'checkbox', selector: 'ion-checkbox' },
    { type: 'radio', selector: 'ion-radio-group' },
    { type: 'select', selector: 'ion-select' },
    { type: 'text', selector: 'ion-input' },
    { type: 'number', selector: 'ion-input' },
    { type: 'email', selector: 'ion-input' },
    { type: 'password', selector: 'ion-input' },
    { type: 'date', selector: 'ion-input' },
  ];

  testCases.forEach(({ type, selector }) => {
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
      }

      component.translatable = false;

      Object.entries(props).forEach(([key, value]) => (component as any)[key] = value)
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

  it('should show error message when required field is empty', () => {
    component.label = 'Required Field';
    component.required = true;
    component.value = '';
    // component = {
    //   name: 'required_field',
    //   type: 'text',
    //   label: 'Required Field',
    //   required: true,
    // } as AngularFieldDefinition;
    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('required');
  });

  it('should show error message when minlength is not met', () => {
    component.label = 'Minlength Field';
    component.minlength = 5;
    component.value = 'abc';

    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('minlength');
  });

  it('should show error message when maxlength is exceeded', () => {
    component.label = 'Maxlength Field';
    component.maxlength = 5;
    component.value = 'abcdef';

    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('maxlength');
  });

  it('should show error message when pattern is not matched', () => {

    component.label = 'Pattern Field';
    component.pattern = '^[A-Za-z]+$';
    component.value = '123';

    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('pattern');
  });

  xit('should show error message when min value is not met', () => {
    component.type =  'number';
    component.label = 'Min Field';
    component.min = 5;
    component.value = 3;

    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('value');
  });

  it('should show error message when max value is exceeded', () => {
    component.type =  'number';
    component.label = 'Min Field';
    component.max = 5;
    component.value = 13;

    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();
    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(component.formGroup.invalid).toBeTruthy();
    expect(errorDiv.textContent).toContain('max');
  });

  it('should not show error message when field is valid', () => {
    component.label = 'Valid Field';
    component.value = 'Valid input';
    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();
    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeFalsy();
  });

  xit('should translate labels and placeholders', () => {


    // Mock translate service
    spyOn(translateService, 'instant').and.callFake((key: string) => {
      if (key === 'FIELD.LABEL') return 'Translated Label';
      if (key === 'FIELD.PLACEHOLDER') return 'Translated Placeholder';
      return key;
    });

    fixture.detectChanges();
    component.label = 'FIELD.LABEL';
    component.placeholder = 'FIELD.PLACEHOLDER';
    component.value = '';
    component.translatable = true;
    fixture.detectChanges();

    spyOn(component, 'ngOnInit');
    component.ngOnInit(); // Aciona manualmente o método
    expect(component.ngOnInit).toHaveBeenCalled(); // Testa se foi chamado

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(input.label).toBe('Translated Label');
    expect(input.placeholder).toBe('Translated Placeholder');
  });

  it('should handle readonly attribute correctly', () => {
    component.label = 'Readonly Field';
    component.value = '';
    component.readonly = true;

    fixture.detectChanges();
    component.formGroup.markAsTouched();
    component.formGroup.markAsDirty();
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(input.readonly).toBeTrue()
  });

  it('should handle disabled attribute correctly', () => {
    component.label = 'Disabled Field';
    component.value = '';
    fixture.detectChanges();
    component.formGroup.disable();

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(component.formGroup.disabled).toBeTruthy();
    expect(input.disabled).toBeTrue()
  });
});
