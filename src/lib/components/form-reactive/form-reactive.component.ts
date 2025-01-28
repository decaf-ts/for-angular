import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FormElement } from '../../interfaces';
import { FormService } from '../../engine/FormService';
import { IonicModule } from '@ionic/angular';
import { HTMLFormTarget } from '../../engine';
import { FormReactiveOptions, FormReactiveSubmitEvent } from './types';
import { CrudOperations } from '@decaf-ts/db-decorators';
import { CssClasses, DefaultFormReactiveOptions } from './constants';

@Component({
  standalone: true,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'form-reactive',
  templateUrl: './form-reactive.component.html',
  styleUrls: ['./form-reactive.component.scss'],
  imports: [IonicModule, ReactiveFormsModule],
})
export class FormReactiveComponent
  implements OnInit, AfterViewInit, FormElement
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
    console.log('after init');
    // const controls: FormGroup[] = Array.from(
    //   (this.component.nativeElement as HTMLFormElement).children,
    // )
    //   .filter((e) => !e.classList.contains(CssClasses.BUTTONS_CONTAINER))
    //   .map((el: Element) => {
    //     const control = FormService.getControlFor(
    //       this.formId,
    //       el as HTMLElement,
    //     );
    //     if (!control) throw new Error(`No control found for ${el.id}`);
    //     return control;
    //   });
    // this.formGroup = new FormGroup(controls);
  }

  ngOnInit() {
    console.log('onInit');
    this.options = Object.assign(
      {},
      DefaultFormReactiveOptions,
      this.options || {},
    );
    if (!this.formId) this.formId = Date.now().toString();
    // const controls: FormGroup[] = this.component.nativeElement
    //   .querySelectorAll('form > *')
    //   .map((el: NgxCrudFormField) => {
    //     if (!el.formGroup)
    //       throw new Error('All elements need the formGroup property');
    //     return el.formGroup;
    //   });
    // this.formGroup = new FormGroup(controls);
  }

  /**
   * @param  {Event} event
   */
  submit(event: SubmitEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();

    const submitEvent: FormReactiveSubmitEvent = {
      data: {},
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
