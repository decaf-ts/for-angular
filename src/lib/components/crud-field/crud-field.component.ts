/**
 * @module module:lib/components/crud-field/crud-field.component
 * @description CRUD field component module.
 * @summary Exposes `CrudFieldComponent`, a dynamic form field used in CRUD forms supporting
 * many input types, validation and integration with `NgxFormFieldDirective` utilities.
 *
 * @link {@link CrudFieldComponent}
 */

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  AutocompleteTypes,
  CheckboxCustomEvent,
  LoadingOptions,
  SelectInterface,
} from '@ionic/core';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import {
  IonBadge,
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
import { CrudOperationKeys, HTML5InputTypes } from '@decaf-ts/ui-decorators';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronUpOutline } from 'ionicons/icons';
import {
  CrudFieldOption,
  FieldUpdateMode,
  KeyValue,
  FunctionLike,
  PossibleInputTypes,
  FormParent,
  SelectOption,
} from '../../engine/types';
import { dataMapper, generateRandomValue } from '../../utils';
import { NgxFormFieldDirective } from '../../engine/NgxFormFieldDirective';
import { Dynamic } from '../../engine/decorators';
import { getLocaleContextByKey } from '../../i18n/Loader';
import { getNgxSelectOptionsModal } from '../modal/modal.component';
import { ActionRoles, SelectFieldInterfaces } from '../../engine/constants';
import { IconComponent } from '../icon/icon.component';
import { getModelAndRepository } from '../../engine/helpers';

/**
 * @description A dynamic form field component for CRUD operations.
 * @summary The CrudFieldComponent is a versatile form field component that adapts to different
 * input types and CRUD operations. It extends NgxFormFieldDirective to inherit form handling capabilities
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
    ReactiveFormsModule,
    TranslatePipe,
    IonInput,
    IonItem,
    IonCheckbox,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonBadge,
    IonText,
    IonTextarea,
    IconComponent,
  ],
  selector: 'ngx-decaf-crud-field',
  templateUrl: './crud-field.component.html',
  styleUrl: './crud-field.component.scss',
  // schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: { '[attr.id]': 'uid', '[attr.class]': 'className' },
})
export class CrudFieldComponent
  extends NgxFormFieldDirective
  implements OnInit, OnDestroy, AfterViewInit
{
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

  @Input()
  override className: string = 'dcf-width-1-1';

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
  /**
   * @description The parent field path for nested field structures.
   * @summary Specifies the full dot-delimited path of the parent field when this field
   * is part of a nested structure. This is used for hierarchical form organization
   * and proper form control resolution in complex form structures.
   *
   * @type {string}
   * @default ''
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

  @Input()
  subType!: PossibleInputTypes;

  @Input()
  validationMessage?: string | string[];

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
  override value: string | number | Date | string[] = '';

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
  override label!: string;

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
  override hidden: boolean | CrudOperationKeys[] = false;

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
  override readonly: boolean = false;

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
   * @description Field name for equality validation comparison.
   * @summary Specifies another field name that this field's value must be equal to for validation.
   * This is commonly used for password confirmation fields or other scenarios where
   * two fields must contain the same value.
   *
   * @type {string | undefined}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override equals?: string;

  /**
   * @description Field name for inequality validation comparison.
   * @summary Specifies another field name that this field's value must be different from for validation.
   * This is used to ensure that two fields do not contain the same value, which might be
   * required for certain business rules or security constraints.
   *
   * @type {string | undefined}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override different?: string;

  /**
   * @description Field name for less-than validation comparison.
   * @summary Specifies another field name that this field's value must be less than for validation.
   * This is commonly used for date ranges, numeric ranges, or other scenarios where
   * one field must have a smaller value than another.
   *
   * @type {string | undefined}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override lessThan?: string;

  /**
   * @description Field name for less-than-or-equal validation comparison.
   * @summary Specifies another field name that this field's value must be less than or equal to
   * for validation. This provides inclusive upper bound validation for numeric or date comparisons.
   *
   * @type {string | undefined}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override lessThanOrEqual?: string;

  /**
   * @description Field name for greater-than validation comparison.
   * @summary Specifies another field name that this field's value must be greater than for validation.
   * This is commonly used for date ranges, numeric ranges, or other scenarios where
   * one field must have a larger value than another.
   *
   * @type {string | undefined}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override greaterThan?: string;

  /**
   * @description Field name for greater-than-or-equal validation comparison.
   * @summary Specifies another field name that this field's value must be greater than or equal to
   * for validation. This provides inclusive lower bound validation for numeric or date comparisons.
   *
   * @type {string | undefined}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override greaterThanOrEqual?: string;

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
  override checked: boolean = false;

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
  interface: SelectInterface = SelectFieldInterfaces.POPOVER;

  /**
   * @description Options for select or radio inputs.
   * @summary Provides the list of options for select or radio inputs. Each option can have a value and a label.
   * This is used to populate the dropdown or radio group with choices.
   *
   * @type {CrudFieldOption[]}
   * @memberOf CrudFieldComponent
   */
  @Input()
  options!: FunctionLike | CrudFieldOption[] | KeyValue[];

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
   * @description Spellcheck attribute for text inputs.
   * @summary Enables or disables spellchecking for text inputs.
   * When true, the browser will check the spelling of the input text.
   *
   * @type {boolean}
   * @default false
   * @memberOf CrudFieldComponent
   */
  @Input()
  startEmpty: boolean = true;

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
  inputmode: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search' = 'none';

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
  labelPlacement: 'start' | 'end' | 'floating' | 'stacked' | 'fixed' = 'floating';

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
  override formGroup: FormGroup | undefined;

  /**
   * @description Angular FormControl instance for this field.
   * @summary The specific FormControl instance that manages this field's state, validation,
   * and value. This provides direct access to Angular's reactive forms functionality
   * for this individual field within the broader form structure.
   *
   * @type {FormControl}
   * @memberOf CrudFieldComponent
   */
  @Input()
  override formControl!: FormControl;

  /**
   * @description Indicates if this field supports multiple values.
   * @summary When true, this field can handle multiple values, typically used in
   * multi-select scenarios or when the field is part of a form array structure
   * that allows multiple entries of the same field type.
   *
   * @type {boolean}
   * @default false
   * @memberOf CrudFieldComponent
   */
  @Input()
  override multiple: boolean = false;

  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   */
  @Input()
  override uid: string = generateRandomValue(12);

  @Input()
  override page!: number;

  constructor() {
    super();
    addIcons({ chevronDownOutline, chevronUpOutline });
  }

  /**
   * @description Component initialization lifecycle method.
   * @summary Initializes the field component based on the operation type and field configuration.
   * For READ and DELETE operations, removes the form group to make fields read-only.
   * For other operations, sets up icons, configures multi-value support if needed,
   * and sets default values for radio buttons if no value is provided.
   *
   * @returns {void}
   * @memberOf CrudFieldComponent
   */
  async ngOnInit(): Promise<void> {
    if (Array.isArray(this.hidden) && !(this.hidden as string[]).includes(this.operation))
      this.hidden = false;

    if (this.readonly && typeof this.readonly === Function.name.toLocaleLowerCase())
      if (this.hidden && (this.hidden as OperationKeys[]).includes(this.operation))
        this.hidden = true;

    if ([OperationKeys.READ, OperationKeys.DELETE].includes(this.operation)) {
      this.formGroup = undefined;
    } else {
      this.options = await this.getOptions();
      if (
        (!this.parentForm && this.formGroup instanceof FormGroup) ||
        this.formGroup instanceof FormArray
      )
        this.parentForm = (this.formGroup.root || this.formControl.root) as FormParent;
      if (this.multiple) {
        this.formGroup = this.activeFormGroup as FormGroup;
        if (!this.parentForm) this.parentForm = this.formGroup.parent as FormArray;
        this.formControl = (this.formGroup as FormGroup).get(this.name) as FormControl;
      }
      if (!this.value && (this.options as []).length)
        this.setValue((this.options as CrudFieldOption[])[0].value);

      if (this.type === HTML5InputTypes.CHECKBOX) {
        if (this.labelPlacement === 'floating') this.labelPlacement = 'end';
        this.setValue(this.value);
      }
    }
    await super.initialize();
  }

  /**
   * @description Component after view initialization lifecycle method.
   * @summary Calls the parent afterViewInit method for READ and DELETE operations.
   * This ensures proper initialization of read-only fields that don't require
   * form functionality but still need view setup.
   *
   * @returns {Promise<void>}
   * @memberOf CrudFieldComponent
   */
  async ngAfterViewInit(): Promise<void> {
    if (this.type === HTML5InputTypes.RADIO && !this.value)
      this.setValue((this.options as CrudFieldOption[])[0].value); // TODO: migrate to RenderingEngine
  }

  /**
   * Returns a list of options for select or radio inputs, with their `text` property
   * localized if it does not already include the word 'options'. The localization key
   * is generated from the component's label, replacing 'label' with 'options'.
   *
   * @returns {CrudFieldOption[]} The array of parsed and localized options.
   * @memberOf CrudFieldComponent
   */
  async getOptions(): Promise<CrudFieldOption[]> {
    if (!this.options) return [];

    if (this.options instanceof Function) {
      if (this.options.name === 'options') this.options = (await this.options()) as FunctionLike;
      const fnName = (this.options as FunctionLike)?.name;
      if (fnName) {
        if (fnName === 'function') {
          this.options = (await (this.options as FunctionLike)()) as KeyValue[];
        } else {
          const repo = getModelAndRepository((this.options as KeyValue)?.['name'], this);
          if (repo) {
            const { repository } = repo;
            if (typeof this.optionsMapper === 'object' && !Object.keys(this.optionsMapper).length)
              this.optionsMapper = { value: this.pk, text: this.pk };
            this.options = await repository.select().execute();
          }
        }
      }
    }

    if (this.optionsMapper) {
      if (this.optionsMapper instanceof Function || typeof this.optionsMapper === 'function') {
        const mapper = this.optionsMapper as (option: KeyValue) => CrudFieldOption;
        this.options = (this.options as (CrudFieldOption | KeyValue)[]).map((option: KeyValue) => {
          return mapper(option);
        });
      } else if (Object.keys(this.optionsMapper).length > 0) {
        this.options = dataMapper(
          this.options as KeyValue[],
          this.optionsMapper as Record<string, string>,
        );
      }
    }

    const translateOptions = (this.options as SelectOption[]).map(async (option) => {
      const text = !this.translatable
        ? option.text
        : await this.translate(
            !option.text?.includes('options')
              ? getLocaleContextByKey(
                  `${this.label.toLowerCase().replace('label', 'options')}`,
                  option.text,
                )
              : option.text,
          );
      return {
        value: option.value,
        text,
        selected: option?.selected ?? false,
        hidden: option?.hidden ?? false,
        disabled: option?.disabled ?? false,
      };
    });
    this.options = await Promise.all(translateOptions);
    if (this.type !== HTML5InputTypes.SELECT) return this.options as CrudFieldOption[];
    if (this.options.length > 10 && this.interface === SelectFieldInterfaces.POPOVER)
      this.interface = SelectFieldInterfaces.MODAL;
    if (this.options.length === 0 && !this.required) this.value = '';
    const options = (
      !this.required || (this.options?.length > 1 && this.startEmpty)
        ? [{ value: '', text: '', selected: true, disabled: this.required }, ...this.options]
        : this.options
    ) as CrudFieldOption[];
    return (this.options = [...options]);
  }

  /**
   * Handles the opening of select options based on the specified interface type.
   * If the `selectInterface` is 'modal', it prevents the default event behavior,
   * stops propagation, and opens a modal to display the select options.
   * Once the modal is dismissed, it sets the selected value if the action role
   * is confirmed and the selected value differs from the current value.
   *
   * @param {Event} event - The event triggered by the user interaction.
   * @param {SelectInterface} selectInterface - The interface type for displaying select options.
   * Currently supports 'modal'.
   * @returns {Promise<void>} A promise that resolves when the operation is complete.
   */
  async openSelectOptions(event: Event, selectInterface: SelectInterface): Promise<void> {
    if (selectInterface === SelectFieldInterfaces.MODAL) {
      this.updateOn = 'blur';
      event.preventDefault();
      event.stopImmediatePropagation();
      const loading = await this.loadingController.create({} as LoadingOptions);
      await loading.present();
      const modal = await getNgxSelectOptionsModal(this.label, this.options as SelectOption[]);
      // this.changeDetectorRef.detectChanges();
      loading.remove();
      const { data, role } = await modal.onWillDismiss();
      if (role === ActionRoles.confirm && data !== this.value) {
        this.setValue(data);
        this.component.nativeElement.ionChange.emit({ value: data });
      }
    }
  }

  /**
   * @description Component cleanup lifecycle method.
   * @summary Performs cleanup operations for READ and DELETE operations by calling
   * the parent onDestroy method. This ensures proper resource cleanup for
   * read-only field components.
   *
   * @returns {void}
   * @memberOf CrudFieldComponent
   */
  override async ngOnDestroy(): Promise<void> {
    await super.ngOnDestroy();
    if ([OperationKeys.READ, OperationKeys.DELETE].includes(this.operation)) this.onDestroy();
  }

  toggleOptionSelection(val: string, event: CheckboxCustomEvent) {
    const { checked } = event.detail;
    let value = Array.isArray(this.formControl.value) ? this.formControl.value : [];
    if (checked) {
      if (!value.includes(val)) value = [...value, val];
    } else {
      value = value.filter((v) => v !== val);
    }
    this.setValue(value);
    this.formControl.updateValueAndValidity();
  }

  isOptionChecked(value: string): boolean {
    if (!this.formControl.value || !Array.isArray(this.formControl.value)) return false;
    return this.formControl.value.includes(value);
  }

  // /**
  //  * @description Handles fieldset group update events from parent fieldsets.
  //  * @summary Processes events triggered when an existing group needs to be updated.
  //  * Updates the active form group index and refreshes the form group and form control
  //  * references to point to the group being edited.
  //  *
  //  * @param {CustomEvent} event - The fieldset update group event containing update details
  //  * @returns {void}
  //  * @memberOf CrudFieldComponent
  //  */
  // @HostListener('window:fieldsetUpdateGroupEvent', ['$event'])
  // handleFieldsetUpdateGroupEvent(event: CustomEvent): void {
  //   const {formGroup, index} = event.detail;
  //   this.activeFormGroupIndex = index;
  //   this.formGroup = formGroup;
  //   this.formControl = (this.formGroup as FormGroup).get(this.name) as FormControl;
  //   this.value = this.formControl.value;
  // }
}
