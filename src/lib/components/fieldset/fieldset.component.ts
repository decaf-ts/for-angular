
import { AfterViewInit, ChangeDetectorRef, Component, inject, Input, ViewChild, Renderer2, OnInit } from '@angular/core';
import { Dynamic, EventConstants, HandlerLike, HTMLFormTarget, KeyValue } from '../../engine';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { IonAccordion, IonAccordionGroup, IonButton, IonItem, IonLabel, IonList, ItemReorderEventDetail, IonReorderGroup, IonReorder, IonIcon, IonText } from '@ionic/angular/standalone';
import { cleanSpaces, generateRandomValue, itemMapper, windowEventEmitter } from '../../helpers';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgxBaseComponent } from '../../engine';
import { alertCircleOutline, createOutline } from 'ionicons/icons';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { IFieldSetItem, IFieldSetValidationEvent } from '../../engine/interfaces';
import { addIcons } from 'ionicons';




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
  ],
  host: {'[attr.id]': 'overriode '},
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
  childOf: string = 'Child';


  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   * @memberOf FieldsetComponent
   */
  @Input()
  page!: number;



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
  override uid: string = generateRandomValue(12);


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
  formGroup!:  FormArray;

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
   * @description Event handler functions for custom fieldset actions.
   * @summary A record of event handler functions keyed by event names that can be triggered
   * within the fieldset. These handlers provide extensibility for custom business logic
   * and can be invoked for various fieldset operations and user interactions.
   *
   * @type {HandlerLike}
   * @memberOf FieldsetComponent
   */
  @Input()
  handlers!: HandlerLike;

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
   * @description Component constructor that initializes the fieldset with icons and component name.
   * @summary Calls the parent NgxBaseComponent constructor with the component name and
   * required Ionic icons (alertCircleOutline for validation errors and createOutline for add actions).
   * Sets up the foundational component structure and icon registry.
   *
   * @memberOf FieldsetComponent
   */
  constructor() {
    super('FieldsetComponent');
    addIcons({ alertCircleOutline, createOutline });
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
  ngOnInit(): void {
    if(this.model)
      this._repository = this.repository;
    this.buttonLabel = this.translateService.instant(this.locale + '.add');
    this.buttonCancelLabel = this.translateService.instant(this.locale + '.cancel');
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
        this.handleAccordionToggle();
      }
    }
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
  handleRemoveComponent(event: Event): void {
    event.stopImmediatePropagation();
    this.component.nativeElement.classList.add('dcf-animation', 'dcf-animation-slide-top-medium', 'dcf-animation-reverse', 'dcf-animation-fast');
    setTimeout(() => {
      // Use Renderer2 to safely remove the element
      const parent = this.renderer.parentNode(this.component.nativeElement);
      if (parent)
        this.renderer.removeChild(parent, this.component.nativeElement);
    }, 150);
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
      event.stopImmediatePropagation();
      const {formGroup, value, isValid} = event.detail;
      this.formGroup = formGroup as FormArray;
      if(!this.mapper)
        this.mapper = this.getMapper(value as KeyValue);
      if(isValid ){
          this.isUniqueError = undefined;
          this.buttonLabel = this.translateService.instant(this.locale + '.add');
          this.setValue();
      } else {
       this.isUniqueError = (value as KeyValue)?.[this.pk] || undefined;
      }
    } else {
      windowEventEmitter(EventConstants.FIELDSET_ADD_GROUP, {
        component: this.component.nativeElement,
        index: this.updatingItem ? this.updatingItem.index : this.value?.length,
        parent: this.childOf,
        operation: !this.updatingItem ? OperationKeys.CREATE : OperationKeys.UPDATE
      });
    }
  }


  /**
   * @description Handles item update operations with form state management.
   * @summary Locates an item in the form array for editing and prepares the component
   * for update mode. Updates the button label to reflect the edit state and stores
   * the item being updated. Triggers a window event to notify parent components.
   *
   * @param {string | number} value - The identifier value of the item to update
   * @param {number} index - The array index position of the item
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleUpdateItem(value: string | number, index: number): void {
    const item = this.formGroup.controls.find(control => `${control.get(this.pk)?.value}`.toLowerCase() === cleanSpaces(`${value}`, true)) as FormControl;
    if(item) {
      this.buttonLabel = this.translateService.instant(this.locale + '.update');
      this.updatingItem = Object.assign({}, item.value || {}, {index});
      windowEventEmitter(EventConstants.FIELDSET_UPDATE_GROUP, {
        parent: this.childOf,
        component: this.component.nativeElement,
        index: index
      });
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
    windowEventEmitter(EventConstants.FIELDSET_UPDATE_GROUP, {
      parent: this.childOf,
      component: this.component.nativeElement,
      index: this.value?.length
    });
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
  handleRemoveItem(value: string | undefined, event?: CustomEvent): void {
    if(event && event instanceof CustomEvent) {
      event.stopImmediatePropagation();
      return this.setValue();
    }
    const formArray = this.formGroup as FormArray;
    const arrayLength = formArray.length;
    for (let index = arrayLength - 1; index >= 0; index--) {
      const group = formArray.at(index) as FormGroup;
      if (cleanSpaces(group.get(this.pk)?.value) === cleanSpaces(value as string)) {
        windowEventEmitter(EventConstants.FIELDSET_REMOVE_GROUP, {
          parent: this.childOf,
          component: this.component.nativeElement,
          index,
          formGroup: group
        });
      }
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

    const items = [...this.items]; // sua estrutura visual
    const formArray = this.formGroup as FormArray; // FormArray reativo

    if (fromIndex !== toIndex) {
      // Reordenar os dados visuais
      const itemToMove = items.splice(fromIndex, 1)[0];
      items.splice(toIndex, 0, itemToMove);
      items.forEach((item, index) => item['index'] = index + 1);

      // Reordenar os controles do FormArray
      const controlToMove = formArray.at(fromIndex);
      formArray.removeAt(fromIndex);
      formArray.insert(toIndex, controlToMove);
    }
    // Finaliza a operação de reorder do Ionic
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
    if(event)
      event.stopImmediatePropagation();
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
    event.stopImmediatePropagation();
    const {hasErrors} = event.detail;
    this.isOpen = this.hasValidationErrors = hasErrors;
    if(hasErrors)
      this.accordionComponent.value = 'open';
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
    this.value = (this.formGroup as FormArray).controls.map(({value}) => value);
    this.items = this.value
    .filter(v => v[this.pk] !== undefined)
    .map((v, index) => {
      return {
        ...itemMapper(Object.assign({}, v), this.mapper),
        index: index + 1
      } as IFieldSetItem;
    });
    const inputContainers = this.component.nativeElement.querySelectorAll('.dcf-input-item');
    inputContainers.forEach((container: HTMLElement) => {
      const input = container.querySelector('input, ion-input, ion-textarea, textarea') as HTMLInputElement | null;
      if(input)
        input.value = '';
    })
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
