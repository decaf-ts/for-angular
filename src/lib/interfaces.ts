import { CrudFormField } from '@decaf-ts/ui-decorators';
import { FormGroup } from '@angular/forms';
import { AngularFieldDefinition } from './engine';

export interface FormElement {
  formGroup: FormGroup;
}

export interface NgxCrudFormField
  extends CrudFormField<AngularFieldDefinition>,
    FormElement {}
