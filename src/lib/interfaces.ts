import { CrudFormField } from '@decaf-ts/ui-decorators';
import { FormGroup } from '@angular/forms';
import { AngularFieldDefinition } from './engine';
import { ElementRef } from '@angular/core';

export interface ComponentHolder {
  component: ElementRef;
}

export interface FormElement extends ComponentHolder {
  formGroup: FormGroup;
}

export interface NgxCrudFormField
  extends CrudFormField<AngularFieldDefinition>,
    FormElement {}
