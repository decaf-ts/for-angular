import { EnvironmentProviders, provideEnvironmentInitializer, Provider } from '@angular/core';
import { Repository } from '@decaf-ts/core';
import { Constructor, Metadata, uses } from '@decaf-ts/decoration';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { Logger, Logging } from '@decaf-ts/logging';
import { AnimationController, provideIonicAngular } from '@ionic/angular/standalone';
import { getOnWindow, getWindowDocument, setOnWindow } from '../utils/helpers';
import { NgxComponentDirective } from './NgxComponentDirective';
import { DB_ADAPTER_FLAVOUR_TOKEN, DB_ADAPTER_PROVIDER_TOKEN } from './constants';
import { IRepositoryModelProps } from './interfaces';
import { DecafRepository, FunctionLike, KeyValue } from './types';

export function getDbAdapterFlavour(): string {
  return (getOnWindow(DB_ADAPTER_FLAVOUR_TOKEN) || '') as string;
}

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
export function provideDecafDynamicComponents(...components: unknown[]): Constructor<unknown>[] {
  return components as Constructor<unknown>[];
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
export function getModelAndRepository<M extends Model>(
  model: M | string,
  clazz?: NgxComponentDirective
): IRepositoryModelProps<Model> | undefined {
  if (!model) return undefined;
  try {
    const modelName = (typeof model === Primitives.STRING ? model : (model as Model).constructor.name) as string;
    const constructor = Model.get((modelName.charAt(0).toUpperCase() + modelName.slice(1)) as string);
    if (!constructor) return undefined;
    const dbAdapterFlavour = getOnWindow(DB_ADAPTER_FLAVOUR_TOKEN) || undefined;
    if (dbAdapterFlavour) uses(dbAdapterFlavour as string)(constructor);
    const repository = Repository.forModel(constructor);
    model = new constructor() as M;
    const pk = Model.pk(repository.class as Constructor<Model>);
    if (!pk) return undefined;
    const pkType = Metadata.type(repository.class, pk).name;
    if (clazz) {
      clazz.repository = repository as DecafRepository<Model>;
      clazz.model = model;
      clazz.pk = pk;
      clazz.pkType = Metadata.type(repository.class, pk).name;
    }
    return { repository, model, pk, pkType };
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
export function provideDecafDbAdapter<DbAdapter extends { flavour: string }>(
  clazz: Constructor<DbAdapter>,
  options: KeyValue = {},
  flavour?: string
): Provider {
  const adapter = new clazz(options);
  if (!flavour) flavour = adapter.flavour;
  getLogger(provideDecafDbAdapter).info(`Using ${adapter.constructor.name} ${flavour} as Db Provider`);
  setOnWindow(DB_ADAPTER_FLAVOUR_TOKEN, flavour);
  return {
    provide: DB_ADAPTER_PROVIDER_TOKEN,
    useValue: adapter,
  };
}

/**
 * Creates a custom page transition animation using the Ionic `AnimationController`.
 *
 * @param baseEl - The base HTML element for the animation.
 * @param opts - Optional parameters for the animation, including:
 *   - `enteringEl`: The HTML element that is entering the view.
 *   - `leavingEl`: The HTML element that is leaving the view.
 *
 * @returns An object containing the `navAnimation`, which is a composed animation
 *          of the entering and leaving animations.
 *
 * The entering animation fades in and slides the element upwards, while the leaving
 * animation fades out and slides the element downwards. Both animations use a cubic-bezier
 * easing function for smooth transitions.
 */
export const decafPageTransition = (baseEl: HTMLElement, opts?: KeyValue) => {
  const animationCtrl = new AnimationController();

  const enteringAnimation = animationCtrl
    .create()
    .addElement(opts?.['enteringEl'])
    .duration(280)
    .easing('cubic-bezier(0.36,0.66,0.04,1)')
    .fromTo('opacity', '0.01', '1')
    .fromTo('transform', 'translateY(40px)', 'translateY(0)');

  const leavingAnimation = animationCtrl
    .create()
    .addElement(opts?.['leavingEl'])
    .duration(200)
    .easing('cubic-bezier(0.36,0.66,0.04,1)')
    .fromTo('opacity', '1', '0')
    .fromTo('transform', 'translateY(0)', 'translateY(20px)');

  return animationCtrl.create().addAnimation([enteringAnimation, leavingAnimation]);
};

export function provideDecafPageTransition(): EnvironmentProviders {
  return provideIonicAngular({
    navAnimation: decafPageTransition,
  });
}

export function provideDecafDarkMode(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const doc = getWindowDocument();
    doc?.documentElement.classList.add('has-dark-mode');
  });
}

/**
 * @const {Logger}
 * @private
 * @description Base logger instance for the for-angular module.ẑ
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
