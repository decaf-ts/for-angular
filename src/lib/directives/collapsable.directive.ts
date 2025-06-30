import { AfterContentInit, Directive, ElementRef } from '@angular/core';


@Directive({
  selector: '[decafCollapsable]',
  standalone: true
})
export class CollapsableDirective implements AfterContentInit{

  constructor(private element?: ElementRef<HTMLElement>) {}

  ngAfterContentInit() {
    const element = this.element?.nativeElement;
    if(element) {
      const requiredFields = element.querySelectorAll('[required]') as NodeListOf<Element>;
      if(requiredFields.length) {
        const accordion = element?.closest('ion-accordion-group') as HTMLElement;
        accordion.setAttribute('value', 'open');
      }
    }
  }
}
