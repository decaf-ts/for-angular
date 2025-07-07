import { Directive, ElementRef, inject, OnInit } from '@angular/core';


@Directive({
  selector: '[decafCollapsable]',
  standalone: true
})
export class CollapsableDirective implements OnInit{

  private element: ElementRef<HTMLElement> = inject(ElementRef);
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
}
