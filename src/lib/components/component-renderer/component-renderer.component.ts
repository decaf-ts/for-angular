import {
  Component,
  ComponentMirror,
  ComponentRef,
  EnvironmentInjector,
  EventEmitter,
  inject,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  Output,
  reflectComponentType,
  TemplateRef,
  Type,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { NgxRenderingEngine2 } from '../../engine/NgxRenderingEngine2';
import { BaseCustomEvent, KeyValue, RendererCustomEvent } from '../../engine';
import { ForAngularModule, getLogger } from '../../for-angular.module';
import { Logger } from '@decaf-ts/logging';
import { Model } from '@decaf-ts/decorator-validation';
import { generateRandomValue } from '../../helpers';

/**
 * @description Dynamic component renderer for Decaf Angular applications.
 * @summary This component provides a flexible way to dynamically render Angular components
 * at runtime based on a tag name. It handles the creation, property binding, and event
 * subscription for dynamically loaded components. This is particularly useful for
 * building configurable UIs where components need to be determined at runtime.
 *
 * @component {ComponentRendererComponent}
 * @example
 * <ngx-decaf-component-renderer
 *   [tag]="tag"
 *   [globals]="globals"
 *   (listenEvent)="listenEvent($event)">
 * </ngx-decaf-component-renderer>
 *
 * @mermaid
 * classDiagram
 *   class ComponentRendererComponent {
 *     +ViewContainerRef vcr
 *     +string tag
 *     +Record~string, unknown~ globals
 *     +EnvironmentInjector injector
 *     +ComponentRef~unknown~ component
 *     +EventEmitter~RendererCustomEvent~ listenEvent
 *     +ngOnInit()
 *     +ngOnDestroy()
 *     +ngOnChanges(changes)
 *     -createComponent(tag, globals)
 *     -subscribeEvents()
 *     -unsubscribeEvents()
 *   }
 *   ComponentRendererComponent --|> OnInit
 *   ComponentRendererComponent --|> OnChanges
 *   ComponentRendererComponent --|> OnDestroy
 *
 * @implements {OnInit}
 * @implements {OnChanges}
 * @implements {OnDestroy}
 */
@Component({
  selector: 'ngx-decaf-component-renderer',
  templateUrl: './component-renderer.component.html',
  styleUrls: ['./component-renderer.component.scss'],
  imports: [ForAngularModule],
  standalone: true,
  host: {'[attr.id]': 'rendererId'},
})
export class ComponentRendererComponent
  implements OnInit, OnDestroy {
  /**
   * @description Reference to the container where the dynamic component will be rendered.
   * @summary This ViewContainerRef provides the container where the dynamically created
   * component will be inserted into the DOM. It's marked as static to ensure it's available
   * during the ngOnInit lifecycle hook when the component is created.
   *
   * @type {ViewContainerRef}
   * @memberOf ComponentRendererComponent
   */
  @ViewChild('componentViewContainer', { static: true, read: ViewContainerRef })
  vcr!: ViewContainerRef;

  /**
   * @description The tag name of the component to be dynamically rendered.
   * @summary This input property specifies which component should be rendered by providing
   * its registered tag name. The tag must correspond to a component that has been registered
   * with the NgxRenderingEngine2. This is a required input as it determines which component
   * to create.
   *
   * @type {string}
   * @required
   * @memberOf ComponentRendererComponent
   */
  @Input({ required: true })
  tag!: string;

  /**
   * @description Global properties to pass to the rendered component.
   * @summary This input property allows passing a set of properties to the dynamically
   * rendered component. These properties will be mapped to the component's inputs if they
   * match. Properties that don't match any input on the target component will be filtered out
   * with a warning.
   *
   * @type {Record<string, unknown>}
   * @default {}
   * @memberOf ComponentRendererComponent
   */
  @Input()
  globals: Record<string, unknown> = {};

  /**
   * @description Injector used for dependency injection in the dynamic component.
   * @summary This injector is used when creating the dynamic component to provide it with
   * access to the application's dependency injection system. It ensures that the dynamically
   * created component can access the same services and dependencies as statically created
   * components.
   *
   * @type {EnvironmentInjector}
   * @memberOf ComponentRendererComponent
   */
  injector: EnvironmentInjector = inject(EnvironmentInjector);

  /**
   * @description Reference to the dynamically created component.
   * @summary This property holds a reference to the ComponentRef of the dynamically created
   * component. It's used to interact with the component instance, subscribe to its events,
   * and properly destroy it when the renderer is destroyed.
   *
   * @type {ComponentRef<unknown>}
   * @memberOf ComponentRendererComponent
   */
  component!: ComponentRef<unknown>;

  /**
   * @description Event emitter for events from the rendered component.
   * @summary This output property emits events that originate from the dynamically rendered
   * component. It allows the parent component to listen for and respond to events from the
   * dynamic component, creating a communication channel between the parent and the dynamically
   * rendered child.
   *
   * @type {EventEmitter<RendererCustomEvent>}
   * @memberOf ComponentRendererComponent
   */
  @Output()
  listenEvent: EventEmitter<RendererCustomEvent> =
    new EventEmitter<RendererCustomEvent>();

  /**
   * @description Logger instance for the component.
   * @summary This property holds a Logger instance specific to this component.
   * It's used to log information, warnings, and errors related to the component's
   * operations, particularly useful for debugging and monitoring the dynamic
   * component rendering process.
   *
   * @type {Logger}
   * @memberOf ComponentRendererComponent
   */
  logger!: Logger;

  /**
   * @description Repository model for data operations.
   * @summary The data model repository that this component will use for CRUD operations.
   * This provides a connection to the data layer for retrieving and manipulating data.
   *
   * @type {Model| undefined}
   */
  @Input()
  model!:  Model | undefined;

  @Input()
  parent: undefined | KeyValue = undefined;


  @ViewChild('inner', { read: TemplateRef, static: true })
  inner?: TemplateRef<unknown>;

  uid: string = generateRandomValue(12);

  /**
   * @description Creates an instance of ComponentRendererComponent.
   * @summary Initializes a new ComponentRendererComponent. This component doesn't require
   * any dependencies to be injected in its constructor as it uses the inject function to
   * obtain the EnvironmentInjector.
   *
   * @memberOf ComponentRendererComponent
   */
  constructor() {
    this.logger = getLogger(this);
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Sets up the component by creating the dynamic component specified by the tag input.
   * This method is called once when the component is initialized and triggers the dynamic
   * component creation process with the provided tag name and global properties.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant C as ComponentRendererComponent
   *   participant R as NgxRenderingEngine2
   *
   *   A->>C: ngOnInit()
   *   C->>C: createComponent(tag, globals)
   *   C->>R: components(tag)
   *   R-->>C: Return component constructor
   *   C->>C: Process component inputs
   *   C->>C: Create component instance
   *   C->>C: subscribeEvents()
   *
   * @return {void}
   * @memberOf ComponentRendererComponent
   */
  ngOnInit(): void {
    if (!this.parent) {
      this.createComponent(this.tag, this.globals);
    } else {
      this.createParentComponent();
    }
  }

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
   *   participant R as NgxRenderingEngine2
   *
   *   A->>C: ngOnDestroy()
   *   alt component exists
   *     C->>C: unsubscribeEvents()
   *     C->>R: destroy()
   *   end
   *
   * @return {Promise<void>} A promise that resolves when cleanup is complete
   * @memberOf ComponentRendererComponent
   */
  async ngOnDestroy(): Promise<void> {
    if (this.component) {
      this.unsubscribeEvents();
      NgxRenderingEngine2.destroy();
    }
  }

  /**
   * @description Creates and renders a dynamic component.
   * @summary This method handles the creation of a dynamic component based on the provided tag.
   * It retrieves the component constructor from the rendering engine, processes its inputs,
   * filters out unmapped properties, creates the component instance, and sets up event subscriptions.
   *
   * @param {string} tag - The tag name of the component to create
   * @param {KeyValue} globals - Global properties to pass to the component
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant C as ComponentRendererComponent
   *   participant R as NgxRenderingEngine2
   *   participant V as ViewContainerRef
   *
   *   C->>R: components(tag)
   *   R-->>C: Return component constructor
   *   C->>C: reflectComponentType(component)
   *   C->>C: Process input properties
   *   C->>C: Filter unmapped properties
   *   C->>V: clear()
   *   C->>R: createComponent(component, props, metadata, vcr, injector, [])
   *   R-->>C: Return component reference
   *   C->>C: subscribeEvents()
   *
   * @private
   * @memberOf ComponentRendererComponent
   */
  private createComponent(tag: string, globals: KeyValue = {}): void {
    const component = NgxRenderingEngine2.components(tag)
      ?.constructor as Type<unknown>;
    const metadata = reflectComponentType(component);
    const componentInputs = (metadata as ComponentMirror<unknown>).inputs;
    const props = globals?.['item'] || globals?.['props'] || {};
    if(props?.['tag'])
      delete props['tag'];
    const inputKeys = Object.keys(props);
    const unmappedKeys: string[] = [];

    for (const input of inputKeys) {
      if (!inputKeys.length) break;
      const prop = componentInputs.find(
        (item: { propName: string }) => item.propName === input,
      );
      if (!prop) {
        delete props[input];
        unmappedKeys.push(input);
      }
    }
    this.vcr.clear();
    this.component = NgxRenderingEngine2.createComponent(
      component,
      props,
      metadata as ComponentMirror<unknown>,
      this.vcr,
      this.injector as Injector,
      [],
    );
    this.subscribeEvents();
  }

  createParentComponent() {
    const { component, inputs } = this.parent as KeyValue;
    const metadata = reflectComponentType(component) as ComponentMirror<unknown>;
    const template = this.vcr.createEmbeddedView(this.inner as TemplateRef<unknown>, this.injector).rootNodes;
    this.component = NgxRenderingEngine2.createComponent(
      component,
      inputs,
      metadata,
      this.vcr,
      this.injector,
      template,
    );
    this.subscribeEvents();
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
   * @memberOf ComponentRendererComponent
   */
  private subscribeEvents(): void {
    if (this.component) {
      const instance = this.component?.instance as KeyValue;
      const componentKeys = Object.keys(instance);
      for (const key of componentKeys) {
        const value = instance[key];
        if (value instanceof EventEmitter)
          (instance as KeyValue)[key].subscribe(
            (event: Partial<BaseCustomEvent>) => {
              this.listenEvent.emit({
                name: key,
                ...event,
              } as RendererCustomEvent);
            },
          );
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
   * @memberOf ComponentRendererComponent
   */
  private unsubscribeEvents(): void {
    if (this.component) {
      const instance = this.component?.instance as KeyValue;
      const componentKeys = Object.keys(instance);
      for (const key of componentKeys) {
        const value = instance[key];
        if (value instanceof EventEmitter) instance[key].unsubscribe();
      }
    }
  }
}
