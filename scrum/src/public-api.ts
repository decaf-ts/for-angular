/**
 * Public API for the `@decaf-ts/for-angular/scrum` secondary entry point.
 *
 * Scrum surfaces composed from the `/kanban` entry point: sprint selector,
 * backlog triage board and per-sprint boards. Requires `@decaf-ts/for-angular/kanban`
 * peer tooling but only re-exports its own components and contracts.
 */
export * from './lib/scrum.types';
export * from './lib/sprint-selector.component';
export * from './lib/backlog.component';
export * from './lib/sprint-board.component';
