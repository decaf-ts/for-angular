import { FieldDefinition, RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularDynamicOutput, AngularFieldDefinition, KeyValue } from './types';
import { AngularEngineKeys } from './constants';
import { Constructor, Model } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import {
  ComponentMirror,
  ComponentRef,
  EnvironmentInjector,
  Injector,
  reflectComponentType,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';
import { FormGroupEngine } from './FormGroupEngine';

export class NgxRenderingEngine2 extends RenderingEngine<AngularFieldDefinition, AngularDynamicOutput> {

  private static _components: Record<string, { constructor: Constructor<unknown> }>;

  // private _componentName!: string;
  // private _childs!: AngularDynamicOutput[];
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
    const cmp = (fieldDef as any)?.component || NgxRenderingEngine2.components(fieldDef.tag);
    const component = (cmp.constructor) as unknown as Type<unknown>;

    const componentMetadata = reflectComponentType(component);
    if (!componentMetadata)
      throw new InternalError(`Metadata for component ${fieldDef.tag} not found.`);

    const { inputs: possibleInputs } = componentMetadata;
    const inputs = fieldDef.props;
    const unmappedKeys = Object.keys(inputs).filter((input) => {
      const isMapped = possibleInputs.find(({ propName }) => propName === input);
      if (!isMapped)
        delete inputs[input];
      return !isMapped;
    });

    if (unmappedKeys.length > 0)
      console.warn(`Unmapped input properties for component ${fieldDef.tag}: ${unmappedKeys.join(', ')}`);

    const result: AngularDynamicOutput = {
      component: component,
      inputs: inputs || {},
      injector: injector,
    };

    if (fieldDef.rendererId)
      (result.inputs as Record<string, any>)['rendererId'] = fieldDef.rendererId;

    if (fieldDef.children && fieldDef.children.length) {
      const self = this;

      const processChild = (child: FieldDefinition<AngularFieldDefinition>): unknown => {
        if (!child?.tag)
          return child;

        const childResult = self.fromFieldDefinition(child, vcr, injector, tpl);
        if (childResult?.children && childResult.children.length)
          return (childResult.children || []).map(processChild as any);

        // if (child?.children && child.children.length)
        //   return child.children.map(processChild);

        return childResult;
      };

      result.children = (fieldDef.children.map(processChild) as any).flat() as AngularDynamicOutput[];
      vcr.clear();
      const template = vcr.createEmbeddedView(tpl, injector).rootNodes;
      const componentInstance = NgxRenderingEngine2.createComponent(
        component,
        { ...inputs, ...{ model: this._model } },
        componentMetadata,
        vcr,
        injector,
        template,
      );
      result.instance = NgxRenderingEngine2._instance = componentInstance.instance as Type<unknown>;
    }

    return result;
  }

  static createComponent(component: Type<unknown>, inputs: KeyValue = {}, metadata: ComponentMirror<unknown>, vcr: ViewContainerRef, injector: Injector, template: any): ComponentRef<unknown> {
    const componentInstance = vcr.createComponent(component as Type<unknown>, {
      environmentInjector: injector as EnvironmentInjector,
      projectableNodes: [template || []],
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


    const formId = result!.inputs!['rendererId'] as string;
    // result!.children!.forEach((c) => {
    //   c.inputs!['formGroup'] = NgxFormService.fromProps(
    //     c.inputs as any,
    //     c.inputs!['updateMode'] as FieldUpdateMode || 'change',
    //     formId,
    //   );
    // });

    const formGroupResult = FormGroupEngine.buildFormFromComponents(result!.children! as any);
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
        if (typeof value === 'object' && !!value)
          return parseInputValue(component, value);
        component.setInput(key, value);
      });
    }

    Object.entries(inputs).forEach(([key, value]) => {
      const prop = metadata.inputs.find((item: { propName: string }) => item.propName === key);
      if (prop) {
        if (key === 'props')
          parseInputValue(component, value);
        // if(key === 'locale' && !value)
        //   value = getLocaleFromClassName(this._componentName);
        component.setInput(key, value);
      }
    });
  }
}
