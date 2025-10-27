import { Directive, ElementRef, EventEmitter, Inject, inject, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { FormArray, FormGroup } from "@angular/forms";
import { Location } from '@angular/common';
import { CrudOperations, OperationKeys } from "@decaf-ts/db-decorators";
import { Model } from "@decaf-ts/decorator-validation";
import { NgxDecafFormService } from "./NgxDecafFormService";
import { ICrudFormEvent, IFormElement } from "./interfaces";
import { FieldUpdateMode, FormParent, HandlerLike, HTMLFormTarget } from "./types";
import { ICrudFormOptions, IRenderedModel } from "./interfaces";
import { ComponentsTagNames, EventConstants } from "./constants";
import { NgxParentComponentDirective } from "./NgxParentComponentDirective";
import { NgxDecafFormFieldDirective } from "./NgxDecafFormFieldDirective";

@Directive()
export abstract class NgxFormDirective extends NgxParentComponentDirective implements OnInit, IFormElement, OnDestroy, IRenderedModel {

  crudFieldComponent: string = ComponentsTagNames.CRUD_FIELD;

  /**
   * @description Reactive form group associated with this fieldset.
   * @summary The FormGroup instance that contains all form controls within this fieldset.
   * Used for form validation, value management, and integration with Angular's reactive forms.
   *
   * @type {FormGroup}
   * @memberOf CrudFormComponent
   */
  @Input()
  parentFormId!: string;


  /**
   * @description Reference to the reactive form DOM element.
   * @summary ViewChild reference that provides direct access to the form's DOM element.
   * This enables programmatic manipulation of the form element and access to native
   * HTML form properties and methods when needed.
   *
   * @type {ElementRef}
   * @memberOf CrudFormComponent
   */
  @ViewChild('component', { static: false, read: ElementRef })
  override component!: ElementRef;

  /**
   * @description Angular Location service.
   * @summary Injected service that provides access to the browser's URL and history.
   * This service is used for interacting with the browser's history API, allowing
   * for back navigation and URL manipulation outside of Angular's router.
   *
   * @private
   * @type {Location}
   * @memberOf CrudFormComponent
   */
  private location: Location = inject(Location);


  /**
   * @description Field update trigger mode for form validation.
   * @summary Determines when form field validation should be triggered. Options include
   * 'change', 'blur', or 'submit'. This affects the user experience by controlling
   * when validation feedback is shown to the user during form interaction.
   *
   * @type {FieldUpdateMode}
   * @default 'change'
   * @memberOf CrudFormComponent
   */
  @Input()
  updateOn: FieldUpdateMode = 'change';

  /**
   * @description Form submission target specification.
   * @summary Specifies where to display the response after form submission, similar
   * to the HTML form target attribute. Options include '_self', '_blank', '_parent',
   * '_top', or a named frame. Controls the browser behavior for form responses.
   *
   * @type {HTMLFormTarget}
   * @default '_self'
   * @memberOf CrudFormComponent
   */
  @Input()
  target: HTMLFormTarget = '_self';

  /**
   * @description HTTP method or submission strategy for the form.
   * @summary Defines how the form should be submitted. 'get' and 'post' correspond
   * to standard HTTP methods for traditional form submission, while 'event' uses
   * Angular event-driven submission for single-page application workflows.
   *
   * @type {'get' | 'post' | 'event'}
   * @default 'event'
   * @memberOf CrudFormComponent
   */
  @Input()
  method: 'get' | 'post' | 'event' = 'event';

  /**
   * @description Configuration options for the CRUD form behavior.
   * @summary Contains various configuration settings that control form rendering,
   * validation, and behavior. These options are merged with default settings
   * during component initialization to customize the form's functionality.
   *
   * @type {ICrudFormOptions}
   * @memberOf CrudFormComponent
   */
  @Input()
  options!: ICrudFormOptions;


  /**
   * @description Optional action identifier for form submission context.
   * @summary Specifies a custom action name that will be included in the submit event.
   * If not provided, defaults to the standard submit event constant. Used to
   * distinguish between different types of form submissions within the same component.
   *
   * @type {string | undefined}
   * @memberOf CrudFormComponent
   */
  @Input()
  action?: string;

  /**
   * @description The current CRUD operation being performed.
   * @summary Specifies the type of operation this form is handling (CREATE, READ, UPDATE, DELETE).
   * This is a required input that determines form behavior, validation rules, and available actions.
   * The operation affects form state, button visibility, and submission logic.
   *
   * @type {CrudOperations}
   * @required
   * @memberOf CrudFormComponent
   */
  @Input({ required: true })
  operation!: CrudOperations;

  /**
   * @description Custom event handlers for form actions.
   * @summary A record of event handler functions keyed by event names that can be
   * triggered during form operations. These handlers provide extensibility for
   * custom business logic and can be invoked for various form events and actions.
   *
   * @type {HandlerLike}
   * @memberOf CrudFormComponent
   */
  @Input()
  handlers!: HandlerLike;

  /**
   * @description Angular reactive FormGroup for form state management.
   * @summary The FormGroup instance that manages all form controls, validation,
   * and form state. This is the main interface for accessing form values and
   * controlling form behavior. May be undefined for read-only operations.
   *
   * @type {FormGroup | undefined}
   * @memberOf CrudFormComponent
   */
  @Input()
  formGroup: FormParent | undefined = undefined;

  /**
   * @description Unique identifier for the form renderer.
   * @summary A unique string identifier used to register and manage this form
   * instance within the NgxDecafFormService. This ID is also used as the HTML id
   * attribute for the form element, enabling DOM queries and form management.
   *
   * @type {string}
   * @memberOf CrudFormComponent
   */
  @Input()
  rendererId!: string;


    /**
   * @description Event emitter for form submission events.
   * @summary Emits ICrudFormEvent objects when the form is submitted, providing
   * form data, component information, and any associated handlers to parent
   * components. This enables decoupled handling of form submission logic.
   *
   * @type {EventEmitter<ICrudFormEvent>}
   * @memberOf CrudFormComponent
   */
  @Output()
  submitEvent: EventEmitter<ICrudFormEvent> = new EventEmitter<ICrudFormEvent>();

  /**
   * @description Unique identifier for the current record instance.
   * @summary This property holds a unique string value that identifies the specific record being managed by the form.
   * It is automatically generated if not provided, ensuring each form instance has a distinct identifier.
   * The uid is used for tracking, referencing, and emitting events related to the current record, and may be used
   * in conjunction with the primary key for CRUD operations.
   *
   * @type {string}
   * @default Randomly generated 12-character string
   * @memberOf CrudFormComponent
   */
  @Input()
  allowClear: boolean = true;

  //   /**
  //  * @description Angular change detection service.
  //  * @summary Injected service that provides manual control over change detection cycles.
  //  * This is essential for ensuring that programmatic DOM changes (like setting accordion
  //  * attributes) are properly reflected in the component's state and trigger appropriate
  //  * view updates when modifications occur outside the normal Angular change detection flow.
  //  *
  //  * @protected
  //  * @type {ChangeDetectorRef}
  //  * @memberOf CrudFormComponent
  //  */
  // protected changeDetectorRef: ChangeDetectorRef = inject(ChangeDetectorRef);

  // /**
  //  * @description Angular Renderer2 service for safe DOM manipulation.
  //  * @summary Injected service that provides a safe, platform-agnostic way to manipulate DOM elements.
  //  * This service ensures proper handling of DOM operations across different platforms and environments,
  //  * including server-side rendering and web workers.
  //  *
  //  * @protected
  //  * @type {Renderer2}
  //  * @memberOf CrudFormComponent
  //  */
  // protected renderer: Renderer2 = inject(Renderer2);

  // /**
  //  * @description Translation service for internationalization.
  //  * @summary Injected service that provides translation capabilities for UI text.
  //  * Used to translate button labels and validation messages based on the current locale.
  //  *
  //  * @protected
  //  * @type {TranslateService}
  //  * @memberOf CrudFormComponent
  //  */
  // protected translateService: TranslateService = inject(TranslateService);


   /**
   * @description Reference to CRUD operation constants for template usage.
   * @summary Exposes the OperationKeys enum to the component template, enabling
   * conditional rendering and behavior based on operation types. This protected
   * readonly property ensures that template logic can access operation constants
   * while maintaining encapsulation and preventing accidental modification.
   *
   * @protected
   * @readonly
   * @memberOf CrudFormComponent
   */
  protected readonly OperationKeys = OperationKeys;

  protected activeFormGroupIndex: number = 0;

  get activeFormGroup(): FormParent {
    return this.getFormArrayIndex(this.activeFormGroupIndex) as FormParent;
  }

   /**
   * @description Component initialization lifecycle method.
   * @summary Initializes the component by setting up the logger, configuring form state
   * based on the operation type, and merging configuration options. For READ and DELETE
   * operations, the formGroup is set to undefined since these operations don't require
   * form input. Configuration options are merged with default settings.
   *
   * @returns {Promise<void>}
   * @memberOf CrudFormComponent
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async ngOnInit(model?: Model | string): Promise<void> {
    // dont call super.ngOnInit to model conflicts
    if (this.operation === OperationKeys.READ || this.operation === OperationKeys.DELETE)
      this.formGroup = undefined;
  }

  /**
   * @description Component cleanup lifecycle method.
   * @summary Performs cleanup operations when the component is destroyed.
   * Unregisters the FormGroup from the NgxDecafFormService to prevent memory leaks
   * and ensure proper resource cleanup.
   *
   * @returns {void}
   * @memberOf CrudFormComponent
   */
  ngOnDestroy(): void {
    if (this.formGroup)
      NgxDecafFormService.unregister(this.formGroup);
  }

  getFormArrayIndex(index: number): FormParent | undefined {
    if(!(this.formGroup instanceof FormArray) && this.formGroup)
      return this.formGroup;
    const formGroup = (this.formGroup as FormArray).at(index) as FormGroup;
    if(formGroup) {
      if(this.children.length) {
        const children = [... this.children];
        this.children = [];
        this.changeDetectorRef.detectChanges();
        this.children = [... children.map(child => {
          const props = (child.props || {}) as NgxDecafFormFieldDirective;
          const name = props.name;
          const control = formGroup.get(name);
          child.props.value = control?.value;
          child.props.formGroup = formGroup;
          child.props.activeFormGroupIndex = index;
          child.props.formControl = control;
          return child;
        })];
        this.changeDetectorRef.detectChanges();
      }
    }
    return formGroup || undefined;
  }


  /**
   * @description Handles form reset or navigation back functionality.
   * @summary Provides different reset behavior based on the current operation.
   * For CREATE and UPDATE operations, resets the form to its initial state.
   * For READ and DELETE operations, navigates back in the browser history
   * since these operations don't have modifiable form data to reset.
   *
   * @returns {void}
   * @memberOf CrudFormComponent
   */
  handleReset(): void {
    if(![OperationKeys.DELETE, OperationKeys.READ].includes(this.operation) && this.allowClear)
      return NgxDecafFormService.reset(this.formGroup as FormGroup);
    this.location.back();
  }

  async handleSubmit(event?: SubmitEvent, eventName?: string, componentName?: string): Promise<boolean | void> {
    if(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (!NgxDecafFormService.validateFields(this.formGroup as FormGroup))
      return false;
    const data = NgxDecafFormService.getFormData(this.formGroup as FormGroup);
    this.submitEvent.emit({
      data,
      component: componentName || this.componentName,
      name: eventName || this.action || EventConstants.SUBMIT,
      handlers: this.handlers,
    });
  }


}
