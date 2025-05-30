import { FormGroup } from '@angular/forms';
import { ElementRef } from '@angular/core';

/**
 * @description Interface for components that hold an ElementRef
 * @summary Defines a component holder interface that provides access to the underlying DOM element through ElementRef
 * @interface ComponentHolder
 * @memberOf module:for-angular
 */
export interface ComponentHolder {
  /**
   * @description Reference to the component's DOM element
   */
  component: ElementRef;
}

/**
 * @description Interface for form components that hold both an ElementRef and a FormGroup
 * @summary Extends ComponentHolder to include a FormGroup for form handling capabilities
 * @interface FormElement
 * @memberOf module:for-angular
 */
export interface FormElement extends ComponentHolder {
  /**
   * @description The Angular FormGroup associated with this form element
   */
  formGroup: FormGroup | undefined;
}
