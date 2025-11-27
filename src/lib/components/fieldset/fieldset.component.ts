/**
 * @module module:lib/components/fieldset/fieldset.component
 * @description Fieldset component module.
 * @summary Provides `FieldsetComponent` — a dynamic, collapsible fieldset container
 * for grouping form controls with validation, reorder and add/remove capabilities.
 * Ideal for complex forms that require nested groupings and dynamic items.
 *
 * @link {@link FieldsetComponent}
 */

import {
  AfterViewInit,
  Component,
  Input,
  ViewChild,
  OnInit,
} from '@angular/core';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  alertCircleOutline,
  createOutline,
  addOutline,
  trashOutline,
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import {
  IonAccordion,
  IonAccordionGroup,
  IonButton,
  IonItem,
  IonLabel,
  IonList,
  ItemReorderEventDetail,
  IonReorderGroup,
  IonReorder,
  IonIcon,
  IonText,
  IonSkeletonText,
  IonLoading,
  IonSpinner,
} from '@ionic/angular/standalone';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { ReservedModels } from '@decaf-ts/decorator-validation';
import { NgxFormDirective } from '../../engine/NgxFormDirective';
import { NgxFormService } from '../../services/NgxFormService';
import { LayoutComponent } from '../layout/layout.component';
import { FormParent, KeyValue } from '../../engine/types';
import {
  IFieldSetItem,
  IFieldSetValidationEvent,
} from '../../engine/interfaces';
import { Dynamic } from '../../engine/decorators';
import { itemMapper } from '../../utils/helpers';
import { UIElementMetadata, UIModelMetadata } from '@decaf-ts/ui-decorators';
import { timer } from 'rxjs';
import { read } from 'fs';

/**
 * @description Dynamic fieldset component with collapsible accordion functionality.
 * @summary This component provides a sophisticated fieldset container that automatically
 * adapts its behavior based on CRUD operations. It integrates seamlessly with Ionic's
 * accordion components to create expandable/collapsible sections for organizing form
 * content and related information. The component intelligently determines its initial
 * state based on the operation type, opening automatically for READ and DELETE operations
 * while remaining closed for CREATE and UPDATE operations.
 *
 * @example
 * ```html
 * <!-- Basic usage with automatic state management -->
 * <ngx-decaf-fieldset
 *   name="Personal Information"
 *   [operation]="OperationKeys.READ"
 *   target="_self">
 *   <ion-input label="Name" placeholder="Enter name"></ion-input>
 *   <ion-input label="Email" type="email" placeholder="Enter email"></ion-input>
 * </ngx-decaf-fieldset>
 *
 * <!-- Advanced usage with custom operation -->
 * <ngx-decaf-fieldset
 *   name="Contact Details"
 *   [operation]="currentOperation"
 *   target="_blank">
 *   <!-- Complex form fields -->
 * </ngx-decaf-fieldset>
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant U as User
 *   participant F as FieldsetComponent
 *   participant I as Ionic Accordion
 *   participant D as DOM
 *
 *   F->>F: ngAfterViewInit()
 *   alt operation is READ or DELETE
 *     F->>F: Set isOpen = true
 *     F->>D: Query accordion element
 *     F->>I: Set value attribute to 'open'
 *     F->>F: Trigger change detection
 *   end
 *   U->>I: Click accordion header
 *   I->>F: handleChange(event)
 *   F->>F: Update isOpen state
 *   F->>I: Reflect new state
 *
 * @memberOf FieldsetComponent
 */
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-fieldset',
  templateUrl: './fieldset.component.html',
  styleUrls: ['./fieldset.component.scss'],
  schemas: [],
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    IonAccordionGroup,
    IonAccordion,
    IonList,
    IonItem,
    IonLabel,
    IonText,
    IonReorder,
    IonReorderGroup,
    IonButton,
    IonIcon,
    LayoutComponent,
    IonSpinner
  ],
})
export class FieldsetComponent
  extends NgxFormDirective
  implements OnInit, AfterViewInit
{
  /**
   * @description Reference to the ion-accordion-group component for programmatic control.
   * @summary ViewChild reference that provides direct access to the Ionic accordion group component.
   * This enables programmatic control over the accordion's expand/collapse state, allowing
   * the component to open/close the accordion based on validation errors, CRUD operations,
   * or other business logic requirements.
   *
   * @type {IonAccordionGroup}
   * @memberOf FieldsetComponent
   */
  @ViewChild('accordionComponent', { static: false })
  accordionComponent!: IonAccordionGroup;

  /**
   * @description The display name or title of the fieldset section.
   * @summary Sets the legend or header text that appears in the accordion header. This text
   * provides a clear label for the collapsible section, helping users understand what content
   * is contained within. The name is displayed prominently and serves as the clickable area
   * for expanding/collapsing the fieldset.
   *
   * @type {string}
   * @default 'Child'
   * @memberOf FieldsetComponent
   */
  @Input()
  formControl!: FormControl;

  /**
   * @description The parent component identifier for hierarchical fieldset relationships.
   * @summary Specifies the parent component name that this fieldset belongs to in a hierarchical
   * form structure. This property is used for event bubbling and establishing parent-child
   * relationships between fieldsets in complex forms with nested structures.
   *
   * @type {string}
   * @default 'Child'
   * @memberOf FieldsetComponent
   */
  @Input()
  collapsable: boolean = true;

  /**
   * @description Custom type definitions for specialized fieldset behavior.
   * @summary Defines custom data types or validation rules that should be applied to this fieldset.
   * Can be a single type string or array of types that determine how the fieldset handles
   * data validation, formatting, and display behavior for specialized use cases.
   *
   * @type {string | string[]}
   * @memberOf FieldsetComponent
   */
  @Input()
  customTypes!: string | string[];

  /**
   * @description Primary title text for the fieldset content.
   * @summary Display title used for fieldset identification and content organization.
   * Provides semantic meaning to the grouped form fields.
   *
   * @type {string}
   * @memberOf FieldsetComponent
   */
  @Input()
  title!: string;

  /**
   * @description Secondary descriptive text for the fieldset.
   * @summary Additional information that provides context or instructions
   * related to the fieldset content and purpose.
   *
   * @type {string}
   * @memberOf FieldsetComponent
   */
  @Input()
  description!: string;

  /**
   * @description Enables multiple item management within the fieldset.
   * @summary Boolean flag that determines if the fieldset supports adding multiple values.
   * When true, displays a reorderable list of items with add/remove functionality.
   *
   * @type {boolean}
   * @default false
   * @memberOf FieldsetComponent
   */
  @Input()
  multiple: boolean = true;

  /**
   * @description Array of raw values stored in the fieldset.
   * @summary Contains the actual data values that have been added to the fieldset.
   * This is the source of truth for the fieldset's data state.
   *
   * @type {KeyValue[]}
   * @default []
   * @memberOf FieldsetComponent
   */
  @Input()
  override value: KeyValue[] = [];

  /**
   * @description Controls whether borders are displayed around the fieldset.
   * @summary Boolean flag that determines if the fieldset should be visually outlined with borders.
   * When true, borders are shown to visually separate the fieldset from surrounding content.
   *
   * @type {boolean}
   * @default true
   * @memberOf FieldsetComponent
   */
  @Input()
  override borders: boolean = true;

  /**
   * @description Array of formatted items for UI display.
   * @summary Contains the processed items ready for display in the component template.
   * These items are mapped from the raw values using the mapper configuration.
   *
   * @type {IFieldSetItem[]}
   * @default []
   * @memberOf FieldsetComponent
   */
  items: IFieldSetItem[] | UIElementMetadata[][] = [];

  /**
   * @description Currently selected item for update operations.
   * @summary Holds the item being edited when in update mode. Used to track
   * which item is being modified and apply changes to the correct item.
   *
   * @type {IFieldSetItem | undefined}
   * @memberOf FieldsetComponent
   */
  updatingItem!: IFieldSetItem | undefined;

  /**
   * @description Current state of the accordion (expanded or collapsed).
   * @summary Boolean flag that tracks whether the fieldset accordion is currently open or closed.
   * This property is automatically managed based on user interactions and initial operation state.
   * It serves as the single source of truth for the component's visibility state and is used
   * to coordinate between user actions and programmatic state changes. The value is automatically
   * set based on CRUD operations during initialization and updated through user interactions.
   *
   * @type {boolean}
   * @default false
   * @memberOf FieldsetComponent
   */
  isOpen: boolean = false;

  /**
   * @description Indicates whether the fieldset contains required form fields.
   * @summary Boolean flag that signals the presence of mandatory input fields within the fieldset.
   * This property is automatically set by the CollapsableDirective when required fields are detected,
   * and can be used to apply special styling, validation logic, or UI indicators to highlight
   * fieldsets that contain mandatory information. It helps with form validation feedback and
   * user experience by making required sections more prominent.
   *
   * @type {boolean}
   * @default false
   * @memberOf FieldsetComponent
   */
  isRequired: boolean = false;

  /**
   * @description Indicates whether the fieldset contains validation errors.
   * @summary Boolean flag that tracks if any form fields within the fieldset have validation errors.
   * This property is used to control accordion behavior when errors are present, preventing
   * users from collapsing the accordion when they need to see and address validation issues.
   * It's automatically updated when validation error events are received from child form fields.
   *
   * @type {boolean}
   * @default false
   * @memberOf FieldsetComponent
   */
  hasValidationErrors: boolean = false;

  /**
   * @description Validation error message for duplicate values.
   * @summary Stores the error message when a user attempts to add a duplicate value
   * to the fieldset. Used to display uniqueness validation feedback.
   *
   * @type {string | undefined}
   * @memberOf FieldsetComponent
   */
  isUniqueError: string | undefined = undefined;

  /**
   * @description Localized label text for action buttons.
   * @summary Dynamic button label that changes based on the current operation mode.
   * Shows "Add" for create operations and "Update" for edit operations.
   *
   * @type {string}
   * @memberOf FieldsetComponent
   */
  buttonLabel!: string;

  /**
   * @description Localized label text for action buttons.
   * @summary Dynamic button label that changes based on the current operation mode.
   * Shows "Cancel" for update operations
   *
   * @type {string}
   * @memberOf FieldsetComponent
   */
  buttonCancelLabel!: string;

  /**
   * @description Maximum allowed items in the fieldset.
   * @summary Numeric limit that controls how many items can be added when `multiple` is true.
   * When set to Infinity there is no limit.
   *
   * @type {number}
   * @default Infinity
   * @memberOf FieldsetComponent
   */
  @Input()
  max: number | undefined = undefined;

  /**
   * @description Maximum allowed items in the fieldset.
   * @summary Numeric limit that controls how many items can be added when `multiple` is true.
   * When set to Infinity there is no limit.
   *
   * @type {number}
   * @default Infinity
   * @memberOf FieldsetComponent
   */
  @Input()
  required: boolean = false;

  /**
   * @description Determines if the fieldset items can be reordered.
   * @summary Boolean flag that enables or disables the drag-and-drop reordering functionality
   * for the items within the fieldset. When set to true, users can rearrange the order
   * of items using drag-and-drop gestures. This is particularly useful for managing
   * lists where the order of items is significant.
   *
   * @type {boolean}
   * @default true
   * @memberOf FieldsetComponent
   */
  @Input()
  ordenable: boolean = true;

  /**
   * @description Determines if the fieldset items can be edited by the user.
   * @summary Boolean flag that enables or disables the editing functionality
   * for the items within the fieldset. When set to true, users can modify the items.
   *
   * @type {boolean}
   * @default true
   * @memberOf FieldsetComponent
   * @default true
   */
  @Input()
  editable: boolean = true;

  /**
   * @description Component constructor that initializes the fieldset with icons and component name.
   * @summary Calls the parent NgxFormDirective constructor with the component name and
   * required Ionic icons (alertCircleOutline for validation errors and createOutline for add actions).
   * Sets up the foundational component structure and icon registry.
   *
   * @memberOf FieldsetComponent
   */
  constructor() {
    super('FieldsetComponent');
    addIcons({ alertCircleOutline, addOutline, trashOutline, createOutline });
  }

  /**
   * @description Component initialization lifecycle method.
   * @summary Initializes the component by setting up repository relationships if a model exists,
   * and configures the initial button label for the add action based on the current locale.
   * This method ensures proper setup of translation services and component state.
   *
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  override async ngOnInit(): Promise<void> {
    await super.ngOnInit(this.model);
    if (this.max && this.max === 1) this.multiple = false;
    this.buttonLabel = this.translateService.instant(this.locale + '.add');
    this.buttonCancelLabel = this.translateService.instant(
      this.locale + '.cancel'
    );

    if (!this.multiple)
      this.ordenable = false;

    if ([OperationKeys.CREATE, OperationKeys.UPDATE].includes(this.operation)) {
      if (!this.formGroup) {
        if (this.parentForm instanceof FormGroup) {
          // iterate on childOf path to get correct formGroup
          const parts = (this.childOf as string).split('.');
          let formGroup = this.parentForm as FormParent;
          for (const part of parts)
            formGroup = (formGroup as FormGroup).controls[part] as FormParent;
          this.formGroup = formGroup;
          if (this.formGroup instanceof FormGroup)
            this.formGroup = this.formGroup.parent as FormArray;
        }
        if (!this.formGroup && this.parentForm instanceof FormArray)
          this.formGroup = this.parentForm;
        if (
          !this.formGroup &&
          (this.children[0] as KeyValue)?.['formGroup'] instanceof FormGroup
        )
          this.formGroup = (this.children[0] as KeyValue)?.['formGroup']
            .parent as FormArray;
        if (this.formGroup && !(this.formGroup instanceof FormArray))
          this.formGroup = (this.formGroup as FormParent)?.parent as FormArray;
      }
    }
    if (this.multiple) {
      this.formGroup?.setErrors(null);
      this.formGroup?.disable();
      if (this.required) {
        this.collapsable = false;
        this.activePage = this.getActivePage();
      }
    } else {
      this.activePage = this.getActivePage();
    }
    this.initialized = true;
  }

  /**
   * @description Initializes the component state after view and child components are rendered.
   * @summary This lifecycle hook implements intelligent auto-state management based on the current
   * CRUD operation. For READ and DELETE operations, the fieldset automatically opens to provide
   * immediate access to information, while CREATE and UPDATE operations keep it closed to maintain
   * a clean initial interface. The method directly manipulates the DOM to ensure proper accordion
   * synchronization and triggers change detection to reflect the programmatic state changes.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant F as FieldsetComponent
   *   participant D as DOM
   *   participant C as ChangeDetector
   *
   *   A->>F: ngAfterViewInit()
   *   alt operation is READ or DELETE
   *     F->>F: Set isOpen = true
   *     F->>D: Query ion-accordion-group element
   *     alt accordion element exists
   *       F->>D: Set value attribute to 'open'
   *     end
   *   end
   *   F->>C: detectChanges()
   *   C->>F: Update view with new state
   *
   * @returns {Promise<void>}
   * @memberOf FieldsetComponent
   */
  override async ngAfterViewInit(): Promise<void> {
    await super.ngAfterViewInit();
    // if (!this.collapsable)
    //   this.isOpen = true;
    // if (this.operation === OperationKeys.READ || this.operation === OperationKeys.DELETE) {
    //   this.isOpen = true;
    //   // hidden remove button
    //   const accordionElement = this.component?.nativeElement.querySelector('ion-accordion-group');
    //   if (accordionElement)
    //     this.renderer.setAttribute(accordionElement, 'value', 'open');
    // } else {
    //   const inputs = this.component?.nativeElement.querySelectorAll('.dcf-field-required');
    //   this.isRequired = inputs?.length > 0;
    //   if (this.isRequired) {
    //     this.accordionComponent.value = 'open';
    //     this.handleAccordionToggle();
    //   }
    // }
    // if (!(this.formGroup instanceof FormArray))
    //   this.formGroup = (this.formGroup as FormGroup)
    // this.changeDetectorRef.detectChanges();
  }

  override async refresh(): Promise<void> {
    this.refreshing = true;
    this.changeDetectorRef.detectChanges();
    if([OperationKeys.READ, OperationKeys.DELETE].includes(this.operation)) {
      // if(!this.multiple) {
      //   this.required = this.collapsable = false;
      // }
      this.items = [... this.value.map((v) => {
        return this.children.map((child) => {
          const {props, tag} = child as KeyValue;
          return {
            tag,
            props: {
              ... props,
              value: v[props.name]  || ""
            }
          };
        })
      })] as UIElementMetadata[][];
    }
    if([OperationKeys.CREATE, OperationKeys.UPDATE].includes(this.operation)) {
      const value = [... this.value];
      this.value = [];
      value.map(v => {
        const formGroup = this.activeFormGroup as FormGroup;
        if(value.length > (formGroup.parent as FormArray).length)
          NgxFormService.addGroupToParent(formGroup.parent as FormArray);

        if(!Object.keys(this.mapper).length)
          this.mapper = this.getMapper(v as KeyValue);
        Object.entries(v).forEach(([key, value]) => {
          if(key === this.pk)
            formGroup.addControl(key, new FormControl({value: value, disabled: false}));
          const control = formGroup.get(key);
          if (control instanceof FormControl) {
            control.setValue(value);
            control.updateValueAndValidity();
            formGroup.updateValueAndValidity()
          }
        })
        this.activeFormGroupIndex = (formGroup.parent as FormArray).length - 1;
      })
      this.setValue();
      this.changeDetectorRef.detectChanges();
    }
    this.refreshing = false;
    this.changeDetectorRef.detectChanges();
  }

  /**
   * @description Handles removal of the fieldset with slide animation.
   * @summary Initiates the removal process for the fieldset with a smooth slide-up animation.
   * The method applies CSS classes for the slide animation and then safely removes the
   * element from the DOM using Renderer2. This provides a polished user experience
   * when removing fieldset instances from dynamic forms.
   *
   * @param {Event} event - DOM event from the remove button click
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleClear(event?: Event): void {
    if (event) event.stopImmediatePropagation();
    this.formGroup?.disable();
    this.items = [];
    this.value = undefined as unknown as KeyValue[];
    this.activePage = undefined;
    this.activeFormGroupIndex = 0;
    this.accordionComponent.value = '';
    this.changeDetectorRef.detectChanges();
  }

  /**
   * @description Handles creating new items or triggering group addition events.
   * @summary Processes form validation events for item creation or emits events to trigger
   * the addition of new fieldset groups. When called with validation event data, it validates
   * uniqueness and adds the item to the fieldset. When called without parameters, it triggers
   * a group addition event for parent components to handle.
   *
   * @param {CustomEvent<IFieldSetValidationEvent>} [event] - Optional validation event containing form data
   * @returns {Promise<void>}
   * @memberOf FieldsetComponent
   *
   * @example
   * ```typescript
   * // Called from form validation
   * handleCreateItem(validationEvent);
   *
   * // Called to trigger group addition
   * handleCreateItem();
   * ```
   */
  async handleCreateItem(
    event?: CustomEvent<IFieldSetValidationEvent>
  ): Promise<void | boolean> {
    if (event && event instanceof CustomEvent) event.stopImmediatePropagation();
    if (!this.activePage) {
      this.activePage = this.getActivePage();
      return;
    }
    const formGroup = this.activeFormGroup as FormGroup;
    const value = formGroup.value;
    const hasSomeValue = this.hasValue(value);

    if (hasSomeValue) {
      const action = this.updatingItem
        ? OperationKeys.UPDATE
        : OperationKeys.CREATE;
      const isValid = NgxFormService.validateFields(formGroup);

      // must pass correct pk here
      const isUnique = NgxFormService.isUniqueOnGroup(
        formGroup,
        action,
        action === OperationKeys.UPDATE ? this.updatingItem?.index : undefined
      );
      if (isValid) {
        this.mapper = this.getMapper(value as KeyValue);
        if (isUnique) {
          this.isUniqueError = this.updatingItem = undefined;
          this.setValue();
          NgxFormService.addGroupToParent(formGroup.parent as FormArray);
          this.activeFormGroupIndex =
            (formGroup.parent as FormArray).length - 1;
          this.activePage = this.getActivePage();
        } else {
          this.isUniqueError =
            typeof value === ReservedModels.OBJECT.name.toLowerCase()
              ? (value as KeyValue)?.[this.pk] || undefined
              : value;
        }
      }
    }
  }

  hasValue(value: KeyValue = {}): boolean {
    return Object.keys(value).some(
      (key) =>
        value[key] !== null && value[key] !== undefined && value[key] !== ''
    );
  }

  handleUpdateItem(index: number): void {
    const formGroup = this.getFormArrayIndex(index);
    if (formGroup) {
      this.updatingItem = Object.assign({}, formGroup.value || {}, { index });
      this.activeFormGroupIndex = index;
      this.activePage = this.getActivePage();
    }
  }

  /**
   * @description Cancels the update mode and resets the UI state.
   * @summary Exits the update mode by resetting the button label and clearing the updating item,
   * restoring the component to its default state for adding new items. Notifies parent components
   * that the update operation has been cancelled.
   *
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleCancelUpdateItem(): void {
    this.buttonLabel = this.translateService.instant(this.locale + '.add');
    this.updatingItem = undefined;
    this.activeFormGroupIndex = (this.formGroup as FormArray)?.length - 1;
    this.getFormArrayIndex(this.activeFormGroupIndex);
  }

  /**
   * @description Handles item removal operations with form array management.
   * @summary Processes item removal by either handling validation events or removing specific
   * items from the form array. When called with a validation event, it triggers value updates.
   * When called with an identifier, it locates and removes the matching item from the form array.
   *
   * @param {string | undefined} value - The identifier of the item to remove
   * @param {CustomEvent} [event] - Optional validation event for form updates
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleRemoveItem(index: number): void {
    const formArray = this.formGroup as FormArray;
    if (formArray.length === 1) {
      const currentGroup = formArray.at(0) as FormGroup;
      Object.keys(currentGroup?.controls).forEach((controlName) => {
        currentGroup.get(controlName)?.setValue(null);
      });
    } else {
      formArray.removeAt(index);
    }
    this.setValue();
    if (this.items.length > 0) {
      if (this.activeFormGroupIndex > 0)
        this.activeFormGroupIndex = this.activeFormGroupIndex - 1;
    } else {
      this.handleClear();
    }
  }

  /**
   * @description Handles reordering of items within the fieldset list.
   * @summary Processes drag-and-drop reorder events from the ion-reorder-group component.
   * Updates both the display items array and the underlying value array to maintain
   * consistency between UI state and data state. Preserves item indices after reordering.
   *
   * @param {CustomEvent<ItemReorderEventDetail>} event - Ionic reorder event containing source and target indices
   * @returns {void}
   * @memberOf FieldsetComponent
   *
   * @example
   * ```html
   * <ion-reorder-group (ionItemReorder)="handleReorder($event)">
   *   <!-- Reorderable items -->
   * </ion-reorder-group>
   * ```
   */
  handleReorderItems(event: CustomEvent<ItemReorderEventDetail>): void {
    const fromIndex = event.detail.from;
    const toIndex = event.detail.to;

    const items = [...this.items]; // visual data
    const formArray = this.formGroup as FormArray; // FormArray

    if (fromIndex !== toIndex) {
      this.items = [];
      // reorder visual data
      const itemToMove = items.splice(fromIndex, 1)[0];
      items.splice(toIndex, 0, itemToMove);
      items.forEach((item, index) => ((item as IFieldSetItem)['index'] = index + 1));

      // reorder FormArray controls
      const controlToMove = formArray.at(fromIndex);
      formArray.removeAt(fromIndex);
      formArray.insert(toIndex, controlToMove);
    }
    this.items = [...items as IFieldSetItem[]];
    event.detail.complete();
  }

  /**
   * @description Handles accordion state change events from user interactions.
   * @summary Processes CustomEvent objects triggered when users expand or collapse the accordion.
   * This method extracts the new state from the event details and updates the component's
   * internal state accordingly. It specifically listens for ION-ACCORDION-GROUP events to
   * ensure proper event source validation and prevent handling of unrelated events.
   *
   * @param {CustomEvent} event - The event object containing accordion state change details
   * @returns {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant I as Ion-Accordion
   *   participant F as FieldsetComponent
   *
   *   U->>I: Click accordion header
   *   I->>F: handleChange(CustomEvent)
   *   F->>F: Extract target and detail from event
   *   F->>F: Validate target is ION-ACCORDION-GROUP
   *   alt valid target
   *     F->>F: Update isOpen = !!value
   *   end
   *   F->>I: Reflect updated state
   *
   * @memberOf FieldsetComponent
   */

  /**
   * @description Handles accordion toggle functionality with validation error consideration.
   * @summary Manages the expand/collapse state of the accordion while respecting validation error states.
   * When validation errors are present, the accordion cannot be collapsed to ensure users can see
   * and address the errors. When no errors exist, users can freely toggle the accordion state.
   * This method also stops event propagation to prevent unwanted side effects.
   *
   * @param {CustomEvent} [event] - Optional event object from user interaction
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleAccordionToggle(event?: CustomEvent): void {
    if (event) event.stopImmediatePropagation();

    if (!this.collapsable || this.isRequired) {
      this.isOpen = true;
    } else {
      if (!this.hasValidationErrors) {
        this.accordionComponent.value = this.isOpen ? undefined : 'open';
        this.isOpen = !!this.accordionComponent.value;
      }
    }
  }

  /**
   * @description Handles validation error events from child form fields.
   * @summary Processes validation error events dispatched by form fields within the fieldset.
   * When errors are detected, the accordion is forced open and prevented from collapsing
   * to ensure users can see the validation messages. This method updates the component's
   * error state and accordion visibility accordingly.
   *
   * @param {CustomEvent} event - Custom event containing validation error details
   * @returns {UIModelMetadata[] | undefined}
   * @memberOf FieldsetComponent
   */
  // handleValidationError(event: CustomEvent): void {
  //   event.stopImmediatePropagation();
  //   const {hasErrors} = event.detail;
  //   this.isOpen = this.hasValidationErrors = hasErrors;
  //   if (hasErrors)
  //     this.accordionComponent.value = 'open';
  // }

  protected override getActivePage(): UIModelMetadata[] | undefined {
    this.activePage = undefined;
    this.isOpen = true;
    this.accordionComponent.value = 'open';
    this.changeDetectorRef.detectChanges();
    this.timerSubscription = timer(10).subscribe(() => {
      this.children = this.children.map((child) => {
        if (!child.props) child.props = {};
        child.props = Object.assign(child.props, {
          activeFormGroup: this.activeFormGroupIndex,
          multiple: this.multiple,
        });
        return child;
      });
    });
    if (this.multiple && [OperationKeys.CREATE, OperationKeys.UPDATE].includes(this.operation))
      this.getFormArrayIndex(this.activeFormGroupIndex);
    return this.children as UIModelMetadata[];
  }

  /**
   * @description Processes and stores a new or updated value in the fieldset.
   * @summary Handles both create and update operations for fieldset items. Parses and cleans
   * the input value, determines the operation type based on the updating state, and either
   * adds a new item or updates an existing one. Maintains data integrity and UI consistency.
   *
   * @returns {void}
   * @private
   * @memberOf FieldsetComponent
   */
  private setValue(): void {
    const formGroup = this.formGroup as FormArray;
    this.value = formGroup.controls.map(
      ({ value }) => value
    );
    this.items = this.value
      .filter((v) => `${v[this.pk] || ''}`.trim().length)
      .map((v, index) => {
        return {
          ...itemMapper(Object.assign({}, v), this.mapper),
          index: index + 1,
        } as IFieldSetItem;
      });

    this.updatingItem = undefined;
  }

  /**
   * @description Automatically configures the field mapping based on the value structure.
   * @summary Analyzes the provided value object to automatically determine the primary key
   * and create appropriate field mappings for display purposes. Sets up the mapper object
   * with title, description, and index fields based on the available data structure.
   *
   * @param {KeyValue} value - Sample value object used to determine field mappings
   * @returns {KeyValue} The configured mapper object
   * @private
   * @memberOf FieldsetComponent
   */
  private getMapper(value: KeyValue): KeyValue {
    if (!this.pk) this.pk = Object.keys(value)[0];
    if (!Object.keys(this.mapper).length)
      (this.mapper as KeyValue)['title'] = this.pk;
    (this.mapper as KeyValue)['index'] = 'index';
    for (const key in value) {
      if (
        Object.keys(this.mapper).length >= 2 ||
        Object.keys(this.mapper).length === Object.keys(value).length
      )
        break;
      if (!(this.mapper as KeyValue)['title']) {
        (this.mapper as KeyValue)['title'] = key;
      } else {
        (this.mapper as KeyValue)['description'] = key;
      }
    }
    return this.mapper;
  }
}
