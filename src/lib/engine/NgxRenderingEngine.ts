import { FieldDefinition, RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularDynamicOutput, AngularFieldDefinition } from './types';
import { AngularEngineKeys } from './constants';
import { Constructor, Model } from '@decaf-ts/decorator-validation';
import { InternalError } from '@decaf-ts/db-decorators';
import {
  Injector,
  reflectComponentType,
  TemplateRef,
  Type,
  ViewContainerRef,
} from '@angular/core';

/**
 * @description Angular implementation of the RenderingEngine
 * @summary This class extends the base RenderingEngine to provide Angular-specific rendering capabilities.
 * It handles the conversion of field definitions to Angular components and manages component registration.
 * @template AngularFieldDefinition - Type for Angular-specific field definitions
 * @template AngularDynamicOutput - Type for Angular-specific component output
 * @param {Injector} injector - Angular injector for dependency injection
 * @param {ViewContainerRef} vcr - View container reference for component creation
 * @param {TemplateRef<any>} tpl - Template reference for content projection
 * @class NgxRenderingEngine
 * @example
 * ```typescript
 * const engine = new NgxRenderingEngine();
 * engine.initialize();
 * const output = engine.render(myModel, {}, viewContainerRef, injector, templateRef);
 * ```
 * @mermaid
 * sequenceDiagram
 *   participant Client
 *   participant Engine as NgxRenderingEngine
 *   participant Components as RegisteredComponents
 *
 *   Client->>Engine: new NgxRenderingEngine()
 *   Client->>Engine: initialize()
 *   Client->>Engine: render(model, props, vcr, injector, tpl)
 *   Engine->>Engine: toFieldDefinition(model, props)
 *   Engine->>Engine: fromFieldDefinition(fieldDef, vcr, injector, tpl)
 *   Engine->>Components: components(fieldDef.tag)
 *   Components-->>Engine: component constructor
 *   Engine->>Client: return AngularDynamicOutput
 */
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

  /**
   * @description Converts a field definition to an Angular component output
   * @summary This private method takes a field definition and creates the corresponding Angular component.
   * It handles component instantiation, input property mapping, and child component rendering.
   * @param {FieldDefinition<AngularFieldDefinition>} fieldDef - The field definition to convert
   * @param {ViewContainerRef} vcr - The view container reference for component creation
   * @param {Injector} injector - The Angular injector for dependency injection
   * @param {TemplateRef<any>} tpl - The template reference for content projection
   * @return {AngularDynamicOutput} The Angular component output with component reference and inputs
   * @mermaid
   * sequenceDiagram
   *   participant Method as fromFieldDefinition
   *   participant Components as NgxRenderingEngine.components
   *   participant Angular as Angular Core
   *
   *   Method->>Components: components(fieldDef.tag)
   *   Components-->>Method: component constructor
   *   Method->>Angular: reflectComponentType(component)
   *   Angular-->>Method: componentMetadata
   *   Method->>Method: Check input properties
   *   Method->>Method: Create result object
   *   Method->>Method: Process children if any
   *   Method-->>Caller: return AngularDynamicOutput
   */
  private fromFieldDefinition(
    fieldDef: FieldDefinition<AngularFieldDefinition>,
    vcr: ViewContainerRef,
    injector: Injector,
    tpl: TemplateRef<any>,
  ): AngularDynamicOutput {
    const component = NgxRenderingEngine.components(fieldDef.tag)
      .constructor as unknown as Type<unknown>;

    const componentMetadata = reflectComponentType(component);
    if (!componentMetadata) {
      throw new InternalError(
        `Metadata for component ${fieldDef.tag} not found.`,
      );
    }
    const inputs = fieldDef.props;

    const possibleInputs = componentMetadata.inputs;
    const inputKeys = Object.keys(inputs);
    for (const input of possibleInputs) {
      const index = inputKeys.indexOf(input.propName);
      if (index !== -1) {
        inputKeys.splice(index, 1);
      }
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

    if (fieldDef.rendererId) {
      (result.inputs as Record<string, any>)['rendererId'] =
        fieldDef.rendererId;
    }

    if (fieldDef.children && fieldDef.children.length) {
      result.children = fieldDef.children.map((child) => {
        return this.fromFieldDefinition(child, vcr, injector, tpl);
      });

      const template = vcr.createEmbeddedView(tpl, injector).rootNodes;
      result.content = [template];
    }

    return result;
  }

  /**
   * @description Renders a model into an Angular component output
   * @summary This method takes a model and converts it to an Angular component output.
   * It first converts the model to a field definition using the base RenderingEngine's
   * toFieldDefinition method, then converts that field definition to an Angular component output.
   * @template M - Type extending Model
   * @param {M} model - The model to render
   * @param {Record<string, unknown>} globalProps - Global properties to pass to the component
   * @param {ViewContainerRef} vcr - The view container reference for component creation
   * @param {Injector} injector - The Angular injector for dependency injection
   * @param {TemplateRef<any>} tpl - The template reference for content projection
   * @return {AngularDynamicOutput} The Angular component output with component reference and inputs
   * @mermaid
   * sequenceDiagram
   *   participant Client as Client Code
   *   participant Render as render method
   *   participant ToField as toFieldDefinition
   *   participant FromField as fromFieldDefinition
   *
   *   Client->>Render: render(model, globalProps, vcr, injector, tpl)
   *   Render->>ToField: toFieldDefinition(model, globalProps)
   *   ToField-->>Render: fieldDef
   *   Render->>FromField: fromFieldDefinition(fieldDef, vcr, injector, tpl)
   *   FromField-->>Render: AngularDynamicOutput
   *   Render-->>Client: return AngularDynamicOutput
   */
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

  /**
   * @description Initializes the rendering engine
   * @summary This method initializes the rendering engine. It checks if the engine is already initialized
   * and sets the initialized flag to true. This method is called before the engine is used.
   * @param {...any[]} args - Initialization arguments
   * @return {Promise<void>} A promise that resolves when initialization is complete
   */
  override async initialize(...args: any[]): Promise<void> {
    if (this.initialized) return;
    // ValidatableByType[]
    this.initialized = true;
  }

  /**
   * @description Registers a component with the rendering engine
   * @summary This static method registers a component constructor with the rendering engine
   * under a specific name. It throws an error if a component is already registered under the same name.
   * @param {string} name - The name to register the component under
   * @param {Constructor<unknown>} constructor - The component constructor
   * @return {void}
   */
  static registerComponent(name: string, constructor: Constructor<unknown>) {
    if (!this._components) this._components = {};
    if (name in this._components)
      throw new InternalError(`Component already registered under ${name}`);
    this._components[name] = {
      constructor: constructor,
    };
  }

  /**
   * @description Retrieves registered components from the rendering engine
   * @summary This static method retrieves either all registered components or a specific component
   * by its selector. It throws an error if the requested component is not registered.
   * @param {string} [selector] - Optional selector to retrieve a specific component
   * @return {Object|Array} Either a specific component or an array of all components
   */
  static components(selector?: string) {
    if (!selector) return Object.values(this._components);
    if (!(selector in this._components))
      throw new InternalError(`No Component registered under ${selector}`);
    return this._components[selector];
  }

  /**
   * @description Generates a key for reflection metadata
   * @summary This static method generates a key for reflection metadata by prefixing the input key
   * with the Angular engine's reflection prefix. This is used for storing and retrieving metadata.
   * @param {string} key - The base key to prefix
   * @return {string} The prefixed key for reflection metadata
   */
  static override key(key: string) {
    return `${AngularEngineKeys.REFLECT}${key}`;
  }
}
