import { CommonModule } from '@angular/common';
import { Component, input, OnInit } from '@angular/core';
import { ElementSizes } from '@decaf-ts/ui-decorators';
import { ElementSize, FlexPosition, NgxComponentDirective } from '../../engine';

/**
 * @description A flexible container component for layout management.
 * @summary The ContainerComponent provides a versatile container for organizing content with
 * configurable layout options. It supports flexible positioning, sizing, and integration with
 * Ionic's menu system. This component serves as a foundational building block for creating
 * consistent layouts across the application.
 *
 * @param {string} className - Additional CSS classes to apply to the container
 * @param {FlexPosition} position - Flex positioning of container content
 * @param {boolean} flex - Whether to use flex layout
 * @param {boolean} expand - Whether the container should expand to fill available space
 * @param {boolean} fullscreen - Whether the container should take up full viewport height
 * @param {ElementSize} size - Size preset for the container width
 *
 * @class ContainerComponent
 * @memberOf module:DecafComponents
 */
@Component({
  selector: 'ngx-decaf-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
  standalone: true,
  imports: [CommonModule],
})
export class ContainerComponent extends NgxComponentDirective implements OnInit {
  /**
   * @description Flex positioning of the container's content.
   * @summary Controls how child elements are positioned within the container when flex layout
   * is enabled. Options include 'center', 'top', 'bottom', 'left', 'right', and combinations
   * like 'top-left'. This property is only applied when the flex property is true.
   *
   * @default 'center'
   * @memberOf ContainerComponent
   */
  position = input<FlexPosition>('center');

  /**
   * @description Determines if the container should use flex layout.
   * @summary When true, applies flex display and positioning classes to the container.
   * This enables flexible positioning of child elements according to the position property.
   * When false, standard block layout is used.
   *
   * @default true
   * @memberOf ContainerComponent
   */
  flex = input<boolean>(true);

  /**
   * @description Determines if the container should take up the full viewport height.
   * @summary When true, applies the viewport height class, making the container
   * take up the full height of the viewport. This is useful for creating full-screen
   * layouts or ensuring content fills the available vertical space.
   *
   * @default true
   * @memberOf ContainerComponent
   */

  fullscreen = input<boolean>(false);

  /**
   * @description Size preset for the container width.
   * @summary Controls the width of the container using predefined size classes.
   * Options include 'block', 'small', 'medium', 'large', and others defined in
   * the ElementSize type. This property is ignored when expand is true.
   *
   * @default 'expand'
   * @memberOf ContainerComponent
   */
  size = input<ElementSize>(ElementSizes.expand);

  /**
   * @description Creates an instance of ContainerComponent.
   * @summary Initializes a new ContainerComponent and calls the parent constructor
   * with the component name for locale derivation.
   *
   * @memberOf ContainerComponent
   */
  constructor() {
    super('ContainerComponent');
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Builds the final `className` by combining the flex, position and size options into
   * the CSS classes consumed by the template.
   *
   * @memberOf ContainerComponent
   */
  ngOnInit() {
    if (this.flex() && !this.className?.includes('dcf-flex-')) {
      this.className += ` dcf-flex dcf-flex-${this.position()}`;
    }
    if (this.fullscreen()) {
      this.className += ' dcf-height-viewport';
    }
  }
}
