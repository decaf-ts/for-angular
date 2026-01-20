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


//TODO: Create dynamic decorator to store props on parents and load on childs
// import { Input, signal } from '@angular/core';

// export function dynamic() {
//   return function (target: any, propertyKey: string) {

//     // Marca como Input automaticamente

//     // Armazena a lista de propriedades decoradas
//     if (!target.__initPropsList)
//       target.__initPropsList = [];

//     target.__initPropsList.push(propertyKey);

//     // Patch no ngOnInit apenas uma vez
//     if (!target.__initPropsPatched) {
//       target.__initPropsPatched = true;

//       const originalOnInit = target.ngOnInit;

//       target.ngOnInit = function () {

//         // Cria o signal __props no componente
//         this._props = signal({});

//         const collected: any = {};

//         // Coleta todas as propriedades decoradas
//         for (const key of this.__initPropsList) {
//           collected[key] = this[key];
//         }

//         // Atualiza o signal
//         this._props.set(collected);

//         // Chama o ngOnInit original, se existir
//         if (originalOnInit) {
//           originalOnInit.apply(this);
//         }
//       };
//     }
//   };
// }
