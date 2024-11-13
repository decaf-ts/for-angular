import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition } from './types';
import { AngularEngineKeys } from './constants';
import { Constructor } from '@decaf-ts/decorator-validation';

export class NgxRenderingEngine extends RenderingEngine<AngularFieldDefinition> {
  private static _components: Record<string, Constructor<unknown>>;

  constructor(flavour = 'angular') {
    super(flavour);
  }

  override async initialize(...args: any[]): Promise<void> {
    if (this.initialized) return;

    this.initialized = true;
  }

  static registerComponent(constructor: Constructor<unknown>) {}

  static override key(key: string) {
    return `${AngularEngineKeys.REFLECT}${key}`;
  }
}
