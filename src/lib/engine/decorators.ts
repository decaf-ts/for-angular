import { apply, metadata } from '@decaf-ts/reflection';
import { NgxRenderingEngine } from './NgxRenderingEngine';
import { AngularEngineKeys } from './constants';
import { Constructor } from '@decaf-ts/decorator-validation';

export function Dynamic() {
  return apply(
    (original: object) =>
      NgxRenderingEngine.registerComponent(
        original as unknown as Constructor<unknown>,
      ),
    metadata(NgxRenderingEngine.key(AngularEngineKeys.DYNAMIC), true),
  );
}
