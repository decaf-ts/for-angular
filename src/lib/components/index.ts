/**
 * @module module:lib/components/index
 * @description Barrel exports for components.
 * @summary Re-exports the component modules and individual components from
 * `src/lib/components` so consumers can import them from a single entrypoint.
 * This file exposes components such as `ListComponent`, `PaginationComponent`,
 * `SearchbarComponent`, and the `ForAngularComponentsModule`.
 *
 * @link {@link ForAngularComponentsModule}
 */

// Component exports
export * from './component-renderer/component-renderer.component';
export * from './crud-field/crud-field.component';
export * from './crud-form/crud-form.component';
export * from './empty-state/empty-state.component';
export * from './fieldset/fieldset.component';
export * from './filter/filter.component';
export * from './layout/layout.component';
export * from './list/list.component';
export * from './list-item/list-item.component';
export * from './model-renderer/model-renderer.component';
export * from './pagination/pagination.component';
export * from './searchbar/searchbar.component';
export * from './stepped-form/stepped-form.component';
export * from './modal/modal.component';
export * from './icon/icon.component';
export * from './card/card.component';
export * from './file-upload/file-upload.component';
// Module export
export * from './for-angular-components.module';
