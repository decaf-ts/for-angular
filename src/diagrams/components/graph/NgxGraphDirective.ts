import { Directive, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoggedClass } from '@decaf-ts/logging';
import { IMenuItem } from '@decaf-ts/for-angular';
/**
 * Abstract base directive for graph page-level components: wires the activated
 * route and the shared logging base so concrete graph pages share navigation
 * and logging behavior.
 * @category Graph
 */
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
