import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DecafCrudFieldComponent } from './decaf-crud-field.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { FieldProperties } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from '../../engine';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('DecafCrudFieldComponent', () => {
  let component: DecafCrudFieldComponent;
  let fixture: ComponentFixture<DecafCrudFieldComponent>;
  // let formBuilder: FormBuilder;
  let translateService: TranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DecafCrudFieldComponent],
      imports: [
        ReactiveFormsModule,
        IonicModule.forRoot(),
        TranslateModule.forRoot(),
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    translateService = TestBed.inject(TranslateService);
    fixture = TestBed.createComponent(DecafCrudFieldComponent);
    component = fixture.componentInstance;
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
        type: type as never,
        label: `Test ${type}`,
      } as unknown as AngularFieldDefinition;
      if (type === 'radio' || type === 'select') {
        props['options'] = [
          { value: 'option1', text: 'Option 1' },
          { value: 'option2', text: 'Option 2' },
        ];
      }
      component.props = props;
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
    component.props = {
      name: 'required_field',
      type: 'text',
      label: 'Required Field',
      required: true,
    } as AngularFieldDefinition;
    component.formGroup.markAsTouched();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('required');
  });

  it('should show error message when minlength is not met', () => {
    const props: FieldProperties & AngularFieldDefinition = {
      name: 'minlength_field',
      type: 'text',
      label: 'Minlength Field',
      value: 'abc',
      minlength: 5,
    } as AngularFieldDefinition;
    component.props = props;
    component.formGroup.markAsTouched();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('minlength');
  });

  it('should show error message when maxlength is exceeded', () => {
    const props: FieldProperties & AngularFieldDefinition = {
      name: 'maxlength_field',
      type: 'text',
      label: 'Maxlength Field',
      maxlength: 5,
      value: 'abcdef',
    } as AngularFieldDefinition;
    component.props = props;
    component.formGroup.markAsTouched();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('maxlength');
  });

  it('should show error message when pattern is not matched', () => {
    const props: FieldProperties & AngularFieldDefinition = {
      name: 'pattern_field',
      type: 'text',
      label: 'Pattern Field',
      pattern: '^[A-Za-z]+$',
      value: '123',
    } as AngularFieldDefinition;
    component.props = props;
    component.formGroup.markAsTouched();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('pattern');
  });

  it('should show error message when min value is not met', () => {
    const props: FieldProperties & AngularFieldDefinition = {
      name: 'min_field',
      type: 'number',
      label: 'Min Field',
      min: 5,
      value: 3,
    } as AngularFieldDefinition;
    component.props = props;
    component.formGroup.markAsTouched();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('min');
  });

  it('should show error message when max value is exceeded', () => {
    const props: FieldProperties & AngularFieldDefinition = {
      name: 'max_field',
      type: 'number',
      label: 'Max Field',
      max: 10,
      value: 15,
    } as AngularFieldDefinition;
    component.props = props;
    component.formGroup.markAsTouched();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeTruthy();
    expect(errorDiv.textContent).toContain('max');
  });

  it('should not show error message when field is valid', () => {
    const props: AngularFieldDefinition = {
      name: 'valid_field',
      type: 'text',
      label: 'Valid Field',
      required: true,
      value: 'Valid input',
    } as AngularFieldDefinition;
    component.props = props;
    component.formGroup.markAsTouched();
    fixture.detectChanges();

    const errorDiv = fixture.nativeElement.querySelector('.error');
    expect(errorDiv).toBeFalsy();
  });

  it('should translate labels and placeholders', () => {
    const props: AngularFieldDefinition = {
      name: 'translated_field',
      type: 'text',
      label: 'FIELD.LABEL',
      placeholder: 'FIELD.PLACEHOLDER',
      value: '',
    } as AngularFieldDefinition;
    component.props = props;
    component.translatable = true;

    // Mock translate service
    spyOn(translateService, 'instant').and.callFake((key: string) => {
      if (key === 'FIELD.LABEL') return 'Translated Label';
      if (key === 'FIELD.PLACEHOLDER') return 'Translated Placeholder';
      return key;
    });

    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(input.getAttribute('label')).toBe('Translated Label');
    expect(input.getAttribute('placeholder')).toBe('Translated Placeholder');
  });

  it('should handle readonly attribute correctly', () => {
    const props: FieldProperties & AngularFieldDefinition = {
      name: 'readonly_field',
      type: 'text',
      label: 'Readonly Field',
      readonly: true,
      value: '',
    } as AngularFieldDefinition;
    component.props = props;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(input.getAttribute('readonly')).toBe('true');
  });

  it('should handle disabled attribute correctly', () => {
    const props: FieldProperties & AngularFieldDefinition = {
      name: 'disabled_field',
      type: 'text',
      label: 'Disabled Field',
      disabled: true,
      value: '',
    } as AngularFieldDefinition;
    component.props = props;
    fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('ion-input');
    expect(input.getAttribute('disabled')).toBe('true');
  });
});
