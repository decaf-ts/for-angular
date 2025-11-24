import { apply, metadata } from '@decaf-ts/decoration';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { AngularEngineKeys } from './constants';
import { Constructor, Metadata } from '@decaf-ts/decoration';
import { InternalError } from '@decaf-ts/db-decorators';
import { reflectComponentType, Type } from '@angular/core';

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
        throw new InternalError(
          `Could not find Component metadata. @Dynamic decorator must come above @Component`
        );

      NgxRenderingEngine.registerComponent(
        metadata.selector,
        original as unknown as Constructor<unknown>
      );
    },
    metadata(
      Metadata.key(AngularEngineKeys.REFLECT, AngularEngineKeys.DYNAMIC),
      true
    )
  );
}


//  export interface UICustomEvents {
//   render: () => HandlerLike;
//   init: () => FunctionLike;
//  }

// export function uion(event: string, handler: FunctionLike) {
//   return (target: any, propertyKey?: any) => {
//     const metadata = {
//       [event]: handler,
//     };
//     propMetadata(getUIAttributeKey(propertyKey, 'handlers'), metadata)(
//       target,
//       propertyKey
//     );
//   };
//   // return (model: unknown, property: unknown) => {
//   //   const meta: UIHandlerMetadata = {
//   //     [event]: handler,
//   //   };
//   //   return metadata(
//   //     getUIAttributeKey(property as string, 'on'),
//   //     meta
//   //   )(model, property);
//   // };
// }


// export function uionrender(handler: FunctionLike) {
//   return uion("render", handler);
// }

// @uion(op, handler)

// @uionrender(handler){
// return uion("redenr", handler)
// }
