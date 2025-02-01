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
import { FormService } from '../../engine/FormService';
import { IonicModule } from '@ionic/angular';
import { HTMLFormTarget } from '../../engine';
import { FormReactiveOptions, FormReactiveSubmitEvent } from './types';
import { CrudOperations } from '@decaf-ts/db-decorators';
import { DefaultFormReactiveOptions } from './constants';

@Component({
  standalone: true,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'form-reactive',
  templateUrl: './decaf-crud-form.component.html',
  styleUrls: ['./decaf-crud-form.component.scss'],
  imports: [IonicModule, ReactiveFormsModule],
})
export class DecafCrudFormComponent
  implements OnInit, AfterViewInit, FormElement, OnDestroy
{
  @ViewChild('reactiveForm', { static: false, read: ElementRef })
  component!: ElementRef;

  @Input()
  target: HTMLFormTarget = '_self';

  @Input()
  method: 'get' | 'post' | 'event' = 'event';

  @Input()
  options!: FormReactiveOptions;

  @Input()
  action?: string;

  @Input({ required: true })
  operation!: CrudOperations;

  @Input()
  formGroup: FormGroup = new FormGroup({});

  @Input()
  formId!: string;

  @Output()
  submitEvent = new EventEmitter<FormReactiveSubmitEvent>();

  ngAfterViewInit() {
    FormService.formAfterViewInit(this, this.formId);
  }

  ngOnInit() {
    console.log('onInit');
    this.options = Object.assign(
      {},
      DefaultFormReactiveOptions,
      this.options || {},
    );
    if (!this.formId) this.formId = Date.now().toString();
  }

  ngOnDestroy() {
    FormService.forOnDestroy(this, this.formId);
  }

  /**
   * @param  {Event} event
   */
  submit(event: SubmitEvent) {
    console.log('onSubmit');
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    if (!this.formGroup.valid)
      return FormService.validateFields(this.formGroup);
    // if (!self.form?.valid) {
    //   const isValid = self.formService.validateFields(self.form as FormGroup);
    //   if(!isValid)
    //       return false;
    //   this.form?.setErrors(null);
    // }

    // fix para valores de campos radio e check
    const data = FormService.getFormData(this.formGroup, this.formId);
    // const button = self.buttons?.submit as FormButton;

    const submitEvent: FormReactiveSubmitEvent = {
      data: data,
    };
    //
    // if(!self.form?.valid)
    //   return self.formService.validateFields(self.form as FormGroup);
    // // if (!self.form?.valid) {
    // //   const isValid = self.formService.validateFields(self.form as FormGroup);
    // //   if(!isValid)
    // //       return false;
    // //   this.form?.setErrors(null);
    // // }
    //
    // // fix para valores de campos radio e check
    // const data = self.formService.getFormData(self.form as FormGroup, self.fields);
    // const button = self.buttons?.submit as FormButton;
    this.submitEvent.emit(submitEvent);
    // self.emitEvent({
    //   role: button?.role || FORM_BUTTON_ROLES.SUBMIT,
    //   data,
    //   reset: button?.reset,
    //   operation: self.operation,
    //   eventName: self.eventName,
    //   event,
    // } as FormReactiveSubmitEvent);
  }
}
