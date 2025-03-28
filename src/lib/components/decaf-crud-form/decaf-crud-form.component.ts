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
  Dynamic,
  FieldUpdateMode,
  HTMLFormTarget,
  RenderedModel,
} from '../../engine';
import { CrudFormOptions, FormReactiveSubmitEvent } from './types';
import { CrudOperations } from '@decaf-ts/db-decorators';
import { DefaultFormReactiveOptions } from './constants';

@Dynamic()
@Component({
  standalone: true,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'decaf-crud-form',
  templateUrl: './decaf-crud-form.component.html',
  styleUrls: ['./decaf-crud-form.component.scss'],
  imports: [IonicModule, ReactiveFormsModule],
})
export class DecafCrudFormComponent
  implements OnInit, AfterViewInit, FormElement, OnDestroy, RenderedModel
{
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
  submitEvent = new EventEmitter<FormReactiveSubmitEvent>();

  ngAfterViewInit() {
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

    if (!this.formGroup.valid)
      return NgxFormService.validateFields(this.formGroup);
    console.log('onSubmit');

    // fix para valores de campos radio e check
    const data = NgxFormService.getFormData(this.rendererId);

    const submitEvent: FormReactiveSubmitEvent = {
      data: data,
    };

    if (this.action)
      return this.component.nativeElement.dispatchEvent(
        new CustomEvent('submit', data),
      );

    this.submitEvent.emit(submitEvent);
  }
}
