import {
  escapeHtml,
  FieldProperties,
  HTML5CheckTypes,
  HTML5InputTypes,
  parseToNumber,
} from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, FieldUpdateMode } from './types';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Validation } from '@decaf-ts/decorator-validation';
import { AngularEngineKeys, FormConstants } from './constants';
import { FormElement } from '../interfaces';
import { ValidatorFactory } from './ValidatorFactory';

export class FormService {
  private static controls: Record<
    string,
    Record<
      string,
      {
        control: FormGroup;
        props: AngularFieldDefinition;
      }
    >
  > = {};

  static formAfterViewInit(
    el: FormElement,
    formId: string,
    formUpdateMode: FieldUpdateMode = 'blur',
  ) {
    const selector = `*[${AngularEngineKeys.NG_REFLECT}name]`;
    const controls = Array.from(
      el.component.nativeElement.querySelectorAll(selector),
    ).map((f: unknown) => {
      const fieldName = (f as { attributes: Record<string, { value: string }> })
        .attributes[`${AngularEngineKeys.NG_REFLECT}name`].value;
      const control = FormService.getFieldByName(formId, fieldName);
      return control.control;
    });
    el.formGroup = new FormGroup(controls, {
      updateOn: formUpdateMode,
    });
  }

  static forOnDestroy(el: FormElement, formId: string) {
    FormService.unregister(formId, el.component.nativeElement);
  }

  static getFormData(formId: string) {
    if (!(formId in this.controls)) throw new Error(`form ${formId} not found`);
    const form = this.controls[formId];
    let control: AbstractControl;
    let val: unknown;
    const data: Record<string, unknown> = {};
    for (const key in form) {
      control = form[key].control;
      if (!HTML5CheckTypes.includes(form[key].props.type)) {
        val =
          form[key].props.type === HTML5InputTypes.NUMBER
            ? parseToNumber(control.value)
            : escapeHtml(control.value[key]);
      } else {
        val = control.value;
      }
      data[key] = val;
    }
    return data;
  }

  static validateFields(formGroup: FormGroup, fieldName?: string) {
    function isValid(formGroup: FormGroup, fieldName: string) {
      const control = formGroup.get(fieldName);
      const status = control?.status;
      if (control instanceof FormControl && status === FormConstants.INVALID) {
        control.markAsTouched();
        control.markAsDirty();
        return !control.invalid;
      } else {
        throw new Error('This should be impossible');
      }
    }

    if (fieldName) return isValid(formGroup, fieldName);

    let isValidForm = true;
    for (const key in (formGroup.controls[0] as FormGroup).controls) {
      const validate = isValid(formGroup.controls[0] as FormGroup, key);
      if (!validate) isValidForm = false;
    }

    return isValidForm;
  }

  static fromProps(
    props: AngularFieldDefinition,
    updateMode: FieldUpdateMode,
  ): FormGroup {
    const controls: Record<string, FormControl> = {};
    const validators = this.validatorsFromProps(props);
    const composed = validators.length ? Validators.compose(validators) : null;
    controls[props.name] = new FormControl(
      {
        value:
          props.value && props.type !== HTML5InputTypes.CHECKBOX
            ? props.value
            : undefined,
        disabled: props.disabled,
      },
      composed,
    );

    return new FormGroup(controls, { updateOn: updateMode });
  }

  private static getFormById(id: string) {
    if (!(id in FormService.controls))
      throw new Error(`Could not find formId ${id}`);
    return FormService.controls[id];
  }

  private static getFieldByName(formId: string, name: string) {
    const form = FormService.getFormById(formId);
    if (!(name in form))
      throw new Error(`Could not find field ${name} in form`);
    return form[name];
  }

  private static validatorsFromProps(
    props: FieldProperties & AngularFieldDefinition,
  ): ValidatorFn[] {
    const supportedValidationKeys = Validation.keys();
    return Object.keys(props)
      .filter((k: string) => supportedValidationKeys.includes(k))
      .map((k: string) => ValidatorFactory.spawn(k, props[k]));
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
    this.controls[formId][props.name] = {
      control: control,
      props: props,
    };
  }

  static unregister(formId: string, field?: HTMLElement) {
    if (!field) delete this.controls[formId];
    else
      delete this.controls[formId][(field as unknown as { name: string }).name];
  }
}
