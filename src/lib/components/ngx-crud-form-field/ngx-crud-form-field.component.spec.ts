import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxCrudFormFieldComponent } from './ngx-crud-form-field.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { runAndParseError } from '../../../tests/karmaErrorParser';
import { AngularFieldDefinition } from '../../engine';
import { FieldProperties } from '@decaf-ts/ui-decorators';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { By } from '@angular/platform-browser';
import { HTML5InputTypes } from '@decaf-ts/ui-decorators';

describe('NgxCrudFormFieldComponent', () => {
  let component: NgxCrudFormFieldComponent;
  let fixture: ComponentFixture<NgxCrudFormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot(), NgxCrudFormFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxCrudFormFieldComponent);
    component = fixture.componentInstance;
  });

  it('should throw error when defined without props', () => {
    expect(() => runAndParseError(() => fixture.detectChanges())).toThrowError(
      InternalError,
    );
  });

  const props: FieldProperties & AngularFieldDefinition = {
    autocomplete: 'on',
    autocorrect: 'on',
    labelPlacement: 'stacked',
    autocapitalize: '',
    autofocus: false,
    clearInput: false,
    counter: false,
    disabled: false,
    hidden: false,
    readonly: false,
    required: false,
    spellcheck: false,
    name: 'name',
    label: 'label',
    type: 'text',
  } as FieldProperties & AngularFieldDefinition;

  it('should render when defined with all required props', () => {
    component.props = props;
    component.operation = OperationKeys.CREATE;
    fixture.detectChanges();
    expect(component).toBeDefined();
  });

  describe('standard Input fields', () => {
    it('handles text inputs', async () => {
      component.props = Object.assign({}, props, { type: 'text' });
      component.operation = OperationKeys.CREATE;

      fixture.detectChanges();
      const elems = fixture.debugElement.query(By.css('ion-item'));

      expect(elems).toBeDefined();
      const input = fixture.nativeElement.querySelector('ion-input');
      expect(input).toBeDefined();
      expect(input.type).toEqual(props.type);
      expect(input.mode).toEqual(props.mode);
      expect(input.hidden).toEqual(props.hidden);
      expect(input.inputmode).toEqual(props.inputmode);
      expect(input.readonly).toEqual(props.readonly);
      expect(input.autocomplete).toEqual(props.autocomplete);
      expect(input.spellcheck).toEqual(props.spellcheck);
      expect(input.labelPlacement).toEqual(props.labelPlacement);
      expect(input.step).toEqual(props.step || null);
      expect(input.value).toEqual(undefined);
      expect(input.fill).toEqual(props.fill);
      expect(input.placeholder).toEqual(props.placeholder);
      expect(input.formControlName).toEqual(props.name);
      expect(input.label).toEqual(props.label);
    });
  });
});
