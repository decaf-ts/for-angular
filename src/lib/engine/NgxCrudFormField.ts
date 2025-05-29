import { FieldProperties, RenderingError } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, FieldUpdateMode, PossibleInputTypes } from './types';
import { CrudOperations, InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { ControlValueAccessor, FormGroup } from '@angular/forms';
import { ElementRef } from '@angular/core';
import { NgxFormService } from './NgxFormService';
import { sf } from '@decaf-ts/decorator-validation';
import { AngularEngineKeys } from './constants';

/**
 * @class NgxCrudFormField
 * @implements {FieldProperties}
 * @implements {ControlValueAccessor}
 * @summary Abstract class representing a CRUD form field for Angular applications
 * @description This class provides the base implementation for CRUD form fields in Angular,
 * implementing both CrudFormField and ControlValueAccessor interfaces.
 */
export abstract class NgxCrudFormField implements ControlValueAccessor, FieldProperties {
  /**
   * @summary Reference to the component's element
   * @description ElementRef representing the component's native element
   */
  component!: ElementRef;

  /**
   * @summary Current CRUD operation
   * @description Represents the current CRUD operation being performed
   */
  operation!: CrudOperations;

  /**
   * @summary Form group for the field
   * @description Angular FormGroup instance for the field
   */
  formGroup!: FormGroup;

  name!: string;

  type!: PossibleInputTypes;

  disabled?: boolean;

  // Validation

  format?: string;
  hidden?: boolean;
  max?: number | Date;
  maxlength?: number;
  min?: number | Date;
  minlength?: number;
  pattern?: string | undefined;
  readonly?: boolean;
  required?: boolean;
  step?: number;
  equals?: string;
  different?: string;
  lessThan?: string;
  lessThanOrEqual?: string;
  greaterThan?: string;
  greaterThanOrEqual?: string;

  value!: string | number | Date;

  protected constructor(protected elementRef: ElementRef) {}

  /**
   * @summary Parent HTML element
   * @description Reference to the parent HTML element of the field
   */
  protected parent?: HTMLElement;

  /**
   * @summary String formatting function
   * @description Provides access to the sf function for error message formatting
   * @prop {function(string, ...string): string} sf - String formatting function
   */
  sf = sf;

  /**
   * @summary Change callback function
   * @description Function called when the field value changes
   * @property {function(): unknown} onChange - onChange event handler
   */
  onChange: () => unknown = () => {};

  /**
   * @summary Touch callback function
   * @description Function called when the field is touched
   * @property {function(): unknown} onTouch - onTouch event handler
   */
  onTouch: () => unknown = () => {};

  /**
   * @summary Write value to the field
   * @description Sets the value of the field
   * @param {string} obj - The value to be set
   */
  writeValue(obj: string): void {
    this.value = obj;
  }

  /**
   * @summary Register change callback
   * @description Registers a function to be called when the field value changes
   * @param {function(): unknown} fn - The function to be called on change
   */
  registerOnChange(fn: () => unknown): void {
    this.onChange = fn;
  }

  /**
   * @summary Register touch callback
   * @description Registers a function to be called when the field is touched
   * @param {function(): unknown} fn - The function to be called on touch
   */
  registerOnTouched(fn: () => unknown): void {
    this.onTouch = fn;
  }

  /**
   * @summary Set disabled state
   * @description Sets the disabled state of the field
   * @param {boolean} isDisabled - Whether the field should be disabled
   */
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /**
   * @summary Initialize the field
   * @description Sets up the form group and field name
   * @param {FieldUpdateMode} updateOn - The update mode for the field
   */
  onInit(updateOn: FieldUpdateMode): void {
    // const parent = NgxFormService.getParentEl(this.elementRef?.nativeElement, 'div');
    //
    // let formId = parent.id;
    // if (formId.includes(AngularEngineKeys.RENDERED)) formId = formId.split(AngularEngineKeys.RENDERED)[1];

    // this.formGroup  = NgxFormService.fromProps(this, updateOn, formId);
  }

  /**
   * @summary After view initialization logic
   * @description Performs necessary setup after the view has been initialized
   * @returns {HTMLElement} The parent element of the field
   */
  afterViewInit(): HTMLElement {
    let parent: HTMLElement;
    switch (this.operation) {
      case OperationKeys.READ:
        return this.component.nativeElement.parentElement;
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE:
      case OperationKeys.DELETE:
        try {
          parent = NgxFormService.getParentEl(this.component.nativeElement, 'div');
        } catch (e: unknown) {
          throw new RenderingError(
            `Unable to retrieve parent form element for the ${this.operation}: ${e instanceof Error ? e.message : e}`
          );
        }
        NgxFormService.register(parent.id, this.formGroup, this as AngularFieldDefinition);
        return parent;
      default:
        throw new InternalError(`Invalid operation: ${this.operation}`);
    }
  }

  /**
   * @summary Cleanup on component destruction
   * @description Unregisters the field when the component is destroyed
   */
  onDestroy(): void {
    if (this.parent) NgxFormService.unregister(this.parent.id, this.component.nativeElement);
  }

  /**
   * @summary Get field errors
   * @description Retrieves all errors associated with the field
   * @returns {Array<{key: string, message: string}>} An array of error objects
   */
  getErrors(): { key: string; message: string }[] {
    return Object.entries(this.formGroup.controls).reduce(
      (accum: { key: string; message: string }[], [prop, control]) => {
        Object.entries(control.errors as Record<string, unknown>).forEach(([k, c]) => {
          accum.push({ key: k, message: k });
        });
        return accum;
      },
      []
    );
  }
}
