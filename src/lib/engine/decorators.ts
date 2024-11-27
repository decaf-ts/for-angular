import { apply, metadata } from '@decaf-ts/reflection';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { AngularEngineKeys } from './constants';
import { Constructor } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { ComponentMetadata } from './types';

export function Dynamic() {
  return apply(
    (original: object) => {
      const annotation = Object.getOwnPropertyDescriptor(
        original,
        AngularEngineKeys.ANNOTATIONS,
      );
      if (!annotation || !annotation.value)
        throw new InternalError(
          `Could not find Component metadata. @Dynamic decorator must come above @Component`,
        );
      const decorator: ComponentMetadata = annotation.value[0];
      NgxRenderingEngine.registerComponent(
        decorator.selector,
        original as unknown as Constructor<unknown>,
        decorator,
      );
    },
    metadata(NgxRenderingEngine.key(AngularEngineKeys.DYNAMIC), true),
  );
}
