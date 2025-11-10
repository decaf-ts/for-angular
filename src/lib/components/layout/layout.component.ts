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
import { Primitives } from '@decaf-ts/decorator-validation';
import { UIElementMetadata, UIMediaBreakPoints, UIMediaBreakPointsType } from '@decaf-ts/ui-decorators';
import { NgxParentComponentDirective } from '../../engine/NgxParentComponentDirective';
import { KeyValue } from '../../engine/types';
import { IComponentProperties } from '../../engine/interfaces';
import { Dynamic } from '../../engine/decorators';
import { filterString } from '../../utils/helpers';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';
import { LayoutGridGap } from '../../engine/types';
import { LayoutGridGaps } from '../../engine/constants';
import { CardComponent } from  '../card/card.component';

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
  imports: [TranslatePipe, CardComponent, ModelRendererComponent, ComponentRendererComponent],
  standalone: true,

})
export class LayoutComponent extends NgxParentComponentDirective implements OnInit {

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
  gap: LayoutGridGap = LayoutGridGaps.collapse;

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
  grid: boolean = true;


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
  flexMode: boolean = false;

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
  rowCard: boolean = true;

  /**
   * @description Maximum number of columns allowed in the grid layout.
   * @summary Specifies the upper limit for the number of columns that can be displayed in the grid.
   * This ensures that the layout remains visually consistent and prevents excessive columns
   * from being rendered, which could disrupt the design.
   *
   * @type {number}
   * @default 6
   * @memberOf LayoutComponent
   */
  @Input()
  private maxColsLength: number = 6;

  /**
   * @description Creates an instance of LayoutComponent.
   * @summary Initializes a new LayoutComponent with the component name "LayoutComponent".
   * This constructor calls the parent NgxParentComponentDirective constructor to set up base
   * functionality and component identification.
   *
   * @memberOf LayoutComponent
   */
  constructor() {
    super('LayoutComponent')
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
    if (typeof cols === Primitives.NUMBER)
      cols = Array.from({length: Number(cols)}, () =>  '');
    return cols as string[];
  }


  /**
   * @description Calculates the number of columns for a given row.
   * @summary Determines the effective number of columns in a row based on the row's column definitions,
   * the total number of columns in the layout, and the maximum allowed columns.
   *
   * @param {KeyValue | IComponentProperties} row - The row object containing column definitions.
   * @returns {number} The number of columns for the row, constrained by the layout's maximum column limit.
   * @memberOf LayoutComponent
   */
  getRowColsLength(row: KeyValue | IComponentProperties): number {
    let length: number  = (row.cols as [])?.length ?? 1;
    const colsLength = (this.cols as [])?.length;
    const rowsLength = (typeof this.rows === Primitives.NUMBER ? this.rows : (this.rows as [])?.length) as number;
    if (length > this.maxColsLength)
      length = this.maxColsLength;

    if (length !== colsLength) {
      length = colsLength;
      if (this.flexMode) {
        length = row.cols.reduce((acc: number, curr: KeyValue) => {
          if (rowsLength > 1)
            return acc + (typeof curr['col'] === Primitives.NUMBER ? curr['col']: 1);
          return acc + (
            typeof curr['col'] === Primitives.NUMBER ? curr['col']:
            curr['col'] === 'full' ? 0 : curr['col']
          );
        }, 0);
      }
    }
    return length;
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
    if (typeof rows === Primitives.NUMBER)
      rows = Array.from({length: Number(rows)}, () => ({title: ''}))  as Partial<IComponentProperties>[];

    let rowsLength = (rows as string[]).length;
    if (rowsLength === 1 && this.flexMode) {
      this.children.forEach((child) => {
        const row = child?.['props'].row || 1;
        if (row > rowsLength) {
          rowsLength += 1;
          (rows as KeyValue[]).push({title: ''});
        }
      });

      this.rows = rowsLength;
    };
    return (rows as KeyValue[]).map((row, index) => {
      const rowsLength = this.rows;
      return {
        title: typeof row === Primitives.STRING ? row : row?.['title'] || "",
        cols: this.children.filter((child) => {
          let row = (child as UIElementMetadata).props?.['row'] ?? 1;
          if (row > rowsLength)
            row = rowsLength as number;
          child['col'] = (child as UIElementMetadata).props?.['col'] ?? (this.cols as string[])?.length ?? 1;
          if (row === index + 1)
            return child;
        })
      };
    }).map(row => {
      const colsLength = this.getRowColsLength(row);
      row.cols = row.cols.map((c: KeyValue) => {
        let {col} = c;
        if (typeof col === Primitives.STRING)
          col = col === 'half' ? '1-2' : col === 'full' ? '1-1': col;

        if (!this.flexMode) {
          if (typeof col === Primitives.NUMBER) {
            col = (col === colsLength ?
              `1-1` : `${col}-${colsLength}`);
          }
        } else {

          if (typeof col === Primitives.NUMBER) {
            col = `${col}-${colsLength}`;
          }
          col = ['2-4', '3-6'].includes(col) ? `1-2` : col;
        }
        col = `dcf-child-${col}-${this.breakpoint} dcf-width-${col}`;
        const childClassName = c?.['props']?.className || '';
        const colClass = `${col}@${this.breakpoint} ${filterString(childClassName ,'-width-')}`;
        // to prevent layout glitches, before send class to child component remove width classes
        if (c?.['props']?.className)
          c['props'].className = filterString(c?.['props']?.className ,'-width-', false);
        return Object.assign(c, {colClass});
      })
      return row;
    })
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
    if (this.breakpoint)
      this.breakpoint = `${this.breakpoint}`.toLowerCase();
    this.cols = this._cols;
    this.rows = this._rows;
    // if (this._rows.length === 1)
    //   this.match = false;
    // if (this._cols.length === 1)
    //   this.grid = false;
    this.initialized = true;
  }
}
