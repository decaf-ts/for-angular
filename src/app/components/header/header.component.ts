import { Component,  inject, Input, OnInit } from '@angular/core';
import { StringOrBoolean } from 'src/lib/engine/types';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { IonButton, IonButtons, IonHeader, IonIcon, IonMenuButton, IonTitle, IonToolbar, MenuController } from '@ionic/angular/standalone';
import { RouterService } from 'src/app/services/router.service';
import { getWindow, stringToBoolean } from 'src/lib/helpers/utils';
import { BackButtonComponent } from '../back-button/back-button.component';
import { NgxDecafComponentDirective } from 'src/lib/engine/NgxDecafComponentDirective';
import { FunctionLike } from 'src/lib/engine/types';
import { saveOutline, folderOpenOutline, createOutline } from "ionicons/icons";
import { addIcons } from 'ionicons';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * @description Header component for application pages.
 * @summary The HeaderComponent provides a consistent header across the application with
 * configurable elements such as title, back button, menu button, and CRUD operation controls.
 * It extends NgxDecafComponentDirective to inherit common functionality and implements OnInit for
 * initialization logic. This component is designed to be flexible and adaptable to different
 * page contexts, supporting various navigation patterns and visual styles.
 *
 * @class HeaderComponent
 * @extends {NgxDecafComponentDirective}
 * @implements {OnInit}
 */
@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [TranslatePipe, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonMenuButton, IonIcon,  BackButtonComponent],
  schemas: [],
  standalone: true,

})
export class HeaderComponent extends NgxDecafComponentDirective implements OnInit {

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
   * @description Background color of the header on mobile devices.
   * @summary Sets a different background color for the header when viewed on mobile devices.
   * This allows for responsive design adjustments based on screen size. Uses Ionic's predefined
   * color palette to maintain consistency with the application's color scheme.
   *
   * @type {string}
   * @default ""
   * @memberOf HeaderComponent
   */
  @Input()
  mobileBackgroundColor: string = "";

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
   * @description Color of back button icon.
   * @summary Sets the color of the back button icon using Ionic's predefined color palette.
   * This allows the back button icon to match the application's color scheme.
   *
   * @type {string}
   * @memberOf HeaderComponent
   */
  backButtonColor: string = 'translucent';


  /**
   * @description Stores the original background color value before theme modifications.
   * @summary Preserves the initial backgroundColor input value before any theme-based
   * modifications are applied during component initialization. This allows the component
   * to restore or reference the original color value when switching between themes
   * or when resetting the header appearance to its default state.
   *
   * @type {string}
   * @private
   * @memberOf HeaderComponent
   */
  private initialBackgroundColor!: string;


  /**
   * @description Creates an instance of HeaderComponent.
   * @summary Initializes a new HeaderComponent by calling the parent class constructor
   * with the component name for logging and identification purposes.
   *
   * @memberOf HeaderComponent
   */
  constructor() {
    super("HeaderComponent");
    addIcons({ saveOutline, folderOpenOutline, createOutline });
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
    this.initialBackgroundColor = this.backgroundColor;
    this.observeThemeChange();
    this.showBackButton = stringToBoolean(this.showBackButton);
    this.showMenuButton = stringToBoolean(this.showMenuButton);
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
    this.getRoute();
    if(this.backgroundColor === 'white') {
      this.backButtonColor = 'medium';
    }
  }

  /**
   * @description Observes system theme changes and updates header appearance accordingly.
   * @summary Sets up a media query listener to detect changes in the user's color scheme preference
   * (light/dark mode). When the theme changes, automatically adjusts the header's background color
   * by either restoring the original color for light mode or clearing it for dark mode. This ensures
   * the header appearance remains consistent with the system theme preferences.
   *
   * @private
   * @return {void}
   * @memberOf HeaderComponent
   */
  private observeThemeChange(): void {
    const win = getWindow() as Window;
    const colorSchemePreference = win.matchMedia('(prefers-color-scheme: dark)');
    this.backgroundColor =  colorSchemePreference.matches ? '' : this.initialBackgroundColor;
    colorSchemePreference.addEventListener('change', () => {
        this.backgroundColor =  colorSchemePreference.matches ? '' : this.initialBackgroundColor;
    });
  }

  getBackButtonSlot(): string {
    return this.modelId && ![OperationKeys.READ,  OperationKeys.UPDATE].includes(this.operation as OperationKeys) ? 'start' : 'end';
  }
}
