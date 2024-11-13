import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NgxCrudFormFieldComponent } from './ngx-crud-form-field.component';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { runAndParseError } from '../../../tests/karmaErrorParser';
import { AngularFieldDefinition } from '../../engine';
import { FieldProperties } from '@decaf-ts/ui-decorators';

describe('NgxCrudFormFieldComponent', () => {
  let component: NgxCrudFormFieldComponent;
  let fixture: ComponentFixture<NgxCrudFormFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NgxCrudFormFieldComponent, ReactiveFormsModule, IonicModule],
    }).compileComponents();

    fixture = TestBed.createComponent(NgxCrudFormFieldComponent);
    component = fixture.componentInstance;
  });

  it('should throw error when defined without props', () => {
    expect(() => runAndParseError(() => fixture.detectChanges())).toThrowError(
      InternalError,
    );
  });

  it('should render when defined with all required props', () => {
    component.props = {
      autocapitalize: '',
      // autocomplete: undefined,
      // autocorrect: undefined,
      autofocus: false,
      clearInput: false,
      counter: false,
      disabled: false,
      // labelPlacement: undefined,
      readonly: false,
      required: false,
      spellcheck: false,
      name: 'prop',
      label: 'label',
      type: 'text',
    } as unknown as FieldProperties & AngularFieldDefinition;
    component.operation = OperationKeys.CREATE;
    expect(() => runAndParseError(() => fixture.detectChanges())).toThrowError(
      InternalError,
    );
  });
});
