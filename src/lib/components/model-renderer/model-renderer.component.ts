/**
 * @module module:lib/components/model-renderer/model-renderer.component
 * @description Model renderer component module.
 * @summary Exposes `ModelRendererComponent` which dynamically renders UI components
 * from model definitions using the `NgxRenderingEngine`. It handles model changes,
 * event subscription and lifecycle for the rendered output.
 *
 * @link {@link ModelRendererComponent}
 */

import {
  Component,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { Model, sf } from '@decaf-ts/decorator-validation';
import {
  AngularDynamicOutput,
  AngularEngineKeys,
  BaseComponentProps,
  IBaseCustomEvent,
  NgxRenderingEngine,
  IRenderedModel,
} from '../../engine';
import { KeyValue } from '../../engine/types';
import { Renderable } from '@decaf-ts/ui-decorators';
import { NgxComponentDirective } from '../../engine/NgxComponentDirective';

/**
 * @description Component for rendering dynamic models
 * @summary This component is responsible for dynamically rendering models,
 * handling model changes, and managing event subscriptions for the rendered components.
 * It uses the NgxRenderingEngine to render the models and supports both string and Model inputs.
 * @class
 * @template M - Type extending Model
 * @param {Injector} injector - Angular Injector for dependency injection
 * @example
 * <ngx-decaf-model-renderer
 *   [model]="myModel"
 *   [globals]="globalVariables"
 *   (listenEvent)="handleEvent($event)">
 * </ngx-decaf-model-renderer>
 * @mermaid
 * sequenceDiagram
 *   participant App
 *   participant ModelRenderer
 *   participant RenderingEngine
 *   participant Model
 *   App->>ModelRenderer: Input model
 *   ModelRenderer->>Model: Parse if string
 *   Model-->>ModelRenderer: Parsed model
 *   ModelRenderer->>RenderingEngine: Render model
 *   RenderingEngine-->>ModelRenderer: Rendered output
 *   ModelRenderer->>ModelRenderer: Subscribe to events
 *   ModelRenderer-->>App: Emit events
 */
@Component({
  standalone: true,
  imports: [],
  selector: 'ngx-decaf-model-renderer',
  templateUrl: './model-renderer.component.html',
  styleUrl: './model-renderer.component.scss',
  host: {'[attr.id]': 'rendererId'},
  encapsulation: ViewEncapsulation.None
})
export class ModelRendererComponent<M extends Model>
  extends NgxComponentDirective implements OnChanges, OnDestroy, IRenderedModel {

  // /**
  //  * @description Input model to be rendered
  //  * @summary Can be a Model instance or a JSON string representation of a model
  //  */
  // @Input({ required: true })
  // model!: M | string | undefined;

  /**
   * @description Global variables to be passed to the rendered component
   */
  @Input()
  globals: Record<string, unknown> = {};

  /**
   * @description Set if render content projection is allowed
   * @default true
   */
  @Input()
  projectable: boolean = true;

  /**
   * @description Template reference for inner content
   */
  @ViewChild('inner', { read: TemplateRef, static: true })
  inner?: TemplateRef<unknown>;

  /**
   * @description Output of the rendered model
   */
  output?: AngularDynamicOutput;

  /**
   * @description Unique identifier for the renderer
   */
  @Input()
  rendererId?: string;

  /**
   * @description View container reference for dynamic component rendering
   */
  @ViewChild('componentOuter', { static: true, read: ViewContainerRef })
  vcr!: ViewContainerRef;

  /**
   * @description Instance of the rendered component
   */
  private instance!: KeyValue | undefined;

  private injector: Injector = inject(Injector);

  // constructor() {}

  /**
   * @description Refreshes the rendered model
   * @param {string | M} model - The model to be rendered
   */
  private refresh(model: string | M) {
    model =
      typeof model === 'string'
        ? (Model.build({}, model) as M)
        : model;
    this.output = (model as unknown as Renderable).render<AngularDynamicOutput>(
      this.globals || {},
      this.vcr,
      this.injector,
      this.inner,
      this.projectable
    );
    if (this.output?.inputs)
      this.rendererId = sf(
        AngularEngineKeys.RENDERED_ID,
        (this.output.inputs as Record<string, unknown>)['rendererId'] as string,
      );
    this.instance = this.output?.instance;
    this.subscribeEvents();
  }

  /**
   * @description Lifecycle hook that is called when data-bound properties of a directive change
   * @param {SimpleChanges} changes - Object containing changes
   */
  override ngOnChanges(changes: SimpleChanges): void {
    if (changes[BaseComponentProps.MODEL]) {
      const { currentValue } = changes[BaseComponentProps.MODEL];
      this.refresh(currentValue);
    }
  }

  /**
   * @description Lifecycle hook that is called when a directive, pipe, or service is destroyed
   * @return {Promise<void>}
   */
  async ngOnDestroy(): Promise<void> {
    if (this.instance) {
      this.unsubscribeEvents();
      await NgxRenderingEngine.destroy();
    }
    this.output = undefined;
  }

  private async subscribeEvents(): Promise<void> {
    const component = this?.output?.component;
    if (this.instance && component) {
      const componentKeys = Object.keys(this.instance);
      for (const key of componentKeys) {
        const value = this.instance[key];
        if (value instanceof EventEmitter)
          (this.instance as KeyValue)[key].subscribe(async (event: Partial<IBaseCustomEvent>) => {
            await this.handleEvent({
              component: component.name || '',
              name: key,
              ...event,
            } as IBaseCustomEvent);
          });
      }
    }
  }

  /**
   * @description Unsubscribes from events emitted by the rendered component
   */
  private unsubscribeEvents(): void {
    if (this.instance) {
      const componentKeys = Object.keys(this.instance);
      for (const key of componentKeys) {
        const value = this.instance[key];
        if (value instanceof EventEmitter)
          this.instance[key].unsubscribe();
      }
    }
  }

  protected readonly JSON = JSON;
}
