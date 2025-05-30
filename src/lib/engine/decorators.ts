import { apply, metadata } from '@decaf-ts/reflection';
import { NgxRenderingEngine2 } from './NgxRenderingEngine2';
import { AngularEngineKeys } from './constants';
import { Constructor } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { reflectComponentType, Type } from '@angular/core';

/**
 * @description Marks an Angular component as dynamically loadable
 * @summary Decorator that registers an Angular component with the NgxRenderingEngine2 for dynamic loading.
 * This decorator must be applied before the @Component decorator to properly extract component metadata.
 * It adds metadata to the component class and registers it with the rendering engine using its selector.
 * @function Dynamic
 * @return {Function} A decorator function that can be applied to Angular component classes
 * @mermaid
 * sequenceDiagram
 *   participant C as Component Class
 *   participant D as Dynamic Decorator
 *   participant R as NgxRenderingEngine2
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
        throw new InternalError(
          `Could not find Component metadata. @Dynamic decorator must come above @Component`
        );

      NgxRenderingEngine2.registerComponent(
        metadata.selector,
        original as unknown as Constructor<unknown>
      );
    },
    metadata(NgxRenderingEngine2.key(AngularEngineKeys.DYNAMIC), true)
  );
}
