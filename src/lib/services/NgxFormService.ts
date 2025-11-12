/**
 * @module lib/engine/NgxFormService
 * @description Utilities to create and manage Angular forms in Decaf components.
 * @summary The NgxFormService exposes helpers to build FormGroup/FormArray instances
 * from component metadata or UI model definitions, register forms in a registry,
 * validate and extract form data, and create controls with appropriate validators.
 */
import { escapeHtml, FieldProperties, HTML5CheckTypes, HTML5InputTypes, IPagedComponentProperties, parseToNumber, UIModelMetadata } from '@decaf-ts/ui-decorators';
import { FieldUpdateMode, FormParent, FormParentGroup, KeyValue } from '../engine/types';
import { IComponentConfig, IFormComponentProperties } from '../engine/interfaces';
import { AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { isValidDate, ModelKeys, parseDate, Primitives, Validation } from '@decaf-ts/decorator-validation';
import { ValidatorFactory } from '../engine/ValidatorFactory';
import { cleanSpaces } from '../utils/helpers';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { BaseComponentProps } from '../engine/constants';


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
   * @type {WeakMap<AbstractControl, FieldProperties>}
   * @private
   * @static
   */
  private static controls: WeakMap<AbstractControl, FieldProperties> = new WeakMap<AbstractControl, FieldProperties>();

  /**
   * @description Registry of form groups indexed by their unique identifiers.
   * @summary A Map that stores FormGroup instances with their unique string identifiers.
   * This allows global access to registered forms throughout the application.
   * @type {Map<string, FormGroup>}
   * @private
   * @static
   */
  private static formRegistry: Map<string, FormParent> = new Map<string, FormParent>();

  /**
   * @description Creates a new form group or form array with the specified identifier.
   * @summary Generates a FormGroup or FormArray based on the provided parameters. If formArray is true,
   * creates a FormArray; otherwise creates a FormGroup. The form can optionally be registered in the
   * global form registry for later access throughout the application. If a form with the given id
   * already exists in the registry, it returns the existing form.
   * @param {string} id - Unique identifier for the form
   * @param {boolean} [formArray=false] - Whether to create a FormArray instead of a FormGroup
   * @param {boolean} [registry=true] - Whether to register the form in the global registry
   * @return {FormGroup | FormArray} The created or existing form instance
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant FR as Form Registry
   *   participant AF as Angular Forms
   *   C->>NFS: createForm(id, formArray, registry)
   *   NFS->>FR: Check if form exists
   *   alt Form exists
   *     FR-->>NFS: Return existing form
   *   else Form doesn't exist
   *     alt formArray is true
   *       NFS->>AF: new FormArray([])
   *     else
   *       NFS->>AF: new FormGroup({})
   *     end
   *     alt registry is true
   *       NFS->>FR: addRegistry(id, form)
   *     end
   *   end
   *   NFS-->>C: Return FormGroup | FormArray
   * @static
   */
  static createForm(id: string, formArray = false, registry: boolean = true): FormGroup | FormArray {
    const form = this.formRegistry.get(id) ?? (formArray ? new FormArray([]) : new FormGroup({}));
    if (!this.formRegistry.has(id) && registry)
      this.addRegistry(id, form as FormArray | FormGroup);
    return form as FormArray | FormGroup;
  }


  /**
   * @description Adds a form to the registry.
   * @summary Registers a FormGroup or FormArray with a unique identifier for global access throughout
   * the application. This allows forms to be retrieved and managed centrally. Throws an error if
   * the identifier is already in use to prevent conflicts.
   * @param {string} formId - The unique identifier for the form
   * @param {FormParent} formGroup - The FormGroup or FormArray to be registered
   * @return {void}
   * @throws {Error} If a FormGroup with the given id is already registered
   * @static
   */
  static addRegistry(formId: string, formGroup: FormParent): void {
    if (this.formRegistry.has(formId))
      throw new Error(`A FormGroup with id '${formId}' is already registered.`);
    this.formRegistry.set(formId, formGroup);
  }

  /**
   * @description Retrieves a form from the registry by its identifier.
   * @summary Gets a FormGroup or FormArray from the registry using its unique identifier.
   * Returns undefined if the form is not found in the registry. This method provides
   * safe access to registered forms without throwing errors.
   * @param {string} [id] - The unique identifier of the form to retrieve
   * @return {FormParent | undefined} The FormGroup or FormArray if found, undefined otherwise
   * @static
   */
  static getOnRegistry(id?: string): FormParent | undefined {
    return this.formRegistry.get(id as string);
  }

  /**
   * @description Removes a form from the registry.
   * @summary Deletes a FormGroup or FormArray from the registry using its unique identifier.
   * This cleans up the registry and allows the identifier to be reused. The form itself
   * is not destroyed, only removed from the central registry.
   * @param {string} formId - The unique identifier of the form to be removed
   * @return {void}
   * @static
   */
  static removeRegistry(formId: string): void {
    this.formRegistry.delete(formId);
  }

  /**
   * @description Resolves the parent group and control name from a path.
   * @summary Traverses the form group structure to find the parent group and control name for a given path.
   * Handles complex nested structures including arrays and sub-groups. Creates missing intermediate
   * groups as needed and properly configures FormArray controls for multiple value scenarios.
   * @param {FormGroup} formGroup - The root FormGroup to traverse
   * @param {string} path - The dot-separated path to the control (e.g., 'user.address.street')
   * @param {IFormComponentProperties} componentProps - Properties defining the component configuration
   * @param {KeyValue} parentProps - Properties from the parent component for context
   * @return {FormParentGroup} A tuple containing the parent FormGroup and the control name
   * @private
   * @mermaid
   * sequenceDiagram
   *   participant NFS as NgxFormService
   *   participant FG as FormGroup
   *   participant FA as FormArray
   *   NFS->>NFS: Split path into parts
   *   loop For each path part
   *     alt Control doesn't exist
   *       alt isMultiple and part is childOf
   *         NFS->>FA: new FormArray([new FormGroup({})])
   *       else
   *         NFS->>FG: new FormGroup({})
   *       end
   *       NFS->>FG: addControl(part, newControl)
   *     end
   *     NFS->>NFS: Navigate to next level
   *   end
   *   NFS-->>NFS: Return [parentGroup, controlName]
   * @static
   */
  private static resolveParentGroup(
    formGroup: FormGroup,
    path: string,
    componentProps: IFormComponentProperties,
    parentProps: Partial<IFormComponentProperties>
  ): FormParentGroup {
    const isMultiple = parentProps?.multiple || parentProps?.type === Array.name || false;
    const parts = path.split('.');
    const controlName = parts.pop() as string;
    const {childOf} = componentProps
    let currentGroup = formGroup;

    function setArrayComponentProps(formGroupArray: KeyValue) {
      const props = formGroupArray?.[BaseComponentProps.FORM_GROUP_COMPONENT_PROPS] || {};
        if(!props[ModelKeys.MODEL][controlName])
          props[ModelKeys.MODEL] = Object.assign({}, props[ModelKeys.MODEL], {[controlName]: {...componentProps}});
    }

    for (const part of parts) {
      if (!currentGroup.get(part)) {
        const partFormGroup = (isMultiple && part === childOf) ? new FormArray([new FormGroup({})]) : new FormGroup({});
        const pk = componentProps?.pk || parentProps?.pk || '';
        (partFormGroup as KeyValue)[BaseComponentProps.FORM_GROUP_COMPONENT_PROPS] = {
          childOf: childOf || '',
          isMultiple: isMultiple,
          name: part,
          pk,
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
   * @param {FormGroup | FormArray} formGroup - The form group or form array to extract properties from
   * @param {string} [key] - Optional key to retrieve a specific property
   * @param {string} [groupArrayName] - Optional name of the group array if formGroup is not a FormArray
   * @return {Partial<FieldProperties>} The component properties or a specific property if key is provided
   * @static
   */
  static getComponentPropsFromGroupArray(formGroup: FormGroup | FormArray, key?: string, groupArrayName?: string | undefined): Partial<FieldProperties> {
    if(!(formGroup instanceof FormArray) && typeof groupArrayName === Primitives.STRING)
      formGroup = formGroup.root.get(groupArrayName as string) as FormArray || {};
    const props = (formGroup as KeyValue)?.[BaseComponentProps.FORM_GROUP_COMPONENT_PROPS] || {};
    return (!key ? props : props?.[key]) || {};
  }

  /**
   * @description Adds a new group to a parent FormArray.
   * @summary Creates and adds a new FormGroup to the specified parent FormArray based on the
   * component properties stored in the parent's metadata. This is used for dynamic form arrays
   * where new groups need to be added at runtime. Clones the control at the specified index
   * to maintain the same structure and validators.
   * @param {FormParent} parentForm - The FormArray or FormGroup containing the parent FormArray
   * @param {number} [index] - The index position to clone from; defaults to last index if length > 0, otherwise 0
   * @return {FormArray} The parent FormArray after adding the new group
   * @static
   */
  static addGroupToParent(parentForm: FormParent, index?: number): FormArray {
    if(parentForm instanceof FormGroup)
      parentForm = parentForm.parent as FormArray;
    index = index || (parentForm.length === 0 ? 0 : parentForm.length - 1);
    parentForm.push(this.cloneFormControl(parentForm.at(index)));
    return parentForm;
  }

  /**
   * @description Retrieves a FormGroup from a parent FormArray at the specified index.
   * @summary Gets a FormGroup from the specified parent FormArray. If the group doesn't exist
   * at the given index, it will create a new one using addGroupToParent.
   * @param {FormParent} formGroup - The root form group containing the parent FormArray
   * @param {string} parentName - The name of the parent FormArray to retrieve the group from
   * @param {number} [index=1] - The index of the group to retrieve
   * @return {FormGroup} The FormGroup at the specified index
   * @static
   */
  static getGroupFromParent(formGroup: FormParent, parentName: string, index: number = 1): FormGroup {
    const childGroup = ((formGroup.get(parentName) || formGroup) as FormArray).at(index);
    if(childGroup instanceof FormGroup)
      return childGroup;
    return this.addGroupToParent(formGroup, index).at(index) as FormGroup;
  }

  /**
   * @description Clones a form control with its validators.
   * @summary Creates a deep copy of a FormControl, FormGroup, or FormArray, preserving
   * validators but resetting values and state. This is useful for creating new instances
   * of form controls with the same validation rules, particularly in dynamic FormArrays
   * where new groups need to be added with identical structure.
   * @param {AbstractControl} control - The control to clone (FormControl, FormGroup, or FormArray)
   * @return {AbstractControl} A new instance of the control with the same validators
   * @throws {Error} If the control type is not supported
   * @static
   */
  static cloneFormControl(control: AbstractControl): AbstractControl {
    const syncValidators = (control.validator ? [control.validator] : []).filter(fn => {
      // if(lastIndex > 0)
      //   if(fn !== Validators.required)
      //     return fn;
      return fn;
    });
    const asyncValidators = control.asyncValidator ?? null;
    const validators = {
       validators: syncValidators,
       asyncValidators
    }
    if (control instanceof FormControl) {
      control = new FormControl("", validators);
      // control.markAsPristine();
      // control.markAsUntouched();
      // control.setErrors(null);
      // control.updateValueAndValidity();
      return control;
    }

    if (control instanceof FormGroup) {
      const groupControls: Record<string, AbstractControl> = {};
      for (const key in control.controls) {
        groupControls[key] = this.cloneFormControl(control.controls[key]);
      }
      return new FormGroup(groupControls, validators);
    }

    if (control instanceof FormArray) {
      const arrayControls = control.controls.map(child => this.cloneFormControl(child));
      return new FormArray(arrayControls, validators);
    }

    throw new Error('Unsupported control type');
  }

  /**
   * @description Checks if a value is unique within a FormArray group.
   * @summary Validates that the primary key value in a FormGroup is unique among all groups
   * in the parent FormArray. The uniqueness check behavior differs based on the operation type.
   * For both CREATE and UPDATE operations, it checks that no other group in the array has the same
   * primary key value.
   * @param {FormGroup} formGroup - The FormGroup to check for uniqueness
   * @param {OperationKeys} [operation=OperationKeys.CREATE] - The type of operation being performed
   * @param {number} [index] - The index of the current group within the FormArray
   * @return {boolean} True if the value is unique, false otherwise
   * @static
   */
  static isUniqueOnGroup(formGroup: FormGroup, operation: OperationKeys = OperationKeys.CREATE, index?: number): boolean {
    const formArray = formGroup.parent as FormArray;
    if(index === undefined || index === null)
      index = formArray.length - 1;
    const pk = this.getComponentPropsFromGroupArray(formArray, BaseComponentProps.PK as string) as string;
    const controlName = Object.keys(formGroup.controls)[0];

    if(controlName !== pk || !pk)
      return true;
    const controlValue = cleanSpaces(`${formGroup.get(pk)?.value}`, true);
    if(operation === OperationKeys.CREATE) {
      return !formArray.controls.some((group, i) => {
        const value = cleanSpaces(`${group.get(pk)?.value}`, true);
        return i !== index && value === controlValue;
      });
    }

    return !formArray.controls.some((group, i) => {
      const value = cleanSpaces(`${group.get(pk)?.value}`, true);
      return i !== index && value === controlValue;
    });
  }

  /**
   * @description Enables all controls within a FormGroup or FormArray.
   * @summary Recursively enables all form controls within the provided FormGroup or FormArray.
   * This is useful for making all controls interactive after they have been disabled.
   * @param {FormArray | FormGroup} formGroup - The FormGroup or FormArray to enable all controls for
   * @return {void}
   * @static
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
   * This method supports complex form structures with nested groups and arrays. It also manages
   * page-based forms and FormArray indexing.
   * @param {FormParent} formGroup - The form group or form array to add the control to
   * @param {IFormComponentProperties} componentProps - The component properties defining the control configuration
   * @param {Partial<IFormComponentProperties>} [parentProps={}] - Properties from the parent component for context
   * @param {number} [index=0] - The index for multiple controls in FormArrays
   * @return {FormParent} The updated form parent (FormGroup or FormArray)
   * @private
   * @static
   */
  private static addFormControl(formGroup: FormParent, componentProps: IFormComponentProperties, parentProps: Partial<IFormComponentProperties> = {}, index: number = 0): FormParent {

    const isMultiple = parentProps?.['multiple'] || parentProps?.['type'] === 'Array' || false;
    const { name, childOf, } = componentProps;
    if(isMultiple)
      componentProps['pk'] = componentProps['pk'] || parentProps?.['pk'] || '';
    const fullPath = childOf ? isMultiple ? `${childOf}.${index}.${name}` : `${childOf}.${name}` : name;
    const [parentGroup, controlName] = this.resolveParentGroup(formGroup as FormGroup, fullPath, componentProps, parentProps);

    if (!parentGroup.get(controlName)) {
      const control = NgxFormService.fromProps(
        componentProps,
        componentProps.updateMode || 'change',
      );
      NgxFormService.register(control, componentProps);
      if (parentGroup instanceof FormGroup) {
        parentGroup.addControl(controlName, control);
      }
      if(parentGroup instanceof FormArray) {
        const root = parentGroup.controls[(componentProps as KeyValue)?.['page'] - 1] as FormGroup;
        if(root) {
           root.addControl(controlName, control);
        } else {
          parentGroup.push({[controlName]: control});
        }
      }
    }
    const root = parentGroup instanceof FormArray ? parentGroup.controls[(componentProps as KeyValue)?.['page'] - 1] : parentGroup;
    componentProps['formGroup'] = root as FormGroup;
    componentProps['formControl'] = parentGroup.get(controlName) as FormControl;
    // componentProps['multiple'] = isMultiple;

    return root as FormParent;
  }

  /**
   * @description Retrieves a control from a registered form.
   * @summary Finds and returns an AbstractControl from a registered form using the form id and optional path.
   * This method provides centralized access to form controls across the application by leveraging
   * the form registry system.
   * @param {string} formId - The unique identifier of the form in the registry
   * @param {string} [path] - The optional dot-separated path to a specific control within the form
   * @return {AbstractControl} The requested AbstractControl (FormGroup, FormArray, or FormControl)
   * @throws {Error} If the form is not found in the registry or the control is not found in the form
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant FR as Form Registry
   *   C->>NFS: getControlFromForm(formId, path?)
   *   NFS->>FR: Get form by formId
   *   alt Form not found
   *     FR-->>NFS: null
   *     NFS-->>C: Throw Error
   *   else Form found
   *     FR-->>NFS: Return form
   *     alt path provided
   *       NFS->>NFS: form.get(path)
   *       alt Control not found
   *         NFS-->>C: Throw Error
   *       else
   *         NFS-->>C: Return control
   *       end
   *     else
   *       NFS-->>C: Return form
   *     end
   *   end
   * @static
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
   * @description Creates a form from UI model metadata children.
   * @summary Generates a FormGroup from an array of UIModelMetadata objects, extracting component
   * properties and creating appropriate form controls. This method is specifically designed to work
   * with the UI decorator system and provides automatic form generation from metadata.
   * @param {string} id - Unique identifier for the form
   * @param {boolean} [registry=false] - Whether to register the created form in the global registry
   * @param {UIModelMetadata[]} [children] - Array of UI model metadata objects to create controls from
   * @return {FormGroup} The created FormGroup with controls for each child metadata
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant AF as Angular Forms
   *   C->>NFS: createFormFromChildren(id, registry, children)
   *   NFS->>AF: new FormGroup({})
   *   loop For each child metadata
   *     NFS->>NFS: addFormControl(form, child.props)
   *     NFS->>AF: Create and add FormControl
   *   end
   *   alt registry is true
   *     NFS->>NFS: addRegistry(id, form)
   *   end
   *   NFS-->>C: Return FormGroup
   * @static
   */
  static createFormFromChildren(id: string, registry: boolean = false,  children?: UIModelMetadata[],): FormGroup {
    const form = new FormGroup({});
    if(children?.length)
      children.forEach(child => {
        this.addFormControl(form, child.props as IFormComponentProperties);
      });
    if (registry)
      this.addRegistry(id, form);
    return form;
  }

  /**
   * @description Creates a form from component configurations.
   * @summary Generates a FormGroup based on an array of component configurations and optionally registers it.
   * This method processes component input configurations to create appropriate form controls with
   * validation and initial values.
   * @param {string} id - The unique identifier for the form
   * @param {IComponentConfig[]} components - An array of component configurations defining the form structure
   * @param {boolean} [registry=false] - Whether to register the created form in the global registry
   * @return {FormGroup} The created FormGroup with controls for each component configuration
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant AF as Angular Forms
   *   C->>NFS: createFormFromComponents(id, components, registry)
   *   NFS->>AF: new FormGroup({})
   *   loop For each component config
   *     NFS->>NFS: addFormControl(form, component.inputs)
   *     NFS->>AF: Create and add FormControl
   *   end
   *   alt registry is true
   *     NFS->>NFS: addRegistry(id, form)
   *   end
   *   NFS-->>C: Return FormGroup
   * @static
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
   * Handles multi-page forms by managing FormArray structures and proper indexing. This method supports
   * complex form scenarios including nested controls and page-based form organization. It automatically
   * creates FormArrays for forms with multiple pages and manages page indexing.
   * @param {string} id - The unique identifier of the form
   * @param {ComponentProperties} props - The properties of the component to create the control from
   * @param {props} [parentProps] - Optional parent properties for context and configuration
   * @return {FormParent} The form or created control (FormGroup or FormArray)
   * @throws {Error} If page property is required but not provided or is invalid
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant F as Form
   *   C->>NFS: addControlFromProps(id, props, parentProps?)
   *   NFS->>NFS: createForm(id, formArray, true)
   *   alt Multi-page form (parentProps.pages > 0)
   *     NFS->>NFS: Calculate page index
   *     alt Group doesn't exist at index
   *       NFS->>F: Create new FormGroup at index
   *     end
   *     NFS->>NFS: Set form to page FormGroup
   *   end
   *   alt props has path
   *     NFS->>NFS: addFormControl(form, props, parentProps)
   *   end
   *   NFS-->>C: Return form/control
   * @static
   */
  static addControlFromProps(id: string, props: IFormComponentProperties, parentProps?: IFormComponentProperties): FormParent {

    const componentPages = (typeof props?.pages === Primitives.NUMBER ?
      props?.pages : (props?.pages as IPagedComponentProperties[])?.length) as number;
    const parentPages = (typeof  parentProps?.pages === Primitives.NUMBER ?
    parentProps?.pages : (parentProps?.pages as IPagedComponentProperties[])?.length) as number;

    const isFormArray = (componentPages && componentPages  >= 1 || props.multiple === true);
    let form = this.createForm(id, isFormArray, true);

    if(parentPages && parentPages > 0) {
      const childOf = props.childOf || "";
      const parentChildOf = parentProps?.childOf || "";
      const index = props.page || parentProps?.page;
      // dont check page in nested childs with same childOf
      if((!(typeof index === 'number') || index === 0) && (childOf.length && childOf !== parentChildOf))
        throw Error(`Property 'page' is required and greather than 0 on ${props.name}`);
      // if(index > formLength) {
      //   if((form as KeyValue)?.['lastIndex'] && index === (form as KeyValue)['lastIndex']['page']) {
      //     index = (form as KeyValue)['lastIndex']['index'];
      //   } else {
      //     (form as KeyValue)['lastIndex'] = {
      //       page: index,
      //       index: formLength + 1
      //     };
      //     index = formLength + 1;

      //   }
      // }
      let group = (form as FormArray).controls[(index as number) - 1];
      if(!group) {
        group = new FormGroup({});
        (form as FormArray).insert(index as number, group);
      }
      form = group as FormGroup;
    }
    if(props.path)
      form = this.addFormControl(form, props, parentProps);
    return form;
  }

  /**
   * @description Retrieves form data from a FormGroup.
   * @summary Extracts and processes the data from a FormGroup, handling different input types and nested form groups.
   * Performs type conversion for various HTML5 input types, validates nested controls, and manages
   * multiple control scenarios. Automatically enables all group controls after data extraction.
   * @param {FormGroup} formGroup - The FormGroup to extract data from
   * @return {Record<string, unknown>} An object containing the processed form data with proper type conversions
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant FG as FormGroup
   *   participant FC as FormControl
   *   C->>NFS: getFormData(formGroup)
   *   loop For each control in formGroup
   *     alt Control is not FormControl
   *       NFS->>NFS: Recursive getFormData(control)
   *       alt parentProps.multiple and !isValid
   *         NFS->>NFS: reset(control)
   *       end
   *     else Control is FormControl
   *       NFS->>FC: Get control value
   *       NFS->>NFS: Apply type conversion based on props.type
   *       alt HTML5CheckTypes
   *         NFS->>NFS: Keep boolean value
   *       else NUMBER type
   *         NFS->>NFS: parseToNumber(value)
   *       else DATE/DATETIME types
   *         NFS->>NFS: new Date(value)
   *       else Other types
   *         NFS->>NFS: escapeHtml(value)
   *       end
   *     end
   *   end
   *   NFS->>NFS: enableAllGroupControls(formGroup)
   *   NFS-->>C: Return processed data object
   * @static
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
      } else {
        if(props['type'] === HTML5InputTypes.CHECKBOX && Array.isArray(value))
          value = control.value;
      }
      data[key] = value;
    }
    NgxFormService.enableAllGroupControls(formGroup as FormGroup);
    return data;
  }

  /**
   * @description Validates fields in a form control or form group.
   * @summary Recursively validates all fields in a form control or form group, marking them as touched and dirty.
   * Performs comprehensive validation including uniqueness checks for primary keys in FormArray scenarios.
   * This method ensures all validation rules are applied and form state is properly updated.
   * @param {AbstractControl} control - The control or form group to validate
   * @param {string} [pk] - Optional primary key field name for uniqueness validation
   * @param {string} [path] - The path to the control within the form for error reporting
   * @return {boolean} True if all fields are valid, false otherwise
   * @throws {Error} If no control is found at the specified path or if the control type is unknown
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant FC as FormControl
   *   participant FG as FormGroup
   *   participant FA as FormArray
   *   C->>NFS: validateFields(control, pk?, path?)
   *   alt Control is FormControl
   *     NFS->>FC: markAsTouched()
   *     NFS->>FC: markAsDirty()
   *     NFS->>FC: updateValueAndValidity()
   *     alt Is in FormArray group
   *       NFS->>NFS: Check uniqueness in group
   *       alt Not unique
   *         NFS->>FC: setErrors({notUnique: true})
   *       end
   *     end
   *     NFS-->>C: Return control.valid
   *   else Control is FormGroup
   *     loop For each child control
   *       NFS->>NFS: Recursive validateFields(child)
   *     end
   *     NFS-->>C: Return allValid
   *   else Control is FormArray
   *     loop For each array control
   *       NFS->>NFS: Recursive validateFields(child)
   *     end
   *     NFS-->>C: Return allValid
   *   else Unknown control type
   *     NFS-->>C: Throw Error
   *   end
   * @static
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
    control.updateValueAndValidity({emitEvent: true });

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

    // function getControlName(control: AbstractControl): string | null {
    //   const group = control.parent as FormGroup;
    //   if (!group)
    //       return null;
    //   return Object.keys(group.controls).find(name => control === group.get(name)) || null;
    // }

    return control.valid;
  }

  /**
   * @description Generates validators from component properties.
   * @summary Creates an array of ValidatorFn based on the supported validation keys in the component properties.
   * Maps each validation property to its corresponding Angular validator function using the ValidatorFactory.
   * Only processes properties that are recognized as validation keys by the Validation utility.
   * @param {KeyValue} props - The component properties containing validation rules
   * @return {ValidatorFn[]} An array of validator functions
   * @private
   * @static
   */
  private static validatorsFromProps(props: KeyValue): ValidatorFn[] {
    const supportedValidationKeys = Validation.keys();
    return Object.keys(props)
      .filter((k: string) => supportedValidationKeys.includes(k))
      .map((k: string) => {
        return ValidatorFactory.spawn(props as FieldProperties, k);
      });
  }

  /**
   * @description Creates a FormControl from component properties.
   * @summary Generates a FormControl with validators and initial configuration based on the provided
   * component properties. Handles different input types, sets initial values, and configures
   * validation rules and update modes.
   * @param {FieldProperties} props - The component properties defining the control configuration
   * @param {FieldUpdateMode} [updateMode='change'] - The update mode for the control ('change', 'blur', 'submit')
   * @return {FormControl} The created FormControl with proper configuration and validators
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant VF as ValidatorFactory
   *   participant AF as Angular Forms
   *   C->>NFS: fromProps(props, updateMode?)
   *   NFS->>NFS: validatorsFromProps(props)
   *   NFS->>VF: Create validators from props
   *   VF-->>NFS: Return validator array
   *   NFS->>NFS: Compose validators
   *   alt props.value exists and not checkbox
   *     alt props.type is DATE
   *       NFS->>NFS: Validate date format
   *     end
   *     NFS->>NFS: Set initial value
   *   end
   *   NFS->>AF: new FormControl(config)
   *   AF-->>NFS: Return FormControl
   *   NFS-->>C: Return configured FormControl
   * @static
   */
  static fromProps(props: FieldProperties, updateMode: FieldUpdateMode = 'change'): FormControl {
    const validators = this.validatorsFromProps(props);
    const composed = validators.length ? Validators.compose(validators) : null;
    return new FormControl(
      {
        value:
          props.value
          ? props.type === HTML5InputTypes.CHECKBOX ?
            Array.isArray(props.value) ? props.value : undefined
            : props.type === HTML5InputTypes.DATE
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
   * @description Retrieves properties from a FormControl, FormArray, or FormGroup.
   * @summary Gets the FieldProperties associated with a form control from the internal WeakMap.
   * This method provides access to the original component properties that were used to create
   * the control, enabling validation, rendering, and behavior configuration.
   * @param {FormControl | FormArray | FormGroup} control - The form control to get properties for
   * @return {FieldProperties} The properties associated with the control, or empty object if not found
   * @static
   */
  static getPropsFromControl(control: FormControl | FormArray | FormGroup): FieldProperties {
    return this.controls.get(control) || {} as FieldProperties;
  }

  /**
   * @description Finds a parent element with a specific tag in the DOM tree.
   * @summary Traverses up the DOM tree to find the nearest parent element with the specified tag name.
   * This is useful for finding container elements or specific parent components in the DOM hierarchy.
   * The search is case-insensitive for tag name matching.
   * @param {HTMLElement} el - The starting element to traverse from
   * @param {string} tag - The tag name to search for (case-insensitive)
   * @return {HTMLElement} The found parent element with the specified tag
   * @throws {Error} If no parent with the specified tag is found in the DOM tree
   * @mermaid
   * sequenceDiagram
   *   participant C as Component
   *   participant NFS as NgxFormService
   *   participant DOM as DOM Tree
   *   C->>NFS: getParentEl(element, tagName)
   *   loop Traverse up DOM tree
   *     NFS->>DOM: Get parentElement
   *     DOM-->>NFS: Return parent or null
   *     alt Parent exists and tag matches
   *       NFS-->>C: Return parent element
   *     else Parent is null
   *       NFS-->>C: Throw Error
   *     end
   *   end
   * @static
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
   * @description Registers a control with its properties in the internal WeakMap.
   * @summary Associates a form control with its component properties for later retrieval.
   * This enables the service to maintain metadata about controls without creating memory leaks,
   * as WeakMap automatically cleans up references when controls are garbage collected.
   * @param {AbstractControl} control - The control to register (FormControl, FormGroup, or FormArray)
   * @param {FieldProperties} props - The properties to associate with the control
   * @return {void}
   * @static
   */
  static register(control: AbstractControl, props: FieldProperties): void {
    this.controls.set(control, props);
  }

  /**
   * @description Unregisters a control from the internal WeakMap.
   * @summary Removes a control and its associated properties from the internal WeakMap.
   * This cleans up the metadata tracking for the control and frees up memory. Returns
   * true if the control was found and removed, false if it was not in the registry.
   * @param {AbstractControl} control - The control to unregister (FormControl, FormGroup, or FormArray)
   * @return {boolean} True if the control was successfully unregistered, false otherwise
   * @static
   */
  static unregister(control: AbstractControl): boolean {
    return this.controls.delete(control);
  }

  /**
   * @description Resets a form group or form control.
   * @summary Recursively resets all controls in a form group or a single form control, clearing values,
   * errors, and marking them as pristine and untouched. For FormControls, it sets the value to empty
   * string (except for checkbox types) and clears validation errors. For FormGroups, it recursively
   * resets all child controls.
   * @param {FormGroup | FormControl} formGroup - The form group or form control to reset
   * @return {void}
   * @static
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
