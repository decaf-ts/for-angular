import { Component, inject, Input, OnInit } from '@angular/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IonAvatar, IonButton, IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar, MenuController } from '@ionic/angular/standalone';
import { getOnWindow, getOnWindowDocument, stringToBoolean } from 'src/lib/utils/helpers';
import { BackButtonComponent } from '../back-button/back-button.component';
import { NgxComponentDirective } from 'src/lib/engine/NgxComponentDirective';
import { FunctionLike } from 'src/lib/engine/types';
import { TranslatePipe } from '@ngx-translate/core';
import { AngularEngineKeys, WindowColorSchemes } from 'src/lib/engine/constants';
import { IconComponent } from 'src/lib/components/icon/icon.component';

/**
 * @description Header component for application pages.
 * @summary The HeaderComponent provides a consistent header across the application with
 * configurable elements such as title, back button, menu button, and CRUD operation controls.
 * It extends NgxComponentDirective to inherit common functionality and implements OnInit for
 * initialization logic. This component is designed to be flexible and adaptable to different
 * page contexts, supporting various navigation patterns and visual styles.
 *
 * @class HeaderComponent
 * @extends {NgxComponentDirective}
 * @implements {OnInit}
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [TranslatePipe, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton,IconComponent, IonAvatar,  BackButtonComponent],
  schemas: [],
  standalone: true,

})
/**
 * @class HeaderComponent
 * @extends {NgxComponentDirective}
 * @implements {OnInit}
 *
 * @description A configurable header component for Angular applications.
 * @summary Provides a flexible header component with support for menu buttons, back navigation,
 * logo display, color scheme toggling, and responsive design. The component includes built-in
 * support for dark mode, sticky/floating behavior, and customizable styling options.
 *
 * @example
 * ```html
 * <app-header
 *   [title]="'My Application'"
 *   [showMenuButton]="true"
 *   [showBackButton]="false"
 *   [backgroundColor]="'primary'"
 *   [sticky]="true"
 *   [showToggleoggleButton]="true">
 * </app-header>
 * ```
 *
 * @remarks
 * This component automatically handles user authentication by checking for a logged-in user
 * and redirecting to the login page if no user is found. It also provides responsive behavior
 * with separate mobile-specific styling options.
 *
 * Key features:
 * - Menu button with configurable position
 * - Back button navigation
 * - Logo display
 * - Color scheme toggle (light/dark mode)
 * - Sticky and floating header modes
 * - Responsive design with mobile-specific options
 * - Customizable colors and layout
 *
 * @memberOf app.components
 */
/**
 * @description Header component for displaying page titles, navigation controls, and branding elements.
 * @summary A versatile header component that provides a consistent navigation experience across the application.
 * It supports features such as menu buttons, back navigation, logo display, color scheme toggling, and
 * responsive behavior for mobile devices. The component can be customized through various input properties
 * to match different page requirements and design patterns.
 *
 * @remarks
 * This component extends NgxComponentDirective to inherit common functionality and implements OnInit
 * for initialization logic. It integrates with Ionic components for native mobile appearance and behavior.
 *
 * Key Features:
 * - Configurable menu and back button controls
 * - Support for logo and title display
 * - Responsive layout with mobile-specific properties
 * - Color scheme toggling between light and dark modes
 * - Sticky and floating header variants
 * - Authentication-aware with automatic login redirect
 * - Customizable colors, alignment, and border settings
 *
 * @example
 * ```typescript
 * <app-header
 *   [title]="'Dashboard'"
 *   [showMenuButton]="true"
 *   [showBackButton]="false"
 *   [backgroundColor]="'primary'"
 *   [showToggleoggleButton]="true">
 * </app-header>
 * ```
 *
 * @export
 * @class HeaderComponent
 * @extends {NgxComponentDirective}
 * @implements {OnInit}
 */
export class HeaderComponent extends NgxComponentDirective implements OnInit {

  /**
   * @description Overrides the current CRUD operation context for this header instance.
   * @summary Optional input that allows pages to specify the active operation (CREATE, READ, UPDATE, DELETE)
   * which can alter header controls (buttons, visibility) and routing behavior. When undefined the
   * component will inherit or resolve the operation from the surrounding context or parent component.
   * @type {OperationKeys | undefined}
   * @default undefined
   */
  @Input()
  override operation: OperationKeys | undefined = undefined;

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
   * @type {string | FunctionLike}
   * @memberOf HeaderComponent
   */
  @Input()
  backButtonLink?: string | FunctionLike;

  /**
   * @description Background color of the header.
   * @summary Sets the background color of the header using Ionic's predefined color palette.
   * This allows the header to match the application's color scheme.
   *
   * @type {string}
   * @default "primary"
   * @memberOf HeaderComponent
   */
  @Input()
  backgroundColor: string = "white";


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
   * @description Enables or disables the color scheme toggle control in the header.
   * @summary Accepts either a boolean value or a string representation of a boolean.
   * When enabled, users can switch between light and dark color schemes.
   *
   * @type {boolean}
   * @default true
   */
  @Input()
  showToggleoggleButton: boolean = true;

  /**
   * @description Enable sticky header behavior.
   * @summary When true the header will toggle a sticky state when the page is scrolled
   * beyond a configurable offset. Useful for keeping the header visible while scrolling.
   * @type {boolean}
   * @default false
   */
  @Input()
  sticky: boolean = false;

  /**
   * @description Vertical offset (in pixels) used to trigger the sticky state.
   * @summary The header becomes sticky when the page scroll position passes this number of pixels.
   * When `floating` is enabled the default offset is larger to account for different UI spacing.
   * @type {number}
   * @default 80
   */
  @Input()
  stickyOffset: number = 80;

  /**
   * @description Runtime flag indicating whether the header is currently in the sticky state.
   * @summary This is set by the component (not an input) and updated by the page scroll observer.
   * Consumers can bind to it in templates if they need to react to the sticky transition.
   * @type {boolean}
   * @default false
   */
  stickyActive: boolean = false;

  /**
   * @description Enable floating header mode.
   * @summary When true the header uses a floating style (different offset / appearance).
   * Floating headers are typically used to overlay content and use a larger `stickyOffset`.
   * @type {boolean}
   * @default false
   */
  @Input()
  floating: boolean = false;


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
  private menuController: MenuController = inject(MenuController);

  /**
   * @description Color of back button icon.
   * @summary Sets the color of the back button icon using Ionic's predefined color palette.
   * This allows the back button icon to match the application's color scheme.
   *
   * @type {string}
   * @memberOf HeaderComponent
   */
  backButtonColor: string = 'dark';


  user!: string;

  colorSchema: 'dark' | 'light' = 'light';


  /**
   * @description Creates an instance of HeaderComponent.
   * @summary Initializes a new HeaderComponent by calling the parent class constructor
   * with the component name for logging and identification purposes.
   *
   * @memberOf HeaderComponent
   */
  constructor() {
    super("HeaderComponent");
    // enable dark mode support for this component
    this.enableDarkMode = true;
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
  * @returns {Promise<void> }
  * @memberOf HeaderComponent
  */
  async ngOnInit(): Promise<void> {
    // custom behavior on color scheme change, dont call super.ngOnInit()
    // this.mediaService.colorSchemeObserver(this.component);
    const isLoggedIn = await this.isLoggedIn() || 'User';
    if(!isLoggedIn)
      this.router.navigateByUrl('/login');
    this.user = isLoggedIn as string;
    this.showBackButton = stringToBoolean(this.showBackButton);

    // remove back button case dont have any operation defined
    if(!this.operation)
      this.showBackButton = false;

    if(this.showMenuButton)
      this.menuController.enable(true);
    this.center = stringToBoolean(this.center);
    this.translucent = stringToBoolean(this.translucent);
    this.expand = stringToBoolean(this.expand);
    this.border = stringToBoolean(this.border);
    if(this.center)
      this.className += ' dcf-flex';
    if(!this.border)
      this.className += ` ion-no-border`;

    if(this.backgroundColor === 'white')
      this.backButtonColor = 'dark';

    if(this.sticky || this.floating) {
      if(this.floating)
        this.stickyOffset = 100;
      this.mediaService.observePageScroll(this.stickyOffset).subscribe(isBeyondOffset => {
        this.stickyActive = isBeyondOffset;
      });
    }

    this.getRoute();
    this.initialized = true;
  }

  async isLoggedIn(): Promise<string|undefined> {
    const isLoggedIn = getOnWindow('loggedUser') as string;
    return isLoggedIn;
  }

  navigateToAccount(): void {
    this.router.navigateByUrl('/account');
  }

  changeColorSchema(): void {
    this.colorSchema = this.colorSchema === WindowColorSchemes.dark ? WindowColorSchemes.light: WindowColorSchemes.dark;
    this.isDarkMode = this.colorSchema === WindowColorSchemes.dark ? true : false;
    this.mediaService.toggleClass(
      [getOnWindowDocument('documentElement'), this.component],
      AngularEngineKeys.DARK_PALETTE_CLASS,
      this.isDarkMode
    );

    // this.colorSchema = schema;
    //  this.mediaService.colorSchemeObserver(this.component);
    // this.backgroundColor = schema === 'dark' ? '' : this.initialBackgroundColor;
  }

  getBackButtonSlot(): string {
    return this.modelId && ![OperationKeys.READ,  OperationKeys.UPDATE].includes(this.operation as OperationKeys) ? 'start' : 'end';
  }
}

