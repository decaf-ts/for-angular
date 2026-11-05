import { Directive, TemplateRef, inject } from '@angular/core';

import type {
  GanttBarTemplateContext,
  GanttTaskDetailTemplateContext,
} from './gantt.types';

/**
 * Marks an `ng-template` as the bar renderer for a Gantt timeline.
 *
 * The template receives a {@link GanttBarTemplateContext} (`let-task` gives the
 * task). A `@worktile/gantt` {@link GanttBarClickEvent}-compatible context is
 * not required; the directive wraps it for the component's template outlet.
 *
 * @category Gantt
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- selector is part of the public API contract
  selector: '[decafGanttBar]',
  standalone: true,
})
export class GanttBarDirective {
  readonly templateRef = inject(
    TemplateRef<GanttBarTemplateContext<unknown>>,
  );
}

/**
 * Marks an `ng-template` as the side-list row renderer for a Gantt timeline.
 *
 * The template receives a {@link GanttTaskDetailTemplateContext} (`let-task`
 * gives the task).
 *
 * @category Gantt
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- selector is part of the public API contract
  selector: '[decafGanttTaskDetail]',
  standalone: true,
})
export class GanttTaskDetailDirective {
  readonly templateRef = inject(
    TemplateRef<GanttTaskDetailTemplateContext<unknown>>,
  );
}

/**
 * Marks an `ng-template` as the empty-state renderer for a Gantt timeline,
 * shown when no tasks are mapped.
 *
 * @category Gantt
 */
@Directive({
  // eslint-disable-next-line @angular-eslint/directive-selector -- selector is part of the public API contract
  selector: '[decafGanttEmpty]',
  standalone: true,
})
export class GanttEmptyDirective {
  readonly templateRef = inject(TemplateRef<unknown>);
}
