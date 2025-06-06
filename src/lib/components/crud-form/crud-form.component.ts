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
import { ActivatedRoute } from '@angular/router'
import { FormGroup } from '@angular/forms';
import { FormElement } from '../../interfaces';
import { NgxFormService } from '../../engine/NgxFormService';
import {
  BaseCustomEvent,
  Dynamic,
  EventConstants,
  FieldUpdateMode,
  HTMLFormTarget,
  RenderedModel,
} from '../../engine';
import { CrudFormOptions } from './types';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { DefaultFormReactiveOptions } from './constants';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { IonIcon } from '@ionic/angular/standalone';
;
import { consoleInfo } from '../../helpers';

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
  submitEvent = new EventEmitter<BaseCustomEvent>();

  private location: Location = inject(Location);

  ngAfterViewInit() {
    console.log(this.operation);
    console.log(this.uid);
    // if (![OperationKeys.READ, OperationKeys.DELETE].includes(this.operation))
    //   NgxFormService.formAfterViewInit(this, this.rendererId);
  }

  ngOnInit() {
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
   * @param  {Event} event
   */
  submit(event: SubmitEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (!NgxFormService.validateFields(this.formGroup as FormGroup))
      return false;

    const data = NgxFormService.getFormData(this.formGroup as FormGroup);
    this.submitEvent.emit({
      data: data,
      component: 'FormReactiveComponent',
      name: EventConstants.SUBMIT_EVENT,
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
