/**
 * Public API for the `@decaf-ts/for-angular/scrum` secondary entry point.
 *
 * Scrum surfaces composed from the `/kanban` entry point: sprint selector,
 * backlog triage board and per-sprint boards. Requires `@decaf-ts/for-angular/kanban`
 * peer tooling but only re-exports its own components and contracts.
 */
export * from './components/scrum.types';
export * from './components/sprint-selector.component';
export * from './components/backlog.component';
export * from './components/sprint-board.component';
