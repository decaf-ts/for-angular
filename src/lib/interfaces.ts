import { FormGroup } from '@angular/forms';
import { ElementRef } from '@angular/core';

export interface ComponentHolder {
  component: ElementRef;
}

export interface FormElement extends ComponentHolder {
  formGroup: FormGroup | undefined;
}
