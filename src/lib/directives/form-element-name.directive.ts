import { Directive, ElementRef, Input } from '@angular/core';

@Directive({
  selector: '[appFormElement]',
  standalone: true,
})
export class FormElementNameDirective {
  @Input() appFormElement!: string;

  constructor(el: ElementRef) {
    Object.defineProperty(el.nativeElement, 'name', {
      value: this.appFormElement,
    });
  }
}
