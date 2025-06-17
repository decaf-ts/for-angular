import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, Input, OnInit } from '@angular/core';
import { MenuController } from '@ionic/angular/standalone';
import { ElementSizes, FlexPositions, StringOrBoolean } from 'src/lib/engine/types';
import { stringToBoolean } from 'src/lib/helpers/utils';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';
import { ForAngularComponentsModule } from 'src/lib/components/for-angular-components.module';

/**
 * @description A flexible container component for layout management.
 * @summary The ContainerComponent provides a versatile container for organizing content with
 * configurable layout options. It supports flexible positioning, sizing, and integration with
 * Ionic's menu system. This component serves as a foundational building block for creating
 * consistent layouts across the application.
 *
 * @param {StringOrBoolean} hasSideMenu - Controls whether the side menu is enabled
 * @param {string} className - Additional CSS classes to apply to the container
 * @param {FlexPositions} position - Flex positioning of container content
 * @param {StringOrBoolean} flex - Whether to use flex layout
 * @param {StringOrBoolean} expand - Whether the container should expand to fill available space
 * @param {StringOrBoolean} fullscreen - Whether the container should take up full viewport height
 * @param {ElementSizes} size - Size preset for the container width
 *
 * @class ContainerComponent
 * @memberOf module:DecafComponents
 */
@Component({
  selector: 'app-container',
  templateUrl: './container.component.html',
  styleUrls: ['./container.component.scss'],
  standalone: true,
  imports: [ForAngularComponentsModule]
})
export class ContainerComponent extends NgxBaseComponent implements OnInit {

  /**
   * @description Controls whether the side menu is enabled for this container.
   * @summary When set to true, this property enables the Ionic menu controller, allowing
   * the side menu to be opened and closed. When false, the side menu is disabled.
   * This is useful for pages where you want to restrict access to the side menu.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf ContainerComponent
   */
  @Input()
  hasSideMenu: StringOrBoolean = false;

  /**
   * @description Flex positioning of the container's content.
   * @summary Controls how child elements are positioned within the container when flex layout
   * is enabled. Options include 'center', 'top', 'bottom', 'left', 'right', and combinations
   * like 'top-left'. This property is only applied when the flex property is true.
   *
   * @type {FlexPositions}
   * @default 'center'
   * @memberOf ContainerComponent
   */
  @Input()
  position: FlexPositions = 'center';

  /**
   * @description Determines if the container should use flex layout.
   * @summary When true, applies flex display and positioning classes to the container.
   * This enables flexible positioning of child elements according to the position property.
   * When false, standard block layout is used.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf ContainerComponent
   */
  @Input()
  flex: StringOrBoolean = true;

  /**
   * @description Determines if the container should expand to fill available space.
   * @summary When true, applies expansion classes for width, making the container
   * take up all available horizontal space. When false, the container's width is
   * determined by the size property.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf ContainerComponent
   */
  @Input()
  expand: StringOrBoolean = false;

  /**
   * @description Determines if the container should take up the full viewport height.
   * @summary When true, applies the viewport height class, making the container
   * take up the full height of the viewport. This is useful for creating full-screen
   * layouts or ensuring content fills the available vertical space.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf ContainerComponent
   */
  @Input()
  fullscreen: StringOrBoolean = true;

  /**
   * @description Size preset for the container width.
   * @summary Controls the width of the container using predefined size classes.
   * Options include 'block', 'small', 'medium', 'large', and others defined in
   * the ElementSizes type. This property is ignored when expand is true.
   *
   * @type {ElementSizes}
   * @default 'block'
   * @memberOf ContainerComponent
   */
  @Input()
  size: ElementSizes = 'block';

  /**
   * @description Service for controlling the Ionic menu.
   * @summary Injected service that provides methods for enabling, disabling,
   * opening, and closing the Ionic side menu. Used to control menu behavior
   * based on the hasSideMenu property.
   *
   * @private
   * @type {MenuController}
   * @memberOf ContainerComponent
   */
  private menuController: MenuController = inject(MenuController);

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
   * @summary Sets up the menu controller based on the hasSideMenu property, processes boolean inputs
   * to handle string representations, and applies appropriate CSS classes based on the component's
   * configuration. This method builds the final className by combining all the layout options.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant C as ContainerComponent
   *   participant M as MenuController
   *
   *   A->>C: ngOnInit()
   *   C->>C: Process hasSideMenu
   *   C->>M: enable(stringToBoolean(hasSideMenu))
   *   C->>C: Process expand input
   *   C->>C: Process flex input
   *   C->>C: Build size class
   *   Note over C: Add width class based on expand or size
   *   C->>C: Check if flex is enabled
   *   Note over C: Add flex classes if needed
   *   C->>C: Process fullscreen input
   *   Note over C: Add height-viewport class if fullscreen
   *
   * @memberOf ContainerComponent
   */
  ngOnInit() {
    this.menuController.enable(stringToBoolean(this.hasSideMenu) as boolean);
    this.expand = stringToBoolean(this.expand);
    this.flex = stringToBoolean(this.flex);

    this.size += ` dcf-width-${this.expand ? 'expand' : this.size}`;

    if(this.flex && !this.className.includes('dcf-flex-'))
      this.className += ` dcf-flex dcf-flex-${this.position}`;

    this.fullscreen = stringToBoolean(this.fullscreen);
    if(this.fullscreen)
      this.className += ' dcf-height-viewport';
  }
}
