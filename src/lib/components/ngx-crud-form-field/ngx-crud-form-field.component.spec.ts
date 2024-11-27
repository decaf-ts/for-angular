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
      fixture.detectChanges();
      const elems = fixture.debugElement.query(By.css('ion-item'));

      expect(elems).toBeDefined();
      const inputs = fixture.nativeElement.querySelector('ion-input');
      expect(inputs.length).toBe(1);
      const input = inputs[0];
      expect(input.attributes.type).toEqual('text');
      expect(input.attributes.mode).toEqual('text');
      expect(input.attributes.hidden).toEqual('text');
      expect(input.attributes.inputmode).toEqual('text');
      expect(input.attributes.readonly).toEqual('text');
      expect(input.attributes.autocomplete).toEqual('text');
      expect(input.attributes.spellcheck).toEqual('text');
      expect(input.attributes.labelPlacement).toEqual('text');
      expect(input.attributes.step).toEqual('text');
      expect(input.attributes.value).toEqual('text');
      expect(input.attributes.fill).toEqual('text');
      expect(input.attributes.placeholder).toEqual('text');
      expect(input.attributes.formControlName).toEqual('text');
      expect(input.attributes.label).toEqual('text');
    });
  });
});
