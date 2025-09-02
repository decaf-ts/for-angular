
import { AfterViewInit, ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, ViewChild, Renderer2, OnInit } from '@angular/core';
import { Dynamic, EventConstants, HTMLFormTarget, KeyValue } from '../../engine';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModule } from '../../for-angular.module';
import { CollapsableDirective } from '../../directives/collapsable.directive';
import { IonAccordion, IonAccordionGroup, IonButton, IonItem, IonLabel, IonList, ItemReorderEventDetail, IonReorderGroup, IonReorder } from '@ionic/angular/standalone';
import { itemMapper, windowEventEmitter } from '../../helpers';
import { FormGroup } from '@angular/forms';
import { NgxFormService } from '../../engine/NgxFormService';
import { NgxBaseComponent } from '../../engine';
import { alertCircleOutline, createOutline } from 'ionicons/icons';
import { TranslateService } from '@ngx-translate/core';


/**
 * @description Interface for fieldset item representation in the UI.
 * @summary Defines the structure for items displayed in the reorderable list within the fieldset.
 * Each item represents a value added to the fieldset with display properties for the UI.
 */
interface IFieldSetItem {
  /** @description Sequential index number for ordering items in the list */
  index: number;
  /** @description Primary display text for the item */
  title: string;
  /** @description Optional secondary text providing additional item details */
  description?: string;
}

/**
 * @description Interface for fieldset validation event data.
 * @summary Defines the structure of validation events emitted when form validation occurs.
 * Used for communication between form components and the fieldset container.
 */
interface IFieldSetValidationEvent {
  /** @description The FormGroup containing the validated form controls */
  formGroup: FormGroup;
  /** @description The current form value being validated */
  value: unknown;
  /** @description Whether the form validation passed or failed */
  isValid: boolean;
}

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
 * @memberOf ForAngularModule
 */
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-fieldset',
  templateUrl: './fieldset.component.html',
  styleUrls: ['./fieldset.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ForAngularModule, IonAccordionGroup, IonAccordion, IonList, IonItem, IonLabel, IonReorder, IonButton, IonReorderGroup, CollapsableDirective],
})
export class FieldsetComponent extends NgxBaseComponent implements OnInit, AfterViewInit {



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
  name: string = 'Child';


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
  childOf: string = 'Child';

  /**
   * @description The current CRUD operation context.
   * @summary Determines the component's initial behavior and state based on the current operation.
   * This input is crucial for auto-state management: READ and DELETE operations automatically
   * open the fieldset to show content, while CREATE and UPDATE operations keep it closed
   * initially. This provides an intuitive user experience aligned with operation semantics.
   *
   * @type {OperationKeys}
   * @default OperationKeys.READ
   * @memberOf FieldsetComponent
   */
  /**
   * @description The CRUD operation type for the current fieldset context.
   * @summary Determines the component's initial behavior and state based on the current operation.
   * This input is crucial for auto-state management: READ and DELETE operations automatically
   * open the fieldset to show content, while CREATE and UPDATE operations keep it closed
   * initially. This provides an intuitive user experience aligned with operation semantics.
   *
   * @type {OperationKeys}
   * @default OperationKeys.READ
   * @memberOf FieldsetComponent
   */
  @Input()
  operation: OperationKeys = OperationKeys.READ;

  /**
   * @description Reactive form group associated with this fieldset.
   * @summary The FormGroup instance that contains all form controls within this fieldset.
   * Used for form validation, value management, and integration with Angular's reactive forms.
   *
   * @type {FormGroup}
   * @memberOf FieldsetComponent
   */
  @Input()
  formGroup!: FormGroup;

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
   * @description Form target attribute for nested form submissions.
   * @summary Specifies where to display the response after submitting forms contained within
   * the fieldset. This attribute mirrors the HTML form target behavior, allowing control over
   * whether form submissions open in the same window, new window, or specific frame. Useful
   * for complex form workflows and multi-step processes.
   *
   * @type {HTMLFormTarget}
   * @default '_self'
   * @memberOf FieldsetComponent
   */
  @Input()
  target: HTMLFormTarget = '_self';


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
  multiple: boolean = false;

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
  value: KeyValue[] = [];

  /**
   * @description Array of formatted items for UI display.
   * @summary Contains the processed items ready for display in the component template.
   * These items are mapped from the raw values using the mapper configuration.
   *
   * @type {IFieldSetItem[]}
   * @default []
   * @memberOf FieldsetComponent
   */
  items: IFieldSetItem[] = [];

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
   * @description Reference to CRUD operation constants for template usage.
   * @summary Exposes the OperationKeys enum to the component template, enabling conditional
   * rendering and behavior based on operation types. This protected readonly property ensures
   * that template logic can access operation constants while maintaining encapsulation and
   * preventing accidental modification of the enum values.
   *
   * @type {CrudOperations}
   * @default OperationKeys.CREATE
   * @memberOf FieldsetComponent
   */
  protected readonly OperationKeys: CrudOperations = OperationKeys.CREATE;

  /**
   * @description Angular change detection service.
   * @summary Injected service that provides manual control over change detection cycles.
   * This is essential for ensuring that programmatic DOM changes (like setting accordion
   * attributes) are properly reflected in the component's state and trigger appropriate
   * view updates when modifications occur outside the normal Angular change detection flow.
   *
   * @private
   * @type {ChangeDetectorRef}
   * @memberOf FieldsetComponent
   */
  private changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  /**
   * @description Angular Renderer2 service for safe DOM manipulation.
   * @summary Injected service that provides a safe, platform-agnostic way to manipulate DOM elements.
   * This service ensures proper handling of DOM operations across different platforms and environments,
   * including server-side rendering and web workers.
   *
   * @private
   * @type {Renderer2}
   * @memberOf FieldsetComponent
   */
  private renderer: Renderer2 = inject(Renderer2);

  /**
   * @description Translation service for internationalization.
   * @summary Injected service that provides translation capabilities for UI text.
   * Used to translate button labels and validation messages based on the current locale.
   *
   * @private
   * @type {TranslateService}
   * @memberOf FieldsetComponent
   */
  private translateService: TranslateService = inject(TranslateService);

  /**
   * @description Localized label text for action buttons.
   * @summary Dynamic button label that changes based on the current operation mode.
   * Shows "Add" for create operations and "Update" for edit operations.
   *
   * @type {string}
   * @memberOf FieldsetComponent
   */
  buttonLabel!: string;


  constructor() {
    super('FieldsetComponent', {alertCircleOutline, createOutline});
  }

  ngOnInit(): void {
    if(this.model)
      this._repository = this.repository;
    this.buttonLabel = this.translateService.instant(this.locale + '.add');
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
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  ngAfterViewInit(): void {
    console.log(this.accordionComponent)
    if (this.operation === OperationKeys.READ || this.operation === OperationKeys.DELETE) {
      this.isOpen = true;
      // hidden remove button
      const accordionElement = this.component?.nativeElement.querySelector('ion-accordion-group');
      if(this.accordionComponent)
        this.renderer.setAttribute(accordionElement, 'value', 'open');
    } else {
      const inputs = this.component?.nativeElement.querySelectorAll('[required]');
      this.isRequired = inputs.length > 0;
      if(this.isRequired) {
        this.accordionComponent.value = 'open';
        this.handleToggle();
      }
    }
    this.changeDetectorRef.detectChanges();
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
  handleReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const fromIndex = event.detail.from;
    const toIndex = event.detail.to;
    const items = [...this.items];
    if (fromIndex !== toIndex) {
      const itemToMove = items.splice(fromIndex, 1)[0];
      items.splice(toIndex, 0, itemToMove);
      items.forEach((item, index) => item['index'] = index + 1);
    }
    // Complete the reorder operation
    event.detail.complete();
    this.updateValueOrder(items);
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
  handleToggle(event?: CustomEvent): void {
    if(event)
      event.stopPropagation();
    if(!this.hasValidationErrors) {
      this.accordionComponent.value = this.isOpen ? undefined : 'open';
      this.isOpen = !!this.accordionComponent.value;
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
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleValidationError(event: CustomEvent): void {
    event.stopPropagation();
    event.stopImmediatePropagation();
    const {hasErrors} = event.detail;
    this.isOpen = this.hasValidationErrors = hasErrors;
    if(hasErrors)
      this.accordionComponent.value = 'open';
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
  handleRemove(event: Event): void {
    event.stopPropagation();
    this.component.nativeElement.classList.add('dcf-animation', 'dcf-animation-slide-top-medium', 'dcf-animation-reverse', 'dcf-animation-fast');
    setTimeout(() => {
      // Use Renderer2 to safely remove the element
      const parent = this.renderer.parentNode(this.component.nativeElement);
      if (parent)
        this.renderer.removeChild(parent, this.component.nativeElement);
    }, 150);
  }

  /**
   * @description Processes and stores a new or updated value in the fieldset.
   * @summary Handles both create and update operations for fieldset items. Parses and cleans
   * the input value, determines the operation type based on the updating state, and either
   * adds a new item or updates an existing one. Maintains data integrity and UI consistency.
   *
   * @param {KeyValue} value - The raw value object to be processed and stored
   * @returns {void}
   * @private
   * @memberOf FieldsetComponent
   */
  private setValue(value: KeyValue) {
    const action = !this.updatingItem ? OperationKeys.CREATE : OperationKeys.UPDATE;
    const parsedValue = {} as KeyValue;
    for(const [k, v] of Object.entries(value)) {
      const vv = this.cleanSpaces(`${v}` as string);
      if (typeof vv === 'number' || !isNaN(Number(vv))) {
        parsedValue[k] = Number(vv);
      } else {
        parsedValue[k] = vv;
      }
    }
    if(action === OperationKeys.CREATE) {
      this.value.push(parsedValue);
      value = Object.assign({}, itemMapper(parsedValue, this.mapper), {index: this.value.length}) as IFieldSetItem;
      this.items.push(value as IFieldSetItem);
    } else {
      const item = this.items.find(item => item.index === this.updatingItem?.index);
      if(item) {
        Object.assign(item, itemMapper(parsedValue, this.mapper));
        const _value = this.value.find(v => this.cleanSpaces(v[this.pk]) === this.cleanSpaces(this.updatingItem?.title || '')) as KeyValue;
        if(_value)
          Object.assign(_value, parsedValue);
      }
    }

    this.updatingItem = undefined;
  }


  /**
   * @description Synchronizes the value array order with the provided items array.
   * @summary Updates both the component's items array and the underlying value array to match
   * the provided order of items. This ensures data consistency after reordering operations
   * by reconstructing the value array in the same sequence as the reordered items array.
   * Essential for maintaining synchronization between UI display order and data storage order.
   *
   * @param {IFieldSetItem[]} items - The reordered array of items to synchronize with
   * @returns {void}
   * @private
   * @memberOf FieldsetComponent
   *
   * @example
   * ```typescript
   * // After reordering items in handleReorder
   * const reorderedItems = [...this.items];
   * // ... perform reordering logic
   * this.updateValueOrder(reorderedItems);
   * ```
   */
  private updateValueOrder(items: IFieldSetItem[]): void {
    this.items = [...items];
    const values = [...this.value];
    this.value = [];
    this.items.forEach(item => {
      values.forEach(v => {
        if(v[this.pk] === item['title'])
          this.value.push(v);
      });
    })
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
  async handleCreateItem(event?: CustomEvent<IFieldSetValidationEvent>): Promise<void> {

    if(event && event instanceof CustomEvent) {
      event.stopPropagation();
      const {formGroup, value, isValid} = event.detail;
      if(!this.formGroup)
        this.formGroup = formGroup;
      if(!this.mapper)
        this.mapper = this.getMapper(value as KeyValue);
      if(isValid ){
          const isUnique = this.isUnique((value as KeyValue)?.[this.pk]);
          if(isUnique) {
            this.setValue(value as KeyValue);
            NgxFormService.reset(formGroup);
            this.buttonLabel = this.translateService.instant(this.locale + '.add');
          }
      }
    } else {
      windowEventEmitter(EventConstants.FIELDSET_ADD_GROUP, {group: this.childOf, component: this.component.nativeElement});
    }
  }

  /**
   * @description Removes an item from the fieldset by its identifier.
   * @summary Filters out the specified item from both the value and items arrays
   * based on the primary key comparison. Updates the display items after removal.
   *
   * @param {string} value - The identifier value of the item to remove
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleRemoveItem(value: string): void {
    this.value = this.value.filter(item => `${item[this.pk]}`.toLowerCase() !== this.cleanSpaces(value));
    this.items = this.value.map(item => itemMapper(item as KeyValue, this.mapper) as IFieldSetItem);
  }

  /**
   * @description Prepares an item for update by populating the form with its values.
   * @summary Sets the component to update mode for the specified item. Finds the corresponding
   * value in the data array, updates the button label to "Update", and populates the form
   * controls with the item's current values for editing.
   *
   * @param {IFieldSetItem} item - The item to be updated
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleUpdateItem(item: IFieldSetItem): void {
    const value = this.value.find(v => `${v[this.pk]}`.toLowerCase() === this.cleanSpaces(item.title)) as KeyValue;
    if(value) {
      this.buttonLabel = this.translateService.instant(this.locale + '.update');
      this.updatingItem = Object.assign({}, item);
      Object.keys(value).forEach(key => this.formGroup.controls[key].setValue(value[key]));
    }
  }

  /**
   * @description Normalizes string values by removing extra whitespace and converting to lowercase.
   * @summary Cleans input strings by trimming whitespace, collapsing multiple spaces into single spaces,
   * and converting to lowercase for consistent comparison operations. Used throughout the component
   * for reliable string matching and validation.
   *
   * @param {string} value - The string value to be cleaned and normalized
   * @returns {string} The cleaned and normalized string
   * @private
   * @memberOf FieldsetComponent
   */
  private cleanSpaces(value: string): string {
    return `${value}`.trim().replace(/\s+/g, ' ').toLowerCase();
  }

  /**
   * @description Validates uniqueness of values within the fieldset.
   * @summary Checks if a given value already exists in the fieldset based on the current operation mode.
   * For CREATE operations, it checks against all existing values. For UPDATE operations, it excludes
   * the currently updating item from the uniqueness check. Sets error state if duplicate is found.
   *
   * @param {string} value - The value to check for uniqueness
   * @returns {boolean} True if the value is unique, false if it's a duplicate
   * @private
   * @memberOf FieldsetComponent
   */
  private isUnique(value: string): boolean {
    const action = !this.updatingItem ? OperationKeys.CREATE : OperationKeys.UPDATE;
    if(action === OperationKeys.CREATE) {
      const item = this.value.find(item => this.cleanSpaces(item[this.pk]) === this.cleanSpaces(value));
      this.isUniqueError = item ? item?.[this.pk] : undefined;
      return !item;
    }

    const item = this.items.find(item => this.cleanSpaces(item.title) === this.cleanSpaces(value) && item.index !== this.updatingItem?.index);
    this.isUniqueError = item ? item?.title : undefined;
    return !item;
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
  private getMapper(value: KeyValue) {
    if(!this.pk)
      this.pk = Object.keys(value)[0];
    if(!Object.keys(this.mapper).length)
      this.mapper['title'] = this.pk;
    this.mapper['index'] = "index";
    for(const key in value) {
      if(Object.keys(this.mapper).length >= 2 || Object.keys(this.mapper).length === Object.keys(value).length)
        break;
      if(!this.mapper['title']) {
        this.mapper['title'] = key;
      } else {
        this.mapper['description'] = key;
      }
    }
    return this.mapper;
  }
}
