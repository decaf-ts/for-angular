import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormElement } from '../../interfaces';
import { NgxFormService } from '../../engine/NgxFormService';
import { IonicModule } from '@ionic/angular';
import {
  BaseCustomEvent,
  Dynamic,
  EventConstants,
  FieldUpdateMode,
  HTMLFormTarget,
  RenderedModel,
} from '../../engine';
import { CrudFormOptions, FormReactiveSubmitEvent } from './types';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { DefaultFormReactiveOptions } from './constants';
import { ForAngularModule } from 'src/lib/for-angular.module';

@Dynamic()
@Component({
  standalone: true,
  selector: 'ngx-decaf-crud-form',
  templateUrl: './crud-form.component.html',
  styleUrls: ['./crud-form.component.scss'],
  imports: [ForAngularModule],
})
export class CrudFormComponent
  implements OnInit, AfterViewInit, FormElement, OnDestroy, RenderedModel {
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
  formGroup: FormGroup = new FormGroup({});

  @Input()
  rendererId!: string;

  @Output()
  submitEvent = new EventEmitter<BaseCustomEvent>();

  ngAfterViewInit() {
    if (this.operation !== OperationKeys.READ)
      NgxFormService.formAfterViewInit(this, this.rendererId);
  }

  ngOnInit() {
    this.options = Object.assign(
      {},
      DefaultFormReactiveOptions,
      this.options || {},
    );
  }

  ngOnDestroy() {
    NgxFormService.forOnDestroy(this, this.rendererId);
  }

  /**
   * @param  {Event} event
   */
  submit(event: SubmitEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    const isValid = NgxFormService.validateFields(this.formGroup);
    if (!isValid)
      return false;

    const data = NgxFormService.getFormData(this.rendererId);
    const submitEvent: FormReactiveSubmitEvent = { data };

    // if (this.action)
    //   return this.component.nativeElement.dispatchEvent(
    //     new CustomEvent('submit', data),
    //   );
    console.log(submitEvent);
    this.submitEvent.emit({
      data: data,
      component: 'FormReactiveComponent',
      name: EventConstants.SUBMIT_EVENT,
    });
  }

  reset() {
    NgxFormService.reset();
  }
}
