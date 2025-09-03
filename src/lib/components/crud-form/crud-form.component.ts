import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { FormArray, FormGroup } from '@angular/forms';
import { FormElement } from '../../interfaces';
import { NgxFormService } from '../../engine/NgxFormService';
import { CrudFormEvent, Dynamic, EventConstants, FieldUpdateMode, HTMLFormTarget, RenderedModel } from '../../engine';
import { CrudFormOptions } from './types';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { DefaultFormReactiveOptions } from './constants';
import { ForAngularModule, getLogger } from '../../for-angular.module';
import { IonIcon } from '@ionic/angular/standalone';
import { Model } from '@decaf-ts/decorator-validation';
import { Logger } from '@decaf-ts/logging';


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
  selector: 'ngx-decaf-crud-form',
  templateUrl: './crud-form.component.html',
  styleUrls: ['./crud-form.component.scss'],
  imports: [ForAngularModule, IonIcon],
   host: {'[attr.id]': 'rendererId'},
})
export class CrudFormComponent implements OnInit, FormElement, OnDestroy, RenderedModel {

  /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   */
  @Input()
  model!: Model | undefined;

  @Input()
  updateOn: FieldUpdateMode = 'change';

  @ViewChild('reactiveForm', { static: false, read: ElementRef })
  component!: ElementRef;

  @Input()
  target: HTMLFormTarget = '_self';

  @Input()
  method: 'get' | 'post' | 'event' = 'event';

  @Input()
  options!: CrudFormOptions;

  @Input()
  action?: string;

  @Input({ required: true })
  operation!: CrudOperations;

  @Input()
  handlers!: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>;

  @Input()
  formGroup!: FormGroup | undefined;

  /**
   * @description Path to the parent FormGroup, if nested.
   * @summary Full dot-delimited path of the parent FormGroup. Set only when is part of a nested structure.
   *
   * @type {string}
   * @memberOf CrudFormComponent
   */
  @Input()
  childOf?: string;

  @Input()
  rendererId!: string;

  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   */
  @Input()
  uid!: string | number | undefined;


  @Output()
  submitEvent = new EventEmitter<CrudFormEvent>();

  /**
   * @description Logger instance for the component.
   * @summary Provides logging capabilities for the component, allowing for consistent
   * and structured logging of information, warnings, and errors. This logger is initialized
   * in the ngOnInit method using the getLogger function from the ForAngularModule.
   *
   * The logger is used throughout the component to record important events, debug information,
   * and potential issues. It helps in monitoring the component's behavior, tracking the flow
   * of operations, and facilitating easier debugging and maintenance.
   *
   * @type {Logger}
   * @private
   * @memberOf CrudFormComponent
   */
  private logger!: Logger;

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

  // ngAfterViewInit() {
    // if (![OperationKeys.READ, OperationKeys.DELETE].includes(this.operation))
    //   NgxFormService.formAfterViewInit(this, this.rendererId);
  // }

  async ngOnInit() {
    if (!this.logger)
      this.logger = getLogger(this);
    if (this.operation === OperationKeys.READ || this.operation === OperationKeys.DELETE)
      this.formGroup = undefined;
    this.options = Object.assign(
      {},
      DefaultFormReactiveOptions,
      this.options || {},
    );

  }

  ngOnDestroy() {
    if (this.formGroup)
      NgxFormService.unregister(this.formGroup);
  }


  // async handleValidateGroup(event: CustomEvent): Promise<void> {
  //   const { parent, component, index } = event.detail;
  //   if(parent) {
  //     // if(index > 0) {
  //     //   const formGroup = (this.formGroup!.controls[group] as FormArray).get('0');
  //     //   const validators = formGroup?.validator;
  //     //   console.log(validators);
  //     // }

  //     const parentGroup = this.formGroup?.get(parent);
  //     if(parentGroup instanceof FormGroup || parentGroup instanceof FormArray) {
  //       const formGroup = index === 0 ? (parentGroup as FormArray).at(0) : NgxFormService.addGroupToParent(this.formGroup as FormGroup, parent, index);
  //       // console.log(parentGroup);
  //       // console.log((formGroup as FormGroup).controls);
  //       // console.log(formGroup.value);
  //       const isValid = NgxFormService.validateFields(formGroup);
  //       const event = new CustomEvent(EventConstants.FIELDSET_GROUP_VALIDATION, {
  //         detail: {isValid, value: formGroup.value, formGroup: parentGroup, formService: NgxFormService},
  //       });
  //       component.dispatchEvent(event);
  //     }
  //   }



  //   // const matchingGroups: {name: string, formGroup: FormGroup}[] = [];

  //   // Object.keys(this.formGroup.controls).forEach(controlName => {
  //   //   const control = this.formGroup!.controls[controlName];

  //   //   // Check if it's a FormGroup and if the name matches the category
  //   //   if (control instanceof FormGroup) {
  //   //     // Exact match
  //   //     if (controlName === categoryName) {
  //   //       matchingGroups.push({ name: controlName, formGroup: control });
  //   //     }
  //   //     // Partial match (useful for dynamic fieldsets like "category_0", "category_1", etc.)
  //   //     else if (controlName.startsWith(categoryName)) {
  //   //       matchingGroups.push({ name: controlName, formGroup: control });
  //   //     }
  //   //   }
  // }

  /**
   * @param  {SubmitEvent} event
   */
  async submit(event: SubmitEvent): Promise<boolean | void> {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    console.log(this.formGroup?.value)

    if (!NgxFormService.validateFields(this.formGroup as FormGroup))
      return false;
    const data = NgxFormService.getFormData(this.formGroup as FormGroup);
    this.submitEvent.emit({
      data,
      component: 'CrudFormComponent',
      name: this.action || EventConstants.SUBMIT,
      handlers: this.handlers,
    });
  }

  handleReset() {
    this.location.back();
    // if(OperationKeys.DELETE !== this.operation)
    //   NgxFormService.reset(this.formGroup);
    // else
    //   this.location.back();
  }

  handleDelete() {
    this.submitEvent.emit({
      data: this.uid,
      component: 'CrudFormComponent',
      name: EventConstants.SUBMIT,
    });
  }

  protected readonly OperationKeys = OperationKeys;
}
