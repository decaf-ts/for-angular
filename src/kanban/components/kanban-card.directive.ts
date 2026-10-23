import { Directive, inject, TemplateRef } from '@angular/core';
import {
  KanbanCardTemplateContext,
  KanbanColumnHeaderTemplateContext,
  KanbanEmptyTemplateContext,
} from './kanban.types';

/**
 * Marks an `ng-template` as the card renderer for a Kanban board.
 *
 * The template receives a {@link KanbanCardTemplateContext} (`let-task` gives
 * the task). Use the type guard via the directive's generic parameter to get
 * typed template contexts:
 * `<ng-template decafKanbanCard let-task>...</ng-template>`.
 *
 * @category Kanban
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- selector is part of the public API contract
  selector: '[decafKanbanCard]',
  standalone: true,
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- template context defaults to any so untyped consumers can bind let-task
export class DecafKanbanCardDirective<T = any> {
  readonly templateRef = inject<TemplateRef<KanbanCardTemplateContext<T>>>(TemplateRef);

  static ngTemplateContextGuard<T>(
    _directive: DecafKanbanCardDirective<T>,
    _context: unknown
  ): _context is KanbanCardTemplateContext<T> {
    return true;
  }
}

/**
 * Marks an `ng-template` as the column header renderer for a Kanban board.
 *
 * The template receives a {@link KanbanColumnHeaderTemplateContext}
 * (`let-column` gives the column config).
 *
 * @category Kanban
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- selector is part of the public API contract
  selector: '[decafKanbanColumnHeader]',
  standalone: true,
})
export class DecafKanbanColumnHeaderDirective {
  readonly templateRef = inject<TemplateRef<KanbanColumnHeaderTemplateContext>>(TemplateRef);
}

/**
 * Marks an `ng-template` as the empty-state renderer for a Kanban board.
 *
 * The template receives a {@link KanbanEmptyTemplateContext}; it is rendered
 * per empty column and once for the whole board when no cards are visible.
 *
 * @category Kanban
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- selector is part of the public API contract
  selector: '[decafKanbanEmpty]',
  standalone: true,
})
export class DecafKanbanEmptyDirective {
  readonly templateRef = inject<TemplateRef<KanbanEmptyTemplateContext>>(TemplateRef);
}
