import { FieldDefinition, RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularDynamicOutput, AngularFieldDefinition, KeyValue } from './types';
import { AngularEngineKeys } from './constants';
import { Constructor, Model } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import {
  ComponentMirror,
  ComponentRef,
  EnvironmentInjector,
  inject,
  Injector,
  reflectComponentType,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { getLocaleFromClassName } from '../helpers/utils';

export class NgxRenderingEngine2 extends RenderingEngine<AngularFieldDefinition, AngularDynamicOutput> {

  private static _components: Record<string, { constructor: Constructor<unknown> }>;

  private componentName!: string;

  constructor() {
    super('angular');
  }

  private fromFieldDefinition(
    fieldDef: FieldDefinition<AngularFieldDefinition>,
    vcr: ViewContainerRef,
    injector: Injector,
    tpl: TemplateRef<any>,
  ): AngularDynamicOutput {
    const component = NgxRenderingEngine2.components(fieldDef.tag)
      .constructor as unknown as Type<unknown>;


    const componentMetadata = reflectComponentType(component);
    if (!componentMetadata) {
      throw new InternalError(
        `Metadata for component ${fieldDef.tag} not found.`,
      );
    }

    const possibleInputs = componentMetadata.inputs;
    const inputs = fieldDef.props;
    const inputKeys = Object.keys(inputs);

    for (let input of possibleInputs) {
      const index = inputKeys.indexOf(input.propName);
      if (index !== -1)
        inputKeys.splice(index, 1);
      if (!inputKeys.length) break;
    }

    if (inputKeys.length)
      console.warn(
        `Unmapped input properties for component ${fieldDef.tag}: ${inputKeys.join(', ')}`,
      );

    const result: AngularDynamicOutput = {
      component: component,
      inputs: inputs || {},
      injector: injector,
    };

    if (fieldDef.rendererId)
      (result.inputs as Record<string, any>)['rendererId'] = fieldDef.rendererId;

    if (fieldDef.children && fieldDef.children.length) {
      result.children = fieldDef.children.map((child) => {
        return this.fromFieldDefinition(child, vcr, injector, tpl);
      });

      vcr.clear();
      const template = vcr.createEmbeddedView(tpl, injector).rootNodes;

      const componentInstance = vcr.createComponent(component as Type<unknown>, {
        environmentInjector: injector as EnvironmentInjector,
        projectableNodes: [template]
      });
      this.componentName = component.name;
      this.setInputs(componentInstance as ComponentRef<unknown>, inputs, componentMetadata)
      result.content = [template];
      result.instance = componentInstance.instance as Type<unknown>;
    }
    return result;
  }

  override render<M extends Model>(
    model: M,
    globalProps: Record<string, unknown>,
    vcr: ViewContainerRef,
    injector: Injector,
    tpl: TemplateRef<any>,
  ): AngularDynamicOutput {
    let result: AngularDynamicOutput;
    try {
      const fieldDef = this.toFieldDefinition(model, globalProps);
      result = this.fromFieldDefinition(fieldDef, vcr, injector, tpl);
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

  private setInputs(component: ComponentRef<unknown>, inputs: KeyValue, metadata: ComponentMirror<unknown>): void {
    function parseInputValue(component: ComponentRef<unknown>, input: KeyValue) {
      Object.keys(input).forEach(key => {
        const value = input[key];
        if(typeof value === 'object' && !!value)
          return parseInputValue(component, value);
        component.setInput(key, value);
      });
    }
    Object.entries(inputs).forEach(([key, value]) => {
      if(key === 'props')
        parseInputValue(component, value);
      if(key === 'locale' && !value)
        value = getLocaleFromClassName(this.componentName);
      component.setInput(key, value);
    });
  }
}
