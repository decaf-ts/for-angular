import { CrudOperationKeys, FieldProperties, RenderingError } from '@decaf-ts/ui-decorators';
import { FormParent, KeyValue, PossibleInputTypes } from './types';
import { CrudOperations, InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { ControlValueAccessor, FormArray, FormControl, FormGroup } from '@angular/forms';
import { Directive, Input, SimpleChanges } from '@angular/core';
import { NgxDecafFormService } from './NgxDecafFormService';
import { sf } from '@decaf-ts/decorator-validation';
import { EventConstants } from './constants';
import { FunctionLike } from './types';
import { NgxDecafComponentDirective } from './NgxDecafComponentDirective';

/**
 * @class NgxDecafFormFieldDirective
 * @implements {FieldProperties}
 * @implements {ControlValueAccessor}
 * @summary Abstract class representing a CRUD form field for Angular applications
 * @description This class provides the base implementation for CRUD form fields in Angular,
 * implementing both CrudFormField and ControlValueAccessor interfaces.
 */
@Directive()
export abstract class NgxDecafFormFieldDirective extends NgxDecafComponentDirective implements ControlValueAccessor, FieldProperties {

  /**
   * @description Index of the currently active form group in a form array.
   * @summary When working with multiple form groups (form arrays), this indicates
   * which form group is currently active or being edited. This is used to manage
   * focus and data binding in multi-entry scenarios.
   *
   * @type {number}
   * @default 0
   * @memberOf NgxDecafFormFieldDirective
   */
  @Input()
  activeFormGroupIndex: number = 0;

  /**
   * @description FormArray containing multiple form groups for this field.
   * @summary When this field is part of a multi-entry structure, this FormArray
   * contains all the form groups. This enables management of multiple instances
   * of the same field structure within a single form.
   *
   * @type {FormArray}
   * @memberOf CrudFieldComponent
   */
  @Input()
  parentComponent!: FormParent;

  /**
   * @description Field mapping configuration.
   * @summary Defines how fields from the data model should be mapped to properties used by the component.
   * This allows for flexible data binding between the model and the component's display logic.
   *
   * @type {KeyValue | FunctionLike}
   * @memberOf CrudFieldComponent
   */
  @Input()
  optionsMapper: KeyValue | FunctionLike = {};


  /**
   * @summary Current CRUD operation
   * @description Represents the current CRUD operation being performed
   */
  operation!: CrudOperations;

  /**
   * @summary Form group for the field
   * @description Angular FormGroup instance for the field
   */
  formGroup!: FormGroup | undefined;

  formControl!: FormControl;

  path!: string;

  type!: PossibleInputTypes;

  disabled?: boolean;

  page!: number;

  // Validation

  format?: string;
  hidden?: boolean | CrudOperationKeys[];
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

  value!: string | number | Date | string[];

  multiple!: boolean;


  private validationErrorEventDispatched: boolean = false;

  /**
   * @summary Parent HTML element
   * @description Reference to the parent HTML element of the field
   */
  protected parent?: HTMLElement;

  constructor() {
    super("CrudFormField");
  }


  /**
   * @description Gets the currently active form group based on context.
   * @summary Returns the appropriate FormGroup based on whether this field supports
   * multiple values. For single-value fields, returns the main form group.
   * For multi-value fields, returns the form group at the active index from the parent FormArray.
   *
   * @returns {FormGroup} The currently active FormGroup for this field
   * @memberOf CrudFieldComponent
   */
  get activeFormGroup(): FormGroup {
    if(!this.formGroup)
      return this.formControl.parent as FormGroup;

    if(this.multiple) {
      if(this.formGroup instanceof FormArray)
        return this.formGroup.at(this.activeFormGroupIndex) as FormGroup;
      return this.formGroup;
    }

    return this.formGroup as FormGroup;
    // const formGroup = this.formGroup as FormGroup;
    // try {
    //   const root = formGroup.root as FormGroup;
    //   return this.multiple
    //     ? ((root?.controls?.[this.name] as FormArray)?.at(this.activeFormGroupIndex) as FormGroup)
    //     : formGroup;
    // } catch (error: unknown) {
    //   this.log.error("Error getting active form group:", error as Error);
    //   return formGroup;
    // }
  }


  // protected constructor() {}

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
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange: () => unknown = () => {};

  /**
   * @summary Touch callback function
   * @description Function called when the field is touched
   * @property {function(): unknown} onTouch - onTouch event handler
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
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
   * @summary After view initialization logic
   * @description Performs necessary setup after the view has been initialized
   * @returns {HTMLElement} The parent element of the field
   */
  afterViewInit(): HTMLElement {
    let parent: HTMLElement;
    switch (this.operation) {
      case OperationKeys.READ:
      case OperationKeys.DELETE:
        return this.component.nativeElement.parentElement;
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE:
        try {
          parent = NgxDecafFormService.getParentEl(this.component.nativeElement, 'div');
        } catch (e: unknown) {
          throw new RenderingError(`Unable to retrieve parent form element for the ${this.operation}: ${e instanceof Error ? e.message : e}`);
        }
        // NgxDecafFormService.register(parent.id, this.formGroup, this as AngularFieldDefinition);
        return parent;
      default:
        throw new InternalError(`Invalid operation: ${this.operation}`);
    }
  }

  override ngOnChanges(changes: SimpleChanges): void {
    if(!this.initialized)
      super.ngOnChanges(changes);
    if(changes['activeFormGroupIndex'] && this.multiple &&
        !changes['activeFormGroupIndex'].isFirstChange() && changes['activeFormGroupIndex'].currentValue !== this.activeFormGroupIndex) {

      this.activeFormGroupIndex = changes['activeFormGroupIndex'].currentValue;
      this.formGroup = this.activeFormGroup;
      this.formControl = this.formGroup.get(this.name) as FormControl;
    }
    if(changes['value'] && !changes['value'].isFirstChange()
    && (changes['value'].currentValue !== undefined && changes['value'].currentValue !== this.value))
      this.setValue(changes['value'].currentValue);
  }

  onDestroy(): void {
    if(this.formGroup)
      NgxDecafFormService.unregister(this.formGroup);
  }

  setValue(value: unknown): void {
    this.formControl.setValue(value);
    this.formControl.updateValueAndValidity();
  }


  getErrors(parent: HTMLElement): string | void {
    const formControl = this.formControl;
    if(formControl) {
      const accordionComponent = parent.closest('ngx-decaf-fieldset')?.querySelector('ion-accordion-group');
      if((!formControl.pristine || formControl.touched) && !formControl.valid) {
        const errors: Record<string, string>[] = Object.keys(formControl.errors ?? {}).map(key => ({
          key: key,
          message: key,
        }));
        if(errors.length) {
          if(accordionComponent && !this.validationErrorEventDispatched) {
            const validationErrorEvent = new CustomEvent(EventConstants.VALIDATION_ERROR, {
              detail: {fieldName: this.name, hasErrors: true},
              bubbles: true
            });
            accordionComponent.dispatchEvent(validationErrorEvent);
            this.validationErrorEventDispatched = true;
          }
        }
        for(const error of errors)
          return `* ${this.sf(this.translateService.instant(`errors.${error?.['message']}`), (this as KeyValue)[error?.['key']] ?? "")}`;
      }
    }

  }
}
