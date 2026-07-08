import { Directive, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoggedClass } from '@decaf-ts/logging';
import { IMenuItem } from '../lib/engine/interfaces';

@Directive()
export abstract class NgxGraphDirective extends LoggedClass {
  protected readonly route = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {
    super();
  }

  trackItemFn(index: number, item: IMenuItem | string | number): string | number {
    return `${index}-${(item as IMenuItem)?.label || item}`;
  }
}
