import { OnInit, CUSTOM_ELEMENTS_SCHEMA, Input, Component, inject, HostListener } from "@angular/core";
import { PredefinedColors } from "@ionic/core";
import { ForAngularModule } from 'src/lib/for-angular.module';
import { EventConstants, RouteDirections } from "src/lib/engine/constants";
import { StringOrBoolean } from "src/lib/engine/types";
import { stringToBoolean } from "src/lib/helpers/utils";
import { RouterService } from "src/app/services/router.service";
import { windowEventEmitter } from "src/lib/helpers/utils";
import { addIcons } from 'ionicons';
import { chevronBackOutline } from 'ionicons/icons';

@Component({
  selector: 'app-back-button',
  templateUrl: './back-button.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  styleUrls: ['./back-button.component.scss'],
  imports: [ForAngularModule],
  standalone: true,

})
export class BackButtonComponent implements OnInit {

  /**
   * @description Controls whether default navigation behavior is prevented.
   * @summary When set to true, clicking the back button will only emit events without
   * performing actual navigation. This is useful for cases where you want to intercept
   * the back action and handle it in a custom way, such as showing a confirmation dialog
   * before navigating away from a form with unsaved changes.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf BackButtonComponent
   */
  @Input()
  preventDefault: StringOrBoolean = false;

  /**
   * @description Controls whether navigation events are emitted.
   * @summary When set to true, the component will emit window events when navigation
   * occurs. These events can be listened to by other components to react to navigation
   * changes. For example, a component might listen for back navigation events to reset
   * its state or update its display.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf BackButtonComponent
   */
  @Input()
  emitEvent: StringOrBoolean = true;

  /**
   * @description Custom navigation target for the back button.
   * @summary Specifies where the back button should navigate to when clicked.
   * This can be either a URL string or a function that handles navigation.
   * When not provided, the component will navigate to the previous URL in the browser history.
   * When a function is provided, it will be called instead of performing standard navigation.
   *
   * @type {(string | Function | undefined)}
   * @memberOf BackButtonComponent
   */
  @Input()
  link?: string | Function;

  /**
   * @description The direction of navigation animation.
   * @summary Controls the animation and transition behavior when navigating.
   * This affects how the page transition appears to the user. For example,
   * BACK typically slides the page from left to right, while FORWARD slides
   * from right to left. This helps provide visual cues about navigation direction.
   *
   * @type {RouteDirections}
   * @default RouteDirections.BACK
   * @memberOf BackButtonComponent
   */
  @Input()
  direction: RouteDirections = RouteDirections.BACK;

  /**
   * @description Determines if text should be displayed alongside the icon.
   * @summary When set to true, the component will display text next to the icon.
   * This text can be customized using the text property. Displaying text can
   * make the button's purpose clearer to users, especially for accessibility.
   *
   * @type {StringOrBoolean}
   * @default false
   * @memberOf BackButtonComponent
   */
  @Input()
  showText: StringOrBoolean = false;

  /**
   * @description Text to display when showText is true.
   * @summary Specifies the text content to show next to the icon when showText is enabled.
   * This can be a direct string or a translation key. By default, it shows "back".
   * The text can be localized based on the component's locale settings.
   *
   * @type {string}
   * @default 'back'
   * @memberOf BackButtonComponent
   */
  @Input()
  text?: string = 'back';

  /**
   * @description Color of the back button.
   * @summary Sets the color of the back button using Ionic's predefined color palette.
   * This allows the button to match the application's color scheme. Common values
   * include 'primary', 'secondary', 'tertiary', 'success', 'warning', 'danger', etc.
   *
   * @type {PredefinedColors}
   * @default "primary"
   * @memberOf BackButtonComponent
   */
  @Input()
  color: PredefinedColors = "primary";

  /**
   * @description Color of the toolbar containing the back button.
   * @summary When set, this property changes the button color to 'light' for better contrast
   * against colored toolbars. This is useful when placing the back button in a colored
   * header or toolbar, ensuring it remains visible and accessible.
   *
   * @type {string}
   * @memberOf BackButtonComponent
   */
  @Input()
  toolbarColor?: string;

  /**
   * @description Flag indicating if the icon is an Ionic icon.
   * @summary This property is determined automatically based on the icon input.
   * It's set to false for Tabler icons (prefixed with 'ti-') or SVG paths
   * (containing '.svg'). This affects how the icon is rendered in the template.
   *
   * @type {boolean}
   * @default true
   * @memberOf BackButtonComponent
   */
  isIonIcon: boolean = true;

  /**
   * @description Stores the previous URL for back navigation.
   * @summary Caches the previous URL from the router service during initialization.
   * This is used as a fallback navigation target when no specific link is provided
   * but the default browser history navigation is not appropriate.
   *
   * @private
   * @type {string}
   * @memberOf BackButtonComponent
   */
  private previousUrl?: string;

  /**
   * @description Service for handling routing operations.
   * @summary Injected service that provides methods for navigating between routes,
   * retrieving the previous URL, and managing navigation history. This service
   * abstracts the underlying Angular Router functionality.
   *
   * @private
   * @type {RouterService}
   * @memberOf BackButtonComponent
   */
  private routerService: RouterService = inject(RouterService);

  /**
   * @description Creates an instance of BackButtonComponent.
   * @summary Initializes a new BackButtonComponent
   *
   * @memberOf BackButtonComponent
   */
  constructor() {
    addIcons({chevronBackOutline})
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Sets up the component by processing boolean inputs, determining the button color based on
   * toolbar color, retrieving the previous URL for navigation, and determining the icon type.
   * This method prepares the component for user interaction by ensuring all properties are
   * properly initialized.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant B as BackButtonComponent
   *   participant R as RouterService
   *
   *   A->>B: ngOnInit()
   *   B->>B: Process preventDefault
   *   B->>B: Process emitEvent
   *   B->>B: Determine color based on toolbarColor
   *   B->>R: getPreviousUrl()
   *   R-->>B: Return previous URL
   *   B->>B: Store previousUrl
   *   B->>B: Process showText
   *   Note over B: Check icon type
   *   B->>B: Set isIonIcon based on icon string
   *
   * @memberOf BackButtonComponent
   */
  ngOnInit(): void {
    this.preventDefault = stringToBoolean(this.preventDefault);
    this.emitEvent = stringToBoolean(this.emitEvent);
    this.color = !!this.toolbarColor ? 'light' : 'primary';
    this.previousUrl = this.routerService.getPreviousUrl();
    this.showText = stringToBoolean(this.showText);

    // if(this.showText)
    //   this.text = await this.localeService.get((!this.locale ? this.text : `${this.locale}.${this.text}`) as string);
  }

  /**
   * @description Handles navigation when the back button is clicked.
   * @summary This method is the core navigation handler for the back button. It supports three
   * navigation patterns: 1) custom function execution, 2) navigation to a specific URL, and
   * 3) default back navigation using browser history. It also handles event emission and
   * can prevent navigation when configured to do so.
   *
   * @param {boolean} forceRefresh - Whether to force a page refresh after navigation
   * @return {Promise<boolean|void>} A promise that resolves when navigation is complete
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant B as BackButtonComponent
   *   participant E as Event System
   *   participant R as RouterService
   *
   *   U->>B: Click back button
   *   B->>B: backToPage(forceRefresh)
   *   alt preventDefault is true
   *     B->>B: handleEndNavigation(forceRefresh)
   *     B->>E: Emit navigation event
   *     B-->>U: Return without navigation
   *   else preventDefault is false
   *     B->>B: handleEndNavigation(forceRefresh)
   *     B->>E: Emit navigation event
   *     alt link is not provided
   *       B->>R: backToLastPage()
   *     else link is a function
   *       B->>B: Execute link function
   *     else link is a URL
   *       B->>R: navigateTo(link, direction)
   *     end
   *   end
   *
   * @memberOf BackButtonComponent
   */
  async backToPage(forceRefresh: boolean = false): Promise<boolean|void> {
    const self = this;
    if(this.preventDefault)
      return self.handleEndNavigation(forceRefresh);

    self.handleEndNavigation(forceRefresh);
    if(!this.link)
      return this.routerService.backToLastPage();
    if(this.link instanceof Function)
      return await this.link();
    await this.routerService.navigateTo(this.link || this.previousUrl || '/', this.direction);
  }

  /**
   * @description Emits navigation events when navigation is complete.
   * @summary This method handles the emission of navigation events when the emitEvent property
   * is true. It uses the windowEventEmitter utility to broadcast a global event that other
   * components can listen for. The event includes information about whether a refresh is required.
   *
   * @param {boolean} forceRefresh - Whether to force a page refresh
   * @return {void}
   *
   * @mermaid
   * sequenceDiagram
   *   participant B as BackButtonComponent
   *   participant E as Event System
   *
   *   B->>B: handleEndNavigation(forceRefresh)
   *   alt emitEvent is true
   *     B->>E: windowEventEmitter(BACK_BUTTON_NAVIGATION, {refresh: forceRefresh})
   *   end
   *
   * @memberOf BackButtonComponent
   */
  handleEndNavigation(forceRefresh: boolean): void {
    if(this.emitEvent)
      windowEventEmitter(EventConstants.BACK_BUTTON_NAVIGATION, {refresh: forceRefresh});
  }

  /**
   * @description Listens for global back button navigation events.
   * @summary This method sets up an event listener for the BackButtonForceNavigationEvent,
   * allowing external components to trigger back navigation programmatically. When this
   * event is received, the component will execute its backToPage method as if the button
   * was clicked directly.
   *
   * @param {Event} event - The event object
   * @return {Promise<boolean|void>} A promise that resolves when navigation is complete
   *
   * @mermaid
   * sequenceDiagram
   *   participant E as External Component
   *   participant W as Window
   *   participant B as BackButtonComponent
   *
   *   E->>W: Dispatch BackButtonForceNavigationEvent
   *   W->>B: handleModelPageEvent(event)
   *   B->>B: backToPage()
   *   Note over B: Execute navigation logic
   *
   * @memberOf BackButtonComponent
   */
  @HostListener('window:BackButtonForceNavigationEvent', ['$event'])
  handleModelPageEvent(event: Event): Promise<boolean|void> {
    return this.backToPage();
  }
}
