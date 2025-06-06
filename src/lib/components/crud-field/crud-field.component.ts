import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { AutocompleteTypes, SelectInterface } from '@ionic/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { NgxCrudFormField } from '../../engine/NgxCrudFormField';
import { Dynamic } from '../../engine/decorators';
import { FieldUpdateMode, PossibleInputTypes, RadioOption, SelectOption, StringOrBoolean } from '../../engine/types';
import { ForAngularModule } from 'src/lib/for-angular.module';
import {
  IonCheckbox,
  IonInput,
  IonItem,
  IonLabel,
  IonRadio,
  IonRadioGroup,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
} from '@ionic/angular/standalone';
import { HTML5InputTypes } from '@decaf-ts/ui-decorators';

/**
 * @description A dynamic form field component for CRUD operations.
 * @summary The CrudFieldComponent is a versatile form field component that adapts to different
 * input types and CRUD operations. It extends NgxCrudFormField to inherit form handling capabilities
 * and implements lifecycle hooks to properly initialize, render, and clean up. This component
 * supports various input types (text, number, date, select, etc.), validation rules, and styling
 * options, making it suitable for building dynamic forms for create, read, update, and delete
 * operations.
 *
 * @param {CrudOperations} operation - The CRUD operation being performed (create, read, update, delete)
 * @param {string} name - The field name, used as form control identifier
 * @param {PossibleInputTypes} type - The input type (text, number, date, select, etc.)
 * @param {string|number|Date} value - The initial value of the field
 * @param {boolean} disabled - Whether the field is disabled
 * @param {string} label - The display label for the field
 * @param {string} placeholder - Placeholder text when field is empty
 * @param {string} format - Format pattern for the field value
 * @param {boolean} hidden - Whether the field should be hidden
 * @param {number|Date} max - Maximum allowed value
 * @param {number} maxlength - Maximum allowed length
 * @param {number|Date} min - Minimum allowed value
 * @param {number} minlength - Minimum allowed length
 * @param {string} pattern - Validation pattern
 * @param {boolean} readonly - Whether the field is read-only
 * @param {boolean} required - Whether the field is required
 * @param {number} step - Step value for number inputs
 * @param {FormGroup} formGroup - The parent form group
 * @param {StringOrBoolean} translatable - Whether field labels should be translated
 *
 * @component CrudFieldComponent
 * @example
 * <ngx-decaf-crud-field
 *   operation="create"
 *   name="firstName"
 *   type="text"
 *   label="<NAME>"
 *   placeholder="<NAME>"
 *   [value]="model.firstName"
 *   [disabled]="model.readOnly">
 *
 *
 * @memberOf module:for-angular
 */
@Dynamic()
@Component({
  standalone: true,
  imports: [
    ForAngularModule,
    IonInput,
    IonItem,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonText,
    IonTextarea,

  ],
  selector: 'ngx-decaf-crud-field',
  templateUrl: './crud-field.component.html',
  styleUrl: './crud-field.component.scss',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class CrudFieldComponent extends NgxCrudFormField implements OnInit, OnDestroy, AfterViewInit {
  constructor(protected override elementRef: ElementRef) {
    super(elementRef);
  }

  /**
   * @description The CRUD operation being performed.
   * @summary Specifies which CRUD operation (Create, Read, Update, Delete) the field is being used for.
   * This affects how the field behaves and is rendered. For example, fields might be read-only in
   * 'read' mode but editable in 'create' or 'update' modes.
   *
   * @type {CrudOperations}
   * @memberOf CrudFieldComponent
   */
  @Input({ required: true })
  override operation!: CrudOperations;

  /**
   * @summary  The flat field name used as the form control identifier in immediate parent FormGroup.
   * @description
   * Specifies the name of the field, which is used as the FormControl identifier in immediate parent FormGroup.
   * This value must be unique within the immediate parent FormGroup context and should not contain dots or nesting.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input({ required: true })
  override name!: string;


  /**
   * @summary The full field path used for form control resolution.
   * @description Specifies the hierarchical path of the field, used to resolve its location within the parent FormGroup (or nested FormGroups).
   * It is used as the identifier in the rendered HTML, and may include nesting (e.g., 'address.billing.street') and
   * should match the structure of the data model
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input({ required: true })
  override path!: string;

  /**
   * @description The parent field path, if this field is nested.
   * @summary Specifies the full dot-delimited path of the parent field. This is only set when the field is nested.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override childOf: string = '';

  /**
   * @description The input type of the field.
   * @summary Defines the type of input to render, such as text, number, date, select, etc.
   * This determines which Ionic form component will be used to render the field and how
   * the data will be formatted and validated.
   *
   * @type {PossibleInputTypes}
   * @memberOf CrudFieldComponent
   */
  @Input({ required: true })
  override type!: PossibleInputTypes;

  /**
   * @description The initial value of the field.
   * @summary Sets the initial value of the form field. This can be a string, number, or Date
   * depending on the field type. For select fields, this should match one of the option values.
   *
   * @type {string | number | Date}
   * @default ''
   * @memberOf CrudFieldComponent
   */
  @Input()
  override value: string | number | Date = '';

  /**
   * @description Whether the field is disabled.
   * @summary When true, the field will be rendered in a disabled state, preventing user interaction.
   * Disabled fields are still included in the form model but cannot be edited by the user.
   *
   * @type {boolean}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override disabled?: boolean;

  /**
   * @description The display label for the field.
   * @summary The text label displayed alongside the field to identify it to the user.
   * This label can be translated if the translatable property is set to true.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input({ required: true })
  label!: string;

  /**
   * @description Placeholder text when field is empty.
   * @summary Text that appears in the input when it has no value. This provides a hint to the user
   * about what kind of data is expected. The placeholder disappears when the user starts typing.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  placeholder!: string;

  /**
   * @description Format pattern for the field value.
   * @summary Specifies a format pattern for the field value, which can be used for date formatting,
   * number formatting, or other type-specific formatting requirements.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override format?: string;

  /**
   * @description Whether the field should be hidden.
   * @summary When true, the field will not be visible in the UI but will still be part of the form model.
   * This is useful for fields that need to be included in form submission but should not be displayed to the user.
   *
   * @type {boolean}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override hidden?: boolean;

  /**
   * @description Maximum allowed value for the field.
   * @summary For number inputs, this sets the maximum allowed numeric value.
   * For date inputs, this sets the latest allowed date.
   *
   * @type {number | Date}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override max?: number | Date;

  /**
   * @description Maximum allowed length for text input.
   * @summary For text inputs, this sets the maximum number of characters allowed.
   * This is used for validation and may also be used to limit input in the UI.
   *
   * @type {number}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override maxlength?: number;

  /**
   * @description Minimum allowed value for the field.
   * @summary For number inputs, this sets the minimum allowed numeric value.
   * For date inputs, this sets the earliest allowed date.
   *
   * @type {number | Date}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override min?: number | Date;

  /**
   * @description Minimum allowed length for text input.
   * @summary For text inputs, this sets the minimum number of characters required.
   * This is used for validation to ensure the input meets a minimum length requirement.
   *
   * @type {number}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override minlength?: number;

  /**
   * @description Validation pattern for text input.
   * @summary A regular expression pattern used to validate text input.
   * The input value must match this pattern to be considered valid.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override pattern?: string;

  /**
   * @description Whether the field is read-only.
   * @summary When true, the field will be rendered in a read-only state. Unlike disabled fields,
   * read-only fields are still focusable but cannot be modified by the user.
   *
   * @type {boolean}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override readonly?: boolean;

  /**
   * @description Whether the field is required.
   * @summary When true, the field must have a value for the form to be valid.
   * Required fields are typically marked with an indicator in the UI.
   *
   * @type {boolean}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override required?: boolean;

  /**
   * @description Step value for number inputs.
   * @summary For number inputs, this sets the increment/decrement step when using
   * the up/down arrows or when using a range slider.
   *
   * @type {number}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override step?: number;

  /**
   * @description Field name for equals comparison.
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override equals?: string;

  /**
   * @description Field name for different comparison.
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override different?: string;

  /**
   * @description Field name for less than comparison.
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override lessThan?: string;

  /**
   * @description Field name for less than or equal comparison.
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override lessThanOrEqual?: string;

  /**
   * @description Field name for greater than comparison.
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override greaterThan?: string;

  /**
   * @description Field name for greater than or equal comparison.
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override greaterThanOrEqual?: string;

  /**
   * @description Number of columns for textarea inputs.
   * @summary For textarea inputs, this sets the visible width of the text area in average character widths.
   * This is used alongside rows to define the dimensions of the textarea.
   *
   * @type {number}
   * @memberOf CrudFieldComponent
   */
  @Input()
  cols?: number;

  /**
   * @description Number of rows for textarea inputs.
   * @summary For textarea inputs, this sets the visible height of the text area in lines of text.
   * This is used alongside cols to define the dimensions of the textarea.
   *
   * @type {number}
   * @memberOf CrudFieldComponent
   */
  @Input()
  rows?: number;

  /**
   * @description Alignment of the field content.
   * @summary Controls the horizontal alignment of the field content.
   * This affects how the content is positioned within the field container.
   *
   * @type {'start' | 'center'}
   * @memberOf CrudFieldComponent
   */
  @Input()
  alignment?: 'start' | 'center';

  /**
   * @description Initial checked state for checkbox or toggle inputs.
   * @summary For checkbox or toggle inputs, this sets the initial checked state.
   * When true, the checkbox or toggle will be initially checked.
   *
   * @type {boolean}
   * @memberOf CrudFieldComponent
   */
  @Input()
  checked?: boolean;

  /**
   * @description Justification of items within the field.
   * @summary Controls how items are justified within the field container.
   * This is particularly useful for fields with multiple elements, such as radio groups.
   *
   * @type {'start' | 'end' | 'space-between'}
   * @memberOf CrudFieldComponent
   */
  @Input()
  justify?: 'start' | 'end' | 'space-between';

  /**
   * @description Text for the cancel button in select inputs.
   * @summary For select inputs with a cancel button, this sets the text displayed on the cancel button.
   * This is typically used in select dialogs to provide a way for users to dismiss the selection without making a change.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
   */
  @Input()
  cancelText?: string;

  /**
   * @description Interface style for select inputs.
   * @summary Specifies the interface style for select inputs, such as 'alert', 'action-sheet', or 'popover'.
   * This determines how the select options are presented to the user.
   *
   * @type {SelectInterface}
   * @memberOf CrudFieldComponent
   */
  @Input()
  interface?: SelectInterface;

  /**
   * @description Options for select or radio inputs.
   * @summary Provides the list of options for select or radio inputs. Each option can have a value and a label.
   * This is used to populate the dropdown or radio group with choices.
   *
   * @type {SelectOption[] | RadioOption[]}
   * @memberOf CrudFieldComponent
   */
  @Input()
  options!: SelectOption[] | RadioOption[];

  /**
   * @description Mode of the field.
   * @summary Specifies the visual mode of the field, such as 'ios' or 'md'.
   * This affects the styling and appearance of the field to match the platform style.
   *
   * @type {'ios' | 'md'}
   * @memberOf CrudFieldComponent
   */
  @Input()
  mode?: 'ios' | 'md';

  /**
   * @description Spellcheck attribute for text inputs.
   * @summary Enables or disables spellchecking for text inputs.
   * When true, the browser will check the spelling of the input text.
   *
   * @type {boolean}
   * @default false
   * @memberOf CrudFieldComponent
   */
  @Input()
  spellcheck: boolean = false;

  /**
   * @description Input mode for text inputs.
   * @summary Hints at the type of data that might be entered by the user while editing the element.
   * This can affect the virtual keyboard layout on mobile devices.
   *
   * @type {'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'}
   * @default 'none'
   * @memberOf CrudFieldComponent
   */
  @Input()
  inputmode:
    | 'none'
    | 'text'
    | 'tel'
    | 'url'
    | 'email'
    | 'numeric'
    | 'decimal'
    | 'search' = 'none';

  /**
   * @description Autocomplete behavior for the field.
   * @summary Specifies whether and how the browser should automatically complete the input.
   * This can improve user experience by suggesting previously entered values.
   *
   * @type {AutocompleteTypes}
   * @default 'off'
   * @memberOf CrudFieldComponent
   */
  @Input()
  autocomplete: AutocompleteTypes = 'off';

  /**
   * @description Fill style for the field.
   * @summary Determines the fill style of the field, such as 'outline' or 'solid'.
   * This affects the border and background of the field.
   *
   * @type {'outline' | 'solid'}
   * @default 'outline'
   * @memberOf CrudFieldComponent
   */
  @Input()
  fill: 'outline' | 'solid' = 'outline';

  /**
   * @description Placement of the label relative to the field.
   * @summary Specifies where the label should be placed relative to the field.
   * Options include 'start', 'end', 'floating', 'stacked', and 'fixed'.
   *
   * @type {'start' | 'end' | 'floating' | 'stacked' | 'fixed'}
   * @default 'floating'
   * @memberOf CrudFieldComponent
   */
  @Input()
  labelPlacement: 'start' | 'end' | 'floating' | 'stacked' | 'fixed' =
    'floating';

  /**
   * @description Update mode for the field.
   * @summary Determines when the field value should be updated in the form model.
   * Options include 'change', 'blur', and 'submit'.
   *
   * @type {FieldUpdateMode}
   * @default 'change'
   * @memberOf CrudFieldComponent
   */
  @Input()
  updateOn: FieldUpdateMode = 'change';

  /**
   * @description Reference to the field component.
   * @summary Provides a reference to the field component element, allowing direct access to its properties and methods.
   *
   * @type {ElementRef}
   * @memberOf CrudFieldComponent
   */
  @ViewChild('component', { read: ElementRef })
  override component!: ElementRef;

  /**
   * @description Parent form group.
   * @summary References the parent form group to which this field belongs.
   * This is necessary for integrating the field with Angular's reactive forms.
   *
   * @type {FormGroup}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override formGroup!: FormGroup | undefined;

  @Input()
  override formControl!: FormControl;

  /**
   * @description Translatability of field labels.
   * @summary Indicates whether the field labels should be translated based on the current language settings.
   * This is useful for applications supporting multiple languages.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf CrudFieldComponent
   */
  @Input()
  translatable: StringOrBoolean = true;

  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   */
  @Input()
  uid!: string | number | undefined;

  ngOnInit(): void {
    // super.onInit(this.updateOn);
    if ([OperationKeys.READ, OperationKeys.DELETE].includes(this.operation)) {
      this.formGroup = undefined;
    } else {
      if (this.type === HTML5InputTypes.RADIO && !this.value)
        this.formGroup?.get(this.name)?.setValue(this.options[0].value);
    }

  }

  ngAfterViewInit() {
    if ([OperationKeys.READ, OperationKeys.DELETE].includes(this.operation))
      super.afterViewInit();
  }

  ngOnDestroy(): void {
    if ([OperationKeys.READ, OperationKeys.DELETE].includes(this.operation))
      this.onDestroy();
  }
}
