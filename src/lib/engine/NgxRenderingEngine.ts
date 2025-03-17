import { FieldDefinition, RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularDynamicOutput, AngularFieldDefinition } from './types';
import { AngularEngineKeys } from './constants';
import { Constructor, Model } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import { Injector, TemplateRef, Type, ViewContainerRef } from '@angular/core';

export class NgxRenderingEngine extends RenderingEngine<
  AngularFieldDefinition,
  AngularDynamicOutput
> {
  private static _components: Record<
    string,
    { constructor: Constructor<unknown> }
  >;

  constructor() {
    super('angular');
  }

  override render<M extends Model>(
    model: M,
    globalProps: Record<string, unknown>,
    vcr: ViewContainerRef,
    injector: Injector,
    tpl: TemplateRef<any>,
  ): AngularDynamicOutput {
    function fromFieldDefinition(
      fieldDef: FieldDefinition<AngularFieldDefinition>,
      i?: number,
    ): AngularDynamicOutput {
      let component, inputs;

      component = NgxRenderingEngine.components(fieldDef.tag)
        .constructor as unknown as Type<unknown>;
      inputs = fieldDef.props;

      const result: AngularDynamicOutput = {
        component: component,
        inputs: inputs,
        injector: injector,
      };

      if (fieldDef.children && fieldDef.children.length) {
        result.content = [tpl.createEmbeddedView(null, injector).rootNodes];
        result.children = fieldDef.children.map((child, index) => {
          return fromFieldDefinition(child, index);
        });
      }

      return result;
    }

    let result: AngularDynamicOutput;
    try {
      result = fromFieldDefinition(this.toFieldDefinition(model, globalProps));
    } catch (e: unknown) {
      throw new InternalError(
        `Failed to render Model ${model.constructor.name}: ${e}`,
      );
    }

    return result;
  }

  override async initialize(...args: any[]): Promise<void> {
    if (this.initialized) return;
    // ValidatableByType[]
    this.initialized = true;
  }

  static registerComponent(name: string, constructor: Constructor<unknown>) {
    if (!this._components) this._components = {};
    if (name in this._components)
      throw new InternalError(`Component already registered under ${name}`);
    this._components[name] = {
      constructor: constructor,
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
