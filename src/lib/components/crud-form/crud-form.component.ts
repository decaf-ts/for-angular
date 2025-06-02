import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
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
import { HTML5CheckTypes } from '@decaf-ts/ui-decorators';

@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-crud-form',
  templateUrl: './crud-form.component.html',
  styleUrls: ['./crud-form.component.scss'],
  imports: [ForAngularModule],
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

  @Input({ required: true })
  formGroup!: FormGroup;

  @Input()
  rendererId!: string;

  @Output()
  submitEvent = new EventEmitter<BaseCustomEvent>();

  ngAfterViewInit() {
    // if (this.operation !== OperationKeys.READ)
    //   NgxFormService.formAfterViewInit(this, this.rendererId);
  }

  ngOnInit() {
    if (this.operation === OperationKeys.READ)
      this.formGroup.disable();

    this.options = Object.assign(
      {},
      DefaultFormReactiveOptions,
      this.options || {},
    );
  }

  ngOnDestroy() {
    NgxFormService.unregister(this.formGroup);
  }

  /**
   * @param  {Event} event
   */
  submit(event: SubmitEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (!NgxFormService.validateFields(this.formGroup))
      return false;

    const data = NgxFormService.getFormData(this.formGroup);
    // const submitEvent: FormReactiveSubmitEvent = { data };
    // if (this.action)
    //   return this.component.nativeElement.dispatchEvent(
    //     new CustomEvent('submit', data),
    //   );
    // console.log(submitEvent);
    this.submitEvent.emit({
      data: data,
      component: 'FormReactiveComponent',
      name: EventConstants.SUBMIT_EVENT,
    });
  }

  reset() {
    NgxFormService.reset(this.formGroup);
  }
}
