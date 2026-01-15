/**
 * @module module:lib/components/stepped-form/stepped-form.component
 * @description Stepped form component module.
 * @summary Provides `SteppedFormComponent` which implements a multi-page form
 * UI with navigation, validation and submission support. Useful for forms that
 * need to be split into logical steps/pages.
 *
 * @link {@link SteppedFormComponent}
 */

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { IonButton, IonSkeletonText, IonText } from '@ionic/angular/standalone';
import { arrowForwardOutline, arrowBackOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { UIElementMetadata, UIModelMetadata} from '@decaf-ts/ui-decorators';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ComponentEventNames } from '../../engine/constants';
import { Dynamic } from '../../engine/decorators';
import { NgxFormService } from '../../services/NgxFormService';
import { getLocaleContext } from '../../i18n/Loader';
import { LayoutComponent } from '../layout/layout.component';
import { NgxFormDirective } from '../../engine/NgxFormDirective';
import { FormParent } from '../../engine/types';


@Dynamic()
@Component({
  selector: 'ngx-decaf-stepped-form',
  templateUrl: './stepped-form.component.html',
  styleUrls: ['./stepped-form.component.scss'],
  imports: [
    TranslatePipe,
    ReactiveFormsModule,
    IonSkeletonText,
    IonText,
    IonButton,
    LayoutComponent
  ],
  standalone: true,
   host: {'[attr.id]': 'uid'},
})
export class SteppedFormComponent extends NgxFormDirective implements OnInit, OnDestroy {

  /**
   * @description Array of UI model metadata for all form fields.
   * @summary Contains the complete collection of UI model metadata that defines
   * the structure, validation, and presentation of form fields across all pages.
   * Each metadata object contains information about field type, validation rules,
   * page assignment, and display properties.
   *
   * @type {UIModelMetadata[]}
   * @memberOf SteppedFormComponent
   */
  @Input()
  override children!: UIModelMetadata[] | { title: string; description: string; items?:  UIModelMetadata[]  }[];


  /**
   * @description The locale to be used for translations.
   * @summary Specifies the locale identifier to use when translating component text.
   * This can be set explicitly via input property to override the automatically derived
   * locale from the component name. The locale is typically a language code (e.g., 'en', 'fr')
   * or a language-region code (e.g., 'en-US', 'fr-CA') that determines which translation
   * set to use for the component's text content.
   *
   * @type {string}
   * @memberOf SteppedFormComponent
   */
  @Input()
  paginated: boolean = true;


  // /**
  //  * @description Optional action identifier for form submission context.
  //  * @summary Specifies a custom action name that will be included in the submit event.
  //  * If not provided, defaults to the standard submit event constant. Used to
  //  * distinguish between different types of form submissions within the same component.
  //  *
  //  * @type {string | undefined}
  //  */
  // @Input()
  // action?: string;



  /**
   * @description Number of pages in the stepped form.
   * @summary Represents the total number of steps/pages in the multi-step form.
   * This value is automatically calculated based on the page properties of the children
   * or can be explicitly set. Each page represents a logical group of form fields.
   *
   * @type {number}
   * @default 1
   * @memberOf SteppedFormComponent
   */
  @Input()
  override pages: number | {title: string; description: string}[] = 1;

  /**
   * List of titles and descriptions for each page of the stepped form.
   * Each object in the array represents a page, containing a title and a description.
   *
   * @example
   * pageTitles = [
   *   { title: 'Personal Information', description: 'Fill in your personal details.' },
   *   { title: 'Address', description: 'Provide your residential address.' }
   * ];
   */
  @Input()
  pageTitles: { title: string; description: string}[] = [];


  /**
   * @description The CRUD operation type for this form.
   * @summary Defines the type of operation being performed (CREATE, READ, UPDATE, DELETE).
   * This affects form behavior, validation rules, and field accessibility. For example,
   * READ operations might disable form fields, while CREATE operations enable all fields.
   *
   * @type {CrudOperations}
   * @default OperationKeys.CREATE
   * @memberOf SteppedFormComponent
   */
  @Input()
  override operation: CrudOperations = OperationKeys.CREATE;

  /**
   * @description The initial page to display when the form loads.
   * @summary Specifies which page of the multi-step form should be shown first.
   * This allows starting the form at any step, useful for scenarios like editing
   * existing data where you might want to jump to a specific section.
   *
   * @type {number}
   * @default 1
   * @memberOf SteppedFormComponent
   */
  @Input()
  startPage: number = 1;

  // /**
  //  * @description Angular reactive FormGroup or FormArray for form state management.
  //  * @summary The form instance that manages all form controls, validation, and form state.
  //  * When using FormArray, each array element represents a page's FormGroup. When using
  //  * FormGroup, it contains all form controls for the entire stepped form.
  //  *
  //  * @type {FormGroup | FormArray | undefined}
  //  * @memberOf SteppedFormComponent
  //  */
  // @Input()
  // formGroup!: FormGroup | FormArray | undefined;

  /**
   * @description Array representing the structure of pages.
   * @summary Contains metadata about each page, including page numbers and indices.
   * This array is built during initialization to organize the form fields into
   * logical pages and provide navigation structure.
   *
   * @type {UIModelMetadata[]}
   * @memberOf SteppedFormComponent
   */
  pagesArray: UIModelMetadata[] = [];


  // /**
  //  * @description Custom event handlers for form actions.
  //  * @summary A record of event handler functions keyed by event names that can be
  //  * triggered during form operations. These handlers provide extensibility for
  //  * custom business logic and can be invoked for various form events and actions.
  //  *
  //  * @type {HandlerLike}
  //  */
  // @Input()
  // handlers!: HandlerLike;



  /**
   * @description Event emitter for form submission.
   * @summary Emits events when the form is submitted, typically on the last page
   * when all validation passes. The emitted event contains the form data and
   * event type information for parent components to handle.
   *
   * @type {EventEmitter<IBaseCustomEvent>}
   * @memberOf SteppedFormComponent
   */
  // @Output()
  // submitEvent: EventEmitter<ICrudFormEvent> = new EventEmitter<ICrudFormEvent>();

  /**
   * @description Creates an instance of SteppedFormComponent.
   * @summary Initializes a new SteppedFormComponent instance and registers the required
   * Ionic icons for navigation buttons (forward and back arrows).
   *
   * @memberOf SteppedFormComponent
   */
  constructor() {
    super("SteppedFormComponent");
    addIcons({arrowForwardOutline, arrowBackOutline});
    this.enableDarkMode = true;
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Sets up the stepped form by organizing children into pages, calculating the total
   * number of pages, and initializing the active page. This method processes the UI model metadata
   * to create a logical page structure and ensures proper page assignments for all form fields.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant S as SteppedFormComponent
   *   participant F as Form Service
   *
   *   A->>S: ngOnInit()
   *   S->>S: Set activeIndex = startPage
   *   S->>S: Calculate total pages
   *   S->>S: Assign page props to children
   *   S->>S: getCurrentFormGroup(activeIndex)
   *   S->>F: Extract FormGroup for active page
   *   F-->>S: Return activeFormGroup
   *
   * @memberOf SteppedFormComponent
   */
  override async ngOnInit(): Promise<void>  {
    if (!this.locale)
      this.locale = getLocaleContext("SteppedFormComponent")
    this.activeIndex = this.startPage;
    if (typeof this.pages === 'object') {
      this.pageTitles = this.pages;
    } else {
       if (!this.pageTitles.length)
      this.pageTitles =  Array.from({ length: this.pages }, () => ({ title: '', description: ''}));
    }

    this.pages = this.pageTitles.length;

    if (this.paginated) {
      if (!this.parentForm)
        this.parentForm = (this.formGroup?.root || this.formGroup) as FormParent;
      this.children = [... (this.children as UIModelMetadata[]).map((c) => {
        if (!c.props)
          c.props = {};
        const page = c.props['page'] || 1;
        // prevent page overflow
        c.props['page'] = page > this.pages ? this.pages : page;
        return c;
      })];
      this.getActivePage(this.activeIndex);
    } else {
      this.children =  this.pageTitles.map((page, index) => {
        const pageNumber = index + 1;
        const items = (this.children as UIModelMetadata[]).filter(({ props }: UIElementMetadata) => props?.['page'] === pageNumber);
        return {
          page: pageNumber,
          title: page.title,
          description: page.description,
          items
        };
      });
      // this.formGroup =  new FormGroup(
      //   (this.formGroup as FormArray).controls.reduce((acc, control, index) => {
      //     acc[index] = control as FormGroup;
      //     return acc;
      //   }, {} as Record<string, FormGroup>)
      // );
    }
    this.initialized = true;
  }

  /**
   * @description Cleanup method called when the component is destroyed.
   * @summary Unsubscribes from any active timer subscriptions to prevent memory leaks.
   * This is part of Angular's component lifecycle and ensures proper resource cleanup.
   *
   * @memberOf SteppedFormComponent
   */
  override async ngOnDestroy(): Promise<void> {
    await super.ngOnDestroy();
    if (this.timerSubscription)
      this.timerSubscription.unsubscribe();
  }

  /**
   * @description Handles navigation to the next page or form submission.
   * @summary Validates the current page's form fields and either navigates to the next page
   * or submits the entire form if on the last page. Form validation must pass before
   * proceeding. On successful submission, emits a submit event with form data.
   *
   * @param {boolean} lastPage - Whether this is the last page of the form
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant S as SteppedFormComponent
   *   participant F as Form Service
   *   participant P as Parent Component
   *
   *   U->>S: Click Next/Submit
   *   S->>F: validateFields(activeFormGroup)
   *   F-->>S: Return validation result
   *   alt Not last page and valid
   *     S->>S: activeIndex++
   *     S->>S: getCurrentFormGroup(activeIndex)
   *   else Last page and valid
   *     S->>F: getFormData(formGroup)
   *     F-->>S: Return form data
   *     S->>P: submitEvent.emit({data, name: SUBMIT})
   *   end
   *
   * @memberOf SteppedFormComponent
   */
  handleNext(lastPage: boolean = false): void {
    const isValid = NgxFormService.validateFields(this.formGroup as FormGroup);
    // const isValid = this.paginated ?
    //   NgxFormService.validateFields(this.formGroup as FormGroup) :
    //   (this.formGroup as FormArray)?.controls.every(control => NgxFormService.validateFields(control as FormGroup));
    if (!lastPage) {
      if (isValid) {
        this.activeIndex = this.activeIndex + 1;
        this.getActivePage(this.activeIndex);
      }
    } else {
     if (isValid) {
      const rootForm = this.formGroup?.root || this.formGroup;
      const data = Object.assign({}, ...Object.values(NgxFormService.getFormData(rootForm as FormGroup)));
      super.submitEventEmit(data, this.action || ComponentEventNames.SUBMIT, 'SteppedFormComponent', this.handlers);
     }
    }
  }

  /**
   * @description Handles navigation to the previous page.
   * @summary Moves the user back to the previous page in the stepped form.
   * This method decrements the active page number and updates the form
   * group and children to display the previous page's content.
   *
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant S as SteppedFormComponent
   *
   *   U->>S: Click Back
   *   S->>S: activeIndex--
   *   S->>S: getCurrentFormGroup(activeIndex)
   *   Note over S: Update active form and children
   *
   * @memberOf SteppedFormComponent
   */
  handleBack(): void {
    if (!this.paginated)
      return this.location.back();
    this.activeIndex = this.activeIndex - 1;
    this.getActivePage(this.activeIndex);
  }



  // async submit(event?: SubmitEvent, eventName?: string, componentName?: string): Promise<boolean | void> {
  //   if (event) {
  //     event.preventDefault();
  //     event.stopImmediatePropagation();
  //   }

  //   if (!NgxFormService.validateFields(this.formGroup as FormGroup))
  //     return false;
  //   const data = NgxFormService.getFormData(this.formGroup as FormGroup);
  //   this.submitEvent.emit({
  //     data,
  //     component: componentName || this.componentName,
  //     name: eventName || this.action || ComponentEventNames.SUBMIT,
  //     handlers: this.handlers,
  //   });
  // }
}
