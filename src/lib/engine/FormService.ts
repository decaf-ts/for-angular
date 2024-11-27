import {
  FieldProperties,
  HTML5InputTypes,
  ValidatableByType,
} from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from './types';
import { FormControl, FormGroup } from '@angular/forms';
import { ValidationKeys } from '@decaf-ts/decorator-validation';

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

  private static validatorFor(key: string) {
    if (!(key in Object.values(ValidationKeys))) {
      throw new Error('Unsupported custom validation');
    }

    return;
  }

  private static validatorsFromProps(
    props: FieldProperties & AngularFieldDefinition,
  ) {
    if (props.type in ValidatableByType) {
    }
  }
}
