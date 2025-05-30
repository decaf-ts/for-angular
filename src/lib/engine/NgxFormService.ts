import { escapeHtml, FieldProperties, HTML5CheckTypes, HTML5InputTypes, parseToNumber } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, FieldUpdateMode, FormServiceControl, FormServiceControls } from './types';
import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { getValueByPath, isValidDate, parseDate, Validation } from '@decaf-ts/decorator-validation';
import { AngularEngineKeys } from './constants';
import { FormElement } from '../interfaces';
import { ValidatorFactory } from './ValidatorFactory';

const CHILDREN_OF = "childrenof";
const VALIDATION_PARENT_KEY = Symbol('_validationParentRef');

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
      const fieldName: any = (f as { attributes: Record<string, { value: string }> }).attributes['path'].value;
      // fieldName = fieldName.attributes[`${AngularEngineKeys.NG_REFLECT}name`].value;
      // const fieldNamePath = fieldName.attributes["path"].value;
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

    function parseForm(form: Record<string, FormServiceControl | AngularFieldDefinition>): Record<string, unknown> {
      const data: Record<string, unknown> = {};
      for (const key in form) {
        const node = form[key];
        // children
        if (!node.control && typeof node === 'object') {
          data[key] = parseForm(node as Record<string, FormServiceControl>);
        } else {
          let val: unknown;
          const { control, props } = node as FormServiceControl;
          if (!HTML5CheckTypes.includes(props.type)) {
            switch (props.type) {
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
            val = Object.values(control.value)[0];
          }
          data[key] = val;
        }
      }
      return data;
    }

    return parseForm(this.controls[formId]);
  }

  static getParentLinks(formId: string, path: string): Record<string, unknown> {
    const self = this;
    if (!(formId in this.controls)) throw new Error(`form ${formId} not found`);

    function parseForm(form: Record<string, FormServiceControl | AngularFieldDefinition>, parent?: any): Record<string, unknown> {
      const data: Record<string, unknown> = {};
      for (const key in form) {
        const node = form[key];
        // children
        const isGroup = !node.control && typeof node === 'object';
        if (isGroup) {
          const { [key]: prop, ...rest } = form;
          data[key] = parseForm(node as Record<string, FormServiceControl>);
          // Adds parent reference without circular references
          (data[key] as any)[VALIDATION_PARENT_KEY] = rest;
          continue;
        }

        let val: unknown;
        const { control, props } = node as FormServiceControl;
        if (!HTML5CheckTypes.includes(props.type)) {
          switch (props.type) {
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
          val = Object.values(control.value)[0];
        }
        data[key] = val;
      }

      return data;
    }

    const formData = parseForm(this.controls[formId]);
    return path.split('.').length > 1 ? getValueByPath(formData, path) : formData;
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
    updateMode: FieldUpdateMode = "change",
    formId: string
  ): FormControl {
    const controls: Record<string, FormControl> = {};
    const validators = this.validatorsFromProps(formId, props);
    const composed = validators.length ? Validators.compose(validators) : null;
    controls[props.name] = new FormControl(
      {
        value:
          props.value && props.type !== HTML5InputTypes.CHECKBOX
            ? props.type === HTML5InputTypes.DATE
              ? !isValidDate(parseDate(props.format as string, props.value as string))
                ? undefined : props.value :
                  (props.value as any) : undefined,
        disabled: props.disabled,
      },
      {
        validators: composed,
        updateOn: updateMode
      }
    );

    return controls[props.name]; // new FormGroup(controls, { updateOn: updateMode });
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
   * @param {string} formId - The unique identifier of the form.
   * @param name - The name of the field to retrieve.
   * @returns The field control and properties.
   * @throws Error if the field is not found in the form.
   */
  public static getFieldByName(formId: string, name: string): FormServiceControl {
    const form = NgxFormService.getFormById(formId);
    // if (!(name in form))
    //   throw new Error(`Could not find field ${name} in form`);
    return form.hasOwnProperty(name) ? form[name] : getValueByPath(form, name) as FormServiceControl;
  }

  /**
   * Generates an array of validator functions from the provided field properties.
   *
   * @param {string} formId - The unique identifier of the form.
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
      `No parent with the tag ${tag} was found for provided element`,
    );
  }

  static register(
    formId: string,
    control: FormGroup,
    props: AngularFieldDefinition,
  ) {
    if (formId.includes(AngularEngineKeys.RENDERED))
      formId = formId.split(AngularEngineKeys.RENDERED)[1];

    this.controls[formId] = this.controls[formId] || {};
    let targetRegister: any = this.controls[formId];

    // let parent: object;
    if (props[CHILDREN_OF]) {
      const keys = (props[CHILDREN_OF] as string).split('.');
      for (const key of keys) {
        targetRegister[key] = targetRegister[key] || {};
        parent = targetRegister;
        targetRegister = targetRegister[key];
        // this.parentRegistry.set(targetRegister, parent);
      }
    }

    if (targetRegister.hasOwnProperty(props.name))
      console.warn(
        `Property "${props.name}" already exists under "${props[CHILDREN_OF] || 'root'}". Existing value will be overwritten.`,
      );

    targetRegister[props.name] = { control, props, parentId: formId }; //createProxyWithParent({ control, props, parentId: formId });
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

  static reset() {
    const controls = Object.values(this.controls)[0];
    if (controls) {
      Object.entries(controls).forEach(([key, { control, props }]) => {
        const fc = Object.values(control.controls)[0];
        const { type } = props;
        if (!HTML5CheckTypes.includes(type)) {
          fc.setValue(undefined);
        }
        fc.setErrors(null);
        fc.updateValueAndValidity();
      });
    }
  }
}
