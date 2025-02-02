import { RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularFieldDefinition, ComponentMetadata } from './types';
import { AngularEngineKeys } from './constants';
import { Constructor } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';

export class NgxRenderingEngine extends RenderingEngine<AngularFieldDefinition> {
  private static _components: Record<
    string,
    { constructor: Constructor<unknown>; metadata: ComponentMetadata }
  >;

  constructor() {
    super('angular');
  }

  override async initialize(...args: any[]): Promise<void> {
    if (this.initialized) return;
    // ValidatableByType[]
    this.initialized = true;
  }

  static registerComponent(
    name: string,
    constructor: Constructor<unknown>,
    metadata: ComponentMetadata,
  ) {
    if (!this._components) this._components = {};
    if (name in this._components)
      throw new InternalError(`Component already registered under ${name}`);
    this._components[name] = {
      constructor: constructor,
      metadata: metadata,
    };
  }

  static components(selector?: string) {
    if (!selector) return Object.values(this._components);
    if (!(selector in this._components))
      throw new InternalError(`No Component registered under ${selector}`);
    return this._components[selector];
  }

  static override key(key: string) {
    return `${AngularEngineKeys.REFLECT}${key}`;
  }
}
