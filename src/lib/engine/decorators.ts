import { apply, metadata } from '@decaf-ts/reflection';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { AngularEngineKeys } from './constants';
import { Constructor } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { ComponentMetadata } from './types';
import { reflectComponentType, Type } from '@angular/core';

export function Dynamic() {
  return apply(
    (original: object) => {
      const metadata = reflectComponentType(original as Type<unknown>);

      if (!metadata)
        throw new InternalError(
          `Could not find Component metadata. @Dynamic decorator must come above @Component`,
        );

      NgxRenderingEngine.registerComponent(
        metadata.selector,
        original as unknown as Constructor<unknown>,
      );
    },
    metadata(NgxRenderingEngine.key(AngularEngineKeys.DYNAMIC), true),
  );
}
