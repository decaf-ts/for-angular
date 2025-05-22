import { FieldDefinition, RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularDynamicOutput, AngularFieldDefinition, BaseCustomEvent, KeyValue } from './types';
import { AngularEngineKeys, ComponentsTagNames, EventConstants } from './constants';
import { Constructor, Model } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import {
  ComponentMirror,
  ComponentRef,
  EnvironmentInjector,
  inject,
  Injector,
  input,
  reflectComponentType,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { getLocaleFromClassName } from '../helpers/utils';
export class NgxRenderingEngine2 extends RenderingEngine<AngularFieldDefinition, AngularDynamicOutput> {

  private static _components: Record<string, { constructor: Constructor<unknown> }>;

  // private _componentName!: string;

  private _model!: Model;

  private static _instance: Type<unknown> | undefined;

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
    const unmappedKeys = [];
    for(let input of inputKeys) {
      if (!inputKeys.length)
        break;
      const prop = possibleInputs.find((item: {propName: string}) => item.propName === input);
      if(!prop) {
         delete inputs[input];
         unmappedKeys.push(input);
      }
    }
    if (unmappedKeys.length)
      console.warn(
        `Unmapped input properties for component ${fieldDef.tag}: ${unmappedKeys.join(', ')}`,
      );

    const result: AngularDynamicOutput = {
      component: component,
      inputs: inputs || {},
      injector: injector,
    };

    if (fieldDef.rendererId)
      (result.inputs as Record<string, any>)['rendererId'] = fieldDef.rendererId;
    if (fieldDef.children && fieldDef.children.length) {
      result.children = fieldDef.children.map((child) => this.fromFieldDefinition(child, vcr, injector, tpl));
      vcr.clear();
      const template = vcr.createEmbeddedView(tpl, injector).rootNodes;
      const componentInstance = NgxRenderingEngine2.createComponent(component, {... inputs, ... {model: this._model}}, componentMetadata, vcr, injector, template);
      result.instance = NgxRenderingEngine2._instance = componentInstance.instance as Type<unknown>;
    }
    return result;
  }

  static createComponent(component: Type<unknown>, inputs: KeyValue = {}, metadata: ComponentMirror<unknown>, vcr: ViewContainerRef, injector: Injector, template: any): ComponentRef<unknown> {
    const componentInstance = vcr.createComponent(component as Type<unknown>, {
      environmentInjector: injector as EnvironmentInjector,
      projectableNodes: [template || []]
    });
    this.setInputs(componentInstance, inputs, metadata);
    return componentInstance;
  }

  getDecorators(model: Model, globalProps: Record<string, unknown>) {
    return this.toFieldDefinition(model, globalProps);
  }

  static async destroy() {
    NgxRenderingEngine2._instance = undefined;
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
      this._model = model;
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

  static setInputs(component: ComponentRef<unknown>, inputs: KeyValue, metadata: ComponentMirror<unknown>): void {
    function parseInputValue(component: ComponentRef<unknown>, input: KeyValue) {
      Object.keys(input).forEach(key => {
        const value = input[key];
        if(typeof value === 'object' && !!value)
          return parseInputValue(component, value);
        component.setInput(key, value);
      });
    }
    Object.entries(inputs).forEach(([key, value]) => {
      const prop = metadata.inputs.find((item: {propName: string}) => item.propName === key);
      if(prop) {
        if(key === 'props')
          parseInputValue(component, value);
        // if(key === 'locale' && !value)
        //   value = getLocaleFromClassName(this._componentName);
        component.setInput(key, value);
      }
    });
  }
}
