import {
  Directive,
  ElementRef,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  TemplateRef,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import {
  IRenderedModel,
  AngularDynamicOutput,
  IBaseCustomEvent,
  ICrudFormEvent,
} from './interfaces';
import { FormParent, KeyValue } from './types';
import { NgxRenderingEngine } from './NgxRenderingEngine';

import { NgxComponentDirective } from './NgxComponentDirective';
import { shareReplay, takeUntil } from 'rxjs';
import { NgxModelPageDirective } from './NgxModelPageDirective';
import { ModelKeys } from '@decaf-ts/decorator-validation';

@Directive()
export class NgxRenderableComponentDirective
  extends NgxModelPageDirective
  implements OnChanges, OnDestroy, IRenderedModel
{
  /**
   * @description Reference to the container where the dynamic component will be rendered.
   * @summary This ViewContainerRef provides the container where the dynamically created
   * component will be inserted into the DOM. It's marked as static to ensure it's available
   * during the ngOnInit lifecycle hook when the component is created.
   *
   * @type {ViewContainerRef}
   * @memberOf NgxRenderableComponentDirective
   */

  @ViewChild('componentOuter', { static: true, read: ViewContainerRef })
  protected vcr!: ViewContainerRef;

  @ViewChild('componentInner', { read: TemplateRef, static: true })
  inner?: TemplateRef<unknown>;

  /**
   * @description Global properties to pass to the rendered component.
   * @summary This input property allows passing a set of properties to the dynamically
   * rendered component. These properties will be mapped to the component's inputs if they
   * match. Properties that don't match any input on the target component will be filtered out
   * with a warning.
   *
   * @type {Record<string, unknown>}
   * @default {}
   * @memberOf NgxComponentDirective
   */
  @Input()
  override globals: Record<string, unknown> = {};

  /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   * @memberOf NgxComponentDirective
   */
  @Input()
  parentForm!: FormParent | ElementRef<unknown> | undefined;

  @Input()
  projectable: boolean = true;

  @Input()
  rendererId?: string;

  protected output?: AngularDynamicOutput;

  protected instance!: KeyValue | undefined;

  protected readonly JSON = JSON;

  // @Output()
  // listenEvent: EventEmitter<IBaseCustomEvent> =
  //   new EventEmitter<IBaseCustomEvent>();

  /**
   * @description Cleans up resources when the component is destroyed.
   * @summary Performs cleanup operations when the component is being destroyed by Angular.
   * This includes unsubscribing from all event emitters of the dynamic component and
   * destroying the rendering engine instance to prevent memory leaks.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant C as ComponentRendererComponent
   *   participant R as NgxRenderingEngine
   *
   *   A->>C: ngOnDestroy()
   *   alt component exists
   *     C->>C: unsubscribeEvents()
   *     C->>R: destroy()
   *   end
   *
   * @return {Promise<void>} A promise that resolves when cleanup is complete
   * @memberOf NgxComponentDirective
   */
  override async ngOnDestroy(): Promise<void> {
    super.ngOnDestroy();
    if (this.instance) {
      this.unsubscribeEvents();
      await NgxRenderingEngine.destroy();
    }
    this.output = undefined;
  }

  /**
   * @description Lifecycle hook that is called when data-bound properties of a directive change
   * @param {SimpleChanges} changes - Object containing changes
   */
  override async ngOnChanges(changes: SimpleChanges): Promise<void> {
    if (changes[ModelKeys.MODEL]) {
      const { currentValue } = changes[ModelKeys.MODEL];
      if (currentValue) {
        this.render(currentValue);
      }
    }
  }

  /**
   * @description Subscribes to events emitted by the dynamic component.
   * @summary This method sets up subscriptions to all EventEmitter properties of the
   * dynamically created component. When an event is emitted by the dynamic component,
   * it is captured and re-emitted through the listenEvent output property with additional
   * metadata about the event source.
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as ComponentRendererComponent
   *   participant D as Dynamic Component
   *   participant P as Parent Component
   *
   *   C->>C: subscribeEvents()
   *   C->>D: Get instance properties
   *   loop For each property
   *     C->>C: Check if property is EventEmitter
   *     alt is EventEmitter
   *       C->>D: Subscribe to event
   *       D-->>C: Event emitted
   *       C->>P: Re-emit event with metadata
   *     end
   *   end
   *
   * @private
   * @return {void}
   * @memberOf NgxComponentDirective
   */
  protected async subscribeEvents(component?: Type<unknown>): Promise<void> {
    if (!component) component = this?.output?.component;
    if (!this.instance && component) this.instance = component;
    if (this.instance && component) {
      const componentKeys = Object.keys(this.instance);
      for (const key of componentKeys) {
        const value = this.instance[key];
        if (value instanceof EventEmitter)
          (this.instance as KeyValue)[key]
            .pipe(shareReplay(1), takeUntil(this.destroySubscriptions$))
            .subscribe(async (event: Event) => {
              await this.handleEvent({
                component: component.name || '',
                name: key,
                ...event,
              } as IBaseCustomEvent & ICrudFormEvent & CustomEvent);
            });
      }
    }
  }

  /**
   * @description Unsubscribes from all events of the dynamic component.
   * @summary This method cleans up event subscriptions when the component is being destroyed.
   * It iterates through all properties of the dynamic component instance and unsubscribes
   * from any EventEmitter properties to prevent memory leaks and unexpected behavior after
   * the component is destroyed.
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as ComponentRendererComponent
   *   participant D as Dynamic Component
   *
   *   C->>C: unsubscribeEvents()
   *   C->>D: Get instance properties
   *   loop For each property
   *     C->>C: Check if property is EventEmitter
   *     alt is EventEmitter
   *       C->>D: Unsubscribe from event
   *     end
   *   end
   *
   * @private
   * @return {void}
   * @memberOf NgxComponentDirective
   */
  protected unsubscribeEvents(): void {
    if (this.instance) {
      const componentKeys = Object.keys(this.instance);
      for (const key of componentKeys) {
        const value = this.instance[key];
        if (value instanceof EventEmitter) this.instance[key].unsubscribe();
      }
    }
  }
}
