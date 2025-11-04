/**
 * @module module:lib/engine/NgxParentComponentDirective
 * @description Directive base for parent container components used by the rendering system.
 * @summary Provides NgxParentComponentDirective which offers inputs for children metadata,
 * column/row configuration and parent component wiring used by layout and container components.
 *
 * @link {@link NgxParentComponentDirective}
 */
import { Directive, Input, OnInit } from '@angular/core';
import { NgxComponentDirective } from './NgxComponentDirective';
import { FormParent, KeyValue } from './types';
import { FieldDefinition, IPagedComponentProperties, UIModelMetadata } from '@decaf-ts/ui-decorators';
import { Model } from '@decaf-ts/decorator-validation';
import { IComponentProperties } from './interfaces';

/**
 * @description Layout component for creating responsive grid layouts in Angular applications.
 * @summary This component provides a flexible grid system that can be configured with dynamic
 * rows and columns. It supports responsive breakpoints and can render child components within
 * the grid structure. The component extends NgxComponentDirective to inherit common functionality
 * and integrates with the model and component renderer systems.
 *
 * @class NgxParentComponentDirective
 * @extends {NgxParentComponentDirective}
 * @implements {OnInit}
 */
@Directive()
export class NgxParentComponentDirective extends NgxComponentDirective implements OnInit {

    /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   * @memberOf FieldsetComponent
   */
  @Input()
  page: number = 1;


  /**
   * @description Unique identifier for the current record.
   * @summary A unique identifier for the current record being displayed or manipulated.
   * This is typically used in conjunction with the primary key for operations on specific records.
   *
   * @type {string | number}
   * @memberOf FieldsetComponent
   */
  @Input()
  pages: number | IPagedComponentProperties[] = 1;


  /**
   * @description Array of UI model metadata for the currently active page.
   * @summary Contains only the UI model metadata for fields that should be displayed
   * on the currently active page. This is a filtered subset of the children array,
   * updated whenever the user navigates between pages.
   *
   * @type {UIModelMetadata | UIModelMetadata[] | undefined}
   * @memberOf SteppedFormComponent
   */
  activeContent: UIModelMetadata | UIModelMetadata[] | FieldDefinition | FieldDefinition[] | undefined = undefined;


  /**
   * @description The currently active page number.
   * @summary Tracks which page of the multi-step form is currently being displayed.
   * This property is updated as users navigate through the form steps using
   * the next/back buttons or programmatic navigation.
   *
   * @type {number}
   * @memberOf SteppedFormComponent
   */
  activeIndex: number = 1;

  /**
   * @description The parent form object that represents the parent-child relationship in the form hierarchy.
   * @summary This input binds the parent form object to the directive, enabling hierarchical form structures.
   * It allows the directive to interact with the parent form and manage child components effectively.
   *
   * @type {FormParent}
   * @memberOf NgxParentComponentDirective
   */
  @Input()
  parentForm!: FormParent;


  /**
   * @description Array of UI model metadata for all form fields.
   * @summary Contains the complete collection of UI model metadata that defines
   * the structure, validation, and presentation of form fields across all pages.
   * Each metadata object contains information about field type, validation rules,
   * page assignment, and display properties.
   *
   * @type {UIModelMetadata[]}
   */
  @Input()
  children: UIModelMetadata[] | IComponentProperties[] | FieldDefinition[] | KeyValue[] = [];


  /**
   * @description Number of columns or array of column definitions for the grid layout.
   * @summary Defines the column structure of the grid. When a number is provided, it creates
   * that many equal-width columns. When an array is provided, each element can define specific
   * column properties or sizing. This allows for flexible grid layouts that can adapt to
   * different content requirements.
   *
   * @type {(number | string[])}
   * @default 1
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
   */
  @Input()
  rows: number | KeyValue[] | string[] = 1;

  async ngOnInit(model?: Model | string): Promise<void> {
    if(model)
      this.model = model as unknown as string;
    if(this.model && !this.repository)
      this._repository = this.repository;
  }

}
