import { Directive, HostBinding, Input } from '@angular/core';

@Directive({
  selector: '[appDecafField]',
  standalone: true,
})
export class DecafFieldDirective {
  @Input({ alias: 'appDecafField' }) fieldName!: string;

  @HostBinding('#name') name!: string;

  constructor() {
    this.name = this.fieldName;
  }
}
