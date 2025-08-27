
import { AfterViewInit, ChangeDetectorRef, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, Input, ViewChild, Renderer2 } from '@angular/core';
import { Dynamic, HTMLFormTarget } from '../../engine';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModule } from '../../for-angular.module';
import { CollapsableDirective } from '../../directives/collapsable.directive';
import { IonAccordion, IonAccordionGroup, IonItem } from '@ionic/angular/standalone';
import { Model } from '@decaf-ts/decorator-validation';
import { getLocaleFromClassName } from '../../helpers';

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
  imports: [ForAngularModule, IonAccordionGroup, IonAccordion, IonItem, CollapsableDirective],
})
export class FieldsetComponent implements AfterViewInit {

  /**
   * @description Reference to the component's native DOM element.
   * @summary ViewChild reference that provides direct access to the component's root DOM element.
   * This is essential for manipulating the Ionic accordion group after view initialization,
   * particularly for setting the initial open state programmatically. The reference is used
   * to query and modify accordion attributes that control the component's expanded state.
   *
   * @type {ElementRef}
   * @memberOf FieldsetComponent
   */
  @ViewChild('component', { static: false, read: ElementRef })
  component!: ElementRef;


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
   * @description Locale identifier for internationalization.
   * @summary String that represents the current locale setting for the component,
   * derived from the component's class name. This is used for localization of text
   * content and regional formatting within the fieldset component.
   *
   * @type {string}
   * @memberOf FieldsetComponent
   */
  locale: string = getLocaleFromClassName('FieldsetComponent');

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
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   * @memberOf NgxBaseComponent
   */
  @Input()
  model!:  Model | undefined;

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
  @Input()
  operation: OperationKeys = OperationKeys.READ;

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
      const accordionElement = this.component?.nativeElement.querySelector('ion-accordion-group');
      if(accordionElement)
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
   * @description Handles adding another instance of the fieldset.
   * @summary Event handler for adding another fieldset instance in dynamic form scenarios.
   * This method is typically used in forms where users can add multiple instances of
   * the same fieldset (e.g., adding multiple addresses, phone numbers, etc.).
   * Currently logs to console but can be extended with custom logic.
   *
   * @param {Event} event - DOM event from the add button click
   * @returns {void}
   * @memberOf FieldsetComponent
   */
  handleAddAnother(event: Event): void {
    event.stopPropagation();
    console.log('add another');
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
}
