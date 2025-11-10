import {
  Component,
  ComponentMirror,
  Injector,
  Input,
  OnDestroy,
  OnInit,
  reflectComponentType,
  TemplateRef,
  Type
} from '@angular/core';
/**
 * @module module:lib/components/component-renderer/component-renderer.component
 * @description Component renderer module.
 * @summary Provides `ComponentRendererComponent` which renders dynamic child
 * components based on configuration or data. Useful for rendering custom
 * fields, nested components or templated content at runtime.
 *
 * @link {@link ComponentRendererComponent}
 */
import { NgComponentOutlet } from '@angular/common';

import { NgxRenderingEngine } from '../../engine/NgxRenderingEngine';
import { KeyValue } from '../../engine/types';
import { AngularEngineKeys, BaseComponentProps } from '../../engine/constants';
import { NgxRenderableComponentDirective } from '../../engine/NgxRenderableComponentDirective';

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
 *     +EventEmitter~IBaseCustomEvent~ listenEvent
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
  imports: [NgComponentOutlet],
  standalone: true,
  host: {'[attr.id]': 'uid'},
})
export class ComponentRendererComponent extends NgxRenderableComponentDirective implements OnInit, OnDestroy {

  /**
   * @description The tag name of the component to be dynamically rendered.
   * @summary This input property specifies which component should be rendered by providing
   * its registered tag name. The tag must correspond to a component that has been registered
   * with the NgxRenderingEngine. This is a required input as it determines which component
   * to create.
   *
   * @type {string}
   * @required
   * @memberOf ComponentRendererComponent
   */
  @Input({ required: true })
  tag!: string;

  @Input()
  children: KeyValue[] = [];

  @Input()
  override projectable: boolean = true;

  @Input()
  parent: undefined | KeyValue = undefined;


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
   *   participant R as NgxRenderingEngine
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
   *   participant R as NgxRenderingEngine
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
    const component = NgxRenderingEngine.components(tag)
      ?.constructor as Type<unknown>;
    const metadata = reflectComponentType(component);
    const componentInputs = (metadata as ComponentMirror<unknown>).inputs;
    const props = globals?.['item'] || globals?.['props'] || {};
    if (props?.['tag'])
      delete props['tag'];
     if (props?.[AngularEngineKeys.CHILDREN] && !this.children.length)
      this.children = props[AngularEngineKeys.CHILDREN] as KeyValue[];
    props[AngularEngineKeys.CHILDREN] = this.children || [];
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

    function hasProperty(key: string): boolean {
      return Object.values(componentInputs).some(({propName}) => propName === key);
    }

    const hasChildrenInput = hasProperty(AngularEngineKeys.CHILDREN);
    if (!this.projectable && hasChildrenInput)
      props[AngularEngineKeys.CHILDREN] = this.children;

    const hasRootForm = hasProperty(BaseComponentProps.PARENT_FORM);
    if (hasRootForm && this.parentForm)
      props[BaseComponentProps.PARENT_FORM] = this.parentForm;

    props['className'] = (props['className'] ?
      props['className'] + ' ' + this.className : this.className || "");

    this.vcr.clear();
    // const projectable = (this.children?.length && this.projectable);
    // const template = projectable ? this.vcr.createEmbeddedView(this.inner as TemplateRef<unknown>, this.injector).rootNodes : [];
    this.instance = NgxRenderingEngine.createComponent(
      component,
      props,
      this.injector as Injector,
      metadata as ComponentMirror<unknown>,
      this.vcr,
      [],
    );
    this.subscribeEvents();
  }

  private createParentComponent() {
    const { component, inputs } = this.parent as KeyValue;
    const metadata = reflectComponentType(component) as ComponentMirror<unknown>;
    const template = this.projectable ? this.vcr.createEmbeddedView(this.inner as TemplateRef<unknown>, this.injector).rootNodes : [];
    this.instance = NgxRenderingEngine.createComponent(
      component,
      inputs,
      this.injector,
      metadata,
      this.vcr,
      template,
    );
    this.subscribeEvents();
  }
}
