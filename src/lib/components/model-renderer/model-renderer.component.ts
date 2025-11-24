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
  Input,
  SimpleChanges
} from '@angular/core';
import { Model, sf } from '@decaf-ts/decorator-validation';
import { AngularEngineKeys, BaseComponentProps } from '../../engine/constants';
import { AngularDynamicOutput } from '../../engine/interfaces';
import { Renderable } from '@decaf-ts/ui-decorators';
import { NgxRenderableComponentDirective } from '../../engine/NgxRenderableComponentDirective';

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
  host: {'[attr.id]': 'uid'}

})
export class ModelRendererComponent<M extends Model>
  extends NgxRenderableComponentDirective {

  /**
   * @description Set if render content projection is allowed
   * @default true
   */
  @Input()
  override projectable: boolean = true;

  // private injector: Injector = inject(Injector);

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
    this.instance = this.output?.component;
    this.subscribeEvents();
  }

  /**
   * @description Lifecycle hook that is called when data-bound properties of a directive change
   * @param {SimpleChanges} changes - Object containing changes
   */
  override async ngOnChanges(changes: SimpleChanges): Promise<void>  {
    if (changes[BaseComponentProps.MODEL]) {
      const { currentValue } = changes[BaseComponentProps.MODEL];
      this.refresh(currentValue);
    }
  }


}
