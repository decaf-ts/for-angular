import {
  escapeHtml,
  FieldProperties,
  HTML5CheckTypes,
  HTML5InputTypes,
  parseToNumber,
} from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from './types';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Validation } from '@decaf-ts/decorator-validation';
import { InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { FormConstants } from './constants';
import { FormElement, NgxCrudFormField } from '../interfaces';
import { CssClasses } from '../components/form-reactive/constants';

export class FormService {
  private static controls: Record<
    string,
    Record<
      string,
      {
        control: FormGroup;
        props: FieldProperties & AngularFieldDefinition;
      }
    >
  > = {};

  static inputAfterViewInit(el: NgxCrudFormField) {
    console.log(`after init of ${el}`);
    let parent: HTMLElement;
    switch (el.operation) {
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE:
      case OperationKeys.DELETE:
        try {
          parent = FormService.getParentEl(el.component.nativeElement, 'form');
        } catch (e: unknown) {
          throw new Error(
            `Unable to retrieve parent form element for the ${el.operation}: ${e instanceof Error ? e.message : e}`,
          );
        }
        FormService.register(
          parent.id,
          el.component.nativeElement,
          el.formGroup,
          el.props,
        );
        return parent;
      default:
        throw new Error(`Invalid operation: ${el.operation}`);
    }
  }

  static inputOnInit(el: NgxCrudFormField) {
    if (!el.props || !el.operation)
      throw new InternalError(`props and operation are required`);
    el.formGroup = FormService.fromProps(el.props);
  }

  static inputOnDestroy(el: NgxCrudFormField, parent?: HTMLElement) {
    if (parent) FormService.unregister(parent.id, el.component.nativeElement);
  }

  static formAfterViewInit(el: FormElement, formId: string) {
    console.log('after init');
    const controls: FormGroup[] = Array.from(
      (el.component.nativeElement as HTMLFormElement).children,
    )
      .filter((e) => !e.classList.contains(CssClasses.BUTTONS_CONTAINER))
      .map((el: Element) => {
        const control = FormService.getControlFor(formId, el as HTMLElement);
        if (!control) throw new Error(`No control found for ${el.id}`);
        return control.control;
      });
    el.formGroup = new FormGroup(controls);
  }

  static forOnDestroy(el: FormElement, formId: string) {
    FormService.unregister(formId, el.component.nativeElement);
  }

  static getFormData(formGroup: FormGroup, formId: string) {
    if (!(formId in this.controls)) throw new Error(`form ${formId} not found`);
    const form = this.controls[formId];
    let control: AbstractControl;
    let val: unknown;
    const data: Record<string, unknown> = {};
    for (const key in formGroup.controls) {
      control = formGroup.controls[key];
      if (!HTML5CheckTypes.includes(form[key].props.type)) {
        val =
          form[key].props.type === HTML5InputTypes.NUMBER
            ? parseToNumber(control.value)
            : escapeHtml(control.value);
      } else {
        val = control.value;
      }
      data[key] = val;
    }
    return data;
  }

  static validateFields(formGroup: FormGroup, fieldName?: string) {
    function isValid(fieldName: string) {
      const control = formGroup.get(fieldName);
      const status = control?.status;
      if (control instanceof FormControl && status === FormConstants.INVALID) {
        control.markAsTouched({ onlySelf: true });
        return !(control.invalid && (control.dirty || control.touched));
      }
    }

    if (fieldName) return isValid(fieldName);

    let isValidForm = true;
    for (const key in formGroup.controls) {
      const validate = isValid(key);
      if (!validate) isValidForm = false;
    }

    return isValidForm;
  }

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

    return Validators.required;
    //
    // const validatorFn = (control: AbstractControl) => {
    //   if (!control) return null;
    //   const validator = Validation.get(key);
    //   if (!validator) {
    //     throw new InternalError(`No Validator found for key`);
    //   }
    //   const err = validator.hasErrors(control.value);
    //   if (err) {
    //     const controlErr: Record<
    //       string,
    //       {
    //         value: typeof control.value;
    //         message: string;
    //       }
    //     > = {};
    //     controlErr[key] = {
    //       value: control.value,
    //       message: err,
    //     };
    //     control.setErrors(controlErr);
    //     const response: Record<string, boolean> = {};
    //     response[key] = true;
    //     return response;
    //   }
    //   return null;
    // };
    // Object.defineProperty(validatorFn, 'name', {
    //   value: `${key}Validator`,
    // });
    // return validatorFn;
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
      if (parent.tagName.toLowerCase() === tag.toLowerCase()) {
        return parent;
      }
      el = parent;
    }
    throw new Error(
      `No parent with the tag ${tag} was found for provided element`,
    );
  }

  static register(
    formId: string,
    field: HTMLElement,
    control: FormGroup,
    props: FieldProperties & AngularFieldDefinition,
  ) {
    this.controls[formId] = {};
    this.controls[formId][(field as unknown as { name: string }).name] = {
      control: control,
      props: props,
    };
  }

  static getControlFor(formId: string, el: HTMLElement) {
    if (!(formId in this.controls))
      throw new Error(`Form ${formId} not registered`);
    const name = (el as unknown as { name: string }).name;
    if (!(name in this.controls[formId]))
      throw new Error(`No control defined for el ${el.id}`);
    return this.controls[formId][name];
  }

  static unregister(formId: string, field?: HTMLElement) {
    if (!field) delete this.controls[formId];
    else
      delete this.controls[formId][(field as unknown as { name: string }).name];
  }
}
