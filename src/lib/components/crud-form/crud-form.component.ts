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
import { FormElement } from '../../interfaces';
import { NgxFormService } from '../../engine/NgxFormService';
import {
  BaseCustomEvent,
  CrudFormEvent,
  Dynamic,
  EventConstants,
  FieldUpdateMode,
  HTMLFormTarget,
  RenderedModel,
} from '../../engine';
import { CrudFormOptions } from './types';
import { CrudOperations, InternalError, OperationKeys } from '@decaf-ts/db-decorators';
import { DefaultFormReactiveOptions } from './constants';
import { ForAngularModule, getLogger } from 'src/lib/for-angular.module';
import { IonIcon } from '@ionic/angular/standalone';
import { Model } from '@decaf-ts/decorator-validation';
import { Logger } from '@decaf-ts/logging';
import { Repository } from '@decaf-ts/core';
import { DecafRepository } from '../list/constants';




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
})
export class CrudFormComponent implements OnInit, AfterViewInit, FormElement, OnDestroy, RenderedModel {

  /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   */
  @Input()
  model!:  Model | undefined;;

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
  handlers!: Record<string, (...args: any[]) => any | Promise<any>>

  @Input()
  formGroup!: FormGroup | undefined;

  /**
   * @description Path to the parent FormGroup, if nested.
   * @summary Full dot-delimited path of the parent FormGroup. Set only when is part of a nested structure.
   *
   * @type {string}
   * @memberOf CrudFieldComponent
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

  ngAfterViewInit() {
    // if (![OperationKeys.READ, OperationKeys.DELETE].includes(this.operation))
    //   NgxFormService.formAfterViewInit(this, this.rendererId);
  }

  async ngOnInit() {
    if(!this.logger)
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
    if(this.formGroup)
      NgxFormService.unregister(this.formGroup);
  }

  /**
   * @param  {SubmitEvent} event
   */
  async submit(event: SubmitEvent): Promise<boolean | void> {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (!NgxFormService.validateFields(this.formGroup as FormGroup))
      return false;

    const data = NgxFormService.getFormData(this.formGroup as FormGroup);
    this.submitEvent.emit({
      data,
      component:'FormReactiveComponent',
      name: this.action || EventConstants.SUBMIT_EVENT,
      handlers: this.handlers
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
      component: 'FormReactiveComponent',
      name: EventConstants.SUBMIT_EVENT,
    });
  }

  protected readonly OperationKeys = OperationKeys;
}
