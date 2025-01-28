import { FieldProperties, HTML5InputTypes } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from './types';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Validation } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';

export class FormService {
  private static controls: Record<string, Record<string, FormGroup>> = {};

  static fromProps(props: FieldProperties & AngularFieldDefinition): FormGroup {
    const controls: Record<string, FormControl> = {};
    const validators = this.validatorsFromProps(props);
    controls[props.name] = new FormControl(
      {
        value:
          props.value && props.type !== HTML5InputTypes.CHECKBOX
            ? props.value
            : undefined,
        disabled: props.disabled,
      },
      validators.length ? Validators.compose(validators) : null,
    );

    return new FormGroup(controls);
  }

  private static validatorFor(key: string): ValidatorFn {
    if (!Validation.keys().includes(key)) {
      throw new Error('Unsupported custom validation');
    }

    const validatorFn = (control: AbstractControl) => {
      if (!control) return null;
      const validator = Validation.get(key);
      if (!validator) {
        throw new InternalError(`No Validator found for key`);
      }
      const err = validator.hasErrors(control.value);
      if (err) {
        const controlErr: Record<
          string,
          {
            value: typeof control.value;
            message: string;
          }
        > = {};
        controlErr[key] = {
          value: control.value,
          message: err,
        };
        control.setErrors(controlErr);
        const response: Record<string, boolean> = {};
        response[key] = true;
        return response;
      }
      return null;
    };
    Object.defineProperty(validatorFn, 'name', {
      value: `${key}Validator`,
    });
    return validatorFn;
  }

  private static validatorsFromProps(
    props: FieldProperties & AngularFieldDefinition,
  ) {
    const supportedValidationKeys = Validation.keys();
    return Object.keys(props)
      .filter((k: string) => {
        if (!supportedValidationKeys.includes(k)) {
          console.log(`Unrecognized validation key ${k}`);
          return false;
        }
        return true;
      })
      .map((k: string) => this.validatorFor(k));
  }

  /**
   *
   * @param el
   * @param tag
   *
   * @throws {Error} when no parent exists with the provided tag
   */
  static getParentEl(el: HTMLElement, tag: string) {
    let parent: HTMLElement | null;
    while ((parent = el.parentElement) !== null) {
      if (parent.tagName === tag) return parent;
    }
    throw new Error(
      `No parent with the tag ${tag} was found for provided element`,
    );
  }

  static register(formId: string, field: HTMLElement, control: FormGroup) {
    this.controls[formId] = {};
    this.controls[formId][field.id] = control;
  }

  static getControlFor(formId: string, el: HTMLElement): FormGroup {
    if (!(formId in this.controls))
      throw new Error(`Form ${formId} not registered`);
    if (!(el.id in this.controls[formId]))
      throw new Error(`No control defined for el ${el.id}`);
    return this.controls[formId][el.id];
  }

  static unregister(formId: string, field?: HTMLElement) {
    if (!field) delete this.controls[formId];
    else delete this.controls[formId][field.id];
  }
}
