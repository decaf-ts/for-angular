import { apply, metadata } from '@decaf-ts/decoration';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { AngularEngineKeys } from './constants';
import { Constructor, Metadata } from '@decaf-ts/decoration';
import { InternalError } from '@decaf-ts/db-decorators';
import { reflectComponentType, Type } from '@angular/core';
import { Model } from '@decaf-ts/decorator-validation';
import {
  ModelService,
  Repository as CoreRepository,
  Service as CoreService,
} from '@decaf-ts/core';

/**
 * @description Marks an Angular component as dynamically loadable
 * @summary Decorator that registers an Angular component with the NgxRenderingEngine for dynamic loading.
 * This decorator must be applied before the @Component decorator to properly extract component metadata.
 * It adds metadata to the component class and registers it with the rendering engine using its selector.
 * @function Dynamic
 * @return {Function} A decorator function that can be applied to Angular component classes
 * @mermaid
 * sequenceDiagram
 *   participant C as Component Class
 *   participant D as Dynamic Decorator
 *   participant R as NgxRenderingEngine
 *   participant M as Angular Metadata
 *   C->>D: Apply decorator
 *   D->>M: reflectComponentType()
 *   M-->>D: Return component metadata
 *   alt No metadata found
 *     D->>D: Throw InternalError
 *   else Metadata found
 *     D->>R: registerComponent(selector, constructor)
 *     D->>C: Apply metadata
 *   end
 * @category Decorators
 */
export function Dynamic() {
  return apply(
    (original: object) => {
      const metadata = reflectComponentType(original as Type<unknown>);

      if (!metadata)
        throw new InternalError(`Could not find Component metadata. @Dynamic decorator must come above @Component`);

      NgxRenderingEngine.registerComponent(metadata.selector, original as unknown as Constructor<unknown>);
    },
    metadata(Metadata.key(AngularEngineKeys.REFLECT, AngularEngineKeys.DYNAMIC), true)
  );
}

function isModelConstructor(value: unknown): value is Constructor<any> {
  return typeof value === 'function' && value.prototype instanceof Model;
}

/**
 * @description Resolves a decaf {@link CoreService} or {@link ModelService} for use as an Angular property initializer.
 * @summary Angular analogue of for-nest's `@Service()` parameter decorator, adapted to Angular's `inject()` property
 * initializer pattern (e.g. `private svc = injectService(MyService)`). Resolves from decaf's `Injectables` registry
 * rather than Angular's DI tree, so no Angular provider registration is required.
 *
 * - `injectService(SomeModel)` returns the `ModelService<SomeModel>` singleton via {@link ModelService.forModel}.
 * - `injectService(SomeServiceClass)` or `injectService('alias')` returns the matching decaf {@link CoreService}
 *   via {@link CoreService.get}.
 *
 * @example
 * ```typescript
 * @Component({ template: '' })
 * class ProductComponent {
 *   private modelService = injectService(Product);
 *   private authService = injectService(AuthService);
 *   private aliasService = injectService('auth');
 * }
 * ```
 * @function injectService
 * @param key the model class (resolves a `ModelService`), service class, or alias string to resolve.
 * @return the resolved `ModelService<M>` when `key` is a Model class, otherwise the registered `Service` instance.
 * @category Decorators
 */
export function injectService<M extends Model<boolean>>(
  model: Constructor<M>
): ModelService<M>;
export function injectService<S extends CoreService>(
  service: Constructor<S>
): S;
export function injectService<S extends CoreService>(alias: string): S;
export function injectService(key: string | Constructor<any>): any {
  if (key == null)
    throw new InternalError(
      `injectService() requires a model class, service class, or alias string`
    );
  if (typeof key === 'string') return CoreService.get(key);
  if (isModelConstructor(key)) return ModelService.forModel(key);
  return CoreService.get(key);
}

/**
 * @description Resolves a decaf {@link CoreRepository} for a Model for use as an Angular property initializer.
 * @summary Angular analogue of for-nest's `@Repository()` parameter decorator, adapted to Angular's `inject()`
 * property initializer pattern (e.g. `private repo = injectRepository(Product)`). Resolves via
 * {@link CoreRepository.forModel} from decaf's registry rather than Angular's DI tree.
 *
 * @example
 * ```typescript
 * @Component({ template: '' })
 * class ProductComponent {
 *   private repo = injectRepository(Product);
 *   private pgRepo = injectRepository(Product, 'postgres');
 * }
 * ```
 * @function injectRepository
 * @param model the Model class to resolve a repository for.
 * @param flavour optional adapter flavour/alias, forwarded to {@link CoreRepository.forModel}.
 * @return the resolved {@link CoreRepository} instance for `model`.
 * @category Decorators
 */
export function injectRepository<M extends Model<boolean>>(
  model: Constructor<M>,
  flavour?: string
): CoreRepository<M, any> {
  if (model == null)
    throw new InternalError(`injectRepository() requires a model class`);
  return CoreRepository.forModel(model, flavour);
}
