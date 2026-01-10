/**
 * @module module:lib/public-apis
 * @description Public exports for the for-angular package.
 * @summary Re-exports the public API surface for the Decaf for-Angular integration. Consumers
 * should import from this barrel to access components, engine utilities, directives, helpers,
 * and i18n loaders provided by the library.
 *
 * @link {@link ForAngularCommonModule}
 */
import '@decaf-ts/ui-decorators';
export * from './components';
export * from './engine';
export * from './directives';
export * from './utils';
export * from './services';
export * from './i18n/Loader';
export * from './for-angular-common.module';
/**
 * @description Angular integration for the Decaf framework
 * @summary This module provides Angular components and services for integrating with the Decaf framework.
 * It includes components for rendering models, CRUD operations, and form handling, as well as
 * rendering engines and utility functions to facilitate Angular application development with Decaf.
 * @module for-angular
 */
