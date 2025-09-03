import { FieldDefinition, RenderingEngine } from '@decaf-ts/ui-decorators';
import { AngularDynamicOutput, AngularFieldDefinition, KeyValue } from './types';
import { AngularEngineKeys } from './constants';
import { Constructor, Model} from '@decaf-ts/decorator-validation';
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
import { NgxFormService } from './NgxFormService';

/**
 * @description Angular implementation of the RenderingEngine with enhanced features
 * @summary This class extends the base RenderingEngine to provide Angular-specific rendering capabilities
 * with additional features compared to NgxRenderingEngine. It handles the conversion of field definitions
 * to Angular components, manages component registration, and provides utilities for component creation
 * and input handling. This implementation uses Angular's newer component APIs.
 *
 * @template AngularFieldDefinition - Type for Angular-specific field definitions
 * @template AngularDynamicOutput - Type for Angular-specific component output
 *
 * @class NgxRenderingEngine2
 * @example
 * ```typescript
 * const engine = NgxRenderingEngine2.get();
 * engine.initialize();
 * const output = engine.render(myModel, {}, viewContainerRef, injector, templateRef);
 * ```
 *
 * @mermaid
 * sequenceDiagram
 *   participant Client
 *   participant Engine as NgxRenderingEngine2
 *   participant Components as RegisteredComponents
 *
 *   Client->>Engine: get()
 *   Client->>Engine: initialize()
 *   Client->>Engine: render(model, props, vcr, injector, tpl)
 *   Engine->>Engine: toFieldDefinition(model, props)
 *   Engine->>Engine: fromFieldDefinition(fieldDef, vcr, injector, tpl)
 *   Engine->>Components: components(fieldDef.tag)
 *   Components-->>Engine: component constructor
 *   Engine->>Engine: createComponent(component, inputs, metadata, vcr, injector, template)
 *   Engine-->>Client: return AngularDynamicOutput
 */
export class NgxRenderingEngine2 extends RenderingEngine<AngularFieldDefinition, AngularDynamicOutput> {

  /**
   * @description Registry of registered components
   * @summary Static registry that maps component names to their constructors.
   * This allows the engine to look up components by name when rendering.
   * @type {Record<string, { constructor: Constructor<unknown> }>}
   */
  private static _components: Record<string, { constructor: Constructor<unknown> }>;

  /**
   * @description Collection of child component outputs
   * @summary Stores the outputs of child components during rendering.
   * @type {AngularDynamicOutput[]}
   */
  private _childs!: AngularDynamicOutput[];

  /**
   * @description Current model being rendered
   * @summary Reference to the model currently being processed by the rendering engine.
   * @type {Model}
   */
  private _model!: Model;

  private static _operation: string | undefined = undefined;

  /**
   * @description Static reference to the current instance
   * @summary Singleton instance reference for the rendering engine.
   * @type {Type<unknown> | undefined}
   */
  private static _instance: Type<unknown> | undefined;



  /**
   * @description Creates a new instance of NgxRenderingEngine2
   * @summary Initializes the rendering engine with the 'angular' engine type.
   * This constructor sets up the base configuration needed for Angular-specific rendering.
   */
  constructor() {
    super('angular');
  }

  /**
   * @description Converts a field definition to an Angular component output
   * @summary This private method takes a field definition and creates the corresponding Angular component.
   * It handles component instantiation, input property mapping, and child component rendering.
   * The method validates input properties against the component's metadata and processes
   * child components recursively.
   *
   * @param {FieldDefinition<AngularFieldDefinition>} fieldDef - The field definition to convert
   * @param {ViewContainerRef} vcr - The view container reference for component creation
   * @param {Injector} injector - The Angular injector for dependency injection
   * @param {TemplateRef<any>} tpl - The template reference for content projection
   * @param {string} registryFormId - Form identifier for the component renderer
   * @return {AngularDynamicOutput} The Angular component output with component reference and inputs
   *
   * @mermaid
   * sequenceDiagram
   *   participant Method as fromFieldDefinition
   *   participant Components as NgxRenderingEngine2.components
   *   participant Angular as Angular Core
   *   participant Process as processChild
   *
   *   Method->>Components: components(fieldDef.tag)
   *   Components-->>Method: component constructor
   *   Method->>Angular: reflectComponentType(component)
   *   Angular-->>Method: componentMetadata
   *   Method->>Method: Validate input properties
   *   Method->>Method: Create result object
   *   alt Has children
   *     Method->>Process: Process children recursively
   *     Process->>Method: Return processed children
   *     Method->>Angular: Create embedded view
   *     Method->>Method: Create component instance
   *   end
   *   Method-->>Caller: return AngularDynamicOutput
   */
  private fromFieldDefinition(
    fieldDef: FieldDefinition<AngularFieldDefinition>,
    vcr: ViewContainerRef,
    injector: Injector,
    tpl: TemplateRef<unknown>,
    registryFormId: string = Date.now().toString(36).toUpperCase(),
  ): AngularDynamicOutput {
    const cmp = (fieldDef as KeyValue)?.['component'] || NgxRenderingEngine2.components(fieldDef.tag);
    const component = cmp.constructor as unknown as Type<unknown>;

    const componentMetadata = reflectComponentType(component);
    if (!componentMetadata) {
      throw new InternalError(`Metadata for component ${fieldDef.tag} not found.`);
    }

    const { inputs: possibleInputs } = componentMetadata;
    const inputs = { ...fieldDef.props };

    const unmappedKeys = Object.keys(inputs).filter(input => {
      const isMapped = possibleInputs.find(({ propName }) => propName === input);
      if (!isMapped) delete inputs[input];
      return !isMapped;
    });

    if (unmappedKeys.length > 0)
      console.warn(`Unmapped input properties for component ${fieldDef.tag}: ${unmappedKeys.join(', ')}`);

    const operation = NgxRenderingEngine2._operation;

    const hiddenOn = inputs?.hidden || [];
    if((hiddenOn as string[]).includes(operation as string))
      return {inputs, injector};
    // const hiddenOn = inputs?.hidden || [];
    const result: AngularDynamicOutput = {
      component,
      inputs,
      injector,
    };

    if (fieldDef.rendererId)
      (result.inputs as Record<string, unknown>)['rendererId'] = fieldDef.rendererId;

    // process children
    if (fieldDef.children?.length) {
      result.children = fieldDef.children.map((child) => {
        if(child?.children?.length) {
          child.children = child.children.filter(c => {
            const hiddenOn = c?.props?.hidden || [];
            if(!(hiddenOn as string[]).includes(operation as string))
              return c
          })
        }
        // create a child form and add its controls as properties of child.props
        NgxFormService.addControlFromProps(registryFormId, child.props, inputs);
        return this.fromFieldDefinition(child, vcr, injector, tpl, registryFormId);
      });
    }

    // generating DOM
    vcr.clear();
    const template = vcr.createEmbeddedView(tpl, injector).rootNodes;
    const componentInstance = NgxRenderingEngine2.createComponent(
      component,
      { ...inputs, model: this._model },
      componentMetadata,
      vcr,
      injector,
      template,
    );

    result.instance = NgxRenderingEngine2._instance = componentInstance.instance as Type<unknown>;

    return result;
  }


  /**
   * @description Creates an Angular component instance
   * @summary This static utility method creates an Angular component instance with the specified
   * inputs and template. It uses Angular's component creation API to instantiate the component
   * and then sets the input properties using the provided metadata.
   *
   * @param {Type<unknown>} component - The component type to create
   * @param {KeyValue} [inputs={}] - The input properties to set on the component
   * @param {ComponentMirror<unknown>} metadata - The component metadata for input validation
   * @param {ViewContainerRef} vcr - The view container reference for component creation
   * @param {Injector} injector - The Angular injector for dependency injection
   * @param {Node[]} [template=[]] - The template nodes to project into the component
   * @return {ComponentRef<unknown>} The created component reference
   */
  static createComponent(component: Type<unknown>, inputs: KeyValue = {}, metadata: ComponentMirror<unknown>, vcr: ViewContainerRef, injector: Injector, template: Node[] = []): ComponentRef<unknown> {
    const componentInstance = vcr.createComponent(component as Type<unknown>, {
      environmentInjector: injector as EnvironmentInjector,
      projectableNodes: [template],
    });
    this.setInputs(componentInstance, inputs, metadata);
    return componentInstance;
  }

  /**
   * @description Extracts decorator metadata from a model
   * @summary This method provides access to the field definition generated from a model's
   * decorators. It's a convenience wrapper around the toFieldDefinition method that
   * converts a model to a field definition based on its decorators and the provided
   * global properties.
   *
   * @param {Model} model - The model to extract decorators from
   * @param {Record<string, unknown>} globalProps - Global properties to include in the field definition
   * @return {FieldDefinition<AngularFieldDefinition>} The field definition generated from the model
   */
  getDecorators(model: Model, globalProps: Record<string, unknown>): FieldDefinition<AngularFieldDefinition> {
    return this.toFieldDefinition(model, globalProps);
  }

  /**
   * @description Destroys the current engine instance
   * @summary This static method clears the current instance reference, effectively
   * destroying the singleton instance of the rendering engine. This can be used
   * to reset the engine state or to prepare for a new instance creation.
   *
   * @return {Promise<void>} A promise that resolves when the instance is destroyed
   */
  static async destroy(): Promise<void> {
    NgxRenderingEngine2._instance = undefined;
  }


  /**
   * @description Renders a model into an Angular component output
   * @summary This method takes a model and converts it to an Angular component output.
   * It first stores a reference to the model, then converts it to a field definition
   * using the base RenderingEngine's toFieldDefinition method, and finally converts
   * that field definition to an Angular component output using fromFieldDefinition.
   *
   * @template M - Type extending Model
   * @param {M} model - The model to render
   * @param {Record<string, unknown>} globalProps - Global properties to pass to the component
   * @param {ViewContainerRef} vcr - The view container reference for component creation
   * @param {Injector} injector - The Angular injector for dependency injection
   * @param {TemplateRef<any>} tpl - The template reference for content projection
   * @return {AngularDynamicOutput} The Angular component output with component reference and inputs
   *
   * @mermaid
   * sequenceDiagram
   *   participant Client as Client Code
   *   participant Render as render method
   *   participant ToField as toFieldDefinition
   *   participant FromField as fromFieldDefinition
   *
   *   Client->>Render: render(model, globalProps, vcr, injector, tpl)
   *   Render->>Render: Store model reference
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
    tpl: TemplateRef<unknown>,
  ): AngularDynamicOutput {
    let result: AngularDynamicOutput;
    try {
      this._model = model;
      const formId = Date.now().toString(36).toUpperCase();
      const fieldDef = this.toFieldDefinition(model, globalProps);
      const props = fieldDef.props as KeyValue;
      if(!NgxRenderingEngine2._operation)
        NgxRenderingEngine2._operation = props?.['operation'] || undefined;
      result = this.fromFieldDefinition(fieldDef, vcr, injector, tpl, formId);

      (result!.instance! as KeyValue)['formGroup'] = NgxFormService.getControlFromForm(formId);
      NgxFormService.removeRegistry(formId);
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
   * and sets the initialized flag to true. This method is called before the engine is used
   * to ensure it's properly set up for rendering operations.
   *
   * @return {Promise<void>} A promise that resolves when initialization is complete
   */
  override async initialize(): Promise<void> {
    if (this.initialized)
      return;
    // ValidatableByType[]
    this.initialized = true;
  }

  /**
   * @description Registers a component with the rendering engine
   * @summary This static method registers a component constructor with the rendering engine
   * under a specific name. It initializes the components registry if needed and throws
   * an error if a component is already registered under the same name to prevent
   * accidental overrides.
   *
   * @param {string} name - The name to register the component under
   * @param {Constructor<unknown>} constructor - The component constructor
   * @return {void}
   */
  static registerComponent(name: string, constructor: Constructor<unknown>): void {
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
   * by its selector. When called without a selector, it returns an array of all registered
   * components. When called with a selector, it returns the specific component if found,
   * or throws an error if the component is not registered.
   *
   * @param {string} [selector] - Optional selector to retrieve a specific component
   * @return {Object|Array} Either a specific component or an array of all components
   */
  static components(selector?: string): object | string[] {
    if (!selector) return Object.values(this._components);
    if (!(selector in this._components))
      throw new InternalError(`No Component registered under ${selector}`);
    return this._components[selector];
  }

  /**
   * @description Generates a key for reflection metadata
   * @summary This static method generates a key for reflection metadata by prefixing the input key
   * with the Angular engine's reflection prefix. This is used for storing and retrieving
   * metadata in a namespaced way to avoid conflicts with other metadata.
   *
   * @param {string} key - The base key to prefix
   * @return {string} The prefixed key for reflection metadata
   */
  static override key(key: string): string {
    return `${AngularEngineKeys.REFLECT}${key}`;
  }

  /**
   * @description Sets input properties on a component instance
   * @summary This static utility method sets input properties on a component instance
   * based on the provided inputs object and component metadata. It handles both simple
   * values and nested objects, recursively processing object properties. The method
   * validates each input against the component's metadata to ensure only valid inputs
   * are set.
   *
   * @param {ComponentRef<unknown>} component - The component reference to set inputs on
   * @param {KeyValue} inputs - The input properties to set
   * @param {ComponentMirror<unknown>} metadata - The component metadata for input validation
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant Caller
   *   participant SetInputs as setInputs
   *   participant Parse as parseInputValue
   *   participant Component as ComponentRef
   *
   *   Caller->>SetInputs: setInputs(component, inputs, metadata)
   *   SetInputs->>SetInputs: Iterate through inputs
   *   loop For each input
   *     SetInputs->>SetInputs: Check if input exists in metadata
   *     alt Input is 'props'
   *       SetInputs->>Parse: parseInputValue(component, value)
   *       Parse->>Parse: Recursively process nested objects
   *       Parse->>Component: setInput(key, value)
   *     else Input is valid
   *       SetInputs->>Component: setInput(key, value)
   *     end
   *   end
   */
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
