import { Component,  CUSTOM_ELEMENTS_SCHEMA, inject, Injector, Input, OnInit } from '@angular/core';
import { Color } from '@ionic/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { IonHeader, IonTitle, IonToolbar, MenuController } from '@ionic/angular/standalone';
import { RouterService } from 'src/app/services/router.service';
import { stringToBoolean } from 'src/lib/helpers/utils';
import { ForAngularModule } from 'src/lib/for-angular.module';
import { BackButtonComponent } from '../back-button/back-button.component';
import { NgxBaseComponent } from 'src/lib/engine/NgxBaseComponent';

/**
 * @description Header component for application pages.
 * @summary The HeaderComponent provides a consistent header across the application with
 * configurable elements such as title, back button, menu button, and CRUD operation controls.
 * It extends NgxBaseComponent to inherit common functionality and implements OnInit for
 * initialization logic. This component is designed to be flexible and adaptable to different
 * page contexts, supporting various navigation patterns and visual styles.
 *
 * @class HeaderComponent
 * @extends {NgxBaseComponent}
 * @implements {OnInit}
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [ForAngularModule, IonHeader, IonTitle, IonToolbar, BackButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  standalone: true,

})
export class HeaderComponent extends NgxBaseComponent implements OnInit {

  /**
   * @description The current CRUD operation being performed.
   * @summary Indicates which CRUD operation is currently active. This affects the UI state
   * and which operation buttons are highlighted or disabled.
   *
   * @type {operations}
   * @default OperationKeys.READ
   * @memberOf HeaderComponent
   */
  @Input()
  currentOperation: CrudOperations = OperationKeys.READ;


  /**
   * @description Controls whether the menu button is displayed.
   * @summary When set to true, the component will display a menu button that can be used
   * to toggle the application's side menu. This is particularly useful for mobile
   * applications or any interface that uses a slide-in menu for navigation.
   * The menu controller is automatically enabled/disabled based on this property.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf HeaderComponent
   */
  @Input()
  showMenuButton: StringOrBoolean = false;

  /**
   * @description Position of the menu button in the header.
   * @summary Determines whether the menu button appears at the start or end of the header.
   * This allows for customization of the header layout based on design requirements.
   *
   * @type {'start' | 'end'}
   * @default 'start'
   * @memberOf HeaderComponent
   */
  @Input()
  buttonMenuSlot: 'start' | 'end' = 'start';

  /**
   * @description The title text displayed in the header.
   * @summary Sets the main title text that appears in the center of the header.
   * This typically represents the name of the current page or section.
   *
   * @type {string}
   * @memberOf HeaderComponent
   */
  @Input()
  title?: string;

  /**
   * @description URL or path to the logo image.
   * @summary When provided, displays a logo image in the header instead of or alongside
   * the title text. This can be used for branding purposes.
   *
   * @type {string}
   * @default ""
   * @memberOf HeaderComponent
   */
  @Input()
  logo: string = "";

  /**
   * @description Controls whether the header expands to fill available space.
   * @summary When set to true, the header will expand vertically to fill available space.
   * This can be useful for creating larger headers with more content.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf HeaderComponent
   */
  @Input()
  expand: StringOrBoolean = true;

  /**
   * @description Controls the alignment of the title text.
   * @summary Specifies how the title text should be aligned within the header.
   * Common values include 'start', 'center', and 'end'.
   *
   * @type {string}
   * @memberOf HeaderComponent
   */
  @Input()
  titleAligment?: string;

  /**
   * @description Controls whether the header has a border.
   * @summary When set to true, the header will display a border at the bottom.
   * Setting to false removes the border for a more seamless design.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf HeaderComponent
   */
  @Input()
  border: StringOrBoolean = true;

  /**
   * @description Controls whether the back button is displayed.
   * @summary When set to true, the component will display a back button that allows
   * users to navigate to the previous page. This is particularly useful for
   * multi-level navigation flows.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf HeaderComponent
   */
  @Input()
  showBackButton: StringOrBoolean = false;

  /**
   * @description Custom navigation target for the back button.
   * @summary Specifies a custom URL or function to execute when the back button is clicked.
   * This overrides the default behavior of navigating to the previous page in history.
   *
   * @type {string | Function}
   * @memberOf HeaderComponent
   */
  @Input()
  backButtonLink?: string | Function;

  /**
   * @description Background color of the header.
   * @summary Sets the background color of the header using Ionic's predefined color palette.
   * This allows the header to match the application's color scheme.
   *
   * @type {Color}
   * @default "primary"
   * @memberOf HeaderComponent
   */
  @Input()
  backgroundColor: Color = "primary";

  /**
   * @description Background color of the header on mobile devices.
   * @summary Sets a different background color for the header when viewed on mobile devices.
   * This allows for responsive design adjustments based on screen size.
   *
   * @type {Color}
   * @default ""
   * @memberOf HeaderComponent
   */
  @Input()
  mobileBackgroundColor: Color = "";

  /**
   * @description Position of the menu button on mobile devices.
   * @summary Determines whether the menu button appears at the start or end of the header
   * when viewed on mobile devices. This allows for responsive layout adjustments.
   *
   * @type {'start' | 'end'}
   * @default 'end'
   * @memberOf HeaderComponent
   */
  @Input()
  mobileButtonMenuSlot: 'start' | 'end' = 'end';

  /**
   * @description Controls whether the header content is centered.
   * @summary When set to true, the header content (title, buttons) will be centered
   * horizontally. This affects the overall layout and appearance of the header.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf HeaderComponent
   */
  @Input()
  center: StringOrBoolean = false;

  /**
   * @description Controls whether the header has a translucent effect.
   * @summary When set to true, the header will have a translucent appearance,
   * allowing content behind it to be partially visible. This creates a modern,
   * layered UI effect.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf HeaderComponent
   */
  @Input()
  translucent: StringOrBoolean = false;

  /**
   * @description Service for controlling the application's menu.
   * @summary Injected service that provides methods for enabling, disabling,
   * and toggling the application's side menu. This service is used to control
   * the menu based on the showMenuButton property.
   *
   * @private
   * @type {MenuController}
   * @memberOf HeaderComponent
   */
  private menuController: MenuController = inject(MenuController);

  /**
   * @description Service for handling routing operations.
   * @summary Injected service that provides methods for navigating between routes.
   * This service is used for navigation when changing operations or performing
   * actions on the model.
   *
   * @private
   * @type {RouterService}
   * @memberOf HeaderComponent
   */
  private routerService: RouterService  = inject(RouterService);

  /**
   * @description Creates an instance of HeaderComponent.
   * @summary Initializes a new HeaderComponent by calling the parent class constructor
   * with the component name for logging and identification purposes.
   *
   * @memberOf HeaderComponent
   */
  constructor() {
    super("HeaderComponent");
  }

 /**
  * @description Initializes the component after Angular first displays the data-bound properties.
  * @summary Sets up the component by processing boolean inputs, enabling/disabling the menu controller,
  * and building the CSS class string based on the component's properties. This method prepares
  * the component for user interaction by ensuring all properties are properly initialized.
  *
  * @mermaid
  * sequenceDiagram
  *   participant A as Angular Lifecycle
  *   participant H as HeaderComponent
  *   participant M as MenuController
  *
  *   A->>H: ngOnInit()
  *   H->>M: enable(showMenuButton)
  *   H->>H: Process showBackButton
  *   H->>H: Process center
  *   H->>H: Process translucent
  *   H->>H: Process expand
  *   H->>H: Process border
  *   H->>H: Build CSS class string
  *
  * @returns {void}
  * @memberOf HeaderComponent
  */
  ngOnInit(): void {
    this.menuController.enable(stringToBoolean(this.showMenuButton) as boolean);
    this.showBackButton = stringToBoolean(this.showBackButton);
    this.center = stringToBoolean(this.center);
    this.translucent = stringToBoolean(this.translucent);
    this.expand = stringToBoolean(this.expand);
    this.border = stringToBoolean(this.border);
    if(this.center)
      this.className = ' dcf-flex';
    if(!!this.backgroundColor)
      this.className += ` ${this.backgroundColor}`;
    if(!this.border)
      this.className += ` ion-no-border`;
    this.getRoute();

  }

  /**
   * @description Navigates to a different operation for the current model.
   * @summary This method constructs a navigation URL based on the model page,
   * the requested operation, and optionally a model ID. It then uses the router
   * service to navigate to the constructed URL. This is typically used when
   * switching between different CRUD operations on a model.
   *
   * @param {string} operation - The operation to navigate to (e.g., 'create', 'read', 'update', 'delete')
   * @param {string} [id] - Optional model ID to include in the navigation URL
   * @return {Promise<boolean>} A promise that resolves to true if navigation was successful
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant H as HeaderComponent
   *   participant R as RouterService
   *
   *   U->>H: Click operation button
   *   H->>H: changeOperation(operation, id)
   *   H->>H: Construct navigation URL
   *   H->>R: navigateTo(page)
   *   R-->>H: Return navigation result
   *   H-->>U: Display new operation view
   *
   * @memberOf HeaderComponent
   */
  async changeOperation(operation: string, id?: string): Promise<boolean> {
    let page = `${this.route}/${operation}/`.replace('//', '/');
    console.log(page, this.uid)
    if(this.uid || id)
        page = `${page}/${this.uid || id}`;
    return this.routerService.navigateTo(page.replace('//', '/'))
  }

  /**
   * @description Determines if a specific operation is allowed in the current context.
   * @summary This method checks if an operation is included in the list of available
   * CRUD operations and if it's not the current operation (unless the current operation
   * is CREATE). This is used to enable/disable or show/hide operation buttons in the UI.
   *
   * @param {string} operation - The operation to check
   * @return {boolean} True if the operation is allowed, false otherwise
   *
   * @mermaid
   * sequenceDiagram
   *   participant H as HeaderComponent
   *   participant U as UI
   *
   *   U->>H: isAllowed(operation)
   *   alt operations is undefined
   *     H-->>U: Return false
   *   else
   *     H->>H: Check if operation is in operations
   *     H->>H: Check if operation is not current operation
   *     H-->>U: Return result
   *   end
   *
   * @memberOf HeaderComponent
   */
  isAllowed(operation: string): boolean {
    if(!this.operations)
      return false;
    return this.operations.includes(operation as CrudOperations) && (this.currentOperation !== OperationKeys.CREATE && this.currentOperation.toLowerCase() !== operation);
  }
}
