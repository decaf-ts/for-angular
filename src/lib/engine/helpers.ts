import { Constructor, Metadata } from '@decaf-ts/decoration';
import { Model, Primitives } from '@decaf-ts/decorator-validation';
import { Logger, Logging } from '@decaf-ts/logging';
import { getOnWindow } from '../utils/helpers';
import { NgxComponentDirective } from './NgxComponentDirective';
import { DB_ADAPTER_FLAVOUR_TOKEN, DB_ADAPTER_PROVIDER_TOKEN } from './constants';
import { injectRepository } from './decorators';
import { IRepositoryModelProps } from './interfaces';
import { getDbAdapterEnvInjector } from './providers';
import { DecafRepository, FunctionLike } from './types';

/**
 * @description Resolves the currently registered db adapter's flavour.
 * @summary Prefers the real DI token (via the injector {@link provideDecafDbAdapter} captures
 * at bootstrap); falls back to the `window` global for callers that run before Angular
 * bootstraps (e.g. Storybook's app config).
 * @return {string} The active db adapter flavour, or an empty string if none is registered yet.
 * @memberOf module:lib/for-angular-common.module
 */
export function getDbAdapterFlavour(): string {
  const adapter = getDbAdapterEnvInjector()?.get(DB_ADAPTER_PROVIDER_TOKEN, null);
  return (adapter?.flavour ?? getOnWindow(DB_ADAPTER_FLAVOUR_TOKEN) ?? '') as string;
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
    const dbAdapterFlavour = getDbAdapterFlavour();
    const repository = injectRepository(constructor, dbAdapterFlavour);
    model = new constructor() as M;
    const pk = Model.pk(repository.class as Constructor<Model>);
    if (!pk) return undefined;
    const pkType = Metadata.type(repository.class, pk).name;
    if (clazz) {
      clazz.repository = repository as DecafRepository<Model>;
      clazz.model = model;
      clazz.pk = pk;
      clazz.modelName = modelName;
      clazz.pkType = Metadata.type(repository.class, pk).name;
    }
    return { repository, model, pk, pkType };
  } catch (error: unknown) {
    getLogger(getModelAndRepository).warn((error as Error)?.message || (error as string));
    return undefined;
  }
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
