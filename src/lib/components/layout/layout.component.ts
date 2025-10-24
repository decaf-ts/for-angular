/**
 * @module module:lib/components/layout/layout.component
 * @description Layout component module.
 * @summary Provides `LayoutComponent` which offers a responsive grid layout
 * for arranging child components using configurable rows, columns and breakpoints.
 * Useful for building responsive UIs that render model and component renderers.
 *
 * @link {@link LayoutComponent}
 */

import { Component, Input, OnInit} from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgxParentComponentDirective } from '../../engine/NgxParentComponentDirective';
import { Dynamic, KeyValue } from '../../engine';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';
import { UIElementMetadata, UIMediaBreakPoints, UIMediaBreakPointsType } from '@decaf-ts/ui-decorators';
import { Primitives } from '@decaf-ts/decorator-validation';

/**
 * @description Layout component for creating responsive grid layouts in Angular applications.
 * @summary This component provides a flexible grid system that can be configured with dynamic
 * rows and columns. It supports responsive breakpoints and can render child components within
 * the grid structure. The component extends NgxParentComponentDirective to inherit common functionality
 * and integrates with the model and component renderer systems.
 *
 * @class LayoutComponent
 * @extends {NgxParentComponentDirective}
 * @implements {OnInit}
 * @memberOf LayoutComponent
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  imports: [TranslatePipe, ModelRendererComponent, ComponentRendererComponent],
  standalone: true,

})
export class LayoutComponent extends NgxParentComponentDirective implements OnInit {

  @Input()
  initializeProps: boolean = true;

  /**
   * @description Media breakpoint for responsive behavior.
   * @summary Determines the responsive breakpoint at which the layout should adapt.
   * This affects how the grid behaves on different screen sizes, allowing for
   * mobile-first or desktop-first responsive design patterns. The breakpoint
   * is automatically processed to ensure compatibility with the UI framework.
   *
   * @type {UIMediaBreakPointsType}
   * @default 'medium'
   * @memberOf LayoutComponent
   */
  @Input()
  gap: 'small' | 'medium' | 'large' | 'collapse' = 'collapse';

  @Input()
  match: boolean = true;

  /**
   * @description Media breakpoint for responsive behavior.
   * @summary Determines the responsive breakpoint at which the layout should adapt.
   * This affects how the grid behaves on different screen sizes, allowing for
   * mobile-first or desktop-first responsive design patterns. The breakpoint
   * is automatically processed to ensure compatibility with the UI framework.
   *
   * @type {UIMediaBreakPointsType}
   * @default 'medium'
   * @memberOf LayoutComponent
   */
  @Input()
  breakpoint: UIMediaBreakPointsType | string = UIMediaBreakPoints.MEDIUM;

  /**
   * @description Creates an instance of LayoutComponent.
   * @summary Initializes a new LayoutComponent with the component name "LayoutComponent".
   * This constructor calls the parent NgxParentComponentDirective constructor to set up base
   * functionality and component identification.
   *
   * @memberOf LayoutComponent
   */
  constructor() {
    super()
    this.componentName = 'LayoutComponent';
  }

  /**
   * @description Getter that converts columns input to an array format.
   * @summary Transforms the cols input property into a standardized string array format.
   * When cols is a number, it creates an array with that many empty string elements.
   * When cols is already an array, it returns the array as-is. This normalization
   * ensures consistent handling of column definitions in the template.
   *
   * @type {string[]}
   * @readonly
   * @memberOf LayoutComponent
   */
  get _cols(): string[] {
    let cols = this.cols;
    if(typeof cols === Primitives.NUMBER)
      cols = Array.from({length: Number(cols)}, () =>  '');
    return cols as string[];
  }

  /**
   * @description Getter that converts rows input to an array format.
   * @summary Transforms the rows input property into a standardized string array format.
   * When rows is a number, it creates an array with that many empty string elements.
   * When rows is already an array, it returns the array as-is. This normalization
   * ensures consistent handling of row definitions in the template.
   *
   * @type {KeyValue[]}
   * @readonly
   * @memberOf LayoutComponent
   */
  get _rows(): KeyValue[] {
    let rows = this.rows;
    if(typeof rows === Primitives.NUMBER)
      rows = Array.from({length: Number(rows)}, () => ({title: ''}))  as KeyValue[];
    return (rows as KeyValue[]).map((row, index) => {
      return {
        title: typeof row === Primitives.STRING ? row : row?.['title'] || "",
        cols: this.children.filter((child) => {
          const row = (child as UIElementMetadata).props?.['row'] ?? 1;
          child['col'] = (child as UIElementMetadata).props?.['col'] ?? (this.cols as string[])?.length ?? 1;
          if(row === index + 1)
            return child;
        })
      };
    });
  }


  /**
   * @description Angular lifecycle hook that runs after component initialization.
   * @summary Called once, after the first ngOnChanges(). This method triggers the
   * component's initialization process, which includes property parsing and grid
   * setup. It ensures the component is properly configured before rendering.
   *
   * @memberOf LayoutComponent
   */
  override async ngOnInit(): Promise<void> {
    super.parseProps(this);
    if(this.breakpoint)
      this.breakpoint = `@${this.breakpoint}`.toLowerCase();
    this.cols = this._cols;
    this.rows = this._rows;
    this.initialized = true;
  }


}
