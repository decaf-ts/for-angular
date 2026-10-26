/**
 * Public API for the `@decaf-ts/for-angular/gantt` secondary entry point.
 *
 * Timeline/Gantt chart adapter over `@worktile/gantt`: typed task configuration,
 * bar/detail/empty templates, date and progress change events with rejection
 * reasons, and model validation issues. Install `@worktile/gantt` in the
 * consumer before importing this entry point.
 */
export * from './components/gantt.types';
export * from './components/gantt-template.directives';
export * from './components/gantt.component';
