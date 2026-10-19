/** @module for-angular/graph/utils/graphAngularServiceShare
 * @summary Bridges the decaf `@service()` wrapper with Angular's root provider registry (DECAF-50 §4.12).
 * @description The decaf `@service()` class decorator marks the service as a Decaf injectable and replaces the
 * exported constructor with a registry wrapper whose `__original` static points back to the original class.
 * Angular's `@Injectable({ providedIn: "root" })` decorator attaches its `ɵprov` provider definition to the class
 * it decorates, so when the Angular decorator runs first the registry wrapper ships to application code without
 * Angular DI metadata and `inject(Service)` fails with NG0201. This decorator is declared above `@service()` so
 * it applies to the final wrapper and copies the statically-compiled `ɵprov` definition from the wrapped original
 * onto the wrapper itself — the SAME definition object, never recomputed — so Angular's injector resolves both
 * token shapes to the identical root provider record. No `Injectable()` call happens at runtime: a runtime
 * `Injectable()` produces a JIT-compiled `ɵprov` that cannot be instantiated in an AOT bundle (where
 * `@angular/compiler` is not shipped), which would make the `/graph` route crash in every browser build. The
 * `__original` static therefore keeps the compiled definition for consumers that exercise the raw class directly
 * (test suites inject either shape and dedupe to the same instance through the shared definition).
 * @example
 * ```ts
 * @graphAngularServiceShare
 * @service()
 * @Injectable({ providedIn: "root" })
 * export class GraphNodeCatalogService { ... }
 * ```
 */
import { ModelKeys } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';

type AngularShareableConstructor = new (...args: never[]) => object;

/**
 * Copies Angular's statically-compiled root provider definition from a Decaf
 * `@service()` registry wrapper's original constructor onto the wrapper itself
 * (same definition object), so Angular's `inject()` resolves both shapes
 * without any runtime JIT compilation.
 */
export function graphAngularServiceShare<T extends AngularShareableConstructor>(target: T): T {
  const wrapper = target as unknown as Record<string, unknown>;
  const original = wrapper[ModelKeys.CONSTRUCTOR as string] as unknown as
    | (Record<string, unknown> & AngularShareableConstructor)
    | undefined;
  if (!original) {
    throw new InternalError('Decaf @service() wrapper is missing its `__original` static.');
  }
  const prov = original['ɵprov'];
  if (prov && !wrapper['ɵprov']) {
    wrapper['ɵprov'] = prov;
  }
  return target;
}
