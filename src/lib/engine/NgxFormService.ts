import { escapeHtml, FieldProperties, HTML5CheckTypes, HTML5InputTypes, parseToNumber, UIKeys } from '@decaf-ts/ui-decorators';
import { ComponentConfig, ComponentInput, FieldUpdateMode, FormParentGroup, KeyValue } from './types';
import { AbstractControl, Form, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
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
  private static controls = new WeakMap<AbstractControl, FieldProperties>();
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
  private static resolveParentGroup(formGroup: FormGroup, path: string, componentProps: ComponentInput, parentProps: KeyValue): FormParentGroup {
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

  static getComponentPropsFromGroupArray(formGroup: FormGroup | FormArray, key?: string, groupArrayName?: string | undefined): Partial<FieldProperties> {
    if(!(formGroup instanceof FormArray) && typeof groupArrayName === Primitives.STRING)
      formGroup = formGroup.root.get(groupArrayName as string) as FormArray || {};
    const props = (formGroup as KeyValue)?.[AngularEngineKeys.FORM_GROUP_COMPONENT_PROPS] || {};
    return (!key ? props : props?.[key]) || {};
  }

  static addGroupToParent(formGroup: FormGroup, parentName: string, index: number = 1): FormGroup {
    const componentProps = this.getComponentPropsFromGroupArray(formGroup, ModelKeys.MODEL, parentName);
    Object.entries(componentProps as KeyValue).forEach(([, value]) => {
      return this.addFormControl(formGroup, value, {multiple: true}, index);
    });

    return this.getGroupFromParent(formGroup, parentName, index);
  }



  static getGroupFromParent(formGroup: FormGroup, parentName: string, index: number = 1): FormGroup {
    const childGroup = ((formGroup.get(parentName) || formGroup) as FormArray).at(index);
    if(childGroup instanceof FormGroup)
      return childGroup;
    return this.addGroupToParent(formGroup, parentName, index);
  }
    // static isUniqueOnGroup(groupArray: FormArray, pk: string, value: string | number, index: number): boolean {
  static isUniqueOnGroup(formGroup: FormGroup, index: number, operation: OperationKeys = OperationKeys.CREATE): boolean {
    const formGroupArray = formGroup.parent as FormArray;
    const pk = this.getComponentPropsFromGroupArray(formGroupArray, BaseComponentProps.PK as string) as string;
    const controlName = Object.keys(formGroup.controls)[0];

    // only check for unique if is the pk control
    if(controlName !== pk)
      return true;

    // const pk = (formGroupArray as KeyValue)?.['componentProps']?.pk || '';
    return !formGroupArray.controls.some((group, i) => {
      const controlValue = cleanSpaces(`${group.get(pk)?.value}`, true);
      const currentValue = cleanSpaces(`${formGroup.get(pk)?.value}`, true);
        return operation === OperationKeys.UPDATE ?
      (i !== index && controlValue !== currentValue) : index === i && controlValue !== currentValue;
    });

    //  i !== index && cleanSpaces(group.get(pk)?.value, true) === cleanSpaces(`${value}`, true)
    // const r = !groupArray.controls.some((group, i) => {
    //   const controlValue = group.get(pk)?.value;
    //   return i !== index && cleanSpaces(controlValue, true) === cleanSpaces(`${value}`, true);
    // });
    // return r;
  }

  static enableAllGroupControls(formGroup: FormArray | FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormArray) {
        control.controls.forEach(child => {
          if (child instanceof FormGroup) {
            child.enable({ emitEvent: false }); // habilita sem disparar eventos
            child.updateValueAndValidity({ emitEvent: true });
          }
        });
      }
    });
  }


  /**
   * @description Adds a form control to a form group.
   * @summary Creates and adds a form control to the specified form group based on the provided component properties.
   * @param {FormGroup} formGroup - The form group to add the control to.
   * @param {ComponentInput} componentProps - The properties of the component to create the control from.
   */
  private static addFormControl(formGroup: FormGroup, componentProps: ComponentInput, parentProps: KeyValue = {}, index: number = 0): void {

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
   * @param {ComponentConfig[]} components - An array of component configurations.
   * @param {boolean} [registry=false] - Whether to register the created form.
   * @return {FormGroup} The created FormGroup.
   */
  static createFormFromComponents(id: string, components: ComponentConfig[], registry: boolean = false): FormGroup {
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
            childControl.disable(); // marca como inválido
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

    return control.valid;
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
