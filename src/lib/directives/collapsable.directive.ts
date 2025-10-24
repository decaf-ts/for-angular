/**
 * @module module:lib/directives/collapsable
 * @description Directive to auto-open accordions when required fields are present.
 * @summary CollapsableDirective inspects a DOM subtree for required inputs and, when found,
 * opens the closest ion-accordion-group to surface validation to the user.
 *
 * @link {@link CollapsableDirective}
 */
import { Directive, ElementRef, inject, OnInit, Injector } from '@angular/core';


@Directive({
  selector: '[decafCollapsable]',
  standalone: true
})
export class CollapsableDirective implements OnInit{

  private element: ElementRef<HTMLElement> = inject(ElementRef);
  private injector = inject(Injector);
  // constructor() {}

  ngOnInit() {
    const element = this.element?.nativeElement;
    if(element) {
      const requiredFields = element.querySelectorAll('[required]') as NodeListOf<Element>;
      if(requiredFields.length) {
        const accordion = element?.closest('ion-accordion-group') as HTMLElement;
        accordion.setAttribute('value', 'open');
      }
    }
  }

  // private element: ElementRef<HTMLElement> = inject(ElementRef);
  // private renderer = inject(Renderer2);

  // ngOnInit() {
  //   const element = this.element?.nativeElement;
  //   if(element) {
  //     const requiredFields = element.querySelectorAll('[required]') as NodeListOf<Element>;

  //     // Find the parent fieldset component and set required attribute if there are required fields
  //     const fieldsetElement = element.closest('ngx-decaf-fieldset');
  //     if (fieldsetElement && requiredFields.length > 0) {
  //       // Set a data attribute that the fieldset component can read
  //       this.renderer.setAttribute(fieldsetElement, 'data-has-required-fields', 'true');

  //       // Dispatch a custom event to notify the fieldset component
  //       const event = new CustomEvent('requiredFieldsDetected', {
  //         detail: { hasRequiredFields: true, count: requiredFields.length },
  //         bubbles: true
  //       });
  //       fieldsetElement.dispatchEvent(event);

  //       const accordion = element?.closest('ion-accordion-group') as HTMLElement;
  //       if (accordion) {
  //         accordion.setAttribute('value', 'open');
  //       }
  //     }
  //   }
  // }
}
