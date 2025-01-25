import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
  Input,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormElement, NgxCrudFormField } from '../../interfaces';

@Component({
  standalone: true,
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'form-reactive',
  templateUrl: './form-reactive.component.html',
  styleUrls: ['./form-reactive.component.scss'],
})
export class FormReactiveComponent
  implements OnInit, AfterViewInit, FormElement
{
  @ViewChild('reactiveForm', { static: false, read: ElementRef })
  component!: ElementRef;

  @Input()
  formGroup!: FormGroup;

  ngAfterViewInit() {
    console.log('after init');
    const controls: FormGroup[] = (
      Array.from(this.component.nativeElement.children) as NgxCrudFormField[]
    ).map((el: NgxCrudFormField) => {
      if (!el.formGroup)
        throw new Error('All elements need the formGroup property');
      return el.formGroup;
    });
    this.formGroup = new FormGroup(controls);
  }

  ngOnInit() {
    console.log('onInit');
    // const controls: FormGroup[] = this.component.nativeElement
    //   .querySelectorAll('form > *')
    //   .map((el: NgxCrudFormField) => {
    //     if (!el.formGroup)
    //       throw new Error('All elements need the formGroup property');
    //     return el.formGroup;
    //   });
    // this.formGroup = new FormGroup(controls);
  }
}
