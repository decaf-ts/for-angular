/**
 * @module lib/engine/NgxFormFieldDirective
 * @description Base directive for CRUD form fields in Decaf Angular applications.
 * @summary Provides the NgxFormFieldDirective abstract class that implements ControlValueAccessor
 * and FieldProperties to enable form field integration with Angular's reactive forms system.
 * This directive handles form control lifecycle, validation, multi-entry forms, and CRUD operations.
 */
import { CrudOperationKeys, FieldProperties, RenderingError } from '@decaf-ts/ui-decorators';
import { FormParent, KeyValue, PossibleInputTypes } from './types';
import { CrudOperations, InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { ControlValueAccessor, FormArray, FormControl, FormGroup } from '@angular/forms';
import { Directive, Inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { NgxFormService } from '../services/NgxFormService';
import { sf } from '@decaf-ts/decorator-validation';
import { ComponentEventNames } from './constants';
import { FunctionLike } from './types';
import { NgxComponentDirective } from './NgxComponentDirective';
import { CPTKN } from '../for-angular-common.module';

/**
 * @description Abstract base directive for CRUD form fields in Angular applications.
 * @summary Provides the foundation for all form field components in Decaf applications by implementing
 * Angular's ControlValueAccessor interface and FieldProperties for validation. This directive manages
 * form control integration, validation state, multi-entry forms (FormArrays), and CRUD operation context.
 * It handles form group lifecycle, error messaging, change detection, and parent-child form relationships.
 * Extend this class to create custom form field components that seamlessly integrate with Angular's
 * reactive forms and Decaf's validation system.
 * @class NgxFormFieldDirective
 * @extends {NgxComponentDirective}
 * @implements {ControlValueAccessor}
 * @implements {FieldProperties}
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-text-field',
 *   templateUrl: './text-field.component.html',
 *   providers: [{
 *     provide: NG_VALUE_ACCESSOR,
 *     useExisting: forwardRef(() => TextFieldComponent),
 *     multi: true
 *   }]
 * })
 * export class TextFieldComponent extends NgxFormFieldDirective {
 *   constructor() {
 *     super();
 *   }
 * }
 * ```
 */
@Directive()
export abstract class NgxFormFieldDirective extends NgxComponentDirective implements OnChanges, ControlValueAccessor, FieldProperties {

  /**
   * @description Index of the currently active form group in a form array.
   * @summary When working with multiple form groups (form arrays), this indicates
   * which form group is currently active or being edited. This is used to manage
   * focus and data binding in multi-entry scenarios.
   * @type {number}
   * @default 0
   * @public
   */
  @Input()
  activeFormGroupIndex: number = 0;


  @Input({ required: true })
  override operation: CrudOperations = OperationKeys.CREATE;

  /**
   * @description Parent form container for this field.
   * @summary Reference to the parent FormGroup or FormArray that contains this field.
   * When this field is part of a multi-entry structure, this contains the FormArray
   * with all form groups. This enables management of multiple instances of the same
   * field structure within a single form.
   * @type {FormParent}
   * @public
   */
  @Input()
  parentForm!: FormParent;

  /**
   * @description Field mapping configuration for options.
   * @summary Defines how fields from the data model should be mapped to properties used by the component.
   * This allows for flexible data binding between the model and the component's display logic.
   * Can be either a key-value mapping object or a function that performs the mapping.
   * @type {KeyValue | FunctionLike}
   * @public
   */
  @Input()
  optionsMapper: KeyValue | FunctionLike = {};

  /**
   * @description Angular FormGroup instance for the field.
   * @summary The FormGroup that contains this field's FormControl. Used for managing
   * the field's validation state and value within the reactive forms structure.
   * @type {FormGroup | undefined}
   * @public
   */
  formGroup!: FormGroup | undefined;

  /**
   * @description Angular FormControl instance for this field.
   * @summary The FormControl that manages this field's value, validation state, and user interactions.
   * @type {FormControl}
   * @public
   */
  formControl!: FormControl;

  /**
   * @description Dot-separated path to this field in the form structure.
   * @summary Used to locate this field within nested form structures.
   * @type {string}
   * @public
   */
  path!: string;

  /**
   * @description The input type of this field.
   * @summary Determines the HTML input type or component type to render.
   * @type {PossibleInputTypes}
   * @public
   */
  type!: PossibleInputTypes ;

  /**
   * @description Whether the field is disabled.
   * @summary When true, the field cannot be edited by the user.
   * @type {boolean}
   * @public
   */
  disabled?: boolean;

  /**
   * @description Page number for multi-page forms.
   * @summary Indicates which page this field belongs to in a multi-page form structure.
   * @type {number}
   * @public
   */
  page!: number;

  // Validation properties

  /**
   * @description Date/time format string for parsing and display.
   * @type {string}
   * @public
   */
  format?: string;

  /**
   * @description Controls field visibility based on CRUD operations.
   * @summary Can be a boolean or an array of operation keys where the field should be hidden.
   * @type {boolean | CrudOperationKeys[]}
   * @public
   */
  hidden?: boolean | CrudOperationKeys[];

  /**
   * @description Maximum value or date allowed.
   * @type {number | Date}
   * @public
   */
  max?: number | Date;

  /**
   * @description Maximum length for text input.
   * @type {number}
   * @public
   */
  maxlength?: number;

  /**
   * @description Minimum value or date allowed.
   * @type {number | Date}
   * @public
   */
  min?: number | Date;

  /**
   * @description Minimum length for text input.
   * @type {number}
   * @public
   */
  minlength?: number;

  /**
   * @description Regex pattern for validation.
   * @type {string | undefined}
   * @public
   */
  pattern?: string | undefined;

  /**
   * @description Whether the field is read-only.
   * @type {boolean}
   * @public
   */
  readonly?: boolean;

  /**
   * @description Whether the field is required.
   * @type {boolean}
   * @public
   */
  required?: boolean;

  /**
   * @description Step value for numeric inputs.
   * @type {number}
   * @public
   */
  step?: number;

  /**
   * @description Field name that this field's value must equal.
   * @type {string}
   * @public
   */
  equals?: string;

  /**
   * @description Field name that this field's value must differ from.
   * @type {string}
   * @public
   */
  different?: string;

  /**
   * @description Field name that this field's value must be less than.
   * @type {string}
   * @public
   */
  lessThan?: string;

  /**
   * @description Field name that this field's value must be less than or equal to.
   * @type {string}
   * @public
   */
  lessThanOrEqual?: string;

  /**
   * @description Field name that this field's value must be greater than.
   * @type {string}
   * @public
   */
  greaterThan?: string;

  /**
   * @description Field name that this field's value must be greater than or equal to.
   * @type {string}
   * @public
   */
  greaterThanOrEqual?: string;

  /**
   * @description Current value of the field.
   * @summary Can be a string, number, date, or array of strings for multi-select fields.
   * @type {string | number | Date | string[]}
   * @public
   */
  value!: string | number | Date | string[];

  /**
   * @description Whether the field supports multiple values.
   * @summary When true, the field is rendered as part of a FormArray structure.
   * @type {boolean}
   * @public
   */
  multiple!: boolean;

  /**
   * @description Flag tracking if validation error event has been dispatched.
   * @summary Prevents duplicate validation error events from being dispatched.
   * @type {boolean}
   * @private
   */
  private validationErrorEventDispatched: boolean = false;

  /**
   * @description Reference to the parent HTML element.
   * @summary Used for DOM manipulation and event handling.
   * @type {HTMLElement}
   * @protected
   */
  protected parent?: HTMLElement;

  // eslint-disable-next-line @angular-eslint/prefer-inject
  constructor(@Inject(CPTKN) componentName: string = "ComponentCrudField") {
    super(componentName);
  }


  /**
   * @description Gets the currently active form group based on context.
   * @summary Returns the appropriate FormGroup based on whether this field supports
   * multiple values. For single-value fields, returns the main form group.
   * For multi-value fields, returns the form group at the active index from the parent FormArray.
   * If no formGroup is set, returns the parent of the formControl.
   * @return {FormGroup} The currently active FormGroup for this field
   * @public
   */
  get activeFormGroup(): FormGroup {
    if (!this.formGroup)
      return this.formControl.parent as FormGroup;

    if (this.multiple) {
      if (this.formGroup instanceof FormArray)
        return this.formGroup.at(this.activeFormGroupIndex) as FormGroup;
      return this.formGroup;
    }

    return this.formGroup as FormGroup;
  }

  /**
   * @description String formatting utility function.
   * @summary Provides access to the sf (string format) function for formatting error messages
   * and other string templates. Used primarily for localizing and parameterizing validation messages.
   * @type {function(string, ...string): string}
   * @public
   */
  sf = sf;

  /**
   * @description Callback function invoked when the field value changes.
   * @summary Function registered by Angular's forms system through registerOnChange.
   * Called automatically when the field's value is updated to notify the form of the change.
   * @type {function(): unknown}
   * @public
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onChange: () => unknown = () => {};

  /**
   * @description Callback function invoked when the field is touched.
   * @summary Function registered by Angular's forms system through registerOnTouched.
   * Called when the field is blurred or otherwise marked as touched.
   * @type {function(): unknown}
   * @public
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  onTouch: () => unknown = () => {};

  /**
   * @description Writes a value to the form field.
   * @summary Part of Angular's ControlValueAccessor interface. Sets the field's value
   * when the form programmatically updates it. This is called by Angular forms when
   * the model value changes.
   * @param {string} obj - The value to be set
   * @return {void}
   * @public
   */
  writeValue(obj: string): void {
    this.value = obj;
  }

  /**
   * @description Registers the onChange callback function.
   * @summary Part of Angular's ControlValueAccessor interface. Stores the function
   * that Angular forms provides to be called when the field value changes.
   * @param {function(): unknown} fn - The function to be called on change
   * @return {void}
   * @public
   */
  registerOnChange(fn: () => unknown): void {
    this.onChange = fn;
  }

  /**
   * @description Registers the onTouched callback function.
   * @summary Part of Angular's ControlValueAccessor interface. Stores the function
   * that Angular forms provides to be called when the field is touched/blurred.
   * @param {function(): unknown} fn - The function to be called on touch
   * @return {void}
   * @public
   */
  registerOnTouched(fn: () => unknown): void {
    this.onTouch = fn;
  }

  /**
   * @description Sets the disabled state of the field.
   * @summary Part of Angular's ControlValueAccessor interface. Called by Angular forms
   * when the disabled state of the control changes.
   * @param {boolean} isDisabled - Whether the field should be disabled
   * @return {void}
   * @public
   */
  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  /**
   * @description Performs setup after the view has been initialized.
   * @summary Retrieves and returns the parent HTML element based on the current CRUD operation.
   * For READ and DELETE operations, returns the immediate parent element. For CREATE and UPDATE
   * operations, finds the parent div element and registers it with the form service.
   * @return {HTMLElement} The parent element of the field
   * @throws {RenderingError} If unable to retrieve parent form element for CREATE/UPDATE operations
   * @throws {InternalError} If the operation is invalid
   * @public
   */
  afterViewInit(): HTMLElement {
    this.checkDarkMode();
    let parent: HTMLElement;
    if (this.component?.nativeElement)
      this.isModalChild = this.component.nativeElement.closest('ion-modal') ? true : false;
    switch (this.operation) {
      case OperationKeys.READ:
      case OperationKeys.DELETE:
        return this.component.nativeElement.parentElement;
      case OperationKeys.CREATE:
      case OperationKeys.UPDATE:
        try {
          parent = NgxFormService.getParentEl(this.component.nativeElement, 'div');
        } catch (e: unknown) {
          throw new RenderingError(`Unable to retrieve parent form element for the ${this.operation}: ${e instanceof Error ? e.message : e}`);
        }
        // NgxFormService.register(parent.id, this.formGroup, this as AngularFieldDefinition);
        return parent;
      default:
        throw new InternalError(`Invalid operation: ${this.operation}`);
    }
  }

  /**
   * @description Angular lifecycle hook for detecting input property changes.
   * @summary Overrides the parent ngOnChanges to handle changes to activeFormGroupIndex and value.
   * When activeFormGroupIndex changes in a multiple field scenario, updates the active form group
   * and form control. When value changes, updates the form control value. Delegates to parent
   * implementation for initial change detection.
   * @param {SimpleChanges} changes - Object containing the changed properties
   * @return {void}
   * @public
   */
  override async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (!this.initialized)
      await super.ngOnChanges(changes);
    if (changes['activeFormGroupIndex'] && this.multiple &&
        !changes['activeFormGroupIndex'].isFirstChange() && changes['activeFormGroupIndex'].currentValue !== this.activeFormGroupIndex) {

      this.activeFormGroupIndex = changes['activeFormGroupIndex'].currentValue;
      this.formGroup = this.activeFormGroup;
      this.formControl = this.formGroup.get(this.name) as FormControl;
    }
    if (changes['value'] && !changes['value'].isFirstChange()
    && (changes['value'].currentValue !== undefined && changes['value'].currentValue !== this.value))
      this.setValue(changes['value'].currentValue);
  }

  /**
   * @description Cleanup logic when the component is destroyed.
   * @summary Unregisters the form group from the form service to prevent memory leaks
   * and clean up form references.
   * @return {void}
   * @public
   */
  onDestroy(): void {
    if (this.formGroup)
      NgxFormService.unregister(this.formGroup);
  }

  /**
   * @description Sets the value of the form control.
   * @summary Updates the form control's value and triggers validation. This is used
   * when the value needs to be programmatically updated from outside the form control.
   * @param {unknown} value - The value to set
   * @return {void}
   * @public
   */
  setValue(value: unknown): void {
    this.formControl.setValue(value);
    this.formControl.updateValueAndValidity();
  }

  handleModalChildChanges() {
    if (this.isModalChild)
      this.changeDetectorRef.detectChanges();
  }

  /**
   * @description Retrieves validation error messages for the field.
   * @summary Checks the form control for validation errors and returns formatted error messages.
   * If errors exist, dispatches a validation error event to parent accordion components.
   * Error messages are translated and formatted with relevant field properties.
   * @param {HTMLElement} parent - The parent HTML element used to find accordion components
   * @return {string | void} Formatted error message string, or void if no errors
   * @public
   */
  getErrors(parent: HTMLElement): string | void {
    const formControl = this.formControl;
    if (formControl) {
      const accordionComponent = parent.closest('ngx-decaf-fieldset')?.querySelector('ion-accordion-group');
      if ((!formControl.pristine || formControl.touched) && !formControl.valid) {
        const errors: Record<string, string>[] = Object.keys(formControl.errors ?? {}).map(key => ({
          key: key,
          message: key,
        }));
        if (errors.length) {
          if (accordionComponent && !this.validationErrorEventDispatched) {
            const validationErrorEvent = new CustomEvent(ComponentEventNames.VALIDATION_ERROR, {
              detail: {fieldName: this.name, hasErrors: true},
              bubbles: true
            });
            accordionComponent.dispatchEvent(validationErrorEvent);
            this.validationErrorEventDispatched = true;
          }
        }
        for(const error of errors) {
          const instance = this as KeyValue;
          return `* ${ this.translateService.instant(`errors.${error?.['message']}`, {"0": `${instance[error?.['key']] ?? ""}`})}`;
        }

      }
    }
  }
}
