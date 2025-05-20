import {
  escapeHtml,
  FieldProperties,
  HTML5CheckTypes,
  HTML5InputTypes,
  parseToNumber,
} from '@decaf-ts/ui-decorators';
import {
  AngularFieldDefinition,
  FieldUpdateMode,
  FormServiceControls,
} from './types';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Validation, ValidationKeys } from '@decaf-ts/decorator-validation';
import { AngularEngineKeys } from './constants';
import { FormElement } from '../interfaces';
import { ValidatorFactory } from './ValidatorFactory';

/**
 * @summary Service for managing Angular forms and form controls.
 * @description
 * The NgxFormService provides utility methods for handling form initialization,
 * validation, data retrieval, and form control management in Angular applications.
 * It offers a centralized way to manage form controls, perform validations, and
 * handle form-related operations.
 */
export class NgxFormService {
  /**
   * @summary Storage for form controls.
   * @description
   * A static object that stores form controls indexed by form ID and field name.
   * @type {FormServiceControls}
   */
  private static controls: FormServiceControls = {};

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * Initializes the form after the view has been initialized.
   * This method sets up the form controls and creates a FormGroup.
   *
   * @param el - The form element to initialize.
   * @param formId - The unique identifier for the form.
   * @param formUpdateMode - The update mode for the form. Defaults to 'blur'.
   */
  /**
   * @summary Initializes the form after view initialization.
   * @description
   * Sets up form controls and creates a FormGroup for the given form element.
   *
   * @param {FormElement} el - The form element to initialize.
   * @param {string} formId - The unique identifier for the form.
   * @param {FieldUpdateMode} [formUpdateMode='blur'] - The update mode for the form.
   */
  static formAfterViewInit(
    el: FormElement,
    formId: string,
    formUpdateMode: FieldUpdateMode = 'blur'
  ) {
    const selector = `*[${AngularEngineKeys.NG_REFLECT}name]`;
    const elements = Array.from(
      el.component.nativeElement.querySelectorAll(selector)
    );
    const controls = elements.map((f: unknown) => {
      const fieldName = (f as { attributes: Record<string, { value: string }> })
        .attributes[`${AngularEngineKeys.NG_REFLECT}name`].value;
      const control = NgxFormService.getFieldByName(formId, fieldName);
      return control.control;
    });
    el.formGroup = new FormGroup(controls, {
      updateOn: formUpdateMode,
    });
  }

  /**
   * @summary Handles form component destruction.
   * @description
   * Unregisters the form from the service when the component is destroyed.
   *
   * @param {FormElement} el - The form element being destroyed.
   * @param {string} formId - The unique identifier of the form to unregister.
   */
  static forOnDestroy(el: FormElement, formId: string) {
    NgxFormService.unregister(formId, el.component?.nativeElement || undefined);
  }

  /**
   * @summary Retrieves form data for a given form ID.
   * @description
   * Processes form controls and returns their values as an object.
   *
   * @param {string} formId - The unique identifier of the form to retrieve data from.
   * @returns {Record<string, unknown>} An object containing the form data.
   * @throws {Error} If the form with the given ID is not found.
   */
  static getFormData(formId: string): Record<string, unknown> {
    if (!(formId in this.controls)) throw new Error(`form ${formId} not found`);
    const form = this.controls[formId];
    let control: AbstractControl;
    let val: unknown;
    const data: Record<string, unknown> = {};
    for (const key in form) {
      control = form[key].control;
      if (!HTML5CheckTypes.includes(form[key].props.type)) {
        switch (form[key].props.type) {
          case HTML5InputTypes.NUMBER:
            val = parseToNumber(control.value);
            break;
          case HTML5InputTypes.DATE:
          case HTML5InputTypes.DATETIME_LOCAL:
            val = new Date(control.value[key]);
            break;
          default:
            val = escapeHtml(control.value[key]);
        }
      } else {
        val = control.value;
      }
      data[key] = val;
    }
    return data;
  }

  /**
   * @summary Validates form fields.
   * @description
   * Validates either a specific field or all fields in the form group.
   *
   * @param {FormGroup} formGroup - The FormGroup to validate.
   * @param {string} [fieldName] - Optional name of a specific field to validate.
   * @returns {boolean} Indicates whether the validation passed (true) or failed (false).
   */
  static validateFields(formGroup: FormGroup, fieldName?: string): boolean {
    function isValid(formGroup: FormGroup, fieldName: string) {
      const control = formGroup.get(fieldName);
      if (control instanceof FormControl) {
        control.markAsTouched();
        control.markAsDirty();
        control.updateValueAndValidity({ emitEvent: true });
        return !control.invalid;
      } else {
        throw new Error('This should be impossible');
      }
    }

    if (fieldName) return isValid(formGroup, fieldName);

    let isValidForm = true;
    for (const fg of formGroup.controls as unknown as FormGroup[]) {
      for (const key in fg.controls) {
        const validate = isValid(fg, key);
        if (!validate) isValidForm = false;
      }
    }

    return isValidForm;
  }

  /**
   * @summary Creates a FormGroup from field properties.
   * @description
   * Generates a new FormGroup instance based on the provided field definition and update mode.
   *
   * @param {AngularFieldDefinition} props - The Angular field definition properties.
   * @param {FieldUpdateMode} updateMode - The update mode for the form group.
   * @returns {FormGroup} A new FormGroup instance.
   */
  static fromProps(
    props: FieldProperties,
    updateMode: FieldUpdateMode,
    formId: string
  ): FormGroup {
    const controls: Record<string, FormControl> = {};
    const validators = this.validatorsFromProps(formId, props);
    const composed = validators.length ? Validators.compose(validators) : null;
    controls[props.name] = new FormControl(
      {
        value:
          props.value && props.type !== HTML5InputTypes.CHECKBOX
            ? (props.value as any)
            : undefined,
        disabled: props.disabled,
      },
      composed
    );

    return new FormGroup(controls, { updateOn: updateMode });
  }

  /**
   * Retrieves a form by its ID from the stored controls.
   *
   * @param id - The unique identifier of the form to retrieve.
   * @returns The form controls associated with the given ID.
   * @throws Error if the form with the given ID is not found.
   */
  private static getFormById(id: string) {
    if (!(id in NgxFormService.controls))
      throw new Error(`Could not find formId ${id}`);
    return NgxFormService.controls[id];
  }

  /**
   * Retrieves a specific field from a form by its name.
   *
   * @param formId - The unique identifier of the form.
   * @param name - The name of the field to retrieve.
   * @returns The field control and properties.
   * @throws Error if the field is not found in the form.
   */
  private static getFieldByName(formId: string, name: string) {
    const form = NgxFormService.getFormById(formId);
    if (!(name in form))
      throw new Error(`Could not find field ${name} in form`);
    return form[name];
  }

  /**
   * Generates an array of validator functions from the provided field properties.
   *
   * @param props - The field properties containing validation rules.
   * @returns An array of ValidatorFn instances.
   */
  private static validatorsFromProps(formId: string, props: FieldProperties): ValidatorFn[] {
    const supportedValidationKeys = Validation.keys();
    return Object.keys(props)
      .filter((k: string) => supportedValidationKeys.includes(k))
      .map((k: string) => {
        return ValidatorFactory.spawn(props, k, formId);
      });
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
      `No parent with the tag ${tag} was found for provided element`
    );
  }

  static register(
    formId: string,
    control: FormGroup,
    props: AngularFieldDefinition
  ) {
    if (formId.includes(AngularEngineKeys.RENDERED)) {
      formId = formId.split(AngularEngineKeys.RENDERED)[1];
    }

    this.controls[formId] = this.controls[formId] || {};
    this.controls[formId][props.name] = {
      control: control,
      props: props,
    };
  }

  /**
   * Unregisters a form or a specific field from the service.
   *
   * @param formId - The unique identifier of the form.
   * @param field - Optional. The specific field to unregister. If not provided, the entire form is unregistered.
   */
  static unregister(formId: string, field?: HTMLElement) {
    if (!field) delete this.controls[formId];
    else
      delete this.controls[formId][(field as unknown as { name: string }).name];
  }
}
