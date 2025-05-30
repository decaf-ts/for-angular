import { escapeHtml, FieldProperties, HTML5CheckTypes, HTML5InputTypes, parseToNumber } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, FieldUpdateMode, FormServiceControl, FormServiceControls } from './types';
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { getValueByPath, isValidDate, parseDate, Validation } from '@decaf-ts/decorator-validation';
import { AngularEngineKeys } from './constants';
import { FormElement } from '../interfaces';
import { ValidatorFactory } from './ValidatorFactory';

const CHILDREN_OF = 'childrenof';

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
  private constructor() {
  }

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
    formUpdateMode: FieldUpdateMode = 'blur',
  ) {
    const selector = `*[${AngularEngineKeys.NG_REFLECT}name]`;
    const elements = Array.from(
      el.component.nativeElement.querySelectorAll(selector),
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

  /**
   * Recursively validates an AbstractControl.
   *
   * If a path is provided, and it leads to a FormControl, only that control will be validated.
   * If the path leads to a FormGroup, it will validate all of its child controls recursively.
   * If no path is provided, the entire form tree is validated.
   *
   * @param {AbstractControl} control - The root control or form group to validate.
   * @param {string} [path] - Optional dot-separated path to a specific control (e.g., "address.zipCode").
   * @returns {boolean} Returns true if the control is valid after validation; otherwise, false.
   *
   * @throws {Error} If the control at the specified path does not exist or is of an unknown type.
   */
  static validateFields(control: AbstractControl, path?: string): boolean {
    const self = this;
    control = path ? control.get(path) as AbstractControl : control;
    if (!control)
      throw new Error(`No control found at path: ${path || 'root'}.`);

    // Maybe add FormArray?
    const isAllowed = [FormGroup, FormControl].some(type => control instanceof type);
    if (!isAllowed)
      throw new Error(`Unknown control type at: ${path || 'root'}`);

    // Mark control as touched and dirty, then update its validity.
    control.markAsTouched();
    control.markAsDirty();
    control.updateValueAndValidity({ emitEvent: true });

    // If is a FormGroup, validate all its child controls recursively.
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((childControl) => {
        self.validateFields(childControl);
      });
    }

    return control.valid;
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
    updateMode: FieldUpdateMode = 'change',
  ): FormControl {
    const controls: Record<string, FormControl> = {};
    const validators = this.validatorsFromProps(props);
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
        updateOn: updateMode,
      },
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
   * @param props - The field properties containing validation rules.
   * @returns An array of ValidatorFn instances.
   */
  private static validatorsFromProps(props: FieldProperties): ValidatorFn[] {
    const supportedValidationKeys = Validation.keys();
    return Object.keys(props)
      .filter((k: string) => supportedValidationKeys.includes(k))
      .map((k: string) => {
        return ValidatorFactory.spawn(props, k);
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
