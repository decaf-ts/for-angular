import { Component, Input, OnInit} from '@angular/core';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { KeyValue } from 'src/lib/engine';
import { ComponentRendererComponent } from '../component-renderer/component-renderer.component';
import { ModelRendererComponent } from '../model-renderer/model-renderer.component';
import { UIMediaBreakPoints } from '@decaf-ts/ui-decorators';

/**
 * @description Layout component for creating responsive grid layouts in Angular applications.
 * @summary This component provides a flexible grid system that can be configured with dynamic
 * rows and columns. It supports responsive breakpoints and can render child components within
 * the grid structure. The component extends NgxBaseComponent to inherit common functionality
 * and integrates with the model and component renderer systems.
 *
 * @class LayoutComponent
 * @extends {NgxBaseComponent}
 * @implements {OnInit}
 * @memberOf LayoutComponent
 */
@Component({
  selector: 'ngx-decaf-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss'],
  imports: [ForAngularModule, ModelRendererComponent, ComponentRendererComponent],
  standalone: true,

})
export class LayoutComponent extends NgxBaseComponent implements OnInit {

  /**
   * @description Number of columns or array of column definitions for the grid layout.
   * @summary Defines the column structure of the grid. When a number is provided, it creates
   * that many equal-width columns. When an array is provided, each element can define specific
   * column properties or sizing. This allows for flexible grid layouts that can adapt to
   * different content requirements.
   *
   * @type {(number | string[])}
   * @default 1
   * @memberOf LayoutComponent
   */
  @Input()
  cols: number | string[] = 1;

  /**
   * @description Number of rows or array of row definitions for the grid layout.
   * @summary Defines the row structure of the grid. When a number is provided, it creates
   * that many equal-height rows. When an array is provided, each element can define specific
   * row properties or sizing. This provides control over vertical spacing and content organization.
   *
   * @type {(number | string[])}
   * @default 1
   * @memberOf LayoutComponent
   */
  @Input()
  rows: number | string[] = 1;

  /**
   * @description Media breakpoint for responsive behavior.
   * @summary Determines the responsive breakpoint at which the layout should adapt.
   * This affects how the grid behaves on different screen sizes, allowing for
   * mobile-first or desktop-first responsive design patterns. The breakpoint
   * is automatically processed to ensure compatibility with the UI framework.
   *
   * @type {UIMediaBreakPoints}
   * @default 'medium'
   * @memberOf LayoutComponent
   */
  @Input()
  breakpoint: UIMediaBreakPoints = 'medium';

  /**
   * @description Array of child components or data to render within the grid.
   * @summary Contains the child elements that will be distributed across the grid layout.
   * Each item in the array represents content that will be rendered using the appropriate
   * renderer component (ModelRenderer or ComponentRenderer). This allows for mixed content
   * types within a single layout structure.
   *
   * @type {KeyValue[]}
   * @default []
   * @memberOf LayoutComponent
   */
  @Input()
  children: KeyValue[] = [];

  /**
   * @description Creates an instance of LayoutComponent.
   * @summary Initializes a new LayoutComponent with the component name "LayoutComponent".
   * This constructor calls the parent NgxBaseComponent constructor to set up base
   * functionality and component identification.
   *
   * @memberOf LayoutComponent
   */
  constructor() {
    super("LayoutComponent")
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
    if(typeof cols === "number")
      cols = Array.from({length: Number(cols)}, () =>  ``);
    return cols;
  }

  /**
   * @description Getter that converts rows input to an array format.
   * @summary Transforms the rows input property into a standardized string array format.
   * When rows is a number, it creates an array with that many empty string elements.
   * When rows is already an array, it returns the array as-is. This normalization
   * ensures consistent handling of row definitions in the template.
   *
   * @type {string[]}
   * @readonly
   * @memberOf LayoutComponent
   */
  get _rows(): string[] {
    let rows = this.rows;
    if(typeof rows === "number")
      rows = Array.from({length: Number(rows)}, () => '');
    return rows;
  }

  /**
   * @description Angular lifecycle hook that runs after component initialization.
   * @summary Called once, after the first ngOnChanges(). This method triggers the
   * component's initialization process, which includes property parsing and grid
   * setup. It ensures the component is properly configured before rendering.
   *
   * @memberOf LayoutComponent
   */
  ngOnInit(): void {
    this.initialize();
  }

  /**
   * @description Initializes the layout component with processed properties.
   * @summary Overrides the base component's initialize method to set up the grid layout.
   * This method processes input properties, normalizes the breakpoint value, converts
   * rows and columns to their array representations, and marks the component as initialized.
   * The initialization ensures all properties are in the correct format for rendering.
   *
   * @mermaid
   * sequenceDiagram
   *   participant L as LayoutComponent
   *   participant B as NgxBaseComponent
   *
   *   L->>B: parseProps(this)
   *   Note over L: Process component properties
   *   L->>L: Normalize breakpoint to lowercase
   *   L->>L: Convert rows to array format
   *   L->>L: Convert cols to array format
   *   L->>L: Set initialized = true
   *
   * @override
   * @memberOf LayoutComponent
   */
  override initialize() {
    this.parseProps(this);
    this.breakpoint = this.breakpoint.slice(0, 2).toLowerCase() as UIMediaBreakPoints;
    this.rows = this._rows;
    this.cols = this._cols;
    this.initialized = true;
  }

  /**
   * @description Track function for Angular's *ngFor directive optimization.
   * @summary Provides a unique identifier for each item in the children array to help
   * Angular's change detection optimize rendering performance. This prevents unnecessary
   * DOM manipulation when the children array is updated. The function combines the
   * array index with the item reference to create a unique tracking key.
   *
   * @param {number} index - The index of the item in the array
   * @param {KeyValue} item - The item data object
   * @return {string | number} A unique identifier for the item
   * @memberOf LayoutComponent
   */
  trackItemFn(index: number, item: KeyValue): string | number {
    return `${index}-${item}`;
  }
}
