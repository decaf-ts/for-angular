import {
  CrudOperationKeys,
  FieldProperties,
  HTML5InputTypes,
  ValidatableByType,
} from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from './types';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn,
} from '@angular/forms';
import { ValidationKeys, validator } from '@decaf-ts/decorator-validation';
import { Validation } from '@decaf-ts/decorator-validation';
import { UnsupportedError } from '@decaf-ts/core';
import { InternalError } from '@decaf-ts/db-decorators';

export class FormService {
  static fromProps(props: FieldProperties & AngularFieldDefinition): FormGroup {
    const controls: Record<string, FormControl> = {};
    controls[props.name] = new FormControl({
      value:
        props.value && props.type !== HTML5InputTypes.CHECKBOX
          ? props.value
          : undefined,
      disabled: !!props?.disabled,
    });
    return new FormGroup(controls);
  }

  private static validatorFor(key: string): ValidatorFn {
    if (!(key in Object.values(ValidationKeys))) {
      throw new Error('Unsupported custom validation');
    }

    return (control: AbstractControl) => {
      const validator = Validation.get(key);
      if (!validator) throw new InternalError(`No Validator found for key`);
      const err = validator.hasErrors(control.value);
      return null;
    };
  }

  private static validatorsFromProps(
    props: FieldProperties & AngularFieldDefinition,
  ) {
    if (props.type in ValidatableByType) {
    }
  }
}
