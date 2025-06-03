import { escapeHtml, FieldProperties, HTML5CheckTypes, HTML5InputTypes, parseToNumber } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, FieldUpdateMode } from './types';
import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { isValidDate, parseDate, Validation } from '@decaf-ts/decorator-validation';
import { ValidatorFactory } from './ValidatorFactory';

export interface ComponentInput extends FieldProperties {
  updateMode?: FieldUpdateMode;
  formGroup?: FormGroup;
  formControl?: FormControl;
}

export interface ComponentConfig {
  component: string;
  inputs: ComponentInput;
  injector: any;
}

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
   * A static object that stores form controls props.
   */
  private static controls = new WeakMap<AbstractControl, FieldProperties>();

  private constructor() {
  }

  /**
   * Resolves the parent FormGroup and control name from a dot-delimited path.
   * Automatically creates missing intermediate FormGroups if necessary.
   *
   * @param {FormGroup} formGroup -  The FormGroup to walk through
   * @param {string} path - The full path string (e.g., 'address.billing.street')
   * @returns {[FormGroup, string]} A tuple of parent FormGroup and the final control name.
   */
  private static resolveParentGroup(formGroup: FormGroup, path: string): [FormGroup, string] {
    const parts = path.split('.');
    const controlName = parts.pop() as string; // last element is always the control name

    let currentGroup = formGroup;

    for (const part of parts) {
      if (!currentGroup.get(part)) {
        currentGroup.addControl(part, new FormGroup({}));
      }
      currentGroup = currentGroup.get(part) as FormGroup;
    }

    return [currentGroup, controlName];
  }

  /**
   * Adds a FormControl to the specified FormGroup, respecting the nesting structure
   * defined via `childrenof`. Also updates the component's `formGroup` reference.
   *
   * @param {} component - The component configuration to process
   * @param {FormGroup} formGroup - The root FormGroup to add the control to
   */
  private static addFormControl(component: ComponentConfig, formGroup: FormGroup): void {
    const { name, childOf } = component.inputs;
    const fullPath = childOf ? `${childOf}.${name}` : name;
    const [parentGroup, controlName] = this.resolveParentGroup(formGroup, fullPath);

    if (!parentGroup.get(controlName)) {
      const control = NgxFormService.fromProps(
        component.inputs,
        component.inputs.updateMode || 'change',
      );
      NgxFormService.register(control, component.inputs);
      parentGroup.addControl(controlName, control);
    }

    component.inputs.formGroup = parentGroup;
    component.inputs.formControl = parentGroup.get(controlName) as FormControl;
  }

  /**
   * Builds a FormGroup from a flat array of components, using the `childrenof` property
   * to establish nested hierarchy.
   *
   * @param components - Flat array of component configurations
   * @returns {FormGroup} FormGroup - Root FormGroup containing the complete nested structure
   */
  static createFormFromComponents(components: ComponentConfig[]): FormGroup {
    const rootForm = new FormGroup({});
    components.forEach(component => {
      this.addFormControl(component, rootForm);
    });
    return rootForm;
  }

  /**
   * @summary  Returns the sanitized values from the given FormGroup.
   * @description
   * Iterates through the form controls and returns their current values,
   * applying any necessary transformations or escapes.
   *
   * @param formGroup - The FormGroup instance to extract values from.
   * @returns {Record<string, unknown>} An object containing the parsed form values.
   */
  static getFormData(formGroup: FormGroup): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const key in formGroup.controls) {
      const control = formGroup.controls[key];
      // check for nested FormGroups
      if (!(control instanceof FormControl)) {
        data[key] = NgxFormService.getFormData(control as FormGroup);
        continue;
      }

      const props = NgxFormService.getPropsFromControl(control);
      let value = control.value;
      if (!HTML5CheckTypes.includes(props['type'])) {
        switch (props['type']) {
          case HTML5InputTypes.NUMBER:
            value = parseToNumber(value);
            break;
          case HTML5InputTypes.DATE:
          case HTML5InputTypes.DATETIME_LOCAL:
            value = new Date(value);
            break;
          default:
            value = escapeHtml(value);
        }
      }
      data[key] = value;
    }

    return data;
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
   * @summary Creates a FormGroup from field properties.
   * @description
   * Generates a new FormGroup instance based on the provided field definition and update mode.
   *
   * @param {AngularFieldDefinition} props - The Angular field definition properties.
   * @param {FieldUpdateMode} updateMode - The update mode for the form group.
   * @returns {FormGroup} A new FormGroup instance.
   */
  static fromProps(props: FieldProperties, updateMode: FieldUpdateMode = 'change'): FormControl {
    const validators = this.validatorsFromProps(props);
    const composed = validators.length ? Validators.compose(validators) : null;
    return new FormControl(
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
  }

  /**
   * Returns the field properties associated with the given form control.
   * Looks up the control in the `controls` map. If not found, return an empty object.
   *
   * @param {FormControl} control - The form control to look up.
   * @returns {FieldProperties} The associated field properties or an empty object.
   */
  static getPropsFromControl(control: FormControl): FieldProperties {
    return this.controls.get(control) || {} as FieldProperties;
  }

  /**
   * Searches up the DOM tree from the given element and returns the closest parent with the specified tag name.
   *
   * @param {HTMLElement} el - The starting element.
   * @param {string} tag - The tag name of the parent to find (case-insensitive).
   * @returns {HTMLElement} The closest parent element with the specified tag.
   *
   * @throws {Error} If no parent element with the given tag is found.
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

  /**
   * Registers a control along with its metadata for internal tracking.
   *
   * @param control - The AbstractControl instance to register.
   * @param props - A configuration for the control.
   */
  static register(control: AbstractControl, props: FieldProperties) {
    this.controls.set(control, props);
  }

  /**
   * Unregisters the given control from tracking.
   * This doesn't destroy the object, only removes it from the registry.
   *
   * @param control - The control instance to unregister.
   * @returns Whether the control was successfully unregistered.
   */
  static unregister(control: AbstractControl): boolean {
    return this.controls.delete(control);
  }

  /**
   * Resets all controls in the given FormGroup to their "no-value" state.
   *
   * - Recursively resets nested FormGroups.
   * - If a control's type is not included in `HTML5CheckTypes`, its value is set to `undefined`.
   * - All controls are marked as pristine and untouched, with no validation errors.
   *
   * @param {FormGroup} formGroup - The form group to reset.
   */
  static reset(formGroup: FormGroup) {
    for (const key in formGroup.controls) {
      const control = formGroup.controls[key];
      // check for nested FormGroups
      if (!(control instanceof FormControl)) {
        NgxFormService.reset(control as FormGroup);
        continue;
      }

      const { type } = NgxFormService.getPropsFromControl(control);
      if (!HTML5CheckTypes.includes(type))
        control.setValue(undefined);
      control.markAsPristine();
      control.markAsUntouched();
      control.setErrors(null);
      control.updateValueAndValidity();
    }
  }
}
