import { escapeHtml, FieldProperties, HTML5CheckTypes, HTML5InputTypes, parseToNumber } from '@decaf-ts/ui-decorators';
import { FieldUpdateMode, FormParentGroup, KeyValue } from './types';
import { IComponentConfig, IComponentInput } from './interfaces';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { isValidDate, ModelKeys, parseDate, Primitives, Validation } from '@decaf-ts/decorator-validation';
import { ValidatorFactory } from './ValidatorFactory';
import { cleanSpaces } from '../helpers';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { AngularEngineKeys, BaseComponentProps } from '../engine/constants';


/**
 * @description Service for managing Angular forms and form controls.
 * @summary The NgxFormService provides utility methods for creating, managing, and validating Angular forms and form controls. It includes functionality for registering forms, adding controls, validating fields, and handling form data.
 *
 * @class
 * @param {WeakMap<AbstractControl, FieldProperties>} controls - A WeakMap to store control properties.
 * @param {Map<string, FormGroup>} formRegistry - A Map to store registered forms.
 *
 * @example
 * // Creating a form from components
 * const components = [
 *   { inputs: { name: 'username', type: 'text', required: true } },
 *   { inputs: { name: 'password', type: 'password', minLength: 8 } }
 * ];
 * const form = NgxFormService.createFormFromComponents('loginForm', components, true);
 *
 * // Validating fields
 * NgxFormService.validateFields(form);
 *
 * // Getting form data
 * const formData = NgxFormService.getFormData(form);
 *
 * @mermaid
 * sequenceDiagram
 *   participant C as Component
 *   participant NFS as NgxFormService
 *   participant AF as Angular Forms
 *   C->>NFS: createFormFromComponents()
 *   NFS->>AF: new FormGroup()
 *   NFS->>NFS: addFormControl()
 *   NFS->>AF: addControl()
 *   NFS-->>C: Return FormGroup
 *   C->>NFS: validateFields()
 *   NFS->>AF: markAsTouched(), markAsDirty(), updateValueAndValidity()
 *   C->>NFS: getFormData()
 *   NFS->>AF: Get control values
 *   NFS-->>C: Return form data
 */
export class NgxFormService {
  /**
   * @description WeakMap that stores control properties for form controls.
   * @summary A WeakMap that associates AbstractControl instances with their corresponding FieldProperties.
   * This allows the service to track metadata for form controls without creating memory leaks.
   *
   * @type {WeakMap<AbstractControl, FieldProperties>}
   * @private
   * @static
   * @memberOf NgxFormService
   */
  private static controls = new WeakMap<AbstractControl, FieldProperties>();

  /**
   * @description Registry of form groups indexed by their unique identifiers.
   * @summary A Map that stores FormGroup instances with their unique string identifiers.
   * This allows global access to registered forms throughout the application.
   *
   * @type {Map<string, FormGroup>}
   * @private
   * @static
   * @memberOf NgxFormService
   */
  private static formRegistry = new Map<string, FormGroup>();
  /**
   * @description Adds a form to the registry.
   * @summary Registers a FormGroup with a unique identifier. Throws an error if the identifier is already in use.
   * @param {string} formId - The unique identifier for the form.
   * @param {FormGroup} formGroup - The FormGroup to be registered.
   * @throws {Error} If a FormGroup with the given id is already registered.
   */
  static addRegistry(formId: string, formGroup: FormGroup): void {
    if (this.formRegistry.has(formId))
      throw new Error(`A FormGroup with id '${formId}' is already registered.`);
    this.formRegistry.set(formId, formGroup);
  }

  /**
   * @description Removes a form from the registry.
   * @summary Deletes a FormGroup from the registry using its unique identifier.
   * @param {string} formId - The unique identifier of the form to be removed.
   */
  static removeRegistry(formId: string): void {
    this.formRegistry.delete(formId);
  }

  /**
   * @description Resolves the parent group and control name from a path.
   * @summary Traverses the form group structure to find the parent group and control name for a given path.
   * @param {FormGroup} formGroup - The root FormGroup.
   * @param {string} path - The path to the control.
   * @return {FormParentGroup} A tuple containing the parent FormGroup and the control name.
   */
  private static resolveParentGroup(formGroup: FormGroup, path: string, componentProps: IComponentInput, parentProps: KeyValue): FormParentGroup {
    const isMultiple = parentProps?.['multiple'] || parentProps?.['type'] === 'Array' || false;
    const parts = path.split('.');
    const controlName = parts.pop() as string;
    const {childOf} = componentProps
    let currentGroup = formGroup;

    function setArrayComponentProps(formGroupArray: FormArray) {
      const props = (formGroupArray as KeyValue)[AngularEngineKeys.FORM_GROUP_COMPONENT_PROPS] || {};
        if(!props[ModelKeys.MODEL][controlName])
          props[ModelKeys.MODEL] = Object.assign({}, props[ModelKeys.MODEL], {[controlName]: {...componentProps}});
    }

    for (const part of parts) {
      if (!currentGroup.get(part)) {
        const partFormGroup = (isMultiple && part === childOf) ? new FormArray([new FormGroup({})]) : new FormGroup({});
        (partFormGroup as KeyValue)[AngularEngineKeys.FORM_GROUP_COMPONENT_PROPS] = {
          childOf: childOf || '',
          isMultiple: isMultiple,
          name: part,
          pk: componentProps?.['pk'] || parentProps?.['pk'] || '',
          [ModelKeys.MODEL]: {},
        } as Partial<FieldProperties> & {model: KeyValue};

        if(currentGroup instanceof FormArray) {
          (currentGroup as FormArray).push(partFormGroup);
        } else {

          for(const control of Object.values(partFormGroup.controls)) {
            if(control instanceof FormControl)
              this.register(control as AbstractControl, componentProps);
          }

          if(partFormGroup instanceof AbstractControl)
            this.register(partFormGroup as AbstractControl, componentProps);

          currentGroup.addControl(part, partFormGroup);
        }
      }
      if(childOf && currentGroup instanceof FormArray)
        setArrayComponentProps(currentGroup);

      currentGroup = currentGroup.get(part) as FormGroup;
    }
    return [currentGroup, controlName];
  }

  /**
   * @description Retrieves component properties from a FormGroup or FormArray.
   * @summary Extracts component properties stored in the form group metadata. If a FormGroup is provided
   * and groupArrayName is specified, it will look for the FormArray within the form structure.
   *
   * @param {FormGroup | FormArray} formGroup - The form group or form array to extract properties from
   * @param {string} [key] - Optional key to retrieve a specific property
   * @param {string} [groupArrayName] - Optional name of the group array if formGroup is not a FormArray
   * @return {Partial<FieldProperties>} The component properties or a specific property if key is provided
   *
   * @static
   * @memberOf NgxFormService
   */
  static getComponentPropsFromGroupArray(formGroup: FormGroup | FormArray, key?: string, groupArrayName?: string | undefined): Partial<FieldProperties> {
    if(!(formGroup instanceof FormArray) && typeof groupArrayName === Primitives.STRING)
      formGroup = formGroup.root.get(groupArrayName as string) as FormArray || {};
    const props = (formGroup as KeyValue)?.[AngularEngineKeys.FORM_GROUP_COMPONENT_PROPS] || {};
    return (!key ? props : props?.[key]) || {};
  }

  /**
   * @description Adds a new group to a parent FormArray.
   * @summary Creates and adds a new FormGroup to the specified parent FormArray based on the
   * component properties stored in the parent's metadata. This is used for dynamic form arrays
   * where new groups need to be added at runtime.
   *
   * @param {FormGroup} formGroup - The root form group containing the parent FormArray
   * @param {string} parentName - The name of the parent FormArray to add the group to
   * @param {number} [index=1] - The index position where the new group should be added
   * @return {FormGroup} The newly created and added FormGroup
   *
   * @static
   * @memberOf NgxFormService
   */
  static addGroupToParent(formGroup: FormGroup, parentName: string, index: number = 1): FormGroup {
    const componentProps = this.getComponentPropsFromGroupArray(formGroup, ModelKeys.MODEL, parentName);
    Object.entries(componentProps as KeyValue).forEach(([, value]) => {
      return this.addFormControl(formGroup, value, {multiple: true}, index);
    });

    return this.getGroupFromParent(formGroup, parentName, index);
  }

  /**
   * @description Retrieves a FormGroup from a parent FormArray at the specified index.
   * @summary Gets a FormGroup from the specified parent FormArray. If the group doesn't exist
   * at the given index, it will create a new one using addGroupToParent.
   *
   * @param {FormGroup} formGroup - The root form group containing the parent FormArray
   * @param {string} parentName - The name of the parent FormArray to retrieve the group from
   * @param {number} [index=1] - The index of the group to retrieve
   * @return {FormGroup} The FormGroup at the specified index
   *
   * @static
   * @memberOf NgxFormService
   */
  static getGroupFromParent(formGroup: FormGroup, parentName: string, index: number = 1): FormGroup {
    const childGroup = ((formGroup.get(parentName) || formGroup) as FormArray).at(index);
    if(childGroup instanceof FormGroup)
      return childGroup;
    return this.addGroupToParent(formGroup, parentName, index);
  }

  /**
   * @description Checks if a value is unique within a FormArray group.
   * @summary Validates that the primary key value in a FormGroup is unique among all groups
   * in the parent FormArray. The uniqueness check behavior differs based on the operation type.
   *
   * @param {FormGroup} formGroup - The FormGroup to check for uniqueness
   * @param {number} index - The index of the current group within the FormArray
   * @param {OperationKeys} [operation=OperationKeys.CREATE] - The type of operation being performed
   * @return {boolean} True if the value is unique, false otherwise
   *
   * @static
   * @memberOf NgxFormService
   */
  static isUniqueOnGroup(formGroup: FormGroup, index: number, operation: OperationKeys = OperationKeys.CREATE): boolean {
    const formGroupArray = formGroup.parent as FormArray;
    const pk = this.getComponentPropsFromGroupArray(formGroupArray, BaseComponentProps.PK as string) as string;
    const controlName = Object.keys(formGroup.controls)[0];

    // only check for unique if is the pk control
    if(controlName !== pk)
      return true;
    const controlValue = cleanSpaces(`${formGroup.get(pk)?.value}`, true);
    if(operation === OperationKeys.CREATE)
      return !formGroupArray.controls.some((group, i) => i !== index && cleanSpaces(`${group.get(pk)?.value}`, true) === controlValue);

    return !formGroupArray.controls.some((group, i) => {
      const value = cleanSpaces(`${group.get(pk)?.value}`, true);
      return i !== index && controlValue === value;
    });
  }

  /**
   * @description Enables all controls within a FormGroup or FormArray.
   * @summary Recursively enables all form controls within the provided FormGroup or FormArray.
   * This is useful for making all controls interactive after they have been disabled.
   *
   * @param {FormArray | FormGroup} formGroup - The FormGroup or FormArray to enable all controls for
   * @return {void}
   *
   * @static
   * @memberOf NgxFormService
   */
  static enableAllGroupControls(formGroup: FormArray | FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormArray) {
        control.controls.forEach(child => {
          if (child instanceof FormGroup) {
            child.enable({ emitEvent: false });
            child.updateValueAndValidity({ emitEvent: true });
          }
        });
      }
    });
  }

  /**
   * @description Adds a form control to a form group based on component properties.
   * @summary Creates and configures a FormControl within the specified FormGroup using the provided
   * component properties. Handles nested paths, multiple controls (FormArrays), and control registration.
   * This method supports complex form structures with nested groups and arrays.
   *
   * @param {FormGroup} formGroup - The form group to add the control to
   * @param {IComponentInput} componentProps - The component properties defining the control configuration
   * @param {KeyValue} [parentProps={}] - Properties from the parent component for context
   * @param {number} [index=0] - The index for multiple controls in FormArrays
   * @return {void}
   *
   * @private
   * @static
   * @memberOf NgxFormService
   */
  private static addFormControl(formGroup: FormGroup, componentProps: IComponentInput, parentProps: KeyValue = {}, index: number = 0): void {

    const isMultiple = parentProps?.['multiple'] || parentProps?.['type'] === 'Array' || false;
    const { name, childOf, } = componentProps;
    if(isMultiple)
      componentProps['pk'] = componentProps['pk'] || parentProps?.['pk'] || '';
    const fullPath = childOf ? isMultiple ? `${childOf}.${index}.${name}` : `${childOf}.${name}` : name;
    const [parentGroup, controlName] = this.resolveParentGroup(formGroup, fullPath, componentProps, parentProps);

    if (!parentGroup.get(controlName)) {
      const control = NgxFormService.fromProps(
        componentProps,
        componentProps.updateMode || 'change',
      );
      NgxFormService.register(control, componentProps);
      parentGroup.addControl(controlName, control);
    }

    componentProps['formGroup'] = parentGroup;
    componentProps['formControl'] = parentGroup.get(controlName) as FormControl;
    componentProps['multiple'] = isMultiple

  }

  /**
   * @description Retrieves a control from a registered form.
   * @summary Finds and returns an AbstractControl from a registered form using the form id and optional path.
   * @param {string} formId - The unique identifier of the form.
   * @param {string} [path] - The path to the control within the form.
   * @return {AbstractControl} The requested AbstractControl.
   * @throws {Error} If the form is not found in the registry or the control is not found in the form.
   */
  static getControlFromForm(formId: string, path?: string): AbstractControl {
    const form = this.formRegistry.get(formId);
    if (!form)
      throw new Error(`Form with id '${formId}' not found in the registry.`);

    if (!path)
      return form;

    const control = form.get(path);
    if (!control)
      throw new Error(`Control with path '${path}' not found in form '${formId}'.`);
    return control;
  }

  /**
   * @description Creates a form from component configurations.
   * @summary Generates a FormGroup based on an array of component configurations and optionally registers it.
   * @param {string} id - The unique identifier for the form.
   * @param {IComponentConfig[]} components - An array of component configurations.
   * @param {boolean} [registry=false] - Whether to register the created form.
   * @return {FormGroup} The created FormGroup.
   */
  static createFormFromComponents(id: string, components: IComponentConfig[], registry: boolean = false): FormGroup {
    const form = new FormGroup({});
    components.forEach(component => {
      this.addFormControl(form, component.inputs);
    });

    if (registry)
      this.addRegistry(id, form);

    return form;
  }

  /**
   * @description Adds a control to a form based on component properties.
   * @summary Creates and adds a form control to a form (existing or new) based on the provided component properties.
   * @param {string} id - The unique identifier of the form.
   * @param {FieldProperties} componentProperties - The properties of the component to create the control from.
   * @return {AbstractControl} The form or created control.
   */
  static addControlFromProps(id: string, componentProperties: FieldProperties, parentProps?: FieldProperties): AbstractControl {
    const form = this.formRegistry.get(id) ?? new FormGroup({});
    if (!this.formRegistry.has(id))
      this.addRegistry(id, form);

    if (componentProperties.path)
      this.addFormControl(form, componentProperties, parentProps);

    return form;
  }

  /**
   * @description Retrieves form data from a FormGroup.
   * @summary Extracts and processes the data from a FormGroup, handling different input types and nested form groups.
   * @param {FormGroup} formGroup - The FormGroup to extract data from.
   * @return {Record<string, unknown>} An object containing the form data.
   */
  static getFormData(formGroup: FormGroup): Record<string, unknown> {
    const data: Record<string, unknown> = {};
    for (const key in formGroup.controls) {
      const control = formGroup.controls[key];
      const parentProps = NgxFormService.getPropsFromControl(formGroup as FormGroup | FormArray);
      if (!(control instanceof FormControl)) {
        const value = NgxFormService.getFormData(control as FormGroup);
        const isValid = control.valid;
        if(parentProps.multiple) {
            if(isValid) {
               data[key] = value;
            } else {
              this.reset(control as FormControl);
            }

            continue;
        }
        data[key] = value;
        continue;
      }

      const props = NgxFormService.getPropsFromControl(control as FormControl | FormArray);
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
    NgxFormService.enableAllGroupControls(formGroup as FormGroup);
    return data;
  }

  /**
   * @description Validates fields in a form control or form group.
   * @summary Recursively validates all fields in a form control or form group, marking them as touched and dirty.
   * @param {AbstractControl} control - The control or form group to validate.
   * @param {string} [path] - The path to the control within the form.
   * @return {boolean} True if all fields are valid, false otherwise.
   * @throws {Error} If no control is found at the specified path or if the control type is unknown.
   */
  static validateFields(control: AbstractControl, pk?: string,  path?: string): boolean {
    control = path ? control.get(path) as AbstractControl : control;
    if (!control)
      throw new Error(`No control found at path: ${path || 'root'}.`);

    const isAllowed = [FormArray, FormGroup, FormControl].some(type => control instanceof type);
    if (!isAllowed)
      throw new Error(`Unknown control type at: ${path || 'root'}`);

    control.markAsTouched();
    control.markAsDirty();
    control.updateValueAndValidity({ emitEvent: true });

    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach(childControl => {
        this.validateFields(childControl);
      });
    }

    if (control instanceof FormArray) {
      const totalGroups = control.length;
      const hasValid = control.controls.some(control => control.valid);
      if(totalGroups > 1 && hasValid) {
         for (let i = control.length - 1; i >= 0; i--) {
          const childControl = control.at(i);
          // disable no valid groups on array
          if (!childControl.valid) {
            (childControl.parent as FormGroup).setErrors(null);
             (childControl.parent as FormGroup).updateValueAndValidity({ emitEvent: true });
            childControl.disable();
          } else {
            this.validateFields(childControl);
          }
        }
      } else {
        Object.values(control.controls).forEach(childControl => {
          this.validateFields(childControl);
        });
      }
    }

    function getControlName(control: AbstractControl): string | null {
      const group = control.parent as FormGroup;
      if (!group)
          return null;
      return Object.keys(group.controls).find(name => control === group.get(name)) || null;
    }

    return !getControlName(control) ? true : control.valid;
  }

  /**
   * @description Generates validators from component properties.
   * @summary Creates an array of ValidatorFn based on the supported validation keys in the component properties.
   * @param {FieldProperties} props - The component properties.
   * @return {ValidatorFn[]} An array of validator functions.
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
   * @description Creates a FormControl from component properties.
   * @summary Generates a FormControl with validators based on the provided component properties.
   * @param {FieldProperties} props - The component properties.
   * @param {FieldUpdateMode} [updateMode='change'] - The update mode for the control.
   * @return {FormControl} The created FormControl.
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
              (props.value as unknown) : undefined,
        disabled: props.disabled,
      },
      {
        validators: composed,
        updateOn: updateMode,
      },
    );
  }

  /**
   * @description Retrieves properties from a FormControl.
   * @summary Gets the FieldProperties associated with a FormControl from the internal WeakMap.
   * @param {FormControl} control - The FormControl to get properties for.
   * @return {FieldProperties} The properties associated with the control.
   */
  static getPropsFromControl(control: FormControl | FormArray | FormGroup): FieldProperties {
    return this.controls.get(control) || {} as FieldProperties;
  }

  /**
   * @description Finds a parent element with a specific tag.
   * @summary Traverses up the DOM tree to find the nearest parent element with the specified tag.
   * @param {HTMLElement} el - The starting element.
   * @param {string} tag - The tag name to search for.
   * @return {HTMLElement} The found parent element.
   * @throws {Error} If no parent with the specified tag is found.
   */
  static getParentEl(el: HTMLElement, tag: string): HTMLElement {
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
   * @description Registers a control with its properties.
   * @summary Associates a control with its properties in the internal WeakMap.
   * @param {AbstractControl} control - The control to register.
   * @param {FieldProperties} props - The properties to associate with the control.
   */
  static register(control: AbstractControl, props: FieldProperties) {
    this.controls.set(control, props);
  }

  /**
   * @description Unregisters a control.
   * @summary Removes a control and its associated properties from the internal WeakMap.
   * @param {AbstractControl} control - The control to unregister.
   * @return {boolean} True if the control was successfully unregistered, false otherwise.
   */
  static unregister(control: AbstractControl): boolean {
    return this.controls.delete(control);
  }

  /**
   * @description Resets a form group.
   * @summary Recursively resets all controls in a form group, clearing values, errors, and marking them as pristine and untouched.
   * @param {FormGroup} formGroup - The form group to reset.
   */
  static reset(formGroup: FormGroup | FormControl): void {
    if(formGroup instanceof FormControl) {
      const control = formGroup as FormControl;
      const { type } = NgxFormService.getPropsFromControl(control);
      if (!HTML5CheckTypes.includes(type))
        control.setValue("");
      control.markAsPristine();
      control.markAsUntouched();
      control.setErrors(null);
      control.updateValueAndValidity();
    } else {
      for (const key in formGroup.controls) {
        const control = formGroup.controls[key];
        NgxFormService.reset(control as FormControl);
        continue;
      }
    }
  }
}
