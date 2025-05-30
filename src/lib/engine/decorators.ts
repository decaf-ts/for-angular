import { apply, metadata } from '@decaf-ts/reflection';
import { NgxRenderingEngine2 } from './NgxRenderingEngine2';
import { AngularEngineKeys } from './constants';
import { Constructor } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { reflectComponentType, Type } from '@angular/core';

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
