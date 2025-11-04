/**
 * @module module:lib/components/empty-state/empty-state.component
 * @description Empty state component module.
 * @summary Exposes `EmptyStateComponent` which displays a standardized empty
 * state UI with optional icon, title, subtitle and action button. Supports
 * localization and sanitized HTML for dynamic subtitles.
 *
 * @link {@link EmptyStateComponent}
 */

import { Component, inject, Input, OnInit  } from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
}
from '@ionic/angular/standalone';
import * as allIcons from 'ionicons/icons';
import { addIcons } from 'ionicons';
import { StringOrBoolean } from '../../engine/types';
import { NgxComponentDirective } from '../../engine/NgxComponentDirective';
import { Dynamic } from '../../engine/decorators';
import { stringToBoolean } from '../../helpers/utils';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FunctionLike } from '../../engine/types';
import { TranslatePipe } from '@ngx-translate/core';


/**
 * @description Component for displaying empty state messages with optional actions.
 * @summary This component provides a standardized way to display empty state messages
 * when no data is available or when a user needs to take an action to populate content.
 * It includes customizable title, subtitle, icon, and action button elements that can be
 * styled and configured through input properties. The component supports localization
 * and can trigger navigation or custom actions when the button is clicked.
 *
 * @mermaid
 * classDiagram
 *   class EmptyStateComponent {
 *     +string title
 *     +string titleColor
 *     +string subtitle
 *     +string subtitleColor
 *     +StringOrBoolean showIcon
 *     +string icon
 *     +string iconSize
 *     +string iconColor
 *     +string|Function buttonLink
 *     +string buttonText
 *     +string buttonFill
 *     +string buttonColor
 *     +string buttonSize
 *     +string searchValue
 *     -Router Router
 *     +ngOnInit()
 *     +handleClick()
 *   }
 *   EmptyStateComponent --|> NgxBaseComponentDirective
 *   EmptyStateComponent --|> OnInit
 *
 * @extends {NgxBaseComponentDirective}
 * @implements {OnInit}
 */
@Dynamic()
@Component({
  selector: 'ngx-decaf-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  standalone: true,
  imports: [
    IonCard,
    IonCardContent,
    IonIcon,
    TranslatePipe,
    IonButton
  ]
})
export class EmptyStateComponent extends NgxComponentDirective implements OnInit {

  /**
   * @description The main title displayed in the empty state.
   * @summary Specifies the primary message to show in the empty state component.
   * This text is typically used to inform the user about why they're seeing an empty view.
   * If translatable is true, this will be processed through the localization system.
   *
   * @type {string}
   * @default "title"
   * @memberOf EmptyStateComponent
   */
  @Input()
  title: string = "title";

  /**
   * @description The color of the title text.
   * @summary Specifies the color for the title text using the application's color system.
   * The value should correspond to a color variable defined in the application's theme.
   * The component will automatically prefix this with "color-" to create the CSS class.
   *
   * @type {string}
   * @default 'gray-6'
   * @memberOf EmptyStateComponent
   */
  @Input()
  titleColor: string = 'gray-6';

  /**
   * @description The secondary message displayed in the empty state.
   * @summary Provides additional context or instructions below the main title.
   * This text is typically used to guide the user on what actions they can take.
   * If translatable is true, this will be processed through the localization system.
   *
   * @type {string | undefined}
   * @memberOf EmptyStateComponent
   */
  @Input()
  subtitle: string = "";

  /**
   * @description The color of the subtitle text.
   * @summary Specifies the color for the subtitle text using the application's color system.
   * The value should correspond to a color variable defined in the application's theme.
   * The component will automatically prefix this with "color-" to create the CSS class.
   *
   * @type {string}
   * @default 'gray-4'
   * @memberOf EmptyStateComponent
   */
  @Input()
  subtitleColor: string = 'gray-4';

  /**
   * @description Controls whether the icon is displayed.
   * @summary Determines if the visual icon should be shown in the empty state.
   * This can be provided as a boolean or a string that will be converted to a boolean.
   * Icons help visually communicate the empty state context to users.
   *
   * @type {StringOrBoolean}
   * @default true
   * @memberOf EmptyStateComponent
   */
  @Input()
  showIcon: StringOrBoolean = true;

  /**
   * @description The name of the icon to display.
   * @summary Specifies which icon to show when showIcon is true.
   * The component uses the icon system defined in the application,
   * and this value should correspond to an available icon name.
   *
   * @type {string}
   * @default "folder-open-outline"
   * @memberOf EmptyStateComponent
   */
  @Input()
  icon: string = "folder-open-outline";

  /**
   * @description The size of the displayed icon.
   * @summary Controls the size of the icon shown in the empty state.
   * Can be either 'large' or 'small' to accommodate different layout needs.
   *
   * @type {'large' | 'small' | undefined}
   * @default 'large'
   * @memberOf EmptyStateComponent
   */
  @Input()
  iconSize?: 'large' | 'small' = 'large';

  /**
   * @description The color of the displayed icon.
   * @summary Specifies the color for the icon using Ionic's predefined color system.
   * This allows the icon to match the application's color scheme.
   *
   * @type {PredefinedColors | undefined}
   * @default 'medium'
   * @memberOf EmptyStateComponent
   */
  @Input()
  iconColor?: string = 'medium';

  /**
   * @description The navigation target or action for the button.
   * @summary Specifies where the button should navigate to when clicked or what function
   * it should execute. This can be either a URL string or a function that handles navigation.
   * When not provided, the button will not perform any action.
   *
   * @type {string | FunctionLike | undefined}
   * @memberOf EmptyStateComponent
   */
  @Input()
  buttonLink?: string | FunctionLike;

  /**
   * @description The text displayed on the action button.
   * @summary Specifies the label for the action button in the empty state.
   * If translatable is true, this will be processed through the localization system.
   * If not provided, the button will not display any text.
   *
   * @type {string | undefined}
   * @memberOf EmptyStateComponent
   */
  @Input()
  buttonText?: string;

  /**
   * @description The fill style of the action button.
   * @summary Controls the visual style of the button using Ionic's button fill options.
   * 'solid' creates a button with a solid background, 'outline' creates a button with
   * just a border, and 'clear' creates a button with no background or border.
   *
   * @type {'clear' | 'solid' | 'outline'}
   * @default 'solid'
   * @memberOf EmptyStateComponent
   */
  @Input()
  buttonFill: 'clear' | 'solid' | 'outline' =  'solid';

  /**
   * @description The color of the action button.
   * @summary Specifies the color for the button using Ionic's color system.
   * This allows the button to match the application's color scheme.
   *
   * @type {string}
   * @default 'primary'
   * @memberOf EmptyStateComponent
   */
  @Input()
  buttonColor: string =  'primary';

  /**
   * @description The size of the action button.
   * @summary Controls the size of the button shown in the empty state.
   * Can be 'large', 'small', or 'default' to accommodate different layout needs.
   *
   * @type {'large' | 'small' | 'default'}
   * @default 'default'
   * @memberOf EmptyStateComponent
   */
  @Input()
  buttonSize: 'large' | 'small' | 'default' =  'default';

  /**
   * @description The search value that resulted in no results.
   * @summary When the empty state is shown due to a search with no results,
   * this property can hold the search term that was used. This can be displayed
   * in the empty state message to provide context to the user.
   *
   * @type {string}
   * @memberOf EmptyStateComponent
   */
  @Input()
  searchValue!: string;

  /**
   * @description Sanitizer instance for bypassing security and sanitizing HTML content.
   * @summary Used to sanitize dynamic HTML content, ensuring it is safe to render in the DOM.
   * @type {DomSanitizer}
   * @memberOf EmptyStateComponent
   */
  private sanitizer: DomSanitizer = inject(DomSanitizer);

  /**
   * @description The sanitized subtitle for search results.
   * @summary Holds the processed and sanitized HTML content for the subtitle when a search yields no results.
   * @type {SafeHtml}
   * @memberOf EmptyStateComponent
   */
  searchSubtitle!: SafeHtml;

  /**
   * @description Flag to enable creation by model route.
   * @summary Indicates whether the component should allow creation of new items via a model route when no button link is provided.
   * @type {boolean}
   * @default false
   * @memberOf EmptyStateComponent
   */
  enableCreationByModelRoute: boolean = false;


  /**
   * @description Creates an instance of EmptyStateComponent.
   * @summary Initializes a new EmptyStateComponent by calling the parent class constructor
   * with the component name for logging and identification purposes. This component provides
   * a standardized way to display empty state messages with optional icons and action buttons.
   *
   * @memberOf EmptyStateComponent
   */
  constructor() {
    super("EmptyStateComponent");
    addIcons(allIcons);
  }

  /**
   * @description Initializes the component after Angular first displays the data-bound properties.
   * @summary Sets up the component by processing boolean inputs, applying localization to text
   * elements if translation is enabled, and formatting CSS classes for title and subtitle colors.
   * This method prepares the component for user interaction by ensuring all properties are
   * properly initialized and localized.
   *
   * @mermaid
   * sequenceDiagram
   *   participant A as Angular Lifecycle
   *   participant E as EmptyStateComponent
   *
   *   A->>E: ngOnInit()
   *   E->>E: Process translatable flag
   *   E->>E: Process showIcon flag
   *   E->>E: Get locale settings
   *   alt translatable is true
   *     E->>E: Localize title
   *     E->>E: Localize subtitle
   *     E->>E: Localize buttonText
   *   end
   *   E->>E: Format title CSS class
   *   E->>E: Format subtitle CSS class
   *
   * @return {Promise<void>}
   * @memberOf EmptyStateComponent
   */
  async ngOnInit(): Promise<void> {
    this.initialize();
    this.showIcon = stringToBoolean(this.showIcon);

    this.titleColor = `dcf-title color-${this.titleColor}`;
    this.subtitleColor = `dcf-subtitle color-${this.titleColor}`;

    if(this.searchValue)
      this.searchSubtitle = await this.getSearchSubtitle(this.subtitle as string);
    if(!this.buttonLink && this.model && this.route)
      this.enableCreationByModelRoute = true;

  }

  /**
   * @description Handles click events on the action button.
   * @summary This method is triggered when the user clicks the action button in the empty state
   * component. It supports three navigation patterns: 1) no action when buttonLink is not provided,
   * 2) custom function execution when buttonLink is a function, and 3) navigation to a specific URL
   * when buttonLink is a string. This flexibility allows the empty state to trigger various actions
   * based on the context in which it's used.
   *
   * @mermaid
   * sequenceDiagram
   *   participant U as User
   *   participant E as EmptyStateComponent
   *   participant N as Router
   *
   *   U->>E: Click action button
   *   E->>E: handleClick()
   *   alt buttonLink is not provided
   *     E-->>U: Return false (no action)
   *   else buttonLink is a function
   *     E->>E: Execute buttonLink function
   *     E-->>U: Return function result
   *   else buttonLink is a URL string
   *     E->>N: navigateForward(buttonLink)
   *     N-->>E: Return navigation result
   *     E-->>U: Return navigation result
   *   end
   *
   * @return {boolean | void | Promise<boolean> | FunctionLike}
   *   - false if no action is taken
   *   - The result of the buttonLink function if it's a function
   *   - A Promise resolving to the navigation result if buttonLink is a URL
   * @memberOf EmptyStateComponent
   */
  handleClick(): boolean | void | Promise<boolean> | FunctionLike {
    const fn = this.buttonLink;
    if(!fn)
      return false;
    if(fn instanceof Function)
      return fn() as FunctionLike;
    return this.router.navigate([fn as string]);
  }


 /**
   * @description Generates a localized and sanitized subtitle for search results.
   * @summary This method takes a content string, typically the subtitle, and processes it
   * through the translation service. It replaces a placeholder ('0') with the actual
   * search value, then sanitizes the result to safely use as HTML. This is particularly
   * useful for displaying dynamic, localized messages in the empty state when a search
   * yields no results.
   *
   * @param {string} content - The content string to be translated and processed
   * @return {Promise<SafeHtml>} A promise that resolves to a sanitized HTML string
   *
   * @mermaid
   * sequenceDiagram
   *   participant E as EmptyStateComponent
   *   participant T as TranslateService
   *   participant S as DomSanitizer
   *
   *   E->>T: instant(content, {'0': searchValue})
   *   T-->>E: Return translated string
   *   E->>S: bypassSecurityTrustHtml(translatedString)
   *   S-->>E: Return sanitized SafeHtml
   *
   * @memberOf EmptyStateComponent
   */
  async getSearchSubtitle(content: string): Promise<SafeHtml> {
    const result = await this.translate(content, {'0': this.searchValue});
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }
}
