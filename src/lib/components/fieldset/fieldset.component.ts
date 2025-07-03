import { Component, CUSTOM_ELEMENTS_SCHEMA, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { Dynamic, HTMLFormTarget } from '../../engine';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { CollapsableDirective } from 'src/lib/directives/collapsable.directive';
import { IonAccordion, IonAccordionGroup, IonItem } from '@ionic/angular/standalone';


/**
 * @component FieldsetComponent
 * @example <ngx-decaf-fieldset
 *   name="Title"
 *   target="_self">
 * </ngx-decaf-fieldset>
 *
 * @param {string} name - Fieldset legend/title
 * @param {string} target - The target
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
export class FieldsetComponent {
  @ViewChild('component', { static: false, read: ElementRef })
  component!: ElementRef;

  @Input() name = 'Child';
  @Input() target: HTMLFormTarget = '_self';

  isOpen = false;

  protected readonly OperationKeys = OperationKeys;

  // ngAfterViewInit() {
  //   // if (![OperationKeys.READ, OperationKeys.DELETE].includes(this.operation))
  //   //   NgxFormService.formAfterViewInit(this, this.rendererId);
  // }

  // ngOnDestroy() {
  //   // if (this.formGroup)
  //   //   NgxFormService.unregister(this.formGroup);
  // }

  handleChange(event: CustomEvent) {
    const { target, detail } = event;
    const { value } = detail;
    if ((target as HTMLIonAccordionGroupElement).tagName === 'ION-ACCORDION-GROUP')
      this.isOpen = !!value;
  }
}
