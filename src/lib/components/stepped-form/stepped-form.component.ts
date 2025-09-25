import { Component, Input, OnInit, OnDestroy, Output, EventEmitter  } from '@angular/core';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonSkeletonText, IonText } from '@ionic/angular/standalone';
import { arrowForwardOutline, arrowBackOutline } from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { UIModelMetadata} from '@decaf-ts/ui-decorators';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { BaseCustomEvent, Dynamic, EventConstants, KeyValue, NgxFormService } from '../../engine';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { Subscription, timer } from 'rxjs';
import { getLocaleContext } from '../../i18n/Loader';
import { TranslatePipe } from '@ngx-translate/core';


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
    IonIcon,
    ComponentRendererComponent
  ],
  standalone: true,
})
export class SteppedFormComponent implements OnInit, OnDestroy {

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
  locale!: string;


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
  pages: number = 1;

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
  operation: CrudOperations = OperationKeys.CREATE;

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
  children!: UIModelMetadata[];

  /**
   * @description Angular reactive FormGroup or FormArray for form state management.
   * @summary The form instance that manages all form controls, validation, and form state.
   * When using FormArray, each array element represents a page's FormGroup. When using
   * FormGroup, it contains all form controls for the entire stepped form.
   *
   * @type {FormGroup | FormArray | undefined}
   * @memberOf SteppedFormComponent
   */
  @Input()
  formGroup!: FormGroup | FormArray | undefined;

  /**
   * @description Array of UI model metadata for the currently active page.
   * @summary Contains only the UI model metadata for fields that should be displayed
   * on the currently active page. This is a filtered subset of the children array,
   * updated whenever the user navigates between pages.
   *
   * @type {UIModelMetadata[] | undefined}
   * @memberOf SteppedFormComponent
   */
  activeChildren: UIModelMetadata[] | undefined = undefined;

  /**
   * @description FormGroup for the currently active page.
   * @summary The FormGroup instance that manages form controls and validation
   * for the current page only. This is extracted from the main formGroup
   * when using FormArray structure.
   *
   * @type {FormGroup | undefined}
   * @memberOf SteppedFormComponent
   */
  activeFormGroup: FormGroup | undefined = undefined;

  /**
   * @description The currently active page number.
   * @summary Tracks which page of the multi-step form is currently being displayed.
   * This property is updated as users navigate through the form steps using
   * the next/back buttons or programmatic navigation.
   *
   * @type {number}
   * @memberOf SteppedFormComponent
   */
  activePage: number = 1;

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

  /**
   * @description Subscription for timer-based operations.
   * @summary Manages the timer subscription used for asynchronous operations
   * like updating active children after page transitions. This subscription
   * is cleaned up in ngOnDestroy to prevent memory leaks.
   *
   * @private
   * @type {Subscription}
   * @memberOf SteppedFormComponent
   */
  private timerSubscription!: Subscription;

  /**
   * @description Event emitter for form submission.
   * @summary Emits events when the form is submitted, typically on the last page
   * when all validation passes. The emitted event contains the form data and
   * event type information for parent components to handle.
   *
   * @type {EventEmitter<BaseCustomEvent>}
   * @memberOf SteppedFormComponent
   */
  @Output()
  submitEvent: EventEmitter<BaseCustomEvent> = new EventEmitter<BaseCustomEvent>();

  /**
   * @description Creates an instance of SteppedFormComponent.
   * @summary Initializes a new SteppedFormComponent instance and registers the required
   * Ionic icons for navigation buttons (forward and back arrows).
   *
   * @memberOf SteppedFormComponent
   */
  constructor() {
    addIcons({arrowForwardOutline, arrowBackOutline});
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
   *   S->>S: Set activePage = startPage
   *   S->>S: Process children into pagesArray
   *   S->>S: Calculate total pages
   *   S->>S: Assign page props to children
   *   S->>S: getCurrentFormGroup(activePage)
   *   S->>F: Extract FormGroup for active page
   *   F-->>S: Return activeFormGroup
   *
   * @memberOf SteppedFormComponent
   */
  ngOnInit(): void  {
    if(!this.locale)
      this.locale = getLocaleContext("SteppedFormComponent")
    this.activePage = this.startPage;

    this.pagesArray = (this.children.reduce((acc, curr, index) => {
      const page = curr.props?.['page'] || index + 1;
      if(!acc[page])
        acc[page] = [];
      acc[page].push({index: page});
      return acc;
    }, [] as KeyValue) as []).filter(Boolean);

    this.pages = this.pagesArray.length;
    this.children = [... this.children.map((c) => {
      if(!c.props)
        c.props = {};
      const page = c.props['page'] || 1;
      // prevent page overflow
      c.props['page'] = page > this.pages ? this.pages : page;
      return c;
    })];
    this.getCurrentFormGroup(this.activePage);
  }

  /**
   * @description Cleanup method called when the component is destroyed.
   * @summary Unsubscribes from any active timer subscriptions to prevent memory leaks.
   * This is part of Angular's component lifecycle and ensures proper resource cleanup.
   *
   * @memberOf SteppedFormComponent
   */
  ngOnDestroy(): void {
    if(this.timerSubscription)
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
   *     S->>S: activePage++
   *     S->>S: getCurrentFormGroup(activePage)
   *   else Last page and valid
   *     S->>F: getFormData(formGroup)
   *     F-->>S: Return form data
   *     S->>P: submitEvent.emit({data, name: SUBMIT})
   *   end
   *
   * @memberOf SteppedFormComponent
   */
  handleNext(lastPage: boolean = false): void {
    const isValid = NgxFormService.validateFields(this.activeFormGroup as FormGroup);
    if (!lastPage) {
      if (isValid) {
        this.activePage = this.activePage + 1;
        this.getCurrentFormGroup(this.activePage);
      }
    } else {
     if (isValid) {
      const data = Object.assign({}, ...Object.values(NgxFormService.getFormData(this.formGroup as FormGroup)));
      this.submitEvent.emit({
        data,
        name: EventConstants.SUBMIT,
      });
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
   *   S->>S: activePage--
   *   S->>S: getCurrentFormGroup(activePage)
   *   Note over S: Update active form and children
   *
   * @memberOf SteppedFormComponent
   */
  handleBack(): void {
    this.activePage = this.activePage - 1;
    this.getCurrentFormGroup(this.activePage);
  }

  /**
   * @description Updates the active form group and children for the specified page.
   * @summary Extracts the FormGroup for the given page from the FormArray and filters
   * the children to show only fields belonging to that page. Uses a timer to ensure
   * proper Angular change detection when updating the activeChildren.
   *
   * @param {number} page - The page number to activate
   * @return {void}
   *
   * @private
   * @mermaid
   * sequenceDiagram
   *   participant S as SteppedFormComponent
   *   participant F as FormArray
   *   participant T as Timer
   *
   *   S->>F: Extract FormGroup at index (page - 1)
   *   F-->>S: Return page FormGroup
   *   S->>S: Set activeChildren = undefined
   *   S->>T: timer(10).subscribe()
   *   T-->>S: Filter children for active page
   *   S->>S: Set activeChildren
   *
   * @memberOf SteppedFormComponent
   */
  private getCurrentFormGroup(page: number): void {
    this.activeFormGroup = (this.formGroup as FormArray).at(page - 1) as FormGroup;
    this.activeChildren = undefined;
    this.timerSubscription = timer(10).subscribe(() => {
      this.activeChildren = this.children.filter(c => c.props?.['page'] === page);
    });
  }

}
