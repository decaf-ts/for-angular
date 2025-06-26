import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { FormGroup } from '@angular/forms';
import {
  BaseCustomEvent,
  Dynamic,
  EventConstants,
  FieldUpdateMode,
  HTMLFormTarget,
  RenderedModel,
} from '../../engine';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { CollapsableDirective } from 'src/lib/directives/collapsable.directive';
import { IonAccordion, IonAccordionGroup, IonItem } from '@ionic/angular/standalone';



/**
 * @component CrudFormComponent
 * @example <ngx-decaf-crud-form
 *   action="create"
 *   operation="create"
 *   formGroup="formGroup"
 *   rendererId="rendererId"
 *   submitEvent="submitEvent"
 *   target="_self"
 *   method="event">
 * </ngx-decaf-crud-form>
 *
 * @param {string} action - The action to be performed (create, read, update, delete)
 * @param {CrudOperations} operation - The CRUD operation being performed (create, read, update, delete)
 * @param {FormGroup} formGroup - The form group
 * @param {string} rendererId - The renderer id
 * @param {SubmitEvent} submitEvent - The submit event
 * @param {string} target - The target
 * @param {string} method - The method
 */
@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-fieldset',
  templateUrl: './fieldset.component.html',
  styleUrls: ['./fieldset.component.scss'],
  imports: [ForAngularModule, IonAccordionGroup, IonAccordion, IonItem, CollapsableDirective],
})
export class FieldsetComponent implements OnInit, AfterViewInit, OnDestroy {
  // @Input()
  // updateOn: FieldUpdateMode = 'change';
  //
  @ViewChild('component', { static: false, read: ElementRef })
  component!: ElementRef;

  @Input()
  target: HTMLFormTarget = '_self';

  @Input()
  name: string = '';

  isOpen: boolean = false;


  ngAfterViewInit() {
    // if (![OperationKeys.READ, OperationKeys.DELETE].includes(this.operation))
    //   NgxFormService.formAfterViewInit(this, this.rendererId);
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    // if (this.formGroup)
    //   NgxFormService.unregister(this.formGroup);
  }


  protected readonly OperationKeys = OperationKeys;
}
