/**
 * @module lib/for-angular-common.module
 * @description Core Angular module and providers for Decaf's for-angular package.
 * @summary Provides the shared Angular module, injection tokens and helper functions used
 * by the for-angular integration. This module wires up common imports (forms, translation)
 * and exposes helper providers such as DB adapter registration and logger utilities.
 * @link {@link ForAngularCommonModule}
 */
import {
  NgModule,
  ModuleWithProviders,
  InjectionToken,
  Provider,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslatePipe } from '@ngx-translate/core';
import { Logger, Logging } from '@decaf-ts/logging';
import { I18nToken } from './engine/interfaces';
import { getOnWindow, getWindow } from './utils/helpers';
import {
  DecafRepository,
  FunctionLike,
  DecafRepositoryAdapter,
  KeyValue,
} from './engine/types';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { Repository } from '@decaf-ts/core';
import { Constructor, uses } from '@decaf-ts/decoration';

export const DB_ADAPTER_PROVIDER = 'DB_ADAPTER_PROVIDER';
/**
 * @description Injection token for registering the database adapter provider.
 * @summary Used to inject the database adapter instance that implements DecafRepositoryAdapter.
 * This token allows the framework to locate and use the application's specific database implementation.
 * @const {InjectionToken<DecafRepositoryAdapter>}
 * @memberOf module:lib/for-angular-common.module
 */
export const DB_ADAPTER_PROVIDER_TOKEN =
  new InjectionToken<DecafRepositoryAdapter>('DB_ADAPTER_PROVIDER_TOKEN');
/**
 * @description Injection token for the root path of locale translation files.
 * @summary Used to configure the base path where i18n translation files are located.
 * This allows the translation loader to locate JSON files for different languages.
 * @const {InjectionToken<string>}
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Typical usage when providing the token
 * { provide: LOCALE_ROOT_TOKEN, useValue: './assets/i18n/' }
 */
export const LOCALE_ROOT_TOKEN = new InjectionToken<string>(
  'LOCALE_ROOT_TOKEN'
);

/* Generic token for injecting on class constructors */
/**
 * @description Generic injection token for providing arbitrary values to constructors.
 * @summary Used to inject classes, strings, or any other value into component or service constructors.
 * This is a flexible token that can be used to provide any type of dependency when more specific
 * tokens are not appropriate. The actual type and purpose of the injected value is determined by
 * the provider configuration.
 * @const {InjectionToken<unknown>}
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Inject a string value
 * { provide: CPTKN, useValue: 'some-config-value' }
 *
 * // Inject a class
 * { provide: CPTKN, useClass: MyService }
 *
 * // Inject any arbitrary value
 * { provide: CPTKN, useValue: { key: 'value', data: [1, 2, 3] } }
 */
export const CPTKN = new InjectionToken<unknown>('CPTKN', {
  providedIn: 'root',
  factory: () => '',
});

/**
 * @description Injection token for i18n resource configuration.
 * @summary Used to provide configuration for internationalization resources, including
 * translation file locations and supported languages. This token configures how the
 * application loads and manages translation resources.
 * @const {InjectionToken<I18nToken>}
 * @memberOf module:lib/for-angular-common.module
 */
export const I18N_CONFIG_TOKEN = new InjectionToken<I18nToken>(
  'I18N_CONFIG_TOKEN'
);

/**
 * @description Provides an array of component types for dynamic rendering.
 * @summary Helper function to package component constructors for registration with the
 * rendering engine. This function accepts component classes and returns them as an array
 * suitable for use with the CPTKN injection token.
 * @param {...Constructor[]} components - Component constructor classes to register
 * @return {Constructor} Array of component constructors
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Register multiple custom components
 * providers: [
 *   { provide: CPTKN, useValue: provideDynamicComponents(MyComponent, AnotherComponent) }
 * ]
 */
export function provideDynamicComponents(
  ...components: Constructor<unknown>[]
): Constructor<unknown>[] {
  return components;
}

/**
 * @description Retrieves the repository instance for a given model.
 * @summary Creates or retrieves a DecafRepository instance for the specified model. This function
 * resolves the model by name or class, locates the registered database adapter, and returns
 * a fully initialized repository instance for performing CRUD operations.
 * @param {Model | string} model - The model class or model name string
 * @return {DecafRepository<Model>} Repository instance for the model
 * @throws {InternalError} If model is not found or not registered with @model decorator
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Get repository by model class
 * const userRepo = getModelAndRepository(User);
 *
 * // Get repository by model name
 * const productRepo = getModelAndRepository('Product');
 *
 * // Use repository for queries
 * const users = await userRepo.findAll();
 */
export function getModelAndRepository(
  model: Model | string
): {repository: DecafRepository<Model>, model: Model} | undefined {
  try {
    const modelName = (
      typeof model === Primitives.STRING
        ? model
        : (model as Model).constructor.name
    ) as string;
    const constructor = Model.get(
      (modelName.charAt(0).toUpperCase() + modelName.slice(1)) as string
    );
    if (!constructor)
      return undefined;
    const dbAdapterFlavour = getOnWindow(DB_ADAPTER_PROVIDER) || undefined;
    if (dbAdapterFlavour) uses(dbAdapterFlavour as string)(constructor);
    const repository = Repository.forModel(constructor);
    model = new constructor() as Model;
    if(!repository.pk)
      return undefined;
    return {repository, model};
  } catch (error: unknown) {
   getLogger(getModelAndRepository).warn((error as Error)?.message || (error as string));
   return undefined;
  }
}

/**
 * @description Provides a database adapter for dependency injection.
 * @summary Creates an Angular provider that registers a database adapter instance. This function
 * instantiates the adapter class, registers its flavour globally, and returns a provider object
 * for use in Angular's dependency injection system.
 * @template DbAdapter - The database adapter class type extending {flavour: string}
 * @param {Constructor<DbAdapter>} adapterClass - Database adapter constructor class
 * @param {KeyValue} [options={}] - Configuration options passed to adapter constructor
 * @param {string} [flavour] - Optional flavour override; uses adapter.flavour if not provided
 * @return {Provider} Angular provider object for DB_ADAPTER_PROVIDER_TOKEN
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Register a SQLite adapter
 * providers: [
 *   provideDbAdapter(SqliteAdapter, { database: 'myapp.db' }, 'sqlite')
 * ]
 *
 * // Register with default flavour from adapter
 * providers: [
 *   provideDbAdapter(PostgresAdapter, { host: 'localhost', port: 5432 })
 * ]
 */
export function provideDbAdapter<DbAdapter extends { flavour: string }>(
  adapterClass: Constructor<DbAdapter>,
  options: KeyValue = {},
  flavour?: string
): Provider {
  const adapter = new adapterClass(options);
  if (flavour) flavour = adapter.flavour;
  // Log and expose adapter flavour globally
  getLogger(provideDbAdapter).info(
    `Using ${adapter.constructor.name} ${flavour} as Db Provider`
  );
  getWindow()[DB_ADAPTER_PROVIDER] = flavour;
  return {
    provide: DB_ADAPTER_PROVIDER_TOKEN,
    useValue: adapter,
  };
}

/**
 * @const {Logger}
 * @private
 * @description Base logger instance for the for-angular module.
 * @memberOf module:lib/for-angular-common.module
 */
const log = Logging.for('for-angular');

/**
 * @description Retrieves a logger instance for the given context.
 * @summary Creates or retrieves a namespaced logger instance using the Decaf logging system.
 * The logger is automatically namespaced under "for-angular" and can be further scoped
 * to a specific instance, function, or string identifier.
 * @param {string | FunctionLike | unknown} instance - The instance, function, or string to scope the logger to
 * @return {Logger} Logger instance for the specified context
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // Get logger for a class
 * const logger = getLogger(MyComponent);
 * logger.info('Component initialized');
 *
 * // Get logger with string identifier
 * const serviceLogger = getLogger('UserService');
 * serviceLogger.error('Operation failed', error);
 */
export function getLogger(instance: string | FunctionLike | unknown): Logger {
  return log.for(instance as string | FunctionLike);
}

const CommonModules = [
  CommonModule,
  FormsModule,
  ReactiveFormsModule,
  TranslateModule,
  TranslatePipe,
];

/**
 * @description Main Angular module for the Decaf framework.
 * @summary The ForAngularCommonModule provides the core functionality for integrating Decaf with Angular applications.
 * It imports and exports common Angular and Ionic components and modules needed for Decaf applications,
 * including form handling, translation support, and Ionic UI components. This module can be imported
 * directly or via the forRoot() method for proper initialization in the application's root module.
 * @class ForAngularCommonModule
 * @memberOf module:lib/for-angular-common.module
 * @example
 * // In your app module:
 * @NgModule({
 *   imports: [
 *     ForAngularCommonModule.forRoot(),
 *     // other imports
 *   ],
 *   // ...
 * })
 * export class AppModule {}
 */
@NgModule({
  imports: CommonModules,
  declarations: [],
  exports: CommonModules,
  schemas: [],
  providers: [],
})
export class ForAngularCommonModule {
  /**
   * @description Creates a module with providers for root module import.
   * @summary This static method provides the proper way to import the ForAngularCommonModule in the application's
   * root module. It returns a ModuleWithProviders object that includes the ForAngularCommonModule itself.
   * Using forRoot() ensures that the module and its providers are properly initialized and only
   * instantiated once in the application.
   * @return {ModuleWithProviders<ForAngularCommonModule>} The module with its providers
   * @memberOf ForAngularCommonModule
   * @static
   * @example
   * // Import in root module
   * @NgModule({
   *   imports: [ForAngularCommonModule.forRoot()],
   *   // ...
   * })
   * export class AppModule {}
   */
  static forRoot(): ModuleWithProviders<ForAngularCommonModule> {
    return {
      ngModule: ForAngularCommonModule,
    };
  }
}
