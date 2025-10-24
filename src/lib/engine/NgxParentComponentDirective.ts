/**
 * @module module:lib/engine/NgxParentComponentDirective
 * @description Directive base for parent container components used by the rendering system.
 * @summary Provides NgxParentComponentDirective which offers inputs for children metadata,
 * column/row configuration and parent component wiring used by layout and container components.
 *
 * @link {@link NgxParentComponentDirective}
 */
import { Directive, Input, OnInit } from '@angular/core';
import { NgxDecafComponentDirective } from './NgxDecafComponentDirective';
import {  FormParent, KeyValue } from './types';
import { UIModelMetadata } from '@decaf-ts/ui-decorators';
import { Model } from '@decaf-ts/decorator-validation';

/**
 * @description Layout component for creating responsive grid layouts in Angular applications.
 * @summary This component provides a flexible grid system that can be configured with dynamic
 * rows and columns. It supports responsive breakpoints and can render child components within
 * the grid structure. The component extends NgxDecafComponentDirective to inherit common functionality
 * and integrates with the model and component renderer systems.
 *
 * @class NgxParentComponentDirective
 * @extends {NgxParentComponentDirective}
 * @implements {OnInit}
 * @memberOf NgxParentComponentDirective
 */
@Directive()
export class NgxParentComponentDirective extends NgxDecafComponentDirective implements OnInit {


  /**
   * @description The display name or title of the fieldset section.
   * @summary Sets the legend or header text that appears in the accordion header. This text
   * provides a clear label for the collapsible section, helping users understand what content
   * is contained within. The name is displayed prominently and serves as the clickable area
   * for expanding/collapsing the fieldset.
   *
   * @type {string}
   * @default 'Child'
   * @memberOf FieldsetComponent
   */
  @Input()
  parentComponent!: FormParent;

  /**
   * @description Array of UI model metadata for all form fields.
   * @summary Contains the complete collection of UI model metadata that defines
   * the structure, validation, and presentation of form fields across all pages.
   * Each metadata object contains information about field type, validation rules,
   * page assignment, and display properties.
   *
   * @type {UIModelMetadata[]}
   * @memberOf NgxParentComponentDirective
   */
  @Input()
  children: UIModelMetadata[] | KeyValue[] = [];


  /**
   * @description Number of columns or array of column definitions for the grid layout.
   * @summary Defines the column structure of the grid. When a number is provided, it creates
   * that many equal-width columns. When an array is provided, each element can define specific
   * column properties or sizing. This allows for flexible grid layouts that can adapt to
   * different content requirements.
   *
   * @type {(number | string[])}
   * @default 1
   * @memberOf NgxParentComponentDirective
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
   * @memberOf NgxParentComponentDirective
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
