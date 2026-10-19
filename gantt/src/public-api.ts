/**
 * Public API for the `@decaf-ts/for-angular/gantt` secondary entry point.
 *
 * Timeline/Gantt chart adapter over `@worktile/gantt`: typed task configuration,
 * bar/detail/empty templates, date and progress change events with rejection
 * reasons, and model validation issues. Install `@worktile/gantt` in the
 * consumer before importing this entry point.
 */
export * from './lib/gantt.types';
export * from './lib/gantt-template.directives';
export * from './lib/gantt.component';
