
import { AfterViewInit, Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Input, ViewChild } from '@angular/core';
import { Dynamic, HTMLFormTarget } from 'src/lib/engine';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { CollapsableDirective } from 'src/lib/directives/collapsable.directive';
import { IonAccordion, IonAccordionGroup, IonItem } from '@ionic/angular/standalone';

/**
 * @component FieldsetComponent
 * @description A dynamic fieldset component that can be collapsed or expanded based on the operation.
 * @summary This component provides a collapsible fieldset functionality, which is particularly
 * useful for organizing form sections or grouping related content. It integrates with Ionic
 * components to provide a smooth accordion-like behavior.
 *
 * @example
 * <ngx-decaf-fieldset
 *   name="Personal Information"
 *   [operation]="OperationKeys.READ"
 *   target="_self">
 *   <!-- Child form elements or content goes here -->
 * </ngx-decaf-fieldset>
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
   * @description Reference to the component's native element.
   * @summary This ViewChild allows direct access to the component's DOM element,
   * which is used to manipulate the accordion group after view initialization.
   *
   * @type {ElementRef}
   * @memberOf FieldsetComponent
   */
  @ViewChild('component', { static: false, read: ElementRef })
  component!: ElementRef;

  /**
   * @description The name or title of the fieldset.
   * @summary This input sets the legend or title for the fieldset, which is displayed
   * as the header of the accordion item.
   *
   * @type {string}
   * @default 'Child'
   * @memberOf FieldsetComponent
   */
  @Input()
  name: string = 'Child';

  /**
   * @description The current operation being performed.
   * @summary This input determines the initial state of the fieldset (open or closed)
   * based on the current operation. For READ and DELETE operations, the fieldset is
   * initially opened.
   *
   * @type {OperationKeys}
   * @default OperationKeys.READ
   * @memberOf FieldsetComponent
   */
  @Input()
  operation: OperationKeys = OperationKeys.READ;

  /**
   * @description The target attribute for the fieldset.
   * @summary This input sets the target attribute, which can be used to specify
   * where to display the response after submitting a form within the fieldset.
   *
   * @type {HTMLFormTarget}
   * @default '_self'
   * @memberOf FieldsetComponent
   */
  @Input()
  target: HTMLFormTarget = '_self';

  /**
   * @description Indicates whether the fieldset is currently open or collapsed.
   * @summary This property tracks the current state of the accordion item and
   * is updated when the user interacts with the component.
   *
   * @type {boolean}
   * @memberOf FieldsetComponent
   */
  isOpen: boolean = false;

  /**
   * @description Reference to the OperationKeys enum.
   * @summary This property allows the use of OperationKeys in the component's template.
   *
   * @type {CrudOperations}
   * @memberOf FieldsetComponent
   */
  protected readonly OperationKeys: CrudOperations = OperationKeys.CREATE;

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary This lifecycle hook is used to set the initial state of the accordion based on
   * the current operation. For READ and DELETE operations, the accordion is opened by default.
   *
   * @memberOf FieldsetComponent
   */
  ngAfterViewInit(): void {
    if (this.operation === OperationKeys.READ || this.operation === OperationKeys.DELETE) {
      this.isOpen = true;
      const accordionElement = this.component?.nativeElement.querySelector('ion-accordion-group');
      if(accordionElement)
        accordionElement.setAttribute('value', 'open');
    }
  }

  /**
   * @description Handles changes in the accordion's state.
   * @summary This method is called when the accordion's state changes (open/close).
   * It updates the `isOpen` property based on the new state.
   *
   * @param {CustomEvent} event - The event object containing details about the change
   * @memberOf FieldsetComponent
   */
  handleChange(event: CustomEvent,) {
    const { target, detail } = event;
    const { value } = detail;
    if ((target as HTMLIonAccordionGroupElement).tagName === 'ION-ACCORDION-GROUP')
      this.isOpen = !!value;
  }
}
